-- 288 (round-6 UX-010): the reach preview follows «الموثّقون فقط» and the chosen seller kinds, like routing.
drop function if exists public.preview_rfq_reach(jsonb, text, text, text, boolean);
CREATE OR REPLACE FUNCTION public.preview_rfq_reach(p_items jsonb, p_region text, p_city text, p_geo text, p_nearby boolean, p_verified_only boolean DEFAULT false, p_tiers text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r rfqs; it jsonb; c int; v_max int := 0; v_target int; v_cap int; out_items jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then return null; end if;
  if jsonb_typeof(p_items) <> 'array' then return null; end if;
  r.contractor_id := auth.uid();
  r.region := nullif(btrim(coalesce(p_region, '')), '');
  r.city := nullif(btrim(coalesce(p_city, '')), '');
  r.nearby_only := coalesce(p_nearby, false);
  r.verified_only := coalesce(p_verified_only, false);
  r.target_tiers := p_tiers;
  select coalesce(rfq_nearby_target, 20), coalesce(rfq_max_recipients, 100) into v_target, v_cap from app_config limit 1;
  for it in select * from jsonb_array_elements(p_items) limit 60 loop
    c := public.count_matching_suppliers(r, it);
    v_max := greatest(v_max, c);
    out_items := out_items || jsonb_build_array(jsonb_build_object('name', left(coalesce(it->>'product_name', ''), 120), 'suppliers', c));
  end loop;
  return jsonb_build_object('reached', least(v_max, case when r.nearby_only then coalesce(v_target, 20) else coalesce(v_cap, 100) end), 'items', out_items);
end $function$;
revoke all on function public.preview_rfq_reach(jsonb, text, text, text, boolean, boolean, text[]) from public, anon;
grant execute on function public.preview_rfq_reach(jsonb, text, text, text, boolean, boolean, text[]) to authenticated;
