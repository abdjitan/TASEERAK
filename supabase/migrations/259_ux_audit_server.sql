-- 259: UX audit server fixes (2026-11-23).

-- UX-049 / UX-169: request labels in notifications. Before: «RFQ-1026 · حزمة توريدات (3 مواد)» — a code the
-- home buyer must never see, and no hint of the material for a supplier. Now: «طلب رقم 1026 · حديد تسليح
-- 12 مم و2 أخرى» (the buyer's own title wins when he wrote one). English in product names is dropped.
create or replace function public.clean_ar_name(p text)
returns text language sql immutable as $$
  select coalesce(nullif(btrim(regexp_replace(regexp_replace(coalesce(p, ''),
    '\s*\([^)]*[A-Za-z][^)]*\)', '', 'g'),
    '(\s+[A-Za-z][A-Za-z''&.\-]{2,})+\s*$', '')), ''), p)
$$;

create or replace function public.rfq_label(r rfqs)
returns text language sql stable set search_path = public as $$
  select 'طلب رقم ' || coalesce(r.ref_no::text, '?') || ' · ' ||
    coalesce(
      nullif(btrim(r.title), ''),
      case when jsonb_typeof(r.items) = 'array' and jsonb_array_length(r.items) > 0 then
        public.clean_ar_name(r.items->0->>'product_name') ||
        case when jsonb_array_length(r.items) > 1 then ' و' || (jsonb_array_length(r.items) - 1)::text || ' أخرى' else '' end
      end,
      public.clean_ar_name(nullif(btrim(r.product_name), '')),
      'طلب تسعير')
$$;

-- UX-050: cancelling a request also rejected its pending offers, so the supplier got a second, false notice
-- «لم يُقبل عرضك — اختار المشتري مورداً آخر». A cancelled/expired request now sends only its own notice.
create or replace function public.notify_supplier_offer_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_rfq_status text;
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' then
      insert into notifications (user_id, type, title, body, data)
      values (new.supplier_id, 'offer_accepted', 'اختار المشتري عرضك',
        'اختار المشتري مواد من عرضك. راجع الصفقة ونسّق التسليم معه.',
        jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
    elsif new.status = 'rejected' then
      select status::text into v_rfq_status from rfqs where id = new.rfq_id;
      if coalesce(v_rfq_status, '') in ('cancelled', 'expired') then return new; end if;
      insert into notifications (user_id, type, title, body, data)
      values (new.supplier_id, 'offer_rejected', 'لم يُقبل عرضك',
        'اختار المشتري مورداً آخر في هذا الطلب.',
        jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
    end if;
  end if;
  return new;
end $$;

-- UX-051: «أبلغ عن مشكلة» told nobody. Now the other party and the admins are notified.
create or replace function public.open_dispute(p_offer_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_is_party boolean; r rfqs; v_by_buyer boolean; v_other uuid; v_label text;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'سبب النزاع مطلوب'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select * into r from rfqs where id = v.rfq_id;
  select (v.supplier_id = public.acting_uid()) or (r.contractor_id = auth.uid()) into v_is_party;
  if not v_is_party then raise exception 'فقط طرف في الصفقة يمكنه فتح نزاع'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.dispute_status = 'open' then raise exception 'يوجد نزاع مفتوح بالفعل'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set dispute_status = 'open', dispute_reason = left(p_reason, 1000),
                    dispute_by = auth.uid(), dispute_opened_at = now()
    where id = p_offer_id returning * into v;
  v_by_buyer := (r.contractor_id = auth.uid());
  v_other := case when v_by_buyer then v.supplier_id else r.contractor_id end;
  v_label := public.rfq_label(r);
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_other, 'dispute_opened', 'بلاغ عن مشكلة في صفقة',
      case when v_by_buyer then 'أبلغ المشتري عن مشكلة في صفقة «' else 'أبلغ المورد عن مشكلة في صفقة «' end
        || v_label || '». سيتواصل فريق تسعيرك مع الطرفين.',
      jsonb_build_object('url', case when v_by_buyer then '/supplier/dashboard/rfq/' || r.id::text else '/contractor/orders/' || v.id::text end,
        'offer_id', v.id, 'rfq_id', r.id));
    perform public.notify_admins('بلاغ عن مشكلة في صفقة',
      v_label || ' — ' || case when v_by_buyer then 'من المشتري: ' else 'من المورد: ' end || left(p_reason, 200),
      '/admin?tab=rfqs&q=' || coalesce(r.ref_no::text, ''));
  exception when others then null;  -- the report itself must never fail because of a notice
  end;
  return to_jsonb(v);
end $$;

-- UX-044: every buyer becomes «verified», and that locked a HOME BUYER's own name as if it were tied to a
-- commercial registration. The name lock now applies to sellers only.
create or replace function public.enforce_profile_field_locks()
returns trigger language plpgsql set search_path = public as $$
declare v_name_locked boolean;
begin
  if is_admin() or current_user = 'service_role' or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if pg_trigger_depth() > 1 then return new; end if;
  new.role := old.role;
  new.id   := old.id;
  new.provider_type  := old.provider_type;
  new.role_chosen_at := old.role_chosen_at;
  new.employer_id    := old.employer_id;
  v_name_locked := old.role::text = 'supplier'
                   and ((old.verification_status = 'verified') or (coalesce(old.cr_verification_source, '') = 'wathq'));
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
  new.invite_code            := old.invite_code;
  new.referred_by            := old.referred_by;
  new.created_at             := old.created_at;
  return new;
end $$;

-- UX-168: when the pricing deadline passes the buyer is told once, with what arrived; a request with no
-- offer is not left to disappear silently.
alter table public.rfqs add column if not exists deadline_notified_at timestamptz;

create or replace function public.notify_deadline_passed()
returns integer language plpgsql security definer set search_path = public as $$
declare r rfqs; n_off int; n int := 0; v_min numeric;
begin
  for r in select * from rfqs
           where status = 'open' and expires_at is not null and expires_at < now()
             and expires_at > now() - interval '7 days' and deadline_notified_at is null
           limit 300
  loop
    select count(*), min(case when o.vat_status = 'not_registered' or o.vat_included then o.total_price else o.total_price * 1.15 end)
      into n_off, v_min from offers o where o.rfq_id = r.id and o.status in ('pending', 'accepted');
    begin
      insert into notifications (user_id, type, title, body, data)
      values (r.contractor_id, 'rfq_deadline', 'انتهت مهلة التسعير',
        case when n_off > 0 then
          'وصلك ' || n_off || case when n_off = 1 then ' عرض' when n_off = 2 then ' عرضان' else ' عروض' end
          || ' على «' || public.rfq_label(r) || '»، أقلها ' || to_char(round(v_min), 'FM999,999,990') || ' ريال. اختر الأنسب الآن.'
        else
          'لم يصل أي عرض على «' || public.rfq_label(r) || '». يمكنك تمديد المهلة أو البحث عن موردين آخرين من صفحة الطلب.'
        end,
        jsonb_build_object('url', '/contractor/rfq/' || r.id::text, 'rfq_id', r.id));
    exception when others then null;
    end;
    update rfqs set deadline_notified_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.notify_deadline_passed() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('notify-deadline-passed') where exists (select 1 from cron.job where jobname = 'notify-deadline-passed');
  perform cron.schedule('notify-deadline-passed', '*/30 * * * *', 'select public.notify_deadline_passed()');
exception when others then raise notice 'cron not scheduled: %', sqlerrm;
end $$;

-- the past ones are not announced now (only deadlines that pass from today on)
update public.rfqs set deadline_notified_at = now() where deadline_notified_at is null and expires_at is not null and expires_at < now();
