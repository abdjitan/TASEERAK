-- Confirm per-item awards: accept every offer that won >=1 material, reject the
-- rest, close the RFQ, and notify the winning suppliers. Contractor-only.
create or replace function public.finalize_rfq_awards(p_rfq_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_contractor uuid;
begin
  select contractor_id into v_contractor from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from rfq_item_awards where rfq_id = p_rfq_id) then
    raise exception 'No awards to finalize';
  end if;

  update offers o set status = 'accepted', accepted_at = coalesce(o.accepted_at, now())
  where o.rfq_id = p_rfq_id
    and o.status <> 'accepted'
    and exists (select 1 from rfq_item_awards a where a.offer_id = o.id);

  update offers o set status = 'rejected'
  where o.rfq_id = p_rfq_id
    and o.status = 'pending'
    and not exists (select 1 from rfq_item_awards a where a.offer_id = o.id);

  update rfqs set status = 'closed' where id = p_rfq_id and status = 'open';

  insert into notifications (user_id, type, title, body, data)
  select distinct a.supplier_id, 'offer_accepted'::notification_type,
         'تمت ترسية مواد عليك', 'راجع أمر الشراء وحماية الصفقة',
         jsonb_build_object('url', '/contractor/orders/' || a.offer_id::text, 'rfq_id', p_rfq_id)
  from rfq_item_awards a where a.rfq_id = p_rfq_id;
end;
$$;

revoke execute on function public.finalize_rfq_awards(uuid) from public, anon;
grant execute on function public.finalize_rfq_awards(uuid) to authenticated;
