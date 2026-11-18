-- 232: an alert (in-app + email through notify's admin_alert) for every new account (owner 2026-11-18).
-- A seller that starts «pending» already raises «مورّد بانتظار الموافقة» (225), so it is skipped here
-- to avoid two emails for the same sign-up.
create or replace function public.alert_admins_new_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text;
begin
  if new.role::text = 'admin' then return new; end if;
  if new.role::text = 'supplier' and new.verification_status::text = 'pending' then return new; end if;
  v_kind := case new.role::text when 'contractor' then 'مشتري' when 'supplier' then 'مورّد' else new.role::text end;
  perform public.notify_admins('تسجيل جديد: ' || v_kind,
    coalesce(nullif(new.company_name_ar, ''), nullif(new.full_name, ''), 'مستخدم جديد')
      || coalesce(' — ' || nullif(new.phone, ''), ''),
    '/admin/users/' || new.id);
  return new;
end $$;
revoke all on function public.alert_admins_new_signup() from public, anon, authenticated;
drop trigger if exists zz_alert_admins_new_signup on public.profiles;
create trigger zz_alert_admins_new_signup after insert on public.profiles
  for each row execute function public.alert_admins_new_signup();
