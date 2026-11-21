-- 250: an admin alert (in-app + email via notify's admin_alert) for every new price request (owner
-- 2026-11-21): who sent it, its number and what it is; the link opens it in /admin (requests tab).
create or replace function public.alert_admins_new_rfq()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.status::text <> 'open' then return new; end if;
  select coalesce(nullif(company_name_ar, ''), nullif(full_name, ''), 'مستخدم') into v_name from profiles where id = new.contractor_id;
  perform public.notify_admins('طلب تسعير جديد: RFQ-' || coalesce(new.ref_no::text, '?'),
    coalesce(v_name, 'مستخدم') || ' — ' || coalesce(public.rfq_label(new), new.product_name, '') || coalesce(' — ' || nullif(new.city, ''), ''),
    '/admin?tab=rfqs&q=RFQ-' || coalesce(new.ref_no::text, ''));
  return new;
exception when others then
  return new;   -- never block a request because of the alert
end $$;
revoke all on function public.alert_admins_new_rfq() from public, anon, authenticated;
drop trigger if exists zz_alert_admins_new_rfq on public.rfqs;
create trigger zz_alert_admins_new_rfq after insert on public.rfqs
  for each row execute function public.alert_admins_new_rfq();
