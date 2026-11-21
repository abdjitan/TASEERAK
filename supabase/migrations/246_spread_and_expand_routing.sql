-- 246: (owner 2026-11-21)
--  1) «كل المنطقة»: up to app_config.rfq_max_recipients (now 100), SPREAD over the region (one supplier
--     per ~11 km grid cell in turn, so the far side of the city gets the request too), verified first
--     inside a cell. «الأقرب إليّ» stays nearest-first (20).
--  2) Expansion: notify_suppliers_for_rfq(id, only_new, extra) reaches `extra` more suppliers beyond the
--     current recipients (next nearest / next cells). Used by:
--     * auto: every 30 min, an open request with fewer than 3 offers whose last batch went out more
--       than app_config.rfq_expand_after_hours (3) ago gets +rfq_expand_batch (20), at most 3 times;
--     * the buyer: «ابحث عن موردين آخرين» (request_more_suppliers), at most 3 times, 1 h apart.
update public.app_config set rfq_max_recipients = 100 where rfq_max_recipients = 50;
alter table public.app_config alter column rfq_max_recipients set default 100;
alter table public.app_config add column if not exists rfq_expand_after_hours int not null default 3;
alter table public.app_config add column if not exists rfq_expand_batch int not null default 20;

create table if not exists public.rfq_expansions (
  id bigserial primary key,
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  source text not null check (source in ('auto', 'buyer')),
  added int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists rfq_expansions_rfq on public.rfq_expansions (rfq_id, created_at desc);
alter table public.rfq_expansions enable row level security;
drop policy if exists rfq_expansions_read on public.rfq_expansions;
create policy rfq_expansions_read on public.rfq_expansions for select to authenticated
  using (public.is_admin() or exists (select 1 from rfqs r where r.id = rfq_id and r.contractor_id = auth.uid()));
revoke insert, update, delete on public.rfq_expansions from anon, authenticated;

drop function if exists public.notify_suppliers_for_rfq(uuid, boolean);
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
           random() as rnd
    from matched m
  ), ranked as (
    select s.*, row_number() over (partition by s.cell order by s.verified desc, s.rnd) as cell_rank from scored s
  ), chosen as (
    select id, d from ranked
    order by already desc,
             case when v_nearby then coalesce(d, 1e9) else 0 end,   -- nearby: nearest first
             case when v_nearby then 0 else cell_rank end,          -- region: one per cell in turn
             verified desc, rnd
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

-- one expansion step; returns how many new suppliers were reached
create or replace function public.expand_rfq_recipients(p_rfq_id uuid, p_source text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_before int; v_after int; v_batch int;
begin
  select coalesce(rfq_expand_batch, 20) into v_batch from app_config limit 1;
  select count(*) into v_before from rfq_recipients where rfq_id = p_rfq_id;
  perform public.notify_suppliers_for_rfq(p_rfq_id, false, coalesce(v_batch, 20));
  select count(*) into v_after from rfq_recipients where rfq_id = p_rfq_id;
  insert into rfq_expansions (rfq_id, source, added) values (p_rfq_id, p_source, v_after - v_before);
  return v_after - v_before;
end $$;
revoke all on function public.expand_rfq_recipients(uuid, text) from public, anon, authenticated;

-- the buyer asks for more suppliers
create or replace function public.request_more_suppliers(p_rfq_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r rfqs; v_n int; v_last timestamptz; v_cnt int;
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null or r.contractor_id <> auth.uid() then raise exception 'not_owner'; end if;
  if r.status::text <> 'open' or (r.expires_at is not null and r.expires_at <= now()) then
    raise exception 'هذا الطلب لم يعد مفتوحاً.' using hint = 'NOT_OPEN';
  end if;
  select count(*), max(created_at) into v_cnt, v_last from rfq_expansions where rfq_id = p_rfq_id and source = 'buyer';
  if v_cnt >= 3 then raise exception 'وصل طلبك إلى أقصى عدد من الموردين المتاحين لهذه المرة.' using hint = 'MAX_EXPANSIONS'; end if;
  if v_last is not null and v_last > now() - interval '1 hour' then
    raise exception 'أرسلنا طلبك إلى موردين إضافيين قبل قليل. انتظر ساعة ثم حاول مجدداً.' using hint = 'TOO_SOON';
  end if;
  v_n := public.expand_rfq_recipients(p_rfq_id, 'buyer');
  return jsonb_build_object('added', v_n);
end $$;
revoke all on function public.request_more_suppliers(uuid) from public, anon;
grant execute on function public.request_more_suppliers(uuid) to authenticated;

-- automatic widening when the first suppliers don't price in time
create or replace function public.auto_expand_rfqs()
returns integer language plpgsql security definer set search_path = public as $$
declare x record; v_after int; v_done int := 0;
begin
  select coalesce(rfq_expand_after_hours, 3) into v_after from app_config limit 1;
  for x in
    select r.id from rfqs r
     where r.status::text = 'open'
       and (r.expires_at is null or r.expires_at > now() + interval '1 hour')
       and exists (select 1 from rfq_recipients rr where rr.rfq_id = r.id)
       and (select count(*) from offers o where o.rfq_id = r.id) < 3
       and (select count(*) from rfq_expansions e where e.rfq_id = r.id and e.source = 'auto') < 3
       and greatest(coalesce((select max(e.created_at) from rfq_expansions e where e.rfq_id = r.id), r.created_at), r.created_at)
           < now() - make_interval(hours => greatest(coalesce(v_after, 3), 1))
     limit 50
  loop
    perform public.expand_rfq_recipients(x.id, 'auto');
    v_done := v_done + 1;
  end loop;
  return v_done;
end $$;
revoke all on function public.auto_expand_rfqs() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('auto-expand-rfqs') where exists (select 1 from cron.job where jobname = 'auto-expand-rfqs');
  perform cron.schedule('auto-expand-rfqs', '*/30 * * * *', 'select public.auto_expand_rfqs()');
end $$;
