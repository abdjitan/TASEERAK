-- 104: Out-of-app notification delivery via Web Push.
-- Applied live 2026-07-12. Pipeline: notifications INSERT -> trigger deliver_notification
-- -> pg_net POST -> edge function `notify` (supabase/functions/notify) -> web-push.
--
-- SECRETS ARE NOT IN THIS FILE. The notify_config row (VAPID private key, shared
-- notify_secret, and later a Resend API key) was seeded directly into the DB and is
-- readable only by service_role. Only the VAPID PUBLIC key is exposed (get_vapid_public_key).

create extension if not exists pg_net;

-- Config/secrets — RLS on, zero policies => only service_role can read (edge fn uses it).
create table if not exists public.notify_config (
  id boolean primary key default true,
  vapid_public text,
  vapid_private text,
  notify_secret text,
  function_url text,
  from_email text,
  resend_api_key text,
  constraint notify_config_singleton check (id)
);
alter table public.notify_config enable row level security;
-- Seed once (values set out-of-band; do NOT commit real keys):
--   insert into public.notify_config (id, vapid_public, vapid_private, notify_secret, function_url, from_email)
--   values (true, '<VAPID_PUBLIC>', '<VAPID_PRIVATE>', '<RANDOM_SECRET>',
--           'https://<ref>.supabase.co/functions/v1/notify', 'no-reply@taseerak.com');

-- Browser push subscriptions, user-managed.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Public VAPID key for the browser subscribe step (private key stays server-only).
create or replace function public.get_vapid_public_key()
returns text language sql stable security definer set search_path to 'public'
as $$ select vapid_public from public.notify_config where id = true $$;
grant execute on function public.get_vapid_public_key() to anon, authenticated;

-- On a new notification, ping the edge function (only if the user has a push subscription).
create or replace function public.deliver_notification()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare cfg record;
begin
  select function_url, notify_secret into cfg from public.notify_config where id = true;
  if cfg.function_url is null or new.user_id is null then return new; end if;
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then
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
end; $$;

drop trigger if exists trg_deliver_notification on public.notifications;
create trigger trg_deliver_notification after insert on public.notifications
  for each row execute function public.deliver_notification();
