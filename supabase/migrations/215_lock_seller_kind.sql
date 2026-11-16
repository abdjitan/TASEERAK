-- Seller kind is fixed once chosen (owner 2026-11-16): a company/shop account can't turn itself into
-- a pricing agent (independent) or back. To change it, the account is deleted and a new one made.
-- Changing the activity inside the company kind (manufacturer → distributor …) stays allowed.
-- Admins change it from the admin pages (direct update), not through this RPC.
create or replace function public.set_seller_kind(p_kind text, p_activity text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_ptype text; v_cur text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select provider_type into v_cur from public.profiles where id = auth.uid() and role::text = 'supplier';
  if not found then raise exception 'not_supplier'; end if;
  if p_kind = 'independent' then v_ptype := 'individual';
  elsif p_kind = 'company' then
    v_ptype := coalesce(nullif(p_activity, ''), 'company');
    if v_ptype not in ('manufacturer','distributor','trading_company','retail_shop','company') then
      raise exception 'bad_activity';
    end if;
  else raise exception 'bad_kind'; end if;
  if v_cur is not null
     and (v_cur in ('individual','broker','price_agent')) <> (v_ptype in ('individual','broker','price_agent')) then
    raise exception 'لا يمكن تغيير نوع الحساب بعد إنشائه. لتغييره احذف الحساب وأنشئ حساباً جديداً.' using hint = 'KIND_LOCKED';
  end if;
  perform set_config('app.bypass_locks', 'on', true);
  update public.profiles set provider_type = v_ptype where id = auth.uid();
  return v_ptype;
end $$;
