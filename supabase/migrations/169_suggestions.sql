-- 169: «اقتراحاتك» — buyers and suppliers send suggestions for the platform (owner 2026-10-19).
-- A user writes and reads their own; admins read all and set a status; a status change notifies
-- the author, a new suggestion notifies the admins. Rate-limited (10 a day per user).

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null default 'other' check (kind in ('feature', 'material', 'problem', 'other')),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  status text not null default 'new' check (status in ('new', 'planned', 'done', 'declined')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists suggestions_user_idx on public.suggestions(user_id, created_at desc);
create index if not exists suggestions_status_idx on public.suggestions(status, created_at desc);

alter table public.suggestions enable row level security;
drop policy if exists "own or admin read suggestions" on public.suggestions;
create policy "own or admin read suggestions" on public.suggestions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "own insert suggestions" on public.suggestions;
create policy "own insert suggestions" on public.suggestions for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "admin update suggestions" on public.suggestions;
create policy "admin update suggestions" on public.suggestions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.suggestions from anon;
grant select, insert, update on public.suggestions to authenticated;

-- insert: a user cannot set status/admin_note; rate limit; tell the admins
create or replace function public.suggestions_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.status := 'new'; new.admin_note := null; new.user_id := auth.uid();
    if not public.check_rate_limit('suggest:' || auth.uid()::text, 10, 86400) then
      raise exception 'suggest_rate_limited' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists suggestions_before_insert on public.suggestions;
create trigger suggestions_before_insert before insert on public.suggestions
  for each row execute function public.suggestions_before_insert();

create or replace function public.suggestions_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, title, body, data)
  select p.id, 'new_message', 'اقتراح جديد من مستخدم', left(new.body, 120),
         jsonb_build_object('url', '/admin/suggestions', 'kind', 'suggestion', 'suggestion_id', new.id)
    from profiles p where p.role = 'admin';
  return new;
end $$;
drop trigger if exists suggestions_after_insert on public.suggestions;
create trigger suggestions_after_insert after insert on public.suggestions
  for each row execute function public.suggestions_after_insert();

-- update (admins only by RLS): only status and admin_note change; the author hears about it
create or replace function public.suggestions_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := old.user_id; new.kind := old.kind; new.body := old.body; new.created_at := old.created_at;
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into notifications (user_id, type, title, body, data)
    values (old.user_id, 'new_message',
      case new.status when 'planned' then 'اقتراحك قيد التنفيذ' when 'done' then 'نُفّذ اقتراحك، شكراً لك'
                      when 'declined' then 'لن يُنفّذ اقتراحك حالياً' else 'تحديث على اقتراحك' end,
      coalesce(nullif(btrim(new.admin_note), ''), left(old.body, 120)),
      jsonb_build_object('url', '/suggestions', 'kind', 'suggestion', 'suggestion_id', old.id));
  end if;
  return new;
end $$;
drop trigger if exists suggestions_before_update on public.suggestions;
create trigger suggestions_before_update before update on public.suggestions
  for each row execute function public.suggestions_before_update();
