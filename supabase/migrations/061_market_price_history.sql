-- ============================================================================
-- 061: سجل الأسعار التاريخي + اتجاه السوق
--   • market_price_snapshots: سجل دائم لأسعار البنود التي تمّت ترسيتها (سعر فائز حقيقي)
--   • get_market_price_trend(): اتجاه السعر لكل مادة (آخر ٣٠ يوم مقابل الـ٣٠ قبلها) من العروض
-- ============================================================================

create table if not exists public.market_price_snapshots (
  id           uuid primary key default gen_random_uuid(),
  product_name text not null,
  sector       text,
  unit         text,
  unit_price   numeric,
  total        numeric,
  quantity     numeric,
  region       text,
  rfq_id       uuid references public.rfqs(id) on delete set null,
  offer_id     uuid references public.offers(id) on delete set null,
  supplier_id  uuid references public.profiles(id) on delete set null,
  awarded_at   timestamptz not null default now()
);
create index if not exists idx_mps_product on public.market_price_snapshots(product_name);
create index if not exists idx_mps_awarded on public.market_price_snapshots(awarded_at);

-- بيانات السوق حسّاسة الهوية — لا قراءة مباشرة؛ تُعرض فقط عبر دوال مُجمَّعة (definer).
alter table public.market_price_snapshots enable row level security;

-- يلتقط السعر الفائز لحظة الترسية (سجل دائم لا يتأثر بتغيّر العروض لاحقاً)
create or replace function public.snapshot_awarded_price()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_sector text; v_region text;
begin
  if NEW.unit_price is null or NEW.unit_price <= 0 then return NEW; end if;
  select r.sector::text, r.region into v_sector, v_region from rfqs r where r.id = NEW.rfq_id;
  insert into market_price_snapshots
    (product_name, sector, unit, unit_price, total, quantity, region, rfq_id, offer_id, supplier_id)
  values
    (NEW.item_key, v_sector, NEW.unit, NEW.unit_price, NEW.total, NEW.quantity, v_region,
     NEW.rfq_id, NEW.offer_id, NEW.supplier_id);
  return NEW;
end; $$;

drop trigger if exists trg_snapshot_awarded_price on public.rfq_item_awards;
create trigger trg_snapshot_awarded_price
  after insert on public.rfq_item_awards
  for each row execute function public.snapshot_awarded_price();

-- اتجاه السعر لكل مادة: متوسط آخر ٣٠ يوم مقابل الـ٣٠ يوم السابقة (من كل العروض غير المرفوضة)
create or replace function public.get_market_price_trend()
returns table(product_name text, sector text, unit text,
              recent_avg numeric, prev_avg numeric, recent_count bigint)
language sql
security definer
set search_path to 'public'
as $$
  with single as (
    select r.product_name, r.sector::text as sector, r.unit as unit,
           o.unit_price as unit_price, o.created_at as created_at
    from offers o join rfqs r on r.id = o.rfq_id
    where o.status <> 'rejected' and o.unit_price is not null and o.unit_price > 0
  ),
  multi as (
    select it->>'product_name' as product_name,
           coalesce(it->>'sector', r.sector::text) as sector,
           it->>'unit' as unit,
           (it->>'unit_price')::numeric as unit_price,
           o.created_at as created_at
    from offers o join rfqs r on r.id = o.rfq_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) as it
    where o.status <> 'rejected'
      and jsonb_typeof(it->'unit_price') = 'number'
      and (it->>'unit_price')::numeric > 0
  ),
  combined as (select * from single union all select * from multi)
  select product_name, sector, max(unit) as unit,
         round(avg(unit_price) filter (where created_at >= now() - interval '30 days')) as recent_avg,
         round(avg(unit_price) filter (where created_at >= now() - interval '60 days'
                                         and created_at <  now() - interval '30 days')) as prev_avg,
         count(*) filter (where created_at >= now() - interval '30 days') as recent_count
  from combined
  where product_name is not null
  group by product_name, sector
  having count(*) filter (where created_at >= now() - interval '30 days') >= 1;
$$;

revoke execute on function public.get_market_price_trend() from public, anon;
grant  execute on function public.get_market_price_trend() to authenticated;
