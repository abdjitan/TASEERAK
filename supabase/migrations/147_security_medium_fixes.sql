-- 147 (security audit M1–M6, 2026-10-13)
--
-- M1: a buyer could UPDATE any rfqs column: swap the materials after suppliers priced them
--     (the PO then shows the new material at the old price), move expires_at (unfreezes prices),
--     reopen a closed request, or hand the request to another user. Guard trigger below.
-- M2: submit_price_reduction accepted any new total, at any time — even a higher price after
--     the deadline — and left item_prices stale. Now: only while a reduction request is open,
--     only lower, and the per-item prices are scaled to the new total.
-- M3: profiles_public was readable by anon and exposed exact coordinates + national short
--     address of individual sellers (natural persons, PDPL). Anon read revoked; for independent
--     sellers coordinates are rounded (~1 km, keeps distance sorting) and the address hidden.
-- M4: get_or_create_conversation let a supplier open a thread on any request (even ones it can't
--     see) and a buyer open one with any user. Now tied to an offer / a visible open request.
-- M5: the live DB has no legacy 001 policies left, but "Insert own profile" still let a user
--     without a profile row insert one with role 'admin'. Profiles are created only by
--     handle_new_user(); client INSERT is removed.
-- M6: client_ip() took the first X-Forwarded-For entry, which the caller controls → unlimited
--     phone/email/CR existence checks. Prefer the edge-set cf-connecting-ip / x-real-ip.

-- ── M1 ───────────────────────────────────────────────────────────────────────────────────
create or replace function public.guard_rfq_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- nested trigger writes (offer_count), system jobs, admins and deal RPCs pass through
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
  if exists (select 1 from offers where rfq_id = new.id) and (
       new.items is distinct from old.items
    or new.quantity is distinct from old.quantity
    or new.unit is distinct from old.unit
    or new.product_name is distinct from old.product_name
    or new.specification is distinct from old.specification
    or new.sector is distinct from old.sector
    or new.sectors is distinct from old.sectors) then
    raise exception 'لا يمكن تعديل مواد الطلب بعد وصول عروض عليه. تُلغى العروض الحالية أولاً.';
  end if;
  new.offer_count := old.offer_count; -- maintained by update_rfq_offer_count only
  return new;
end $$;
revoke execute on function public.guard_rfq_update() from public, anon, authenticated;
drop trigger if exists trg_guard_rfq_update on public.rfqs;
create trigger trg_guard_rfq_update before update on public.rfqs
  for each row execute function public.guard_rfq_update();

-- the deadline RPC is now the only way to move expires_at
create or replace function public.extend_rfq_deadline(p_rfq_id uuid, p_new_expires timestamp with time zone)
returns timestamp with time zone
language plpgsql security definer set search_path = public
as $$
declare
  v_owner   uuid;
  v_status  text;
  v_current timestamptz;
begin
  select contractor_id, status::text, expires_at
    into v_owner, v_status, v_current
    from rfqs where id = p_rfq_id;

  if v_owner is null then raise exception 'RFQ not found'; end if;
  if auth.uid() <> v_owner then raise exception 'Not authorized'; end if;
  if v_status <> 'open' then
    raise exception 'لا يمكن تمديد مهلة طلب غير مفتوح';
  end if;
  if p_new_expires <= now() then
    raise exception 'المهلة الجديدة يجب أن تكون في المستقبل';
  end if;
  if v_current is not null and p_new_expires <= v_current then
    raise exception 'المهلة الجديدة يجب أن تكون أبعد من المهلة الحالية';
  end if;

  perform set_config('app.deal_write', 'on', true);
  update rfqs set expires_at = p_new_expires where id = p_rfq_id;
  perform set_config('app.deal_write', 'off', true);

  insert into notifications (user_id, type, title, body, data)
  select distinct o.supplier_id, 'rfq_expiring'::notification_type,
         'تم تمديد مهلة التسعير',
         'مدّد المشتري مهلة التسعير — يمكنك مراجعة عرضك حتى ' || to_char(p_new_expires at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI'),
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || p_rfq_id::text, 'rfq_id', p_rfq_id)
    from offers o
   where o.rfq_id = p_rfq_id and o.status = 'pending';

  return p_new_expires;
end $$;

-- ── M2 ───────────────────────────────────────────────────────────────────────────────────
create or replace function public.submit_price_reduction(p_offer_id uuid, p_new_total numeric)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_qty numeric; v_product text;
        v_old numeric; v_deadline timestamptz; v_ratio numeric;
