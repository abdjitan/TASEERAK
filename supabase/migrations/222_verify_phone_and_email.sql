-- Verified mobile AND email before anything (owner 2026-11-17): a buyer who signed up by email
-- verifies the mobile, one who signed up by phone verifies the email; sellers verify both. While
-- notify_config.phone_verify_required is on, require_verified_phone() now checks both, and it also
-- guards creating a price request and sending a chat message (besides quotes and awards, 219).
-- The site sends unverified users to /verify (middleware).
create or replace function public.require_verified_phone()
returns void language plpgsql stable security definer set search_path = public as $$
declare v_phone timestamptz; v_email timestamptz;
begin
  if not public.phone_verify_required() then return; end if;
  -- (security definer: current_user is the owner here, so the service role is read from the JWT)
  if auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin() then return; end if;
  select phone_verified_at, email_verified_at into v_phone, v_email from profiles where id = auth.uid();
  if v_phone is null then
    raise exception 'وثّق رقم جوالك أولاً من الإعدادات (يصلك رمز برسالة نصية)، ثم أعد المحاولة.' using hint = 'PHONE_NOT_VERIFIED';
  end if;
  if v_email is null then
    raise exception 'وثّق بريدك الإلكتروني أولاً من الإعدادات (يصلك رمز على البريد)، ثم أعد المحاولة.' using hint = 'EMAIL_NOT_VERIFIED';
  end if;
end $$;

-- price requests
create or replace function public.rfqs_require_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.require_verified_phone();
  return new;
end $$;
drop trigger if exists aa_rfqs_verified on public.rfqs;
create trigger aa_rfqs_verified before insert on public.rfqs
  for each row execute function public.rfqs_require_verified();

-- chat messages
do $$
declare d text := pg_get_functiondef('public.send_message(uuid, text)'::regprocedure); n text;
begin
  n := replace(d, 'if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception ''Not authorized''; end if;',
    'if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception ''Not authorized''; end if;
  perform public.require_verified_phone();');
  if n = d then raise exception 'send_message: pattern not found'; end if;
  execute n;
end $$;
