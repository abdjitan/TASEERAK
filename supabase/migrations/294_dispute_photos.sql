-- 294 (round-8 UX-061): a problem report can carry up to 3 photos (storage paths).
alter table public.offers add column if not exists dispute_photos text[] not null default '{}';
drop function if exists public.open_dispute(uuid, text);
CREATE OR REPLACE FUNCTION public.open_dispute(p_offer_id uuid, p_reason text, p_photos text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v offers; v_is_party boolean; r rfqs; v_by_buyer boolean; v_other uuid; v_label text;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'سبب النزاع مطلوب'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select * into r from rfqs where id = v.rfq_id;
  select (v.supplier_id = public.acting_uid()) or (r.contractor_id = auth.uid()) into v_is_party;
  if not v_is_party then raise exception 'فقط طرف في الصفقة يمكنه فتح نزاع'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.dispute_status = 'open' then raise exception 'يوجد نزاع مفتوح بالفعل'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set dispute_status = 'open', dispute_reason = left(p_reason, 1000),
                    dispute_by = auth.uid(), dispute_opened_at = now(),
                    dispute_photos = (select coalesce(array_agg(left(x, 300)), '{}') from (select unnest(coalesce(p_photos, '{}')) x limit 3) t where coalesce(x, '') <> '')
    where id = p_offer_id returning * into v;
  v_by_buyer := (r.contractor_id = auth.uid());
  v_other := case when v_by_buyer then v.supplier_id else r.contractor_id end;
  v_label := public.rfq_label(r);
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_other, 'dispute_opened', 'بلاغ عن مشكلة في صفقة',
      case when v_by_buyer then 'أبلغ المشتري عن مشكلة في صفقة «' else 'أبلغ المورد عن مشكلة في صفقة «' end
        || v_label || '». سيتواصل فريق تسعيرك مع الطرفين.',
      jsonb_build_object('url', case when v_by_buyer then '/supplier/dashboard/rfq/' || r.id::text else '/contractor/orders/' || v.id::text end,
        'offer_id', v.id, 'rfq_id', r.id));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('open_dispute.notify_party', sqlerrm, v_other); exception when others then null; end;
  end;
  begin
    perform public.notify_admins('بلاغ عن مشكلة في صفقة',
      v_label || ' — ' || case when v_by_buyer then 'من المشتري: ' else 'من المورد: ' end || left(p_reason, 200),
      '/admin?tab=disputes');
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('open_dispute.notify_admins', sqlerrm, auth.uid()); exception when others then null; end;
  end;
  return to_jsonb(v);
end $function$;
revoke all on function public.open_dispute(uuid, text, text[]) from public, anon;
grant execute on function public.open_dispute(uuid, text, text[]) to authenticated;
