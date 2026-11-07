-- 201: report a user and block a user from a conversation (Google Play User Generated Content
-- policy, mobile request R22). A block works both ways: neither side can message the other or open
-- a new conversation while it stands. Reports land in the admin review queue and notify admins.

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked on public.user_blocks (blocked_id);

create table if not exists public.user_reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  reported_id     uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id      uuid references public.messages(id) on delete set null,
  reason          text not null check (reason in ('spam', 'abuse', 'fraud', 'inappropriate', 'other')),
  details         text check (char_length(details) <= 1000),
  message_body    text,                         -- copy of the reported message at report time
  status          text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  admin_note      text,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists user_reports_status on public.user_reports (status, created_at desc);
create index if not exists user_reports_reported on public.user_reports (reported_id);

alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;
drop policy if exists user_blocks_own_read on public.user_blocks;
create policy user_blocks_own_read on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
drop policy if exists user_reports_read on public.user_reports;
create policy user_reports_read on public.user_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
revoke all on public.user_blocks, public.user_reports from anon;
revoke insert, update, delete on public.user_blocks, public.user_reports from authenticated;

-- true when either user blocked the other
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- The other party of a conversation the caller belongs to (null when the caller is not in it).
create or replace function public._conversation_other(p_conversation uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when c.contractor_id = auth.uid() then c.supplier_id
              when c.supplier_id = auth.uid() then c.contractor_id end
  from conversations c where c.id = p_conversation
$$;
revoke all on function public._conversation_other(uuid) from public, anon, authenticated;

create or replace function public.block_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'Invalid user'; end if;
  -- only someone the caller has a conversation with
  if not exists (select 1 from conversations where (contractor_id = auth.uid() and supplier_id = p_user)
                                              or (supplier_id = auth.uid() and contractor_id = p_user)) then
    raise exception 'Not authorized';
  end if;
  insert into user_blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
end $$;

create or replace function public.unblock_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  delete from user_blocks where blocker_id = auth.uid() and blocked_id = p_user;
end $$;

-- Block state of a conversation for the caller: {i_blocked, blocked_me, other_id}
create or replace function public.conversation_block_state(p_conversation uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_other uuid := public._conversation_other(p_conversation);
begin
  if v_other is null then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'other_id', v_other,
    'i_blocked', exists (select 1 from user_blocks where blocker_id = auth.uid() and blocked_id = v_other),
    'blocked_me', exists (select 1 from user_blocks where blocker_id = v_other and blocked_id = auth.uid()));
end $$;

create or replace function public.report_user(p_user uuid, p_conversation uuid, p_reason text,
                                              p_message_id uuid default null, p_details text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_body text;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'Invalid user'; end if;
  if public._conversation_other(p_conversation) is distinct from p_user then raise exception 'Not authorized'; end if;
  if p_reason not in ('spam', 'abuse', 'fraud', 'inappropriate', 'other') then raise exception 'Invalid reason'; end if;
  if (select count(*) from user_reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'لقد تجاوزت الحد اليومي للبلاغات. حاول غداً.';
  end if;
  if p_message_id is not null then
    select body into v_body from messages where id = p_message_id and conversation_id = p_conversation and sender_id = p_user;
    if v_body is null then raise exception 'Invalid message'; end if;
  end if;
  insert into user_reports (reporter_id, reported_id, conversation_id, message_id, reason, details, message_body)
  values (auth.uid(), p_user, p_conversation, p_message_id, p_reason, nullif(left(btrim(coalesce(p_details, '')), 1000), ''), v_body)
  returning id into v_id;
  insert into notifications (user_id, type, title, body, data)
  select a.id, 'announcement'::notification_type, 'بلاغ جديد عن مستخدم',
         'سبب البلاغ: ' || case p_reason when 'spam' then 'رسائل مزعجة' when 'abuse' then 'إساءة أو تحرش'
           when 'fraud' then 'احتيال' when 'inappropriate' then 'محتوى غير لائق' else 'أخرى' end,
         jsonb_build_object('url', '/admin/reports', 'report_id', v_id)
  from profiles a where a.role::text = 'admin';
  return v_id;
end $$;

-- Admin review: status actioned / dismissed (+ note)
create or replace function public.admin_review_report(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_status not in ('open', 'actioned', 'dismissed') then raise exception 'Invalid status'; end if;
  update user_reports set status = p_status, admin_note = nullif(btrim(coalesce(p_note, '')), ''),
         reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
end $$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid), public.conversation_block_state(uuid),
  public.report_user(uuid, uuid, text, uuid, text), public.admin_review_report(uuid, text, text) from public, anon;
grant execute on function public.block_user(uuid), public.unblock_user(uuid), public.conversation_block_state(uuid),
  public.report_user(uuid, uuid, text, uuid, text), public.admin_review_report(uuid, text, text) to authenticated;

-- send_message: refuse when either side blocked the other (rest unchanged from the live definition)
create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $function$
declare v_c record; v_other uuid; v_id uuid; v_sender_name text; v_awarded boolean; v_count int;
begin
  select * into v_c from conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'Conversation not found'; end if;
  if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_body),'') = '' then raise exception 'Empty message'; end if;
  v_other := case when auth.uid() = v_c.contractor_id then v_c.supplier_id else v_c.contractor_id end;
  if public.is_blocked_between(auth.uid(), v_other) then
    raise exception 'لا يمكن إرسال الرسالة: المحادثة محظورة.';
  end if;
  v_awarded := exists (
    select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted'
  );
  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = p_conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل اختيار العرض (20 رسالة). يكتمل التواصل بعد اختيار العرض.';
    end if;
    p_body := public.mask_contact_digits(p_body);
  end if;
  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update conversations set last_message = left(btrim(p_body), 140), last_message_at = now() where id = p_conversation_id;
  if auth.uid() = v_c.contractor_id and not v_awarded then
    v_sender_name := 'مشترٍ';
  else
    select coalesce(nullif(btrim(company_name_ar), ''), 'مستخدم') into v_sender_name from profiles where id = auth.uid();
  end if;
  insert into notifications (user_id, type, title, body, data)
  values (v_other, 'new_message', 'رسالة جديدة من ' || v_sender_name, left(btrim(p_body), 80),
          jsonb_build_object('url', '/messages?c=' || p_conversation_id::text, 'conversation_id', p_conversation_id));
  return v_id;
end $function$;

-- get_or_create_conversation: no new conversation between blocked users
create or replace function public.get_or_create_conversation(p_rfq_id uuid, p_supplier_id uuid)
returns uuid language plpgsql security definer set search_path = public as $function$
declare v_contractor uuid; v_status text; v_id uuid; v_uid uuid := auth.uid();
begin
  select contractor_id, status::text into v_contractor, v_status from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_uid is null or (v_uid <> v_contractor and p_supplier_id is distinct from v_uid
                       and p_supplier_id is distinct from public.acting_uid()) then
    raise exception 'Not authorized';
  end if;
  select id into v_id from conversations where rfq_id = p_rfq_id and contractor_id = v_contractor and supplier_id = p_supplier_id;
  if v_id is not null then return v_id; end if;
  if public.is_blocked_between(v_contractor, p_supplier_id) then
    raise exception 'لا يمكن بدء المحادثة: أحد الطرفين حظر الآخر.';
  end if;
  if v_uid = v_contractor then
    if not exists (select 1 from offers where rfq_id = p_rfq_id and supplier_id = p_supplier_id) then
      raise exception 'Not authorized';
    end if;
  else
    if not (public.supplier_offered_on(p_rfq_id)
            or (v_status = 'open' and public.get_rfq_for_viewer(p_rfq_id) is not null)) then
      raise exception 'Not authorized';
    end if;
  end if;
  insert into conversations (rfq_id, contractor_id, supplier_id) values (p_rfq_id, v_contractor, p_supplier_id) returning id into v_id;
  return v_id;
end $function$;
