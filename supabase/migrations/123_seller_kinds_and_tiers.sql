-- 123: Simplified seller structure (2026-10-11)
--
-- Sellers are either INDEPENDENT (individual / broker / price agent: one kind) or a COMPANY
-- (manufacturer, agent/distributor, trading company, building-materials shop: an "activity"
-- attribute, not a separate account type).
--
-- The supplier tier buyers can target is no longer self-declared. It is derived:
--   company      شركات ومصانع معتمدة   = a company/factory/distributor VERIFIED by CR (Wathq/admin)
--   shop         محلات ومؤسسات تجارية  = every other business (shops, unverified companies)
--   independent  بائعون مستقلون ووسطاء = independent sellers
-- Legacy values: manufacturer/commercial -> company, local -> shop.
--
-- Offers also say where the price comes from (own stock / shop / supplier / intermediary) and
-- whether the item is available now, so buyers can tell direct quotes from intermediary ones.

-- ── 1. provider_type: add the generic 'company' (activity not chosen yet) ─────────────────────
alter table public.profiles drop constraint if exists profiles_provider_type_check;
alter table public.profiles add constraint profiles_provider_type_check
  check (provider_type in ('manufacturer','distributor','trading_company','retail_shop','dealer','company','individual','broker','price_agent'));

-- ── 2. Derived supplier tier ─────────────────────────────────────────────────────────────────
create or replace function public.derive_supplier_tier()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role::text <> 'supplier' then
    new.supplier_tier := null;
  elsif new.provider_type in ('individual','broker','price_agent') then
    new.supplier_tier := 'independent';
  elsif (new.verification_status::text = 'verified' or coalesce(new.cr_verification_source, '') = 'wathq')
        and coalesce(new.provider_type, 'company') not in ('retail_shop','dealer') then
    new.supplier_tier := 'company';
  else
    new.supplier_tier := 'shop';
  end if;
  return new;
end $$;

-- Named zz_ so it runs after trg_enforce_profile_field_locks (BEFORE triggers fire by name).
drop trigger if exists zz_derive_supplier_tier on public.profiles;
create trigger zz_derive_supplier_tier
  before insert or update on public.profiles
  for each row execute function public.derive_supplier_tier();

-- Recompute every existing profile (the trigger does the work). The old check only allowed
-- manufacturer/commercial/local, so it goes first.
alter table public.profiles drop constraint if exists profiles_supplier_tier_check;
update public.profiles set supplier_tier = supplier_tier;

alter table public.profiles add constraint profiles_supplier_tier_check
  check (supplier_tier is null or supplier_tier in ('company','shop','independent'));

-- ── 3. Buyer targeting: map legacy tier values in requests ───────────────────────────────────
create or replace function public._map_tier(t text) returns text language sql immutable as $$
  select case t when 'manufacturer' then 'company' when 'commercial' then 'company' when 'local' then 'shop' else t end
$$;

update public.rfqs
   set target_tiers = (select array_agg(distinct public._map_tier(x)) from unnest(target_tiers) x)
 where target_tiers is not null;

update public.rfqs r
   set items = (
     select jsonb_agg(
       case when jsonb_typeof(it->'supplier_tiers') = 'array'
            then jsonb_set(it, '{supplier_tiers}',
                   coalesce((select jsonb_agg(distinct public._map_tier(v)) from jsonb_array_elements_text(it->'supplier_tiers') v), '[]'::jsonb))
            else it end
       order by ord)
     from jsonb_array_elements(r.items) with ordinality as e(it, ord))
 where jsonb_typeof(r.items) = 'array'
   and exists (select 1 from jsonb_array_elements(r.items) it where jsonb_typeof(it->'supplier_tiers') = 'array');

drop function public._map_tier(text);

-- ── 4. New-RFQ notifications: default tier is now 'shop' ─────────────────────────────────────
create or replace function public.notify_suppliers_new_rfq()
returns trigger language plpgsql security definer set search_path = public as $function$
declare
  v_body text;
  v_items jsonb;
