-- On a new open RFQ, create a notification for every supplier whose profile
-- matches it (sector, verification, tier and region targeting). This delivers
-- through the existing per-user notifications realtime (filtered by user_id),
-- which is reliable — unlike a broad subscribe-to-all-RFQs channel.
create or replace function public.notify_suppliers_new_rfq()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_body text;
  v_sectors text[];
begin
  if new.status <> 'open' then return new; end if;
  v_sectors := coalesce(new.sectors, array[new.sector::text]);
  v_body := coalesce(new.title, new.product_name, 'طلب تسعير جديد');

  insert into notifications (user_id, type, title, body, data)
  select distinct p.id, 'new_rfq'::notification_type,
         'طلب تسعير جديد', v_body,
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.id::text, 'rfq_id', new.id)
  from profiles p
  where p.role::text = 'supplier'
    and coalesce(p.is_active, true)
    and p.id <> new.contractor_id
    and exists (
      select 1 from profile_sectors ps
      where ps.profile_id = p.id and ps.sector::text = any(v_sectors)
    )
    and (not coalesce(new.verified_only, false) or p.verification_status::text = 'verified')
    and (new.target_tiers is null or coalesce(p.supplier_tier, 'local') = any(new.target_tiers))
    and (
      new.target_regions is null
      or p.region = any(new.target_regions)
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = any(new.target_regions))
    )
    and (
      not coalesce(new.nearby_only, false)
      or p.region = new.region
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = new.region)
    );
  return new;
end;
$$;

drop trigger if exists trg_notify_suppliers_new_rfq on public.rfqs;
create trigger trg_notify_suppliers_new_rfq
  after insert on public.rfqs
  for each row execute function public.notify_suppliers_new_rfq();
