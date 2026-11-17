-- Remote switches the site and the app read at runtime (owner 2026-11-17): turning buyer phone
-- sign-in off (e.g. if SMS breaks) takes effect at once, without an app update or redeploy.
alter table public.notify_config add column if not exists buyer_phone_login boolean not null default true;

create or replace function public.app_flags()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('buyer_phone_login', coalesce((select buyer_phone_login from notify_config where id = true), true))
$$;
revoke all on function public.app_flags() from public;
grant execute on function public.app_flags() to anon, authenticated;
