-- BUG: /prices (public SEO page) calls get_public_price_index() but it was never defined,
-- so the RPC always errored and the page permanently showed "coming soon" even with real
-- awarded deals. Define it properly, from AWARDED prices (market_price_snapshots — real
-- winning prices), not request/offer prices, with a minimum sample size and outlier trimming
-- so a single deal never becomes "the market price". SECURITY DEFINER + anon grant because
-- the snapshots table is RLS-locked and only aggregated (identity-free) reads are allowed.
-- NOTE: superseded by 113 (adds VAT normalization); kept for history/order.
create or replace function public.get_public_price_index()
returns table(
  product_name text, sector text, unit text,
  avg_price numeric, min_price numeric, max_price numeric,
  samples bigint, last_awarded timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with base as (
    select product_name, coalesce(sector, 'other') as sector, unit, unit_price, awarded_at
    from market_price_snapshots
    where unit_price is not null and unit_price > 0 and product_name is not null
      and awarded_at >= now() - interval '180 days'
  ),
  stats as (
    select product_name, sector,
           mode() within group (order by unit) as unit,
           count(*) as samples, min(unit_price) as min_price, max(unit_price) as max_price,
           max(awarded_at) as last_awarded,
           percentile_cont(0.10) within group (order by unit_price) as p10,
           percentile_cont(0.90) within group (order by unit_price) as p90
    from base group by product_name, sector
    having count(*) >= 3
  ),
  trimmed_avg as (
    select b.product_name, b.sector, avg(b.unit_price) as avg_price
    from base b join stats s on s.product_name = b.product_name and s.sector = b.sector
    where b.unit_price between s.p10 and s.p90
    group by b.product_name, b.sector
  )
  select s.product_name, s.sector, s.unit,
         round(t.avg_price, 2), round(s.min_price, 2), round(s.max_price, 2), s.samples, s.last_awarded
  from stats s join trimmed_avg t on t.product_name = s.product_name and t.sector = s.sector
  order by s.sector, s.product_name;
$$;
revoke all on function public.get_public_price_index() from public;
grant execute on function public.get_public_price_index() to anon, authenticated;
