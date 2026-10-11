-- Supplier discovery v2 (docs/SUPPLIER_DISCOVERY_BRIEF.md): batch discovery zone × pack,
-- dedup by place_id → Maps CID → normalised phone, auto-classification (sector + pack),
-- per-shop invitation tracking with cooldown and opt-out, and coverage stats.

alter table public.discovered_suppliers
  add column if not exists cid           text,          -- Google Maps CID (stable; old Excel exports only have this)
  add column if not exists phone_norm    text,          -- national digits, no 0/966 (mobile = 5XXXXXXXX)
  add column if not exists is_mobile     boolean default false,
  add column if not exists pack          text,          -- src/lib/supplierPacks.ts id
  add column if not exists district      text,
  add column if not exists google_type   text,
  add column if not exists search_query  text,
  add column if not exists zone          text,          -- discovery zone the batch ran in
  add column if not exists relevance     text default 'supplier', -- supplier | review | contractor
  add column if not exists source        text default 'places_api',
  add column if not exists invite_count  integer default 0,
  add column if not exists opted_out     boolean default false,
  add column if not exists notes         text,
  add column if not exists updated_at    timestamptz default now();

create unique index if not exists uq_discsup_cid on public.discovered_suppliers(cid) where cid is not null;
create index if not exists idx_discsup_phone_norm on public.discovered_suppliers(phone_norm);
create index if not exists idx_discsup_city_pack on public.discovered_suppliers(city, pack);
create index if not exists idx_discsup_city_district on public.discovered_suppliers(city, district);

-- One row per search actually sent to Google, so the admin sees coverage and never pays twice.
create table if not exists public.discovery_runs (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,
  zone        text not null,
  pack        text,
  query       text not null,
  pages       integer default 0,
  results     integer default 0,
  inserted    integer default 0,
  updated     integer default 0,
  dup_phone   integer default 0,
  skipped     integer default 0,
  ran_by      uuid references public.profiles(id) on delete set null,
  ran_at      timestamptz default now()
);
create index if not exists idx_discruns_city_zone on public.discovery_runs(city, zone, pack);
alter table public.discovery_runs enable row level security;
drop policy if exists "admin manage discovery runs" on public.discovery_runs;
create policy "admin manage discovery runs" on public.discovery_runs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Dedup-aware bulk upsert. Match order: place_id → cid → phone_norm.
--   * place_id / cid match  → refresh Google fields (never touches invite/claim/opt-out state).
--   * phone match only      → duplicate listing of a shop we already have (branch / re-listing): skipped.
--   * no match              → insert.
create or replace function public.upsert_discovered_suppliers(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r jsonb;
  v_id uuid;
  v_ins int := 0; v_upd int := 0; v_dup int := 0;
  v_pid text; v_cid text; v_pn text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_pid := nullif(r->>'place_id', '');
    v_cid := nullif(r->>'cid', '');
    v_pn  := nullif(r->>'phone_norm', '');
    v_id := null;
    if v_pid is not null then select id into v_id from discovered_suppliers where place_id = v_pid; end if;
    if v_id is null and v_cid is not null then select id into v_id from discovered_suppliers where cid = v_cid; end if;

    if v_id is not null then
      update discovered_suppliers set
        place_id       = coalesce(place_id, v_pid),
        cid            = coalesce(cid, v_cid),
        name           = coalesce(nullif(r->>'name', ''), name),
        address        = coalesce(nullif(r->>'address', ''), address),
        phone          = coalesce(nullif(r->>'phone', ''), phone),
        phone_norm     = coalesce(v_pn, phone_norm),
        is_mobile      = coalesce((r->>'is_mobile')::boolean, is_mobile),
        website        = coalesce(nullif(r->>'website', ''), website),
        lat            = coalesce((r->>'lat')::double precision, lat),
        lng            = coalesce((r->>'lng')::double precision, lng),
        google_rating  = coalesce((r->>'google_rating')::numeric, google_rating),
        google_reviews = coalesce((r->>'google_reviews')::int, google_reviews),
        maps_url       = coalesce(nullif(r->>'maps_url', ''), maps_url),
        status         = coalesce(nullif(r->>'status', ''), status),
        google_type    = coalesce(nullif(r->>'google_type', ''), google_type),
        city           = coalesce(city, nullif(r->>'city', '')),
        region         = coalesce(region, nullif(r->>'region', '')),
        district       = coalesce(district, nullif(r->>'district', '')),
        pack           = coalesce(pack, nullif(r->>'pack', '')),
        sector         = coalesce(sector, nullif(r->>'sector', '')),
        updated_at     = now()
      where id = v_id;
      v_upd := v_upd + 1;
      continue;
    end if;

    if v_pn is not null and exists (select 1 from discovered_suppliers where phone_norm = v_pn) then
      v_dup := v_dup + 1;
      continue;
    end if;

    insert into discovered_suppliers (
      place_id, cid, name, category, sector, pack, region, city, district, zone, address,
      phone, phone_norm, is_mobile, website, lat, lng, google_rating, google_reviews, maps_url,
      status, google_type, search_query, relevance, source, is_listed, created_by
    ) values (
      v_pid, v_cid, coalesce(nullif(r->>'name', ''), 'مورد'), nullif(r->>'category', ''),
      nullif(r->>'sector', ''), nullif(r->>'pack', ''), nullif(r->>'region', ''), nullif(r->>'city', ''),
      nullif(r->>'district', ''), nullif(r->>'zone', ''), nullif(r->>'address', ''),
      nullif(r->>'phone', ''), v_pn, coalesce((r->>'is_mobile')::boolean, false), nullif(r->>'website', ''),
      (r->>'lat')::double precision, (r->>'lng')::double precision, (r->>'google_rating')::numeric,
      (r->>'google_reviews')::int, nullif(r->>'maps_url', ''), nullif(r->>'status', ''),
      nullif(r->>'google_type', ''), nullif(r->>'search_query', ''),
      coalesce(nullif(r->>'relevance', ''), 'supplier'), coalesce(nullif(r->>'source', ''), 'places_api'),
      coalesce(nullif(r->>'relevance', ''), 'supplier') = 'supplier', auth.uid()
    );
    v_ins := v_ins + 1;
  end loop;
  return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'dup_phone', v_dup);
