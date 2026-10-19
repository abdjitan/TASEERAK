-- 172: the race-proof form of "one CR = one account" + the AI read log (owner OK, 2026-10-19,
-- relayed by the main session). Design: docs/CR_VERIFICATION_DESIGN.md §1 and §4.
--
-- 1) Test duplicate: CR 1009084000 sat on two verified TEST supplier accounts (created
--    2026-06-08). Owner: clear it on the NEWER one. Guarded: only runs when both holders are
--    test accounts (auth email contains "test" or "taseerak"), otherwise the migration stops.
-- 2) Partial unique index on the normalised CR for every non-rejected account.
-- 3) cr_document_checks: one row per AI read of an uploaded CR (fields, mismatch flags, tokens,
--    cost). The monthly spend cap ($2, AI_CAP_USD_VERIFY) is summed from this table in code.

do $$
declare v_newer uuid; v_all_test boolean;
begin
  select bool_and(u.email ilike '%test%' or u.email ilike '%taseerak%') into v_all_test
    from public.profiles p join auth.users u on u.id = p.id
   where p.commercial_registration = '1009084000';
  if v_all_test is null then return; end if;           -- already resolved
  if not v_all_test then raise exception '172: CR 1009084000 is held by a non-test account; resolve it by hand'; end if;
  select id into v_newer from public.profiles where commercial_registration = '1009084000'
   order by created_at desc, id desc limit 1;
  if (select count(*) from public.profiles where commercial_registration = '1009084000') > 1 then
    perform set_config('app.bypass_locks', 'on', true);
    update public.profiles set commercial_registration = null where id = v_newer;
    insert into public.audit_logs (actor_id, action, entity, entity_id, detail)
    values (null, 'cr_cleared_test_duplicate', 'profile', v_newer, jsonb_build_object('cr', '1009084000', 'migration', '172'));
  end if;
end $$;

create unique index if not exists profiles_cr_one_holder on public.profiles (commercial_registration)
  where commercial_registration is not null and verification_status <> 'rejected';

create table if not exists public.cr_document_checks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  claim_id uuid references public.cr_claims(id) on delete cascade,
  file_path text not null,
  extracted jsonb,            -- cr_number, entity_name, expiry_date, activity, city, document_type, has_qr
  flags jsonb,                -- cr_mismatch, name_mismatch, expired, not_cr_document
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10,6) not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists cr_document_checks_profile on public.cr_document_checks (profile_id, created_at desc);
create index if not exists cr_document_checks_month on public.cr_document_checks (created_at);
alter table public.cr_document_checks enable row level security;
drop policy if exists "cr_document_checks owner or admin read" on public.cr_document_checks;
create policy "cr_document_checks owner or admin read" on public.cr_document_checks for select
  using (profile_id = auth.uid() or public.is_admin());
-- no insert/update/delete policies: written by the server (service role) only

-- This Riyadh calendar month's AI spend on CR reads (service role only; the route fails closed
-- when it can't read it).
create or replace function public.cr_ai_spend_month()
returns numeric language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(cost_usd), 0) from public.cr_document_checks
   where created_at >= (date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh');
$$;
revoke all on function public.cr_ai_spend_month() from public, anon, authenticated;
