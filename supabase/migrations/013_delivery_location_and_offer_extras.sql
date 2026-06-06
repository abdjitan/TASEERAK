-- =====================================================================
-- 013_delivery_location_and_offer_extras.sql
--   rfqs.delivery_location : detailed delivery address/area the contractor
--     must provide when delivery is required, so suppliers can price shipping.
--   offers.extra_charges   : optional itemized add-ons on the supplier offer
--     (delivery, installation, fees) as [{label, amount}]. total_price is the
--     grand total (goods + extras); unit_price stays the goods unit price.
-- =====================================================================
alter table public.rfqs   add column if not exists delivery_location text;
alter table public.offers add column if not exists extra_charges jsonb;
