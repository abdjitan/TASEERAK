-- SECURITY FIX #3 (CR): cr_exists returned the company name to anon, enabling
-- enumeration of who is registered. Return boolean only (the duplicate-CR
-- warning still works; the admin objection record keeps its own company lookup).
drop function if exists public.cr_exists(text);
create or replace function public.cr_exists(p_cr text)
returns boolean language sql security definer stable set search_path to 'public'
as $$ select exists(select 1 from public.profiles where commercial_registration = p_cr and coalesce(p_cr,'') <> '') $$;
grant execute on function public.cr_exists(text) to anon, authenticated;
