# تسعيرك (Taseerak) — Complete Project Dossier
### A B2B construction-procurement marketplace for Saudi Arabia

> **Purpose of this file:** a single, self-contained brief you can hand to *any* AI
> (or human reviewer) so it understands the entire product — the idea, the
> architecture, the database, the AI layer, the design system, every feature, and
> the open questions — without reading the repo. Code excerpts are representative,
> not exhaustive (full source: `github.com/abdjitan/TASEERAK`, root = `buildora/`).
>
> **كيف تستخدمه:** انسخ هذا الملف كامل والصقه عند أي ذكاء اصطناعي ثاني واطلب منه
> مراجعة المنتج/المعمارية/الأمان/تجربة المستخدم. آخر قسم فيه أسئلة جاهزة توجّه المراجعة.

---

## 0) نبذة بالعربي (Arabic summary)

**تسعيرك** سوق إلكتروني (B2B) لتوريد مواد البناء في السعودية يربط **المقاولين** بـ**الموردين**:
- المقاول ينشئ **طلب تسعير (RFQ)** — إمّا مادة واحدة، أو **مشروع كامل** برفع جدول كميات (BOQ) Excel يُحلَّل تلقائياً بالذكاء الاصطناعي ويُصنَّف كل بند للمورد المتخصص.
- كل مورد يرى **فقط المواد ضمن تخصّصه**، ويسعّر **بند-بند** (سعر/مدة توصيل/مواصفات/كتالوج لكل مادة)، ويقدر يسعّر بعض البنود فقط.
- المقاول **يقارن**، و**يرسّي كل بند على المورد الأنسب** (الأرخص/الأسرع/الأقرب) — الطلب الواحد ينقسم على عدة موردين (BOQ-style sourcing) — ثم يولّد **أمر شراء + فاتورة ضريبية ZATCA**.
- عربي أولاً (RTL) مع إنجليزي وأردو، وذكاء اصطناعي مدمج (قراءة BOQ، مطابقة مواصفات، مقارنة عروض، مساعد محادثة).

---

## 1) The idea & the problem

**Problem.** In Saudi construction, sourcing materials is fragmented and manual:
contractors phone/WhatsApp dozens of suppliers per project, re-key the same BOQ to
each, chase quotes over days, and have no price transparency or audit trail.
Suppliers receive irrelevant requests outside their specialty.

**Solution.** A structured marketplace where:
1. A request is **decomposed by material** and routed **only to the right specialist**
   (a rebar supplier never sees a paint line).
2. Pricing is **itemized and comparable** (per-unit, per-item delivery, VAT-aware).
3. The contractor **awards each line independently** to the best supplier, then the
   system generates the purchase order and a **ZATCA Phase-1 tax invoice** (with QR).
4. **AI removes the data-entry tax**: it reads the BOQ Excel, reads the project
   specification document, classifies every line, and drafts specs/comparisons.

**Why it can win:** the routing precision (taxonomy engine) + the BOQ/spec AI ingestion
turn a multi-day phone exercise into a few clicks, while giving both sides a clean
record (orders, invoices, ratings, price history).

---

## 2) Users & core flows

**Roles:** `contractor`, `supplier`, `admin` (owner/ops).

**Contractor signup is intentionally light** — no CR/VAT/verification required (lowers
friction; contractors are buyers, not sellers). **Suppliers** go through CR verification
(Wathq) and declare sectors + specialties.

### Flow A — Single-material RFQ
Contractor picks a material from the catalog (accordion picker, auto-filled unit) → sets
quantity, region, delivery, deadline, target supplier tier → publishes. Matching suppliers
get a notification → each prices it → contractor compares → accepts → PO + invoice.

### Flow B — Project RFQ from a BOQ (the flagship)
1. Upload an Excel **BOQ**. `/api/parse-boq` extracts every line (description, qty, unit),
   then an **AI pass** cleans names, picks the **sector + sub-category from the official
   lists**, and flags anything it can't classify (`needs_classification`).
