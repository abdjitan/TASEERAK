-- 128: Message notifications must not reveal the contractor before the award.
-- send_message put the sender's company_name_ar in the notification title, so a supplier saw the
-- contractor's real name pre-award (profiles_public masks it everywhere else). Until the award the
-- contractor is shown as "مقاول"; the supplier's name is public anyway.

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $function$
declare v_c record; v_other uuid; v_id uuid; v_sender_name text; v_awarded boolean; v_count int;
begin
  select * into v_c from conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'Conversation not found'; end if;
  if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_body),'') = '' then raise exception 'Empty message'; end if;

  v_awarded := exists (
    select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted'
  ) or exists (
    select 1 from rfq_item_awards a where a.rfq_id = v_c.rfq_id and a.supplier_id = v_c.supplier_id
  );

  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = p_conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل الترسية (٢٠ رسالة). يكتمل التواصل بعد إتمام الصفقة (الترسية).';
    end if;
    p_body := public.mask_contact_digits(p_body); -- pre-award: hide contact numbers
  end if;

  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update conversations set last_message = left(btrim(p_body), 140), last_message_at = now() where id = p_conversation_id;

  v_other := case when auth.uid() = v_c.contractor_id then v_c.supplier_id else v_c.contractor_id end;
  if auth.uid() = v_c.contractor_id and not v_awarded then
    v_sender_name := 'مقاول';
  else
    select coalesce(nullif(btrim(company_name_ar), ''), 'مستخدم') into v_sender_name from profiles where id = auth.uid();
  end if;
  insert into notifications (user_id, type, title, body, data)
  values (v_other, 'new_message', 'رسالة جديدة من ' || v_sender_name, left(btrim(p_body), 80),
          jsonb_build_object('url', '/messages?c=' || p_conversation_id::text, 'conversation_id', p_conversation_id));
  return v_id;
end; $function$;
