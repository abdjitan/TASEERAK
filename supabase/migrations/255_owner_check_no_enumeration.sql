-- 255: admin_unconfirmed_owner returned nothing for a confirmed account, and the route then said
-- «already_confirmed» even to a wrong password, which revealed that the e-mail has an account.
-- Now the password is checked for every account, and the confirmed flag comes back only on a match.
-- (the old admin_unconfirmed_owner stays until the new route is live; dropped in a later migration)
create or replace function public.admin_account_owner(p_email text, p_password text)
returns table (id uuid, created_at timestamptz, email_confirmed boolean)
language sql stable security definer set search_path = public, auth, extensions as $$
  select u.id, u.created_at, u.email_confirmed_at is not null
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
    and u.deleted_at is null
    and u.encrypted_password is not null and u.encrypted_password <> ''
    and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
  limit 1
$$;
revoke all on function public.admin_account_owner(text, text) from public, anon, authenticated;
grant execute on function public.admin_account_owner(text, text) to service_role;
