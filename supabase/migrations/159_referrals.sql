-- 159: «ادعُ من تعرفه» (owner 2026-10-17): buyers and suppliers invite people they know.
-- Each account gets a short invite code; a new account that signed up through it records who
-- invited it. No personal data of the invited person is stored beyond the link between accounts.

alter table public.profiles add column if not exists invite_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
create index if not exists profiles_referred_by_idx on public.profiles(referred_by);

alter type public.notification_type add value if not exists 'referral_joined';

-- The caller's invite code (created on first use) and how many accounts joined through it.
create or replace function public.my_invite()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_code text; v_n int;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select invite_code into v_code from profiles where id = v_uid;
  while v_code is null loop
    v_code := substr(translate(md5(random()::text || clock_timestamp()::text), '01', ''), 1, 7);
    begin
      perform set_config('app.bypass_locks', 'on', true);
      update profiles set invite_code = v_code where id = v_uid and invite_code is null;
      perform set_config('app.bypass_locks', '', true);
      select invite_code into v_code from profiles where id = v_uid;
    exception when unique_violation then v_code := null;
    end;
  end loop;
  select count(*) into v_n from profiles where referred_by = v_uid;
  return jsonb_build_object('code', v_code, 'joined', v_n);
end $$;

-- A new account (created in the last 14 days, not yet linked) records who invited it.
-- Returns true when linked; false for an unknown code, the caller's own code, or an old account.
create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_ref uuid;
begin
  if v_uid is null or coalesce(trim(p_code), '') = '' then return false; end if;
  select id into v_ref from profiles where invite_code = lower(trim(p_code));
  if v_ref is null or v_ref = v_uid then return false; end if;
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set referred_by = v_ref
   where id = v_uid and referred_by is null and created_at > now() - interval '14 days';
  if not found then perform set_config('app.bypass_locks', '', true); return false; end if;
  perform set_config('app.bypass_locks', '', true);
  insert into notifications (user_id, type, title, body, data)
  values (v_ref, 'referral_joined', 'انضمّ شخص دعوته', 'سجّل حساب جديد في تسعيرك عن طريق دعوتك. شكراً لك.', jsonb_build_object('url', '/invite-friends', 'count', (select count(*) from profiles where referred_by = v_ref)));
  return true;
end $$;

revoke all on function public.my_invite() from public, anon;
revoke all on function public.claim_referral(text) from public, anon;
grant execute on function public.my_invite() to authenticated;
grant execute on function public.claim_referral(text) to authenticated;

-- invite_code / referred_by are never set from the client (only by the RPCs above, which bypass the lock)
CREATE OR REPLACE FUNCTION public.enforce_profile_field_locks()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  new.invite_code            := old.invite_code;   -- 159: set only by my_invite()
  new.referred_by            := old.referred_by;   -- 159: set only by claim_referral()
  new.created_at             := old.created_at;
  return new;
end; $function$;
