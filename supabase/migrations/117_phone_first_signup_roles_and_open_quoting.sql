-- 117 (applied 2026-10-08 via MCP as phone_first_signup_roles_and_open_quoting)
-- Phone-first signup (owner study 2026-10-08): phone + WhatsApp OTP creates the account,
-- then the user picks what they want to do. Providers need not be companies.
-- NOTE: the handle_new_user body applied with this migration had a NULL-role bug and was
-- replaced minutes later by 118; see 118 for the live definition.

alter table public.profiles add column if not exists provider_type text
  check (provider_type in ('manufacturer','distributor','trading_company','retail_shop','dealer','individual','broker','price_agent'));
alter table public.profiles add column if not exists role_chosen_at timestamptz;
update public.profiles set role_chosen_at = created_at where role_chosen_at is null;

alter table public.offers add column if not exists source_type text
  check (source_type in ('own_stock','direct_supplier','shop','multiple_shops','market_estimate'));

-- One-time choice of what the user wants to do. Only while role_chosen_at is null.
create or replace function public.choose_my_role(p_intent text, p_full_name text, p_provider_type text default null)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_role user_role; v_ptype text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(coalesce(trim(p_full_name), '')) < 2 then raise exception 'name_required'; end if;
  if p_intent = 'buyer' then v_role := 'contractor'; v_ptype := null;
  elsif p_intent = 'provider' then
    v_role := 'supplier';
    v_ptype := coalesce(p_provider_type, 'retail_shop');
    if v_ptype not in ('manufacturer','distributor','trading_company','retail_shop','dealer','individual','broker') then raise exception 'bad_provider_type'; end if;
  elsif p_intent = 'agent' then v_role := 'supplier'; v_ptype := 'price_agent';
  else raise exception 'bad_intent'; end if;

  perform set_config('app.bypass_locks', 'on', true);
  update public.profiles
     set role = v_role, provider_type = v_ptype, role_chosen_at = now(),
         full_name = left(trim(p_full_name), 120),
         company_name_ar = case when company_name_ar is null or company_name_ar = 'شركة جديدة' then left(trim(p_full_name), 120) else company_name_ar end
   where id = auth.uid() and role_chosen_at is null and role <> 'admin';
  if not found then raise exception 'already_chosen'; end if;
  return v_role::text;
end; $function$;
revoke all on function public.choose_my_role(text, text, text) from public, anon;
grant execute on function public.choose_my_role(text, text, text) to authenticated;

-- Quoting is open to providers with a verified phone (Level 1), not only CR-verified suppliers.
create or replace function public.can_submit_quote()
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'supplier' and p.is_active is not false
      and (p.verification_status = 'verified'
           or coalesce(p.cr_verification_source, '') = 'wathq'
           or exists (select 1 from auth.users u where u.id = p.id and u.phone_confirmed_at is not null))
  );
$$;
revoke all on function public.can_submit_quote() from public, anon;
grant execute on function public.can_submit_quote() to authenticated;

drop policy if exists "Suppliers create own offers" on public.offers;
create policy "Suppliers create own offers" on public.offers
  for insert
  with check (supplier_id = auth.uid() and public.can_submit_quote());

-- Lock the new columns against direct client writes (set only via choose_my_role / admin).
create or replace function public.enforce_profile_field_locks()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare v_name_locked boolean;
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if pg_trigger_depth() > 1 then return new; end if;
  new.role := old.role;   -- privesc lock
  new.id   := old.id;
  new.provider_type  := old.provider_type;
  new.role_chosen_at := old.role_chosen_at;
  v_name_locked := (old.verification_status = 'verified') or (coalesce(old.cr_verification_source, '') = 'wathq');
  if v_name_locked then
    if old.company_name_ar is not null then new.company_name_ar := old.company_name_ar; end if;
    if old.company_name_en is not null then new.company_name_en := old.company_name_en; end if;
    new.commercial_registration := old.commercial_registration;
  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  new.cr_activity            := old.cr_activity;
  new.cr_status              := old.cr_status;
  new.cr_issue_date          := old.cr_issue_date;
  new.cr_expiry_date         := old.cr_expiry_date;
  new.cr_data                := old.cr_data;
  new.rating_avg             := old.rating_avg;
  new.rating_count           := old.rating_count;
  new.subscription_plan      := old.subscription_plan;
  new.subscription_expires_at:= old.subscription_expires_at;
  new.is_active              := old.is_active;
  new.approvals              := old.approvals;
  new.rejection_reason       := old.rejection_reason;
  new.auto_classification            := old.auto_classification;
  new.auto_classification_note       := old.auto_classification_note;
  new.auto_classification_confidence := old.auto_classification_confidence;
  new.auto_classification_source     := old.auto_classification_source;
  new.auto_classified_at             := old.auto_classified_at;
  new.created_at             := old.created_at;
  return new;
end; $function$;
