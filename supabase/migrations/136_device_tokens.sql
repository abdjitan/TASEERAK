-- 136: push tokens of the mobile app (REQUESTS_FOR_WEB R2). Applied 2026-10-12.
-- The Expo app registers its Expo push token after the user allows notifications, refreshes it on
-- every launch and removes it on sign-out. The push edge function (R3) reads it with service role.

create table if not exists public.device_tokens (
  user_id      uuid not null references auth.users(id) on delete cascade,
  token        text primary key check (length(token) between 10 and 300),
  platform     text not null check (platform in ('ios', 'android')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;
drop policy if exists device_tokens_own_read on public.device_tokens;
create policy device_tokens_own_read on public.device_tokens for select to authenticated using (user_id = auth.uid());
-- no insert/update/delete policies: writes go through the two functions below
revoke all on public.device_tokens from anon;
grant select on public.device_tokens to authenticated;

-- Register or refresh this device for the signed-in user. A token that belonged to another user
-- (the phone changed hands, or a different account signed in) moves to the current user.
create or replace function public.register_device_token(p_token text, p_platform text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token is null or length(p_token) < 10 or length(p_token) > 300 then raise exception 'bad_token'; end if;
  if p_platform not in ('ios', 'android') then raise exception 'bad_platform'; end if;
  insert into device_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end $$;

create or replace function public.unregister_device_token(p_token text)
returns void
language sql security definer set search_path = public
as $$
  delete from device_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_device_token(text, text) from public, anon;
revoke execute on function public.unregister_device_token(text) from public, anon;
grant execute on function public.register_device_token(text, text) to authenticated;
grant execute on function public.unregister_device_token(text) to authenticated;
