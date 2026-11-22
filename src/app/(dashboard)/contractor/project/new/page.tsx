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
import { SPEC_UNSURE, specUnsureLabel, SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, UNIT_OPTIONS, REGIONS, CITIES_BY_REGION, detectSubCategory, getSubCategoryLabel, getProductLabel, getUnitLabel, getRegionLabel, SECTOR_PRODUCTS, unitChoicesFor, getDefaultUnit, specsRequired, missingSpecs, getProductSpecs, getOptionLabel, brandApplies, withBrand, type Sector } from '@/types'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import LineSpecialty, { choiceDone } from '@/components/shared/LineSpecialty'
import CatalogPicker from '@/components/shared/CatalogPicker'
import Glyph from '@/components/shared/Glyph'
import { arCount, arItems, arMaterials } from '@/lib/text'
import CatIcon from '@/components/shared/CatIcon'
import { toLatinDigits } from '@/lib/phone'
import { useEnsureVerified } from '@/components/shared/VerifyGate'
import { askConfirm, notify } from '@/lib/askConfirm'

// «١٢٫٥» / «۱۲» → «12.5» / «12» (Arabic and Urdu keyboards type these digits and decimal marks)
const toQty = (v: string) => toLatinDigits(v).replace(/٫/g, '.').replace(/[^0-9.]/g, '')

// تجميع بنود الـ BOQ حسب المجموعة (مثل قوائم التسعير) — يحتفظ بالفهرس الأصلي لكل بند
function getGroupedItems(items: any[], locale: string) {
  const groups: Record<string, any> = {}
  items.forEach((item: any, i: number) => {
    const sub = item.sub_category
    const gkey = (sub && (SUB_CATEGORIES as any)[item.sector]?.[sub]?.group) || '_unclassified'
    if (!groups[gkey]) {
      const gl = gkey === '_unclassified' ? null : (GROUP_LABELS as any)[gkey]
      groups[gkey] = {
        key: gkey,
        label: gkey === '_unclassified' ? (locale === 'en' ? 'Unclassified' : locale === 'ur' ? 'غیر درجہ بند' : 'غير مصنّف') : (gl ? (gl[locale] || gl.ar) : gkey),
        defaultOpen: gkey === '_unclassified',
        entries: [],
      }
    }
    groups[gkey].entries.push({ item, i })
  })
  // open a group that still needs something: a specialty or a quantity (owner 2026-10-24)
  for (const g of Object.values(groups)) if (g.entries.some((e: any) => !(parseFloat(e.item.quantity) > 0))) g.defaultOpen = true
  return Object.keys(groups).sort((a, b) => (a === '_unclassified' ? -1 : b === '_unclassified' ? 1 : 0)).map(k => groups[k])
}

// «الطول: 2.0م، العرض: 20سم» from the chosen spec fields (same format as the request page)
function specTextOf(name: string, specs?: Record<string, string>) {
  if (!specs) return ''
  return getProductSpecs(name).filter(f => f.key !== 'unit' && (specs[f.key] || '').trim()).map(f => `${f.ar}: ${specs[f.key].trim()}`).join('، ')
}