2. (Optional) Upload the **project specification document** (PDF/Excel/image). `/api/match-spec`
   reads it together with the BOQ and **resolves item codes** (e.g. a door `DRS-701`) to
   their section in the spec, filling each item's full technical details.
3. Contractor reviews/edits items (each must carry a category from the lists), sets project-
   wide targeting, and sends. **One `rfqs` row per material**, all linked to a `project_rfqs`
   parent. Each material fans out to its specialist suppliers.

### Flow C — Supplier pricing
A supplier opens an RFQ and sees **only the materials in their specialty**. Click-to-price
accordion: per material → total price (or unit price × qty), own unit override, **per-item
delivery days**, free-text spec, per-item catalog upload. **Partial pricing allowed** (price
some, skip others). Competitive ranking shown anonymously. 15-minute window to cancel/re-price.
**Contractor identity is hidden** ("مقاول · city") until the deal is accepted.

### Flow D — Award & fulfilment
Contractor sees a **per-item award matrix**: for each material, the bids sorted
**cheapest / fastest / nearest** (haversine distance to the delivery point), a 🥇 on the
top bid, each bid expandable (unit price, delivery, city, distance, sent spec, catalog,
"details →"). Contractor awards each line → `finalize_rfq_awards` creates **per-supplier
purchase orders**. Order page renders an itemized PO + a **ZATCA-compliant tax invoice**
(TLV base64 QR). Both sides can mark delivered/received/paid; disputes supported.

---

## 3) Tech stack & architecture

| Layer | Choice |
|---|---|
| Framework | **Next.js 14** (App Router), TypeScript (`// @ts-nocheck` on pages) |
| Styling | **Tailwind CSS**, Cairo font, **RTL-first** |
| Backend | **Supabase**: Postgres + Auth + Row-Level Security + Realtime + Storage |
| Hosting | **Vercel** (push to `main` → auto-deploy) |
| i18n | `useTranslation()` → `locale ∈ {ar,en,ur}`, `dir` (ar/ur = rtl) |
| AI | Multi-provider: **Anthropic (Claude), Google (Gemini), Groq (Llama)** — see §7 |
| External | **Wathq** (CR verification), reverse-geocoding, ZATCA QR |

**Architecture principles**
- **Server is the source of truth.** Cross-user mutations go through Postgres
  `SECURITY DEFINER` RPCs that re-check `auth.uid()` and recompute money from stored
  data (never trust the client). RLS is ON for every table.
- **Realtime notifications** use a per-user filtered subscription (`notifications` table,
  filtered by `user_id`) — a DB trigger fans out, each client subscribes to its own rows.
- **AI is provider-agnostic and always optional** — every AI helper returns `null` on
  failure and the caller falls back to a deterministic path. The app never breaks if AI is off.
- **Navigation is client-side** (`next/link` + `router.push`) so moving between pages
  doesn't reload the bundle; auth redirects intentionally stay as full reloads.

---

## 4) Design system

**Brand palette**
- Navy `#1B2D5B` (primary), Orange `#F5831F` (accent/CTA), Green `#0F6E56` (success/money).
- Neutrals on `#f4f6f9` canvas; rounded-2xl cards, soft shadows, frosted topbar, 272px
  navy-gradient sidebar with off-canvas drawer on mobile.

**Icon system — `AppIcon.jsx`** (zero-dependency inline SVG, Tabler-style). A `PALETTE` maps
tones (brand/success/warning/info/danger/neutral) to {soft, solid, strong} colors; `AppIcon`
renders a glyph in three variants (`tone` chip, `solid`, `line`). A separate `CatIcon` renders
the designer's category SVGs (per sector/group) with a built-in fallback.

**Dashboards are "live"** — greeting + CTA, account-completion widget, stat cards with deltas,
activity feed (from notifications), **market pulse** (avg/min/max per material + ▲▼ trend vs
last month), countdown bars on deadlines, smart zero-states, and an **action center**
("N requests got offers — compare now").

**Reusable shell:** `AppShell` (sidebar + topbar + unread-messages badge + AI assistant
widget + notification bell). `PageLoader` (branded navy spinner, hidden for the first 350 ms
so fast loads never flash it).

