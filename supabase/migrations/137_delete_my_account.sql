-- 137: self-service account deletion (REQUESTS_FOR_WEB R4; required by Google Play and the App Store).
-- Applied 2026-10-12.
--
-- Not a hard delete of auth.users: that cascades into the OTHER party's records (their requests,
-- offers, conversations) and is blocked by awards. Instead the account is closed for good:
--   * personal data is erased (names, phones, address, location, documents, CR payload, drafts,
--     notifications, device/push tokens, specialties, branches, prices, team links);
--   * open requests are cancelled and pending offers expired, so nobody waits on a ghost;
--   * the profile row stays as "حساب محذوف" so completed deals and issued invoices (kept for the
--     legal retention period) still resolve for the counterparty;
--   * the sign-in is destroyed: email replaced, password cleared, identities/sessions removed,
--     banned forever. The same email can register again as a brand-new account.
-- Verification files in storage are removed by /api/account/delete (storage needs the API).

create or replace function public.delete_my_account()
returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select role::text into v_role from profiles where id = v_uid;
  if v_role = 'admin' then raise exception 'admin_cannot_self_delete'; end if;

  perform set_config('app.bypass_locks', 'on', true);

  -- nobody keeps waiting on this account
  update rfqs set status = 'cancelled' where contractor_id = v_uid and status in ('open', 'draft');
  update offers set status = 'expired' where supplier_id = v_uid and status = 'pending';

  -- personal, non-deal data
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

  update profiles set
    company_name_ar = 'حساب محذوف', company_name_en = 'Deleted account', full_name = null,
    phone = '', contact_phone = null,
    national_short_address = null, building_number = null, street_name = null, district = null,
    postal_code = null, additional_number = null, latitude = null, longitude = null,
    license_url = null, cr_url = null, cr_data = null,
    approvals = '{}', is_active = false, employer_id = null, updated_at = now()
  where id = v_uid;

  -- close the sign-in for good
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
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
