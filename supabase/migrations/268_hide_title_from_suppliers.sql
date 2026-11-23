-- 268 (round-2 UX-002): rfqs.title holds the buyer's project/tender name. The supplier feed and the request
-- page RPC no longer return it to anyone but the buyer (the supplier screens build names from the materials).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.get_supplier_feed(text[], numeric, integer)'::regprocedure);
  if position('- ''title''' in d) = 0 then
    d := replace(d, '- ''delivery_location'' - ''delivery_geo'')', '- ''delivery_location'' - ''delivery_geo'' - ''title'')');
    execute d;
  end if;
  d := pg_get_functiondef('public.get_rfq_for_viewer(uuid)'::regprocedure);
  if position('- ''contractor_id'' - ''title''' in d) = 0 then
    d := replace(d, 'result := result - ''contractor_id'';', 'result := result - ''contractor_id'' - ''title'';');
    execute d;
  end if;
end $$;
