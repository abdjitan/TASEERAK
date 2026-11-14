-- WhatsApp only when unread (owner 2026-11-14): push / web push / email go out at once (free);
-- WhatsApp waits a set time and goes out only if the person still hasn't read it.
--   notifications.wa_status  null = not a WhatsApp kind, 'pending' → 'queued' (sent to notify) / 'skipped'
--   notify_config.wa_delay   minutes per type before WhatsApp; wa_quiet_start/end = no WhatsApp at
--                            night (Riyadh hours), held until the morning
--   process_whatsapp_queue() every 5 minutes (pg_cron)
--   mark_notifications_read_for_url(path, full) — opening the page a notification points to counts as reading it

alter table public.notifications add column if not exists wa_status text;
alter table public.notify_config add column if not exists wa_delay jsonb not null
  default '{"new_rfq": 30, "rfq_offer": 60, "offer_accepted": 60, "new_message": 60}'::jsonb;
alter table public.notify_config add column if not exists wa_quiet_start int not null default 23;
alter table public.notify_config add column if not exists wa_quiet_end int not null default 7;

create index if not exists notifications_wa_pending_idx on public.notifications (created_at) where wa_status = 'pending';

-- mark new rows that may need a WhatsApp later
create or replace function public.notifications_mark_wa()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.type::text in ('new_rfq', 'rfq_offer', 'offer_accepted', 'new_message')
     and not coalesce((new.data->>'team_copy')::boolean, false)
     and not coalesce((new.data->>'uncovered')::boolean, false)
     and exists (select 1 from notify_config where id = true and whatsapp_enabled) then
    new.wa_status := 'pending';
  end if;
  return new;
end $$;
drop trigger if exists trg_notifications_mark_wa on public.notifications;
create trigger trg_notifications_mark_wa before insert on public.notifications
  for each row execute function public.notifications_mark_wa();

-- the queue: due + still unread → ask notify to send the WhatsApp (it re-checks before sending)
create or replace function public.process_whatsapp_queue()
returns integer language plpgsql security definer set search_path = public
as $$
declare cfg record; r record; n int := 0; h int;
begin
  select function_url, notify_secret, whatsapp_enabled, wa_delay, wa_quiet_start, wa_quiet_end
    into cfg from notify_config where id = true;
  if cfg.function_url is null or not cfg.whatsapp_enabled then return 0; end if;

  -- old or already-read ones are dropped
  update notifications set wa_status = 'skipped'
   where wa_status = 'pending' and (is_read or created_at < now() - interval '24 hours');

  h := extract(hour from (now() at time zone 'Asia/Riyadh'))::int;
  if (cfg.wa_quiet_start > cfg.wa_quiet_end and (h >= cfg.wa_quiet_start or h < cfg.wa_quiet_end))
     or (cfg.wa_quiet_start < cfg.wa_quiet_end and h >= cfg.wa_quiet_start and h < cfg.wa_quiet_end) then
    return 0; -- night: hold until the morning
  end if;

  for r in
    select id from notifications
     where wa_status = 'pending'
       and created_at <= now() - make_interval(mins => coalesce((cfg.wa_delay->>type::text)::int, 60))
     order by created_at
     limit 100
  loop
    update notifications set wa_status = 'queued' where id = r.id;
    perform net.http_post(
      url := cfg.function_url,
      body := jsonb_build_object('notification_id', r.id, 'channel', 'whatsapp'),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', cfg.notify_secret)
    );
    n := n + 1;
  end loop;
  return n;
exception when others then
  begin insert into system_errors_log(context, message) values ('process_whatsapp_queue', left(sqlerrm, 500));
  exception when others then null; end;
  return n;
end $$;
revoke all on function public.process_whatsapp_queue() from public, anon, authenticated;

-- opening the page a notification points to = read (site and app call this on navigation)
create or replace function public.mark_notifications_read_for_url(p_path text, p_full text default null)
returns integer language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  if auth.uid() is null or coalesce(p_path, '') = '' then return 0; end if;
  update notifications set is_read = true
   where user_id = auth.uid() and not is_read
     and (data->>'url' = p_path or (p_full is not null and data->>'url' = p_full));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.mark_notifications_read_for_url(text, text) from public, anon;
grant execute on function public.mark_notifications_read_for_url(text, text) to authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'whatsapp-queue';
select cron.schedule('whatsapp-queue', '*/5 * * * *', $$select public.process_whatsapp_queue()$$);
