-- 106: Admin dispute resolution. Applied live 2026-07-12.
-- Parties open disputes via open_dispute(); the admin disputes tab now resolves them
-- through admin_resolve_dispute() which ALSO notifies both parties (in-app + web-push),
-- closing the "the platform mediates" loop. admin_list_disputes() is a ready helper for a
-- future resolved-history / evidence view (admin-only).

create or replace function public.admin_list_disputes()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v jsonb;
begin
  if not is_admin() then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(to_jsonb(d) order by (d.dispute_status = 'open') desc, d.dispute_opened_at desc), '[]'::jsonb) into v
  from (
    select o.id as offer_id, o.rfq_id, coalesce(r.title, r.product_name) as product,
      o.invoice_number, o.total_price, o.dispute_status, o.dispute_reason,
      o.dispute_opened_at, o.dispute_resolution, o.dispute_resolved_at,
      o.received_at, o.payment_status,
      case when o.dispute_by = r.contractor_id then 'contractor'
           when o.dispute_by = o.supplier_id then 'supplier' else 'other' end as opened_by,
      cp.company_name_ar as contractor, sp.company_name_ar as supplier
    from offers o
    join rfqs r on r.id = o.rfq_id
    left join profiles cp on cp.id = r.contractor_id
    left join profiles sp on sp.id = o.supplier_id
    where o.dispute_status is not null
  ) d;
  return v;
end; $$;
grant execute on function public.admin_list_disputes() to authenticated;

create or replace function public.admin_resolve_dispute(p_offer_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_res text; v_contractor uuid; v_supplier uuid; v_status text;
begin
  if not is_admin() then raise exception 'not authorized'; end if;
  select o.supplier_id, r.contractor_id, o.dispute_status
    into v_supplier, v_contractor, v_status
    from offers o join rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_supplier is null then raise exception 'العرض غير موجود'; end if;
  if v_status is distinct from 'open' then raise exception 'لا يوجد نزاع مفتوح لهذا العرض'; end if;
  v_res := coalesce(nullif(btrim(p_resolution), ''), 'راجعت الإدارة النزاع وأغلقته.');
  perform set_config('app.deal_write', 'on', true);  -- pass the C2 deal-column lock
  update offers set dispute_status = 'resolved', dispute_resolution = left(v_res, 1000), dispute_resolved_at = now()
    where id = p_offer_id;
  insert into notifications (user_id, type, title, body, data)
    select uid, 'new_message'::notification_type, 'تم حلّ النزاع', v_res, jsonb_build_object('url', '/messages')
    from (select v_supplier as uid union select v_contractor) u where u.uid is not null;
end; $$;
grant execute on function public.admin_resolve_dispute(uuid, text) to authenticated;
