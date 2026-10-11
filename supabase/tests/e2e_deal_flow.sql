-- End-to-end deal flow + security checks, run as the real test accounts inside ONE transaction
-- that is always rolled back (the block ends with RAISE). Nothing is saved.
--
-- Run: paste into the Supabase SQL editor / MCP execute_sql. The error message is the report:
--   "E2E: 27 passed, 0 failed | ..." — any FAIL lines say what broke.
--
-- Test accounts (must exist): buyer edc9cbfe…, shop supplier 61e3c9b0…, verified company 58a5ac07…,
-- spare account e6e39fc0… (no own activity, used as a company employee).

do $$
declare
  buyer   uuid := 'edc9cbfe-05b0-4805-9c42-037bfc6b7e79';
  sup     uuid := '61e3c9b0-1507-46eb-8c55-9eddc8f78da5';
  company uuid := '58a5ac07-ec0d-4da8-a932-0379ff679416';
  emp     uuid := 'e6e39fc0-293a-41b2-847e-938964a705ab';
  v_rfq uuid; v_offer uuid; v_offer2 uuid; v_conv uuid; v_tok text; v_ref bigint;
  r jsonb; n int; t text; ok int := 0; bad int := 0; log text := '';
begin
  -- helpers are inline: as(uid) = switch the JWT subject; chk = record a result
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. buyer creates a 2-material request
  insert into rfqs (contractor_id, sector, product_name, sectors, items, quantity, unit, region, city,
                    delivery_required, hide_identity, expires_at, status)
  values (buyer, 'civil', 'أسمنت +1 أصناف أخرى', array['civil'],
          '[{"sector":"civil","product_name":"أسمنت","sub_category":"cement","quantity":20,"unit":"كيس"},
            {"sector":"civil","product_name":"بلك","sub_category":"blocks","quantity":100,"unit":"حبة"}]'::jsonb,
          20, 'كيس', 'الرياض', 'الرياض', true, true, now() + interval '2 days', 'open')
  returning id, ref_no into v_rfq, v_ref;
  select product_name into t from rfqs where id = v_rfq;
  if t = 'حزمة توريدات (مادتان)' then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL rfq name=' || t; end if;

  reset role;
  select count(*) into n from notifications where type = 'new_rfq' and data->>'rfq_id' = v_rfq::text
     and data->>'url' like '/supplier/dashboard/rfq/%' and body like 'RFQ-' || v_ref || ' ·%';
  if n > 0 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL suppliers not notified with ref'; end if;

  -- 2. pre-award message: buyer is masked as "مشترٍ"
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_conv := public.get_or_create_conversation(v_rfq, sup);
  perform public.send_message(v_conv, 'اختبار: هل الأسمنت متوفر؟ اتصل 0551234567');
  reset role;
  select title into t from notifications where user_id = sup and data->>'conversation_id' = v_conv::text order by created_at desc limit 1;
  if t = 'رسالة جديدة من مشترٍ' then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL msg title=' || coalesce(t, 'null'); end if;
  select count(*) into n from messages where conversation_id = v_conv and body like '%0551234567%';
  if n = 0 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL phone not masked pre-award'; end if;

  -- 3. supplier sees the request without the buyer identity, and quotes
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.get_rfq_for_viewer(v_rfq);
  if r is not null and not (r ? 'contractor_id') then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL viewer rfq/identity'; end if;
  if public.can_submit_quote() then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL supplier cannot quote'; end if;
  insert into offers (rfq_id, supplier_id, total_price, status, source_type, availability, item_prices)
  values (v_rfq, sup, 500, 'accepted', 'shop', 'now',
          '[{"item_index":0,"product_name":"أسمنت","quantity":20,"unit":"كيس","unit_price":25,"total":500,"warranty":"بدون ضمان"}]'::jsonb)
  returning id into v_offer;
  select status::text into t from offers where id = v_offer;
  if t = 'pending' then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL supplier self-accepted=' || t; end if;
  -- supplier cannot quote as someone else
  begin
    insert into offers (rfq_id, supplier_id, total_price) values (v_rfq, company, 1);
    bad := bad + 1; log := log || ' FAIL quoted as another supplier';
  exception when others then ok := ok + 1; end;

  reset role;
  select count(*) into n from offers where id = v_offer and submitted_by = sup and item_prices->0->>'warranty' = 'بدون ضمان';
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL submitted_by/warranty'; end if;
  select count(*) into n from notifications where user_id = buyer and type = 'rfq_offer' and data->>'offer_id' = v_offer::text
     and data->>'url' = '/contractor/rfq/' || v_rfq;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL buyer new-offer notification'; end if;

  -- 4. a stranger cannot see the buyer's offers
  perform set_config('request.jwt.claims', json_build_object('sub', emp, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from offers where rfq_id = v_rfq;
  if n = 0 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL stranger sees offers'; end if;

  -- 5. company team: employee quotes for the company
  perform set_config('request.jwt.claims', json_build_object('sub', company, 'role', 'authenticated')::text, true);
  v_tok := public.create_company_invite('member')->>'token';
  perform set_config('request.jwt.claims', json_build_object('sub', emp, 'role', 'authenticated')::text, true);
  if (public.accept_company_invite(v_tok)->>'ok')::boolean then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL accept invite'; end if;
  perform set_config('app.bypass_locks', 'off', true);
  insert into offers (rfq_id, supplier_id, total_price, source_type, item_prices)
  values (v_rfq, company, 480, 'own_stock', '[{"item_index":0,"product_name":"أسمنت","quantity":20,"unit":"كيس","total":480}]'::jsonb)
  returning id into v_offer2;
  begin
    insert into offers (rfq_id, supplier_id, total_price) values (v_rfq, emp, 1);
    bad := bad + 1; log := log || ' FAIL employee quoted as self';
  exception when others then ok := ok + 1; end;
  reset role;
  select count(*) into n from offers where id = v_offer2 and submitted_by = emp;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL employee offer'; end if;

  -- 6. buyer awards item 0 to the shop and finalizes
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from offers where rfq_id = v_rfq;
  if n = 2 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL buyer sees ' || n || ' offers'; end if;
  perform public.award_rfq_item(v_rfq, 0, v_offer);
  perform public.finalize_rfq_awards(v_rfq);
  reset role;
  select status::text into t from offers where id = v_offer;
  if t = 'accepted' then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL award status=' || t; end if;
  select status::text into t from offers where id = v_offer2;
  if t = 'rejected' then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL losing offer=' || t; end if;
  select count(*) into n from notifications where user_id = sup and type = 'offer_accepted' and data->>'offer_id' = v_offer::text
     and data->>'url' = '/supplier/dashboard/rfq/' || v_rfq;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL award notification count=' || n; end if;
  select count(*) into n from notifications where user_id = emp and type = 'offer_rejected' and data->>'offer_id' = v_offer2::text;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL team copy of rejection'; end if;

  -- 7. delivery -> invoice -> receipt -> payment
  perform set_config('app.deal_write', 'off', true);
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.confirm_delivery(v_offer);
  r := public.attach_supplier_invoice(v_offer,
         'https://afqksuduomkdqrcohntk.supabase.co/storage/v1/object/public/licenses/' || sup || '/offer-e2e.pdf', 'فاتورة.pdf');
  if r->>'supplier_invoice_name' = 'فاتورة.pdf' then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL attach invoice'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  if public.can_access_shared_file(sup || '/offer-e2e.pdf') then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL buyer cannot open invoice'; end if;
  begin
    perform public.attach_supplier_invoice(v_offer, 'https://x/licenses/' || buyer || '/a.pdf', 'x');
    bad := bad + 1; log := log || ' FAIL buyer attached invoice';
  exception when others then ok := ok + 1; end;
  perform public.confirm_receipt(v_offer);
  perform public.mark_paid(v_offer);
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  perform public.confirm_payment(v_offer);
  perform set_config('request.jwt.claims', json_build_object('sub', emp, 'role', 'authenticated')::text, true);
  if not public.can_access_shared_file(sup || '/offer-e2e.pdf') then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL stranger opens invoice'; end if;
  reset role;
  select count(*) into n from offers where id = v_offer and supplier_delivered_at is not null and received_at is not null
     and payment_status = 'paid' and payment_confirmed_at is not null;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL deal stages'; end if;
  select count(*) into n from notifications where user_id = buyer and data->>'offer_id' = v_offer::text
     and title in ('🚚 أكّد المورد التوصيل', '🧾 أرفق المورد فاتورته');
  if n = 2 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL buyer deal notifications=' || n; end if;
  select count(*) into n from notifications where user_id = sup and data->>'offer_id' = v_offer::text and title = '✅ أكّد المشتري الاستلام';
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL receipt notification'; end if;

  -- 8. post-award: the buyer may change no price; the supplier no deal stamp
  perform set_config('app.deal_write', 'off', true);
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update offers set total_price = 1, supplier_invoice_url = null where id = v_offer;
  reset role;
  select count(*) into n from offers where id = v_offer and total_price = 500 and supplier_invoice_url is not null;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL buyer edited price/invoice'; end if;

  raise exception 'E2E: % passed, % failed |%', ok, bad, log;
end $$;
