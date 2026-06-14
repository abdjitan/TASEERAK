-- المقاول يحذف طلبه (مع عروضه وترسياته) بأمان — تحقّق ملكية.
create or replace function public.delete_rfq(p_rfq_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_owner uuid;
begin
  select contractor_id into v_owner from rfqs where id = p_rfq_id;
  if v_owner is null then raise exception 'RFQ not found'; end if;
  if auth.uid() <> v_owner then raise exception 'Not authorized'; end if;
  delete from rfq_item_awards where rfq_id = p_rfq_id;
  delete from offers where rfq_id = p_rfq_id;
  delete from rfqs where id = p_rfq_id; -- conversations/messages تُحذف تلقائياً (cascade)
end; $$;
revoke execute on function public.delete_rfq(uuid) from public, anon;
grant execute on function public.delete_rfq(uuid) to authenticated;
