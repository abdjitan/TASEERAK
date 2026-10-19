-- 170: one commercial registration = one account (owner, 2026-10-19:
-- «ما بدي واحد يجيب سجل يفتح ألف حساب»). Design: docs/CR_VERIFICATION_DESIGN.md.
--
-- • normalize_cr(): Arabic-Indic / Persian digits → ASCII, everything else stripped, empty → null.
-- • aa_cr_guard (BEFORE INSERT OR UPDATE, fires before the field-lock trigger by name):
--   normalises the CR, then refuses a CR already held by another non-rejected account.
--   No admin / bypass_locks exception: the DB is the guarantee on every path.
--   The partial unique index (the race-proof form) follows once the live test duplicate
--   is resolved; until then this trigger enforces the rule.
-- • delete_my_account() releases the CR (a deleted account no longer holds it).
-- • A rejected account does not hold its CR.

create or replace function public.normalize_cr(p text)
returns text language sql immutable set search_path to 'public' as $$
  select nullif(regexp_replace(translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[^0-9]', '', 'g'), '')
$$;

create or replace function public.cr_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  new.commercial_registration := public.normalize_cr(new.commercial_registration);
  if new.commercial_registration is null or new.verification_status = 'rejected' then return new; end if;
  -- only when this row starts holding the CR: insert, CR changed, or back from rejected
  if tg_op = 'UPDATE'
     and new.commercial_registration is not distinct from public.normalize_cr(old.commercial_registration)
     and old.verification_status <> 'rejected' then
    return new;
  end if;
  if exists (select 1 from public.profiles p
             where p.id <> new.id
               and p.commercial_registration = new.commercial_registration
               and p.verification_status <> 'rejected') then
    raise exception using errcode = 'P0001',
      message = 'هذا السجل التجاري مستخدم في حساب آخر. إن كان سجلّك فاطلب التحقق.',
      hint = 'CR_TAKEN';
  end if;
  return new;
end; $$;

drop trigger if exists aa_cr_guard on public.profiles;
create trigger aa_cr_guard before insert or update of commercial_registration, verification_status
  on public.profiles for each row execute function public.cr_guard();

-- Normalise what is stored today (all digits at the time of writing; safe no-op otherwise).
update public.profiles set commercial_registration = public.normalize_cr(commercial_registration)
 where commercial_registration is distinct from public.normalize_cr(commercial_registration)
   and not exists (select 1 from public.profiles q where q.commercial_registration = public.normalize_cr(profiles.commercial_registration) and q.id <> profiles.id);

-- cr_exists(): compare on the normalised value too (still boolean only).
create or replace function public.cr_exists(p_cr text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.check_rate_limit('cr_exists:' || public.client_ip(), 120, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return exists(select 1 from public.profiles
                where commercial_registration = public.normalize_cr(p_cr)
                  and public.normalize_cr(p_cr) is not null
                  and verification_status <> 'rejected');
end; $$;

-- delete_my_account(): same as before + release the CR.
create or replace function public.delete_my_account()
returns jsonb language plpgsql security definer set search_path to 'public', 'auth' as $function$
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
    commercial_registration = null,   -- 170: a deleted account no longer holds the CR
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
