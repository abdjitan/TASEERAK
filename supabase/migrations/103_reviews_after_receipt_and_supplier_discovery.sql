-- 103: Ratings tied to receipt + supplier discovery (search/filters + public review comments)
-- Applied live 2026-07-12. This file mirrors the live DB (captured verbatim).

-- ── Gap 1 ── A review is only allowed AFTER the goods are received (received_at),
-- not merely when the offer is accepted. Enforced server-side (RLS), not just UI.
drop policy if exists "Insert review for own accepted deal" on public.reviews;
create policy "Insert review for own received deal" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and reviewer_id <> reviewed_id
    and exists (
      select 1 from offers o join rfqs r on r.id = o.rfq_id
      where o.id = reviews.offer_id
        and o.supplier_id = reviews.reviewed_id
        and r.contractor_id = auth.uid()
        and o.status = 'accepted'
        and o.received_at is not null
    )
  );

-- ── Gap 2 ── The public supplier profile also returns recent review comments.
-- SECURITY DEFINER so anonymous visitors can see them (reviews SELECT requires auth).
drop function if exists public.get_supplier_public(uuid);
create function public.get_supplier_public(p_id uuid)
returns table(supplier_id uuid, company_name_ar text, company_name_en text, supplier_tier text, rating_avg numeric, rating_count integer, region text, city text, approvals text[], verification_status text, cr_verification_source text, total_offers bigint, won_deals bigint, member_since timestamptz, recent_reviews jsonb)
language sql stable security definer set search_path to 'public'
as $$
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
    and (p.verification_status = 'verified' or exists (select 1 from offers o where o.supplier_id = p.id));
$$;
grant execute on function public.get_supplier_public(uuid) to anon, authenticated;

-- ── Gap 3 ── The leaderboard returns each supplier's sectors so the directory can
-- filter by sector (region/tier/verified filters are client-side on existing columns).
drop function if exists public.get_supplier_leaderboard();
create function public.get_supplier_leaderboard()
returns table(supplier_id uuid, company_name_ar text, supplier_tier text, rating_avg numeric, region text, city text, approvals text[], verification_status text, total_offers bigint, won_deals bigint, member_since timestamptz, sectors text[])
language sql stable security definer set search_path to 'public'
as $$
  select p.id, p.company_name_ar, p.supplier_tier::text, p.rating_avg, p.region, p.city, p.approvals, p.verification_status::text,
    (select count(*) from offers o where o.supplier_id = p.id),
    (select count(distinct a.rfq_id) from rfq_item_awards a where a.supplier_id = p.id),
    p.created_at,
    (select coalesce(array_agg(ps.sector::text), '{}') from profile_sectors ps where ps.profile_id = p.id)
  from profiles p
  where p.role = 'supplier'
    and (p.verification_status = 'verified' or exists (select 1 from offers o where o.supplier_id = p.id))
  order by (p.verification_status = 'verified') desc, coalesce(p.rating_avg,0) desc, p.created_at asc;
$$;
grant execute on function public.get_supplier_leaderboard() to anon, authenticated;
