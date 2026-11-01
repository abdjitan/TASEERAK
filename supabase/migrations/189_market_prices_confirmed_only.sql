-- 189: market prices from confirmed deals only (deal-flow audit M6, 2026-11-01).
--  * The price history was written when the buyer *selected* a line (rfq_item_awards insert): a
--    selection later undone or never confirmed stayed in it, a re-selection kept the first price,
--    and whole-offer acceptances were never recorded. It is now written once, when the offer
--    becomes accepted: its awarded lines, or every priced line for a whole-offer acceptance.
--  * get_market_prices averaged every line of an accepted offer, including lines the supplier lost
--    to someone else; now only lines that offer actually won count.
drop trigger if exists trg_snapshot_awarded_price on public.rfq_item_awards;

create or replace function public.snapshot_accepted_offer_prices() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sector text; v_region text;
begin
  if new.status <> 'accepted' or old.status = 'accepted' then return new; end if;
  select r.sector::text, r.region into v_sector, v_region from rfqs r where r.id = new.rfq_id;
  if exists (select 1 from rfq_item_awards a where a.offer_id = new.id) then
    insert into market_price_snapshots (product_name, sector, unit, unit_price, total, quantity, region, rfq_id, offer_id, supplier_id, vat_included)
    select a.item_key, v_sector, a.unit, a.unit_price, a.total, a.quantity, v_region, new.rfq_id, new.id, new.supplier_id, new.vat_included
      from rfq_item_awards a where a.offer_id = new.id and a.unit_price > 0;
  else
    insert into market_price_snapshots (product_name, sector, unit, unit_price, total, quantity, region, rfq_id, offer_id, supplier_id, vat_included)
    select it->>'product_name', coalesce(it->>'sector', v_sector), it->>'unit', (it->>'unit_price')::numeric,
           nullif(it->>'total', '')::numeric, nullif(it->>'quantity', '')::numeric, v_region, new.rfq_id, new.id, new.supplier_id, new.vat_included
      from jsonb_array_elements(case when jsonb_typeof(new.item_prices) = 'array' then new.item_prices else '[]'::jsonb end) it
     where jsonb_typeof(it->'unit_price') = 'number' and (it->>'unit_price')::numeric > 0 and coalesce(it->>'product_name', '') <> '';
  end if;
  return new;
exception when others then
  -- the price history must never block a deal
  begin insert into system_errors_log(context, message) values ('snapshot_accepted_offer_prices', left(sqlerrm, 500)); exception when others then null; end;
  return new;
end $$;
drop trigger if exists zz_snapshot_accepted_offer_prices on public.offers;
create trigger zz_snapshot_accepted_offer_prices after update of status on public.offers
  for each row execute function public.snapshot_accepted_offer_prices();

create or replace function public.get_market_prices()
returns table(product_name text, sector text, unit text, avg_price numeric, min_price numeric, max_price numeric, offer_count bigint)
language sql stable security definer set search_path = public as $$
  with single as (
    select r.product_name, r.sector::text as sector, r.unit as unit, o.unit_price as unit_price
    from offers o join rfqs r on r.id = o.rfq_id
    where o.status = 'accepted' and o.unit_price is not null and o.unit_price > 0
      and not (jsonb_typeof(o.item_prices) = 'array' and jsonb_array_length(o.item_prices) > 0)
  ),
  multi as (
    select it->>'product_name' as product_name,
           coalesce(it->>'sector', r.sector::text) as sector,
           it->>'unit' as unit,
           (it->>'unit_price')::numeric as unit_price
    from offers o join rfqs r on r.id = o.rfq_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) as it
    where o.status = 'accepted'
      and jsonb_typeof(it->'unit_price') = 'number'
      and (it->>'unit_price')::numeric > 0
      -- only the lines this offer won (a whole-offer acceptance has no award rows: every line counts)
      and (not exists (select 1 from rfq_item_awards a where a.offer_id = o.id)
           or exists (select 1 from rfq_item_awards a where a.offer_id = o.id
                       and a.item_index = coalesce(nullif(it->>'item_index', '')::int, -1)))
  ),
  combined as (select * from single union all select * from multi)
  select product_name, sector, max(unit) as unit,
         round(avg(unit_price)) as avg_price,
         min(unit_price) as min_price,
         max(unit_price) as max_price,
         count(*) as offer_count
  from combined
  where product_name is not null
  group by product_name, sector
  having count(*) >= 3;
$$;
