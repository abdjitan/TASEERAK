-- 264 (round-2 audit UX-001): mark a deadline/price notice as sent only when the notification was really
-- written; failures go to system_errors_log instead of being swallowed. open_dispute alerts the admins even
-- if the other party's notice fails.
create or replace function public.notify_deadline_passed()
returns integer language plpgsql security definer set search_path = public as $$
declare r rfqs; n_off int; n int := 0; v_min numeric;
begin
  for r in select * from rfqs
           where status = 'open' and expires_at is not null and expires_at < now()
             and expires_at > now() - interval '7 days' and deadline_notified_at is null
           limit 300
  loop
    select count(*), min(case when o.vat_status = 'not_registered' or o.vat_included then o.total_price else o.total_price * 1.15 end)
      into n_off, v_min from offers o where o.rfq_id = r.id and o.status in ('pending', 'accepted');
    begin
      insert into notifications (user_id, type, title, body, data)
      values (r.contractor_id, 'rfq_deadline', 'انتهت مهلة التسعير',
        case when n_off > 0 then
          'وصلك ' || case when n_off = 1 then 'عرض واحد' when n_off = 2 then 'عرضان' else n_off || ' عروض' end
          || ' على «' || public.rfq_label(r) || '»، أقلها ' || to_char(round(v_min), 'FM999,999,990') || ' ريال. اختر الأنسب الآن.'
        else
          'لم يصل أي عرض على «' || public.rfq_label(r) || '». يمكنك تمديد المهلة أو البحث عن موردين آخرين من صفحة الطلب.'
        end,
        jsonb_build_object('url', '/contractor/rfq/' || r.id::text, 'rfq_id', r.id));
      update rfqs set deadline_notified_at = now() where id = r.id;
      n := n + 1;
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('notify_deadline_passed', sqlerrm, r.contractor_id); exception when others then null; end;
    end;
  end loop;
  return n;
end $$;

create or replace function public.notify_price_expiring()
returns integer language plpgsql security definer set search_path = public as $$
declare o record; n int := 0;
begin
  for o in
    select of.id, of.rfq_id, r.contractor_id, r
    from offers of join rfqs r on r.id = of.rfq_id
    where of.status = 'pending' and r.status = 'open'
      and of.price_valid_until is not null
      and of.price_valid_until > now() and of.price_valid_until <= now() + interval '12 hours'
      and of.expiry_notified_at is null
    limit 300
  loop
    begin
      insert into notifications (user_id, type, title, body, data)
      values (o.contractor_id, 'price_expiring', 'سعر أحد العروض ينتهي قريباً',
        'ينتهي التزام المورد بسعر عرضه على «' || public.rfq_label(o.r) || '» خلال ساعات. اختر قبل أن يتغيّر السعر.',
        jsonb_build_object('url', '/contractor/rfq/' || o.rfq_id::text, 'rfq_id', o.rfq_id, 'offer_id', o.id));
      update offers set expiry_notified_at = now() where id = o.id;
      n := n + 1;
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('notify_price_expiring', sqlerrm, o.contractor_id); exception when others then null; end;
    end;
  end loop;
  return n;
end $$;

create or replace function public.open_dispute(p_offer_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_is_party boolean; r rfqs; v_by_buyer boolean; v_other uuid; v_label text;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'سبب النزاع مطلوب'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select * into r from rfqs where id = v.rfq_id;
  select (v.supplier_id = public.acting_uid()) or (r.contractor_id = auth.uid()) into v_is_party;
  if not v_is_party then raise exception 'فقط طرف في الصفقة يمكنه فتح نزاع'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.dispute_status = 'open' then raise exception 'يوجد نزاع مفتوح بالفعل'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set dispute_status = 'open', dispute_reason = left(p_reason, 1000),
                    dispute_by = auth.uid(), dispute_opened_at = now()
    where id = p_offer_id returning * into v;
  v_by_buyer := (r.contractor_id = auth.uid());
  v_other := case when v_by_buyer then v.supplier_id else r.contractor_id end;
  v_label := public.rfq_label(r);
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_other, 'dispute_opened', 'بلاغ عن مشكلة في صفقة',
      case when v_by_buyer then 'أبلغ المشتري عن مشكلة في صفقة «' else 'أبلغ المورد عن مشكلة في صفقة «' end
        || v_label || '». سيتواصل فريق تسعيرك مع الطرفين.',
      jsonb_build_object('url', case when v_by_buyer then '/supplier/dashboard/rfq/' || r.id::text else '/contractor/orders/' || v.id::text end,
        'offer_id', v.id, 'rfq_id', r.id));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('open_dispute.notify_party', sqlerrm, v_other); exception when others then null; end;
  end;
  begin
    perform public.notify_admins('بلاغ عن مشكلة في صفقة',
      v_label || ' — ' || case when v_by_buyer then 'من المشتري: ' else 'من المورد: ' end || left(p_reason, 200),
      '/admin?tab=rfqs&q=' || coalesce(r.ref_no::text, ''));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('open_dispute.notify_admins', sqlerrm, auth.uid()); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;
