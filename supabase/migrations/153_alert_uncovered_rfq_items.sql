-- Buyer ↔ supplier linkage safety net (2026-10-15).
-- notify_suppliers_new_rfq() sends a new request to every matching supplier, but when an item
-- matches nobody (no supplier holds that sector/specialty in that region/tier) the request goes
-- nowhere silently. This counts the matching suppliers per item with the SAME rules and, when an
-- item has none, alerts the admins with the item names so a supplier can be found.

create or replace function public.count_matching_suppliers(r public.rfqs, it jsonb)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(distinct p.id)::int
  from profiles p
  where p.role::text = 'supplier'
    and p.employer_id is null
    and coalesce(p.is_active, true)
    and p.id <> r.contractor_id
    and (not coalesce(r.verified_only, false) or p.verification_status::text = 'verified')
    and (r.target_tiers is null or coalesce(p.supplier_tier, 'shop') = any(r.target_tiers))
    and (r.target_regions is null or p.region = any(r.target_regions)
         or exists (select 1 from branches b where b.supplier_id = p.id and b.region = any(r.target_regions)))
    and (not coalesce(r.nearby_only, false) or p.region = r.region
         or exists (select 1 from branches b where b.supplier_id = p.id and b.region = r.region))
    and exists (select 1 from profile_sectors ps where ps.profile_id = p.id and ps.sector::text = (it->>'sector'))
    and (not exists (select 1 from profile_specialties psp where psp.profile_id = p.id)
         or coalesce(it->>'sub_category', '') = ''
         or exists (select 1 from profile_specialties psp where psp.profile_id = p.id and psp.specialty = (it->>'sub_category')))
    and (it->'supplier_tiers' is null or jsonb_typeof(it->'supplier_tiers') <> 'array'
         or jsonb_array_length(it->'supplier_tiers') = 0
         or coalesce(p.supplier_tier, 'shop') in (select jsonb_array_elements_text(it->'supplier_tiers')))
$$;
revoke all on function public.count_matching_suppliers(public.rfqs, jsonb) from public, anon, authenticated;

create or replace function public.alert_uncovered_rfq_items()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_items jsonb;
  v_missing text;
begin
  if new.status <> 'open' then return new; end if;
  v_items := case
    when new.items is not null and jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 0 then new.items
    else jsonb_build_array(jsonb_build_object('sector', new.sector::text, 'sub_category', new.sub_category, 'product_name', new.product_name))
  end;
  select string_agg(coalesce(nullif(it->>'product_name', ''), it->>'sub_category', '?'), '، ')
    into v_missing
  from jsonb_array_elements(v_items) it
  where public.count_matching_suppliers(new, it) = 0;

  if v_missing is not null then
    insert into notifications (user_id, type, title, body, data)
    select a.id, 'new_rfq'::notification_type,
           'طلب بلا مورد مطابق',
           public.rfq_label(new) || ' — لا يوجد مورد لـ: ' || v_missing,
           jsonb_build_object('url', '/admin', 'rfq_id', new.id, 'uncovered', v_missing)
    from profiles a where a.role::text = 'admin';
  end if;
  return new;
end;
$$;
revoke all on function public.alert_uncovered_rfq_items() from public, anon, authenticated;

drop trigger if exists trg_zz_alert_uncovered_rfq_items on public.rfqs;
create trigger trg_zz_alert_uncovered_rfq_items
  after insert on public.rfqs
  for each row execute function public.alert_uncovered_rfq_items();
