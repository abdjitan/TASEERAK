-- 253: server-only lookup of an account by e-mail, for /api/auth/fix-signup-email (owner 2026-11-22: a
-- seller typed «gmail.comm», never got the confirmation link and was stuck). Returns the id, whether the
-- e-mail is confirmed and when the account was created. service_role only — never callable by users.
create or replace function public.admin_user_by_email(p_email text)
returns table (id uuid, email_confirmed boolean, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email_confirmed_at is not null, u.created_at
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  limit 1
$$;
revoke all on function public.admin_user_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_user_by_email(text) to service_role;
