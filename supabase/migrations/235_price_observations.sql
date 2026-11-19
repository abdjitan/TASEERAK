-- 235: anonymous price log (owner 2026-11-19). Every item price a seller quotes is kept as one
-- anonymous row (material, specs, unit, net/gross unit price, quantity, region/city, date, seller
-- tier, price source, won or not), with NO seller, buyer, offer or request id. It survives the
-- 60-day purge of requests without a deal (192), so the owner can compute market averages and use
-- them later (future project-costing app). Admin-only (RLS); never shown to users.
create table if not exists public.price_observations (
  id bigserial primary key,
  obs_key text not null unique,            -- md5(offer id : item index): lets an edited offer update its row; not reversible once the offer is purged
  observed_at timestamptz not null default now(),
  product_name text not null,
  sector text,
  sub_category text,
  specification text,
  specs jsonb,
  unit text,
  quantity numeric,
  unit_price numeric,                      -- as typed by the seller
  unit_price_net numeric,                  -- before VAT
  unit_price_gross numeric,                -- what the buyer pays per unit
  vat_basis text,                          -- included | excluded | not_registered
  region text,
  city text,
  seller_tier text,                        -- company | shop | independent
  source_type text,                        -- own stock / sourced (offers.source_type or the item's)
  delivery_days int,
  won boolean not null default false
);
create index if not exists price_observations_product on public.price_observations (product_name, observed_at desc);
create index if not exists price_observations_sub on public.price_observations (sector, sub_category, observed_at desc);
alter table public.price_observations enable row level security;
drop policy if exists price_observations_admin_read on public.price_observations;
create policy price_observations_admin_read on public.price_observations for select to authenticated using (public.is_admin());
revoke all on public.price_observations from anon;
revoke insert, update, delete on public.price_observations from authenticated;

-- write/refresh the rows of one offer (never raises: an offer is never blocked by the log)
create or replace function public.log_offer_prices(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o offers; r rfqs; v_tier text; e jsonb; v_idx int; v_item jsonb; v_price numeric; v_net numeric; v_gross numeric; v_basis text;
begin
  select * into o from offers where id = p_offer_id;
  if not found or o.item_prices is null or jsonb_typeof(o.item_prices) <> 'array' then return; end if;
  select * into r from rfqs where id = o.rfq_id;
  select coalesce(supplier_tier, 'shop') into v_tier from profiles where id = o.supplier_id;
  v_basis := case when o.vat_status::text = 'not_registered' then 'not_registered' when coalesce(o.vat_included, false) then 'included' else 'excluded' end;
  for e in select * from jsonb_array_elements(o.item_prices) loop
    v_price := nullif(e->>'unit_price', '')::numeric;
    if v_price is null or v_price <= 0 or coalesce(e->>'product_name', '') = '' then continue; end if;
    v_idx := nullif(e->>'item_index', '')::int;
    v_item := case when v_idx is not null and jsonb_typeof(r.items) = 'array' then r.items -> v_idx end;
    v_net := case v_basis when 'included' then v_price / 1.15 else v_price end;
    v_gross := case v_basis when 'excluded' then v_price * 1.15 else v_price end;
    insert into price_observations (obs_key, observed_at, product_name, sector, sub_category, specification, specs, unit, quantity,
      unit_price, unit_price_net, unit_price_gross, vat_basis, region, city, seller_tier, source_type, delivery_days)
    values (md5(o.id::text || ':' || coalesce(v_idx::text, e->>'product_name')), coalesce(o.created_at, now()),
      e->>'product_name', coalesce(e->>'sector', v_item->>'sector', r.sector::text), coalesce(e->>'sub_category', v_item->>'sub_category'),
      nullif(coalesce(e->>'specification', v_item->>'specification'), ''), case when jsonb_typeof(v_item->'specsObj') = 'object' then v_item->'specsObj' end,
      coalesce(e->>'unit', v_item->>'unit'), nullif(e->>'quantity', '')::numeric,
      v_price, round(v_net, 4), round(v_gross, 4), v_basis, r.region, r.city, v_tier,
      coalesce(e->>'source_type', o.source_type::text), nullif(e->>'delivery_days', '')::int)
    on conflict (obs_key) do update set
      unit_price = excluded.unit_price, unit_price_net = excluded.unit_price_net, unit_price_gross = excluded.unit_price_gross,
      vat_basis = excluded.vat_basis, quantity = excluded.quantity, unit = excluded.unit, specification = excluded.specification,
      source_type = excluded.source_type, delivery_days = excluded.delivery_days;
  end loop;
exception when others then
  raise warning 'log_offer_prices(%): %', p_offer_id, sqlerrm;
end $$;

create or replace function public.trg_log_offer_prices() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_offer_prices(new.id);
  -- a single-offer accept awards every item of that offer
  if tg_op = 'UPDATE' and new.status::text = 'accepted' and old.status::text is distinct from 'accepted' then
    update price_observations set won = true where obs_key in (
      select md5(new.id::text || ':' || coalesce(e->>'item_index', e->>'product_name'))
        from jsonb_array_elements(case when jsonb_typeof(new.item_prices) = 'array' then new.item_prices else '[]'::jsonb end) e);
  end if;
  return new;
exception when others then
  raise warning 'trg_log_offer_prices: %', sqlerrm;
  return new;
end $$;
drop trigger if exists zz_log_offer_prices on public.offers;
create trigger zz_log_offer_prices after insert or update of item_prices, vat_included, status on public.offers
  for each row execute function public.trg_log_offer_prices();

-- per-item awards mark the winning row (and clear it on unaward)
create or replace function public.trg_log_award_won() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update price_observations set won = true where obs_key = md5(new.offer_id::text || ':' || new.item_index::text);
  elsif tg_op = 'DELETE' then
    update price_observations set won = false where obs_key = md5(old.offer_id::text || ':' || old.item_index::text);
  end if;
  return null;
exception when others then
  raise warning 'trg_log_award_won: %', sqlerrm;
  return null;
end $$;
drop trigger if exists zz_log_award_won on public.rfq_item_awards;
create trigger zz_log_award_won after insert or delete on public.rfq_item_awards
  for each row execute function public.trg_log_award_won();

revoke all on function public.log_offer_prices(uuid) from public, anon, authenticated;
revoke all on function public.trg_log_offer_prices() from public, anon, authenticated;
revoke all on function public.trg_log_award_won() from public, anon, authenticated;

-- backfill the offers that exist today
do $$ declare x record; begin
  for x in select id from offers loop perform public.log_offer_prices(x.id); end loop;
  update price_observations p set won = true from rfq_item_awards a where p.obs_key = md5(a.offer_id::text || ':' || a.item_index::text);
  update price_observations p set won = true from offers o
   where o.status::text = 'accepted' and p.obs_key in (
     select md5(o.id::text || ':' || coalesce(e->>'item_index', e->>'product_name'))
       from jsonb_array_elements(case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end) e);
end $$;

-- admin summary: average/min/max net unit price per material and unit over a period
create or replace function public.admin_price_stats(p_days int default 90, p_sector text default null)
returns table (product_name text, sector text, unit text, region text, quotes bigint, won bigint,
               avg_net numeric, min_net numeric, max_net numeric, last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select p.product_name, p.sector, p.unit, p.region, count(*), count(*) filter (where p.won),
           round(avg(p.unit_price_net), 2), round(min(p.unit_price_net), 2), round(max(p.unit_price_net), 2), max(p.observed_at)
      from price_observations p
     where p.observed_at >= now() - make_interval(days => greatest(coalesce(p_days, 90), 1))
       and (p_sector is null or p.sector = p_sector)
     group by p.product_name, p.sector, p.unit, p.region
     order by count(*) desc, p.product_name;
end $$;
revoke all on function public.admin_price_stats(int, text) from public, anon;
grant execute on function public.admin_price_stats(int, text) to authenticated;
-- 235 (part 2): older single-item offers (no item_prices) are logged from offers.unit_price
create or replace function public.log_offer_prices(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o offers; r rfqs; v_tier text; e jsonb; v_idx int; v_item jsonb; v_price numeric; v_net numeric; v_gross numeric; v_basis text; v_list jsonb;
begin
  select * into o from offers where id = p_offer_id;
  if not found then return; end if;
  select * into r from rfqs where id = o.rfq_id;
  select coalesce(supplier_tier, 'shop') into v_tier from profiles where id = o.supplier_id;
  v_basis := case when o.vat_status::text = 'not_registered' then 'not_registered' when coalesce(o.vat_included, false) then 'included' else 'excluded' end;
  v_list := case when jsonb_typeof(o.item_prices) = 'array' and jsonb_array_length(o.item_prices) > 0 then o.item_prices
                 when coalesce(o.unit_price, 0) > 0 and coalesce(r.product_name, '') <> '' then
                   jsonb_build_array(jsonb_build_object('item_index', 0, 'product_name', r.product_name, 'unit_price', o.unit_price,
                     'unit', r.unit, 'quantity', r.quantity, 'sector', r.sector::text, 'sub_category', r.sub_category, 'specification', r.specification))
                 else '[]'::jsonb end;
  for e in select * from jsonb_array_elements(v_list) loop
    v_price := nullif(e->>'unit_price', '')::numeric;
    if v_price is null or v_price <= 0 or coalesce(e->>'product_name', '') = '' then continue; end if;
    v_idx := nullif(e->>'item_index', '')::int;
    v_item := case when v_idx is not null and jsonb_typeof(r.items) = 'array' then r.items -> v_idx end;
    v_net := case v_basis when 'included' then v_price / 1.15 else v_price end;
    v_gross := case v_basis when 'excluded' then v_price * 1.15 else v_price end;
    insert into price_observations (obs_key, observed_at, product_name, sector, sub_category, specification, specs, unit, quantity,
      unit_price, unit_price_net, unit_price_gross, vat_basis, region, city, seller_tier, source_type, delivery_days)
    values (md5(o.id::text || ':' || coalesce(v_idx::text, e->>'product_name')), coalesce(o.created_at, now()),
      e->>'product_name', coalesce(e->>'sector', v_item->>'sector', r.sector::text), coalesce(e->>'sub_category', v_item->>'sub_category'),
      nullif(coalesce(e->>'specification', v_item->>'specification'), ''), case when jsonb_typeof(v_item->'specsObj') = 'object' then v_item->'specsObj' end,
      coalesce(e->>'unit', v_item->>'unit'), nullif(e->>'quantity', '')::numeric,
      v_price, round(v_net, 4), round(v_gross, 4), v_basis, r.region, r.city, v_tier,
      coalesce(e->>'source_type', o.source_type::text), coalesce(nullif(e->>'delivery_days', '')::int, o.delivery_days))
    on conflict (obs_key) do update set
      unit_price = excluded.unit_price, unit_price_net = excluded.unit_price_net, unit_price_gross = excluded.unit_price_gross,
      vat_basis = excluded.vat_basis, quantity = excluded.quantity, unit = excluded.unit, specification = excluded.specification,
      source_type = excluded.source_type, delivery_days = excluded.delivery_days;
  end loop;
exception when others then
  raise warning 'log_offer_prices(%): %', p_offer_id, sqlerrm;
end $$;
revoke all on function public.log_offer_prices(uuid) from public, anon, authenticated;
do $$ declare x record; begin
  for x in select id from offers loop perform public.log_offer_prices(x.id); end loop;
  update price_observations p set won = true from offers o
   where o.status::text = 'accepted' and p.obs_key = md5(o.id::text || ':0') and (o.item_prices is null or jsonb_typeof(o.item_prices) <> 'array' or jsonb_array_length(o.item_prices) = 0);
end $$;
