-- =============================================
-- 003 — FIX SECTOR ENUM MISMATCH
-- The code uses 6 sectors but the DB enum had only 4.
-- This adds the two missing values so RFQs / products /
-- profile_sectors can store 'equipment' and 'supply_store'.
--
-- ⚠️ Run this on its OWN (do not wrap with other statements that
--    USE these new values in the same transaction).
-- Run in Supabase → SQL Editor.
-- =============================================

ALTER TYPE sector ADD VALUE IF NOT EXISTS 'equipment';
ALTER TYPE sector ADD VALUE IF NOT EXISTS 'supply_store';
