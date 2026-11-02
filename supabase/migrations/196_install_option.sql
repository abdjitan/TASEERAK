-- 196: «مع التركيب» (supply + install), owner decision 2026-11-02 — a minimal per-line option,
-- not a services marketplace.
--   rfqs.items[i].with_install = true when the buyer asked for the price with installation.
--   On the offer, each item_prices entry of such a line carries:
--     install_offered boolean, install_total numeric (0 when not offered), material_total numeric,
--     total = material_total + install_total
--   award_rfq_item (177) copies the entry's total into rfq_item_awards: unchanged, the award and
--   the purchase order already include the installation.
-- This migration:
--   1. extends the price sanity check (148 item_prices_ok) to install_total >= 0 and
--      material_total >= 0 (and install_total must be a number when present);
--   2. keeps the split consistent when a seller answers a price-reduction request
--      (177 submit_price_reduction scaled unit_price/total only).

-- ── 1. price sanity ─────────────────────────────────────────────────────────────────────────
create or replace function public.item_prices_ok(p jsonb)
returns boolean
language sql immutable set search_path = public
as $$
  select p is null or jsonb_typeof(p) <> 'array' or not exists (
    select 1 from jsonb_array_elements(p) e
    where jsonb_typeof(e) = 'object' and (
         (jsonb_typeof(e->'unit_price') = 'number' and (e->>'unit_price')::numeric < 0)
      or (jsonb_typeof(e->'total') = 'number' and (e->>'total')::numeric < 0)
      or (jsonb_typeof(e->'quantity') = 'number' and (e->>'quantity')::numeric < 0)
      or (jsonb_typeof(e->'install_total') = 'number' and (e->>'install_total')::numeric < 0)
      or (jsonb_typeof(e->'material_total') = 'number' and (e->>'material_total')::numeric < 0)
      or (e ? 'install_total' and jsonb_typeof(e->'install_total') not in ('number', 'null'))))
$$;
-- the check constraint (148) calls the function; re-add it so existing rows are validated again
alter table public.offers drop constraint if exists offers_item_prices_nonneg;
alter table public.offers add constraint offers_item_prices_nonneg check (public.item_prices_ok(item_prices));

-- ── 2. price reduction keeps material/install consistent ───────────────────────────────────
-- Same as 177 except the item_prices update: install_total scales with the line and
-- material_total = new total - new install_total.
create or replace function public.submit_price_reduction(p_offer_id uuid, p_new_total numeric)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_qty numeric; v_product text;
        v_old numeric; v_deadline timestamptz; v_ratio numeric; v_extras numeric; v_items int;
begin
  select o.rfq_id, o.supplier_id, r.contractor_id, r.quantity, public.rfq_label(r), o.total_price, o.reduction_deadline,
         coalesce((select sum(coalesce(nullif(e->>'amount','')::numeric, 0))
                   from jsonb_array_elements(case when jsonb_typeof(o.extra_charges) = 'array' then o.extra_charges else '[]'::jsonb end) e), 0),
         case when jsonb_typeof(r.items) = 'array' then jsonb_array_length(r.items) else 1 end
    into v_rfq, v_supplier, v_contractor, v_qty, v_product, v_old, v_deadline, v_extras, v_items
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if v_supplier is distinct from public.acting_uid() and not is_admin() then raise exception 'forbidden'; end if;
  if v_deadline is null or v_deadline < now() then
    raise exception 'لا يوجد طلب تخفيض مفتوح على هذا العرض.';
  end if;
  if p_new_total is null or p_new_total <= 0 or v_old is null or p_new_total >= v_old then
    raise exception 'السعر الجديد يجب أن يكون أقل من السعر الحالي.';
  end if;
  if p_new_total <= v_extras or v_old <= v_extras then
    raise exception 'السعر الجديد يجب أن يكون أكبر من الرسوم الإضافية.';
  end if;
  v_ratio := (p_new_total - v_extras) / (v_old - v_extras);
  perform set_config('app.deal_write', 'on', true);
  update public.offers
    set total_price = p_new_total,
        unit_price = case when v_items <= 1 and coalesce(v_qty,0) > 0 then round((p_new_total - v_extras) / v_qty, 2)
                          when v_items > 1 then null else unit_price end,
        item_prices = case when jsonb_typeof(item_prices) = 'array' then (
          select coalesce(jsonb_agg(
            case when jsonb_typeof(e) <> 'object' then e else e
              || case when jsonb_typeof(e->'unit_price') = 'number'
                      then jsonb_build_object('unit_price', round((e->>'unit_price')::numeric * v_ratio, 2)) else '{}'::jsonb end
              || case when jsonb_typeof(e->'total') = 'number'
                      then jsonb_build_object('total', round((e->>'total')::numeric * v_ratio, 2)) else '{}'::jsonb end
              || case when jsonb_typeof(e->'install_total') = 'number' and jsonb_typeof(e->'total') = 'number'
                      then jsonb_build_object(
                        'install_total', round((e->>'install_total')::numeric * v_ratio, 2),
                        'material_total', round((e->>'total')::numeric * v_ratio, 2) - round((e->>'install_total')::numeric * v_ratio, 2))
                      else '{}'::jsonb end
            end order by i), '[]'::jsonb)
          from jsonb_array_elements(item_prices) with ordinality t(e, i)
        ) else item_prices end,
        reduction_deadline = null
  where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  update public.rfq_item_awards
    set unit_price = case when unit_price is null then null else round(unit_price * v_ratio, 2) end,
        total = round(coalesce(total, 0) * v_ratio, 2)
  where offer_id = p_offer_id;
  perform set_config('app.deal_write', 'off', true);
  insert into public.notifications (user_id, type, title, body, data)
  values (v_contractor, 'rfq_offer', 'تم تخفيض السعر',
    'خفّض المورد سعر عرضه على «' || coalesce(v_product, 'طلب') || '» إلى ' || p_new_total::text || ' ر.س.',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'reduction_response'));
end $$;
