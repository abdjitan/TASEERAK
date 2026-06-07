-- Internal support messaging between admins and users (contractors/suppliers).
-- Each user has one thread (all rows with their user_id). sender marks who wrote it.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('user','admin')),
  content text not null,
  read_by_admin boolean not null default false,
  read_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_user_idx on public.support_messages(user_id, created_at);

alter table public.support_messages enable row level security;

-- A user reads their own thread; admins read all.
create policy "support read own or admin" on public.support_messages
  for select using (user_id = auth.uid() or is_admin());

-- A user posts to their own thread as 'user'; admins post to any thread as 'admin'.
create policy "support insert own or admin" on public.support_messages
  for insert with check ((user_id = auth.uid() and sender = 'user') or (is_admin() and sender = 'admin'));

-- Marking messages read.
create policy "support update own or admin" on public.support_messages
  for update using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
