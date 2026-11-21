-- 238: «تحويل حسابي إلى مورد» (owner 2026-11-21). One verified mobile = one account, so a buyer who
-- also wants to sell asks Support to convert the SAME account; the admin approves it.
--  * request_supplier_conversion(note): buyer only. Stamps the request and writes it into the
--    support thread (the support trigger, 225, emails the admins).
--  * admin_convert_to_supplier(user): admin only. Refused while the buyer has an open request or a
--    deal not yet received (those pages are buyer-side). Role → supplier, status pending (the
--    seller-pending alert fires), kind empty (picked in onboarding). Phone/email stay verified.
-- Also: buyers activate themselves with a verified mobile only (email optional since 234).
alter table public.profiles add column if not exists supplier_conversion_requested_at timestamptz;

create or replace function public.request_supplier_conversion(p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select role::text into v_role from profiles where id = auth.uid();
  if v_role is distinct from 'contractor' then
    raise exception 'هذا الطلب متاح لحسابات المشترين فقط.' using hint = 'NOT_BUYER';
  end if;
  update profiles set supplier_conversion_requested_at = now() where id = auth.uid();
  insert into support_messages (user_id, sender, content)
  values (auth.uid(), 'user', left('طلب تحويل الحساب إلى مورد.' || coalesce(' ' || nullif(btrim(p_note), ''), ''), 1000));
end $$;
revoke all on function public.request_supplier_conversion(text) from public, anon;
grant execute on function public.request_supplier_conversion(text) to authenticated;

create or replace function public.admin_convert_to_supplier(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select role::text into v_role from profiles where id = p_user;
  if v_role is distinct from 'contractor' then raise exception 'الحساب ليس حساب مشتري.'; end if;
  if exists (select 1 from rfqs where contractor_id = p_user and status::text = 'open') then
    raise exception 'لدى هذا المشتري طلب تسعير مفتوح. يُغلق الطلب أولاً ثم يُحوَّل الحساب.' using hint = 'OPEN_RFQ';
  end if;
  if exists (select 1 from offers o join rfqs r on r.id = o.rfq_id
              where r.contractor_id = p_user and o.status::text = 'accepted' and o.received_at is null
                and coalesce(o.dispute_status::text, '') not in ('resolved')) then
    raise exception 'لدى هذا المشتري صفقة لم يُؤكَّد استلامها بعد. تُستكمل الصفقة أولاً.' using hint = 'OPEN_DEAL';
  end if;
  update profiles set role = 'supplier', verification_status = 'pending', provider_type = null,
         role_chosen_at = null, supplier_conversion_requested_at = null
   where id = p_user;
  insert into notifications (user_id, type, title, body, data)
  values (p_user, 'announcement', 'تم تحويل حسابك إلى مورد',
          'أكمل بيانات نشاطك (نوع الحساب والتخصصات) ليصل إليك ما يناسبك من طلبات.', jsonb_build_object('url', '/onboarding'));
end $$;
revoke all on function public.admin_convert_to_supplier(uuid) from public, anon;
grant execute on function public.admin_convert_to_supplier(uuid) to authenticated;

-- buyers: a verified mobile is enough to be active (234 made the email optional)
create or replace function public.auto_activate_buyer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role::text = 'contractor' and new.phone_verified_at is not null
     and new.verification_status::text <> 'verified' then
    new.verification_status := 'verified';
  end if;
  return new;
end $$;
update profiles set verification_status = 'verified'
 where role::text = 'contractor' and phone_verified_at is not null and verification_status::text <> 'verified';
