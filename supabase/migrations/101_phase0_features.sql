-- =====================================================================================
-- 101_phase0_features.sql
-- Phase-0 roadmap features (verbatim live state). Applied to the production Supabase
-- project; reproduced here so the export reflects the real DB.
-- =====================================================================================

-- Offer price validity: steel & other materials reprice daily, so each offer carries how
-- long the quoted price is guaranteed. Advisory (does not block acceptance) — the contractor
-- is warned to re-confirm once it lapses.
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS price_valid_until timestamptz;

-- RFQ drafts: a contractor can save an in-progress request and resume it later. Kept in a
-- SEPARATE table (a JSON snapshot of the form) so the rfqs table + its daily-limit / notify
-- triggers stay untouched — publishing goes through the normal RFQ insert path, and drafts
-- are invisible to suppliers and never counted toward the daily RFQ limit.
CREATE TABLE IF NOT EXISTS public.rfq_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rfq_drafts_contractor_idx ON public.rfq_drafts(contractor_id);
ALTER TABLE public.rfq_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own drafts" ON public.rfq_drafts;
CREATE POLICY "own drafts" ON public.rfq_drafts FOR ALL TO authenticated
  USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());

-- (rfq_status also gained a 'draft' label via ALTER TYPE ... ADD VALUE 'draft'; currently
-- unused because drafts live in rfq_drafts, kept for forward-compat.)
