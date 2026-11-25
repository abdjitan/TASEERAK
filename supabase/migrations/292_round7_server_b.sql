-- 292 (round-7): public supplier profile returns vat_verified_at (badge); deal-closing notices say «بقرار فريق تسعيرك».
do $$
declare d text;
begin
  d := pg_get_functiondef('public.admin_close_deal(uuid, text)'::regprocedure);
  d := replace(d, 'بقرار الإدارة', 'بقرار فريق تسعيرك');
  execute d;
end $$;
drop function if exists public.get_supplier_public(uuid);
CREATE OR REPLACE FUNCTION public.get_supplier_public(p_id uuid)
 RETURNS TABLE(supplier_id uuid, company_name_ar text, company_name_en text, supplier_tier text, rating_avg numeric, rating_count integer, region text, city text, approvals text[], verification_status text, cr_verification_source text, total_offers bigint, won_deals bigint, member_since timestamp with time zone, recent_reviews jsonb, sectors text[], vat_verified_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.company_name_ar, p.company_name_en, p.supplier_tier::text, p.rating_avg, p.rating_count,
    p.region, p.city, p.approvals, p.verification_status::text, p.cr_verification_source,
    (select count(*) from offers o where o.supplier_id = p.id),
    (select count(distinct a.rfq_id) from rfq_item_awards a where a.supplier_id = p.id),
    p.created_at,
    (select coalesce(jsonb_agg(jsonb_build_object('rating', rv.rating, 'comment', rv.comment, 'created_at', rv.created_at)), '[]'::jsonb)
       from (select rating, comment, created_at from reviews
             where reviewed_id = p.id and comment is not null and btrim(comment) <> '' and rating is not null
             order by created_at desc limit 8) rv),
    (select coalesce(array_agg(distinct t.sector::text), '{}') from profile_specialties ps join taxonomy t on t.sub_key = ps.specialty where ps.profile_id = p.id),
    p.vat_verified_at
  from profiles p
  where p.id = p_id and p.role = 'supplier'
    and not p.is_test
    and coalesce(p.is_active, true)
    and (p.banned_until is null or p.banned_until < now())
    and coalesce(p.supplier_tier::text, '') <> 'independent'
    and (p.verification_status = 'verified' or exists (select 1 from offers o where o.supplier_id = p.id));
$function$;
grant execute on function public.get_supplier_public(uuid) to anon, authenticated;
