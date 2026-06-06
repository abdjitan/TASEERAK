-- =============================================
-- 004 — RLS SECURITY HARDENING (profiles)
--
-- PROBLEM: policy "Verified suppliers are public" let ANY logged-in
-- user read EVERY column (phone, commercial registration, GPS, cr_data)
-- of every verified supplier.
--
-- FIX: profiles are now visible only to:
--   1. the owner (already covered by "Users can view own profile")
--   2. admins
--   3. a counterparty you actually transact with (an offer exists
--      between you), so the contractor still sees the supplier's
--      contact details on offers and the PO — and vice versa
--   4. people you share a conversation with
--
-- This ONLY changes profiles SELECT policies. It does NOT touch
-- offers / rfqs policies, so accept / reject keep working exactly
-- as they do now.
--
-- Run in Supabase → SQL Editor. Safe to re-run (idempotent).
--
-- 🔁 ROLLBACK (if anything stops loading, run this one line):
--   create policy "Verified suppliers are public" on profiles
--     for select using (role = 'supplier' and verification_status = 'verified');
-- =============================================

-- helper: is the current user an admin?
-- SECURITY DEFINER so it bypasses RLS inside the function (prevents recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- remove the over-permissive policy
drop policy if exists "Verified suppliers are public" on profiles;

-- 1) admins see everything
drop policy if exists "Admins view all profiles" on profiles;
create policy "Admins view all profiles"
  on profiles for select
  using (public.is_admin());

-- 2) counterparties (linked by an offer) can see each other
drop policy if exists "View counterparties via offers" on profiles;
create policy "View counterparties via offers"
  on profiles for select
  using (
    exists (
      select 1
      from offers o
      join rfqs r on r.id = o.rfq_id
      where (o.supplier_id = profiles.id and r.contractor_id = auth.uid())
         or (r.contractor_id = profiles.id and o.supplier_id = auth.uid())
    )
  );

-- 3) conversation participants can see each other
drop policy if exists "View conversation participants" on profiles;
create policy "View conversation participants"
  on profiles for select
  using (
    exists (
      select 1
      from conversations c
      where (c.contractor_id = profiles.id and c.supplier_id = auth.uid())
         or (c.supplier_id = profiles.id and c.contractor_id = auth.uid())
    )
  );

-- =============================================
-- REVIEWS policies (table had RLS enabled but no policy → all denied)
-- =============================================
alter table reviews enable row level security;

-- a reviewer manages only their own review
drop policy if exists "Users manage own reviews" on reviews;
create policy "Users manage own reviews"
  on reviews for all
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

-- ratings are public (so supplier ratings can be shown)
drop policy if exists "Everyone reads reviews" on reviews;
create policy "Everyone reads reviews"
  on reviews for select
  using (true);