---

## 5) Database schema (Postgres / Supabase)

**26 base tables**, RLS ON everywhere, mutated via **~40 SECURITY DEFINER RPCs**,
evolved over **62 SQL migrations (`001`–`061`)**.

### Core tables
| Table | Purpose (key columns) |
|---|---|
| `profiles` (46 cols) | users: role, company_name_ar/en, CR/VAT, verification_status, supplier_tier, lat/long, rating_avg |
| `profile_sectors`, `profile_specialties` | a supplier's sectors + sub-category specialties (drive routing) |
| `branches` | multi-branch suppliers (per-region presence) |
| `rfqs` (29 cols) | a request: sector, sub_category, product_name, quantity, unit, **items jsonb** (multi-item), expires_at, delivery_geo, target_tiers, verified_only, nearby_only, hide_identity, ref_no |
| `offers` (33 cols) | a supplier bid: total_price, **item_prices jsonb** (per-material), vat_included, delivery_days, status, reduction_deadline, info_request/response, dispute_* |
| `rfq_item_awards` | per-material award: rfq_id, item_index, item_key, offer_id, supplier_id, unit_price, total |
| `project_rfqs`, `project_rfq_items` | BOQ project parent + its line→rfq links |
| `materials`, `products` | admin-approved dynamic catalog merged into the hardcoded taxonomy |
| `material_requests` | "please add this material to the catalog" → admin approves with edits |
| `market_price_snapshots` | durable winning-price log (filled by a trigger on award) for price history |
| `conversations`, `messages` | in-app messaging (RPCs `get_or_create_conversation`, `send_message`) |
| `notifications` | per-user realtime feed (enum type, jsonb data) |
| `reviews`, `cr_objections`, `audit_logs`, `rate_limits`, `system_errors_log`, `rfq_dismissals`, `live_prices`, `support_messages`, `license_reviews`, `profile_change_requests` | ratings, fraud reports, audit, throttling, error log, supplier-side dismissals, public price board, support, governance |

### Representative RPCs
- `award_rfq_item(rfq_id, item_index, offer_id)` — award one material; **recomputes the price
  from the offer's own `item_prices`** (never trusts the client); contractor-only.
- `finalize_rfq_awards(rfq_id)` — turn awards into per-supplier purchase orders.
- `accept_offer(offer_id)` — atomic accept + reject-others + close (prevents double-accept).
- `cancel_my_offer(offer_id)` — supplier cancels/re-prices own *pending* offer within **15 min**,
  blocked once any line is awarded.
- `extend_rfq_deadline(rfq_id, new_expires)` — contractor pushes a deadline out (never shortens),
  notifies suppliers who already priced.
- `get_rfq_offer_ranking`, `get_supplier_stats`, `get_market_prices`, `get_market_price_trend`,
  `submit_price_reduction`, `request_price_reduction`, `request_offer_info`,
  `respond_offer_info`, `report_cr_objection`, plus `*_exists` pre-checks (email/phone/cr).

> **Security note for reviewers:** all of the above are `SECURITY DEFINER` with
> `set search_path = public` and explicit `auth.uid()` ownership checks; EXECUTE is revoked
> from `public/anon` and granted to `authenticated`. RLS policies are the second line of defense.

---

## 6) The taxonomy engine — `src/types/index.ts` (the heart of routing)

Everything about *who receives what* depends on this. Six sectors: `civil, architectural,
electrical, mechanical, equipment, supply_store`.

- `SECTOR_PRODUCTS: Record<Sector, string[]>` — products per sector.
- `SUB_CATEGORIES: Record<Sector, Record<key, {ar,en,ur,icon,group,keywords[]}>>` — the
  **specialties**; a supplier subscribes to sub-category keys, and an RFQ line carries one.
- `detectSubCategory(name, sector)` — keyword match (highest score wins) after
  `normalizeText` (folds hamza/alef/ة-ه/ى-ي/tatweel/diacritics/Urdu chars). Returns `null`
  if nothing matches. **Arabic substring traps are handled** (e.g. `طوب` "brick" ⊂ `طوبار`
  "formwork"; singular ≠ plural) by adding higher-scoring keywords.
