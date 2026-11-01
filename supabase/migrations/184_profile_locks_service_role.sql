-- 184: the trusted server (service_role, e.g. /api/classify-supplier) may write locked profile columns
-- such as auto_classification*; the lock trigger only exists to stop users editing them (audit 2026-11-01).
CREATE OR REPLACE FUNCTION public.enforce_profile_field_locks()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_name_locked boolean;
begin
  if is_admin() or current_user = 'service_role' or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
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
  new.invite_code            := old.invite_code;   -- 159: set only by my_invite()
  new.referred_by            := old.referred_by;   -- 159: set only by claim_referral()
  new.created_at             := old.created_at;
  return new;
end; $function$

;
