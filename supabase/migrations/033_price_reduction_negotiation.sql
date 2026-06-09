-- In-app price-reduction negotiation: the contractor asks a specific supplier
-- for an extra discount with a deadline; the supplier responds with a lower
-- price within that deadline. Both sides get a notification.
alter table public.offers add column if not exists reduction_deadline timestamptz;
alter table public.offers add column if not exists reduction_note text;

create or replace function public.request_price_reduction(p_offer_id uuid, p_hours integer, p_note text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_rfq uuid; v_supplier uuid; v_product text; v_caller uuid := auth.uid();
begin
  select o.rfq_id, o.supplier_id, r.product_name into v_rfq, v_supplier, v_product
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if not is_admin() and not exists (select 1 from public.rfqs where id = v_rfq and contractor_id = v_caller) then
    raise exception 'forbidden';
  end if;
  update public.offers
    set reduction_deadline = now() + (greatest(1, least(coalesce(p_hours,24), 168)) || ' hours')::interval,
        reduction_note = nullif(p_note, '')
  where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_supplier, 'new_message', 'طلب تخفيض سعر',
    'المقاول يطلب تخفيضاً إضافياً على عرضك في «' || coalesce(v_product, 'طلب') || '» — لديك مهلة للرد.',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'reduction_request'));
end; $$;
grant execute on function public.request_price_reduction(uuid, integer, text) to authenticated;

create or replace function public.submit_price_reduction(p_offer_id uuid, p_new_total numeric)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_qty numeric; v_product text;
begin
  select o.rfq_id, o.supplier_id, r.contractor_id, r.quantity, r.product_name
    into v_rfq, v_supplier, v_contractor, v_qty, v_product
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if auth.uid() <> v_supplier and not is_admin() then raise exception 'forbidden'; end if;
  if p_new_total is null or p_new_total <= 0 then raise exception 'bad_price'; end if;
  update public.offers
    set total_price = p_new_total,
        unit_price = case when coalesce(v_qty,0) > 0 then round(p_new_total / v_qty, 2) else unit_price end,
        reduction_deadline = null
  where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_contractor, 'rfq_offer', 'تم تخفيض السعر',
    'خفّض المورد سعر عرضه على «' || coalesce(v_product, 'طلب') || '» إلى ' || p_new_total::text || ' ر.س.',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'reduction_response'));
end; $$;
grant execute on function public.submit_price_reduction(uuid, numeric) to authenticated;
