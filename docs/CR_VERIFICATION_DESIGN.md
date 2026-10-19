# CR verification + one-CR-one-account — design proposal (2026-10-19)

Owner goal: «ما بدي واحد يجيب سجل يفتح ألف حساب». Manual admin review stays the
decision; free checks and a cheap AI read make it fast. Wathq later.

## What exists today (live DB, checked 2026-10-19)
- `profiles.commercial_registration` text, plain index, **no uniqueness** (022 dropped it for branch accounts; branches are now `company_members`, 124).
- `enforce_profile_field_locks` (BEFORE UPDATE) blocks setting a CR held by another **verified/wathq** profile, but: admins bypass it, `admin_set_verification` bypasses it (`app.bypass_locks`), and unverified duplicates are unlimited.
- `handle_new_user` never writes the CR → insert path is not a hole today; CR enters only by UPDATE (web settings, mobile documents).
- No normalisation: compare is raw text (all 5 current CRs are digits).
- **Live duplicate:** `1009084000` on 2 verified supplier accounts, both test accounts (2026-06-08). Must be resolved before a unique index can exist.
- `verification_status` defaults to `pending` for **every** new profile (buyers too) → "pending" does not mean "submitted for review".
- `delete_my_account()` does **not** clear the CR → a deleted account would hold the CR forever.
- Verification docs go to the private **`verification`** bucket via `/api/upload-verification` (magic-byte checked, path `<uid>/<kind>.<ext>`), opened by signed URL. (Not `licenses`.)
- Admin verifies via `profiles.update({verification_status})` from the browser and **ignores errors** (`admin/page.tsx` `updateStatus`).
- `cr_objections` + `report_cr_objection()` (anon, rate-limited) = admin-only fake-account reports. Basis for the claim flow.
- `/api/verify-identity` has no caller (web or mobile).

## 1. Normalise + one CR = one account (migration 170)
- `normalize_cr(text)`: Arabic-Indic/Persian digits → ASCII, strip everything non-digit, empty → null. BEFORE INSERT OR UPDATE trigger on `profiles` applies it (runs before the lock trigger by name order: `aa_normalize_cr`).
- **Unique partial index**: `unique (commercial_registration) where commercial_registration is not null and verification_status <> 'rejected'`.
  - Holds for every path, admin and service role included — the DB is the guarantee, not the UI.
  - Stronger than "one verified per CR": it also stops one CR from sitting on many *unverified* accounts (the "1000 accounts" case). A second account that wants a held CR goes through the claim flow (§3).
  - Rejected accounts release the CR.
- Friendly error: a BEFORE trigger raises `CR_TAKEN` with the MSA message before the index fires, so clients get one stable code:
  «هذا السجل التجاري مستخدم في حساب آخر. إن كان سجلّك فاطلب التحقق.» + client shows the «اضغط هنا للتحقق» link to the claim screen.
- `cr_exists()` stays boolean (no enumeration).
- `delete_my_account()` clears `commercial_registration` (releases the CR).
- **Pre-step (needs OK):** clear the CR on the newer of the two test accounts holding `1009084000`.
- Question for main: any reason to allow the same CR on a buyer *and* a supplier account? Proposal: no (one CR = one account, any role); exceptions go through the claim/admin path.

## 2. Admin verification through an RPC (migration 171)
- `admin_review_verification(p_user_id, p_decision 'verified'|'rejected', p_reason)` SECURITY DEFINER, `is_admin()` only, audit log, notification to the user. Unique-index conflict comes back as a clear error the admin page shows (today it is swallowed).
- `admin/page.tsx` `updateStatus` → this RPC + show errors.

