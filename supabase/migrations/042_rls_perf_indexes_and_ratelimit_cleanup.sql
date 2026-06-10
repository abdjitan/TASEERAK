-- (1) is_counterparty() performance: it joins offers↔rfqs filtering on these
-- columns. Without indexes the per-row policy check forces sequential scans.
create index if not exists idx_offers_supplier_id on public.offers(supplier_id);
create index if not exists idx_rfqs_contractor_id on public.rfqs(contractor_id);

-- (2) rate_limits self-cleanup so the table can't grow unbounded (no cron needed):
-- on a small fraction of calls, drop buckets whose window is over a day old.
create or replace function public.check_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if random() < 0.005 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  insert into public.rate_limits as rl (bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning rl.count into v_count;
  return v_count <= p_max;
end; $$;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated, service_role;
