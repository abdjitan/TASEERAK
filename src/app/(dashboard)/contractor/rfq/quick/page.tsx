'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Pencil, ChevronDown, ChevronUp, X, Lock, Calculator, Paperclip } from 'lucide-react'
import { parseBudget, saveRfqBudgets, budgetToStored, budgetShown, type ItemBudget } from '@/lib/budget'
import BudgetField from '@/components/rfq/BudgetField'
import { useCatalogSpecs } from '@/lib/useCatalogSpecs'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SPEC_UNSURE, specUnsureLabel, REGIONS, CITIES_BY_REGION, SECTOR_LABELS, SECTOR_PRODUCTS, getProductLabel, getUnitLabelLong, unitChoicesFor, detectSubCategory, getDefaultUnit, getProductSpecs, getOptionLabel, missingSpecs, specsRequired, brandApplies, withBrand, getRegionLabel, getSubCategoryLabel, type Sector } from '@/types'
import CatalogPicker, { CatalogBrowser } from '@/components/shared/CatalogPicker'
import { rememberBuyerType, storedBuyerType } from '@/lib/buyerType'
import PackSheet, { type PackLine } from '@/components/buyer/PackSheet'
import { packById, homeName, HOME_ROOM_PACKS, type HomePack } from '@/lib/homePacks'
import LocationPicker from '@/components/shared/LocationPicker'
import SellerIcon from '@/components/shared/SellerIcon'
import EnablePush from '@/components/shared/EnablePush'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { normQuery } from '@/lib/productSearch'
import { loadLocalDraft, saveLocalDraft, clearLocalDraft, putDraftBlob, getDraftBlob, deleteDraftBlobs } from '@/lib/localDraft'
import Glyph from '@/components/shared/Glyph'
import { arCount, arMaterials, countLabel, dateLocale } from '@/lib/text'
import { TIERS, tierLabel, tierHint } from '@/lib/sellers'
import LineSpecialty, { choiceDone } from '@/components/shared/LineSpecialty'
import { isInstallable } from '@/lib/installation'
import { useEnsureVerified } from '@/components/shared/VerifyGate'
import { askConfirm } from '@/lib/askConfirm'
import { canUseProjects } from '@/lib/plans'
import QuantityCalc, { calcSupported } from '@/components/buyer/QuantityCalc'
import { nearestSaCity } from '@/lib/saCityCoords'

// The one request page, for anyone: write, dictate, photograph or pick from the catalog; we turn
// it into lines the buyer can fix, then send. Each line can open its specifications (PRODUCT_SPECS)
// and carry a drawing/file. Reorder (?from=<rfq>) and saved drafts (?draft=<id>) open here too.

import { toLatinNumber } from '@/lib/number' // «2,500» = 2500: commas are thousands separators (round-4 UX-002)
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { realtimeTopic } from '@/lib/realtimeTopic'

// Every catalog product name — a line outside it gets the «which specialty?» chooser.
const CATALOG_NAMES = new Set<string>(Object.values(SECTOR_PRODUCTS).flat() as string[])
const UNITS = ['حبة', 'كيس', 'طن', 'م³', 'م²', 'متر', 'م.ط', 'لفة', 'كرتون', 'سطل', 'لوح', 'جالون', 'لتر', 'كغ', 'طقم', 'نقلة', 'يوم', 'ساعة', 'عدد']
const COUNT_UNITS = ['حبة', 'عدد', 'طقم']

// the unified «selected» look (UX-152): gold border, light gold fill, navy text and a navy check
const CHOICE_ON = 'border-[#D4A543] bg-[#D4A543]/10 text-[#0B2438]'
const CHOICE_OFF = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'

type Line = {
  key: string
  product_name: string
  sector: string
  quantity: string
  unit: string
  details: string
  brand?: string // «الماركة أو اسم المنتج» (optional)
  photoId?: string
  done?: boolean   // «تم» pressed: shown as a compact row until tapped again
  original?: string // what the buyer wrote, when it differs from the Arabic name suppliers see
  suggestion?: { name: string; sector: string } | null
  specs?: Record<string, string> // chosen specification values (PRODUCT_SPECS keys, without 'unit')
  fileId?: string                // attached drawing/spec file, kept in IndexedDB until sending
  fileName?: string
  photoWarn?: string               // tester 2026-11-21: the AI thinks the attached photo is not this material (warning only)
  moreFiles?: { id: string; name: string }[] // owner 2026-10-31: more than one file/photo per line (up to 5 in all)
  spec?: { sector: string; sub: string | null; section?: string } // a «not in the guide» item filed under a specialty by the buyer
  with_install?: boolean // «اطلب السعر مع التركيب» (only on an installable specialty, src/lib/installation.ts)
  budget?: string         // R23: «أقصى مبلغ للوحدة شامل الضريبة (اختياري)», SAR incl. VAT; saved before VAT to rfq_item_budgets, never in items
  budgetVisible?: boolean // shown to suppliers only when ticked (off by default)
  review?: string[]       // UX-064: what to check on a line read from the text: keys 'qty_missing' | 'qty_guess' | 'unit_guess' (round-2 UX-136)
  prevFiles?: { url: string; name: string }[] // attachments carried from an earlier request («اطلب مرة أخرى», round-2 UX-040), sent as they are
  extraOpen?: boolean     // home mode: «أضف ملاحظة أو صورة» opened (round-2 UX-042)
}
// a line's review flags: a quantity fix clears only the quantity flags, a unit fix only the unit flag (round-2 UX-136)
const QTY_FLAGS = ['qty_missing', 'qty_guess']
const MAX_FILES = 5
const GUEST_KEY = 'quick:guest' // a visitor's list, moved into the account after sign-up (round-4 UX-056)
const fileCount = (l: Line) => (l.fileId ? 1 : 0) + (l.moreFiles || []).length + (l.prevFiles || []).length
const dropFlags = (review: string[] | undefined, drop: string[]) => { const r = (review || []).filter(x => !drop.includes(x)); return r.length ? r : undefined }
type Photo = {
  id: string
  file: File
  url: string
  status: 'identifying' | 'done' | 'failed'
  share: boolean
  confidence?: string
  localName?: string // the AI's name in the buyer's language (the line itself keeps the Arabic trade name)
  question?: string // one short question from the AI when it is not sure what the photo shows
}
type Problem = { msg: string; hint: string; key?: string; field?: 'region' | 'location' }

let seq = 0
const uid = () => 'k' + Date.now().toString(36) + (seq++)

