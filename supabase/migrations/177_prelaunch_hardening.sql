-- 177: pre-launch hardening (applied to the live DB on 2026-10-28 by the online review session;
-- recovered from supabase_migrations.schema_migrations so the repo matches the database).
create or replace function public.lock_offer_deal_columns_extra() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  new.invoice_number := old.invoice_number; new.po_number := old.po_number; new.accepted_at := old.accepted_at;
  new.supplier_invoice_url := old.supplier_invoice_url; new.supplier_invoice_name := old.supplier_invoice_name;
  new.supplier_invoice_at := old.supplier_invoice_at;
  if public.acting_uid() is distinct from old.supplier_id then
    new.payment_terms := old.payment_terms; new.vat_status := old.vat_status;
  end if;
  if old.status = 'accepted' or exists (select 1 from public.rfq_item_awards a where a.offer_id = old.id) then
    new.payment_terms := old.payment_terms; new.vat_status := old.vat_status;
    new.total_price := old.total_price; new.unit_price := old.unit_price; new.item_prices := old.item_prices;
    new.extra_charges := old.extra_charges; new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
  end if;
  return new;
end $$;

drop trigger if exists trg_lock_offer_deal_columns_zz on public.offers;
create trigger trg_lock_offer_deal_columns_zz before update on public.offers
  for each row execute function public.lock_offer_deal_columns_extra();

create unique index if not exists offers_invoice_number_uniq on public.offers(invoice_number)
  where invoice_number is not null;

drop policy if exists "Delete own or counterparty offers" on public.offers;
drop policy if exists "Admin delete offers" on public.offers;
create policy "Admin delete offers" on public.offers for delete to authenticated
  using ((select public.is_admin()));

create or replace function public.accept_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_caller uuid := auth.uid(); v_status text; v_items int;
begin
  perform set_config('app.deal_write', 'on', true);
  select rfq_id into v_rfq from public.offers where id = p_offer_id for update;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  select status::text, case when jsonb_typeof(items) = 'array' then jsonb_array_length(items) else 0 end
    into v_status, v_items from public.rfqs where id = v_rfq;
  if not is_admin() and not exists (select 1 from public.rfqs where id = v_rfq and contractor_id = v_caller) then
    raise exception 'forbidden';
  end if;
  if v_status <> 'open' then raise exception 'لا يمكن قبول عرض على طلب مغلق.'; end if;
  if v_items > 1 or exists (select 1 from public.rfq_item_awards where rfq_id = v_rfq) then
    raise exception 'هذا الطلب متعدد المواد: اعتمد الترسية لكل مادة من صفحة الطلب.';
  end if;
  update public.offers set status='accepted', accepted_at=now() where id = p_offer_id and status='pending';
  if not found then raise exception 'offer_not_pending'; end if;
  update public.offers
    set invoice_number = 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
    where id = p_offer_id and invoice_number is null;
  update public.offers set status='rejected' where rfq_id = v_rfq and id <> p_offer_id and status='pending';
  update public.rfqs set status='closed' where id = v_rfq;
  insert into public.audit_logs(actor_id, action, entity, entity_id, detail) values (v_caller, 'accept_offer', 'offer', p_offer_id, jsonb_build_object('rfq_id', v_rfq));
end; $$;

create or replace function public.award_rfq_item(p_rfq_id uuid, p_item_index integer, p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_contractor uuid;
  v_status text;
  v_pname text;
  v_entry jsonb;
  v_supplier uuid;
begin
  select contractor_id, status::text, (items -> p_item_index ->> 'product_name')
    into v_contractor, v_status, v_pname
  from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if v_status <> 'open' or exists (select 1 from offers where rfq_id = p_rfq_id and status = 'accepted') then
    raise exception 'لا يمكن تعديل الترسية بعد اعتماد الصفقة أو إغلاق الطلب.';
  end if;
  if v_pname is null then raise exception 'Item not found'; end if;

  select o.supplier_id, ip into v_supplier, v_entry
  from offers o
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
  ) ip
  where o.id = p_offer_id and o.rfq_id = p_rfq_id and o.status = 'pending'
    and (ip->>'item_index')::int = p_item_index
  limit 1;

  if v_entry is null then
    select o.supplier_id, ip into v_supplier, v_entry
    from offers o
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) ip
    where o.id = p_offer_id and o.rfq_id = p_rfq_id and o.status = 'pending'
      and ip->>'item_index' is null and ip->>'product_name' = v_pname
    limit 1;
  end if;

  if v_entry is null then raise exception 'Offer does not price this item'; end if;

  insert into rfq_item_awards (rfq_id, item_index, item_key, offer_id, supplier_id, unit_price, total, quantity, unit)
  values (p_rfq_id, p_item_index, v_pname, p_offer_id, v_supplier,
          nullif(v_entry->>'unit_price','')::numeric,
          coalesce(nullif(v_entry->>'total','')::numeric, 0),
          nullif(v_entry->>'quantity','')::numeric,
          v_entry->>'unit')
  on conflict (rfq_id, item_index)
  do update set offer_id = excluded.offer_id, supplier_id = excluded.supplier_id,
                unit_price = excluded.unit_price, total = excluded.total,
                quantity = excluded.quantity, unit = excluded.unit, awarded_at = now();
end $$;

create or replace function public.finalize_rfq_awards(p_rfq_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_contractor uuid;
begin
  perform set_config('app.deal_write', 'on', true);
  select contractor_id into v_contractor from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from rfq_item_awards a join offers o on o.id = a.offer_id
                 where a.rfq_id = p_rfq_id and o.status in ('pending', 'accepted')) then
    raise exception 'No awards to finalize';
  end if;
  update offers o set status = 'accepted', accepted_at = coalesce(o.accepted_at, now())
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update offers set invoice_number = 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
  where rfq_id = p_rfq_id and status = 'accepted' and invoice_number is null;
  update offers o set status = 'rejected'
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and not exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update rfqs set status = 'closed' where id = p_rfq_id and status = 'open';
end; $$;

