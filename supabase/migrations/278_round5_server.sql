-- 278 (round-5 audit, server side)
-- UX-008: the supplier can record a payment received directly (cash / transfer agreed outside the app):
--         the deal becomes paid and confirmed, and the buyer is told.
-- UX-048: an open request that already has live offers can't be deleted (suppliers would lose their offer
--         silently); the buyer cancels it instead, which notifies them.

create or replace function public.supplier_confirm_cash_payment(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; r rfqs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id for update;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id is distinct from public.acting_uid() then raise exception 'فقط المورّد يمكنه تسجيل استلام المبلغ'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.payment_confirmed_at is not null then raise exception 'تم تأكيد استلام الدفعة مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set payment_status = 'paid', paid_marked_at = coalesce(paid_marked_at, now()), payment_confirmed_at = now()
   where id = p_offer_id returning * into v;
  select * into r from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (r.contractor_id, 'offer_accepted', 'سجّل المورد استلام المبلغ',
      'سجّل المورد أنه استلم مبلغ صفقة «' || public.rfq_label(r) || '». إن لم تدفع بعد، تواصل مع المورد أو أبلغ عن مشكلة من صفحة الصفقة.',
      jsonb_build_object('url', '/contractor/orders/' || v.id::text, 'rfq_id', r.id, 'offer_id', v.id,
                         'kind', 'payment_confirmed', 'by', 'supplier', 'rfq_ref', r.ref_no));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('supplier_confirm_cash_payment.notify', left(sqlerrm, 500), r.contractor_id); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;
revoke all on function public.supplier_confirm_cash_payment(uuid) from public, anon;
grant execute on function public.supplier_confirm_cash_payment(uuid) to authenticated;

create or replace function public.delete_rfq(p_rfq_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_status text;
begin
  select contractor_id, status::text into v_owner, v_status from rfqs where id = p_rfq_id;
  if v_owner is null then raise exception 'RFQ not found'; end if;
  if auth.uid() is distinct from v_owner then raise exception 'Not authorized'; end if;
  if exists (select 1 from offers where rfq_id = p_rfq_id and status = 'accepted')
     or exists (select 1 from rfq_item_awards where rfq_id = p_rfq_id) then
    raise exception 'لا يمكن حذف طلب يتضمّن صفقة (عرض معتمد أو مادة مُرسّاة).';
  end if;
  if v_status = 'open' and exists (select 1 from offers where rfq_id = p_rfq_id and status = 'pending') then
    raise exception 'لهذا الطلب عروض من الموردين، فلا يمكن حذفه. يمكنك إلغاؤه بدلاً من ذلك.';
  end if;
  delete from offers where rfq_id = p_rfq_id;
  delete from rfqs where id = p_rfq_id;
end $$;
