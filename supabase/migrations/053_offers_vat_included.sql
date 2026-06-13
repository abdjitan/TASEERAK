-- Whether the supplier's entered prices already include 15% VAT. Amounts are
-- stored as entered; this flag tells every view how to split net / VAT / gross.
alter table public.offers add column if not exists vat_included boolean not null default false;
