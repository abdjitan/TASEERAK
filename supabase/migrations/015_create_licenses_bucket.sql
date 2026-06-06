-- =====================================================================
-- 015_create_licenses_bucket.sql
-- The "licenses" PUBLIC storage bucket for shared, non-sensitive files:
-- BOQ files, RFQ specification sheets, and supplier offer catalogs/
-- attachments. The app uploads here and references them via public URL.
-- (Sensitive license / CR documents stay in the private "verification"
-- bucket from migration 006.)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('licenses', 'licenses', true)
on conflict (id) do nothing;

drop policy if exists "licenses public read"          on storage.objects;
drop policy if exists "licenses authenticated upload"  on storage.objects;
drop policy if exists "licenses owner update"          on storage.objects;
drop policy if exists "licenses owner delete"          on storage.objects;

create policy "licenses public read" on storage.objects
  for select using (bucket_id = 'licenses');

create policy "licenses authenticated upload" on storage.objects
  for insert with check (bucket_id = 'licenses' and auth.uid() is not null);

create policy "licenses owner update" on storage.objects
  for update using (bucket_id = 'licenses' and owner = auth.uid());

create policy "licenses owner delete" on storage.objects
  for delete using (bucket_id = 'licenses' and owner = auth.uid());
