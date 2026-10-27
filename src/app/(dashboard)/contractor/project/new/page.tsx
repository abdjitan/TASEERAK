'use client'

import { canUseProjects } from '@/lib/plans'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { TIERS, tierLabel, tierHint, normTier } from '@/lib/sellers'
import { SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, UNIT_OPTIONS, REGIONS, CITIES_BY_REGION, detectSubCategory, getSubCategoryLabel, getProductLabel, SECTOR_PRODUCTS, unitChoicesFor, getDefaultUnit, specsRequired, missingSpecs, getProductSpecs, getOptionLabel, type Sector } from '@/types'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import LineSpecialty, { choiceDone } from '@/components/shared/LineSpecialty'
import CatalogPicker from '@/components/shared/CatalogPicker'
import Glyph from '@/components/shared/Glyph'
import { arCount, arItems, arMaterials } from '@/lib/text'
import CatIcon from '@/components/shared/CatIcon'

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
        label: gkey === '_unclassified' ? (locale === 'en' ? 'Unclassified' : 'غير مصنّف') : (gl ? (locale === 'en' ? gl.en : gl.ar) : gkey),
        icon: gkey === '_unclassified' ? <Glyph e="⚠" /> : (gl?.icon || '<Glyph e="📦" />'),
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
          const custom = !!v && !f.options.includes(v)
          const setV = (val: string) => onChange({ ...(specs || {}), [f.key]: val })
          return (
            <label key={f.key} className="block">
              <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{locale === 'ar' ? f.ar : f.en}{req ? ' *' : ''}</span>
              <select value={custom ? '__other' : v} onChange={(e: any) => setV(e.target.value === '__other' ? ' ' : e.target.value)}
                className={`input-field text-sm ${req && !v.trim() ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}>
                <option value="">{req ? L('Choose', 'منتخب کریں', 'اختر') : L('Any', 'کوئی بھی', 'أي')}</option>
                {f.options.map(o => <option key={o} value={o}>{getOptionLabel(o, locale)}</option>)}
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

const SECTOR_ICONS = { civil: <Glyph e="🏗" />, architectural: <Glyph e="🏛" />, electrical: <Glyph e="⚡" />, mechanical: <Glyph e="⚙" />, equipment: <Glyph e="🚜" />, supply_store: <Glyph e="🏪" /> }
const SECTOR_COLORS = { civil: '#0B2438', architectural: '#7c3aed', electrical: '#D97706', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }

export default function NewProjectPage() {
  const { locale, dir } = useTranslation()
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
  // تحديد الموقع تلقائياً → يملأ المنطقة والمدينة وعنوان التوصيل
  function geolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeoMsg(locale === 'en' ? 'Geolocation not supported' : 'المتصفح لا يدعم تحديد الموقع'); return }
    setGeoMsg(locale === 'en' ? 'Locating…' : 'جارٍ تحديد الموقع…')
    navigator.geolocation.getCurrentPosition(
      async (pos: any) => {
        const { latitude, longitude } = pos.coords
        const link = `https://maps.google.com/?q=${latitude},${longitude}`
        setGeoMsg(locale === 'en' ? 'Reading city…' : 'جارٍ قراءة المدينة…')
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
            setGeoMsg(`${locale === 'en' ? 'Location set ✓' : 'تم تحديد موقعك ✓'}${cityName ? ` — ${cityName}` : ''}`)
            return
          }
        } catch {}
        setDeliveryRequired(true)
        setDeliveryLocation(link)
        setGeoMsg(locale === 'en' ? 'Location pin saved ✓' : 'تم حفظ موقعك ✓')
      },
      () => setGeoMsg(locale === 'en' ? 'Location access denied' : 'تم رفض الوصول للموقع — فعّله من إعدادات المتصفح'),
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
    if (!specsFile) { setSpecMsg('ارفع ملف المواصفات أولاً'); return }
    const targets = items.filter((i: any) => i.product_name)
    if (targets.length === 0) { setSpecMsg('أضف بنوداً (أو ارفع BOQ) أولاً'); return }
    setMatchingSpecs(true); setSpecMsg('')
    try {
      const fd = new FormData()
      fd.append('file', specsFile)
      fd.append('items', JSON.stringify(targets.map((i: any) => ({ ref: i.id, product_name: i.product_name, sector: i.sector }))))
      const res = await fetch('/api/match-spec', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.ok) { setSpecMsg((data.needsGemini ? 'ملف PDF/صورة يحتاج تفعيل Gemini من الإدارة أو حوّله لـExcel/نص — ' : '') + (data.message || 'تعذّرت مطابقة المواصفات')); return }
      let filled = 0, diff = 0
      setItems(prev => prev.map((it: any) => {
        const s = data.specs?.[it.id]
        if (!s || !s.trim()) return it
        const doc = s.trim()
        // لا نكتب فوق مواصفة موجودة — نُبقيها للمقارنة (specFromDoc). البند الفارغ يُعبَّأ مباشرة.
        if (!(it.specification || '').trim()) { filled++; return { ...it, specification: doc, specFromDoc: doc } }
        if ((it.specification || '').trim() !== doc) { diff++; return { ...it, specFromDoc: doc } }
        return { ...it, specFromDoc: doc }
      }))
      const parts = [`✓ طوبق ${data.matched} من ${arItems(data.total)}`]
      if (filled) parts.push(`عُبّئ ${filled}`)
      if (diff) parts.push(`${diff} تختلف عن BOQ — راجعها`)
      if (data.truncated) parts.push('المواصفات كبيرة واقتُطعت، قسّم الملف')
      setSpecMsg(parts.join(' · '))
    } catch {
      setSpecMsg('تعذّر الاتصال — حاول ثانية')
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
  const [hideIdentity, setHideIdentity] = useState(true)
  const [vatRequired, setVatRequired] = useState(true)
  const [nearbyOnly, setNearbyOnly] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
      supabase.from('profiles').select('role, verification_status, cr_verified_at, subscription_plan, subscription_expires_at').eq('id', data.session.user.id).single()
        .then(({ data: p }: any) => setAllowed(canUseProjects(p)))
    })
  }, [])

  const DRAFT_KEY = 'tsk_project_draft'
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (d && Array.isArray(d.items) && d.items.length) {
        setTitle(d.title || ''); setRegion(d.region || ''); setCity(d.city || ''); setProjectNotes(d.projectNotes || '')
        setDeliveryRequired(d.deliveryRequired !== false); setDeliveryLocation(d.deliveryLocation || '')
        setItems(d.items); if (d.hours) setHours(d.hours)
        if (typeof d.hideIdentity === 'boolean') setHideIdentity(d.hideIdentity)
        if (typeof d.vatRequired === 'boolean') setVatRequired(d.vatRequired)
        if (Array.isArray(d.targetTiers)) setTargetTiers(d.targetTiers)
        if (typeof d.verifiedOnly === 'boolean') setVerifiedOnly(d.verifiedOnly)
        setStep('items')
      }
    } catch {}
    setRestored(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!restored) return
    try {
      if (!items.length) { localStorage.removeItem(DRAFT_KEY); return }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, region, city, projectNotes, deliveryRequired, deliveryLocation, hours, hideIdentity, vatRequired, targetTiers, verifiedOnly,
        items: items.map((it: any) => ({ ...it, specFile: null })) }))
    } catch {}
  }, [restored, title, region, city, projectNotes, deliveryRequired, deliveryLocation, items, hours, hideIdentity, vatRequired, targetTiers, verifiedOnly])

  // تحليل الـ BOQ
  async function handleBOQUpload(file: File) {
    setBoqFile(file)
    setParsing(true)
    setParseError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-boq', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.items?.length > 0) {
        setAiUsed(!!data.ai)
        setItems(data.items.map((item: any, i: any) => {
          // التخصص يأتي مُصنّفاً من الخادم (من القوائم الرسمية). نتأكد أنه مفتاح صحيح وإلا = غير مصنّف.
          const sub = (item.sub_category && (SUB_CATEGORIES as any)[item.sector]?.[item.sub_category]) ? item.sub_category : null
          // غير مصنّف لو بلا تخصص، أو لو الذكاء أبلغ ثقة منخفضة (يبقى الاقتراح ظاهراً في القائمة ليؤكّده المقاول)
          return { ...item, id: `item-${i}`, selected: true, done: parseFloat(item.quantity) > 0 && missingSpecs(item.product_name, item.sector, {}, item.specification || '').length === 0, sub_category: sub, needs_classification: !sub || !!item.needs_classification || !!item.low_confidence }
        }))
        setStep('items')
      } else {
        setParseError(locale === 'en' ? 'No items found in the BOQ' : 'لم يتم استخراج بنود من الملف')
      }
    } catch (err) {
      setParseError((err as any).message || (locale === 'en' ? 'Failed to parse BOQ' : 'فشل تحليل الملف'))
    } finally { setParsing(false) }
  }

  // إضافة مادة يدوياً (owner 2026-10-24: كانت تُضاف «بند بدون اسم / مدني» ثم تُعدَّل). لوحة واحدة:
  // الاسم (اقتراحات من الكتالوج أو نص حر) → التخصص يُقترح تلقائياً → الكمية والوحدة → «أضف إلى القائمة».
  const [draft, setDraft] = useState<any>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  // a material picked from the catalog popup goes straight into the list, already classified
  function addFromCatalog(p: { name: string; sector: Sector }) {
    setItems(prev => prev.some((it: any) => it.product_name === p.name) ? prev : [...prev, {
      id: `item-${Date.now()}-${prev.length}`, product_name: p.name, sector: p.sector, quantity: '',
      unit: getDefaultUnit(p.name, p.sector) || 'عدد', specification: '', specs: {}, sub_category: detectSubCategory(p.name, p.sector) || null,
      needs_classification: !detectSubCategory(p.name, p.sector), selected: true, done: false,
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
    setItems(prev => [...prev, {
      id: `item-${Date.now()}`, product_name: name, sector,
      quantity: draft.quantity, unit: draft.unit || getDefaultUnit(name, sector as Sector) || 'عدد',
      specification: draft.specification, specs: draft.specs || {}, custom: !g.catalog, sub_category: choice?.sub ?? null, section: choice?.section, needs_classification: !choice, selected: true, done: parseFloat(draft.quantity) > 0 && missingSpecs(name, sector as Sector, draft.specs, draft.specification || '').length === 0,
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
        <button type="button" onClick={() => setDraft(null)} className="text-sm font-bold text-gray-500 hover:underline">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
      </div>
      <div>
        <input list="boq-catalog" autoFocus value={draft.product_name}
          onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, product_name: v, spec: undefined, unit: '', specs: {} })) }}
          className="input-field" placeholder={L('Material name: type and pick from the list, or write it your way', 'مواد کا نام', 'اسم المادة: اكتب واختر من القائمة، أو اكتبها كما تريد')} />
        <datalist id="boq-catalog">{catalogNames.map(n => <option key={n} value={n} />)}</datalist>
        <button type="button" onClick={() => setShowCatalog(true)}
          className="mt-2 w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 text-sm font-bold text-[#9D7425] hover:bg-[#D4A543]/20">
          {L("Can't find it? Browse the materials guide by section", 'نہیں ملا؟ شعبوں سے فہرست دیکھیں', 'لم تجدها؟ تصفّح دليل المواد حسب الأقسام')}
        </button>
        {draftG?.catalog && (
          <p className="text-xs text-[#0F6E56] font-bold mt-1.5">✓ {L('From the catalog', 'کیٹلاگ سے', 'من دليل المواد')}{draftG.sub ? ' · ' + getSubCategoryLabel(draftG.sector as any, draftG.sub, locale) : ''}</p>
        )}
      </div>
      {draftName.length >= 2 && !draftG?.catalog && (
        <LineSpecialty key={draftName} name={draftName} sector={draftG?.sector || 'civil'} value={draft.spec} locale={locale}
          onChange={(v: any) => setDraft((d: any) => ({ ...d, spec: v }))} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <input type="text" inputMode="decimal" value={draft.quantity}
          onChange={(e: any) => { const v = e.target.value.replace(/[٠-٩]/g, (x: string) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[^0-9.]/g, ''); setDraft((d: any) => ({ ...d, quantity: v })) }}
          className="input-field" placeholder={L('Quantity', 'مقدار', 'الكمية')} />
        <select value={draftDefUnit}
          onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, unit: v })) }} className="input-field">
          {!draftDefUnit && <option value="">{L('Unit', 'یونٹ', 'الوحدة')}</option>}
          {draftUnits.map((u: any) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {draftName && <ItemSpecFields name={draftName} sector={draftSector} specs={draft.specs} locale={locale} onChange={(v: any) => setDraft((d: any) => ({ ...d, specs: v }))} />}
      <input value={draft.specification} onChange={(e: any) => { const v = e.target.value; setDraft((d: any) => ({ ...d, specification: v })) }}
        className={`input-field ${draftName && missingSpecs(draftName, draftSector, draft.specs, draft.specification).includes('*') ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
        placeholder={draftName && specsRequired(draftName, draftSector) && !getProductSpecs(draftName).some(f => f.key !== 'unit')
          ? L('Specification (required): size, length, grade…', 'تفصیل (ضروری)', 'المواصفة (مطلوبة): المقاس، الطول، الدرجة…')
          : L('Specification (optional): size, grade, brand…', 'تفصیل (اختیاری)', 'المواصفة (اختياري): المقاس، الدرجة، الماركة…')} />
      <button type="button" disabled={!draftName} onClick={commitDraft}
        className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-40" style={{ background: '#0F6E56' }}>
        {L('Add to the list', 'فہرست میں شامل کریں', 'أضف إلى القائمة')}
      </button>
    </div>
  )

  // إرسال المشروع
  async function handleSubmit() {
    if (!user || !title || !region) return
    if (deliveryRequired && !deliveryLocation) return
    // سياسة عدم الإزعاج: البنود غير المصنّفة لا تُرسل إطلاقاً (حتى لا تصل لموردين خارج تخصصهم).
    // نرسل المصنّفة فقط، ونبقي غير المصنّفة لدى المقاول ليصنّفها لاحقاً.
    const classifiedItems = items.filter((i: any) => i.selected && i.product_name && !i.needs_classification)
    if (unclassifiedCount > 0) {
      const ok = confirm(`يوجد ${arItems(unclassifiedCount)} غير مصنّف — لن يُرسل (التصنيف يضمن وصوله للمورد المتخصص بدل إزعاج الجميع).\n\nإرسال البنود المصنّفة فقط (${classifiedItems.length})؟`)
      if (!ok) return
    }
    // materials priced by size/grade need a written spec or a spec file (owner 2026-10-27)
    const noSpec = classifiedItems.filter((i: any) => missingSpecs(i.product_name, i.sector, i.specs, i.specification || '', !!i.specFile).length > 0)
    if (noSpec.length) { alert(`اكتب مواصفات ${noSpec.length === 1 ? '«' + noSpec[0].product_name + '»' : arItems(noSpec.length)} (المقاس، الطول، الدرجة…) ليتمكن الموردون من التسعير.`); setEditingIndex(items.indexOf(noSpec[0])); return }
    const noQty = classifiedItems.filter((i: any) => !(parseFloat(i.quantity) > 0))
    if (noQty.length) { alert(`أدخل كمية ${noQty.length === 1 ? '«' + noQty[0].product_name + '»' : arItems(noQty.length)} قبل الإرسال.`); return }
    if (classifiedItems.length === 0) { alert('لا توجد بنود مصنّفة للإرسال — اختر تصنيف البنود أولاً.'); return }
    setLoading(true)
    const supabase = createClient()

    const selectedItems = classifiedItems

    try {
      // رفع ملف BOQ إن وجد
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
        const path = `${user.id}/spec-doc-${Date.now()}.${specsFile.name.split('.').pop()}`
        const { data } = await supabase.storage.from('licenses').upload(path, specsFile, { upsert: true })
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(data.path)
          specUrl = publicUrl
        }
      }
      const projNotes = [projectNotes, specUrl ? `[مواصفات المشروع: ${specUrl}]` : ''].filter(Boolean).join('\n') || null

      // إنشاء Project RFQ
      const { data: project, error: projErr } = await supabase.from('project_rfqs').insert({
        contractor_id: user.id, title, region, city: city || null,
        notes: projNotes, boq_url: boqUrl, status: 'sent',
      }).select().single()

      if (projErr) throw new Error(projErr.message)

      // ONE request with all the project's items (owner 2026-10-27), like the request page: each
      // supplier sees the items of his specialties in one request, and the buyer awards the best
      // price per item on the request page (one purchase order per supplier).
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      const rfqItems: any[] = []
      for (const item of selectedItems) {
        // رفع ملف مواصفات البند إن وجد
        let itemSpecUrl: string | null = null
        if (item.specFile) {
          const ext = item.specFile.name.split('.').pop()
          const path = `${user.id}/spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, item.specFile, { upsert: true })
          if (!up) { alert(`تعذّر رفع ملف مواصفات «${item.product_name}». تحقّق من الاتصال وحاول مرة أخرى، أو احذف الملف.`); return }
          itemSpecUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
        }
        const st = specTextOf(item.product_name, item.specs)
        const specsObj: Record<string, string> = {}
        for (const [k, v] of Object.entries(item.specs || {})) if (String(v || '').trim()) specsObj[k] = String(v).trim()
        rfqItems.push({
          sector: item.sector,
          product_name: item.product_name,
          sub_category: item.sub_category || detectSubCategory(item.product_name, item.sector) || null,
          specification: [st, (item.specification || '').trim()].filter(Boolean).join(' — ') || null,
          quantity: Number(item.quantity),
          unit: item.unit || 'عدد',
          supplier_tiers: null, in_stock: false, max_days: null, specsObj,
          spec_file_url: itemSpecUrl,
          spec_file_name: itemSpecUrl ? (item.specFile?.name || 'مواصفات مرفقة') : null,
          photo_url: itemSpecUrl && /\.(jpe?g|png|webp)$/i.test(item.specFile?.name || '') ? itemSpecUrl : null,
          custom: !!item.custom,
        })
      }
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
        hide_identity: hideIdentity,
        target_tiers: targetTiers.length > 0 ? targetTiers : null,
        verified_only: verifiedOnly,
        nearby_only: nearbyOnly,
        notes: [`مشروع: ${title}`, projNotes].filter(Boolean).join('\n'),
        expires_at: expiresAt,
      }).select('id').single()
      if (rfqErr || !rfq) {
        alert((rfqErr?.message || '').includes('rfq_daily_limit') ? 'وصلت إلى الحد اليومي للطلبات. حاول لاحقاً.' : 'تعذّر إرسال المشروع. حاول مرة أخرى.')
        return
      }
      // the project keeps its list of items, all pointing at the one request
      await supabase.from('project_rfq_items').insert(rfqItems.map(it => ({
        project_rfq_id: project.id, rfq_id: rfq.id, product_name: it.product_name, sector: it.sector,
        quantity: it.quantity, unit: it.unit, specification: it.specification, status: 'sent',
      })))
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      window.location.href = `/contractor/rfq/${rfq.id}`
    } catch (err) {
      alert((err as any).message)
    } finally { setLoading(false) }
  }

  const selectedCount = items.filter((i: any) => i.selected && i.product_name).length
  const bySector = items.reduce((acc: any, item: any) => {
    if (!item.selected) return acc
    acc[item.sector] = (acc[item.sector] || 0) + 1
    return acc
  }, {})

  return (
    <AppShell title={locale === 'en' ? 'Add a bill of quantities (BOQ)' : locale === 'ur' ? 'مقداروں کا جدول (BOQ) شامل کریں' : 'إضافة جدول الكميات (BOQ)'} nav={getNav('contractor', locale, '/contractor/project/new')} dir={dir}>
      <div className="max-w-5xl mx-auto">
        {allowed === false && (
          <div className="bg-white rounded-2xl border border-[#D4A543]/40 p-6 sm:p-8 text-center shadow-sm">
            <div className="text-4xl text-[#9D7425] mb-3"><Glyph e="🏗" /></div>
            <h1 className="text-xl font-extrabold text-[#0B2438] mb-2">{L('Projects are for companies', 'پراجیکٹس کمپنیوں کے لیے ہیں', 'المشاريع متاحة لحسابات الشركات')}</h1>
            <p className="text-sm text-gray-600 leading-relaxed max-w-lg mx-auto mb-5">
              {L('Uploading a full bill of quantities and getting one purchase order per supplier is available to companies with a verified commercial registration, and to individuals on the higher plan.',
                'پوری BOQ اپلوڈ کرنا اور ہر سپلائر کے لیے پرچیز آرڈر تصدیق شدہ کمپنیوں اور اعلیٰ پلان والے افراد کے لیے ہے۔',
                'رفع جدول كميات كامل والحصول على أمر شراء لكل مورد ميزة لحسابات الشركات الموثّقة بالسجل التجاري، وللأفراد ضمن الباقة الأعلى.')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <a href="/settings" className="px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{L('Verify my commercial registration', 'تجارتی رجسٹریشن کی تصدیق', 'وثّق سجلك التجاري')}</a>
              <a href="/contractor/rfq/quick" className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Send a normal price request', 'عام قیمت کی درخواست', 'أرسل طلب تسعير عادياً')}</a>
            </div>
          </div>
        )}
        {allowed !== false && (<>
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>
            {locale === 'en' ? 'Add a bill of quantities (BOQ)' : locale === 'ur' ? 'مقداروں کا جدول (BOQ) شامل کریں' : 'إضافة جدول الكميات (BOQ)'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {locale === 'en' ? 'Upload a BOQ or add materials manually — we send each to the right supplier'
            : locale === 'ur' ? 'BOQ اپلوڈ کریں یا مواد خود شامل کریں'
            : 'ارفع ملف BOQ أو أضف المواد يدوياً — نرسل كل مادة للمورد المتخصص'}
          </p>
        </div>

        {/* Step 1: Setup */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-4" style={{ color: '#0B2438' }}>
            {locale === 'en' ? '1. Project Info' : '1. بيانات المشروع'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                {locale === 'en' ? 'Project Name *' : 'اسم المشروع *'}
              </label>
              <input value={title} onChange={(e: any) => setTitle(e.target.value)}
                className="input-field" placeholder={locale === 'en' ? 'e.g. Building A — Residential Project' : 'مثال: مبنى A — مشروع سكني'} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{locale === 'en' ? 'Region *' : 'المنطقة *'}</label>
              <select value={region} onChange={(e: any) => { setRegion(e.target.value); setCity('') }} className="input-field" required>
                <option value="">{locale === 'en' ? 'Select region' : 'اختر المنطقة'}</option>
                {REGIONS.map((r: any) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{locale === 'en' ? 'City' : 'المدينة'}</label>
              <select value={city} onChange={(e: any) => setCity(e.target.value)} className="input-field" disabled={!region}>
                <option value="">{!region ? (locale === 'en' ? 'Select region first' : 'اختر المنطقة أولاً') : (locale === 'en' ? 'Select city' : 'اختر المدينة')}</option>
                {(CITIES_BY_REGION[region] || []).map((c: any) => <option key={c.ar} value={c.ar}>{locale === 'en' ? c.en : c.ar}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 -mt-1">
              <button type="button" onClick={geolocate}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-[#0F6E56] text-[#0F6E56] hover:bg-[#0F6E56]/5 transition-colors">
                <Glyph e="📍" /> {locale === 'en' ? 'Auto-detect my location' : 'حدّد موقعي تلقائياً'}
              </button>
              {geoMsg && <span className="text-[11px] text-gray-500 ms-2">{geoMsg}</span>}
            </div>
            <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-800"><Glyph e="🚚" /> {locale === 'en' ? 'Delivery required (for the whole project)' : 'التوصيل مطلوب (لكل المشروع)'}</div>
                <div onClick={() => setDeliveryRequired(!deliveryRequired)} className={`w-11 h-6 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${deliveryRequired ? 'justify-end' : 'justify-start'}`}
                  style={{ background: deliveryRequired ? '#0F6E56' : '#e5e7eb' }}>
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              {deliveryRequired && (
                <div className="mt-2">
                  <input value={deliveryLocation} onChange={(e: any) => setDeliveryLocation(e.target.value)}
                    className="input-field"
                    placeholder={locale === 'en' ? 'Delivery location: district / site address *' : 'موقع التوصيل: الحي / عنوان الموقع *'} />
                  <p className="text-[11px] text-amber-700 mt-1">
                    {locale === 'en' ? 'Helps suppliers calculate shipping cost.' : 'يساعد الموردين على حساب تكلفة الشحن.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOQ Upload */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-1" style={{ color: '#0B2438' }}>
            {locale === 'en' ? '2. Upload BOQ or Add Manually' : '2. رفع BOQ أو إضافة يدوية'}
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            {locale === 'en' ? 'Excel BOQ will be auto-analyzed to extract all materials with quantities'
            : 'ملف Excel سيتم تحليله تلقائياً لاستخراج المواد والكميات'}
          </p>

          {/* BOQ Upload Zone */}
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all mb-4 ${
            boqFile ? 'border-[#0B2438] bg-[#0B2438]/5' : 'border-gray-200 hover:border-[#D4A543]/50'
          }`} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls"
              onChange={(e: any) => { if (e.target.files?.[0]) handleBOQUpload(e.target.files[0]) }} />
            {parsing ? (
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse"><Glyph e="⏳" /></div>
                <div className="font-semibold text-sm" style={{ color: '#0B2438' }}>
                  {locale === 'en' ? 'Analyzing BOQ...' : 'جارٍ تحليل الـ BOQ...'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {locale === 'en' ? 'Extracting materials and quantities' : 'استخراج المواد والكميات'}
                </div>
              </div>
            ) : boqFile ? (
              <div className="text-center">
                <div className="text-4xl mb-2"><Glyph e="✅" /></div>
                <div className="font-semibold text-sm" style={{ color: '#0B2438' }}>{boqFile.name}</div>
                <div className="text-xs text-gray-400 mt-1">{locale === 'en' ? `${items.length} items extracted` : `تم استخراج ${arItems(items.length)}`}</div>
                <button type="button" onClick={(e: any) => { e.preventDefault(); setBoqFile(null); setItems([]) }}
                  className="mt-2 text-xs text-red-500 hover:underline">
                  {locale === 'en' ? 'Remove' : 'إزالة الملف'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3"><Glyph e="📊" /></div>
                <div className="font-semibold text-sm text-gray-700">
                  {locale === 'en' ? 'Drop Excel BOQ here or click to upload' : 'اسحب ملف BOQ هنا أو اضغط للرفع'}
                </div>
                <div className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls)</div>
              </div>
            )}
          </label>

          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4"><Glyph e="⚠" /> {parseError}</div>
          )}

          {/* مستند مواصفات المشروع — يقرأه الذكاء ويطابق رموز البنود (DRS-701...) لاستخراج التفاصيل */}
          <div className="rounded-xl border border-[#0B2438]/15 bg-[#0B2438]/[0.03] p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base"><Glyph e="📑" /></span>
              <h3 className="font-bold text-sm" style={{ color: '#0B2438' }}>
                {locale === 'en' ? 'Project specifications (optional)' : 'مواصفات المشروع (اختياري)'}
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              {locale === 'en'
                ? 'Upload the spec document — the AI reads it with the BOQ, resolves item codes (e.g. DRS-701) and fills each item\'s full details.'
                : 'ارفع مستند المواصفات — يقرأه الذكاء مع الـBOQ، يربط رموز البنود (مثل DRS-701) ويملأ تفاصيل كل بند الكاملة.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {specsFile ? (
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <span className="text-base"><Glyph e="📄" /></span>
                  <span className="text-xs font-semibold truncate max-w-[200px]" style={{ color: '#0B2438' }}>{specsFile.name}</span>
                  <button type="button" onClick={() => { setSpecsFile(null); setSpecMsg('') }} className="text-xs text-red-500 hover:underline">{locale === 'en' ? 'Remove' : 'إزالة'}</button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-[#0B2438]/40 transition-all">
                  <input ref={specsRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg"
                    onChange={(e: any) => { const f = e.target.files?.[0]; if (f) { setSpecsFile(f); setSpecMsg('') } }} />
                  <span className="text-base"><Glyph e="📤" /></span>
                  <span className="text-xs text-gray-600">{locale === 'en' ? 'Upload spec (PDF, Excel, image...)' : 'ارفع المواصفات (PDF، Excel، صورة...)'}</span>
                </label>
              )}
              <button type="button" onClick={matchSpecs} disabled={matchingSpecs || !specsFile || items.length === 0}
                className="text-xs font-bold text-white px-4 py-2 rounded-lg disabled:opacity-40 transition-all hover:shadow"
                style={{ background: '#0B2438' }}>
                {matchingSpecs ? (locale === 'en' ? 'Reading...' : 'جارٍ القراءة...') : (locale === 'en' ? 'Read & match specs' : 'اقرأ المواصفات وطابقها')}
              </button>
            </div>
            {specMsg && (
              <div className={`text-xs mt-2 font-semibold ${specMsg.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>{specMsg}</div>
            )}
            {items.length === 0 && specsFile && (
              <div className="text-[11px] text-gray-400 mt-1">{locale === 'en' ? 'Add BOQ items first, then match.' : 'ارفع BOQ أو أضف بنوداً أولاً، ثم اضغط المطابقة.'}</div>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{locale === 'en' ? 'OR add manually' : 'أو أضف يدوياً'}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {draft && items.length === 0 ? draftPanel : (
          <button type="button" onClick={addItem}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-[#0B2438] hover:text-[#0B2438] transition-all">
            + {locale === 'en' ? 'Add Material' : 'إضافة مادة'}
          </button>)}
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: '#0B2438' }}>
                {locale === 'en' ? `Materials (${items.length})` : `المواد (${items.length})`}
                {aiUsed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#0B2438)' }}>
                    <Glyph e="✨" /> {locale === 'en' ? 'AI-analyzed' : 'حُلّل بالذكاء الاصطناعي'}
                  </span>
                )}
              </h2>
            </div>

            {/* تنبيه البنود غير المصنّفة — لن تصل للمورد المتخصص بدقّة حتى تُصنّف */}
            {unclassifiedCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <span className="text-lg"><Glyph e="⚠" /></span>
                <div className="text-xs text-red-700 leading-relaxed">
                  <strong>{unclassifiedCount} {locale === 'en' ? 'item(s) are not classified.' : 'بند غير مصنّف.'}</strong>{' '}
                  {locale === 'en'
                    ? 'Items without a category from the lists go to all suppliers in the sector instead of the right specialist. Open each one (Edit) and pick its category — or classify them in bulk below.'
                    : 'البنود بدون تصنيف من القوائم تُرسل لكل موردي القطاع بدل المورد المتخصص. افتح كل بند (زر «تعديل») واختر تصنيفه — أو صنّفها جماعياً بالأسفل.'}
                </div>
              </div>
            )}

            {/* تصنيف جماعي: طبّق تصنيفاً على كل غير المصنّف في قطاع واحد بضغطة */}
            {unclassifiedCount > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="text-xs font-bold text-gray-600 mb-2"><Glyph e="⚡" /> {locale === 'en' ? 'Bulk classify the unclassified' : 'تصنيف جماعي لغير المصنّف'}</div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[150px]">
                    <label className="block text-[10px] text-gray-400 mb-0.5">{locale === 'en' ? 'Sector' : 'القطاع'}</label>
                    <select value={bulkSector} onChange={e => { setBulkSector(e.target.value); setBulkSub('') }} className="input-field text-sm py-1.5">
                      <option value="">{locale === 'en' ? '— pick —' : '— اختر —'}</option>
                      {unclassifiedSectors.map((s: string) => (
                        <option key={s} value={s}>{(SECTOR_LABELS as any)[s] || s} ({unclassifiedBySector[s]})</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">{locale === 'en' ? 'Category' : 'التصنيف'}</label>
                    <select value={bulkSub} onChange={e => setBulkSub(e.target.value)} disabled={!bulkSector} className="input-field text-sm py-1.5 disabled:opacity-50">
                      <option value="">{locale === 'en' ? 'Pick a category' : 'اختر التصنيف'}</option>
                      {bulkSector && Object.entries((SUB_CATEGORIES as any)[bulkSector] || {}).map(([k, v]: any) => (
                        <option key={k} value={k}>{getSubCategoryLabel(bulkSector as any, k, locale)}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={bulkApplyCategory} disabled={!bulkSector || !bulkSub}
                    className="text-xs font-bold text-white px-4 py-2 rounded-lg disabled:opacity-40" style={{ background: '#0B2438' }}>
                    {locale === 'en' ? 'Apply to all' : 'طبّق على الكل'}
                  </button>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setItems(prev => prev.map((i: any) => ({ ...i, selected: true })))}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                {locale === 'en' ? '✓ Select All' : 'تحديد الكل'}
              </button>
              <button type="button" onClick={() => setItems(prev => prev.map((i: any) => ({ ...i, selected: false })))}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                {locale === 'en' ? '✗ Deselect All' : 'إلغاء الكل'}
              </button>
              <button type="button" onClick={addItem}
                className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: '#0B2438' }}>
                + {locale === 'en' ? 'Add a material' : 'أضف مادة'}
              </button>
            </div>
            {draft && items.length > 0 && draftPanel}

            {/* Items — grouped by category (accordion, like the pricing lists) */}
            <div className="space-y-3">
              {getGroupedItems(items, locale).map((g: any) => {
                const open = openGroups[g.key] ?? g.defaultOpen
                return (
                  <div key={g.key} className="border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleGroup(g.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 ${g.key === '_unclassified' ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <span className="font-bold text-sm flex items-center gap-2" style={{ color: g.key === '_unclassified' ? '#dc2626' : '#0B2438' }}>
                        <span className="w-5 h-5 grid place-items-center"><CatIcon k={g.key} className="w-4 h-4" /></span> {g.label}
                        <span className="badge text-[10px] bg-white border border-gray-200 text-gray-600">{g.entries.length}</span>
                      </span>
                      <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
                    </button>
                    {open && (
                      <div className="p-2 space-y-2 border-t border-gray-100">
                        {g.entries.map(({ item, i }: any) => (
                <div key={item.id} className={`bg-white rounded-xl border transition-all ${
                  item.selected ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-50'
                }`}>
                  <div className="flex items-start gap-3 p-4">
                    {/* Checkbox */}
                    <input type="checkbox" checked={item.selected}
                      onChange={(e: any) => updateItem(item.id, 'selected', e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#0B2438] flex-shrink-0" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editingIndex === i ? (
                        // Edit Mode
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <input value={getProductLabel(item.product_name, locale)}
                              onChange={(e: any) => { const v = e.target.value; setItems(prev => prev.map((it: any) => it.id === item.id ? { ...it, product_name: v, specs: {} } : it)) }}
                              className="input-field text-sm" placeholder={locale === 'en' ? 'Material name *' : 'اسم المادة *'} />
                          </div>
                          {/* التخصص — يحدّد المورد المتخصص الذي يستقبل البند */}
                          <div className="sm:col-span-2">
                            <LineSpecialty name={item.product_name} sector={item.sector}
                              value={item.needs_classification ? undefined : { sector: item.sector, sub: item.sub_category || null, section: item.section }} locale={locale}
                              onChange={(v: any) => setItems(prev => prev.map((it: any) => it.id === item.id ? { ...it, sector: v.sector, sub_category: v.sub, section: v.section, needs_classification: !choiceDone(v) } : it))} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" inputMode="decimal" value={item.quantity}
                              onChange={(e: any) => updateItem(item.id, 'quantity', e.target.value.replace(/[٠-٩]/g, (x: string) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[^0-9.]/g, ''))}
                              className="input-field text-sm" placeholder={locale === 'en' ? 'Qty' : 'الكمية'} />
                            <select value={item.unit}
                              onChange={(e: any) => updateItem(item.id, 'unit', e.target.value)}
                              className="input-field text-sm">
                              {Array.from(new Set([...(unitChoicesFor(item.product_name, item.sector) || UNIT_OPTIONS), ...(item.unit ? [item.unit] : [])])).map((u: any) => <option key={u} value={u}>{u}</option>)}
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
                              <div className="mt-1.5 text-[11px] bg-[#D4A543]/5 border border-[#D4A543]/30 rounded-lg p-2 flex items-start gap-2">
                                <span className="text-[#9D7425] font-bold shrink-0"><Glyph e="📄" /> {locale === 'en' ? 'Spec doc:' : 'من الوثيقة:'}</span>
                                <span className="text-gray-600 flex-1 min-w-0">{item.specFromDoc}</span>
                                <button type="button" onClick={() => updateItem(item.id, 'specification', item.specFromDoc)}
                                  className="text-[#0F6E56] font-bold shrink-0 hover:underline">{locale === 'en' ? 'Use' : 'استبدل'}</button>
                              </div>
                            )}
                          </div>
                          {/* رفع ملف مواصفات للبند */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              {locale === 'en' ? 'Spec file (optional)' : 'ملف مواصفات للبند (اختياري)'}
                            </label>
                            {item.specFile ? (
                              <div className="flex items-center gap-2 bg-[#0B2438]/5 rounded-lg p-2 border border-[#0B2438]/20">
                                <span className="text-base"><Glyph e="📎" /></span>
                                <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#0B2438' }}>{item.specFile.name}</span>
                                <button type="button" onClick={() => updateItem(item.id, 'specFile', null)}
                                  className="text-xs text-red-500 hover:underline">
                                  {locale === 'en' ? 'Remove' : 'إزالة'}
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-2 cursor-pointer hover:border-[#D4A543]/50 transition-all">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.dwg,.xlsx,.doc,.docx"
                                  onChange={(e: any) => updateItem(item.id, 'specFile', e.target.files?.[0] ?? null)} />
                                <span className="text-base"><Glyph e="📄" /></span>
                                <span className="text-xs text-gray-500">
                                  {locale === 'en' ? 'Upload drawing/spec (PDF, DWG, Image...)' : 'ارفع رسمة أو مواصفة (PDF، DWG، صورة...)'}
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="sm:col-span-2 flex gap-2">
                            <button type="button" onClick={() => setEditingIndex(null)}
                              className="text-xs px-4 py-2 rounded-lg text-white font-semibold" style={{ background: '#0F6E56' }}>
                              ✓ {locale === 'en' ? 'Done' : 'حفظ'}
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
                            <div className="font-semibold text-sm truncate" style={{ color: '#0B2438' }}>
                              {(item.product_name && getProductLabel(item.product_name, locale)) || <span className="text-gray-400 italic">{locale === 'en' ? 'Unnamed item' : 'بند بدون اسم'}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {item.sub_category ? (
                                <span className="badge text-[10px] bg-[#0B2438]/5 text-[#0B2438] font-bold">
                                  {getSubCategoryLabel(item.sector, item.sub_category, locale)}
                                </span>
                              ) : !item.needs_classification && (
                                <span className="badge text-[10px] bg-gray-100 text-gray-600">{L('All suppliers of the section', 'شعبے کے سب سپلائرز', 'كل موردي القسم')}</span>
                              )}
                              {item.needs_classification && (
                                <button type="button" onClick={() => setEditingIndex(i)}
                                  className="badge text-[10px] bg-red-100 text-red-600 font-bold hover:bg-red-200">
                                  <Glyph e="⚠" /> {locale === 'en' ? 'Choose its specialty' : 'اختر تخصصها'}
                                </button>
                              )}
                              {item.quantity && <span className="text-xs text-gray-500"><Glyph e="📦" /> {item.quantity} {item.unit}</span>}
                              {(specTextOf(item.product_name, item.specs) || item.specification) && <span className="text-xs text-gray-500 truncate max-w-[260px]"><Glyph e="⚙" /> {[specTextOf(item.product_name, item.specs), item.specification].filter(Boolean).join(' — ')}</span>}
                              {missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile).length > 0 && (
                                <button type="button" onClick={() => setEditingIndex(i)} className="badge text-[10px] bg-[#D4A543]/15 text-[#9D7425] font-bold hover:bg-[#D4A543]/25">
                                  {L('Complete the specs', 'تفصیل مکمل کریں', 'أكمل المواصفات')}
                                </button>
                              )}
                              {item.specFile && <span className="text-xs text-[#0B2438] font-semibold"><Glyph e="📎" /> {locale === 'en' ? 'File attached' : 'مرفق ملف'}</span>}
                            </div>
                            {(item.done === false || !(parseFloat(item.quantity) > 0)) && (() => {
                              const miss = missingSpecs(item.product_name, item.sector, item.specs, item.specification || '', !!item.specFile)
                              const needWritten = miss.includes('*')
                              const ok = parseFloat(item.quantity) > 0 && miss.length === 0
                              return (
                                <div className="mt-3 space-y-2 rounded-xl border border-[#D4A543]/40 bg-[#D4A543]/[.04] p-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="text" inputMode="decimal" value={item.quantity || ''} autoFocus={i === items.length - 1}
                                      onChange={(e: any) => updateItem(item.id, 'quantity', e.target.value.replace(/[٠-٩]/g, (x: string) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[^0-9.]/g, ''))}
                                      className={`input-field text-sm ${parseFloat(item.quantity) > 0 ? '' : 'border-[#D4A543] bg-white'}`} placeholder={L('Quantity', 'مقدار', 'الكمية')} />
                                    <select value={item.unit} onChange={(e: any) => updateItem(item.id, 'unit', e.target.value)} className="input-field text-sm">
                                      {Array.from(new Set([...(unitChoicesFor(item.product_name, item.sector) || UNIT_OPTIONS), ...(item.unit ? [item.unit] : [])])).map((u: any) => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  </div>
                                  <ItemSpecFields name={item.product_name} sector={item.sector} specs={item.specs} locale={locale} onChange={(v: any) => updateItem(item.id, 'specs', v)} />
                                  <input value={item.specification || ''} onChange={(e: any) => updateItem(item.id, 'specification', e.target.value)}
                                    className={`input-field text-sm ${needWritten ? 'border-[#D4A543] bg-white' : ''}`}
                                    placeholder={needWritten ? L('Size and specs (required): length, width, thickness, grade…', 'سائز اور تفصیل (ضروری)', 'المقاس والمواصفات (مطلوب): الطول، العرض، السماكة، الدرجة…') : L('Notes for the supplier (optional)', 'سپلائر کے لیے نوٹ (اختیاری)', 'ملاحظات للمورد (اختياري)')} />
                                  <button type="button" disabled={!ok} onClick={() => updateItem(item.id, 'done', true)}
                                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#0F6E56' }}>
                                    ✓ {!(parseFloat(item.quantity) > 0) ? L('Enter the quantity to save', 'مقدار لکھیں', 'أدخل الكمية للحفظ') : miss.length ? L('Enter the specs to save', 'تفصیل لکھیں', 'أدخل المواصفات للحفظ') : L('Save', 'محفوظ کریں', 'حفظ')}
                                  </button>
                                </div>
                              )
                            })()}
                          </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button type="button" onClick={() => setEditingIndex(i)}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><Glyph e="✏" /></button>
                            <button type="button" onClick={() => removeItem(item.id)}
                              className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Glyph e="🗑" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Submit */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            {/* Target supplier types + verified-only (applies to all items) */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="text-sm font-bold text-[#0B2438] mb-2">{L('Who should price it?', 'کون قیمت دے؟', 'من تريد أن يسعّر لك؟')}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {([['all', L('All suppliers', 'سب سپلائرز', 'كل الموردين'), L('The most offers', 'زیادہ پیشکشیں', 'أكثر عروض')], ...TIERS.map(k => [k, tierLabel(k, locale, false), tierHint(k, locale)])] as [string, string, string][]).map(([k, label, hint]) => {
                  const on = k === 'all' ? targetTiers.length === 0 : (targetTiers.length === 1 && normTier(targetTiers[0]) === k)
                  return (
                    <button key={k} type="button" onClick={() => setTargetTiers(k === 'all' ? [] : [k])} aria-pressed={on}
                      className={`p-2.5 rounded-xl border-2 text-start transition-colors ${on ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 bg-white hover:border-[#D4A543]'}`}>
                      <div className="text-[13px] font-bold text-[#0B2438] leading-snug">{on ? '✓ ' : ''}{label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{hint}</div>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{L('Verified (trusted) suppliers only', 'صرف تصدیق شدہ', 'الموردون الموثّقون والمعتمدون فقط')}</div>
                  <div className="text-xs text-gray-400">{locale === 'en' ? 'Receive offers from verified suppliers only ✓' : locale === 'ur' ? 'صرف تصدیق شدہ سپلائرز سے ✓' : 'استقبل عروضاً من الموثّقين فقط ✓'}</div>
                </div>
                <div onClick={() => setVerifiedOnly(!verifiedOnly)} className={`w-11 h-6 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${verifiedOnly ? 'justify-end' : 'justify-start'}`}
                  style={{ background: verifiedOnly ? '#0F6E56' : '#e5e7eb' }}>
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 mt-2">
                <div>
                  <div className="text-sm font-semibold text-gray-800"><Glyph e="📍" /> {locale === 'en' ? 'Nearby only (same region)' : locale === 'ur' ? 'صرف قریب (اسی علاقہ)' : 'القريبون فقط (نفس المنطقة)'}</div>
                  <div className="text-xs text-gray-400">{locale === 'en' ? 'Only suppliers in your region' : locale === 'ur' ? 'صرف آپ کے علاقے کے سپلائرز' : 'موردو منطقتك فقط — شحن أقرب وأرخص'}</div>
                </div>
                <div onClick={() => setNearbyOnly(!nearbyOnly)} className={`w-11 h-6 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${nearbyOnly ? 'justify-end' : 'justify-start'}`}
                  style={{ background: nearbyOnly ? '#0B2438' : '#e5e7eb' }}>
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </div>

            <div className="mb-4 pb-4 border-b border-gray-100 space-y-3">
              <div>
                <div className="text-sm font-bold text-[#0B2438] mb-2">{L('When do you need the prices?', 'قیمتیں کب چاہئیں؟', 'متى تحتاج الأسعار؟')}</div>
                <div className="flex flex-wrap gap-2">
                  {([[24, L('Tomorrow', 'کل', 'غداً')], [48, L('2 days', '2 دن', 'يومان')], [72, L('3 days', '3 دن', '3 أيام')], [168, L('A week', 'ایک ہفتہ', 'أسبوع')]] as [number, string][]).map(([h, lab]) => (
                    <button key={h} type="button" onClick={() => setHours(h)} aria-pressed={hours === h}
                      className={`px-3.5 py-1.5 rounded-full border text-sm font-bold ${hours === h ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-600 border-gray-200'}`}>{lab}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={hideIdentity} onChange={(e: any) => setHideIdentity(e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                {L('Hide my name until I choose a supplier', 'سپلائر چننے تک نام چھپائیں', 'إخفاء اسمي حتى أختار المورد')}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={vatRequired} onChange={(e: any) => setVatRequired(e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                {L('I need a VAT tax invoice', 'مجھے VAT ٹیکس انوائس چاہیے', 'أحتاج فاتورة ضريبية')}
              </label>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold" style={{ color: '#0B2438' }}>
                  {locale === 'en' ? 'Ready to Send?' : 'جاهز للإرسال؟'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {locale === 'en' ? `${selectedCount} materials will be sent to ${Object.keys(bySector).length} supplier groups` : `${arMaterials(selectedCount)} ستُرسل إلى ${arCount(Object.keys(bySector).length, 'مجموعة واحدة', 'مجموعتين', 'مجموعات', 'مجموعة')} من الموردين`}
                </p>
              </div>
              <div className="text-left">
                {Object.entries(bySector).map(([s, count]) => (
                  <div key={s} className="text-xs text-gray-500">
                    {(SECTOR_LABELS as any)[s]}: {locale === 'en' ? `${count} items` : arItems(count as number)}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit}
              disabled={loading || !title || !region || selectedCount === 0 || (deliveryRequired && !deliveryLocation)}
              className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg"
              style={{ background: '#D4A543' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {locale === 'en' ? 'Sending to suppliers...' : 'جارٍ الإرسال للموردين...'}
                </span>
              ) : locale === 'en' ? `Send ${selectedCount} Materials to Suppliers →` : `إرسال ${arMaterials(selectedCount)} للموردين المتخصصين ←`}
            </button>
          </div>
        )}
        </>)}
      </div>
      {showCatalog && (
        <CatalogPicker locale={locale} onClose={() => setShowCatalog(false)}
          picked={items.map((it: any) => ({ key: it.id, name: it.product_name }))}
          onRemove={(key: string) => removeItem(key)}
          onPick={addFromCatalog} />
      )}
    </AppShell>
  )
}
