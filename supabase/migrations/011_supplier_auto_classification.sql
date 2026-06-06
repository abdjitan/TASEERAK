-- =====================================================================
-- 011_supplier_auto_classification.sql
-- Store the auto-classification verdict on the supplier profile so the
-- admin panel can surface it and sort flagged accounts first.
--   auto_classification        : 'match' | 'review' | 'mismatch'
--   auto_classification_note   : Arabic explanation / suggested fix
--   auto_classification_confidence : 0..100
--   auto_classification_source : 'keyword' | 'ai'
--   auto_classified_at         : when it last ran
-- Idempotent.
-- =====================================================================
alter table public.profiles add column if not exists auto_classification text;
alter table public.profiles add column if not exists auto_classification_note text;
alter table public.profiles add column if not exists auto_classification_confidence int;
alter table public.profiles add column if not exists auto_classification_source text;
alter table public.profiles add column if not exists auto_classified_at timestamptz;
