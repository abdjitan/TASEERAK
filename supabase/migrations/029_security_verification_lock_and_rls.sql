-- ============================================================================
-- SECURITY FIX #1: Forgeable "Wathq-verified" status. Two holes:
--   (a) handle_new_user trusted client signup metadata (cr_verification_source)
--       to set verification_status='verified'.
--   (b) "Users update own profile" RLS let a user directly set verified.
-- Fix: stop reading verification from metadata; lock verification fields in the
-- BEFORE UPDATE trigger so only admins (is_admin) can change them.
-- SECURITY FIX #4: license_reviews had RLS enabled but ZERO policies.
-- ============================================================================

create or replace function public.enforce_profile_field_locks()
returns trigger language plpgsql as $$
begin
  if is_admin() then return new; end if;
  if old.company_name_ar  is not null then new.company_name_ar  := old.company_name_ar;  end if;
  if old.company_name_en  is not null then new.company_name_en  := old.company_name_en;  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  -- verification: server/admin-controlled ONLY — never settable by clients
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  return new;
end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); v_role user_role := 'contractor'; s text;
begin
  begin v_role := (m->>'role')::user_role; exception when others then v_role := 'contractor'; end;
  begin
    insert into profiles (id, role, company_name_ar, phone)
    values (new.id, v_role, coalesce(nullif(m->>'company_name_ar',''),'شركة جديدة'), coalesce(nullif(m->>'phone',''),''))
    on conflict (id) do update set role = excluded.role;
  exception when others then null; end;
  begin
    update profiles set
      company_name_en    = coalesce(nullif(m->>'company_name_en',''), company_name_en),
      phone              = coalesce(nullif(m->>'phone',''), phone),
      region             = coalesce(nullif(m->>'region',''), region),
      city               = coalesce(nullif(m->>'city',''), city),
      district           = coalesce(nullif(m->>'district',''), district),
      preferred_language = coalesce(nullif(m->>'preferred_language',''), preferred_language),
      supplier_tier      = coalesce(nullif(m->>'supplier_tier',''), supplier_tier),
      contractor_grade   = coalesce(nullif(m->>'contractor_grade',''), contractor_grade)
    where id = new.id;
  exception when others then null; end;
  begin
    update profiles set commercial_registration = nullif(m->>'commercial_registration','')
    where id = new.id and nullif(m->>'commercial_registration','') is not null;
  exception when others then null; end;
  begin
    update profiles set vat_number = nullif(m->>'vat_number','')
    where id = new.id and nullif(m->>'vat_number','') is not null;
  exception when others then null; end;
  begin
    update profiles set min_order_value = nullif(regexp_replace(coalesce(m->>'min_order_value',''),'[^0-9.]','','g'),'')::numeric
    where id = new.id;
  exception when others then null; end;
  -- NOTE: verification is intentionally NOT set from client metadata (security).
  begin
    if jsonb_typeof(m->'sectors') = 'array' then
      for s in select jsonb_array_elements_text(m->'sectors') loop
        begin insert into profile_sectors (profile_id, sector) values (new.id, s::sector); exception when others then null; end;
      end loop; end if;
  exception when others then null; end;
  begin
    if jsonb_typeof(m->'specialties') = 'array' then
      for s in select jsonb_array_elements_text(m->'specialties') loop
        begin insert into profile_specialties (profile_id, specialty) values (new.id, s); exception when others then null; end;
      end loop; end if;
  exception when others then null; end;
  begin
    if jsonb_typeof(m->'extra_materials') = 'array' then
      for s in select jsonb_array_elements_text(m->'extra_materials') loop
        begin insert into material_requests (supplier_id, name) values (new.id, s); exception when others then null; end;
      end loop; end if;
  exception when others then null; end;
  return new;
end; $function$;

create policy "license_reviews owner read" on public.license_reviews
  for select using (auth.uid() = profile_id or is_admin());
create policy "license_reviews admin manage" on public.license_reviews
  for all using (is_admin()) with check (is_admin());
