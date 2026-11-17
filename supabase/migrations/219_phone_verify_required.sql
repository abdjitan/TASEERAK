-- Phone verification required (owner 2026-11-17, now that Google SMS works): a seller can't send a
-- quote and a buyer can't award/accept a deal until the mobile is verified (SMS code). Browsing,
-- the profile and requests still work. Switch: notify_config.phone_verify_required.
alter table public.notify_config add column if not exists phone_verify_required boolean not null default false;

create or replace function public.phone_verify_required()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select phone_verify_required from notify_config where id = true), false)
$$;
grant execute on function public.phone_verify_required() to authenticated;

-- raise unless the caller's phone is verified (admins / service role pass)
create or replace function public.require_verified_phone()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.phone_verify_required() then return; end if;
  -- (security definer: current_user is the owner here, so the service role is read from the JWT)
  if auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin() then return; end if;
  if not exists (select 1 from profiles where id = auth.uid() and phone_verified_at is not null) then
    raise exception 'وثّق رقم جوالك أولاً من الإعدادات (يصلك رمز برسالة نصية)، ثم أعد المحاولة.' using hint = 'PHONE_NOT_VERIFIED';
  end if;
end $$;
revoke all on function public.require_verified_phone() from public, anon;
grant execute on function public.require_verified_phone() to authenticated;

-- quotes: the person sending it (owner or team member) must be verified
create or replace function public.offers_require_verified_phone()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.require_verified_phone();
  return new;
end $$;
drop trigger if exists aa_offers_verified_phone on public.offers;
create trigger aa_offers_verified_phone before insert on public.offers
  for each row execute function public.offers_require_verified_phone();

-- awards / accept / finalize: the buyer must be verified
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.award_rfq_item'::regproc);
  n := replace(d, 'if v_contractor is distinct from auth.uid() then raise exception ''Not authorized''; end if;',
    'if v_contractor is distinct from auth.uid() then raise exception ''Not authorized''; end if;
  perform public.require_verified_phone();');
  if n = d then raise exception 'award_rfq_item: pattern not found'; end if;
  execute n;

  d := pg_get_functiondef('public.finalize_rfq_awards'::regproc);
  n := replace(d, 'if v_contractor is distinct from auth.uid() then raise exception ''Not authorized''; end if;',
    'if v_contractor is distinct from auth.uid() then raise exception ''Not authorized''; end if;
  perform public.require_verified_phone();');
  if n = d then raise exception 'finalize_rfq_awards: pattern not found'; end if;
  execute n;

  d := pg_get_functiondef('public.accept_offer'::regproc);
  n := replace(d, 'perform public.broker_guard(p_offer_id, (select total_price from public.offers where id = p_offer_id));',
    'perform public.require_verified_phone();
  perform public.broker_guard(p_offer_id, (select total_price from public.offers where id = p_offer_id));');
  if n = d then raise exception 'accept_offer: pattern not found'; end if;
  execute n;
end $$;
