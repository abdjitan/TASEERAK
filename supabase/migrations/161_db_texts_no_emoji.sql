-- 161: notification and error texts written by the database follow the UI wording
-- (live review 2026-10-17): no emoji in titles, «اختيار العرض» instead of «ترسية», Western digits.
-- Bodies are otherwise unchanged (dumped from the live functions and edited in place).

CREATE OR REPLACE FUNCTION public.attach_supplier_invoice(p_offer_id uuid, p_url text, p_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v offers; v_contractor uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط المورد يمكنه إرفاق فاتورته'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if coalesce(p_url, '') !~ ('/licenses/' || auth.uid()::text || '/[^/]+$') then raise exception 'رابط الملف غير صالح'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_invoice_url = p_url, supplier_invoice_name = left(coalesce(p_name, 'فاتورة'), 120),
                    supplier_invoice_at = now()
   where id = p_offer_id returning * into v;
  select contractor_id into v_contractor from rfqs where id = v.rfq_id;
  insert into notifications (user_id, type, title, body, data)
  values (v_contractor, 'offer_accepted', 'أرفق المورد فاتورته',
    'أرفق المورد الفاتورة الرسمية للصفقة. يمكنك تنزيلها من صفحة الصفقة.',
    jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return to_jsonb(v);
end $function$;

CREATE OR REPLACE FUNCTION public.confirm_delivery(p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v offers; v_contractor uuid; v_product text;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط المورّد يمكنه تأكيد التسليم'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.supplier_delivered_at is not null then raise exception 'تم تأكيد التسليم مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_delivered_at = now() where id = p_offer_id returning * into v;
  select contractor_id, public.rfq_label(rfqs) into v_contractor, v_product from rfqs where id = v.rfq_id;
  insert into notifications (user_id, type, title, body, data)
  values (v_contractor, 'offer_accepted', 'أكّد المورد التوصيل',
    'أكّد المورد توصيل «' || coalesce(v_product, 'طلبك') || '». يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.',
    jsonb_build_object('url', '/contractor/rfq/' || v.rfq_id::text || '/offer/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return to_jsonb(v);
end; $function$;

CREATE OR REPLACE FUNCTION public.confirm_receipt(p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v offers; v_is_contractor boolean;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select exists(select 1 from rfqs r where r.id = v.rfq_id and r.contractor_id = auth.uid()) into v_is_contractor;
  if not v_is_contractor then raise exception 'فقط المشتري يمكنه تأكيد الاستلام'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.supplier_delivered_at is null then raise exception 'لم يؤكّد المورّد التسليم بعد'; end if;
  if v.received_at is not null then raise exception 'تم تأكيد الاستلام مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set received_at = now(), received_by = auth.uid() where id = p_offer_id returning * into v;
  insert into notifications (user_id, type, title, body, data)
  values (v.supplier_id, 'offer_accepted', 'أكّد المشتري الاستلام',
    'تم تأكيد استلام البضاعة. شكراً لإتمام الصفقة عبر تسعيرك.',
    jsonb_build_object('url', '/supplier/dashboard/rfq/' || v.rfq_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return to_jsonb(v);
end; $function$;

CREATE OR REPLACE FUNCTION public.notify_supplier_offer_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' then
      insert into notifications (user_id, type, title, body, data)
      values (new.supplier_id, 'offer_accepted', 'اختار المشتري عرضك',
        'اختار المشتري مواد من عرضك. راجع أمر الشراء ونسّق التسليم معه.',
        jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
    elsif new.status = 'rejected' then
      insert into notifications (user_id, type, title, body, data)
      values (new.supplier_id, 'offer_rejected', 'لم يُقبل عرضك',
        'اختار المشتري مورداً آخر في هذا الطلب.',
        jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
    end if;
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id uuid, p_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_c record; v_other uuid; v_id uuid; v_sender_name text; v_awarded boolean; v_count int;
begin
  select * into v_c from conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'Conversation not found'; end if;
  if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_body),'') = '' then raise exception 'Empty message'; end if;
  v_awarded := exists (
    select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted'
  );
  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = p_conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل اختيار العرض (20 رسالة). يكتمل التواصل بعد اختيار العرض.';
    end if;
    p_body := public.mask_contact_digits(p_body);
  end if;
  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update conversations set last_message = left(btrim(p_body), 140), last_message_at = now() where id = p_conversation_id;
  v_other := case when auth.uid() = v_c.contractor_id then v_c.supplier_id else v_c.contractor_id end;
  if auth.uid() = v_c.contractor_id and not v_awarded then
    v_sender_name := 'مشترٍ';
  else
    select coalesce(nullif(btrim(company_name_ar), ''), 'مستخدم') into v_sender_name from profiles where id = auth.uid();
  end if;
  insert into notifications (user_id, type, title, body, data)
  values (v_other, 'new_message', 'رسالة جديدة من ' || v_sender_name, left(btrim(p_body), 80),
          jsonb_build_object('url', '/messages?c=' || p_conversation_id::text, 'conversation_id', p_conversation_id));
  return v_id;
end $function$;
