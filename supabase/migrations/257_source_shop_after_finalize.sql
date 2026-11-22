-- 257 (UX audit UX-001, critical privacy): the buyer saw the pricing agent's source-shop NAME as soon as
-- one item was awarded (a tentative choice he can undo), so he could take the name and buy directly.
-- Now the name is revealed only once the offer is ACCEPTED (finalize_rfq_awards / accept). Never the phone.
create or replace function public.get_offer_source(p_offer_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v offers; s offer_sources; v_buyer uuid; v_deal boolean;
begin
  select * into v from offers where id = p_offer_id;
  if not found then return null; end if;
  select * into s from offer_sources where offer_id = p_offer_id;
  if not found then return null; end if;
  select contractor_id into v_buyer from rfqs where id = v.rfq_id;
  if v.supplier_id = public.acting_uid() or public.is_admin() then
    return jsonb_build_object('city', s.shop_city, 'area', s.shop_area, 'revealed', true, 'name', s.shop_name, 'phone', s.shop_phone, 'viewer', 'seller');
  elsif v_buyer = auth.uid() then
    v_deal := v.status::text = 'accepted';
    return jsonb_build_object('city', s.shop_city, 'area', s.shop_area, 'revealed', v_deal,
      'name', case when v_deal then s.shop_name end, 'phone', null, 'viewer', 'buyer');
  end if;
  return null;
end $$;
