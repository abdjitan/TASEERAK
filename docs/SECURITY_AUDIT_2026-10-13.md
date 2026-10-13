# Security audit — 2026-10-13 (web + DB + mobile)

> Handoff for the agent working on Taseerak. Read-only audit; **nothing has been fixed yet**.
> Sources: 4 parallel manual reviews (API routes, DB/RLS/RPCs, frontend/config, Expo app),
> `npm audit`, Semgrep (p/nextjs, p/react, p/typescript, p/secrets, p/owasp-top-ten,
> p/javascript, p/jwt → **0 findings** on web + mobile `src`).
> The Supabase MCP was down during the audit, so DB findings come from `supabase/migrations`
> (final effective definitions). Items marked **VERIFY LIVE** need the SQL check first.
>
> **Skills to use while fixing** (in `.claude/skills`): `fp-check` (confirm before fixing),
> `supabase-postgres-best-practices` + `supabase` (RLS/RPC changes), `variant-analysis`
> (after each fix, hunt the same pattern elsewhere), `differential-review` / `security-review`
> (review the fix diff), `verification-before-completion`. After DB fixes, add a check to
> `supabase/tests/e2e_deal_flow.sql` and run it (must stay `0 failed`).

## Priority 1 — High

> **Status (2026-10-13): H1–H5 fixed, H6 mitigated.**
> H1 web + H2 → commit fe30975 (migration 145). H1 mobile → `taseerak-mobile` supplier RFQ page
> (no raw-URL fallback). H3/H4/H5 → migration `146_security_high_fixes.sql` (applied live;
> e2e test extended to 35 checks, all passing). H6 → `images.unoptimized`, wildcard removed,
> `npm audit fix` (nanoid, source-map-js); **Next 15.5.27 upgrade still open** as its own task.

### H1. Stored link injection in RFQ notes → supplier opens attacker URL (web + mobile)
- Web `src/app/(dashboard)/supplier/dashboard/rfq/[id]/page.tsx:511-512, 1057-1058`:
  URL parsed from free-text `rfq.notes` (`[مواصفات مرفقة: …]`) goes raw into `<a href>`.
  `javascript:`/phishing URLs from a malicious contractor. Session cookies (@supabase/ssr) are JS-readable.
- Mobile `taseerak-mobile/src/app/supplier/rfq/[id].tsx:121,195`: fallback
  `WebBrowser.openBrowserAsync(specFile)` with raw string.
- Fix: web `href={fileHref(specFileUrl)}` (or `safeHttpUrl`); mobile drop the raw fallback
  (show "file unavailable"). Long-term: store spec file in a structured column / `items[].spec_file_url`,
  stop parsing notes (writer: `contractor/project/new/page.tsx:307`).

### H2. `rfqs` table SELECT bypasses `get_rfq_for_viewer` → delivery location + contractor_id leak
- Policy `124_company_team_members.sql:265`; no column-level revoke. Any in-scope supplier:
  `from('rfqs').select('contractor_id,delivery_location,delivery_geo')`.
- Fix: column-level grants (revoke select on rfqs, grant select on non-sensitive columns),
  sensitive columns only via SECURITY DEFINER RPC. Update `supplier/dashboard/page.tsx:122` (`select('*')`).

### H3. `delete_rfq` deletes accepted deals/awards/invoices
- `058_delete_rfq.sql:2` only checks ownership. Fix: raise if any accepted offer or award exists (or soft-cancel).

### H4. Market-price RPCs leak competitors' live pending bids
- `get_market_prices` (`044:56`), `get_market_price_trend` (`061:55`) aggregate non-rejected offers,
  `having count(*) >= 1`. Fix: only accepted/snapshot prices, min 3 samples (like `get_public_price_index`).

### H5. Award → read phone → unaward loop reveals every bidder's contact
- `award_rfq_item` (`100:237`), `unaward_rfq_item` (`047:84`), `shares_deal_with` (`107:23`), `send_message` (`128:6`).
- Fix: contact unlock/messaging only on `offers.status='accepted'`; block award/unaward when
  `rfqs.status <> 'open'` or any offer is accepted.

