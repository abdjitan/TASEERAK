-- Commercial registration = the unified national number (owner 2026-11-17): 10 digits starting
-- with 7, the number the Ministry of Commerce / Wathq look up. Old city-coded CRs (1010…) are no
-- longer accepted from users; admins can still correct a record. Existing rows are untouched.
create or replace function public.cr_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.commercial_registration := public.normalize_cr(new.commercial_registration);
  if new.commercial_registration is null or new.verification_status = 'rejected' then return new; end if;
  if tg_op = 'UPDATE'
     and new.commercial_registration is not distinct from public.normalize_cr(old.commercial_registration)
     and old.verification_status <> 'rejected' then
    return new;
  end if;
  if new.commercial_registration !~ '^7[0-9]{9}$' and not public.is_admin() then
    raise exception using errcode = 'P0001',
      message = 'أدخل الرقم الوطني الموحد للمنشأة: 10 أرقام يبدأ بـ7 (تجده في شهادة السجل التجاري).',
      hint = 'CR_FORMAT';
  end if;
  if exists (select 1 from public.profiles p
             where p.id <> new.id
               and p.commercial_registration = new.commercial_registration
               and p.verification_status <> 'rejected') then
    raise exception using errcode = 'P0001',
      message = 'هذا السجل التجاري مستخدم في حساب آخر. إن كان سجلّك فاطلب التحقق.',
      hint = 'CR_TAKEN';
  end if;
  return new;
end $$;

do $$
declare d text := pg_get_functiondef('public.submit_cr_claim'::regproc); n text;
begin
  n := replace(d, 'if v_cr is null or length(v_cr) <> 10 then', 'if v_cr is null or v_cr !~ ''^7[0-9]{9}$'' then');
  if n = d then raise notice 'submit_cr_claim: length check not found (left unchanged)'; else execute n; end if;
end $$;

do $$ declare d text := pg_get_functiondef('public.submit_cr_claim'::regproc); n text;
begin n := replace(d, 'رقم السجل التجاري يجب أن يكون 10 أرقام.', 'أدخل الرقم الوطني الموحد للمنشأة: 10 أرقام يبدأ بـ7.'); if n <> d then execute n; end if; end $$;