- `GROUP_LABELS` / `GROUP_ORDER` / `sortGroupKeys` — visual grouping & logical ordering.
- `getGroupedProducts` / `getGroupedSubCategories` — bucket for the pickers; unmatched → `_other`
  (kept near zero by design).
- Units: `SUB_UNITS` + `getDefaultUnit` (auto-fills the order unit on material select);
  `UNIT_OPTIONS` dropdown. `PRODUCT_SPECS` — optional per-product spec fields.

```ts
export function detectSubCategory(productName: string, sector: Sector): string | null {
  const norm = normalizeText(productName)
  const subs = SUB_CATEGORIES[sector]; if (!subs) return null
  let best: string | null = null, max = 0
  for (const [key, sub] of Object.entries(subs)) {
    let score = 0
    for (const kw of sub.keywords) if (normalizeText(kw) && norm.includes(normalizeText(kw))) score++
    if (score > max) { max = score; best = key }
  }
  return best   // null ⇒ unclassified ⇒ flagged for the contractor to pick from the list
}
```

**Supplier-side filter (why routing matters):**
```ts
const filtered = rfqItems.filter(it => {
  if (mySectors.length && !mySectors.includes(it.sector)) return false
  if (mySpecialties.length && it.sub_category && !mySpecialties.includes(it.sub_category)) return false
  if (it.supplier_tiers?.length && !it.supplier_tiers.includes(myTier)) return false
  return true
})
```
> Consequence: if a BOQ line has **no** `sub_category`, it bypasses the specialty filter and
> reaches *every* supplier in the sector (imprecise). That's exactly why the BOQ pipeline now
> forces classification (see §8 "BOQ classification").

---

## 7) The AI layer — `src/lib/ai.ts` (multi-provider, free-tier friendly)

A thin, provider-agnostic helper. Provider chosen by `AI_PROVIDER` env or auto-detected from
whichever key exists. **Default model `claude-opus-4-8`.** Gemini and Groq are REST (no SDK);
Anthropic uses the SDK. Every call returns structured JSON or `null` (graceful fallback).

```ts
export function aiProvider(): 'anthropic'|'gemini'|'groq'|null { /* AI_PROVIDER or first key */ }
export async function aiJson<T>(opts): Promise<T|null>   // structured output, schema-guided
export async function aiText(system, messages): Promise<string|null>  // chat (the assistant)
```
- **Anthropic**: `@anthropic-ai/sdk`, structured outputs.
- **Gemini**: REST `:generateContent`, tries a model fallback list, `responseMimeType:json`,
  and **supports inline PDF/image documents** (used by spec matching).
