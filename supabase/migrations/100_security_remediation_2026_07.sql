-- =====================================================================================
-- 100_security_remediation_2026_07.sql
-- VERBATIM CURRENT-STATE of every DB object changed while remediating the external
-- security/bug audit (rounds 1 + 2). These are the exact live definitions (dumped via
-- pg_get_functiondef from the production Supabase project) — no elided bodies.
-- Mapping to audit items: see REMEDIATION.md.
-- =====================================================================================

-- ═══════════════ C3 / SEC-02: signup can never self-assign admin ═══════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); v_role user_role := 'contractor'; s text;
begin
  begin v_role := (m->>'role')::user_role; exception when others then v_role := 'contractor'; end;
  -- 🔒 SECURITY (C3): public signup can NEVER self-assign admin. Admins are created manually only.
  if v_role not in ('contractor','supplier') then v_role := 'contractor'; end if;
  begin
    insert into profiles (id, role, company_name_ar, phone, full_name)
    values (new.id, v_role, coalesce(nullif(m->>'company_name_ar',''),'شركة جديدة'), coalesce(nullif(m->>'phone',''),''), nullif(m->>'full_name',''))
    on conflict (id) do update set role = excluded.role;
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('handle_new_user.minimal_insert', sqlerrm, new.id); exception when others then null; end;
  end;
  begin
    update profiles set
      full_name=coalesce(nullif(m->>'full_name',''),full_name),
      company_name_en=coalesce(nullif(m->>'company_name_en',''),company_name_en), phone=coalesce(nullif(m->>'phone',''),phone),
      region=coalesce(nullif(m->>'region',''),region), city=coalesce(nullif(m->>'city',''),city),
      district=coalesce(nullif(m->>'district',''),district), preferred_language=coalesce(nullif(m->>'preferred_language',''),preferred_language),
      supplier_tier=coalesce(nullif(m->>'supplier_tier',''),supplier_tier), contractor_grade=coalesce(nullif(m->>'contractor_grade',''),contractor_grade)
    where id=new.id;
  exception when others then null; end;
  begin update profiles set commercial_registration=nullif(m->>'commercial_registration','') where id=new.id and nullif(m->>'commercial_registration','') is not null; exception when others then null; end;
  begin update profiles set vat_number=nullif(m->>'vat_number','') where id=new.id and nullif(m->>'vat_number','') is not null; exception when others then null; end;
  begin update profiles set min_order_value=nullif(regexp_replace(coalesce(m->>'min_order_value',''),'[^0-9.]','','g'),'')::numeric where id=new.id; exception when others then null; end;
  begin if jsonb_typeof(m->'sectors')='array' then for s in select jsonb_array_elements_text(m->'sectors') loop begin insert into profile_sectors(profile_id,sector) values(new.id,s::sector); exception when others then null; end; end loop; end if; exception when others then null; end;
  begin if jsonb_typeof(m->'specialties')='array' then for s in select jsonb_array_elements_text(m->'specialties') loop begin insert into profile_specialties(profile_id,specialty) values(new.id,s); exception when others then null; end; end loop; end if; exception when others then null; end;
  begin if jsonb_typeof(m->'extra_materials')='array' then for s in select jsonb_array_elements_text(m->'extra_materials') loop begin insert into material_requests(supplier_id,name) values(new.id,s); exception when others then null; end; end loop; end if; exception when others then null; end;
  return new;
end; $function$;

-- ═══ C2 / SEC-03 + BUG-04: deal-state lock + no self-accept + pricing freeze ═══
-- (accepted offers: immutable pricing; pending offers: pricing frozen after RFQ deadline)
CREATE OR REPLACE FUNCTION public.lock_offer_deal_columns()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  new.supplier_delivered_at := old.supplier_delivered_at;
  new.received_at := old.received_at; new.received_by := old.received_by;
  new.payment_status := old.payment_status; new.paid_marked_at := old.paid_marked_at;
  new.payment_confirmed_at := old.payment_confirmed_at;
  new.dispute_status := old.dispute_status; new.dispute_reason := old.dispute_reason;
  new.dispute_by := old.dispute_by; new.dispute_opened_at := old.dispute_opened_at;
  new.dispute_resolution := old.dispute_resolution; new.dispute_resolved_at := old.dispute_resolved_at;
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.status := old.status; new.accepted_at := old.accepted_at;
    new.invoice_number := old.invoice_number; new.po_number := old.po_number;
  end if;
  if old.status = 'accepted' then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.status := old.status; new.invoice_number := old.invoice_number;
  end if;
  if old.status = 'pending' and exists (
    select 1 from rfqs r where r.id = old.rfq_id and r.expires_at is not null and r.expires_at < now()
  ) then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
  end if;
  return new;
