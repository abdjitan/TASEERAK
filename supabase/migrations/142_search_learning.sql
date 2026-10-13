-- 142: a search that learns from its users (2026-10-13).
-- Every search that ends in a choice is recorded (what the person typed → the product they picked,
-- or the free-text name they added). A daily job turns repeated pairs into learned words: once
-- 3 different people searched the same word and chose the same product, the word is approved and
-- the search ranks that product first for everyone. The admin reviews the rest at /admin/learning.
-- The table is also the seed data for later steps (meaning search, a model trained on our data).

create table if not exists public.search_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  query       text not null check (length(query) between 1 and 120),
  query_norm  text not null check (length(query_norm) between 1 and 120),
  action      text not null check (action in ('picked', 'free_text', 'no_result')),
  picked_name text check (length(picked_name) <= 200),
  sector      text,
  source      text not null default 'catalog' check (source in ('catalog', 'quick_text', 'photo', 'app')),
  created_at  timestamptz not null default now()
);
create index if not exists search_events_norm_idx on public.search_events (query_norm);
create index if not exists search_events_created_idx on public.search_events (created_at desc);
alter table public.search_events enable row level security;
drop policy if exists search_events_admin_read on public.search_events;
create policy search_events_admin_read on public.search_events for select to authenticated using (public.is_admin());
revoke all on public.search_events from anon;

create table if not exists public.learned_synonyms (
  id           bigint generated always as identity primary key,
  term_norm    text not null check (length(term_norm) between 1 and 120),
  product_name text not null check (length(product_name) <= 200),
  sector       text,
  users        int not null default 0,   -- distinct people who searched term → chose product
  hits         int not null default 0,   -- all such searches
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source       text not null default 'users' check (source in ('seed', 'users', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (term_norm, product_name)
);
alter table public.learned_synonyms enable row level security;
drop policy if exists learned_synonyms_admin on public.learned_synonyms;
create policy learned_synonyms_admin on public.learned_synonyms for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.learned_synonyms from anon;

-- Record one search outcome (signed-in users; at most 120 a minute per user).
create or replace function public.log_search_event(p_query text, p_query_norm text, p_action text, p_picked text default null, p_sector text default null, p_source text default 'catalog')
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  if p_query is null or btrim(p_query) = '' or p_query_norm is null or btrim(p_query_norm) = '' then return; end if;
  if (select count(*) from search_events where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 120 then return; end if;
  insert into search_events (user_id, query, query_norm, action, picked_name, sector, source)
  values (auth.uid(), left(btrim(p_query), 120), left(btrim(p_query_norm), 120), p_action, left(p_picked, 200), p_sector,
          case when p_source in ('catalog', 'quick_text', 'photo', 'app') then p_source else 'catalog' end);
end $$;
revoke execute on function public.log_search_event(text, text, text, text, text, text) from public, anon;
grant execute on function public.log_search_event(text, text, text, text, text, text) to authenticated;

-- Approved words for the search (everyone, cached on the device).
create or replace function public.get_learned_synonyms()
returns table (term_norm text, product_name text, sector text)
language sql stable security definer set search_path = public
as $$
  select term_norm, product_name, sector from learned_synonyms where status = 'approved'
$$;
grant execute on function public.get_learned_synonyms() to anon, authenticated;

-- Turn repeated (word → chosen product) pairs into learned words. Runs daily; admin can run it.
create or replace function public.refresh_learned_synonyms()
returns int
language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'admin only'; end if;
  insert into learned_synonyms (term_norm, product_name, sector, users, hits, status, source)
  select query_norm, picked_name, max(sector), count(distinct user_id), count(*),
         case when count(distinct user_id) >= 3 then 'approved' else 'pending' end, 'users'
  from search_events
  where action in ('picked', 'free_text') and picked_name is not null
    and query_norm <> lower(picked_name)
  group by query_norm, picked_name
  on conflict (term_norm, product_name) do update
    set users = excluded.users, hits = excluded.hits, updated_at = now(),
        status = case when learned_synonyms.status = 'pending' and excluded.users >= 3 then 'approved' else learned_synonyms.status end;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.refresh_learned_synonyms() from public, anon;
grant execute on function public.refresh_learned_synonyms() to authenticated;

-- Admin decision on a learned word.
create or replace function public.review_learned_synonym(p_id bigint, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'bad status'; end if;
  update learned_synonyms set status = p_status, source = case when source = 'users' and p_status <> 'pending' then 'admin' else source end, updated_at = now() where id = p_id;
end $$;
revoke execute on function public.review_learned_synonym(bigint, text) from public, anon;
grant execute on function public.review_learned_synonym(bigint, text) to authenticated;

select cron.schedule('learn-search-words-daily', '30 2 * * *', 'select public.refresh_learned_synonyms()')
where not exists (select 1 from cron.job where jobname = 'learn-search-words-daily');