begin
  if new.status <> 'open' then return new; end if;
  v_body := coalesce(new.title, new.product_name, 'طلب تسعير جديد');
  v_items := case
    when new.items is not null and jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 0
      then new.items
    else jsonb_build_array(jsonb_build_object('sector', new.sector::text, 'sub_category', new.sub_category))
  end;

  insert into notifications (user_id, type, title, body, data)
  select distinct p.id, 'new_rfq'::notification_type,
         'طلب تسعير جديد', v_body,
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.id::text, 'rfq_id', new.id)
  from profiles p
  where p.role::text = 'supplier'
    and coalesce(p.is_active, true)
    and p.id <> new.contractor_id
    and (not coalesce(new.verified_only, false) or p.verification_status::text = 'verified')
    and (new.target_tiers is null or coalesce(p.supplier_tier, 'shop') = any(new.target_tiers))
    and (
      new.target_regions is null
      or p.region = any(new.target_regions)
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = any(new.target_regions))
    )
    and (
      not coalesce(new.nearby_only, false)
      or p.region = new.region
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = new.region)
    )
    and exists (
      select 1
      from jsonb_array_elements(v_items) it
      where exists (
              select 1 from profile_sectors ps
              where ps.profile_id = p.id and ps.sector::text = (it->>'sector')
            )
        and (
              not exists (select 1 from profile_specialties psp where psp.profile_id = p.id)
              or coalesce(it->>'sub_category', '') = ''
              or exists (select 1 from profile_specialties psp
                         where psp.profile_id = p.id and psp.specialty = (it->>'sub_category'))
            )
        and (
              it->'supplier_tiers' is null
              or jsonb_typeof(it->'supplier_tiers') <> 'array'
              or jsonb_array_length(it->'supplier_tiers') = 0
              or coalesce(p.supplier_tier, 'shop') in (select jsonb_array_elements_text(it->'supplier_tiers'))
            )
    );
  return new;
end;
$function$;

-- ── 5. Choosing a role: provider is independent or company ───────────────────────────────────
create or replace function public.choose_my_role(p_intent text, p_full_name text, p_provider_type text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_role user_role; v_ptype text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(coalesce(trim(p_full_name), '')) < 2 then raise exception 'name_required'; end if;
  if p_intent = 'buyer' then v_role := 'contractor'; v_ptype := null;
  elsif p_intent = 'provider' then
    v_role := 'supplier';
    v_ptype := coalesce(p_provider_type, 'company');
    -- broker / price agent are the same account kind as an individual seller now
    if v_ptype in ('broker','price_agent') then v_ptype := 'individual'; end if;
    if v_ptype not in ('manufacturer','distributor','trading_company','retail_shop','dealer','company','individual') then
      raise exception 'bad_provider_type';
    end if;
  elsif p_intent = 'agent' then v_role := 'supplier'; v_ptype := 'individual';  -- legacy intent
  else raise exception 'bad_intent'; end if;

  perform set_config('app.bypass_locks', 'on', true);
  update public.profiles
     set role = v_role, provider_type = v_ptype, role_chosen_at = now(),
         full_name = left(trim(p_full_name), 120),
         company_name_ar = case when company_name_ar is null or company_name_ar = 'شركة جديدة' then left(trim(p_full_name), 120) else company_name_ar end
   where id = auth.uid() and role_chosen_at is null and role <> 'admin';
  if not found then raise exception 'already_chosen'; end if;
  return v_role::text;
end $$;

-- A seller can switch between independent and company, and pick the company's activity, any
-- time. The tier follows automatically (company tier still needs CR verification).
create or replace function public.set_seller_kind(p_kind text, p_activity text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_ptype text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'supplier') then
    raise exception 'not_supplier';
  end if;
  if p_kind = 'independent' then v_ptype := 'individual';
  elsif p_kind = 'company' then
    v_ptype := coalesce(nullif(p_activity, ''), 'company');
    if v_ptype not in ('manufacturer','distributor','trading_company','retail_shop','company') then
      raise exception 'bad_activity';
    end if;
  else raise exception 'bad_kind'; end if;

  perform set_config('app.bypass_locks', 'on', true);
  update public.profiles set provider_type = v_ptype where id = auth.uid();
  return v_ptype;
end $$;

revoke all on function public.set_seller_kind(text, text) from public, anon;
grant execute on function public.set_seller_kind(text, text) to authenticated;

-- ── 6. Quote source & availability ───────────────────────────────────────────────────────────
alter table public.offers drop constraint if exists offers_source_type_check;
alter table public.offers add constraint offers_source_type_check
  check (source_type in ('own_stock','direct_supplier','shop','multiple_shops','market_estimate','intermediary'));

alter table public.offers add column if not exists availability text;
alter table public.offers drop constraint if exists offers_availability_check;
alter table public.offers add constraint offers_availability_check
  check (availability is null or availability in ('now','confirm','made_to_order'));
