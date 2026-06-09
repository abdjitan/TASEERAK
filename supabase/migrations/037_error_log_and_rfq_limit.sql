-- (1) Visibility for the silent failures in handle_new_user (orphan detection).
create table if not exists public.system_errors_log (
  id uuid primary key default gen_random_uuid(),
  context text, message text, user_id uuid, created_at timestamptz not null default now()
);
alter table public.system_errors_log enable row level security;
create policy "sys errors admin read" on public.system_errors_log for select using (is_admin());

-- Rebuild handle_new_user so the critical minimal-insert failure is LOGGED.
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
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('handle_new_user.minimal_insert', sqlerrm, new.id); exception when others then null; end;
  end;
  begin
    update profiles set
      company_name_en=coalesce(nullif(m->>'company_name_en',''),company_name_en), phone=coalesce(nullif(m->>'phone',''),phone),
      region=coalesce(nullif(m->>'region',''),region), city=coalesce(nullif(m->>'city',''),city),
      district=coalesce(nullif(m->>'district',''),district), preferred_language=coalesce(nullif(m->>'preferred_language',''),preferred_language),
      supplier_tier=coalesce(nullif(m->>'supplier_tier',''),supplier_tier), contractor_grade=coalesce(nullif(m->>'contractor_grade',''),contractor_grade)
    where id=new.id;
  exception when others then null; end;
  begin update profiles set commercial_registration=nullif(m->>'commercial_registration','') where id=new.id and nullif(m->>'commercial_registration','') is not null; exception when others then null; end;
  begin update profiles set vat_number=nullif(m->>'vat_number','') where id=new.id and nullif(m->>'vat_number','') is not null; exception when others then null; end;
  begin update profiles set min_order_value=nullif(regexp_replace(coalesce(m->>'min_order_value',''),'[^0-9.]','','g'),'')::numeric where id=new.id; exception when others then null; end;
  begin if jsonb_typeof(m->'sectors')='array' then for s in select jsonb_array_elements_text(m->'sectors') loop begin insert into profile_sectors(profile_id,sector) values(new.id,s::sector); exception when others then null; end; end loop; end if; exception when others then null; end;
  begin if jsonb_typeof(m->'specialties')='array' then for s in select jsonb_array_elements_text(m->'specialties') loop begin insert into profile_specialties(profile_id,specialty) values(new.id,s); exception when others then null; end; end loop; end if; exception when others then null; end;
  begin if jsonb_typeof(m->'extra_materials')='array' then for s in select jsonb_array_elements_text(m->'extra_materials') loop begin insert into material_requests(supplier_id,name) values(new.id,s); exception when others then null; end; end loop; end if; exception when others then null; end;
  return new;
end; $function$;

-- (2) RFQ spam protection: unverified contractors are capped at 5 RFQs / 24h.
create or replace function public.enforce_rfq_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_verified boolean; v_count int;
begin
  select (verification_status = 'verified') into v_verified from public.profiles where id = new.contractor_id;
  if coalesce(v_verified, false) or is_admin() then return new; end if;
  select count(*) into v_count from public.rfqs where contractor_id = new.contractor_id and created_at > now() - interval '24 hours';
  if v_count >= 5 then raise exception 'rfq_daily_limit' using errcode = 'P0001'; end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_rfq_limit on public.rfqs;
create trigger trg_enforce_rfq_limit before insert on public.rfqs for each row execute function public.enforce_rfq_limit();
