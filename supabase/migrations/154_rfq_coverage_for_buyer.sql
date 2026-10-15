-- Tell the buyer how far their request reached (2026-10-15): per item, how many suppliers match
-- (same rules as notify_suppliers_new_rfq via count_matching_suppliers). Only the request owner
-- or an admin may ask; only counts come back, never supplier identities.

create or replace function public.get_rfq_coverage(p_rfq uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  r public.rfqs;
  v_items jsonb;
begin
  select * into r from rfqs where id = p_rfq;
  if not found then return null; end if;
  if r.contractor_id <> auth.uid() and not public.is_admin() then
    raise exception 'not allowed';
  end if;
  v_items := case
    when r.items is not null and jsonb_typeof(r.items) = 'array' and jsonb_array_length(r.items) > 0 then r.items
    else jsonb_build_array(jsonb_build_object('sector', r.sector::text, 'sub_category', r.sub_category, 'product_name', r.product_name))
  end;
  return (
    select jsonb_build_object(
      'items', coalesce(jsonb_agg(jsonb_build_object('name', it->>'product_name', 'suppliers', public.count_matching_suppliers(r, it))), '[]'::jsonb),
      'reached', (select count(distinct n.user_id) from notifications n where n.type = 'new_rfq' and n.data->>'rfq_id' = r.id::text)
    )
    from jsonb_array_elements(v_items) it
  );
end;
$$;
revoke all on function public.get_rfq_coverage(uuid) from public, anon;
grant execute on function public.get_rfq_coverage(uuid) to authenticated;
