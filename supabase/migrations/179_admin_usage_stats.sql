-- 179: what buyers actually use (owner 2026-10-31): the admin sees the most-requested and most-awarded
-- materials, how requests are made (single / multi-item / project / photo / hand-written line) and
-- which options are chosen, plus searches that found nothing. Admin-only, read-only.
create or replace function public.admin_usage_stats(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)));
  r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  with rq as (
    select r.*, case when jsonb_typeof(r.items) = 'array' then r.items else '[]'::jsonb end as its
    from rfqs r where r.created_at >= v_from
  ), lines as (
    select rq.id as rfq_id, e.value as it from rq, jsonb_array_elements(rq.its) e
  ), proj as (
    select distinct rfq_id from project_rfq_items where rfq_id is not null
  )
  select jsonb_build_object(
    'days', p_days,
    'requests', (select count(*) from rq),
    'buyers', (select count(distinct contractor_id) from rq),
    'kinds', jsonb_build_object(
      'project', (select count(*) from rq where id in (select rfq_id from proj)),
      'multi', (select count(*) from rq where jsonb_array_length(its) > 1 and id not in (select rfq_id from proj)),
      'single', (select count(*) from rq where jsonb_array_length(its) <= 1 and id not in (select rfq_id from proj)),
      'with_photo', (select count(distinct rfq_id) from lines where coalesce(it->>'photo_url', '') <> ''),
      'handwritten_lines', (select count(*) from lines where coalesce((it->>'custom')::boolean, false)),
      'lines', (select count(*) from lines)
    ),
    'options', jsonb_build_object(
      'tier_chosen', (select count(*) from rq where target_tiers is not null),
      'verified_only', (select count(*) from rq where verified_only),
      'hide_identity', (select count(*) from rq where hide_identity),
      'vat_invoice', (select count(*) from rq where vat_invoice_required),
      'pickup', (select count(*) from rq where delivery_required = false)
    ),
    'top_requested', coalesce((select jsonb_agg(x) from (
      select it->>'product_name' as name, count(distinct rfq_id) as requests
      from lines where coalesce(it->>'product_name', '') <> ''
      group by 1 order by 2 desc, 1 limit 20) x), '[]'::jsonb),
    'top_awarded', coalesce((select jsonb_agg(x) from (
      select coalesce(r.items -> a.item_index ->> 'product_name', r.product_name) as name, count(*) as awards, round(sum(a.total)) as total
      from rfq_item_awards a join rfqs r on r.id = a.rfq_id
      where a.awarded_at >= v_from group by 1 order by 2 desc, 3 desc limit 20) x), '[]'::jsonb),
    'top_sections', coalesce((select jsonb_agg(x) from (
      select coalesce(it->>'sector', '?') as sector, count(*) as lines
      from lines group by 1 order by 2 desc) x), '[]'::jsonb),
    'no_result_searches', coalesce((select jsonb_agg(x) from (
      select min(query) as query, count(*) as times
      from search_events where action = 'no_result' and created_at >= v_from
      group by query_norm order by 2 desc limit 15) x), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_usage_stats(int) from public, anon;
grant execute on function public.admin_usage_stats(int) to authenticated;
