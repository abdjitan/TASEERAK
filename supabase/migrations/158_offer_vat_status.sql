-- 158: the seller's VAT situation on each offer (owner question 2026-10-17, Saudi VAT rules).
-- A seller that is not VAT-registered must not show or charge VAT; their price is the final price.
-- An independent seller who buys from a registered shop/factory may pass on that shop's tax invoice
-- (issued in the buyer's name), so the price includes VAT but no breakdown comes from the seller.
--   registered        → the seller is VAT-registered (vat_included says how the price was typed)
--   not_registered    → final price, no VAT on any document from the platform
--   supplier_invoice  → price includes VAT; the tax invoice comes from the original shop/factory
-- NULL = offers sent before this column (treated as registered, as before).
alter table public.offers
  add column if not exists vat_status text
  check (vat_status in ('registered', 'not_registered', 'supplier_invoice'));

comment on column public.offers.vat_status is
  'Seller VAT situation: registered | not_registered (final price, no VAT) | supplier_invoice (VAT invoice from the original shop). NULL = legacy, treated as registered.';
