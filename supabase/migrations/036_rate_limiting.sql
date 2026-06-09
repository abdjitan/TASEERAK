-- DB-based rate limiter (no external service). Fixed-window counter per bucket.
create table if not exists public.rate_limits (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;  -- only the SECURITY DEFINER fn touches it

create or replace function public.check_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into public.rate_limits as rl (bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning rl.count into v_count;
  return v_count <= p_max;
end; $$;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated, service_role;

create or replace function public.client_ip()
returns text language sql stable set search_path = public as $$
  select coalesce(nullif(split_part(coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-forwarded-for', ',', 1), ''), 'anon')
$$;

-- Per-IP rate limiting inside the anon enumeration RPCs.
create or replace function public.cr_exists(p_cr text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.check_rate_limit('cr_exists:' || public.client_ip(), 120, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return exists(select 1 from public.profiles where commercial_registration = p_cr and coalesce(p_cr,'') <> '');
end; $$;
grant execute on function public.cr_exists(text) to anon, authenticated;

create or replace function public.phone_exists(p_phone text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.check_rate_limit('phone_exists:' || public.client_ip(), 120, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return exists(select 1 from public.profiles where phone = p_phone and coalesce(p_phone,'') <> '');
end; $$;
grant execute on function public.phone_exists(text) to anon, authenticated;
