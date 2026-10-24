-- 175: edit a request in ONE transaction (mobile R20, 2026-10-24). Before, the clients deleted the
-- offers first (guard_rfq_update refuses material changes while offers exist) and then updated the
-- request — if the update failed, the offers were already gone. Now edit_rfq does both or neither.
-- Offers are dropped only when a material field changes (items, product, quantity, unit, spec);
-- notes alone keep them. A request with a chosen offer (accepted / awarded) can't be edited.
-- Suppliers whose offers were dropped are told to price again.

create or replace function public.edit_rfq(p_rfq_id uuid, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r rfqs;
  v_material boolean;
  v_deleted int := 0;
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

  v_material :=
       (p_patch ? 'items' and p_patch -> 'items' is distinct from r.items)
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

  update rfqs set
    notes         = case when p_patch ? 'notes' then nullif(p_patch ->> 'notes', '') else notes end,
    specification = case when p_patch ? 'specification' then nullif(p_patch ->> 'specification', '') else specification end,
    product_name  = coalesce(nullif(btrim(p_patch ->> 'product_name'), ''), product_name),
    quantity      = case when p_patch ? 'quantity' and nullif(p_patch ->> 'quantity', '') is not null then (p_patch ->> 'quantity')::numeric else quantity end,
    unit          = case when p_patch ? 'unit' and nullif(p_patch ->> 'unit', '') is not null then p_patch ->> 'unit' else unit end,
    items         = case when p_patch ? 'items' and jsonb_typeof(p_patch -> 'items') = 'array' then p_patch -> 'items' else items end
  where id = p_rfq_id;

  return jsonb_build_object('ok', true, 'offers_deleted', v_deleted);
end $$;

revoke all on function public.edit_rfq(uuid, jsonb) from public, anon;
grant execute on function public.edit_rfq(uuid, jsonb) to authenticated;
