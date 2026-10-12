-- 139: Supabase security-advisor follow-ups (2026-10-12).
-- Trigger functions are never meant to be called through /rpc (triggers fire without EXECUTE).
revoke execute on function public.fanout_company_notification() from public, anon, authenticated;
revoke execute on function public.limit_unverified_offers() from public, anon, authenticated;
revoke execute on function public.normalize_rfq_name() from public, anon, authenticated;
-- Pin search_path on the request-name helpers.
alter function public.ar_items(integer) set search_path = public;
alter function public.rfq_label(public.rfqs) set search_path = public;
alter function public.normalize_rfq_name() set search_path = public;
