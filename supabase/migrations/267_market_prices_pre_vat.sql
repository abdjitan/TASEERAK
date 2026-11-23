-- 267 (round-2 UX-080): the market average mixed prices entered with and without VAT, grouped units
-- together and could rest on one busy supplier. Now: every unit price before VAT (a registered seller who
-- entered VAT-inclusive prices is divided by 1.15; a seller without a VAT number is taken as is), grouped by
-- product + unit, shown only with 3+ DIFFERENT suppliers; supplier_count is returned (the web reads it).
drop function if exists public.get_market_prices();
create or replace function public.get_market_prices()
returns table(product_name text, sector text, unit text, avg_price numeric, min_price numeric, max_price numeric, offer_count bigint, supplier_count bigint)
language sql stable security definer set search_path = public as $$
  with single as (
    select r.product_name, r.sector::text as sector, r.unit as unit, o.supplier_id,
           o.unit_price / case when coalesce(o.vat_status, 'registered') <> 'not_registered' and o.vat_included then 1.15 else 1 end as unit_price
    from offers o join rfqs r on r.id = o.rfq_id
    where o.status = 'accepted' and o.unit_price is not null and o.unit_price > 0
      and not (jsonb_typeof(o.item_prices) = 'array' and jsonb_array_length(o.item_prices) > 0)
  ),
  multi as (
    select it->>'product_name' as product_name,
           coalesce(it->>'sector', r.sector::text) as sector,
           it->>'unit' as unit, o.supplier_id,
           (it->>'unit_price')::numeric / case when coalesce(o.vat_status, 'registered') <> 'not_registered' and o.vat_included then 1.15 else 1 end as unit_price
    from offers o join rfqs r on r.id = o.rfq_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) as it
    where o.status = 'accepted'
      and jsonb_typeof(it->'unit_price') = 'number'
      and (it->>'unit_price')::numeric > 0
      and (not exists (select 1 from rfq_item_awards a where a.offer_id = o.id)
           or exists (select 1 from rfq_item_awards a where a.offer_id = o.id
                       and a.item_index = coalesce(nullif(it->>'item_index', '')::int, -1)))
  ),
  combined as (select * from single union all select * from multi)
  select product_name, sector, unit,
         round(avg(unit_price)) as avg_price,
         round(min(unit_price), 2) as min_price,
         round(max(unit_price), 2) as max_price,
         count(*) as offer_count,
         count(distinct supplier_id) as supplier_count
  from combined
  where product_name is not null
  group by product_name, sector, unit
  having count(distinct supplier_id) >= 3;
$$;

revoke all on function public.get_market_prices() from public, anon;
grant execute on function public.get_market_prices() to authenticated;
