-- 231: legal texts version 2026-11-18 (owner approved 2026-11-18, legal session text adapted by main).
-- Privacy §1: approximate location (country/region/city from the connection, no GPS, no IP stored).
-- Privacy §3: phone code by SMS via Google Firebase, email code; location used for abuse prevention only.
-- Privacy §7: approximate-location log deleted after 90 days (229/230).
-- Terms §4: phone + email verification required before requests/offers/messages (222).
-- Terms §7A: independent seller = pricing agent (213/214): hidden source shop, tax invoice before
-- receipt, quotation not invoice, tiered deal cap.
-- Must equal src/lib/legal.ts TERMS_VERSION. Existing users re-accept once via TermsGate.
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = public as $$ select '2026-11-18'::text $$;
