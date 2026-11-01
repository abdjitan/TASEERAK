-- 194: cache of AI results (2026-11-01).
-- Written by the server (service role) only: a BOQ file read before (key boq:<sha>), a spec file matched
-- against the same items (spec:<sha>), a BOQ line already classified (boqi:<sha>). A repeat costs no AI
-- call. The app works without this table (cache reads miss, writes are dropped).
create table if not exists public.ai_cache (
  key         text primary key check (length(key) between 1 and 200),
  kind        text not null check (length(kind) between 1 and 20),
  result      jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists ai_cache_created_at_idx on public.ai_cache (created_at);
alter table public.ai_cache enable row level security;
drop policy if exists ai_cache_admin_read on public.ai_cache;
create policy ai_cache_admin_read on public.ai_cache for select to authenticated using ((select public.is_admin()));
revoke all on public.ai_cache from anon;
revoke insert, update, delete on public.ai_cache from authenticated;

-- old rows are useless after 30 days (the code ignores them); keep the table small
create or replace function public.purge_ai_cache() returns void
language sql security definer set search_path = public as $$
  delete from public.ai_cache where created_at < now() - interval '45 days';
$$;
revoke all on function public.purge_ai_cache() from public, anon, authenticated;
-- schedule (if pg_cron is enabled, as for the deal reminders):
-- select cron.schedule('purge-ai-cache', '17 3 * * *', $$select public.purge_ai_cache()$$);
