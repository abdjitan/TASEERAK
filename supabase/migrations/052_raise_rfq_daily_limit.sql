-- Raise the anti-spam daily RFQ cap for UNVERIFIED contractors from 5 to 25
-- per 24h (verified contractors and admins remain unlimited).
create or replace function public.enforce_rfq_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_verified boolean; v_count int;
begin
  select (verification_status = 'verified') into v_verified from public.profiles where id = new.contractor_id;
  if coalesce(v_verified, false) or is_admin() then return new; end if;
  select count(*) into v_count from public.rfqs where contractor_id = new.contractor_id and created_at > now() - interval '24 hours';
  if v_count >= 25 then
    raise exception 'rfq_daily_limit' using errcode = 'P0001';
  end if;
  return new;
end; $function$;