end; $$;
revoke all on function public.upsert_discovered_suppliers(jsonb) from public, anon;
grant execute on function public.upsert_discovered_suppliers(jsonb) to authenticated;

-- Record one individual invitation. Refuses opted-out shops and repeats inside the cooldown.
create or replace function public.mark_discovered_invited(p_id uuid, p_cooldown_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v discovered_suppliers%rowtype;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into v from discovered_suppliers where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v.opted_out then return jsonb_build_object('ok', false, 'reason', 'opted_out'); end if;
  if v.claimed_by is not null then return jsonb_build_object('ok', false, 'reason', 'registered'); end if;
  if v.invited_at is not null and v.invited_at > now() - make_interval(days => greatest(p_cooldown_days, 0)) then
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'invited_at', v.invited_at);
  end if;
  update discovered_suppliers
     set invited = true, invited_at = now(), invite_count = coalesce(invite_count, 0) + 1, updated_at = now()
   where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.mark_discovered_invited(uuid, int) from public, anon;
grant execute on function public.mark_discovered_invited(uuid, int) to authenticated;

-- Coverage stats for one city: totals, per pack, per district.
create or replace function public.discovery_stats(p_city text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  with s as (select * from discovered_suppliers where city = p_city and coalesce(relevance, 'supplier') <> 'contractor')
  select jsonb_build_object(
    'total',      (select count(*) from s),
    'mobile',     (select count(*) from s where is_mobile),
    'with_phone', (select count(*) from s where phone_norm is not null),
    'invited',    (select count(*) from s where invited),
    'registered', (select count(*) from s where claimed_by is not null),
    'opted_out',  (select count(*) from s where opted_out),
    'review',     (select count(*) from s where relevance = 'review'),
    'by_pack', coalesce((select jsonb_agg(x order by x->>'pack') from (
        select jsonb_build_object('pack', coalesce(pack, '_none'), 'total', count(*),
          'mobile', count(*) filter (where is_mobile), 'invited', count(*) filter (where invited),
          'registered', count(*) filter (where claimed_by is not null)) x
        from s group by pack) t), '[]'::jsonb),
    'by_district', coalesce((select jsonb_agg(x order by (x->>'total')::int desc) from (
        select jsonb_build_object('district', coalesce(district, '_none'), 'total', count(*),
          'mobile', count(*) filter (where is_mobile), 'invited', count(*) filter (where invited)) x
        from s group by district) t), '[]'::jsonb)
  ) into v;
  return v;
end; $$;
revoke all on function public.discovery_stats(text) from public, anon;
grant execute on function public.discovery_stats(text) to authenticated;

-- Public directory: suppliers only (never contractors / unreviewed noise / opted-out shops).
create or replace function public.get_directory_listings(p_region text default null, p_sector text default null)
returns table(
  id uuid, name text, category text, sector text, region text, city text,
  google_rating numeric, google_reviews integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select id, name, category, sector, region, city, google_rating, google_reviews
  from discovered_suppliers
  where is_listed and claimed_by is null and not coalesce(opted_out, false)
    and coalesce(relevance, 'supplier') = 'supplier'
    and (p_region is null or region = p_region)
    and (p_sector is null or sector = p_sector)
  order by google_rating desc nulls last, google_reviews desc nulls last, created_at desc
  limit 300;
$$;
revoke all on function public.get_directory_listings(text, text) from public;
grant execute on function public.get_directory_listings(text, text) to anon, authenticated;
