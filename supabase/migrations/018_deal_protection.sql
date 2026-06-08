-- Payment-protection Level 1: a timestamped evidence trail on the accepted offer
-- (the "order"). The platform documents the deal — it never holds funds.
alter table public.offers
  add column if not exists supplier_delivered_at timestamptz,
  add column if not exists received_at timestamptz,          -- contractor's digital receipt (محضر استلام)
  add column if not exists received_by uuid,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_marked_at timestamptz,        -- contractor marked paid
  add column if not exists payment_confirmed_at timestamptz,  -- supplier confirmed received
  add column if not exists dispute_status text,               -- null | 'open' | 'resolved'
  add column if not exists dispute_reason text,
  add column if not exists dispute_by uuid,
  add column if not exists dispute_opened_at timestamptz,
  add column if not exists dispute_resolution text,
  add column if not exists dispute_resolved_at timestamptz;

do $$ begin
  alter table public.offers add constraint offers_payment_status_chk
    check (payment_status in ('unpaid','partial','paid'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.offers add constraint offers_dispute_status_chk
    check (dispute_status is null or dispute_status in ('open','resolved'));
exception when duplicate_object then null; end $$;

create index if not exists offers_dispute_idx on public.offers (dispute_status) where dispute_status = 'open';

-- Note: the existing offers UPDATE policy already allows the supplier, the RFQ's
-- contractor, and admins to update the row — so both parties can confirm their
-- steps and admins can resolve disputes. No new policy needed.
