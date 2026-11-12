-- R23 (owner 2026-11-12): optional buyer budget per unit for each RFQ item, BEFORE VAT.
-- Kept OUT of rfqs.items: suppliers who offered / chat can read the whole rfqs row, so a
-- hidden budget there would leak. Hidden by default; the buyer may show it to suppliers.

create table if not exists public.rfq_item_budgets (
  rfq_id            uuid not null references public.rfqs(id) on delete cascade,
  item_index        int  not null check (item_index >= 0),
  budget_unit_price numeric(12,2) not null check (budget_unit_price > 0),
  budget_visible    boolean not null default false,
  updated_at        timestamptz not null default now(),
  primary key (rfq_id, item_index)
);

alter table public.rfq_item_budgets enable row level security;

-- owner (and admin) only; suppliers never read the table directly
drop policy if exists "rfq budgets owner read" on public.rfq_item_budgets;
create policy "rfq budgets owner read" on public.rfq_item_budgets
  for select to authenticated
  using (exists (select 1 from public.rfqs r where r.id = rfq_id
                 and (r.contractor_id = (select auth.uid()) or (select public.is_admin()))));

revoke all on public.rfq_item_budgets from anon, authenticated;
grant select on public.rfq_item_budgets to authenticated;

-- buyer: replace all budgets of one RFQ. p_budgets = [{item_index, budget_unit_price, budget_visible}]
-- (rows with an empty/zero price are dropped = "no budget").
create or replace function public.set_rfq_item_budgets(p_rfq_id uuid, p_budgets jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from rfqs where id = p_rfq_id and contractor_id = auth.uid()) then
    raise exception 'not_owner';
  end if;
  if p_budgets is not null and jsonb_typeof(p_budgets) <> 'array' then
    raise exception 'bad_budgets';
  end if;
  delete from rfq_item_budgets where rfq_id = p_rfq_id;
  insert into rfq_item_budgets (rfq_id, item_index, budget_unit_price, budget_visible)
  select p_rfq_id, (b->>'item_index')::int, round((b->>'budget_unit_price')::numeric, 2),
         coalesce((b->>'budget_visible')::boolean, false)
  from jsonb_array_elements(coalesce(p_budgets, '[]'::jsonb)) b
  where nullif(b->>'budget_unit_price', '') is not null
    and (b->>'budget_unit_price')::numeric > 0
    and (b->>'item_index')::int >= 0
  on conflict (rfq_id, item_index) do update
    set budget_unit_price = excluded.budget_unit_price,
        budget_visible = excluded.budget_visible, updated_at = now();
end $$;

-- suppliers (any signed-in user): only the budgets the buyer chose to show.
create or replace function public.get_rfq_visible_budgets(p_rfq_id uuid)
returns table (item_index int, budget_unit_price numeric)
language sql stable security definer set search_path = public
as $$
  select b.item_index, b.budget_unit_price
  from rfq_item_budgets b
  where b.rfq_id = p_rfq_id and b.budget_visible
  order by b.item_index
$$;

revoke all on function public.set_rfq_item_budgets(uuid, jsonb) from public, anon;
revoke all on function public.get_rfq_visible_budgets(uuid) from public, anon;
grant execute on function public.set_rfq_item_budgets(uuid, jsonb) to authenticated;
grant execute on function public.get_rfq_visible_budgets(uuid) to authenticated;
