'use client'

import Link from 'next/link'
import { canUseProjects, PROJECTS_OPEN_TO_ALL } from '@/lib/plans'
import { isInstallable } from '@/lib/installation'
import { useCatalogSpecs } from '@/lib/useCatalogSpecs'
import { friendlyError } from '@/lib/friendlyError'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { TIERS, tierLabel, tierHint, normTier } from '@/lib/sellers'
import { getSectorLabel, SUB_CATEGORIES, GROUP_LABELS, UNIT_OPTIONS, REGIONS, CITIES_BY_REGION, detectSubCategory, getSubCategoryLabel, getProductLabel, getUnitLabel, getRegionLabel, SECTOR_PRODUCTS, unitChoicesFor, getDefaultUnit, specsRequired, missingSpecs, getProductSpecs, brandApplies, withBrand, type Sector } from '@/types'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import LineSpecialty, { choiceDone } from '@/components/shared/LineSpecialty'
import CatalogPicker from '@/components/shared/CatalogPicker'
import Glyph from '@/components/shared/Glyph'
import { arCount, arItems, arMaterials, dateLocale } from '@/lib/text'
import { storedBuyerType } from '@/lib/buyerType'
import HomeModeNotice from '@/components/tender/HomeModeNotice'
import CatIcon from '@/components/shared/CatIcon'
import { toLatinDigits } from '@/lib/phone'
import { useEnsureVerified } from '@/components/shared/VerifyGate'
import { askConfirm, notify } from '@/lib/askConfirm'
import { useRouter } from 'next/navigation'
import { fmtNum } from '@/components/tender/labels'
import ItemSpecFields from '@/components/tender/ItemSpecFields'
import { readProjectDraft, writeProjectDraft, clearProjectDraft, fetchBoqServerDraft, saveBoqServerDraft, deleteBoqServerDraft } from '@/lib/tender/projectDraft'

// «قائمة 23 نوفمبر» when the buyer leaves the (optional) list name empty (round-5 UX-156)
const defaultListName = (locale: string) => {
  const d = new Date().toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })
  return locale === 'en' ? `List ${d}` : locale === 'ur' ? `فہرست ${d}` : `قائمة ${d}`
}

// «١٢٫٥» / «۱۲» → «12.5» / «12» (Arabic and Urdu keyboards type these digits and decimal marks)
// «2,500» / «٢٬٥٠٠» → 2500: a comma is a thousands separator and is dropped, «٫» or «.» is the decimal point (UX-002);
// only the first decimal point is kept, so a typo never turns «1.250.5» into a smaller number silently
const toQty = (v: string) => { const t = toLatinDigits(v).replace(/٫/g, '.').replace(/[^0-9.]/g, ''); const i = t.indexOf('.'); return i < 0 ? t : t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '') }

// a specialty that belongs to its sector, else null (UX-023): a mismatched pair would reach the wrong suppliers or none
const validSub = (sector: string, sub: any): string | null => (sub && (SUB_CATEGORIES as any)[sector]?.[sub] ? String(sub) : null)
// a restored or received line whose sector and specialty do not match goes back to «choose its specialty»
const normalizeLine = (it: any) => (it && it.sub_category && !validSub(it.sector, it.sub_category) ? { ...it, sub_category: null, needs_classification: true, done: false } : it)
// what a draft keeps of a line: never the file itself (it cannot be stored), only its name to ask for it again (UX-094)
const draftLine = (it: any) => ({ ...it, specFile: null, specFileName: it.specFile?.name || it.specFileName || undefined })

// تجميع بنود الـ BOQ حسب المجموعة (مثل قوائم التسعير) — يحتفظ بالفهرس الأصلي لكل بند
function getGroupedItems(items: any[], locale: string, only?: Set<string> | null) {
  const groups: Record<string, any> = {}
  items.forEach((item: any, i: number) => {
    if (only && !only.has(item.id)) return // round-7 UX-080: a chip filter shows only the lines it counted
    const sub = item.sub_category
    const gkey = (sub && (SUB_CATEGORIES as any)[item.sector]?.[sub]?.group) || '_unclassified'
    if (!groups[gkey]) {
      const gl = gkey === '_unclassified' ? null : (GROUP_LABELS as any)[gkey]
      groups[gkey] = {
        key: gkey,
        // one name for this state everywhere on the page: «بلا تخصص» (round-5 UX-156)
        label: gkey === '_unclassified' ? (locale === 'en' ? 'No specialty' : locale === 'ur' ? 'بغیر شعبہ' : 'بلا تخصص') : (gl ? (gl[locale] || gl.ar) : gkey),
        defaultOpen: gkey === '_unclassified',
        entries: [],
      }
    }
    groups[gkey].entries.push({ item, i })
  })
  // open a group that still needs something: a specialty or a quantity (owner 2026-10-24)
  for (const g of Object.values(groups)) if (only || g.entries.some((e: any) => !(parseFloat(e.item.quantity) > 0))) g.defaultOpen = true
  return Object.keys(groups).sort((a, b) => (a === '_unclassified' ? -1 : b === '_unclassified' ? 1 : 0)).map(k => groups[k])
}

// «الطول: 2.0م، العرض: 20سم» from the chosen spec fields (same format as the request page)
function specTextOf(name: string, specs?: Record<string, string>) {
  if (!specs) return ''
  return getProductSpecs(name).filter(f => f.key !== 'unit' && (specs[f.key] || '').trim()).map(f => `${f.ar}: ${specs[f.key].trim()}`).join('، ')
}

// Why a BOQ line read from the file needs a look (flags from /api/parse-boq)
function boqFlagText(flags: any, L: (en: string, ur: string, ar: string) => string): string[] {
  const f: string[] = Array.isArray(flags) ? flags : []
  const out: string[] = []
  if (f.includes('qty_missing')) out.push(L('no quantity in the file', 'فائل میں مقدار نہیں', 'لا توجد كمية في الملف'))
  if (f.includes('qty_rate_amount_mismatch')) out.push(L('quantity × rate ≠ amount', 'مقدار × ریٹ ≠ رقم', 'الكمية × السعر لا تساوي الإجمالي'))
  if (f.includes('qty_from_amount')) out.push(L('quantity worked out from amount ÷ rate', 'مقدار رقم ÷ ریٹ سے', 'الكمية محسوبة من الإجمالي ÷ السعر'))
  if (f.includes('unit_missing') || f.includes('unit_unrecognized')) out.push(L('check the unit', 'یونٹ چیک کریں', 'تحقّق من الوحدة'))
  if (f.includes('from_scan')) out.push(L('read from a scan', 'اسکین سے پڑھا گیا', 'مقروء من ملف ممسوح'))
  if (f.includes('merged')) out.push(L('repeated lines added together', 'دہرائی گئی لائنیں جمع کی گئیں', 'جُمعت كميات البند المكرر'))
  return out
}

// one sector name per language on every page (round-7 UX-141): no local name map
const sectorName = (s: string, locale: string) => getSectorLabel(s, locale)
const CATALOG_SET = new Set<string>(Object.values(SECTOR_PRODUCTS).flat())
// an item that came from a file (the uploaded bill of quantities, or a list moved from a tender review), as opposed
// to one the buyer added himself. Older drafts have no from_file flag: their file items have ids «item-<row>»
// (hand-added ones carry a timestamp) and tender items «tender-<n>».
const isFileItem = (it: any) => !!it?.from_file || /^item-\d{1,6}$/.test(String(it?.id || '')) || String(it?.id || '').startsWith('tender-')

