-- Lets the registration form check (pre-auth) whether a phone is already used,
-- so a phone can't be registered twice. Mirrors cr_exists.
create or replace function public.phone_exists(p_phone text)
returns table(company_name_ar text, role text)
language sql security definer stable
set search_path to 'public'
as $$
  select company_name_ar, role::text from public.profiles
  where phone = p_phone and coalesce(p_phone,'') <> ''
  order by created_at asc limit 1;
$$;
grant execute on function public.phone_exists(text) to anon, authenticated;
