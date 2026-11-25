-- 289: the admin deal-closing notices carry reason + rfq_ref for the client templates (notifText deal_closed).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.admin_close_deal(uuid, text)'::regprocedure);
  d := replace(d, '''kind'', ''deal_closed'')', '''kind'', ''deal_closed'', ''reason'', left(btrim(p_reason), 300), ''rfq_ref'', r.ref_no)');
  execute d;
end $$;
