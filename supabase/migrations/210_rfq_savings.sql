-- «وفّرت X ريال» (owner 2026-11-14): what the buyer saved on each awarded item compared with the
-- HIGHEST quote for that item (prices on the buyer-pays basis: a VAT-registered seller's price
-- without VAT gets +15%, as src/lib/vat.ts lineComparable). Items with one quote save 0.

create or replace function public.rfq_item_savings(p_rfq_id uuid)
returns table (item_index int, awarded numeric, highest numeric, lowest numeric, bids int, saved numeric)
language sql stable security definer set search_path = public
as $$
  with allowed as (
    select 1 from rfqs r where r.id = p_rfq_id
      and (r.contractor_id = auth.uid() or public.is_admin() or current_user in ('service_role', 'postgres'))
  ),
  bids as (
    select (e->>'item_index')::int as item_index, o.id as offer_id,
           case when o.vat_status::text = 'not_registered' or coalesce(o.vat_included, false)
                then (e->>'total')::numeric else (e->>'total')::numeric * 1.15 end as total
      from offers o
      cross join lateral jsonb_array_elements(case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end) e
     where o.rfq_id = p_rfq_id and exists (select 1 from allowed)
       and e ? 'item_index' and nullif(e->>'total', '') is not null and (e->>'total')::numeric > 0
  )
  select a.item_index, round(b.total, 2), round(max(x.total), 2), round(min(x.total), 2), count(*)::int,
         round(greatest(max(x.total) - b.total, 0), 2)
    from rfq_item_awards a
    join bids b on b.item_index = a.item_index and b.offer_id = a.offer_id
    join bids x on x.item_index = a.item_index
   where a.rfq_id = p_rfq_id
   group by a.item_index, b.total
   order by a.item_index
$$;

-- the signed-in buyer's total: saved SAR, awarded items, requests with an award
create or replace function public.my_savings()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'saved', coalesce(round(sum(s.saved)), 0),
    'items', count(*),
    'requests', count(distinct r.id),
    'awarded_value', coalesce(round(sum(s.awarded)), 0))
    from rfqs r cross join lateral public.rfq_item_savings(r.id) s
   where r.contractor_id = auth.uid()
$$;

-- admins: marketplace-wide savings (for the owner report)
create or replace function public.admin_savings_summary(p_include_test boolean default false)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'saved', coalesce(round(sum(s.saved)), 0),
    'awarded_value', coalesce(round(sum(s.awarded)), 0),
    'highest_value', coalesce(round(sum(s.highest)), 0),
    'items', count(*),
    'items_multi_bid', count(*) filter (where s.bids >= 2),
    'requests', count(distinct q.id),
    'buyers', count(distinct q.contractor_id),
    'saved_pct', case when sum(s.highest) > 0 then round(100 * sum(s.saved) / sum(s.highest), 1) else null end)
    into r
    from rfqs q
    join profiles p on p.id = q.contractor_id and (p_include_test or not coalesce(p.is_test, false))
    cross join lateral public.rfq_item_savings(q.id) s;
  return r;
end $$;

revoke all on function public.rfq_item_savings(uuid) from public, anon;
revoke all on function public.my_savings() from public, anon;
revoke all on function public.admin_savings_summary(boolean) from public, anon;
grant execute on function public.rfq_item_savings(uuid) to authenticated;
grant execute on function public.my_savings() to authenticated;
grant execute on function public.admin_savings_summary(boolean) to authenticated;
