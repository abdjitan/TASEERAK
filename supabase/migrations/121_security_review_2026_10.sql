-- 121: security review 2026-10-10 (skills: supabase, supabase-postgres-best-practices,
-- security-and-hardening). Applied via MCP as, in order:
--   profiles_public_read_only
--   offers_insert_sanitize_and_role_scoped_updates
--   sanitize_offer_insert_payment_default            (supersedes the insert fn body)
--   security_review_2026_10_rls_tightening
--   security_review_2026_10_signup_rfq_files
-- This file holds the FINAL definitions (verbatim) so it can be re-applied in that order-free form.
-- Every change was verified live by impersonation inside rolled-back transactions.

-- ── CRITICAL: profiles_public was an auto-updatable definer view with INSERT/UPDATE/DELETE
--    granted to authenticated -> writes bypassed profiles RLS (DELETE cascaded). Read-only now.
revoke insert, update, delete, truncate, references, trigger on public.profiles_public from public, anon, authenticated;
grant select on public.profiles_public to anon, authenticated;

-- ── HIGH: offers INSERT could create an already-'accepted' offer (identity/profile reveal via
--    shares_deal_with). New offers always start clean and pending.
create or replace function public.sanitize_offer_insert()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  new.status := 'pending';
  new.accepted_at := null; new.po_number := null; new.invoice_number := null;
  new.supplier_delivered_at := null; new.received_at := null; new.received_by := null;
  new.payment_status := 'unpaid'; new.paid_marked_at := null; new.payment_confirmed_at := null;
  new.dispute_status := null; new.dispute_reason := null; new.dispute_by := null;
  new.dispute_opened_at := null; new.dispute_resolution := null; new.dispute_resolved_at := null;
  new.reduction_deadline := null; new.reduction_note := null;
  new.info_request := null; new.info_response := null;
  new.created_at := now();
  return new;
end; $function$;
revoke execute on function public.sanitize_offer_insert() from public, anon, authenticated;
drop trigger if exists trg_sanitize_offer_insert on public.offers;
create trigger trg_sanitize_offer_insert before insert on public.offers
  for each row execute function public.sanitize_offer_insert();

-- ── HIGH: direct offer UPDATEs were not role-scoped (owner could rewrite supplier prices that
--    flow into PO/ZATCA invoice; supplier could move an offer to another RFQ).
create or replace function public.lock_offer_deal_columns()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid();
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  new.rfq_id := old.rfq_id; new.supplier_id := old.supplier_id; new.created_at := old.created_at;
  new.supplier_delivered_at := old.supplier_delivered_at;
  new.received_at := old.received_at; new.received_by := old.received_by;
  new.payment_status := old.payment_status; new.paid_marked_at := old.paid_marked_at;
  new.payment_confirmed_at := old.payment_confirmed_at;
  new.dispute_status := old.dispute_status; new.dispute_reason := old.dispute_reason;
  new.dispute_by := old.dispute_by; new.dispute_opened_at := old.dispute_opened_at;
  new.dispute_resolution := old.dispute_resolution; new.dispute_resolved_at := old.dispute_resolved_at;
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.status := old.status; new.accepted_at := old.accepted_at;
    new.invoice_number := old.invoice_number; new.po_number := old.po_number;
  end if;

  if v_uid is distinct from old.supplier_id then
    -- caller is the RFQ owner (RLS already limits UPDATE to supplier / owner / admin)
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
    new.notes := old.notes; new.attributes := old.attributes;
    new.attachment_url := old.attachment_url; new.attachment_name := old.attachment_name;
    new.price_valid_until := old.price_valid_until; new.source_type := old.source_type;
    new.info_response := old.info_response;
    if not (old.status = 'pending' and new.status = 'rejected') then new.status := old.status; end if;
  else
    -- caller is the supplier
    new.status := old.status;
    new.info_request := old.info_request;
    new.reduction_deadline := old.reduction_deadline; new.reduction_note := old.reduction_note;
  end if;

  if old.status = 'accepted' then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.status := old.status; new.invoice_number := old.invoice_number;
  end if;
  -- after the pricing deadline a pending offer's price can no longer be edited directly
  if old.status = 'pending' and exists (
    select 1 from rfqs r where r.id = old.rfq_id and r.expires_at is not null and r.expires_at < now()
  ) then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
  end if;
  return new;
end; $function$;

-- Accepted offers are deal records: no deletion by either party (admin still can).
drop policy if exists "Delete own or counterparty offers" on public.offers;
create policy "Delete own or counterparty offers" on public.offers for delete to authenticated
  using ((((select auth.uid()) = supplier_id) or public.is_rfq_owner(rfq_id)) and status <> 'accepted' or (select public.is_admin()));