// "القطر: 12 مم، الطول: 12 متر" from the chosen specification values (the order unit is the line's unit).
function specText(name: string, specs?: Record<string, string>) {
  if (!specs) return ''
  return getProductSpecs(name).filter(f => f.key !== 'unit' && (specs[f.key] || '').trim()).map(f => `${f.ar}: ${specs[f.key].trim()}`).join('، ')
}
// The line's specialty (the buyer's choice for a «not in the guide» item, else detected).
const lineSub = (l: Line) => l.spec ? l.spec.sub : detectSubCategory(`${l.product_name} ${specText(l.product_name, l.specs)}`, l.sector as any)
// «مع التركيب» applies only while the line's specialty is installable.
const wantsInstall = (l: Line) => !!l.with_install && isInstallable(l.sector, lineSub(l))
const isImageName = (n?: string) => /\.(jpe?g|png|webp)$/i.test(n || '')
// A saved request item (rfqs.items / rfq_drafts) back into an editable line.
function lineFromItem(it: any): Line {
  const specs: Record<string, string> = it.specsObj && typeof it.specsObj === 'object' ? { ...it.specsObj } : {}
  delete specs.unit
  const st = specText(it.product_name || '', specs)
  let details = String(it.specification || '')
  // the brand goes back to its own field; drop its «الماركة: X — » prefix so a resend doesn't repeat it
  const brand = String(it.brand || '').trim()
  if (brand && details.startsWith(`الماركة: ${brand}`)) details = details.slice(`الماركة: ${brand}`.length).replace(/^\s*—\s*/, '')
  if (st && details.startsWith(st)) details = details.slice(st.length).replace(/^\s*—\s*/, '')
  const name = String(it.product_name || '').trim()
  const sector = it.sector || 'supply_store'
  // a hand-written item keeps the specialty the buyer chose, so a reorder never asks again (round-2 UX-040)
  const custom = !!name && (it.custom === true || !CATALOG_NAMES.has(name))
  const spec = it.spec && typeof it.spec === 'object' ? it.spec
    : custom && (it.sub_category || it.section) ? { sector, sub: it.sub_category || null, ...(it.section ? { section: it.section } : {}) } : undefined
  // the earlier request's attachments travel with the line («مرفق من الطلب السابق»)
  const prev: { url: string; name: string }[] = []
  const seen = new Set<string>()
  const push = (url: any, nm: any) => { const u = String(url || ''); if (/^https?:\/\//.test(u) && !seen.has(u)) { seen.add(u); prev.push({ url: u, name: String(nm || '') }) } }
  if (Array.isArray(it.prevFiles)) for (const f of it.prevFiles) push(f?.url, f?.name)
  push(it.spec_file_url, it.spec_file_name)
  if (it.photo_url && it.photo_url !== it.spec_file_url) push(it.photo_url, '')
  if (Array.isArray(it.attachments)) for (const a of it.attachments) push(a?.url, a?.name)
  return {
    key: uid(), product_name: name, sector,
    quantity: it.quantity ? String(it.quantity) : '', unit: it.unit || '', details, specs, ...(brand ? { brand } : {}),
    ...(it.with_install ? { with_install: true } : {}),
    ...(spec ? { spec } : {}),
    ...(prev.length ? { prevFiles: prev.slice(0, 5) } : {}),
    done: !!(name && Number(it.quantity) > 0 && it.unit),
  }
}

export default function QuickRequestPage() {
  useCatalogSpecs() // spec fields and order units (loaded on demand)
  const { locale, dir } = useTranslation()
  const ensureVerified = useEnsureVerified()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [userId, setUserId] = useState('')
  const [guest, setGuest] = useState(false) // not signed in: the list is kept as quick:guest (round-4 UX-056)
  const [text, setText] = useState('')
  const textRef = useRef('')
  const [listening, setListening] = useState(false)
  const [canListen, setCanListen] = useState(false)
  const [micError, setMicError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [info, setInfo] = useState('') // a short status line after «أضف إلى طلبي» (UX-064)
  const [lines, setLines] = useState<Line[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [hours, setHours] = useState(48)
  const [notes, setNotes] = useState('')
  const [vatRequired, setVatRequired] = useState(false)
  // the usual market price per product + unit (stored before VAT, shown with VAT), only with 3+ different suppliers (UX-149)
  const [market, setMarket] = useState<Record<string, number>>({})
  useEffect(() => {
    createClient().rpc('get_market_prices').then(({ data }: any) => {
      const m: Record<string, number> = {}
      for (const r of (data || [])) if (Number(r?.supplier_count) >= 3 && Number(r?.avg_price) > 0) m[`${r.product_name}|${r.unit}`] = Number(r.avg_price)
      setMarket(m)
    }, () => {})
  }, [])
  // the specialty chooser waits until the buyer stops typing a hand-written name (UX-063)
  const [typingKey, setTypingKey] = useState<string | null>(null)
  const typingTimer = useRef<any>(null)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  // owner 2026-11-21: who receives the request: the nearest suppliers (245) or the whole region (capped)
  const [nearbyOnly, setNearbyOnly] = useState(true)
  // owner 2026-11-21 (tester: individuals get lost in the details): 'individual' = simple flow
  // (specs optional, extra options folded), 'business' = the full flow; asked once, kept on the profile
  const [buyerType, setBuyerType] = useState<'individual' | 'business' | null | undefined>(undefined)
  const [chooseType, setChooseType] = useState(false) // «تغيير» next to the mode label (UX-085)
  const [moreOpen, setMoreOpen] = useState(false)
  const [canProjects, setCanProjects] = useState(false)
  // an unknown buyer type gets the simple flow, never mandatory specs (round-2 UX-043)
  const simple = buyerType !== 'business'
  // who prices it (owner 2026-10-24): all / companies & factories / shops / independents — rfqs.target_tiers
  const [tier, setTier] = useState<'all' | 'company' | 'shop' | 'independent'>('all')
  const [pickup, setPickup] = useState(false) // the buyer collects from the supplier instead of delivery
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null) // delivery point (map / GPS)
  const [address, setAddress] = useState('')                                // district, street, landmark
  const [geoFromProfile, setGeoFromProfile] = useState(false) // pre-filled: say so, so the buyer checks it
  const [geoFilled, setGeoFilled] = useState('') // «حدّدنا المنطقة والمدينة من موقعك»
  const [pastPlaces, setPastPlaces] = useState<{ label: string; geo: { lat: number; lng: number } | null; address: string; region: string; city: string }[]>([])
  const [specsOpen, setSpecsOpen] = useState<string | null>(null) // line key whose specifications are open
  const [calcFor, setCalcFor] = useState<string | null>(null)     // line key whose «احسبها من مقاس الغرفة» is open
  const [draftId, setDraftId] = useState<string | null>(null)     // a saved draft (rfq_drafts) opened here
  const [savingDraft, setSavingDraft] = useState(false)
  const [tplOpen, setTplOpen] = useState(false) // «احفظ كقائمة متكرّرة»: the name field (round-4 UX-187)
  const [tplName, setTplName] = useState('')
  const specFileRef = useRef<HTMLInputElement>(null)
  const [fileFor, setFileFor] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false) // the summary shown before sending
  const [reach, setReach] = useState<{ reached: number; items: { name: string; suppliers: number }[] } | null>(null)
  const [reachState, setReachState] = useState<'loading' | 'done' | 'failed'>('loading') // the check never spins forever (round-4 UX-120)
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState<string | null>(null)   // the line the error is about (shown under it)
  const [errSoft, setErrSoft] = useState(false) // something missing (gold frame, navy text); red stays for upload/network failures (round-4 UX-120)
  const [infoWarn, setInfoWarn] = useState(false) // the status line asks for a check: navy with a gold ⚠, not green (round-4 UX-120)
  const [errField, setErrField] = useState<'region' | 'location' | null>(null) // a delivery field error, shown under that field (round-2 UX-041)
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null) // attachments being uploaded on send (round-2 UX-044)
  const [pastItems, setPastItems] = useState<{ name: string; sector: string }[]>([]) // «طلبتَها سابقاً» (round-2 UX-167)
  const [flash, setFlash] = useState<string | null>(null)     // a gold ring for 2 s on the line we scrolled to
  const [undo, setUndo] = useState<{ line: Line; index: number; photo?: Photo } | null>(null)
  const undoTimer = useRef<any>(null)
  const [done, setDone] = useState(false)
  const [sent, setSent] = useState<{ id: string; expires: string; coverage: any; stale?: boolean } | null>(null)
  const [firstHours, setFirstHours] = useState<number | null>(null) // «يصل أول عرض عادةً خلال X ساعات» (round-4 UX-186)
  const [firstOffer, setFirstOffer] = useState(false)               // an offer arrived while the success screen is open
  const recRef = useRef<any>(null)
  const heardRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [replaceKey, setReplaceKey] = useState<string | null>(null) // «تغيير المادة»: the next guide pick replaces this line (round-4 UX-027)
  const replaceRef = useRef<string | null>(null)
  const [inlinePick, setInlinePick] = useState(false) // the phone guide inside the page was used: keep it open
  const [restored, setRestored] = useState(false)
  // From the buyer home: open the guide already searching (?q=) or on a section (?section=)
  const [startQ, setStartQ] = useState('')
  const [startSection, setStartSection] = useState<string | null>(null)
  const [pack, setPack] = useState<HomePack | null>(null)   // ?pack= home project pack (owner 2026-11-22)
  const [startPhoto, setStartPhoto] = useState(false) // ?start=photo: a big «take or choose a photo» button on top
  // «متى تحتاج التسليم؟» → items[].max_days for every line (null = not urgent)
  const [needDays, setNeedDays] = useState<number | null>(null)
  // one id per request: a retry after a lost response (weak network) re-sends the same id, so the
  // database refuses the duplicate (primary key) instead of creating a second request
  const rfqIdRef = useRef<string>('')
  const sendingRef = useRef(false)
  useEffect(() => { textRef.current = text }, [text])
  useEffect(() => {
    // the home buyer's mode is known on this device at once: no contractor flash before the profile loads (UX-076)
    const st = storedBuyerType()
    if (st) setBuyerType(prev => (prev === undefined ? st : prev))
    const qs = new URLSearchParams(window.location.search)
    // «لم تجد المادة؟» from the home search: start with that text as a line (the buyer picks its specialty)
    const sl = (qs.get('line') || '').trim().slice(0, 80)
    if (sl) setLines(prev => prev.some(l => l.product_name === sl) ? prev : [...prev, { key: uid(), product_name: sl, sector: 'supply_store', quantity: '', unit: 'حبة', details: '' }])
    // browsers block opening the file picker without a tap, so show a big button instead
    if (qs.get('start') === 'photo') setStartPhoto(true)
    const pk = packById(qs.get('pack'))
    if (pk) setPack(pk)
    const sq = (qs.get('q') || '').slice(0, 80), ss = qs.get('section')
    if (sq) setStartQ(sq)
    if (ss && /^[a-z_]{3,20}$/.test(ss)) setStartSection(ss)
    // «كل التصنيفات» from the market home (?browse=1): the guide itself, not an empty form (round-2 UX-034)
    if (sq || ss || qs.get('browse') === '1') {
      // phones show the guide as a sheet; desktop has it inline on the page
      if (window.matchMedia('(min-width: 1024px)').matches) setTimeout(() => document.getElementById('catalog-inline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
      else setShowCatalog(true)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      // a visitor builds the list first; the account is asked for only at «إرسال» (round-4 UX-056)
      if (!user) {
        setGuest(true)
        setBuyerType(prev => (prev === undefined ? null : prev))
        const g = loadLocalDraft<any>(GUEST_KEY)
        if (g) {
          if (Array.isArray(g.lines) && g.lines.length) setLines(prev => [...g.lines, ...prev])
          if (typeof g.text === 'string' && g.text) setText(t => t || g.text)
          if (g.region) { setRegion(g.region); setCity(g.city || '') }
          if (typeof g.needDays === 'number') setNeedDays(g.needDays)
          if (typeof g.notes === 'string') setNotes(g.notes)
          if (typeof g.pickup === 'boolean') setPickup(g.pickup)
          if (g.geo && typeof g.geo.lat === 'number') setGeo(g.geo)
          if (typeof g.address === 'string') setAddress(g.address)
        }
        setRestored(true)
        return
      }
      setUserId(user.id)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCanProjects(canUseProjects(p)) // the bill-of-quantities tool only for accounts that can use it (round-2 UX-143)
      setBuyerType(p?.buyer_type === 'individual' || p?.buyer_type === 'business' ? p.buyer_type : null)
      rememberBuyerType(p?.buyer_type)
      if (p?.region) setRegion(p.region)
      if (p?.city) setCity(p.city)
      if (p?.latitude != null && p?.longitude != null) { setGeo({ lat: p.latitude, lng: p.longitude }); setGeoFromProfile(true) }
      loadPastPlaces(supabase, user.id)
      loadPastItems(supabase, user.id)

      // 1) bring back what the buyer had entered before leaving the page; a list built before signing up
      //    (quick:guest) moves into the account's draft (round-4 UX-056)
      let localCount = 0
      const own = loadLocalDraft<any>('quick:' + user.id)
      const gd = loadLocalDraft<any>(GUEST_KEY)
      const d = gd && Array.isArray(gd.lines) && gd.lines.length
        ? { ...(own || {}), ...gd, lines: [...(Array.isArray(own?.lines) ? own.lines : []), ...gd.lines], photos: [...(Array.isArray(own?.photos) ? own.photos : []), ...(Array.isArray(gd.photos) ? gd.photos : [])] }
        : own
      if (gd) clearLocalDraft(GUEST_KEY)
      if (d) {
        // Never overwrite what the buyer already typed while the draft was loading.
        if (Array.isArray(d.lines) && d.lines.length) { localCount = d.lines.length; setLines(prev => [...d.lines, ...prev]) }
        if (typeof d.text === 'string' && d.text) setText(t => t || d.text)
        if (d.region) { setRegion(d.region); setCity(d.city || '') }
        if (d.hours) setHours(d.hours)
        if (typeof d.needDays === 'number') setNeedDays(d.needDays)
        if (typeof d.rfqId === 'string') rfqIdRef.current = d.rfqId
        if (typeof d.notes === 'string') setNotes(d.notes)
        if (typeof d.vatRequired === 'boolean') setVatRequired(d.vatRequired)
        if (typeof d.verifiedOnly === 'boolean') setVerifiedOnly(d.verifiedOnly)
        if (typeof d.nearbyOnly === 'boolean') setNearbyOnly(d.nearbyOnly)
        if (d.tier) setTier(d.tier)
        if (typeof d.pickup === 'boolean') setPickup(d.pickup)
        if (d.geo && typeof d.geo.lat === 'number') { setGeo(d.geo); setGeoFromProfile(false) }
        if (typeof d.address === 'string') setAddress(d.address)
        const back: Photo[] = []
        for (const m of Array.isArray(d.photos) ? d.photos : []) {
          const blob = await getDraftBlob(m.id)
          if (!blob) continue
          const file = new File([blob], m.name || 'photo', { type: m.type || blob.type })
          back.push({ id: m.id, file, url: URL.createObjectURL(file), status: m.status, share: m.share !== false, confidence: m.confidence, localName: m.localName })
        }
        setPhotos(back)
        // A photo still being recognised when the buyer left: recognise it again.
        for (const ph of back) if (ph.status === 'identifying') identify(ph.id, ph.file)
      }

      // 2) reorder an earlier request, or continue a saved draft: added to the unsent list, never replacing it (UX-083)
      const qs = new URLSearchParams(window.location.search)
      const fromId = qs.get('from'), dId = qs.get('draft')
      let added = 0
      if (fromId) {
        const { data: r } = await supabase.from('rfqs').select('*').eq('id', fromId).eq('contractor_id', user.id).single()
        if (r) {
          const all: any[] = Array.isArray(r.items) && r.items.length ? r.items
            : r.product_name ? [{ sector: r.sector, product_name: r.product_name, specification: r.specification, quantity: r.quantity, unit: r.unit }] : []
          // «اطلب مرة أخرى» from a partly awarded deal sends only that supplier's items: &items=0,2 (round-4 UX-131)
          const pick = (qs.get('items') || '').split(',').map(x => parseInt(x, 10)).filter(n => Number.isInteger(n) && n >= 0 && n < all.length)
          const idx = pick.length ? Array.from(new Set(pick)) : all.map((_, i) => i)
          const its: any[] = idx.map(i => all[i])
          added = its.length
          const back = its.map(lineFromItem)
          // the per-item budgets (owner-only table) come back too (round-2 UX-040), matched by the original index
          try {
            const { data: bs } = await supabase.from('rfq_item_budgets').select('item_index, budget_unit_price, budget_visible').eq('rfq_id', fromId)
            for (const b of bs || []) {
              const ln = back[idx.indexOf(Number(b.item_index))]
              if (ln && Number(b.budget_unit_price) > 0) { ln.budget = String(budgetShown(Number(b.budget_unit_price))); ln.budgetVisible = !!b.budget_visible }
            }
          } catch { /* optional */ }
          setLines(prev => [...prev, ...back])
          const md = Number(its.find((x: any) => Number(x?.max_days) > 0)?.max_days)
          if (md > 0) setNeedDays(md)
          if (r.region && r.region !== 'كل المناطق') { setRegion(r.region); setCity(r.city || '') }
          if (r.notes) setNotes(r.notes)
          setVatRequired(!!r.vat_invoice_required); setVerifiedOnly(!!r.verified_only)
          if (typeof r.nearby_only === 'boolean') setNearbyOnly(r.nearby_only)
          setTier(Array.isArray(r.target_tiers) && r.target_tiers.length === 1 ? r.target_tiers[0] : 'all'); setPickup(r.delivery_required === false)
          // the precise delivery point lives in rfq_private (owner only)
          try {
            const { data: pv } = await supabase.from('rfq_private').select('delivery_location, delivery_geo').eq('rfq_id', fromId).maybeSingle()
            const g = String(pv?.delivery_geo || '').split(',').map(Number)
            if (g.length === 2 && g.every(n => isFinite(n))) { setGeo({ lat: g[0], lng: g[1] }); setGeoFromProfile(false) }
            if (pv?.delivery_location) setAddress(String(pv.delivery_location))
          } catch {}
        }
      } else if (dId) {
        const { data: dr } = await supabase.from('rfq_drafts').select('*').eq('id', dId).single()
        const dd: any = dr?.data
        if (dd) {
          setDraftId(dr.id)
          if (Array.isArray(dd.items)) { added = dd.items.length; setLines(prev => [...prev, ...dd.items.map(lineFromItem)]) }
          // a recurring list is a starting point: sending a request from it never deletes it (round-4 UX-187)
          if (dd.is_template) setDraftId(null)
          if (dd.region) { setRegion(dd.region); setCity(dd.city || '') }
          if (dd.notes) setNotes(dd.notes)
          setVatRequired(!!dd.vatRequired); setVerifiedOnly(!!dd.verifiedOnly); if (dd.tier) setTier(dd.tier); setPickup(dd.deliveryRequired === false)
          if (typeof dd.nearbyOnly === 'boolean') setNearbyOnly(dd.nearbyOnly)
          // the offer window, the delivery date and the delivery point come back too (round-4 UX-092)
          if (typeof dd.hours === 'number' && dd.hours > 0) setHours(dd.hours)
          if (typeof dd.needDays === 'number' || dd.needDays === null) setNeedDays(dd.needDays)
          if (dd.geo && typeof dd.geo.lat === 'number' && typeof dd.geo.lng === 'number') { setGeo({ lat: dd.geo.lat, lng: dd.geo.lng }); setGeoFromProfile(false) }
          if (typeof dd.address === 'string') setAddress(dd.address)
        }
      }
      if (fromId || dId) {
        window.history.replaceState(null, '', '/contractor/rfq/quick')
        if (added && localCount) setInfo(L(
          `We added the earlier request's items to your current unsent request (${added} items).`,
          `پچھلی درخواست کی اشیاء آپ کی موجودہ غیر ارسال شدہ درخواست میں شامل کر دی گئیں (${added})۔`,
          `أضفنا مواد الطلب السابق إلى طلبك الحالي غير المُرسل (${arMaterials(added)}).`))
      }
      setRestored(true)
    })()
    setCanListen(typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // «مواقعي السابقة» (UX-195): the delivery points of the buyer's last requests, from rfq_private
  async function loadPastPlaces(supabase: any, uid: string) {
    try {
      const { data: rs } = await supabase.from('rfqs').select('id, region, city').eq('contractor_id', uid).eq('delivery_required', true).order('created_at', { ascending: false }).limit(15)
      const ids = (rs || []).map((r: any) => r.id)
      if (!ids.length) return
      const { data: pv } = await supabase.from('rfq_private').select('rfq_id, delivery_location, delivery_geo').in('rfq_id', ids)
      const byId: Record<string, any> = {}
      for (const r of rs || []) byId[r.id] = r
      const seen = new Set<string>()
      const out: { label: string; geo: { lat: number; lng: number } | null; address: string; region: string; city: string }[] = []
      for (const id of ids) {
        const v = (pv || []).find((x: any) => x.rfq_id === id)
        if (!v || (!v.delivery_geo && !v.delivery_location)) continue
        const g = String(v.delivery_geo || '').split(',').map(Number)
        const gg = g.length === 2 && g.every((n: number) => isFinite(n)) ? { lat: g[0], lng: g[1] } : null
        const k = gg ? `${gg.lat.toFixed(3)},${gg.lng.toFixed(3)}` : String(v.delivery_location).trim()
        if (seen.has(k)) continue
        seen.add(k)
        const r = byId[id] || {}
        out.push({ label: String(v.delivery_location || '').trim().slice(0, 40) || [r.city, r.region].filter(Boolean).join('، '), geo: gg, address: String(v.delivery_location || ''), region: r.region || '', city: r.city || '' })
        if (out.length >= 4) break
      }
      setPastPlaces(out)
    } catch { /* optional */ }
  }

  // «طلبتَها سابقاً» (round-2 UX-167): catalog materials from the buyer's last 20 requests, newest first
  async function loadPastItems(supabase: any, uid: string) {
    try {
      const { data: rs } = await supabase.from('rfqs').select('items, product_name, sector').eq('contractor_id', uid).order('created_at', { ascending: false }).limit(20)
      const out: { name: string; sector: string }[] = []
      const seen = new Set<string>()
      for (const r of rs || []) {
        const its: any[] = Array.isArray(r.items) && r.items.length ? r.items : r.product_name ? [{ product_name: r.product_name, sector: r.sector }] : []
        for (const it of its) {
          const n = String(it?.product_name || '').trim()
          if (!n || seen.has(n) || !CATALOG_NAMES.has(n)) continue
          seen.add(n); out.push({ name: n, sector: it.sector || r.sector || 'supply_store' })
          if (out.length >= 8) break
        }
        if (out.length >= 8) break
      }
      setPastItems(out)
    } catch { /* optional */ }
  }

  // Auto-save on this device so going to another page never loses the list.
  useEffect(() => {
    if (!restored || (!userId && !guest) || done) return
    const t = setTimeout(() => saveLocalDraft(userId ? 'quick:' + userId : GUEST_KEY, {
      text, lines, region, city, hours, needDays, rfqId: rfqIdRef.current, notes, vatRequired, verifiedOnly, nearbyOnly, tier, pickup, geo, address,
      photos: photos.map(p => ({ id: p.id, name: p.file.name, type: p.file.type, status: p.status, share: p.share, confidence: p.confidence, localName: p.localName })),
    }), 300)
    return () => clearTimeout(t)
  }, [restored, userId, guest, done, text, lines, region, city, hours, needDays, notes, vatRequired, verifiedOnly, nearbyOnly, tier, pickup, geo, address, photos])

  // the success screen: the usual time to a first offer, and a gold banner when one arrives (round-4 UX-186)
  useEffect(() => {
    if (!sent?.id) return
    const supabase = createClient()
    supabase.rpc('get_rfq_activity', { p_rfq_id: sent.id }).then(({ data }: any) => {
      const h = Number(data?.typical_first_offer_hours)
      setFirstHours(h > 0 ? h : null)
    }, () => {})
    let ch: any
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      // per-user filtered subscription (the reliable pattern)
      ch = supabase.channel(realtimeTopic(`quick-sent-${sent.id}-${session.user.id}`))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload: any) => {
          const n = payload.new
          if (n && JSON.stringify(n.data || {}).includes(sent.id)) setFirstOffer(true)
        })
        .subscribe()
    })
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [sent?.id])

  // the floating assistant hides while the send bar is on screen (UX-006)
  const hasBar = lines.length > 0 && !done
  useEffect(() => {
    if (hasBar) document.body.dataset.actionbar = '1'
    else delete document.body.dataset.actionbar
    return () => { delete document.body.dataset.actionbar }
  }, [hasBar])

  // the status line after adding goes away by itself
  useEffect(() => { if (!info) { setInfoWarn(false); return } const t = setTimeout(() => setInfo(''), 7000); return () => clearTimeout(t) }, [info])

  // the review dialog: Escape closes, focus starts inside (UX-174)
  useEffect(() => {
    if (!confirming) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sendingRef.current) setConfirming(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming])

  function startOver() {
    deleteDraftBlobs([...photos.map(p => p.id), ...lines.map(l => l.fileId).filter(Boolean) as string[], ...lines.flatMap(l => (l.moreFiles || []).map(m => m.id))])
    if (userId) clearLocalDraft('quick:' + userId)
    setLines([]); setPhotos([]); setText(''); setNotes(''); setError(''); setErrKey(null); setErrField(null); rfqIdRef.current = ''
    setDraftId(null) // «ابدأ من جديد» must never delete the saved draft it was opened from (round-2 UX-136)
  }

  // «احفظ كمسودة» (round-4 UX-092) and «احفظ كقائمة متكرّرة» (UX-187): saved to rfq_drafts so the list opens on
  // any device. Files still on this device are not uploaded here; attachments of an earlier request (links) are kept.
  // a visitor: the list stays on this device; the account is created at the moment of sending (round-4 UX-056)
  async function askToSignUp() {
    const ok = await askConfirm(L('Create your account with your mobile number to send the request. You will not lose your list.', 'درخواست بھیجنے کے لیے اپنے موبائل نمبر سے اکاؤنٹ بنائیں۔ آپ کی فہرست محفوظ رہے گی۔', 'أنشئ حسابك برقم جوالك لإرسال الطلب، ولن تفقد قائمتك.'))
    if (!ok) return
    saveLocalDraft(GUEST_KEY, {
      text, lines, region, city, hours, needDays, notes, pickup, geo, address,
      photos: photos.map(p => ({ id: p.id, name: p.file.name, type: p.file.type, status: p.status, share: p.share, confidence: p.confidence, localName: p.localName })),
    })
    window.location.href = '/register?next=' + encodeURIComponent('/contractor/rfq/quick')
  }

  async function saveDraft(template: boolean) {
    if (guest) { askToSignUp(); return }
    if (!userId || savingDraft) return
    const keep = lines.filter(l => l.product_name.trim())
    if (!keep.length) { showError(L('Add at least one item.', 'کم از کم ایک چیز شامل کریں۔', 'أضف مادة واحدة على الأقل.'), undefined, true); return }
    if (template && !tplName.trim()) { showError(L('Write a name for the list.', 'فہرست کا نام لکھیں۔', 'اكتب اسماً للقائمة.'), undefined, true); return }
    setSavingDraft(true)
    try {
      const items = keep.map(l => {
        const specsObj: Record<string, string> = {}
        for (const [k, v] of Object.entries(l.specs || {})) if ((v || '').trim()) specsObj[k] = v.trim()
        return {
          sector: l.sector, product_name: l.product_name.trim(), sub_category: lineSub(l),
          specification: [specText(l.product_name, l.specs), l.details.trim()].filter(Boolean).join(' — '),
          ...((l.brand || '').trim() ? { brand: l.brand!.trim().slice(0, 80) } : {}),
          ...(l.with_install ? { with_install: true } : {}),
          quantity: parseFloat(l.quantity) || null, unit: l.unit, specsObj,
          ...(l.spec ? { spec: l.spec } : {}),
          ...(l.prevFiles?.length ? { prevFiles: l.prevFiles } : {}),
          custom: !CATALOG_NAMES.has(l.product_name.trim()),
        }
      })
      const data: any = { items, region, city, notes, vatRequired, verifiedOnly, tier, deliveryRequired: !pickup, nearbyOnly, hours, needDays, geo, address, ...(template ? { is_template: true } : {}) }
      const first = nameLabel(items[0].product_name)
      const title = template ? tplName.trim().slice(0, 60) : (items.length > 1 ? `${first} +${items.length - 1}` : first).slice(0, 80)
      const sb = createClient()
      let err: any = null
      if (!template && draftId) {
        const { error: e } = await sb.from('rfq_drafts').update({ title, data, updated_at: new Date().toISOString() }).eq('id', draftId); err = e
      } else {
        const { data: row, error: e } = await sb.from('rfq_drafts').insert({ contractor_id: userId, title, data }).select('id').single(); err = e
        if (!e && row && !template) setDraftId(row.id)
      }
      if (err) { showError(L('Could not save. Check your connection and try again.', 'محفوظ نہیں ہو سکا۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر الحفظ. تحقّق من اتصالك وحاول مرة أخرى.')); return }
      setInfoWarn(false)
      if (template) { setTplOpen(false); setTplName('') }
      setInfo(template
        ? L('The list was saved; you will find it under «My lists» on your home page.', 'فہرست محفوظ ہو گئی؛ یہ آپ کے ہوم پیج پر «میری فہرستیں» میں ملے گی۔', 'حُفظت القائمة، تجدها في «قوائمي» في لوحتك.')
        : L('The draft was saved; you will find it on your home page.', 'مسودہ محفوظ ہو گیا؛ یہ آپ کے ہوم پیج پر ملے گا۔', 'حُفظت المسودة، تجدها في لوحتك.'))
    } catch {
      showError(L('Could not save. Check your connection and try again.', 'محفوظ نہیں ہو سکا۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر الحفظ. تحقّق من اتصالك وحاول مرة أخرى.'))
    } finally { setSavingDraft(false) }
  }

  // a line the buyer finished is folded into one row when the next material comes in (UX-174)
  const complete = (l: Line) => !!(l.product_name.trim() && parseFloat(l.quantity) > 0 && l.unit) && !l.review?.length
    && (simple || !missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length)
  const foldDone = (prev: Line[]) => prev.map(l => (!l.done && complete(l) ? { ...l, done: true } : l))

  // 🎤 Speech to text (browser built-in). The transcript is appended to the text box and, when the
  // buyer stops, turned into lines at once (UX-064).
  function toggleMic() {
    if (listening) { try { recRef.current?.stop() } catch {} ; return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setMicError('')
    heardRef.current = false
    const rec = new SR()
    rec.lang = locale === 'en' ? 'en-US' : locale === 'ur' ? 'ur-PK' : 'ar-SA'
    rec.interimResults = false
    rec.continuous = true
    rec.onresult = (e: any) => {
      let said = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript + '، '
      if (said) {
        heardRef.current = true
        setText(t => { const v = (t ? t.replace(/\s*$/, '') + '، ' : '') + said.replace(/،\s*$/, ''); textRef.current = v; return v })
      }
    }
    rec.onend = () => {
      setListening(false)
      if (heardRef.current) { heardRef.current = false; setTimeout(() => parseText(textRef.current), 50) }
    }
    rec.onerror = (e: any) => {
      setListening(false)
      const code = e?.error
      if (code === 'aborted') return
      setMicError(code === 'not-allowed' || code === 'service-not-allowed'
        ? L('Microphone access was not allowed. Enable it in the browser settings, or write your request.', 'مائیکروفون کی اجازت نہیں دی گئی۔ براؤزر کی ترتیبات میں فعال کریں یا درخواست لکھیں۔', 'لم تسمح باستخدام الميكروفون. فعّله من إعدادات المتصفح، أو اكتب طلبك.')
        : code === 'no-speech'
          ? L('We did not hear anything. Tap «Say it» and speak clearly.', 'کچھ سنائی نہیں دیا۔ «بولیں» دبائیں اور صاف بولیں۔', 'لم نسمع شيئاً. اضغط «تحدّث» وتكلّم بوضوح.')
          : L('The microphone could not start. Write your request instead.', 'مائیکروفون شروع نہیں ہو سکا۔ درخواست لکھیں۔', 'تعذّر تشغيل الميكروفون. اكتب طلبك بدلاً من ذلك.'))
    }
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  const sessionMsg = () => L('Your session has ended. Sign in again; your list stays saved.', 'آپ کا سیشن ختم ہو گیا۔ دوبارہ سائن ان کریں؛ آپ کی فہرست محفوظ رہے گی۔', 'انتهت جلستك. سجّل الدخول من جديد، وستبقى قائمتك محفوظة.')
  // the review flags of a line, as the buyer reads them (older drafts may still hold plain text)
  const reviewText = (k: string) => k === 'qty_missing' ? L('Enter the quantity', 'مقدار لکھیں', 'أدخل الكمية')
    : k === 'qty_guess' ? L('The quantity is a guess, check it', 'مقدار اندازہ ہے، چیک کریں', 'الكمية مقترحة، تأكّد منها')
    : k === 'unit_guess' ? L('The unit is a suggestion, check it', 'یونٹ تجویز ہے، چیک کریں', 'الوحدة مقترحة، تأكّد منها') : k

  async function parseText(input?: string) {
    const src = (input ?? text).trim()
    if (!src) return
    setParsing(true); setError(''); setErrKey(null); setInfo('')
    try {
      const r = await fetch('/api/quick-request/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: src }) })
      // an expired session: never the raw «unauthorized» (round-2 UX-136); the list stays saved on this device
      if (r.status === 401) { showError(sessionMsg()); return }
      const j = await r.json()
      if (!r.ok) {
        showError(r.status === 429
          ? L('You have read many lists in the last hour. Try again a little later; your list stays saved.', 'آپ نے پچھلے گھنٹے میں بہت سی فہرستیں پڑھوائیں۔ تھوڑی دیر بعد دوبارہ کوشش کریں؛ فہرست محفوظ ہے۔', 'قرأت قوائم كثيرة خلال الساعة الأخيرة. حاول بعد قليل، وستبقى قائمتك محفوظة.')
          : L('Could not read the list. Try again.', 'فہرست نہیں پڑھ سکے۔ دوبارہ کوشش کریں۔', 'تعذّرت قراءة القائمة. حاول مرة أخرى.'))
        return
      }
      const add: Line[] = (j.items || []).filter((it: any) => it?.product_name).map((it: any) => {
        const flags: string[] = Array.isArray(it.flags) ? it.flags : []
        const review: string[] = []
        if (flags.includes('quantity_missing')) review.push('qty_missing')
        else if (flags.includes('quantity_implied')) review.push('qty_guess')
        if (flags.includes('unit_default') || flags.includes('unit_missing')) review.push('unit_guess')
        const specs = it.specs && Object.keys(it.specs).length ? it.specs : undefined
        const ln: Line = {
          key: uid(), product_name: it.product_name, sector: it.sector,
          quantity: it.quantity ? String(it.quantity) : '', unit: it.unit || '', details: it.details || '',
          suggestion: it.suggestion || null,
          // spec fields recognised in what was written («حديد 12 ملم» → القطر: 12 مم)
          ...(specs ? { specs } : {}),
          original: it.input_name && it.input_name !== it.product_name ? it.input_name : undefined,
          ...(review.length ? { review } : {}),
        }
        // a complete, confirmed line is saved at once; the others stay open with the reason (UX-064)
        return { ...ln, done: !!it.in_catalog && !it.needs_review && complete(ln) }
      })
      if (!add.length) {
        // never wipe what the buyer wrote when nothing was understood
        showError(L('We did not recognise materials in the text. Write each material on its own line with its quantity.', 'متن میں سامان پہچانا نہیں جا سکا۔ ہر چیز الگ لائن میں مقدار کے ساتھ لکھیں۔', 'لم نتعرّف على مواد في النص. اكتب كل مادة في سطر مع الكمية.'))
        return
      }
      setLines(prev => [...foldDone(prev), ...add])
      setText('')
      const toCheck = add.filter(l => !l.done).length
      setInfoWarn(toCheck > 0)
      setInfo(locale === 'ar'
        ? `أضفنا ${arMaterials(add.length)}${toCheck ? `، منها ${arCount(toCheck, 'مادة واحدة تحتاج', 'مادتان تحتاجان', 'مواد تحتاج', 'مادة تحتاج')} إلى مراجعة` : ''}.`
        : L(`We added ${countLabel(add.length, 'en', arMaterials, 'item', '')}${toCheck ? `, ${toCheck} need a check` : ''}.`,
            `${add.length} اشیاء شامل کی گئیں${toCheck ? `، ${toCheck} کو چیک کریں` : ''}۔`, ''))
      setTimeout(() => document.getElementById('request-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    } catch {
      showError(L('Network error. Try again.', 'نیٹ ورک خرابی۔ دوبارہ کوشش کریں۔', 'حدثت مشكلة في الاتصال. حاول مرة أخرى.'))
    } finally { setParsing(false) }
  }

  // 📷 Each photo becomes a line. The AI suggests a name; the buyer can edit it, and chooses
  // whether suppliers get the photo itself.
  async function addPhotos(files: FileList | null) {
    if (!files) return
    if (files.length > 6) setInfo(L('You can add 6 photos at a time; the first 6 were added.', 'ایک وقت میں 6 تصاویر شامل کی جا سکتی ہیں؛ پہلی 6 شامل کر دی گئیں۔', 'يمكنك إضافة 6 صور في المرة الواحدة، وقد أُضيفت أول 6 صور.'))
    for (const file of Array.from(files).slice(0, 6)) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 6 * 1024 * 1024) {
        showError(L('Photos must be JPG, PNG or WEBP and under 6 MB.', 'تصویر JPG، PNG یا WEBP اور 6 میگا بائٹ سے کم ہو۔', 'يجب أن تكون الصورة بصيغة JPG أو PNG أو WEBP وأقل من 6 ميجابايت.'))
        continue
      }
      const id = uid()
      const url = URL.createObjectURL(file)
      putDraftBlob(id, file)
      setPhotos(prev => [...prev, { id, file, url, status: 'identifying', share: true }])
      setLines(prev => [...foldDone(prev), { key: uid(), product_name: '', sector: 'supply_store', quantity: '', unit: 'حبة', details: '', photoId: id }])
      identify(id, file)
    }
  }

  function identify(id: string, file: File) {
    const fd = new FormData(); fd.append('image', file); fd.append('locale', locale)
    // a stuck request must not hold the send button forever: give up after 45 s (the line can be retried)
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = ac ? setTimeout(() => ac.abort(), 45000) : null
    fetch('/api/quick-request/identify', { method: 'POST', body: fd, signal: ac?.signal })
      .finally(() => { if (timer) clearTimeout(timer) })
      .then(r => {
        // say why instead of a silent failure (UX-133)
        if (r.status === 401) showError(sessionMsg())
        else if (r.status === 429) showError(L('You have sent many photos in the last hour. Try again a little later, or write the material name.', 'آپ نے پچھلے گھنٹے میں بہت سی تصاویر بھیجیں۔ تھوڑی دیر بعد کوشش کریں یا سامان کا نام لکھیں۔', 'أرسلت صوراً كثيرة خلال الساعة الأخيرة. حاول بعد قليل، أو اكتب اسم المادة.'))
        return r.json()
      })
      .then(j => {
        const s = j?.suggestion
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: s ? 'done' : 'failed', confidence: s?.confidence, localName: s?.local_name || undefined, question: s?.question || undefined } : p))
        if (s) setLines(prev => prev.map(l => l.photoId === id && !l.product_name ? {
          ...l, product_name: s.product_name, sector: s.sector, details: s.details || '', unit: s.unit || l.unit, suggestion: s.catalog_suggestion || null,
          // read off the label: spec fields of the catalog item, and the brand
          ...(s.specs && Object.keys(s.specs).length ? { specs: s.specs } : {}),
          ...(s.brand && !l.brand ? { brand: String(s.brand).slice(0, 80) } : {}),
        } : l))
      })
      .catch(() => setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'failed' } : p)))
  }
  function retryIdentify(id: string) {
    const ph = photos.find(p => p.id === id)
    if (!ph) return
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'identifying' } : p))
    identify(id, ph.file)
  }

  // a home project pack: every ticked material becomes a line (saved when it has a quantity)
  function addPack(items: PackLine[]) {
    setLines(prev => [...foldDone(prev), ...items.filter(it => !prev.some(l => l.product_name === it.name)).map(it => ({
      key: uid(), product_name: it.name, sector: it.sector, quantity: it.quantity, unit: it.unit, details: '', done: parseFloat(it.quantity) > 0,
    }))])
    setPack(null)
    setTimeout(() => document.getElementById('request-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
  }

  // a material written inside a catalog section (not listed) goes to all of that section's suppliers
  function addFromCatalog({ name, sector, section, sub }: { name: string; sector: Sector; section?: string; sub?: string }) {
    const unit = getDefaultUnit(name, sector) || 'حبة'
    // «تغيير المادة»: swap the material in the same line, keep the quantity (and the unit when it still fits)
    const rk = replaceRef.current
    if (rk) {
      replaceRef.current = null; setReplaceKey(null)
      setLines(prev => prev.map(l => l.key !== rk ? l : {
        ...l, product_name: name, sector, unit: l.unit && (unitChoicesFor(name, sector) || UNITS).includes(l.unit) ? l.unit : unit,
        spec: sub ? { sector, sub } : section ? { sector, sub: null, section } : undefined,
        specs: undefined, suggestion: null, photoWarn: undefined, original: undefined,
      }))
      setShowCatalog(false)
      setTimeout(() => focusLine(rk), 150)
      return
    }
    // a home buyer picking a piece item gets «1» at once, changed with «− 1 +» on the tile (UX-189)
    const one = simple && COUNT_UNITS.includes(unit) && CATALOG_NAMES.has(name)
    setLines(prev => [...foldDone(prev), { key: uid(), product_name: name, sector, quantity: one ? '1' : '', unit, details: '', ...(one ? { done: true } : {}), ...(sub ? { spec: { sector, sub } } : section ? { spec: { sector, sub: null, section } } : {}) }])
  }

  // AI check (free tier, warning only) that an attached photo shows the line's material
  async function checkLinePhoto(key: string, file: File, product: string) {
    try {
      const bmp = await createImageBitmap(file)
      const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      const base64 = c.toDataURL('image/jpeg', 0.7).split(',')[1]
      const r = await fetch('/api/check-photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product, image: { base64, mime: 'image/jpeg' } }) })
      const j = await r.json().catch(() => null)
      if (j?.match === false) {
        const seen = j.seen ? L(` (it looks like: ${j.seen})`, ` (یہ لگتا ہے: ${j.seen})`, ` (تبدو: ${j.seen})`) : ''
        setLines(prev => prev.map(l => l.key === key ? { ...l, photoWarn: L(`The photo does not seem to be of «${product}»${seen}. Please check it.`, `لگتا ہے یہ تصویر «${product}» کی نہیں${seen}۔ براہ کرم چیک کریں۔`, `يبدو أن الصورة ليست لـ «${product}»${seen}. تأكّد منها.`) } : l))
      }
    } catch { /* no warning when the check cannot run */ }
  }

  // 📎 a drawing or specification file for one line (PDF or image, up to 10 MB)
  function attachFile(key: string, file: File | undefined) {
    if (!file) return
    if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      showError(L('Files must be PDF, JPG, PNG or WEBP and under 10 MB.', 'فائل PDF یا تصویر اور 10 میگا بائٹ سے کم ہو۔', 'يجب أن يكون الملف PDF أو صورة وأقل من 10 ميجابايت.'), key)
      return
    }
    const id = uid()
    putDraftBlob(id, file)
    const owner = lines.find(l => l.key === key)
    if (/^image\//.test(file.type) && owner?.product_name?.trim()) checkLinePhoto(key, file, nameLabel(owner.product_name) || owner.product_name)
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l
      if (fileCount(l) >= MAX_FILES) { deleteDraftBlobs([id]); return l }
      // a new photo replaces the old «this photo does not look like…» warning (round-2 UX-136)
      if (!l.fileId) return { ...l, fileId: id, fileName: file.name, photoWarn: undefined }
      return { ...l, moreFiles: [...(l.moreFiles || []), { id, name: file.name }], photoWarn: undefined }
    }))
  }
  // several files picked at once: attach what fits and say how many were left out (round-2 UX-044)
  function attachFiles(key: string, files: File[]) {
    const owner = lines.find(l => l.key === key)
    if (!owner || !files.length) return
    const room = Math.max(0, MAX_FILES - fileCount(owner))
    files.slice(0, room).forEach(f => attachFile(key, f))
    const left = files.length - room
    if (left > 0) showError(L(`You can attach up to ${MAX_FILES} files per item; ${left} not added.`, `ہر چیز کے ساتھ زیادہ سے زیادہ ${MAX_FILES} فائلیں لگ سکتی ہیں؛ ${left} شامل نہیں ہوئیں۔`, `يمكن إرفاق ${MAX_FILES} ملفات لكل مادة كحدّ أقصى؛ لم ${left === 1 ? 'يُضَف ملف واحد' : left === 2 ? 'يُضَف ملفان' : `تُضَف ${left} ملفات`}.`), key)
  }

  function changeMaterial(key: string) {
    replaceRef.current = key; setReplaceKey(key)
    setInfoWarn(false)
    setInfo(L('Choose the new material from the guide; it replaces this one and keeps the quantity.', 'فہرست سے نیا سامان منتخب کریں؛ یہ اسی لائن میں مقدار کے ساتھ بدل جائے گا۔', 'اختر المادة الجديدة من الدليل، وستحلّ محلّ هذه المادة مع الإبقاء على الكمية.'))
    addMore()
  }
  function addMore() {
    // the guide already on the page (desktop, or the phone guide of a home buyer): go to it, never a second copy (round-4 UX-121)
    const box = typeof window !== 'undefined' ? [document.getElementById('catalog-inline'), document.getElementById('catalog-inline-m')].find(b => b && b.offsetParent !== null) || null : null
    if (box) {
      box.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => (box.querySelector('input') as HTMLInputElement | null)?.focus(), 350)
    } else setShowCatalog(true)
  }
  // after the catalog sheet closes, show the list so the buyer sees what was added
  function closeCatalog() {
    setShowCatalog(false)
    replaceRef.current = null; setReplaceKey(null)
    setStartQ('') // the next opening starts fresh, not on the old search (round-2 UX-136)
    setTimeout(() => document.getElementById('request-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))
    if (key === errKey) { setError(''); setErrKey(null) }
  }
  function dropBlobs(l: Line) {
    const ids = [l.fileId, ...(l.moreFiles || []).map(m => m.id), l.photoId].filter(Boolean) as string[]
    if (ids.length) deleteDraftBlobs(ids)
  }
  // removing a line can be undone for 5 seconds (UX-063/174); its files are deleted only after that
  function removeLine(key: string) {
    const index = lines.findIndex(x => x.key === key)
    const l = lines[index]
    if (!l) return
    const photo = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
    if (undo) dropBlobs(undo.line)
    setLines(prev => prev.filter(x => x.key !== key))
    if (photo) setPhotos(prev => prev.filter(p => p.id !== photo.id))
    if (key === errKey) { setError(''); setErrKey(null) }
    const u = { line: l, index, photo }
    setUndo(u)
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => { dropBlobs(u.line); setUndo(cur => (cur === u ? null : cur)) }, 5000)
  }
  function undoRemove() {
    if (!undo) return
    clearTimeout(undoTimer.current)
    const { line, index, photo } = undo
    setLines(prev => { const next = [...prev]; next.splice(Math.min(index, next.length), 0, line); return next })
    if (photo) setPhotos(prev => [...prev, photo])
    setUndo(null)
  }

  // a photo line whose recognition failed and still has no name does not block the request: it is
  // left out (shown as such) until the buyer retries, names it or removes it
  const photoFailed = (l: Line) => !!l.photoId && !l.product_name.trim() && photos.find(p => p.id === l.photoId)?.status === 'failed'
  const sendable = lines.filter(l => !photoFailed(l))
  const skipped = lines.length - sendable.length
  const identifying = photos.some(p => p.status === 'identifying')
  const lineOk = (l: Line) => !!(l.product_name.trim() && parseFloat(l.quantity) > 0 && l.unit)
  const l2n = (l: Line) => nameLabel(l.product_name.trim()).slice(0, 40)
  // the first thing that keeps the request from going, with the line it is on (UX-007)
  function firstProblem(): Problem | null {
    if (!sendable.length) return { msg: L('Add at least one item.', 'کم از کم ایک چیز شامل کریں۔', 'أضف مادة واحدة على الأقل.'), hint: L('Add at least one item', 'کم از کم ایک چیز شامل کریں', 'أضف مادة واحدة على الأقل') }
    const noName = sendable.find(l => !l.product_name.trim())
    if (noName) return { key: noName.key, msg: L('Write the name of this item.', 'اس چیز کا نام لکھیں۔', 'اكتب اسم هذه المادة.'), hint: L('Write the name of every item', 'ہر چیز کا نام لکھیں', 'اكتب اسم كل مادة') }
    const noQty = sendable.find(l => !(parseFloat(l.quantity) > 0))
    if (noQty) return { key: noQty.key, msg: L(`Enter the quantity of «${l2n(noQty)}».`, `«${l2n(noQty)}» کی مقدار لکھیں۔`, `أدخل كمية «${l2n(noQty)}».`), hint: L(`Enter the quantity of «${l2n(noQty)}»`, `«${l2n(noQty)}» کی مقدار لکھیں`, `أدخل كمية «${l2n(noQty)}»`) }
    const noUnit = sendable.find(l => !l.unit)
    if (noUnit) return { key: noUnit.key, msg: L(`Choose the unit of «${l2n(noUnit)}».`, `«${l2n(noUnit)}» کی یونٹ منتخب کریں۔`, `اختر وحدة «${l2n(noUnit)}».`), hint: L(`Choose the unit of «${l2n(noUnit)}»`, `«${l2n(noUnit)}» کی یونٹ منتخب کریں`, `اختر وحدة «${l2n(noUnit)}»`) }
    // materials priced by size/grade need their specs (owner 2026-10-27)
    const noSpec = simple ? undefined : sendable.find(l => missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length)
    if (noSpec) {
      const m = missingSpecs(noSpec.product_name, noSpec.sector as any, noSpec.specs, noSpec.details, !!noSpec.fileId, locale)
      return {
        key: noSpec.key,
        msg: m[0] === '*'
          ? L(`Write the size/specs of «${l2n(noSpec)}» so suppliers can price it.`, `«${l2n(noSpec)}» کا سائز/تفصیل لکھیں تاکہ سپلائرز قیمت دے سکیں۔`, `اكتب مقاس «${l2n(noSpec)}» ومواصفاته ليتمكن الموردون من تسعيره.`)
          : L(`Choose the specs of «${l2n(noSpec)}» (${m.join(', ')}) so suppliers can price it.`, `«${l2n(noSpec)}» کی تفصیلات منتخب کریں (${m.join('، ')})۔`, `اختر مواصفات «${l2n(noSpec)}» (${m.join('، ')}) ليتمكن الموردون من تسعيره.`),
        hint: L(`Choose the specs of «${l2n(noSpec)}»`, `«${l2n(noSpec)}» کی تفصیلات منتخب کریں`, `اختر مواصفات «${l2n(noSpec)}»`),
      }
    }
    // an item written by hand needs at least its main section (owner 2026-10-24)
    const lost = sendable.find(l => !CATALOG_NAMES.has(l.product_name.trim()) && (l.spec ? !choiceDone(l.spec) : !detectSubCategory(l.product_name, l.sector as any)))
    if (lost) return { key: lost.key, msg: L(`Choose the section of «${l2n(lost)}» so it reaches the right suppliers.`, `«${l2n(lost)}» کا شعبہ منتخب کریں تاکہ صحیح سپلائرز تک پہنچے۔`, `اختر قسم «${l2n(lost)}» ليصل إلى الموردين المختصين.`), hint: L(`Choose the section of «${l2n(lost)}»`, `«${l2n(lost)}» کا شعبہ منتخب کریں`, `اختر قسم «${l2n(lost)}»`) }
    if (!region) return { field: 'region', msg: L('Choose your region.', 'اپنا علاقہ منتخب کریں۔', 'اختر منطقتك.'), hint: L('Choose the region', 'علاقہ منتخب کریں', 'حدّد المنطقة') }
    if (!pickup && !geo && !address.trim()) return { field: 'location', msg: L('Set the delivery location: use your current location, paste a Google Maps link, or write the address.', 'ڈیلیوری کا مقام بتائیں: موجودہ مقام استعمال کریں، Google Maps کا لنک پیسٹ کریں، یا پتہ لکھیں۔', 'حدّد موقع التوصيل: باستخدام موقعك الحالي، أو بلصق رابط خرائط Google، أو بكتابة العنوان.'), hint: L('Set the delivery location', 'ڈیلیوری کا مقام بتائیں', 'حدّد موقع التوصيل') }
    return null
  }
  const problem = firstProblem()
  const ready = !problem
  // why the request cannot go yet (shown next to the send button)
  const sendHint = sending ? ''
    : identifying ? L('Recognising the photos…', 'تصاویر پہچانی جا رہی ہیں…', 'جارٍ التعرّف على الصور…')
    : problem ? problem.hint : ''

  // the error box at the top (uploads, network) is scrolled into view so a tap never seems to do nothing
  function showError(msg: string, key?: string, soft = false) {
    setError(msg); setErrKey(key || null); setErrSoft(soft)
    setTimeout(() => {
      if (key) focusLine(key)
      else document.getElementById('quick-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
  }
  function focusLine(key: string) {
    document.getElementById('line-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlash(key)
    setTimeout(() => setFlash(f => (f === key ? null : f)), 2000)
  }

  // MSA counting: يوم واحد، يومان، 3–10 أيام; ساعات for under a day
  const durationLabel = (h: number) => {
    if (h < 24) return locale === 'en' ? `${h} hours` : locale === 'ur' ? `${h} گھنٹے` : arCount(h, 'ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة')
    const d = h / 24
    if (locale === 'en') return `${d} day${d === 1 ? '' : 's'}`
    if (locale === 'ur') return `${d} دن`
    return d === 1 ? '24 ساعة' : d === 2 ? 'يومان' : d === 7 ? 'أسبوع' : `${d} أيام`
  }
  // a home buyer never chooses the offers window: 24 h when the delivery is within a day, else 48 h (UX-080)
  const effHours = simple ? (needDays === 1 ? 24 : 48) : hours
  // a business buyer whose offer window ends after the materials are needed (round-4 UX-091)
  const windowTooLong = !simple && needDays != null && hours >= needDays * 24
  const fitHours = needDays === 1 ? 6 : needDays === 3 ? 24 : 48
  const needText = (d: number) => d === 1 ? L('a day', 'ایک دن', 'يوم') : d === 7 ? L('a week', 'ایک ہفتہ', 'أسبوع') : L(`${d} days`, `${d} دن`, `${d} أيام`)
  const windowNote = windowTooLong ? (
    <div className="rounded-xl border-2 border-[#D4A543] bg-[#D4A543]/10 px-3 py-2 space-y-1.5" role="status">
      <p className="text-[13px] font-bold text-[#0B2438]"><Glyph e="⚠" /> {L(
        `You need the materials within ${needText(needDays!)}, and the offer window is longer than that, so the offers will not reach you in time.`,
        `آپ کو سامان ${needText(needDays!)} میں چاہیے، اور آفرز کی مہلت اس سے لمبی ہے؛ اس لیے آفرز وقت پر نہیں پہنچیں گی۔`,
        `طلبتَ وصول المواد خلال ${needText(needDays!)}، ومهلة العروض أطول من ذلك؛ فلن تصلك العروض في الوقت المناسب.`)}</p>
      <button type="button" onClick={() => setHours(fitHours)} className="min-h-[44px] px-3 rounded-xl text-[13px] font-bold border border-[#0B2438]/40 bg-white text-[#0B2438]">
        {L(`Make the window ${durationLabel(fitHours)}`, `مہلت ${durationLabel(fitHours)} کریں`, `اجعل المهلة ${fitHours === 6 ? '6 ساعات' : fitHours === 24 ? '24 ساعة' : 'يومين'}`)}
      </button>
    </div>
  ) : null
  const whenText = (ms: number) => new Date(ms).toLocaleString(dateLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })

  function review() {
    if (!validate()) return
    setReach(null)
    setConfirming(true)
    previewReach()
  }

  // «سيصل طلبك إلى نحو N موردين» before sending (UX-190): an optional RPC; nothing is shown if it is missing
  async function previewReach() {
    setReachState('loading')
    const timer = setTimeout(() => setReachState(st => (st === 'loading' ? 'failed' : st)), 8000)
    try {
      const items = sendable.map(l => ({ sector: l.sector, product_name: l.product_name.trim(), sub_category: lineSub(l) }))
      const { data, error: e } = await createClient().rpc('preview_rfq_reach', {
        p_items: items, p_region: region, p_city: city || null, p_geo: pickup || !geo ? null : `${geo.lat},${geo.lng}`, p_nearby: simple || nearbyOnly,
      })
      if (!e && data && typeof data === 'object') { setReach({ reached: Number((data as any).reached) || 0, items: Array.isArray((data as any).items) ? (data as any).items : [] }); setReachState('done') }
      else setReachState('failed')
    } catch { setReachState('failed') /* optional */ } finally { clearTimeout(timer) }
  }

  function validate(): boolean {
    setError(''); setErrKey(null); setErrField(null)
    const p = firstProblem()
    if (!p) return true
    if (p.key) {
      const l = lines.find(x => x.key === p.key)
      if (l && !simple && missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length) setSpecsOpen(p.key)
      setLines(prev => prev.map(x => x.key === p.key ? { ...x, done: false } : x))
      showError(p.msg, p.key, true)
    } else if (p.field) {
      // shown under the field itself, with a gold frame (round-2 UX-041)
      setError(p.msg); setErrKey(null); setErrField(p.field)
      setTimeout(() => document.getElementById(p.field === 'region' ? 'quick-region' : 'quick-location-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    } else showError(p.msg, undefined, true)
    return false
  }

  async function send() {
    if (sendingRef.current) return // a second tap while the first send is still going
    if (!validate()) { setConfirming(false); return }
    setConfirming(false)
    if (guest || !userId) { askToSignUp(); return }
    if (!(await ensureVerified())) return // buyers browse freely; verify the mobile/email here (owner 2026-11-18)
    sendingRef.current = true
    setSending(true)
    // the review stays open while sending and shows the upload progress (round-2 UX-044)
    const totalUploads = sendable.reduce((s, l) => {
      const ph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
      return s + (l.fileId ? 1 : 0) + (l.moreFiles || []).length + (ph && ph.share ? 1 : 0)
    }, 0)
    let uploaded = 0
    const tick = () => { uploaded++; setUpload({ done: uploaded, total: totalUploads }) }
    if (totalUploads) setUpload({ done: 0, total: totalUploads })
    setConfirming(true)
    let sentOk = false
    const supabase = createClient()
    if (!rfqIdRef.current) {
      rfqIdRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16) })
      if (userId) { const d = loadLocalDraft<any>('quick:' + userId); if (d) saveLocalDraft('quick:' + userId, { ...d, rfqId: rfqIdRef.current }) }
    }
    try {
      const items: any[] = []
      for (let i = 0; i < sendable.length; i++) {
        const l = sendable[i]
        const ph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
        let photoUrl: string | null = null
        let fileUrl: string | null = null
        if (l.fileId) {
          const rawBlob = await getDraftBlob(l.fileId)
          const blob = rawBlob && await (await import('@/lib/compressImage')).compressImage(rawBlob) // lighter photos
          if (blob) {
            const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
            const { data: up } = await supabase.storage.from('licenses').upload(`${userId}/spec-${Date.now()}-${i}.${ext}`, blob, { upsert: false, contentType: blob.type })
            if (!up) { showError(L(`Could not upload the attachment of «${nameLabel(l.product_name)}». Check your connection and try again, or remove the attachment.`, `«${nameLabel(l.product_name)}» کی فائل اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں یا فائل ہٹا دیں۔`, `تعذّر رفع مرفق «${nameLabel(l.product_name)}». تحقّق من الاتصال وحاول مرة أخرى، أو احذف المرفق.`), l.key); return }
            fileUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
          }
          tick()
        }
        const attachments: { url: string; name: string }[] = []
        for (const [k, mf] of (l.moreFiles || []).entries()) {
          const rawBlob = await getDraftBlob(mf.id)
          const blob = rawBlob && await (await import('@/lib/compressImage')).compressImage(rawBlob)
          if (!blob) continue
          const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
          const { data: up } = await supabase.storage.from('licenses').upload(`${userId}/spec-${Date.now()}-${i}-${k + 2}.${ext}`, blob, { upsert: false, contentType: blob.type })
          if (!up) { showError(L(`Could not upload «${mf.name}». Try again, or remove it.`, `«${mf.name}» اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں یا ہٹا دیں۔`, `تعذّر رفع «${mf.name}». حاول مرة أخرى، أو احذفه.`), l.key); return }
          attachments.push({ url: supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl, name: mf.name })
          tick()
        }
        // files carried from the earlier request are already uploaded: sent as they are
        const prevF = l.prevFiles || []
        if (!fileUrl && !photoUrl && prevF.length) {
          fileUrl = prevF[0].url
          for (const pf of prevF.slice(1)) attachments.push({ url: pf.url, name: pf.name || 'مرفق' })
        } else for (const pf of prevF) attachments.push({ url: pf.url, name: pf.name || 'مرفق' })
        if (ph && ph.share) {
          const phFile = await (await import('@/lib/compressImage')).compressImage(ph.file)
          const ext = phFile.type === 'image/png' ? 'png' : phFile.type === 'image/webp' ? 'webp' : 'jpg'
          const path = `${userId}/photo-${Date.now()}-${i}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, phFile, { upsert: false, contentType: phFile.type })
          if (!up) { showError(L(`Could not upload the photo of «${nameLabel(l.product_name)}». Try again, or untick «send the photo».`, `«${nameLabel(l.product_name)}» کی تصویر اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔`, `تعذّر رفع صورة «${nameLabel(l.product_name)}». حاول مرة أخرى، أو ألغِ خيار إرسال الصورة.`), l.key); return }
          photoUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
          tick()
        }
        const st = specText(l.product_name, l.specs)
        const specsObj: Record<string, string> = {}
        for (const [k, v] of Object.entries(l.specs || {})) if ((v || '').trim()) specsObj[k] = v.trim()
        items.push({
          sector: l.sector,
          product_name: l.product_name.trim(),
          sub_category: lineSub(l),
          specification: withBrand([st, l.details.trim()].filter(Boolean).join(' — '), l.brand),
          ...((l.brand || '').trim() ? { brand: l.brand!.trim().slice(0, 80) } : {}),
          ...(wantsInstall(l) ? { with_install: true } : {}),
          quantity: parseFloat(l.quantity),
          unit: l.unit,
          supplier_tiers: null, in_stock: false, max_days: needDays, specsObj,
          spec_file_url: fileUrl || photoUrl,
          // stored in Arabic whatever the buyer's language: suppliers read them (UX-133)
          spec_file_name: fileUrl ? (l.fileName || (l.prevFiles?.[0]?.url === fileUrl ? l.prevFiles[0].name : '') || 'مرفق') : photoUrl ? 'صورة المادة' : null,
          photo_url: photoUrl || (fileUrl && (isImageName(l.fileName) || (!l.fileId && /\.(jpe?g|png|webp)(\?|$)/i.test(fileUrl))) ? fileUrl : null),
          // the buyer's own specialty choice for a hand-written item, so a reorder keeps it (round-2 UX-040)
          ...(l.spec?.section ? { section: l.spec.section } : {}),
          ...(attachments.length ? { attachments } : {}),
          quick: true,
          // a line written by hand (not a catalog product): admins hear about it when an offer is chosen (174)
          custom: !CATALOG_NAMES.has(l.product_name.trim()),
        })
      }
      const first = items[0]
      const expires = new Date(Date.now() + effHours * 3600 * 1000).toISOString()
      const { error: insErr } = await supabase.from('rfqs').insert({
        id: rfqIdRef.current,
        contractor_id: userId, sector: first.sector,
        product_name: items.length > 1 ? `${first.product_name} +${items.length - 1} ${L('more', 'مزید', 'أصناف أخرى')}` : first.product_name,
        sectors: Array.from(new Set(items.map(it => it.sector))),
        sub_category: first.sub_category, specification: first.specification, quantity: first.quantity, unit: first.unit,
        items,
        region, city: city || null, delivery_required: !pickup, vat_invoice_required: !simple && vatRequired,
        delivery_location: pickup ? null : (address.trim().slice(0, 300) || null),
        delivery_geo: pickup || !geo ? null : `${geo.lat},${geo.lng}`,
        // the buyer's identity is always hidden from suppliers until an offer is accepted (UX-077)
        hide_identity: true, verified_only: verifiedOnly, nearby_only: simple || nearbyOnly,
        target_tiers: simple || tier === 'all' ? null : [tier],
        notes: notes.trim() || null,
        expires_at: expires,
      })
      // 23505 on the primary key: this same request already went through on an earlier try
      const already = !!insErr && (insErr as any).code === '23505' && /rfqs_pkey/.test(insErr.message || '')
      if (insErr && !already) {
        showError(/jwt|session/i.test(insErr.message || '') ? sessionMsg() : (insErr.message || '').includes('rfq_daily_limit')
          ? L('Daily request limit reached. Try again later.', 'آپ درخواستوں کی روزانہ حد تک پہنچ گئے ہیں۔ بعد میں دوبارہ کوشش کریں۔', 'وصلت إلى الحد اليومي للطلبات. حاول لاحقاً.')
          : L('Could not send. Try again.', 'نہیں بھیج سکے۔ دوبارہ کوشش کریں۔', 'تعذّر إرسال الطلب. حاول مرة أخرى.'))
        return
      }
      const sentId = rfqIdRef.current
      // a retry after a lost response, with the list changed in between: the server keeps the first version (round-4 UX-109)
      let stale = false
      if (already) {
        try {
          const { data: prevRow } = await supabase.from('rfqs').select('items').eq('id', sentId).single()
          const sig = (its: any[]) => JSON.stringify((its || []).map((it: any) => [String(it?.product_name || '').trim(), Number(it?.quantity) || 0, it?.unit || '', String(it?.specification || '')]))
          stale = sig(Array.isArray(prevRow?.items) ? prevRow.items : []) !== sig(items)
        } catch { /* cannot tell: treat as the same */ }
      }
      // R23: per-item budgets go to their own owner-only table (index = position in items); skipped for a stale resend
      const budgets = sendable.map((l, i) => ({ item_index: i, budget_unit_price: budgetToStored(parseBudget(l.budget)), budget_visible: !!l.budgetVisible }))
        .filter(b => b.budget_unit_price != null) as ItemBudget[]
      if (budgets.length && !stale) await saveRfqBudgets(supabase, sentId, budgets)
      deleteDraftBlobs([...photos.map(p => p.id), ...lines.map(l => l.fileId).filter(Boolean) as string[], ...lines.flatMap(l => (l.moreFiles || []).map(m => m.id))])
      clearLocalDraft('quick:' + userId)
      rfqIdRef.current = ''
      // Teach the search: the words the buyer wrote → the material name that was sent.
      for (const l of sendable) {
        if (l.original && l.original.trim() && l.original.trim() !== l.product_name.trim()) {
          try { supabase.rpc('log_search_event', { p_query: l.original.trim(), p_query_norm: normQuery(l.original), p_action: 'picked', p_picked: l.product_name.trim(), p_sector: l.sector, p_source: 'quick_text' }).then(() => {}, () => {}) } catch {}
        }
      }
      if (draftId) { try { await supabase.from('rfq_drafts').delete().eq('id', draftId) } catch {} ; setDraftId(null) }
      // who it reached and which materials no supplier covers yet (UX-016)
      let coverage: any = null
      try { const { data: cv } = await supabase.rpc('get_rfq_coverage', { p_rfq: sentId }); coverage = cv || null } catch {}
      sentOk = true
      setSent({ id: sentId, expires, coverage, stale })
      setFirstHours(null); setFirstOffer(false)
      setDone(true)
    } catch {
      showError(L('Network problem: your request was not sent. It is still saved here; try again.', 'نیٹ ورک کا مسئلہ: درخواست نہیں گئی۔ یہ یہاں محفوظ ہے؛ دوبارہ کوشش کریں۔', 'حدثت مشكلة في الاتصال ولم يُرسل الطلب. ما زال محفوظاً هنا؛ حاول مرة أخرى.'))
    } finally {
      setSending(false); sendingRef.current = false; setUpload(null)
      if (!sentOk) setConfirming(false) // the error is shown on the page, next to the line or field it is about
    }
  }

  // Lines keep the Arabic catalog name/unit (that is what routes the request and what suppliers
  // read); en/ur buyers see them in their language; a home buyer reads a plain Arabic name (UX-008).
  const SECTOR_I18N: Record<string, { en: string; ur: string }> = {
    civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'آرکیٹیکچرل' },
    electrical: { en: 'Electrical', ur: 'بجلی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
    equipment: { en: 'Machinery & equipment', ur: 'مشینری اور آلات' }, supply_store: { en: 'General supplies', ur: 'عام سامان' },
  }
  const sectorLabel = (s: string) => {
    if (locale !== 'ar' && SECTOR_I18N[s]) return (SECTOR_I18N[s] as any)[locale] || SECTOR_I18N[s].en
    const lab: any = (SECTOR_LABELS as any)[s]
    return typeof lab === 'string' ? lab : (lab?.[locale] || lab?.ar || s)
  }
  // the specialty under a catalog line for a business buyer (a home buyer sees none: UX-068)
  const specialtyLabel = (l: Line) => { const sb = lineSub(l); return sb ? getSubCategoryLabel(l.sector as Sector, sb, locale) : sectorLabel(l.sector) }
  function nameLabel(name: string) { return !name ? name : simple && locale === 'ar' ? homeName(name) : getProductLabel(name, locale) }
  const unitLabel = (u: string) => getUnitLabelLong(u, locale) || u
  // a spec field's name in the reader's language (Urdu falls back to English only when it has no Urdu label)
  const fieldLabel = (f: any) => locale === 'ar' ? f.ar : locale === 'ur' ? (f.ur || f.en) : f.en
  // the chosen specifications with their field names («اللون: أبيض»), shown to every buyer since suppliers see them (round-2 UX-039)
  const specPairs = (l: Line): string[] => {
    const fields = getProductSpecs(l.product_name).filter(f => f.key !== 'unit')
    const known = new Set(fields.map(f => f.key))
    const val = (v: string) => v === SPEC_UNSURE ? specUnsureLabel(locale) : getOptionLabel(v, locale)
    return [
      ...fields.filter(f => (l.specs?.[f.key] || '').trim()).map(f => `${fieldLabel(f)}: ${val(l.specs![f.key].trim())}`),
      ...Object.entries(l.specs || {}).filter(([k, v]) => !known.has(k) && k !== 'unit' && (v || '').trim()).map(([, v]) => val(v.trim())),
    ]
  }
  const qtyText = (l: Line) => `${l.quantity} ${unitLabel(l.unit)}`
  const fileWord = (n?: string) => isImageName(n) ? L('Photo attached', 'تصویر منسلک', 'صورة مرفقة') : L('File attached', 'فائل منسلک', 'ملف مرفق')
  const stepBadge = (n: number) => <span className="inline-grid place-items-center w-6 h-6 me-1.5 rounded-full bg-[#D4A543] text-[#071827] text-[12px] font-extrabold align-middle">{n}</span>

  async function switchType(v: 'individual' | 'business') {
    if (v === buyerType) { setChooseType(false); return }
    if (v === 'individual' && lines.some(l => Object.values(l.specs || {}).some(x => (x || '').trim()))) {
      const ok = await askConfirm(L('The specifications you chose stay saved in the request, but the simple mode hides them. Switch?', 'آپ کی منتخب تفصیلات درخواست میں محفوظ رہیں گی، لیکن آسان موڈ میں چھپی رہیں گی۔ تبدیل کریں؟', 'تبقى المواصفات التي اخترتها محفوظة في الطلب، لكن الوضع البسيط يخفيها. هل تريد التبديل؟'))
      if (!ok) return
    }
    const prev = buyerType
    setBuyerType(v); rememberBuyerType(v); setChooseType(false)
    // the save is checked: on failure the previous mode comes back with a message (round-4 UX-055)
    let failed = false
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { error: e } = await sb.from('profiles').update({ buyer_type: v }).eq('id', user.id)
        failed = !!e
        // the home page's stored snapshot must not bring the old mode back
        if (!e) { const snap = readPageCache<any>('home_' + user.id); if (snap?.p) writePageCache('home_' + user.id, { ...snap, p: { ...snap.p, buyer_type: v } }) }
      }
    } catch { failed = true }
    if (failed) {
      setBuyerType(prev); if (prev === 'individual' || prev === 'business') rememberBuyerType(prev)
      showError(L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ، حاول مرة أخرى.'))
    }
  }

  // a map pin / GPS fix also fills the region and city (UX-073)
  function onGeo(a: number, b: number) {
    setGeo({ lat: a, lng: b }); setGeoFromProfile(false); if (errField) { setErrField(null); setError('') }
    const n = nearestSaCity(a, b)
    if (n && n.km < 80) {
      setRegion(n.region); setCity(n.city)
      setGeoFilled(L(`We set the region and city from your location: ${n.city}.`, `ہم نے آپ کے مقام سے علاقہ اور شہر منتخب کیا: ${n.city}۔`, `حدّدنا المنطقة والمدينة من موقعك: ${n.city}.`))
    }
  }

  // one promise for a material no supplier covers yet (round-2 UX-070); before sending it is said in the future
  const uncoveredMsg = (n: string, sentAlready: boolean) => sentAlready
    ? L(`No supplier for «${nameLabel(n)}» is registered yet. We told our team to find one for you, and we will let you know as soon as an offer on it arrives.`,
      `«${nameLabel(n)}» کا کوئی سپلائر ابھی رجسٹر نہیں۔ ہم نے اپنی ٹیم کو آپ کے لیے سپلائر تلاش کرنے کا کہہ دیا ہے، اور اس پر آفر آتے ہی آپ کو بتائیں گے۔`,
      `لا يوجد بعد مورد مسجّل لـ«${nameLabel(n)}». أبلغنا فريقنا ليبحث لك عن مورد، وسنُعلمك فور وصول عرض عليه.`)
    : L(`No supplier for «${nameLabel(n)}» is registered yet. When you send, we tell our team to find one for you, and we will let you know as soon as an offer on it arrives.`,
      `«${nameLabel(n)}» کا کوئی سپلائر ابھی رجسٹر نہیں۔ بھیجتے ہی ہم اپنی ٹیم کو آپ کے لیے سپلائر تلاش کرنے کا کہیں گے، اور اس پر آفر آتے ہی آپ کو بتائیں گے۔`,
      `لا يوجد بعد مورد مسجّل لـ«${nameLabel(n)}». عند الإرسال نُبلغ فريقنا ليبحث لك عن مورد، وسنُعلمك فور وصول عرض عليه.`)

  const shell = (children: ReactNode) => (
    <AppShell title={L('Price request', 'قیمت کی درخواست', 'طلب تسعير')} nav={getNav('contractor', locale, '/contractor/rfq/quick')} dir={dir} hideAssistant={hasBar}>{children}</AppShell>
  )

  if (done) {
    const cov = sent?.coverage
    const reached = Number(cov?.reached) || 0
    const uncovered: string[] = Array.isArray(cov?.items) ? cov.items.filter((x: any) => Number(x?.suppliers) === 0).map((x: any) => String(x?.name || '')).filter(Boolean) : []
    const suppliersAr = (n: number) => arCount(n, 'مورد واحد', 'موردَين', 'موردين', 'مورداً')
    return shell(
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-6 sm:p-10 text-center border border-gray-100 shadow-sm">
        <div className="text-5xl mb-4"><Glyph e="✅" /></div>
        <h2 className="text-2xl font-extrabold text-navy mb-2">{L('Request sent', 'درخواست بھیج دی گئی', 'تم إرسال طلبك')}</h2>
        {sent?.stale && (
          <p className="mb-3 rounded-xl border-2 border-[#D4A543] bg-[#D4A543]/10 px-3 py-2 text-[13px] font-bold text-[#0B2438]" role="status">
            {L('Your request was sent before your last change. Open it to add what you changed.', 'آپ کی درخواست آخری تبدیلی سے پہلے بھیجی جا چکی تھی۔ جو بدلا ہے وہ شامل کرنے کے لیے اسے کھولیں۔', 'أُرسل طلبك قبل آخر تعديل. افتحه لإضافة ما عدّلته.')}
          </p>
        )}
        {firstOffer && sent?.id && (
          <div className="mb-3 rounded-xl border-2 border-[#D4A543] bg-[#D4A543]/15 p-3 flex flex-wrap items-center justify-between gap-2 text-start" role="status">
            <span className="text-sm font-extrabold text-[#0B2438]">{L('The first offer on your request has arrived', 'آپ کی درخواست پر پہلی آفر آ گئی', 'وصل أول عرض على طلبك')}</span>
            <Link href={`/contractor/rfq/${sent.id}`} className="min-h-[44px] px-4 inline-flex items-center rounded-xl text-sm font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>{L('View the offer', 'آفر دیکھیں', 'اعرض العرض')}</Link>
          </div>
        )}
        {cov && reached > 0 ? (
          <p className="text-gray-700 font-semibold">{L(`Your request reached ${reached} supplier${reached === 1 ? '' : 's'}.`, `آپ کی درخواست ${reached} سپلائرز تک پہنچ گئی۔`, `وصل طلبك إلى ${suppliersAr(reached)}.`)}</p>
        ) : (
          <p className="text-gray-600">{L('We will notify you as soon as an offer arrives.', 'کوئی بھی آفر آتے ہی ہم آپ کو اطلاع دیں گے۔', 'سنُبلغك فور وصول أي عرض.')}</p>
        )}
        {uncovered.length > 0 && (
          <div className="mt-3 text-start rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
            {uncovered.map(n => (
              <p key={n} className="text-[13px] text-amber-900">{uncoveredMsg(n, true)}</p>
            ))}
          </div>
        )}
        {firstHours != null && !firstOffer && (
          <p className="mt-3 text-[13px] font-semibold text-[#0B2438]">{L(
            `The first offer usually arrives within ${firstHours} hour${firstHours === 1 ? '' : 's'}.`,
            `پہلی آفر عموماً ${firstHours} گھنٹوں میں آ جاتی ہے۔`,
            `يصل أول عرض عادةً خلال ${arCount(firstHours, 'ساعة واحدة', 'ساعتين', 'ساعات', 'ساعة')}.`)}</p>
        )}
        {sent?.expires && (
          <p className="mt-3 text-[13px] text-gray-600">{L('The offer window ends: ', 'آفرز کی مہلت ختم ہو گی: ', 'تنتهي مهلة العروض: ')}<b className="text-[#0B2438]">{whenText(new Date(sent.expires).getTime())}</b></p>
        )}
        {/* «ماذا بعد؟» (round-2 UX-168): what happens next, in three plain steps */}
        <div className="mt-4 text-start rounded-xl bg-[#F7F4EC] p-3">
          <div className="text-[13px] font-extrabold text-[#0B2438] mb-2">{L('What happens next?', 'آگے کیا ہوگا؟', 'ماذا بعد؟')}</div>
          <ol className="space-y-1.5">
            {[
              L('Suppliers send their prices; we notify you of each offer.', 'سپلائرز اپنی قیمتیں بھیجیں گے؛ ہر آفر پر ہم آپ کو اطلاع دیں گے۔', 'يرسل الموردون أسعارهم، ونُبلغك بكل عرض يصل.'),
              L('Compare the offers side by side: price, delivery and rating.', 'آفرز کا موازنہ کریں: قیمت، ڈیلیوری اور ریٹنگ۔', 'قارن العروض جنباً إلى جنب: السعر والتوصيل والتقييم.'),
              L('Choose the offer that suits you; only then the supplier sees your name.', 'مناسب آفر منتخب کریں؛ تب ہی سپلائر آپ کا نام دیکھے گا۔', 'اختر العرض الأنسب لك، وعندها فقط يرى المورد اسمك.'),
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[#0B2438]">
                <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 text-[12px] font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-5 text-start"><EnablePush variant="card" /></div>
        <div className="mt-5 space-y-2">
          {sent?.id && (
            <Link href={`/contractor/rfq/${sent.id}`} className="block w-full min-h-12 py-3 rounded-xl font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
              {L('Follow your request', 'اپنی درخواست دیکھیں', 'تابع طلبك')}
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setDone(false); setSent(null); setLines([]); setPhotos([]); setNotes(''); setText(''); setError(''); setErrKey(null); setErrField(null); setNeedDays(null); setReach(null) }}
              className="min-h-12 py-3 rounded-xl font-bold border border-[#0B2438]/30 text-[#0B2438] bg-white">{L('New request', 'نئی درخواست', 'طلب جديد')}</button>
            <Link href="/contractor/rfqs" className="min-h-12 py-3 grid place-items-center rounded-xl font-bold border border-[#0B2438]/30 text-[#0B2438] bg-white">{L('My requests', 'میری درخواستیں', 'طلباتي')}</Link>
          </div>
        </div>
      </div>
    )
  }

  // neutral skeleton until we know which mode to show (UX-076)
  if (buyerType === undefined) {
    return shell(
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse" aria-busy="true" aria-label={L('Loading', 'لوڈ ہو رہا ہے', 'جارٍ التحميل')}>
        <div className="h-8 w-56 rounded-lg bg-gray-200" />
        <div className="h-40 rounded-2xl bg-gray-100" />
        <div className="h-24 rounded-2xl bg-gray-100" />
      </div>
    )
  }

  // «متى تحتاج المواد؟» (round-2 UX-046): it sets how long suppliers have to reply, so a home buyer sees it in step 3
  const needBlock = (
    <div>
      <div id="need-q" className="text-sm font-bold text-[#0B2438] mb-2">{simple ? L('When do you need the materials?', 'سامان کب چاہیے؟', 'متى تحتاج المواد؟') : L('When should the materials reach you?', 'سامان کب تک پہنچے؟', 'متى تريد أن تصلك المواد؟')}</div>
      <div role="radiogroup" aria-labelledby="need-q" className="flex flex-wrap gap-1.5">
        {([[1, L('Within a day', 'ایک دن میں', 'خلال يوم')], [3, L('Within 3 days', '3 دن میں', 'خلال 3 أيام')], [7, L('Within a week', 'ایک ہفتے میں', 'خلال أسبوع')], [null, L('Not urgent', 'جلدی نہیں', 'غير مستعجل')]] as [number | null, string][]).map(([d, lab]) => (
          <button key={String(d)} type="button" role="radio" aria-checked={needDays === d} onClick={() => setNeedDays(d)}
            className={`min-h-[44px] px-3 rounded-full border-2 text-[13px] font-bold inline-flex items-center gap-1 ${needDays === d ? CHOICE_ON : CHOICE_OFF}`}>{needDays === d && <Check className="w-3.5 h-3.5" aria-hidden />}{lab}</button>
        ))}
      </div>
      <p className="text-[12px] text-gray-600 mt-1">{simple
        ? L('If you choose «Within a day», we ask suppliers to reply within 24 hours.', 'اگر آپ «ایک دن میں» منتخب کریں تو ہم سپلائرز سے 24 گھنٹے میں جواب مانگیں گے۔', 'إذا اخترت «خلال يوم» نطلب من الموردين الرد خلال 24 ساعة.')
        : L('Suppliers see it on every item, so they quote only what they can deliver in time.', 'سپلائرز اسے ہر چیز پر دیکھتے ہیں تاکہ وہی قیمت دیں جو وقت پر پہنچا سکیں۔', 'يظهر للموردين على كل مادة ليسعّروا ما يستطيعون تسليمه في الوقت المطلوب.')}</p>
    </div>
  )

  // a home buyer: the guide with photos stays on the page (phones) once they start picking from it
  const emptySimple = simple && (lines.length === 0 || inlinePick)

  return shell(
    <div className="relative">
      <div className="max-w-[1700px] mx-auto pb-6 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:items-start">
        {/* A: how to add (main column on desktop, first on mobile) */}
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
        <div>
          <div className="text-[13px] font-bold text-[#9D7425] mb-1">{L('One request… and offers from several suppliers in your hands', 'ایک درخواست… اور کئی سپلائرز کی آفرز آپ کے ہاتھ میں', 'طلب واحد… وعروض عدة موردين بين يديك')}</div>
          <h1 className="text-2xl font-extrabold text-navy">{simple ? L('What does your home need?', 'آپ کے گھر کو کیا چاہیے؟', 'ماذا يحتاج بيتك؟') : L('What do you need?', 'آپ کو کیا چاہیے؟', 'ماذا تحتاج؟')}</h1>
          {simple && <p className="mt-1 text-sm font-semibold text-[#0B2438]">{L('Three steps: what you need, how many, and where and when.', 'تین قدم: کیا، کتنا، اور کہاں اور کب۔', 'ثلاث خطوات: ماذا تحتاج، وكم، وأين ومتى.')}</p>}
          {buyerType === 'business' && canProjects && (
            <a href="/contractor/project/new" className="mt-3 flex items-center justify-between gap-3 rounded-xl border-2 border-[#D4A543] bg-[#D4A543]/10 px-4 py-3 hover:bg-[#D4A543]/20">
              <span>
                <span className="block text-sm font-extrabold text-navy"><Glyph e="📊" /> {L('Bill of quantities: upload it', 'مقداروں کا جدول اپ لوڈ کریں', 'جدول الكميات: ارفعه')}</span>
                <span className="block text-[12px] text-gray-600">{L('Excel, PDF or a photo: every item is extracted and sent to the right suppliers', 'Excel، PDF یا تصویر: ہر چیز نکال کر متعلقہ سپلائرز کو بھیجی جاتی ہے', 'Excel أو PDF أو صورة: نستخرج كل بند ونرسله إلى الموردين المختصين')}</span>
              </span>
              <span className="text-[#8F6820] font-bold" aria-hidden="true">{dir === 'rtl' ? '←' : '→'}</span>
            </a>
          )}
          {/* the mode, with a way out if it was chosen by mistake (UX-085) */}
          {buyerType && !chooseType && (
            <div className="mt-2 flex items-center gap-2 text-[13px] text-gray-600">
              <span>{buyerType === 'individual' ? L('Mode: for my home', 'موڈ: اپنے گھر کے لیے', 'الوضع: لبيتي') : L('Mode: contractor or company', 'موڈ: ٹھیکیدار یا کمپنی', 'الوضع: مقاول أو شركة')}</span>
              <button type="button" onClick={() => setChooseType(true)} className="min-h-[44px] px-2 font-bold text-[#8F6820] underline underline-offset-2">{L('Change', 'تبدیل', 'تغيير')}</button>
            </div>
          )}
          {(buyerType === null || chooseType) && (
            <div className="mt-3 rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/10 p-3">
              <div className="text-sm font-bold text-navy mb-2">{L('Who are you buying for?', 'آپ کس کے لیے خرید رہے ہیں؟', 'لمن تشتري؟')}</div>
              <div className="grid grid-cols-2 gap-2">
                {([['individual', L('My home', 'اپنا گھر', 'لبيتي'), L('Simple request, no technical details', 'آسان درخواست، تکنیکی تفصیلات کے بغیر', 'طلب بسيط بلا تفاصيل فنية')],
                   ['business', L('Contractor or company', 'ٹھیکیدار یا کمپنی', 'مقاول أو شركة'), L('Exact specifications, a VAT invoice and tools for large quantities', 'درست تفصیلات، VAT انوائس اور بڑی مقدار کے اوزار', 'مواصفات دقيقة وفاتورة ضريبية وأدوات للكميات الكبيرة')]] as const).map(([v, t, sub]) => (
                  <button key={v} type="button" aria-pressed={buyerType === v} className={`text-start rounded-xl border-2 px-3 py-2 min-h-[56px] ${buyerType === v ? CHOICE_ON : CHOICE_OFF}`}
                    onClick={() => switchType(v)}>
                    <span className="flex items-center gap-1 text-sm font-bold text-navy">{buyerType === v && <Check className="w-4 h-4" aria-hidden />}{t}</span>
                    <span className="block text-[12px] text-gray-600">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {startPhoto && (
          <button type="button" id="quick-photo" onClick={() => { setStartPhoto(false); fileRef.current?.click() }}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-extrabold text-lg text-[#071827] shadow-sm"
            style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            <Glyph e="📷" /> {L('Take a photo or choose one', 'تصویر لیں یا منتخب کریں', 'التقط صورة أو اختر صورة')}
          </button>
        )}

        {/* Input: text + mic + photo */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <label htmlFor="quick-text" className="block text-sm font-bold text-navy">{simple && stepBadge(1)}{simple ? L('What do you need? Pick it from the materials guide, write it or photograph it', 'کیا چاہیے؟ مواد کی فہرست سے چنیں، لکھیں یا تصویر لیں', 'ماذا تحتاج؟ اختره من دليل المواد أو اكتبه أو صوّره') : L('Write or paste your list', 'اپنی فہرست لکھیں یا پیسٹ کریں', 'اكتب قائمتك أو الصقها')}</label>
          <textarea id="quick-text" value={text} onChange={e => setText(e.target.value)} rows={simple ? 3 : 4}
            className="input-field text-[16px] leading-relaxed"
            placeholder={simple ? L('e.g. 6 ceiling spotlights, a basin mixer, 2 gallons of white paint', 'مثلاً: 6 سیلنگ اسپاٹ لائٹس، ایک مکسر، 2 گیلن سفید پینٹ', 'مثلاً: 6 مصابيح سقف موجّهة، خلاط مغسلة، 2 جالون دهان أبيض') : L('e.g. 10 bags cement, 500 hollow blocks 20cm, 2 tons rebar 12mm', 'مثلاً: 10 بوری سیمنٹ، 500 بلاک', 'مثلاً: 10 أكياس أسمنت، 500 بلوك 20 سم، 2 طن حديد 12 مم')} />
          <div className="flex flex-wrap gap-2">
            {/* the guide first on phones (UX-075); desktop shows it inline below */}
            {!emptySimple && (
              <button type="button" onClick={() => setShowCatalog(true)} className="lg:hidden min-h-[44px] px-4 rounded-xl font-bold border bg-white border-[#0B2438]/30 text-[#0B2438]">
                <Glyph e="🔍" /> {L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}
              </button>
            )}
            <button type="button" onClick={() => parseText()} disabled={!text.trim() || parsing} className="btn-orange min-h-[44px] px-5 rounded-xl font-bold disabled:opacity-50">
              {parsing ? L('Reading…', 'پڑھ رہے ہیں…', 'جارٍ القراءة…') : L('Add to my request', 'میری درخواست میں شامل کریں', 'أضف إلى طلبي')}
            </button>
            {canListen && (
              <button type="button" onClick={toggleMic} aria-pressed={listening}
                className={`min-h-[44px] px-4 rounded-xl font-bold border transition-all ${listening ? 'bg-[#D4A543]/15 border-[#D4A543] text-[#0B2438] animate-pulse' : 'bg-white border-gray-200 text-gray-700'}`}>
                <Glyph e="⏺" /> {listening ? L('Listening… tap to stop', 'سن رہے ہیں… روکنے کے لیے دبائیں', 'جارٍ الاستماع… اضغط للإيقاف') : L('Say it', 'بولیں', 'تحدّث')}
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="min-h-[44px] px-4 rounded-xl font-bold border bg-white border-gray-200 text-gray-700">
              <Glyph e="📷" /> {L('Photo of the item', 'چیز کی تصویر', 'صورة المادة')}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
            <input ref={specFileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e => { if (fileFor) attachFiles(fileFor, Array.from(e.target.files || [])); e.target.value = '' }} />
          </div>
          <p className="text-[12px] text-gray-600">{L('We turn what you wrote into a list of materials that you check before sending.', 'آپ کی لکھی ہوئی چیزوں کو ہم سامان کی فہرست میں بدلیں گے جسے آپ بھیجنے سے پہلے دیکھیں گے۔', 'سنحوّل ما كتبته إلى قائمة مواد تراجعها قبل الإرسال.')}</p>
          {micError && <p className="text-[13px] text-red-700" role="alert">{micError}</p>}
          {info && <p className={'text-[13px] font-bold ' + (infoWarn ? 'text-[#0B2438]' : 'text-[#0F6E56]')} role="status">{infoWarn && <Glyph e="⚠" />} {info}</p>}
          {/* «طلبتَها سابقاً» (round-2 UX-167): one tap adds a material from the last requests */}
          {pastItems.some(p => !lines.some(l => l.product_name === p.name)) && (
            <div>
              <div className="text-[12px] font-bold text-gray-600 mb-1">{L('Ordered before:', 'پہلے منگوایا:', 'طلبتَها سابقاً:')}</div>
              <div className="flex flex-wrap gap-1.5">
                {pastItems.filter(p => !lines.some(l => l.product_name === p.name)).map(p => (
                  <button key={p.name} type="button" onClick={() => addFromCatalog({ name: p.name, sector: p.sector as Sector })}
                    className="min-h-[44px] max-w-[16rem] truncate px-3 rounded-full border-2 border-gray-200 bg-white text-[13px] font-bold text-[#0B2438] hover:border-[#D4A543]" dir="auto">
                    + {nameLabel(p.name)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* a home buyer with an empty request: the guide with photos and the ready lists right here (UX-075) */}
        {emptySimple && (
          <div id="catalog-inline-m" className="lg:hidden bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3 scroll-mt-24">
            <h2 className="font-bold text-navy">{L('Or choose by photos', 'یا تصاویر سے چنیں', 'أو اختر بالصور')}</h2>
            <CatalogBrowser key={'m|' + startQ + '|' + (startSection || '')} simple inline initialQuery={startQ} initialSection={startSection as any} locale={locale}
              picked={lines.map(l => ({ key: l.key, name: l.product_name, qty: l.quantity, unit: l.unit }))} onPick={it => { setInlinePick(true); addFromCatalog(it) }} onRemove={removeLine} onQty={(k, q) => updateLine(k, { quantity: q })} />
            <div>
              <h3 className="text-sm font-bold text-navy mb-2">{L('Get your home ready', 'اپنا گھر تیار کریں', 'جهّز بيتك')}</h3>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {HOME_ROOM_PACKS.map(p => (
                  <button key={p.id} type="button" onClick={() => setPack(p)}
                    className="shrink-0 inline-flex items-center gap-2 ps-1 pe-3 min-h-[44px] rounded-full border border-gray-200 bg-white text-[13px] font-bold text-[#0B2438] hover:border-[#D4A543]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photo || productImageUrl(p.cover)} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-50" />
                    {locale === 'en' ? p.en : locale === 'ur' ? p.ur : p.ar}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && !errKey && !errField && <div id="quick-error" className={(errSoft ? 'bg-[#D4A543]/10 border-2 border-[#D4A543] text-[#0B2438] font-bold' : 'bg-red-50 border border-red-200 text-red-700') + ' text-sm rounded-xl p-3 scroll-mt-24'} role="alert">
          {error}
          {error === sessionMsg() && (
            <Link href="/login?next=/contractor/rfq/quick" className="mt-2 flex w-fit items-center min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-[#0B2438]">{L('Sign in', 'سائن ان کریں', 'سجّل الدخول')}</Link>
          )}
        </div>}
        </div>

        {/* Desktop: the catalog fills the main column; phones open it as a sheet */}
        <div id="catalog-inline" className="hidden lg:block lg:col-start-1 lg:row-start-2 lg:mt-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <h2 className="font-bold text-navy"><Glyph e="🔍" /> {L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}</h2>
          {replaceKey && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 px-3 py-1.5 text-[13px] font-bold text-[#0B2438]" role="status">
              <span>{L('Choose the material that replaces', 'وہ سامان منتخب کریں جو اس کی جگہ لے', 'اختر المادة التي تحلّ محلّ')} «{nameLabel(lines.find(x => x.key === replaceKey)?.product_name || '')}»</span>
              <button type="button" onClick={() => { replaceRef.current = null; setReplaceKey(null); setInfo('') }} className="min-h-[44px] px-2 underline">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
            </div>
          )}
          <CatalogBrowser key={startQ + '|' + (startSection || '')} simple={simple} inline initialQuery={startQ} initialSection={startSection as any} locale={locale}
            picked={lines.map(l => ({ key: l.key, name: l.product_name, qty: l.quantity, unit: l.unit }))} onPick={addFromCatalog} onRemove={removeLine} onQty={(k, q) => updateLine(k, { quantity: q })} />
        </div>

        {/* B: the chosen list + delivery, a side column on desktop (sticky), under the inputs on mobile */}
        <div className="space-y-5 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        {/* one line on what the request holds and where it goes, with a jump to the delivery step (UX-064) */}
        {lines.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#0B2438]/5 border border-[#0B2438]/10 px-4 py-2">
            <span className="text-[13px] font-bold text-[#0B2438]" dir="auto">
              {countLabel(sendable.length || lines.length, locale, arMaterials, 'item', 'اشیاء')}
              {' · '}{pickup ? L('Pickup from the supplier', 'سپلائر سے خود وصولی', 'استلام من المورد')
                : region ? L(`Delivery to ${city ? (((CITIES_BY_REGION as any)[region] || []).find((c: any) => c.ar === city)?.en || city) : getRegionLabel(region, 'en')}`, `${city || getRegionLabel(region, 'ur')} تک ڈیلیوری`, `التوصيل إلى ${city || getRegionLabel(region, 'ar')}`)
                : L('Delivery place not set yet', 'ڈیلیوری کی جگہ ابھی طے نہیں', 'لم يُحدَّد مكان التوصيل بعد')}
            </span>
            {!ready && (
              <button type="button" onClick={() => validate()} /* jumps to the actual problem (round-4 UX-027) */
                className="min-h-[44px] px-3 rounded-xl text-[13px] font-bold text-[#0B2438] border border-[#0B2438]/30 bg-white">{L('Complete the details', 'تفصیلات مکمل کریں', 'أكمل البيانات')}</button>
            )}
          </div>
        )}
        {lines.length === 0 ? (
          <div className="hidden lg:block bg-white rounded-2xl p-6 border border-dashed border-gray-200 text-center text-sm text-gray-500">
            <div className="text-3xl mb-2"><Glyph e="🧾" /></div>
            {L('Your request is empty. Add materials by writing, speaking, a photo or from the materials guide.', 'آپ کی درخواست خالی ہے۔ اپنا سامان لکھ کر، بول کر، تصویر سے یا مواد کی فہرست سے شامل کریں۔', 'طلبك فارغ. أضف موادك بالكتابة أو الصوت أو الصورة أو من دليل المواد.')}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="request-list" className="font-bold text-navy scroll-mt-24">{simple && stepBadge(2)}{simple ? L('How many?', 'کتنا؟', 'كم تحتاج؟') : L('Your request', 'آپ کی درخواست', 'طلبك')} <span className="text-gray-500 font-normal">({lines.length})</span></h2>
              <span className="text-[12px] text-gray-500">{L('Check each line before sending', 'بھیجنے سے پہلے ہر لائن چیک کریں', 'راجع كل سطر قبل الإرسال')}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[12px] text-gray-500">
              <span className="inline-flex items-center gap-1.5"><SellerIcon name="checkCircle" className="w-4 h-4 text-[#0F6E56]" />{L('Saved on this device, you can leave and come back', 'اس ڈیوائس پر محفوظ ہے، واپس آ سکتے ہیں', 'محفوظ على جهازك، يمكنك المغادرة والعودة لاحقاً')}</span>
              <button type="button" onClick={async () => { if ((await askConfirm(L('Clear the whole request? This cannot be undone.', 'پوری درخواست صاف کریں؟ یہ واپس نہیں ہو سکتا۔', 'هل تريد مسح الطلب بالكامل؟ لا يمكن التراجع عن ذلك.'), { danger: true }))) startOver() }} className="min-h-[44px] px-1 font-bold text-gray-600 hover:text-red-600">
                {L('Start over', 'نئے سرے سے', 'ابدأ من جديد')}
              </button>
            </div>
            {/* saved to the account, so it opens on any device (round-4 UX-092), and a recurring list for a business buyer (UX-187) */}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => saveDraft(false)} disabled={savingDraft}
                className="min-h-[44px] px-3 rounded-xl text-[13px] font-bold border border-[#0B2438]/40 bg-white text-[#0B2438] disabled:opacity-50">
                {savingDraft && !tplOpen ? L('Saving…', 'محفوظ ہو رہا ہے…', 'جارٍ الحفظ…') : L('Save as a draft', 'مسودے کے طور پر محفوظ کریں', 'احفظ كمسودة')}
              </button>
              {!simple && !tplOpen && (
                <button type="button" onClick={() => setTplOpen(true)} className="min-h-[44px] px-3 rounded-xl text-[13px] font-bold border border-[#0B2438]/40 bg-white text-[#0B2438]">
                  {L('Save as a recurring list', 'بار بار کی فہرست کے طور پر محفوظ کریں', 'احفظ كقائمة متكرّرة')}
                </button>
              )}
            </div>
            {!simple && tplOpen && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
                <input value={tplName} onChange={e => setTplName(e.target.value.slice(0, 60))} className="input-field flex-1 min-w-[10rem] text-[16px] sm:text-sm"
                  aria-label={L('List name', 'فہرست کا نام', 'اسم القائمة')} placeholder={L('List name, e.g. Villa site materials', 'فہرست کا نام', 'اسم القائمة، مثل: مواد موقع الفيلا')} />
                <button type="button" onClick={() => saveDraft(true)} disabled={savingDraft} className="min-h-[44px] px-4 rounded-xl text-[13px] font-bold text-white bg-[#0B2438] disabled:opacity-50">{L('Save', 'محفوظ کریں', 'حفظ')}</button>
                <button type="button" onClick={() => { setTplOpen(false); setTplName('') }} className="min-h-[44px] px-2 text-[13px] font-bold text-gray-600">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
              </div>
            )}
            <div className="space-y-3 lg:max-h-[60vh] lg:overflow-y-auto lg:pe-1">
            {lines.map(l => {
              const ph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
              const ring = flash === l.key ? ' ring-2 ring-[#D4A543] ring-offset-2' : ''
              const showExtra = !simple || !!l.extraOpen || !!(l.details.trim() || Object.values(l.specs || {}).some(v => (v || '').trim()) || l.fileId || l.prevFiles?.length || l.photoWarn
                || (l.product_name.trim() && !CATALOG_NAMES.has(l.product_name.trim())))
              const lineErr = errKey === l.key && error ? <p className={errSoft ? 'basis-full rounded-lg border-2 border-[#D4A543] bg-[#D4A543]/10 px-3 py-2 text-[13px] font-bold text-[#0B2438]' : 'text-[13px] font-bold text-red-700 basis-full'} role="alert">{error}</p> : null
              return (
                l.done ? (
                  <div key={l.key} id={'line-' + l.key} className={'rounded-xl border border-[#0F6E56]/30 bg-[#0F6E56]/[0.03] p-2 scroll-mt-28 transition-shadow' + ring}>
                  {/* phones: the name keeps its width; the counter wraps to its own row under it (round-4 UX-007) */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <button type="button" onClick={() => updateLine(l.key, { done: false })} className="flex-1 min-w-[150px] sm:min-w-0 min-h-[44px] flex items-center gap-3 text-start"
                      aria-label={L(`Edit ${nameLabel(l.product_name)}`, `${nameLabel(l.product_name)} میں ترمیم`, `تعديل ${nameLabel(l.product_name)}`)}>
                      {ph ? <img src={ph.url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                        : <img src={productImageUrl(l.product_name)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                            onError={(e: any) => imgFallback(e, detectSubCategory(l.product_name, l.sector as any))} />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-sm text-navy truncate" dir="auto">{nameLabel(l.product_name)}</span>
                        <span className="block text-[12px] text-gray-600 truncate" dir="auto">
                          <b className="text-[#8F6820]">{qtyText(l)}</b>
                          {specPairs(l).length ? ' · ' + specPairs(l).join('، ') : ''}
                          {l.brand?.trim() ? ' · ' + L('Brand: ', 'برانڈ: ', 'الماركة: ') + l.brand.trim() : ''}
                          {l.details.trim() ? ' · ' + l.details.trim() : ''}
                          {wantsInstall(l) ? ' · ' + L('with installation', 'تنصیب سمیت', 'مع التركيب') : ''}
                          {l.fileId ? ' · ' + fileWord(l.fileName) : l.prevFiles?.length ? ' · ' + L('Attachment from the earlier request', 'پچھلی درخواست کی فائل', 'مرفق من الطلب السابق') : ''}
                        </span>
                      </span>
                      <span className="text-[12px] font-bold text-gray-600 shrink-0 inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" aria-hidden /> <span className="hidden sm:inline">{L('Edit', 'ترمیم', 'تعديل')}</span></span>
                    </button>
                    {simple && COUNT_UNITS.includes(l.unit) && (
                      <div className="order-last sm:order-none basis-full sm:basis-auto ps-14 sm:ps-0 shrink-0"><div className="inline-flex items-center rounded-xl border border-gray-200 bg-white" role="group" aria-label={L('Quantity', 'مقدار', 'الكمية')}>
                        <button type="button" onClick={() => updateLine(l.key, { quantity: String(Math.max(1, (parseFloat(l.quantity) || 1) - 1)) })} disabled={(parseFloat(l.quantity) || 1) <= 1}
                          className="w-[44px] h-[44px] grid place-items-center text-lg font-bold text-[#0B2438] disabled:opacity-30" aria-label={L('Less', 'کم', 'أنقص')}>−</button>
                        <span className="min-w-[2ch] text-center text-sm font-extrabold text-[#0B2438]" aria-live="polite">{l.quantity || '1'}</span>
                        <button type="button" onClick={() => updateLine(l.key, { quantity: String((parseFloat(l.quantity) || 0) + 1) })}
                          className="w-[44px] h-[44px] grid place-items-center text-lg font-bold text-[#0B2438]" aria-label={L('More', 'زیادہ', 'زِد')}>+</button>
                      </div></div>
                    )}
                    <button type="button" onClick={() => removeLine(l.key)} className="min-w-[44px] min-h-[44px] grid place-items-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 shrink-0" aria-label={L(`Remove ${nameLabel(l.product_name)}`, `${nameLabel(l.product_name)} ہٹائیں`, `حذف ${nameLabel(l.product_name)}`)}><X className="w-5 h-5" aria-hidden /></button>
                  </div>
                  {lineErr}
                  </div>
                ) :
                <div key={l.key} id={'line-' + l.key} className={`rounded-xl border p-3 space-y-2 scroll-mt-28 transition-shadow ${l.review?.length || errKey === l.key ? 'border-[#D4A543] border-2' : 'border-gray-200'}` + ring}>
                  <div className="flex gap-3 items-start">
                    {ph ? <img src={ph.url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-100" />
                      : l.product_name ? <img src={productImageUrl(l.product_name)} alt="" loading="lazy" className="w-16 h-16 rounded-lg object-contain shrink-0 border border-gray-100 bg-gray-50"
                          onError={(e: any) => imgFallback(e, detectSubCategory(l.product_name, l.sector as any))} /> : null}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* a material from the guide keeps its catalog name (what routes it and what suppliers read): read-only, changed as a whole (UX-063) */}
                      {CATALOG_NAMES.has(l.product_name.trim()) ? (
                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="font-semibold text-sm text-navy" dir="auto">{nameLabel(l.product_name)}</span>
                          {/* opens the guide and swaps the material in this same line, keeping the quantity (round-4 UX-027) */}
                          <button type="button" onClick={() => changeMaterial(l.key)}
                            className="min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Change the material', 'سامان بدلیں', 'تغيير المادة')}</button>
                          <button type="button" onClick={() => updateLine(l.key, { product_name: '', spec: undefined, specs: undefined, suggestion: null, photoWarn: undefined })}
                            className="min-h-[44px] text-[12px] font-semibold text-gray-600 hover:underline">{L('or write its name', 'یا اس کا نام لکھیں', 'أو اكتب اسمها')}</button>
                        </div>
                      ) : (
                      // the raw text, never the cleaned display name: cleaning while typing glued words and dropped brands (round-4 UX-001)
                      <input value={l.product_name} dir="auto" aria-invalid={(!l.product_name.trim() && errKey === l.key) || undefined} onChange={e => {
                        const v = e.target.value
                        // the chosen specialty stays unless the name became a guide material (UX-063)
                        updateLine(l.key, { product_name: v, spec: CATALOG_NAMES.has(v.trim()) ? undefined : l.spec, photoWarn: undefined })
                        setTypingKey(l.key); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTypingKey(null), 800)
                      }} aria-label={L('Item name', 'نام', 'اسم المادة')}
                        className="input-field font-semibold text-[16px] sm:text-sm" placeholder={ph?.status === 'identifying' ? L('Recognising the photo…', 'تصویر پہچان رہے ہیں…', 'جارٍ التعرّف على الصورة…') : L('Item name', 'نام', 'اسم المادة')} />
                      )}
                      {locale !== 'ar' && l.original && !ph && (
                        <p className="text-[12px] font-semibold text-gray-700" dir="auto">= {l.original}</p>
                      )}
                      {l.review?.length ? (
                        <p className="text-[12px] font-bold text-[#8F6820]"><Glyph e="⚠" /> {l.review.map(reviewText).join(' · ')}</p>
                      ) : null}
                      {ph && ph.status === 'identifying' && (
                        <p className="text-[12px] text-gray-600 inline-flex items-center gap-1.5" role="status">
                          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-[#0B2438]/30 border-t-[#0B2438] animate-spin" aria-hidden />
                          {L('Recognising the photo…', 'تصویر پہچان رہے ہیں…', 'جارٍ التعرّف على الصورة…')}
                        </p>
                      )}
                      {ph && ph.status === 'done' && (
                        <p className="text-[12px] text-gray-600"><Glyph e="🤖" /> {L('Suggested from the photo, please check it', 'تصویر سے تجویز، چیک کریں', 'اقتراح من الصورة، تأكّد منه')}{ph.confidence === 'low' ? ' · ' + L('not sure', 'یقینی نہیں', 'غير متأكد') : ''}
                          {locale !== 'ar' && ph.localName && <span className="block font-semibold text-gray-700" dir="auto">= {ph.localName}</span>}
                          {ph.question && ph.confidence !== 'high' && <span className="block font-semibold text-[#8F6820]" dir="auto"><Glyph e="❓" /> {ph.question}</span>}
                        </p>
                      )}
                      {ph && ph.status === 'failed' && (l.product_name.trim()
                        ? <p className="text-[12px] text-gray-600">{L('We could not recognise what is in the photo; check the name you wrote.', 'تصویر میں موجود چیز پہچانی نہیں جا سکی؛ لکھا ہوا نام چیک کریں۔', 'لم نتمكّن من التعرّف على ما في الصورة؛ تأكّد من الاسم الذي كتبته.')}</p>
                        : <div className="rounded-lg border border-[#D4A543]/50 bg-[#D4A543]/10 p-2 space-y-1.5" role="status">
                            <p className="text-[13px] font-bold text-[#8F6820]"><Glyph e="⚠" /> {L('We could not recognise what is in the photo. Write the item name, try again, or remove the line. You can send the rest of the request.', 'تصویر میں موجود چیز پہچانی نہیں جا سکی۔ چیز کا نام لکھیں، دوبارہ کوشش کریں، یا لائن ہٹا دیں۔ باقی درخواست بھیجی جا سکتی ہے۔', 'لم نتمكّن من التعرّف على ما في الصورة. اكتب اسم المادة، أو أعد المحاولة، أو احذف السطر. يمكنك إرسال بقية الطلب.')}</p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => retryIdentify(ph.id)} className="min-h-[44px] px-3 rounded-lg border border-[#0B2438]/40 text-[#0B2438] bg-white text-[13px] font-bold"><Glyph e="🔁" /> {L('Try again', 'دوبارہ کوشش کریں', 'أعد المحاولة')}</button>
                              <button type="button" onClick={() => removeLine(l.key)} className="min-h-[44px] px-3 rounded-lg border border-red-200 text-red-700 bg-white text-[13px] font-bold"><Glyph e="🗑" /> {L('Remove the line', 'لائن ہٹائیں', 'احذف السطر')}</button>
                            </div>
                          </div>)}
                      {/* one question at a time (UX-174): «هل تقصد…؟» first, then the specialty */}
                      {l.suggestion && l.suggestion.name !== l.product_name ? (
                        <div className="rounded-xl border border-[#D4A543]/60 bg-[#D4A543]/[.07] p-2.5 space-y-2">
                          <p className="text-sm text-[#0B2438]">{L('Did you mean', 'کیا آپ کا مطلب', 'هل تقصد')}: <b dir="auto">{nameLabel(l.suggestion.name)}</b>{L('?', '؟', '؟')}</p>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => updateLine(l.key, { product_name: l.suggestion!.name, sector: l.suggestion!.sector, suggestion: null, spec: undefined })}
                              className="min-h-[44px] px-4 rounded-xl text-sm font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>{L('Yes', 'ہاں', 'نعم')}</button>
                            <button type="button" onClick={() => updateLine(l.key, { suggestion: null })}
                              className="min-h-[44px] px-4 rounded-xl text-sm font-bold border border-gray-300 bg-white text-[#0B2438]">{L('No, keep what I wrote', 'نہیں، جو لکھا وہی رکھیں', 'لا، أبقِ ما كتبته')}</button>
                          </div>
                        </div>
                      ) : l.product_name.trim().length >= 3 && typingKey !== l.key && !CATALOG_NAMES.has(l.product_name.trim())
                        ? <LineSpecialty name={l.product_name} sector={l.sector} value={l.spec} locale={locale} simple={simple} fromPhoto={!!ph}
                            onChange={v => updateLine(l.key, { spec: v, sector: v.sector })} />
                        : (!simple && l.product_name.trim() && !(ph && ph.status === 'identifying'))
                          ? <div className="text-[12px] text-[#48596E]">{specialtyLabel(l)}</div> : null}
                    </div>
                    <button type="button" onClick={() => removeLine(l.key)} className="min-w-[44px] min-h-[44px] grid place-items-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 shrink-0" aria-label={L(`Remove ${nameLabel(l.product_name) || 'item'}`, `${nameLabel(l.product_name)} ہٹائیں`, `حذف ${nameLabel(l.product_name) || 'المادة'}`)}><X className="w-5 h-5" aria-hidden /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" inputMode="decimal" value={l.quantity} aria-invalid={(!(parseFloat(l.quantity) > 0) && errKey === l.key) || undefined} onChange={e => updateLine(l.key, { quantity: toLatinNumber(e.target.value), review: dropFlags(l.review, QTY_FLAGS) })}
                      className={`input-field text-[16px] sm:text-sm ${!(parseFloat(l.quantity) > 0) && errKey === l.key ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`} placeholder={L('Quantity', 'مقدار', 'الكمية')} aria-label={L('Quantity', 'مقدار', 'الكمية')} />
                    <select value={l.unit} onChange={e => updateLine(l.key, { unit: e.target.value, review: dropFlags(l.review, ['unit_guess']) })} className="input-field text-[16px] sm:text-sm" aria-label={L('Unit', 'یونٹ', 'الوحدة')}>
                      <option value="">{L('Unit', 'یونٹ', 'الوحدة')}</option>
                      {/* a product with its own order units shows only those; otherwise its specialty's logical units (owner 2026-10-19) */}
                      {Array.from(new Set([...(unitChoicesFor(l.product_name, l.sector as any) || UNITS), ...(l.unit ? [l.unit] : [])])).map(u => <option key={u} value={u}>{getUnitLabelLong(u, locale) || u}</option>)}
                    </select>
                  </div>
                  {(() => {
                    const avg = market[`${l.product_name.trim()}|${l.unit}`]
                    if (!avg) return null
                    const q = parseFloat(l.quantity) || 0
                    const ul = unitLabel(l.unit)
                    const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
                    // every buyer reads VAT-inclusive figures, so offers never look 15% higher (round-4 UX-028;
                    // owner 2026-11-23: business buyers too)
                    return (
                      <p className="text-[12px] text-gray-600 leading-relaxed">
                        {L(`Usual market price: about ${fmt(avg * 1.15)} SAR per ${ul} incl. VAT`, `مارکیٹ کی عام قیمت: تقریباً ${fmt(avg * 1.15)} ریال فی ${ul} VAT سمیت`, `السعر المعتاد في السوق: نحو ${fmt(avg * 1.15)} ر.س لكل ${ul} شامل الضريبة`)}
                        {q > 0 ? L(`, about ${fmt(avg * q * 1.15)} SAR for your quantity`, `، آپ کی مقدار کے لیے تقریباً ${fmt(avg * q * 1.15)} ریال`, `، أي نحو ${fmt(avg * q * 1.15)} ر.س لكميتك`) : ''}.
                      </p>
                    )
                  })()}
                  {/* «لا تعرف الكمية؟» from the room size: floor or walls, waste included (round-2 UX-006) */}
                  {calcSupported(l.unit) && (
                    calcFor === l.key ? (
                      <QuantityCalc unit={l.unit} name={l.product_name} sub={lineSub(l)} locale={locale} onClose={() => setCalcFor(null)}
                        onUse={q => { updateLine(l.key, { quantity: q, review: dropFlags(l.review, QTY_FLAGS) }); setCalcFor(null) }} />
                    ) : (
                      <button type="button" onClick={() => setCalcFor(l.key)} className="min-h-[44px] text-[13px] font-bold text-[#8F6820] inline-flex items-center gap-1.5 hover:underline">
                        <Calculator className="w-4 h-4" aria-hidden />{L('Not sure of the quantity? Work it out from the room size', 'مقدار معلوم نہیں؟ کمرے کے سائز سے حساب کریں', 'لا تعرف الكمية؟ احسبها من مقاس الغرفة')}
                      </button>
                    )
                  )}
                  {/* home mode: notes, details and attachments behind one button, open by itself when they hold something (round-2 UX-042) */}
                  {simple && !showExtra && (
                    <button type="button" onClick={() => updateLine(l.key, { extraOpen: true })} aria-expanded={false}
                      className="min-h-[44px] text-[13px] font-bold text-[#0B2438] inline-flex items-center gap-1.5 hover:underline">
                      <Paperclip className="w-4 h-4" aria-hidden />{L('Add a note or a photo (optional)', 'نوٹ یا تصویر شامل کریں (اختیاری)', 'أضف ملاحظة أو صورة (اختياري)')}
                    </button>
                  )}
                  {(() => {
                    const needWritten = !simple && specsRequired(l.product_name, l.sector as any) && !getProductSpecs(l.product_name).some(f => f.key !== 'unit')
                    const miss = needWritten && !l.details.trim() && !l.fileId
                    return (<>
                      {!simple && brandApplies(l.product_name, l.sector as any) && (
                        <input value={l.brand || ''} onChange={e => updateLine(l.key, { brand: e.target.value.slice(0, 80) })} className="input-field text-[16px] sm:text-sm"
                          aria-label={L('Brand or product name (optional)', 'برانڈ یا پروڈکٹ کا نام (اختیاری)', 'الماركة أو اسم المنتج (اختياري)')}
                          placeholder={L('Brand or product name (optional), e.g. Fosroc Renderoc', 'برانڈ یا پروڈکٹ کا نام (اختیاری)', 'الماركة أو اسم المنتج (اختياري)، مثل: فوسروك رندروك')} />
                      )}
                      {showExtra && <label className="block">
                        {needWritten && <span className="block text-[12px] font-bold text-[#0B2438] mb-0.5">{L('Size and specifications (required)', 'سائز اور تفصیل (ضروری)', 'المقاس والمواصفات (مطلوب)')}</span>}
                        <input value={l.details} aria-invalid={(miss && errKey === l.key) || undefined} onChange={e => updateLine(l.key, { details: e.target.value })}
                          className={`input-field text-[16px] sm:text-sm ${miss ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
                          aria-label={needWritten ? L('Size and specifications (required)', 'سائز اور تفصیل (ضروری)', 'المقاس والمواصفات (مطلوب)') : L('Notes for the supplier (optional)', 'سپلائر کے لیے نوٹ (اختیاری)', 'ملاحظات للمورد (اختياري)')}
                          placeholder={needWritten
                            ? L('e.g. length, width, thickness, grade', 'جیسے لمبائی، چوڑائی، موٹائی اور گریڈ', 'مثل الطول والعرض والسماكة والدرجة')
                            : CATALOG_NAMES.has(l.product_name.trim())
                              ? L('Add a description: colour, size…', 'تفصیل شامل کریں: رنگ، سائز…', 'أضف وصفاً: اللون، المقاس…')
                              : L('Notes for the supplier (optional)', 'سپلائر کے لیے نوٹ (اختیاری)', 'ملاحظات للمورد (اختياري)')} />
                      </label>}
                      {!simple && <BudgetField value={l.budget || ''} visible={!!l.budgetVisible} unit={l.unit ? unitLabel(l.unit) : ''} locale={locale}
                        onChange={(budget, budgetVisible) => updateLine(l.key, { budget, budgetVisible })} />}
                    </>)
                  })()}
                  {showExtra && (() => {
                    const fields = getProductSpecs(l.product_name).filter(f => f.key !== 'unit')
                    const n = fields.filter(f => (l.specs?.[f.key] || '').trim()).length
                    const req = !simple && fields.length > 0 && specsRequired(l.product_name, l.sector as any)
                    const missing = req && n < fields.length
                    const open = specsOpen === l.key || missing
                    const custom = !CATALOG_NAMES.has(l.product_name.trim())
                    const hasPhoto = !!l.photoId || (!!l.fileId && isImageName(l.fileName)) || !!l.prevFiles?.length
                    return (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {fields.length > 0 && (
                            <button type="button" onClick={() => setSpecsOpen(open ? null : l.key)} aria-expanded={open}
                              className={`min-h-[44px] text-[12px] font-bold px-3 rounded-lg border inline-flex items-center gap-1 ${missing ? 'border-[#D4A543] text-[#8F6820] bg-[#D4A543]/10' : n ? 'border-[#0B2438]/40 text-[#0B2438] bg-[#0B2438]/5' : 'border-gray-200 text-gray-700'}`}>
                              <Glyph e="⚙" /> {simple ? L('More details (optional)', 'مزید تفصیل (اختیاری)', 'تفاصيل إضافية (اختياري)') : L('Specifications', 'تفصیلات', 'المواصفات')}{req ? L(' (required)', ' (ضروری)', ' (مطلوبة)') : ''}{n ? ` (${n})` : ''} {open ? <ChevronUp className="w-3.5 h-3.5" aria-hidden /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden />}
                            </button>
                          )}
                          {l.photoWarn && (
                            <div className="basis-full text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                              <Glyph e="⚠" /> {l.photoWarn} <button type="button" className="underline font-bold min-h-[44px] px-1" onClick={() => updateLine(l.key, { photoWarn: undefined })}>{L('Keep it', 'رکھیں', 'أبقِها')}</button>
                            </div>
                          )}
                          {/* one attach button; on a line written by hand it asks for a photo (UX-174) */}
                          <button type="button" onClick={() => { setFileFor(l.key); specFileRef.current?.click() }}
                            className={`min-h-[44px] text-[12px] font-bold px-3 rounded-lg border max-w-[16rem] truncate ${l.fileId ? 'border-[#0B2438]/30 text-[#0B2438] bg-[#0B2438]/5' : custom && !hasPhoto ? 'border-[#D4A543] text-[#8F6820] bg-[#D4A543]/10' : 'border-gray-200 text-gray-700'}`}>
                            <Glyph e={custom && !l.fileId ? '📷' : '📎'} /> {l.fileId ? (l.fileName || fileWord(l.fileName))
                              : custom && !hasPhoto ? L('Add a photo so suppliers understand your request', 'تصویر لگائیں تاکہ سپلائرز آپ کی درخواست سمجھیں', 'أضف صورة ليفهم الموردون طلبك')
                              : simple ? L('Attach a photo', 'تصویر منسلک کریں', 'أرفق صورة') : L('Attach a drawing or file', 'ڈرائنگ یا فائل منسلک کریں', 'أرفق مخططاً أو ملفاً')}
                          </button>
                          {l.fileId && (
                            <button type="button" onClick={() => { deleteDraftBlobs([l.fileId!]); const [nx, ...rest] = l.moreFiles || []; updateLine(l.key, nx ? { fileId: nx.id, fileName: nx.name, moreFiles: rest, photoWarn: undefined } : { fileId: undefined, fileName: undefined, photoWarn: undefined }) }}
                              className="min-w-[44px] min-h-[44px] grid place-items-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50" aria-label={L('Remove file', 'فائل ہٹائیں', 'احذف الملف')}><X className="w-4 h-4" aria-hidden /></button>
                          )}
                          {(l.moreFiles || []).map(mf => (
                            <span key={mf.id} className="inline-flex items-center gap-1 text-[12px] font-bold ps-2.5 rounded-lg border border-[#0B2438]/30 text-[#0B2438] bg-[#0B2438]/5 max-w-[12rem]">
                              <span className="truncate"><Glyph e="📎" /> {mf.name}</span>
                              <button type="button" onClick={() => { deleteDraftBlobs([mf.id]); updateLine(l.key, { moreFiles: (l.moreFiles || []).filter(x => x.id !== mf.id) }) }} className="min-w-[44px] min-h-[44px] grid place-items-center text-gray-500 hover:text-red-600" aria-label={L('Remove file', 'فائل ہٹائیں', 'احذف الملف')}><X className="w-4 h-4" aria-hidden /></button>
                            </span>
                          ))}
                          {/* attachments carried from the earlier request (round-2 UX-040) */}
                          {(l.prevFiles || []).map(pf => (
                            <span key={pf.url} className="inline-flex items-center gap-1 text-[12px] font-bold ps-2.5 rounded-lg border border-[#0B2438]/30 text-[#0B2438] bg-[#0B2438]/5 max-w-[14rem]">
                              <span className="truncate"><Glyph e="📎" /> {pf.name || L('Attachment from the earlier request', 'پچھلی درخواست کی فائل', 'مرفق من الطلب السابق')}</span>
                              <button type="button" onClick={() => updateLine(l.key, { prevFiles: (l.prevFiles || []).filter(x => x.url !== pf.url) })} className="min-w-[44px] min-h-[44px] grid place-items-center text-gray-500 hover:text-red-600" aria-label={L('Remove file', 'فائل ہٹائیں', 'احذف الملف')}><X className="w-4 h-4" aria-hidden /></button>
                            </span>
                          ))}
                          {(!!l.fileId || !!l.prevFiles?.length) && fileCount(l) < MAX_FILES && (
                            <button type="button" onClick={() => { setFileFor(l.key); specFileRef.current?.click() }}
                              className="min-h-[44px] text-[12px] font-bold px-3 rounded-lg border border-dashed border-gray-300 text-gray-700">+ {L('Another file or photo', 'ایک اور فائل یا تصویر', 'ملف أو صورة أخرى')}</button>
                          )}
                        </div>
                        {open && fields.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-2 rounded-xl bg-gray-50 p-2.5">
                            {fields.map(f => {
                              const v = l.specs?.[f.key] || ''
                              const isCustom = !!v && !f.options.includes(v) && v !== SPEC_UNSURE
                              const setV = (val: string) => updateLine(l.key, { specs: { ...(l.specs || {}), [f.key]: val } })
                              return (
                                <label key={f.key} className="block">
                                  <span className="block text-[12px] font-semibold text-gray-700 mb-0.5">{fieldLabel(f)}{req ? ' *' : ''}</span>
                                  <select value={isCustom ? '__other' : v} aria-invalid={(req && !v.trim() && errKey === l.key) || undefined} onChange={e => setV(e.target.value === '__other' ? ' ' : e.target.value)} className={`input-field text-[16px] sm:text-sm ${req && !v.trim() ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}>
                                    <option value="">{req ? L('Choose', 'منتخب کریں', 'اختر') : L('Any', 'کوئی بھی', 'أي')}</option>
                                    {f.options.map(o => <option key={o} value={o}>{getOptionLabel(o, locale)}</option>)}
                                    <option value={SPEC_UNSURE}>{specUnsureLabel(locale)}</option>
                                    <option value="__other">{L('Other…', 'دیگر…', 'أخرى…')}</option>
                                  </select>
                                  {isCustom && (
                                    <input value={v.trim()} onChange={e => setV(e.target.value || ' ')} className="input-field text-[16px] sm:text-sm mt-1"
                                      aria-label={fieldLabel(f)} placeholder={L('Write it', 'لکھیں', 'اكتبها')} />
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                  {isInstallable(l.sector, lineSub(l)) && (
                    <label className="flex items-center gap-2 min-h-[44px] text-[13px] text-gray-700 cursor-pointer select-none">
                      <input type="checkbox" checked={!!l.with_install} onChange={e => updateLine(l.key, { with_install: e.target.checked || undefined })} className="w-5 h-5 accent-[#0B2438]" />
                      <Glyph e="🔧" /> {L('Ask for the price with installation', 'تنصیب سمیت قیمت مانگیں', 'اطلب السعر مع التركيب')}
                    </label>
                  )}
                  {ph && (
                    <label className="flex items-center gap-2 min-h-[44px] text-[13px] text-gray-700 cursor-pointer select-none">
                      <input type="checkbox" checked={ph.share} onChange={e => setPhotos(prev => prev.map(p => p.id === ph.id ? { ...p, share: e.target.checked } : p))} className="w-5 h-5 accent-[#0B2438]" />
                      {L('Send this photo to suppliers so they quote the same item', 'یہ تصویر سپلائرز کو بھیجیں تاکہ وہ یہی چیز کی قیمت دیں', 'أرسل الصورة للموردين ليسعّروا المادة نفسها')}
                    </label>
                  )}
                  {lineErr}
                  {/* «تم» folds the line into one row (it is saved either way) */}
                  <button type="button" onClick={() => { setSpecsOpen(null); updateLine(l.key, { done: true, review: undefined }) }}
                    disabled={!lineOk(l) || (!simple && missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length > 0)}
                    className="w-full min-h-[44px] rounded-xl text-sm font-bold border-2 border-[#0B2438]/30 bg-white text-[#0B2438] disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                    {!(parseFloat(l.quantity) > 0) ? L('Enter the quantity', 'مقدار لکھیں', 'أدخل الكمية')
                      : !simple && missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length ? L('Enter the specifications', 'تفصیلات لکھیں', 'أدخل المواصفات')
                      : <><Check className="w-4 h-4" aria-hidden />{L('Done', 'ہو گیا', 'تم')}</>}
                  </button>
                </div>
              )
            })}
            </div>
            <button type="button" onClick={addMore}
              className="lg:hidden w-full min-h-[48px] rounded-xl border-2 border-dashed border-[#D4A543]/60 text-[#8F6820] font-bold text-sm hover:bg-[#D4A543]/5 transition-all">
              + {L('Add another material', 'ایک اور سامان شامل کریں', 'أضف مادة أخرى')}
            </button>
          </div>
        )}

        {/* C: delivery + options, under the list */}
        {lines.length > 0 && (
          <div id="quick-delivery" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3 scroll-mt-24">
            {/* the step title comes first, then the choices (UX-078) */}
            <h2 className="font-bold text-navy flex items-center gap-1.5">{simple && stepBadge(3)}<SellerIcon name="pin" className="w-4 h-4 text-[#9D7425]" />{simple ? L('Where and when do you receive the materials?', 'سامان کہاں اور کب وصول کریں گے؟', 'أين ومتى تستلم المواد؟') : L('Where do you receive the materials?', 'سامان کہاں وصول کریں گے؟', 'أين تستلم المواد؟')}</h2>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={L('Receiving', 'وصولی', 'طريقة الاستلام')}>
              {([[false, 'truck', L('Delivery', 'ڈیلیوری', 'توصيل'), L('The supplier delivers to my site', 'سپلائر میرے مقام تک پہنچائے گا', 'يوصل المورد إلى موقعي')],
                 [true, 'store', L('Pickup', 'خود لوں گا', 'استلام'), L('I collect from the supplier', 'میں سپلائر سے خود لوں گا', 'أستلم من المورد بنفسي')]] as [boolean, string, string, string][]).map(([v, ic, t, sub]) => (
                <button key={String(v)} type="button" role="radio" aria-checked={pickup === v} onClick={() => setPickup(v)}
                  className={`rounded-xl border-2 p-3 text-start transition-all ${pickup === v ? CHOICE_ON : CHOICE_OFF}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${pickup === v ? 'bg-[#0B2438] text-[#F5C55B]' : 'bg-gray-100 text-[#0B2438]'}`}>
                      <SellerIcon name={ic} className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-bold text-navy text-sm">{pickup === v && <Check className="w-4 h-4" aria-hidden />}{t}</span>
                      <span className="block text-[12px] text-gray-600 mt-0.5">{sub}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {/* a home buyer: «استخدم موقعي الحالي» first, it fills the region and city (UX-073) */}
            {!pickup && simple && (
              <div id="quick-location" className="space-y-2 scroll-mt-28">
                <LocationPicker simple lat={geo?.lat ?? null} lng={geo?.lng ?? null} locale={locale} onChange={onGeo}
                  detectHint={L('If you are at home now, we fill the region and city for you.', 'اگر آپ ابھی گھر پر ہیں تو ہم علاقہ اور شہر خود بھر دیں گے۔', 'إذا كنت في البيت الآن نملأ المنطقة والمدينة تلقائياً.')} />
              </div>
            )}
            {pastPlaces.length > 0 && !pickup && (
              <div>
                <div className="text-[12px] font-bold text-gray-600 mb-1">{L('My previous locations:', 'میرے پچھلے مقامات:', 'مواقعي السابقة:')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {pastPlaces.map((pp, i) => {
                    const on = !!pp.geo && !!geo && Math.abs(pp.geo.lat - geo.lat) < 1e-4 && Math.abs(pp.geo.lng - geo.lng) < 1e-4
                    return (
                      <button key={i} type="button" aria-pressed={on} onClick={() => { if (pp.geo) { setGeo(pp.geo); setGeoFromProfile(false) } setAddress(pp.address); if (pp.region) { setRegion(pp.region); setCity(pp.city) } if (errField) { setErrField(null); setError('') } }}
                        className={`min-h-[44px] px-3 rounded-full border-2 text-[13px] font-bold max-w-[16rem] truncate ${on ? CHOICE_ON : CHOICE_OFF}`}>
                        <Glyph e="📍" /> {pp.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div id="quick-region" className="scroll-mt-28">
              <div className="text-[12px] font-bold text-gray-600 mb-1">{simple && !pickup ? L('Or choose by hand: region and city', 'یا خود منتخب کریں: علاقہ اور شہر', 'أو اختر يدوياً: المنطقة والمدينة') : L('Region and city', 'علاقہ اور شہر', 'المنطقة والمدينة')}</div>
              <div className="grid grid-cols-2 gap-2">
                <select value={region} aria-invalid={errField === 'region' || undefined} onChange={e => { setRegion(e.target.value); setCity(''); setGeoFilled(''); if (errField === 'region') { setErrField(null); setError('') } }} className={`input-field text-[16px] sm:text-sm ${errField === 'region' ? 'border-2 border-[#D4A543] bg-[#D4A543]/5' : ''}`} aria-label={L('Region', 'علاقہ', 'المنطقة')}>
                  <option value="">{L('Region', 'علاقہ', 'المنطقة')}</option>
                  {REGIONS.map(r => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                </select>
                <select value={city} onChange={e => setCity(e.target.value)} className="input-field text-[16px] sm:text-sm" aria-label={L('City', 'شہر', 'المدينة')} disabled={!region}>
                  <option value="">{L('City', 'شہر', 'المدينة')}</option>
                  {((CITIES_BY_REGION as any)[region] || []).map((c: any) => <option key={c.ar} value={c.ar}>{locale === 'ar' ? c.ar : c.en}</option>)}
                </select>
              </div>
              {geoFilled && <p className="text-[12px] text-[#0F6E56] mt-1" role="status">{geoFilled}</p>}
              {errField === 'region' && error && <p role="alert" className="mt-1.5 rounded-lg border-2 border-[#D4A543] bg-[#D4A543]/10 px-3 py-2 text-[13px] font-bold text-[#0B2438]">{error}</p>}
            </div>
            {region && !simple && (
              <div>
                <div className="text-[12px] font-bold text-gray-600 mb-1.5">{L('Who should receive your request?', 'آپ کی درخواست کس کو بھیجی جائے؟', 'لمن نرسل طلبك؟')}</div>
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  {([[true, L('Suppliers nearest to me', 'میرے قریب ترین سپلائرز', 'الموردون الأقرب إليّ'), L('The closest ones that sell your materials', 'آپ کا سامان بیچنے والے قریب ترین', 'الأقرب ممن يبيعون موادك')],
                     [false, L('The whole region', 'پورا علاقہ', 'المنطقة كلها'), L(`Suppliers across all of ${getRegionLabel(region, 'en')}`, `پورے ${getRegionLabel(region, 'ur')} کے سپلائرز`, `موردون من كل أنحاء ${getRegionLabel(region, 'ar')}`)]] as const).map(([v, t, sub]) => (
                    <button key={String(v)} type="button" role="radio" aria-checked={nearbyOnly === v} onClick={() => setNearbyOnly(v)}
                      className={`text-start rounded-xl border-2 px-3 py-2 min-h-[56px] ${nearbyOnly === v ? CHOICE_ON : CHOICE_OFF}`}>
                      <span className="flex items-center gap-1 text-sm font-bold text-navy">{nearbyOnly === v && <Check className="w-4 h-4" aria-hidden />}{t}</span>
                      <span className="block text-[12px] text-gray-600">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!pickup && !simple && (
              <div id="quick-location" className="space-y-2 scroll-mt-28">
                <LocationPicker lat={geo?.lat ?? null} lng={geo?.lng ?? null} locale={locale} onChange={onGeo} />
              </div>
            )}
            {!pickup && (
              <div id="quick-location-box" className="space-y-2 scroll-mt-28">
                {/* a visible label says whether the address is required (round-4 UX-119) */}
                <label htmlFor="quick-address" className="block text-[12px] font-bold text-gray-700">
                  {L('Address details', 'پتے کی تفصیل', 'تفاصيل العنوان')}{' '}
                  <span className={geo ? 'font-normal text-gray-500' : 'font-semibold text-[#8F6820]'}>{geo
                    ? L('(optional)', '(اختیاری)', '(اختياري)')
                    : L('(required because you did not set the location on the map)', '(ضروری، کیونکہ آپ نے نقشے پر مقام نہیں بتایا)', '(مطلوب لأنك لم تحدّد الموقع على الخريطة)')}</span>
                </label>
                <input id="quick-address" value={address} onChange={e => { setAddress(e.target.value); if (errField === 'location') { setErrField(null); setError('') } }} maxLength={300}
                  aria-invalid={errField === 'location' || undefined}
                  className={`input-field text-[16px] sm:text-sm ${errField === 'location' ? 'border-2 border-[#D4A543] bg-[#D4A543]/5' : ''}`}
                  placeholder={L('District, street, landmark', 'محلہ، گلی، نشانی', 'الحي، الشارع، علامة مميزة')} />
                {geo && geoFromProfile && <p className="text-[12px] text-gray-600">{L('Location filled from your profile. Change it if this delivery goes elsewhere.', 'مقام آپ کی پروفائل سے لیا گیا۔ ضرورت ہو تو بدلیں۔', 'عُبّئ الموقع من ملفك الشخصي. غيّره إن كان التوصيل إلى مكان آخر.')}</p>}
                {errField === 'location' && error && <p role="alert" className="mt-1.5 rounded-lg border-2 border-[#D4A543] bg-[#D4A543]/10 px-3 py-2 text-[13px] font-bold text-[#0B2438]">{error}</p>}
                <p className="text-[12px] text-gray-600"><Glyph e="🔒" /> {L('Only the supplier you choose sees the exact location.', 'صرف منتخب سپلائر درست مقام دیکھے گا۔', 'لا يرى الموقع الدقيق إلا المورد الذي تختاره.')}</p>
              </div>
            )}
            {/* how long suppliers have to send offers (a home buyer gets 24 or 48 hours by itself) */}
            {!simple && (
              <div>
                <div id="hours-q" className="text-[12px] font-bold text-gray-600 mb-1.5">{L('How long is the offer window for suppliers?', 'آپ سپلائرز کو آفرز کی کتنی مہلت دیتے ہیں؟', 'ما مهلة العروض التي تمنحها للموردين؟')}</div>
                <div role="radiogroup" aria-labelledby="hours-q" className="flex flex-wrap gap-1.5">
                  {([[6, L('6 hours', '6 گھنٹے', '6 ساعات')], [24, L('24 hours', '24 گھنٹے', '24 ساعة')], [48, L('2 days', '2 دن', 'يومان')], [72, L('3 days', '3 دن', '3 أيام')], [168, L('A week', 'ایک ہفتہ', 'أسبوع')]] as [number, string][]).map(([h, lab]) => (
                    <button key={h} type="button" role="radio" aria-checked={hours === h} onClick={() => setHours(h)}
                      className={`min-h-[44px] px-3 rounded-full border-2 text-[13px] font-bold inline-flex items-center gap-1 ${hours === h ? CHOICE_ON : CHOICE_OFF}`}>{hours === h && <Check className="w-3.5 h-3.5" aria-hidden />}{lab}</button>
                  ))}
                </div>
                <p className="text-[12px] text-gray-600 mt-1">{L('The offer window ends: ', 'آفرز کی مہلت ختم ہو گی: ', 'تنتهي مهلة العروض: ')}<b className="text-[#0B2438]">{whenText(Date.now() + hours * 3600 * 1000)}</b>. {L('The delivery date is a separate choice below.', 'ڈیلیوری کی تاریخ نیچے الگ ہے۔', 'موعد وصول المواد خيار منفصل في الأسفل.')}</p>
                {windowNote && <div className="mt-2">{windowNote}</div>}
              </div>
            )}
            {simple && needBlock}
            {/* always visible for a business buyer (owner 2026-10-19: a folded «خيارات إضافية» went unnoticed) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              {simple
                ? <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} className="w-full min-h-[44px] text-start text-sm font-bold text-[#0B2438] flex items-center justify-between">{L('More options (optional)', 'مزید اختیارات (اختیاری)', 'خيارات إضافية (اختياري)')} {moreOpen ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}</button>
                : <div className="text-sm font-bold text-[#0B2438]">{L('More options (optional)', 'مزید اختیارات (اختیاری)', 'خيارات إضافية (اختياري)')}</div>}
              <div className={`mt-3 space-y-3 ${simple && !moreOpen ? 'hidden' : ''}`}>
                {!simple && needBlock}
                {windowNote}
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-field text-[16px] sm:text-sm" aria-label={L('Notes for suppliers (optional)', 'سپلائرز کے لیے نوٹس (اختیاری)', 'ملاحظات للموردين (اختياري)')} placeholder={L('Notes for suppliers (optional)', 'سپلائرز کے لیے نوٹس (اختیاری)', 'ملاحظات للموردين (اختياري)')} />
                {!simple && (<>
                <div>
                  <div className="text-sm font-bold text-[#0B2438] mb-2">{L('Who should price it?', 'کون قیمت دے؟', 'من تريد أن يسعّر لك؟')}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([['all', L('All suppliers', 'سب سپلائرز', 'كل الموردين'), L('The most offers', 'سب سے زیادہ آفرز', 'أكبر عدد من العروض')], ...TIERS.map(k => [k, tierLabel(k, locale as any, false), tierHint(k, locale as any)])] as [string, string, string][]).map(([k, label, hint]) => (
                      <button key={k} type="button" onClick={() => setTier(k as any)} aria-pressed={tier === k}
                        className={`p-2.5 rounded-xl border-2 text-start transition-colors ${tier === k ? CHOICE_ON : CHOICE_OFF}`}>
                        <div className="flex items-center gap-1 text-[13px] font-bold text-[#0B2438] leading-snug">{tier === k && <Check className="w-4 h-4 shrink-0" aria-hidden />}{label}</div>
                        <div className="text-[12px] text-gray-600 mt-0.5 leading-snug line-clamp-2">{hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={vatRequired} onChange={e => setVatRequired(e.target.checked)} className="w-5 h-5 accent-[#0B2438]" />
                  {L('I need a VAT tax invoice', 'مجھے VAT ٹیکس انوائس چاہیے', 'أحتاج فاتورة ضريبية')}
                </label>
                </>)}
                <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} className="w-5 h-5 accent-[#0B2438]" />
                  {L('Only verified suppliers', 'صرف تصدیق شدہ سپلائرز', 'الموردون الموثّقون فقط')}
                </label>
              </div>
            </div>
            {/* the buyer's identity is always hidden until an offer is chosen (UX-077): a fact, not an option */}
            <p className="text-[13px] text-gray-700 flex items-start gap-2"><Lock className="w-4 h-4 mt-0.5 shrink-0 text-[#0B2438]" aria-hidden />{L('Your name and contact details are hidden from suppliers until you choose an offer.', 'آپ کا نام اور رابطہ سپلائرز سے چھپا رہتا ہے جب تک آپ کوئی آفر منتخب نہ کریں۔', 'اسمك وبيانات تواصلك مخفية عن الموردين حتى تختار عرضاً.')}</p>
          </div>
        )}
        </div>
      </div>

      {/* the send bar sticks to the bottom of the main column, so it never slides under the side menu (UX-074) */}
      {lines.length > 0 && (
        <div className="sticky z-30 bottom-[calc(3.9rem_+_env(safe-area-inset-bottom))] lg:bottom-0 -mx-4 sm:-mx-6 lg:-mx-7 bg-white border-t border-gray-200 px-4 pt-3 print:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="block text-sm text-gray-600">{countLabel(sendable.length, locale, arMaterials, 'item', 'اشیاء')}</span>
              {error && errKey ? <span className={'block text-[13px] font-bold ' + (errSoft ? 'text-[#0B2438]' : 'text-red-700')} role="alert">{error}</span>
                : sendHint ? <span className="block text-[13px] font-bold text-[#8F6820]" role="status">{sendHint}</span>
                : skipped > 0 ? <span className="block text-[13px] text-gray-600">{L(`${skipped} unnamed photo line(s) will be left out`, `بغیر نام کی ${skipped} تصویری لائنیں شامل نہیں ہوں گی`, `لن يُرسل ${skipped === 1 ? 'سطر الصورة غير المسمّى' : arCount(skipped, 'سطر واحد', 'سطران', 'أسطر', 'سطراً') + ' من الصور غير المسمّاة'}`)}</span>
                : null}
            </div>
            <button type="button" onClick={review} disabled={sending || identifying}
              className="btn-orange min-h-[48px] px-6 rounded-xl font-extrabold disabled:opacity-50 shrink-0">
              {sending ? L('Sending…', 'بھیج رہے ہیں…', 'جارٍ الإرسال…') : ready ? L('Send for prices', 'قیمت منگوائیں', 'أرسل طلب التسعير') : L('Complete the details', 'تفصیلات مکمل کریں', 'أكمل البيانات')}
            </button>
          </div>
        </div>
      )}

      {/* «حُذفت X · تراجع» for 5 seconds */}
      {undo && (
        <div className="fixed z-[46] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] lg:bottom-24 sm:w-[26rem] rounded-xl bg-[#0B2438] text-white shadow-xl px-4 py-2 flex items-center justify-between gap-3 print:hidden" role="status">
          <span className="text-sm truncate">{L(`Removed «${nameLabel(undo.line.product_name) || 'item'}»`, `«${nameLabel(undo.line.product_name)}» ہٹا دیا گیا`, `حُذفت «${nameLabel(undo.line.product_name) || 'المادة'}»`)}</span>
          <button type="button" onClick={undoRemove} className="min-h-[44px] px-3 rounded-lg font-extrabold text-[#F5C55B] hover:bg-white/10 shrink-0">{L('Undo', 'واپس لائیں', 'تراجع')}</button>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { if (!sending) setConfirming(false) }}>
          <div ref={confirmRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col outline-none">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-2">
              <div>
                <h2 id="confirm-title" className="font-extrabold text-navy text-lg">{L('Review your request', 'درخواست کا جائزہ لیں', 'راجع طلبك قبل الإرسال')}</h2>
                <p className="text-[13px] text-gray-600 mt-1">{L('Check every detail; suppliers price exactly what is here.', 'ہر تفصیل اچھی طرح چیک کریں، کیونکہ سپلائرز بالکل وہی قیمت لگاتے ہیں جو یہاں لکھا ہے۔', 'تأكّد من كل التفاصيل، فالموردون يسعّرون ما هو مكتوب هنا بالضبط.')}</p>
              </div>
              <button type="button" onClick={() => setConfirming(false)} disabled={sending} aria-label={L('Close', 'بند کریں', 'إغلاق')} className="w-[44px] h-[44px] grid place-items-center rounded-full bg-gray-100 text-[#0B2438] shrink-0 disabled:opacity-40"><X className="w-5 h-5" aria-hidden /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {!reach && reachState === 'loading' && (
                <p className="min-h-[40px] flex items-center rounded-xl bg-gray-50 border border-gray-100 px-3 text-[13px] text-gray-600" role="status">{L('Checking how many suppliers your request reaches…', 'جانچ رہے ہیں کہ درخواست کتنے سپلائرز تک پہنچے گی…', 'نتحقق من عدد الموردين الذين سيصلهم طلبك…')}</p>
              )}
              {reach && (
                <div className="space-y-1.5 min-h-[40px]">
                  {reach.reached >= 1 && (() => {
                    const cityName = city ? (((CITIES_BY_REGION as any)[region] || []).find((c: any) => c.ar === city)?.[locale === 'ar' ? 'ar' : 'en'] || city) : ''
                    const where = nearbyOnly && cityName
                      ? L(` in ${cityName}`, ` ${cityName} میں`, ` في ${cityName}`)
                      : region ? L(` in the ${getRegionLabel(region, 'en')} region`, ` ${getRegionLabel(region, 'ur')} علاقے میں`, ` في منطقة ${getRegionLabel(region, 'ar')}`) : ''
                    return (
                      <p className="rounded-xl bg-[#D4A543]/10 border border-[#D4A543]/40 px-3 py-2 text-[13px] font-bold text-[#0B2438]">
                        {L(`Your request will reach about ${reach.reached} supplier${reach.reached === 1 ? '' : 's'}${where}.`, `آپ کی درخواست تقریباً ${reach.reached} سپلائرز تک پہنچے گی${where}۔`, `سيصل طلبك إلى نحو ${arCount(reach.reached, 'مورد واحد', 'موردَين', 'موردين', 'مورداً')}${where}.`)}
                      </p>
                    )
                  })()}
                  {reach.reached === 0 && (
                    <p className="rounded-xl bg-[#D4A543]/10 border border-[#D4A543]/40 px-3 py-2 text-[13px] font-bold text-[#0B2438]">
                      {L('We have not found suppliers for your materials in your area yet, and we will look for them for you.', 'آپ کے علاقے میں آپ کے سامان کے سپلائرز ابھی نہیں ملے، ہم آپ کے لیے تلاش کریں گے۔', 'لم نجد بعد موردين لموادك في منطقتك، وسنبحث لك عنهم.')}
                    </p>
                  )}
                  {reach.items.filter(x => Number(x.suppliers) === 0).map(x => (
                    <p key={x.name} className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[13px] text-amber-900">
                      {uncoveredMsg(x.name, false)}
                    </p>
                  ))}
                </div>
              )}
              <div>
                <div className="text-[12px] font-bold text-gray-600 mb-2">{L('Materials', 'سامان', 'المواد')} ({sendable.length})</div>
                <ol className="space-y-2">
                  {sendable.map((l, i) => {
                    const sp = specPairs(l)
                    const lph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
                    const files = fileCount(l) + (lph?.share ? 1 : 0) // the line's own photo is an attachment too (round-4 UX-120)
                    const bud = parseBudget(l.budget)
                    return (
                      <li key={l.key} className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-navy" dir="auto">{i + 1}. {nameLabel(l.product_name)}</span>
                          <span className="font-bold text-[#8F6820] whitespace-nowrap">{qtyText(l)}</span>
                        </div>
                        {(sp.length > 0 || l.details.trim() || files > 0 || l.brand?.trim()) && (
                          <div className="text-[12px] text-gray-600 mt-1" dir="auto">
                            {[sp.join('، '), l.brand?.trim() ? L('Brand: ', 'برانڈ: ', 'الماركة: ') + l.brand.trim() : '', l.details.trim(),
                              files > 1 ? L(`${files} attachments`, `${files} منسلکات`, arCount(files, 'مرفق واحد', 'مرفقان', 'مرفقات', 'مرفقاً')) : files === 1 ? (lph?.share ? L('Photo attached', 'تصویر منسلک', 'صورة مرفقة') : fileWord(l.fileName)) : ''].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {bud != null && (
                          <div className="text-[12px] font-bold text-[#8F6820] mt-1">
                            {L(`Most you pay: ${bud} SAR/${unitLabel(l.unit)} incl. VAT`, `زیادہ سے زیادہ رقم: ${bud} ریال/${unitLabel(l.unit)} VAT سمیت`, `أقصى مبلغ: ${bud} ر.س/${unitLabel(l.unit)} شامل الضريبة`)}
                            {' · '}{l.budgetVisible ? L('visible to suppliers', 'سپلائرز کو نظر آئے گا', 'ظاهرة للموردين') : L('(hidden from suppliers)', '(سپلائرز سے پوشیدہ)', '(مخفية عن الموردين)')}
                          </div>
                        )}
                        {wantsInstall(l) && (
                          <div className="text-[12px] font-bold text-[#0B2438] mt-1"><Glyph e="🔧" /> {L('Price requested with installation', 'تنصیب سمیت قیمت مطلوب', 'السعر مطلوب مع التركيب')}</div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
              {windowNote}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                <dt className="text-gray-600">{L('Receiving', 'وصولی', 'الاستلام')}</dt>
                <dd className="font-semibold"><span className="inline-flex items-center gap-1.5"><SellerIcon name={pickup ? 'store' : 'truck'} className="w-4 h-4 text-[#0B2438]" />{pickup ? L('Pickup from the supplier', 'سپلائر سے خود', 'استلام من المورد') : L('Delivery', 'ڈیلیوری', 'توصيل')}</span></dd>
                <dt className="text-gray-600">{L('Area', 'علاقہ', 'المنطقة')}</dt>
                <dd className="font-semibold">{[city ? ((CITIES_BY_REGION as any)[region] || []).find((c: any) => c.ar === city)?.[locale === 'ar' ? 'ar' : 'en'] || city : '', getRegionLabel(region, locale)].filter(Boolean).join(locale === 'en' ? ', ' : '، ')}</dd>
                {!pickup && (<>
                  <dt className="text-gray-600">{L('Location', 'مقام', 'الموقع')}</dt>
                  <dd className="font-semibold" dir="auto">
                    {geo ? <a href={`https://www.google.com/maps?q=${geo.lat},${geo.lng}`} target="_blank" rel="noopener noreferrer" className="text-[#0B2438] underline inline-flex items-center gap-1"><SellerIcon name="pin" className="w-3.5 h-3.5" />{L('On the map', 'نقشے پر', 'على الخريطة')}</a> : null}
                    {geo && address.trim() ? ' · ' : ''}{address.trim()}
                  </dd>
                </>)}
                <dt className="text-gray-600">{L('Offer window ends', 'آفرز کی مہلت ختم', 'تنتهي مهلة العروض')}</dt>
                <dd className="font-semibold">{whenText(Date.now() + effHours * 3600 * 1000)} <span className="text-gray-500 font-normal">({durationLabel(effHours)})</span></dd>
                {needDays != null && (<>
                  <dt className="text-gray-600">{L('Delivery needed', 'ڈیلیوری', 'التسليم')}</dt>
                  <dd className="font-semibold">{needDays === 1 ? L('Within a day', 'ایک دن میں', 'خلال يوم') : needDays === 7 ? L('Within a week', 'ایک ہفتے میں', 'خلال أسبوع') : L(`Within ${needDays} days`, `${needDays} دن میں`, `خلال ${needDays} ${needDays <= 10 ? 'أيام' : 'يوماً'}`)}</dd>
                </>)}
                {!simple && region && (<>
                  <dt className="text-gray-600">{L('Sent to', 'کس کو', 'يصل إلى')}</dt>
                  <dd className="font-semibold">{nearbyOnly ? L('The suppliers nearest to you', 'آپ کے قریب ترین سپلائرز', 'الموردين الأقرب إليك') : L(`Suppliers across all of ${getRegionLabel(region, 'en')}`, `پورے ${getRegionLabel(region, 'ur')} کے سپلائرز`, `الموردين في كل أنحاء ${getRegionLabel(region, 'ar')}`)}{tier !== 'all' ? ' · ' + tierLabel(tier, locale as any, false) : ''}</dd>
                </>)}
                {notes.trim() && (<>
                  <dt className="text-gray-600">{L('Notes', 'نوٹس', 'ملاحظات')}</dt>
                  <dd className="font-semibold whitespace-pre-wrap" dir="auto">{notes.trim()}</dd>
                </>)}
              </dl>
              <div className="flex flex-wrap gap-1.5 text-[12px]">
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1"><Lock className="w-3 h-3" aria-hidden />{L('Name hidden until you choose', 'انتخاب تک نام پوشیدہ', 'الاسم مخفي حتى تختار')}</span>
                {!simple && vatRequired && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{L('VAT invoice', 'VAT انوائس', 'فاتورة ضريبية')}</span>}
                {verifiedOnly && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{L('Verified suppliers only', 'صرف تصدیق شدہ', 'الموردون الموثّقون فقط')}</span>}
                
                {photos.some(p => p.share) && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1"><Paperclip className="w-3 h-3" aria-hidden />{L('Photos shared', 'تصاویر شیئر', 'الصور مرفقة')}</span>}
              </div>
            </div>
            {sending ? (
              <div className="p-4 border-t border-gray-100 space-y-2" role="status" aria-live="polite" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                <p className="text-[13px] font-bold text-[#0B2438]">
                  {upload && upload.total > 0 && upload.done < upload.total
                    ? L(`Uploading attachments (${upload.done + 1} of ${upload.total})…`, `فائلیں اپ لوڈ ہو رہی ہیں (${upload.total} میں سے ${upload.done + 1})…`, `جارٍ رفع المرفقات (${upload.done + 1} من ${upload.total})…`)
                    : L('Sending your request…', 'آپ کی درخواست بھیجی جا رہی ہے…', 'جارٍ إرسال طلبك…')}
                </p>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ background: '#D4A543', width: `${upload && upload.total ? Math.max(8, Math.round((upload.done / upload.total) * 90)) : 90}%` }} />
                </div>
              </div>
            ) : (
            <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-2" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <button type="button" onClick={() => setConfirming(false)} className="min-h-[48px] rounded-xl border border-gray-200 font-bold text-gray-700 inline-flex items-center justify-center gap-1.5">
                <Pencil className="w-4 h-4" aria-hidden /> {L('Edit', 'ترمیم', 'تعديل')}
              </button>
              <button type="button" onClick={send} disabled={sending} className="btn-orange min-h-[48px] rounded-xl font-extrabold disabled:opacity-50">
                {L('Confirm and send', 'تصدیق کر کے بھیجیں', 'تأكيد وإرسال')}
              </button>
            </div>
            )}
          </div>
        </div>
      )}
      {showCatalog && (
        <CatalogPicker simple={simple} locale={locale} onClose={closeCatalog} initialQuery={startQ} initialSection={startSection as any}
          picked={lines.map(l => ({ key: l.key, name: l.product_name, qty: l.quantity, unit: l.unit }))}
          onRemove={(key: string) => removeLine(key)}
          onQty={(k, q) => updateLine(k, { quantity: q })}
          onPick={addFromCatalog} />
      )}
      {pack && <PackSheet pack={pack} locale={locale} onAdd={addPack} onClose={() => setPack(null)} />}
    </div>
  )
}
