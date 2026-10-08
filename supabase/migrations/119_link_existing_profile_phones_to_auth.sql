-- 119 (applied 2026-10-08 via MCP as link_existing_profile_phones_to_auth)
-- So WhatsApp OTP login with an existing account's phone signs into THAT account instead of
-- creating a duplicate. One-time backfill (10 pre-launch accounts, no duplicate phones).
-- phone_confirmed_at stays null until the user completes an OTP.
update auth.users u
   set phone = '966' || substr(p.phone, 2)
  from public.profiles p
 where p.id = u.id
   and p.phone ~ '^05[0-9]{8}$'
   and coalesce(u.phone, '') = ''
   and not exists (select 1 from auth.users x where x.phone = '966' || substr(p.phone, 2));
