-- 160: «أسعاري» is private (owner 2026-10-17). Until now any signed-in user could read every
-- supplier's saved prices, against the promise «سعرك يراه صاحب الطلب فقط». Now a supplier (or a
-- member of its company team, via acting_uid) and admins read them; nobody else.
-- The public price board (/market, switched off for launch) will need aggregated data instead.
drop policy if exists "Authenticated read live_prices" on public.live_prices;
create policy "Own or company read live_prices" on public.live_prices
  for select to authenticated
  using (supplier_id = (select auth.uid()) or supplier_id = (select public.acting_uid()) or public.is_admin());
revoke select on public.live_prices from anon;
