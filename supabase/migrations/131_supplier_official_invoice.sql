-- 131: The official invoice comes from the seller, not from Taseerak (owner decision 2026-10-11).
--
-- Taseerak's own document is an unofficial purchase order / deal statement. The legal invoice is
-- issued by the seller (or, for an independent seller, by the shop he bought from) and the seller
-- attaches it to the deal (at delivery or later). The buyer sees and downloads it from the deal.
--
-- Also: deal steps on the seller side (confirm delivery / payment, attach invoice) work for
-- company team members through acting_uid(), and the file-access check knows team uploads.

alter table public.offers add column if not exists supplier_invoice_url  text;
alter table public.offers add column if not exists supplier_invoice_name text;
alter table public.offers add column if not exists supplier_invoice_at   timestamptz;

-- The buyer must not be able to change the seller's invoice (buyer branch of the column lock).
do $$
declare d text := pg_get_functiondef('public.lock_offer_deal_columns'::regproc); n text;
begin
  n := replace(d, 'new.availability := old.availability;',
    'new.availability := old.availability;
    new.supplier_invoice_url := old.supplier_invoice_url; new.supplier_invoice_name := old.supplier_invoice_name;
    new.supplier_invoice_at := old.supplier_invoice_at;');
  if n = d then raise exception 'lock_offer_deal_columns: pattern not found'; end if;
  execute n;
end $$;
-- ...and nobody sets it at insert time.
do $$
declare d text := pg_get_functiondef('public.sanitize_offer_insert'::regproc); n text;
begin
  n := replace(d, 'new.submitted_by := auth.uid();',
    'new.submitted_by := auth.uid();
  new.supplier_invoice_url := null; new.supplier_invoice_name := null; new.supplier_invoice_at := null;');
  if n = d then raise exception 'sanitize_offer_insert: pattern not found'; end if;
  execute n;
end $$;

create or replace function public.attach_supplier_invoice(p_offer_id uuid, p_url text, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_contractor uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط المورد يمكنه إرفاق فاتورته'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  -- only a file this user uploaded through /api/upload-attachment (storage key "<uid>/...")
  if coalesce(p_url, '') !~ ('/licenses/' || auth.uid()::text || '/[^/]+$') then raise exception 'رابط الملف غير صالح'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_invoice_url = p_url, supplier_invoice_name = left(coalesce(p_name, 'فاتورة'), 120),
                    supplier_invoice_at = now()
   where id = p_offer_id returning * into v;
  select contractor_id into v_contractor from rfqs where id = v.rfq_id;
  insert into notifications (user_id, type, title, body, data)
  values (v_contractor, 'offer_accepted', '🧾 أرفق المورد فاتورته',
    'أرفق المورد الفاتورة الرسمية للصفقة. يمكنك تنزيلها من صفحة الصفقة.',
    jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return to_jsonb(v);
end $$;
revoke all on function public.attach_supplier_invoice(uuid, text, text) from public, anon;
grant execute on function public.attach_supplier_invoice(uuid, text, text) to authenticated;

-- seller-side deal steps: a team member acts for the company
do $$
declare f text; d text; n text;
begin
  foreach f in array array['public.confirm_delivery', 'public.confirm_payment'] loop
    select pg_get_functiondef(p.oid) into d from pg_proc p where p.oid = to_regproc(f);
    n := replace(d, 'v.supplier_id <> auth.uid()', 'v.supplier_id <> public.acting_uid()');
    if n = d then raise notice '% : pattern not found (left unchanged)', f; else execute n; end if;
  end loop;
end $$;

-- file access: invoices, and files uploaded by a team member for the company's offers
create or replace function public.can_access_shared_file(p_path text)
returns boolean language plpgsql stable security definer set search_path = public as $function$
declare v_uid uuid := auth.uid(); v_act uuid := public.acting_uid(); v_owner uuid; v_owner_co uuid;
        v_served text[]; v_is_supplier boolean;
begin
  if v_uid is null then return false; end if;
  if length(coalesce(p_path,'')) < 20 then return false; end if;
  if p_path like '%..%' then return false; end if;
  if public.is_admin() then return true; end if;

  begin
    if p_path like 'material-requests/%' then
      v_owner := split_part(p_path, '/', 2)::uuid;
    else
      v_owner := split_part(p_path, '/', 1)::uuid;
    end if;
  exception when others then return false; end;
  if v_owner is null then return false; end if;

  if v_owner = v_uid then return true; end if;

  -- the uploader's company (a team member uploads for the company)
  select employer_id into v_owner_co from profiles where id = v_owner;

  -- Offer attachment / catalog / official invoice: owned by the seller (or a member of the
  -- seller's team) -> visible to the buyer of that RFQ, and to the seller's own team.
  if exists (
    select 1 from offers o join rfqs r on r.id = o.rfq_id
    where o.supplier_id in (v_owner, v_owner_co)
      and (r.contractor_id = v_uid or o.supplier_id = v_act)
      and (position(p_path in coalesce(o.attachment_url,'')) > 0
        or position(p_path in coalesce(o.item_prices::text,'')) > 0
        or position(p_path in coalesce(o.supplier_invoice_url,'')) > 0)
  ) then return true; end if;

  -- RFQ spec file / BOQ / quick-request photo: owned by the buyer -> visible to a seller who bid
  -- on that RFQ, or to a seller region-eligible for it while it is OPEN (team members act as
  -- their company).
  select (role = 'supplier') into v_is_supplier from profiles where id = v_uid;
  if not coalesce(v_is_supplier, false) then return false; end if;
  v_served := public.served_regions(v_act);
  if exists (
    select 1 from rfqs r
    where r.contractor_id = v_owner
      and (position(p_path in coalesce(r.items::text,'')) > 0
        or position(p_path in coalesce(r.notes,'')) > 0)
      and (
        exists (select 1 from offers o2 where o2.rfq_id = r.id and o2.supplier_id = v_act)
        or (
          r.status = 'open'
          and (coalesce(r.nearby_only,false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
          and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
        )
      )
  ) then return true; end if;

  return false;
end; $function$;
