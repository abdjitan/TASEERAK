-- 276: legal texts version 2026-11-23 (owner approved 2026-11-23): only the mobile is required for every
-- user (sellers also verify email); all prices shown to the buyer include VAT (an unregistered seller's price
-- is final); the buyer's name and mobile stay hidden from suppliers until an offer is chosen. Equals src/lib/legal.ts.
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = public as $$ select '2026-11-23'::text $$;
