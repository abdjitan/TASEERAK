-- 248: the buyer sees the source shop's NAME once the deal is made (owner 2026-11-21, after the legal
-- review of the new Consumer Protection Law: a consumer must know who really sells before paying).
-- Before the award the buyer still sees only the district. The shop's phone is never shown to the
-- buyer (no location needed either, owner). The agent and admin keep seeing everything.
create or replace function public.get_offer_source(p_offer_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v offers; s offer_sources; v_buyer uuid; v_full boolean; v_deal boolean;
begin
  select * into v from offers where id = p_offer_id;
  if not found then return null; end if;
  select * into s from offer_sources where offer_id = p_offer_id;
  if not found then return null; end if;
  select contractor_id into v_buyer from rfqs where id = v.rfq_id;
  if v.supplier_id = public.acting_uid() or public.is_admin() then
    return jsonb_build_object('city', s.shop_city, 'area', s.shop_area, 'revealed', true, 'name', s.shop_name, 'phone', s.shop_phone);
  elsif v_buyer = auth.uid() then
    v_deal := v.status::text = 'accepted' or exists (select 1 from rfq_item_awards a where a.offer_id = v.id);
    return jsonb_build_object('city', s.shop_city, 'area', s.shop_area, 'revealed', v_deal,
      'name', case when v_deal then s.shop_name end, 'phone', null);
  end if;
  return null;
end $function$;
