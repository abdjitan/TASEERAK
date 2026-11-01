-- 182: email notifications that people want (ops audit 2026-11-01). Since 27 Oct every notification
-- was also emailed: every chat message, every team copy, every admin alert. Now:
--  * profiles.email_notifications — the person's choice (Settings), on by default;
--  * email_sends — when an email of a kind last went to a person, so the notify function can space
--    them out (new requests at most hourly, messages at most every 3 hours as «لديك رسائل جديدة»);
--  * deliver_notification logs its own failures instead of hiding them.
alter table public.profiles add column if not exists email_notifications boolean not null default true;

create table if not exists public.email_sends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.email_sends enable row level security;
revoke all on public.email_sends from anon, authenticated;

-- the person may switch emails off/on (their own row only; the field lock trigger allows it)
create or replace function public.set_email_notifications(p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'سجّل الدخول أولاً.'; end if;
  update profiles set email_notifications = coalesce(p_on, true) where id = auth.uid();
end $$;
revoke all on function public.set_email_notifications(boolean) from public, anon;
grant execute on function public.set_email_notifications(boolean) to authenticated;

-- delivery failures were swallowed silently: keep the same «never block the insert» rule, but log
create or replace function public.deliver_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg record;
begin
  select function_url, notify_secret, resend_api_key into cfg from public.notify_config where id = true;
  if cfg.function_url is null or new.user_id is null then return new; end if;
  if cfg.resend_api_key is null
     and not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id)
     and not exists (select 1 from public.device_tokens d where d.user_id = new.user_id) then
    return new;
  end if;
  perform net.http_post(
    url := cfg.function_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', cfg.notify_secret)
  );
  return new;
exception when others then
  begin insert into public.system_errors_log(context, message, user_id) values ('deliver_notification', left(sqlerrm, 500), new.user_id);
  exception when others then null; end;
  return new;
end $$;
