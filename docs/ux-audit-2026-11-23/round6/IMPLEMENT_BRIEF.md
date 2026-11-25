# UX audit implementation brief (web), 2026-11-23

The owner approved implementing the whole audit; the target is 10/10 for every persona.

Items (ROUND 6): `docs/ux-audit-2026-11-23/round6/items_web_or_both.json` (sixth audit after the round-5 fixes; ids restart at UX-001). Each item has `id`, `severity`, `persona`, `screen`, `where` (file:line), `problem_ar`, `fix_ar`, `effort`, `batch`. Line numbers may have drifted: find the code by content.

## How the work is split: by FILE OWNERSHIP

Each implementer owns a set of files and applies, for EVERY item (all batches, critical → low), the part of the fix that lives in its own files.
- Never edit a file you do not own. Other implementers are editing them at the same time.
- If a fix needs a change in a file you do not own (a shared `src/lib/*`, `src/types/index.ts`, a DB function, a migration, an edge function), do not make it. List it in your report under "needs from others", with the exact change.
- The mobile app (`C:\dev\taseerak-mobile`) is handled by another session. Ignore app-only parts.

## Already decided (do not change)
- A commercial registration held by another account BLOCKS seller sign-up (owner 2026-11-23); support handles ownership claims. Do not reintroduce a claim redirect at sign-up.
- Server items (migrations, the notify edge function, WhatsApp/email texts) are the lead's.
- Terms/privacy WORDING changes need the owner's approval and a TERMS_VERSION bump: do not change legal wording; list proposed text under needs.

## Rules that override any item text
- **Language:** all Arabic UI copy is Modern Standard Arabic (فصحى). Use «مشتري», never «مشترٍ». Always provide ar/en/ur strings (the `L(en, ur, ar)` pattern).
- **Brand:**
  - No emoji in the UI; use `<Glyph e="…"/>` (lucide), `SellerIcon` or `CatIcon`.
  - The main action is gold `#D4A543` with navy text `#071827`. Secondary solid buttons are navy. Green only for success, red only for errors and destructive actions. No purple or indigo.
- **Home buyer mode:** `buyer_type === 'individual'`, which is `storedBuyerType() === 'individual'` in `src/lib/buyerType.ts`, or `profile.buyer_type`.
  - No jargon: RFQ, مشروع/مشاريع, BOQ, أمر شراء, ترسية, شروط التوريد.
  - No unexplained unit abbreviations; use `getUnitLabelLong`.
  - Arabic product names go through `cleanArName` (`src/lib/displayName.ts`).
- **Business rules:**
  - No payments or revenue features.
  - Never show a pricing agent's source-shop phone to a buyer.
  - Contractor identity stays masked from suppliers until award.
- **Code:**
  - TypeScript strict; `node node_modules/typescript/bin/tsc --noEmit --skipLibCheck` must pass for YOUR files. Ignore errors in files you do not own; they belong to others mid-edit.
  - No `@ts-nocheck`.
  - Use `askConfirm()` (src/lib/askConfirm.tsx) instead of window.confirm.
  - Keep RTL: use start/end, not left/right.
  - Tap targets at least 44px on phones; key text at least 12px.
- **Git and the database:** do NOT run git commit/push. Do NOT apply migrations or deploy. The lead does that.
- **Editing:** files use CRLF line endings. Prefer the Edit tool; if you script edits, normalise line endings.

## Report (your final message)
1. Items done, as ids, each with one short line on what changed.
2. Items partly done or skipped, with the reason.
3. Needs from others: exact changes for files you do not own.
4. tsc status for your files.

## Owner decisions since round 4 (override item text)
- EVERY price shown to a buyer includes VAT (contractors too). Unregistered seller = «سعر نهائي». The purchase-order/deal statement shows VAT-inclusive line prices with a footer «منها ضريبة القيمة المضافة 15%: X» (the seller issues the tax invoice; our document is not the tax invoice).
- Budgets are typed incl. VAT and stored pre-VAT (src/lib/budget.ts budgetToStored/budgetShown).
- The guest (signed-out) request flow stays closed.
- Server pieces in this round (lead): offers.deal_closed_at/deal_closed_reason + admin_close_deal(p_offer_id, p_reason) (UX-003); profiles_public hides coordinates/district/national address of independent sellers (UX-002); sms_is_down() exists (migration 282).
- Tax-invoice handling for business buyers is PENDING the owner: do not change vat_invoice_required behaviour this round.