-- ── Storage: product-images allowed ANY anonymous upload/overwrite.
drop policy if exists "product_images_anon_insert_temp" on storage.objects;
drop policy if exists "product_images_anon_update_temp" on storage.objects;
update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'product-images';

-- ── Conversations: created only by get_or_create_conversation().
drop policy if exists "Participants manage conversations" on public.conversations;

-- ── Messages: sent only via send_message(); recipient may only set the read receipt.
drop policy if exists "Participants send messages" on public.messages;
drop policy if exists "msg participant insert" on public.messages;
drop policy if exists "Participants update messages" on public.messages;
drop policy if exists "msg participant update" on public.messages;
drop policy if exists "Participants read messages" on public.messages;
create policy "msg recipient marks read" on public.messages for update to authenticated
  using (sender_id <> (select auth.uid()) and exists (select 1 from public.conversations c
         where c.id = messages.conversation_id and (c.contractor_id = (select auth.uid()) or c.supplier_id = (select auth.uid()))))
  with check (sender_id <> (select auth.uid()));
revoke insert, update, delete on public.messages from anon, authenticated;
grant update (read_at, is_read) on public.messages to authenticated;

-- ── Reviews: could be re-pointed at any supplier.
revoke update on public.reviews from anon, authenticated;
grant update (rating, comment) on public.reviews to authenticated;

-- ── Support: users could set sender='admin'.
revoke update on public.support_messages from anon, authenticated;
grant update (read_by_user, read_by_admin) on public.support_messages to authenticated;

-- ── Material requests: requesters could approve their own request.
create or replace function public.lock_material_request_review()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.admin_note := null; new.reviewed_at := null;
  else
    new.status := old.status; new.admin_note := old.admin_note; new.reviewed_at := old.reviewed_at;
    new.supplier_id := old.supplier_id; new.requested_by := old.requested_by;
  end if;
  return new;
end; $function$;
revoke execute on function public.lock_material_request_review() from public, anon, authenticated;
drop trigger if exists trg_lock_material_request_review on public.material_requests;
create trigger trg_lock_material_request_review before insert or update on public.material_requests
  for each row execute function public.lock_material_request_review();

-- ── Discovered-directory claim: phone '' matched every listing. Exact, verified phones only.
create or replace function public.claim_discovered_on_profile()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_norm text;
begin
  if new.phone is null or new.phone = '' then return new; end if;
  v_norm := right(regexp_replace(new.phone, '[^0-9]', '', 'g'), 9);
  if v_norm !~ '^5[0-9]{8}$' then return new; end if;
  if not exists (select 1 from auth.users u where u.id = new.id and u.phone = '966' || v_norm and u.phone_confirmed_at is not null) then
    return new;
  end if;
  update discovered_suppliers d
     set claimed_by = new.id, claimed_at = now()
   where d.claimed_by is null
     and d.phone is not null
     and right(regexp_replace(d.phone, '[^0-9]', '', 'g'), 9) = v_norm;
  return new;
end; $function$;

create or replace function public.claim_discovered_on_phone_confirm()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.phone_confirmed_at is not null and old.phone_confirmed_at is null and new.phone ~ '^9665[0-9]{8}$' then
    update public.discovered_suppliers d
       set claimed_by = new.id, claimed_at = now()
     where d.claimed_by is null and d.phone is not null
       and right(regexp_replace(d.phone, '[^0-9]', '', 'g'), 9) = right(new.phone, 9);
  end if;
  return new;
end; $function$;
revoke execute on function public.claim_discovered_on_phone_confirm() from public, anon, authenticated;
drop trigger if exists trg_claim_discovered_on_phone_confirm on auth.users;
create trigger trg_claim_discovered_on_phone_confirm after update of phone_confirmed_at on auth.users
  for each row execute function public.claim_discovered_on_phone_confirm();

