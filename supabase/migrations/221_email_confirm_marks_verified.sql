-- Email confirmation at sign-up is ON (owner switched «Confirm email» on 2026-11-17): when a sign-up
-- (or email change) is confirmed through the Supabase link, mark profiles.email_verified_at too, so
-- the «وثّق بريدك الإلكتروني» banner doesn't ask again. Placeholder emails of phone-only buyers
-- (@phone.taseerak.com) never count. Accounts auto-confirmed before 2026-11-17 are not backfilled:
-- they verify with the code (/api/email/*).
create or replace function public.mark_email_verified_on_confirm()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or old.email is distinct from new.email)
     and coalesce(new.email, '') !~* '@phone\.taseerak\.com$' then
    perform set_config('app.bypass_locks', 'on', true);
    update public.profiles set email_verified_at = coalesce(email_verified_at, now()) where id = new.id;
    perform set_config('app.bypass_locks', 'off', true);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_email_confirmed on auth.users;
create trigger on_auth_email_confirmed after update of email_confirmed_at, email on auth.users
  for each row execute function public.mark_email_verified_on_confirm();
