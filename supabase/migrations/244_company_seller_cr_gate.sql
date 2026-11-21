-- 244: a company/shop seller prices only after entering a valid commercial registration (owner
-- 2026-11-21). Submitting a well-formed, unique CR (unified number 7XXXXXXXXX; uniqueness = cr_guard)
-- is enough to start; the admin reviews it in the background and the «موثّق» badge comes only after
-- that. Independents (pricing agents) have no CR: unchanged (phone + tiered cap, 213/214).
-- Legacy sellers with no kind yet (provider_type null) are not gated.
create or replace function public.offers_require_company_cr()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text; v_cr text;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin() then return new; end if;
  select provider_type, commercial_registration into v_kind, v_cr from profiles where id = new.supplier_id;
  if v_kind in ('manufacturer','distributor','trading_company','retail_shop','dealer','company')
     and coalesce(v_cr, '') !~ '^7[0-9]{9}$' then
    raise exception 'أدخل رقم السجل التجاري لمنشأتك أولاً (الإعدادات ← المستندات) لتبدأ التسعير.' using hint = 'CR_REQUIRED';
  end if;
  return new;
end $$;
revoke all on function public.offers_require_company_cr() from public, anon, authenticated;
drop trigger if exists ab_offers_require_company_cr on public.offers;
create trigger ab_offers_require_company_cr before insert on public.offers
  for each row execute function public.offers_require_company_cr();

-- for the UI: may the acting seller price now? (true / false + why)
create or replace function public.my_pricing_gate()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cr_required', p.provider_type in ('manufacturer','distributor','trading_company','retail_shop','dealer','company')
                   and coalesce(p.commercial_registration, '') !~ '^7[0-9]{9}$')
  from profiles p where p.id = public.acting_uid()
$$;
revoke all on function public.my_pricing_gate() from public, anon;
grant execute on function public.my_pricing_gate() to authenticated;
