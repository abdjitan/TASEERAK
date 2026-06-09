-- (a) search_path hardening on the 3 SECURITY DEFINER functions that lacked it
-- (prevents search_path injection — flagged in round-2 review).
alter function public.report_cr_objection(text, text, text, text, text) set search_path = public;
alter function public.request_profile_change(text, text, text, text) set search_path = public;
alter function public.review_profile_change(uuid, boolean, text) set search_path = public;

-- (b) Re-enable AUTOMATIC verification, but only from the trusted server.
-- The lock trigger now also honors a transaction-local bypass flag that only a
-- SECURITY DEFINER function (callable via the service role) can set.
create or replace function public.enforce_profile_field_locks()
returns trigger language plpgsql as $$
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if old.company_name_ar  is not null then new.company_name_ar  := old.company_name_ar;  end if;
  if old.company_name_en  is not null then new.company_name_en  := old.company_name_en;  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  return new;
end; $$;

-- Trusted server-only verification setter. Granted to service_role ONLY, so the
-- browser/authenticated users can never call it (spoof hole stays closed), while
-- the server (after its own AI/Wathq check) can auto-verify.
create or replace function public.admin_set_verification(p_user_id uuid, p_source text, p_official_name text, p_cr_status text, p_activity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_locks', 'on', true);
  update public.profiles set
    verification_status = 'verified',
    cr_verification_source = coalesce(nullif(p_source, ''), cr_verification_source),
    cr_official_name = coalesce(nullif(p_official_name, ''), cr_official_name),
    cr_status = coalesce(nullif(p_cr_status, ''), cr_status),
    cr_activity = coalesce(nullif(p_activity, ''), cr_activity),
    cr_verified_at = now()
  where id = p_user_id and verification_status = 'pending';
end; $$;
revoke all on function public.admin_set_verification(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_verification(uuid, text, text, text, text) to service_role;
