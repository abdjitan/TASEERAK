-- Tax normalization for the price index: awarded prices may be VAT-inclusive or exclusive
-- (per the offer's vat_included flag), and mixing them skews averages by up to 15%. Capture
-- vat_included on each snapshot and normalize the index to EX-VAT (÷1.15 when inclusive) so
-- every displayed price is on the same basis.

alter table public.market_price_snapshots add column if not exists vat_included boolean;

-- capture the winning offer's vat_included when snapshotting an award
create or replace function public.snapshot_awarded_price()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_sector text; v_region text; v_vat boolean;
begin
  if NEW.unit_price is null or NEW.unit_price <= 0 then return NEW; end if;
  select r.sector::text, r.region into v_sector, v_region from rfqs r where r.id = NEW.rfq_id;
  select o.vat_included into v_vat from offers o where o.id = NEW.offer_id;
  insert into market_price_snapshots
    (product_name, sector, unit, unit_price, total, quantity, region, rfq_id, offer_id, supplier_id, vat_included)
  values
    (NEW.item_key, v_sector, NEW.unit, NEW.unit_price, NEW.total, NEW.quantity, v_region,
     NEW.rfq_id, NEW.offer_id, NEW.supplier_id, v_vat);
  return NEW;
end; $$;
revoke execute on function public.snapshot_awarded_price() from public, anon, authenticated;

-- normalize every price to ex-VAT before aggregating
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
    select product_name,
           coalesce(sector, 'other') as sector,
           unit,
           unit_price / (case when coalesce(vat_included, false) then 1.15 else 1 end) as unit_price,
           awarded_at
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
