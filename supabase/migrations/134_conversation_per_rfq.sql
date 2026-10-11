-- 134: Conversations are per request (get_or_create_conversation looks up by rfq_id, and
-- send_message's award check, contact masking and identity masking are per request), but the
-- table only allowed ONE conversation per buyer–supplier pair, so a buyer could not message a
-- supplier about a second request (duplicate key on conversations_contractor_id_supplier_id_key).
-- Found by supabase/tests/e2e_deal_flow.sql.
alter table public.conversations drop constraint if exists conversations_contractor_id_supplier_id_key;
alter table public.conversations add constraint conversations_rfq_contractor_supplier_key
  unique (rfq_id, contractor_id, supplier_id);
