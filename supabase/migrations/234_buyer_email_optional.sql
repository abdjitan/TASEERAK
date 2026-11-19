-- 234: buyers need only a verified mobile to act (owner 2026-11-19). Their email stays optional and
-- is encouraged (banner), not forced. Sellers still need both the mobile and the email (222).
create or replace function public.require_verified_phone()
returns void language plpgsql stable security definer set search_path to 'public' as $function$
declare v_phone timestamptz; v_email timestamptz; v_ban timestamptz; v_role text;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin() then return; end if;
  select phone_verified_at, email_verified_at, banned_until, role::text into v_phone, v_email, v_ban, v_role from profiles where id = auth.uid();
  if v_ban is not null and v_ban > now() then
    raise exception 'حسابك موقوف مؤقتاً. راجع رسالة الإدارة أو تواصل مع الدعم.' using hint = 'ACCOUNT_SUSPENDED';
  end if;
  if not public.phone_verify_required() then return; end if;
  if v_phone is null then
    raise exception 'وثّق رقم جوالك أولاً من الإعدادات (يصلك رمز برسالة نصية)، ثم أعد المحاولة.' using hint = 'PHONE_NOT_VERIFIED';
  end if;
  if v_email is null and v_role is distinct from 'contractor' then
    raise exception 'وثّق بريدك الإلكتروني أولاً من الإعدادات (يصلك رمز على البريد)، ثم أعد المحاولة.' using hint = 'EMAIL_NOT_VERIFIED';
  end if;
end $function$;
