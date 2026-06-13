-- Pre-auth email duplicate check (mirrors phone_exists / cr_exists).
-- Lets the registration step-1 warn that an email is already registered
-- before the user fills the rest of the wizard. Returns only a boolean.
create or replace function public.email_exists(p_email text)
returns boolean
language sql
security definer
set search_path to 'public', 'auth'
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(btrim(p_email))
  );
$$;
revoke execute on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
