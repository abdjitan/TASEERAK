-- 199 — security-advisor hygiene (2026-11-03 launch review)
-- 1) Trigger functions are never meant to be called over /rest/v1/rpc: revoke EXECUTE from the
--    API roles on every SECURITY DEFINER trigger function in public (triggers still fire — they run
--    with the table owner's rights, not the caller's EXECUTE grant).
-- 2) current_terms_version() gets a fixed search_path.
-- Helpers used inside RLS policies (is_admin, acting_uid, is_rfq_owner, …) and the public/pre-login
-- RPCs (email_exists/phone_exists are rate-limited) are intentionally left executable.

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

alter function public.current_terms_version() set search_path = public;
