-- Server-side enforcement of the pricing deadline: reject any new offer on an
-- RFQ that is closed/cancelled or past its expires_at. This can't be bypassed
-- by calling the REST API directly (unlike the client-side guard). The RFQ
-- status is intentionally NOT auto-expired, so the contractor can still award
-- an offer that arrived before the deadline.
create or replace function public.reject_offer_after_deadline()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_exp timestamptz;
  v_status rfq_status;
begin
  select expires_at, status into v_exp, v_status from rfqs where id = new.rfq_id;
  if v_status is distinct from 'open' then
    raise exception 'RFQ is not open for offers';
  end if;
  if v_exp is not null and v_exp < now() then
    raise exception 'Pricing deadline has passed for this RFQ';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reject_offer_after_deadline on public.offers;
create trigger trg_reject_offer_after_deadline
  before insert on public.offers
  for each row execute function public.reject_offer_after_deadline();
