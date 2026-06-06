-- =====================================================================
-- 012_handle_new_user_full_profile.sql
-- Make the signup trigger build the COMPLETE profile (sectors, specialties,
-- tier, Wathq verification, suggested materials) from the signUp metadata,
-- instead of relying on the browser to write it after sign-up.
--
-- Why: once email confirmation is enabled, signUp returns no session, so the
-- browser can't write the profile under RLS. Doing it in this SECURITY
-- DEFINER trigger makes registration work in both modes (confirm on/off) and
-- removes the fragile client-side writes.
--
-- Every section is wrapped in its own exception handler so a single bad value
-- can never block account creation.
-- (Function body applied via migration — see project history.)
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role user_role := coalesce((m->>'role')::user_role, 'contractor');
  s text;
begin
  begin
    insert into profiles (
      id, role, company_name_ar, company_name_en, phone,
      commercial_registration, vat_number, region, city,
      supplier_tier, contractor_grade, min_order_value
    ) values (
      new.id, v_role,
      coalesce(m->>'company_name_ar', 'شركة جديدة'),
      nullif(m->>'company_name_en', ''),
      coalesce(m->>'phone', ''),
      nullif(m->>'commercial_registration', ''),
      nullif(m->>'vat_number', ''),
      nullif(m->>'region', ''),
      nullif(m->>'city', ''),
      nullif(m->>'supplier_tier', ''),
      nullif(m->>'contractor_grade', ''),
      nullif(m->>'min_order_value', '')::numeric
    )
    on conflict (id) do update set
      role                    = excluded.role,
      company_name_ar         = excluded.company_name_ar,
      company_name_en         = coalesce(excluded.company_name_en, profiles.company_name_en),
      phone                   = excluded.phone,
      commercial_registration = coalesce(excluded.commercial_registration, profiles.commercial_registration),
      vat_number              = coalesce(excluded.vat_number, profiles.vat_number),
      region                  = coalesce(excluded.region, profiles.region),
      city                    = coalesce(excluded.city, profiles.city),
      supplier_tier           = coalesce(excluded.supplier_tier, profiles.supplier_tier),
      contractor_grade        = coalesce(excluded.contractor_grade, profiles.contractor_grade),
      min_order_value         = coalesce(excluded.min_order_value, profiles.min_order_value);
  exception when others then null;
  end;

  begin
    if coalesce(m->>'cr_verification_source','') = 'wathq' then
      update profiles set
        verification_status    = 'verified',
        cr_verification_source = 'wathq',
        cr_verified_at         = now(),
        cr_official_name       = nullif(m->>'cr_official_name',''),
        cr_activity            = nullif(m->>'cr_activity',''),
        cr_status              = nullif(m->>'cr_status',''),
        cr_issue_date          = nullif(m->>'cr_issue_date','')::date,
        cr_expiry_date         = nullif(m->>'cr_expiry_date','')::date
      where id = new.id;
    end if;
  exception when others then null;
  end;

  begin
    if jsonb_typeof(m->'sectors') = 'array' then
      for s in select jsonb_array_elements_text(m->'sectors') loop
        begin insert into profile_sectors (profile_id, sector) values (new.id, s::sector);
        exception when others then null; end;
      end loop;
    end if;
  exception when others then null;
  end;

  begin
    if jsonb_typeof(m->'specialties') = 'array' then
      for s in select jsonb_array_elements_text(m->'specialties') loop
        begin insert into profile_specialties (profile_id, specialty) values (new.id, s);
        exception when others then null; end;
      end loop;
    end if;
  exception when others then null;
  end;

  begin
    if jsonb_typeof(m->'extra_materials') = 'array' then
      for s in select jsonb_array_elements_text(m->'extra_materials') loop
        begin insert into material_requests (supplier_id, name) values (new.id, s);
        exception when others then null; end;
      end loop;
    end if;
  exception when others then null;
  end;

  return new;
end;
$$;
