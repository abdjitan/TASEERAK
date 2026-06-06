-- =====================================================================
-- 010_rfq_targeting.sql
-- Let a contractor target an RFQ at specific supplier types and/or only
-- verified suppliers.
--   target_tiers : array of 'manufacturer' | 'commercial' | 'local'.
--                  NULL / empty  = open to ALL tiers.
--   verified_only: when true, only verified suppliers see/answer the RFQ.
-- Filtering is enforced in the supplier dashboard feed.
-- Idempotent.
-- =====================================================================
alter table public.rfqs
  add column if not exists target_tiers text[];

alter table public.rfqs
  add column if not exists verified_only boolean not null default false;
