-- 200: sending supplier invitations from the Taseerak Cloud API number (template supplier_invite).
-- Legal rules (2026-11-03) enforced here, not only in the edge function:
--   * invite_suppression: permanent; every opt-out / decline lands here (trigger) and survives
--     deleting the chat. Checked before every send.
--   * one message per contact: a number that was ever sent an invitation is never sent another.
--   * at most 50 invitations per Riyadh calendar day (advisory-locked count).
-- Only the edge function `whatsapp-invite-send` (service role) reserves and records sends; admins read.

create table if not exists public.invite_suppression (
  phone      text primary key,           -- E.164 digits, no '+'
  reason     text not null default 'opt_out',
  created_at timestamptz not null default now()
);

create table if not exists public.invite_sends (
  id            bigint generated always as identity primary key,
  phone         text not null,
  shop_name     text,
  lang          text not null default 'ar' check (lang in ('ar', 'en', 'ur')),
  template      text not null default 'supplier_invite',
  status        text not null default 'reserved' check (status in ('reserved', 'sent', 'failed')),
  wa_message_id text,
  error         text,
  sent_by       uuid,
  created_at    timestamptz not null default now()
);
-- One invitation per number, ever (a failed attempt frees the number again).
create unique index if not exists invite_sends_one_per_phone on public.invite_sends (phone) where status <> 'failed';
create index if not exists invite_sends_created on public.invite_sends (created_at);

alter table public.invite_suppression enable row level security;
alter table public.invite_sends enable row level security;
drop policy if exists invite_suppression_admin_read on public.invite_suppression;
create policy invite_suppression_admin_read on public.invite_suppression for select to authenticated using (public.is_admin());
drop policy if exists invite_sends_admin_read on public.invite_sends;
create policy invite_sends_admin_read on public.invite_sends for select to authenticated using (public.is_admin());
revoke all on public.invite_suppression, public.invite_sends from anon;

-- A declined / opted-out chat is suppressed forever.
create or replace function public.invite_suppress_on_decline()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage = 'declined' and (tg_op = 'INSERT' or old.stage is distinct from 'declined') then
    insert into public.invite_suppression (phone, reason) values (new.phone, 'declined') on conflict (phone) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.invite_suppress_on_decline() from public, anon, authenticated;
drop trigger if exists invite_chats_suppress on public.invite_chats;
create trigger invite_chats_suppress after insert or update of stage on public.invite_chats
  for each row execute function public.invite_suppress_on_decline();

-- Reserve one send. Returns the send id, or raises with a reason the function reports per row:
-- 'suppressed', 'already_invited', 'daily_cap'. p_check_only = true: the same checks, nothing written
-- (dry run).
create or replace function public.invite_reserve_send(p_phone text, p_shop text, p_lang text, p_by uuid, p_check_only boolean default false, p_daily_cap int default 50)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh');
  v_today int;
  v_id bigint;
begin
  if p_phone !~ '^9665[0-9]{8}$' then raise exception 'bad_phone'; end if;
  perform pg_advisory_xact_lock(hashtext('invite_reserve_send'));
  if exists (select 1 from invite_suppression where phone = p_phone) then raise exception 'suppressed'; end if;
  if exists (select 1 from invite_sends where phone = p_phone and status <> 'failed') then raise exception 'already_invited'; end if;
  select count(*) into v_today from invite_sends where created_at >= v_day_start and status <> 'failed';
  if v_today >= least(p_daily_cap, 50) then raise exception 'daily_cap'; end if;
  if p_check_only then return 0; end if;
  insert into invite_sends (phone, shop_name, lang, sent_by) values (p_phone, p_shop, coalesce(p_lang, 'ar'), p_by) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.invite_reserve_send(text, text, text, uuid, boolean, int) from public, anon, authenticated;
grant execute on function public.invite_reserve_send(text, text, text, uuid, boolean, int) to service_role;
