-- 107: Fix two pre-existing CRITICAL issues found in the session audit (applied live 2026-07-14).
--
-- (A) offers<->rfqs RLS INFINITE RECURSION (42P17): the offers SELECT/UPDATE/DELETE policies
--     referenced rfqs, and the rfqs SELECT policy referenced offers -> mutual re-entry crashed
--     EVERY authenticated read of offers (and any profiles read, via the counterparty clause).
--     This was ALSO the true root cause of "supplier shown the contractor dashboard": the
--     onboarding/middleware profiles read crashed -> role defaulted to contractor.
-- (B) ROLE-COLUMN PRIVESC: profiles self-UPDATE had NULL WITH CHECK and enforce_profile_field_locks
--     did not lock `role`, so a non-admin could UPDATE profiles SET role='admin'.
--
-- FORCE RLS is OFF on these tables, so SECURITY DEFINER helpers bypass RLS and break the cycle.
-- Verified live with impersonation: recursion gone; supplier sees only own offers; contractor
-- sees only their RFQs' offers; role escalation blocked while a legit region update still applies.

create or replace function public.is_rfq_owner(p_rfq_id uuid) returns boolean
  language sql stable security definer set search_path to 'public' as
$$ select exists(select 1 from rfqs r where r.id = p_rfq_id and r.contractor_id = auth.uid()) $$;

create or replace function public.supplier_offered_on(p_rfq_id uuid) returns boolean
  language sql stable security definer set search_path to 'public' as
$$ select exists(select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = auth.uid()) $$;

create or replace function public.shares_deal_with(p_other uuid) returns boolean
  language sql stable security definer set search_path to 'public' as
$$ select exists(
     select 1 from offers o join rfqs r on r.id = o.rfq_id
     where o.status = 'accepted' and (
       (o.supplier_id = p_other and r.contractor_id = auth.uid()) or
       (o.supplier_id = auth.uid() and r.contractor_id = p_other))
   ) or exists(
     select 1 from rfq_item_awards a join rfqs r2 on r2.id = a.rfq_id
     where (a.supplier_id = p_other and r2.contractor_id = auth.uid()) or
           (a.supplier_id = auth.uid() and r2.contractor_id = p_other))
$$;

grant execute on function public.is_rfq_owner(uuid), public.supplier_offered_on(uuid), public.shares_deal_with(uuid) to authenticated, anon;

alter policy "View own or counterparty offers" on public.offers
  using (supplier_id = auth.uid() or public.is_rfq_owner(rfq_id) or public.is_admin());
alter policy "Update own or counterparty offers" on public.offers
  using (supplier_id = auth.uid() or public.is_rfq_owner(rfq_id) or public.is_admin())
  with check (supplier_id = auth.uid() or public.is_rfq_owner(rfq_id) or public.is_admin());
alter policy "Delete own or counterparty offers" on public.offers
  using (supplier_id = auth.uid() or public.is_rfq_owner(rfq_id) or public.is_admin());

alter policy "read rfqs owned or in target scope" on public.rfqs
  using (
    contractor_id = auth.uid() or public.is_admin() or public.supplier_offered_on(id) or
    (
      (coalesce(nearby_only, false) = false or cardinality(served_regions(auth.uid())) = 0 or region = any(served_regions(auth.uid())))
      and (target_regions is null or cardinality(target_regions) = 0 or served_regions(auth.uid()) && target_regions)
    )
  );

alter policy "profiles_select_owner_admin_accepted_counterparty" on public.profiles
  using (auth.uid() = id or public.is_admin() or public.shares_deal_with(id));

create or replace function public.enforce_profile_field_locks() returns trigger
  language plpgsql set search_path to 'public' as
$$
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  new.role := old.role;   -- privesc lock: a non-admin can never change their role
  new.id   := old.id;
  if old.company_name_ar  is not null then new.company_name_ar  := old.company_name_ar;  end if;
  if old.company_name_en  is not null then new.company_name_en  := old.company_name_en;  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  return new;
end; $$;
