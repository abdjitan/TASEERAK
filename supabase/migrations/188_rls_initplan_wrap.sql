-- 188: performance audit H4 (2026-11-01). Policies that called is_admin() / auth.uid() bare ran them once
-- per row; wrapped in (select …) Postgres evaluates them once per query (same meaning, no access change).
-- Generated from pg_policies; e2e_deal_flow run after applying.
alter policy ai_item_notes_admin_read on public.ai_item_notes using (( SELECT public.is_admin() AS is_admin));
alter policy ai_lookups_admin_read on public.ai_lookups using (( SELECT public.is_admin() AS is_admin));
alter policy "app_config admin write" on public.app_config using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "audit admin read" on public.audit_logs using (( SELECT public.is_admin() AS is_admin));
alter policy "branches manage own" on public.branches using (((supplier_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin))) with check (((supplier_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "admin read catalog_gaps" on public.catalog_gaps using (( SELECT public.is_admin() AS is_admin));
alter policy "admin update catalog_gaps" on public.catalog_gaps using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "conv participants read" on public.conversations using (((contractor_id = ( SELECT auth.uid() AS uid)) OR (supplier_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "cr_claims claimant or admin read" on public.cr_claims using (((claimant_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "cr_document_checks owner or admin read" on public.cr_document_checks using (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "cr_objections admin read" on public.cr_objections using (( SELECT public.is_admin() AS is_admin));
alter policy "cr_objections admin update" on public.cr_objections using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "admin manage discovered suppliers" on public.discovered_suppliers using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "admin manage discovery runs" on public.discovery_runs using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy invite_chats_admin_read on public.invite_chats using (( SELECT public.is_admin() AS is_admin));
alter policy invite_messages_admin_read on public.invite_messages using (( SELECT public.is_admin() AS is_admin));
alter policy learned_synonyms_admin on public.learned_synonyms using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "legal_consents own or admin read" on public.legal_consents using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "license_reviews admin manage" on public.license_reviews using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "license_reviews owner read" on public.license_reviews using (((( SELECT auth.uid() AS uid) = profile_id) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "Own or company read live_prices" on public.live_prices using (((supplier_id = ( SELECT auth.uid() AS uid)) OR (supplier_id = ( SELECT acting_uid() AS acting_uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "Admins manage all material requests" on public.material_requests using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "admin manage materials" on public.materials using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "msg participants read" on public.messages using ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.contractor_id = ( SELECT auth.uid() AS uid)) OR (c.supplier_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin))))));
alter policy "Update own or counterparty offers" on public.offers using (((supplier_id = ( SELECT acting_uid() AS acting_uid)) OR is_rfq_owner(rfq_id) OR ( SELECT public.is_admin() AS is_admin))) with check (((supplier_id = ( SELECT acting_uid() AS acting_uid)) OR is_rfq_owner(rfq_id) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "View own or counterparty offers" on public.offers using (((supplier_id = ( SELECT acting_uid() AS acting_uid)) OR is_rfq_owner(rfq_id) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "pcr read own or admin" on public.profile_change_requests using (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "Admins update all profiles" on public.profiles using (( SELECT public.is_admin() AS is_admin));
alter policy profiles_select_owner_admin_accepted_counterparty on public.profiles using (((( SELECT auth.uid() AS uid) = id) OR ( SELECT public.is_admin() AS is_admin) OR shares_deal_with(id) OR (id = ( SELECT acting_uid() AS acting_uid))));
alter policy "Contractors manage own project_rfq_items" on public.project_rfq_items using ((EXISTS ( SELECT 1
   FROM project_rfqs p
  WHERE ((p.id = project_rfq_items.project_rfq_id) AND ((p.contractor_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)))))) with check ((EXISTS ( SELECT 1
   FROM project_rfqs p
  WHERE ((p.id = project_rfq_items.project_rfq_id) AND (p.contractor_id = ( SELECT auth.uid() AS uid))))));
alter policy "Contractors manage own project_rfqs" on public.project_rfqs using (((contractor_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin))) with check ((contractor_id = ( SELECT auth.uid() AS uid)));
alter policy "Contractors update own rfqs" on public.rfqs using (((contractor_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy search_events_admin_read on public.search_events using (( SELECT public.is_admin() AS is_admin));
alter policy "admin update suggestions" on public.suggestions using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
alter policy "own or admin read suggestions" on public.suggestions using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "support insert own or admin" on public.support_messages with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (sender = 'user'::text)) OR (( SELECT public.is_admin() AS is_admin) AND (sender = 'admin'::text))));
alter policy "support read own or admin" on public.support_messages using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "support update own or admin" on public.support_messages using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin))) with check (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));
alter policy "sys errors admin read" on public.system_errors_log using (( SELECT public.is_admin() AS is_admin));
alter policy taxonomy_admin_write on public.taxonomy using (( SELECT public.is_admin() AS is_admin)) with check (( SELECT public.is_admin() AS is_admin));