// The product's spec fields as selects (+ «أخرى…» to write a value) — as on the request page.
// Required ones (materials priced by size/grade) are marked and highlighted until filled.
function ItemSpecFields({ name, sector, specs, onChange, locale }: { name: string; sector: string; specs?: Record<string, string>; onChange: (v: Record<string, string>) => void; locale: string }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const fields = getProductSpecs(name).filter(f => f.key !== 'unit')
  if (!fields.length) return null
  const req = specsRequired(name, sector as Sector)
  return (
    <div className="rounded-xl bg-gray-50 p-2.5">
      <div className="text-xs font-bold text-[#0B2438] mb-1.5">{L('Specifications', 'تفصیلات', 'المواصفات')}{req ? L(' (required)', ' (ضروری)', ' (مطلوبة)') : L(' (optional)', ' (اختیاری)', ' (اختيارية)')}</div>
      <div className="grid sm:grid-cols-2 gap-2">
        {fields.map(f => {
          const v = specs?.[f.key] || ''
          const custom = !!v && !f.options.includes(v) && v !== SPEC_UNSURE
          const setV = (val: string) => onChange({ ...(specs || {}), [f.key]: val })
          return (
            <label key={f.key} className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-0.5">{locale === 'ar' ? f.ar : f.en}{req ? ' *' : ''}</span>
              <select value={custom ? '__other' : v} onChange={(e: any) => setV(e.target.value === '__other' ? ' ' : e.target.value)}
                className={`input-field text-sm ${req && !v.trim() ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}>
                <option value="">{req ? L('Choose', 'منتخب کریں', 'اختر') : L('Any', 'کوئی بھی', 'أي')}</option>
                {f.options.map(o => <option key={o} value={o}>{getOptionLabel(o, locale)}</option>)}
                <option value={SPEC_UNSURE}>{specUnsureLabel(locale)}</option>
                <option value="__other">{L('Other…', 'دیگر…', 'أخرى…')}</option>
              </select>
              {custom && <input value={v.trim()} onChange={(e: any) => setV(e.target.value || ' ')} className="input-field text-sm mt-1" placeholder={L('Write it', 'لکھیں', 'اكتبها')} />}
            </label>
          )
        })}
      </div>
    </div>
  )
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

// sector names in the three languages (SECTOR_LABELS is Arabic only)
const SECTOR_L: Record<string, [string, string]> = {
  civil: ['Civil', 'سول'], architectural: ['Architectural', 'آرکیٹیکچرل'], electrical: ['Electrical', 'الیکٹریکل'],
  mechanical: ['Mechanical', 'مکینیکل'], equipment: ['Machinery and equipment', 'مشینری اور آلات'], supply_store: ['Supply store', 'سپلائی اسٹور'],
}
const sectorName = (s: string, locale: string) => (locale === 'ar' ? (SECTOR_LABELS as any)[s] || s : (SECTOR_L[s]?.[locale === 'ur' ? 1 : 0] || s))
const CATALOG_SET = new Set<string>(Object.values(SECTOR_PRODUCTS).flat())

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
  const [projectNotes, setProjectNotes] = useState('')
  const [deliveryRequired, setDeliveryRequired] = useState(true)
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [geoMsg, setGeoMsg] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const toggleGroup = (k: string) => setOpenGroups(o => ({ ...o, [k]: !(o[k] ?? (k === '_unclassified')) }))
  // fields of step 3, so a click on «إرسال» can take the buyer to the first missing one
  const titleRef = useRef<HTMLInputElement>(null)
  const regionRef = useRef<HTMLSelectElement>(null)
  const deliveryRef = useRef<HTMLInputElement>(null)
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
            setGeoMsg(`${L('Location set ✓', 'مقام طے ہو گیا ✓', 'تم تحديد موقعك ✓')}${cityName ? ` — ${cityName}` : ''}`)
            return
          }
        } catch {}
        setDeliveryRequired(true)
        setDeliveryLocation(link)
        setGeoMsg(L('Location pin saved ✓', 'مقام محفوظ ہو گیا ✓', 'تم حفظ موقعك ✓'))
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
  const specsRef = useRef<any>(null)

  // يقرأ المواصفات + البنود ويملأ تفاصيل كل بند من المستند
  async function matchSpecs() {
    if (!specsFile) { setSpecMsg(L('Upload the specification file first', 'پہلے اسپیسیفکیشن فائل اپ لوڈ کریں', 'ارفع ملف المواصفات أولاً')); return }
    const targets = items.filter((i: any) => i.product_name)
    if (targets.length === 0) { setSpecMsg(L('Add items (or upload a BOQ) first', 'پہلے آئٹمز شامل کریں (یا BOQ اپ لوڈ کریں)', 'أضف بنوداً (أو ارفع جدول الكميات) أولاً')); return }
    setMatchingSpecs(true); setSpecMsg('')
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
      const parts = [L(`✓ Matched ${data.matched} of ${data.total} items`, `✓ ${data.total} میں سے ${data.matched} آئٹمز ملائے گئے`, `✓ طوبق ${data.matched} من أصل ${arItems(data.total)}`)]
      if (filled) parts.push(L(`${filled} filled`, `${filled} بھرے گئے`, `عُبّئ ${filled}`))
      if (diff) parts.push(L(`${diff} differ from the BOQ — review them`, `${diff} BOQ سے مختلف ہیں — جائزہ لیں`, `${diff} تختلف عن جدول الكميات — راجعها`))
      if (data.with_conflicts) parts.push(L(`${data.with_conflicts} contradict the specification`, `${data.with_conflicts} اسپیسیفکیشن سے متصادم`, `${data.with_conflicts} تتعارض مع المواصفات`))
      if (data.truncated) parts.push(L('The specifications are large and were cut; split the file', 'اسپیسیفکیشن بڑی تھیں اور کاٹ دی گئیں؛ فائل تقسیم کریں', 'المواصفات كبيرة واقتُطع جزء منها، قسّم الملف'))
      setSpecMsg(parts.join(' · '))
    } catch {
      setSpecMsg(L('Connection problem — try again', 'کنکشن کا مسئلہ — دوبارہ کوشش کریں', 'تعذّر الاتصال — حاول مرة أخرى'))
    } finally { setMatchingSpecs(false) }
  }

  // Items
  const [items, setItems] = useState<any[]>([])
  const [editingIndex, setEditingIndex] = useState<any>(null)

  // استهداف نوع الموردين + الموثّقون فقط (يطبَّق على كل بنود المشروع)
  const [targetTiers, setTargetTiers] = useState<string[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  // same request options as the request page (owner 2026-10-27: the project lacked them)
  const [hours, setHours] = useState(72)
  // the buyer's identity is always hidden from suppliers until an offer is chosen (no option: UX-077)
  const [vatRequired, setVatRequired] = useState(true)
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
      // open to everyone during the trial: decided before the profile read, so a failed read never shows a gate
      if (PROJECTS_OPEN_TO_ALL) setAllowed(true)
      else supabase.from('profiles').select('role, verification_status, cr_verified_at, subscription_plan, subscription_expires_at').eq('id', data.session.user.id).single()
        .then(({ data: p }: any) => setAllowed(canUseProjects(p)))
      // the region and city of the profile fill step 3 when the buyer has not chosen them
      supabase.from('profiles').select('region, city').eq('id', data.session.user.id).maybeSingle()
        .then(({ data: p }: any) => {
          if (!p?.region || !REGIONS.includes(p.region)) return
          setRegion(r => {
            if (r) return r
            if (p.city && (CITIES_BY_REGION[p.region] || []).some((c: any) => c.ar === p.city)) setCity(c => c || p.city)
            return p.region
          })
        })
    })
  }, [])

  const DRAFT_KEY = 'tsk_project_draft'
  const [restored, setRestored] = useState(false)
  const [restoredCount, setRestoredCount] = useState(0) // > 0: «استعدنا مسودتك» banner
  // set when the draft came from «مسار العطاء»: the tender is marked sent and linked to this project
  const [tenderId, setTenderId] = useState<string | null>(null)
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (d && Array.isArray(d.items) && d.items.length) {
        setTitle(d.title || ''); setRegion(d.region || ''); setCity(d.city || ''); setProjectNotes(d.projectNotes || '')
        setDeliveryRequired(d.deliveryRequired !== false); setDeliveryLocation(d.deliveryLocation || '')
        setItems(d.items); if (d.hours) setHours(d.hours)
        setRestoredCount(d.items.length)
        if (typeof d.vatRequired === 'boolean') setVatRequired(d.vatRequired)
        if (Array.isArray(d.targetTiers)) setTargetTiers(d.targetTiers)
        if (typeof d.verifiedOnly === 'boolean') setVerifiedOnly(d.verifiedOnly)
        if (typeof d.tender_id === 'string') setTenderId(d.tender_id)
        setStep('items')
      }
    } catch {}
    setRestored(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // saved a moment after the last change (not on every keystroke of a 200-line table)
  const sentRef = useRef(false) // after a send, the page keeps only what it wrote itself
  useEffect(() => {
    if (!restored || sentRef.current) return
    const t = setTimeout(() => {
      try {
        if (!items.length) { localStorage.removeItem(DRAFT_KEY); return }
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, region, city, projectNotes, deliveryRequired, deliveryLocation, hours, vatRequired, targetTiers, verifiedOnly, tender_id: tenderId,
          items: items.map((it: any) => ({ ...it, specFile: null })) }))
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [restored, title, region, city, projectNotes, deliveryRequired, deliveryLocation, items, hours, vatRequired, targetTiers, verifiedOnly, tenderId])

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
    setItems([]); setBoqFile(null); setTenderId(null); setRestoredCount(0); setEditingIndex(null); setDraft(null)
    setTitle(''); setProjectNotes(''); setDeliveryLocation('')
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  // «إزالة الملف»: removes the items read from it (asks first) and lets the same file be chosen again
  async function removeBoqFile() {
    const n = items.length
    if (n && !(await askConfirm(L(`All ${n} extracted items and all your edits to them will be deleted. This cannot be undone. Remove the file?`, `تمام ${n} نکالے گئے آئٹمز اور ان پر آپ کی ترامیم حذف ہو جائیں گی۔ یہ واپس نہیں ہو سکتا۔ فائل ہٹائیں؟`, `ستُحذف كل البنود المستخرجة (${arItems(n)}) وكل تعديلاتك عليها، ولا يمكن التراجع. هل تريد إزالة الملف؟`), { danger: true, okLabel: L('Remove', 'ہٹائیں', 'إزالة'), cancelLabel: L('Keep', 'رکھیں', 'إبقاء') }))) return
    setBoqFile(null); setItems([]); setAiUsed(false); setParseError(''); setEditingIndex(null); setRestoredCount(0)
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
    if (parsing) return
    // a new file replaces the current list: ask first (the edits would be lost)
    if (items.length && !(await askConfirm(L(`The items of the new file will replace your current list (${items.length} items) and your edits to it. Continue?`, `نئی فائل کے آئٹمز آپ کی موجودہ فہرست (${items.length} آئٹمز) اور اس کی ترامیم کی جگہ لیں گے۔ جاری رکھیں؟`, `ستحلّ بنود الملف الجديد محل قائمتك الحالية (${arItems(items.length)}) وتعديلاتك عليها. هل تتابع؟`), { danger: true, okLabel: L('Replace', 'بدلیں', 'استبدال'), cancelLabel: L('Keep my list', 'میری فہرست رکھیں', 'إبقاء قائمتي') }))) return
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
        setItems(data.items.map((item: any, i: any) => {
          // التخصص يأتي مُصنّفاً من الخادم (من القوائم الرسمية). نتأكد أنه مفتاح صحيح وإلا = غير مصنّف.
          const sub = (item.sub_category && (SUB_CATEGORIES as any)[item.sector]?.[item.sub_category]) ? item.sub_category : null
          // غير مصنّف لو بلا تخصص، أو لو الذكاء أبلغ ثقة منخفضة (يبقى الاقتراح ظاهراً في القائمة ليؤكّده المقاول)
          // specs = spec fields recognised in the BOQ wording; needs_review = a quantity/unit/total that did not add up
          return { ...item, specs: item.specs || {}, id: `item-${i}`, selected: true, done: parseFloat(item.quantity) > 0 && !item.needs_review && missingSpecs(item.product_name, item.sector, item.specs || {}, item.specification || '').length === 0, sub_category: sub, needs_classification: !sub || !!item.needs_classification || !!item.low_confidence }
        }))
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
  function addItem() { setEditingIndex(null); setDraft({ product_name: '', quantity: '', unit: '', specification: '', spec: undefined }) }
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
  const unclassifiedBySector: Record<string, number> = {}
  for (const it of unclassifiedItems) unclassifiedBySector[it.sector] = (unclassifiedBySector[it.sector] || 0) + 1
  const unclassifiedSectors = Object.keys(unclassifiedBySector)
  function bulkApplyCategory() {
    if (!bulkSector || !bulkSub) return
    setItems(prev => prev.map((it: any) =>
      (it.selected && it.product_name && it.needs_classification && it.sector === bulkSector)
        ? { ...it, sub_category: bulkSub, needs_classification: false } : it))
    setBulkSub('')
  }

  function removeItem(id: any) {
    setItems(prev => prev.filter((item: any) => item.id !== id))
  }

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
        <input list="boq-catalog" autoFocus value={draft.product_name}
          onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, product_name: v, spec: undefined, unit: '', specs: {} })) }}
          className="input-field" placeholder={L('Material name: type and pick from the list, or write it your way', 'مواد کا نام', 'اسم المادة: اكتب واختر من القائمة، أو اكتبها كما تريد')} />
        <button type="button" onClick={() => setShowCatalog(true)}
          className="mt-2 w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 text-sm font-bold text-[#8F6820] hover:bg-[#D4A543]/20">
          {L("Can't find it? Browse the materials guide by section", 'نہیں ملا؟ شعبوں سے فہرست دیکھیں', 'لم تجدها؟ تصفّح دليل المواد حسب الأقسام')}
        </button>
        {draftG?.catalog && (
          <p className="text-xs text-[#0B2438] font-bold mt-1.5">✓ {L('From the catalog', 'کیٹلاگ سے', 'من دليل المواد')}{draftG.sub ? ' · ' + getSubCategoryLabel(draftG.sector as any, draftG.sub, locale) : ''}</p>
        )}
      </div>
      {draftName.length >= 2 && !draftG?.catalog && (
        <LineSpecialty key={draftName} name={draftName} sector={draftG?.sector || 'civil'} value={draft.spec} locale={locale}
          onChange={(v: any) => setDraft((d: any) => ({ ...d, spec: v }))} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <input type="text" inputMode="decimal" value={draft.quantity}
          onChange={(e: any) => { const v = toQty(e.target.value); setDraft((d: any) => ({ ...d, quantity: v })) }}
          className="input-field" placeholder={L('Quantity', 'مقدار', 'الكمية')} />
        <select value={draftDefUnit}
          onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, unit: v })) }} className="input-field">
          {!draftDefUnit && <option value="">{L('Unit', 'یونٹ', 'الوحدة')}</option>}
          {draftUnits.map((u: any) => <option key={u} value={u}>{getUnitLabel(u, locale)}</option>)}
        </select>
      </div>
      {draftName && <ItemSpecFields name={draftName} sector={draftSector} specs={draft.specs} locale={locale} onChange={(v: any) => setDraft((d: any) => ({ ...d, specs: v }))} />}
      {draftName && brandApplies(draftName, draftSector) && (
        <input value={draft.brand || ''} onChange={(e: any) => { const v = e.target.value.slice(0, 80); setDraft((d: any) => ({ ...d, brand: v })) }} className="input-field"
          placeholder={L('Brand or product name (optional), e.g. Fosroc Renderoc', 'برانڈ یا پروڈکٹ کا نام (اختیاری)', 'الماركة أو اسم المنتج (اختياري)، مثل: فوسروك رندروك')} />
      )}
      <input value={draft.specification} onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, specification: v })) }}
        className={`input-field ${draftName && missingSpecs(draftName, draftSector, draft.specs, draft.specification).includes('*') ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
        placeholder={draftName && specsRequired(draftName, draftSector) && !getProductSpecs(draftName).some(f => f.key !== 'unit')
          ? L('Specification (required): size, length, grade…', 'تفصیل (ضروری)', 'المواصفة (مطلوبة): المقاس، الطول، الدرجة…')
          : L('Specification (optional): size, grade, brand…', 'تفصیل (اختیاری)', 'المواصفة (اختياري): المقاس، الدرجة، الماركة…')} />
      <button type="button" disabled={!draftName} onClick={commitDraft}
        className="w-full min-h-11 py-3 rounded-xl text-[#071827] font-bold disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
        {L('Add to the list', 'فہرست میں شامل کریں', 'أضف إلى القائمة')}
      </button>
    </div>
  )

  // what step 3 still needs before sending (shown above the button; each name takes you to its field)
  const missingFields: { key: string; label: string; ref: { current: HTMLElement | null } }[] = []
  if (!title.trim()) missingFields.push({ key: 'title', label: L('Project name', 'پراجیکٹ کا نام', 'اسم المشروع'), ref: titleRef })
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
    if (unclassifiedCount > 0) {
      const ok = await askConfirm(L(`${unclassifiedCount} item(s) have no specialty yet and will not be sent now (the specialty routes each item to the right supplier). They stay saved here so you can choose their specialty later.\n\nSend the ${classifiedItems.length} classified items?`,
        `${unclassifiedCount} آئٹمز کا شعبہ ابھی منتخب نہیں، وہ ابھی نہیں بھیجے جائیں گے۔ وہ یہاں محفوظ رہیں گے تاکہ بعد میں شعبہ منتخب کریں۔\n\n${classifiedItems.length} درجہ بند آئٹمز بھیجیں؟`,
        `${arItems(unclassifiedCount)} بلا تخصص بعد، فلن تُرسل الآن (التخصص هو ما يوصل البند إلى المورد المختص). تبقى البنود غير المصنّفة (${arItems(unclassifiedCount)}) محفوظة هنا لتختار تخصصها لاحقاً.\n\nإرسال البنود المصنّفة (${arItems(classifiedItems.length)})؟`),
        { okLabel: L('Send the classified items', 'درجہ بند آئٹمز بھیجیں', 'إرسال المصنّفة') })
      if (!ok) return
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
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(data.path)
          specUrl = publicUrl
        }
      }
      const projNotes = [projectNotes, specUrl ? `[مواصفات المشروع: ${specUrl}]` : ''].filter(Boolean).join('\n') || null

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
          sub_category: item.sub_category || detectSubCategory(item.product_name, item.sector) || null,
          specification: withBrand([st, (item.specification || '').trim()].filter(Boolean).join(' — '), item.brand),
          ...((item.brand || '').trim() ? { brand: String(item.brand).trim().slice(0, 80) } : {}),
          ...(item.with_install && isInstallable(item.sector, item.sub_category || detectSubCategory(item.product_name, item.sector)) ? { with_install: true } : {}),
          quantity: Number(item.quantity),
          unit: item.unit || 'عدد',
          supplier_tiers: null, in_stock: false, max_days: null, specsObj,
          spec_file_url: itemSpecUrl,
          spec_file_name: itemSpecUrl ? (item.specFile?.name || 'مواصفات مرفقة') : null,
          photo_url: itemSpecUrl && /\.(jpe?g|png|webp)$/i.test(item.specFile?.name || '') ? itemSpecUrl : null,
          custom: !!item.custom,
        })
      }

      // 2) the project, then its one request
      const { data: project, error: projErr } = await supabase.from('project_rfqs').insert({
        contractor_id: user.id, title, region, city: city || null,
        notes: projNotes, boq_url: boqUrl, status: 'sent',
      }).select().single()
      if (projErr) throw new Error(projErr.message)
      projectId = project.id

      const first = rfqItems[0]
      const { data: rfq, error: rfqErr } = await supabase.from('rfqs').insert({
        contractor_id: user.id, title,
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
          ? L('Daily request limit reached. Your list is saved here: try again later.', 'روزانہ درخواستوں کی حد پوری ہو گئی۔ آپ کی فہرست یہاں محفوظ ہے: بعد میں کوشش کریں۔', 'وصلت إلى الحد اليومي للطلبات. قائمتك محفوظة هنا، فحاول لاحقاً.')
          : L('Could not send the project. Your list is saved here: try again.', 'پراجیکٹ نہیں بھیجا جا سکا۔ آپ کی فہرست یہاں محفوظ ہے: دوبارہ کوشش کریں۔', 'تعذّر إرسال المشروع. قائمتك محفوظة هنا، فحاول مرة أخرى.'), { tone: 'error' })
        return
      }
      // the project keeps its list of items, all pointing at the one request
      await supabase.from('project_rfq_items').insert(rfqItems.map(it => ({
        project_rfq_id: project.id, rfq_id: rfq.id, product_name: it.product_name, sector: it.sector,
        quantity: it.quantity, unit: it.unit, specification: it.specification, status: 'sent',
      })))
      // from «تسعير مناقصة»: the tender is now sent and points at this project
      if (tenderId) { try { await supabase.from('tenders').update({ status: 'sent', project_rfq_id: project.id }).eq('id', tenderId) } catch {} }
      // the unclassified items stay in the draft, to classify and send later
      sentRef.current = true
      const left = items.filter((i: any) => i.product_name && i.needs_classification)
      try {
        if (left.length) localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, region, city, projectNotes: '', deliveryRequired, deliveryLocation, hours, vatRequired, targetTiers, verifiedOnly, tender_id: null, items: left.map((it: any) => ({ ...it, specFile: null })) }))
        else localStorage.removeItem(DRAFT_KEY)
      } catch {}
      window.location.href = `/contractor/rfq/${rfq.id}`
    } catch (err) {
      if (projectId) { try { await supabase.from('project_rfqs').delete().eq('id', projectId) } catch {} }
      await notify(friendlyError((err as any)?.message, L('Could not send the project. Your list is saved here: please try again.', 'پراجیکٹ نہیں بھیجا جا سکا۔ آپ کی فہرست یہاں محفوظ ہے: دوبارہ کوشش کریں۔', 'تعذّر إرسال المشروع. قائمتك محفوظة هنا، فحاول مرة أخرى.'), locale), { tone: 'error' })
    } finally { setLoading(false); submittingRef.current = false }
  }

  // the count on the button = what will really be sent (classified items only)
  const sendCount = items.filter((i: any) => i.selected && i.product_name && !i.needs_classification).length
  const readyCount = items.filter((i: any) => i.product_name && !i.needs_classification && parseFloat(i.quantity) > 0 && missingSpecs(i.product_name, i.sector, i.specs, i.specification || '', !!i.specFile).length === 0).length
  const noQtyCount = items.filter((i: any) => i.product_name && !(parseFloat(i.quantity) > 0)).length
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
            <input type="text" inputMode="decimal" value={item.quantity || ''} autoFocus={item.id === justAddedId}
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
        <ItemSpecFields name={item.product_name} sector={item.sector} specs={item.specs} locale={locale} onChange={(v: any) => updateItem(item.id, 'specs', v)} />
        {brandApplies(item.product_name, item.sector) && (
          <input value={item.brand || ''} onChange={(e: any) => updateItem(item.id, 'brand', e.target.value.slice(0, 80))} className="input-field text-sm"
            placeholder={L('Brand or product name (optional)', 'برانڈ یا پروڈکٹ کا نام (اختیاری)', 'الماركة أو اسم المنتج (اختياري)، مثل: فوسروك رندروك')} />
        )}
        <input value={item.specification || ''} onChange={(e: any) => updateItem(item.id, 'specification', e.target.value)}
          className={`input-field text-sm ${needWritten ? 'border-[#D4A543] bg-white' : ''}`}
          placeholder={needWritten ? L('Size and specs (required): length, width, thickness, grade…', 'سائز اور تفصیل (ضروری)', 'المقاس والمواصفات (مطلوب): الطول، العرض، السماكة، الدرجة…') : L('Notes for the supplier (optional)', 'سپلائر کے لیے نوٹ (اختیاری)', 'ملاحظات للمورد (اختياري)')} />
        <button type="button" disabled={!ok} onClick={() => updateItem(item.id, 'done', true)}
          className="w-full min-h-11 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#0B2438' }}>
          {!(parseFloat(item.quantity) > 0) ? L('Enter the quantity', 'مقدار لکھیں', 'أدخل الكمية') : miss.length ? L('Enter the specs', 'تفصیل لکھیں', 'أدخل المواصفات') : '✓ ' + L('Done', 'ہو گیا', 'تم')}
        </button>
      </div>
    )
  }

  const hasItems = items.length > 0

  return (
    <AppShell title={locale === 'en' ? 'Add a bill of quantities (BOQ)' : locale === 'ur' ? 'مقداروں کا جدول (BOQ) شامل کریں' : 'إضافة جدول الكميات (BOQ)'} nav={getNav('contractor', locale, '/contractor/project/new')} dir={dir}>
      <div className="max-w-5xl mx-auto">
        {allowed === false && (
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
        {allowed !== false && (<>
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>
            {locale === 'en' ? 'Add a bill of quantities (BOQ)' : locale === 'ur' ? 'مقداروں کا جدول (BOQ) شامل کریں' : 'إضافة جدول الكميات (BOQ)'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {L('Upload the bill of quantities or add the materials yourself: each material goes to the suppliers of its specialty.',
              'مقداروں کا جدول اپلوڈ کریں یا مواد خود شامل کریں: ہر مواد اپنے شعبے کے سپلائرز کو جاتا ہے۔',
              'ارفع جدول الكميات أو أضف المواد بنفسك، وتصل كل مادة إلى موردي تخصصها.')}
          </p>
          {tenderId ? (
            <p className="mt-2 text-xs font-bold text-[#0B2438]"><Glyph e="📑" /> {L('These items come from your tender review (approved items only).', 'یہ آئٹمز آپ کے ٹینڈر جائزے سے ہیں۔', 'هذه البنود من مراجعة المناقصة (المعتمدة فقط).')} <Link href={`/contractor/tender/${tenderId}`} className="underline">{L('Back to the tender', 'ٹینڈر پر واپس', 'العودة إلى المناقصة')}</Link></p>
          ) : (
            <Link href="/contractor/tender/new" className="mt-2 inline-block text-xs font-bold text-[#8F6820] hover:underline">
              <Glyph e="📑" /> {L('A full tender in Excel with drawings and specifications? Use «Tender pricing», which checks every number against its source', 'ڈرائنگز اور تفصیلات کے ساتھ Excel میں پورا ٹینڈر؟ «ٹینڈر قیمت» استعمال کریں', 'لديك مناقصة كاملة بصيغة Excel مع مخططات ومواصفات؟ استخدم «تسعير مناقصة» الذي يطابق كل رقم مع مصدره')}
            </Link>
          )}
        </div>

        {/* a draft was restored: say so, and offer a clean start */}
        {restoredCount > 0 && hasItems && !tenderId && (
          <div className="mb-5 rounded-2xl border border-[#D4A543]/50 bg-[#D4A543]/[.06] p-3 flex flex-wrap items-center justify-between gap-2" role="status">
            <span className="text-sm font-semibold text-[#0B2438]"><Glyph e="📝" /> {L(`We restored your draft (${items.length} items).`, `ہم نے آپ کا مسودہ بحال کیا (${items.length} آئٹمز)۔`, `استعدنا مسودتك (${arItems(items.length)}).`)}</span>
            <button type="button" onClick={startOver} className="min-h-11 px-4 rounded-xl border border-[#0B2438] text-sm font-bold text-[#0B2438] bg-white">{L('Start a new list', 'نئی فہرست شروع کریں', 'بدء قائمة جديدة')}</button>
          </div>
        )}

        {/* Step 1: add the materials */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-1" style={{ color: '#0B2438' }}>
            {L('1. Add the materials', '1. مواد شامل کریں', '1. أضف المواد')}
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {L('The bill of quantities (Excel, CSV, PDF or a photo) is read automatically to extract the materials and quantities.', 'مقداروں کا جدول (Excel، CSV، PDF یا تصویر) خودکار پڑھ کر مواد اور مقداریں نکالی جاتی ہیں۔', 'يُقرأ جدول الكميات (Excel أو CSV أو PDF أو صورة) تلقائياً لاستخراج المواد والكميات.')}
          </p>

          {/* drop zone: click or drop a file */}
          <div role="button" tabIndex={0}
            onClick={() => { if (!parsing && !boqFile) fileRef.current?.click() }}
            onKeyDown={(e: any) => { if ((e.key === 'Enter' || e.key === ' ') && !parsing && !boqFile) { e.preventDefault(); fileRef.current?.click() } }}
            onDragOver={(e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
            onDrop={(e: any) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer?.files?.[0]; if (f && !parsing) handleBOQUpload(f) }}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all mb-4 ${boqFile ? 'border-[#0B2438] bg-[#0B2438]/5' : 'cursor-pointer border-gray-200 hover:border-[#D4A543]/50'}`}>
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
                <div className="text-xs text-gray-500 mt-1">{L(`${items.length} items extracted`, `${items.length} آئٹمز نکالے گئے`, `تم استخراج ${arItems(items.length)}`)}</div>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click() }}
                    className="min-h-10 px-3 rounded-lg border border-[#0B2438] text-xs font-bold text-[#0B2438] bg-white">
                    {L('Upload another file', 'دوسری فائل اپ لوڈ کریں', 'رفع ملف آخر')}
                  </button>
                  <button type="button" onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); removeBoqFile() }}
                    className="min-h-10 px-3 rounded-lg border border-red-200 text-xs font-bold text-red-600 bg-white">
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
              </div>
            )}
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4" role="alert"><Glyph e="⚠" /> {parseError}</div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">{L('OR add manually', 'یا خود شامل کریں', 'أو أضف يدوياً')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {draft && !hasItems ? draftPanel : (
          <button type="button" onClick={addItem}
            className="w-full min-h-11 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#0B2438] hover:text-[#0B2438] transition-all">
            + {L('Add a material', 'مواد شامل کریں', 'أضف مادة')}
          </button>)}
        </div>

        {/* Step 2: review the items */}
        {hasItems && (
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2" style={{ color: '#0B2438' }}>
                {L(`2. Review the items (${items.length})`, `2. آئٹمز کا جائزہ لیں (${items.length})`, `2. راجع البنود (${items.length})`)}
                {aiUsed && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                    <Glyph e="✨" /> {L('Read automatically', 'خودکار پڑھا گیا', 'قُرئ تلقائياً')}
                  </span>
                )}
              </h2>
            </div>

            {/* what the file gave: ready / no quantity / no specialty */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              {boqFile && <div className="text-sm font-bold text-[#0B2438] mb-2">{L(`We read ${items.length} items from your file`, `ہم نے آپ کی فائل سے ${items.length} آئٹمز پڑھے`, `قرأنا ${arItems(items.length)} من ملفك`)}</div>}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-2.5 py-1.5 rounded-full bg-[#0F6E56]/10 text-[#0F6E56]">{L(`Ready: ${readyCount}`, `تیار: ${readyCount}`, `جاهز: ${readyCount}`)}</span>
                <span className={`px-2.5 py-1.5 rounded-full ${noQtyCount ? 'bg-[#D4A543]/15 text-[#8F6820]' : 'bg-gray-100 text-gray-500'}`}>{L(`No quantity: ${noQtyCount}`, `بغیر مقدار: ${noQtyCount}`, `بلا كمية: ${noQtyCount}`)}</span>
                <button type="button" disabled={!unclassifiedCount} onClick={() => focusItem(unclassifiedItems[0])}
                  className={`px-2.5 py-1.5 rounded-full ${unclassifiedCount ? 'bg-red-50 text-red-700 underline' : 'bg-gray-100 text-gray-500'}`}>{L(`No specialty: ${unclassifiedCount}`, `بغیر شعبہ: ${unclassifiedCount}`, `بلا تخصص: ${unclassifiedCount}`)}</button>
              </div>
            </div>

            {/* تنبيه البنود غير المصنّفة — لن تصل للمورد المتخصص بدقّة حتى تُصنّف */}
            {unclassifiedCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <span className="text-lg"><Glyph e="⚠" /></span>
                <div className="text-sm text-red-700 leading-relaxed">
                  <strong>{L(`${unclassifiedCount} item(s) have no specialty.`, `${unclassifiedCount} آئٹمز کا شعبہ منتخب نہیں۔`, `${arItems(unclassifiedCount)} بلا تخصص.`)}</strong>{' '}
                  {L('They are not sent until you choose their specialty (it routes each item to the right supplier); they stay saved here. Tap «Choose its specialty» on each one, or classify them together below.',
                    'شعبہ منتخب کیے بغیر یہ نہیں بھیجے جاتے؛ یہ یہاں محفوظ رہتے ہیں۔ ہر ایک پر «اس کا شعبہ منتخب کریں» دبائیں، یا نیچے اکٹھے درجہ بندی کریں۔',
                    'لا تُرسل حتى تختار تخصصها (فالتخصص هو ما يوصل البند إلى المورد المختص)، وتبقى محفوظة هنا. اضغط «اختر تخصصها» على كل بند، أو صنّفها معاً بالأسفل.')}
                </div>
              </div>
            )}

            {/* تصنيف جماعي: طبّق تصنيفاً على كل غير المصنّف في قطاع واحد بضغطة */}
            {unclassifiedCount > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="text-sm font-bold text-gray-700 mb-2"><Glyph e="⚡" /> {L('Classify the unclassified together', 'غیر درجہ بند آئٹمز کی اجتماعی درجہ بندی', 'تصنيف غير المصنّف معاً')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] items-end gap-2">
                  <label className="block">
                    <span className="block text-xs text-gray-600 mb-0.5">{L('Sector', 'شعبہ', 'القطاع')}</span>
                    <select value={bulkSector} onChange={e => { setBulkSector(e.target.value); setBulkSub('') }} className="input-field text-sm">
                      <option value="">{L('— pick —', '— منتخب کریں —', '— اختر —')}</option>
                      {unclassifiedSectors.map((s: string) => (
                        <option key={s} value={s}>{sectorName(s, locale)} ({unclassifiedBySector[s]})</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-600 mb-0.5">{L('Specialty', 'شعبہ', 'التخصص')}</span>
                    <select value={bulkSub} onChange={e => setBulkSub(e.target.value)} disabled={!bulkSector} className="input-field text-sm disabled:opacity-50">
                      <option value="">{L('Pick a specialty', 'شعبہ منتخب کریں', 'اختر التخصص')}</option>
                      {bulkSector && Object.keys((SUB_CATEGORIES as any)[bulkSector] || {}).map((k: string) => (
                        <option key={k} value={k}>{getSubCategoryLabel(bulkSector as any, k, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={bulkApplyCategory} disabled={!bulkSector || !bulkSub}
                    className="min-h-11 text-sm font-bold text-white px-4 rounded-xl disabled:opacity-40" style={{ background: '#0B2438' }}>
                    {L('Apply to all', 'سب پر لاگو کریں', 'طبّق على الكل')}
                  </button>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setItems(prev => prev.map((i: any) => ({ ...i, selected: true })))}
                className="min-h-10 text-xs font-bold px-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                {L('Select all', 'سب منتخب کریں', 'تحديد الكل')}
              </button>
              <button type="button" onClick={() => setItems(prev => prev.map((i: any) => ({ ...i, selected: false })))}
                className="min-h-10 text-xs font-bold px-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                {L('Deselect all', 'سب ہٹائیں', 'إلغاء تحديد الكل')}
              </button>
              <button type="button" onClick={addItem}
                className="min-h-10 text-xs font-bold px-3 rounded-lg text-white" style={{ background: '#0B2438' }}>
                + {L('Add a material', 'مواد شامل کریں', 'أضف مادة')}
              </button>
            </div>
            {draft && hasItems && draftPanel}

            {/* Items — grouped by category (accordion, like the pricing lists) */}
            <div className="space-y-3">
              {getGroupedItems(items, locale).map((g: any) => {
                const open = openGroups[g.key] ?? g.defaultOpen
                return (
                  <div key={g.key} className="border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleGroup(g.key)} aria-expanded={open}
                      className={`w-full min-h-11 flex items-center justify-between px-4 py-3 ${g.key === '_unclassified' ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <span className="font-bold text-sm flex items-center gap-2" style={{ color: g.key === '_unclassified' ? '#b91c1c' : '#0B2438' }}>
                        <span className="w-5 h-5 grid place-items-center"><CatIcon k={g.key} className="w-4 h-4" /></span> {g.label}
                        <span className="badge text-xs bg-white border border-gray-200 text-gray-600">{g.entries.length}</span>
                      </span>
                      <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
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
                    <input type="checkbox" checked={item.selected} aria-label={L('Include in the request', 'درخواست میں شامل کریں', 'ضمّن البند في الطلب')}
                      onChange={(e: any) => updateItem(item.id, 'selected', e.target.checked)}
                      className="mt-1 w-5 h-5 accent-[#0B2438] flex-shrink-0" />

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
                                <button type="button" onClick={() => setNameEdit(item.id)} className="min-h-10 px-2 text-xs font-bold text-[#8F6820] hover:underline shrink-0">{L('Change the material', 'مواد بدلیں', 'تغيير المادة')}</button>
                              </div>
                            ) : (<>
                              <input value={item.product_name} list="boq-catalog" dir="auto"
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
                              className="input-field text-sm" placeholder={L('Quantity', 'مقدار', 'الكمية')} />
                            <select value={item.unit}
                              onChange={(e: any) => updateItem(item.id, 'unit', e.target.value)}
                              className="input-field text-sm">
                              {unitsFor(item).map(unitOpt)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <ItemSpecFields name={item.product_name} sector={item.sector} specs={item.specs} locale={locale} onChange={(v: any) => updateItem(item.id, 'specs', v)} />
                          </div>
                          <div className="sm:col-span-2">
                            <input value={item.specification || ''}
                              onChange={(e: any) => updateItem(item.id, 'specification', e.target.value)}
                              className={`input-field text-sm ${missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile).includes('*') ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
                              placeholder={specsRequired(item.product_name, item.sector) && !getProductSpecs(item.product_name).some(f => f.key !== 'unit') ? L('Size and specs (required): length, width, thickness, grade…', 'سائز اور تفصیل (ضروری)', 'المقاس والمواصفات (مطلوب): الطول، العرض، السماكة، الدرجة…') : L('More specs or notes (optional)', 'مزید تفصیل (اختیاری)', 'مواصفات إضافية أو ملاحظات (اختياري)')} />
                            {item.specFromDoc && (item.specFromDoc !== (item.specification || '')) && (
                              <div className="mt-1.5 text-xs bg-[#D4A543]/5 border border-[#D4A543]/30 rounded-lg p-2 flex items-start gap-2">
                                <span className="text-[#8F6820] font-bold shrink-0"><Glyph e="📄" /> {L('Spec doc:', 'دستاویز سے:', 'من الوثيقة:')}</span>
                                <span className="text-gray-600 flex-1 min-w-0">{item.specFromDoc}</span>
                                <button type="button" onClick={() => updateItem(item.id, 'specification', item.specFromDoc)}
                                  className="min-h-10 px-2 text-[#0B2438] font-bold shrink-0 hover:underline">{L('Use', 'استعمال کریں', 'استبدل')}</button>
                              </div>
                            )}
                          </div>
                          {/* رفع ملف مواصفات للبند */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-600 mb-1">
                              {L('Spec file (optional)', 'آئٹم کی اسپیسیفکیشن فائل (اختیاری)', 'ملف مواصفات للبند (اختياري)')}
                            </label>
                            {item.specFile ? (
                              <div className="flex items-center gap-2 bg-[#0B2438]/5 rounded-lg p-2 border border-[#0B2438]/20">
                                <span className="text-base"><Glyph e="📎" /></span>
                                <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#0B2438' }}>{item.specFile.name}</span>
                                <button type="button" onClick={() => updateItem(item.id, 'specFile', null)}
                                  className="min-h-10 px-2 text-xs font-bold text-red-600 hover:underline">
                                  {L('Remove', 'ہٹائیں', 'إزالة')}
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 min-h-11 border-2 border-dashed border-gray-200 rounded-lg p-2 cursor-pointer hover:border-[#D4A543]/50 transition-all">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.dwg,.xlsx,.doc,.docx"
                                  onChange={(e: any) => { updateItem(item.id, 'specFile', e.target.files?.[0] ?? null); e.target.value = '' }} />
                                <span className="text-base"><Glyph e="📄" /></span>
                                <span className="text-xs text-gray-600">
                                  {L('Upload drawing/spec (PDF, DWG, Image...)', 'ڈرائنگ یا اسپیسیفکیشن اپ لوڈ کریں (PDF، DWG، تصویر...)', 'ارفع رسمة أو مواصفة (PDF، DWG، صورة...)')}
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="sm:col-span-2 flex gap-2">
                            <button type="button" onClick={() => finishEdit(item)}
                              className="min-h-11 text-sm px-5 rounded-xl text-white font-bold" style={{ background: '#0B2438' }}>
                              ✓ {L('Done', 'ہو گیا', 'تم')}
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
                                  className="min-h-10 badge text-xs bg-red-100 text-red-700 font-bold hover:bg-red-200">
                                  <Glyph e="⚠" /> {L('Choose its specialty', 'اس کا شعبہ منتخب کریں', 'اختر تخصصها')}
                                </button>
                              )}
                              {item.quantity && <span className="text-xs text-gray-600"><Glyph e="📦" /> {item.quantity} {getUnitLabel(item.unit, locale)}</span>}
                              {(specTextOf(item.product_name, item.specs) || item.specification) && <span className="text-xs text-gray-600 break-words max-w-full"><Glyph e="⚙" /> {[specTextOf(item.product_name, item.specs), item.specification].filter(Boolean).join(' — ')}</span>}
                              {missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile).length > 0 && !needsBox && (
                                <button type="button" onClick={() => setEditingIndex(i)} className="min-h-10 badge text-xs bg-[#D4A543]/15 text-[#8F6820] font-bold hover:bg-[#D4A543]/25">
                                  {L('Complete the specs', 'تفصیل مکمل کریں', 'أكمل المواصفات')}
                                </button>
                              )}
                              {item.specFile && <span className="text-xs text-[#0B2438] font-semibold"><Glyph e="📎" /> {L('File attached', 'فائل منسلک', 'مرفق ملف')}</span>}
                              {isInstallable(item.sector, item.sub_category || detectSubCategory(item.product_name, item.sector)) && (
                                <label className={`inline-flex items-center gap-1.5 min-h-10 text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer select-none ${item.with_install ? 'border-[#0B2438] text-[#0B2438] bg-[#0B2438]/5' : 'border-gray-200 text-gray-600'}`}>
                                  <input type="checkbox" checked={!!item.with_install} onChange={(e: any) => updateItem(item.id, 'with_install', e.target.checked)} className="w-4 h-4 accent-[#0B2438]" />
                                  <Glyph e="🔧" /> {L('Ask for the price with installation', 'تنصیب سمیت قیمت مانگیں', 'اطلب السعر مع التركيب')}
                                </label>
                              )}
                              {item.needs_review && !item.done && (
                                <span className="badge text-xs bg-[#D4A543]/15 text-[#8F6820] font-bold" title={boqFlagText(item.flags, L).join(' · ')}>
                                  <Glyph e="⚠" /> {L('Needs review', 'جائزہ ضروری', 'يحتاج مراجعة')}{boqFlagText(item.flags, L).length ? ': ' + boqFlagText(item.flags, L)[0] : ''}
                                </span>
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
            <details className="rounded-xl border border-[#0B2438]/15 bg-white p-4" open={!!specsFile || !!specMsg}>
              <summary className="cursor-pointer min-h-11 flex items-center gap-2 font-bold text-sm" style={{ color: '#0B2438' }}>
                <Glyph e="📑" /> {L('Match a project specification document (optional)', 'پراجیکٹ کی تفصیلات کی دستاویز ملائیں (اختیاری)', 'مطابقة مستند مواصفات المشروع (اختياري)')}
              </summary>
              <p className="text-xs text-gray-600 mt-1 mb-3">
                {L('Upload the spec document: it is read with the bill of quantities, item codes (e.g. DRS-701) are resolved and each item\'s full details are filled.',
                  'اسپیسیفکیشن دستاویز اپ لوڈ کریں: اسے مقداروں کے جدول کے ساتھ پڑھ کر آئٹم کوڈ (جیسے DRS-701) ملائے جاتے ہیں اور ہر آئٹم کی مکمل تفصیل بھری جاتی ہے۔',
                  'ارفع مستند المواصفات: يُقرأ مع جدول الكميات، وتُربط رموز البنود (مثل DRS-701) وتُملأ تفاصيل كل بند كاملة.')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {specsFile ? (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                    <span className="text-base"><Glyph e="📄" /></span>
                    <span className="text-xs font-semibold truncate max-w-[200px]" style={{ color: '#0B2438' }}>{specsFile.name}</span>
                    <button type="button" onClick={() => { setSpecsFile(null); setSpecMsg(''); if (specsRef.current) specsRef.current.value = '' }} className="min-h-10 px-2 text-xs font-bold text-red-600 hover:underline">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 min-h-11 border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-[#0B2438]/40 transition-all">
                    <input ref={specsRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg"
                      onChange={(e: any) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setSpecsFile(f); setSpecMsg('') } }} />
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
                <div className={`text-xs mt-2 font-semibold ${specMsg.startsWith('✓') ? 'text-[#0F6E56]' : 'text-[#8F6820]'}`}>{specMsg}</div>
              )}
            </details>
          </div>
        )}

        {/* Step 3: project details and sending */}
        {hasItems && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold mb-4" style={{ color: '#0B2438' }}>
              {L('3. Project details and sending', '3. پراجیکٹ کی معلومات اور بھیجنا', '3. بيانات المشروع والإرسال')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
              <div className="sm:col-span-2">
                <label htmlFor="boq-title" className="block text-xs font-bold text-gray-600 mb-1.5">
                  {L('Project name *', 'پراجیکٹ کا نام *', 'اسم المشروع *')}
                </label>
                <input id="boq-title" ref={titleRef} value={title} onChange={(e: any) => setTitle(e.target.value)} aria-invalid={showMissing && !title.trim()}
                  className={`input-field ${showMissing && !title.trim() ? 'border-red-400 bg-red-50/40' : ''}`} placeholder={L('e.g. Building A — Residential Project', 'مثلاً: عمارت A — رہائشی پراجیکٹ', 'مثال: مبنى A — مشروع سكني')} />
                {showMissing && !title.trim() && <p className="text-xs font-bold text-red-600 mt-1">{L('This field is required', 'یہ خانہ ضروری ہے', 'هذا الحقل مطلوب')}</p>}
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
                {geoMsg && <span className="text-xs text-gray-600">{geoMsg}</span>}
              </div>
              <div className="sm:col-span-2 bg-[#D4A543]/[.06] border border-[#D4A543]/30 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[#0B2438]"><Glyph e="🚚" /> {L('Delivery required (for the whole project)', 'ڈیلیوری درکار ہے (پورے پراجیکٹ کے لیے)', 'التوصيل مطلوب (لكل المشروع)')}</div>
                  <button type="button" role="switch" aria-checked={deliveryRequired} aria-label={L('Delivery required', 'ڈیلیوری درکار ہے', 'التوصيل مطلوب')}
                    onClick={() => setDeliveryRequired(!deliveryRequired)} className={`w-12 h-7 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${deliveryRequired ? 'justify-end' : 'justify-start'}`}
                    style={{ background: deliveryRequired ? '#0B2438' : '#e5e7eb' }}>
                    <span className="w-5 h-5 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
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
                      <div className="text-[13px] font-bold text-[#0B2438] leading-snug">{on ? '✓ ' : ''}{label}</div>
                      <div className="text-xs text-gray-600 mt-0.5 leading-snug line-clamp-2">{hint}</div>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{L('Verified (trusted) suppliers only', 'صرف تصدیق شدہ', 'الموردون الموثّقون والمعتمدون فقط')}</div>
                  <div className="text-xs text-gray-500">{L('Receive offers from verified suppliers only', 'صرف تصدیق شدہ سپلائرز سے', 'استقبل عروضاً من الموثّقين فقط')}</div>
                </div>
                <button type="button" role="switch" aria-checked={verifiedOnly} aria-label={L('Verified suppliers only', 'صرف تصدیق شدہ سپلائرز', 'الموردون الموثّقون فقط')}
                  onClick={() => setVerifiedOnly(!verifiedOnly)} className={`w-12 h-7 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${verifiedOnly ? 'justify-end' : 'justify-start'}`}
                  style={{ background: verifiedOnly ? '#0B2438' : '#e5e7eb' }}>
                  <span className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mt-2">
                <div>
                  <div className="text-sm font-semibold text-gray-800"><Glyph e="📍" /> {L('Nearby only (same region)', 'صرف قریب (اسی علاقہ)', 'القريبون فقط (المنطقة نفسها)')}</div>
                  <div className="text-xs text-gray-500">{L('Only suppliers in your region: closer and cheaper shipping', 'صرف آپ کے علاقے کے سپلائرز', 'موردو منطقتك فقط، والشحن أقرب وأرخص')}</div>
                </div>
                <button type="button" role="switch" aria-checked={nearbyOnly} aria-label={L('Nearby only', 'صرف قریبی', 'القريبون فقط')}
                  onClick={() => setNearbyOnly(!nearbyOnly)} className={`w-12 h-7 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${nearbyOnly ? 'justify-end' : 'justify-start'}`}
                  style={{ background: nearbyOnly ? '#0B2438' : '#e5e7eb' }}>
                  <span className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>
            </div>

            <div className="mb-4 pb-4 border-b border-gray-100 space-y-3">
              <div>
                <div className="text-sm font-bold text-[#0B2438] mb-2">{L('When do you need the prices?', 'قیمتیں کب چاہئیں؟', 'متى تحتاج الأسعار؟')}</div>
                <div className="flex flex-wrap gap-2">
                  {([[24, L('Tomorrow', 'کل', 'غداً')], [48, L('2 days', '2 دن', 'يومان')], [72, L('3 days', '3 دن', '3 أيام')], [168, L('A week', 'ایک ہفتہ', 'أسبوع')]] as [number, string][]).map(([h, lab]) => (
                    <button key={h} type="button" onClick={() => setHours(h)} aria-pressed={hours === h}
                      className={`min-h-11 px-4 rounded-full border text-sm font-bold ${hours === h ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-700 border-gray-200'}`}>{lab}</button>
                  ))}
                </div>
              </div>
              <p className="flex items-start gap-2 text-sm text-gray-700">
                <Glyph e="🔒" /> {L('Your name and contact details are hidden from suppliers until you choose an offer.', 'آپ کا نام اور رابطے کی تفصیل آفر منتخب کرنے تک سپلائرز سے چھپی رہتی ہے۔', 'اسمك وبيانات تواصلك مخفية عن الموردين حتى تختار عرضاً.')}
              </p>
              <label className="flex items-center gap-2 min-h-11 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={vatRequired} onChange={(e: any) => setVatRequired(e.target.checked)} className="w-5 h-5 accent-[#0B2438]" />
                {L('I need a VAT tax invoice', 'مجھے VAT ٹیکس انوائس چاہیے', 'أحتاج فاتورة ضريبية')}
              </label>
            </div>

            <div className="mb-3">
              <h3 className="font-bold" style={{ color: '#0B2438' }}>
                {L('Ready to send?', 'بھیجنے کے لیے تیار؟', 'جاهز للإرسال؟')}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {sendCount
                  ? L(`${sendCount} materials in one request to the specialist suppliers`, `${sendCount} مواد ایک درخواست میں متعلقہ سپلائرز کو`, `${arMaterials(sendCount)} في طلب واحد للموردين المختصين`)
                  : L('Choose the items\' specialty to send them.', 'بھیجنے کے لیے آئٹمز کا شعبہ منتخب کریں۔', 'اختر تخصص البنود لإرسالها.')}
                {unclassifiedCount > 0 && L(` · ${unclassifiedCount} without a specialty stay saved here`, ` · ${unclassifiedCount} بغیر شعبہ یہاں محفوظ رہیں گے`, ` · ${arItems(unclassifiedCount)} بلا تخصص تبقى محفوظة هنا`)}
              </p>
            </div>

            {/* what is still missing, each name takes you to its field (the button itself is never silently disabled) */}
            {missingFields.length > 0 && (
              <div className={`mb-3 rounded-xl border p-3 text-[13px] font-bold ${showMissing ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#D4A543]/40 bg-[#D4A543]/[.06] text-[#0B2438]'}`}>
                {L('Before sending, complete: ', 'بھیجنے سے پہلے مکمل کریں: ', 'قبل الإرسال أكمل: ')}
                {missingFields.map((f, k) => (
                  <span key={f.key}>
                    {k > 0 && ' · '}
                    <button type="button" onClick={() => goToField(f.ref)} className="underline underline-offset-2 min-h-10">{f.label}</button>
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
              ) : L(`Send ${sendCount} materials to suppliers →`, `${sendCount} مواد سپلائرز کو بھیجیں ←`, `إرسال ${arMaterials(sendCount)} للموردين المختصين ←`)}
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
