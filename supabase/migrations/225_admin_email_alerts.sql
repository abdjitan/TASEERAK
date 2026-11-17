-- Admin alerts by email (owner 2026-11-17): the admins get an in-app notification — and, through
-- notify (data.admin_alert), an email — when a seller waits for approval, someone writes to support,
-- reports a user, or objects to a commercial registration. 'announcement' never goes to WhatsApp.
create or replace function public.notify_admins(p_title text, p_body text, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, title, body, data)
  select p.id, 'announcement', left(p_title, 120), left(coalesce(p_body, ''), 300),
         jsonb_build_object('url', coalesce(p_url, '/admin'), 'admin_alert', true)
    from profiles p where p.role::text = 'admin';
end $$;
revoke all on function public.notify_admins(text, text, text) from public, anon, authenticated;

-- a seller waiting for approval: new seller account, or back to «pending» (e.g. documents re-sent)
create or replace function public.alert_admins_seller_pending()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role::text = 'supplier' and new.verification_status::text = 'pending'
     and (tg_op = 'INSERT' or old.verification_status::text is distinct from 'pending' or old.role::text <> 'supplier') then
    perform public.notify_admins('مورّد بانتظار الموافقة',
      coalesce(nullif(new.company_name_ar, ''), new.full_name, 'مورّد جديد') || ' — راجع الحساب ووثائقه.', '/admin/users/' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists zz_alert_admins_seller_pending on public.profiles;
create trigger zz_alert_admins_seller_pending after insert or update of verification_status, role on public.profiles
  for each row execute function public.alert_admins_seller_pending();

-- a message to support from a user
create or replace function public.alert_admins_support_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if coalesce(new.sender, '') <> 'admin' then
    select coalesce(nullif(company_name_ar, ''), full_name) into v_name from profiles where id = new.user_id;
    perform public.notify_admins('رسالة دعم جديدة', coalesce(v_name, 'مستخدم') || ': ' || left(coalesce(new.content, ''), 150), '/admin/users/' || new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists zz_alert_admins_support on public.support_messages;
create trigger zz_alert_admins_support after insert on public.support_messages
  for each row execute function public.alert_admins_support_message();

-- a user report
create or replace function public.alert_admins_user_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('بلاغ جديد عن مستخدم', left(coalesce(new.reason, '') || ' ' || coalesce(new.details, ''), 200), '/admin/reports');
  return new;
end $$;
drop trigger if exists zz_alert_admins_report on public.user_reports;
create trigger zz_alert_admins_report after insert on public.user_reports
  for each row execute function public.alert_admins_user_report();

-- an objection to a commercial registration
create or replace function public.alert_admins_cr_objection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('اعتراض على سجل تجاري', 'السجل ' || new.commercial_registration || ': ' || left(coalesce(new.reason, ''), 150), '/admin');
  return new;
end $$;
drop trigger if exists zz_alert_admins_cr_objection on public.cr_objections;
create trigger zz_alert_admins_cr_objection after insert on public.cr_objections
  for each row execute function public.alert_admins_cr_objection();
