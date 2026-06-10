# Handoff: Taseerak (تسعيرك) — Construction Procurement & Quoting Platform

## Overview
Taseerak is a B2B procurement/quoting marketplace for the Saudi construction market.
A contractor sends **one RFQ** (or uploads a full BOQ); it auto-routes to every verified,
specialized supplier; suppliers compete on price; the contractor compares offers and issues
a purchase order. Key differentiators: **pure quoting (not a store), smart routing by
sector + contractor grade, trilingual (AR / EN / UR), and BOQ auto-extraction**.

This bundle contains the full hi-fi design as **31 linked HTML pages** plus shared CSS/JS,
covering three roles — **Contractor, Supplier, and Admin** — in Arabic / English / Urdu.

---

## About the Design Files
The files in this bundle are **design references created in HTML** — working prototypes that
show the intended look, layout, copy, and behavior. They are **not** production code to drop
in as-is.

Your task in Claude Code is to **recreate these designs inside your project's existing
environment** (React/Next, Vue, etc.) using its established component patterns, routing, state,
and styling system. If the project has no front-end yet, pick the most appropriate framework and
implement the designs there. Treat the HTML/CSS as the source of truth for **visual spec and
interaction**, and re-express it idiomatically in your stack.

> The prototypes are fully interactive (language switch, BOQ extraction, offer selection,
> live competitive ranking, Tweaks panel) so you can click through the exact intended UX before
> rebuilding.

---

## Admin Section (8 pages — shared injected sidebar)
All admin pages set `<body data-admin-page="…">` and contain `<aside id="admin-side" class="sidebar"></aside>`;
`assets/admin-shell.js` injects the shared admin sidebar (8 nav items), marks the active one,
and wires the mobile drawer + language pills. Build this as one admin layout/route group with a
shared `<AdminSidebar>` in your stack.

- **Admin Overview** (`Admin Overview.html`) — KPI cards, RFQs bar chart (7 months), sector-distribution
  donut, recent-activity feed, action queue, top users. Charts use static inline sizes + CSS keyframes
  (prototype-renderer workaround — use a real chart lib in production).
- **Admin Users** (`Admin Users.html`) — full users table with role tabs (all/contractor/supplier),
  verified/pending chip filters, live search → row → **Admin User Detail**.
- **Admin User Detail** (`Admin User Detail.html`) — full profile: official Wathq data, KPIs, specialties,
  recent offers, documents (secure links), verification status, admin actions (re-check / re-tier / ban).
- **Admin RFQs** (`Admin RFQs.html`) — all RFQs with status tabs + offer counts.
- **Admin Orders** (`Admin Orders.html`) — purchase orders & transactions ledger (platform is record-only,
  not a payment processor — stated on the page).
- **Admin Materials** (`Admin Materials.html`) — material catalog by sector + approve/reject suggested materials.
- **Admin Disputes** (`Admin Disputes.html`) — dispute cards (PO, parties, reason, severity) + mediation /
  resolve modal. Leads with the “information-intermediary, not liable” disclaimer.
- **Admin Audit** (`Admin Audit.html`) — filterable timeline of every platform event.
- **Admin Panel** (`Admin Panel.html`) — **Verifications** queue (re-slotted into the admin section):
  rich review cards with official Wathq data + **AI classification badge** (match / mismatch / manual-review)
  + verify / reject-with-reason modal.

## Internationalization (AR / EN / UR) — `assets/i18n-auto.js`
App + admin pages load `assets/i18n-auto.js`, a string-keyed dictionary that translates any element
whose Arabic text matches a key (sidebar items, topbar titles, table headers, tabs, buttons, etc.),
flips `<html dir>` (`rtl` for ar/ur, `ltr` for en), and persists the choice. The `.mini-lang` switcher
exposes **ع / EN / اردو** on every app + admin + legal page.
> In production, replace the auto-match approach with proper i18n keys (e.g. `t('admin.users')`) and
> message catalogs per locale. The dictionary in `i18n-auto.js` is a ready-made AR→EN/UR string list to seed them.
> Legal pages (Terms/Privacy) only flip direction; their long legal copy needs professional human translation per locale.

---

