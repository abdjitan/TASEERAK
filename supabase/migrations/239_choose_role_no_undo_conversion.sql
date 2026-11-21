-- 239: an account the admin converted to a supplier (238) has role_chosen_at = null so the apps
-- route it to the seller kind picker; choose_my_role must not let it pick 'buyer' and undo the
-- conversion (mobile review 2026-11-21). Otherwise unchanged from 123.
create or replace function public.choose_my_role(p_intent text, p_full_name text, p_provider_type text default null)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare v_role user_role; v_ptype text; v_cur text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(coalesce(trim(p_full_name), '')) < 2 then raise exception 'name_required'; end if;
  select role::text into v_cur from profiles where id = auth.uid();
  if p_intent = 'buyer' then
    if v_cur = 'supplier' then raise exception 'buyer_not_allowed' using hint = 'CONVERTED_TO_SUPPLIER'; end if;
    v_role := 'contractor'; v_ptype := null;
  elsif p_intent = 'provider' then
    v_role := 'supplier';
    v_ptype := coalesce(p_provider_type, 'company');
    if v_ptype in ('broker','price_agent') then v_ptype := 'individual'; end if;
    if v_ptype not in ('manufacturer','distributor','trading_company','retail_shop','dealer','company','individual') then
      raise exception 'bad_provider_type';
    end if;
  elsif p_intent = 'agent' then v_role := 'supplier'; v_ptype := 'individual';
  else raise exception 'bad_intent'; end if;
  perform set_config('app.bypass_locks', 'on', true);
  update public.profiles
     set role = v_role, provider_type = v_ptype, role_chosen_at = now(),
         full_name = left(trim(p_full_name), 120),
         company_name_ar = case when company_name_ar is null or company_name_ar = 'شركة جديدة' then left(trim(p_full_name), 120) else company_name_ar end
   where id = auth.uid() and role_chosen_at is null and role <> 'admin';
  if not found then raise exception 'already_chosen'; end if;
  return v_role::text;
end $function$;
