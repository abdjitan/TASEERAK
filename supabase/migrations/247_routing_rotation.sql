-- 247: variety (owner 2026-11-21): a request must not always reach the same suppliers.
-- Nearby: the 5 nearest always get it, the rest come from the nearest pool (2x the target) by rotation:
-- suppliers that received fewer requests in the last 7 days go first. Region: one per cell in turn,
-- least-loaded first inside each cell (no more verified-first, which always picked the same shops).
create or replace function public.notify_suppliers_for_rfq(p_rfq_id uuid, p_only_new boolean default false, p_extra int default 0)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare r rfqs; v_items jsonb; n integer; v_geo text; v_lat double precision; v_lng double precision;
  v_has_geo boolean := false; v_limit int; v_target int; v_max int; v_nearby boolean; v_have int;
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
  select coalesce(rfq_nearby_target, 20), coalesce(rfq_max_recipients, 100) into v_target, v_max from app_config limit 1;
  v_target := coalesce(v_target, 20); v_max := coalesce(v_max, 100);
  v_nearby := coalesce(r.nearby_only, false) and v_has_geo;
  select count(*) into v_have from rfq_recipients where rfq_id = r.id;
  v_limit := greatest(case when v_nearby then v_target else v_max end, v_have + greatest(coalesce(p_extra, 0), 0));

  with matched as (
    select distinct p.id, p.verification_status::text = 'verified' as verified,
           coalesce(round(p.latitude * 10)::text || ',' || round(p.longitude * 10)::text, 'c:' || coalesce(p.city, p.region, '?')) as cell
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
    select m.id, m.verified, m.cell,
           case when v_has_geo then public.supplier_distance_km(m.id, v_lat, v_lng) end as d,
           exists (select 1 from rfq_recipients x where x.rfq_id = r.id and x.supplier_id = m.id) as already,
           random() as rnd,
           -- how many requests this supplier received in the last 7 days: fewer = more likely now (rotation)
           (select count(*) from rfq_recipients x7 where x7.supplier_id = m.id and x7.created_at > now() - interval '7 days') as load7
    from matched m
  ), ranked as (
    select s.*,
           row_number() over (partition by s.cell order by s.load7, s.rnd) as cell_rank,
           row_number() over (order by coalesce(s.d, 1e9)) as near_rank
    from scored s
  ), chosen as (
    -- nearby: the 5 nearest always, then the rest of the nearest pool (2x the target) by rotation
    -- region: one supplier per cell in turn, the least-loaded first inside each cell
    select id, d from ranked
    where not v_nearby or already or near_rank <= greatest(v_limit * 2, v_limit + 10)
    order by already desc,
             case when v_nearby then (case when near_rank <= 5 then 0 else 1 end) else 0 end,
             case when v_nearby then load7 else cell_rank end,
             case when v_nearby then coalesce(d, 1e9) else 0 end,
             rnd
    limit v_limit
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
revoke all on function public.notify_suppliers_for_rfq(uuid, boolean, int) from public, anon, authenticated;
