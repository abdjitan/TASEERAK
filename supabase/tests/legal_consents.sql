-- Terms/privacy consent record (migration 176), run as the real test accounts inside ONE
-- transaction that is always rolled back. The error message is the report: "CONSENT: 5 passed, 0 failed".
do $$
declare buyer uuid := 'edc9cbfe-05b0-4805-9c42-037bfc6b7e79'; sup uuid := '61e3c9b0-1507-46eb-8c55-9eddc8f78da5'; r jsonb; n int; ok int := 0; bad int := 0; log text := '';
begin
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.my_terms_status();
  if r->>'current' = public.current_terms_version() and (r->>'accepted')::boolean = false then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL status before ' || r::text; end if;
  perform public.accept_terms('web');
  perform public.accept_terms('web');   -- idempotent
  r := public.my_terms_status();
  if (r->>'accepted')::boolean then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL not accepted'; end if;
  select count(*) into n from legal_consents where user_id = buyer;
  if n = 1 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL rows=' || n; end if;
  begin insert into legal_consents (user_id, version, source) values (buyer, 'x', 'web'); bad := bad + 1; log := log || ' FAIL direct insert';
  exception when others then ok := ok + 1; end;
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  select count(*) into n from legal_consents where user_id = buyer;
  if n = 0 then ok := ok + 1; else bad := bad + 1; log := log || ' FAIL other user reads'; end if;
  reset role;
  raise exception 'CONSENT: % passed, % failed |%', ok, bad, log;
end $$;
