-- 185: the supplier's request feed as one server function (security + performance audits 2026-11-01).
--  * The feed read the rfqs table directly, so every signed-in account could also read each request's
--    contractor_id and group a buyer's purchases even with «إخفاء الهوية». The function returns the
--    rows without contractor_id / delivery location, with only the buyer's grade.
--  * It applies the targeting on the server (sectors, value, verified-only, supplier type, regions,
--    dismissed, deadline) before the limit, so matching requests no longer drop out past 150 rows.
-- Step 2 (after the mobile app reads the feed through this function too): narrow the rfqs read
-- policy to owner / admin / suppliers who quoted.
create or replace function public.get_supplier_feed(p_sectors text[] default null, p_min_value numeric default 0, p_limit integer default 150)
returns setof jsonb language plpgsql stable security definer set search_path = public as $$
declare v_act uuid := public.acting_uid(); v_served text[]; v_tier text; v_verified boolean;
begin
  if v_act is null then return; end if;
  select coalesce(supplier_tier, 'shop'), verification_status::text = 'verified' into v_tier, v_verified
    from profiles where id = v_act;
  v_served := public.served_regions(v_act);
  return query
  select (to_jsonb(r) - 'contractor_id' - 'delivery_location' - 'delivery_geo')
         || jsonb_build_object('contractor', jsonb_build_object('contractor_grade', p.contractor_grade))
    from rfqs r
    left join profiles p on p.id = r.contractor_id
   where r.status = 'open'
     and (r.expires_at is null or r.expires_at > now())
     and r.contractor_id <> v_act
     and (p_sectors is null or cardinality(p_sectors) = 0 or r.sectors && p_sectors)
     and (coalesce(p_min_value, 0) <= 0 or r.estimated_value is null or r.estimated_value >= p_min_value)
     and (not coalesce(r.verified_only, false) or v_verified)
     and (r.target_tiers is null or cardinality(r.target_tiers) = 0 or v_tier = any(r.target_tiers))
     and (coalesce(r.nearby_only, false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
     and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
     and not exists (select 1 from rfq_dismissals d where d.rfq_id = r.id and d.supplier_id = v_act)
   order by r.created_at desc
   limit least(greatest(coalesce(p_limit, 150), 1), 300);
end $$;
revoke all on function public.get_supplier_feed(text[], numeric, integer) from public, anon;
grant execute on function public.get_supplier_feed(text[], numeric, integer) to authenticated;
