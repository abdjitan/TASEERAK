-- 125: Verification is optional (owner decision), so quoting must not require it.
--
-- Before: only CR-verified suppliers or a WhatsApp-verified phone could quote. Phone OTP is not
-- live yet, so no new supplier could quote at all, and independent sellers (no CR) never could.
-- Now a supplier (or team member) may quote when the company account is verified, OR a phone is
-- verified, OR the user's email is confirmed and the company profile is complete (region + at
-- least one sector). Buyers still see the real verification state on every offer.
-- Unverified accounts are limited to 20 offers per hour against spam.

create or replace function public.can_submit_quote()
returns boolean language sql stable security definer set search_path = public as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = public.acting_uid() and p.role = 'supplier' and p.is_active is not false
      and (p.verification_status = 'verified'
           or coalesce(p.cr_verification_source, '') = 'wathq'
           or exists (select 1 from auth.users u where u.id in (p.id, auth.uid()) and u.phone_confirmed_at is not null)
           or (exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)
               and coalesce(p.region, '') <> ''
               and exists (select 1 from public.profile_sectors ps where ps.profile_id = p.id)))
  );
$function$;

create or replace function public.limit_unverified_offers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if exists (select 1 from profiles p where p.id = new.supplier_id
               and (p.verification_status = 'verified' or coalesce(p.cr_verification_source, '') = 'wathq')) then
    return new;
  end if;
  if (select count(*) from offers o where o.supplier_id = new.supplier_id and o.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'offer_rate_limited';
  end if;
  return new;
end $$;

drop trigger if exists trg_limit_unverified_offers on public.offers;
create trigger trg_limit_unverified_offers before insert on public.offers
  for each row execute function public.limit_unverified_offers();
