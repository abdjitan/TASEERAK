-- Anonymized competitive landscape for an RFQ: lets a supplier see the spread
-- of current offer totals (no identities) and where their price would rank.
-- Only totals + delivery + an is-mine flag are returned — never supplier ids.
create or replace function public.get_rfq_offer_ranking(p_rfq_id uuid)
returns table(total_price numeric, delivery_days int, is_mine boolean)
language sql
security definer
set search_path to 'public'
as $$
  select o.total_price, o.delivery_days, (o.supplier_id = auth.uid()) as is_mine
  from offers o
  where o.rfq_id = p_rfq_id and o.status <> 'rejected' and o.total_price is not null
  order by o.total_price asc;
$$;

revoke execute on function public.get_rfq_offer_ranking(uuid) from public, anon;
grant execute on function public.get_rfq_offer_ranking(uuid) to authenticated;
