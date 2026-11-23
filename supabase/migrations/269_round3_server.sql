-- 269 (round-3 audit, server side)
-- UX-021: the WhatsApp marker trigger cast data->>'uncovered' (material names) to boolean, so the admin
--         «no matching supplier» alert failed to insert. Now existence/text checks.
-- UX-020/123: deal-stage notices (invoice, delivered, receipt) and reduction replies are never queued for
--         WhatsApp (they used the «تمت ترسية» template); the deal-stage notices carry data.kind.
-- UX-127: the invoice notice names the right document for each seller kind.
-- UX-017: supplier analytics count per offer, with cancelled/expired outside the win rate, and act for a
--         company team member (acting_uid).
-- UX-022: the deadline notice's «lowest» price is taken from offers that cover every material.
-- UX-016: renew_offer_validity() for the supplier + a 12-hour warning to the supplier before his price ends.
-- UX-129: clean_ar_name keeps trailing Latin specs (PVC, PPR); the edit notice names every kind of change.

-- ───────── UX-021 / UX-020 / UX-123 ─────────
create or replace function public.notifications_mark_wa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type::text in ('new_rfq', 'rfq_offer', 'offer_accepted', 'new_message')
     and coalesce(new.data->>'team_copy', '') not in ('true', 't', '1')
     and not (coalesce(new.data, '{}'::jsonb) ? 'uncovered')
     and not (new.type::text = 'offer_accepted' and coalesce(new.data->>'kind', '') <> '')
     and coalesce(new.data->>'kind', '') not like 'reduction%'
     and exists (select 1 from notify_config where id = true and whatsapp_enabled) then
    new.wa_status := 'pending';
  end if;
  return new;
end $$;

-- ───────── UX-020 / UX-127: deal-stage notices get a kind; invoice text per seller kind ─────────
create or replace function public.attach_supplier_invoice(p_offer_id uuid, p_url text, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_contractor uuid; v_label text; v_ptype text; v_body text;
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
  select contractor_id, public.rfq_label(rfqs) into v_contractor, v_label from rfqs where id = v.rfq_id;
  select provider_type into v_ptype from profiles where id = v.supplier_id;
  v_body := case
    when v_ptype in ('individual', 'broker', 'price_agent') then 'أرفق المورد فاتورة المحل المصدر باسمك لصفقة «'
    when coalesce(v.vat_status, 'registered') = 'registered' then 'أرفق المورد فاتورته الضريبية لصفقة «'
    else 'أرفق البائع فاتورته لصفقة «' end
    || coalesce(v_label, 'طلبك') || '». يمكنك تنزيلها من صفحة الصفقة.';
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_contractor, 'offer_accepted', 'أرفق المورد فاتورته', v_body,
      jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id, 'kind', 'invoice_attached'));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('attach_supplier_invoice.notify', left(sqlerrm, 500), v_contractor); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

create or replace function public.confirm_delivery(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_contractor uuid; v_product text; v_ptype text;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط المورّد يمكنه تأكيد التسليم'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.supplier_delivered_at is not null then raise exception 'تم تأكيد التسليم مسبقاً'; end if;
  if v.supplier_invoice_url is null then
    select provider_type into v_ptype from profiles where id = v.supplier_id;
    raise exception '%', case
      when v_ptype in ('individual', 'broker', 'price_agent') then 'أرفق فاتورة المحل المصدر باسم المشتري أولاً، ثم أكّد التسليم.'
      when coalesce(v.vat_status, 'registered') = 'registered' then 'أرفق فاتورتك الضريبية أولاً، ثم أكّد التسليم.'
      else 'أرفق فاتورتك أولاً، ثم أكّد التسليم.' end;
  end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_delivered_at = now() where id = p_offer_id returning * into v;
  select contractor_id, public.rfq_label(rfqs) into v_contractor, v_product from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_contractor, 'offer_accepted', 'أكّد المورد التوصيل',
      'أكّد المورد توصيل «' || coalesce(v_product, 'طلبك') || '». يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.',
      jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id, 'kind', 'delivered'));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('confirm_delivery.notify', left(sqlerrm, 500), v_contractor); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

create or replace function public.confirm_receipt(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_is_contractor boolean; v_label text;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select exists(select 1 from rfqs r where r.id = v.rfq_id and r.contractor_id = auth.uid()) into v_is_contractor;
  if not v_is_contractor then raise exception 'فقط المشتري يمكنه تأكيد الاستلام'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.received_at is not null then raise exception 'تم تأكيد الاستلام مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set received_at = now(), received_by = auth.uid(),
                    supplier_delivered_at = coalesce(supplier_delivered_at, now())
   where id = p_offer_id returning * into v;
  select public.rfq_label(rfqs) into v_label from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v.supplier_id, 'offer_accepted', 'أكّد المشتري الاستلام',
      'أكّد المشتري استلام «' || coalesce(v_label, 'الطلب') || '». شكراً لإتمام الصفقة عبر تسعيرك.',
      jsonb_build_object('url', '/supplier/dashboard/rfq/' || v.rfq_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id, 'kind', 'receipt_confirmed'));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('confirm_receipt.notify', left(sqlerrm, 500), v.supplier_id); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