## Fidelity
**High-fidelity (hifi).** Final colors, typography (Cairo), spacing, radii, shadows, brand logo,
and interactions are all specified. Recreate pixel-closely using your codebase's UI primitives.

---

## ⚠️ Critical implementation note (why some values are static, not animated)
The preview engine these mocks were built in **silently ignores JavaScript changes to any CSS
property that has a `transition` defined** (e.g. setting `el.style.width = '58%'` on an element
whose CSS has `transition: width …` leaves the *computed* value unchanged). Because of that, the
**Price Index** bar charts use **static inline sizes + CSS `@keyframes`** instead of
JS-driven transitions.

In a normal browser (your target) this quirk does **not** exist — you are free to drive bar
widths / heights with JS + CSS transitions as usual. Don't treat the static-size approach as a
requirement; it's a workaround for the prototype environment only.

---

## Tech in the prototype (for reference)
- **No framework** — plain HTML, one shared `styles.css`, vanilla JS modules.
- **Font:** Google Fonts **Cairo** (400–900). Tweaks panel also loads Tajawal + Almarai.
- **RTL-first.** `dir="rtl"` on `<html>`; all spacing uses logical properties
  (`inset-inline-start`, `margin-inline`, `padding-inline`) so LTR (English) flips automatically.
- **Animated hero background:** `<canvas>` driven by `assets/app.js` — a live "RFQ network"
  simulation (a pulsing central hub = the contractor broadcasts an RFQ; surrounding supplier
  nodes light up and send comet-trail "offers" back; the cheapest arrives green). Accent color &
  motion speed are tweakable.
- **i18n:** `data-i18n="key"` attributes + a dictionary object; a small loader swaps text,
  flips `dir`, and persists choice to `localStorage`.

---

## Pages / Screens

### 1. Landing — `Taseerak Landing.html`
- **Purpose:** Marketing home; convert contractors to sign up, suppliers to join.
- **Layout:** Fixed transparent nav (turns to frosted white on scroll) → full-viewport hero
  (two-col: copy + animated live-offer card) → trust marquee → How it works (4 steps) →
  Sectors (4 cards) → BOQ feature (split: copy + animated extraction demo) → Stats (4, count-up) →
  Why us (6 features) → CTA band → footer (4 columns).
- **Hero:** dark navy gradient + animated network canvas + two radial glows + readability scrim.
  H1 `clamp(34px,5vw,60px)/900`; highlighted word in `--orange-soft` with an underline swash.
  Live-offer card floats (`floatY` 6s), shows 3 ranked offers, best one green, "saving vs market".
