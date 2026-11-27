-- 297 (owner 2026-11-27): a supplier picks the materials he sells inside each specialty (e.g. «بلوك مفرغ» yes,
-- «بلوك مصمت» no). Specialties stay the routing unit; unticked products are stored as exclusions and a request
-- line for an excluded product no longer reaches him.
create table if not exists public.supplier_excluded_products (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_name text not null,
  primary key (profile_id, product_name)
);
alter table public.supplier_excluded_products enable row level security;
drop policy if exists sep_own_read on public.supplier_excluded_products;
create policy sep_own_read on public.supplier_excluded_products for select
  using (profile_id = (select public.acting_uid()));

create or replace function public.save_supplier_excluded_products(p_names text[])
returns integer language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.acting_uid(); n int;
begin
  if auth.uid() is null or v_uid is distinct from auth.uid() then raise exception 'يحدّد صاحب الحساب المواد.'; end if;
  delete from supplier_excluded_products where profile_id = v_uid;
  insert into supplier_excluded_products (profile_id, product_name)
  select distinct v_uid, left(btrim(x), 160) from unnest(coalesce(p_names, '{}')) x where coalesce(btrim(x), '') <> ''
  limit 2000;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.save_supplier_excluded_products(text[]) from public, anon;
grant execute on function public.save_supplier_excluded_products(text[]) to authenticated;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.count_matching_suppliers(rfqs, jsonb)'::regprocedure);
  if position('supplier_excluded_products' in d) = 0 then
    d := replace(d, 'psp.specialty = (it->>''sub_category'')))',
      'psp.specialty = (it->>''sub_category'')))' || chr(10) ||
      '    and not exists (select 1 from supplier_excluded_products x where x.profile_id = p.id and x.product_name = (it->>''product_name''))');
    if position('supplier_excluded_products' in d) = 0 then raise exception 'count anchor'; end if;
    execute d;
  end if;
  d := pg_get_functiondef('public.notify_suppliers_for_rfq(uuid, boolean, integer)'::regprocedure);
  if position('supplier_excluded_products' in d) = 0 then
    d := replace(d, 'psp.specialty = (it->>''sub_category''))' || chr(10) || '              )',
      'psp.specialty = (it->>''sub_category''))' || chr(10) || '              )' || chr(10) ||
      '          and not exists (select 1 from supplier_excluded_products x where x.profile_id = p.id and x.product_name = (it->>''product_name''))');
    if position('supplier_excluded_products' in d) = 0 then raise exception 'notify anchor'; end if;
    execute d;
  end if;
end $$;
