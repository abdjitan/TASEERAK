'use client'

import { useEffect, useRef, useState } from 'react'
import { useCatalogSpecs } from '@/lib/useCatalogSpecs'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { REGIONS, CITIES_BY_REGION, SECTOR_LABELS, SECTOR_PRODUCTS, getProductLabel, getUnitLabel, unitOptionsFor, unitChoicesFor, detectSubCategory, getDefaultUnit, getProductSpecs, getOptionLabel, missingSpecs, specsRequired, brandApplies, withBrand, type Sector } from '@/types'
import CatalogPicker, { CatalogBrowser } from '@/components/shared/CatalogPicker'
import LocationPicker from '@/components/shared/LocationPicker'
import SellerIcon from '@/components/shared/SellerIcon'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { normQuery } from '@/lib/productSearch'
import { loadLocalDraft, saveLocalDraft, clearLocalDraft, putDraftBlob, getDraftBlob, deleteDraftBlobs } from '@/lib/localDraft'
import Glyph from '@/components/shared/Glyph'
import { arCount, arMaterials } from '@/lib/text'
import { TIERS, tierLabel, tierHint } from '@/lib/sellers'
import LineSpecialty, { choiceDone } from '@/components/shared/LineSpecialty'

// The one request page, for anyone: write, dictate, photograph or pick from the catalog; we turn
// it into lines the buyer can fix, then send. Each line can open its specifications (PRODUCT_SPECS)
// and carry a drawing/file. Reorder (?from=<rfq>) and saved drafts (?draft=<id>) open here too.

// Every catalog product name — a line outside it gets the «which specialty?» chooser.
// «١٢٫٥» / «۱۲» → «12.5» / «12» (phones with an Arabic or Urdu keyboard type these digits)
const toLatinNumber = (v: string) => v.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '')

const CATALOG_NAMES = new Set<string>(Object.values(SECTOR_PRODUCTS).flat() as string[])
const UNITS = ['حبة', 'كيس', 'طن', 'م³', 'م²', 'متر', 'م.ط', 'لفة', 'كرتون', 'سطل', 'لوح', 'جالون', 'لتر', 'كغ', 'طقم', 'نقلة', 'يوم', 'ساعة', 'عدد']

type Line = {
  key: string
  product_name: string
  sector: string
  quantity: string
  unit: string
  details: string
  brand?: string // «الماركة أو اسم المنتج» (optional)
  photoId?: string
  done?: boolean   // «حفظ» pressed: shown as a compact row until tapped again
  original?: string // what the buyer wrote, when it differs from the Arabic name suppliers see
  suggestion?: { name: string; sector: string } | null
  specs?: Record<string, string> // chosen specification values (PRODUCT_SPECS keys, without 'unit')
  fileId?: string                // attached drawing/spec file, kept in IndexedDB until sending
  fileName?: string
  moreFiles?: { id: string; name: string }[] // owner 2026-10-31: more than one file/photo per line (up to 5 in all)
  spec?: { sector: string; sub: string | null; section?: string } // a «not in the list» item filed under a specialty by the buyer
}
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

let seq = 0
const uid = () => 'k' + Date.now().toString(36) + (seq++)

// "القطر: 12 مم، الطول: 12 متر" from the chosen specification values (the order unit is the line's unit).
function specText(name: string, specs?: Record<string, string>) {
  if (!specs) return ''
  return getProductSpecs(name).filter(f => f.key !== 'unit' && (specs[f.key] || '').trim()).map(f => `${f.ar}: ${specs[f.key].trim()}`).join('، ')
}
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
  return {
    key: uid(), product_name: it.product_name || '', sector: it.sector || 'supply_store',
    quantity: it.quantity ? String(it.quantity) : '', unit: it.unit || '', details, specs, ...(brand ? { brand } : {}),
    done: !!(it.product_name && Number(it.quantity) > 0 && it.unit),
  }
}

