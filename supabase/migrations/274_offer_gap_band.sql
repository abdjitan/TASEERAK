-- 274 (round-3 UX-150): a supplier who lost on price sees how far he was from the chosen offer, as a band
-- only (never the winning price). Whole-offer comparison; null for per-item awards or when he did not lose on price.
create or replace function public.my_offer_gap_band(p_offer_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v offers; v_win numeric; v_mine numeric; v_gap numeric;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'offer_not_found'; end if;
  if v.supplier_id is distinct from public.acting_uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v.status::text not in ('rejected', 'expired') then return null; end if;
  if exists (select 1 from rfq_item_awards a where a.rfq_id = v.rfq_id) then return null; end if;
  select min(public.offer_buyer_total(w)) into v_win from offers w
   where w.rfq_id = v.rfq_id and w.id <> v.id and w.status = 'accepted';
  v_mine := public.offer_buyer_total(v);
  if v_win is null or v_win <= 0 or v_mine is null or v_mine <= v_win then return null; end if;
  v_gap := (v_mine - v_win) / v_win;
  return case when v_gap < 0.05 then 'lt5' when v_gap <= 0.10 then 'lt10' else 'gt10' end;
end $$;
revoke all on function public.my_offer_gap_band(uuid) from public, anon;
grant execute on function public.my_offer_gap_band(uuid) to authenticated;
