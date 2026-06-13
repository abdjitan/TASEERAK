-- (1) Let contractors (not just suppliers) request a new material, with a chosen
-- sector + group. Generalize ownership to a `requested_by` column.
alter table material_requests add column if not exists requested_by uuid references profiles(id) on delete cascade;
alter table material_requests add column if not exists sub_category text;
update material_requests set requested_by = supplier_id where requested_by is null and supplier_id is not null;

drop policy if exists "Suppliers manage own material requests" on material_requests;
create policy "Requester manages own material requests" on material_requests
  for all
  using (auth.uid() = supplier_id or auth.uid() = requested_by)
  with check (auth.uid() = supplier_id or auth.uid() = requested_by);

-- (2) Approved dynamic materials — supplements the hardcoded SECTOR_PRODUCTS so
-- the cascade can show admin-approved additions without a code deploy.
create table if not exists materials (
  id            uuid primary key default uuid_generate_v4(),
  sector        text not null,
  sub_category  text,
  name          text not null,
  is_active     boolean not null default true,
  source_request uuid references material_requests(id) on delete set null,
  created_at    timestamptz default now(),
  unique (sector, name)
);
alter table materials enable row level security;

drop policy if exists "read active materials" on materials;
create policy "read active materials" on materials
  for select to authenticated using (is_active);
drop policy if exists "admin manage materials" on materials;
create policy "admin manage materials" on materials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- (3) Admin approval = mark request approved + add the material to the catalog.
create or replace function public.approve_material_request(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_name text; v_sector text; v_sub text;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select name, coalesce(sector, 'civil'), sub_category into v_name, v_sector, v_sub
  from material_requests where id = p_id;
  if v_name is null then raise exception 'Request not found'; end if;
  update material_requests set status = 'approved', reviewed_at = now() where id = p_id;
  insert into materials (sector, sub_category, name, source_request)
  values (v_sector, v_sub, v_name, p_id)
  on conflict (sector, name) do update set is_active = true, sub_category = excluded.sub_category;
end; $$;
revoke execute on function public.approve_material_request(uuid) from public, anon;
grant execute on function public.approve_material_request(uuid) to authenticated;