- **Groq**: OpenAI-compatible REST, `llama-3.3-70b-versatile`, `response_format:json_object`
  (free + fast; the owner's current default).

**AI features (every one degrades gracefully):**
| Route / component | What it does |
|---|---|
| `/api/parse-boq` | Excel BOQ → line items; AI cleans names + **picks sector & sub-category from the official lists**; flags unclassifiable lines. |
| `/api/match-spec` | Reads the **spec document + BOQ together**; resolves item codes (e.g. `DRS-701`) to their spec section and fills full technical details. PDF/image via Gemini; Excel/text via any provider. |
| `/api/match-material` | "Suggest the catalog classification" for a free-text material (admin + RFQ). |
| `/api/compare-offers` | AI comparison/recommendation across a request's offers. |
| `/api/assist-rfq` | Drafts an RFQ / writes specs from a plain-language description. |
| `/api/assistant` + `AiAssistant.tsx` | Floating in-app chat assistant. |
| `/api/classify-supplier` + `/api/verify-cr` | Reads the Wathq commercial-activity text and **auto-detects the supplier's specialties** (editable). |
| `src/lib/classify.ts` | `detectSpecialtiesFromText` — keyword+sector classifier used at signup. |

---

## 8) Feature inventory (what's actually built)

**Contractor**
- Single-material RFQ (accordion catalog picker, auto unit, deadline, tier targeting, verified/nearby filters).
- **Project RFQ from BOQ** (Excel parse + AI classification + spec cross-reference).
- **Per-item award matrix** with cheapest/fastest/nearest sort, 🥇 best badge, per-bid detail,
  distance (haversine), "request price reduction" / "request more info" actions.
- Generate **purchase order + ZATCA tax invoice** (itemized, VAT-aware, QR).
- Edit RFQ (name/qty/unit/spec/notes — invalidates stale offers), **extend deadline** (+1/+3/+7d, instant),
  delete RFQ, cancel RFQ.
- Live dashboard: greeting, completion widget, stat deltas, activity feed, market pulse + trend, countdown bars, dates on cards.

**Supplier**
- Sees **only own-specialty materials**; **click-to-price accordion**, per-item delivery, per-item
  catalog, **partial pricing**, VAT toggle, competitive ranking.
- **15-min cancel/re-price** window; **contractor identity hidden** until accepted.
- Supplier Score ring + "boost your score" chips; AppIcon dashboard; specialties auto-detected from CR (editable).
- Respond to price-reduction / info requests.

**BOQ classification (the recent correctness fix):** the AI maps every line to a sub-category
**from the official lists**; the server validates the key (falls back to keyword detection);
unclassifiable lines are flagged `needs_classification` with a red warning + a required category
dropdown; submitting with unclassified lines asks for confirmation (explaining they'd reach all
sector suppliers, not the specialist).

**Admin/owner:** review queue, material-request approval with edits, supplier discovery, analytics,
internal admin↔user messaging, CR-objection handling.

**Platform:** internal messaging (realtime), per-user notifications, ratings/reviews, multi-branch,
multi-region targeting, file-upload safety (magic-byte server check), rate limiting, audit logs,
**market price history** (trigger-fed snapshots + 30-day trend), PDPL-compliant (no National ID).

---

## 9) File / route map

**App routes (`src/app`)**
- `(auth)`: `login`, `register` (3-step, light contractor signup), `forgot-password`, `reset-password`.
- `(dashboard)/contractor`: `page` (dashboard), `rfq/new`, `rfq/[id]` (award matrix), `rfq/[id]/offer/[offerId]`,
  `orders/[id]` (PO + ZATCA invoice), `project/new` (BOQ + spec), `project/[id]`.
- `(dashboard)/supplier`: `dashboard`, `dashboard/rfq/[id]` (pricing), `specialties`, `prices`, `branches`.
- `(dashboard)`: `admin`, `admin/users/[id]`, `admin/discover`, `messages`, `settings`, `market`, `location`.
- **16 API routes** (`src/app/api/*`): the AI routes above + `rfq`, `offers`, `subcontractors`,
  `upload-attachment` (server-side malware/magic-byte check), `verify-cr`, `verify-identity`,
  `reverse-geocode`, `discover-suppliers(+/email)`.

**Key libs:** `lib/ai.ts`, `lib/classify.ts`, `lib/normalize.ts`, `lib/deadline.ts` (countdowns),
`lib/rfqName.ts` (pro RFQ naming `RFQ-#### | package`), `lib/nav.ts`, `lib/fileSafety.ts`,
`lib/supabase/{client,server}.ts`.

**Components:** `AppShell`, `AppIcon`, `CatIcon`, `NotificationBell`, `AiAssistant`, `PageLoader`,
`LanguageSwitcher`, `LocationPicker`, `DistrictField`, `VerifiedBadge`, `Turnstile`, `Logo`.

---

## 10) Security & compliance

- **PDPL (Saudi data-protection):** the app does **not** collect or store National ID. Identity
  trust comes from **Wathq** (CR) + Nafath, not ID images.
- **Authorization:** RLS ON for all tables; cross-user writes only via `SECURITY DEFINER` RPCs
  with `auth.uid()` checks and `search_path=public`; EXECUTE revoked from `anon`. Money is always
  recomputed server-side from stored offer data.
- **Uploads:** server-side magic-byte + size/type validation (not just client hints).
- **Secrets** only in `.env.local` / Vercel env vars — never in git. Supabase publishable key + RLS
  on the client; service operations server-side.
- **Abuse:** `rate_limits` table + RPC throttling; audit logs; optional Turnstile/CAPTCHA toggle.

**Open security advisories (known, mostly by-design):** Supabase linter flags the `SECURITY
DEFINER` RPCs as "executable by authenticated" (intended — they self-authorize), one
`SECURITY DEFINER` view (`profiles_public`), leaked-password protection + MFA not yet enabled,
and `market_price_snapshots` has RLS-on-no-policy (intentional: read only via a definer RPC).

---

## 11) Selected code excerpts

**AI provider dispatch (`lib/ai.ts`):**
```ts
export function aiProvider() {
  const p = (process.env.AI_PROVIDER||'').toLowerCase()
  if (p==='gemini') return geminiKey() ? 'gemini' : null
  if (p==='anthropic') return anthropicKey() ? 'anthropic' : null
  if (p==='groq') return groqKey() ? 'groq' : null
  if (anthropicKey()) return 'anthropic'
  if (geminiKey())   return 'gemini'
  if (groqKey())     return 'groq'
  return null
}
```

**BOQ → official category (server validates the AI's choice; `parse-boq`):**
```ts
const sub = validSub(sector, aiResult.sub_category) ? aiResult.sub_category : null
// fallback to keyword detection, else flag for the contractor
item.sub_category = sub ?? (validSub(sector, detectSubCategory(name+' '+spec, sector)) ? guess : null)
item.needs_classification = !item.sub_category
```

**Award matrix — per-bid sort (`contractor/rfq/[id]`):**
```ts
bids.sort((a,b) => {
  if (awardSort==='fastest') { const d = aDays-bDays; if (d) return d }
  else if (awardSort==='nearest') {
    const d = (dist(a, refGeo) ?? 9e9) - (dist(b, refGeo) ?? 9e9); if (d) return d  // haversine
  }
  return (a.total||0) - (b.total||0)   // default: cheapest
})
```

**ZATCA Phase-1 QR (order page):** base64 of TLV (seller name, VAT no., timestamp, total, VAT) → `qrcode`.

---

## 12) Known limitations & roadmap

- **Spec PDF reading needs a document-capable provider.** Excel/text specs work with any
  provider; PDF/image specs require a Gemini (or Claude) key — Groq can't read documents.
- **"Nearest" award** needs supplier coordinates + a delivery geo-point; falls back to city.
- **Price history/trend** is thin until enough offers/awards accumulate (data-dependent).
- **Registration redesign** (phone + WhatsApp OTP) is blocked on a WhatsApp Business API token.
- **Launch hardening** pending: Wathq production key, leaked-password protection, admin 2FA, PITR.
- Contractor-identity privacy is enforced at the display layer; a server-side guard is still TODO.
- The taxonomy is hand-curated; a feedback loop (mis-routes → keyword updates) isn't automated yet.

---

## 13) Questions to ask the reviewing AI (paste these after the dossier)

1. **Routing correctness:** is forcing every BOQ line to an official `sub_category` (with a
   "needs classification" fallback) the right call, or should unclassified lines route to a
   sector-level pool / a human triage queue? How would you design the fallback?
2. **Marketplace design:** are per-item awards + partial pricing + hidden contractor identity the
   right incentives? What failure modes (gaming, race conditions, collusion) should I guard against?
3. **AI ingestion:** how robust is the BOQ+spec cross-reference approach? What would make code
   resolution (`DRS-701` → spec section) more reliable across messy real-world documents?
4. **Security:** review the `SECURITY DEFINER` + RLS model and the ZATCA invoice flow — any holes?
5. **Trust & growth:** what would most increase supplier liquidity and contractor trust at launch
   in the Saudi market specifically?
6. **Tech debt:** given Next.js 14 + Supabase + a hand-curated taxonomy, where will this
   architecture break first as volume grows, and what should I refactor early?

---

*Generated as a living snapshot of the Taseerak codebase. Stack: Next.js 14 · Supabase ·
Vercel · multi-provider AI. Arabic-first, RTL, PDPL-aware.*
