-- ════════════════════════════════════════════════════════════════
-- 047: Per-item awards — the contractor awards each material of a
-- multi-item RFQ to the supplier of their choice (e.g. cheapest), so a
-- single request can be split across several suppliers (BOQ-style sourcing).
-- ════════════════════════════════════════════════════════════════
create table if not exists public.rfq_item_awards (
  id          uuid primary key default gen_random_uuid(),
  rfq_id      uuid not null references public.rfqs(id) on delete cascade,
  item_index  int  not null,                 -- index into rfqs.items (the canonical material list)
  item_key    text not null,                 -- product_name snapshot (for display / integrity)
  offer_id    uuid not null references public.offers(id) on delete cascade,
  supplier_id uuid not null references public.profiles(id),
  unit_price  numeric,
  total       numeric not null default 0,
  quantity    numeric,
  unit        text,
  awarded_at  timestamptz not null default now(),
  unique (rfq_id, item_index)                -- one award per material
);

create index if not exists idx_rfq_item_awards_rfq on public.rfq_item_awards(rfq_id);
create index if not exists idx_rfq_item_awards_offer on public.rfq_item_awards(offer_id);
create index if not exists idx_rfq_item_awards_supplier on public.rfq_item_awards(supplier_id);

alter table public.rfq_item_awards enable row level security;

-- Only the RFQ's contractor and the awarded supplier can see an award row.
drop policy if exists "awards select party" on public.rfq_item_awards;
create policy "awards select party" on public.rfq_item_awards
  for select to authenticated
  using (
    supplier_id = auth.uid()
    or exists (select 1 from public.rfqs r where r.id = rfq_id and r.contractor_id = auth.uid())
  );
-- No direct writes: all mutations go through the SECURITY DEFINER RPCs below.

-- Award one material to a chosen offer. Recomputes price from the offer's own
-- item_prices (never trusts the client) and is contractor-only.
create or replace function public.award_rfq_item(p_rfq_id uuid, p_item_index int, p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_contractor uuid;
  v_pname text;
  v_entry jsonb;
  v_supplier uuid;
begin
  select contractor_id, (items -> p_item_index ->> 'product_name')
    into v_contractor, v_pname
  from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if v_pname is null then raise exception 'Item not found'; end if;

  select o.supplier_id, ip
    into v_supplier, v_entry
  from offers o
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
  ) ip
  where o.id = p_offer_id and o.rfq_id = p_rfq_id
    and o.status <> 'rejected'
    and ip->>'product_name' = v_pname
  limit 1;
  if v_entry is null then raise exception 'Offer does not price this item'; end if;

  insert into rfq_item_awards (rfq_id, item_index, item_key, offer_id, supplier_id, unit_price, total, quantity, unit)
  values (p_rfq_id, p_item_index, v_pname, p_offer_id, v_supplier,
          nullif(v_entry->>'unit_price','')::numeric,
          coalesce(nullif(v_entry->>'total','')::numeric, 0),
          nullif(v_entry->>'quantity','')::numeric,
          v_entry->>'unit')
  on conflict (rfq_id, item_index)
  do update set offer_id = excluded.offer_id, supplier_id = excluded.supplier_id,
                unit_price = excluded.unit_price, total = excluded.total,
                quantity = excluded.quantity, unit = excluded.unit, awarded_at = now();
end;
$$;

-- Undo an award.
create or replace function public.unaward_rfq_item(p_rfq_id uuid, p_item_index int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_contractor uuid;
begin
  select contractor_id into v_contractor from rfqs where id = p_rfq_id;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  delete from rfq_item_awards where rfq_id = p_rfq_id and item_index = p_item_index;
end;
$$;

revoke execute on function public.award_rfq_item(uuid, int, uuid) from public, anon;
grant execute on function public.award_rfq_item(uuid, int, uuid) to authenticated;
revoke execute on function public.unaward_rfq_item(uuid, int) from public, anon;
grant execute on function public.unaward_rfq_item(uuid, int) to authenticated;
