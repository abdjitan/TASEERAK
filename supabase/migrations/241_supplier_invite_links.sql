-- 241: supplier-only invite link /join (owner 2026-11-21). A public, shareable link; ?i=<code> tags a
-- batch (e.g. wa1 = the first WhatsApp batch) so the admin sees how many opened and signed up.
-- No personal data: an open is just (code, time); a signup links the code to the new seller once.
create table if not exists public.invite_link_events (
  id bigserial primary key,
  code text not null,
  event text not null check (event in ('open', 'signup')),
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists invite_link_events_one_signup on public.invite_link_events (user_id) where event = 'signup';
create index if not exists invite_link_events_code on public.invite_link_events (code, event);
alter table public.invite_link_events enable row level security;
drop policy if exists invite_link_events_admin_read on public.invite_link_events;
create policy invite_link_events_admin_read on public.invite_link_events for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.invite_link_events from anon, authenticated;

create or replace function public.clean_invite_code(p text) returns text
language sql immutable set search_path = public as $$
  select case when lower(coalesce(p, '')) ~ '^[a-z0-9_-]{1,24}$' then lower(p) else 'direct' end
$$;

-- /join page opened (anyone; rate-limited per IP)
create or replace function public.log_invite_open(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._rate_limit_hit('invite_open:' || public.client_ip(), 60, 3600) then return; end if;
  insert into invite_link_events (code, event) values (public.clean_invite_code(p_code), 'open');
end $$;
revoke all on function public.log_invite_open(text) from public;
grant execute on function public.log_invite_open(text) to anon, authenticated;

-- the new seller came from /join: recorded once per account
create or replace function public.claim_invite_signup(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role::text = 'supplier') then return; end if;
  insert into invite_link_events (code, event, user_id) values (public.clean_invite_code(p_code), 'signup', auth.uid())
  on conflict do nothing;
end $$;
revoke all on function public.claim_invite_signup(text) from public, anon;
grant execute on function public.claim_invite_signup(text) to authenticated;

create or replace function public.admin_invite_stats()
returns table (code text, opens bigint, signups bigint, first_at timestamptz, last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select e.code, count(*) filter (where e.event = 'open'), count(*) filter (where e.event = 'signup'), min(e.created_at), max(e.created_at)
      from invite_link_events e group by e.code order by max(e.created_at) desc;
end $$;
revoke all on function public.admin_invite_stats() from public, anon;
grant execute on function public.admin_invite_stats() to authenticated;
