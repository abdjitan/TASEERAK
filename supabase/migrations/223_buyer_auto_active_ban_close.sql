-- Owner 2026-11-17:
--  1. A buyer needs no admin approval: once the mobile and the email are verified the account is
--     active (verification_status = 'verified') and never waits in the admin review queue.
--  2. The admin can suspend an account for a period with a message (banned_until / ban_reason), lift
--     it, or close the account for good (same anonymisation as delete_my_account; deals stay for
--     the other party).

-- 1 ── buyers activate themselves
create or replace function public.auto_activate_buyer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role::text = 'contractor' and new.phone_verified_at is not null and new.email_verified_at is not null
     and new.verification_status::text <> 'verified' then
    new.verification_status := 'verified';
  end if;
  return new;
end $$;
drop trigger if exists zz_auto_activate_buyer on public.profiles;
create trigger zz_auto_activate_buyer before insert or update on public.profiles
  for each row execute function public.auto_activate_buyer();

-- 2 ── suspension
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_by uuid;

-- users can't change their own suspension (field lock)
create or replace function public.guard_ban_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'service_role' or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then new.banned_until := null; new.ban_reason := null; new.banned_by := null; return new; end if;
  new.banned_until := old.banned_until; new.ban_reason := old.ban_reason; new.banned_by := old.banned_by;
  return new;
end $$;
drop trigger if exists ab_guard_ban_columns on public.profiles;
create trigger ab_guard_ban_columns before insert or update on public.profiles
  for each row execute function public.guard_ban_columns();

-- p_until null = permanent (stored as year 9999)
create or replace function public.admin_ban_user(p_user uuid, p_until timestamptz, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'لا يمكنك إيقاف حسابك.'; end if;
  if exists (select 1 from profiles where id = p_user and role::text = 'admin') then raise exception 'لا يمكن إيقاف حساب إدارة.'; end if;
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set banned_until = coalesce(p_until, '9999-12-31'::timestamptz),
                      ban_reason = left(nullif(btrim(coalesce(p_reason, '')), ''), 500), banned_by = auth.uid()
   where id = p_user;
  insert into audit_logs (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'ban_user', 'profile', p_user, jsonb_build_object('until', p_until, 'reason', left(coalesce(p_reason, ''), 500)));
end $$;

create or replace function public.admin_unban_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set banned_until = null, ban_reason = null, banned_by = null where id = p_user;
  insert into audit_logs (actor_id, action, entity, entity_id, detail) values (auth.uid(), 'unban_user', 'profile', p_user, '{}'::jsonb);
end $$;

-- the signed-in user's own suspension (for the /banned page)
create or replace function public.my_ban()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when banned_until is not null and banned_until > now()
              then jsonb_build_object('until', banned_until, 'permanent', banned_until > '9000-01-01'::timestamptz, 'reason', ban_reason)
         end
    from profiles where id = auth.uid()
$$;

-- every protected action (quotes, awards, requests, messages) refuses a suspended account
create or replace function public.require_verified_phone()
returns void language plpgsql stable security definer set search_path = public as $$
declare v_phone timestamptz; v_email timestamptz; v_ban timestamptz;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin() then return; end if;
  select phone_verified_at, email_verified_at, banned_until into v_phone, v_email, v_ban from profiles where id = auth.uid();
  if v_ban is not null and v_ban > now() then
    raise exception 'حسابك موقوف مؤقتاً. راجع رسالة الإدارة أو تواصل مع الدعم.' using hint = 'ACCOUNT_SUSPENDED';
  end if;
  if not public.phone_verify_required() then return; end if;
  if v_phone is null then
    raise exception 'وثّق رقم جوالك أولاً من الإعدادات (يصلك رمز برسالة نصية)، ثم أعد المحاولة.' using hint = 'PHONE_NOT_VERIFIED';
  end if;
  if v_email is null then
    raise exception 'وثّق بريدك الإلكتروني أولاً من الإعدادات (يصلك رمز على البريد)، ثم أعد المحاولة.' using hint = 'EMAIL_NOT_VERIFIED';
  end if;
end $$;

-- 3 ── close an account (admin): delete_my_account's body for another user
do $$
declare d text := pg_get_functiondef('public.delete_my_account()'::regprocedure); n text;
begin
  n := replace(d, 'FUNCTION public.delete_my_account()', 'FUNCTION public.admin_close_account(p_user uuid)');
  n := replace(n, 'v_uid uuid := auth.uid();', 'v_uid uuid := p_user;');
  n := replace(n, 'if v_uid is null then raise exception ''not_authenticated''; end if;',
    'if not public.is_admin() then raise exception ''forbidden'' using errcode = ''42501''; end if;
  if v_uid is null or v_uid = auth.uid() then raise exception ''bad_user''; end if;');
  if n = d or position('admin_close_account' in n) = 0 or position('v_uid uuid := p_user;' in n) = 0 then
    raise exception 'delete_my_account: pattern not found';
  end if;
  execute n;
end $$;

revoke all on function public.admin_ban_user(uuid, timestamptz, text) from public, anon;
revoke all on function public.admin_unban_user(uuid) from public, anon;
revoke all on function public.admin_close_account(uuid) from public, anon;
revoke all on function public.my_ban() from public, anon;
grant execute on function public.admin_ban_user(uuid, timestamptz, text) to authenticated;
grant execute on function public.admin_unban_user(uuid) to authenticated;
grant execute on function public.admin_close_account(uuid) to authenticated;
grant execute on function public.my_ban() to authenticated;

-- existing buyers who already verified both get activated now
update public.profiles set phone_verified_at = phone_verified_at
 where role::text = 'contractor' and phone_verified_at is not null and email_verified_at is not null
   and verification_status::text <> 'verified';
