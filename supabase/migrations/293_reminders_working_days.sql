-- 293 (round-8 UX-010): the «late delivery» reminder uses the same date the screens show: working days in
-- Riyadh, Friday skipped (src/lib/dealStage.ts expectedDeliveryDate). No reminder while an advance payment is
-- unpaid, and none when the offer has no delivery time.
create or replace function public.expected_delivery_date(p_accepted timestamptz, p_days int)
returns date language plpgsql immutable as $$
declare d date := (p_accepted at time zone 'Asia/Riyadh')::date; n int := 0;
begin
  if p_accepted is null or p_days is null or p_days <= 0 then return null; end if;
  while n < p_days loop
    d := d + 1;
    if extract(isodow from d) <> 5 then n := n + 1; end if; -- 5 = Friday
  end loop;
  return d;
end $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_deal_reminders()'::regprocedure);
  d := replace(d, 'IF r.supplier_delivered_at IS NULL AND r.accepted_at + make_interval(days => dd) < now() THEN',
    'IF r.supplier_delivered_at IS NULL AND COALESCE(r.delivery_days, 0) > 0'
    || ' AND NOT EXISTS (SELECT 1 FROM offers ox WHERE ox.id = r.offer_id AND ox.payment_terms = ''advance'' AND ox.payment_status IS DISTINCT FROM ''paid'')'
    || ' AND (now() AT TIME ZONE ''Asia/Riyadh'')::date > public.expected_delivery_date(r.accepted_at, r.delivery_days) THEN');
  if position('expected_delivery_date' in d) = 0 then raise exception 'anchor not found'; end if;
  execute d;
end $$;
