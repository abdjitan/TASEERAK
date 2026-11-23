-- 275 (round-4 audit, server side)
-- UX-005: marking a deal paid and confirming the payment now notify the other party.
-- UX-022: company team members get only the work notices (allow-list), never account notices
--         (verification, ban, announcements, claims) meant for the owner.
-- UX-100: a new offer that prices only part of the request says so; reply kinds on rfq_offer are never
--         queued for WhatsApp (only the plain new-offer notice is).
-- Notices written here carry params (rfq_ref, amount, item_count) for the client templates (UX-021).

create or replace function public.mark_paid(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; r rfqs;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select * into r from rfqs where id = v.rfq_id;
  if r.contractor_id is distinct from auth.uid() then raise exception 'فقط المشتري يمكنه تأكيد الدفع'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.payment_status = 'paid' then raise exception 'تم تأكيد الدفع مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set payment_status = 'paid', paid_marked_at = now() where id = p_offer_id returning * into v;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v.supplier_id, 'offer_accepted', 'أكّد المشتري الدفع',
      'أكّد المشتري دفع مبلغ صفقة «' || public.rfq_label(r) || '». أكّد استلام الدفعة من صفحة الصفقة.',
      jsonb_build_object('url', '/supplier/dashboard/rfq/' || r.id::text, 'rfq_id', r.id, 'offer_id', v.id,
                         'kind', 'paid', 'rfq_ref', r.ref_no));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('mark_paid.notify', left(sqlerrm, 500), v.supplier_id); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

create or replace function public.confirm_payment(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; r rfqs;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط المورّد يمكنه تأكيد استلام الدفعة'; end if;
  if v.payment_status <> 'paid' then raise exception 'الدفع لم يُؤكَّد بعد'; end if;
  if v.payment_confirmed_at is not null then raise exception 'تم تأكيد استلام الدفعة مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set payment_confirmed_at = now() where id = p_offer_id returning * into v;
  select * into r from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (r.contractor_id, 'offer_accepted', 'أكّد المورد استلام الدفعة',
      'اكتملت صفقة «' || public.rfq_label(r) || '». شكراً لاستخدامك تسعيرك.',
      jsonb_build_object('url', '/contractor/orders/' || v.id::text, 'rfq_id', r.id, 'offer_id', v.id,
                         'kind', 'payment_confirmed', 'rfq_ref', r.ref_no));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('confirm_payment.notify', left(sqlerrm, 500), r.contractor_id); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

-- UX-022: allow-list
create or replace function public.fanout_company_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.data->>'team_copy', '') <> '' then return new; end if;
  if not (
       new.type::text in ('rfq_offer', 'offer_accepted', 'offer_rejected', 'rfq_changed', 'rfq_expiring',
                          'price_expiring', 'reminder_deliver', 'reminder_receipt', 'dispute_opened')
    or (new.type::text = 'new_message' and coalesce(new.data->>'kind', '') in ('reduction_request', 'info_request'))
  ) then
    return new;
  end if;
  begin
    insert into notifications (user_id, type, title, body, data)
    select m.user_id, new.type, new.title, new.body, coalesce(new.data, '{}'::jsonb) || jsonb_build_object('team_copy', true)
    from company_members m
    where m.company_id = new.user_id and m.status = 'active';
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('fanout_company_notification', left(sqlerrm, 500), new.user_id); exception when others then null; end;
  end;
  return new;
end $$;

-- UX-100: WhatsApp only for the plain new-offer notice among rfq_offer
create or replace function public.notifications_mark_wa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type::text in ('new_rfq', 'rfq_offer', 'offer_accepted', 'new_message')
     and coalesce(new.data->>'team_copy', '') not in ('true', 't', '1')
     and not (coalesce(new.data, '{}'::jsonb) ? 'uncovered')
     and not (new.type::text in ('offer_accepted', 'rfq_offer') and coalesce(new.data->>'kind', '') <> '')
     and coalesce(new.data->>'kind', '') not like 'reduction%'
     and exists (select 1 from notify_config where id = true and whatsapp_enabled) then
    new.wa_status := 'pending';
  end if;
  return new;
end $$;

-- UX-100: a partial offer says how many materials it prices
create or replace function public.notify_contractor_new_offer()
returns trigger language plpgsql security definer set search_path = public as $$
declare r rfqs; v_n int; v_priced int; v_total numeric;
begin
  select * into r from rfqs where id = new.rfq_id;
  if r.contractor_id is null then return new; end if;
  v_n := case when jsonb_typeof(r.items) = 'array' then greatest(jsonb_array_length(r.items), 1) else 1 end;
  v_priced := case
    when jsonb_typeof(new.item_prices) <> 'array' or jsonb_array_length(new.item_prices) = 0 then v_n
    else (select count(*) from jsonb_array_elements(new.item_prices) it
           where jsonb_typeof(it->'unit_price') = 'number' and (it->>'unit_price')::numeric > 0) end;
  v_total := public.offer_buyer_total(new);
  begin
    insert into notifications (user_id, type, title, body, data)
    values (r.contractor_id, 'rfq_offer', 'عرض سعر جديد',
      'وصلك عرض جديد على «' || public.rfq_label(r) || '»'
        || case when v_n > 1 and v_priced < v_n then ' يسعّر ' || v_priced || ' من ' || v_n || ' مواد' else '' end
        || coalesce(' بإجمالي ' || public.fmt_sar(v_total), '') || '.',
      jsonb_build_object('url', '/contractor/rfq/' || new.rfq_id::text, 'rfq_id', new.rfq_id, 'offer_id', new.id,
                         'rfq_ref', r.ref_no, 'amount', round(v_total), 'item_count', v_n, 'priced_count', v_priced));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('notify_contractor_new_offer', left(sqlerrm, 500), r.contractor_id); exception when others then null; end;
  end;
  return new;
end $$;
