-- From the user-persona review (2026-10-15/17):
-- 1) The public supplier directory listed test accounts («gfgsdfg», «مورد تجريبي»). Accounts can now
--    be flagged as test accounts and are left out of the public leaderboard. Every account that
--    exists today is a test account (owner, 2026-10-17), so all non-admin profiles are flagged.
-- 2) A BOQ upload turns every line into its own request, so an unverified buyer hit the 25-per-day
--    anti-spam cap after line 25. Right after creating a BOQ project the cap covers the whole BOQ.

alter table public.profiles add column if not exists is_test boolean not null default false;
update public.profiles set is_test = true where role::text <> 'admin';

create or replace function public.get_supplier_leaderboard()
 returns table(supplier_id uuid, company_name_ar text, supplier_tier text, rating_avg numeric, region text, city text, approvals text[], verification_status text, total_offers bigint, won_deals bigint, member_since timestamp with time zone, sectors text[])
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p.id, p.company_name_ar, p.supplier_tier::text, p.rating_avg, p.region, p.city, p.approvals, p.verification_status::text,
    (select count(*) from offers o where o.supplier_id = p.id),
    (select count(distinct a.rfq_id) from rfq_item_awards a where a.supplier_id = p.id),
    p.created_at,
    (select coalesce(array_agg(ps.sector::text), '{}') from profile_sectors ps where ps.profile_id = p.id)
  from profiles p
  where p.role = 'supplier'
    and not p.is_test
    and (p.verification_status = 'verified' or exists (select 1 from offers o where o.supplier_id = p.id))
  order by (p.verification_status = 'verified') desc, coalesce(p.rating_avg,0) desc, p.created_at asc;
$function$;

create or replace function public.enforce_rfq_limit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_verified boolean; v_count int; v_cap int := 25;
begin
  select (verification_status = 'verified') into v_verified from public.profiles where id = new.contractor_id;
  if coalesce(v_verified, false) or is_admin() then return new; end if;
  -- a BOQ project created in the last 30 minutes: its lines may all go out (BOQ max is 500 lines)
  if exists (select 1 from public.project_rfqs pr where pr.contractor_id = new.contractor_id and pr.created_at > now() - interval '30 minutes') then
    v_cap := 525;
  end if;
  select count(*) into v_count from public.rfqs where contractor_id = new.contractor_id and created_at > now() - interval '24 hours';
  if v_count >= v_cap then
    raise exception 'rfq_daily_limit' using errcode = 'P0001';
  end if;
  return new;
end; $function$;
