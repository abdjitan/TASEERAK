-- 192: retention of requests that ended without a deal (owner 2026-11-01: «الطلبات اللي بيخلص وقتها
-- بنخلي إلها بعد الانتهاء مدة معينة بعدين بتنحذف، بس اللي تمّت بتنحفظ … طريقة تكون أخف الملفات»).
--  * Policy: a request that ended WITHOUT a deal (expired / cancelled, nothing selected or accepted,
--    no dispute) is kept 60 days after it ended (app_config.rfq_retention_days), then deleted with its
--    offers, conversations and files. The buyer is told 7 days before. Requests with a deal are kept.
--  * rfqs.closed_at records when a request stopped being open (cancel, expire, close).
--  * rfq_archive keeps one anonymous line per deleted request (sectors, region, counts) so the
--    owner's statistics survive the deletion. No names, no text, no files.
--  * purge_candidates(limit) lists what is due and the storage paths of its files; the `cleanup` edge
--    function deletes the files through the Storage API (deleting storage rows from SQL leaves the
--    files behind), then calls purge_rfqs(ids). Scheduled daily via pg_net (notify_config secret).

alter table public.app_config add column if not exists rfq_retention_days int not null default 60;

alter table public.rfqs add column if not exists closed_at timestamptz;
update public.rfqs set closed_at = coalesce(expires_at, created_at) where status::text <> 'open' and closed_at is null;

create or replace function public.stamp_rfq_closed_at() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status::text <> 'open' and old.status::text = 'open' and new.closed_at is null then new.closed_at := now(); end if;
  if new.status::text = 'open' then new.closed_at := null; end if;
  return new;
end $$;
drop trigger if exists aa_stamp_rfq_closed_at on public.rfqs;
create trigger aa_stamp_rfq_closed_at before update of status on public.rfqs
  for each row execute function public.stamp_rfq_closed_at();

create table if not exists public.rfq_archive (
  rfq_id uuid primary key,
  created_at timestamptz,
  ended_at timestamptz,
  purged_at timestamptz not null default now(),
  status text,
  sectors text[],
  region text,
  items_count int,
  offers_count int,
  had_photo boolean
);
alter table public.rfq_archive enable row level security;
revoke all on public.rfq_archive from anon, authenticated;
drop policy if exists "rfq_archive admin read" on public.rfq_archive;
create policy "rfq_archive admin read" on public.rfq_archive for select to authenticated using ((select public.is_admin()));

create or replace function public.rfq_retention_days() returns int
language sql stable security definer set search_path = public as $$
  select greatest(14, coalesce((select rfq_retention_days from app_config limit 1), 60))
$$;

-- what is due: ended without a deal, past the retention period
create or replace function public.purge_due_rfqs() returns setof uuid
language sql stable security definer set search_path = public as $$
  select r.id from rfqs r
   where (r.status::text in ('expired', 'cancelled') or (r.status::text = 'closed'
          and not exists (select 1 from offers o where o.rfq_id = r.id and o.status = 'accepted')))
     and coalesce(r.closed_at, r.expires_at, r.created_at) < now() - make_interval(days => public.rfq_retention_days())
     and not exists (select 1 from offers o where o.rfq_id = r.id and (o.status = 'accepted' or o.dispute_status = 'open'))
     and not exists (select 1 from rfq_item_awards a where a.rfq_id = r.id)
$$;
revoke all on function public.purge_due_rfqs() from public, anon, authenticated;

-- storage paths in the private «licenses» bucket referenced by a request and its offers/messages
create or replace function public.rfq_file_paths(p_rfq_id uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m[1]), '{}') from (
    select regexp_matches(t, 'licenses/([^"?\s\\]+)', 'g') as m from (
      select r.items::text || coalesce(r.notes, '') as t from rfqs r where r.id = p_rfq_id
      union all select to_jsonb(o)::text from offers o where o.rfq_id = p_rfq_id
      union all select coalesce(ms.body, '') || coalesce(to_jsonb(ms)::text, '') from messages ms
                  join conversations c on c.id = ms.conversation_id where c.rfq_id = p_rfq_id
    ) s
  ) x
$$;
revoke all on function public.rfq_file_paths(uuid) from public, anon, authenticated;

create or replace function public.purge_candidates(p_limit int default 200)
returns table(rfq_id uuid, paths text[])
language sql stable security definer set search_path = public as $$
  select d.id, public.rfq_file_paths(d.id) from public.purge_due_rfqs() as d(id) limit greatest(1, least(coalesce(p_limit, 200), 1000))
$$;
revoke all on function public.purge_candidates(int) from public, anon, authenticated;
grant execute on function public.purge_candidates(int) to service_role;

