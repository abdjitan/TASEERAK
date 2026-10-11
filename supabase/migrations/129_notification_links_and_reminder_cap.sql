-- 129: Notifications found broken in the end-to-end test (2026-10-11).
-- 1. "عرض سعر جديد" (buyer) and "تم تمديد مهلة التسعير" (supplier) had no data.url, so they could not
--    be opened (the bell and /notifications only navigate on data.url).
-- 2. The supplier confirming delivery did not notify the buyer; the buyer confirming receipt did
--    not notify the supplier.
-- 3. Deal reminders repeated every day forever (one stuck test deal produced 100 per side).
--    Now at most 3 reminders of each kind per deal and person.
-- 4. Dialect in the deadline-extension text.

-- 1a. new offer -> buyer's request page
create or replace function public.notify_contractor_new_offer()
returns trigger language plpgsql security definer set search_path = public as $function$
declare v_contractor uuid; v_product text;
begin
  select contractor_id, product_name into v_contractor, v_product from rfqs where id = new.rfq_id;
  if v_contractor is not null then
    insert into notifications (user_id, type, title, body, data)
    values (v_contractor, 'rfq_offer', 'عرض سعر جديد',
      'وصلك عرض جديد على "' || coalesce(v_product, 'طلبك') || '" بسعر ' || coalesce(new.total_price::text, '') || ' ر.س',
      jsonb_build_object('url', '/contractor/rfq/' || new.rfq_id::text, 'rfq_id', new.rfq_id, 'offer_id', new.id));
  end if;
  return new;
end; $function$;

-- 1b + 4. deadline extension -> supplier's request page, formal Arabic
do $$
declare d text := pg_get_functiondef('public.extend_rfq_deadline'::regproc); n text;
begin
  n := replace(d, 'jsonb_build_object(''rfq_id'', p_rfq_id)',
                  'jsonb_build_object(''url'', ''/supplier/dashboard/rfq/'' || p_rfq_id::text, ''rfq_id'', p_rfq_id)');
  n := replace(n, 'تقدر تراجع عرضك حتى', 'يمكنك مراجعة عرضك حتى');
  if n = d then raise exception 'extend_rfq_deadline: pattern not found'; end if;
  execute n;
end $$;

-- 2a. supplier confirmed delivery -> tell the buyer
create or replace function public.confirm_delivery(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare v offers; v_contractor uuid; v_product text;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> auth.uid() then raise exception 'فقط المورّد يمكنه تأكيد التسليم'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.supplier_delivered_at is not null then raise exception 'تم تأكيد التسليم مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_delivered_at = now() where id = p_offer_id returning * into v;
  select contractor_id, coalesce(title, product_name) into v_contractor, v_product from rfqs where id = v.rfq_id;
  insert into notifications (user_id, type, title, body, data)
  values (v_contractor, 'offer_accepted', '🚚 أكّد المورد التوصيل',
    'أكّد المورد توصيل «' || coalesce(v_product, 'طلبك') || '». يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.',
    jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return to_jsonb(v);
end; $function$;

-- 2b. buyer confirmed receipt -> tell the supplier
create or replace function public.confirm_receipt(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare v offers; v_is_contractor boolean;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select exists(select 1 from rfqs r where r.id = v.rfq_id and r.contractor_id = auth.uid()) into v_is_contractor;
  if not v_is_contractor then raise exception 'فقط المقاول يمكنه تأكيد الاستلام'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.supplier_delivered_at is null then raise exception 'لم يؤكّد المورّد التسليم بعد'; end if;
  if v.received_at is not null then raise exception 'تم تأكيد الاستلام مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set received_at = now(), received_by = auth.uid() where id = p_offer_id returning * into v;
  insert into notifications (user_id, type, title, body, data)
  values (v.supplier_id, 'offer_accepted', '✅ أكّد المقاول الاستلام',
    'تم تأكيد استلام البضاعة. شكراً لإتمام الصفقة عبر تسعيرك.',
    jsonb_build_object('url', '/supplier/dashboard/rfq/' || v.rfq_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return to_jsonb(v);
end; $function$;

-- 3. cap deal reminders at 3 per kind, deal and person
do $$
declare d text := pg_get_functiondef('public.generate_deal_reminders'::regproc); n text;
begin
  n := replace(d,
    'AND created_at > now() - interval ''24 hours'') THEN',
    'AND (created_at > now() - interval ''24 hours'' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>''offer_id'' = notifications.data->>''offer_id'') >= 3)) THEN');
  if n = d then raise exception 'generate_deal_reminders: pattern not found'; end if;
  execute n;
end $$;

-- backfill links on existing notifications
update notifications set data = data || jsonb_build_object('url', '/contractor/rfq/' || (data->>'rfq_id'))
 where type::text = 'rfq_offer' and coalesce(data->>'url', '') = '' and data ? 'rfq_id';
update notifications n set data = n.data || jsonb_build_object('url', '/supplier/dashboard/rfq/' || (n.data->>'rfq_id'))
 where n.type::text in ('rfq_expiring', 'offer_accepted', 'offer_rejected') and coalesce(n.data->>'url', '') = '' and n.data ? 'rfq_id'
   and exists (select 1 from profiles p where p.id = n.user_id and p.role::text = 'supplier');
update notifications set data = data || jsonb_build_object('url', '/messages?c=' || (data->>'conversation_id'))
 where type::text = 'new_message' and coalesce(data->>'url', '') = '' and data ? 'conversation_id';

-- 5. price-reduction and info requests to the supplier had no link either
do $$
declare f text; d text; n text;
begin
  foreach f in array array['public.request_price_reduction', 'public.request_offer_info'] loop
    select pg_get_functiondef(p.oid) into d from pg_proc p where p.oid = to_regproc(f);
    n := replace(d, 'jsonb_build_object(''offer_id'', p_offer_id, ''rfq_id'', v_rfq,',
                    'jsonb_build_object(''url'', ''/supplier/dashboard/rfq/'' || v_rfq::text, ''offer_id'', p_offer_id, ''rfq_id'', v_rfq,');
    if n = d then raise exception '% : pattern not found', f; end if;
    execute n;
  end loop;
end $$;
update notifications set data = data || jsonb_build_object('url', '/supplier/dashboard/rfq/' || (data->>'rfq_id'))
 where data->>'kind' in ('reduction_request', 'info_request') and coalesce(data->>'url', '') = '' and data ? 'rfq_id';

-- 6. "أكّد المورد التوصيل" must open the offer page (that is where «أؤكّد الاستلام» lives), not the PO.
do $$
declare d text := pg_get_functiondef('public.confirm_delivery'::regproc); n text;
begin
  n := replace(d, '''/contractor/orders/'' || p_offer_id::text', '''/contractor/rfq/'' || v.rfq_id::text || ''/offer/'' || p_offer_id::text');
  if n = d then raise exception 'confirm_delivery: pattern not found'; end if;
  execute n;
end $$;
