-- 245: send a request to the NEAREST matching suppliers, never to every shop (owner 2026-11-21).
--  * «الموردون القريبون مني» (nearby_only + a delivery point): the nearest matching suppliers by real
--    distance (shop pin or any branch pin), as many as app_config.rfq_nearby_target (20). No fixed
--    radius: if the nearest is 1 km or 40 km away, it still gets it; the circle grows until the target.
--  * «كل المنطقة» (default): at most app_config.rfq_max_recipients (50) matching suppliers, nearest
--    first when a delivery point exists, otherwise verified first then random (fair rotation).
--  * The chosen suppliers are stored in rfq_recipients; the supplier feed then shows a request only
--    to its recipients (older requests without recipients behave as before).
alter table public.app_config add column if not exists rfq_nearby_target int not null default 20;
alter table public.app_config add column if not exists rfq_max_recipients int not null default 50;

create table if not exists public.rfq_recipients (
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  distance_km numeric,
  created_at timestamptz not null default now(),
  primary key (rfq_id, supplier_id)
);
create index if not exists rfq_recipients_supplier on public.rfq_recipients (supplier_id);
alter table public.rfq_recipients enable row level security;
drop policy if exists rfq_recipients_read on public.rfq_recipients;
create policy rfq_recipients_read on public.rfq_recipients for select to authenticated
  using (supplier_id = public.acting_uid() or public.is_admin());
revoke insert, update, delete on public.rfq_recipients from anon, authenticated;

create or replace function public.km_between(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision language sql immutable set search_path = public as $$
  select case when a_lat is null or a_lng is null or b_lat is null or b_lng is null then null else
    2 * 6371 * asin(sqrt(power(sin(radians(b_lat - a_lat) / 2), 2)
      + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2))) end
$$;

-- distance from a point to a supplier: its own pin or the nearest of its branches
create or replace function public.supplier_distance_km(p_supplier uuid, p_lat double precision, p_lng double precision)
returns double precision language sql stable security definer set search_path = public as $$
  select min(d) from (
    select public.km_between(p_lat, p_lng, p.latitude::double precision, p.longitude::double precision) as d from profiles p where p.id = p_supplier
    union all
    select public.km_between(p_lat, p_lng, b.latitude, b.longitude) from branches b where b.supplier_id = p_supplier
  ) x
$$;
revoke all on function public.supplier_distance_km(uuid, double precision, double precision) from public, anon, authenticated;

