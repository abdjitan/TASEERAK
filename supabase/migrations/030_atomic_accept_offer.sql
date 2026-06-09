-- SECURITY FIX #5: accepting an offer did 3 separate client updates (accept one,
-- reject others, close RFQ) — a partial failure or concurrent accept could leave
-- two accepted offers or an open RFQ with an accepted offer. This RPC does it
-- atomically in one transaction, authorizes the caller (RFQ owner or admin), and
-- the `where status='pending'` guard + row lock prevents double-accept.
create or replace function public.accept_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_rfq uuid; v_caller uuid := auth.uid();
begin
  select rfq_id into v_rfq from public.offers where id = p_offer_id for update;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if not is_admin() and not exists (select 1 from public.rfqs where id = v_rfq and contractor_id = v_caller) then
    raise exception 'forbidden';
  end if;
  update public.offers set status = 'accepted', accepted_at = now() where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  update public.offers set status = 'rejected' where rfq_id = v_rfq and id <> p_offer_id and status = 'pending';
  update public.rfqs set status = 'closed' where id = v_rfq;
end; $$;
grant execute on function public.accept_offer(uuid) to authenticated;
