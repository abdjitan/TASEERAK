-- 282 (owner 2026-11-24): while the SMS provider is down, a user whose EMAIL is verified may act without a
-- verified mobile. Switched by the admin (admin_set_sms_down) or by the lead; off by default.
-- phone_verify_required() becomes caller-aware, so every existing check (middleware, VerifyGate, verify page,
-- require_verified_phone) follows it with no client change.
alter table public.notify_config add column if not exists sms_down boolean not null default false;

create or replace function public.phone_verify_required()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select c.phone_verify_required
                          and not (c.sms_down and exists (select 1 from profiles p
                                                           where p.id = auth.uid() and p.email_verified_at is not null))
                     from notify_config c where c.id = true), false)
$$;

create or replace function public.sms_is_down()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select sms_down from notify_config where id = true), false)
$$;
grant execute on function public.sms_is_down() to anon, authenticated;

create or replace function public.admin_set_sms_down(p_down boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update notify_config set sms_down = coalesce(p_down, false) where id = true;
  return coalesce(p_down, false);
end $$;
revoke all on function public.admin_set_sms_down(boolean) from public, anon;
grant execute on function public.admin_set_sms_down(boolean) to authenticated;
