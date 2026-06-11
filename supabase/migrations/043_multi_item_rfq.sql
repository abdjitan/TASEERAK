-- Multi-item RFQs: an RFQ can list several materials (same sector), each with
-- its own specs + quantity. Stored as a jsonb array of:
--   { product_name, sub_category, specification, quantity, unit }
-- The scalar product_name / quantity / unit columns keep mirroring the FIRST
-- item, so all existing single-item displays, matching and notifications keep
-- working unchanged (fully backward-compatible).
alter table public.rfqs add column if not exists items jsonb;

-- Offers carry a per-item price breakdown, an array aligned to rfqs.items:
--   { price, available, note }
-- The scalar offers.price keeps holding the TOTAL (sum) for sorting and for
-- legacy single-item offer displays.
alter table public.offers add column if not exists item_prices jsonb;
