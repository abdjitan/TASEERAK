-- 290 (round-7 audit, server side)
-- UX-014: no delivery/receipt reminders for a deal the admin closed.
-- UX-089: the closing reason is stored without trailing punctuation (the notice adds its own full stop).
-- supplier analytics: a closed deal is not a win.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_deal_reminders()'::regprocedure);
  if position('deal_closed_at' in d) = 0 then
    d := replace(d, '      AND o.received_at IS NULL' || chr(10) || '  LOOP', '      AND o.received_at IS NULL' || chr(10) || '      AND o.deal_closed_at IS NULL' || chr(10) || '  LOOP');
    if position('deal_closed_at' in d) = 0 then raise exception 'reminders anchor not found'; end if;
    execute d;
  end if;

  d := pg_get_functiondef('public.admin_close_deal(uuid, text)'::regprocedure);
  d := replace(d, 'left(btrim(p_reason), 500)', 'left(rtrim(btrim(p_reason), ' || quote_literal('.،;:!؟ ') || '), 500)');
  d := replace(d, 'left(btrim(p_reason), 300)', 'left(rtrim(btrim(p_reason), ' || quote_literal('.،;:!؟ ') || '), 300)');
  execute d;

  d := pg_get_functiondef('public.get_my_supplier_analytics()'::regprocedure);
  if position('deal_closed_at' in d) = 0 then
    d := replace(d, 'when o.status = ''accepted'' or exists', 'when o.deal_closed_at is not null then ''cancelled''' || chr(10) || '             when o.status = ''accepted'' or exists');
    if position('deal_closed_at' in d) = 0 then raise exception 'analytics anchor not found'; end if;
    execute d;
  end if;
end $$;
