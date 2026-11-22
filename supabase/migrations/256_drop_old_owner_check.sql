-- 256: the old owner check (254) is no longer used by the live route (255 replaced it)
drop function if exists public.admin_unconfirmed_owner(text, text);