create or replace function public.submit_price_reduction(p_offer_id uuid, p_new_total numeric)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_qty numeric; v_product text;
        v_old numeric; v_deadline timestamptz; v_ratio numeric; v_extras numeric; v_items int;
begin
  select o.rfq_id, o.supplier_id, r.contractor_id, r.quantity, public.rfq_label(r), o.total_price, o.reduction_deadline,
         coalesce((select sum(coalesce(nullif(e->>'amount','')::numeric, 0))
                   from jsonb_array_elements(case when jsonb_typeof(o.extra_charges) = 'array' then o.extra_charges else '[]'::jsonb end) e), 0),
         case when jsonb_typeof(r.items) = 'array' then jsonb_array_length(r.items) else 1 end
    into v_rfq, v_supplier, v_contractor, v_qty, v_product, v_old, v_deadline, v_extras, v_items
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if v_supplier is distinct from public.acting_uid() and not is_admin() then raise exception 'forbidden'; end if;
  if v_deadline is null or v_deadline < now() then
    raise exception 'لا يوجد طلب تخفيض مفتوح على هذا العرض.';
  end if;
  if p_new_total is null or p_new_total <= 0 or v_old is null or p_new_total >= v_old then
    raise exception 'السعر الجديد يجب أن يكون أقل من السعر الحالي.';
  end if;
  if p_new_total <= v_extras or v_old <= v_extras then
    raise exception 'السعر الجديد يجب أن يكون أكبر من الرسوم الإضافية.';
  end if;
  v_ratio := (p_new_total - v_extras) / (v_old - v_extras);
  perform set_config('app.deal_write', 'on', true);
  update public.offers
    set total_price = p_new_total,
        unit_price = case when v_items <= 1 and coalesce(v_qty,0) > 0 then round((p_new_total - v_extras) / v_qty, 2)
                          when v_items > 1 then null else unit_price end,
        item_prices = case when jsonb_typeof(item_prices) = 'array' then (
          select coalesce(jsonb_agg(
            case when jsonb_typeof(e) <> 'object' then e else e
              || case when jsonb_typeof(e->'unit_price') = 'number'
                      then jsonb_build_object('unit_price', round((e->>'unit_price')::numeric * v_ratio, 2)) else '{}'::jsonb end
              || case when jsonb_typeof(e->'total') = 'number'
                      then jsonb_build_object('total', round((e->>'total')::numeric * v_ratio, 2)) else '{}'::jsonb end
            end order by i), '[]'::jsonb)
          from jsonb_array_elements(item_prices) with ordinality t(e, i)
        ) else item_prices end,
        reduction_deadline = null
  where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  update public.rfq_item_awards
    set unit_price = case when unit_price is null then null else round(unit_price * v_ratio, 2) end,
        total = round(coalesce(total, 0) * v_ratio, 2)
  where offer_id = p_offer_id;
  perform set_config('app.deal_write', 'off', true);
  insert into public.notifications (user_id, type, title, body, data)
  values (v_contractor, 'rfq_offer', 'تم تخفيض السعر',
    'خفّض المورد سعر عرضه على «' || coalesce(v_product, 'طلب') || '» إلى ' || p_new_total::text || ' ر.س.',
    jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'reduction_response'));
end $$;

alter table public.profiles drop constraint if exists profiles_doc_paths_own;
alter table public.profiles add constraint profiles_doc_paths_own check (
  (cr_url is null or cr_url = '' or cr_url ~ ('^' || id::text || '/[a-z_]+\.(pdf|jpe?g|png|webp)$'))
  and (license_url is null or license_url = '' or license_url ~ ('^' || id::text || '/[a-z_]+\.(pdf|jpe?g|png|webp)$'))
);

create or replace function public._rate_limit_hit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int; v_window int;
begin
  if p_bucket is null or length(p_bucket) > 200 then return false; end if;
  v_window := greatest(coalesce(p_window_seconds, 3600), 3600);
  if random() < 0.005 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  insert into public.rate_limits as rl (bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when rl.window_start < now() - make_interval(secs => v_window) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => v_window) then now() else rl.window_start end
  returning rl.count into v_count;
  return v_count <= p_max;
end $$;
revoke all on function public._rate_limit_hit(text, integer, integer) from public, anon, authenticated;

do $$
declare f record; d text;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in
      ('email_exists', 'phone_exists', 'cr_exists', 'set_otp_language', 'submit_cr_claim', 'suggestions_before_insert')
  loop
    d := pg_get_functiondef(f.oid);
    if position('check_rate_limit(' in d) > 0 then
      execute replace(d, 'check_rate_limit(', '_rate_limit_hit(');
    end if;
  end loop;
end $$;

create or replace function public.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(auth.role(), '');
begin
  if v_role = 'anon' then return false; end if;
  if v_role = 'authenticated' and (auth.uid() is null or p_bucket is null
       or p_bucket not like '%:' || auth.uid()::text) then
    return false;
  end if;
  return public._rate_limit_hit(p_bucket, p_max, p_window_seconds);
end $$;
revoke execute on function public.check_rate_limit(text, integer, integer) from anon;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'net') then
    revoke usage on schema net from anon, authenticated;
    revoke execute on all functions in schema net from anon, authenticated;
    revoke all on all tables in schema net from anon, authenticated;
  end if;
end $$;