- **Interactions:** scroll-reveal (IntersectionObserver, with a failsafe that force-shows if a
  transition doesn't tick), count-up stats, mouse parallax on canvas, mobile hamburger menu,
  language switch (AR/EN/UR), **Tweaks panel** (see below).
- **Links:** login/register/"start free" → `Login.html` / `Register.html`; "join as supplier"
  (footer) → `Join as Supplier.html`.

### 2. Login — `Login.html`
- **Purpose:** Authentication.
- **Layout:** Split screen — left (≈55%) animated navy brand panel with value props;
  right form panel (max-width 400px, centered). Collapses to single column < 860px.
- **Components:** email/phone input, password input with show/hide eye toggle, remember-me
  checkbox, forgot-password link, primary submit, divider, "create account" link, and two
  "demo quick-access" chips (→ contractor dashboard / supplier offer).
- **Behavior:** submit validates email present then redirects to `Contractor Dashboard.html`.
  Language pills flip direction live.

### 3. Register — `Register.html`
- **Purpose:** 4-step sign-up wizard.
- **Layout:** Top bar (logo + "have an account?"), centered stepper (4 dots + connectors,
  active/done in orange), one visible step pane (card, max-width 720px).
- **Steps:** (1) Account — name, phone (+966 affix), email, password. (2) Role — contractor /
  supplier role tabs; selecting supplier **changes labels and grade choices** (contractor grades
  أ–د / "unrated" vs supplier types مُصنّع/موزّع/محلي). (3) Details — company name, CR number,
  multi-select **sector cards** (4), preferred language single-select. (4) Confirmation — success
  check, "go to dashboard" / "start first project".
- **Behavior:** next/back advance panes + update stepper; role selection rewrites step-2/3 labels;
  sector cards multi-toggle; choice rows single-select.

### 4. Contractor Dashboard — `Contractor Dashboard.html`
- **Purpose:** Contractor home.
- **Layout:** App shell = fixed sidebar (264px, navy gradient, becomes off-canvas drawer < 860px)
  + main column with sticky frosted topbar. Page: greeting row + 2 CTAs → 4 stat cards →
  `1.6fr / 1fr` grid: recent RFQs list (left) + my-projects list & BOQ promo card (right).
- **Components:** stat cards (icon tile, big tabular number, label, optional trend), RFQ list
  rows (sector-tinted icon, title, sector chip + meta, offer count + status pill, chevron),
  project rows with progress bars, gradient promo card.
- **Status pills:** open (green), new/pending (orange), completed (grey).

### 5. New Project (BOQ) — `New Project (BOQ).html`
- **Purpose:** Upload a Bill of Quantities and auto-route line items to suppliers.
- **Layout:** App shell + breadcrumb. `1.6fr/1fr` grid: left = project fields (name, city,
  delivery) + drag-drop **filebox**, then (after "upload") an editable **extracted-items table**;
  right = sticky **summary** (total items, sectors covered, matched suppliers) + live
  per-sector distribution bars + "send to suppliers" button.
- **Behavior:** clicking the filebox (or "try a sample") loads 8 sample BOQ rows one-by-one
  (staggered). Each row: material/qty/unit inputs + a **sector `<select>`** (auto-detected) +
  delete. Editing/deleting/changing sector **recomputes** the summary counts, distribution bars,
  and matched-supplier total. "Send" → `Project Results.html`.
- **Sample data + matched-supplier counts** live in the page's `<script>` (`SAMPLE`, `SUP`).

### 6. Project Results — `Project Results.html`
- **Purpose:** Compare offers per material, choose, issue PO.
- **Layout:** App shell + breadcrumb + 4 summary stat cards. One **panel per material** (4),
  each showing its sector, qty, market average, and **3 ranked offer cards** (medal 1/2/3,
  supplier name + grade + tier, delivery, price + unit + saving %, "choose" button; best offer
  has green "cheapest" highlight). A **sticky bottom bar** shows the running grand total + "issue
  purchase order".
- **Behavior:** picking an offer marks it (and de-selects siblings in that material), updates
  grand total + "items chosen N/4" + enables the PO button. Issue PO → animates then navigates to
  `Purchase Order.html`. Data in `MATS` array.

### 7. Supplier Offer — `Supplier Offer.html`
- **Purpose:** Supplier submits a competitive bid.
- **Layout:** Supplier app shell (sidebar items: incoming / sent offers / POs). `1.6fr/1fr` grid:
  left = RFQ detail card (material, sector, spec, delivery, expiry) + **offer form** (unit price
  w/ ر.س affix, auto-calculated total, delivery + validity selects, notes, "includes delivery"
  toggle, submit/save-draft); right = sticky **live competitive position** card (expected rank,
  anonymized price ladder with the supplier's own bid highlighted, smart-routing note).
- **Behavior:** typing a unit price live-updates total, saving %, **predicted rank**, ladder
  position. Toggle flips. Submit → success state. Constants `QTY`, `MARKET`, `COMP` in script.

### 8. Purchase Order — `Purchase Order.html`
- **Purpose:** Print/PDF-ready PO document.
- **Layout:** Sticky toolbar (back / **print** / send) — hidden in `@media print`. Centered
  A4-ish document: top gradient band, header (logo + PO number), buyer/supplier parties grid,
  info row (issue date, delivery, payment, project), line-items table (with VAT 15% + subtotal +
  grand total box), terms + approval stamp.
- **Behavior:** "Print / PDF" calls `window.print()`; print CSS strips chrome and sets margins.

### 9. Price Index — `Price Index.html`
- **Purpose:** Material price intelligence.
- **Layout:** App shell + sector filter chips → `1.6fr/1fr` grid: left = trend panel (one featured
  material; **horizontal month bars**, June highlighted orange; min/avg/max footer); right =
  platform recommendation card (navy) + "most requested this week" list. Below: full **materials
  price table** (material, sector chip, unit, market avg, lowest offer, **sparkline**, change %).
- **Note:** bars/sparklines use static inline sizes + `@keyframes growW`/`growH` (see critical
  note above). In your stack, drive these with your charting lib or JS+CSS transitions.

### 10. Join as Supplier — `Join as Supplier.html`
- **Purpose:** Supplier acquisition landing.
- **Layout:** Sticky white nav → hero (animated network canvas; left copy + value props, right
  "register interest" form) → benefits (3 cards) → how-to-join (4 numbered steps) → CTA → slim
  footer.
- **Behavior:** form CTA → `Register.html`.

---

## Interactions & Behavior (cross-cutting)
- **Language switch (AR/EN/UR):** swaps all `[data-i18n]` text + `[data-i18n-ph]` placeholders,
  sets `<html dir>` (`rtl` for ar/ur, `ltr` for en), persists to `localStorage`
  (`taseerak_lang` on landing, `taseerak_applang` in app). Landing dictionary is in `assets/app.js`;
  app-chrome dictionary is in `assets/app-i18n.js`.
- **Scroll reveal:** `.reveal` (+ `.d1`–`.d4` stagger) starts hidden, IntersectionObserver adds
  `.show`; a timeout failsafe force-applies the end state so content can never stay hidden.
- **Counters:** `[data-count]` count-up over 1.5s ease-out when scrolled into view.
- **Canvas background:** see `initCanvas()` in `assets/app.js`. Respects
  `prefers-reduced-motion` (renders a static frame). Accent RGB + motion multiplier are settable
  via `window.setBgAccent(rgb)` / `window.setBgMotion(n)`.
- **Tweaks panel** (`assets/tweaks-landing.js`): a host-protocol-aware in-page settings panel
  (accent color ×4, UI font ×3, background motion, floating-chips toggle). Persists to
  `localStorage`; updates CSS vars + canvas live. This is a prototype affordance — you likely
  **don't** need to port it, but it documents which values are intended to be themeable.

## State Management (what a real app needs)
- **Auth/session:** current user + role (contractor | supplier), company, grade/tier, language.
- **RFQ:** material, qty, unit, spec, sector, city, delivery deadline, expiry, status
  (new | open | completed), offers[].
- **BOQ project:** name, city, deadline, lineItems[{material, qty, unit, sector}], derived
  {itemCount, sectors[], matchedSuppliers}.
- **Offer:** supplierId, rfqId, unitPrice, total (qty×unit), deliveryDays, validity, notes,
  includesDelivery, derived {rank, savingVsMarket}.
- **PurchaseOrder:** buyer, supplier, lineItems[], subtotal, vat(15%), total, dates, status.
- **PriceIndex:** per-material {marketAvg, lowestOffer, monthlyTrend[], changePct}.

---

## Design Tokens
(Defined as CSS custom properties in `assets/styles.css :root`.)

### Colors
| Token | Hex | Use |
|---|---|---|
| `--navy` | `#1B2D5B` | primary brand |
| `--navy-dark` | `#0f1d3d` | |
| `--navy-deep` | `#0a1530` | darkest bg |
| `--navy-soft` | `#2a4a8a` | gradients |
| `--orange` | `#F5831F` | accent / CTA |
| `--orange-dark` | `#d96f15` | accent hover/text |
| `--orange-soft` | `#ffb05e` | highlights on dark |
| `--bg` | `#f5f7fb` | page bg |
| `--bg-2` | `#eef2f8` | subtle fills |
| `--ink` | `#0f1b34` | body text |
| `--ink-2` | `#475069` | secondary text |
| `--ink-3` | `#8089a0` | muted text |
| `--line` | `#e4e9f2` | borders |
| `--white` | `#ffffff` | |
| Sector — civil | `#1B2D5B` (navy) | |
| Sector — architectural | `#7c3aed` (`--arch`) | |
| Sector — electrical | `#F5831F` (`--elec`/orange) | |
| Sector — mechanical | `#0F6E56` (`--mech`, also "success/cheapest") | |

### Typography
- Family: **Cairo** (`--font`), weights 400/500/600/700/800/900.
- H1 hero `clamp(34px,5vw,60px)` /900; section H2 `clamp(28px,4vw,44px)` /800;
  page H1 (app) 26px/800; card titles 16–19px/800; body 14–15px; meta 12–13px.
- Numbers use `font-variant-numeric: tabular-nums`.

### Radius
`--r-sm 10px` · `--r-md 16px` · `--r-lg 22px` · `--r-xl 30px` · pills `100px`.

### Shadows
- `--sh-sm` `0 1px 3px rgba(15,27,52,.06), 0 1px 2px rgba(15,27,52,.04)`
- `--sh-md` `0 8px 24px -8px rgba(15,27,52,.16), 0 2px 6px rgba(15,27,52,.06)`
- `--sh-lg` `0 30px 70px -24px rgba(15,27,52,.32)`
- `--sh-orange` `0 12px 30px -8px rgba(245,131,31,.5)`

### Layout
- Content max-width `--maxw 1200px`; gutters 24px; section padding 100px (70px mobile).
- App sidebar 264px; topbar sticky frosted; breakpoints 1080 / 980 / 860 / 560px.

### Buttons
`.btn` pill, 700 weight; `.btn-primary` (orange + orange shadow, lifts on hover),
`.btn-navy`, `.btn-ghost`, `.btn-light` (translucent on dark), `.btn-lg` size.

---

## Assets
- `assets/logo.png` — the brand hexagon mark (crane + building + invoice/$ + cart). Provided by
  the client; shown inside a white rounded "plate" (`.logo-badge`) so it reads on navy, white,
  and footer backgrounds. Reuse this exact file.
- All icons are **inline SVG** (stroke-based, `stroke-width:2`) — no icon font/library dependency.
- Fonts via Google Fonts CDN (Cairo; Tajawal/Almarai only if you keep the font tweak).

---

## Additional Screens (Batch 2 — 12 more)
These extend the same design system; they load `assets/app-ui2.css` (and auth pages load
`assets/auth-canvas.js`). Components added: tabs (pill + underline), verification banners,
star ratings, invoice breakdown, big offer cards, collapsible specialty groups, draggable map
placeholder, doc/legal layout, reject modal, win-rate ring, AI-classification badges.

### 11. Supplier Dashboard — `Supplier Dashboard.html`
Supplier home. Verified-via-Wathq banner, 4 stats (incl. a conic-gradient **win-rate ring**),
pill **tabs** (incoming matched RFQs / my offers). Incoming rows are filtered to the supplier's
sectors+specialties (note line states this); each row has a "submit offer" CTA + dismiss (×).
Offers tab shows status pills (accepted / under review / rejected).

### 12. New RFQ (single quote) — `New RFQ.html`
Quick single-material RFQ (lighter than the BOQ flow). Sector cards → material chips (+ free
text) → qty/unit/spec → region/city → **delivery toggle** that reveals a required delivery-location
field → optional spec file + notes. A **targeting** panel (supplier types multi-select, "verified
only", "nearby only" toggles). Sticky summary with matched-supplier count + validity choice.
Submit → `RFQ Offers.html`.

### 13. RFQ Offers & Compare — `RFQ Offers.html`
Contractor compares incoming offers for one RFQ. RFQ detail header (spec, location, market avg).
Each **big offer card**: rank medal, supplier name, tier (🏭/🏪/🏬), **verified-via-Wathq badge**,
star rating, region, phone, price + saving %, an **invoice breakdown** (goods + delivery = total),
attribute chips (brand/origin/warranty/catalog/map), accept/reject. Accepting highlights it green,
dims others, and reveals a "view purchase order" link.

### 14. Supplier Specialties — `Supplier Specialties.html`
Supplier picks exactly what they supply so routing is precise. **Collapsible sector panels**
(toggle on/off) each containing grouped specialty chips (multi-select, live count). Side: supplier
tier single-select + min order value; "suggest a missing material" with pending/approved states.

### 15. Settings — `Settings.html`
4 **underline tabs**: Profile (bilingual org fields, CR, VAT), Documents & Verification
(secure-link doc upload + **Wathq verify card**: enter CR → "تحقّق" → official name/activity/status
result), Classification (supplier tier + min order), Preferences (language, notification toggles,
logout). Works for supplier or contractor (hide supplier-only bits for contractors).

### 16. Admin Panel — `Admin Panel.html`
Platform moderator. Stats + tabs: **Pending verification** (rich review cards: official Wathq name,
CR, national address, license/location doc links, and an **AI classification badge**
match/mismatch/manual-review with reason + re-check button; verify / reject actions),
All users (table with role + tier + verification), Material requests (approve/reject suggested
materials). Reject opens a **reason modal**.

### 17. Supplier Live Prices — `Supplier Prices.html`
Supplier maintains indicative prices that feed the (anonymized, aggregated) market Price Index.
Editable table (material, sector, unit, price, region, last-updated) with add/edit/delete.

### 18. Location / Map — `Location.html`
Set facility location for proximity matching + shipping. **Draggable pin** on a styled map
placeholder (click or drag to move; lat/long fields update conceptually) + Saudi **National Address**
fields (short code, building no, street, district, postal code).
> In production, replace the `.map` placeholder with a real maps SDK (Google Maps / Mapbox);
> keep the pin-drag → lat/long binding and the National Address form.

### 19–21. Auth minis — `Forgot Password.html`, `Reset Password.html`, `Verify Email.html`
Same split-screen auth layout as Login. **Forgot**: email → "check your inbox" success state.
**Reset**: new+confirm password (show/hide, match validation) → success; also a **expired/invalid
link** state. **Verify Email**: "confirm your inbox" with resend; notes that documents can be
uploaded later from Settings.

### 22–23. Legal — `Terms.html`, `Privacy.html`
Centered document layout (`.doc-shell`). **Terms** leads with a prominent red **disclaimer box**:
the platform is an information intermediary only and is **not liable** for fraud/theft/disputes
between users — due diligence is on the users. **Privacy** is PDPL-oriented (data collected, use,
sharing, security, user rights, retention).

---

## Files (in this bundle, under `/files`)
Pages (23):
- Batch 1: `Taseerak Landing.html`, `Login.html`, `Register.html`,
  `Contractor Dashboard.html`, `New Project (BOQ).html`, `Project Results.html`,
  `Supplier Offer.html`, `Purchase Order.html`, `Price Index.html`, `Join as Supplier.html`
- Batch 2: `Supplier Dashboard.html`, `New RFQ.html`, `RFQ Offers.html`,
  `Supplier Specialties.html`, `Settings.html`, `Admin Panel.html`, `Supplier Prices.html`,
  `Location.html`, `Forgot Password.html`, `Reset Password.html`, `Verify Email.html`,
  `Terms.html`, `Privacy.html`

Shared assets (`/files/assets`):
- `styles.css` — design tokens + landing/marketing components.
- `app-ui.css` — app-shell, forms, tables, dashboard, auth, stepper components.
- `app-ui2.css` — batch-2 components (tabs, banners, ratings, invoice, specialties, map, doc/legal, modal).
- `app.js` — landing i18n dictionary, animated canvas, reveal/counter logic.
- `app-i18n.js` — app-chrome i18n dictionary (AR/EN/UR).
- `shell.js` — app sidebar drawer + language apply/persist.
- `auth-canvas.js` — shared compact network canvas for auth pages.
- `tweaks-landing.js` — themeable Tweaks panel (prototype affordance).
- `logo.png` — brand mark.

### Suggested route map
`/` Landing · `/login` · `/register` · `/forgot-password` · `/reset-password` · `/verify-email` ·
`/dashboard` (contractor) · `/supplier` (supplier dashboard) · `/rfq/new` (single) ·
`/projects/new` (BOQ) · `/projects/:id/results` · `/rfq/:id/offers` · `/supplier/rfqs/:id` (offer) ·
`/supplier/specialties` · `/supplier/prices` · `/orders/:id` (PO) · `/price-index` · `/location` ·
`/settings` · `/admin` · `/suppliers/join` · `/terms` · `/privacy`

### Roles
- **Contractor:** dashboard, new RFQ, BOQ project, results, RFQ offers, PO, price index, settings.
- **Supplier:** supplier dashboard, incoming RFQs, submit offer, specialties, prices, location, settings.
- **Admin:** admin panel (verification + material-request moderation).
