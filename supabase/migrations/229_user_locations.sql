-- Where people sign up / sign in from (owner 2026-11-17): the site and the app call
-- /api/track-location once per session; the server reads the approximate location from the
-- connection (Vercel geo headers: country, region, city — no GPS, no raw IP stored).
--   profiles.signup_country/_city: the first session after sign-up
--   profiles.last_country/_city/last_location_at: the latest session
--   user_locations: one row per session (kept 90 days, migration 230) for the admin page
-- A sign-up from outside Saudi Arabia alerts the admins (they decide; nothing is blocked).
alter table public.profiles add column if not exists signup_country text;
alter table public.profiles add column if not exists signup_city text;
alter table public.profiles add column if not exists last_country text;
alter table public.profiles add column if not exists last_city text;
alter table public.profiles add column if not exists last_location_at timestamptz;

create table if not exists public.user_locations (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  at         timestamptz not null default now(),
  country    text,
  region     text,
  city       text,
  client     text
);
create index if not exists user_locations_user_idx on public.user_locations (user_id, at desc);
alter table public.user_locations enable row level security;
revoke all on public.user_locations from anon, authenticated;
grant select on public.user_locations to authenticated;
drop policy if exists "admins read user locations" on public.user_locations;
create policy "admins read user locations" on public.user_locations for select to authenticated using ((select public.is_admin()));
grant all on public.user_locations to service_role;
grant usage, select on sequence public.user_locations_id_seq to service_role;

-- clients can't write these columns (service role only)
create or replace function public.guard_location_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'service_role' or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.signup_country := null; new.signup_city := null; new.last_country := null; new.last_city := null; new.last_location_at := null;
    return new;
  end if;
  new.signup_country := old.signup_country; new.signup_city := old.signup_city;
  new.last_country := old.last_country; new.last_city := old.last_city; new.last_location_at := old.last_location_at;
  return new;
end $$;
drop trigger if exists ab_guard_location_columns on public.profiles;
create trigger ab_guard_location_columns before insert or update on public.profiles
  for each row execute function public.guard_location_columns();

-- clean-up: keep 180 days of session rows
create or replace function public.purge_user_locations()
returns void language sql security definer set search_path = public as $$
  delete from user_locations where at < now() - interval '180 days'
$$;
revoke all on function public.purge_user_locations() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-user-locations';
    perform cron.schedule('purge-user-locations', '17 3 * * *', 'select public.purge_user_locations()');
  end if;
end $$;