create or replace function public.purge_rfqs(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- re-check: only what is still due (a deal may have happened since the list was made)
  create temp table if not exists _purge(id uuid primary key) on commit drop;
  delete from _purge;
  insert into _purge select d.id from public.purge_due_rfqs() as d(id) where d.id = any(p_ids);

  insert into rfq_archive (rfq_id, created_at, ended_at, status, sectors, region, items_count, offers_count, had_photo)
  select r.id, r.created_at, coalesce(r.closed_at, r.expires_at), r.status::text, r.sectors, r.region,
         case when jsonb_typeof(r.items) = 'array' then jsonb_array_length(r.items) else 1 end,
         (select count(*) from offers o where o.rfq_id = r.id), r.items::text like '%"photo_url": "http%'
    from rfqs r join _purge p on p.id = r.id
  on conflict (rfq_id) do nothing;

  perform set_config('app.deal_write', 'on', true);
  update project_rfq_items set rfq_id = null where rfq_id in (select id from _purge);
  delete from conversations where rfq_id in (select id from _purge);           -- messages cascade
  delete from rfqs where id in (select id from _purge);                          -- offers, awards, private, dismissals cascade
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_rfqs(uuid[]) from public, anon, authenticated;
grant execute on function public.purge_rfqs(uuid[]) to service_role;

-- the buyer is told 7 days before (once per request)
create or replace function public.warn_upcoming_rfq_purge() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into notifications (user_id, type, title, body, data)
  select r.contractor_id, 'rfq_expiring', 'سيُحذف طلبك المنتهي بعد 7 أيام',
         'طلب «' || coalesce(public.rfq_label(r), 'طلب') || '» انتهى دون صفقة، وسيُحذف مع عروضه بعد 7 أيام. يمكنك إعادة إرساله من «طلباتي» إن احتجته.',
         jsonb_build_object('url', '/contractor/rfqs', 'rfq_id', r.id, 'kind', 'purge_warning')
    from rfqs r
   where (r.status::text in ('expired', 'cancelled') or (r.status::text = 'closed'
          and not exists (select 1 from offers o where o.rfq_id = r.id and o.status = 'accepted')))
     and coalesce(r.closed_at, r.expires_at, r.created_at) < now() - make_interval(days => public.rfq_retention_days() - 7)
     and coalesce(r.closed_at, r.expires_at, r.created_at) >= now() - make_interval(days => public.rfq_retention_days())
     and not exists (select 1 from offers o where o.rfq_id = r.id and (o.status = 'accepted' or o.dispute_status = 'open'))
     and not exists (select 1 from rfq_item_awards a where a.rfq_id = r.id)
     and not exists (select 1 from notifications x where x.user_id = r.contractor_id and x.data->>'kind' = 'purge_warning' and x.data->>'rfq_id' = r.id::text);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.warn_upcoming_rfq_purge() from public, anon, authenticated;

-- daily: warn, then call the cleanup function (it removes files, then rows)
create or replace function public.run_rfq_retention() returns void
language plpgsql security definer set search_path = public as $$
declare cfg record;
begin
  perform public.warn_upcoming_rfq_purge();
  select function_url, notify_secret into cfg from notify_config where id = true;
  if cfg.function_url is null then return; end if;
  perform net.http_post(
    url := replace(cfg.function_url, '/functions/v1/notify', '/functions/v1/cleanup'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', cfg.notify_secret));
end $$;
revoke all on function public.run_rfq_retention() from public, anon, authenticated;
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'rfq-retention-daily';
  perform cron.schedule('rfq-retention-daily', '30 4 * * *', 'select public.run_rfq_retention()');
end $$;

-- a file may also be used by a request that stays (e.g. «أعد الطلب» copies the photo link): only
-- paths no kept request/offer/message mentions are removed
create or replace function public.unreferenced_paths(p_ids uuid[], p_paths text[]) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(p), '{}') from unnest(p_paths) p
   where not exists (select 1 from rfqs r where r.id <> all(p_ids) and (r.items::text || coalesce(r.notes, '')) like '%' || p || '%')
     and not exists (select 1 from offers o where o.rfq_id <> all(p_ids) and to_jsonb(o)::text like '%' || p || '%')
     and not exists (select 1 from messages m join conversations c on c.id = m.conversation_id
                      where (c.rfq_id is null or c.rfq_id <> all(p_ids)) and coalesce(m.body, '') || to_jsonb(m)::text like '%' || p || '%')
     and not exists (select 1 from project_rfqs pr where to_jsonb(pr)::text like '%' || p || '%')
     and not exists (select 1 from project_rfq_items pi where pi.rfq_id <> all(p_ids) and to_jsonb(pi)::text like '%' || p || '%')
$$;
revoke all on function public.unreferenced_paths(uuid[], text[]) from public, anon, authenticated;
grant execute on function public.unreferenced_paths(uuid[], text[]) to service_role;
