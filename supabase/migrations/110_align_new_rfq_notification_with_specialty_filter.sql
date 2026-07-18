-- Notification over-fire fix: the trigger notified every supplier whose PROFILE SECTOR
-- matched the RFQ, but the supplier feed then hides items outside their SPECIALTY
-- (profile_specialties) — so suppliers were pinged about RFQs that show them zero
-- priceable items. Align the trigger to the feed: notify only if at least one RFQ item
-- is actually VISIBLE to the supplier (sector served + specialty matches-or-unset +
-- per-item supplier_tiers). RFQ-level targeting (verified_only/target_tiers/regions/
-- nearby_only) is unchanged. INSERT-only trigger — existing RFQs unaffected.
create or replace function public.notify_suppliers_new_rfq()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_body text;
  v_items jsonb;
begin
  if new.status <> 'open' then return new; end if;
  v_body := coalesce(new.title, new.product_name, 'طلب تسعير جديد');
  -- legacy single-item RFQs (no items array): synthesize one item from the top-level cols
  v_items := case
    when new.items is not null and jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 0
      then new.items
    else jsonb_build_array(jsonb_build_object('sector', new.sector::text, 'sub_category', new.sub_category))
  end;

  insert into notifications (user_id, type, title, body, data)
  select distinct p.id, 'new_rfq'::notification_type,
         'طلب تسعير جديد', v_body,
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.id::text, 'rfq_id', new.id)
  from profiles p
  where p.role::text = 'supplier'
    and coalesce(p.is_active, true)
    and p.id <> new.contractor_id
    -- RFQ-level targeting (unchanged)
    and (not coalesce(new.verified_only, false) or p.verification_status::text = 'verified')
    and (new.target_tiers is null or coalesce(p.supplier_tier, 'local') = any(new.target_tiers))
    and (
      new.target_regions is null
      or p.region = any(new.target_regions)
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = any(new.target_regions))
    )
    and (
      not coalesce(new.nearby_only, false)
      or p.region = new.region
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = new.region)
    )
    -- NEW: at least one item is actually visible to this supplier (mirrors the feed filter)
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
              or coalesce(p.supplier_tier, 'local') in (select jsonb_array_elements_text(it->'supplier_tiers'))
            )
    );
  return new;
end;
$$;
