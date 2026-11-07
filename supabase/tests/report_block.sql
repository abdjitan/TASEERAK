-- report / block (migration 201): run as the real test accounts, always rolled back.
-- Output: the error text is the report («RB: n passed, m failed»).
begin;
do $$
declare
  buyer uuid := 'edc9cbfe-05b0-4805-9c42-037bfc6b7e79';
  sup   uuid := '61e3c9b0-1507-46eb-8c55-9eddc8f78da5';
  v_conv uuid; v_msg uuid; v_rep uuid; ok int := 0; bad int := 0; st jsonb; r text := '';
begin
  select id into v_conv from conversations where contractor_id = buyer and supplier_id = sup limit 1;
  if v_conv is null then
    insert into conversations (contractor_id, supplier_id) values (buyer, sup) returning id into v_conv;
  end if;
  insert into messages (conversation_id, sender_id, body) values (v_conv, sup, 'رسالة اختبار') returning id into v_msg;

  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- report
  v_rep := public.report_user(sup, v_conv, 'spam', v_msg, 'اختبار');
  if v_rep is not null then ok := ok + 1; else bad := bad + 1; r := r || ' report'; end if;
  -- cannot report a message the other side did not send
  begin perform public.report_user(sup, v_conv, 'spam', gen_random_uuid()); bad := bad + 1; r := r || ' fake-msg';
  exception when others then ok := ok + 1; end;
  -- block
  perform public.block_user(sup);
  st := public.conversation_block_state(v_conv);
  if (st->>'i_blocked')::boolean then ok := ok + 1; else bad := bad + 1; r := r || ' state'; end if;
  -- buyer cannot message either
  begin perform public.send_message(v_conv, 'hi'); bad := bad + 1; r := r || ' buyer-sent';
  exception when others then ok := ok + 1; end;
  -- reports are not readable by another non-admin; user_blocks not writable directly
  begin insert into user_blocks values (buyer, sup); bad := bad + 1; r := r || ' direct-insert';
  exception when others then ok := ok + 1; end;

  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  st := public.conversation_block_state(v_conv);
  if (st->>'blocked_me')::boolean then ok := ok + 1; else bad := bad + 1; r := r || ' blocked_me'; end if;
  begin perform public.send_message(v_conv, 'hello'); bad := bad + 1; r := r || ' sup-sent';
  exception when others then ok := ok + 1; end;
  if (select count(*) from user_reports where id = v_rep) = 0 then ok := ok + 1; else bad := bad + 1; r := r || ' sup-reads-report'; end if;
  begin perform public.admin_review_report(v_rep, 'dismissed'); bad := bad + 1; r := r || ' non-admin-review';
  exception when others then ok := ok + 1; end;

  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  perform public.unblock_user(sup);
  st := public.conversation_block_state(v_conv);
  if not (st->>'i_blocked')::boolean then ok := ok + 1; else bad := bad + 1; r := r || ' unblock'; end if;
  reset role;
  raise exception 'RB: % passed, % failed%', ok, bad, r;
end $$;
rollback;
