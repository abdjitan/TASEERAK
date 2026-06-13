-- Admin can correct the material (sector / group / name) and add a note while
-- approving, so it lands in the right place. Replaces the single-arg version.
drop function if exists public.approve_material_request(uuid);

create or replace function public.approve_material_request(
  p_id uuid,
  p_sector text default null,
  p_sub_category text default null,
  p_name text default null,
  p_admin_note text default null
) returns void
language plpgsql security definer set search_path to 'public' as $$
declare v_name text; v_sector text; v_sub text;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select coalesce(nullif(btrim(p_name), ''), name),
         coalesce(nullif(btrim(p_sector), ''), sector, 'civil'),
         coalesce(nullif(btrim(p_sub_category), ''), sub_category)
    into v_name, v_sector, v_sub
  from material_requests where id = p_id;
  if v_name is null then raise exception 'Request not found'; end if;

  update material_requests set
    status = 'approved', reviewed_at = now(),
    name = v_name, sector = v_sector, sub_category = v_sub,
    admin_note = coalesce(nullif(btrim(p_admin_note), ''), admin_note)
  where id = p_id;

  insert into materials (sector, sub_category, name, source_request)
  values (v_sector, v_sub, v_name, p_id)
  on conflict (sector, name) do update set is_active = true, sub_category = excluded.sub_category;
end; $$;

revoke execute on function public.approve_material_request(uuid, text, text, text, text) from public, anon;
grant execute on function public.approve_material_request(uuid, text, text, text, text) to authenticated;
