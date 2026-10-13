-- Frankfurt migration, step 2 (after the schema + data restore): the parts a dump of the public
-- schema does not carry. Snapshot of the Sydney project taken 2026-10-13 — re-check with
-- 00-inventory.sql right before the move in case anything changed.

-- Storage buckets (the files themselves are copied by 03-copy-storage.mjs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('licenses', 'licenses', false, 15728640, '{application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('product-images', 'product-images', true, 5242880, '{image/jpeg,image/png,image/webp}'::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('verification', 'verification', false, 15728640, '{application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'::text[]) on conflict (id) do nothing;

-- Storage permissions
create policy "licenses delete" on storage.objects as permissive for delete to authenticated using (((bucket_id = 'licenses'::text) AND (owner = auth.uid())));
create policy "licenses insert" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'licenses'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (((storage.foldername(name))[1] = 'material-requests'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)))));
create policy "licenses select admin" on storage.objects as permissive for select to authenticated using (((bucket_id = 'licenses'::text) AND public.is_admin()));
create policy "licenses update" on storage.objects as permissive for update to authenticated using (((bucket_id = 'licenses'::text) AND (owner = auth.uid()))) with check (((bucket_id = 'licenses'::text) AND (owner = auth.uid())));
create policy "verification admin read" on storage.objects as permissive for select to authenticated using (((bucket_id = 'verification'::text) AND public.is_admin()));
create policy "verification owner insert" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'verification'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "verification owner read" on storage.objects as permissive for select to authenticated using (((bucket_id = 'verification'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "verification owner update" on storage.objects as permissive for update to authenticated using (((bucket_id = 'verification'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy product_images_public_read on storage.objects as permissive for select to public using ((bucket_id = 'product-images'::text));

-- Triggers on auth.users (profile row for every new account; claim a discovered supplier when the phone is confirmed)
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger trg_claim_discovered_on_phone_confirm after update of phone_confirmed_at on auth.users for each row execute function public.claim_discovered_on_phone_confirm();

-- Scheduled deal reminders
select cron.schedule('deal-reminders-hourly', '0 * * * *', 'SELECT public.generate_deal_reminders()');
select cron.schedule('learn-search-words-daily', '30 2 * * *', 'select public.refresh_learned_synonyms()');

-- Realtime
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.rfqs;
alter publication supabase_realtime add table public.support_messages;
