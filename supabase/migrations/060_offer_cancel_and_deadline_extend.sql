-- ============================================================================
-- 060: نافذة تعديل/إلغاء العرض (١٥ دقيقة) + تمديد مهلة التسعير للمقاول
-- ============================================================================

-- (1) المورد يلغي/يعيد تسعير عرضه خلال ١٥ دقيقة من إرساله — ما دام قيد المراجعة
--     وغير مُرسّى عليه أي بند. الإلغاء يحذف العرض فيظهر له نموذج التسعير من جديد.
create or replace function public.cancel_my_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_supplier uuid;
  v_status   text;
  v_created  timestamptz;
begin
  select supplier_id, status::text, created_at
    into v_supplier, v_status, v_created
    from offers where id = p_offer_id;

  if v_supplier is null then raise exception 'Offer not found'; end if;
  if auth.uid() <> v_supplier then raise exception 'Not authorized'; end if;
  if v_status <> 'pending' then
    raise exception 'يمكن إلغاء العرض فقط أثناء كونه قيد المراجعة';
  end if;
  if v_created < now() - interval '15 minutes' then
    raise exception 'انتهت نافذة التعديل (١٥ دقيقة) — تواصل مع المقاول لأي تغيير';
  end if;
  if exists (select 1 from rfq_item_awards where offer_id = p_offer_id) then
    raise exception 'تمّت ترسية بند من هذا العرض — لم يعد بالإمكان إلغاؤه';
  end if;

  delete from offers where id = p_offer_id;
end; $$;

revoke execute on function public.cancel_my_offer(uuid) from public, anon;
grant  execute on function public.cancel_my_offer(uuid) to authenticated;


-- (2) المقاول يمدّد مهلة التسعير لطلبه المفتوح (لا يقصّرها). يُعيد المهلة الجديدة.
create or replace function public.extend_rfq_deadline(p_rfq_id uuid, p_new_expires timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner   uuid;
  v_status  text;
  v_current timestamptz;
begin
  select contractor_id, status::text, expires_at
    into v_owner, v_status, v_current
    from rfqs where id = p_rfq_id;

  if v_owner is null then raise exception 'RFQ not found'; end if;
  if auth.uid() <> v_owner then raise exception 'Not authorized'; end if;
  if v_status <> 'open' then
    raise exception 'لا يمكن تمديد مهلة طلب غير مفتوح';
  end if;
  if p_new_expires <= now() then
    raise exception 'المهلة الجديدة يجب أن تكون في المستقبل';
  end if;
  if v_current is not null and p_new_expires <= v_current then
    raise exception 'المهلة الجديدة يجب أن تكون أبعد من المهلة الحالية';
  end if;

  update rfqs set expires_at = p_new_expires where id = p_rfq_id;

  -- إخطار الموردين الذين سعّروا بأن المهلة مُدّدت (فرصة لمراجعة عروضهم)
  insert into notifications (user_id, type, title, body, data)
  select distinct o.supplier_id, 'rfq_expiring'::notification_type,
         'تم تمديد مهلة التسعير',
         'مدّد المقاول مهلة التسعير — تقدر تراجع عرضك حتى ' || to_char(p_new_expires at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI'),
         jsonb_build_object('rfq_id', p_rfq_id)
    from offers o
   where o.rfq_id = p_rfq_id and o.status = 'pending';

  return p_new_expires;
end; $$;

revoke execute on function public.extend_rfq_deadline(uuid, timestamptz) from public, anon;
grant  execute on function public.extend_rfq_deadline(uuid, timestamptz) to authenticated;