-- ───────── UX-017: supplier analytics per offer ─────────
create or replace function public.get_my_supplier_analytics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(public.acting_uid(), auth.uid()); v_result jsonb;
begin
  if v_uid is null then return '{}'::jsonb; end if;
  with o as (
    select o.id, o.created_at, r.sector::text as sector,
           case
             when o.status = 'accepted' or exists (select 1 from rfq_item_awards a where a.offer_id = o.id) then 'won'
             when r.status::text = 'cancelled' then 'cancelled'
             when r.status::text = 'expired' and not exists (select 1 from offers x where x.rfq_id = r.id and x.status = 'accepted')
                  and not exists (select 1 from rfq_item_awards a where a.rfq_id = r.id) then 'expired'
             when o.status = 'pending' and r.status::text = 'open' then 'pending'
             else 'lost' end as outcome
    from offers o join rfqs r on r.id = o.rfq_id
    where o.supplier_id = v_uid
  )
  select jsonb_build_object(
    'total_offers', (select count(*) from o),
    'participated', (select count(*) from o),
    'won', (select count(*) from o where outcome = 'won'),
    'lost', (select count(*) from o where outcome = 'lost'),
    'pending', (select count(*) from o where outcome = 'pending'),
    'ended_no_choice', (select count(*) from o where outcome in ('cancelled', 'expired')),
    'cancelled', (select count(*) from o where outcome = 'cancelled'),
    'expired', (select count(*) from o where outcome = 'expired'),
    'win_rate', (select case when count(*) filter (where outcome in ('won', 'lost')) = 0 then null
                  else round(100.0 * count(*) filter (where outcome = 'won') / count(*) filter (where outcome in ('won', 'lost'))) end from o),
    'by_sector', (
      select coalesce(jsonb_agg(jsonb_build_object('sector', sector, 'won', w, 'lost', l, 'total', t) order by t desc), '[]'::jsonb)
      from (select sector, count(*) filter (where outcome = 'won') w, count(*) filter (where outcome = 'lost') l,
                   count(*) filter (where outcome in ('won', 'lost', 'pending')) t
            from o group by sector) s where t > 0),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('month', m, 'offers', offs, 'won', wn) order by m), '[]'::jsonb)
      from (select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) offs, count(*) filter (where outcome = 'won') wn
            from o where created_at >= now() - interval '6 months' group by 1) mm)
  ) into v_result;
  return v_result;
end $$;

-- ───────── UX-022: the lowest price among offers that cover every material ─────────
create or replace function public.offer_covers_all(o public.offers, r public.rfqs)
returns boolean language sql stable set search_path = public as $$
  select case
    when jsonb_typeof(o.item_prices) <> 'array' or jsonb_array_length(o.item_prices) = 0 then true
    else (select count(distinct coalesce(nullif(it->>'item_index', ''), it->>'product_name'))
            from jsonb_array_elements(o.item_prices) it
           where jsonb_typeof(it->'unit_price') = 'number' and (it->>'unit_price')::numeric > 0)
         >= greatest(1, case when jsonb_typeof(r.items) = 'array' then jsonb_array_length(r.items) else 1 end)
  end
$$;

