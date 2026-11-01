-- 193: legal texts version 2026-11-01 (owner decision 1 Nov: request retention, support view).
-- Privacy: unsuccessful requests deleted 60 days after they end (7-day notice, anonymous stats
-- only), deal records kept, rate-limit records 2 days, read notifications 180 days, read-only
-- admin «support view» with reason + log + notice. Terms §12 references the 60-day deletion.
-- Must equal src/lib/legal.ts TERMS_VERSION. Existing users re-accept once via TermsGate.
-- Apply together with the web deploy that ships TERMS_VERSION = '2026-11-01'.
create or replace function public.current_terms_version()
returns text language sql immutable as $$ select '2026-11-01'::text $$;
