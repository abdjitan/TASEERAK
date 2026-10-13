-- 143: answers of the "understand / search the web" step (2026-10-13). Each new word or phrase is
-- looked up once; repeats are answered from here at no cost. Also learning data for later models.
create table if not exists public.ai_lookups (
  query_norm  text primary key check (length(query_norm) between 1 and 120),
  query       text not null,
  result      jsonb not null,
  sources     jsonb,
  hits        int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.ai_lookups enable row level security;
drop policy if exists ai_lookups_admin_read on public.ai_lookups;
create policy ai_lookups_admin_read on public.ai_lookups for select to authenticated using (public.is_admin());
revoke all on public.ai_lookups from anon;
