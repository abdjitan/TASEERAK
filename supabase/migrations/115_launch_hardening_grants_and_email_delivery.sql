-- 115: launch hardening (applied 2026-10-08 via MCP as launch_hardening_grants_and_email_delivery)
-- Also rotated notify_config.notify_secret out-of-band (value lives only in the DB).

-- 1) Internal job: nobody but postgres/cron should trigger reminder generation.
revoke execute on function public.generate_deal_reminders() from public, anon, authenticated;

-- 2) Trigger functions are never legitimately called via /rpc (triggers fire regardless of EXECUTE grants).
revoke execute on function public.check_offer_region_eligibility() from public, anon, authenticated;
revoke execute on function public.claim_discovered_on_profile() from public, anon, authenticated;
revoke execute on function public.deliver_notification() from public, anon, authenticated;
revoke execute on function public.enforce_message_limits() from public, anon, authenticated;
revoke execute on function public.enforce_rfq_limit() from public, anon, authenticated;
revoke execute on function public.lock_offer_deal_columns() from public, anon, authenticated;
revoke execute on function public.notify_suppliers_new_rfq() from public, anon, authenticated;
revoke execute on function public.reject_offer_after_deadline() from public, anon, authenticated;

-- 3) Signed-in-only RPCs: drop the anon grant (they already check auth.uid()/admin inside).
revoke execute on function public.admin_list_disputes() from public, anon;
revoke execute on function public.admin_resolve_dispute(uuid, text) from public, anon;
revoke execute on function public.get_my_supplier_analytics() from public, anon;
revoke execute on function public.submit_contractor_review(uuid, integer, text) from public, anon;

-- 4) Pin search_path (linter 0011).
alter function public.taxonomy_touch() set search_path = public;

-- 5) Out-of-app delivery: also call the edge function when email is configured,
--    not only when the user has a push subscription (otherwise email never sends).
create or replace function public.deliver_notification()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare cfg record;
begin
  select function_url, notify_secret, resend_api_key into cfg from public.notify_config where id = true;
  if cfg.function_url is null or new.user_id is null then return new; end if;
  if cfg.resend_api_key is null
     and not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then
    return new;
  end if;
  perform net.http_post(
    url := cfg.function_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', cfg.notify_secret)
  );
  return new;
exception when others then
  return new; -- delivery must never block the notification insert
end; $function$;
revoke execute on function public.deliver_notification() from public, anon, authenticated;
