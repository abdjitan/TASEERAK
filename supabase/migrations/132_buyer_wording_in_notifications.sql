-- 132: The requester is not always a contractor (a homeowner may want a pump), so user-facing text
-- says «المشتري» (owner decision 2026-10-11). Rewrites the Arabic strings inside the notification
-- and deal functions; code identifiers are untouched.
do $$
declare r record; d text; n text;
begin
  for r in select p.oid, p.proname from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
              and p.proname in ('notify_supplier_offer_status','request_price_reduction','request_offer_info',
                                'cancel_my_offer','extend_rfq_deadline','mark_paid','send_message',
                                'confirm_receipt','generate_deal_reminders')
  loop
    d := pg_get_functiondef(r.oid);
    n := replace(replace(replace(d, 'المقاولين', 'المشترين'), 'المقاول', 'المشتري'), 'v_sender_name := ''مقاول''', 'v_sender_name := ''مشترٍ''');
    if n <> d then execute n; end if;
  end loop;
end $$;
