-- 254: proof of ownership for /api/auth/fix-signup-email without a sign-in call (CAPTCHA is on for
-- password sign-in, so the server cannot use it). Checks the bcrypt hash directly and only for an
-- account whose e-mail is NOT confirmed. service_role only; the route rate-limits (5/h per e-mail).
create or replace function public.admin_unconfirmed_owner(p_email text, p_password text)
returns table (id uuid, created_at timestamptz)
language sql stable security definer set search_path = public, auth, extensions as $$
  select u.id, u.created_at
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
    and u.email_confirmed_at is null
    and u.deleted_at is null
    and u.encrypted_password is not null and u.encrypted_password <> ''
    and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
  limit 1
$$;
revoke all on function public.admin_unconfirmed_owner(text, text) from public, anon, authenticated;
grant execute on function public.admin_unconfirmed_owner(text, text) to service_role;
