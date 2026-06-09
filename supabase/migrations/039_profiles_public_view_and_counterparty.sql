-- Safe, public-facing projection of profiles (NO phone/CR/VAT/coords/address).
-- Views run with definer rights by default → they bypass the base-table RLS and
-- expose ONLY these directory-safe columns. Used for browse/listing screens.
create or replace view public.profiles_public as
select id, role, company_name_ar, company_name_en, supplier_tier, contractor_grade,
       rating_avg, rating_count, city, region, district, verification_status,
       cr_verification_source, preferred_language, is_active, subscription_plan, created_at
from public.profiles;

revoke all on public.profiles_public from anon;
grant select on public.profiles_public to authenticated, service_role;

-- Relationship gate for the upcoming base-table SELECT policy: A may read B's full
-- (sensitive) profile only if they're on opposite ends of an offer. SECURITY DEFINER
-- so it can see offers/rfqs without tripping their own RLS.
create or replace function public.is_counterparty(p_profile uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.offers o join public.rfqs r on r.id = o.rfq_id
    where (o.supplier_id = p_profile and r.contractor_id = auth.uid())
       or (o.supplier_id = auth.uid()  and r.contractor_id = p_profile)
  );
$$;
grant execute on function public.is_counterparty(uuid) to authenticated;
