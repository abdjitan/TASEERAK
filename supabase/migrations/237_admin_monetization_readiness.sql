-- 237: «جاهزية الاشتراكات» (owner 2026-11-19). The numbers that decide when paid plans can start,
-- for the last 30 days and the 30 days before (both must pass two months in a row):
--   liquid_pct          requests (older than 48 h) that got 3+ offers within 48 h      target 70%
--   requests            requests posted                                                 target 150
--   active_buyers       buyers who posted                                               target 60
--   returning_pct       of those buyers, % who had also posted in the 60 days before    target 30%
--   deals               deals the buyer confirmed as received                           target 50
--   active_suppliers    sellers who sent at least one offer                             target 100
--   supplier_retention  of the previous window's active sellers, % active again         target 60%
-- Test accounts excluded unless p_include_test. Admin only.
create or replace function public.admin_monetization_readiness(p_include_test boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_now timestamptz := now(); res jsonb := '[]'::jsonb; w int; s timestamptz; e timestamptz; o jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  for w in 0..1 loop
    e := v_now - make_interval(days => 30 * w);
    s := e - interval '30 days';
    with real_p as (select id from profiles where p_include_test or not coalesce(is_test, false)),
    reqs as (select r.* from rfqs r join real_p p on p.id = r.contractor_id where r.created_at >= s and r.created_at < e),
    liquid as (
      select r.id, (select count(*) from offers o join real_p p on p.id = o.supplier_id
                     where o.rfq_id = r.id and o.created_at <= r.created_at + interval '48 hours') as n48
        from reqs r where r.created_at <= v_now - interval '48 hours'),
    buyers as (select distinct contractor_id as id from reqs),
    ret_buyers as (select b.id from buyers b where exists (
        select 1 from rfqs x where x.contractor_id = b.id and x.created_at >= s - interval '60 days' and x.created_at < s)),
    sup_now as (select distinct o.supplier_id as id from offers o join real_p p on p.id = o.supplier_id where o.created_at >= s and o.created_at < e),
    sup_prev as (select distinct o.supplier_id as id from offers o join real_p p on p.id = o.supplier_id
                  where o.created_at >= s - interval '30 days' and o.created_at < s),
    deals as (select o.id from offers o join rfqs r on r.id = o.rfq_id join real_p p on p.id = r.contractor_id
               where o.received_at >= s and o.received_at < e)
    select jsonb_build_object(
      'from', s, 'to', e,
      'liquid_pct', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where n48 >= 3) / count(*), 1) end from liquid),
      'liquid_base', (select count(*) from liquid),
      'requests', (select count(*) from reqs),
      'active_buyers', (select count(*) from buyers),
      'returning_pct', (select case when (select count(*) from buyers) = 0 then null else round(100.0 * (select count(*) from ret_buyers) / (select count(*) from buyers), 1) end),
      'deals', (select count(*) from deals),
      'active_suppliers', (select count(*) from sup_now),
      'supplier_retention_pct', (select case when (select count(*) from sup_prev) = 0 then null
                                   else round(100.0 * (select count(*) from sup_prev sp where sp.id in (select id from sup_now)) / (select count(*) from sup_prev), 1) end)
    ) into o;
    res := res || jsonb_build_array(o);
  end loop;
  return jsonb_build_object('windows', res, 'targets', jsonb_build_object(
    'liquid_pct', 70, 'requests', 150, 'active_buyers', 60, 'returning_pct', 30, 'deals', 50, 'active_suppliers', 100, 'supplier_retention_pct', 60));
end $$;
revoke all on function public.admin_monetization_readiness(boolean) from public, anon;
grant execute on function public.admin_monetization_readiness(boolean) to authenticated;
