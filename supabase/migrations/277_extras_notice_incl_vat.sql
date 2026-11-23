-- 277 (owner 2026-11-23: buyer prices include VAT): the confirmed-charges notice shows the amount the buyer pays.
CREATE OR REPLACE FUNCTION public.confirm_partial_extras(p_offer_id uuid, p_extras jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v offers; v_old numeric; v_new numeric; v_buyer uuid; v_clean jsonb;
begin
  select * into v from offers where id = p_offer_id for update;
  if not found then raise exception 'العرض غير موجود'; end if;
  if public.acting_uid() is distinct from v.supplier_id then raise exception 'غير مصرّح'; end if;
  if v.status <> 'accepted' or not v.extras_pending then raise exception 'لا توجد رسوم بانتظار التأكيد'; end if;
  if p_extras is null or jsonb_typeof(p_extras) <> 'array' then raise exception 'صيغة الرسوم غير صحيحة'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('label', left(btrim(e->>'label'), 80), 'amount', round((e->>'amount')::numeric, 2))), '[]'::jsonb)
    into v_clean
    from jsonb_array_elements(p_extras) e
   where coalesce(btrim(e->>'label'), '') <> '' and (e->>'amount') ~ '^[0-9]+(\.[0-9]+)?$' and (e->>'amount')::numeric > 0;
  select coalesce(sum((e->>'amount')::numeric), 0) into v_old from jsonb_array_elements(coalesce(v.extras_original, '[]'::jsonb)) e
   where (e->>'amount') ~ '^[0-9]+(\.[0-9]+)?$';
  select coalesce(sum((e->>'amount')::numeric), 0) into v_new from jsonb_array_elements(v_clean) e;
  if v_new > v_old then raise exception 'لا يمكن رفع الرسوم عن عرضك الأصلي (% ر.س)', v_old; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set extra_charges = case when jsonb_array_length(v_clean) = 0 then null else v_clean end,
                    extras_pending = false, extras_confirmed_at = now()
   where id = p_offer_id returning * into v;
  select contractor_id into v_buyer from rfqs where id = v.rfq_id;
  insert into notifications (user_id, type, title, body, data)
  values (v_buyer, 'offer_accepted', 'أكّد المورد رسوم التوصيل',
          case when v_new = 0 then 'أكّد المورد أن التوصيل بلا رسوم إضافية للمواد التي اخترتها منه.'
               else 'أكّد المورد رسوماً إضافية بقيمة ' || public.fmt_sar(v_new * public.offer_vat_factor(v.vat_status, v.vat_included)) || case when coalesce(v.vat_status, 'registered') = 'not_registered' then '' else ' شاملة الضريبة' end || ' للمواد التي اخترتها منه.' end,
          jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id, 'kind', 'extras_confirmed', 'amount', round(v_new * public.offer_vat_factor(v.vat_status, v.vat_included)), 'vat', 'incl'));
  return jsonb_build_object('ok', true, 'amount', v_new);
end $function$;
