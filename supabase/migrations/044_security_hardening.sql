-- ════════════════════════════════════════════════════════════════
-- 044: Security hardening + market index for multi-item offers
-- ════════════════════════════════════════════════════════════════

-- (1) licenses bucket: stop open file enumeration.
-- Public-URL access (getPublicUrl) keeps working without any SELECT policy
-- because the bucket is public. Only admins need the storage object API
-- (createSignedUrl) for moderation, so scope listing to admins.
drop policy if exists "licenses select" on storage.objects;
create policy "licenses select admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'licenses' and public.is_admin());

-- (2) Restrict sensitive, login-required RPCs so the anon role can't call
-- them at all (they already enforce auth.uid() internally — this is
-- defense-in-depth and silences the linter). See 045 for the PUBLIC revoke
-- that actually removes anon's inherited grant.
revoke execute on function public.accept_offer(uuid)                       from anon;
revoke execute on function public.submit_price_reduction(uuid, numeric)    from anon;
revoke execute on function public.request_price_reduction(uuid, integer, text) from anon;
revoke execute on function public.request_offer_info(uuid, text)           from anon;
revoke execute on function public.respond_offer_info(uuid, text)           from anon;
revoke execute on function public.request_profile_change(text, text, text, text) from anon;
revoke execute on function public.review_profile_change(uuid, boolean, text) from anon;

-- (3) Pin search_path on the profile field-lock trigger (mutable search_path warning).
create or replace function public.enforce_profile_field_locks()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if old.company_name_ar  is not null then new.company_name_ar  := old.company_name_ar;  end if;
  if old.company_name_en  is not null then new.company_name_en  := old.company_name_en;  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  return new;
end; $function$;

-- (4) rate_limits: make the deny-all explicit (RLS on, no policy = deny;
-- this records intent and silences the "RLS enabled no policy" notice).
-- Writes still go through check_rate_limit (SECURITY DEFINER, bypasses RLS).
drop policy if exists "rate_limits no direct access" on public.rate_limits;
create policy "rate_limits no direct access" on public.rate_limits
  for all to anon, authenticated
  using (false) with check (false);

-- (5) Market price index now also counts materials priced item-by-item
-- (multi-material offers store per-item prices in offers.item_prices,
-- where the scalar offers.unit_price is null and was being skipped).
create or replace function public.get_market_prices()
returns table(product_name text, sector text, unit text, avg_price numeric, min_price numeric, max_price numeric, offer_count bigint)
language sql
security definer
set search_path to 'public'
as $function$
  with single as (
    select r.product_name, r.sector::text as sector, r.unit as unit, o.unit_price as unit_price
    from offers o
    join rfqs r on r.id = o.rfq_id
    where o.status <> 'rejected' and o.unit_price is not null
  ),
  multi as (
    select it->>'product_name' as product_name,
           coalesce(it->>'sector', r.sector::text) as sector,
           it->>'unit' as unit,
           (it->>'unit_price')::numeric as unit_price
    from offers o
    join rfqs r on r.id = o.rfq_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) as it
    where o.status <> 'rejected'
      and jsonb_typeof(it->'unit_price') = 'number'
      and (it->>'unit_price')::numeric > 0
  ),
  combined as (select * from single union all select * from multi)
  select product_name, sector, max(unit) as unit,
         round(avg(unit_price)) as avg_price,
         min(unit_price) as min_price,
         max(unit_price) as max_price,
         count(*) as offer_count
  from combined
  where product_name is not null
  group by product_name, sector
  having count(*) >= 1;
$function$;
