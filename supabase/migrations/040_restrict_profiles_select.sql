-- Lock down base-table reads of profiles. Only the owner, an admin, or a
-- transaction counterparty (someone you've exchanged an offer with) may read
-- the full, sensitive row (phone/CR/VAT/coords/address). Everyone else reads
-- directory-safe columns through public.profiles_public (migration 039).
--
-- App reads were migrated first (step 2): all directory/listing embeds now use
-- profiles_public; only counterparty contact screens still read the base table.
drop policy if exists "Authenticated read profiles" on public.profiles;
create policy "profiles_select_owner_admin_counterparty" on public.profiles
  for select to authenticated
  using (auth.uid() = id or is_admin() or public.is_counterparty(id));
