-- 252: what buyers request most, per sub-category (owner 2026-11-22: order the home screen sections by
-- demand, mostly what homes ask for). Counts only (no names, no amounts), last 180 days, split into
-- home buyers (buyer_type = 'individual') and everyone. The client maps sub-categories to sections.
create or replace function public.get_section_demand()
returns table (sub text, n_home int, n_all int)
language sql stable security definer set search_path = public as $$
  select x.sub,
         count(*) filter (where x.buyer_type = 'individual')::int as n_home,
         count(*)::int as n_all
  from (
    select coalesce(nullif(i->>'sub_category', ''), r.sub_category) as sub, p.buyer_type
    from rfqs r
    join profiles p on p.id = r.contractor_id
    left join lateral jsonb_array_elements(case when jsonb_typeof(r.items) = 'array' then r.items else '[]'::jsonb end) i on true
    where r.created_at > now() - interval '180 days'
      and coalesce(p.role::text, '') <> 'admin'
  ) x
  where x.sub is not null
  group by x.sub
$$;
revoke all on function public.get_section_demand() from public, anon;
grant execute on function public.get_section_demand() to authenticated;
