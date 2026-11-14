-- Messages people send to the Taseerak WhatsApp number (owner 2026-11-14). wa-webhook stores every
-- inbound message and sends one free welcome reply per number per 24 h (customer-initiated
-- conversations are free). Numbers in invite_chats are left to whatsapp-invite-bot.
create table if not exists public.wa_inbound_messages (
  id            bigserial primary key,
  phone         text not null,
  name          text,
  type          text,
  text          text,
  wa_message_id text unique,
  received_at   timestamptz not null default now()
);
create index if not exists wa_inbound_messages_phone_idx on public.wa_inbound_messages (phone, received_at desc);

create table if not exists public.wa_inbound_contacts (
  phone              text primary key,
  name               text,
  last_message_at    timestamptz,
  last_auto_reply_at timestamptz
);

alter table public.wa_inbound_messages enable row level security;
alter table public.wa_inbound_contacts enable row level security;
revoke all on public.wa_inbound_messages from anon, authenticated;
revoke all on public.wa_inbound_contacts from anon, authenticated;
grant select on public.wa_inbound_messages to authenticated;
grant select on public.wa_inbound_contacts to authenticated;
drop policy if exists "admins read wa inbound" on public.wa_inbound_messages;
create policy "admins read wa inbound" on public.wa_inbound_messages for select to authenticated using ((select public.is_admin()));
drop policy if exists "admins read wa contacts" on public.wa_inbound_contacts;
create policy "admins read wa contacts" on public.wa_inbound_contacts for select to authenticated using ((select public.is_admin()));
