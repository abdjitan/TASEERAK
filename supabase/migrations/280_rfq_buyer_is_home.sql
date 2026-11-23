-- 280 (round-5 UX-174): the supplier request page learns whether the buyer is a home buyer (a yes/no only,
-- never who), so it can ask for plain wording and hide credit terms.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.get_rfq_for_viewer(uuid)'::regprocedure);
  if position('buyer_is_home' in d) = 0 then
    d := replace(d, '  return result;',
      '  result := result || jsonb_build_object(''buyer_is_home'', coalesce((select buyer_type = ''individual'' from profiles where id = r.contractor_id), false));' || chr(10) || '  return result;');
    execute d;
  end if;
end $$;
