-- 140: performance-advisor follow-ups (2026-10-12).
-- 1) RLS policies call auth.uid() once per query instead of once per row: wrap it as
--    (select auth.uid()). Same meaning; only the evaluation plan changes. Idempotent.
do $$
declare p record; nq text; nw text; stmt text;
begin
  for p in select tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    nq := replace(replace(p.qual, '( SELECT auth.uid() AS uid)', '#UID#'), 'auth.uid()', '(select auth.uid())');
    nw := replace(replace(p.with_check, '( SELECT auth.uid() AS uid)', '#UID#'), 'auth.uid()', '(select auth.uid())');
    if nq is distinct from replace(p.qual, '( SELECT auth.uid() AS uid)', '#UID#')
       or nw is distinct from replace(p.with_check, '( SELECT auth.uid() AS uid)', '#UID#') then
      nq := replace(nq, '#UID#', '(select auth.uid())');
      nw := replace(nw, '#UID#', '(select auth.uid())');
      stmt := format('alter policy %I on public.%I', p.policyname, p.tablename);
      if nq is not null then stmt := stmt || format(' using (%s)', nq); end if;
      if nw is not null then stmt := stmt || format(' with check (%s)', nw); end if;
      execute stmt;
    end if;
  end loop;
end $$;

-- 2) Covering indexes for foreign keys (joins and cascades on profile/offer deletes).
create index if not exists company_invites_created_by_idx       on public.company_invites(created_by);
create index if not exists company_invites_used_by_idx          on public.company_invites(used_by);
create index if not exists company_members_added_by_idx         on public.company_members(added_by);
create index if not exists discovered_suppliers_created_by_idx  on public.discovered_suppliers(created_by);
create index if not exists discovery_runs_ran_by_idx            on public.discovery_runs(ran_by);
create index if not exists license_reviews_admin_id_idx         on public.license_reviews(admin_id);
create index if not exists license_reviews_profile_id_idx       on public.license_reviews(profile_id);
create index if not exists live_prices_supplier_id_idx          on public.live_prices(supplier_id);
create index if not exists market_price_snapshots_offer_id_idx  on public.market_price_snapshots(offer_id);
create index if not exists market_price_snapshots_rfq_id_idx    on public.market_price_snapshots(rfq_id);
create index if not exists market_price_snapshots_supplier_idx  on public.market_price_snapshots(supplier_id);
create index if not exists materials_source_request_idx         on public.materials(source_request);
create index if not exists messages_offer_id_idx                on public.messages(offer_id);
create index if not exists products_supplier_id_idx             on public.products(supplier_id);
create index if not exists profile_change_requests_user_id_idx  on public.profile_change_requests(user_id);
create index if not exists reviews_offer_id_idx                 on public.reviews(offer_id);
