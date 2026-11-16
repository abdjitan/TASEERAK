-- Account-type change goes through Support (owner 2026-11-16): the KIND_LOCKED message points to
-- the support page; the admin changes provider_type from the admin user page after approval.
do $$
declare d text := pg_get_functiondef('public.set_seller_kind(text, text)'::regprocedure); n text;
begin
  n := replace(d, 'لا يمكن تغيير نوع الحساب بعد إنشائه. لتغييره احذف الحساب وأنشئ حساباً جديداً.',
                  'لا يمكن تغيير نوع الحساب مباشرة. اطلب التغيير من «الدعم»، وتراجعه الإدارة.');
  if n = d then raise exception 'set_seller_kind: message not found'; end if;
  execute n;
end $$;
