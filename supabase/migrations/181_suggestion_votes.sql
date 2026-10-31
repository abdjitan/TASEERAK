-- 181: vote on suggestions (owner's decisions file, 2026-10-31). The admin publishes a suggestion for
-- voting («انشر للتصويت»); every signed-in user sees published ones (text only, never the author)
-- and gives one vote each. Admins see the counts.
alter table public.suggestions add column if not exists is_public boolean not null default false;

create table if not exists public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
alter table public.suggestion_votes enable row level security;
revoke all on public.suggestion_votes from anon, authenticated;

-- published suggestions with their vote count and whether I voted (no author identity)
create or replace function public.list_public_suggestions()
returns table (id uuid, kind text, body text, status text, admin_note text, created_at timestamptz, votes bigint, my_vote boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.kind, s.body, s.status, s.admin_note, s.created_at,
         (select count(*) from suggestion_votes v where v.suggestion_id = s.id),
         exists (select 1 from suggestion_votes v where v.suggestion_id = s.id and v.user_id = auth.uid())
  from suggestions s
  where s.is_public and s.status <> 'declined' and auth.uid() is not null
  order by 7 desc, s.created_at desc
  limit 200
$$;
revoke all on function public.list_public_suggestions() from public, anon;
grant execute on function public.list_public_suggestions() to authenticated;

-- one vote per person; a second call takes it back. Returns the new count.
create or replace function public.toggle_suggestion_vote(p_id uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if auth.uid() is null then raise exception 'سجّل الدخول أولاً.'; end if;
  if not exists (select 1 from suggestions where id = p_id and is_public and status <> 'declined') then raise exception 'not_found'; end if;
  if exists (select 1 from suggestion_votes where suggestion_id = p_id and user_id = auth.uid()) then
    delete from suggestion_votes where suggestion_id = p_id and user_id = auth.uid();
  else
    insert into suggestion_votes (suggestion_id, user_id) values (p_id, auth.uid());
  end if;
  select count(*) into n from suggestion_votes where suggestion_id = p_id;
  return n;
end $$;
revoke all on function public.toggle_suggestion_vote(uuid) from public, anon;
grant execute on function public.toggle_suggestion_vote(uuid) to authenticated;

-- admin: vote counts for the review page
create or replace function public.admin_suggestion_votes()
returns table (suggestion_id uuid, votes bigint) language sql stable security definer set search_path = public as $$
  select v.suggestion_id, count(*) from suggestion_votes v where public.is_admin() group by 1
$$;
revoke all on function public.admin_suggestion_votes() from public, anon;
grant execute on function public.admin_suggestion_votes() to authenticated;
