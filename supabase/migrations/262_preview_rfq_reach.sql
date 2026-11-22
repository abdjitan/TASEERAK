-- 262 (UX-190): «سيصل طلبك إلى نحو N موردين» before sending. Same matching rules as count_matching_suppliers,
-- per material; the total is capped at what routing actually sends (nearby target / regional cap), so the
-- buyer is never promised more suppliers than will be notified. A material no supplier covers returns 0.
create or replace function public.preview_rfq_reach(p_items jsonb, p_region text, p_city text, p_geo text, p_nearby boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r rfqs; it jsonb; c int; v_max int := 0; v_target int; v_cap int; out_items jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then return null; end if;
  if jsonb_typeof(p_items) <> 'array' then return null; end if;
  r.contractor_id := auth.uid();
  r.region := nullif(btrim(coalesce(p_region, '')), '');
  r.city := nullif(btrim(coalesce(p_city, '')), '');
  r.nearby_only := coalesce(p_nearby, false);
  select coalesce(rfq_nearby_target, 20), coalesce(rfq_max_recipients, 100) into v_target, v_cap from app_config limit 1;
  for it in select * from jsonb_array_elements(p_items) limit 60 loop
    c := public.count_matching_suppliers(r, it);
    v_max := greatest(v_max, c);
    out_items := out_items || jsonb_build_array(jsonb_build_object('name', left(coalesce(it->>'product_name', ''), 120), 'suppliers', c));
  end loop;
  return jsonb_build_object('reached', least(v_max, case when r.nearby_only then coalesce(v_target, 20) else coalesce(v_cap, 100) end), 'items', out_items);
end $$;
revoke all on function public.preview_rfq_reach(jsonb, text, text, text, boolean) from public, anon;
grant execute on function public.preview_rfq_reach(jsonb, text, text, text, boolean) to authenticated;