## 3. Claim flow (migration 171)
- Table `cr_claims`: id, cr, claimant_id (auth user, required — the claimant needs the account the CR would move to), claimant_name, claimant_contact, file_path (verification bucket), ai_check_id, holder_id (snapshot), holder_response text, status `open|approved|rejected|withdrawn`, admin_note, timestamps. RLS: claimant reads own; holder reads claims on his CR **without the claimant's contact**; admin all.
- `submit_cr_claim(p_cr, p_name, p_contact, p_file_path)`: authenticated, normalises CR, requires the CR to be held by someone else, one open claim per (cr, claimant), rate limit (3/day per user, 5/day per CR), file path must be under the caller's folder. Notifies the holder: «تقدّم شخص بطلب على سجلك التجاري رقم … باسم …، للتحقق» → link to respond; admin queue gets it.
- `respond_cr_claim(p_claim_id, p_text)`: holder only, once, stored for admin.
- `admin_resolve_cr_claim(p_claim_id, p_decision, p_note)`: admin only. Approve = in one transaction: clear CR + set holder `pending` (audit), set CR on claimant (`pending`), close claim, notify both. Admin then verifies the claimant normally. Nothing moves automatically.
- Old anon `report_cr_objection` stays for people without an account.

## 4. AI read of the uploaded CR (route, after owner $ OK)
- `POST /api/verification/extract` (getRouteUser; caller's own file or admin): downloads from `verification` bucket server-side, sends to **claude-haiku-5-5** with structured output: `cr_number, entity_name, expiry_date, activity, city, document_type, has_qr`. Prompt forbids reading/returning any national ID / iqama / owner ID number (PDPL); the schema has no such field.
- Table `cr_document_checks` (admin + owner read): profile_id, file_path, extracted jsonb, flags jsonb, model, input/output tokens, cost_usd, created_at.
- Flags computed server-side vs the profile: CR mismatch, name mismatch (`normalizeText` similarity), expired, not a CR document.
- Auto-fill: the supplier's settings/onboarding fills the CR number from the read; the supplier confirms (the number is still stored — dedupe + future Wathq batch check).
- **Cost:** a 1-page CR ≈ 2–3k input tokens (image/PDF page + prompt) + ~0.3–1k output → **≈ $0.001 per document** at $0.10/$0.50 per 1M. 1,000 documents ≈ **$1**. Proposed cap `AI_CAP_USD_VERIFY` = **$2/month** (sum of `cost_usd` this Riyadh month); over cap → no AI read, admin reviews manually, one admin notification. Owner approval needed before wiring (paid API rule).

## 5. Free official checks in the admin review card
- **QR**: for image uploads, decode the QR server-side (free JS library, e.g. jsQR) and show the link **only if** its host is on an allow-list of official MoC / Saudi Business Center domains; any other host → red warning «رمز QR يشير إلى موقع غير رسمي». PDFs: show "scan the QR on the document with your phone". Admin opens the official page himself — no scraping, no CAPTCHA bypass.
- **VAT number**: button that copies the number and opens ZATCA's public VAT-number check page (exact URL to confirm before building).
- Card: extracted fields next to typed fields, flags, QR result, buttons, verify/reject.

## 6. Clients (ar/en/ur, MSA) + mobile parity
- Web: settings verification block message + link, claim screen `/verification/claim?cr=…`, holder response screen (from the notification), admin queue tab "طلبات السجل".
- Mobile: same block message on Documents and the claim + respond screens (via REQUESTS_FOR_WEB.md).

## 7. Tests
- `supabase/tests/cr_uniqueness.sql` (rolled back): normalisation (Arabic digits, spaces), second account blocked (update, as admin, via admin RPC), rejected releases, delete releases, claim submit/respond/resolve, holder can't see claimant contact, rate limits. Add the key checks to `e2e_deal_flow.sql`.

## Order
170 (normalise + unique + delete release, after test-dupe fix) → 171 (admin RPC + claims) → admin card + QR/VAT buttons → AI read (after $ OK) → clients + mobile request.

## Note on file links
`getPublicUrl` on the private `licenses` bucket only builds the stored URL string; every display goes through `fileHref()` → `/api/file` (IDOR check, 300 s signed URL), so those links work (checked by the main session). Verification/claim files live in the private `verification` bucket and are opened by short-lived signed URLs (admin read policy), as the admin page already did.
