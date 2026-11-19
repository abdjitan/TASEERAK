-- 236: legal texts version 2026-11-19 (owner approved 2026-11-19, legal session wording).
-- Privacy §7: purged requests keep anonymous quoted item prices too (price_observations, 235).
-- Privacy §3: anonymous prices feed market averages/indicators for current and future services;
-- an aggregate is shown only when built from enough prices that none can be traced.
-- Terms §5: the seller agrees his quoted prices may be kept anonymously and used in aggregate.
-- Must equal src/lib/legal.ts TERMS_VERSION. Existing users re-accept once via TermsGate.
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = public as $$ select '2026-11-19'::text $$;