### H6. Next.js 14.2.35 — critical/high advisories, no patched 14.x
- Immediate (no upgrade): `next.config.js` → `images: { unoptimized: true }`, remove the
  `*.supabase.co` `remotePatterns` wildcard (app never imports `next/image`).
- Planned task: upgrade to `next@15.5.27` (React 19, async params/cookies). Separate branch + full build.
- `npm audit fix` (non-force) for nanoid / source-map-js; `npm update postcss`.

## Priority 2 — Medium

> **Status (2026-10-13): M1–M12 fixed.** M1–M6 → migration `147_security_medium_fixes.sql`
> (applied live; e2e 41/41) + request-edit flows (web + mobile) now delete offers before
> changing materials. M5: no legacy 001 policies were live; "Insert own profile" dropped.
> M7, M9, M10 → main agent (account/delete, explain-items, AI input caps + `overGlobalDailyLimit`).
> M8 → `/api/verify-cr` signed-in only + per-user and global daily caps, national-ID owner
> check removed (lives in verify-identity). M11 → CSP `script-src` (self + Turnstile), no
> X-Powered-By. M12 → mobile signOut falls back to local scope + clears the cache.

- **M1. Contractor can UPDATE any `rfqs` column** (`009_rls_lockdown.sql:123`): swap item names after pricing,
  move `expires_at` (unfreezes supplier prices), reopen closed. Fix: BEFORE UPDATE trigger freezing
  items/quantity/product_name/expires_at once `offer_count > 0`; status only via RPC.
- **M2. `submit_price_reduction`** (`100:494`): no check that a reduction was requested or that price decreases;
  doesn't update `item_prices`. Fix: require open request + `p_new_total < total_price`, recompute items.
- **M3. `profiles_public` readable by anon** exposes individual sellers' lat/lng + national short address (PDPL)
  (`100:581`, `121:14`). Fix: hide for individual/broker/price_agent or round; revoke anon if unused.
- **M4. `get_or_create_conversation`** (`056:51`) no eligibility check. Fix: require supplier offered on the RFQ / contractor owns it with an offer from that supplier.
- **M5. VERIFY LIVE — legacy policies from `001_initial_schema.sql:229-266` never dropped**
  ("Suppliers manage own offers" FOR ALL, etc.) and **profile INSERT has no lock trigger**
  (self-insert `role='admin'` if a user has no profile row). Check:
  `select tablename,policyname,cmd,roles,qual,with_check from pg_policies where schemaname in ('public','storage') order by 1,2;`
  `select u.id from auth.users u left join profiles p on p.id=u.id where p.id is null;`
  Fix: drop legacy policies; BEFORE INSERT trigger forcing role∈(contractor,supplier) + reset privileged columns.
- **M6. VERIFY LIVE — rate-limit IP spoofable** (`036_rate_limiting.sql:23` takes first `x-forwarded-for`)
  → unlimited `phone_exists`/`email_exists`/`cr_exists` enumeration. Use right-most / `cf-connecting-ip`.
- **M7. Account deletion leaves CR/license files** in `verification` bucket (`api/account/delete/route.ts:22-24`). PDPL. Remove `verification/<uid>/*` too.
- **M8. Anonymous `/api/verify-cr`** (`route.ts:117-123,159-207`): per-IP 10/hr only, 2 paid Wathq calls each, no Turnstile. Add Turnstile for anon, global daily cap, cache by CR, return minimal fields to anon.
- **M9. Shared AI-note poisoning** (`api/explain-items/route.ts:58-79`): one line's buyer text can control the globally cached note of another line. Cache only single-line / no-spec calls; strip phones/URLs.
- **M10. AI routes without input caps** (`assist-rfq:18-29`, `match-material:25,40`, `match-spec:104-108`): slice inputs, add global daily caps, prefer free models.
- **M11. CSP has no `script-src`** (`next.config.js:8`). Interim `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`; later nonces.
- **M12. Mobile sign-out offline may keep session** (`taseerak-mobile/src/lib/auth.tsx:76-79`): on error call `signOut({scope:'local'})` + `clearQueryCache()`.

## Priority 3 — Low

