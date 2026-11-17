-- Buyer phone sign-up + email verification for everyone (owner 2026-11-17).
--  * A buyer signs up / signs in with the mobile only (Google SMS code → /api/auth/phone-session).
--    Their auth email starts as an internal placeholder until they add and verify a real one.
--  * Every email is verified with a 6-digit code we send (/api/email/start → /api/email/confirm):
--    the Supabase project auto-confirms sign-up emails, so profiles.email_verified_at is the truth.

alter table public.profiles add column if not exists email_verified_at timestamptz;

-- clients can't set it (service role / bypass only), like the phone verification columns (207)
create or replace function public.guard_email_verification()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'service_role' or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then new.email_verified_at := null; return new; end if;
  new.email_verified_at := old.email_verified_at;
  return new;
end $$;
drop trigger if exists ab_guard_email_verification on public.profiles;
create trigger ab_guard_email_verification before insert or update on public.profiles
  for each row execute function public.guard_email_verification();

-- pending email codes (one per user); only the server routes touch it
create table if not exists public.email_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   int not null default 0,
  sent_at    timestamptz not null default now()
);
alter table public.email_codes enable row level security;
revoke all on public.email_codes from anon, authenticated;

-- the account that owns a verified mobile (digits compared), for the phone sign-in route only
create or replace function public.account_by_verified_phone(p_phone text)
returns table (id uuid, role text, email text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, p.role::text, u.email
    from profiles p join auth.users u on u.id = p.id
   where p.phone_verified_at is not null
     and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 9) = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9)
     and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
   order by p.phone_verified_at asc
   limit 1
$$;
revoke all on function public.account_by_verified_phone(text) from public, anon, authenticated;

-- is this email already used by another account? (server routes only)
create or replace function public.email_taken(p_email text, p_user uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where lower(email) = lower(btrim(p_email)) and id <> p_user)
$$;
revoke all on function public.email_taken(text, uuid) from public, anon, authenticated;

-- (applied with the migration) the server routes run as service_role
grant execute on function public.account_by_verified_phone(text) to service_role;
grant execute on function public.email_taken(text, uuid) to service_role;
grant all on public.email_codes to service_role;
