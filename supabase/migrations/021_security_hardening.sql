-- Security hardening (from the Supabase security advisor).

-- 1) Pin search_path on SECURITY DEFINER functions (prevents search_path hijack).
alter function public.recompute_supplier_rating() set search_path = public;
alter function public.get_supplier_stats(uuid[]) set search_path = public;

-- 2) Trigger functions must NOT be callable via /rest/v1/rpc/*. Postgres grants
--    EXECUTE to PUBLIC by default, so we revoke from PUBLIC. (Triggers keep
--    firing — trigger execution does not require the caller's EXECUTE grant.)
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.update_rfq_offer_count() from public;
revoke execute on function public.notify_contractor_new_offer() from public;
revoke execute on function public.notify_supplier_offer_status() from public;
revoke execute on function public.recompute_supplier_rating() from public;

-- 3) Aggregate data RPCs require a signed-in user (remove PUBLIC, grant authenticated).
revoke execute on function public.get_market_prices() from public, anon;
grant  execute on function public.get_market_prices() to authenticated;
revoke execute on function public.get_supplier_stats(uuid[]) from public, anon;
grant  execute on function public.get_supplier_stats(uuid[]) to authenticated;
-- Note: is_admin() is intentionally left callable — it is used inside RLS
-- policies and returns only the caller's own admin status.

-- 4) Stop anonymous enumeration/listing of the public "licenses" bucket.
--    Direct (unguessable) object URLs keep working; the API LIST is removed.
drop policy if exists "licenses public read" on storage.objects;
