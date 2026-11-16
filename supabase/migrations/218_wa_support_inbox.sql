-- WhatsApp support inbox (owner 2026-11-16): the «الدعم» page links to the Taseerak WhatsApp
-- number. Inbound messages were already stored (209); now admins can answer from /admin/whatsapp
-- (free-form replies are allowed for 24 h after the customer's last message). Replies are stored in
-- the same table with direction = 'out' and the admin who sent them.
alter table public.wa_inbound_messages add column if not exists direction text not null default 'in'
  check (direction in ('in', 'out'));
alter table public.wa_inbound_messages add column if not exists sent_by uuid references public.profiles(id) on delete set null;
alter table public.wa_inbound_contacts add column if not exists unread int not null default 0;
