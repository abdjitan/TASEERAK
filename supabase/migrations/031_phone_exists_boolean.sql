-- SECURITY FIX #3 (phone): phone_exists returned the company name to anon,
-- enabling phone enumeration of who is registered. Return a boolean only.
drop function if exists public.phone_exists(text);
create or replace function public.phone_exists(p_phone text)
returns boolean language sql security definer stable set search_path to 'public'
as $$ select exists(select 1 from public.profiles where phone = p_phone and coalesce(p_phone,'') <> '') $$;
grant execute on function public.phone_exists(text) to anon, authenticated;
