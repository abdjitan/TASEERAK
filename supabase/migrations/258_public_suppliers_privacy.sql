-- 258 (UX audit UX-003, critical privacy/PDPL): the public suppliers page showed a test account as
-- «موثّق» and published individual pricing agents' names and cities to anyone (and search engines).
-- Public lists now show only real, active, unbanned COMPANIES/SHOPS; an independent (a private person)
-- is never listed publicly. «Test Supplier» is flagged as a test account.
update profiles set is_test = true where id = 'a89aedbd-8116-4de0-826d-1f3ad1758cad' and company_name_ar = 'Test Supplier';

create or replace function public.get_supplier_leaderboard()
returns table(supplier_id uuid, company_name_ar text, supplier_tier text, rating_avg numeric, region text, city text, approvals text[], verification_status text, total_offers bigint, won_deals bigint, member_since timestamptz, sectors text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.company_name_ar, p.supplier_tier::text, p.rating_avg, p.region, p.city, p.approvals, p.verification_status::text,
    (select count(*) from offers o where o.supplier_id = p.id),
    (select count(distinct a.rfq_id) from rfq_item_awards a where a.supplier_id = p.id),
    p.created_at,
    (select coalesce(array_agg(ps.sector::text), '{}') from profile_sectors ps where ps.profile_id = p.id)
  from profiles p
  where p.role = 'supplier'
    and not p.is_test
    and coalesce(p.is_active, true)
    and (p.banned_until is null or p.banned_until < now())
    and coalesce(p.supplier_tier::text, '') <> 'independent'
    and (p.verification_status = 'verified' or exists (select 1 from offers o where o.supplier_id = p.id))
  order by (p.verification_status = 'verified') desc, coalesce(p.rating_avg,0) desc, p.created_at asc;
$$;

create or replace function public.get_supplier_public(p_id uuid)
returns table(supplier_id uuid, company_name_ar text, company_name_en text, supplier_tier text, rating_avg numeric, rating_count integer, region text, city text, approvals text[], verification_status text, cr_verification_source text, total_offers bigint, won_deals bigint, member_since timestamptz, recent_reviews jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, p.company_name_ar, p.company_name_en, p.supplier_tier::text, p.rating_avg, p.rating_count,
    p.region, p.city, p.approvals, p.verification_status::text, p.cr_verification_source,
    (select count(*) from offers o where o.supplier_id = p.id),
    (select count(distinct a.rfq_id) from rfq_item_awards a where a.supplier_id = p.id),
    p.created_at,
    (select coalesce(jsonb_agg(jsonb_build_object('rating', rv.rating, 'comment', rv.comment, 'created_at', rv.created_at)), '[]'::jsonb)
       from (select rating, comment, created_at from reviews
             where reviewed_id = p.id and comment is not null and btrim(comment) <> '' and rating is not null
             order by created_at desc limit 8) rv)
  from profiles p
  where p.id = p_id and p.role = 'supplier'
    and not p.is_test
    and coalesce(p.is_active, true)
    and (p.banned_until is null or p.banned_until < now())
    and coalesce(p.supplier_tier::text, '') <> 'independent'
    and (p.verification_status = 'verified' or exists (select 1 from offers o where o.supplier_id = p.id));
$$;
