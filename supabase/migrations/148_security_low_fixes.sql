-- 148 (security audit Priority 3 / low, 2026-10-13)
--
-- • CR squatting: an unverified user could put another company's CR number on their profile.
--   A CR already held by a verified profile can no longer be claimed by someone else.
-- • lock_offer_deal_columns: after acceptance either party could still edit po_number /
--   accepted_at, and the supplier the deal terms (delivery days, notes, attachment, source…).
-- • Prices: no CHECK against negative / zero prices (none exist today → constraints validated).
-- • Notifications: users could insert their own notifications (any title/body/url), which the
--   team fan-out + email/push then delivered → phishing employees, email cost. Insert removed;
--   every legitimate notification is written by SECURITY DEFINER code.
-- • Search learning: 3 throwaway accounts could auto-approve any synonym text for everyone.
--   Auto-approval now needs 5 distinct accounts that are at least 7 days old.
-- • report_cr_objection (anon): no limit → table flooding. Capped per CR and per day.
-- • mask_contact_digits missed Arabic-Indic (٠-٩) and Persian (۰-۹) digits.
-- • delete_my_account left team members' employer_id pointing at the deleted company.
--
-- Accepted (documented, not changed): register_device_token moves a known push token to the
-- caller — that is how a phone changes hands after a missed sign-out, and the token is not
-- public; device_tokens are only readable by their owner.

-- ── CR squatting (inside the existing profile lock trigger) ────────────────────────────────
create or replace function public.enforce_profile_field_locks()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare v_name_locked boolean;
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if pg_trigger_depth() > 1 then return new; end if;
  new.role := old.role;
  new.id   := old.id;
  new.provider_type  := old.provider_type;
  new.role_chosen_at := old.role_chosen_at;
  new.employer_id    := old.employer_id;
  v_name_locked := (old.verification_status = 'verified') or (coalesce(old.cr_verification_source, '') = 'wathq');
  if v_name_locked then
    if old.company_name_ar is not null then new.company_name_ar := old.company_name_ar; end if;
    if old.company_name_en is not null then new.company_name_en := old.company_name_en; end if;
    new.commercial_registration := old.commercial_registration;
  elsif nullif(btrim(coalesce(new.commercial_registration, '')), '') is not null
        and new.commercial_registration is distinct from old.commercial_registration
        and exists (select 1 from profiles p
                    where p.id <> new.id and p.commercial_registration = new.commercial_registration
                      and (p.verification_status = 'verified' or coalesce(p.cr_verification_source, '') = 'wathq')) then
    raise exception 'رقم السجل التجاري مسجّل لمنشأة موثّقة أخرى. إن كان يخصّك، قدّم اعتراضاً.';
  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  new.cr_activity            := old.cr_activity;
  new.cr_status              := old.cr_status;
  new.cr_issue_date          := old.cr_issue_date;
  new.cr_expiry_date         := old.cr_expiry_date;
  new.cr_data                := old.cr_data;
  new.rating_avg             := old.rating_avg;
  new.rating_count           := old.rating_count;
  new.subscription_plan      := old.subscription_plan;
  new.subscription_expires_at:= old.subscription_expires_at;
  new.is_active              := old.is_active;
  new.approvals              := old.approvals;
  new.rejection_reason       := old.rejection_reason;
  new.auto_classification            := old.auto_classification;
  new.auto_classification_note       := old.auto_classification_note;
  new.auto_classification_confidence := old.auto_classification_confidence;
  new.auto_classification_source     := old.auto_classification_source;
  new.auto_classified_at             := old.auto_classified_at;
  new.created_at             := old.created_at;
  return new;
end; $function$;

