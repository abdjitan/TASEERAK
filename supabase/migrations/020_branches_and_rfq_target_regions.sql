-- Multiple branches per supplier company (e.g. a paint company with many branches).
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  region text,
  city text,
  district text,
  address text,
  phone text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);
create index if not exists branches_supplier_idx on public.branches(supplier_id);
create index if not exists branches_region_idx on public.branches(region);

alter table public.branches enable row level security;
create policy "branches read" on public.branches
  for select using (auth.uid() is not null);
create policy "branches manage own" on public.branches
  for all using (supplier_id = auth.uid() or is_admin())
  with check (supplier_id = auth.uid() or is_admin());

-- Contractor can target specific regions when posting an RFQ. A supplier matches
-- if its primary region OR any branch region is in target_regions (empty = all).
alter table public.rfqs add column if not exists target_regions text[];
