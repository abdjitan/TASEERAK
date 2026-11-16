-- «وسيط تسعير» follow-up (owner 2026-11-16):
--   1. The buyer never sees the source shop's name or phone (it would let the buyer bypass the
--      agent next time). The buyer sees the area only; the seller and admins see everything.
--      The shop's identity reaches the buyer only on the shop's own tax invoice.
--   2. The deal cap grows with trust: 15,000 SAR for a new agent, 50,000 after 3 successful deals,
--      no cap after 10. Successful = accepted, receipt confirmed, no dispute opened.

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
  elsif v_buyer = auth.uid() then v_full := false;
  else return null;
  end if;
  return jsonb_build_object('city', s.shop_city, 'area', s.shop_area, 'revealed', v_full,
    'name', case when v_full then s.shop_name end, 'phone', case when v_full then s.shop_phone end);
end $$;

-- successful deals of a seller, and the cap that follows from them (null = no cap)
create or replace function public.agent_deal_cap(p_supplier uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select case when n >= 10 then null when n >= 3 then 50000 else 15000 end
    from (select count(*) as n from offers
           where supplier_id = p_supplier and status = 'accepted'
             and received_at is not null and dispute_opened_at is null) d
$$;

create or replace function public.broker_guard(p_offer_id uuid, p_total numeric)
returns void language plpgsql stable security definer set search_path = public as $$
declare v offers; v_tier text; v_pay numeric; v_cap numeric;
begin
  select * into v from offers where id = p_offer_id;
  if not found then return; end if;
  select supplier_tier into v_tier from profiles where id = v.supplier_id;
  if coalesce(v_tier, '') <> 'independent' then return; end if;
  if not exists (select 1 from offer_sources where offer_id = p_offer_id) then
    raise exception 'لم يحدّد وسيط التسعير المحل المصدر لهذا العرض، فلا يمكن اختياره بعد.';
  end if;
  v_cap := public.agent_deal_cap(v.supplier_id);
  if v_cap is null then return; end if;
  v_pay := coalesce(p_total, 0) * case when v.vat_status::text = 'not_registered' or coalesce(v.vat_included, false) then 1 else 1.15 end;
  if v_pay > v_cap then
    raise exception 'الحد الأقصى للصفقة مع وسيط التسعير هذا % ريال، وقيمة اختيارك من عرضه % ريال. اختر مورّداً آخر لبعض المواد.',
      to_char(v_cap, 'FM999,999'), to_char(round(v_pay), 'FM999,999,999');
  end if;
end $$;

-- the seller sees his own cap on the pricing page
create or replace function public.my_agent_deal_cap()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('cap', public.agent_deal_cap(public.acting_uid()),
    'deals', (select count(*) from offers where supplier_id = public.acting_uid() and status = 'accepted'
                and received_at is not null and dispute_opened_at is null))
$$;

revoke all on function public.agent_deal_cap(uuid) from public, anon, authenticated;
revoke all on function public.my_agent_deal_cap() from public, anon;
grant execute on function public.my_agent_deal_cap() to authenticated;
