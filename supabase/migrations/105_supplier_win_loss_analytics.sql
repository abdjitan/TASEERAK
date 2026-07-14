-- 105: Supplier win/loss analytics — OWN DATA ONLY (H2: no competitor prices exposed).
-- Applied live 2026-07-12. Returns the calling supplier's funnel (offered→won/lost/pending),
-- win-rate by sector, and a 6-month trend. Scoped to auth.uid(); powers /supplier/analytics.
create or replace function public.get_my_supplier_analytics()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then return '{}'::jsonb; end if;

  with won_rfqs as (
    select rfq_id from offers where supplier_id = v_uid and status = 'accepted'
    union
    select rfq_id from rfq_item_awards where supplier_id = v_uid
  ),
  parts as (
    select r.id as rfq_id, r.sector::text as sector, r.status::text as rstatus,
           (r.id in (select rfq_id from won_rfqs)) as won,
           (r.status::text <> 'open') as decided
    from rfqs r
    where r.id in (select distinct rfq_id from offers where supplier_id = v_uid)
  )
  select jsonb_build_object(
    'total_offers', (select count(*) from offers where supplier_id = v_uid),
    'participated', (select count(*) from parts),
    'won', (select count(*) from parts where won),
    'lost', (select count(*) from parts where decided and not won),
    'pending', (select count(*) from parts where not decided and not won),
    'by_sector', (
      select coalesce(jsonb_agg(jsonb_build_object('sector', sector, 'won', w, 'lost', l, 'total', t) order by t desc), '[]'::jsonb)
      from (
        select sector,
               count(*) filter (where won) as w,
               count(*) filter (where decided and not won) as l,
               count(*) as t
        from parts group by sector
      ) s
    ),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('month', m, 'offers', offs, 'won', wn) order by m), '[]'::jsonb)
      from (
        select to_char(date_trunc('month', o.created_at), 'YYYY-MM') as m,
               count(*) as offs,
               count(*) filter (where o.status = 'accepted') as wn
        from offers o
        where o.supplier_id = v_uid and o.created_at >= (now() - interval '6 months')
        group by 1
      ) mm
    )
  ) into v_result;
  return v_result;
end; $$;
grant execute on function public.get_my_supplier_analytics() to authenticated;
