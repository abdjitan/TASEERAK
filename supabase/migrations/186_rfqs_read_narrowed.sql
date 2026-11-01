-- 186: step 2 of 185 (security audit M1, 2026-11-01). The rfqs table was readable by every
-- signed-in account for any request in its regions, contractor_id included, so a supplier or a
-- competing buyer could group a buyer's purchases even with «إخفاء الهوية». Suppliers now browse
-- through get_supplier_feed / get_rfq_for_viewer (web and app). The table itself is read by:
-- the owner, admins, suppliers who quoted (team members via acting_uid), and suppliers in a
-- conversation on the request (their inbox shows its title).
drop policy if exists "read rfqs owned or in target scope" on public.rfqs;
create policy "read rfqs owner admin or party" on public.rfqs for select to authenticated
using (
  contractor_id = (select auth.uid())
  or (select public.is_admin())
  or public.supplier_offered_on(id)
  or exists (select 1 from public.conversations c
              where c.rfq_id = rfqs.id and c.supplier_id = (select public.acting_uid()))
);