create or replace function public.notify_suppliers_for_rfq(p_rfq_id uuid, p_only_new boolean default false)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare r rfqs; v_items jsonb; n integer; v_geo text; v_lat double precision; v_lng double precision;
  v_has_geo boolean := false; v_limit int; v_target int; v_max int;
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null or r.status <> 'open' then return 0; end if;
  v_items := case
    when r.items is not null and jsonb_typeof(r.items) = 'array' and jsonb_array_length(r.items) > 0 then r.items
    else jsonb_build_array(jsonb_build_object('sector', r.sector::text, 'sub_category', r.sub_category))
  end;
  begin
    select delivery_geo into v_geo from rfq_private where rfq_id = r.id;
    if coalesce(v_geo, '') ~ '^\s*-?[0-9.]+\s*,\s*-?[0-9.]+\s*$' then
      v_lat := split_part(v_geo, ',', 1)::double precision; v_lng := split_part(v_geo, ',', 2)::double precision; v_has_geo := true;
    end if;
  exception when others then v_has_geo := false; end;
  select coalesce(rfq_nearby_target, 20), coalesce(rfq_max_recipients, 50) into v_target, v_max from app_config limit 1;
  v_target := coalesce(v_target, 20); v_max := coalesce(v_max, 50);
  v_limit := case when coalesce(r.nearby_only, false) and v_has_geo then v_target else v_max end;

  with matched as (
    select distinct p.id, p.verification_status::text = 'verified' as verified
    from profiles p
    where p.role::text = 'supplier'
      and p.employer_id is null
      and coalesce(p.is_active, true)
      and p.id <> r.contractor_id
      and (not coalesce(r.verified_only, false) or p.verification_status::text = 'verified')
      and (r.target_tiers is null or coalesce(p.supplier_tier, 'shop') = any(r.target_tiers))
      and (
        r.target_regions is null
        or p.region = any(r.target_regions)
        or exists (select 1 from branches b where b.supplier_id = p.id and b.region = any(r.target_regions))
      )
      -- nearby without a delivery point: same region (as before); with a point: ranked by distance below
      and (
        not coalesce(r.nearby_only, false) or v_has_geo
        or p.region = r.region
        or exists (select 1 from branches b where b.supplier_id = p.id and b.region = r.region)
      )
      and exists (
        select 1
        from jsonb_array_elements(v_items) it
        where exists (
                select 1 from profile_sectors ps
                where ps.profile_id = p.id and ps.sector::text = (it->>'sector')
              )
          and (
                not exists (select 1 from profile_specialties psp where psp.profile_id = p.id)
                or coalesce(it->>'sub_category', '') = ''
                or exists (select 1 from profile_specialties psp
                           where psp.profile_id = p.id and psp.specialty = (it->>'sub_category'))
              )
          and (
                it->'supplier_tiers' is null
                or jsonb_typeof(it->'supplier_tiers') <> 'array'
                or jsonb_array_length(it->'supplier_tiers') = 0
                or coalesce(p.supplier_tier, 'shop') in (select jsonb_array_elements_text(it->'supplier_tiers'))
              )
      )
  ), scored as (
    select m.id, m.verified,
           case when v_has_geo then public.supplier_distance_km(m.id, v_lat, v_lng) end as d,
           exists (select 1 from rfq_recipients x where x.rfq_id = r.id and x.supplier_id = m.id) as already
    from matched m
  ), chosen as (
    -- keep earlier recipients (an edit must not drop them), then fill up to the limit
    select id, d from scored
    order by already desc,
             case when v_has_geo then coalesce(d, 1e9) else 0 end,
             verified desc, random()
    limit greatest(v_limit, (select count(*) from scored where already))
  ), saved as (
    insert into rfq_recipients (rfq_id, supplier_id, distance_km)
    select r.id, c.id, round(c.d::numeric, 1) from chosen c
    on conflict (rfq_id, supplier_id) do nothing
    returning supplier_id
  ), targets as (
    select id from chosen
    union
    select cm.user_id from company_members cm join chosen c on c.id = cm.company_id
     where cm.status = 'active' and cm.removed_at is null and cm.user_id <> r.contractor_id
  )
  insert into notifications (user_id, type, title, body, data)
  select t.id, 'new_rfq'::notification_type,
         case when p_only_new then 'أُضيفت مواد تناسبك إلى طلب تسعير' else 'طلب تسعير جديد' end,
         public.rfq_label(r),
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || r.id::text, 'rfq_id', r.id)
  from targets t
  where not exists (select 1 from notifications x where x.user_id = t.id and x.type = 'new_rfq' and x.data->>'rfq_id' = r.id::text)
    and (select count(*) from saved) >= 0;
  get diagnostics n = row_count;
  return n;
end $function$;

-- the supplier feed: a request that has recipients is shown only to them
create or replace function public.get_supplier_feed(p_sectors text[] default null::text[], p_min_value numeric default 0, p_limit integer default 150)
returns setof jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_act uuid := public.acting_uid(); v_served text[]; v_tier text; v_verified boolean;
begin
  if v_act is null then return; end if;
  select coalesce(supplier_tier, 'shop'), verification_status::text = 'verified' into v_tier, v_verified
    from profiles where id = v_act;
  v_served := public.served_regions(v_act);
  return query
  select (to_jsonb(r) - 'contractor_id' - 'delivery_location' - 'delivery_geo')
         || jsonb_build_object('contractor', jsonb_build_object('contractor_grade', p.contractor_grade))
    from rfqs r
    left join profiles p on p.id = r.contractor_id
   where r.status = 'open'
     and (r.expires_at is null or r.expires_at > now())
     and r.contractor_id <> v_act
     and (p_sectors is null or cardinality(p_sectors) = 0 or r.sectors && p_sectors)
     and (coalesce(p_min_value, 0) <= 0 or r.estimated_value is null or r.estimated_value >= p_min_value)
     and (not coalesce(r.verified_only, false) or v_verified)
     and (r.target_tiers is null or cardinality(r.target_tiers) = 0 or v_tier = any(r.target_tiers))
     and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
     and (
       exists (select 1 from rfq_recipients x where x.rfq_id = r.id and x.supplier_id = v_act)
       or (not exists (select 1 from rfq_recipients x where x.rfq_id = r.id)
           and (coalesce(r.nearby_only, false) = false or cardinality(v_served) = 0 or r.region = any(v_served)))
     )
     and not exists (select 1 from rfq_dismissals d where d.rfq_id = r.id and d.supplier_id = v_act)
   order by r.created_at desc
   limit least(greatest(coalesce(p_limit, 150), 1), 300);
end $function$;
