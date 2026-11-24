-- 281: legal texts version 2026-11-24 (owner approved 2026-11-24): minimum age 18; a business account must
-- be authorised to represent it; the buyer's name AND mobile stay hidden until an offer is chosen; the source
-- shop is shown once the buyer chooses the offer. Equals src/lib/legal.ts.
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = public as $$ select '2026-11-24'::text $$;
