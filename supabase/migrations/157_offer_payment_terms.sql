-- Payment terms on an offer (persona review: requested by the contractor, the distributor and the
-- procurement officer). Optional; shown to the buyer on the offer card, offer page and purchase order.
alter table public.offers add column if not exists payment_terms text
  check (payment_terms is null or payment_terms in ('advance', 'on_delivery', 'net30', 'net60'));
comment on column public.offers.payment_terms is
  'advance = full payment before delivery; on_delivery = cash/transfer on delivery; net30/net60 = credit days after delivery';