export default function QuickRequestPage() {
  useCatalogSpecs() // spec fields and order units (loaded on demand)
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [userId, setUserId] = useState('')
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [canListen, setCanListen] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [hours, setHours] = useState(48)
  const [notes, setNotes] = useState('')
  const [hideIdentity, setHideIdentity] = useState(true)
  const [vatRequired, setVatRequired] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  // who prices it (owner 2026-10-24): all / companies & factories / shops / independents — rfqs.target_tiers
  const [tier, setTier] = useState<'all' | 'company' | 'shop' | 'independent'>('all')
  const [pickup, setPickup] = useState(false) // the buyer collects from the supplier instead of delivery
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null) // delivery point (map / GPS)
  const [address, setAddress] = useState('')
  const [geoFromProfile, setGeoFromProfile] = useState(false) // pre-filled: say so, so the buyer checks it                                // district, street, landmark
  const [specsOpen, setSpecsOpen] = useState<string | null>(null) // line key whose specifications are open
  const [draftId, setDraftId] = useState<string | null>(null)     // a saved draft (rfq_drafts) opened here
  const specFileRef = useRef<HTMLInputElement>(null)
  const [fileFor, setFileFor] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false) // the summary shown before sending
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const recRef = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [restored, setRestored] = useState(false)
  // From the buyer home: open the guide already searching (?q=) or on a section (?section=)
  const [startQ, setStartQ] = useState('')
  const [startSection, setStartSection] = useState<string | null>(null)
  const [startPhoto, setStartPhoto] = useState(false) // ?start=photo: a big «take or choose a photo» button on top
  // «متى تحتاج التسليم؟» → items[].max_days for every line (null = not urgent)
  const [needDays, setNeedDays] = useState<number | null>(null)
  // one id per request: a retry after a lost response (weak network) re-sends the same id, so the
  // database refuses the duplicate (primary key) instead of creating a second request
  const rfqIdRef = useRef<string>('')
  const sendingRef = useRef(false)
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    // «لم تجد طلبك؟» from the home search: start with that text as a line (the buyer picks its specialty)
    const sl = (qs.get('line') || '').trim().slice(0, 80)
    if (sl) setLines(prev => prev.some(l => l.product_name === sl) ? prev : [...prev, { key: uid(), product_name: sl, sector: 'supply_store', quantity: '', unit: 'حبة', details: '' }])
    // browsers block opening the file picker without a tap, so show a big button instead
    if (qs.get('start') === 'photo') setStartPhoto(true)
    const sq = (qs.get('q') || '').slice(0, 80), ss = qs.get('section')
    if (sq) setStartQ(sq)
    if (ss && /^[a-z_]{3,20}$/.test(ss)) setStartSection(ss)
    if (sq || ss) {
      // phones show the guide as a sheet; desktop has it inline on the page
      if (window.matchMedia('(min-width: 1024px)').matches) setTimeout(() => document.getElementById('catalog-inline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
      else setShowCatalog(true)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?next=/contractor/rfq/quick'; return }
      setUserId(user.id)
      const { data: p } = await supabase.from('profiles').select('region, city, latitude, longitude').eq('id', user.id).single()
      if (p?.region) setRegion(p.region)
      if (p?.city) setCity(p.city)
      if (p?.latitude != null && p?.longitude != null) { setGeo({ lat: p.latitude, lng: p.longitude }); setGeoFromProfile(true) }
      // Reorder an earlier request, or continue a saved draft: these replace the local list.
      const qs = new URLSearchParams(window.location.search)
      const fromId = qs.get('from'), dId = qs.get('draft')
      if (fromId || dId) {
        if (fromId) {
          const { data: r } = await supabase.from('rfqs').select('*').eq('id', fromId).eq('contractor_id', user.id).single()
          if (r) {
            const its: any[] = Array.isArray(r.items) && r.items.length ? r.items
              : r.product_name ? [{ sector: r.sector, product_name: r.product_name, specification: r.specification, quantity: r.quantity, unit: r.unit }] : []
            setLines(its.map(lineFromItem))
            const md = Number(its.find((x: any) => Number(x?.max_days) > 0)?.max_days)
            if (md > 0) setNeedDays(md)
            if (r.region && r.region !== 'كل المناطق') { setRegion(r.region); setCity(r.city || '') }
            setNotes(r.notes || ''); setHideIdentity(r.hide_identity ?? true)
            setVatRequired(!!r.vat_invoice_required); setVerifiedOnly(!!r.verified_only); setTier(Array.isArray(r.target_tiers) && r.target_tiers.length === 1 ? r.target_tiers[0] : 'all'); setPickup(r.delivery_required === false)
          }
        } else if (dId) {
          const { data: dr } = await supabase.from('rfq_drafts').select('*').eq('id', dId).single()
          const dd: any = dr?.data
          if (dd) {
            setDraftId(dr.id)
            if (Array.isArray(dd.items)) setLines(dd.items.map(lineFromItem))
            if (dd.region) { setRegion(dd.region); setCity(dd.city || '') }
            setNotes(dd.notes || ''); setHideIdentity(dd.hideIdentity ?? true)
            setVatRequired(!!dd.vatRequired); setVerifiedOnly(!!dd.verifiedOnly); if (dd.tier) setTier(dd.tier); setPickup(dd.deliveryRequired === false)
          }
        }
        window.history.replaceState(null, '', '/contractor/rfq/quick')
        setRestored(true)
        return
      }
      // Bring back what the buyer had entered before leaving the page.
      const d = loadLocalDraft<any>('quick:' + user.id)
      if (d) {
        // Never overwrite what the buyer already typed while the draft was loading.
        if (Array.isArray(d.lines) && d.lines.length) setLines(prev => [...d.lines, ...prev])
        if (typeof d.text === 'string' && d.text) setText(t => t || d.text)
        if (d.region) { setRegion(d.region); setCity(d.city || '') }
        if (d.hours) setHours(d.hours)
        if (typeof d.needDays === 'number') setNeedDays(d.needDays)
        if (typeof d.rfqId === 'string') rfqIdRef.current = d.rfqId
        if (typeof d.notes === 'string') setNotes(d.notes)
        if (typeof d.hideIdentity === 'boolean') setHideIdentity(d.hideIdentity)
        if (typeof d.vatRequired === 'boolean') setVatRequired(d.vatRequired)
        if (typeof d.verifiedOnly === 'boolean') setVerifiedOnly(d.verifiedOnly)
        if (typeof d.pickup === 'boolean') setPickup(d.pickup)
        if (d.geo && typeof d.geo.lat === 'number') setGeo(d.geo)
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
      setRestored(true)
    })()
    setCanListen(typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on this device so going to another page never loses the list.
  useEffect(() => {
    if (!restored || !userId || done) return
    const t = setTimeout(() => saveLocalDraft('quick:' + userId, {
      text, lines, region, city, hours, needDays, rfqId: rfqIdRef.current, notes, hideIdentity, vatRequired, verifiedOnly, tier, pickup, geo, address,
      photos: photos.map(p => ({ id: p.id, name: p.file.name, type: p.file.type, status: p.status, share: p.share, confidence: p.confidence, localName: p.localName })),
    }), 300)
    return () => clearTimeout(t)
  }, [restored, userId, done, text, lines, region, city, hours, needDays, notes, hideIdentity, vatRequired, verifiedOnly, tier, pickup, geo, address, photos])

  function startOver() {
    deleteDraftBlobs([...photos.map(p => p.id), ...lines.map(l => l.fileId).filter(Boolean) as string[], ...lines.flatMap(l => (l.moreFiles || []).map(m => m.id))])
    if (userId) clearLocalDraft('quick:' + userId)
    setLines([]); setPhotos([]); setText(''); setNotes(''); setError(''); rfqIdRef.current = ''
  }

  // 🎤 Speech to text (browser built-in). The transcript is appended to the text box.
  function toggleMic() {
    if (listening) { try { recRef.current?.stop() } catch {} ; return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = locale === 'en' ? 'en-US' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA'
    rec.interimResults = false
    rec.continuous = true
    rec.onresult = (e: any) => {
      let said = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript + '، '
      if (said) setText(t => (t ? t.replace(/\s*$/, '') + '، ' : '') + said.replace(/،\s*$/, ''))
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  async function parseText() {
    if (!text.trim()) return
    setParsing(true); setError('')
    try {
      const r = await fetch('/api/quick-request/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const j = await r.json()
      if (!r.ok) { setError(j?.error || L('Could not read the list. Try again.', 'فہرست نہیں پڑھ سکے۔', 'تعذّرت قراءة القائمة. حاول مرة أخرى.')); return }
      const add: Line[] = (j.items || []).map((it: any) => ({
        key: uid(), product_name: it.product_name, sector: it.sector,
        quantity: it.quantity ? String(it.quantity) : '', unit: it.unit || '', details: it.details || '',
        suggestion: it.suggestion || null,
        // spec fields recognised in what was written («حديد 12 ملم» → القطر: 12 مم)
        ...(it.specs && Object.keys(it.specs).length ? { specs: it.specs } : {}),
        original: it.input_name && it.input_name !== it.product_name ? it.input_name : undefined,
      }))
      setLines(prev => [...prev, ...add])
      setText('')
    } catch {
      setError(L('Network error. Try again.', 'نیٹ ورک خرابی۔', 'حدثت مشكلة في الاتصال. حاول مرة أخرى.'))
    } finally { setParsing(false) }
  }

  // 📷 Each photo becomes a line. The AI suggests a name; the buyer can edit it, and chooses
  // whether suppliers get the photo itself.
  async function addPhotos(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files).slice(0, 6)) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 6 * 1024 * 1024) {
        setError(L('Photos must be JPG/PNG/WEBP under 6 MB.', 'تصویر JPG/PNG/WEBP اور 6MB سے کم ہو۔', 'يجب أن تكون الصورة بصيغة JPG أو PNG أو WEBP وأقل من ٦ ميغابايت.'))
        continue
      }
      const id = uid()
      const url = URL.createObjectURL(file)
      putDraftBlob(id, file)
      setPhotos(prev => [...prev, { id, file, url, status: 'identifying', share: true }])
      setLines(prev => [...prev, { key: uid(), product_name: '', sector: 'supply_store', quantity: '', unit: 'حبة', details: '', photoId: id }])
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
      .then(r => r.json())
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

  // a material written inside a catalog section (not listed) goes to all of that section's suppliers
  function addFromCatalog({ name, sector, section, sub }: { name: string; sector: Sector; section?: string; sub?: string }) {
    setLines(prev => [...prev, { key: uid(), product_name: name, sector, quantity: '', unit: getDefaultUnit(name, sector) || 'حبة', details: '', ...(sub ? { spec: { sector, sub } } : section ? { spec: { sector, sub: null, section } } : {}) }])
  }

  // 📎 a drawing or specification file for one line (PDF or image, up to 10 MB)
  function attachFile(key: string, file: File | undefined) {
    if (!file) return
    if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      setError(L('Files must be PDF, JPG, PNG or WEBP under 10 MB.', 'فائل PDF یا تصویر اور 10MB سے کم ہو۔', 'يجب أن يكون الملف PDF أو صورة وأقل من ١٠ ميغابايت.'))
      return
    }
    const id = uid()
    putDraftBlob(id, file)
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l
      if (!l.fileId) return { ...l, fileId: id, fileName: file.name }
      if ((l.moreFiles || []).length >= 4) { deleteDraftBlobs([id]); return l }
      return { ...l, moreFiles: [...(l.moreFiles || []), { id, name: file.name }] }
    }))
  }

  function addMore() {
    const box = typeof window !== 'undefined' ? document.getElementById('catalog-inline') : null
    if (box && box.offsetParent !== null) {
      box.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => (box.querySelector('input') as HTMLInputElement | null)?.focus(), 350)
    } else setShowCatalog(true)
  }
  // after the catalog sheet closes, show the list so the buyer sees what was added
  function closeCatalog() {
    setShowCatalog(false)
    setTimeout(() => document.getElementById('request-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }

  function updateLine(key: string, patch: Partial<Line>) { setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l)) }
  function removeLine(key: string) {
    const l = lines.find(x => x.key === key)
    setLines(prev => prev.filter(x => x.key !== key))
    if (l?.fileId) deleteDraftBlobs([l.fileId])
    if (l?.moreFiles?.length) deleteDraftBlobs(l.moreFiles.map(m => m.id))
    if (l?.photoId) { deleteDraftBlobs([l.photoId]); setPhotos(prev => prev.filter(p => p.id !== l.photoId)) }
  }

  // a photo line whose recognition failed and still has no name does not block the request: it is
  // left out (shown as such) until the buyer retries, names it or removes it
  const photoFailed = (l: Line) => !!l.photoId && !l.product_name.trim() && photos.find(p => p.id === l.photoId)?.status === 'failed'
  const sendable = lines.filter(l => !photoFailed(l))
  const skipped = lines.length - sendable.length
  const identifying = photos.some(p => p.status === 'identifying')
  const lineOk = (l: Line) => !!(l.product_name.trim() && parseFloat(l.quantity) > 0 && l.unit)
  const ready = sendable.length > 0 && sendable.every(lineOk) && !!region && (pickup || !!geo || !!address.trim())
  // why the request cannot go yet (shown next to the send button)
  const sendHint = sending ? ''
    : identifying ? L('Recognising the photos…', 'تصاویر پہچانی جا رہی ہیں…', 'جارٍ التعرّف على الصور…')
    : !sendable.length ? L('Add at least one item', 'کم از کم ایک چیز شامل کریں', 'أضف مادة واحدة على الأقل')
    : sendable.some(l => !l.product_name.trim()) ? L('Write the name of every item', 'ہر چیز کا نام لکھیں', 'اكتب اسم كل مادة')
    : sendable.some(l => !(parseFloat(l.quantity) > 0)) ? L('Enter the quantity of every item', 'ہر چیز کی مقدار لکھیں', 'أدخل كمية كل مادة')
    : sendable.some(l => !l.unit) ? L('Choose the unit of every item', 'ہر چیز کی یونٹ منتخب کریں', 'اختر وحدة كل مادة')
    : !region ? L('Choose the region', 'علاقہ منتخب کریں', 'حدّد المنطقة')
    : !pickup && !geo && !address.trim() ? L('Set the delivery location', 'ڈیلیوری کا مقام بتائیں', 'حدّد موقع التوصيل')
    : ''

  // MSA counting: يوم واحد، يومان، 3–10 أيام; ساعات for under a day
  const durationLabel = (h: number) => {
    if (h < 24) return `${h} ${L('hours', 'گھنٹے', 'ساعات')}`
    const d = h / 24
    if (locale === 'en') return `${d} day${d === 1 ? '' : 's'}`
    if (locale === 'ur') return `${d} دن`
    return d === 1 ? 'يوم واحد' : d === 2 ? 'يومان' : `${d} أيام`
  }

  function review() {
    if (!validate()) return
    setConfirming(true)
  }

  const l2n = (l: Line) => l.product_name.trim().slice(0, 40)
  function validate(): boolean {
    setError('')
    if (!sendable.length) { setError(L('Add at least one item.', 'کم از کم ایک چیز شامل کریں۔', 'أضف مادة واحدة على الأقل.')); return false }
    const bad = sendable.find(l => !lineOk(l))
    if (bad) { setError(L('Every line needs a name, a quantity and a unit.', 'ہر لائن میں نام، مقدار اور یونٹ چاہیے۔', 'كل سطر يحتاج إلى اسم وكمية ووحدة.')); return false }
    // materials priced by size/grade need their specs (owner 2026-10-27)
    const noSpec = sendable.find(l => missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length)
    if (noSpec) {
      const m = missingSpecs(noSpec.product_name, noSpec.sector as any, noSpec.specs, noSpec.details, !!noSpec.fileId)
      setSpecsOpen(noSpec.key); updateLine(noSpec.key, { done: false })
      setError(m[0] === '*'
        ? L(`Write the size/specs of «${l2n(noSpec)}» so suppliers can price it.`, `«${l2n(noSpec)}» کا سائز/تفصیل لکھیں۔`, `اكتب مقاس «${l2n(noSpec)}» ومواصفاته ليتمكن الموردون من تسعيره.`)
        : L(`Choose the specs of «${l2n(noSpec)}» (${m.join(', ')}) so suppliers can price it.`, `«${l2n(noSpec)}» کی تفصیلات منتخب کریں (${m.join('، ')})۔`, `اختر مواصفات «${l2n(noSpec)}» (${m.join('، ')}) ليتمكن الموردون من تسعيره.`))
      return false
    }
    // an item written by hand needs at least its main section (owner 2026-10-24)
    const lost = sendable.find(l => !CATALOG_NAMES.has(l.product_name.trim()) && (l.spec ? !choiceDone(l.spec) : !detectSubCategory(l.product_name, l.sector as any)))
    if (lost) { setError(L(`Choose the section of «${l2n(lost)}» so it reaches the right suppliers.`, `«${l2n(lost)}» کا شعبہ منتخب کریں۔`, `اختر قسم «${l2n(lost)}» ليصل إلى الموردين المختصين.`)); return false }
    if (!region) { setError(L('Choose your region.', 'اپنا علاقہ منتخب کریں۔', 'اختر منطقتك.')); return false }
    if (!pickup && !geo && !address.trim()) { setError(L('Set the delivery location: detect it, paste a Google Maps link, or write the address.', 'ڈیلیوری کا مقام بتائیں۔', 'حدّد موقع التوصيل: بتحديد موقعك، أو بلصق رابط خرائط Google، أو بكتابة العنوان.')); return false }
    return true
  }

  async function send() {
    if (sendingRef.current) return // a second tap while the first send is still going
    if (!validate()) { setConfirming(false); return }
    setConfirming(false)
    sendingRef.current = true
    setSending(true)
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
            if (!up) { setError(L(`Could not upload the attachment of «${nameLabel(l.product_name)}». Check your connection and try again, or remove the attachment.`, `«${nameLabel(l.product_name)}» کی فائل اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں یا فائل ہٹا دیں۔`, `تعذّر رفع مرفق «${nameLabel(l.product_name)}». تحقّق من الاتصال وحاول مرة أخرى، أو احذف المرفق.`)); return }
            fileUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
          }
        }
        const attachments: { url: string; name: string }[] = []
        for (const [k, mf] of (l.moreFiles || []).entries()) {
          const rawBlob = await getDraftBlob(mf.id)
          const blob = rawBlob && await (await import('@/lib/compressImage')).compressImage(rawBlob)
          if (!blob) continue
          const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
          const { data: up } = await supabase.storage.from('licenses').upload(`${userId}/spec-${Date.now()}-${i}-${k + 2}.${ext}`, blob, { upsert: false, contentType: blob.type })
          if (!up) { setError(L(`Could not upload «${mf.name}». Try again, or remove it.`, `«${mf.name}» اپ لوڈ نہیں ہو سکی۔`, `تعذّر رفع «${mf.name}». حاول مرة أخرى، أو احذفه.`)); return }
          attachments.push({ url: supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl, name: mf.name })
        }
        if (ph && ph.share) {
          const phFile = await (await import('@/lib/compressImage')).compressImage(ph.file)
          const ext = phFile.type === 'image/png' ? 'png' : phFile.type === 'image/webp' ? 'webp' : 'jpg'
          const path = `${userId}/photo-${Date.now()}-${i}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, phFile, { upsert: false, contentType: phFile.type })
          if (!up) { setError(L(`Could not upload the photo of «${nameLabel(l.product_name)}». Try again, or untick «send the photo».`, `«${nameLabel(l.product_name)}» کی تصویر اپ لوڈ نہیں ہو سکی۔`, `تعذّر رفع صورة «${nameLabel(l.product_name)}». حاول مرة أخرى، أو ألغِ خيار إرسال الصورة.`)); return }
          photoUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
        }
        const st = specText(l.product_name, l.specs)
        const specsObj: Record<string, string> = {}
        for (const [k, v] of Object.entries(l.specs || {})) if ((v || '').trim()) specsObj[k] = v.trim()
        items.push({
          sector: l.sector,
          product_name: l.product_name.trim(),
          sub_category: l.spec ? l.spec.sub : detectSubCategory(`${l.product_name} ${st}`, l.sector as any),
          specification: withBrand([st, l.details.trim()].filter(Boolean).join(' — '), l.brand),
          ...((l.brand || '').trim() ? { brand: l.brand!.trim().slice(0, 80) } : {}),
          quantity: parseFloat(l.quantity),
          unit: l.unit,
          supplier_tiers: null, in_stock: false, max_days: needDays, specsObj,
          spec_file_url: fileUrl || photoUrl,
          spec_file_name: fileUrl ? (l.fileName || L('Attachment', 'فائل', 'مرفق')) : photoUrl ? L('Photo of the item', 'تصویر', 'صورة المادة') : null,
          photo_url: photoUrl || (fileUrl && /\.(jpe?g|png|webp)$/i.test(l.fileName || '') ? fileUrl : null),
          ...(attachments.length ? { attachments } : {}),
          quick: true,
          // a line written by hand (not a catalog product): admins hear about it when an offer is chosen (174)
          custom: !CATALOG_NAMES.has(l.product_name.trim()),
        })
      }
      const first = items[0]
      const { error: insErr } = await supabase.from('rfqs').insert({
        id: rfqIdRef.current,
        contractor_id: userId, sector: first.sector,
        product_name: items.length > 1 ? `${first.product_name} +${items.length - 1} ${L('more', 'مزید', 'أصناف أخرى')}` : first.product_name,
        sectors: Array.from(new Set(items.map(it => it.sector))),
        sub_category: first.sub_category, specification: first.specification, quantity: first.quantity, unit: first.unit,
        items,
        region, city: city || null, delivery_required: !pickup, vat_invoice_required: vatRequired,
        delivery_location: pickup ? null : (address.trim().slice(0, 300) || null),
        delivery_geo: pickup || !geo ? null : `${geo.lat},${geo.lng}`,
        hide_identity: hideIdentity, verified_only: verifiedOnly, nearby_only: false,
        target_tiers: tier === 'all' ? null : [tier],
        notes: notes.trim() || null,
        expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      })
      // 23505 on the primary key: this same request already went through on an earlier try
      const already = !!insErr && (insErr as any).code === '23505' && /rfqs_pkey/.test(insErr.message || '')
      if (insErr && !already) {
        setError((insErr.message || '').includes('rfq_daily_limit')
          ? L('Daily request limit reached. Try again later.', 'روزانہ حد پوری ہو گئی۔', 'وصلت إلى الحد اليومي للطلبات. حاول لاحقاً.')
          : L('Could not send. Try again.', 'نہیں بھیج سکے۔', 'تعذّر إرسال الطلب. حاول مرة أخرى.'))
        return
      }
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
      setDone(true)
    } catch {
      setError(L('Network problem — your request was not sent. It is still saved here; try again.', 'نیٹ ورک کا مسئلہ — درخواست نہیں گئی۔ دوبارہ کوشش کریں۔', 'حدثت مشكلة في الاتصال ولم يُرسل الطلب. ما زال محفوظاً هنا؛ حاول مرة أخرى.'))
    } finally { setSending(false); sendingRef.current = false }
  }

  // Lines keep the Arabic catalog name/unit (that is what routes the request and what suppliers
  // read); en/ur buyers see them in their language.
  const SECTOR_I18N: Record<string, { en: string; ur: string }> = {
    civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'آرکیٹیکچرل' },
    electrical: { en: 'Electrical', ur: 'بجلی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
    equipment: { en: 'Machinery & equipment', ur: 'مشینری اور آلات' }, supply_store: { en: 'Supply store', ur: 'سپلائی اسٹور' },
  }
  const sectorLabel = (s: string) => {
    if (locale !== 'ar' && SECTOR_I18N[s]) return (SECTOR_I18N[s] as any)[locale] || SECTOR_I18N[s].en
    const lab: any = (SECTOR_LABELS as any)[s]
    return typeof lab === 'string' ? lab : (lab?.[locale] || lab?.ar || s)
  }
  const nameLabel = (name: string) => (name ? getProductLabel(name, locale) : name)
  const unitLabel = (u: string) => getUnitLabel(u, locale) || u

  if (done) {
    return (
      <AppShell title={L('Price request', 'قیمت کی درخواست', 'طلب تسعير')} nav={getNav('contractor', locale, '/contractor/rfq/quick')} dir={dir}>
        <div className="max-w-lg mx-auto bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4"><Glyph e="✅" /></div>
          <h2 className="text-2xl font-extrabold text-navy mb-2">{L('Request sent', 'درخواست بھیج دی گئی', 'تم إرسال طلبك')}</h2>
          <p className="text-gray-500 mb-6">{L('Suppliers near you will send their prices. We will notify you as quotes arrive.', 'قریبی سپلائرز قیمتیں بھیجیں گے۔', 'سيرسل الموردون القريبون منك أسعارهم، وسنُبلغك فور وصول أي عرض.')}</p>
          <div className="flex gap-3">
            <Link href="/contractor" className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: '#0B2438' }}>{L('My requests', 'میری درخواستیں', 'طلباتي')}</Link>
            <button type="button" onClick={() => { setDone(false); setLines([]); setPhotos([]); setNotes('') }} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-700">{L('New request', 'نئی درخواست', 'طلب جديد')}</button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={L('Price request', 'قیمت کی درخواست', 'طلب تسعير')} nav={getNav('contractor', locale, '/contractor/rfq/quick')} dir={dir}>
      <div className="max-w-[1700px] mx-auto pb-28 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:items-start">
        {/* A: how to add (main column on desktop, first on mobile) */}
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{L('What do you need?', 'آپ کو کیا چاہیے؟', 'ماذا تحتاج؟')}</h1>
          <p className="text-sm text-gray-500 mt-1">{L('Write it, say it, upload a photo or pick it from the catalog. We will organise it into a list.', 'لکھیں، بولیں، تصویر لیں یا فہرست سے منتخب کریں۔', 'اكتبها، أو تحدّث بها، أو ارفع صورتها، أو اخترها من دليل المواد، وسنرتّبها لك في طلبك.')}</p>
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
          <label htmlFor="quick-text" className="block text-sm font-bold text-navy">{L('Write or paste your list', 'اپنی فہرست لکھیں', 'اكتب أو الصق قائمتك')}</label>
          <textarea id="quick-text" value={text} onChange={e => setText(e.target.value)} rows={4}
            className="input-field text-base leading-relaxed"
            placeholder={L('e.g. 10 bags cement, 500 hollow blocks 20cm, 2 tons rebar 12mm', 'مثلاً: 10 بوری سیمنٹ، 500 بلاک', 'مثلاً: ١٠ أكياس أسمنت، ٥٠٠ بلك ٢٠، ٢ طن حديد ١٢')} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={parseText} disabled={!text.trim() || parsing} className="btn-orange px-5 py-2.5 rounded-xl font-bold disabled:opacity-50">
              {parsing ? L('Reading…', 'پڑھ رہے ہیں…', 'جارٍ القراءة…') : L('Organise my list', 'فہرست ترتیب دیں', 'رتّب قائمتي')}
            </button>
            {canListen && (
              <button type="button" onClick={toggleMic} aria-pressed={listening}
                className={`px-4 py-2.5 rounded-xl font-bold border transition-all ${listening ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' : 'bg-white border-gray-200 text-gray-700'}`}>
                <Glyph e="⏺" /> {listening ? L('Listening… tap to stop', 'سن رہے ہیں… روکنے کے لیے دبائیں', 'جارٍ الاستماع… اضغط للإيقاف') : L('Say it', 'بولیں', 'تحدّث')}
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2.5 rounded-xl font-bold border bg-white border-gray-200 text-gray-700">
              <Glyph e="📷" /> {L('Photo of the item', 'چیز کی تصویر', 'صورة المادة')}
            </button>
            <button type="button" onClick={() => setShowCatalog(true)} className="lg:hidden px-4 py-2.5 rounded-xl font-bold border bg-white border-gray-200 text-gray-700">
              <Glyph e="🔍" /> {L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
            <input ref={specFileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e => { if (fileFor) Array.from(e.target.files || []).forEach(f => attachFile(fileFor, f)); e.target.value = '' }} />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3" role="alert">{error}</div>}
        </div>

        {/* Desktop: the catalog fills the main column; phones open it as a sheet */}
        <div id="catalog-inline" className="hidden lg:block lg:col-start-1 lg:row-start-2 lg:mt-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <h2 className="font-bold text-navy"><Glyph e="🔍" /> {L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}</h2>
          <CatalogBrowser key={startQ + '|' + (startSection || '')} inline initialQuery={startQ} initialSection={startSection as any} locale={locale} picked={lines.map(l => ({ key: l.key, name: l.product_name }))} onPick={addFromCatalog} onRemove={removeLine} />
        </div>

        {/* B: the chosen list + delivery, a side column on desktop (sticky), under the inputs on mobile */}
        <div className="space-y-5 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
        {lines.length === 0 ? (
          <div className="hidden lg:block bg-white rounded-2xl p-6 border border-dashed border-gray-200 text-center text-sm text-gray-400">
            <div className="text-3xl mb-2"><Glyph e="🧾" /></div>
            {L('Your list is empty. Add materials by writing, speaking, a photo or from the catalog.', 'آپ کی فہرست خالی ہے۔', 'طلبك فارغ. أضف موادك بالكتابة أو الصوت أو الصورة أو من دليل المواد.')}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="request-list" className="font-bold text-navy scroll-mt-24">{L('Your list', 'آپ کی فہرست', 'قائمتك')} <span className="text-gray-400 font-normal">({lines.length})</span></h2>
              <span className="text-xs text-gray-400">{L('Check each line before sending', 'بھیجنے سے پہلے چیک کریں', 'راجع كل سطر قبل الإرسال')}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1.5"><SellerIcon name="checkCircle" className="w-4 h-4 text-[#0F6E56]" />{L('Saved on this device, you can leave and come back', 'اس ڈیوائس پر محفوظ ہے، واپس آ سکتے ہیں', 'محفوظة على جهازك، يمكنك المغادرة والعودة لاحقاً')}</span>
              <button type="button" onClick={() => { if (window.confirm(L('Clear the whole list?', 'پوری فہرست صاف کریں؟', 'هل تريد مسح القائمة بالكامل؟'))) startOver() }} className="font-bold text-gray-500 hover:text-red-500">
                {L('Start over', 'نئے سرے سے', 'ابدأ من جديد')}
              </button>
            </div>
            {lines.map(l => {
              const ph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
              return (
                l.done ? (
                  <div key={l.key} className="rounded-xl border border-[#0F6E56]/30 bg-[#0F6E56]/[0.03] flex items-center gap-3 p-2.5">
                    <button type="button" onClick={() => updateLine(l.key, { done: false })} className="flex-1 min-w-0 flex items-center gap-3 text-start"
                      aria-label={L('Edit', 'ترمیم', 'تعديل')}>
                      {ph ? <img src={ph.url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                        : <img src={productImageUrl(l.product_name)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                            onError={(e: any) => imgFallback(e, detectSubCategory(l.product_name, l.sector as any))} />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-sm text-navy truncate" dir="auto">{nameLabel(l.product_name)}</span>
                        <span className="block text-xs text-gray-500 truncate" dir="auto">
                          <b className="text-[#8F6820]">{l.quantity} {unitLabel(l.unit)}</b>
                          {Object.values(l.specs || {}).filter(v => (v || '').trim()).length ? ' · ' + Object.values(l.specs || {}).filter(v => (v || '').trim()).join('، ') : ''}
                          {l.details.trim() ? ' · ' + l.details.trim() : ''}
                          {l.fileId ? ' · ' : ''}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-gray-400 shrink-0">✎ {L('Edit', 'ترمیم', 'تعديل')}</span>
                    </button>
                    <button type="button" onClick={() => removeLine(l.key)} className="min-w-10 min-h-10 grid place-items-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 text-xl leading-none shrink-0" aria-label={L('Remove', 'ہٹائیں', 'حذف')}>×</button>
                  </div>
                ) :
                <div key={l.key} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex gap-3 items-start">
                    {ph ? <img src={ph.url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-100" />
                      : l.product_name ? <img src={productImageUrl(l.product_name)} alt="" loading="lazy" className="w-16 h-16 rounded-lg object-contain shrink-0 border border-gray-100 bg-gray-50"
                          onError={(e: any) => imgFallback(e, detectSubCategory(l.product_name, l.sector as any))} /> : null}
                    <div className="flex-1 min-w-0 space-y-1">
                      <input value={nameLabel(l.product_name)} onChange={e => updateLine(l.key, { product_name: e.target.value === nameLabel(l.product_name) ? l.product_name : e.target.value, spec: undefined })} aria-label={L('Item name', 'نام', 'اسم المادة')}
                        className="input-field font-semibold" placeholder={ph?.status === 'identifying' ? L('Recognising the photo…', 'تصویر پہچان رہے ہیں…', 'جارٍ التعرّف على الصورة…') : L('Item name', 'نام', 'اسم المادة')} />
                      {locale !== 'ar' && l.original && !ph && (
                        <p className="text-[11px] font-semibold text-gray-700" dir="auto">= {l.original}</p>
                      )}
                      {ph && ph.status === 'done' && (
                        <p className="text-[11px] text-gray-500"><Glyph e="🤖" /> {L('Suggested from the photo, please check it', 'تصویر سے تجویز، چیک کریں', 'اقتراح من الصورة، تأكّد منه')}{ph.confidence === 'low' ? ' · ' + L('not sure', 'یقینی نہیں', 'غير متأكد') : ''}
                          {locale !== 'ar' && ph.localName && <span className="block font-semibold text-gray-700" dir="auto">= {ph.localName}</span>}
                          {ph.question && ph.confidence !== 'high' && <span className="block font-semibold text-[#8F6820]" dir="auto"><Glyph e="❓" /> {ph.question}</span>}
                        </p>
                      )}
                      {ph && ph.status === 'failed' && (l.product_name.trim()
                        ? <p className="text-[11px] text-gray-500">{L('Could not recognise the photo; check the name you wrote.', 'تصویر پہچانی نہیں جا سکی؛ لکھا ہوا نام چیک کریں۔', 'تعذّر التعرّف على الصورة؛ تأكّد من الاسم الذي كتبته.')}</p>
                        : <div className="rounded-lg border border-[#D4A543]/50 bg-[#D4A543]/10 p-2 space-y-1.5" role="status">
                            <p className="text-xs font-bold text-[#8F6820]"><Glyph e="⚠" /> {L('The photo could not be read — retry or remove the line, or write the item name. The rest of your request can still be sent.', 'تصویر پڑھی نہیں جا سکی — دوبارہ کوشش کریں یا لائن ہٹا دیں، یا چیز کا نام لکھیں۔ باقی درخواست بھیجی جا سکتی ہے۔', 'تعذّر رفع الصورة — أعد المحاولة أو احذف السطر، أو اكتب اسم المادة. يمكنك إرسال بقية الطلب.')}</p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => retryIdentify(ph.id)} className="min-h-10 px-3 rounded-lg border border-[#0F6E56] text-[#0F6E56] bg-white text-xs font-bold"><Glyph e="🔁" /> {L('Retry', 'دوبارہ کوشش کریں', 'أعد المحاولة')}</button>
                              <button type="button" onClick={() => removeLine(l.key)} className="min-h-10 px-3 rounded-lg border border-red-200 text-red-600 bg-white text-xs font-bold"><Glyph e="🗑" /> {L('Remove the line', 'لائن ہٹائیں', 'احذف السطر')}</button>
                            </div>
                          </div>)}
                      {l.suggestion && l.suggestion.name !== l.product_name && (
                        <button type="button" onClick={() => updateLine(l.key, { product_name: l.suggestion!.name, sector: l.suggestion!.sector, suggestion: null })}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-dashed hover:bg-[#0F6E56]/5" style={{ borderColor: '#0F6E56', color: '#0F6E56' }}>
                          <Glyph e="📦" /> {L('Did you mean', 'کیا آپ کا مطلب', 'هل تقصد')}: {nameLabel(l.suggestion.name)}؟
                        </button>
                      )}
                      {l.product_name.trim() && !CATALOG_NAMES.has(l.product_name.trim())
                        ? <div className="space-y-1.5">
                            <LineSpecialty name={l.product_name} sector={l.sector} value={l.spec} locale={locale}
                              onChange={v => updateLine(l.key, { spec: v, sector: v.sector })} />
                            {!l.photoId && !(l.fileId && /\.(jpe?g|png|webp)$/i.test(l.fileName || '')) && (
                              <button type="button" onClick={() => { setFileFor(l.key); specFileRef.current?.click() }}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#D4A543] text-[#8F6820] bg-[#D4A543]/10">
                                <Glyph e="📷" /> {L('Add a photo so suppliers understand your request', 'تصویر لگائیں تاکہ سپلائرز آپ کی درخواست سمجھیں', 'أضف صورة ليفهم الموردون طلبك')}
                              </button>
                            )}
                          </div>
                        : <div className="text-[11px] text-gray-400">{sectorLabel(l.sector)}</div>}
                    </div>
                    <button type="button" onClick={() => removeLine(l.key)} className="min-w-10 min-h-10 grid place-items-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 text-xl leading-none shrink-0" aria-label={L('Remove', 'ہٹائیں', 'حذف')}>×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" inputMode="decimal" value={l.quantity} onChange={e => updateLine(l.key, { quantity: toLatinNumber(e.target.value) })}
                      className="input-field" placeholder={L('Quantity', 'مقدار', 'الكمية')} aria-label={L('Quantity', 'مقدار', 'الكمية')} />
                    <select value={l.unit} onChange={e => updateLine(l.key, { unit: e.target.value })} className="input-field" aria-label={L('Unit', 'یونٹ', 'الوحدة')}>
                      <option value="">{L('Unit', 'یونٹ', 'الوحدة')}</option>
                      {/* a product with its own order units shows only those; otherwise its specialty's logical units (owner 2026-10-19) */}
                      {Array.from(new Set([...(unitChoicesFor(l.product_name, l.sector as any) || UNITS), ...(l.unit ? [l.unit] : [])])).map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
                    </select>
                  </div>
                  {(() => {
                    const needWritten = specsRequired(l.product_name, l.sector as any) && !getProductSpecs(l.product_name).some(f => f.key !== 'unit')
                    const miss = needWritten && !l.details.trim() && !l.fileId
                    return (<>
                      {brandApplies(l.product_name, l.sector as any) && (
                        <input value={l.brand || ''} onChange={e => updateLine(l.key, { brand: e.target.value.slice(0, 80) })} className="input-field text-sm"
                          placeholder={L('Brand or product name (optional), e.g. Fosroc Renderoc', 'برانڈ یا پروڈکٹ کا نام (اختیاری)', 'الماركة أو اسم المنتج (اختياري)، مثل: فوسروك رندروك')} />
                      )}
                      <input value={l.details} onChange={e => updateLine(l.key, { details: e.target.value })}
                        className={`input-field text-sm ${miss ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
                        placeholder={needWritten
                          ? L('Size and specs (required): e.g. length, width, thickness, grade', 'سائز اور تفصیل (ضروری)', 'المقاس والمواصفات (مطلوب): مثل الطول والعرض والسماكة والدرجة')
                          : L('Notes for the supplier (optional)', 'سپلائر کے لیے نوٹ (اختیاری)', 'ملاحظات للمورد (اختياري)')} />
                    </>)
                  })()}
                  {(() => {
                    const fields = getProductSpecs(l.product_name).filter(f => f.key !== 'unit')
                    const n = fields.filter(f => (l.specs?.[f.key] || '').trim()).length
                    const req = fields.length > 0 && specsRequired(l.product_name, l.sector as any)
                    const missing = req && n < fields.length
                    const open = specsOpen === l.key || missing
                    return (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {fields.length > 0 && (
                            <button type="button" onClick={() => setSpecsOpen(open ? null : l.key)} aria-expanded={open}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${missing ? 'border-[#D4A543] text-[#8F6820] bg-[#D4A543]/10' : n ? 'border-[#0F6E56] text-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 text-gray-600'}`}>
                              <Glyph e="⚙" /> {L('Specifications', 'تفصیلات', 'المواصفات')}{req ? L(' (required)', ' (ضروری)', ' (مطلوبة)') : ''}{n ? ` (${n})` : ''} {open ? '▴' : '▾'}
                            </button>
                          )}
                          <button type="button" onClick={() => { setFileFor(l.key); specFileRef.current?.click() }}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border max-w-[14rem] truncate ${l.fileId ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-gray-200 text-gray-600'}`}>
                            <Glyph e="📎" /> {l.fileId ? (l.fileName || L('File attached', 'فائل منسلک', 'ملف مرفق')) : L('Attach a drawing or file', 'ڈرائنگ یا فائل', 'أرفق مخططاً أو ملفاً')}
                          </button>
                          {l.fileId && (
                            <button type="button" onClick={() => { deleteDraftBlobs([l.fileId!]); const [nx, ...rest] = l.moreFiles || []; updateLine(l.key, nx ? { fileId: nx.id, fileName: nx.name, moreFiles: rest } : { fileId: undefined, fileName: undefined }) }}
                              className="min-w-10 min-h-10 grid place-items-center rounded-lg text-base text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label={L('Remove file', 'فائل ہٹائیں', 'احذف الملف')}>×</button>
                          )}
                          {(l.moreFiles || []).map(mf => (
                            <span key={mf.id} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-purple-300 text-purple-700 bg-purple-50 max-w-[12rem]">
                              <span className="truncate"><Glyph e="📎" /> {mf.name}</span>
                              <button type="button" onClick={() => { deleteDraftBlobs([mf.id]); updateLine(l.key, { moreFiles: (l.moreFiles || []).filter(x => x.id !== mf.id) }) }} className="min-w-10 min-h-10 -my-2 grid place-items-center text-base text-gray-400 hover:text-red-500" aria-label={L('Remove file', 'فائل ہٹائیں', 'احذف الملف')}>×</button>
                            </span>
                          ))}
                          {l.fileId && (l.moreFiles || []).length < 4 && (
                            <button type="button" onClick={() => { setFileFor(l.key); specFileRef.current?.click() }}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-dashed border-gray-300 text-gray-600">+ {L('Another file or photo', 'ایک اور فائل', 'ملف أو صورة أخرى')}</button>
                          )}
                        </div>
                        {open && fields.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-2 rounded-xl bg-gray-50 p-2.5">
                            {fields.map(f => {
                              const v = l.specs?.[f.key] || ''
                              const custom = !!v && !f.options.includes(v)
                              const setV = (val: string) => updateLine(l.key, { specs: { ...(l.specs || {}), [f.key]: val } })
                              return (
                                <label key={f.key} className="block">
                                  <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{locale === 'ar' ? f.ar : f.en}{req ? ' *' : ''}</span>
                                  <select value={custom ? '__other' : v} onChange={e => setV(e.target.value === '__other' ? ' ' : e.target.value)} className={`input-field text-sm ${req && !v.trim() ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}>
                                    <option value="">{req ? L('Choose', 'منتخب کریں', 'اختر') : L('Any', 'کوئی بھی', 'أي')}</option>
                                    {f.options.map(o => <option key={o} value={o}>{getOptionLabel(o, locale)}</option>)}
                                    <option value="__other">{L('Other…', 'دیگر…', 'أخرى…')}</option>
                                  </select>
                                  {custom && (
                                    <input value={v.trim()} onChange={e => setV(e.target.value || ' ')} className="input-field text-sm mt-1"
                                      placeholder={L('Write it', 'لکھیں', 'اكتبها')} />
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                  {ph && (
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                      <input type="checkbox" checked={ph.share} onChange={e => setPhotos(prev => prev.map(p => p.id === ph.id ? { ...p, share: e.target.checked } : p))} className="w-4 h-4 accent-[#0F6E56]" />
                      {L('Send this photo to suppliers so they quote the same item', 'یہ تصویر سپلائرز کو بھیجیں', 'أرسل الصورة للموردين ليسعّروا المادة نفسها')}
                    </label>
                  )}
                  <button type="button" onClick={() => { setSpecsOpen(null); updateLine(l.key, { done: true }) }}
                    disabled={!(l.product_name.trim() && parseFloat(l.quantity) > 0 && l.unit) || missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length > 0}
                    className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#0F6E56' }}>
                    ✓ {!(parseFloat(l.quantity) > 0) ? L('Enter the quantity to save', 'محفوظ کرنے کے لیے مقدار لکھیں', 'أدخل الكمية للحفظ') : missingSpecs(l.product_name, l.sector as any, l.specs, l.details, !!l.fileId).length ? L('Enter the specs to save', 'محفوظ کرنے کے لیے تفصیل', 'أدخل المواصفات للحفظ') : L('Save', 'محفوظ کریں', 'حفظ')}
                  </button>
                </div>
              )
            })}
            <button type="button" onClick={addMore}
              className="lg:hidden w-full py-3 rounded-xl border-2 border-dashed border-[#D4A543]/50 text-[#8F6820] font-bold text-sm hover:bg-[#D4A543]/5 transition-all">
              + {L('Add another material', 'ایک اور سامان شامل کریں', 'أضف مادة أخرى')}
            </button>
          </div>
        )}

        {/* C: delivery + options, under the list */}
        {lines.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={L('Receiving', 'وصولی', 'طريقة الاستلام')}>
              {([[false, 'truck', L('Delivery', 'ڈیلیوری', 'توصيل'), L('The supplier delivers to my site', 'سپلائر پہنچائے گا', 'يوصل المورد إلى موقعي')],
                 [true, 'store', L('Pickup', 'خود لوں گا', 'استلام'), L('I collect from the supplier', 'میں خود لوں گا', 'أستلم من المورد بنفسي')]] as [boolean, string, string, string][]).map(([v, ic, t, sub]) => (
                <button key={String(v)} type="button" role="radio" aria-checked={pickup === v} onClick={() => setPickup(v)}
                  className={`rounded-xl border-2 p-3 text-start transition-all ${pickup === v ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${pickup === v ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-[#0B2438]'}`}>
                      <SellerIcon name={ic} className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-navy text-sm">{t}</span>
                      <span className="block text-[11px] text-gray-500 mt-0.5">{sub}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <h2 className="font-bold text-navy flex items-center gap-1.5"><SellerIcon name="pin" className="w-4 h-4 text-[#D4A543]" />{pickup ? L('Your area', 'آپ کا علاقہ', 'منطقتك') : L('Delivery to', 'ڈیلیوری', 'التوصيل إلى')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <select value={region} onChange={e => { setRegion(e.target.value); setCity('') }} className="input-field" aria-label={L('Region', 'علاقہ', 'المنطقة')}>
                <option value="">{L('Region', 'علاقہ', 'المنطقة')}</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={city} onChange={e => setCity(e.target.value)} className="input-field" aria-label={L('City', 'شہر', 'المدينة')} disabled={!region}>
                <option value="">{L('City', 'شہر', 'المدينة')}</option>
                {((CITIES_BY_REGION as any)[region] || []).map((c: any) => <option key={c.ar} value={c.ar}>{locale === 'en' ? c.en : c.ar}</option>)}
              </select>
            </div>
            {!pickup && (
              <div className="space-y-2">
                <LocationPicker lat={geo?.lat ?? null} lng={geo?.lng ?? null} locale={locale} onChange={(a: number, b: number) => { setGeo({ lat: a, lng: b }); setGeoFromProfile(false) }} />
                <input value={address} onChange={e => setAddress(e.target.value)} maxLength={300} className="input-field text-sm"
                  placeholder={geo ? L('Address details: district, street, landmark (optional)', 'پتہ: محلہ، گلی، نشانی (اختیاری)', 'تفاصيل العنوان: الحي، الشارع، علامة مميزة (اختياري)')
                    : L('Address: district, street, landmark (required if no map location)', 'پتہ (اگر نقشے پر مقام نہیں تو ضروری)', 'العنوان: الحي، الشارع، علامة مميزة (مطلوب إن لم تحدّد الموقع)')} />
                {geo && geoFromProfile && <p className="text-[11px] text-gray-500">{L('Location filled from your profile — change it if this delivery goes elsewhere.', 'مقام آپ کی پروفائل سے لیا گیا — ضرورت ہو تو بدلیں۔', 'عُبّئ الموقع من ملفك الشخصي — غيّره إن كان التوصيل إلى مكان آخر.')}</p>}
                <p className="text-[11px] text-gray-400"><Glyph e="🔒" /> {L('Only the supplier you choose sees the exact location.', 'صرف منتخب سپلائر درست مقام دیکھے گا۔', 'لا يرى الموقع الدقيق إلا المورد الذي تختاره.')}</p>
              </div>
            )}
            {/* when the buyer needs the prices — visible, with a same-day option (persona: the villa contractor) */}
            <div>
              <div className="text-xs font-bold text-gray-600 mb-1.5">{L('When do you need the prices?', 'قیمتیں کب تک چاہئیں؟', 'متى تحتاج الأسعار؟')}</div>
              <div role="radiogroup" aria-label={L('When do you need the prices?', 'قیمتیں کب تک چاہئیں؟', 'متى تحتاج الأسعار؟')} className="flex flex-wrap gap-1.5">
                {([[6, L('Today', 'آج', 'اليوم')], [24, L('Tomorrow', 'کل', 'غداً')], [48, L('2 days', '2 دن', 'يومان')], [72, L('3 days', '3 دن', '3 أيام')], [168, L('A week', 'ایک ہفتہ', 'أسبوع')]] as [number, string][]).map(([h, lab]) => (
                  <button key={h} type="button" role="radio" aria-checked={hours === h} onClick={() => setHours(h)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold ${hours === h ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-600 border-gray-200'}`}>{lab}</button>
                ))}
              </div>
            </div>
            {/* always visible (owner 2026-10-19: a folded «خيارات إضافية» went unnoticed) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              <div className="text-sm font-bold text-[#0B2438]">{L('More options (optional)', 'مزید اختیارات (اختیاری)', 'خيارات إضافية (اختياري)')}</div>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-sm font-bold text-[#0B2438] mb-2">{L('When do you need delivery?', 'ڈیلیوری کب چاہیے؟', 'متى تحتاج التسليم؟')}</div>
                  <div role="radiogroup" aria-label={L('When do you need delivery?', 'ڈیلیوری کب چاہیے؟', 'متى تحتاج التسليم؟')} className="flex flex-wrap gap-1.5">
                    {([[1, L('Within a day', 'ایک دن میں', 'خلال يوم')], [3, L('Within 3 days', '3 دن میں', 'خلال 3 أيام')], [7, L('Within a week', 'ایک ہفتے میں', 'خلال أسبوع')], [null, L('Not urgent', 'جلدی نہیں', 'غير مستعجل')]] as [number | null, string][]).map(([d, lab]) => (
                      <button key={String(d)} type="button" role="radio" aria-checked={needDays === d} onClick={() => setNeedDays(d)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold ${needDays === d ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-600 border-gray-200'}`}>{lab}</button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{L('Suppliers see it on every item, so they quote only what they can deliver in time.', 'سپلائرز اسے ہر چیز پر دیکھتے ہیں تاکہ وہی قیمت دیں جو وقت پر پہنچا سکیں۔', 'يظهر للموردين على كل مادة ليسعّروا ما يستطيعون تسليمه في الوقت المطلوب.')}</p>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-field text-sm" placeholder={L('Notes for suppliers (optional)', 'نوٹس (اختیاری)', 'ملاحظات للموردين (اختياري)')} />
                <div>
                  <div className="text-sm font-bold text-[#0B2438] mb-2">{L('Who should price it?', 'کون قیمت دے؟', 'من تريد أن يسعّر لك؟')}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([['all', L('All suppliers', 'سب سپلائرز', 'كل الموردين'), L('The most offers', 'زیادہ پیشکشیں', 'أكثر عروض')], ...TIERS.map(k => [k, tierLabel(k, locale as any, false), tierHint(k, locale as any)])] as [string, string, string][]).map(([k, label, hint]) => (
                      <button key={k} type="button" onClick={() => setTier(k as any)} aria-pressed={tier === k}
                        className={`p-2.5 rounded-xl border-2 text-start transition-colors ${tier === k ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 bg-white hover:border-[#D4A543]'}`}>
                        <div className="text-[13px] font-bold text-[#0B2438] leading-snug">{tier === k ? '✓ ' : ''}{label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={hideIdentity} onChange={e => setHideIdentity(e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                  {L('Hide my name until I choose a supplier', 'سپلائر چننے تک نام چھپائیں', 'إخفاء اسمي حتى أختار المورد')}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={vatRequired} onChange={e => setVatRequired(e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                  {L('I need a VAT tax invoice', 'مجھے VAT ٹیکس انوائس چاہیے', 'أحتاج فاتورة ضريبية')}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                  {L('Only verified (trusted) suppliers', 'صرف تصدیق شدہ سپلائرز', 'الموردون الموثّقون والمعتمدون فقط')}
                </label>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* owner 2026-10-17: the send bar is always there once there is an item; the review dialog
          and validate() still catch incomplete lines */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.9rem_+_env(safe-area-inset-bottom))] lg:bottom-0 bg-white border-t border-gray-200 px-4 pt-3 z-30" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-3 lg:pe-24">
            <div className="min-w-0">
              <span className="block text-sm text-gray-500">{locale === 'ar' ? arMaterials(sendable.length) : `${sendable.length} ${L('items', 'اشیاء', '')}`}</span>
              {sendHint && <span className="block text-xs font-bold text-[#8F6820] truncate" role="status">{sendHint}</span>}
              {!sendHint && skipped > 0 && <span className="block text-xs text-gray-500 truncate">{L(`${skipped} unnamed photo line(s) will be left out`, `بغیر نام کی ${skipped} تصویری لائنیں شامل نہیں ہوں گی`, `لن يُرسل ${skipped === 1 ? 'سطر الصورة غير المسمّى' : arCount(skipped, 'سطر واحد', 'سطران', 'أسطر', 'سطراً') + ' من الصور غير المسمّاة'}`)}</span>}
            </div>
            <button type="button" onClick={review} disabled={sending || identifying || !sendable.length}
              className="btn-orange px-6 py-3 rounded-xl font-extrabold disabled:opacity-50">
              {sending ? L('Sending…', 'بھیج رہے ہیں…', 'جارٍ الإرسال…') : ready ? L('Send for prices', 'قیمت منگوائیں', 'أرسل طلب التسعير') : L('Complete the lines', 'لائنیں مکمل کریں', 'أكمل البيانات')}
            </button>
          </div>
        </div>
      )}
      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setConfirming(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h2 id="confirm-title" className="font-extrabold text-navy text-lg">{L('Review your request', 'درخواست کا جائزہ لیں', 'راجع طلبك قبل الإرسال')}</h2>
              <p className="text-xs text-gray-500 mt-1">{L('Check every detail; suppliers price exactly what is here.', 'ہر تفصیل چیک کریں۔', 'تأكّد من كل التفاصيل، فالموردون يسعّرون ما هو مكتوب هنا بالضبط.')}</p>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              <div>
                <div className="text-xs font-bold text-gray-500 mb-2">{L('Materials', 'سامان', 'المواد')} ({sendable.length})</div>
                <ol className="space-y-2">
                  {sendable.map((l, i) => {
                    const sp = Object.values(l.specs || {}).filter(v => (v || '').trim())
                    return (
                      <li key={l.key} className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-navy" dir="auto">{i + 1}. {nameLabel(l.product_name)}</span>
                          <span className="font-bold text-[#8F6820] whitespace-nowrap">{l.quantity} {unitLabel(l.unit)}</span>
                        </div>
                        {(sp.length > 0 || l.details.trim() || l.fileId) && (
                          <div className="text-xs text-gray-500 mt-1" dir="auto">
                            {[sp.join('، '), l.details.trim(), l.fileId ? '' + (l.fileName || L('Attachment', 'فائل', 'مرفق')) : ''].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                <dt className="text-gray-500">{L('Receiving', 'وصولی', 'الاستلام')}</dt>
                <dd className="font-semibold"><span className="inline-flex items-center gap-1.5"><SellerIcon name={pickup ? 'store' : 'truck'} className="w-4 h-4 text-[#0F6E56]" />{pickup ? L('Pickup from the supplier', 'سپلائر سے خود', 'استلام من المورد') : L('Delivery', 'ڈیلیوری', 'توصيل')}</span></dd>
                <dt className="text-gray-500">{L('Area', 'علاقہ', 'المنطقة')}</dt>
                <dd className="font-semibold">{[city, region].filter(Boolean).join('، ')}</dd>
                {!pickup && (<>
                  <dt className="text-gray-500">{L('Location', 'مقام', 'الموقع')}</dt>
                  <dd className="font-semibold" dir="auto">
                    {geo ? <a href={`https://www.google.com/maps?q=${geo.lat},${geo.lng}`} target="_blank" rel="noopener noreferrer" className="text-[#0F6E56] underline inline-flex items-center gap-1"><SellerIcon name="pin" className="w-3.5 h-3.5" />{L('On the map', 'نقشے پر', 'على الخريطة')}</a> : null}
                    {geo && address.trim() ? ' · ' : ''}{address.trim()}
                  </dd>
                </>)}
                <dt className="text-gray-500">{L('Prices within', 'قیمتیں', 'مهلة التسعير')}</dt>
                <dd className="font-semibold">{durationLabel(hours)}</dd>
                {needDays != null && (<>
                  <dt className="text-gray-500">{L('Delivery needed', 'ڈیلیوری', 'التسليم')}</dt>
                  <dd className="font-semibold">{needDays === 1 ? L('Within a day', 'ایک دن میں', 'خلال يوم') : needDays === 7 ? L('Within a week', 'ایک ہفتے میں', 'خلال أسبوع') : L(`Within ${needDays} days`, `${needDays} دن میں`, `خلال ${needDays} ${needDays <= 10 ? 'أيام' : 'يوماً'}`)}</dd>
                </>)}
                {notes.trim() && (<>
                  <dt className="text-gray-500">{L('Notes', 'نوٹس', 'ملاحظات')}</dt>
                  <dd className="font-semibold whitespace-pre-wrap" dir="auto">{notes.trim()}</dd>
                </>)}
              </dl>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {hideIdentity && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{L('Name hidden', 'نام چھپا', 'الاسم مخفي')}</span>}
                {vatRequired && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{L('VAT invoice', 'VAT انوائس', 'فاتورة ضريبية')}</span>}
                {verifiedOnly && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{L('Verified suppliers only', 'صرف تصدیق شدہ', 'الموردون الموثّقون فقط')}</span>}
                {tier !== 'all' && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{tierLabel(tier, locale as any, false)}</span>}
                {photos.some(p => p.share) && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{L('Photos shared', 'تصاویر شیئر', 'الصور مرفقة')}</span>}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-2" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <button type="button" onClick={() => setConfirming(false)} className="py-3 rounded-xl border border-gray-200 font-bold text-gray-700">
                ✎ {L('Edit', 'ترمیم', 'تعديل')}
              </button>
              <button type="button" onClick={send} disabled={sending} className="btn-orange py-3 rounded-xl font-extrabold disabled:opacity-50">
                {L('Confirm and send', 'تصدیق کر کے بھیجیں', 'تأكيد وإرسال')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCatalog && (
        <CatalogPicker locale={locale} onClose={closeCatalog} initialQuery={startQ} initialSection={startSection as any}
          picked={lines.map(l => ({ key: l.key, name: l.product_name }))}
          onRemove={(key: string) => removeLine(key)}
          onPick={addFromCatalog} />
      )}
    </AppShell>
  )
}
