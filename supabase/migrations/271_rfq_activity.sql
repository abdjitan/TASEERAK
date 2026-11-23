-- 271 (round-3 UX-146/147): the buyer sees how many suppliers opened his request and the usual time to
-- the first offer. Counts only: never who viewed.
create table if not exists public.rfq_views (
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  first_seen timestamptz not null default now(),
  primary key (rfq_id, supplier_id)
);
alter table public.rfq_views enable row level security;
-- no policies: written and read only through the functions below
revoke all on public.rfq_views from public, anon, authenticated;

create or replace function public.log_rfq_view(p_rfq_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := coalesce(public.acting_uid(), auth.uid());
begin
  if v_uid is null then return; end if;
  if exists (select 1 from rfqs where id = p_rfq_id and contractor_id <> v_uid)
     and exists (select 1 from profiles where id = v_uid and role = 'supplier') then
    insert into rfq_views (rfq_id, supplier_id) values (p_rfq_id, v_uid) on conflict do nothing;
  end if;
end $$;

create or replace function public.get_rfq_activity(p_rfq_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hours numeric;
begin
  if not exists (select 1 from rfqs where id = p_rfq_id and (contractor_id = auth.uid() or public.is_admin())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- median hours from sending to the first offer, over the last 90 days' requests that got one
  select percentile_cont(0.5) within group (order by h) into v_hours from (
    select extract(epoch from (min(o.created_at) - r.created_at)) / 3600.0 as h
    from rfqs r join offers o on o.rfq_id = r.id
    where r.created_at > now() - interval '90 days'
    group by r.id, r.created_at
  ) t where h >= 0;
  return jsonb_build_object(
    'views', (select count(*) from rfq_views where rfq_id = p_rfq_id),
    'typical_first_offer_hours', case when v_hours is null then null else ceil(v_hours) end);
end $$;

revoke all on function public.log_rfq_view(uuid) from public, anon;
revoke all on function public.get_rfq_activity(uuid) from public, anon;
grant execute on function public.log_rfq_view(uuid) to authenticated;
grant execute on function public.get_rfq_activity(uuid) to authenticated;
