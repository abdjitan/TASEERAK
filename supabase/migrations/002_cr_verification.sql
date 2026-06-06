-- =============================================
-- 002 — COMMERCIAL REGISTRATION (CR) VERIFICATION
-- Adds fields to store official data pulled from the
-- Saudi Ministry of Commerce "Wathq (واثق)" platform,
-- plus the manual-review / classification fields used by
-- the registration, settings and admin pages.
--
-- Safe to run multiple times (idempotent: add column if not exists).
-- Run this in Supabase → SQL Editor.
-- =============================================

alter table profiles
  -- classification / manual-review fields referenced across the app
  add column if not exists rejection_reason     text,
  add column if not exists supplier_tier        text,            -- 'manufacturer' | 'commercial' | 'local'
  add column if not exists min_order_value      numeric(14,2),
  add column if not exists latitude             double precision,
  add column if not exists longitude            double precision,
  add column if not exists national_short_address text,          -- العنوان الوطني المختصر (e.g. RRRD2929)

  -- ⭐ official data pulled from Wathq (source verification)
  add column if not exists cr_verification_source text,          -- 'manual' | 'wathq'
  add column if not exists cr_verified_at       timestamptz,
  add column if not exists cr_official_name     text,            -- official entity name from the source
  add column if not exists cr_activity          text,            -- main commercial activity
  add column if not exists cr_status            text,            -- official CR status (active/cancelled/expired)
  add column if not exists cr_issue_date        date,
  add column if not exists cr_expiry_date       date,
  add column if not exists cr_data              jsonb;           -- full raw response (for reference/audit)

-- index to look up by CR quickly
create index if not exists profiles_commercial_registration_idx
  on profiles (commercial_registration);

-- index to filter verification queue in admin
create index if not exists profiles_verification_status_idx
  on profiles (verification_status);