-- ── Offer deal terms frozen after acceptance ──────────────────────────────────────────────
create or replace function public.lock_offer_deal_columns()
returns trigger
language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := public.acting_uid();
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  new.rfq_id := old.rfq_id; new.supplier_id := old.supplier_id; new.created_at := old.created_at;
  new.submitted_by := old.submitted_by;
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
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
    new.notes := old.notes; new.attributes := old.attributes;
    new.attachment_url := old.attachment_url; new.attachment_name := old.attachment_name;
    new.price_valid_until := old.price_valid_until; new.source_type := old.source_type;
    new.availability := old.availability;
    new.supplier_invoice_url := old.supplier_invoice_url; new.supplier_invoice_name := old.supplier_invoice_name;
    new.supplier_invoice_at := old.supplier_invoice_at;
    new.info_response := old.info_response;
    if not (old.status = 'pending' and new.status = 'rejected') then new.status := old.status; end if;
  else
    new.status := old.status;
    new.info_request := old.info_request;
    new.reduction_deadline := old.reduction_deadline; new.reduction_note := old.reduction_note;
  end if;
  if old.status = 'accepted' then
    -- the accepted offer is the deal record: its terms no longer change for either party
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.status := old.status; new.invoice_number := old.invoice_number;
    new.po_number := old.po_number; new.accepted_at := old.accepted_at;
    new.delivery_days := old.delivery_days; new.notes := old.notes; new.attributes := old.attributes;
    new.attachment_url := old.attachment_url; new.attachment_name := old.attachment_name;
    new.price_valid_until := old.price_valid_until; new.source_type := old.source_type;
    new.availability := old.availability;
  end if;
  if old.status = 'pending' and exists (
    select 1 from rfqs r where r.id = old.rfq_id and r.expires_at is not null and r.expires_at < now()
  ) then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
  end if;
  return new;
end; $function$;

-- ── Price sanity ──────────────────────────────────────────────────────────────────────────
create or replace function public.item_prices_ok(p jsonb)
returns boolean
language sql immutable set search_path = public
as $$
  select p is null or jsonb_typeof(p) <> 'array' or not exists (
    select 1 from jsonb_array_elements(p) e
    where jsonb_typeof(e) = 'object' and (
         (jsonb_typeof(e->'unit_price') = 'number' and (e->>'unit_price')::numeric < 0)
      or (jsonb_typeof(e->'total') = 'number' and (e->>'total')::numeric < 0)
      or (jsonb_typeof(e->'quantity') = 'number' and (e->>'quantity')::numeric < 0)))
$$;
alter table public.offers drop constraint if exists offers_total_price_positive;
alter table public.offers add constraint offers_total_price_positive check (total_price is null or total_price > 0);
alter table public.offers drop constraint if exists offers_unit_price_nonneg;
alter table public.offers add constraint offers_unit_price_nonneg check (unit_price is null or unit_price >= 0);
alter table public.offers drop constraint if exists offers_item_prices_nonneg;
alter table public.offers add constraint offers_item_prices_nonneg check (public.item_prices_ok(item_prices));

-- ── Notifications: written by server code only ────────────────────────────────────────────
drop policy if exists "Users create own notifications only" on public.notifications;
revoke insert on public.notifications from anon, authenticated;

-- ── Search learning: no cheap auto-approval ───────────────────────────────────────────────
create or replace function public.refresh_learned_synonyms()
returns integer
language plpgsql security definer set search_path to 'public'
as $function$
declare n int;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'admin only'; end if;
  insert into learned_synonyms (term_norm, product_name, sector, users, hits, status, source)
  select s.query_norm, s.picked_name, max(s.sector), count(distinct s.user_id), count(*),
         case when count(distinct s.user_id) filter (where p.created_at < now() - interval '7 days') >= 5
              then 'approved' else 'pending' end, 'users'
  from search_events s left join profiles p on p.id = s.user_id
  where s.action in ('picked', 'free_text') and s.picked_name is not null
    and s.query_norm <> lower(s.picked_name)
  group by s.query_norm, s.picked_name
  on conflict (term_norm, product_name) do update
    set users = excluded.users, hits = excluded.hits, updated_at = now(),
        status = case when learned_synonyms.status = 'pending' and excluded.status = 'approved'
                      then 'approved' else learned_synonyms.status end;
  get diagnostics n = row_count;
  return n;