end; $function$;
DROP TRIGGER IF EXISTS trg_lock_offer_deal_columns ON public.offers;
CREATE TRIGGER trg_lock_offer_deal_columns BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.lock_offer_deal_columns();

-- ═══════════════ C2: server-authoritative deal-state transitions ═══════════════
CREATE OR REPLACE FUNCTION public.confirm_delivery(p_offer_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v offers;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> auth.uid() then raise exception 'فقط المورّد يمكنه تأكيد التسليم'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.supplier_delivered_at is not null then raise exception 'تم تأكيد التسليم مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_delivered_at = now() where id = p_offer_id returning * into v;
  return to_jsonb(v);
end; $function$;

CREATE OR REPLACE FUNCTION public.confirm_receipt(p_offer_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  return to_jsonb(v);
end; $function$;

CREATE OR REPLACE FUNCTION public.mark_paid(p_offer_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v offers; v_is_contractor boolean;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select exists(select 1 from rfqs r where r.id = v.rfq_id and r.contractor_id = auth.uid()) into v_is_contractor;
  if not v_is_contractor then raise exception 'فقط المقاول يمكنه تأكيد الدفع'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.payment_status = 'paid' then raise exception 'تم تأكيد الدفع مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set payment_status = 'paid', paid_marked_at = now() where id = p_offer_id returning * into v;
  return to_jsonb(v);
end; $function$;
-- NOTE (product decision): mark_paid does not require received_at — advance payment before
-- delivery is common in KSA construction. Deal "completed" status still requires the full
-- deliver→receive→pay trail (dealStage), so the trail cannot be misrepresented.

CREATE OR REPLACE FUNCTION public.confirm_payment(p_offer_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v offers;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> auth.uid() then raise exception 'فقط المورّد يمكنه تأكيد استلام الدفعة'; end if;
  if v.payment_status <> 'paid' then raise exception 'الدفع لم يُؤكَّد بعد'; end if;
  if v.payment_confirmed_at is not null then raise exception 'تم تأكيد استلام الدفعة مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set payment_confirmed_at = now() where id = p_offer_id returning * into v;
  return to_jsonb(v);
end; $function$;

CREATE OR REPLACE FUNCTION public.open_dispute(p_offer_id uuid, p_reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v offers; v_is_party boolean;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'سبب النزاع مطلوب'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select (v.supplier_id = auth.uid())
      or exists(select 1 from rfqs r where r.id = v.rfq_id and r.contractor_id = auth.uid())
    into v_is_party;
  if not v_is_party then raise exception 'فقط طرف في الصفقة يمكنه فتح نزاع'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.dispute_status = 'open' then raise exception 'يوجد نزاع مفتوح بالفعل'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set dispute_status = 'open', dispute_reason = left(p_reason, 1000),
                    dispute_by = auth.uid(), dispute_opened_at = now()
    where id = p_offer_id returning * into v;
  return to_jsonb(v);
end; $function$;

DO $$ DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'confirm_delivery(uuid)','confirm_receipt(uuid)','mark_paid(uuid)',
    'confirm_payment(uuid)','open_dispute(uuid, text)'
  ] LOOP
    EXECUTE format('revoke all on function public.%s from public, anon;', fn);
    EXECUTE format('grant execute on function public.%s to authenticated;', fn);
  END LOOP;
END $$;

-- ═══ B2: sequential persisted invoice number, assigned atomically on acceptance ═══
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS invoice_number text;

-- accept_offer + finalize_rfq_awards run WITH the deal_write flag (so the lock trigger
-- admits their status/pricing writes) and assign the sequential invoice number.
CREATE OR REPLACE FUNCTION public.accept_offer(p_offer_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_rfq uuid; v_caller uuid := auth.uid();
begin
  perform set_config('app.deal_write', 'on', true);
  select rfq_id into v_rfq from public.offers where id = p_offer_id for update;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if not is_admin() and not exists (select 1 from public.rfqs where id = v_rfq and contractor_id = v_caller) then
    raise exception 'forbidden';
  end if;
  update public.offers set status='accepted', accepted_at=now() where id = p_offer_id and status='pending';
  if not found then raise exception 'offer_not_pending'; end if;
  update public.offers
    set invoice_number = 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
    where id = p_offer_id and invoice_number is null;
  update public.offers set status='rejected' where rfq_id = v_rfq and id <> p_offer_id and status='pending';
  update public.rfqs set status='closed' where id = v_rfq;
  insert into public.audit_logs(actor_id, action, entity, entity_id, detail) values (v_caller, 'accept_offer', 'offer', p_offer_id, jsonb_build_object('rfq_id', v_rfq));
end; $function$;

CREATE OR REPLACE FUNCTION public.finalize_rfq_awards(p_rfq_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_contractor uuid;
begin
  perform set_config('app.deal_write', 'on', true);
  select contractor_id into v_contractor from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from rfq_item_awards where rfq_id = p_rfq_id) then
    raise exception 'No awards to finalize';
  end if;
  update offers o set status = 'accepted', accepted_at = coalesce(o.accepted_at, now())
  where o.rfq_id = p_rfq_id and o.status <> 'accepted'
    and exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update offers set invoice_number = 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
  where rfq_id = p_rfq_id and status = 'accepted' and invoice_number is null;
  update offers o set status = 'rejected'
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and not exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update rfqs set status = 'closed' where id = p_rfq_id and status = 'open';
  insert into notifications (user_id, type, title, body, data)
  select distinct a.supplier_id, 'offer_accepted'::notification_type,
         'تمت ترسية مواد عليك', 'راجع أمر الشراء وحماية الصفقة',
         jsonb_build_object('url', '/contractor/orders/' || a.offer_id::text, 'rfq_id', p_rfq_id)
  from rfq_item_awards a where a.rfq_id = p_rfq_id;
end; $function$;

-- ═══ B6: award matches by item_index first (name fallback for legacy offers) ═══
CREATE OR REPLACE FUNCTION public.award_rfq_item(p_rfq_id uuid, p_item_index integer, p_offer_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_contractor uuid;
  v_pname text;
  v_entry jsonb;
  v_supplier uuid;
begin
  select contractor_id, (items -> p_item_index ->> 'product_name')
    into v_contractor, v_pname
  from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if v_pname is null then raise exception 'Item not found'; end if;

  -- 1) exact item_index match (offers submitted after this fix carry item_index)
  select o.supplier_id, ip into v_supplier, v_entry
  from offers o
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
  ) ip
  where o.id = p_offer_id and o.rfq_id = p_rfq_id and o.status <> 'rejected'
    and (ip->>'item_index')::int = p_item_index
  limit 1;

  -- 2) fallback to product_name for legacy offers without item_index
  if v_entry is null then
    select o.supplier_id, ip into v_supplier, v_entry
    from offers o
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) ip
    where o.id = p_offer_id and o.rfq_id = p_rfq_id and o.status <> 'rejected'
      and ip->>'product_name' = v_pname
    limit 1;
  end if;

  if v_entry is null then raise exception 'Offer does not price this item'; end if;

  insert into rfq_item_awards (rfq_id, item_index, item_key, offer_id, supplier_id, unit_price, total, quantity, unit)
  values (p_rfq_id, p_item_index, v_pname, p_offer_id, v_supplier,
          nullif(v_entry->>'unit_price','')::numeric,
          coalesce(nullif(v_entry->>'total','')::numeric, 0),
          nullif(v_entry->>'quantity','')::numeric,
          v_entry->>'unit')
  on conflict (rfq_id, item_index)
  do update set offer_id = excluded.offer_id, supplier_id = excluded.supplier_id,
                unit_price = excluded.unit_price, total = excluded.total,
                quantity = excluded.quantity, unit = excluded.unit, awarded_at = now();
end; $function$;

-- ═══ H2 / SEC-10: competitor prices only for the RFQ owner/admin ═══
CREATE OR REPLACE FUNCTION public.get_rfq_offer_ranking(p_rfq_id uuid)
 RETURNS TABLE(total_price numeric, delivery_days integer, is_mine boolean, blind boolean)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select
    o.total_price,
    o.delivery_days,
    (o.supplier_id = auth.uid()) as is_mine,
    false as blind
  from offers o
  where o.rfq_id = p_rfq_id
    and o.status <> 'rejected'
    and o.total_price is not null
    and (
      exists (select 1 from rfqs r where r.id = p_rfq_id and r.contractor_id = auth.uid())
      or public.is_admin()
      or o.supplier_id = auth.uid()
    )
  order by o.total_price asc;
$function$;

-- ═══ H3 / SEC-09: server-enforced targeting (visibility + offer eligibility) ═══
CREATE OR REPLACE FUNCTION public.served_regions(p_uid uuid)
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(distinct region) filter (where region is not null and region <> ''), '{}')
  from (
    select region from profiles where id = p_uid
    union all
    select region from branches where supplier_id = p_uid
  ) s;
$function$;
REVOKE ALL ON FUNCTION public.served_regions(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.served_regions(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated read rfqs" ON public.rfqs;
DROP POLICY IF EXISTS "read rfqs owned or in target scope" ON public.rfqs;
CREATE POLICY "read rfqs owned or in target scope"
ON public.rfqs FOR SELECT TO authenticated
USING (
  contractor_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from offers o where o.rfq_id = rfqs.id and o.supplier_id = auth.uid())
  or (
    (coalesce(nearby_only, false) = false
      or cardinality(public.served_regions(auth.uid())) = 0
      or rfqs.region = any(public.served_regions(auth.uid())))
    and (target_regions is null
      or cardinality(target_regions) = 0
      or public.served_regions(auth.uid()) && target_regions)
  )
);

CREATE OR REPLACE FUNCTION public.check_offer_region_eligibility()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; v_served text[]; eligible boolean;
begin
  select region, coalesce(nearby_only, false) as nearby, target_regions into r from rfqs where id = new.rfq_id;
  if r.region is null then return new; end if;
  v_served := public.served_regions(new.supplier_id);
  eligible := (r.nearby = false or cardinality(v_served) = 0 or r.region = any(v_served))
          and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions);
  if not eligible then
    raise exception 'هذا الطلب خارج نطاق مناطق تغطيتك';
  end if;
  return new;
end; $function$;
DROP TRIGGER IF EXISTS trg_check_offer_region_eligibility ON public.offers;
CREATE TRIGGER trg_check_offer_region_eligibility BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.check_offer_region_eligibility();

-- ═══ H1 / SEC-07: strip precise location + contractor identity for non-owners ═══
CREATE OR REPLACE FUNCTION public.get_rfq_for_viewer(p_rfq_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r rfqs; v_owner boolean; v_award boolean; v_see boolean; v_served text[]; result jsonb;
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null then return null; end if;
  v_served := public.served_regions(auth.uid());
  v_owner := (r.contractor_id = auth.uid()) or public.is_admin();
  v_award := v_owner
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = auth.uid() and o.status = 'accepted')
    or exists (select 1 from rfq_item_awards a where a.rfq_id = p_rfq_id and a.supplier_id = auth.uid());
  v_see := v_award
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = auth.uid())
    or (
      (coalesce(r.nearby_only, false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
      and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
    );
  if not v_see then return null; end if;
  result := to_jsonb(r);
  if not v_award then result := result - 'delivery_geo' - 'delivery_location'; end if;
  if not v_owner then result := result - 'contractor_id'; end if;
  return result;
end; $function$;
REVOKE ALL ON FUNCTION public.get_rfq_for_viewer(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_rfq_for_viewer(uuid) TO authenticated;

-- ═══ H5 / SEC-08: notifications INSERT is self-only (cross-user via service role) ═══
DROP POLICY IF EXISTS "Authenticated create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users create own notifications only" ON public.notifications;
CREATE POLICY "Users create own notifications only"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ═══ H4 / SEC-06: pre-award message cap + contact masking at the TABLE layer ═══
CREATE OR REPLACE FUNCTION public.mask_contact_digits(p text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select regexp_replace(coalesce(p, ''), '(\+?\d[\d \-\.]{8,}\d)', '[رقم محجوب]', 'g');
$function$;

CREATE OR REPLACE FUNCTION public.enforce_message_limits()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_c record; v_awarded boolean; v_count int;
begin
  select rfq_id, supplier_id, contractor_id into v_c from conversations where id = new.conversation_id;
  if v_c.rfq_id is null then return new; end if; -- not a deal conversation → no limits
  v_awarded := exists (select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted')
            or exists (select 1 from rfq_item_awards a where a.rfq_id = v_c.rfq_id and a.supplier_id = v_c.supplier_id);
  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = new.conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل الترسية (٢٠ رسالة). يكتمل التواصل بعد إتمام الصفقة.';
    end if;
    new.body := public.mask_contact_digits(new.body);
    if new.content is not null then new.content := public.mask_contact_digits(new.content); end if;
  end if;
  return new;
end; $function$;
DROP TRIGGER IF EXISTS trg_enforce_message_limits ON public.messages;
CREATE TRIGGER trg_enforce_message_limits BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_limits();

CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id uuid, p_body text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_c record; v_other uuid; v_id uuid; v_sender_name text; v_awarded boolean; v_count int;
begin
  select * into v_c from conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'Conversation not found'; end if;
  if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_body),'') = '' then raise exception 'Empty message'; end if;

  v_awarded := exists (
    select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted'
  ) or exists (
    select 1 from rfq_item_awards a where a.rfq_id = v_c.rfq_id and a.supplier_id = v_c.supplier_id
  );

  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = p_conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل الترسية (٢٠ رسالة). يكتمل التواصل بعد إتمام الصفقة (الترسية).';
    end if;
    p_body := public.mask_contact_digits(p_body); -- pre-award: hide contact numbers
  end if;

  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update conversations set last_message = left(btrim(p_body), 140), last_message_at = now() where id = p_conversation_id;

  v_other := case when auth.uid() = v_c.contractor_id then v_c.supplier_id else v_c.contractor_id end;
  select coalesce(company_name_ar, 'مستخدم') into v_sender_name from profiles where id = auth.uid();
  insert into notifications (user_id, type, title, body, data)
  values (v_other, 'new_message', 'رسالة جديدة من ' || v_sender_name, left(btrim(p_body), 80),
          jsonb_build_object('url', '/messages?c=' || p_conversation_id::text, 'conversation_id', p_conversation_id));
  return v_id;
end; $function$;

-- ═══ B12: atomic save of supplier sectors/specialties ═══
CREATE OR REPLACE FUNCTION public.save_supplier_specialties(p_sectors text[], p_specialties text[])
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  delete from profile_sectors where profile_id = auth.uid();
  delete from profile_specialties where profile_id = auth.uid();
  if p_sectors is not null and cardinality(p_sectors) > 0 then
    insert into profile_sectors(profile_id, sector)
    select auth.uid(), unnest(p_sectors)::sector;
  end if;
  if p_specialties is not null and cardinality(p_specialties) > 0 then
    insert into profile_specialties(profile_id, specialty)
    select auth.uid(), unnest(p_specialties);
  end if;
end; $function$;
REVOKE ALL ON FUNCTION public.save_supplier_specialties(text[], text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_supplier_specialties(text[], text[]) TO authenticated;

-- ═══ B7: narrow re-verification RPC (only ever sets 'pending', never 'verified') ═══
CREATE OR REPLACE FUNCTION public.request_reverification()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set verification_status = 'pending'
    where id = auth.uid() and coalesce(verification_status, '') <> 'verified';
end; $function$;
REVOKE ALL ON FUNCTION public.request_reverification() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_reverification() TO authenticated;

-- ═══ Negotiated price reduction: legit post-deadline pending edit (runs with the flag) ═══
CREATE OR REPLACE FUNCTION public.submit_price_reduction(p_offer_id uuid, p_new_total numeric)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_qty numeric; v_product text;
begin
  perform set_config('app.deal_write', 'on', true);
  select o.rfq_id, o.supplier_id, r.contractor_id, r.quantity, r.product_name
    into v_rfq, v_supplier, v_contractor, v_qty, v_product
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if auth.uid() <> v_supplier and not is_admin() then raise exception 'forbidden'; end if;
  if p_new_total is null or p_new_total <= 0 then raise exception 'bad_price'; end if;
  update public.offers
    set total_price = p_new_total,
        unit_price = case when coalesce(v_qty,0) > 0 then round(p_new_total / v_qty, 2) else unit_price end,
        reduction_deadline = null
  where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_contractor, 'rfq_offer', 'تم تخفيض السعر',
    'خفّض المورد سعر عرضه على «' || coalesce(v_product, 'طلب') || '» إلى ' || p_new_total::text || ' ر.س.',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'reduction_response'));
end; $function$;

-- ═══ SEC-13 / /api/file IDOR: file-access eligibility (owner/party/eligible/admin) ═══
CREATE OR REPLACE FUNCTION public.can_access_shared_file(p_path text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_served text[];
begin
  if v_uid is null then return false; end if;
  if length(coalesce(p_path,'')) < 20 then return false; end if; -- real keys are "{uuid}/...."
  if public.is_admin() then return true; end if;
  if p_path like v_uid::text || '/%' then return true; end if;
  if p_path like 'material-requests/' || v_uid::text || '/%' then return true; end if;
  if exists (
    select 1 from offers o join rfqs r on r.id = o.rfq_id
    where (position(p_path in coalesce(o.attachment_url,'')) > 0
        or position(p_path in coalesce(o.item_prices::text,'')) > 0)
      and (o.supplier_id = v_uid or r.contractor_id = v_uid)
  ) then return true; end if;
  v_served := public.served_regions(v_uid);
  if exists (
    select 1 from rfqs r
    where (position(p_path in coalesce(r.items::text,'')) > 0
        or position(p_path in coalesce(r.notes,'')) > 0)
      and (
        r.contractor_id = v_uid
        or exists (select 1 from offers o2 where o2.rfq_id = r.id and o2.supplier_id = v_uid)
        or (
          (coalesce(r.nearby_only,false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
          and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
        )
      )
  ) then return true; end if;
  if exists (
    select 1 from project_rfqs p
    where (position(p_path in coalesce(p.boq_url,'')) > 0 or position(p_path in coalesce(p.notes,'')) > 0)
      and p.contractor_id = v_uid
  ) then return true; end if;
  return false;
end; $function$;
REVOKE ALL ON FUNCTION public.can_access_shared_file(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_file(text) TO authenticated;

-- ═══ Phone lockdown: full profile row only post-acceptance/award ═══
DROP POLICY IF EXISTS "profiles_select_owner_admin_counterparty" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_owner_admin_accepted_counterparty" ON public.profiles;
CREATE POLICY "profiles_select_owner_admin_accepted_counterparty"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  or is_admin()
  or exists (
    select 1 from offers o join rfqs r on r.id = o.rfq_id
    where o.status = 'accepted'
      and ((o.supplier_id = profiles.id and r.contractor_id = auth.uid())
        or (o.supplier_id = auth.uid() and r.contractor_id = profiles.id))
  )
  or exists (
    select 1 from rfq_item_awards a join rfqs r2 on r2.id = a.rfq_id
    where (a.supplier_id = profiles.id and r2.contractor_id = auth.uid())
       or (a.supplier_id = auth.uid() and r2.contractor_id = profiles.id)
  )
);

-- profiles_public: pre-award display data (no phone) + supplier-only geo for "nearest" sort
CREATE OR REPLACE VIEW public.profiles_public AS
 SELECT id, role,
        CASE WHEN role <> 'contractor'::user_role THEN company_name_ar ELSE NULL::text END AS company_name_ar,
        CASE WHEN role <> 'contractor'::user_role THEN company_name_en ELSE NULL::text END AS company_name_en,
        supplier_tier, contractor_grade, rating_avg, rating_count,
        city, region, district, verification_status, cr_verification_source,
        preferred_language, is_active, subscription_plan, created_at, approvals,
        CASE WHEN role = 'supplier'::user_role THEN latitude ELSE NULL END AS latitude,
        CASE WHEN role = 'supplier'::user_role THEN longitude ELSE NULL END AS longitude,
        CASE WHEN role = 'supplier'::user_role THEN national_short_address ELSE NULL::text END AS national_short_address
   FROM profiles;

-- ═══ SEC-13: storage — the shared-attachments bucket is PRIVATE ═══
UPDATE storage.buckets SET public = false WHERE id = 'licenses';
-- (files are served via the auth-gated /api/file proxy → can_access_shared_file → signed URL)
