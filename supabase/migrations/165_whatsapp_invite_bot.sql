-- 165: WhatsApp supplier-invite bot (ads & sales). The owner sends invitations by hand from the
-- WhatsApp Business app; the edge function `whatsapp-invite-bot` answers every reply (fixed texts
-- for 2 / 3 / «yes», Claude for the rest when ANTHROPIC_API_KEY is set). Logic and texts live in
-- marketing/supplier-invite/bot/. Written by the edge function with the service role only;
-- admins read them on /admin/invites.

create table if not exists public.invite_chats (
  phone           text primary key,                 -- E.164 digits, no '+'
  shop_name       text,
  lang            text not null default 'ar' check (lang in ('ar', 'en', 'ur')),
  stage           text not null default 'invited' check (stage in ('invited', 'interested', 'declined')),
  invited_at      timestamptz not null default now(),
  last_inbound_at timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists public.invite_messages (
  id               bigint generated always as identity primary key,
  phone            text not null references public.invite_chats(phone) on delete cascade,
  role             text not null check (role in ('shop', 'bot', 'owner')),
  text             text not null default '',
  wa_message_id    text unique,                     -- Meta retries a webhook: never answer twice
  ai_input_tokens  int,
  ai_output_tokens int,
  created_at       timestamptz not null default now()
);
create index if not exists invite_messages_phone_created on public.invite_messages (phone, created_at desc);

alter table public.invite_chats enable row level security;
alter table public.invite_messages enable row level security;

-- No insert/update/delete policies: only the service role (edge function) writes.
drop policy if exists invite_chats_admin_read on public.invite_chats;
create policy invite_chats_admin_read on public.invite_chats for select to authenticated using (public.is_admin());
drop policy if exists invite_messages_admin_read on public.invite_messages;
create policy invite_messages_admin_read on public.invite_messages for select to authenticated using (public.is_admin());

revoke all on public.invite_chats, public.invite_messages from anon;