begin
  select o.rfq_id, o.supplier_id, r.contractor_id, r.quantity, public.rfq_label(r), o.total_price, o.reduction_deadline
    into v_rfq, v_supplier, v_contractor, v_qty, v_product, v_old, v_deadline
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if v_supplier is distinct from public.acting_uid() and not is_admin() then raise exception 'forbidden'; end if;
  if v_deadline is null or v_deadline < now() then
    raise exception 'لا يوجد طلب تخفيض مفتوح على هذا العرض.';
  end if;
  if p_new_total is null or p_new_total <= 0 or v_old is null or p_new_total >= v_old then
    raise exception 'السعر الجديد يجب أن يكون أقل من السعر الحالي.';
  end if;
  v_ratio := p_new_total / v_old;

  perform set_config('app.deal_write', 'on', true);
  update public.offers
    set total_price = p_new_total,
        unit_price = case when coalesce(v_qty,0) > 0 then round(p_new_total / v_qty, 2) else unit_price end,
        item_prices = case when jsonb_typeof(item_prices) = 'array' then (
          select coalesce(jsonb_agg(
            case when jsonb_typeof(e) <> 'object' then e else e
              || case when jsonb_typeof(e->'unit_price') = 'number'
                      then jsonb_build_object('unit_price', round((e->>'unit_price')::numeric * v_ratio, 2)) else '{}'::jsonb end
              || case when jsonb_typeof(e->'total') = 'number'
                      then jsonb_build_object('total', round((e->>'total')::numeric * v_ratio, 2)) else '{}'::jsonb end
            end order by i), '[]'::jsonb)
          from jsonb_array_elements(item_prices) with ordinality t(e, i)
        ) else item_prices end,
        reduction_deadline = null
  where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  perform set_config('app.deal_write', 'off', true);

  insert into public.notifications (user_id, type, title, body, data)
  values (v_contractor, 'rfq_offer', 'تم تخفيض السعر',
    'خفّض المورد سعر عرضه على «' || coalesce(v_product, 'طلب') || '» إلى ' || p_new_total::text || ' ر.س.',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'reduction_response'));
end $$;

-- ── M3 ───────────────────────────────────────────────────────────────────────────────────
create or replace view public.profiles_public as
 select id,
    role,
    case when role <> 'contractor'::user_role then company_name_ar else null::text end as company_name_ar,
    case when role <> 'contractor'::user_role then company_name_en else null::text end as company_name_en,
    supplier_tier,
    contractor_grade,
    rating_avg,
    rating_count,
    city,
    region,
    district,
    verification_status,
    cr_verification_source,
    preferred_language,
    is_active,
    subscription_plan,
    created_at,
    approvals,
    case when role = 'supplier'::user_role then
      case when provider_type in ('individual','broker','price_agent') then round(latitude, 2) else latitude end
    else null::numeric end as latitude,
    case when role = 'supplier'::user_role then
      case when provider_type in ('individual','broker','price_agent') then round(longitude, 2) else longitude end
    else null::numeric end as longitude,
    case when role = 'supplier'::user_role and coalesce(provider_type, '') not in ('individual','broker','price_agent')
      then national_short_address else null::text end as national_short_address
   from profiles;
revoke all on public.profiles_public from anon, public;
revoke insert, update, delete, truncate, references, trigger on public.profiles_public from authenticated;
grant select on public.profiles_public to authenticated;

-- ── M4 ───────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_or_create_conversation(p_rfq_id uuid, p_supplier_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_contractor uuid; v_status text; v_id uuid; v_uid uuid := auth.uid();
begin
  select contractor_id, status::text into v_contractor, v_status from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_uid is null or (v_uid <> v_contractor and p_supplier_id is distinct from v_uid
                       and p_supplier_id is distinct from public.acting_uid()) then
    raise exception 'Not authorized';
  end if;

  select id into v_id from conversations where rfq_id = p_rfq_id and contractor_id = v_contractor and supplier_id = p_supplier_id;
  if v_id is not null then return v_id; end if;

  if v_uid = v_contractor then
    -- the buyer may only open a thread with a supplier who quoted on this request
    if not exists (select 1 from offers where rfq_id = p_rfq_id and supplier_id = p_supplier_id) then
      raise exception 'Not authorized';
    end if;
  else
    -- a supplier: on a request it quoted on, or an open request it is allowed to see
    if not (public.supplier_offered_on(p_rfq_id)
            or (v_status = 'open' and public.get_rfq_for_viewer(p_rfq_id) is not null)) then
      raise exception 'Not authorized';
    end if;
  end if;

  insert into conversations (rfq_id, contractor_id, supplier_id) values (p_rfq_id, v_contractor, p_supplier_id) returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.get_or_create_conversation(uuid, uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

-- ── M5 ───────────────────────────────────────────────────────────────────────────────────
drop policy if exists "Insert own profile" on public.profiles;
revoke insert on public.profiles from anon, authenticated;

-- ── M6 ───────────────────────────────────────────────────────────────────────────────────
create or replace function public.client_ip()
returns text
language sql stable set search_path = public
as $$
  with h as (select coalesce(current_setting('request.headers', true), '{}')::json as j)
  select coalesce(
    nullif(btrim(j ->> 'cf-connecting-ip'), ''),
    nullif(btrim(j ->> 'x-real-ip'), ''),
    nullif(btrim(split_part(j ->> 'x-forwarded-for', ',', 1)), ''),
    'anon')
  from h
$$;
