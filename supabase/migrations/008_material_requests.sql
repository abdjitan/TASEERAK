-- =============================================
-- 008 — MATERIAL REQUESTS (supplier suggests a material not in the list)
--
-- A supplier can propose a material/specialty that is missing from the
-- built-in taxonomy. It goes to the admin as "pending" for approval.
--
-- Run in Supabase → SQL Editor (after 004, which created is_admin()).
-- Safe to re-run.
-- =============================================

do $$ begin
  create type material_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists material_requests (
  id          uuid default uuid_generate_v4() primary key,
  supplier_id uuid references profiles(id) on delete cascade,
  name        text not null,
  sector      text,                 -- proposed sector (optional, free text)
  description text,                  -- what it is / specs (optional)
  status      material_request_status default 'pending',
  admin_note  text,
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);

alter table material_requests enable row level security;

-- a supplier manages only their own requests
drop policy if exists "Suppliers manage own material requests" on material_requests;
create policy "Suppliers manage own material requests" on material_requests
  for all
  using (auth.uid() = supplier_id)
  with check (auth.uid() = supplier_id);

-- admins manage every request (approve / reject)
drop policy if exists "Admins manage all material requests" on material_requests;
create policy "Admins manage all material requests" on material_requests
  for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists material_requests_status_idx   on material_requests(status);
create index if not exists material_requests_supplier_idx on material_requests(supplier_id);
