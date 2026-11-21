-- 249: legal texts version 2026-11-21 (owner approved 2026-11-21): terms §7A, the buyer sees the source
-- shop's name after the award (248, new Consumer Protection Law). Must equal src/lib/legal.ts.
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = public as $$ select '2026-11-21'::text $$;
