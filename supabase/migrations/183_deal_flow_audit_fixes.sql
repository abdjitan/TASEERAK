-- 183: fixes from the deal-flow / security / ops audits (2026-11-01).
--  1. confirm_receipt: the buyer is no longer stuck when the supplier never pressed «تأكيد التسليم»
--     (receipt implies delivery).
--  2. Company team members: cancel_my_offer, respond_offer_info, open_dispute, submit_contractor_review
--     act for the company (acting_uid), like the other deal RPCs.
--  3. A request with a selection or a deal can't be cancelled; finalize refuses a non-open request.
--  4. Rejecting an offer removes its item selections; a rejected supplier never sees the location.
--  5. «موردون موثّقون فقط» and the supplier-type choice are enforced when an offer is sent.
--  6. After the 15-minute edit window a pending offer's prices are fixed (the buyer compares them).
--  7. The buyer can't change the commercial terms once offers have arrived.
--  8. Supplier review of the buyer only after receipt (same rule as the buyer's review).
--  9. Housekeeping: stale open requests expire, reminders by day,
--     missing indexes, pg_net and check_rate_limit grants.

-- 1 ─ receipt without the supplier's delivery click
create or replace function public.confirm_receipt(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_is_contractor boolean;
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
  insert into notifications (user_id, type, title, body, data)
  values (v.supplier_id, 'offer_accepted', 'أكّد المشتري الاستلام',
    'تم تأكيد استلام البضاعة. شكراً لإتمام الصفقة عبر تسعيرك.',
    jsonb_build_object('url', '/supplier/dashboard/rfq/' || v.rfq_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return to_jsonb(v);
end $$;

-- 2 ─ team members act for the company
create or replace function public.cancel_my_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_supplier uuid; v_status text; v_created timestamptz; v_exp timestamptz;
begin
  select o.supplier_id, o.status::text, o.created_at, r.expires_at
    into v_supplier, v_status, v_created, v_exp
    from offers o join rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_supplier is null then raise exception 'العرض غير موجود'; end if;
  if public.acting_uid() is distinct from v_supplier then raise exception 'غير مصرّح'; end if;
  if v_status <> 'pending' then raise exception 'يمكن إلغاء العرض فقط أثناء كونه قيد المراجعة'; end if;
  if v_created < now() - interval '15 minutes' then
    raise exception 'انتهت نافذة التعديل (15 دقيقة) — تواصل مع المشتري لأي تغيير';
  end if;
  if v_exp is not null and v_exp < now() then
    raise exception 'انتهت مهلة التسعير، ولا يمكن إعادة التسعير بعد إلغاء العرض';
  end if;
  if exists (select 1 from rfq_item_awards where offer_id = p_offer_id) then
    raise exception 'تمّت ترسية بند من هذا العرض — لم يعد بالإمكان إلغاؤه';
  end if;
  delete from offers where id = p_offer_id;
end $$;

create or replace function public.respond_offer_info(p_offer_id uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_product text;
begin
  select o.rfq_id, o.supplier_id, r.contractor_id, public.rfq_label(r) into v_rfq, v_supplier, v_contractor, v_product
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if public.acting_uid() is distinct from v_supplier and not is_admin() then raise exception 'forbidden'; end if;
  if coalesce(trim(p_answer), '') = '' then raise exception 'empty'; end if;
  perform set_config('app.deal_write', 'on', true);
  update public.offers set info_response = left(p_answer, 2000) where id = p_offer_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_contractor, 'new_message', 'رد على طلب المعلومات',
    'ردّ المورد على طلب المعلومات الإضافية في «' || coalesce(v_product, 'طلب') || '».',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'info_response',
                       'url', '/contractor/rfq/' || v_rfq::text || '/offer/' || p_offer_id::text));
end $$;

create or replace function public.open_dispute(p_offer_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_is_party boolean;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'سبب النزاع مطلوب'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select (v.supplier_id = public.acting_uid())
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
end $$;

-- the company (not the employee) reviews the buyer, and only after the buyer confirmed receipt
create or replace function public.submit_contractor_review(p_offer_id uuid, p_rating integer, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_supplier uuid; v_contractor uuid; v_status text; v_received timestamptz; v_act uuid := public.acting_uid();
begin
  select o.supplier_id, r.contractor_id, o.status, o.received_at
    into v_supplier, v_contractor, v_status, v_received
  from offers o join rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_supplier is null then raise exception 'العرض غير موجود'; end if;
  if v_act is distinct from v_supplier then raise exception 'غير مصرّح'; end if;
  if v_status <> 'accepted' then raise exception 'الصفقة غير مكتملة'; end if;
  if v_received is null then raise exception 'يمكن التقييم بعد تأكيد المشتري للاستلام'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'تقييم غير صالح'; end if;
  if exists (select 1 from reviews where reviewer_id = v_act and offer_id = p_offer_id) then
    raise exception 'سبق التقييم';
  end if;
  insert into reviews (reviewer_id, reviewed_id, offer_id, rating, comment)
  values (v_act, v_contractor, p_offer_id, p_rating, nullif(btrim(p_comment), ''));
end $$;

-- 3 + 7 ─ request guard: no cancel after a selection/deal; terms frozen once offers exist
create or replace function public.guard_rfq_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 or auth.uid() is null or public.is_admin()
     or coalesce(current_setting('app.deal_write', true), '') = 'on' then
    return new;
  end if;
  if new.contractor_id is distinct from old.contractor_id then
    raise exception 'لا يمكن نقل ملكية الطلب.';
  end if;
  if new.expires_at is distinct from old.expires_at then
    raise exception 'تُمدَّد مهلة التسعير من خيار «تمديد المهلة» فقط.';
  end if;
  if new.status is distinct from old.status
     and not (old.status::text in ('open', 'draft') and new.status::text = 'cancelled') then
    raise exception 'لا يمكن تغيير حالة الطلب بهذه الطريقة.';
  end if;
  if new.status::text = 'cancelled' and old.status::text <> 'cancelled' and (
       exists (select 1 from rfq_item_awards where rfq_id = new.id)
    or exists (select 1 from offers where rfq_id = new.id and status = 'accepted')) then
    raise exception 'لا يمكن إلغاء طلب اختير فيه عرض. ألغِ الاختيار أولاً.';
  end if;
  if exists (select 1 from offers where rfq_id = new.id) and (
       new.items is distinct from old.items
    or new.quantity is distinct from old.quantity
    or new.unit is distinct from old.unit
    or new.product_name is distinct from old.product_name
    or new.specification is distinct from old.specification
    or new.sector is distinct from old.sector
    or new.sectors is distinct from old.sectors
    or new.sub_category is distinct from old.sub_category
    or new.delivery_required is distinct from old.delivery_required
    or new.region is distinct from old.region
    or new.city is distinct from old.city
    or new.vat_invoice_required is distinct from old.vat_invoice_required
    or new.target_tiers is distinct from old.target_tiers
    or new.target_regions is distinct from old.target_regions
    or new.nearby_only is distinct from old.nearby_only
    or new.verified_only is distinct from old.verified_only) then
    raise exception 'لا يمكن تعديل مواد الطلب أو شروطه بعد وصول عروض عليه. تُلغى العروض الحالية أولاً.';
  end if;
  new.offer_count := old.offer_count;
  return new;
end $$;

-- when a request is cancelled, pending offers are closed and their suppliers told
create or replace function public.close_offers_on_rfq_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status::text = 'cancelled' and old.status::text <> 'cancelled' then
    perform set_config('app.deal_write', 'on', true);
    insert into notifications (user_id, type, title, body, data)
    select o.supplier_id, 'offer_rejected', 'أُلغي طلب التسعير',
           'ألغى المشتري طلب «' || coalesce(public.rfq_label(new), 'طلب') || '»، فأُغلق عرضك عليه.',
           jsonb_build_object('rfq_id', new.id, 'offer_id', o.id, 'url', '/supplier/dashboard')
      from offers o where o.rfq_id = new.id and o.status = 'pending';
    update offers set status = 'rejected' where rfq_id = new.id and status = 'pending';
  end if;
  return new;
end $$;
drop trigger if exists zz_close_offers_on_rfq_cancel on public.rfqs;
create trigger zz_close_offers_on_rfq_cancel after update of status on public.rfqs
  for each row execute function public.close_offers_on_rfq_cancel();

create or replace function public.finalize_rfq_awards(p_rfq_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_contractor uuid; v_status text;
begin
  perform set_config('app.deal_write', 'on', true);
  select contractor_id, status::text into v_contractor, v_status from rfqs where id = p_rfq_id for update;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if v_status <> 'open' then raise exception 'الطلب غير مفتوح، فلا يمكن تأكيد الاختيار'; end if;
  if not exists (select 1 from rfq_item_awards a join offers o on o.id = a.offer_id
                 where a.rfq_id = p_rfq_id and o.status in ('pending', 'accepted')) then
    raise exception 'No awards to finalize';
  end if;
  update offers o set status = 'accepted', accepted_at = coalesce(o.accepted_at, now())
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update offers set invoice_number = 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
  where rfq_id = p_rfq_id and status = 'accepted' and invoice_number is null;
  update offers o set status = 'rejected'
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and not exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update rfqs set status = 'closed' where id = p_rfq_id and status = 'open';
end $$;

-- 4 ─ a rejected offer loses its selections
create or replace function public.drop_awards_of_rejected_offer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    delete from rfq_item_awards where offer_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists zz_drop_awards_of_rejected_offer on public.offers;
create trigger zz_drop_awards_of_rejected_offer after update of status on public.offers
  for each row execute function public.drop_awards_of_rejected_offer();

create or replace function public.get_rfq_for_viewer(p_rfq_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r rfqs; v_owner boolean; v_award boolean; v_see boolean; v_served text[]; result jsonb; v_act uuid := public.acting_uid(); p rfq_private;
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null then return null; end if;
  v_served := public.served_regions(v_act);
  v_owner := (r.contractor_id = auth.uid()) or public.is_admin();
  v_award := v_owner
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = v_act and o.status = 'accepted')
    or exists (select 1 from rfq_item_awards a join offers o on o.id = a.offer_id
               where a.rfq_id = p_rfq_id and a.supplier_id = v_act and o.status in ('pending', 'accepted'));
  v_see := v_award
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = v_act)
    or (
      (coalesce(r.nearby_only, false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
      and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
    );
  if not v_see then return null; end if;
  result := to_jsonb(r);
  if v_award then
    select * into p from rfq_private where rfq_id = p_rfq_id;
    result := result || jsonb_build_object('delivery_location', p.delivery_location, 'delivery_geo', p.delivery_geo);
  else
    result := result - 'delivery_geo' - 'delivery_location';
  end if;
  if not v_owner then result := result - 'contractor_id'; end if;
  return result;
end $$;

-- 5 ─ targeting enforced when the offer is sent (same rule as notify_suppliers_new_rfq)
create or replace function public.check_offer_region_eligibility() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; v_served text[]; eligible boolean; v_ver text; v_tier text;
begin
  select region, coalesce(nearby_only, false) as nearby, target_regions,
         coalesce(verified_only, false) as verified_only, target_tiers
    into r from rfqs where id = new.rfq_id;
  select verification_status::text, supplier_tier into v_ver, v_tier from profiles where id = new.supplier_id;
  if r.verified_only and coalesce(v_ver, '') <> 'verified' then
    raise exception 'هذا الطلب للموردين الموثّقين فقط';
  end if;
  if r.target_tiers is not null and cardinality(r.target_tiers) > 0
     and not (coalesce(v_tier, 'shop') = any(r.target_tiers)) then
    raise exception 'هذا الطلب موجّه لنوع آخر من الموردين';
  end if;
  if r.region is null then return new; end if;
  v_served := public.served_regions(new.supplier_id);
  eligible := (r.nearby = false or cardinality(v_served) = 0 or r.region = any(v_served))
          and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions);
  if not eligible then
    raise exception 'هذا الطلب خارج نطاق مناطق تغطيتك';
  end if;
  return new;
end $$;

-- 6 ─ prices fixed after the 15-minute window (submit_price_reduction uses app.deal_write)
create or replace function public.freeze_offer_prices_after_window() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  if old.status = 'pending' and old.created_at < now() - interval '15 minutes' then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
  end if;
  return new;
end $$;
drop trigger if exists zz_freeze_offer_prices_after_window on public.offers;
create trigger zz_freeze_offer_prices_after_window before update on public.offers
  for each row execute function public.freeze_offer_prices_after_window();

-- 9 ─ housekeeping
-- requests nobody can act on any more: open, deadline passed by 30 days (or 3 days with no offer)
create or replace function public.expire_stale_rfqs() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform set_config('app.deal_write', 'on', true);
  update rfqs r set status = 'expired'
   where r.status = 'open' and r.expires_at is not null
     and not exists (select 1 from rfq_item_awards a where a.rfq_id = r.id)
     and not exists (select 1 from offers o where o.rfq_id = r.id and o.status = 'accepted')
     and (r.expires_at < now() - interval '30 days'
          or (r.expires_at < now() - interval '3 days' and not exists (select 1 from offers o where o.rfq_id = r.id)));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expire_stale_rfqs() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'expire-stale-rfqs-daily';
  perform cron.schedule('expire-stale-rfqs-daily', '15 3 * * *', 'select public.expire_stale_rfqs()');
  -- deal reminders only in the Saudi daytime (08:00–21:00 = 05–18 UTC)
  perform cron.alter_job(jobid, schedule := '0 5-18 * * *') from cron.job where jobname = 'deal-reminders-hourly';
end $$;

create index if not exists profile_specialties_specialty_idx on public.profile_specialties (specialty);
create index if not exists search_events_user_id_idx on public.search_events (user_id);
create index if not exists cr_claims_claimant_id_idx on public.cr_claims (claimant_id);
create index if not exists cr_document_checks_claim_id_idx on public.cr_document_checks (claim_id);
create index if not exists suggestion_votes_user_id_idx on public.suggestion_votes (user_id);
create index if not exists notifications_reminder_idx on public.notifications (user_id, type, ((data->>'offer_id')))
  where type in ('reminder_deliver', 'reminder_receipt');

-- grants that migration 177 meant to remove
revoke usage on schema net from anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;
revoke all on all tables in schema net from anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated, service_role;
