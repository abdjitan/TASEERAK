-- Allow multiple accounts to share a commercial registration (branch accounts),
-- and handle duplicates at registration with an advisory warning + options instead
-- of a hard DB unique that silently broke signup.
alter table public.profiles drop constraint if exists profiles_commercial_registration_key;
create index if not exists profiles_cr_idx on public.profiles(commercial_registration);

-- Public lookup so the (pre-auth) registration form can warn about a duplicate CR.
-- Returns only the existing company name + role (public business info).
create or replace function public.cr_exists(p_cr text)
returns table(company_name_ar text, role text)
language sql security definer stable as $$
  select p.company_name_ar, p.role::text
  from public.profiles p
  where p.commercial_registration = p_cr
    and coalesce(p_cr,'') <> ''
  order by p.created_at asc
  limit 1;
$$;
grant execute on function public.cr_exists(text) to anon, authenticated;
