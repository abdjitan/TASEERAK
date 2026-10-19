-- One CR = one account + claim flow (migrations 170/171), run as the real test accounts inside
-- ONE transaction that is always rolled back (the block ends with RAISE). Nothing is saved.
--
-- Run: paste into the Supabase SQL editor / MCP execute_sql. The error message is the report:
--   "CR: N passed, 0 failed | ..." — any FAIL lines say what broke.
--
-- Accounts (from e2e_deal_flow.sql): buyer edc9cbfe…, shop supplier 61e3c9b0…, spare e6e39fc0…,
-- admin c259d020…. Test CR 7009999901 must be free.

do $$
declare
  buyer uuid := 'edc9cbfe-05b0-4805-9c42-037bfc6b7e79';
  sup   uuid := '61e3c9b0-1507-46eb-8c55-9eddc8f78da5';
  spare uuid := 'e6e39fc0-293a-41b2-847e-938964a705ab';
  adm   uuid := 'c259d020-621f-4dac-a142-b137266f3b48';
  cr    text := '7009999901';
  v_claim uuid; n int; t text; h text; ok int := 0; bad int := 0; log text := '';
begin
  if exists (select 1 from profiles where commercial_registration = cr) then
    raise exception 'CR test aborted: % is in use', cr;
  end if;

  -- 1. normalisation: Arabic-Indic digits + spaces are stored as ASCII digits
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update profiles set commercial_registration = '٧٠٠ ٩٩٩ ٩٩٠١' where id = sup;
  reset role;
  select commercial_registration into t from profiles where id = sup;
  if t = cr then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL normalise=' || coalesce(t, 'null'); end if;

  -- 2. a second account cannot take the same CR (any spelling) → CR_TAKEN
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update profiles set commercial_registration = ' 7009999901 ' where id = buyer;
    bad := bad + 1; log := log || ' FAIL buyer took a held CR';
  exception when others then
    get stacked diagnostics h = pg_exception_hint;
    if h = 'CR_TAKEN' then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL hint=' || coalesce(h, 'null') || ' ' || sqlerrm; end if;
  end;
  reset role;

  -- 3. not even an admin can put the held CR on another account
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update profiles set commercial_registration = cr where id = spare;
    bad := bad + 1; log := log || ' FAIL admin duplicated a CR';
  exception when others then ok := ok + 1; end;
  reset role;

  -- 4. cr_exists() sees the normalised value
  if public.cr_exists('٧٠٠٩٩٩٩٩٠١') then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL cr_exists'; end if;

  -- 5. untouched existing rows still update (no retroactive block)
  update profiles set updated_at = updated_at where commercial_registration = '1009084000';
  ok := ok + 1;

  -- 6. admin_review_verification: non-admin refused, admin verifies + notifies
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.admin_review_verification(sup, 'verified', null);
    bad := bad + 1; log := log || ' FAIL non-admin verified';
  exception when others then ok := ok + 1; end;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  -- a company seller without an uploaded CR document cannot be verified
  update profiles set cr_url = null where id = sup;
  begin
    perform public.admin_review_verification(sup, 'verified', null);
    bad := bad + 1; log := log || ' FAIL verified without a CR document';
  exception when others then ok := ok + 1; end;
  reset role;
  update profiles set cr_url = sup::text || '/cr.pdf' where id = sup;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.admin_review_verification(sup, 'verified', null);
  reset role;
  select verification_status::text into t from profiles where id = sup;
  select count(*) into n from notifications where user_id = sup and type = 'account_verified' and created_at > now() - interval '1 minute';
  if t = 'verified' and n > 0 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL admin verify status=' || t || ' notif=' || n; end if;

  -- 7. claim: path outside the claimant's folder refused; valid claim notifies the holder (name, no contact)
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.submit_cr_claim(cr, 'مؤسسة الاختبار', '0500000000', sup::text || '/claim.pdf');
    bad := bad + 1; log := log || ' FAIL claim with foreign file path';
  exception when others then ok := ok + 1; end;
  v_claim := public.submit_cr_claim(cr, 'مؤسسة الاختبار', '0500000000', buyer::text || '/claim.pdf');
  begin
    perform public.submit_cr_claim(cr, 'مؤسسة الاختبار', '0500000000', buyer::text || '/claim.pdf');
    bad := bad + 1; log := log || ' FAIL second open claim';
  exception when others then ok := ok + 1; end;
  reset role;
  select count(*) into n from notifications where user_id = sup and type = 'cr_claim' and data->>'claim_id' = v_claim::text
     and body like '%' || cr || '%مؤسسة الاختبار%' and body not like '%0500000000%';
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL holder notification n=' || n; end if;
  select count(*) into n from notifications where user_id = adm and type = 'cr_claim' and data->>'claim_id' = v_claim::text;
  if n >= 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL admin not notified'; end if;

  -- 8. the holder sees the claim through the RPC only (no contact, no direct table read)
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.get_my_cr_claims() where id = v_claim and claimant_name = 'مؤسسة الاختبار';
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL holder rpc n=' || n; end if;
  select count(*) into n from cr_claims where id = v_claim;
  if n = 0 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL holder read the claim table'; end if;
  -- holder answers once
  perform public.respond_cr_claim(v_claim, 'السجل لمؤسستنا ولدينا المستندات.');
  begin
    perform public.respond_cr_claim(v_claim, 'ردّ ثانٍ');
    bad := bad + 1; log := log || ' FAIL second holder response';
  exception when others then ok := ok + 1; end;
  -- holder cannot resolve
  begin
    perform public.admin_resolve_cr_claim(v_claim, 'approved', null);
    bad := bad + 1; log := log || ' FAIL non-admin resolved';
  exception when others then ok := ok + 1; end;
  reset role;

  -- 9. admin approves → CR moves to the claimant (pending, claim file as his CR doc); holder back to pending
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.admin_resolve_cr_claim(v_claim, 'approved', 'اختبار');
  reset role;
  select count(*) into n from profiles where id = sup and commercial_registration is null and verification_status = 'pending';
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL holder not released'; end if;
  select count(*) into n from profiles where id = buyer and commercial_registration = cr and verification_status = 'pending'
     and cr_url = buyer::text || '/claim.pdf';
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL claimant did not get the CR'; end if;
  select count(*) into n from cr_claims where id = v_claim and status = 'approved' and resolved_by = adm;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL claim not closed'; end if;

  -- 10. a rejected account releases its CR
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.admin_review_verification(buyer, 'rejected', 'اختبار');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update profiles set commercial_registration = cr where id = sup;
    ok := ok + 1;
  exception when others then bad := bad + 1; log := log || ' FAIL rejected did not release: ' || sqlerrm; end;
  reset role;

  -- 11. deleting an account releases its CR
  perform set_config('request.jwt.claims', json_build_object('sub', spare, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.delete_my_account();
  reset role;
  select count(*) into n from profiles where id = spare and commercial_registration is null;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL delete kept the CR'; end if;

  raise exception 'CR: % passed, % failed |%', ok, bad, log;
end $$;
