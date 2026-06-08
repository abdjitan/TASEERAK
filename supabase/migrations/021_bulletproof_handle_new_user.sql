-- BUG: profiles.commercial_registration is UNIQUE. When two users signed up with
-- the same CR (e.g. the test value 0000000000), the trigger's all-in-one profile
-- INSERT failed on the unique constraint, the exception was swallowed, and the user
-- ended up with NO profile row. Since offers.supplier_id → profiles(id), that user
-- then hit "offers_supplier_id_fkey" when submitting an offer.
--
-- FIX: make handle_new_user() bulletproof — the core profile row is ALWAYS created
-- (minimal insert with only PK + non-unique columns), then every optional / unique /
-- typed field is filled in its own isolated block, so a duplicate CR/VAT, a bad
-- numeric, or an invalid enum can never prevent the profile from existing.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role user_role := 'contractor';
  s text;
begin
  begin v_role := (m->>'role')::user_role; exception when others then v_role := 'contractor'; end;

  -- 1) GUARANTEED minimal profile (only PK + non-unique columns → cannot fail)
  begin
    insert into profiles (id, role, company_name_ar)
    values (new.id, v_role, coalesce(nullif(m->>'company_name_ar',''),'شركة جديدة'))
    on conflict (id) do update set role = excluded.role;
  exception when others then null; end;

  -- 2) Enrich plain (non-unique) fields
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

  -- 3) UNIQUE fields, each isolated — a duplicate must NOT break the profile
  begin
    update profiles set commercial_registration = nullif(m->>'commercial_registration','')
    where id = new.id and nullif(m->>'commercial_registration','') is not null;
  exception when others then null; end;
  begin
    update profiles set vat_number = nullif(m->>'vat_number','')
    where id = new.id and nullif(m->>'vat_number','') is not null;
  exception when others then null; end;

  -- 4) numeric min_order_value (sanitized so "1,000 ر.س" never throws)
  begin
    update profiles set min_order_value = nullif(regexp_replace(coalesce(m->>'min_order_value',''),'[^0-9.]','','g'),'')::numeric
    where id = new.id;
  exception when others then null; end;

  begin
    if coalesce(m->>'cr_verification_source','') = 'wathq' then
      update profiles set verification_status='verified', cr_verification_source='wathq', cr_verified_at=now(),
        cr_official_name=nullif(m->>'cr_official_name',''), cr_activity=nullif(m->>'cr_activity',''),
        cr_status=nullif(m->>'cr_status',''), cr_issue_date=nullif(m->>'cr_issue_date','')::date,
        cr_expiry_date=nullif(m->>'cr_expiry_date','')::date
      where id = new.id;
    end if;
  exception when others then null; end;

  begin
    if jsonb_typeof(m->'sectors') = 'array' then
      for s in select jsonb_array_elements_text(m->'sectors') loop
        begin insert into profile_sectors (profile_id, sector) values (new.id, s::sector); exception when others then null; end;
      end loop;
    end if;
  exception when others then null; end;

  begin
    if jsonb_typeof(m->'specialties') = 'array' then
      for s in select jsonb_array_elements_text(m->'specialties') loop
        begin insert into profile_specialties (profile_id, specialty) values (new.id, s); exception when others then null; end;
      end loop;
    end if;
  exception when others then null; end;

  begin
    if jsonb_typeof(m->'extra_materials') = 'array' then
      for s in select jsonb_array_elements_text(m->'extra_materials') loop
        begin insert into material_requests (supplier_id, name) values (new.id, s); exception when others then null; end;
      end loop;
    end if;
  exception when others then null; end;

  return new;
end; $$;

-- One-time backfill: create profiles for any auth users left without one by the old
-- failing trigger (skip unique CR/VAT to avoid the very collision that broke them).
insert into public.profiles (id, role, company_name_ar, company_name_en, phone, region, city, district, preferred_language, supplier_tier, contractor_grade)
select u.id,
  (case when (u.raw_user_meta_data->>'role') in ('supplier','contractor','admin') then (u.raw_user_meta_data->>'role')::user_role else 'contractor' end),
  coalesce(nullif(u.raw_user_meta_data->>'company_name_ar',''),'شركة جديدة'),
  nullif(u.raw_user_meta_data->>'company_name_en',''),
  coalesce(u.raw_user_meta_data->>'phone',''),
  nullif(u.raw_user_meta_data->>'region',''),
  nullif(u.raw_user_meta_data->>'city',''),
  nullif(u.raw_user_meta_data->>'district',''),
  coalesce(nullif(u.raw_user_meta_data->>'preferred_language',''),'ar'),
  nullif(u.raw_user_meta_data->>'supplier_tier',''),
  nullif(u.raw_user_meta_data->>'contractor_grade','')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
