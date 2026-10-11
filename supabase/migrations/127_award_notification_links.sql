-- 127: Award notifications for suppliers.
-- finalize_rfq_awards sent "تمت ترسية مواد عليك" linking to /contractor/orders/... (a buyer page:
-- the middleware bounces suppliers off /contractor, so the link led to the dashboard), and the
-- offer-status trigger sent a second "تم قبول عرضك" for the same award with no link at all.
-- Now: one notification per accepted/rejected offer (the trigger), linking to the supplier's own
-- request page; finalize no longer adds a duplicate.

create or replace function public.notify_supplier_offer_status()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' then
      insert into notifications (user_id, type, title, body, data)
      values (new.supplier_id, 'offer_accepted', 'تم قبول عرضك! 🎉',
        'تمت ترسية مواد عليك. راجع أمر الشراء ونسّق التسليم مع المقاول.',
        jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
    elsif new.status = 'rejected' then
      insert into notifications (user_id, type, title, body, data)
      values (new.supplier_id, 'offer_rejected', 'لم يُقبل عرضك',
        'اختار المقاول مورداً آخر في هذا الطلب.',
        jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
    end if;
  end if;
  return new;
end; $function$;

create or replace function public.finalize_rfq_awards(p_rfq_id uuid)
returns void language plpgsql security definer set search_path = public as $function$
declare v_contractor uuid;
begin
  perform set_config('app.deal_write', 'on', true);
  select contractor_id into v_contractor from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from rfq_item_awards where rfq_id = p_rfq_id) then
    raise exception 'No awards to finalize';
  end if;
  update offers o set status = 'accepted', accepted_at = coalesce(o.accepted_at, now())
  where o.rfq_id = p_rfq_id and o.status <> 'accepted'
    and exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update offers set invoice_number = 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
  where rfq_id = p_rfq_id and status = 'accepted' and invoice_number is null;
  update offers o set status = 'rejected'
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and not exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update rfqs set status = 'closed' where id = p_rfq_id and status = 'open';
  -- suppliers are notified by notify_supplier_offer_status (one per offer)
end; $function$;

-- fix links already sent to suppliers
update notifications n
   set data = jsonb_set(n.data, '{url}', to_jsonb('/supplier/dashboard/rfq/' || (n.data->>'rfq_id')))
 where n.data->>'url' like '/contractor/orders/%'
   and n.data ? 'rfq_id'
   and exists (select 1 from profiles p where p.id = n.user_id and p.role::text = 'supplier');