-- ── Enumeration: email_exists had no rate limit.
create or replace function public.email_exists(p_email text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public', 'auth'
as $function$
begin
  if not public.check_rate_limit('email_exists:' || public.client_ip(), 60, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return exists (select 1 from auth.users where lower(email) = lower(btrim(p_email)));
end; $function$;

-- ── OTP language: rate-limited per IP.
create or replace function public.set_otp_language(p_phone text, p_lang text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_phone !~ '^9665[0-9]{8}$' or p_lang not in ('ar','en','ur') then return; end if;
  if not public.check_rate_limit('otp_lang:' || public.client_ip(), 30, 3600) then return; end if;
  insert into public.otp_language (phone, lang, updated_at) values (p_phone, p_lang, now())
  on conflict (phone) do update set lang = excluded.lang, updated_at = now();
  if random() < 0.02 then delete from public.otp_language where updated_at < now() - interval '1 day'; end if;
end; $function$;

create or replace function public.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_count int; v_window int; v_role text := coalesce(auth.role(), '');
begin
  if p_bucket is null or length(p_bucket) > 200 then return false; end if;
  if v_role in ('authenticated', 'anon') then
    if not ((v_role = 'authenticated' and p_bucket like '%:' || auth.uid()::text)
            or p_bucket like 'verify-cr:ip:%' or p_bucket like 'cr\_exists:%' or p_bucket like 'phone\_exists:%'
            or p_bucket like 'email\_exists:%' or p_bucket like 'otp\_lang:%') then
      return false;
    end if;
  end if;
  v_window := greatest(coalesce(p_window_seconds, 3600), 3600);
  if random() < 0.005 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  insert into public.rate_limits as rl (bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when rl.window_start < now() - make_interval(secs => v_window) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => v_window) then now() else rl.window_start end
  returning rl.count into v_count;
  return v_count <= p_max;
end; $function$;

-- ── Defense in depth: anon never writes tables directly.
revoke insert, update, delete, truncate on all tables in schema public from anon;

-- ── Duplicate indexes + feed/FK indexes.
drop index if exists public.idx_offers_supplier;
drop index if exists public.idx_rfqs_contractor;
drop index if exists public.profiles_cr_idx;
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists rfqs_status_created_idx on public.rfqs (status, created_at desc);
create index if not exists conversations_rfq_id_idx on public.conversations (rfq_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists reviews_reviewed_id_idx on public.reviews (reviewed_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists material_requests_requested_by_idx on public.material_requests (requested_by);

-- ── RFQ files: suppliers only, open RFQs only (unless they already bid).
create or replace function public.can_access_shared_file(p_path text)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_owner uuid; v_served text[]; v_is_supplier boolean;
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

  if exists (
    select 1 from offers o join rfqs r on r.id = o.rfq_id
    where o.supplier_id = v_owner and r.contractor_id = v_uid
      and (position(p_path in coalesce(o.attachment_url,'')) > 0
        or position(p_path in coalesce(o.item_prices::text,'')) > 0)
  ) then return true; end if;

  select (role = 'supplier') into v_is_supplier from profiles where id = v_uid;
  if not coalesce(v_is_supplier, false) then return false; end if;
  v_served := public.served_regions(v_uid);
  if exists (
    select 1 from rfqs r
    where r.contractor_id = v_owner
      and (position(p_path in coalesce(r.items::text,'')) > 0
        or position(p_path in coalesce(r.notes,'')) > 0)
      and (
        exists (select 1 from offers o2 where o2.rfq_id = r.id and o2.supplier_id = v_uid)
        or (
          r.status = 'open'
          and (coalesce(r.nearby_only,false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
          and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
        )
      )
  ) then return true; end if;

  return false;
end; $function$;

-- ── Phone signups (placeholder role) can't post RFQs before choosing on /welcome.
drop policy if exists "Contractors create own rfqs" on public.rfqs;
create policy "Contractors create own rfqs" on public.rfqs for insert to authenticated
  with check (contractor_id = (select auth.uid())
              and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_chosen_at is not null));

-- ── Signup metadata no longer sets supplier_tier / contractor_grade / commercial_registration
--    (locked forever afterwards / CR squatting). Live handle_new_user = this definition.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); v_role user_role := 'contractor'; s text;
  v_phone text := coalesce(nullif(m->>'phone',''), case when new.phone like '9665%' and length(new.phone) = 12 then '0' || substr(new.phone, 4) else '' end);
begin
  begin v_role := coalesce((m->>'role')::user_role, 'contractor'); exception when others then v_role := 'contractor'; end;
  -- 🔒 SECURITY (C3): public signup can NEVER self-assign admin. Admins are created manually only.
  if v_role is null or v_role not in ('contractor','supplier') then v_role := 'contractor'; end if;
  begin
    insert into profiles (id, role, company_name_ar, phone, full_name, role_chosen_at)
    values (new.id, v_role, coalesce(nullif(m->>'company_name_ar',''),'شركة جديدة'), v_phone, nullif(m->>'full_name',''),
            case when nullif(m->>'role','') is not null then now() end)
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
