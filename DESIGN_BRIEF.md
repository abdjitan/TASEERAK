# تسعيرك (Taseerak) — Design Brief

> A complete reference for redesigning the UI. Hand this file to any designer or AI design tool.

---

## 1. What is Taseerak?

**Taseerak (تسعيرك)** is a **B2B construction procurement marketplace** for Saudi Arabia.

- **Concept:** A contractor sends ONE request for quotation (RFQ) → it reaches all relevant verified suppliers → suppliers compete with price offers → contractor compares and picks the best.
- **Unique angle:** It is NOT an e-commerce store (we don't sell). We are a pure *quotation/matchmaking* platform — like a tender system for materials.
- **Domain:** taseerak.vercel.app
- **Tagline (AR):** منصة التسعير والتوريد للمقاولين
- **Tagline (EN):** Contractors & Suppliers Platform

### Key differentiators vs competitors (Benna, Mawad, Muqawil):
1. Pure RFQ (no direct selling)
2. Smart classification — big contractors don't get matched with tiny local shops
3. **Trilingual: Arabic (RTL) + English (LTR) + Urdu (RTL)** — Urdu is critical for the labor market
4. BOQ upload — contractor uploads a full Bill of Quantities Excel, system auto-extracts every material and routes each to the right specialist supplier
5. Subcontractor system (contractor-to-contractor)

---

## 2. Brand & Visual Identity

### Logo
- Located at `/public/logo.png` (for light backgrounds) and `/public/logo-outlined.png` (for dark/blue backgrounds)
- A hexagonal badge with: a construction crane + a building + a price/invoice document with $ + an orange shopping cart
- Wordmark: **"تسعير" in navy + "ك" in orange** (Arabic) | **"Taseer" in navy + "ak" in orange** (English)

### Colors (CURRENT — feel free to evolve)
```
--navy:        #1B2D5B   /* Primary — navbars, headings, primary buttons */
--navy-dark:   #0f1d3d   /* Hover state for navy */
--orange:      #F5831F   /* Accent — CTAs, highlights, the "ak"/"ك" in logo */
--orange-dark: #d96f15   /* Hover state for orange */
--bg:          #f4f6f9   /* Page background (light grey) */
--dark:        #0f172a   /* Footer / dark sections */
```

Supporting colors used:
- Green `#0F6E56` (success, accept offer, verified)
- Purple `#7c3aed` (supplier tier, secondary stats)
- Red `#ef4444` (reject, errors)
- Amber `#F5831F`/amber-100 (pending status)

### Typography
- Font: `Segoe UI, Tahoma, Arial` (system fonts — works for Arabic & Latin)
- Headings: bold to extra-bold (700-900)
- Wordmark weight: 900

### Design language (current)
- Rounded corners everywhere: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px)
- Soft shadows: `shadow-sm` default, `shadow-md` on hover
- Cards: white bg, light border (`border-gray-100`), subtle hover lift (`-translate-y-0.5`)
- Gradients used on hero/login: `linear-gradient(135deg, #0B1D3A → #1B2D5B → #2a4a8a)`
- Subtle background pattern: faint radial gradients in navy & orange at 4% opacity
- Animations: fadeIn, slideUp, float (logo), staggered children
- Badges: pill-shaped `rounded-full`, small text `text-[10px]`

---

## 3. Users (3 roles)

### A. Contractor (مقاول)
- Sends RFQs (single material OR full BOQ project)
- Compares offers, accepts best
- Has a Saudi classification grade: **A (أ) / B (ب) / C (ج) / D (د)**
  - A: projects > 100M SAR | B: 30–100M | C: 5–30M | D: < 5M

