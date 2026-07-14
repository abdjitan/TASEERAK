-- 108: company name is editable until the account is verified (Wathq or admin), then locked.
-- Applied live 2026-07-14. Lets a new supplier fix a typo'd company name before verification,
-- but prevents changing it after the name is officially confirmed (anti-impersonation).
create or replace function public.enforce_profile_field_locks() returns trigger
  language plpgsql set search_path to 'public' as
$$
declare v_name_locked boolean;
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  new.role := old.role;   -- privesc lock
  new.id   := old.id;
  v_name_locked := (old.verification_status = 'verified') or (coalesce(old.cr_verification_source, '') = 'wathq');
  if v_name_locked then
    if old.company_name_ar is not null then new.company_name_ar := old.company_name_ar; end if;
    if old.company_name_en is not null then new.company_name_en := old.company_name_en; end if;
  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  return new;
end; $$;