create or replace function public.notify_deadline_passed()
returns integer language plpgsql security definer set search_path = public as $$
declare r rfqs; n_off int; n int := 0; v_min numeric;
begin
  for r in select * from rfqs
           where status = 'open' and expires_at is not null and expires_at < now()
             and expires_at > now() - interval '7 days' and deadline_notified_at is null
           limit 300
  loop
    select count(*),
           min(case when public.offer_covers_all(o, r) then public.offer_buyer_total(o) end)
      into n_off, v_min from offers o where o.rfq_id = r.id and o.status in ('pending', 'accepted');
    begin
      insert into notifications (user_id, type, title, body, data)
      values (r.contractor_id, 'rfq_deadline', 'انتهت مهلة التسعير',
        case
          when n_off > 0 and v_min is not null then
            'وصلك ' || case when n_off = 1 then 'عرض واحد' when n_off = 2 then 'عرضان' else n_off || ' عروض' end
            || ' على «' || public.rfq_label(r) || '»، أقل عرض يغطي كل المواد ' || public.fmt_sar(v_min) || ' شاملة الضريبة. قارن العروض واختر الأنسب الآن.'
          when n_off > 0 then
            'وصلك ' || case when n_off = 1 then 'عرض واحد' when n_off = 2 then 'عرضان' else n_off || ' عروض' end
            || ' على «' || public.rfq_label(r) || '»، ولم يغطِّ أي عرض كل المواد؛ يمكنك اختيار الأفضل لكل مادة.'
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

-- ───────── UX-016: the supplier renews his price guarantee and is warned before it ends ─────────
alter table public.offers add column if not exists supplier_expiry_notified_at timestamptz;

create or replace function public.renew_offer_validity(p_offer_id uuid, p_days int default 3)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v offers; r rfqs; v_until timestamptz;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_days is null or p_days < 1 or p_days > 30 then raise exception 'مدة غير صالحة'; end if;
  select * into v from offers where id = p_offer_id for update;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id is distinct from public.acting_uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v.status <> 'pending' then raise exception 'لا يمكن تجديد سعر عرض غير قائم.'; end if;
  select * into r from rfqs where id = v.rfq_id;
  if r.status::text <> 'open' then raise exception 'الطلب لم يعد مفتوحاً.'; end if;
  v_until := now() + make_interval(days => p_days);
  perform set_config('app.deal_write', 'on', true);
  update offers set price_valid_until = v_until, expiry_notified_at = null, supplier_expiry_notified_at = null where id = p_offer_id;
  perform set_config('app.deal_write', 'off', true);
  begin
    insert into notifications (user_id, type, title, body, data)
    values (r.contractor_id, 'rfq_offer', 'جدّد المورد سعره',
      'جدّد المورد التزامه بسعر عرضه على «' || public.rfq_label(r) || '» حتى ' || public.fmt_riyadh_ar(v_until) || '.',
      jsonb_build_object('url', '/contractor/rfq/' || r.id::text || '/offer/' || p_offer_id::text, 'rfq_id', r.id, 'offer_id', p_offer_id, 'kind', 'price_renewed'));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('renew_offer_validity.notify', left(sqlerrm, 500), r.contractor_id); exception when others then null; end;
  end;
  return v_until;
end $$;
revoke all on function public.renew_offer_validity(uuid, int) from public, anon;
grant execute on function public.renew_offer_validity(uuid, int) to authenticated;

create or replace function public.notify_price_expiring()
returns integer language plpgsql security definer set search_path = public as $$
declare o record; n int := 0;
begin
  -- the buyer (once, 12 h before)
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
        jsonb_build_object('url', '/contractor/rfq/' || o.rfq_id::text || '/offer/' || o.id::text, 'rfq_id', o.rfq_id, 'offer_id', o.id));
      update offers set expiry_notified_at = now() where id = o.id;
      n := n + 1;
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('notify_price_expiring', sqlerrm, o.contractor_id); exception when others then null; end;
    end;
  end loop;
  -- the supplier (once, 12 h before), so he can renew
  for o in
    select of.id, of.rfq_id, of.supplier_id, of.price_valid_until, r
    from offers of join rfqs r on r.id = of.rfq_id
    where of.status = 'pending' and r.status = 'open'
      and of.price_valid_until is not null
      and of.price_valid_until > now() and of.price_valid_until <= now() + interval '12 hours'
      and of.supplier_expiry_notified_at is null
    limit 300
  loop
    begin
      insert into notifications (user_id, type, title, body, data)
      values (o.supplier_id, 'price_expiring', 'ينتهي ضمان سعرك قريباً',
        'ينتهي ضمان سعرك على «' || public.rfq_label(o.r) || '» في ' || public.fmt_riyadh_ar(o.price_valid_until)
          || '. جدّد السعر ليبقى عرضك قابلاً للاختيار.',
        jsonb_build_object('url', '/supplier/dashboard/rfq/' || o.rfq_id::text, 'rfq_id', o.rfq_id, 'offer_id', o.id, 'kind', 'price_expiring_supplier'));
      update offers set supplier_expiry_notified_at = now() where id = o.id;
      n := n + 1;
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('notify_price_expiring.supplier', sqlerrm, o.supplier_id); exception when others then null; end;
    end;
  end loop;
  return n;
end $$;

-- ───────── UX-129: keep trailing Latin specifications ─────────
create or replace function public.clean_ar_name(p text)
returns text language sql immutable as $$
  select coalesce(nullif(btrim(regexp_replace(coalesce(p, ''), '\s*\([^)]*[A-Za-z][^)]*\)', '', 'g')), ''), p)
$$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.edit_rfq(uuid, jsonb)'::regprocedure);
  d := replace(d, 'تغيّرت المواد أو الكميات فأُلغي عرضك السابق.', 'تغيّرت تفاصيل الطلب (المواد أو الكميات أو الوحدات أو المواصفات)، فأُلغي عرضك السابق.');
  execute d;
end $$;
