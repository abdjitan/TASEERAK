-- 1) ROOT CAUSE: phone is NOT NULL with no default, so handle_new_user's
--    guaranteed minimal insert (which omits phone) failed → every new signup
--    became an orphan. A default makes that insert always succeed; the real
--    phone is still set by the enrichment step (and required by the form).
alter table public.profiles alter column phone set default '';

-- 2) The field-lock trigger (026) reverted FIRST-TIME enrichment of
--    company_name_en / supplier_tier / contractor_grade during signup (because
--    is_admin() is false there). Only lock fields that ALREADY have a value:
--    allow the initial set, block later changes.
create or replace function public.enforce_profile_field_locks()
returns trigger language plpgsql as $$
begin
  if is_admin() then return new; end if;
  if old.company_name_ar  is not null then new.company_name_ar  := old.company_name_ar;  end if;
  if old.company_name_en  is not null then new.company_name_en  := old.company_name_en;  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  return new;
end; $$;

-- 3) Backfill existing orphans (auth users with no profile) from signup metadata.
do $$
declare u record; m jsonb; v_role user_role; s text;
begin
  for u in
    select au.id, au.raw_user_meta_data as meta
    from auth.users au left join public.profiles p on p.id = au.id
    where p.id is null
  loop
    m := coalesce(u.meta, '{}'::jsonb);
    begin v_role := (m->>'role')::user_role; exception when others then v_role := 'contractor'; end;

    begin
      insert into public.profiles (id, role, company_name_ar, phone)
      values (u.id, v_role, coalesce(nullif(m->>'company_name_ar',''),'شركة جديدة'), coalesce(nullif(m->>'phone',''),''))
      on conflict (id) do nothing;
    exception when others then null; end;

    begin
      update public.profiles set
        company_name_en    = coalesce(nullif(m->>'company_name_en',''), company_name_en),
        region             = coalesce(nullif(m->>'region',''), region),
        city               = coalesce(nullif(m->>'city',''), city),
        district           = coalesce(nullif(m->>'district',''), district),
        preferred_language = coalesce(nullif(m->>'preferred_language',''), preferred_language),
        supplier_tier      = coalesce(nullif(m->>'supplier_tier',''), supplier_tier),
        contractor_grade   = coalesce(nullif(m->>'contractor_grade',''), contractor_grade)
      where id = u.id;
    exception when others then null; end;

    begin
      update public.profiles set commercial_registration = nullif(m->>'commercial_registration','')
      where id = u.id and nullif(m->>'commercial_registration','') is not null;
    exception when others then null; end;

    begin
      if jsonb_typeof(m->'sectors') = 'array' then
        for s in select jsonb_array_elements_text(m->'sectors') loop
          begin insert into public.profile_sectors (profile_id, sector) values (u.id, s::sector); exception when others then null; end;
        end loop;
      end if;
    exception when others then null; end;

    begin
      if jsonb_typeof(m->'specialties') = 'array' then
        for s in select jsonb_array_elements_text(m->'specialties') loop
          begin insert into public.profile_specialties (profile_id, specialty) values (u.id, s); exception when others then null; end;
        end loop;
      end if;
    exception when others then null; end;
  end loop;
end $$;
