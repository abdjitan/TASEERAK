-- BUG: supplier offer attachments never saved. The old "licenses authenticated
-- upload" storage policy was created TO public and silently denied authenticated
-- uploads (Storage RLS quirk) — every upload failed with 403, the client swallowed
-- it, and offers were saved with attachment_url = null.
--
-- FIX: recreate the licenses storage policies TO authenticated so any signed-in
-- user can upload to the shared, public "licenses" bucket (verified via a live
-- upload as a supplier).
drop policy if exists "licenses authenticated upload" on storage.objects;
drop policy if exists "licenses owner update" on storage.objects;
drop policy if exists "licenses owner delete" on storage.objects;

create policy "licenses insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'licenses');

create policy "licenses select" on storage.objects
  for select to public
  using (bucket_id = 'licenses');

create policy "licenses update" on storage.objects
  for update to authenticated
  using (bucket_id = 'licenses' and owner = auth.uid())
  with check (bucket_id = 'licenses');

create policy "licenses delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'licenses' and owner = auth.uid());
