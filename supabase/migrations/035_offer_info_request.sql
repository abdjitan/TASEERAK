-- Contractor can ask the supplier for more product info (type, specs, ...) on an
-- offer; the supplier answers. Both get a notification.
alter table public.offers add column if not exists info_request text;
alter table public.offers add column if not exists info_response text;

create or replace function public.request_offer_info(p_offer_id uuid, p_question text)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_supplier uuid; v_product text; v_caller uuid := auth.uid();
begin
  select o.rfq_id, o.supplier_id, r.product_name into v_rfq, v_supplier, v_product
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if not is_admin() and not exists (select 1 from public.rfqs where id = v_rfq and contractor_id = v_caller) then
    raise exception 'forbidden';
  end if;
  if coalesce(trim(p_question), '') = '' then raise exception 'empty'; end if;
  update public.offers set info_request = p_question, info_response = null where id = p_offer_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_supplier, 'new_message', 'طلب معلومات إضافية',
    'المقاول يطلب معلومات إضافية عن منتجك في «' || coalesce(v_product, 'طلب') || '».',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'info_request'));
end; $$;
grant execute on function public.request_offer_info(uuid, text) to authenticated;

create or replace function public.respond_offer_info(p_offer_id uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_product text;
begin
  select o.rfq_id, o.supplier_id, r.contractor_id, r.product_name into v_rfq, v_supplier, v_contractor, v_product
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if auth.uid() <> v_supplier and not is_admin() then raise exception 'forbidden'; end if;
  if coalesce(trim(p_answer), '') = '' then raise exception 'empty'; end if;
  update public.offers set info_response = p_answer where id = p_offer_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_contractor, 'new_message', 'رد على طلب المعلومات',
    'ردّ المورد على طلب المعلومات الإضافية في «' || coalesce(v_product, 'طلب') || '».',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'info_response'));
end; $$;
grant execute on function public.respond_offer_info(uuid, text) to authenticated;
