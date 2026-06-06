-- =====================================================================
-- 009_rls_lockdown.sql  — CRITICAL SECURITY FIX
-- =====================================================================
-- The initial schema created permissive "USING (true)" policies on every
-- table (so the app would "just work"). Migration 004 ADDED some strict
-- policies on profiles but never REMOVED the permissive ones. Because
-- Postgres combines policies with OR, a single "true" policy re-opens the
-- whole table. The net effect: RLS was effectively OFF everywhere —
-- anyone with the public anon key could read every financial offer, read
-- every company's CR/phone, and even overwrite any profile (e.g. make
-- themselves admin/verified).
--
-- This migration removes every "true" policy and replaces it with
-- least-privilege rules. It also:
--   * makes the offer-count trigger SECURITY DEFINER (so it still works
--     once offers/rfqs writes are locked down)
--   * adds get_market_prices() — a SECURITY DEFINER aggregate so the
--     market page keeps showing average prices WITHOUT exposing any
--     individual offer or supplier identity.
--
-- Idempotent: every CREATE is preceded by DROP ... IF EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Offer-count trigger must bypass RLS (supplier inserts an offer ->
--    trigger updates the contractor's rfq.offer_count).
-- ---------------------------------------------------------------------
create or replace function public.update_rfq_offer_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update rfqs set offer_count = (select count(*) from offers where rfq_id = new.rfq_id) where id = new.rfq_id;
  elsif tg_op = 'DELETE' then
    update rfqs set offer_count = (select count(*) from offers where rfq_id = old.rfq_id) where id = old.rfq_id;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. PROFILES
--    read  : any authenticated user (marketplace needs company names)
--    write : own row only; admins may update any (verification approval)
-- ---------------------------------------------------------------------
drop policy if exists "profiles_read"                     on profiles;
drop policy if exists "profiles_update"                   on profiles;
drop policy if exists "profiles_insert"                   on profiles;
drop policy if exists "Admins view all profiles"          on profiles;
drop policy if exists "Verified suppliers are public"     on profiles;
drop policy if exists "View conversation participants"    on profiles;
drop policy if exists "View counterparties via offers"    on profiles;
drop policy if exists "Authenticated read profiles"       on profiles;
drop policy if exists "Admins update all profiles"        on profiles;
-- (kept as-is: "Users update own profile", "Insert own profile")

create policy "Authenticated read profiles" on profiles
  for select using (auth.uid() is not null);

create policy "Admins update all profiles" on profiles
  for update using (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. OFFERS  (the financial bids — most sensitive table)
--    A supplier sees only their own offers.
--    A contractor sees only offers placed on their own RFQs.
-- ---------------------------------------------------------------------
drop policy if exists "offers_select"                     on offers;
drop policy if exists "offers_insert"                     on offers;
drop policy if exists "offers_update"                     on offers;
drop policy if exists "offers_delete"                     on offers;
drop policy if exists "View own or counterparty offers"   on offers;
drop policy if exists "Suppliers create own offers"       on offers;
drop policy if exists "Update own or counterparty offers" on offers;
drop policy if exists "Delete own or counterparty offers" on offers;

create policy "View own or counterparty offers" on offers
  for select using (
    supplier_id = auth.uid()
    or exists (select 1 from rfqs r where r.id = offers.rfq_id and r.contractor_id = auth.uid())
    or public.is_admin()
  );

create policy "Suppliers create own offers" on offers
  for insert with check (supplier_id = auth.uid());

create policy "Update own or counterparty offers" on offers
  for update using (
    supplier_id = auth.uid()
    or exists (select 1 from rfqs r where r.id = offers.rfq_id and r.contractor_id = auth.uid())
    or public.is_admin()
  );

create policy "Delete own or counterparty offers" on offers
  for delete using (
    supplier_id = auth.uid()
    or exists (select 1 from rfqs r where r.id = offers.rfq_id and r.contractor_id = auth.uid())
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- 4. RFQS
--    read  : any authenticated user (suppliers browse to bid; app filters
--            by sector). Closes anonymous scraping.
--    write : contractor owns the RFQ; admins may update.
-- ---------------------------------------------------------------------
drop policy if exists "rfqs_select"                  on rfqs;
drop policy if exists "rfqs_insert"                  on rfqs;
drop policy if exists "rfqs_update"                  on rfqs;
drop policy if exists "Authenticated read rfqs"      on rfqs;
drop policy if exists "Contractors create own rfqs"  on rfqs;
drop policy if exists "Contractors update own rfqs"  on rfqs;

create policy "Authenticated read rfqs" on rfqs
  for select using (auth.uid() is not null);

create policy "Contractors create own rfqs" on rfqs
  for insert with check (contractor_id = auth.uid());

create policy "Contractors update own rfqs" on rfqs
  for update using (contractor_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 5. PROJECT RFQS  (contractor's uploaded BOQ project — owner only)
-- ---------------------------------------------------------------------
drop policy if exists "project_rfqs_all"                       on project_rfqs;
drop policy if exists "Contractors manage own project_rfqs"    on project_rfqs;

create policy "Contractors manage own project_rfqs" on project_rfqs
  for all
  using (contractor_id = auth.uid() or public.is_admin())
  with check (contractor_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. PROJECT RFQ ITEMS  (line items of a project — owner of parent only)
-- ---------------------------------------------------------------------
drop policy if exists "project_rfq_items_all"                      on project_rfq_items;
drop policy if exists "Contractors manage own project_rfq_items"   on project_rfq_items;

create policy "Contractors manage own project_rfq_items" on project_rfq_items
  for all
  using (
    exists (
      select 1 from project_rfqs p
      where p.id = project_rfq_items.project_rfq_id
        and (p.contractor_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from project_rfqs p
      where p.id = project_rfq_items.project_rfq_id
        and p.contractor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 7. RFQ DISMISSALS  (supplier hides RFQs from their feed — owner only)
-- ---------------------------------------------------------------------
drop policy if exists "rfq_dismissals_all"                  on rfq_dismissals;
drop policy if exists "Suppliers manage own dismissals"     on rfq_dismissals;

create policy "Suppliers manage own dismissals" on rfq_dismissals
  for all
  using (supplier_id = auth.uid())
  with check (supplier_id = auth.uid());

-- ---------------------------------------------------------------------
-- 8. CONVERSATIONS  (chat — the two participants only)
-- ---------------------------------------------------------------------
drop policy if exists "conversations_all"                on conversations;
drop policy if exists "Participants manage conversations" on conversations;

create policy "Participants manage conversations" on conversations
  for all
  using (contractor_id = auth.uid() or supplier_id = auth.uid())
  with check (contractor_id = auth.uid() or supplier_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. MESSAGES  (only members of the parent conversation)
-- ---------------------------------------------------------------------
drop policy if exists "messages_all"                 on messages;
drop policy if exists "Participants read messages"   on messages;
drop policy if exists "Participants send messages"   on messages;
drop policy if exists "Participants update messages" on messages;

create policy "Participants read messages" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.contractor_id = auth.uid() or c.supplier_id = auth.uid())
    )
  );

create policy "Participants send messages" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.contractor_id = auth.uid() or c.supplier_id = auth.uid())
    )
  );

create policy "Participants update messages" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.contractor_id = auth.uid() or c.supplier_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 10. NOTIFICATIONS
--     read/update/delete : only your own.
--     insert : any authenticated user (so server code/triggers that
--              notify a counterparty keep working). Real notifications
--              are created by SECURITY DEFINER triggers anyway.
-- ---------------------------------------------------------------------
drop policy if exists "notifications_all"               on notifications;
drop policy if exists "Users read own notifications"    on notifications;
drop policy if exists "Users update own notifications"  on notifications;
drop policy if exists "Users delete own notifications"  on notifications;
drop policy if exists "Authenticated create notifications" on notifications;

create policy "Users read own notifications" on notifications
  for select using (user_id = auth.uid());

create policy "Users update own notifications" on notifications
  for update using (user_id = auth.uid());

create policy "Users delete own notifications" on notifications
  for delete using (user_id = auth.uid());

create policy "Authenticated create notifications" on notifications
  for insert with check (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 11. LIVE PRICES  (price ticker)
--     read  : any authenticated user.
--     write : the supplier who owns the row.
-- ---------------------------------------------------------------------
drop policy if exists "live_prices_manage"               on live_prices;
drop policy if exists "live_prices_select"               on live_prices;
drop policy if exists "Authenticated read live_prices"   on live_prices;
drop policy if exists "Suppliers manage own live_prices" on live_prices;

create policy "Authenticated read live_prices" on live_prices
  for select using (auth.uid() is not null);

create policy "Suppliers manage own live_prices" on live_prices
  for all
  using (supplier_id = auth.uid())
  with check (supplier_id = auth.uid());

-- ---------------------------------------------------------------------
-- 12. PRODUCTS  (supplier catalog)
--     read  : any authenticated user (buyers browse).
--     write : the supplier who owns the product.
-- ---------------------------------------------------------------------
drop policy if exists "products_select"               on products;
drop policy if exists "products_insert"               on products;
drop policy if exists "products_update"               on products;
drop policy if exists "Authenticated read products"   on products;
drop policy if exists "Suppliers manage own products" on products;

create policy "Authenticated read products" on products
  for select using (auth.uid() is not null);

create policy "Suppliers manage own products" on products
  for all
  using (supplier_id = auth.uid())
  with check (supplier_id = auth.uid());

-- ---------------------------------------------------------------------
-- 13. PROFILE SECTORS / SPECIALTIES  (used for matching)
--     read  : any authenticated user.
--     write : the profile owner.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_sectors_select"             on profile_sectors;
drop policy if exists "profiles_sectors_insert"             on profile_sectors;
drop policy if exists "Authenticated read profile_sectors"  on profile_sectors;
drop policy if exists "Users manage own profile_sectors"    on profile_sectors;

create policy "Authenticated read profile_sectors" on profile_sectors
  for select using (auth.uid() is not null);

create policy "Users manage own profile_sectors" on profile_sectors
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "profile_specialties_all"                on profile_specialties;
drop policy if exists "Authenticated read profile_specialties" on profile_specialties;
drop policy if exists "Users manage own profile_specialties"   on profile_specialties;

create policy "Authenticated read profile_specialties" on profile_specialties
  for select using (auth.uid() is not null);

create policy "Users manage own profile_specialties" on profile_specialties
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- 14. REVIEWS
--     read  : any authenticated user (public ratings).
--     write : the reviewer only (kept from migration 004).
-- ---------------------------------------------------------------------
drop policy if exists "reviews_all"                  on reviews;
drop policy if exists "Everyone reads reviews"       on reviews;
drop policy if exists "Authenticated read reviews"   on reviews;
-- (kept: "Users manage own reviews")

create policy "Authenticated read reviews" on reviews
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 15. MARKET PRICES  — SECURITY DEFINER aggregate
--     Returns ONLY averages/min/max/count per product+sector across all
--     non-rejected offers. Exposes no individual offer and no supplier
--     identity, so the market page works without opening up the offers
--     table.
-- ---------------------------------------------------------------------
create or replace function public.get_market_prices()
returns table (
  product_name text,
  sector       text,
  unit         text,
  avg_price    numeric,
  min_price    numeric,
  max_price    numeric,
  offer_count  bigint
)
language sql
security definer
set search_path = public
as $$
  select
    r.product_name,
    r.sector::text                 as sector,
    max(r.unit)                    as unit,
    round(avg(o.unit_price))       as avg_price,
    min(o.unit_price)              as min_price,
    max(o.unit_price)              as max_price,
    count(*)                       as offer_count
  from offers o
  join rfqs r on r.id = o.rfq_id
  where o.status <> 'rejected'
    and o.unit_price is not null
  group by r.product_name, r.sector
  having count(*) >= 1;
$$;

revoke all     on function public.get_market_prices() from public;
grant  execute on function public.get_market_prices() to authenticated;
