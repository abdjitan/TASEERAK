-- 233: new-request notifications also reach the active team members of a matched company (owner
-- 2026-11-19, persona review: a national sales force never heard about requests, only the owner
-- account did). Matching rules are unchanged (same as 190); members just follow their company.
create or replace function public.notify_suppliers_for_rfq(p_rfq_id uuid, p_only_new boolean default false)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare r rfqs; v_items jsonb; n integer;
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null or r.status <> 'open' then return 0; end if;
  v_items := case
    when r.items is not null and jsonb_typeof(r.items) = 'array' and jsonb_array_length(r.items) > 0 then r.items
    else jsonb_build_array(jsonb_build_object('sector', r.sector::text, 'sub_category', r.sub_category))
  end;
  with matched as (
    select distinct p.id
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
        not coalesce(r.nearby_only, false)
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
  ), targets as (
    select id from matched
    union
    select cm.user_id from company_members cm join matched m on m.id = cm.company_id
     where cm.status = 'active' and cm.removed_at is null and cm.user_id <> r.contractor_id
  )
  insert into notifications (user_id, type, title, body, data)
  select t.id, 'new_rfq'::notification_type,
         case when p_only_new then 'أُضيفت مواد تناسبك إلى طلب تسعير' else 'طلب تسعير جديد' end,
         public.rfq_label(r),
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || r.id::text, 'rfq_id', r.id)
  from targets t
  where (not p_only_new or not exists (
    select 1 from notifications x where x.user_id = t.id and x.type = 'new_rfq' and x.data->>'rfq_id' = r.id::text));
  get diagnostics n = row_count;
  return n;
end $function$;