> **Status (2026-10-13): fixed, except two accepted risks.** DB → migration
> `148_security_low_fixes.sql` (applied live; e2e 44/44): CR squatting blocked against verified
> CRs, accepted-offer terms frozen (po_number, accepted_at, delivery days, notes, attachment,
> source…), CHECKs for negative/zero prices, notifications INSERT removed, synonym auto-approval
> needs 5 accounts ≥ 7 days old, `report_cr_objection` capped, Arabic-Indic/Persian digits masked,
> `delete_my_account` releases team members. Web: rate limits fail closed (`overHourlyLimit` +
> every inline check), generic 500 messages (parse-boq, match-spec), `getRouteUser` in
> verify-identity + discover-suppliers/*, HMAC-signed `tsk_role` cookie (key: `ROLE_COOKIE_SECRET`
> or the service-role key), drafts (localStorage + IndexedDB) cleared at every sign-out.
> verify-cr national-ID check removed in M8. Mobile: `android.allowBackup:false`, Captcha
> WebView top-frame navigation restricted; edit-RFQ writes checked (M1).
> **Accepted:** `register_device_token` token move (normal phone hand-over; tokens are private);
> `decode-uri-component` via expo-router 57 (moderate, on-device deep-link DoS) → fixed by the
> Expo SDK 58 upgrade (expo-router ≥ 58.0.18); forcing 0.5.0 (ESM) would break query-string 7.
> Not changed: phone/contact_phone stay editable (claiming discovered suppliers already requires
> a confirmed auth phone); total_price vs sum of items (VAT/extra charges make it non-trivial).
- `verify-cr` lets any signed-in user test nationalId↔CR ownership and echoes the ID (`route.ts:128,197,218`) — only for caller's own CR.
- Rate limiter fails open when RPC errors (`src/lib/rateLimit.ts:4-5` + inline checks) — treat error as 429 on expensive routes.
- Middleware trusts unsigned `tsk_role` cookie + `getSession()` (`src/middleware.ts:96-120`) — UI-only; RLS still holds. HMAC-sign or accept.
- Local RFQ drafts (`src/lib/localDraft.ts`) not cleared on sign-out.
- Profile lock trigger (`124:73`) doesn't lock phone/contact_phone/commercial_registration while unverified (CR squatting).
- `lock_offer_deal_columns` allows edits of po_number/accepted_at/notes after acceptance; no CHECK constraints for negative/zero prices; `total_price` not checked vs items.
- Users can self-insert notifications that fan out to team + email/push (`100:393`) — revoke INSERT.
- `log_search_event`/`refresh_learned_synonyms` (`142`) — 3 throwaway accounts can auto-approve any synonym.
- `report_cr_objection` callable by anon without rate limit; `register_device_token` steals a known token; `mask_contact_digits` may miss Arabic-Indic digits ٠-٩; `delete_my_account` leaves members' `employer_id`.
- Raw error text returned (`parse-boq/route.ts:374`, `match-spec/route.ts:175`).
- `verify-identity`, `match-material`, `discover-suppliers/*` use `createServerSupabaseClient()+getUser()` instead of `getRouteUser()`.
- Mobile: `android.allowBackup` default true + plain AsyncStorage query cache → set `allowBackup:false`;
  Captcha WebView `originWhitelist=['*']` + unchecked `onMessage`; upgrade `expo-router` ≥ 58.0.18 (decode-uri-component); edit-RFQ writes unchecked (`rfq/[id]/index.tsx:120-122`).

## Live checks to run when the Supabase MCP is back
```sql
-- tables without RLS
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
-- SECURITY DEFINER functions executable by anon
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute');
-- bucket visibility
select id, public from storage.buckets;
```
Also run Supabase `get_advisors` (security + performance).

## Verified clean (no action)
File proxy `/api/file` (party check + signed URLs), upload routes (signature checks, no SVG),
SSRF guard in admin email scraper, reverse-geocode, open-redirect guards (login, notifications),
team invite tokens (144-bit, single-use, expiring), `acting_uid()` requires active member,
deal-state RPCs (delivery/receipt/payment/dispute), offer ranking (own offer only),
private storage buckets, realtime limited to messages/conversations, no secrets in git or `NEXT_PUBLIC_*`,
mobile token in SecureStore-encrypted storage, deep-link allow-list, no cleartext traffic.
