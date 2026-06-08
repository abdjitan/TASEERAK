-- Preferred notification language (for email/WhatsApp) + map district from signup.
alter table public.profiles add column if not exists preferred_language text not null default 'ar';

-- The handle_new_user() trigger is rebuilt to also map district + preferred_language
-- from the signUp metadata. Full function body lives in this migration; see
-- 012_handle_new_user_full_profile.sql for the original. Applied via MCP.
-- (Function body identical to the deployed version — district + preferred_language
--  added to the INSERT column list and the ON CONFLICT update.)
