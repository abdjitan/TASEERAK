-- 176: a record of every acceptance of the terms + privacy policy (PDPL: consent must be
-- demonstrable). Owner decision 2026-10-27: open free beta; terms version 2026-10-27.
--
-- • legal_consents: append-only log (user, version, source, time). The user reads his own rows,
--   admins read all; writes only through the trigger / RPC below.
-- • zz_record_signup_consent (AFTER INSERT on auth.users, fires after on_auth_user_created):
--   the signup form sends terms_version in the user metadata → one row with source 'signup'.
-- • current_terms_version(): the single source of the live version (bump it with a migration
--   when the terms change; src/lib/legal.ts TERMS_VERSION must match).
-- • accept_terms(): an existing user accepts the current version (web/app re-acceptance).
-- • my_terms_status(): {current, accepted} for the signed-in user.

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document text not null default 'terms_privacy' check (document in ('terms_privacy')),
  version text not null,
  source text not null check (source in ('signup', 'web', 'app')),
  accepted_at timestamptz not null default now(),
  unique (user_id, document, version)
);
alter table public.legal_consents enable row level security;
drop policy if exists "legal_consents own or admin read" on public.legal_consents;
create policy "legal_consents own or admin read" on public.legal_consents for select
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.current_terms_version()
returns text language sql immutable as $$ select '2026-10-27'::text $$;
grant execute on function public.current_terms_version() to anon, authenticated;

create or replace function public.record_signup_consent()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v text := left(nullif(btrim(coalesce(new.raw_user_meta_data->>'terms_version', '')), ''), 20);
begin
  if v is not null then
    begin
      insert into public.legal_consents (user_id, version, source)
      values (new.id, v, case when new.raw_user_meta_data->>'client' = 'app' then 'app' else 'signup' end)
      on conflict do nothing;
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('record_signup_consent', sqlerrm, new.id); exception when others then null; end;
    end;
  end if;
  return new;
end; $$;
drop trigger if exists zz_record_signup_consent on auth.users;
create trigger zz_record_signup_consent after insert on auth.users
  for each row execute function public.record_signup_consent();

create or replace function public.accept_terms(p_source text default 'web')
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.legal_consents (user_id, version, source)
  values (auth.uid(), public.current_terms_version(), case when p_source = 'app' then 'app' else 'web' end)
  on conflict do nothing;
end; $$;
revoke all on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

create or replace function public.my_terms_status()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'current', public.current_terms_version(),
    'accepted', exists (select 1 from public.legal_consents
                        where user_id = auth.uid() and version = public.current_terms_version()));
$$;
revoke all on function public.my_terms_status() from public, anon;
grant execute on function public.my_terms_status() to authenticated;
