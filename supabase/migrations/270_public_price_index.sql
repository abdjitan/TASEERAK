-- 270 (round-3 UX-099): the public price index grouped different units together, could rest on one
-- supplier and published raw min/max. Now: per product + sector + unit, 3+ DIFFERENT suppliers,
-- trimmed average, and the 10th/90th percentiles returned in the min/max columns (same signature).
create or replace function public.get_public_price_index()
returns table(product_name text, sector text, unit text, avg_price numeric, min_price numeric, max_price numeric, samples bigint, last_awarded timestamptz)
language sql stable security definer set search_path = public as $$
  with base as (
    select product_name, coalesce(sector, 'other') as sector, coalesce(unit, '') as unit, supplier_id,
           unit_price / (case when coalesce(vat_included, false) then 1.15 else 1 end) as unit_price, awarded_at
    from market_price_snapshots
    where unit_price is not null and unit_price > 0 and product_name is not null
      and awarded_at >= now() - interval '180 days'
  ),
  stats as (
    select product_name, sector, unit, count(*) as samples, max(awarded_at) as last_awarded,
           percentile_cont(0.10) within group (order by unit_price) as p10,
           percentile_cont(0.90) within group (order by unit_price) as p90
    from base group by product_name, sector, unit
    having count(distinct supplier_id) >= 3
  ),
  trimmed as (
    select b.product_name, b.sector, b.unit, avg(b.unit_price) as avg_price
    from base b join stats s using (product_name, sector, unit)
    where b.unit_price between s.p10 and s.p90
    group by b.product_name, b.sector, b.unit
  )
  select s.product_name, s.sector, nullif(s.unit, ''), round(t.avg_price, 2), round(s.p10::numeric, 2), round(s.p90::numeric, 2), s.samples, s.last_awarded
  from stats s join trimmed t using (product_name, sector, unit)
  order by s.sector, s.product_name;
$$;
