-- «وسيط تسعير» rules for independent sellers (owner 2026-11-16, legal study the same day).
-- An independent seller (profiles.supplier_tier = 'independent') is a pricing agent for a shop:
--   1. Every offer names its source shop (offer_sources). The buyer sees only the approximate area
--      until the deal is made (offer accepted); then the shop's name and phone are revealed.
--   2. A deal with a pricing agent can't exceed 5,000 SAR (buyer-pays basis, VAT added when the
--      seller is VAT-registered and priced without VAT), checked at award, accept and finalize.
-- For every seller: the official invoice is attached before delivery is confirmed (the shop's tax
-- invoice for a pricing agent). Taseerak's own document is a quotation, not an invoice.

create table if not exists public.offer_sources (
  offer_id   uuid primary key references public.offers(id) on delete cascade,
  shop_name  text not null check (length(btrim(shop_name)) between 2 and 120),
  shop_city  text check (shop_city is null or length(shop_city) <= 60),
  shop_area  text check (shop_area is null or length(shop_area) <= 120),
  shop_phone text check (shop_phone is null or length(shop_phone) <= 30),
  updated_at timestamptz not null default now()
);
alter table public.offer_sources enable row level security;
revoke all on public.offer_sources from anon, authenticated;
-- no direct table access: read through get_offer_source(), write through set_offer_source()

create or replace function public.set_offer_source(p_offer_id uuid, p_shop_name text, p_shop_city text default null,
                                                   p_shop_area text default null, p_shop_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v offers;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط صاحب العرض يمكنه تحديد المحل المصدر'; end if;
  if v.status <> 'pending' then raise exception 'لا يمكن تعديل المحل المصدر بعد اعتماد الصفقة'; end if;
  if length(btrim(coalesce(p_shop_name, ''))) < 2 then raise exception 'اكتب اسم المحل الذي ستشتري منه'; end if;
  insert into offer_sources (offer_id, shop_name, shop_city, shop_area, shop_phone, updated_at)
  values (p_offer_id, left(btrim(p_shop_name), 120), left(nullif(btrim(coalesce(p_shop_city, '')), ''), 60),
          left(nullif(btrim(coalesce(p_shop_area, '')), ''), 120), left(nullif(regexp_replace(coalesce(p_shop_phone, ''), '[^0-9+]', '', 'g'), ''), 30), now())
  on conflict (offer_id) do update set shop_name = excluded.shop_name, shop_city = excluded.shop_city,
    shop_area = excluded.shop_area, shop_phone = excluded.shop_phone, updated_at = now();
end $$;

-- the seller (and team) and admins see everything; the buyer sees city + area always and the
-- shop's name/phone once the deal is made (offer accepted)
create or replace function public.get_offer_source(p_offer_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v offers; s offer_sources; v_buyer uuid; v_full boolean;
begin
  select * into v from offers where id = p_offer_id;
  if not found then return null; end if;
  select * into s from offer_sources where offer_id = p_offer_id;
  if not found then return null; end if;
  select contractor_id into v_buyer from rfqs where id = v.rfq_id;
  if v.supplier_id = public.acting_uid() or public.is_admin() then v_full := true;
  elsif v_buyer = auth.uid() then v_full := (v.status = 'accepted');
  else return null;
  end if;
  return jsonb_build_object('city', s.shop_city, 'area', s.shop_area, 'revealed', v_full,
    'name', case when v_full then s.shop_name end, 'phone', case when v_full then s.shop_phone end);
end $$;

-- buyer-pays total of what a buyer would award to one offer (items only)
create or replace function public.broker_guard(p_offer_id uuid, p_total numeric)
returns void language plpgsql stable security definer set search_path = public as $$
declare v offers; v_tier text; v_pay numeric;
begin
  select * into v from offers where id = p_offer_id;
  if not found then return; end if;
  select supplier_tier into v_tier from profiles where id = v.supplier_id;
  if coalesce(v_tier, '') <> 'independent' then return; end if;
  if not exists (select 1 from offer_sources where offer_id = p_offer_id) then
    raise exception 'لم يحدّد وسيط التسعير المحل المصدر لهذا العرض، فلا يمكن اختياره بعد.';
  end if;
  v_pay := coalesce(p_total, 0) * case when v.vat_status::text = 'not_registered' or coalesce(v.vat_included, false) then 1 else 1.15 end;
  if v_pay > 5000 then
    raise exception 'الحد الأقصى للصفقة مع وسيط تسعير 5,000 ريال، وقيمة اختيارك من هذا العرض % ريال. اختر مورّداً آخر لبعض المواد.', round(v_pay);
  end if;
end $$;

revoke all on function public.set_offer_source(uuid, text, text, text, text) from public, anon;
revoke all on function public.get_offer_source(uuid) from public, anon;
revoke all on function public.broker_guard(uuid, numeric) from public, anon, authenticated;
grant execute on function public.set_offer_source(uuid, text, text, text, text) to authenticated;
grant execute on function public.get_offer_source(uuid) to authenticated;

-- hook the guard into the award / accept / finalize paths
do $$
declare d text; n text;
begin
  -- award one item: everything already awarded to this offer (other items) + this item
  d := pg_get_functiondef('public.award_rfq_item'::regproc);
  n := replace(d, 'if v_entry is null then raise exception ''Offer does not price this item''; end if;',
    'if v_entry is null then raise exception ''Offer does not price this item''; end if;
  perform public.broker_guard(p_offer_id,
    coalesce((select sum(a.total) from rfq_item_awards a where a.rfq_id = p_rfq_id and a.offer_id = p_offer_id and a.item_index <> p_item_index), 0)
    + coalesce(nullif(v_entry->>''total'','''')::numeric, 0));');
  if n = d then raise exception 'award_rfq_item: pattern not found'; end if;
  execute n;

  -- single-item accept: the whole offer
  d := pg_get_functiondef('public.accept_offer'::regproc);
  n := replace(d, 'update public.offers set status=''accepted'', accepted_at=now() where id = p_offer_id and status=''pending'';',
    'perform public.broker_guard(p_offer_id, (select total_price from public.offers where id = p_offer_id));
  update public.offers set status=''accepted'', accepted_at=now() where id = p_offer_id and status=''pending'';');
  if n = d then raise exception 'accept_offer: pattern not found'; end if;
  execute n;

  -- finalize: re-check every awarded offer
  d := pg_get_functiondef('public.finalize_rfq_awards'::regproc);
  n := replace(d, 'raise exception ''No awards to finalize'';
  end if;',
    'raise exception ''No awards to finalize'';
  end if;
  perform public.broker_guard(g.offer_id, g.total)
     from (select a.offer_id, sum(a.total) as total from rfq_item_awards a where a.rfq_id = p_rfq_id group by a.offer_id) g;');
  if n = d then raise exception 'finalize_rfq_awards: pattern not found'; end if;
  execute n;

  -- every seller attaches the official invoice before confirming delivery
  d := pg_get_functiondef('public.confirm_delivery'::regproc);
  n := replace(d, 'if v.supplier_delivered_at is not null then raise exception ''تم تأكيد التسليم مسبقاً''; end if;',
    'if v.supplier_delivered_at is not null then raise exception ''تم تأكيد التسليم مسبقاً''; end if;
  if v.supplier_invoice_url is null then raise exception ''أرفق الفاتورة الضريبية (فاتورة المحل) أولاً، ثم أكّد التسليم.''; end if;');
  if n = d then raise exception 'confirm_delivery: pattern not found'; end if;
  execute n;
end $$;
