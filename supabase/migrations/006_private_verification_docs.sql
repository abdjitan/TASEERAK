-- =============================================
-- 006 — PRIVATE BUCKET FOR SENSITIVE DOCUMENTS
--
-- PROBLEM: license + commercial-registration scans were uploaded to the
-- PUBLIC "licenses" bucket → anyone with the link could open them.
--
-- FIX: a new PRIVATE bucket "verification" holds these sensitive docs.
-- Only the document's owner and admins can read them (via signed URLs).
-- Shared files (BOQ, specs, offer catalogs) stay in the public bucket,
-- so contractor/supplier file-sharing is unaffected.
--
-- Run in Supabase → SQL Editor (after 004, which created is_admin()).
-- Safe to re-run.
-- =============================================

-- 1) create the private bucket
insert into storage.buckets (id, name, public)
values ('verification', 'verification', false)
on conflict (id) do nothing;

-- 2) storage.objects policies for this bucket
--    files are stored under "<userId>/..." so foldername[1] = owner id

-- owner can read their own verification files
drop policy if exists "verification owner read" on storage.objects;
create policy "verification owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);

-- owner can upload to their own folder
drop policy if exists "verification owner insert" on storage.objects;
create policy "verification owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);

-- owner can replace their own files (upsert)
drop policy if exists "verification owner update" on storage.objects;
create policy "verification owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);

-- admins can read every verification file (for review)
drop policy if exists "verification admin read" on storage.objects;
create policy "verification admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification' and public.is_admin());
