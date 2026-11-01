-- 190: editing a request's materials re-routes it (deal-flow audit M4, 2026-11-01).
-- edit_rfq changed items[] but kept the old sectors / sector / sub_category, and only a NEW request
-- notified suppliers — so a material added in another sector reached nobody and the supplier feed
-- (sectors overlap) never showed it. Now:
--  * the supplier fan-out is one function, notify_suppliers_for_rfq(id, only_new), used by the insert
--    trigger and by edit_rfq (only_new = skip suppliers already told about this request);
--  * edit_rfq recomputes sectors / sector / sub_category from the new items and tells the suppliers
--    of the new materials.

create or replace function public.notify_suppliers_for_rfq(p_rfq_id uuid, p_only_new boolean default false)
returns integer language plpgsql security definer set search_path = public as $$
declare r rfqs; v_items jsonb; n integer;
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null or r.status <> 'open' then return 0; end if;
  v_items := case
    when r.items is not null and jsonb_typeof(r.items) = 'array' and jsonb_array_length(r.items) > 0 then r.items
    else jsonb_build_array(jsonb_build_object('sector', r.sector::text, 'sub_category', r.sub_category))
  end;
  insert into notifications (user_id, type, title, body, data)
  select distinct p.id, 'new_rfq'::notification_type,
         case when p_only_new then 'أُضيفت مواد تناسبك إلى طلب تسعير' else 'طلب تسعير جديد' end,
         public.rfq_label(r),
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || r.id::text, 'rfq_id', r.id)
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
    and (not p_only_new or not exists (
      select 1 from notifications x where x.user_id = p.id and x.type = 'new_rfq' and x.data->>'rfq_id' = r.id::text));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.notify_suppliers_for_rfq(uuid, boolean) from public, anon, authenticated;

create or replace function public.notify_suppliers_new_rfq() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'open' then return new; end if;
  perform public.notify_suppliers_for_rfq(new.id, false);
  return new;
end $$;

create or replace function public.edit_rfq(p_rfq_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r rfqs;
  v_material boolean;
  v_items_changed boolean;
  v_deleted int := 0;
  v_new_items jsonb;
  v_rerouted int := 0;
begin
  if auth.uid() is null then raise exception 'سجّل الدخول أولاً.'; end if;
  select * into r from rfqs where id = p_rfq_id for update;
  if not found then raise exception 'الطلب غير موجود.'; end if;
  if r.contractor_id is distinct from auth.uid() then raise exception 'لا تملك صلاحية تعديل هذا الطلب.'; end if;
  if r.status::text not in ('open', 'draft') then raise exception 'لا يمكن تعديل طلب مغلق أو ملغى.'; end if;
  if exists (select 1 from offers where rfq_id = p_rfq_id and status = 'accepted')
     or exists (select 1 from rfq_item_awards where rfq_id = p_rfq_id) then
    raise exception 'لا يمكن تعديل طلب اختير فيه عرض.';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'لا توجد تعديلات.'; end if;

  v_items_changed := p_patch ? 'items' and jsonb_typeof(p_patch -> 'items') = 'array'
                     and jsonb_array_length(p_patch -> 'items') > 0 and p_patch -> 'items' is distinct from r.items;
  v_material :=
       v_items_changed
    or (p_patch ? 'product_name' and nullif(btrim(p_patch ->> 'product_name'), '') is distinct from r.product_name and nullif(btrim(p_patch ->> 'product_name'), '') is not null)
    or (p_patch ? 'quantity' and nullif(p_patch ->> 'quantity', '')::numeric is distinct from r.quantity)
    or (p_patch ? 'unit' and nullif(p_patch ->> 'unit', '') is distinct from r.unit)
    or (p_patch ? 'specification' and nullif(p_patch ->> 'specification', '') is distinct from r.specification);

  if v_material and exists (select 1 from offers where rfq_id = p_rfq_id) then
    insert into notifications (user_id, type, title, body, data)
    select distinct o.supplier_id, 'offer_rejected'::notification_type, 'عدّل المشتري طلبه — سعّر من جديد'::text,
           'تغيّرت مواد الطلب أو كمياته فأُلغي عرضك السابق. يمكنك تقديم عرض جديد.'::text,
           jsonb_build_object('url', '/supplier/dashboard/rfq/' || p_rfq_id, 'rfq_id', p_rfq_id)
      from offers o where o.rfq_id = p_rfq_id;
    delete from offers where rfq_id = p_rfq_id;
    get diagnostics v_deleted = row_count;
  end if;

  v_new_items := case when v_items_changed then p_patch -> 'items' else r.items end;

  update rfqs set
    notes         = case when p_patch ? 'notes' then nullif(p_patch ->> 'notes', '') else notes end,
    specification = case when p_patch ? 'specification' then nullif(p_patch ->> 'specification', '') else specification end,
    product_name  = coalesce(nullif(btrim(p_patch ->> 'product_name'), ''), product_name),
    quantity      = case when p_patch ? 'quantity' and nullif(p_patch ->> 'quantity', '') is not null then (p_patch ->> 'quantity')::numeric else quantity end,
    unit          = case when p_patch ? 'unit' and nullif(p_patch ->> 'unit', '') is not null then p_patch ->> 'unit' else unit end,
    items         = v_new_items,
    -- routing follows the materials: every sector in the items, the first line's sector/specialty
    sectors       = case when v_items_changed then coalesce((
                      select array_agg(distinct s) from (
                        select it->>'sector' as s from jsonb_array_elements(v_new_items) it
                         where (it->>'sector') = any(enum_range(null::sector)::text[])) x), sectors)
                    else sectors end,
    sector        = case when v_items_changed and (v_new_items -> 0 ->> 'sector') = any(enum_range(null::sector)::text[])
                      then (v_new_items -> 0 ->> 'sector')::sector else sector end,
    sub_category  = case when v_items_changed then coalesce(nullif(v_new_items -> 0 ->> 'sub_category', ''), sub_category) else sub_category end
  where id = p_rfq_id;

  if v_items_changed then
    v_rerouted := public.notify_suppliers_for_rfq(p_rfq_id, true);
  end if;

  return jsonb_build_object('ok', true, 'offers_deleted', v_deleted, 'new_suppliers_notified', v_rerouted);
end $$;
