-- 202: the seller kind chosen on the sign-up form (independent / company) is stored when the
-- account is created. Before, only /onboarding applied it, so a seller who pressed «لاحقاً» stayed
-- with no provider_type and was treated as a company. Rest of the function unchanged.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); v_role user_role := 'contractor'; s text;
  v_phone text := coalesce(nullif(m->>'phone',''), case when new.phone like '9665%' and length(new.phone) = 12 then '0' || substr(new.phone, 4) else '' end);
begin
  begin v_role := coalesce((m->>'role')::user_role, 'contractor'); exception when others then v_role := 'contractor'; end;
  -- 🔒 SECURITY (C3): public signup can NEVER self-assign admin. Admins are created manually only.
  if v_role is null or v_role not in ('contractor','supplier') then v_role := 'contractor'; end if;
  begin
    insert into profiles (id, role, company_name_ar, phone, full_name, role_chosen_at, provider_type)
    values (new.id, v_role, coalesce(nullif(m->>'company_name_ar',''),'شركة جديدة'), v_phone, nullif(m->>'full_name',''),
            case when nullif(m->>'role','') is not null then now() end,
            case when v_role = 'supplier' and m->>'seller_kind' = 'independent' then 'individual'
                 when v_role = 'supplier' and m->>'seller_kind' = 'company' then 'company' end)
    on conflict (id) do update set role = excluded.role;
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('handle_new_user.minimal_insert', sqlerrm, new.id); exception when others then null; end;
  end;
  begin
    update profiles set
      full_name=coalesce(nullif(m->>'full_name',''),full_name),
      company_name_en=coalesce(nullif(m->>'company_name_en',''),company_name_en), phone=coalesce(nullif(m->>'phone',''),phone),
      region=coalesce(nullif(m->>'region',''),region), city=coalesce(nullif(m->>'city',''),city),
      district=coalesce(nullif(m->>'district',''),district), preferred_language=coalesce(nullif(m->>'preferred_language',''),preferred_language)
    where id=new.id;
  exception when others then null; end;
  begin update profiles set vat_number=nullif(m->>'vat_number','') where id=new.id and nullif(m->>'vat_number','') is not null; exception when others then null; end;
  begin update profiles set min_order_value=nullif(regexp_replace(coalesce(m->>'min_order_value',''),'[^0-9.]','','g'),'')::numeric where id=new.id; exception when others then null; end;
  begin if jsonb_typeof(m->'sectors')='array' then for s in select jsonb_array_elements_text(m->'sectors') loop begin insert into profile_sectors(profile_id,sector) values(new.id,s::sector); exception when others then null; end; end loop; end if; exception when others then null; end;
  begin if jsonb_typeof(m->'specialties')='array' then for s in select jsonb_array_elements_text(m->'specialties') loop begin insert into profile_specialties(profile_id,specialty) values(new.id,s); exception when others then null; end; end loop; end if; exception when others then null; end;
  begin if jsonb_typeof(m->'extra_materials')='array' then for s in select jsonb_array_elements_text(m->'extra_materials') loop begin insert into material_requests(supplier_id,name) values(new.id,s); exception when others then null; end; end loop; end if; exception when others then null; end;
  return new;
end; $function$;
