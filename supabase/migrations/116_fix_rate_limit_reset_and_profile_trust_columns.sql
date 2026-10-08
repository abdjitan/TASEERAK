-- 116 (applied 2026-10-08 via MCP as fix_rate_limit_reset_and_profile_trust_columns)
-- H1: check_rate_limit was anon-callable with caller-chosen window/bucket -> anyone could reset
-- any counter (window=0) or pollute other users' buckets. Keep the signature (API routes call
-- it with the user's session), but: floor the window at 1h (all callers use 3600) and require
-- end-user callers to use their own bucket.
create or replace function public.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_count int; v_window int; v_role text := coalesce(auth.role(), '');
begin
  if p_bucket is null or length(p_bucket) > 200 then return false; end if;
  if v_role = 'authenticated' then
    if not (p_bucket like '%:' || auth.uid()::text
            or p_bucket like 'cr\_exists:%' or p_bucket like 'phone\_exists:%') then
      return false;
    end if;
  elsif v_role = 'anon' then
    if not (p_bucket like 'verify-cr:ip:%' or p_bucket like 'cr\_exists:%' or p_bucket like 'phone\_exists:%') then
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

-- H2: profiles self-UPDATE policy has no column restriction; the lock trigger only pinned
-- role/verification. Pin every trust/billing/admin column for non-admin direct writes.
-- Nested trigger writes (recompute_supplier_rating on reviews, handle_new_user on auth.users)
-- run at pg_trigger_depth() > 1 and are allowed through.
create or replace function public.enforce_profile_field_locks()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare v_name_locked boolean;
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if pg_trigger_depth() > 1 then return new; end if;
  new.role := old.role;   -- privesc lock
  new.id   := old.id;
  v_name_locked := (old.verification_status = 'verified') or (coalesce(old.cr_verification_source, '') = 'wathq');
  if v_name_locked then
    if old.company_name_ar is not null then new.company_name_ar := old.company_name_ar; end if;
    if old.company_name_en is not null then new.company_name_en := old.company_name_en; end if;
    new.commercial_registration := old.commercial_registration;
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
