-- 272 (round-3 UX-128): amounts in notices read «X ر.س», like the screens.
create or replace function public.fmt_sar(p numeric)
returns text language sql immutable as $$
  select case when p is null then null else to_char(round(p), 'FM999,999,990') || ' ر.س' end
$$;