export default function NewProjectPage() {
  useCatalogSpecs() // spec fields and order units (loaded on demand)
  const { locale, dir } = useTranslation()
  const ensureVerified = useEnsureVerified()
  const [user, setUser] = useState<any>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null) // null = still checking
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [step, setStep] = useState<'setup' | 'items' | 'review'>('setup')

  // Project info
  const [title, setTitle] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  // the ONLY notes suppliers read: one visible field «ملاحظات للموردين» (UX-002). Nothing else (the project
  // name, the tender name, a hidden draft value) is ever written into rfqs.notes.
  const [supplierNotes, setSupplierNotes] = useState('')
  const [deliveryRequired, setDeliveryRequired] = useState(true)
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [geoMsg, setGeoMsg] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [viewFilter, setViewFilter] = useState<'all' | 'noqty' | 'nosub'>('all') // round-7 UX-080
  const [viewIds, setViewIds] = useState<Set<string> | null>(null)
  const toggleGroup = (k: string) => setOpenGroups(o => ({ ...o, [k]: !(o[k] ?? (k === '_unclassified')) }))
  // fields of step 3, so a click on «إرسال» can take the buyer to the first missing one
  const titleRef = useRef<HTMLInputElement>(null)
  const regionRef = useRef<HTMLSelectElement>(null)
  const deliveryRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const [showMissing, setShowMissing] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null) // the item a validation message points at
  const [justAddedId, setJustAddedId] = useState<string | null>(null) // only this item takes the focus
  const [nameEdit, setNameEdit] = useState<string | null>(null) // a catalog item whose name is being changed
  // تحديد الموقع تلقائياً → يملأ المنطقة والمدينة وعنوان التوصيل
  function geolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeoMsg(L('Geolocation not supported', 'براؤزر مقام معلوم کرنے کی سہولت نہیں دیتا', 'المتصفح لا يدعم تحديد الموقع')); return }
    setGeoMsg(L('Locating…', 'مقام معلوم کیا جا رہا ہے…', 'جارٍ تحديد الموقع…'))
    navigator.geolocation.getCurrentPosition(
      async (pos: any) => {
        const { latitude, longitude } = pos.coords
        const link = `https://maps.google.com/?q=${latitude},${longitude}`
        setGeoMsg(L('Reading city…', 'شہر پڑھا جا رہا ہے…', 'جارٍ قراءة المدينة…'))
        try {
          const r = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`)
          const d = await r.json()
          if (d.ok) {
            const geoR = String(d.region || '').replace('منطقة', '').trim()
            const matchedRegion = REGIONS.find((rr: string) => geoR.includes(rr) || rr.includes(geoR) || String(d.region || '').includes(rr))
            let cityName = ''
            if (matchedRegion) {
              const cities = CITIES_BY_REGION[matchedRegion] || []
              const geoCity = String(d.city || '').replace(/^(محافظة|بلدية)\s*/, '').trim()
              const mc = cities.find((c: any) => c.ar === geoCity || (geoCity && (geoCity.includes(c.ar) || c.ar.includes(geoCity))))
                || cities.find((c: any) => c.ar === matchedRegion) || cities[0]
              setRegion(matchedRegion); setCity(mc ? mc.ar : '')
              cityName = mc ? mc.ar : matchedRegion
            } else { cityName = d.city || d.region || '' }
            setDeliveryRequired(true)
            setDeliveryLocation(d.formatted || link)
            setGeoMsg(`${L('Location set', 'مقام طے ہو گیا', 'تم تحديد موقعك')}${cityName ? ` — ${cityName}` : ''}`)
            return
          }
        } catch {}
        setDeliveryRequired(true)
        setDeliveryLocation(link)
        setGeoMsg(L('Location pin saved', 'مقام محفوظ ہو گیا', 'تم حفظ موقعك'))
      },
      () => setGeoMsg(L('Location access denied', 'مقام تک رسائی مسترد — براؤزر کی ترتیبات سے اجازت دیں', 'تم رفض الوصول للموقع — فعّله من إعدادات المتصفح')),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // BOQ upload
  const [boqFile, setBoqFile] = useState<any>(null)
  const [parseError, setParseError] = useState('')
  const [aiUsed, setAiUsed] = useState(false)
  const fileRef = useRef<any>(null)

  // مستند مواصفات المشروع (لمطابقة الرموز مثل DRS-701 واستخراج التفاصيل)
  const [specsFile, setSpecsFile] = useState<any>(null)
  const [matchingSpecs, setMatchingSpecs] = useState(false)
  const [specMsg, setSpecMsg] = useState('')
  const [specOk, setSpecOk] = useState(false) // the message is a success (shown green with a check icon)
  const specsRef = useRef<any>(null)

  // يقرأ المواصفات + البنود ويملأ تفاصيل كل بند من المستند
  async function matchSpecs() {
    if (!specsFile) { setSpecMsg(L('Upload the specification file first', 'پہلے اسپیسیفکیشن فائل اپ لوڈ کریں', 'ارفع ملف المواصفات أولاً')); return }
    const targets = items.filter((i: any) => i.product_name)
    if (targets.length === 0) { setSpecMsg(L('Add items (or upload a BOQ) first', 'پہلے آئٹمز شامل کریں (یا BOQ اپ لوڈ کریں)', 'أضف بنوداً (أو ارفع جدول الكميات) أولاً')); return }
    setMatchingSpecs(true); setSpecMsg(''); setSpecOk(false)
    try {
      const fd = new FormData()
      fd.append('file', specsFile)
      // code = the BOQ item number (e.g. DRS-701), specification = the BOQ wording, so conflicts with the spec can be flagged
      fd.append('items', JSON.stringify(targets.map((i: any) => ({ ref: i.id, code: i.ref || '', product_name: i.product_name, specification: i.description || i.specification || '', sector: i.sector }))))
      const res = await fetch('/api/match-spec', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.ok) { setSpecMsg((data.needsGemini ? L('Reading PDF files and photos is not available right now; convert it to Excel or text — ', 'PDF اور تصاویر پڑھنا ابھی دستیاب نہیں؛ اسے Excel یا متن میں بدلیں — ', 'قراءة ملفات PDF والصور غير متاحة حالياً؛ حوّله إلى Excel أو نص — ') : '') + (data.message || L('Could not match the specifications', 'اسپیسیفکیشن نہیں ملائی جا سکیں', 'تعذّرت مطابقة المواصفات'))); return }
      let filled = 0, diff = 0
      setItems(prev => prev.map((it: any) => {
        const s = data.specs?.[it.id]
        if (!s || !s.trim()) return it
        // where the BOQ line contradicts the specification (e.g. C30 in the BOQ, C35 in the spec)
        const conflicts: string[] = Array.isArray(data.details?.[it.id]?.conflicts) ? data.details[it.id].conflicts.slice(0, 4) : []
        it = { ...it, specConflicts: conflicts }
        const doc = s.trim()
        // لا نكتب فوق مواصفة موجودة — نُبقيها للمقارنة (specFromDoc). البند الفارغ يُعبَّأ مباشرة.
        if (!(it.specification || '').trim()) { filled++; return { ...it, specification: doc, specFromDoc: doc } }
        if ((it.specification || '').trim() !== doc) { diff++; return { ...it, specFromDoc: doc } }
        return { ...it, specFromDoc: doc }
      }))
      const parts = [L(`Matched ${data.matched} of ${data.total} items`, `${data.total} میں سے ${data.matched} آئٹمز ملائے گئے`, `طوبق ${data.matched} من أصل ${arItems(data.total)}`)]
      if (filled) parts.push(L(`${filled} filled`, `${filled} بھرے گئے`, `عُبّئ ${arItems(filled)}`))
      if (diff) parts.push(L(`${diff} differ from the BOQ — review them`, `${diff} BOQ سے مختلف ہیں — جائزہ لیں`, `${arItems(diff)} تختلف عن جدول الكميات، فراجعها`))
      if (data.with_conflicts) parts.push(L(`${data.with_conflicts} contradict the specification`, `${data.with_conflicts} اسپیسیفکیشن سے متصادم`, `${arItems(Number(data.with_conflicts) || 0)} تتعارض مع المواصفات`))
      if (data.truncated) parts.push(L('The specifications are large and were cut; split the file', 'اسپیسیفکیشن بڑی تھیں اور کاٹ دی گئیں؛ فائل تقسیم کریں', 'المواصفات كبيرة واقتُطع جزء منها، قسّم الملف'))
      setSpecOk(true); setSpecMsg(parts.join(' · '))
    } catch {
      setSpecMsg(L('Connection problem — try again', 'کنکشن کا مسئلہ — دوبارہ کوشش کریں', 'تعذّر الاتصال — حاول مرة أخرى'))
    } finally { setMatchingSpecs(false) }
  }

  // Items
  const [items, setItems] = useState<any[]>([])
  const [editingIndex, setEditingIndex] = useState<any>(null)
  // a line added (by hand, from the catalog or a file) or a new list: back to «الكل», so nothing new is hidden
  const itemCountRef = useRef(0)
  useEffect(() => {
    const n = items.length, before = itemCountRef.current
    itemCountRef.current = n
    if (viewIds && (n > before || n === 0)) { setViewFilter('all'); setViewIds(null) }
  }, [items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // استهداف نوع الموردين + الموثّقون فقط (يطبَّق على كل بنود المشروع)
  const [targetTiers, setTargetTiers] = useState<string[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  // same request options as the request page (owner 2026-10-27: the project lacked them)
  const [hours, setHours] = useState(72)
  // «متى تحتاج المواد في الموقع؟» (round-5 UX-090): sent as each item's max_days, as on the request page
  const [needDays, setNeedDays] = useState<number | null>(null)
  // the buyer's identity is always hidden from suppliers until an offer is chosen (no option: UX-077)
  const [vatRequired, setVatRequired] = useState(true)
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const submittingRef = useRef(false)
  const [homeMode, setHomeMode] = useState(false)
  // after a send: the confirmation screen (what was sent, to how many suppliers, what is left)
  const [sentInfo, setSentInfo] = useState<{ id: string; count: number; expires: string; coverage: any; left: any[]; itemsSaved: boolean; tenderId?: string | null; tenderLeft?: number } | null>(null)

  // «سيصل طلبك إلى نحو N موردين» before sending (UX-072): optional, nothing is shown if the RPC is missing
  const [reach, setReach] = useState<{ reached: number; items: { name: string; suppliers: number }[] } | null>(null)
  const reachItems = items.filter((i: any) => i.selected && i.product_name && !i.needs_classification)
  // round-7 UX-019: «الموثّقون فقط» and the supplier type change who is reached, so they are in the key and the call
  const reachKey = reachItems.map((i: any) => `${i.sector}|${i.sub_category || ''}|${i.product_name}`).join('~') + `#${region}#${city}#${nearbyOnly}#${verifiedOnly}#${targetTiers.join(',')}`
  useEffect(() => {
    if (!reachItems.length || !region) { setReach(null); return }
    let alive = true
    const t = setTimeout(async () => {
      try {
        const sb = createClient()
        const base = {
          p_items: reachItems.slice(0, 60).map((i: any) => ({ sector: i.sector, product_name: i.product_name, sub_category: i.sub_category || detectSubCategory(i.product_name, i.sector) || null })),
          p_region: region, p_city: city || null, p_geo: null, p_nearby: nearbyOnly,
        }
        // the same rules as routing (migration 288); the older signature only when the newer one is not deployed
        let { data, error } = await sb.rpc('preview_rfq_reach', { ...base, p_verified_only: verifiedOnly, p_tiers: targetTiers.length ? targetTiers : null })
        if (error) ({ data, error } = await sb.rpc('preview_rfq_reach', base))
        if (alive && !error && data && typeof data === 'object') setReach({ reached: Number((data as any).reached) || 0, items: Array.isArray((data as any).items) ? (data as any).items : [] })
      } catch { /* optional */ }
    }, 700)
    return () => { alive = false; clearTimeout(t) }
  }, [reachKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const router = useRouter()
  // a home buyer is taken to the request page with its file picker open (round-5 UX-013): it reads a list or a photo
  // without the company vocabulary of this page. Nothing saved here is deleted.
  const toHomeRequest = () => { setHomeMode(true); router.replace('/contractor/rfq/quick?upload=1') }
  useEffect(() => {
    if (storedBuyerType() === 'individual') { toHomeRequest(); return }
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
      restoreDraft(data.session.user.id)
      // open to everyone during the trial: decided before the profile read, so a failed read never shows a gate
      if (PROJECTS_OPEN_TO_ALL) setAllowed(true)
      else supabase.from('profiles').select('role, verification_status, cr_verified_at, subscription_plan, subscription_expires_at').eq('id', data.session.user.id).single()
        .then(({ data: p }: any) => setAllowed(canUseProjects(p)))
      // the region and city of the profile fill step 3 when the buyer has not chosen them
      supabase.from('profiles').select('region, city, buyer_type').eq('id', data.session.user.id).maybeSingle()
        .then(({ data: p }: any) => {
          if (p?.buyer_type === 'individual') { toHomeRequest(); return }
          if (!p?.region || !REGIONS.includes(p.region)) return
          setRegion(r => {
            if (r) return r
            if (p.city && (CITIES_BY_REGION[p.region] || []).some((c: any) => c.ar === p.city)) setCity(c => c || p.city)
            return p.region
          })
        })
    })
  }, [])

  const [restored, setRestored] = useState(false)
  // the server copy of the draft (rfq_drafts, data.kind 'boq': round-5 UX-089) and how the last save went
  const serverIdRef = useRef<string | null>(null)
  const [cloudState, setCloudState] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle')
  const [restoredCount, setRestoredCount] = useState(0) // > 0: «استعدنا مسودتك» banner
  // files attached before the page was closed: a draft cannot keep them, so it keeps their names and asks again (UX-094)
  const [lostFiles, setLostFiles] = useState<{ boq?: string; specs?: string }>({})
  // how many items the file gave, kept apart from the list (which grows with manual additions): UX-135
  const [extracted, setExtracted] = useState(0)
  // set when the draft came from «مسار العطاء»: the tender is marked sent and linked to this project
  const [tenderId, setTenderId] = useState<string | null>(null)
  // round-7 UX-079: the tender's name in the header, and the upload area folded behind «إضافة مادة أخرى»
  const [tenderTitle, setTenderTitle] = useState('')
  const [showAddMore, setShowAddMore] = useState(false)
  useEffect(() => {
    if (!tenderId) { setTenderTitle(''); return }
    let alive = true
    createClient().from('tenders').select('title').eq('id', tenderId).maybeSingle()
      .then(({ data }: any) => { if (alive) setTenderTitle(String(data?.title || '')) }, () => {})
    return () => { alive = false }
  }, [tenderId])
  // restored once the account is known: the browser copy of THIS account (UX-096), or the server copy when it is newer
  // or the browser has none (another device, the app: UX-089). «?draft=<id>» opens a given server copy.
  //
  // Round-6 UX-081: the browser copy is applied AT ONCE (no wait for the server), and the server copy replaces it
  // only when it is newer AND the contractor has not changed anything meanwhile (dirtyRef). Until the server answers,
  // «جارٍ استعادة مسودتك…» is shown and adding (a material, the catalog, a file) is paused, so nothing he adds in those
  // seconds can be overwritten.
  async function restoreDraft(uid: string) {
    const local: any = readProjectDraft(uid)
    let wanted: string | null = null
    try { wanted = new URLSearchParams(window.location.search).get('draft') } catch {}
    const has = (x: any) => !!x && Array.isArray(x.items) && x.items.length > 0
    // round-7 UX-140: «جارٍ استعادة مسودتك» and the pause on adding only when there is a draft to restore (a browser
    // copy or «?draft=»). A first visit starts at once; a server copy from another device found later still replaces
    // the list only while nothing was changed (dirtyRef), else it asks.
    if (!wanted && !has(local)) setRestoring(false)
    // «?draft=<id>» asks for a given server copy: the browser copy (maybe another list) is not shown first
    if (!wanted) applyDraft(local)
    let applied = !wanted && has(local)
    try {
      const server = await fetchBoqServerDraft(createClient(), wanted)
      if (server) {
        serverIdRef.current = server.id
        const sd = server.data || {}
        const localAt = local?.saved_at ? Date.parse(local.saved_at) : 0
        const serverAt = Date.parse(server.updated_at || '') || 0
        if (has(sd) && (wanted || !has(local) || serverAt > localAt + 2000)) {
          if (!dirtyRef.current) { applyDraft(sd); applied = true }
          else {
            // he already changed the list: his work stays, unless he chooses the other copy himself
            const take = await askConfirm(L(`A newer copy of your draft (${sd.items.length} items) was saved from another device. You have changed the list here since opening it. Which one do you want to keep?`, `آپ کے مسودے کی ایک نئی نقل (${sd.items.length} آئٹمز) دوسرے آلے سے محفوظ ہوئی ہے۔ کھولنے کے بعد آپ نے یہاں فہرست بدلی ہے۔ کون سی رکھنا چاہتے ہیں؟`, `حُفظت نسخة أحدث من مسودتك (${arItems(sd.items.length)}) من جهاز آخر، وقد عدّلتَ القائمة هنا منذ فتحها. أيّهما تريد أن تبقي؟`),
              { okLabel: L('Open the newer copy', 'نئی نقل کھولیں', 'فتح النسخة الأحدث'), cancelLabel: L('Keep my changes here', 'یہاں کی ترامیم رکھیں', 'إبقاء تعديلاتي هنا') })
            if (take) { applyDraft(sd); applied = true }
          }
        }
        if (applied || has(local)) setCloudState('saved')
      } else if (local?.server_id) serverIdRef.current = null // the server copy was deleted (sent from another device)
    } catch { /* offline: the browser copy only */ }
    // a given server copy that could not be read: the browser copy, unless he has started a list meanwhile
    if (wanted && !applied && !dirtyRef.current) applyDraft(local)
    setRestoring(false)
    setRestored(true)
  }
  // what the contractor changes while the draft is being restored (round-6 UX-081): any change to the list, its name,
  // the notes or the delivery address after the last applied copy marks the page «dirty»
  const [restoring, setRestoring] = useState(true)
  const dirtyRef = useRef(false)
  const baseRef = useRef<{ items: any[]; title: string; notes: string; loc: string } | null>(null)
  useEffect(() => {
    const b = baseRef.current
    if (!b) { baseRef.current = { items, title, notes: supplierNotes, loc: deliveryLocation }; return }
    if (items !== b.items || title !== b.title || supplierNotes !== b.notes || deliveryLocation !== b.loc) dirtyRef.current = true
  }, [items, title, supplierNotes, deliveryLocation])
  function applyDraft(d: any) {
    try {
      if (d && Array.isArray(d.items) && d.items.length) {
        // an old draft's hidden «projectNotes» (e.g. «تسعير مناقصة: <name>») is never restored: only the visible
        // supplier notes the buyer wrote himself come back (UX-002)
        const list = d.items.map(normalizeLine)
        const notes = typeof d.supplierNotes === 'string' ? d.supplierNotes : ''
        // what is applied here is not the contractor's own change (UX-081)
        baseRef.current = { items: list, title: d.title || '', notes, loc: d.deliveryLocation || '' }
        setTitle(d.title || ''); setRegion(d.region || ''); setCity(d.city || ''); setSupplierNotes(notes)
        setDeliveryRequired(d.deliveryRequired !== false); setDeliveryLocation(d.deliveryLocation || '')
        setItems(list); if (d.hours) setHours(d.hours)
        setRestoredCount(d.items.length)
        setLostFiles({ boq: typeof d.boqFileName === 'string' && d.boqFileName ? d.boqFileName : undefined, specs: typeof d.specsFileName === 'string' && d.specsFileName ? d.specsFileName : undefined })
        if (typeof d.extracted === 'number') setExtracted(d.extracted)
        if (typeof d.vatRequired === 'boolean') setVatRequired(d.vatRequired)
        if (Array.isArray(d.targetTiers)) setTargetTiers(d.targetTiers)
        if (typeof d.verifiedOnly === 'boolean') setVerifiedOnly(d.verifiedOnly)
        if (typeof d.tender_id === 'string') setTenderId(d.tender_id)
        if (typeof d.needDays === 'number' || d.needDays === null) setNeedDays(d.needDays ?? null)
        if (typeof d.nearbyOnly === 'boolean') setNearbyOnly(d.nearbyOnly)
        setStep('items')
      }
    } catch {}
  }
  // the server copy's title: the list name, else «<first material> +N»
  const draftTitle = (list: any[]) => (title.trim() || (list[0]?.product_name ? `${getProductLabel(list[0].product_name, 'ar')}${list.length > 1 ? ` +${list.length - 1}` : ''}` : defaultListName('ar'))).slice(0, 80)
  // saved a moment after the last change (not on every keystroke of a 200-line table): the browser copy at once,
  // the server copy a few seconds later
  const sentRef = useRef(false) // after a send, the page keeps only what it wrote itself
  const draftData = () => ({ title, region, city, supplierNotes, deliveryRequired, deliveryLocation, hours, needDays, vatRequired, targetTiers, verifiedOnly, nearbyOnly, tender_id: tenderId,
    boqFileName: boqFile?.name || lostFiles.boq || null, specsFileName: specsFile?.name || lostFiles.specs || null, extracted,
    items: items.map(draftLine) })
  useEffect(() => {
    if (!restored || sentRef.current || !user?.id) return
    const uid = user.id
    const t = setTimeout(() => {
      if (!items.length) { clearProjectDraft(uid); return }
      writeProjectDraft(uid, { ...draftData(), server_id: serverIdRef.current })
    }, 600)
    const t2 = setTimeout(async () => {
      if (sentRef.current || submittingRef.current) return // the send writes the server copy itself
      const sb = createClient()
      if (!items.length) {
        if (serverIdRef.current) { await deleteBoqServerDraft(sb, serverIdRef.current); serverIdRef.current = null }
        setCloudState('idle'); return
      }
      setCloudState('saving')
      const id = await saveBoqServerDraft(sb, uid, serverIdRef.current, draftTitle(items), draftData())
      if (sentRef.current) return // a send finished meanwhile: it wrote the server copy itself
      if (id) { serverIdRef.current = id; setCloudState('saved') } else setCloudState('local')
    }, 3500)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [restored, user, title, region, city, supplierNotes, deliveryRequired, deliveryLocation, items, hours, needDays, vatRequired, targetTiers, verifiedOnly, nearbyOnly, tenderId, boqFile, specsFile, lostFiles, extracted]) // eslint-disable-line react-hooks/exhaustive-deps
  // forget the draft everywhere (browser and server copies)
  function forgetDraft() {
    if (user?.id) clearProjectDraft(user.id)
    const id = serverIdRef.current
    serverIdRef.current = null
    setCloudState('idle')
    deleteBoqServerDraft(createClient(), id)
  }

  // a file dropped outside the drop zone must not make the browser open it and leave the page
  useEffect(() => {
    const stop = (e: DragEvent) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() }
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => { window.removeEventListener('dragover', stop); window.removeEventListener('drop', stop) }
  }, [])

  // «بدء قائمة جديدة»: forget the restored draft (asks first: the edits cannot be recovered)
  async function startOver() {
    if (!(await askConfirm(L(`Start a new list? The saved draft (${items.length} items) and all your edits will be deleted. This cannot be undone.`, `نئی فہرست شروع کریں؟ محفوظ مسودہ (${items.length} آئٹمز) اور آپ کی تمام ترامیم حذف ہو جائیں گی۔ یہ واپس نہیں ہو سکتا۔`, `بدء قائمة جديدة؟ ستُحذف المسودة المحفوظة (${arItems(items.length)}) وكل تعديلاتك عليها، ولا يمكن التراجع.`), { danger: true, okLabel: L('Start a new list', 'نئی فہرست', 'بدء قائمة جديدة'), cancelLabel: L('Keep the draft', 'مسودہ رکھیں', 'إبقاء المسودة') }))) return
    setItems([]); setBoqFile(null); setTenderId(null); setRestoredCount(0); setEditingIndex(null); setDraft(null); setLostFiles({}); setExtracted(0); setSpecsFile(null); setSpecMsg('')
    setTitle(''); setSupplierNotes(''); setDeliveryLocation('')
    forgetDraft()
  }

  // «إلغاء هذه القائمة» for a list moved from a tender review (UX-142): the tender itself is untouched
  async function cancelTenderList() {
    const back = tenderId
    if (!(await askConfirm(L('Cancel this list? Nothing has been sent. The tender keeps its approved items, and you can move them here again.', 'یہ فہرست منسوخ کریں؟ کچھ نہیں بھیجا گیا۔ ٹینڈر میں منظور آئٹمز باقی رہیں گے اور آپ انہیں دوبارہ یہاں لا سکتے ہیں۔', 'إلغاء هذه القائمة؟ لم يُرسل شيء، وتبقى البنود المعتمدة في المناقصة ويمكنك نقلها إلى هنا مرة أخرى.'), { danger: true, okLabel: L('Cancel the list', 'فہرست منسوخ کریں', 'إلغاء القائمة'), cancelLabel: L('Keep it', 'رکھیں', 'إبقاؤها') }))) return
    setItems([]); setTenderId(null); setRestoredCount(0); setEditingIndex(null); setDraft(null); setTitle(''); setSupplierNotes(''); setLostFiles({}); setExtracted(0)
    forgetDraft()
    if (back) window.location.href = `/contractor/tender/${back}`
  }

  // from the confirmation screen: keep working on the items that were not sent, or start a new list
  function continueWithLeft() {
    const left = sentInfo?.left || []
    sentRef.current = false
    // the items left from a tender stay linked to it, so sending them later updates the tender (round-5 UX-021)
    const keepTender = sentInfo?.tenderId && left.some((i: any) => i.tender_item_id) ? sentInfo.tenderId : null
    setSentInfo(null); setBoqFile(null); setTenderId(keepTender); setRestoredCount(0); setEditingIndex(null); setDraft(null); setSpecsFile(null); setSpecMsg(''); setLostFiles({}); setExtracted(0)
    setItems(left)
    setTimeout(() => { const first = left.find((i: any) => i.needs_classification) || left[0]; if (first) focusItem(first) }, 120)
  }
  async function startFresh() {
    const leftN = sentInfo?.left.length || 0
    if (leftN && !(await askConfirm(L(`Start a new list? The ${leftN} items that were not sent will be deleted. This cannot be undone.`, `نئی فہرست شروع کریں؟ نہ بھیجے گئے ${leftN} آئٹمز حذف ہو جائیں گے۔ یہ واپس نہیں ہو سکتا۔`, `بدء قائمة جديدة؟ ستُحذف البنود غير المرسلة (${arItems(leftN)})، ولا يمكن التراجع.`), { danger: true, okLabel: L('Start a new list', 'نئی فہرست', 'بدء قائمة جديدة'), cancelLabel: L('Keep them', 'رکھیں', 'إبقاؤها') }))) return
    sentRef.current = false
    setSentInfo(null); setItems([]); setBoqFile(null); setTenderId(null); setRestoredCount(0); setEditingIndex(null); setDraft(null)
    setTitle(''); setSupplierNotes(''); setSpecsFile(null); setSpecMsg(''); setAiUsed(false); setLostFiles({}); setExtracted(0)
    forgetDraft()
  }

  // «إزالة الملف»: removes ONLY the items read from it (asks first); the materials the buyer added himself stay (UX-075)
  async function removeBoqFile() {
    const n = items.filter(isFileItem).length
    const kept = items.length - n
    const keptEn = kept ? ` The ${kept} materials you added yourself stay.` : ''
    const keptUr = kept ? ` آپ کے خود شامل کردہ ${kept} مواد باقی رہیں گے۔` : ''
    const keptAr = kept ? ' وتبقى المواد التي أضفتها بنفسك.' : ''
    if (n && !(await askConfirm(L(`The ${n} items extracted from the file and your edits to them will be deleted. This cannot be undone.${keptEn} Remove the file?`, `فائل سے نکالے گئے ${n} آئٹمز اور ان پر آپ کی ترامیم حذف ہو جائیں گی۔ یہ واپس نہیں ہو سکتا۔${keptUr} فائل ہٹائیں؟`, `ستُحذف البنود المستخرجة من الملف (${arItems(n)}) وتعديلاتك عليها، ولا يمكن التراجع.${keptAr} هل تريد إزالة الملف؟`), { danger: true, okLabel: L('Remove', 'ہٹائیں', 'إزالة'), cancelLabel: L('Keep', 'رکھیں', 'إبقاء') }))) return
    setBoqFile(null); setItems(prev => prev.filter((it: any) => !isFileItem(it))); setAiUsed(false); setParseError(''); setEditingIndex(null); setRestoredCount(0); setExtracted(0); setLostFiles(l => ({ ...l, boq: undefined }))
    if (fileRef.current) fileRef.current.value = ''
  }

  // open the item's group, scroll to it and highlight it (validation messages point here)
  function focusItem(item: any) {
    if (!item) return
    const sub = item.sub_category
    const gkey = (sub && (SUB_CATEGORIES as any)[item.sector]?.[sub]?.group) || '_unclassified'
    setOpenGroups(o => ({ ...o, [gkey]: true }))
    setHighlightId(item.id)
    setTimeout(() => document.getElementById(`boq-item-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
    setTimeout(() => setHighlightId(h => (h === item.id ? null : h)), 4000)
  }

  // قراءة جدول الكميات
  function boqErr(msg: string): string {
    const m = String(msg || '')
    const known: [string, string, string][] = [
      ['يجب تسجيل الدخول', 'Please sign in first.', 'پہلے سائن اِن کریں۔'],
      ['محاولات كثيرة', 'Too many attempts. Try again shortly, or upload the table as Excel.', 'بہت زیادہ کوششیں۔ تھوڑی دیر بعد دوبارہ کوشش کریں، یا جدول Excel میں اپ لوڈ کریں۔'],
      ['الصيغ المدعومة', 'Supported formats: Excel (xlsx/xls), CSV, PDF or an image.', 'معاون فارمیٹ: Excel (xlsx/xls)، CSV، PDF یا تصویر۔'],
      ['لا يطابق نوعه', 'The file content does not match its type, so it was refused.', 'فائل کا مواد اس کی قسم سے میل نہیں کھاتا، اس لیے مسترد کر دی گئی۔'],
      ['غير مفعّلة', 'Reading PDF files and photos is not available right now. Upload the table as Excel or CSV.', 'PDF فائلیں اور تصاویر پڑھنا ابھی دستیاب نہیں۔ جدول Excel یا CSV میں اپ لوڈ کریں۔'],
      ['تعذّرت قراءة المستند', 'Could not read the document. Try again, or upload the table as Excel.', 'دستاویز نہیں پڑھی جا سکی۔ دوبارہ کوشش کریں، یا جدول Excel میں اپ لوڈ کریں۔'],
      ['تعذّرت قراءة الملف', 'Could not read the file. Check its format and try again.', 'فائل نہیں پڑھی جا سکی۔ اس کا فارمیٹ چیک کر کے دوبارہ کوشش کریں۔'],
    ]
    if (locale === 'ar') return m
    const k = known.find(([ar]) => m.includes(ar))
    return k ? (locale === 'ur' ? k[2] : k[1]) : m
  }

  async function handleBOQUpload(file: File) {
    if (parsing || restoring) return // never while the draft is being restored (UX-081)
    // a new file replaces the items of the previous file (or of the tender), never the materials the buyer added
    // himself: ask first, the edits would be lost. A list from a tender is detached from it (UX-024).
    const replaced = items.filter(isFileItem).length
    const kept = items.length - replaced
    if (replaced) {
      const en = [`The items of the new file will replace the ${replaced} items of the current file and your edits to them.`]
      const ur = [`نئی فائل کے آئٹمز موجودہ فائل کے ${replaced} آئٹمز اور ان کی ترامیم کی جگہ لیں گے۔`]
      const ar = [`ستحلّ بنود الملف الجديد محل بنود الملف الحالي (${arItems(replaced)}) وتعديلاتك عليها.`]
      if (kept) { en.push('The materials you added yourself stay.'); ur.push('آپ کے خود شامل کردہ مواد باقی رہیں گے۔'); ar.push('وتبقى المواد التي أضفتها بنفسك.') }
      if (tenderId) { en.push('The list will be detached from the tender, and its approved items stay in it.'); ur.push('فہرست ٹینڈر سے الگ ہو جائے گی، اور اس کے منظور آئٹمز ٹینڈر میں باقی رہیں گے۔'); ar.push('ستُفصل القائمة عن المناقصة، وتبقى بنودها المعتمدة فيها.') }
      if (!(await askConfirm(L(`${en.join(' ')} Continue?`, `${ur.join(' ')} جاری رکھیں؟`, `${ar.join(' ')} هل تتابع؟`), { danger: true, okLabel: L('Replace', 'بدلیں', 'استبدال'), cancelLabel: L('Keep my list', 'میری فہرست رکھیں', 'إبقاء قائمتي') }))) return
    }
    setBoqFile(file)
    setParsing(true)
    setParseError('')
    setRestoredCount(0)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-boq', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(boqErr(data.error))
      if (data.items?.length > 0) {
        setAiUsed(!!data.ai)
        const fromFile = data.items.map((item: any, i: any) => {
          // التخصص يأتي مُصنّفاً من الخادم (من القوائم الرسمية). نتأكد أنه مفتاح صحيح وإلا = غير مصنّف.
          const sub = (item.sub_category && (SUB_CATEGORIES as any)[item.sector]?.[item.sub_category]) ? item.sub_category : null
          // غير مصنّف لو بلا تخصص، أو لو الذكاء أبلغ ثقة منخفضة (يبقى الاقتراح ظاهراً في القائمة ليؤكّده المقاول)
          // specs = spec fields recognised in the BOQ wording; needs_review = a quantity/unit/total that did not add up
          return { ...item, specs: item.specs || {}, id: `item-${i}`, from_file: true, selected: true, done: parseFloat(item.quantity) > 0 && !item.needs_review && missingSpecs(item.product_name, item.sector, item.specs || {}, item.specification || '').length === 0, sub_category: sub, needs_classification: !sub || !!item.needs_classification || !!item.low_confidence }
        })
        // the materials the buyer added himself stay, after the file's items
        setItems(prev => [...fromFile, ...prev.filter((it: any) => !isFileItem(it))])
        setExtracted(fromFile.length); setLostFiles(l => ({ ...l, boq: undefined }))
        // from here on the list is no longer the tender's: sending it must not mark the tender as sent (UX-024)
        setTenderId(null)
        setStep('items')
        // the project name from the file name, when the buyer has not written one
        setTitle(t => t || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120))
      } else {
        setParseError(L('No items were found in the file. Check that it is the bill of quantities, or add the materials yourself below.', 'فائل سے کوئی آئٹم نہیں نکلا۔ دیکھیں کہ یہ مقداروں کا جدول ہے، یا نیچے مواد خود شامل کریں۔', 'لم نستخرج بنوداً من الملف. تأكّد أنه جدول الكميات، أو أضف المواد بنفسك بالأسفل.'))
        setBoqFile(null)
      }
    } catch (err) {
      setParseError((err as any).message || (L('Could not read the file', 'فائل نہیں پڑھی جا سکی', 'تعذّرت قراءة الملف')))
      setBoqFile(null)
    } finally { setParsing(false); if (fileRef.current) fileRef.current.value = '' }
  }

  // إضافة مادة يدوياً (owner 2026-10-24: كانت تُضاف «بند بدون اسم / مدني» ثم تُعدَّل). لوحة واحدة:
  // الاسم (اقتراحات من الكتالوج أو نص حر) → التخصص يُقترح تلقائياً → الكمية والوحدة → «أضف إلى القائمة».
  const [draft, setDraft] = useState<any>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  // a material picked from the catalog popup goes straight into the list, already classified
  function addFromCatalog(p: { name: string; sector: Sector; section?: string; sub?: string }) {
    if (restoring) return // never while the draft is being restored (UX-081)
    const newId = `item-${Date.now()}-${items.length}`
    if (!items.some((it: any) => it.product_name === p.name)) setJustAddedId(newId)
    setItems(prev => prev.some((it: any) => it.product_name === p.name) ? prev : [...prev, {
      id: newId, product_name: p.name, sector: p.sector, quantity: '',
      unit: getDefaultUnit(p.name, p.sector) || 'عدد', specification: '', specs: {}, sub_category: p.sub || (p.section ? null : (detectSubCategory(p.name, p.sector) || null)), section: p.section, custom: !!(p.section || p.sub),
      needs_classification: !p.sub && !p.section && !detectSubCategory(p.name, p.sector), selected: true, done: false,
    }])
    setDraft(null)
    setStep('items')
  }
  const catalogNames = useMemo(() => Array.from(new Set(Object.values(SECTOR_PRODUCTS).flat())), [])
  function addItem() { if (restoring) return; setEditingIndex(null); setDraft({ product_name: '', quantity: '', unit: '', specification: '', spec: undefined }) }
  function draftGuess(name: string): { sector: string; sub: string | null; catalog: boolean } {
    const n = (name || '').trim()
    for (const sc of Object.keys(SECTOR_PRODUCTS) as Sector[]) if (SECTOR_PRODUCTS[sc].includes(n)) return { sector: sc, sub: detectSubCategory(n, sc) || null, catalog: true }
    for (const sc of Object.keys(SECTOR_PRODUCTS) as Sector[]) { const sub = detectSubCategory(n, sc); if (sub) return { sector: sc, sub, catalog: false } }
    return { sector: 'civil', sub: null, catalog: false }
  }
  function commitDraft() {
    const name = (draft?.product_name || '').trim()
    if (!name) return
    const g = draftGuess(name)
    // the buyer's choice, else our guess (shown to them with «نعم / تغيير»)
    const choice = choiceDone(draft.spec) ? draft.spec : (g.sub ? { sector: g.sector, sub: g.sub } : undefined)
    const sector = choice?.sector || g.sector
    const newId = `item-${Date.now()}`
    setJustAddedId(newId)
    setItems(prev => [...prev, {
      id: newId, product_name: name, sector,
      quantity: draft.quantity, unit: draft.unit || getDefaultUnit(name, sector as Sector) || 'عدد',
      specification: draft.specification, brand: draft.brand || '', specs: draft.specs || {}, custom: !g.catalog, sub_category: choice?.sub ?? null, section: choice?.section, needs_classification: !choice, selected: true, done: parseFloat(draft.quantity) > 0 && missingSpecs(name, sector as Sector, draft.specs, draft.specification || '').length === 0,
    }])
    setDraft(null)
    setStep('items')
  }

  function updateItem(id: any, field: any, value: any) {
    setItems(prev => prev.map((item: any) => item.id === id ? { ...item, [field]: value } : item))
  }

  // تغيير القطاع يعيد ضبط التخصص (التخصصات مرتبطة بالقطاع) ويحاول التصنيف تلقائياً
  function setItemSector(id: any, sector: any) {
    setItems(prev => prev.map((it: any) => {
      if (it.id !== id) return it
      const guess = detectSubCategory(`${getProductLabel(it.product_name, locale)} ${it.specification || ''}`, sector)
      const sub = guess && (SUB_CATEGORIES as any)[sector]?.[guess] ? guess : null
      return { ...it, sector, sub_category: sub, needs_classification: !sub }
    }))
  }

  // اختيار التخصص من القائمة الرسمية — هو ما يوجّه البند للمورد المتخصص
  function setItemCategory(id: any, sub: any) {
    setItems(prev => prev.map((it: any) => it.id === id ? { ...it, sub_category: sub || null, needs_classification: !sub } : it))
  }

  // تصنيف جماعي — يطبّق تصنيفاً على كل البنود غير المصنّفة في قطاع مختار دفعة واحدة
  const [bulkSector, setBulkSector] = useState('')
  const [bulkSub, setBulkSub] = useState('')
  const unclassifiedItems = items.filter((i: any) => i.selected && i.product_name && i.needs_classification)
  const unclassifiedCount = unclassifiedItems.length
  // all six sectors are offered (an item read as «civil» may really be electrical), and the buyer picks
  // which unclassified items take the specialty (UX-073); by default all of them
  const [bulkSkip, setBulkSkip] = useState<Record<string, boolean>>({}) // item id → left out of the bulk action
  const bulkTargets = unclassifiedItems.filter((it: any) => !bulkSkip[it.id])
  function bulkApplyCategory() {
    if (!bulkSector || !bulkSub || !bulkTargets.length) return
    const ids = new Set(bulkTargets.map((it: any) => it.id))
    setItems(prev => prev.map((it: any) =>
      ids.has(it.id) ? { ...it, sector: bulkSector, sub_category: bulkSub, section: undefined, needs_classification: false } : it))
    setBulkSub(''); setBulkSkip({})
  }

  // «حُذف البند · تراجع» (UX-073): the last removed item can be put back at its place for a few seconds
  const [lastRemoved, setLastRemoved] = useState<{ item: any; index: number } | null>(null)
  const undoTimer = useRef<any>(null)
  function removeItem(id: any) {
    const index = items.findIndex((item: any) => item.id === id)
    if (index < 0) return
    const item = items[index]
    setItems(prev => prev.filter((it: any) => it.id !== id))
    if (editingIndex !== null && editingIndex >= index) setEditingIndex(null) // the open line's position moved
    setLastRemoved({ item, index })
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setLastRemoved(null), 8000)
  }
  function undoRemove() {
    if (!lastRemoved) return
    const { item, index } = lastRemoved
    setItems(prev => prev.some((it: any) => it.id === item.id) ? prev : [...prev.slice(0, index), item, ...prev.slice(index)])
    setLastRemoved(null)
    clearTimeout(undoTimer.current)
    focusItem(item)
  }
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  const draftG = draft ? draftGuess(draft.product_name) : null
  const draftSector = (draft?.spec?.sector || draftG?.sector || 'civil') as Sector
  const draftName = (draft?.product_name || '').trim()
  const draftDefUnit = draft && draftName ? (draft.unit || getDefaultUnit(draftName, draftSector) || '') : (draft?.unit || '')
  const draftUnits = draft ? Array.from(new Set([draftDefUnit, ...((draftName && unitChoicesFor(draftName, draftSector)) || UNIT_OPTIONS)].filter(Boolean))) : []
  const draftPanel = draft && (
    <div className="rounded-2xl border-2 border-[#D4A543]/60 bg-white p-4 space-y-3 text-start">
      <div className="flex items-center justify-between gap-2">
        <b className="text-base text-[#0B2438]">{L('Add a material', 'مواد شامل کریں', 'أضف مادة')}</b>
        <button type="button" onClick={() => setDraft(null)} className="min-h-11 px-2 text-sm font-bold text-gray-600 hover:underline">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
      </div>
      <div>
        <input list="boq-catalog" autoFocus value={draft.product_name} aria-label={L('Material name', 'مواد کا نام', 'اسم المادة')}
          onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, product_name: v, spec: undefined, unit: '', specs: {} })) }}
          className="input-field" placeholder={L('Material name: type and pick from the list, or write it your way', 'مواد کا نام: لکھیں اور فہرست سے منتخب کریں، یا اپنے انداز میں لکھیں', 'اسم المادة: اكتب واختر من القائمة، أو اكتبها كما تريد')} />
        <button type="button" onClick={() => setShowCatalog(true)}
          className="mt-2 w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 text-sm font-bold text-[#8F6820] hover:bg-[#D4A543]/20">
          {L("Can't find it? Browse the materials guide by section", 'نہیں ملا؟ شعبوں سے فہرست دیکھیں', 'لم تجدها؟ تصفّح دليل المواد حسب الأقسام')}
        </button>
        {draftG?.catalog && (
          <p className="text-xs text-[#0B2438] font-bold mt-1.5"><Glyph e="✓" /> {L('From the catalog', 'کیٹلاگ سے', 'من دليل المواد')}{draftG.sub ? ' · ' + getSubCategoryLabel(draftG.sector as any, draftG.sub, locale) : ''}</p>
        )}
      </div>
      {draftName.length >= 2 && !draftG?.catalog && (
        <LineSpecialty key={draftName} name={draftName} sector={draftG?.sector || 'civil'} value={draft.spec} locale={locale}
          onChange={(v: any) => setDraft((d: any) => ({ ...d, spec: v }))} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <input type="text" inputMode="decimal" value={draft.quantity}
          onChange={(e: any) => { const v = toQty(e.target.value); setDraft((d: any) => ({ ...d, quantity: v })) }}
          aria-label={L('Quantity', 'مقدار', 'الكمية')} className="input-field" placeholder={L('Quantity', 'مقدار', 'الكمية')} />
        <select value={draftDefUnit}
          onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, unit: v })) }} aria-label={L('Unit', 'یونٹ', 'الوحدة')} className="input-field">
          {!draftDefUnit && <option value="">{L('Unit', 'یونٹ', 'الوحدة')}</option>}
          {draftUnits.map((u: any) => <option key={u} value={u}>{getUnitLabel(u, locale)}</option>)}
        </select>
      </div>
      {draftName && <ItemSpecFields name={draftName} sector={draftSector} specs={draft.specs} locale={locale} onChange={(v: any) => setDraft((d: any) => ({ ...d, specs: v }))} />}
      {draftName && brandApplies(draftName, draftSector) && (
        <input value={draft.brand || ''} aria-label={L('Brand or product name (optional)', 'برانڈ یا پروڈکٹ کا نام (اختیاری)', 'الماركة أو اسم المنتج (اختياري)')} onChange={(e: any) => { const v = e.target.value.slice(0, 80); setDraft((d: any) => ({ ...d, brand: v })) }} className="input-field"
          placeholder={L('Brand or product name (optional), e.g. Fosroc Renderoc', 'برانڈ یا پروڈکٹ کا نام (اختیاری)، مثلاً: Fosroc Renderoc', 'الماركة أو اسم المنتج (اختياري)، مثل: فوسروك رندروك')} />
      )}
      <input value={draft.specification} aria-label={L('Specification', 'تفصیل', 'المواصفة')} onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, specification: v })) }}
        className={`input-field ${draftName && missingSpecs(draftName, draftSector, draft.specs, draft.specification).includes('*') ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
        placeholder={draftName && specsRequired(draftName, draftSector) && !getProductSpecs(draftName).some(f => f.key !== 'unit')
          ? L('Specification (required): size, length, grade…', 'تفصیل (ضروری): سائز، لمبائی، گریڈ…', 'المواصفة (مطلوبة): المقاس، الطول، الدرجة…')
          : L('More specs for this item (optional)', 'اس آئٹم کی مزید تفصیل (اختیاری)', 'مواصفات إضافية لهذا البند (اختياري)')} />
      <button type="button" disabled={!draftName} onClick={commitDraft}
        className="w-full min-h-11 py-3 rounded-xl text-[#071827] font-bold disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
        {L('Add to the list', 'فہرست میں شامل کریں', 'أضف إلى القائمة')}
      </button>
    </div>
  )

  // what step 3 still needs before sending (shown above the button; each name takes you to its field)
  const missingFields: { key: string; label: string; ref: { current: HTMLElement | null } }[] = []
  // the list name is optional (round-5 UX-156): an empty one becomes «قائمة <date>»
  if (!region) missingFields.push({ key: 'region', label: L('Region', 'علاقہ', 'المنطقة'), ref: regionRef })
  if (deliveryRequired && !deliveryLocation.trim()) missingFields.push({ key: 'delivery', label: L('Delivery location', 'ڈیلیوری کا مقام', 'موقع التوصيل'), ref: deliveryRef })
  function goToField(ref: { current: HTMLElement | null }) {
    const el = ref.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => el.focus(), 250)
  }

  // إرسال المشروع
  async function handleSubmit() {
    if (submittingRef.current) return // a second tap while the first send is still going
    if (!user) return
    // the button is never silently disabled: it takes the buyer to the first missing field
    if (missingFields.length) { setShowMissing(true); goToField(missingFields[0].ref); return }
    // سياسة عدم الإزعاج: البنود غير المصنّفة لا تُرسل إطلاقاً (حتى لا تصل لموردين خارج تخصصهم).
    // نرسل المصنّفة فقط، ونبقي غير المصنّفة في المسودة ليختار المقاول تخصصها لاحقاً.
    const classifiedItems = items.filter((i: any) => i.selected && i.product_name && !i.needs_classification)
    if (!items.some((i: any) => i.selected && i.product_name)) {
      await notify(L('No item is selected. Tick the items you want to send, or tap «Select all».', 'کوئی آئٹم منتخب نہیں۔ جو آئٹمز بھیجنے ہیں ان پر نشان لگائیں، یا «سب منتخب کریں» دبائیں۔', 'لم تحدّد أي بند. ضع علامة على البنود التي تريد إرسالها، أو اضغط «تحديد الكل».'))
      return
    }
    if (classifiedItems.length === 0) {
      await notify(L('There are no classified items to send: choose each item\'s specialty first.', 'بھیجنے کے لیے کوئی درجہ بند آئٹم نہیں: پہلے ہر آئٹم کا شعبہ منتخب کریں۔', 'لا توجد بنود مصنّفة للإرسال: اختر تخصص كل بند أولاً.'))
      focusItem(unclassifiedItems[0]); return
    }
    // materials priced by size/grade need a written spec or a spec file (owner 2026-10-27)
    const noSpec = classifiedItems.filter((i: any) => missingSpecs(i.product_name, i.sector, i.specs, i.specification || '', !!i.specFile).length > 0)
    if (noSpec.length) {
      const nm = '«' + getProductLabel(noSpec[0].product_name, locale) + '»'
      await notify(noSpec.length === 1
        ? L(`Write the specs of ${nm} (size, length, grade…) so suppliers can price it.`, `${nm} کی تفصیل لکھیں (سائز، لمبائی، گریڈ…) تاکہ سپلائرز قیمت دے سکیں۔`, `اكتب مواصفات ${nm} (المقاس، الطول، الدرجة…) ليتمكن الموردون من تسعيره.`)
        : L(`${noSpec.length} items need their specs (size, length, grade…). We will take you to the first one: ${nm}.`, `${noSpec.length} آئٹمز کی تفصیل درکار ہے۔ ہم آپ کو پہلے پر لے جائیں گے: ${nm}۔`, `تحتاج ${arItems(noSpec.length)} إلى المواصفات (المقاس، الطول، الدرجة…). سننقلك إلى أولها: ${nm}.`))
      focusItem(noSpec[0]); return
    }
    const noQty = classifiedItems.filter((i: any) => !(parseFloat(i.quantity) > 0))
    if (noQty.length) {
      const nm = '«' + getProductLabel(noQty[0].product_name, locale) + '»'
      await notify(noQty.length === 1
        ? L(`Enter the quantity of ${nm} before sending.`, `بھیجنے سے پہلے ${nm} کی مقدار لکھیں۔`, `أدخل كمية ${nm} قبل الإرسال.`)
        : L(`${noQty.length} items have no quantity. We will take you to the first one: ${nm}.`, `${noQty.length} آئٹمز کی مقدار نہیں۔ ہم آپ کو پہلے پر لے جائیں گے: ${nm}۔`, `${arItems(noQty.length)} بلا كمية. سننقلك إلى أولها: ${nm}.`))
      focusItem(noQty[0]); return
    }
    // nothing is lost silently: unselected and unclassified items are not sent, and they stay saved here (UX-072)
    const unselectedN = items.filter((i: any) => i.product_name && !i.selected).length
    if (unclassifiedCount > 0 || unselectedN > 0) {
      const en: string[] = [], ur: string[] = [], ar: string[] = []
      if (unselectedN) {
        en.push(`The ${unselectedN} unselected item(s) will not be sent; they stay saved in your draft.`)
        ur.push(`غیر منتخب آئٹمز (${unselectedN}) نہیں بھیجے جائیں گے اور آپ کے مسودے میں محفوظ رہیں گے۔`)
        ar.push(`لن تُرسَل البنود غير المحدَّدة (${arItems(unselectedN)}) وتبقى محفوظة في مسودتك.`)
      }
      if (unclassifiedCount) {
        en.push(`The ${unclassifiedCount} item(s) without a specialty will not be sent now (the specialty routes each item to the right supplier); they stay saved in your draft so you can choose it later.`)
        ur.push(`بغیر شعبہ آئٹمز (${unclassifiedCount}) ابھی نہیں بھیجے جائیں گے (شعبہ ہی ہر آئٹم کو صحیح سپلائر تک پہنچاتا ہے)؛ یہ آپ کے مسودے میں محفوظ رہیں گے تاکہ بعد میں شعبہ منتخب کریں۔`)
        ar.push(`لن تُرسَل البنود التي بلا تخصص (${arItems(unclassifiedCount)}) الآن، لأن التخصص هو ما يوصل البند إلى المورد المختص، وتبقى محفوظة في مسودتك لتختار تخصصها لاحقاً.`)
      }
      const ok = await askConfirm(L(`${en.join('\n')}\n\nSend ${classifiedItems.length} materials now?`, `${ur.join('\n')}\n\nابھی ${classifiedItems.length} مواد بھیجیں؟`, `${ar.join('\n')}\n\nإرسال ${arMaterials(classifiedItems.length)} الآن؟`),
        { okLabel: L(`Send ${classifiedItems.length} materials`, `${classifiedItems.length} مواد بھیجیں`, `إرسال ${arMaterials(classifiedItems.length)}`), cancelLabel: L('Back to the list', 'فہرست پر واپس', 'العودة إلى القائمة') })
      if (!ok) return
    }
    // the supplier notes must not carry the project name (it is the buyer's private label: UX-002)
    const tName = title.trim()
    const listTitle = (tName || defaultListName(locale)).slice(0, 200)
    if (tName.length >= 3 && supplierNotes.toLowerCase().includes(tName.toLowerCase())) {
      const fix = await askConfirm(L(`Your notes for suppliers contain the list name «${tName}», and suppliers will read them. Remove the name before sending?`, `سپلائرز کے لیے آپ کے نوٹس میں فہرست کا نام «${tName}» ہے اور سپلائرز انہیں پڑھیں گے۔ بھیجنے سے پہلے نام ہٹا دیں؟`, `تتضمن ملاحظاتك للموردين اسم القائمة «${tName}»، وسيقرؤها الموردون. هل تريد إزالة الاسم قبل الإرسال؟`),
        { okLabel: L('Remove the name', 'نام ہٹائیں', 'إزالة الاسم'), cancelLabel: L('Edit the notes myself', 'نوٹس خود درست کریں', 'سأعدّل الملاحظات بنفسي') })
      if (!fix) { goToField(notesRef); return }
      const esc = tName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const cleaned = supplierNotes.replace(new RegExp(esc, 'gi'), '').replace(/[ \t]{2,}/g, ' ').trim()
      setSupplierNotes(cleaned)
      await notify(L('The list name was removed from the notes. Tap «Send» again.', 'نوٹس سے فہرست کا نام ہٹا دیا گیا۔ دوبارہ «بھیجیں» دبائیں۔', 'أُزيل اسم القائمة من الملاحظات. اضغط «إرسال» مرة أخرى.'))
      goToField(notesRef); return
    }
    // a file attached before the page was reopened is not in the draft: never send without it silently (UX-094)
    // the BOQ file itself is not here: it is kept in the buyer's record only and never reaches suppliers (round-6 UX-082)
    const missingFiles: string[] = [
      ...(!specsFile && lostFiles.specs ? [lostFiles.specs] : []),
      ...classifiedItems.filter((i: any) => !i.specFile && i.specFileName).map((i: any) => String(i.specFileName)),
    ]
    if (missingFiles.length) {
      const names = missingFiles.slice(0, 4).map(n => `«${n}»`).join(locale === 'ar' ? '، ' : ', ')
      const go = await askConfirm(L(`These files are not attached (files are not kept in a draft): ${names}. Send the request without them?`, `یہ فائلیں منسلک نہیں (مسودے میں فائلیں محفوظ نہیں ہوتیں): ${names}۔ کیا ان کے بغیر درخواست بھیجیں؟`, `هذه الملفات غير مرفقة (فالمسودة لا تحفظ الملفات): ${names}. هل ترسل الطلب دونها؟`),
        { okLabel: L('Send without them', 'ان کے بغیر بھیجیں', 'الإرسال دونها'), cancelLabel: L('Attach them first', 'پہلے منسلک کریں', 'إرفاقها أولاً') })
      if (!go) return
    }
    if (!(await ensureVerified())) return
    submittingRef.current = true
    setLoading(true)
    const supabase = createClient()

    const selectedItems = classifiedItems
    let projectId: string | null = null // removed again if the request itself fails (no empty project left behind)

    try {
      // 1) all the files first: if one fails, nothing has been created yet
      let boqUrl = null
      if (boqFile) {
        const path = `${user.id}/boq-${Date.now()}.${boqFile.name.split('.').pop()}`
        const { data } = await supabase.storage.from('licenses').upload(path, boqFile, { upsert: true })
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(data.path)
          boqUrl = publicUrl
        }
      }

      // رفع مستند المواصفات إن وجد (للسجل) — نلحق رابطه بملاحظات المشروع
      let specUrl = null
      if (specsFile) {
        const specsUp = await (await import('@/lib/compressImage')).compressImage(specsFile, { maxSide: 2000 }) // lighter scans/photos
        const path = `${user.id}/spec-doc-${Date.now()}.${specsUp.name.split('.').pop()}`
        const { data } = await supabase.storage.from('licenses').upload(path, specsUp, { upsert: true })
        // a failed upload is never silent: the request would reach suppliers without the specifications (UX-075)
        if (!data) {
          await notify(L('Could not upload the specification document. Check your connection and try again, or remove the document. Nothing was sent.', 'اسپیسیفکیشن دستاویز اپ لوڈ نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں، یا دستاویز ہٹا دیں۔ کچھ نہیں بھیجا گیا۔', 'تعذّر رفع مستند المواصفات. تحقّق من الاتصال وحاول مرة أخرى، أو احذف المستند. لم يُرسل شيء.'), { tone: 'error' })
          return
        }
        specUrl = supabase.storage.from('licenses').getPublicUrl(data.path).data.publicUrl
      }
      // what suppliers read = the visible «ملاحظات للموردين» field + the spec document as a button
      // («[مواصفات مرفقة: …]» is the marker the supplier page turns into «عرض المواصفات»). Never the
      // project or tender name (UX-002).
      const projNotes = [supplierNotes.trim().slice(0, 1000), specUrl ? `[مواصفات مرفقة: ${specUrl}]` : ''].filter(Boolean).join('\n') || null

      // ONE request with all the project's items (owner 2026-10-27), like the request page: each
      // supplier sees the items of his specialties in one request, and the buyer awards the best
      // price per item on the request page (one purchase order per supplier).
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      const rfqItems: any[] = []
      for (const item of selectedItems) {
        // رفع ملف مواصفات البند إن وجد
        let itemSpecUrl: string | null = null
        if (item.specFile) {
          const specUp = await (await import('@/lib/compressImage')).compressImage(item.specFile)
          const ext = specUp.name.split('.').pop()
          const path = `${user.id}/spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, specUp, { upsert: true })
          if (!up) {
            await notify(L(`Could not upload the spec file of «${getProductLabel(item.product_name, locale)}». Check your connection and try again, or remove the file.`, `«${getProductLabel(item.product_name, locale)}» کی اسپیسیفکیشن فائل اپ لوڈ نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں، یا فائل ہٹا دیں۔`, `تعذّر رفع ملف مواصفات «${getProductLabel(item.product_name, locale)}». تحقّق من الاتصال وحاول مرة أخرى، أو احذف الملف.`), { tone: 'error' })
            focusItem(item); return
          }
          itemSpecUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
        }
        const st = specTextOf(item.product_name, item.specs)
        const specsObj: Record<string, string> = {}
        for (const [k, v] of Object.entries(item.specs || {})) if (String(v || '').trim()) specsObj[k] = String(v).trim()
        rfqItems.push({
          sector: item.sector,
          product_name: item.product_name,
          // never a specialty of another sector (UX-023)
          sub_category: validSub(item.sector, item.sub_category) || detectSubCategory(item.product_name, item.sector) || null,
          specification: withBrand([st, (item.specification || '').trim()].filter(Boolean).join(' — '), item.brand),
          ...((item.brand || '').trim() ? { brand: String(item.brand).trim().slice(0, 80) } : {}),
          ...(item.with_install && isInstallable(item.sector, validSub(item.sector, item.sub_category) || detectSubCategory(item.product_name, item.sector)) ? { with_install: true } : {}),
          quantity: Number(item.quantity),
          unit: item.unit || 'عدد',
          supplier_tiers: null, in_stock: false, max_days: needDays, specsObj,
          spec_file_url: itemSpecUrl,
          spec_file_name: itemSpecUrl ? (item.specFile?.name || 'مواصفات مرفقة') : null,
          photo_url: itemSpecUrl && /\.(jpe?g|png|webp)$/i.test(item.specFile?.name || '') ? itemSpecUrl : null,
          custom: !!item.custom,
        })
      }

      // 2) the project, then its one request
      const { data: project, error: projErr } = await supabase.from('project_rfqs').insert({
        contractor_id: user.id, title: listTitle, region, city: city || null,
        notes: projNotes, boq_url: boqUrl, status: 'sent',
      }).select().single()
      if (projErr) throw new Error(projErr.message)
      projectId = project.id

      const first = rfqItems[0]
      const { data: rfq, error: rfqErr } = await supabase.from('rfqs').insert({
        contractor_id: user.id, title: listTitle,
        sector: first.sector, sectors: Array.from(new Set(rfqItems.map(it => it.sector))),
        product_name: first.product_name, sub_category: first.sub_category, specification: first.specification,
        quantity: first.quantity, unit: first.unit,
        items: rfqItems,
        region, city: city || null,
        delivery_required: deliveryRequired,
        delivery_location: deliveryRequired ? (deliveryLocation || null) : null,
        vat_invoice_required: vatRequired,
        hide_identity: true, // always: the identity is revealed only after an offer is chosen
        target_tiers: targetTiers.length > 0 ? targetTiers : null,
        verified_only: verifiedOnly,
        nearby_only: nearbyOnly,
        // the project name is the buyer's own label: it is not repeated in the notes suppliers read
        notes: projNotes,
        expires_at: expiresAt,
      }).select('id').single()
      if (rfqErr || !rfq) {
        try { await supabase.from('project_rfqs').delete().eq('id', project.id) } catch {}
        projectId = null
        await notify((rfqErr?.message || '').includes('rfq_daily_limit')
          ? L('Daily request limit reached. Your list is saved in your draft: try again later.', 'روزانہ درخواستوں کی حد پوری ہو گئی۔ آپ کی فہرست آپ کے مسودے میں محفوظ ہے: بعد میں کوشش کریں۔', 'وصلت إلى الحد اليومي للطلبات. قائمتك محفوظة في مسودتك، فحاول لاحقاً.')
          : L('Could not send the list. It is saved in your draft: try again.', 'فہرست نہیں بھیجی جا سکی۔ یہ آپ کے مسودے میں محفوظ ہے: دوبارہ کوشش کریں۔', 'تعذّر إرسال القائمة، وهي محفوظة في مسودتك، فحاول مرة أخرى.'), { tone: 'error' })
        return
      }
      projectId = null // the request exists now: the project is kept whatever happens next
      // the project keeps its list of items, all pointing at the one request (checked, retried once: UX-072)
      const projRows = rfqItems.map(it => ({
        project_rfq_id: project.id, rfq_id: rfq.id, product_name: it.product_name, sector: it.sector,
        quantity: it.quantity, unit: it.unit, specification: it.specification, status: 'sent',
      }))
      let { error: piErr } = await supabase.from('project_rfq_items').insert(projRows)
      if (piErr) ({ error: piErr } = await supabase.from('project_rfq_items').insert(projRows))
      if (piErr) console.warn('project_rfq_items insert failed', piErr.message)
      // every item that was not sent (unselected or without a specialty) stays in the draft, to send later
      sentRef.current = true
      const sentIds = new Set(selectedItems.map((i: any) => i.id))
      const left = items.filter((i: any) => i.product_name && !sentIds.has(i.id))
      // from «تسعير مناقصة» (round-5 UX-021): each sent tender item is marked with this request and locked on its own;
      // the tender is «sent» only when none of its materials is left unsent. A partial send keeps it open for review.
      let tenderLeft: number | undefined
      if (tenderId) {
        const sentTenderIds = selectedItems.map((i: any) => i.tender_item_id).filter(Boolean)
        let perItem = false
        try {
          if (sentTenderIds.length) {
            const { error: e1 } = await supabase.from('tender_items').update({ sent_rfq_id: rfq.id }).in('id', sentTenderIds)
            perItem = !e1
          }
        } catch {}
        if (perItem) {
          try {
            const { count } = await supabase.from('tender_items').select('id', { count: 'exact', head: true }).eq('tender_id', tenderId).eq('kind', 'material').is('sent_rfq_id', null)
            tenderLeft = typeof count === 'number' ? count : undefined
          } catch {}
        }
        // without the per-item column (not deployed yet), a send that leaves tender items behind keeps the tender open
        const allSent = perItem ? tenderLeft === 0 : !left.some((i: any) => i.tender_item_id)
        try { await supabase.from('tenders').update({ status: allSent ? 'sent' : 'review', project_rfq_id: project.id }).eq('id', tenderId) } catch {}
        // the direct link from the tender to its request (round-5 UX-158), when the column exists
        try { await supabase.from('tenders').update({ rfq_id: rfq.id }).eq('id', tenderId) } catch {}
      }
      // the items left from a tender keep their link to it (UX-021); others do not
      const leftTender = tenderId && left.some((i: any) => i.tender_item_id) ? tenderId : null
      const leftData = { title, region, city, supplierNotes, deliveryRequired, deliveryLocation, hours, needDays, vatRequired, targetTiers, verifiedOnly, nearbyOnly, tender_id: leftTender, items: left.map(draftLine) }
      if (left.length) {
        writeProjectDraft(user.id, { ...leftData, server_id: serverIdRef.current })
        const sid = await saveBoqServerDraft(supabase, user.id, serverIdRef.current, draftTitle(left), leftData)
        serverIdRef.current = sid || serverIdRef.current
        setCloudState(sid ? 'saved' : 'local')
      } else forgetDraft()
      // a clear confirmation moment: «أُرسل طلبك: X مادة إلى N موردين», on this page (UX-072)
      let coverage: any = null
      try { const { data: cv } = await supabase.rpc('get_rfq_coverage', { p_rfq: rfq.id }); coverage = cv || null } catch {}
      setSentInfo({ id: rfq.id, count: rfqItems.length, expires: expiresAt, coverage, left, itemsSaved: !piErr, tenderId, tenderLeft })
      try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
    } catch (err) {
      if (projectId) { try { await supabase.from('project_rfqs').delete().eq('id', projectId) } catch {} }
      await notify(friendlyError((err as any)?.message, L('Could not send the list. It is saved in your draft: please try again.', 'فہرست نہیں بھیجی جا سکی۔ یہ آپ کے مسودے میں محفوظ ہے: دوبارہ کوشش کریں۔', 'تعذّر إرسال القائمة، وهي محفوظة في مسودتك، فحاول مرة أخرى.'), locale), { tone: 'error' })
    } finally { setLoading(false); submittingRef.current = false }
  }

  // the count on the button = what will really be sent (classified items only)
  const sendCount = items.filter((i: any) => i.selected && i.product_name && !i.needs_classification).length
  const unselectedCount = items.filter((i: any) => i.product_name && !i.selected).length
  const readyCount = items.filter((i: any) => i.selected && i.product_name && !i.needs_classification && parseFloat(i.quantity) > 0 && missingSpecs(i.product_name, i.sector, i.specs, i.specification || '', !!i.specFile).length === 0).length
  const noQtyItems = items.filter((i: any) => i.selected && i.product_name && !(parseFloat(i.quantity) > 0))
  const noQtyCount = noQtyItems.length
  const scrollToSend = () => document.getElementById('boq-send')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // ready / no quantity / no specialty: each chip takes you to the first item it counts (UX-073)
  // compact (the sticky bar on a phone, UX-076): chips with a zero count are hidden and the row never wraps.
  // «بلا تخصص» is not an error: gold, like «بلا كمية» (UX-136)
  // round-7 UX-080: the chips are also FILTERS (الكل / بلا كمية / بلا تخصص). A filter keeps the lines it counted when
  // it was chosen (a snapshot), so a line does not vanish while its quantity is being typed.
  const chooseView = (v: 'all' | 'noqty' | 'nosub') => {
    const list = v === 'noqty' ? noQtyItems : v === 'nosub' ? unclassifiedItems : []
    setViewFilter(v); setViewIds(v === 'all' ? null : new Set(list.map((it: any) => String(it.id))))
    if (list[0]) focusItem(list[0])
  }
  const chipCls = (on: boolean, n: number) => `inline-flex items-center min-h-11 px-3 rounded-full shrink-0 ${on ? 'bg-[#0B2438] text-white' : n ? 'bg-[#D4A543]/15 text-[#8F6820] underline underline-offset-2' : 'bg-gray-100 text-gray-500'}`
  const chipsRow = (compact: boolean) => (
    <div className={`flex gap-2 text-xs font-bold ${compact ? 'flex-nowrap whitespace-nowrap' : 'flex-wrap'}`}>
      {!compact && <button type="button" onClick={() => chooseView('all')} aria-pressed={viewFilter === 'all'} className={chipCls(viewFilter === 'all', 1)}>{L(`All (${items.length})`, `سب (${items.length})`, `الكل (${items.length})`)}</button>}
      {(!compact || readyCount > 0) && <span className="inline-flex items-center gap-1 min-h-11 px-3 rounded-full shrink-0 bg-[#0F6E56]/10 text-[#0F6E56]"><Glyph e="✓" /> {L(`Ready: ${readyCount}`, `تیار: ${readyCount}`, `جاهز: ${readyCount}`)}</span>}
      {(!compact || noQtyCount > 0) && <button type="button" disabled={!noQtyCount && viewFilter !== 'noqty'} onClick={() => chooseView('noqty')} aria-pressed={viewFilter === 'noqty'}
        className={chipCls(viewFilter === 'noqty', noQtyCount)}>{L(`No quantity (${noQtyCount})`, `بغیر مقدار (${noQtyCount})`, `بلا كمية (${noQtyCount})`)}</button>}
      {(!compact || unclassifiedCount > 0) && <button type="button" disabled={!unclassifiedCount && viewFilter !== 'nosub'} onClick={() => chooseView('nosub')} aria-pressed={viewFilter === 'nosub'}
        className={chipCls(viewFilter === 'nosub', unclassifiedCount)}>{L(`No specialty (${unclassifiedCount})`, `بغیر شعبہ (${unclassifiedCount})`, `بلا تخصص (${unclassifiedCount})`)}</button>}
      {viewFilter !== 'all' && <button type="button" onClick={() => chooseView('all')} className="inline-flex items-center min-h-11 px-3 rounded-full shrink-0 border border-[#0B2438]/30 bg-white text-[#0B2438]">{L('Show all', 'سب دکھائیں', 'عرض الكل')}</button>}
    </div>
  )
  // after a quantity: the cursor moves to the next line that still has none (in the order shown)
  function goNextMissing(fromId: string) {
    const order = getGroupedItems(items, locale, viewIds).flatMap((g: any) => g.entries.map((e: any) => e.item))
    const at = order.findIndex((it: any) => it.id === fromId)
    const miss = (it: any) => it.id !== fromId && it.selected && it.product_name && !(parseFloat(it.quantity) > 0)
    const next = order.slice(at + 1).find(miss) || order.find(miss)
    if (!next) return
    focusItem(next)
    setTimeout(() => (document.getElementById(`boq-qty-${next.id}`) as HTMLInputElement | null)?.focus({ preventScroll: true }), 350)
  }
  const statusChips = chipsRow(false)
  const unitOpt = (u: string) => <option key={u} value={u}>{getUnitLabel(u, locale)}</option>
  const unitsFor = (item: any) => Array.from(new Set([...(unitChoicesFor(item.product_name, item.sector) || UNIT_OPTIONS), ...(item.unit ? [item.unit] : [])])) as string[]
  // «تم»: closes the line and marks it complete when it has what suppliers need
  const lineOk = (item: any) => parseFloat(item.quantity) > 0 && missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile).length === 0
  function finishEdit(item: any) {
    updateItem(item.id, 'done', lineOk(item))
    setEditingIndex(null); setNameEdit(null)
  }

  // the completion box of a line (quantity, unit, specs), full card width so it is usable on a phone
  const completionBox = (item: any) => {
    const miss = missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile)
    const needWritten = miss.includes('*')
    const ok = parseFloat(item.quantity) > 0 && miss.length === 0
    return (
      <div className="mx-4 mb-4 space-y-2 rounded-xl border border-[#D4A543]/40 bg-[#D4A543]/[.04] p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Quantity', 'مقدار', 'الكمية')}</span>
            <input id={`boq-qty-${item.id}`} type="text" inputMode="decimal" enterKeyHint="next" value={item.quantity || ''} autoFocus={item.id === justAddedId}
              onKeyDown={(e: any) => { if (e.key === 'Enter' && parseFloat(item.quantity) > 0) { e.preventDefault(); goNextMissing(item.id) } }}
              onChange={(e: any) => updateItem(item.id, 'quantity', toQty(e.target.value))}
              className={`input-field text-sm ${parseFloat(item.quantity) > 0 ? '' : 'border-[#D4A543] bg-white'}`} placeholder={L('Quantity', 'مقدار', 'الكمية')} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Unit', 'یونٹ', 'الوحدة')}</span>
            <select value={item.unit} onChange={(e: any) => updateItem(item.id, 'unit', e.target.value)} className="input-field text-sm">
              {unitsFor(item).map(unitOpt)}
            </select>
          </label>
        </div>
        <ItemSpecFields name={item.product_name} sector={item.sector} specs={item.specs} locale={locale} showErrors={highlightId === item.id} onChange={(v: any) => updateItem(item.id, 'specs', v)} />
        {brandApplies(item.product_name, item.sector) && (
          <input value={item.brand || ''} onChange={(e: any) => updateItem(item.id, 'brand', e.target.value.slice(0, 80))} className="input-field text-sm"
            aria-label={L('Brand or product name (optional)', 'برانڈ یا پروڈکٹ کا نام (اختیاری)', 'الماركة أو اسم المنتج (اختياري)')}
            placeholder={L('Brand or product name (optional), e.g. Fosroc Renderoc', 'برانڈ یا پروڈکٹ کا نام (اختیاری)، مثلاً: Fosroc Renderoc', 'الماركة أو اسم المنتج (اختياري)، مثل: فوسروك رندروك')} />
        )}
        <input value={item.specification || ''} onChange={(e: any) => updateItem(item.id, 'specification', e.target.value)}
          aria-label={L('Specification', 'تفصیل', 'المواصفة')} className={`input-field text-sm ${needWritten ? 'border-[#D4A543] bg-white' : ''}`}
          placeholder={needWritten ? L('Size and specs (required): length, width, thickness, grade…', 'سائز اور تفصیل (ضروری): لمبائی، چوڑائی، موٹائی، گریڈ…', 'المقاس والمواصفات (مطلوب): الطول، العرض، السماكة، الدرجة…') : L('More specs for this item (optional)', 'اس آئٹم کی مزید تفصیل (اختیاری)', 'مواصفات إضافية لهذا البند (اختياري)')} />
        <button type="button" disabled={!ok} onClick={() => { updateItem(item.id, 'done', true); goNextMissing(item.id) }}
          className="w-full min-h-11 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#0B2438' }}>
          {!(parseFloat(item.quantity) > 0) ? L('Enter the quantity', 'مقدار لکھیں', 'أدخل الكمية') : miss.length ? L('Enter the specs', 'تفصیل لکھیں', 'أدخل المواصفات') : <><Glyph e="✓" /> {L('Done', 'ہو گیا', 'تم')}</>}
        </button>
      </div>
    )
  }

  const hasItems = items.length > 0
  // the file's own count (manual additions do not change it); an older draft without it counts the file's lines
  const extractedN = extracted || items.filter(isFileItem).length

  return (
    <AppShell title={homeMode ? L('Company tools', 'کمپنی کے ٹولز', 'أدوات الشركات') : tenderId ? L('Send the tender items for pricing', 'ٹینڈر کے آئٹمز قیمت کے لیے بھیجیں', 'إرسال بنود المناقصة للتسعير') : L('Bill of quantities', 'مقداروں کا جدول', 'جدول الكميات')}nav={getNav('contractor', locale, '/contractor/project/new')} dir={dir}>
      <div className="max-w-5xl mx-auto">
        {homeMode && <HomeModeNotice locale={locale} what="boq" />}
        {!homeMode && allowed === false && (
          <div className="bg-white rounded-2xl border border-[#D4A543]/40 p-6 sm:p-8 text-center shadow-sm">
            <div className="text-4xl text-[#8F6820] mb-3"><Glyph e="🏗" /></div>
            <h1 className="text-xl font-extrabold text-[#0B2438] mb-2">{L('Bills of quantities are for companies', 'مقداروں کا جدول کمپنیوں کے لیے ہے', 'جدول الكميات متاح لحسابات الشركات')}</h1>
            <p className="text-sm text-gray-600 leading-relaxed max-w-lg mx-auto mb-5">
              {L('Uploading a full bill of quantities and getting one purchase order per supplier is available to companies with a verified commercial registration.',
                'پورا مقداروں کا جدول اپلوڈ کرنا اور ہر سپلائر کے لیے پرچیز آرڈر تصدیق شدہ کمپنیوں کے لیے ہے۔',
                'رفع جدول كميات كامل والحصول على أمر شراء لكل مورد متاح لحسابات الشركات الموثّقة بالسجل التجاري.')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/settings" className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{L('Verify my commercial registration', 'تجارتی رجسٹریشن کی تصدیق', 'وثّق سجلك التجاري')}</Link>
              <Link href="/contractor/rfq/quick" className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Send a normal price request', 'عام قیمت کی درخواست', 'أرسل طلب تسعير عادياً')}</Link>
            </div>
          </div>
        )}
        {/* the confirmation moment after a send (UX-072): what was sent, to how many suppliers, what is left */}
        {!homeMode && allowed !== false && sentInfo && (() => {
          const cov = sentInfo.coverage
          const reached = Number(cov?.reached) || 0
          const uncovered: string[] = Array.isArray(cov?.items) ? cov.items.filter((x: any) => Number(x?.suppliers) === 0).map((x: any) => String(x?.name || '')).filter(Boolean) : []
          const leftN = sentInfo.left.length
          const suppliersAr = (n: number) => arCount(n, 'مورد واحد', 'موردَين', 'موردين', 'مورداً')
          return (
            <div className="max-w-lg mx-auto bg-white rounded-3xl p-6 sm:p-10 text-center border border-gray-100 shadow-sm" role="status" aria-live="polite">
              <div className="text-5xl mb-4 text-[#0F6E56]"><Glyph e="✅" /></div>
              <h1 className="text-2xl font-extrabold text-[#0B2438] mb-2">{L('Your request was sent', 'آپ کی درخواست بھیج دی گئی', 'أُرسل طلبك')}</h1>
              <p className="text-gray-700 font-semibold">
                {reached > 0
                  ? L(`${sentInfo.count} materials sent to ${reached} supplier${reached === 1 ? '' : 's'}.`, `${sentInfo.count} مواد ${reached} سپلائرز کو بھیجے گئے۔`, `أُرسلت ${arMaterials(sentInfo.count)} إلى ${suppliersAr(reached)}.`)
                  : L(`${sentInfo.count} materials sent to the specialist suppliers. We will notify you as soon as an offer arrives.`, `${sentInfo.count} مواد متعلقہ سپلائرز کو بھیجے گئے۔ کوئی بھی پیشکش آتے ہی ہم آپ کو اطلاع دیں گے۔`, `أُرسلت ${arMaterials(sentInfo.count)} إلى الموردين المختصين، وسنُبلغك فور وصول أي عرض.`)}
              </p>
              <p className="mt-3 text-[13px] text-gray-600">{L('The offers deadline ends: ', 'پیشکشوں کی مہلت ختم ہوگی: ', 'تنتهي مهلة العروض في: ')}<b className="text-[#0B2438]">{new Date(sentInfo.expires).toLocaleString(dateLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })}</b></p>
              {uncovered.length > 0 && (
                <div className="mt-3 text-start rounded-xl border border-[#D4A543]/40 bg-[#D4A543]/[.06] p-3 space-y-1">
                  {uncovered.slice(0, 4).map(n => (
                    <p key={n} className="text-[13px] text-[#0B2438]">{L(`No supplier for «${getProductLabel(n, locale)}» has joined yet. We will notify you as soon as one does.`, `«${getProductLabel(n, locale)}» کا کوئی سپلائر ابھی شامل نہیں ہوا۔ شامل ہوتے ہی اطلاع دیں گے۔`, `لم ينضم بعد مورد لـ«${getProductLabel(n, locale)}»، وسنُبلغك فور انضمام أحدهم.`)}</p>
                  ))}
                </div>
              )}
              {leftN > 0 && (
                <p className="mt-3 text-start rounded-xl border border-[#0B2438]/15 bg-[#0B2438]/[.03] p-3 text-[13px] text-[#0B2438]">
                  <Glyph e="📝" /> {L(`${leftN} items were not sent (unselected or without a specialty). They are saved in your draft: you can complete and send them now or later.`, `${leftN} آئٹمز نہیں بھیجے گئے (غیر منتخب یا بغیر شعبہ)۔ یہ آپ کے مسودے میں محفوظ ہیں: انہیں ابھی یا بعد میں مکمل کر کے بھیج سکتے ہیں۔`, `لم تُرسَل ${arItems(leftN)} (غير محدَّدة أو بلا تخصص)، وهي محفوظة في مسودتك: يمكنك إكمالها وإرسالها الآن أو لاحقاً.`)}
                  {cloudState === 'local' && <span className="block mt-1 text-xs text-[#8F6820]">{L('The draft is saved in this browser only, so it will not appear on another device or in the app.', 'مسودہ صرف اس براؤزر میں محفوظ ہے، اس لیے یہ کسی دوسرے آلے یا ایپ میں نظر نہیں آئے گا۔', 'المسودة محفوظة في هذا المتصفح فقط، فلن تظهر على جهاز آخر أو في التطبيق.')}</span>}
                </p>
              )}
              {/* a partial send from a tender keeps the tender open (round-5 UX-021) */}
              {sentInfo.tenderId && (sentInfo.tenderLeft ?? 0) > 0 && (
                <p className="mt-3 text-start rounded-xl border border-[#0B2438]/15 bg-[#0B2438]/[.03] p-3 text-[13px] text-[#0B2438]">
                  <Glyph e="📑" /> {L(`${sentInfo.tenderLeft} tender materials have not been sent yet. The tender stays open: you can review and send them later.`, `ٹینڈر کے ${sentInfo.tenderLeft} مواد ابھی نہیں بھیجے گئے۔ ٹینڈر کھلا رہے گا: آپ بعد میں ان کا جائزہ لے کر بھیج سکتے ہیں۔`, `لم تُرسل بعد ${arMaterials(sentInfo.tenderLeft || 0)} من المناقصة، وتبقى المناقصة مفتوحة لتراجعها وترسلها لاحقاً.`)}
                  {' '}<Link href={`/contractor/tender/${sentInfo.tenderId}`} className="inline-flex items-center min-h-11 px-1 font-bold underline">{L('Continue the review →', 'جائزہ جاری رکھیں ←', 'متابعة المراجعة ←')}</Link>
                </p>
              )}
              {!sentInfo.itemsSaved && (
                <p className="mt-3 text-start text-xs text-gray-600">{L('The request was sent, but its copy in the list record could not be saved. Follow it from the request page.', 'درخواست بھیج دی گئی، لیکن فہرست کے ریکارڈ میں اس کی نقل محفوظ نہیں ہو سکی۔ اسے درخواست کے صفحے سے دیکھیں۔', 'أُرسل الطلب، لكن تعذّر حفظ نسخة بنوده في سجل القائمة، فتابعه من صفحة الطلب.')}</p>
              )}
              <div className="mt-5 space-y-2">
                <Link href={`/contractor/rfq/${sentInfo.id}?sent=1`} className="flex items-center justify-center w-full min-h-12 py-3 rounded-xl font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                  {L('Follow your request', 'اپنی درخواست دیکھیں', 'تابع طلبك')}
                </Link>
                {leftN > 0 && (
                  <button type="button" onClick={continueWithLeft} className="w-full min-h-12 py-3 rounded-xl font-bold text-white" style={{ background: '#0B2438' }}>
                    {L(`Complete the remaining items (${leftN})`, `باقی آئٹمز مکمل کریں (${leftN})`, `أكمل البنود المتبقية (${arItems(leftN)})`)}
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={startFresh} className="min-h-12 py-3 rounded-xl font-bold border border-[#0B2438]/30 text-[#0B2438] bg-white">{L('New list', 'نئی فہرست', 'قائمة جديدة')}</button>
                  <Link href="/contractor/rfqs" className="min-h-12 py-3 grid place-items-center rounded-xl font-bold border border-[#0B2438]/30 text-[#0B2438] bg-white">{L('My requests', 'میری درخواستیں', 'طلباتي')}</Link>
                </div>
              </div>
            </div>
          )
        })()}
        {!homeMode && allowed !== false && !sentInfo && (<>
        <div className="mb-6">

          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>
            {tenderId ? L('Send the tender items for pricing', 'ٹینڈر کے آئٹمز قیمت کے لیے بھیجیں', 'إرسال بنود المناقصة للتسعير') : L('Bill of quantities', 'مقداروں کا جدول', 'جدول الكميات')}
          </h1>
          {/* round-7 UX-079: from a tender this is a review-and-send page: its name, and the way back as a visible button */}
          {tenderId && tenderTitle && <p className="text-sm font-bold text-[#8F6820] mt-0.5" dir="auto">{tenderTitle}</p>}
          <p className="text-sm text-gray-600 mt-1">
            {tenderId
              ? L('Review the approved tender items, complete the delivery details below and send: each material goes to the suppliers of its specialty.', 'ٹینڈر کے منظور آئٹمز دیکھیں، نیچے ڈیلیوری کی تفصیل مکمل کریں اور بھیجیں: ہر مواد اپنے شعبے کے سپلائرز کو جاتا ہے۔', 'راجع بنود المناقصة المعتمدة، وأكمل بيانات التوصيل بالأسفل ثم أرسل، وتصل كل مادة إلى موردي تخصصها.')
              : L('Upload the bill of quantities or add the materials yourself: each material goes to the suppliers of its specialty.',
                'مقداروں کا جدول اپلوڈ کریں یا مواد خود شامل کریں: ہر مواد اپنے شعبے کے سپلائرز کو جاتا ہے۔',
                'ارفع جدول الكميات أو أضف المواد بنفسك، وتصل كل مادة إلى موردي تخصصها.')}
          </p>
          {tenderId ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link href={`/contractor/tender/${tenderId}`} className="inline-flex items-center min-h-11 px-4 rounded-xl border border-[#0B2438] bg-white text-sm font-bold text-[#0B2438]">{L('Back to the tender', 'ٹینڈر پر واپس', 'العودة إلى المناقصة')}</Link>
              <button type="button" onClick={cancelTenderList} className="inline-flex items-center min-h-11 px-3 text-sm font-bold underline text-red-700">{L('Cancel this list', 'یہ فہرست منسوخ کریں', 'إلغاء هذه القائمة')}</button>
              <span className="text-xs text-gray-600"><Glyph e="📑" /> {L('Approved items only.', 'صرف منظور شدہ آئٹمز۔', 'البنود المعتمدة فقط.')}</span>
            </div>
          ) : (
            <Link href="/contractor/tender/new" className="mt-2 inline-block text-xs font-bold text-[#8F6820] hover:underline">
              <Glyph e="📑" /> {L('A full tender in Excel with drawings and specifications? Use «Tender pricing», which checks every number against its source', 'ڈرائنگز اور تفصیلات کے ساتھ Excel میں پورا ٹینڈر؟ «ٹینڈر کی قیمت» استعمال کریں، جو ہر عدد کو اس کے ماخذ سے ملاتا ہے', 'لديك مناقصة كاملة بصيغة Excel مع مخططات ومواصفات؟ استخدم «تسعير مناقصة» الذي يطابق كل رقم مع مصدره')}
            </Link>
          )}
        </div>

        {/* the draft is being restored (round-6 UX-081): adding waits, so nothing typed now can be overwritten */}
        {restoring && user && (
          <div className="mb-5 rounded-2xl border border-[#0B2438]/15 bg-[#0B2438]/[.03] p-3 flex items-center gap-2 text-sm font-semibold text-[#0B2438]" role="status" aria-live="polite">
            <span aria-hidden className="w-4 h-4 shrink-0 rounded-full border-2 border-[#0B2438]/25 border-t-[#0B2438] animate-spin" />
            <span>{L('Restoring your draft…', 'آپ کا مسودہ بحال ہو رہا ہے…', 'جارٍ استعادة مسودتك…')}
              <span className="block text-xs font-normal text-gray-600">{L('Adding materials is paused for a moment.', 'مواد شامل کرنا چند لمحوں کے لیے رکا ہے۔', 'إضافة المواد متوقفة لحظات.')}</span></span>
          </div>
        )}

        {/* a draft was restored: say so, and offer a clean start */}
        {!restoring && restoredCount > 0 && hasItems && !tenderId && (
          <div className="mb-5 rounded-2xl border border-[#D4A543]/50 bg-[#D4A543]/[.06] p-3 flex flex-wrap items-center justify-between gap-2" role="status">
            <span className="text-sm font-semibold text-[#0B2438]"><Glyph e="📝" /> {L(`We restored your draft (${items.length} items).`, `ہم نے آپ کا مسودہ بحال کیا (${items.length} آئٹمز)۔`, `استعدنا مسودتك (${arItems(items.length)}).`)}
              <span className="block text-xs font-normal text-gray-700 mt-0.5">{L('Spec files are not kept in a draft: attach them again before sending.', 'مسودے میں اسپیسیفکیشن فائلیں محفوظ نہیں ہوتیں: بھیجنے سے پہلے انہیں دوبارہ منسلک کریں۔', 'ملفات المواصفات لا تُحفظ في المسودة: أعد إرفاقها قبل الإرسال.')}</span></span>
            <button type="button" onClick={startOver} className="min-h-11 px-4 rounded-xl border border-[#0B2438] text-sm font-bold text-[#0B2438] bg-white">{L('Start a new list', 'نئی فہرست شروع کریں', 'بدء قائمة جديدة')}</button>
          </div>
        )}

        {/* Step 1: add the materials. From a tender (round-7 UX-079) it is folded behind «إضافة مادة أخرى» */}
        {tenderId && hasItems && !showAddMore ? (
          <div className="mb-5">
            <button type="button" onClick={() => setShowAddMore(true)} disabled={restoring}
              className="w-full min-h-11 py-3 rounded-xl border-2 border-dashed border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-[#0B2438] hover:text-[#0B2438] disabled:opacity-50">
              + {L('Add another material', 'ایک اور مواد شامل کریں', 'إضافة مادة أخرى')}
            </button>
          </div>
        ) : (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-1" style={{ color: '#0B2438' }}>
            {L('1. Add the materials', '1. مواد شامل کریں', '1. أضف المواد')}
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {L('The bill of quantities (Excel, CSV, PDF or a photo) is read automatically to extract the materials and quantities.', 'مقداروں کا جدول (Excel، CSV، PDF یا تصویر) خودکار پڑھ کر مواد اور مقداریں نکالی جاتی ہیں۔', 'يُقرأ جدول الكميات (Excel أو CSV أو PDF أو صورة) تلقائياً لاستخراج المواد والكميات.')}
          </p>

          {/* drop zone: click or drop a file */}
          <div role="button" tabIndex={0}
            onClick={() => { if (!parsing && !boqFile && !restoring) fileRef.current?.click() }}
            aria-disabled={restoring || undefined}
            onKeyDown={(e: any) => { if ((e.key === 'Enter' || e.key === ' ') && !parsing && !boqFile && !restoring) { e.preventDefault(); fileRef.current?.click() } }}
            onDragOver={(e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
            onDrop={(e: any) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer?.files?.[0]; if (f && !parsing && !restoring) handleBOQUpload(f) }}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all mb-4 ${boqFile ? 'border-[#0B2438] bg-[#0B2438]/5' : restoring ? 'border-gray-200 opacity-60' : 'cursor-pointer border-gray-200 hover:border-[#D4A543]/50'}`}>
            <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e: any) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleBOQUpload(f) }} />
            {parsing ? (
              <div className="text-center" aria-live="polite">
                <div className="text-4xl mb-3 animate-pulse"><Glyph e="⏳" /></div>
                <div className="font-semibold text-sm" style={{ color: '#0B2438' }}>
                  {L('Reading the bill of quantities…', 'مقداروں کا جدول پڑھا جا رہا ہے…', 'جارٍ قراءة جدول الكميات…')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {L('Extracting materials and quantities', 'مواد اور مقداریں نکالی جا رہی ہیں', 'استخراج المواد والكميات')}
                </div>
              </div>
            ) : boqFile ? (
              <div className="text-center">
                <div className="text-4xl mb-2"><Glyph e="✅" /></div>
                <div className="font-semibold text-sm break-all" style={{ color: '#0B2438' }}>{boqFile.name}</div>
                <div className="text-xs text-gray-500 mt-1">{L(`${extractedN} items extracted`, `${extractedN} آئٹمز نکالے گئے`, `تم استخراج ${arItems(extractedN)}`)}</div>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click() }}
                    className="min-h-11 px-3 rounded-lg border border-[#0B2438] text-xs font-bold text-[#0B2438] bg-white">
                    {L('Upload another file', 'دوسری فائل اپ لوڈ کریں', 'رفع ملف آخر')}
                  </button>
                  <button type="button" onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); removeBoqFile() }}
                    className="min-h-11 px-3 rounded-lg border border-red-200 text-xs font-bold text-red-600 bg-white">
                    {L('Remove the file', 'فائل ہٹائیں', 'إزالة الملف')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3"><Glyph e="📊" /></div>
                <div className="font-semibold text-sm text-gray-700">
                  {L('Drop the bill of quantities here, or tap to choose it', 'مقداروں کا جدول یہاں چھوڑیں، یا منتخب کرنے کے لیے دبائیں', 'اسحب ملف جدول الكميات هنا، أو اضغط لاختياره')}
                </div>
                <div className="text-xs text-gray-500 mt-1">Excel (.xlsx, .xls) · CSV · PDF · {L('photo', 'تصویر', 'صورة')}</div>
                <div className="text-xs text-gray-500 mt-1">{L('Suppliers receive the items read from it. The file is kept by Taseerak and is not sent to suppliers.', 'سپلائرز کو اس سے پڑھے گئے آئٹمز ملتے ہیں۔ فائل تسعیرک کے پاس محفوظ رہتی ہے اور سپلائرز کو نہیں بھیجی جاتی۔', 'تصل إلى الموردين البنود المقروءة منه، ويُحفظ الملف لدى تسعيرك ولا يُرسل إلى الموردين.')}</div>
              </div>
            )}
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4" role="alert"><Glyph e="⚠" /> {parseError}</div>
          )}

          {/* the BOQ file of a reopened draft: its items are kept, the file itself is not (UX-094) */}
          {!boqFile && !parsing && lostFiles.boq && hasItems && (
            <div className="rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/[.06] p-3 mb-4 text-sm text-[#0B2438]" role="status">
              {/* round-7 UX-077: no «إرفاقه بسجلي» (there is no screen that shows that record yet) */}
              <p><Glyph e="📎" /> {L(`The file «${lostFiles.boq}» is not attached after reopening. Your items are saved, and suppliers receive only the items, never the file.`, `دوبارہ کھولنے کے بعد فائل «${lostFiles.boq}» منسلک نہیں۔ آپ کے آئٹمز محفوظ ہیں، اور سپلائرز کو صرف آئٹمز ملتے ہیں، فائل کبھی نہیں۔`, `الملف «${lostFiles.boq}» غير مرفق بعد إعادة الفتح. بنودك محفوظة، ولا تصل إلى الموردين إلا البنود، لا الملف.`)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => setLostFiles(l => ({ ...l, boq: undefined }))} className="min-h-11 px-4 rounded-xl text-sm font-bold border border-[#0B2438]/30 text-[#0B2438] bg-white">
                  {L('OK', 'ٹھیک ہے', 'حسناً')}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">{L('OR add manually', 'یا خود شامل کریں', 'أو أضف يدوياً')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {draft && !hasItems ? draftPanel : (
          <button type="button" onClick={addItem} disabled={restoring}
            className="w-full min-h-11 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#0B2438] hover:text-[#0B2438] transition-all disabled:opacity-50">
            + {L('Add a material', 'مواد شامل کریں', 'أضف مادة')}
          </button>)}
        </div>
        )}

        {/* Step 2: review the items */}
        {hasItems && (
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2" style={{ color: '#0B2438' }}>
                {L(`2. Review the items (${items.length})`, `2. آئٹمز کا جائزہ لیں (${items.length})`, `2. راجع البنود (${items.length})`)}
                {aiUsed && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-[#0B2438]/15 bg-[#0B2438]/5 text-[#0B2438]">
                    <Glyph e="✨" /> {L('Read automatically', 'خودکار پڑھا گیا', 'قُرئ تلقائياً')}
                  </span>
                )}
              </h2>
            </div>

            {/* where the draft is kept (round-5 UX-089): the account (any device) or, when that failed, this browser only */}
            {cloudState === 'saved' && <p className="text-xs text-gray-600" role="status"><Glyph e="✓" /> {L('Draft saved to your account: you will find it on any device.', 'مسودہ آپ کے اکاؤنٹ میں محفوظ ہے: یہ آپ کو کسی بھی آلے پر ملے گا۔', 'حُفظت المسودة في حسابك، فتجدها على أي جهاز.')}</p>}
            {cloudState === 'local' && <p className="text-xs font-semibold text-[#8F6820]" role="status"><Glyph e="⚠" /> {L('The draft is saved in this browser only, so it will not appear on another device or in the app. Check your connection: we will try again on your next change.', 'مسودہ صرف اس براؤزر میں محفوظ ہے، اس لیے یہ کسی دوسرے آلے یا ایپ میں نظر نہیں آئے گا۔ کنکشن چیک کریں: اگلی تبدیلی پر ہم دوبارہ کوشش کریں گے۔', 'المسودة محفوظة في هذا المتصفح فقط، فلن تظهر على جهاز آخر أو في التطبيق. تحقّق من الاتصال، وسنحاول مرة أخرى عند تعديلك التالي.')}</p>}
            {/* what the file gave: ready / no quantity / no specialty */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              {boqFile && extractedN > 0 && <div className="text-sm font-bold text-[#0B2438] mb-2">{L(`We read ${extractedN} items from your file`, `ہم نے آپ کی فائل سے ${extractedN} آئٹمز پڑھے`, `قرأنا ${arItems(extractedN)} من ملفك`)}</div>}
              {statusChips}
            </div>

            {/* تنبيه البنود غير المصنّفة — لن تصل للمورد المتخصص بدقّة حتى تُصنّف */}
            {unclassifiedCount > 0 && (
              <div className="bg-[#D4A543]/[.08] border border-[#D4A543]/40 rounded-xl p-3 flex items-start gap-2">
                <span className="text-lg text-[#8F6820]"><Glyph e="⚠" /></span>
                <div className="text-sm text-[#0B2438] leading-relaxed">
                  <strong>{L(`${unclassifiedCount} item(s) have no specialty.`, `${unclassifiedCount} آئٹمز کا شعبہ منتخب نہیں۔`, `${arItems(unclassifiedCount)} بلا تخصص.`)}</strong>{' '}
                  {L('They are not sent until you choose their specialty (it routes each item to the right supplier); they stay saved in your draft. Tap «Choose its specialty» on each one, or classify them together below.',
                    'شعبہ منتخب کیے بغیر یہ نہیں بھیجے جاتے؛ یہ آپ کے مسودے میں محفوظ رہتے ہیں۔ ہر ایک پر «اس کا شعبہ منتخب کریں» دبائیں، یا نیچے اکٹھے درجہ بندی کریں۔',
                    'لا تُرسل حتى تختار تخصصها (فالتخصص هو ما يوصل البند إلى المورد المختص)، وتبقى محفوظة في مسودتك. اضغط «اختر تخصصها» على كل بند، أو صنّفها معاً بالأسفل.')}
                </div>
              </div>
            )}

            {/* تصنيف جماعي: تخصص واحد للبنود غير المصنّفة التي تختارها، والقطاعات الستة كلها متاحة (UX-073) */}
            {unclassifiedCount > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="text-sm font-bold text-gray-700 mb-2"><Glyph e="⚡" /> {L('Choose one specialty for several items', 'کئی آئٹمز کے لیے ایک شعبہ منتخب کریں', 'اختر تخصصاً واحداً لعدة بنود')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] items-end gap-2">
                  <label className="block">
                    <span className="block text-xs text-gray-600 mb-0.5">{L('Sector', 'سیکٹر', 'القطاع')}</span>
                    <select value={bulkSector} onChange={e => { setBulkSector(e.target.value); setBulkSub('') }} className="input-field text-sm">
                      <option value="">{L('— pick —', '— منتخب کریں —', '— اختر —')}</option>
                      {(Object.keys(SECTOR_PRODUCTS) as Sector[]).map((s: string) => (
                        <option key={s} value={s}>{sectorName(s, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-600 mb-0.5">{L('Specialty', 'شعبہ', 'التخصص')}</span>
                    <select value={bulkSub} onChange={e => setBulkSub(e.target.value)} disabled={!bulkSector} className="input-field text-sm disabled:opacity-50">
                      <option value="">{bulkSector ? L('Pick a specialty', 'شعبہ منتخب کریں', 'اختر التخصص') : L('Pick the sector first', 'پہلے سیکٹر منتخب کریں', 'اختر القطاع أولاً')}</option>
                      {bulkSector && Object.keys((SUB_CATEGORIES as any)[bulkSector] || {}).map((k: string) => (
                        <option key={k} value={k}>{getSubCategoryLabel(bulkSector as any, k, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={bulkApplyCategory} disabled={!bulkSector || !bulkSub || !bulkTargets.length}
                    className="min-h-11 text-sm font-bold text-white px-4 rounded-xl disabled:opacity-40" style={{ background: '#0B2438' }}>
                    {bulkTargets.length ? L(`Apply to ${bulkTargets.length} items`, `${bulkTargets.length} آئٹمز پر لاگو کریں`, `طبّق على ${arItems(bulkTargets.length)}`) : L('Apply', 'لاگو کریں', 'طبّق')}
                  </button>
                </div>
                {(!bulkSector || !bulkSub) && <p className="text-xs text-gray-500 mt-1.5">{L('Pick a sector and a specialty to apply them.', 'لاگو کرنے کے لیے سیکٹر اور شعبہ منتخب کریں۔', 'اختر القطاع والتخصص لتطبيقهما.')}</p>}
                {/* which items take it: all by default; untick the ones that belong elsewhere */}
                <details className="mt-2">
                  <summary className="cursor-pointer min-h-11 flex items-center text-xs font-bold text-[#8F6820]">
                    {L(`Choose the items (${bulkTargets.length} of ${unclassifiedCount})`, `آئٹمز منتخب کریں (${unclassifiedCount} میں سے ${bulkTargets.length})`, `اختر البنود (${bulkTargets.length} من ${unclassifiedCount})`)}
                  </summary>
                  <div className="mt-1 max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {unclassifiedItems.map((it: any) => (
                      <label key={it.id} className="flex items-center gap-2 min-h-11 px-2 text-sm cursor-pointer select-none">
                        <input type="checkbox" checked={!bulkSkip[it.id]} onChange={(e: any) => { const on = e.target.checked; setBulkSkip(m => ({ ...m, [it.id]: !on })) }} className="w-5 h-5 accent-[#0B2438] shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-[#0B2438]" dir="auto">{getProductLabel(it.product_name, locale)}</span>
                        <span className="text-xs text-gray-500 shrink-0">{sectorName(it.sector, locale)}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setItems(prev => prev.map((i: any) => ({ ...i, selected: true })))}
                className="min-h-11 text-xs font-bold px-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                {L('Select all', 'سب منتخب کریں', 'تحديد الكل')}
              </button>
              <button type="button" onClick={() => setItems(prev => prev.map((i: any) => ({ ...i, selected: false })))}
                className="min-h-11 text-xs font-bold px-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                {L('Deselect all', 'سب ہٹائیں', 'إلغاء تحديد الكل')}
              </button>
              <button type="button" onClick={addItem} disabled={restoring}
                className="min-h-11 text-xs font-bold px-3 rounded-lg text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
                + {L('Add a material', 'مواد شامل کریں', 'أضف مادة')}
              </button>
            </div>
            {draft && hasItems && draftPanel}

            {/* Items — grouped by category (accordion, like the pricing lists) */}
            <div className="space-y-3">
              {getGroupedItems(items, locale, viewIds).map((g: any) => {
                const open = openGroups[g.key] ?? g.defaultOpen
                return (
                  <div key={g.key} className="border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleGroup(g.key)} aria-expanded={open}
                      className={`w-full min-h-11 flex items-center justify-between px-4 py-3 ${g.key === '_unclassified' ? 'bg-[#D4A543]/10' : 'bg-gray-50'}`}>
                      <span className="font-bold text-sm flex items-center gap-2" style={{ color: g.key === '_unclassified' ? '#8F6820' : '#0B2438' }}>
                        <span className="w-5 h-5 grid place-items-center"><CatIcon k={g.key} className="w-4 h-4" /></span> {g.label}
                        <span className="badge text-xs bg-white border border-gray-200 text-gray-600">{g.entries.length}</span>
                      </span>
                      <span className="text-gray-500 text-sm"><Glyph e={open ? '▴' : '▾'} /></span>
                    </button>
                    {open && (
                      <div className="p-2 space-y-2 border-t border-gray-100">
                        {g.entries.map(({ item, i }: any) => {
                          const editing = editingIndex === i
                          const needsBox = !editing && (item.done === false || !(parseFloat(item.quantity) > 0))
                          const nameIsCatalog = CATALOG_SET.has(item.product_name)
                          return (
                <div key={item.id} id={`boq-item-${item.id}`} className={`bg-white rounded-xl border transition-all scroll-mt-24 ${
                  highlightId === item.id ? 'border-[#D4A543] ring-2 ring-[#D4A543]/50' : item.selected ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-50'
                }`}>
                  <div className="flex items-start gap-3 p-4">
                    {/* Checkbox */}
                    <label className="-m-3 w-11 h-11 grid place-items-center shrink-0 cursor-pointer">
                      <input type="checkbox" checked={item.selected} aria-label={L('Include in the request', 'درخواست میں شامل کریں', 'ضمّن البند في الطلب')}
                        onChange={(e: any) => updateItem(item.id, 'selected', e.target.checked)}
                        className="w-5 h-5 accent-[#0B2438]" />
                    </label>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editing ? (
                        // Edit Mode
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            {/* a catalog material's name is its routing key: read-only (translated); «تغيير المادة» to write another */}
                            {nameIsCatalog && nameEdit !== item.id ? (
                              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                                <span className="flex-1 min-w-0 text-sm font-semibold text-[#0B2438]">{getProductLabel(item.product_name, locale)}</span>
                                <button type="button" onClick={() => setNameEdit(item.id)} className="min-h-11 px-2 text-xs font-bold text-[#8F6820] hover:underline shrink-0">{L('Change the material', 'مواد بدلیں', 'تغيير المادة')}</button>
                              </div>
                            ) : (<>
                              <input value={item.product_name} list="boq-catalog" dir="auto" aria-label={L('Material name', 'مواد کا نام', 'اسم المادة')}
                                onChange={(e: any) => { const v = e.target.value; setItems(prev => prev.map((it: any) => it.id === item.id ? { ...it, product_name: v, specs: {} } : it)) }}
                                className="input-field text-sm" placeholder={L('Material name *', 'مواد کا نام *', 'اسم المادة *')} />
                              {locale !== 'ar' && <p className="text-xs text-gray-500 mt-1">{L('Pick from the list so the material is matched to its suppliers.', 'فہرست سے منتخب کریں تاکہ مواد اپنے سپلائرز سے ملے۔', 'اختر من القائمة لتُطابق المادة مع مورديها.')}</p>}
                            </>)}
                          </div>
                          {/* التخصص — يحدّد المورد المتخصص الذي يستقبل البند */}
                          <div className="sm:col-span-2">
                            <LineSpecialty name={item.product_name} sector={item.sector}
                              value={item.needs_classification ? undefined : { sector: item.sector, sub: item.sub_category || null, section: item.section }} locale={locale}
                              onChange={(v: any) => setItems(prev => prev.map((it: any) => it.id === item.id ? { ...it, sector: v.sector, sub_category: v.sub, section: v.section, needs_classification: !choiceDone(v) } : it))} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                            <input type="text" inputMode="decimal" value={item.quantity}
                              onChange={(e: any) => updateItem(item.id, 'quantity', toQty(e.target.value))}
                              aria-label={L('Quantity', 'مقدار', 'الكمية')} className="input-field text-sm" placeholder={L('Quantity', 'مقدار', 'الكمية')} />
                            <select value={item.unit}
                              onChange={(e: any) => updateItem(item.id, 'unit', e.target.value)}
                              aria-label={L('Unit', 'یونٹ', 'الوحدة')} className="input-field text-sm">
                              {unitsFor(item).map(unitOpt)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <ItemSpecFields name={item.product_name} sector={item.sector} specs={item.specs} locale={locale} showErrors={highlightId === item.id} onChange={(v: any) => updateItem(item.id, 'specs', v)} />
                          </div>
                          <div className="sm:col-span-2">
                            <input value={item.specification || ''}
                              onChange={(e: any) => updateItem(item.id, 'specification', e.target.value)}
                              aria-label={L('Specification', 'تفصیل', 'المواصفة')} className={`input-field text-sm ${missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile).includes('*') ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
                              placeholder={specsRequired(item.product_name, item.sector) && !getProductSpecs(item.product_name).some(f => f.key !== 'unit') ? L('Size and specs (required): length, width, thickness, grade…', 'سائز اور تفصیل (ضروری): لمبائی، چوڑائی، موٹائی، گریڈ…', 'المقاس والمواصفات (مطلوب): الطول، العرض، السماكة، الدرجة…') : L('More specs for this item (optional)', 'اس آئٹم کی مزید تفصیل (اختیاری)', 'مواصفات إضافية لهذا البند (اختياري)')} />
                            {item.specFromDoc && (item.specFromDoc !== (item.specification || '')) && (
                              <div className="mt-1.5 text-xs bg-[#D4A543]/5 border border-[#D4A543]/30 rounded-lg p-2 flex items-start gap-2">
                                <span className="text-[#8F6820] font-bold shrink-0"><Glyph e="📄" /> {L('Spec doc:', 'دستاویز سے:', 'من الوثيقة:')}</span>
                                <span className="text-gray-600 flex-1 min-w-0">{item.specFromDoc}</span>
                                <button type="button" onClick={() => updateItem(item.id, 'specification', item.specFromDoc)}
                                  className="min-h-11 px-2 text-[#0B2438] font-bold shrink-0 hover:underline">{L('Use', 'استعمال کریں', 'استبدل')}</button>
                              </div>
                            )}
                          </div>
                          {/* رفع ملف مواصفات للبند */}
                          <div className="sm:col-span-2">
                            <span id={`boq-specfile-${item.id}`} className="block text-xs font-bold text-gray-600 mb-1">
                              {L('Spec file (optional)', 'آئٹم کی اسپیسیفکیشن فائل (اختیاری)', 'ملف مواصفات للبند (اختياري)')}
                            </span>
                            <p className="text-xs text-[#8F6820] mb-1"><Glyph e="👁" /> {L('Suppliers can view this file, so remove your company name and contact details from it.', 'سپلائرز یہ فائل دیکھ سکتے ہیں، اس لیے اس سے اپنی کمپنی کا نام اور رابطے کی تفصیل ہٹا دیں۔', 'يطّلع الموردون على هذا الملف، فاحذف منه اسم شركتك وبيانات تواصلك.')}</p>
                            {item.specFile ? (
                              <div className="flex items-center gap-2 bg-[#0B2438]/5 rounded-lg p-2 border border-[#0B2438]/20">
                                <span className="text-base"><Glyph e="📎" /></span>
                                <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#0B2438' }}>{item.specFile.name}</span>
                                <button type="button" onClick={() => setItems(prev => prev.map((it: any) => it.id === item.id ? { ...it, specFile: null, specFileName: undefined } : it))}
                                  className="min-h-11 px-2 text-xs font-bold text-red-600 hover:underline">
                                  {L('Remove', 'ہٹائیں', 'إزالة')}
                                </button>
                              </div>
                            ) : (<>
                              {item.specFileName && (
                                <p className="text-xs font-semibold text-[#0B2438] bg-[#D4A543]/[.08] border border-[#D4A543]/40 rounded-lg p-2 mb-1" role="status">
                                  <Glyph e="📎" /> {L(`The file «${item.specFileName}» is not attached after reopening. Upload it again to attach it to the request.`, `دوبارہ کھولنے کے بعد فائل «${item.specFileName}» منسلک نہیں۔ اسے درخواست کے ساتھ منسلک کرنے کے لیے دوبارہ اپ لوڈ کریں۔`, `الملف «${item.specFileName}» غير مرفق بعد إعادة الفتح، ارفعه مرة أخرى لإرفاقه بالطلب.`)}
                                  {' '}<button type="button" onClick={() => updateItem(item.id, 'specFileName', undefined)} className="min-h-11 px-1 underline text-[#8F6820]">{L('Send without it', 'اس کے بغیر بھیجیں', 'الإرسال دونه')}</button>
                                </p>
                              )}
                              <label className="flex items-center gap-2 min-h-11 border-2 border-dashed border-gray-200 rounded-lg p-2 cursor-pointer hover:border-[#D4A543]/50 transition-all">
                                <input type="file" className="hidden" aria-labelledby={`boq-specfile-${item.id}`} accept=".pdf,.jpg,.jpeg,.png,.dwg,.xlsx,.doc,.docx"
                                  onChange={(e: any) => { const f = e.target.files?.[0] ?? null; setItems(prev => prev.map((it: any) => it.id === item.id ? { ...it, specFile: f, specFileName: f ? undefined : it.specFileName } : it)); e.target.value = '' }} />
                                <span className="text-base"><Glyph e="📄" /></span>
                                <span className="text-xs text-gray-600">
                                  {L('Upload drawing/spec (PDF, DWG, Image...)', 'ڈرائنگ یا اسپیسیفکیشن اپ لوڈ کریں (PDF، DWG، تصویر...)', 'ارفع رسمة أو مواصفة (PDF، DWG، صورة...)')}
                                </span>
                              </label>
                            </>)}
                          </div>
                          <div className="sm:col-span-2 flex gap-2">
                            <button type="button" onClick={() => finishEdit(item)}
                              className="min-h-11 text-sm px-5 rounded-xl text-white font-bold" style={{ background: '#0B2438' }}>
                              <Glyph e="✓" /> {L('Done', 'ہو گیا', 'تم')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {item.product_name && <img src={productImageUrl(item.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, item.sub_category)} className="w-12 h-12 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0" />}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm" style={{ color: '#0B2438' }}>
                              {(item.product_name && getProductLabel(item.product_name, locale)) || <span className="text-gray-500 italic">{L('Unnamed item', 'بغیر نام کا آئٹم', 'بند بدون اسم')}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {item.sub_category ? (
                                <span className="badge text-xs bg-[#0B2438]/5 text-[#0B2438] font-bold">
                                  {getSubCategoryLabel(item.sector, item.sub_category, locale)}
                                </span>
                              ) : !item.needs_classification && (
                                <span className="badge text-xs bg-gray-100 text-gray-600">{L('All suppliers of the section', 'شعبے کے سب سپلائرز', 'كل موردي القسم')}</span>
                              )}
                              {item.needs_classification && (
                                <button type="button" onClick={() => setEditingIndex(i)}
                                  className="min-h-11 badge text-xs bg-[#D4A543]/15 text-[#8F6820] font-bold hover:bg-[#D4A543]/25">
                                  <Glyph e="⚠" /> {L('Choose its specialty', 'اس کا شعبہ منتخب کریں', 'اختر تخصصها')}
                                </button>
                              )}
                              {item.quantity && <span className="text-xs text-gray-600"><Glyph e="📦" /> {parseFloat(item.quantity) > 0 ? fmtNum(Number(item.quantity)) : item.quantity} {getUnitLabel(item.unit, locale)}</span>}
                              {(specTextOf(item.product_name, item.specs) || item.specification) && <span className="text-xs text-gray-600 break-words max-w-full"><Glyph e="⚙" /> {[specTextOf(item.product_name, item.specs), item.specification].filter(Boolean).join(' — ')}</span>}
                              {missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile).length > 0 && !needsBox && (
                                <button type="button" onClick={() => setEditingIndex(i)} className="min-h-11 badge text-xs bg-[#D4A543]/15 text-[#8F6820] font-bold hover:bg-[#D4A543]/25">
                                  {L('Complete the specs', 'تفصیل مکمل کریں', 'أكمل المواصفات')}
                                </button>
                              )}
                              {item.specFile && <span className="text-xs text-[#0B2438] font-semibold"><Glyph e="📎" /> {L('File attached', 'فائل منسلک', 'مرفق ملف')}</span>}
                              {!item.specFile && item.specFileName && (
                                <button type="button" onClick={() => setEditingIndex(i)} className="min-h-11 badge text-xs bg-[#D4A543]/15 text-[#8F6820] font-bold hover:bg-[#D4A543]/25">
                                  <Glyph e="📎" /> {L('File not attached: upload it again', 'فائل منسلک نہیں: دوبارہ اپ لوڈ کریں', 'الملف غير مرفق: ارفعه مرة أخرى')}
                                </button>
                              )}
                              {isInstallable(item.sector, item.sub_category || detectSubCategory(item.product_name, item.sector)) && (
                                <label className={`inline-flex items-center gap-1.5 min-h-11 text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer select-none ${item.with_install ? 'border-[#0B2438] text-[#0B2438] bg-[#0B2438]/5' : 'border-gray-200 text-gray-600'}`}>
                                  <input type="checkbox" checked={!!item.with_install} onChange={(e: any) => updateItem(item.id, 'with_install', e.target.checked)} className="w-4 h-4 accent-[#0B2438]" />
                                  <Glyph e="🔧" /> {L('Ask for the price with installation', 'تنصیب سمیت قیمت مانگیں', 'اطلب السعر مع التركيب')}
                                </label>
                              )}
                              {item.needs_review && !item.done && (
                                <span className="badge text-xs bg-[#D4A543]/15 text-[#8F6820] font-bold">
                                  <Glyph e="⚠" /> {L('Needs review', 'جائزہ ضروری', 'يحتاج مراجعة')}
                                </span>
                              )}
                              {/* every reason, visible (a title tooltip never shows on a phone): UX-135 */}
                              {item.needs_review && !item.done && boqFlagText(item.flags, L).length > 0 && (
                                <span className="basis-full text-xs text-[#8F6820]">{L('Check: ', 'جانچیں: ', 'تحقّق من: ')}{boqFlagText(item.flags, L).join(locale === 'ar' ? '، ' : ', ')}</span>
                              )}
                            </div>
                            {Array.isArray(item.specConflicts) && item.specConflicts.length > 0 && (
                              <div className="mt-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1" dir="auto">
                                <Glyph e="⚠" /> {L('Contradicts the specification:', 'اسپیسیفکیشن سے متصادم:', 'يتعارض مع المواصفات:')} {item.specConflicts.join(' · ')}
                              </div>
                            )}
                          </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button type="button" onClick={() => setEditingIndex(i)} aria-label={L('Edit', 'ترمیم', 'تعديل')}
                              className="text-sm min-w-11 min-h-11 grid place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Glyph e="✏" /></button>
                            <button type="button" onClick={() => removeItem(item.id)} aria-label={L('Remove', 'ہٹائیں', 'حذف')}
                              className="text-sm min-w-11 min-h-11 grid place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Glyph e="🗑" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {needsBox && completionBox(item)}
                </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* مستند مواصفات المشروع (اختياري، مطوي) — يقرأه الذكاء ويطابق رموز البنود (DRS-701...) لاستخراج التفاصيل */}
            <details className="rounded-xl border border-[#0B2438]/15 bg-white p-4" open={!!specsFile || !!specMsg || !!lostFiles.specs}>
              <summary className="cursor-pointer min-h-11 flex items-center gap-2 font-bold text-sm" style={{ color: '#0B2438' }}>
                <Glyph e="📑" /> {L('Match a project specification document (optional)', 'پراجیکٹ کی تفصیلات کی دستاویز ملائیں (اختیاری)', 'مطابقة مستند مواصفات المشروع (اختياري)')}
              </summary>
              <p className="text-xs text-gray-600 mt-1 mb-3">
                {L('Upload the spec document: it is read with the bill of quantities, item codes (e.g. DRS-701) are resolved and each item\'s full details are filled.',
                  'اسپیسیفکیشن دستاویز اپ لوڈ کریں: اسے مقداروں کے جدول کے ساتھ پڑھ کر آئٹم کوڈ (جیسے DRS-701) ملائے جاتے ہیں اور ہر آئٹم کی مکمل تفصیل بھری جاتی ہے۔',
                  'ارفع مستند المواصفات: يُقرأ مع جدول الكميات، وتُربط رموز البنود (مثل DRS-701) وتُملأ تفاصيل كل بند كاملة.')}
              </p>
              <p className="text-xs font-semibold text-[#8F6820] -mt-1 mb-3"><Glyph e="👁" /> {L('Suppliers can view this file, so remove your company name and contact details from it.', 'سپلائرز یہ فائل دیکھ سکتے ہیں، اس لیے اس سے اپنی کمپنی کا نام اور رابطے کی تفصیل ہٹا دیں۔', 'يطّلع الموردون على هذا الملف، فاحذف منه اسم شركتك وبيانات تواصلك.')}</p>
              {!specsFile && lostFiles.specs && (
                <p className="text-xs font-semibold text-[#0B2438] bg-[#D4A543]/[.08] border border-[#D4A543]/40 rounded-lg p-2 mb-2" role="status">
                  <Glyph e="📎" /> {L(`The file «${lostFiles.specs}» is not attached after reopening. Upload it again to attach it to the request.`, `دوبارہ کھولنے کے بعد فائل «${lostFiles.specs}» منسلک نہیں۔ اسے درخواست کے ساتھ منسلک کرنے کے لیے دوبارہ اپ لوڈ کریں۔`, `الملف «${lostFiles.specs}» غير مرفق بعد إعادة الفتح، ارفعه مرة أخرى لإرفاقه بالطلب.`)}
                  {' '}<button type="button" onClick={() => setLostFiles(l => ({ ...l, specs: undefined }))} className="min-h-11 px-1 underline text-[#8F6820]">{L('Send without it', 'اس کے بغیر بھیجیں', 'الإرسال دونه')}</button>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {specsFile ? (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                    <span className="text-base"><Glyph e="📄" /></span>
                    <span className="text-xs font-semibold truncate max-w-[200px]" style={{ color: '#0B2438' }}>{specsFile.name}</span>
                    <button type="button" onClick={() => { setSpecsFile(null); setSpecMsg(''); if (specsRef.current) specsRef.current.value = '' }} className="min-h-11 px-2 text-xs font-bold text-red-600 hover:underline">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 min-h-11 border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-[#0B2438]/40 transition-all">
                    <input ref={specsRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg"
                      onChange={(e: any) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setSpecsFile(f); setSpecMsg(''); setLostFiles(l => ({ ...l, specs: undefined })) } }} />
                    <span className="text-base"><Glyph e="📤" /></span>
                    <span className="text-xs text-gray-600">{L('Upload spec (PDF, Excel, image...)', 'اسپیسیفکیشن اپ لوڈ کریں (PDF، Excel، تصویر...)', 'ارفع المواصفات (PDF، Excel، صورة...)')}</span>
                  </label>
                )}
                <button type="button" onClick={matchSpecs} disabled={matchingSpecs || !specsFile}
                  className="min-h-11 text-xs font-bold text-white px-4 rounded-lg disabled:opacity-40 transition-all hover:shadow"
                  style={{ background: '#0B2438' }}>
                  {matchingSpecs ? (L('Reading...', 'پڑھ رہے ہیں...', 'جارٍ القراءة...')) : (L('Read & match specs', 'اسپیسیفکیشن پڑھیں اور ملائیں', 'اقرأ المواصفات وطابقها'))}
                </button>
              </div>
              {specMsg && (
                <div className={`text-xs mt-2 font-semibold ${specOk ? 'text-[#0F6E56]' : 'text-[#8F6820]'}`} role="status">{specOk && <Glyph e="✓" />} {specMsg}</div>
              )}
            </details>

            {/* a status bar that stays in view while reviewing a long list, until step 3 is reached (UX-073) */}
            <div className="sticky z-30 bottom-[calc(88px+env(safe-area-inset-bottom))] lg:bottom-4 rounded-2xl border border-[#0B2438]/15 bg-white/95 backdrop-blur shadow-lg p-2 flex flex-nowrap items-center justify-between gap-2"
              role="region" aria-label={L('List status', 'فہرست کی حالت', 'حالة القائمة')}>
              {/* one row on a phone: the chips scroll sideways, the button keeps its place (UX-076) */}
              <div className="min-w-0 flex-1 overflow-x-auto">{chipsRow(true)}</div>
              <button type="button" onClick={scrollToSend} className="min-h-11 px-4 rounded-xl font-bold text-sm text-[#071827] shrink-0 whitespace-nowrap" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {L('Continue to sending', 'بھیجنے کی طرف بڑھیں', 'المتابعة للإرسال')} <Glyph e="▾" />
              </button>
            </div>
          </div>
        )}

        {/* «حُذف البند · تراجع» */}
        {/* above the sticky status bar (UX-076), so it never covers its chips or button */}
        {lastRemoved && (
          <div className="fixed z-50 inset-x-4 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 rtl:sm:translate-x-1/2 bottom-[calc(160px+env(safe-area-inset-bottom))] lg:bottom-24 rounded-xl bg-[#0B2438] text-white shadow-xl px-4 py-2 flex items-center justify-between gap-3" role="status" aria-live="polite">
            <span className="text-sm font-semibold truncate">{L('Item removed', 'آئٹم ہٹا دیا گیا', 'حُذف البند')}{lastRemoved.item?.product_name ? ` · ${getProductLabel(lastRemoved.item.product_name, locale)}` : ''}</span>
            <button type="button" onClick={undoRemove} className="min-h-11 px-3 rounded-lg font-bold text-sm text-[#F5C55B] shrink-0"><Glyph e="↩" /> {L('Undo', 'واپس لائیں', 'تراجع')}</button>
          </div>
        )}

        {/* Step 3: project details and sending */}
        {hasItems && (
          <div id="boq-send" className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm scroll-mt-20">
            <h2 className="font-bold mb-4" style={{ color: '#0B2438' }}>
              {L('3. List details and sending', '3. فہرست کی معلومات اور بھیجنا', '3. بيانات القائمة والإرسال')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
              <div className="sm:col-span-2">
                <label htmlFor="boq-title" className="block text-xs font-bold text-gray-600 mb-1.5">
                  {L('List name (optional)', 'فہرست کا نام (اختیاری)', 'اسم القائمة (اختياري)')}
                </label>
                <input id="boq-title" ref={titleRef} value={title} onChange={(e: any) => setTitle(e.target.value)} 
                  className="input-field" placeholder={L(`e.g. Building A. Left empty: «${defaultListName(locale)}»`, `مثلاً: عمارت A۔ خالی چھوڑیں تو: «${defaultListName(locale)}»`, `مثال: مبنى A. إن تركته فارغاً: «${defaultListName(locale)}»`)} />
                <p className="text-xs text-gray-500 mt-1"><Glyph e="🔒" /> {L('Only you see this name; it is not shown to suppliers.', 'یہ نام صرف آپ دیکھتے ہیں؛ سپلائرز کو نہیں دکھایا جاتا۔', 'يظهر هذا الاسم لك وحدك ولا يُعرض على الموردين.')}</p>
              </div>
              <div>
                <label htmlFor="boq-region" className="block text-xs font-bold text-gray-600 mb-1.5">{L('Region *', 'علاقہ *', 'المنطقة *')}</label>
                <select id="boq-region" ref={regionRef} value={region} onChange={(e: any) => { setRegion(e.target.value); setCity('') }} aria-invalid={showMissing && !region}
                  className={`input-field ${showMissing && !region ? 'border-red-400 bg-red-50/40' : ''}`}>
                  <option value="">{L('Select region', 'علاقہ منتخب کریں', 'اختر المنطقة')}</option>
                  {REGIONS.map((r: any) => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                </select>
                {showMissing && !region && <p className="text-xs font-bold text-red-600 mt-1">{L('This field is required', 'یہ خانہ ضروری ہے', 'هذا الحقل مطلوب')}</p>}
              </div>
              <div>
                <label htmlFor="boq-city" className="block text-xs font-bold text-gray-600 mb-1.5">{L('City', 'شہر', 'المدينة')}</label>
                <select id="boq-city" value={city} onChange={(e: any) => setCity(e.target.value)} className="input-field" disabled={!region}>
                  <option value="">{!region ? (L('Select region first', 'پہلے علاقہ منتخب کریں', 'اختر المنطقة أولاً')) : (L('Select city', 'شہر منتخب کریں', 'اختر المدينة'))}</option>
                  {(CITIES_BY_REGION[region] || []).map((c: any) => <option key={c.ar} value={c.ar}>{locale === 'ar' ? c.ar : c.en}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 -mt-1 flex flex-wrap items-center gap-2">
                <button type="button" onClick={geolocate}
                  className="min-h-11 text-xs font-bold px-3 rounded-xl border border-[#0B2438] text-[#0B2438] hover:bg-[#0B2438]/5 transition-colors">
                  <Glyph e="📍" /> {L('Auto-detect my location', 'میرا مقام خود معلوم کریں', 'حدّد موقعي تلقائياً')}
                </button>
                {geoMsg && <span className="text-xs text-gray-600" role="status">{geoMsg}</span>}
              </div>
              <div className="sm:col-span-2 bg-[#D4A543]/[.06] border border-[#D4A543]/30 rounded-xl p-3">
                {/* the whole row is the switch (44px target: UX-107) */}
                <button type="button" role="switch" aria-checked={deliveryRequired} onClick={() => setDeliveryRequired(!deliveryRequired)}
                  className="w-full min-h-11 flex items-center justify-between gap-2 text-start">
                  <span className="text-sm font-semibold text-[#0B2438]"><Glyph e="🚚" /> {L('Delivery required (for the whole list)', 'ڈیلیوری درکار ہے (پوری فہرست کے لیے)', 'التوصيل مطلوب (لكل القائمة)')}</span>
                  <span aria-hidden className={`w-12 h-7 rounded-full flex items-center px-1 shrink-0 transition-all ${deliveryRequired ? 'justify-end' : 'justify-start'}`} style={{ background: deliveryRequired ? '#0B2438' : '#e5e7eb' }}>
                    <span className="w-5 h-5 bg-white rounded-full shadow-sm" />
                  </span>
                </button>
                {deliveryRequired && (
                  <div className="mt-2">
                    <input ref={deliveryRef} value={deliveryLocation} onChange={(e: any) => setDeliveryLocation(e.target.value)} aria-invalid={showMissing && !deliveryLocation.trim()}
                      aria-label={L('Delivery location', 'ڈیلیوری کا مقام', 'موقع التوصيل')}
                      className={`input-field ${showMissing && !deliveryLocation.trim() ? 'border-red-400 bg-red-50/40' : ''}`}
                      placeholder={L('Delivery location: district / site address *', 'ڈیلیوری کا مقام: محلہ / سائٹ کا پتہ *', 'موقع التوصيل: الحي / عنوان الموقع *')} />
                    {showMissing && !deliveryLocation.trim() && <p className="text-xs font-bold text-red-600 mt-1">{L('This field is required', 'یہ خانہ ضروری ہے', 'هذا الحقل مطلوب')}</p>}
                    <p className="text-xs text-gray-600 mt-1">
                      {L('Helps suppliers calculate shipping cost.', 'اس سے سپلائرز کو ترسیل کا خرچ نکالنے میں مدد ملتی ہے۔', 'يساعد الموردين على حساب تكلفة الشحن.')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Target supplier types + verified-only (applies to all items) */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="text-sm font-bold text-[#0B2438] mb-2">{L('Who should price it?', 'کون قیمت دے؟', 'من تريد أن يسعّر لك؟')}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {([['all', L('All suppliers', 'سب سپلائرز', 'كل الموردين'), L('The most offers', 'زیادہ پیشکشیں', 'أكثر عروض')], ...TIERS.map(k => [k, tierLabel(k, locale, false), tierHint(k, locale)])] as [string, string, string][]).map(([k, label, hint]) => {
                  const on = k === 'all' ? targetTiers.length === 0 : (targetTiers.length === 1 && normTier(targetTiers[0]) === k)
                  return (
                    <button key={k} type="button" onClick={() => setTargetTiers(k === 'all' ? [] : [k])} aria-pressed={on}
                      className={`p-2.5 rounded-xl border-2 text-start transition-colors ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 bg-white hover:border-[#D4A543]'}`}>
                      <div className="text-[13px] font-bold text-[#0B2438] leading-snug">{on && <Glyph e="✓" />} {label}</div>
                      <div className="text-xs text-gray-600 mt-0.5 leading-snug line-clamp-2">{hint}</div>
                    </button>
                  )
                })}
              </div>
              <button type="button" role="switch" aria-checked={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}
                className="w-full min-h-11 flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2.5 text-start">
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{L('Verified suppliers only', 'صرف تصدیق شدہ سپلائرز', 'الموردون الموثّقون فقط')}</span>
                  <span className="block text-xs text-gray-500">{L('Receive offers only from suppliers whose commercial registration was verified', 'صرف ان سپلائرز سے پیشکشیں جن کی تجارتی رجسٹریشن کی تصدیق ہو چکی ہے', 'استقبل العروض من الموردين الذين تحقّقنا من سجلهم التجاري فقط')}</span>
                </span>
                <span aria-hidden className={`w-12 h-7 rounded-full flex items-center px-1 shrink-0 transition-all ${verifiedOnly ? 'justify-end' : 'justify-start'}`} style={{ background: verifiedOnly ? '#0B2438' : '#e5e7eb' }}>
                  <span className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </span>
              </button>
              <button type="button" role="switch" aria-checked={nearbyOnly} onClick={() => setNearbyOnly(!nearbyOnly)}
                className="w-full min-h-11 flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mt-2 text-start">
                <span>
                  <span className="block text-sm font-semibold text-gray-800"><Glyph e="📍" /> {L('Nearby only (same region)', 'صرف قریب (اسی علاقہ)', 'القريبون فقط (المنطقة نفسها)')}</span>
                  <span className="block text-xs text-gray-500">{L('Only suppliers in your region: closer and cheaper shipping', 'صرف آپ کے علاقے کے سپلائرز: قریب اور سستی ترسیل', 'موردو منطقتك فقط، والشحن أقرب وأرخص')}</span>
                </span>
                <span aria-hidden className={`w-12 h-7 rounded-full flex items-center px-1 shrink-0 transition-all ${nearbyOnly ? 'justify-end' : 'justify-start'}`} style={{ background: nearbyOnly ? '#0B2438' : '#e5e7eb' }}>
                  <span className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </span>
              </button>
            </div>

            <div className="mb-4 pb-4 border-b border-gray-100 space-y-3">
              <div>
                <div className="text-sm font-bold text-[#0B2438] mb-2">{L('Offers deadline: when do you need the prices?', 'پیشکشوں کی مہلت: قیمتیں کب چاہئیں؟', 'مهلة العروض: متى تحتاج الأسعار؟')}</div>
                <div className="flex flex-wrap gap-2">
                  {([[24, L('Tomorrow', 'کل', 'غداً')], [48, L('2 days', '2 دن', 'يومان')], [72, L('3 days', '3 دن', '3 أيام')], [168, L('A week', 'ایک ہفتہ', 'أسبوع')]] as [number, string][]).map(([h, lab]) => (
                    <button key={h} type="button" onClick={() => setHours(h)} aria-pressed={hours === h}
                      className={`min-h-11 px-4 rounded-full border text-sm font-bold ${hours === h ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-700 border-gray-200'}`}>{lab}</button>
                  ))}
                </div>
              </div>
              {/* «متى تحتاج المواد في الموقع؟» (round-5 UX-090): suppliers see it on every item, as on the request page */}
              <div>
                <div id="boq-need-q" className="text-sm font-bold text-[#0B2438] mb-2">{L('When do you need the materials on site?', 'سائٹ پر سامان کب چاہیے؟', 'متى تحتاج المواد في الموقع؟')}</div>
                <div role="radiogroup" aria-labelledby="boq-need-q" className="flex flex-wrap gap-2">
                  {([[1, L('Within a day', 'ایک دن میں', 'خلال يوم')], [3, L('Within 3 days', '3 دن میں', 'خلال 3 أيام')], [7, L('Within a week', 'ایک ہفتے میں', 'خلال أسبوع')], [null, L('Not urgent', 'جلدی نہیں', 'غير مستعجل')]] as [number | null, string][]).map(([d, lab]) => (
                    <button key={String(d)} type="button" role="radio" aria-checked={needDays === d} onClick={() => setNeedDays(d)}
                      className={`min-h-11 px-4 rounded-full border text-sm font-bold ${needDays === d ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-700 border-gray-200'}`}>{lab}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">{L('Suppliers see it on every item, so they quote only what they can deliver in time.', 'سپلائرز اسے ہر آئٹم پر دیکھتے ہیں تاکہ وہی قیمت دیں جو وقت پر پہنچا سکیں۔', 'يظهر للموردين على كل بند ليسعّروا ما يستطيعون تسليمه في الوقت المطلوب.')}</p>
                {needDays != null && hours >= needDays * 24 && (() => {
                  const fit = needDays === 1 ? 6 : needDays === 3 ? 24 : 48
                  const needT = needDays === 1 ? L('a day', 'ایک دن', 'يوم') : needDays === 7 ? L('a week', 'ایک ہفتہ', 'أسبوع') : L(`${needDays} days`, `${needDays} دن`, `${needDays} أيام`)
                  return (
                    <div className="mt-2 rounded-xl border-2 border-[#D4A543] bg-[#D4A543]/10 px-3 py-2 space-y-1.5" role="status">
                      <p className="text-[13px] font-bold text-[#0B2438]"><Glyph e="⚠" /> {L(`You need the materials within ${needT}, and the offers deadline is longer than that, so the offers will not reach you in time.`, `آپ کو سامان ${needT} میں چاہیے، اور آفرز کی مہلت اس سے لمبی ہے؛ اس لیے آفرز وقت پر نہیں پہنچیں گی۔`, `تحتاج المواد خلال ${needT}، ومهلة العروض أطول من ذلك؛ فلن تصلك العروض في الوقت المناسب.`)}</p>
                      <button type="button" onClick={() => setHours(fit)} className="min-h-11 px-3 rounded-xl text-[13px] font-bold border border-[#0B2438]/40 bg-white text-[#0B2438]">
                        {L(`Make the deadline ${fit} hours`, `مہلت ${fit} گھنٹے کریں`, `اجعل المهلة ${fit === 6 ? '6 ساعات' : fit === 24 ? '24 ساعة' : '48 ساعة'}`)}
                      </button>
                    </div>
                  )
                })()}
              </div>
              <p className="flex items-start gap-2 text-sm text-gray-700">
                <Glyph e="🔒" /> {L('Your name and contact details are hidden from suppliers until you choose an offer.', 'آپ کا نام اور رابطے کی تفصیل آفر منتخب کرنے تک سپلائرز سے چھپی رہتی ہے۔', 'اسمك وبيانات تواصلك مخفية عن الموردين حتى تختار عرضاً.')}
              </p>
              <label className="flex items-center gap-2 min-h-11 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={vatRequired} onChange={(e: any) => setVatRequired(e.target.checked)} aria-describedby={!vatRequired ? 'boq-vat-warn' : undefined} className="w-5 h-5 accent-[#0B2438]" />
                {L('I need a VAT tax invoice', 'مجھے VAT ٹیکس انوائس چاہیے', 'أحتاج فاتورة ضريبية')}
              </label>
              {/* round-7 UX-018: the same warning as the request page when the tax invoice is turned off (owner 2026-11-25) */}
              {!vatRequired && (
                <p id="boq-vat-warn" role="status" className="-mt-1 rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-3 py-2 text-[13px] font-semibold text-[#6C531F] leading-relaxed">
                  <Glyph e="⚠" /> {L('You may receive offers from suppliers without a VAT number, who do not issue a tax invoice.', 'آپ کو ایسے سپلائرز کی آفرز بھی مل سکتی ہیں جن کے پاس VAT نمبر نہیں، اس لیے وہ ٹیکس انوائس جاری نہیں کرتے۔', 'قد تصلك عروض من موردين ليس لديهم رقم ضريبي، فلا يُصدرون فاتورة ضريبية.')}
                </p>
              )}
              <p className="text-xs text-gray-600">{L('Every price you receive includes VAT where the supplier charges it; a supplier not registered for VAT shows a final price.', 'آپ کو ملنے والی ہر قیمت میں VAT شامل ہوتا ہے جہاں سپلائر اسے لیتا ہے؛ VAT میں غیر رجسٹرڈ سپلائر حتمی قیمت دکھاتا ہے۔', 'كل سعر يصلك شامل ضريبة القيمة المضافة حين يفرضها المورد، والمورد غير المسجّل في الضريبة يعرض سعراً نهائياً.')}</p>
            </div>

            {/* the ONLY free text suppliers read (UX-002): visible, optional, never pre-filled */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <label htmlFor="boq-notes" className="block text-sm font-bold text-[#0B2438] mb-1">{L('Notes for suppliers (optional)', 'سپلائرز کے لیے نوٹس (اختیاری)', 'ملاحظات للموردين (اختياري)')}</label>
              <textarea id="boq-notes" ref={notesRef} value={supplierNotes} onChange={(e: any) => setSupplierNotes(e.target.value.slice(0, 1000))} rows={3} dir="auto"
                className="input-field text-sm" placeholder={L('e.g. delivery in two batches, unloading by crane, preferred delivery hours…', 'مثلاً: دو کھیپوں میں ڈیلیوری، کرین سے اتارنا، ترجیحی اوقات…', 'مثال: التوريد على دفعتين، التنزيل بالرافعة، أوقات التوصيل المفضّلة…')} />
              <p className="text-xs text-gray-500 mt-1"><Glyph e="👁" /> {L('Suppliers read these notes. Do not write the list name or your contact details here.', 'سپلائرز یہ نوٹس پڑھتے ہیں۔ یہاں فہرست کا نام یا اپنے رابطے کی تفصیل نہ لکھیں۔', 'يقرأ الموردون هذه الملاحظات، فلا تكتب فيها اسم القائمة ولا بيانات تواصلك.')}</p>
            </div>

            <div className="mb-3">
              <h3 className="font-bold" style={{ color: '#0B2438' }}>
                {L('Ready to send?', 'بھیجنے کے لیے تیار؟', 'جاهز للإرسال؟')}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {sendCount
                  ? L(`${sendCount} materials in one request to the specialist suppliers`, `${sendCount} مواد ایک درخواست میں متعلقہ سپلائرز کو`, `${arMaterials(sendCount)} في طلب واحد للموردين المختصين`)
                  : L('Choose the items\' specialty to send them.', 'بھیجنے کے لیے آئٹمز کا شعبہ منتخب کریں۔', 'اختر تخصص البنود لإرسالها.')}
                {unclassifiedCount > 0 && L(` · ${unclassifiedCount} without a specialty stay saved in your draft`, ` · ${unclassifiedCount} بغیر شعبہ آپ کے مسودے میں محفوظ رہیں گے`, ` · ${arItems(unclassifiedCount)} بلا تخصص تبقى محفوظة في مسودتك`)}
                {unselectedCount > 0 && L(` · ${unselectedCount} unselected stay saved in your draft`, ` · ${unselectedCount} غیر منتخب آپ کے مسودے میں محفوظ رہیں گے`, ` · ${arItems(unselectedCount)} غير محدَّدة تبقى محفوظة في مسودتك`)}
              </p>
              {/* «سيصل طلبك إلى نحو N موردين» (capped at what routing really notifies) */}
              {reach && sendCount > 0 && (
                <div className="mt-2 space-y-1">
                  {reach.reached > 0 && (
                    <p className="text-sm font-bold text-[#0B2438]"><Glyph e="👥" /> {L(`Your request will reach about ${reach.reached} suppliers.`, `آپ کی درخواست تقریباً ${reach.reached} سپلائرز تک پہنچے گی۔`, `سيصل طلبك إلى نحو ${arCount(reach.reached, 'مورد واحد', 'موردَين', 'موردين', 'مورداً')}.`)}</p>
                  )}
                  {reach.items.filter(x => Number(x.suppliers) === 0).slice(0, 4).map(x => (
                    <p key={x.name} className="text-xs text-[#8F6820]">{L(`No supplier for «${getProductLabel(x.name, locale)}» has joined yet. It is sent anyway, and we notify you as soon as one joins.`, `«${getProductLabel(x.name, locale)}» کا کوئی سپلائر ابھی شامل نہیں ہوا۔ یہ پھر بھی بھیجا جائے گا اور کسی کے شامل ہوتے ہی ہم آپ کو بتائیں گے۔`, `لم ينضم بعد مورد لـ«${getProductLabel(x.name, locale)}». سيُرسل البند مع ذلك، وسنُبلغك فور انضمام أحدهم.`)}</p>
                  ))}
                </div>
              )}
            </div>


            {/* round-7 UX-142: one summary line of the request options, right above the send button */}
            {sendCount > 0 && (() => {
              const deadline = new Date(Date.now() + hours * 3600 * 1000).toLocaleString(dateLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })
              const need = needDays === 1 ? L('within a day', 'ایک دن میں', 'خلال يوم') : needDays === 3 ? L('within 3 days', '3 دن میں', 'خلال 3 أيام') : needDays === 7 ? L('within a week', 'ایک ہفتے میں', 'خلال أسبوع') : L('not urgent', 'جلدی نہیں', 'غير مستعجل')
              const parts = [
                `${L('Pricing deadline', 'قیمت کی آخری تاریخ', 'آخر موعد للتسعير')}: ${deadline}`,
                `${deliveryRequired ? L('Delivery', 'ڈیلیوری', 'التسليم') : L('Pickup', 'وصولی', 'الاستلام')}: ${need}`,
                ...(vatRequired ? [L('Tax invoice', 'ٹیکس انوائس', 'فاتورة ضريبية')] : []),
                ...(verifiedOnly ? [L('Verified suppliers only', 'صرف تصدیق شدہ سپلائرز', 'الموثّقون فقط')] : []),
                ...(targetTiers.length === 1 ? [tierLabel(targetTiers[0] as any, locale, false)] : []),
                ...(nearbyOnly ? [L('Nearby only', 'صرف قریب', 'القريبون فقط')] : []),
              ]
              return <p className="mb-3 rounded-xl bg-[#0B2438]/[.04] border border-[#0B2438]/10 px-3 py-2 text-[13px] text-[#0B2438] leading-relaxed" role="status">{parts.join(' · ')}</p>
            })()}
            {/* what is still missing, each name takes you to its field (the button itself is never silently disabled) */}
            {missingFields.length > 0 && (
              <div className={`mb-3 rounded-xl border p-3 text-[13px] font-bold ${showMissing ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#D4A543]/40 bg-[#D4A543]/[.06] text-[#0B2438]'}`}>
                {L('Before sending, complete: ', 'بھیجنے سے پہلے مکمل کریں: ', 'قبل الإرسال أكمل: ')}
                {missingFields.map((f, k) => (
                  <span key={f.key}>
                    {k > 0 && ' · '}
                    <button type="button" onClick={() => goToField(f.ref)} className="underline underline-offset-2 min-h-11">{f.label}</button>
                  </span>
                ))}
              </div>
            )}

            <button type="button" onClick={handleSubmit}
              disabled={loading}
              className="w-full min-h-12 py-4 rounded-xl font-bold text-[#071827] text-base disabled:opacity-40 transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {L('Sending to suppliers...', 'سپلائرز کو بھیجا جا رہا ہے...', 'جارٍ الإرسال للموردين...')}
                </span>
              ) : sendCount ? L(`Send ${sendCount} materials to suppliers →`, `${sendCount} مواد سپلائرز کو بھیجیں ←`, `إرسال ${arMaterials(sendCount)} للموردين المختصين ←`)
                : L('Choose the items\' specialty first', 'پہلے آئٹمز کا شعبہ منتخب کریں', 'اختر تخصص البنود أولاً')}
            </button>
          </div>
        )}
        </>)}
      </div>
      <datalist id="boq-catalog">{catalogNames.map(n => <option key={n} value={n} />)}</datalist>
      {showCatalog && (
        <CatalogPicker locale={locale} onClose={() => setShowCatalog(false)}
          picked={items.map((it: any) => ({ key: it.id, name: it.product_name }))}
          onRemove={(key: string) => removeItem(key)}
          onPick={addFromCatalog} />
      )}
    </AppShell>
  )
}
