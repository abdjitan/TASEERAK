-- 138: deliver notifications to the mobile app too (REQUESTS_FOR_WEB R3). Applied 2026-10-12.
-- The `notify` edge function (v3) now also sends Expo push to device_tokens; call it when the user
-- has an app device, not only a web-push subscription or email.
create or replace function public.deliver_notification()
returns trigger
language plpgsql security definer set search_path = public
as $$
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
  return new; -- delivery must never block the notification insert
end $$;
revoke execute on function public.deliver_notification() from public, anon, authenticated;