### B. Supplier (مورد)
- Receives RFQs in their sectors only
- Submits price offers (or dismisses the request)
- Has a **tier**: 🏭 Manufacturer/Major Distributor | 🏪 Commercial Distributor | 🏬 Local Supplier
- Can set a **minimum order value** (won't see smaller requests)
- Gets verified by admin (license check)

### C. Admin (مدير)
- Verifies business licenses (approve / reject with reason)
- Assigns supplier tiers & contractor grades
- Manages all users

---

## 4. Sectors (القطاعات) — 4 categories

| Key | Arabic | English | Icon | Sample materials |
|-----|--------|---------|------|------------------|
| civil | مدني | Civil | 🏗 | Rebar, cement, concrete, blocks, storm drainage |
| architectural | معماري | Architectural | 🏛 | Tiles, paint, doors, gypsum, ceilings, glass |
| electrical | كهرباء | Electrical | ⚡ | Cables (NYY/XLPE/SWA), panels, LED, transformers |
| mechanical | ميكانيك | Mechanical | ⚙️ | Pipes (PPR/HDPE), pumps, valves, HVAC, sprinklers |

---

## 5. All Pages (current routes)

### Public
| Route | Page | Description |
|-------|------|-------------|
| `/` | **Landing** | Hero + how-it-works + sectors + stats + trust + CTA + footer |
| `/login` | **Login** | Split: branding side (gradient) + form. Trilingual switcher |
| `/register` | **Register** | 4-step wizard: role → company data → license upload → sectors + classification |

### Contractor
| Route | Page | Description |
|-------|------|-------------|
| `/contractor` | **Dashboard** | Stats (4 cards), projects list, RFQs list. Nav: New Project / New RFQ / Prices / Settings |
| `/contractor/rfq/new` | **New RFQ** | Single-material request. 3-col layout: form + options sidebar + live summary |
| `/contractor/rfq/[id]` | **RFQ Detail** | Shows offers sorted by price, market avg comparison, accept/reject, edit |
| `/contractor/project/new` | **New Project (BOQ)** | Upload Excel BOQ → auto-extract materials → review/edit table → send to suppliers |
| `/contractor/project/[id]` | **Project Results** | Each material shows top-3 cheapest offers, accept per-item, total cost summary |
| `/contractor/orders/[id]` | **Purchase Order** | Printable PO document after accepting an offer |

### Supplier
| Route | Page | Description |
|-------|------|-------------|
| `/supplier/dashboard` | **Dashboard** | Stats, tabs: open RFQs (filtered by sector+tier) / my offers |
| `/supplier/dashboard/rfq/[id]` | **Submit Offer** | RFQ details + offer form (price, unit price auto-calc, product attributes, notes) + dismiss button |

### Shared
| Route | Page | Description |
|-------|------|-------------|
| `/settings` | **Settings** | Tabs: company info / documents / password / language / classification |
| `/market` | **Price Index** | Market price table (avg/min/max per material from real offers) |
| `/admin` | **Admin Panel** | User list, verify/reject, assign tiers/grades, stats |

---

## 6. Core User Flows

### Flow 1 — Single RFQ (contractor)
```
Dashboard → New RFQ → pick sector → pick material (chips) →
quantity + unit + spec → location → options (delivery/VAT/hide identity) →
validity (24/48/72h/week) → estimated value → optional spec file →
SEND → suppliers notified → offers arrive → compare (sorted by price,
market avg shown) → ACCEPT best → Purchase Order generated
```

### Flow 2 — BOQ Project (the killer feature)
```
Dashboard → New Project → name + region → upload Excel BOQ →
system auto-extracts ALL materials (name, qty, unit, auto-detected sector) →
contractor reviews table, edits/removes, attaches per-item spec files →
SEND → each material becomes a separate RFQ routed to its sector's suppliers →
Results page: each material shows TOP 3 cheapest offers (🥇🥈🥉) →
"show all offers" toggle → accept per-item → running total cost
```

### Flow 3 — Supplier responds
```
Dashboard → sees only RFQs in their sectors (+ above min order value) →
open RFQ → see details + attached spec file →
EITHER submit offer (price, attributes like brand/origin/warranty, notes)
OR dismiss (with optional reason — hides it forever)
```

---

## 7. Key Components / UI Patterns

- **Navbar:** glass effect (`bg-white/90 backdrop-blur`), sticky, Logo left, language switcher + actions right
- **Language switcher:** minimal pills `AR | EN | UR`
- **Stat cards:** icon in colored rounded square (top), big number, label below
- **RFQ/offer cards:** white, rounded-2xl, sector icon badge, status pill, hover lift
- **Sector chips:** colored by sector (navy/purple/orange/green)
- **Material selection chips:** pill buttons, selected = navy filled
- **Toggle switches:** custom (for delivery/VAT/hide-identity options)
- **Modals:** centered, backdrop blur, slide-up animation (reject reason, dismiss)
- **Empty states:** big emoji (📋📭📤), bold title, subtitle, CTA button
- **Loading:** floating logo + "Loading..." text

---

## 8. What I want from the redesign

> **Fill this section with YOUR goals before sending to a designer:**

- [ ] More modern / premium look?
- [ ] Better mobile experience?
- [ ] Custom illustrations instead of emojis?
- [ ] A specific style reference (e.g., Linear, Stripe, Notion)?
- [ ] Dark mode?
- [ ] Animated hero / interactive demo on landing?

---

## 9. Tech Stack (for context)

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (utility classes, no component library)
- **Database/Auth:** Supabase (PostgreSQL)
- **Deployment:** Vercel
- **i18n:** Custom JSON-based (ar/en/ur), RTL/LTR switching
- **Direction:** RTL by default (Arabic primary), LTR for English only

---

## 10. Screens priority for redesign

1. **Landing page** (`/`) — first impression, most important
2. **Login** (`/login`) — currently a gradient split layout
3. **Contractor Dashboard** (`/contractor`) — main working screen
4. **BOQ Project flow** (`/contractor/project/new` + `/[id]`) — the unique selling feature
5. **Supplier Submit Offer** (`/supplier/dashboard/rfq/[id]`)
6. **Register wizard** (4 steps)

---

*Generated for Taseerak redesign. Current live version: taseerak.vercel.app*
