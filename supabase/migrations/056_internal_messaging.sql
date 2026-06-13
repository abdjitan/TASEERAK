-- Internal messaging: a conversation between the contractor and a supplier,
-- tied to an RFQ. Admins can read all (moderation).
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid references public.rfqs(id) on delete cascade,
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message text,
  unique (rfq_id, contractor_id, supplier_id)
);
create index if not exists idx_conv_contractor on public.conversations(contractor_id, last_message_at desc);
create index if not exists idx_conv_supplier on public.conversations(supplier_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists idx_msg_conv on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conv participants read" on public.conversations;
create policy "conv participants read" on public.conversations for select to authenticated
  using (contractor_id = auth.uid() or supplier_id = auth.uid() or public.is_admin());

drop policy if exists "msg participants read" on public.messages;
create policy "msg participants read" on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id
    and (c.contractor_id = auth.uid() or c.supplier_id = auth.uid() or public.is_admin())));

drop policy if exists "msg participant insert" on public.messages;
create policy "msg participant insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id
    and (c.contractor_id = auth.uid() or c.supplier_id = auth.uid())));

drop policy if exists "msg participant update" on public.messages;
create policy "msg participant update" on public.messages for update to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id
    and (c.contractor_id = auth.uid() or c.supplier_id = auth.uid())));

do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.conversations; exception when duplicate_object then null; end $$;

create or replace function public.get_or_create_conversation(p_rfq_id uuid, p_supplier_id uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_contractor uuid; v_id uuid;
begin
  select contractor_id into v_contractor from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if auth.uid() <> v_contractor and auth.uid() <> p_supplier_id then raise exception 'Not authorized'; end if;
  select id into v_id from conversations where rfq_id = p_rfq_id and contractor_id = v_contractor and supplier_id = p_supplier_id;
  if v_id is null then
    insert into conversations (rfq_id, contractor_id, supplier_id) values (p_rfq_id, v_contractor, p_supplier_id) returning id into v_id;
  end if;
  return v_id;
end; $$;
revoke execute on function public.get_or_create_conversation(uuid, uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_c record; v_other uuid; v_id uuid; v_sender_name text;
begin
  select * into v_c from conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'Conversation not found'; end if;
  if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_body),'') = '' then raise exception 'Empty message'; end if;

  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update conversations set last_message = left(btrim(p_body), 140), last_message_at = now() where id = p_conversation_id;

  v_other := case when auth.uid() = v_c.contractor_id then v_c.supplier_id else v_c.contractor_id end;
  select coalesce(company_name_ar, 'مستخدم') into v_sender_name from profiles where id = auth.uid();
  insert into notifications (user_id, type, title, body, data)
  values (v_other, 'new_message', 'رسالة جديدة من ' || v_sender_name, left(btrim(p_body), 80),
          jsonb_build_object('url', '/messages?c=' || p_conversation_id::text, 'conversation_id', p_conversation_id));
  return v_id;
end; $$;
revoke execute on function public.send_message(uuid, text) from public, anon;
grant execute on function public.send_message(uuid, text) to authenticated;
