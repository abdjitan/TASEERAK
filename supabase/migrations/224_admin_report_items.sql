-- «تقرير الأداء» (owner 2026-11-17): what buyers bought and what sellers offer, by material.
--   bought:  awarded items of accepted deals (confirmed = the buyer confirmed receipt)
--   offered: materials priced in offers (how many offers, sellers, average unit price)
create or replace function public.admin_report_items(p_include_test boolean default false, p_days int default 3650)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb; v_from timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 3650), 1));
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'bought', coalesce((select jsonb_agg(x order by x.value desc) from (
        select a.item_key as product, count(*) as lines, count(distinct o.id) as deals,
               sum(coalesce(a.quantity, 0)) as quantity, max(a.unit) as unit, round(sum(coalesce(a.total, 0))) as value,
               count(*) filter (where o.received_at is not null) as confirmed
          from rfq_item_awards a
          join offers o on o.id = a.offer_id and o.status = 'accepted'
          join rfqs q on q.id = a.rfq_id
          join profiles b on b.id = q.contractor_id and (p_include_test or not coalesce(b.is_test, false))
         where o.accepted_at >= v_from
         group by a.item_key order by sum(coalesce(a.total, 0)) desc limit 30) x), '[]'::jsonb),
    'offered', coalesce((select jsonb_agg(y order by y.offers desc) from (
        select e->>'product_name' as product, count(distinct o.id) as offers, count(distinct o.supplier_id) as sellers,
               round(avg(nullif(e->>'unit_price', '')::numeric), 2) as avg_unit_price, max(e->>'unit') as unit
          from offers o
          join profiles s on s.id = o.supplier_id and (p_include_test or not coalesce(s.is_test, false))
          cross join lateral jsonb_array_elements(case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end) e
         where o.created_at >= v_from and coalesce(e->>'product_name', '') <> ''
         group by e->>'product_name' order by count(distinct o.id) desc limit 30) y), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_report_items(boolean, int) from public, anon;
grant execute on function public.admin_report_items(boolean, int) to authenticated;
