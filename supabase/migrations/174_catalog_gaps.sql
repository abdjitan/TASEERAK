-- 174: materials requested outside the catalog that a buyer actually chose an offer for are
-- listed for the admins, so they can be added to the catalog (owner 2026-10-24, via the app).
-- A request line written by hand carries items[i].custom = true (web and app set it).

create table if not exists public.catalog_gaps (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  item_index int not null,
  product_name text not null,
  sector text,
  sub_category text,
  quantity numeric,
  unit text,
  photo_url text,
  status text not null default 'new' check (status in ('new', 'added', 'ignored')),
  created_at timestamptz not null default now(),
  unique (rfq_id, item_index)
);
create index if not exists catalog_gaps_status_idx on public.catalog_gaps(status, created_at desc);
alter table public.catalog_gaps enable row level security;
drop policy if exists "admin read catalog_gaps" on public.catalog_gaps;
create policy "admin read catalog_gaps" on public.catalog_gaps for select to authenticated using (public.is_admin());
drop policy if exists "admin update catalog_gaps" on public.catalog_gaps;
create policy "admin update catalog_gaps" on public.catalog_gaps for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.catalog_gaps from anon;
grant select, update on public.catalog_gaps to authenticated;

-- record one line if it was written by hand; tell the admins once per line
create or replace function public.record_catalog_gap(p_rfq uuid, p_index int)
returns void language plpgsql security definer set search_path = public as $$
declare v_items jsonb; v_it jsonb; v_id uuid;
begin
  select items into v_items from rfqs where id = p_rfq;
  if v_items is null or jsonb_typeof(v_items) <> 'array' then return; end if;
  v_it := v_items -> p_index;
  if v_it is null or coalesce((v_it ->> 'custom')::boolean, false) is not true then return; end if;
  insert into catalog_gaps (rfq_id, item_index, product_name, sector, sub_category, quantity, unit, photo_url)
  values (p_rfq, p_index, left(coalesce(v_it ->> 'product_name', '?'), 200), v_it ->> 'sector', v_it ->> 'sub_category',
          nullif(v_it ->> 'quantity', '')::numeric, v_it ->> 'unit', v_it ->> 'photo_url')
  on conflict (rfq_id, item_index) do nothing
  returning id into v_id;
  if v_id is not null then
    insert into notifications (user_id, type, title, body, data)
    select p.id, 'new_message', 'مادة خارج الكتالوج اختير لها عرض', left(coalesce(v_it ->> 'product_name', ''), 120),
           jsonb_build_object('url', '/admin/suggestions?tab=gaps', 'kind', 'catalog_gap', 'gap_id', v_id)
      from profiles p where p.role = 'admin';
  end if;
exception when others then
  -- never block an award or an acceptance because of this list
  raise warning 'record_catalog_gap: %', sqlerrm;
end $$;
revoke all on function public.record_catalog_gap(uuid, int) from public, anon, authenticated;

-- per-item award (multi-item requests)
create or replace function public.catalog_gap_on_award()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.record_catalog_gap(new.rfq_id, new.item_index);
  return new;
end $$;
drop trigger if exists trg_catalog_gap_on_award on public.rfq_item_awards;
create trigger trg_catalog_gap_on_award after insert on public.rfq_item_awards
  for each row execute function public.catalog_gap_on_award();

-- whole-offer acceptance: every hand-written line the offer priced (or the single line)
create or replace function public.catalog_gap_on_accept()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_items jsonb; i int;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select items into v_items from rfqs where id = new.rfq_id;
    if v_items is not null and jsonb_typeof(v_items) = 'array' then
      for i in 0 .. jsonb_array_length(v_items) - 1 loop
        if jsonb_array_length(v_items) = 1
           or exists (select 1 from jsonb_array_elements(coalesce(new.item_prices, '[]'::jsonb)) e where (e ->> 'item_index')::int = i) then
          perform public.record_catalog_gap(new.rfq_id, i);
        end if;
      end loop;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_catalog_gap_on_accept on public.offers;
create trigger trg_catalog_gap_on_accept after update of status on public.offers
  for each row execute function public.catalog_gap_on_accept();
