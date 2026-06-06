-- =====================================================================
-- 014_rfq_nearby_only.sql
-- Let a contractor target only nearby suppliers (same region as the RFQ),
-- for cheaper shipping / faster delivery. Enforced in the supplier feed:
-- when nearby_only is true, only suppliers whose region matches the RFQ
-- region see it.
-- =====================================================================
alter table public.rfqs add column if not exists nearby_only boolean not null default false;
