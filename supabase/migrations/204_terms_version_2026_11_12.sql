-- 204: legal texts version 2026-11-12 (owner approved 2026-11-12, legal session).
-- Privacy §3: inviting businesses via publicly listed contacts, opt-out, suppression list only.
-- Privacy §4: processors Resend (email), Meta WhatsApp Business Platform (+ Claude auto-replies),
-- Twilio (telephony provider for our business number only).
-- Terms §8: objectionable-content list, zero tolerance, report/block + admin review (Play UGC).
-- Must equal src/lib/legal.ts TERMS_VERSION. Existing users re-accept once via TermsGate.
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = public as $$ select '2026-11-12'::text $$;
