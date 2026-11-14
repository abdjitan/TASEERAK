-- Phone verification (owner 2026-11-14): a user proves the mobile is theirs (SMS code, Google
-- Identity Platform / Firebase) and that it has WhatsApp (our phone_confirmed template is DELIVERED).
--   phone_verified_at     set by /api/phone/confirm (service role) after a valid Firebase ID token
--   whatsapp_verified_at  set by the wa-webhook when the phone_confirmed message is delivered/read
--   wa_check_msg_id / wa_check_status  the confirmation message id and its last status
--                                      ('sent' | 'delivered' | 'read' | 'no_whatsapp' | 'failed')
-- Users can't set these themselves; changing the phone clears both verifications.

alter table public.profiles add column if not exists phone_verified_at timestamptz;
alter table public.profiles add column if not exists whatsapp_verified_at timestamptz;
alter table public.profiles add column if not exists wa_check_msg_id text;
alter table public.profiles add column if not exists wa_check_status text;
create index if not exists profiles_wa_check_msg_idx on public.profiles (wa_check_msg_id) where wa_check_msg_id is not null;

create or replace function public.guard_phone_verification()
returns trigger language plpgsql set search_path = public
as $$
begin
  if current_user = 'service_role' or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.phone_verified_at := null; new.whatsapp_verified_at := null;
    new.wa_check_msg_id := null; new.wa_check_status := null;
    return new;
  end if;
  new.phone_verified_at    := old.phone_verified_at;
  new.whatsapp_verified_at := old.whatsapp_verified_at;
  new.wa_check_msg_id      := old.wa_check_msg_id;
  new.wa_check_status      := old.wa_check_status;
  -- a different number is no longer the verified one
  if regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') is distinct from regexp_replace(coalesce(old.phone, ''), '\D', '', 'g') then
    new.phone_verified_at := null; new.whatsapp_verified_at := null;
    new.wa_check_msg_id := null; new.wa_check_status := null;
  end if;
  return new;
end $$;
drop trigger if exists ab_guard_phone_verification on public.profiles;
create trigger ab_guard_phone_verification before insert or update on public.profiles
  for each row execute function public.guard_phone_verification();