end $function$;

-- ── CR objections: bounded ────────────────────────────────────────────────────────────────
create or replace function public.report_cr_objection(p_cr text, p_name text, p_phone text, p_email text, p_reason text)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare existing text;
begin
  if coalesce(p_cr,'') = '' or p_cr !~ '^[0-9]{10}$' then return; end if;
  if (select count(*) from public.cr_objections where commercial_registration = p_cr
        and created_at > now() - interval '1 day') >= 5
     or (select count(*) from public.cr_objections where created_at > now() - interval '1 day') >= 200 then
    raise exception 'تم استلام عدد كبير من الاعتراضات اليوم. حاول لاحقاً.';
  end if;
  select company_name_ar into existing from public.profiles
    where commercial_registration = p_cr order by created_at asc limit 1;
  insert into public.cr_objections (commercial_registration, existing_company, reporter_name, reporter_phone, reporter_email, reason)
  values (p_cr, existing, left(nullif(p_name,''), 120), left(nullif(p_phone,''), 30),
          left(nullif(p_email,''), 200), left(nullif(p_reason,''), 2000));
end; $function$;

-- ── Contact masking: Arabic-Indic / Persian digits too ────────────────────────────────────
create or replace function public.mask_contact_digits(p text)
returns text
language sql immutable set search_path to 'public'
as $function$
  select regexp_replace(coalesce(p, ''), '([+＋]?[0-9٠-٩۰-۹][0-9٠-٩۰-۹ \-\.]{8,}[0-9٠-٩۰-۹])', '[رقم محجوب]', 'g');
$function$;

-- ── Account deletion: release the deleted company's team members ──────────────────────────
create or replace function public.delete_my_account()
returns jsonb
language plpgsql security definer set search_path to 'public', 'auth'
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select role::text into v_role from profiles where id = v_uid;
  if v_role = 'admin' then raise exception 'admin_cannot_self_delete'; end if;

  perform set_config('app.bypass_locks', 'on', true);

  update rfqs set status = 'cancelled' where contractor_id = v_uid and status in ('open', 'draft');
  update offers set status = 'expired' where supplier_id = v_uid and status = 'pending';

  delete from rfq_drafts            where contractor_id = v_uid;
  delete from notifications         where user_id = v_uid;
  delete from device_tokens         where user_id = v_uid;
  delete from push_subscriptions    where user_id = v_uid;
  delete from profile_sectors       where profile_id = v_uid;
  delete from profile_specialties   where profile_id = v_uid;
  delete from branches              where supplier_id = v_uid;
  delete from live_prices           where supplier_id = v_uid;
  delete from products              where supplier_id = v_uid;
  delete from rfq_dismissals        where supplier_id = v_uid;
  delete from profile_change_requests where user_id = v_uid;
  delete from company_members       where user_id = v_uid or company_id = v_uid;
  delete from company_invites       where company_id = v_uid;
  update profiles set employer_id = null where employer_id = v_uid;

  update profiles set
    company_name_ar = 'حساب محذوف', company_name_en = 'Deleted account', full_name = null,
    phone = '', contact_phone = null,
    national_short_address = null, building_number = null, street_name = null, district = null,
    postal_code = null, additional_number = null, latitude = null, longitude = null,
    license_url = null, cr_url = null, cr_data = null,
    approvals = '{}', is_active = false, employer_id = null, updated_at = now()
  where id = v_uid;

  delete from auth.sessions        where user_id = v_uid;
  delete from auth.identities      where user_id = v_uid;
  delete from auth.mfa_factors     where user_id = v_uid;
  delete from auth.one_time_tokens where user_id = v_uid;
  update auth.users set
    email = 'deleted-' || v_uid || '@deleted.invalid', phone = null,
    encrypted_password = '', raw_user_meta_data = '{}'::jsonb,
    email_change = '', phone_change = '', banned_until = 'infinity', updated_at = now()
  where id = v_uid;

  return jsonb_build_object('ok', true, 'deleted_at', now());
end $function$;
