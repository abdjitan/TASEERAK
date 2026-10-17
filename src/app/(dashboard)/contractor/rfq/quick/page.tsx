'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { REGIONS, CITIES_BY_REGION, SECTOR_LABELS, SECTOR_PRODUCTS, getProductLabel, getUnitLabel, unitOptionsFor, detectSubCategory, getDefaultUnit, getProductSpecs, getOptionLabel, type Sector } from '@/types'
import CatalogPicker, { CatalogBrowser } from '@/components/shared/CatalogPicker'
import LocationPicker from '@/components/shared/LocationPicker'
import SellerIcon from '@/components/shared/SellerIcon'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { normQuery } from '@/lib/productSearch'
import { loadLocalDraft, saveLocalDraft, clearLocalDraft, putDraftBlob, getDraftBlob, deleteDraftBlobs } from '@/lib/localDraft'
import Glyph from '@/components/shared/Glyph'
import LineSpecialty from '@/components/shared/LineSpecialty'

// The one request page, for anyone: write, dictate, photograph or pick from the catalog; we turn
// it into lines the buyer can fix, then send. Each line can open its specifications (PRODUCT_SPECS)
// and carry a drawing/file. Reorder (?from=<rfq>) and saved drafts (?draft=<id>) open here too.

// Every catalog product name — a line outside it gets the «which specialty?» chooser.
const CATALOG_NAMES = new Set<string>(Object.values(SECTOR_PRODUCTS).flat() as string[])
const UNITS = ['حبة', 'كيس', 'طن', 'م³', 'م²', 'متر', 'م.ط', 'لفة', 'كرتون', 'سطل', 'لوح', 'جالون', 'لتر', 'كغ', 'طقم', 'نقلة', 'يوم', 'ساعة', 'عدد']

type Line = {
  key: string
  product_name: string
  sector: string
  quantity: string
  unit: string
  details: string
  photoId?: string
  done?: boolean   // «حفظ» pressed: shown as a compact row until tapped again
  original?: string // what the buyer wrote, when it differs from the Arabic name suppliers see
  suggestion?: { name: string; sector: string } | null
  specs?: Record<string, string> // chosen specification values (PRODUCT_SPECS keys, without 'unit')
  fileId?: string                // attached drawing/spec file, kept in IndexedDB until sending
  fileName?: string
  spec?: { sector: string; sub: string | null } // a «not in the list» item filed under a specialty by the buyer
}
type Photo = {
  id: string
  file: File
  url: string
  status: 'identifying' | 'done' | 'failed'
  share: boolean
  confidence?: string
  localName?: string // the AI's name in the buyer's language (the line itself keeps the Arabic trade name)
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
  if (st && details.startsWith(st)) details = details.slice(st.length).replace(/^\s*—\s*/, '')
  return {
    key: uid(), product_name: it.product_name || '', sector: it.sector || 'supply_store',
    quantity: it.quantity ? String(it.quantity) : '', unit: it.unit || '', details, specs,
    done: !!(it.product_name && Number(it.quantity) > 0 && it.unit),
  }
}

export default function QuickRequestPage() {
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
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
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
            if (r.region && r.region !== 'كل المناطق') { setRegion(r.region); setCity(r.city || '') }
            setNotes(r.notes || ''); setHideIdentity(r.hide_identity ?? true)
            setVatRequired(!!r.vat_invoice_required); setVerifiedOnly(!!r.verified_only); setPickup(r.delivery_required === false)
          }
        } else if (dId) {
          const { data: dr } = await supabase.from('rfq_drafts').select('*').eq('id', dId).single()
          const dd: any = dr?.data
          if (dd) {
            setDraftId(dr.id)
            if (Array.isArray(dd.items)) setLines(dd.items.map(lineFromItem))
            if (dd.region) { setRegion(dd.region); setCity(dd.city || '') }
            setNotes(dd.notes || ''); setHideIdentity(dd.hideIdentity ?? true)
            setVatRequired(!!dd.vatRequired); setVerifiedOnly(!!dd.verifiedOnly); setPickup(dd.deliveryRequired === false)
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
      text, lines, region, city, hours, notes, hideIdentity, vatRequired, verifiedOnly, pickup, geo, address,
      photos: photos.map(p => ({ id: p.id, name: p.file.name, type: p.file.type, status: p.status, share: p.share, confidence: p.confidence, localName: p.localName })),
    }), 300)
    return () => clearTimeout(t)
  }, [restored, userId, done, text, lines, region, city, hours, notes, hideIdentity, vatRequired, verifiedOnly, pickup, geo, address, photos])

  function startOver() {
    deleteDraftBlobs([...photos.map(p => p.id), ...lines.map(l => l.fileId).filter(Boolean) as string[]])
    if (userId) clearLocalDraft('quick:' + userId)
    setLines([]); setPhotos([]); setText(''); setNotes(''); setError('')
  }

  // 🎤 Speech to text (browser built-in). The transcript is appended to the text box.
  function toggleMic() {
    if (listening) { try { recRef.current?.stop() } catch {} ; return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = locale === 'en' ? 'en-US' : locale === 'ur' ? 'ur-PK' : 'ar-SA'
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
    fetch('/api/quick-request/identify', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(j => {
        const s = j?.suggestion
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: s ? 'done' : 'failed', confidence: s?.confidence, localName: s?.local_name || undefined } : p))
        if (s) setLines(prev => prev.map(l => l.photoId === id && !l.product_name ? { ...l, product_name: s.product_name, sector: s.sector, details: s.details || '', unit: s.unit || l.unit, suggestion: s.catalog_suggestion || null } : l))
      })
      .catch(() => setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'failed' } : p)))
  }

  function addFromCatalog({ name, sector }: { name: string; sector: Sector }) {
    setLines(prev => [...prev, { key: uid(), product_name: name, sector, quantity: '', unit: getDefaultUnit(name, sector) || 'حبة', details: '' }])
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
      if (l.fileId) deleteDraftBlobs([l.fileId])
      return { ...l, fileId: id, fileName: file.name }
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
    if (l?.photoId) { deleteDraftBlobs([l.photoId]); setPhotos(prev => prev.filter(p => p.id !== l.photoId)) }
  }

  const ready = lines.length > 0 && lines.every(l => l.product_name.trim() && parseFloat(l.quantity) > 0 && l.unit) && !!region

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

  function validate(): boolean {
    setError('')
    if (!lines.length) { setError(L('Add at least one item.', 'کم از کم ایک چیز شامل کریں۔', 'أضف مادة واحدة على الأقل.')); return false }
    const bad = lines.find(l => !l.product_name.trim() || !(parseFloat(l.quantity) > 0) || !l.unit)
    if (bad) { setError(L('Every line needs a name, a quantity and a unit.', 'ہر لائن میں نام، مقدار اور یونٹ چاہیے۔', 'كل سطر يحتاج إلى اسم وكمية ووحدة.')); return false }
    if (!region) { setError(L('Choose your region.', 'اپنا علاقہ منتخب کریں۔', 'اختر منطقتك.')); return false }
    if (!pickup && !geo && !address.trim()) { setError(L('Set the delivery location: detect it, paste a Google Maps link, or write the address.', 'ڈیلیوری کا مقام بتائیں۔', 'حدّد موقع التوصيل: بتحديد موقعك، أو بلصق رابط خرائط Google، أو بكتابة العنوان.')); return false }
    return true
  }

  async function send() {
    if (!validate()) { setConfirming(false); return }
    setConfirming(false)
    setSending(true)
    const supabase = createClient()
    try {
      const items: any[] = []
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        const ph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
        let photoUrl: string | null = null
        let fileUrl: string | null = null
        if (l.fileId) {
          const blob = await getDraftBlob(l.fileId)
          if (blob) {
            const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
            const { data: up } = await supabase.storage.from('licenses').upload(`${userId}/spec-${Date.now()}-${i}.${ext}`, blob, { upsert: false, contentType: blob.type })
            if (!up) { setError(L(`Could not upload the attachment of «${nameLabel(l.product_name)}». Check your connection and try again, or remove the attachment.`, `«${nameLabel(l.product_name)}» کی فائل اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں یا فائل ہٹا دیں۔`, `تعذّر رفع مرفق «${nameLabel(l.product_name)}». تحقّق من الاتصال وحاول مرة أخرى، أو احذف المرفق.`)); return }
            fileUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
          }
        }
        if (ph && ph.share) {
          const ext = ph.file.type === 'image/png' ? 'png' : ph.file.type === 'image/webp' ? 'webp' : 'jpg'
          const path = `${userId}/photo-${Date.now()}-${i}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, ph.file, { upsert: false, contentType: ph.file.type })
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
          specification: [st, l.details.trim()].filter(Boolean).join(' — ') || null,
          quantity: parseFloat(l.quantity),
          unit: l.unit,
          supplier_tiers: null, in_stock: false, max_days: null, specsObj,
          spec_file_url: fileUrl || photoUrl,
          spec_file_name: fileUrl ? (l.fileName || L('Attachment', 'فائل', 'مرفق')) : photoUrl ? L('Photo of the item', 'تصویر', 'صورة المادة') : null,
          photo_url: photoUrl,
          quick: true,
        })
      }
      const first = items[0]
      const { error: insErr } = await supabase.from('rfqs').insert({
        contractor_id: userId, sector: first.sector,
        product_name: items.length > 1 ? `${first.product_name} +${items.length - 1} ${L('more', 'مزید', 'أصناف أخرى')}` : first.product_name,
        sectors: Array.from(new Set(items.map(it => it.sector))),
        sub_category: first.sub_category, specification: first.specification, quantity: first.quantity, unit: first.unit,
        items,
        region, city: city || null, delivery_required: !pickup, vat_invoice_required: vatRequired,
        delivery_location: pickup ? null : (address.trim().slice(0, 300) || null),
        delivery_geo: pickup || !geo ? null : `${geo.lat},${geo.lng}`,
        hide_identity: hideIdentity, verified_only: verifiedOnly, nearby_only: false,
        notes: notes.trim() || null,
        expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      })
      if (insErr) {
        setError((insErr.message || '').includes('rfq_daily_limit')
          ? L('Daily request limit reached. Try again later.', 'روزانہ حد پوری ہو گئی۔', 'وصلت إلى الحد اليومي للطلبات. حاول لاحقاً.')
          : L('Could not send. Try again.', 'نہیں بھیج سکے۔', 'تعذّر إرسال الطلب. حاول مرة أخرى.'))
        return
      }
      deleteDraftBlobs([...photos.map(p => p.id), ...lines.map(l => l.fileId).filter(Boolean) as string[]])
      clearLocalDraft('quick:' + userId)
      // Teach the search: the words the buyer wrote → the material name that was sent.
      for (const l of lines) {
        if (l.original && l.original.trim() && l.original.trim() !== l.product_name.trim()) {
          try { supabase.rpc('log_search_event', { p_query: l.original.trim(), p_query_norm: normQuery(l.original), p_action: 'picked', p_picked: l.product_name.trim(), p_sector: l.sector, p_source: 'quick_text' }).then(() => {}, () => {}) } catch {}
        }
      }
      if (draftId) { try { await supabase.from('rfq_drafts').delete().eq('id', draftId) } catch {} ; setDraftId(null) }
      setDone(true)
    } catch {
      setError(L('Network problem — your request was not sent. It is still saved here; try again.', 'نیٹ ورک کا مسئلہ — درخواست نہیں گئی۔ دوبارہ کوشش کریں۔', 'حدثت مشكلة في الاتصال ولم يُرسل الطلب. ما زال محفوظاً هنا؛ حاول مرة أخرى.'))
    } finally { setSending(false) }
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
          <p className="text-sm text-gray-500 mt-1">{L('Write it, say it, photograph it or pick it from the catalog. We will organise it into a list.', 'لکھیں، بولیں، تصویر لیں یا فہرست سے منتخب کریں۔', 'اكتبها، أو تحدّث بها، أو صوّرها، أو اخترها من دليل المواد، وسنرتّبها لك في طلبك.')}</p>
        </div>

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
                {listening ? '⏺ ' + L('Listening… tap to stop', 'سن رہے ہیں…', 'جارٍ الاستماع… اضغط للإيقاف') : '' + L('Say it', 'بولیں', 'تحدّث')}
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2.5 rounded-xl font-bold border bg-white border-gray-200 text-gray-700">
              <Glyph e="📷" /> {L('Add a photo', 'تصویر شامل کریں', 'صوّر المادة')}
            </button>
            <button type="button" onClick={() => setShowCatalog(true)} className="lg:hidden px-4 py-2.5 rounded-xl font-bold border bg-white border-gray-200 text-gray-700">
              <Glyph e="🔍" /> {L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="hidden"
              onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
            <input ref={specFileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { if (fileFor) attachFile(fileFor, e.target.files?.[0]); e.target.value = '' }} />
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
                          <b className="text-[#9D7425]">{l.quantity} {unitLabel(l.unit)}</b>
                          {Object.values(l.specs || {}).filter(v => (v || '').trim()).length ? ' · ' + Object.values(l.specs || {}).filter(v => (v || '').trim()).join('، ') : ''}
                          {l.details.trim() ? ' · ' + l.details.trim() : ''}
                          {l.fileId ? ' · ' : ''}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-gray-400 shrink-0">✎ {L('Edit', 'ترمیم', 'تعديل')}</span>
                    </button>
                    <button type="button" onClick={() => removeLine(l.key)} className="text-gray-400 hover:text-red-500 text-lg leading-none px-1" aria-label={L('Remove', 'ہٹائیں', 'احذف')}>×</button>
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
                        </p>
                      )}
                      {ph && ph.status === 'failed' && (
                        <p className="text-[11px] text-gray-500">{L('Could not recognise it. Write the name, or just send the photo to suppliers.', 'پہچان نہیں سکے۔', 'تعذّر التعرّف عليها. اكتب اسمها، أو أرسل الصورة للموردين ليتعرّفوا عليها.')}</p>
                      )}
                      {l.suggestion && l.suggestion.name !== l.product_name && (
                        <button type="button" onClick={() => updateLine(l.key, { product_name: l.suggestion!.name, sector: l.suggestion!.sector, suggestion: null })}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-dashed hover:bg-[#0F6E56]/5" style={{ borderColor: '#0F6E56', color: '#0F6E56' }}>
                          <Glyph e="📦" /> {L('Did you mean', 'کیا آپ کا مطلب', 'هل تقصد')}: {nameLabel(l.suggestion.name)}؟
                        </button>
                      )}
                      {l.product_name.trim() && !CATALOG_NAMES.has(l.product_name.trim())
                        ? <LineSpecialty name={l.product_name} sector={l.sector} value={l.spec} locale={locale}
                            onChange={v => updateLine(l.key, { spec: v, sector: v.sector })} />
                        : <div className="text-[11px] text-gray-400">{sectorLabel(l.sector)}</div>}
                    </div>
                    <button type="button" onClick={() => removeLine(l.key)} className="text-gray-400 hover:text-red-500 text-lg leading-none px-1" aria-label={L('Remove', 'ہٹائیں', 'احذف')}>×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" inputMode="decimal" min="0" value={l.quantity} onChange={e => updateLine(l.key, { quantity: e.target.value })}
                      className="input-field" placeholder={L('Quantity', 'مقدار', 'الكمية')} aria-label={L('Quantity', 'مقدار', 'الكمية')} />
                    <select value={l.unit} onChange={e => updateLine(l.key, { unit: e.target.value })} className="input-field" aria-label={L('Unit', 'یونٹ', 'الوحدة')}>
                      <option value="">{L('Unit', 'یونٹ', 'الوحدة')}</option>
                      {Array.from(new Set([...(getProductSpecs(l.product_name).find(f => f.key === 'unit')?.options || []), ...(l.unit && !UNITS.includes(l.unit) ? [l.unit] : []), ...(unitOptionsFor(l.product_name, l.sector as any) || UNITS)])).map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
                    </select>
                  </div>
                  <input value={l.details} onChange={e => updateLine(l.key, { details: e.target.value })} className="input-field text-sm"
                    placeholder={L('Notes for the supplier (optional)', 'سپلائر کے لیے نوٹ (اختیاری)', 'ملاحظات للمورد (اختياري)')} />
                  {(() => {
                    const fields = getProductSpecs(l.product_name).filter(f => f.key !== 'unit')
                    const n = fields.filter(f => (l.specs?.[f.key] || '').trim()).length
                    const open = specsOpen === l.key
                    return (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {fields.length > 0 && (
                            <button type="button" onClick={() => setSpecsOpen(open ? null : l.key)} aria-expanded={open}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${n ? 'border-[#0F6E56] text-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 text-gray-600'}`}>
                              <Glyph e="⚙" /> {L('Specifications', 'تفصیلات', 'المواصفات')}{n ? ` (${n})` : ''} {open ? '▴' : '▾'}
                            </button>
                          )}
                          <button type="button" onClick={() => { setFileFor(l.key); specFileRef.current?.click() }}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border max-w-[14rem] truncate ${l.fileId ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-gray-200 text-gray-600'}`}>
                            <Glyph e="📎" /> {l.fileId ? (l.fileName || L('File attached', 'فائل منسلک', 'ملف مرفق')) : L('Attach a drawing or file', 'ڈرائنگ یا فائل', 'أرفق مخططاً أو ملفاً')}
                          </button>
                          {l.fileId && (
                            <button type="button" onClick={() => { deleteDraftBlobs([l.fileId!]); updateLine(l.key, { fileId: undefined, fileName: undefined }) }}
                              className="text-[11px] text-gray-400 hover:text-red-500" aria-label={L('Remove file', 'فائل ہٹائیں', 'احذف الملف')}>×</button>
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
                                  <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{locale === 'ar' ? f.ar : f.en}</span>
                                  <select value={custom ? '__other' : v} onChange={e => setV(e.target.value === '__other' ? ' ' : e.target.value)} className="input-field text-sm">
                                    <option value="">{L('Any', 'کوئی بھی', 'أي')}</option>
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
                    disabled={!(l.product_name.trim() && parseFloat(l.quantity) > 0 && l.unit)}
                    className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#0F6E56' }}>
                    ✓ {parseFloat(l.quantity) > 0 ? L('Save', 'محفوظ کریں', 'حفظ') : L('Enter the quantity to save', 'محفوظ کرنے کے لیے مقدار لکھیں', 'أدخل الكمية للحفظ')}
                  </button>
                </div>
              )
            })}
            <button type="button" onClick={addMore}
              className="lg:hidden w-full py-3 rounded-xl border-2 border-dashed border-[#D4A543]/50 text-[#9D7425] font-bold text-sm hover:bg-[#D4A543]/5 transition-all">
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
              <div role="radiogroup" className="flex flex-wrap gap-1.5">
                {([[6, L('Today', 'آج', 'اليوم')], [24, L('Tomorrow', 'کل', 'غداً')], [48, L('2 days', '2 دن', 'يومان')], [72, L('3 days', '3 دن', '3 أيام')], [168, L('A week', 'ایک ہفتہ', 'أسبوع')]] as [number, string][]).map(([h, lab]) => (
                  <button key={h} type="button" role="radio" aria-checked={hours === h} onClick={() => setHours(h)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold ${hours === h ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-600 border-gray-200'}`}>{lab}</button>
                ))}
              </div>
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-bold text-[#9D7425] select-none">{L('More options (optional)', 'مزید اختیارات', 'خيارات إضافية (اختياري)')}</summary>
              <div className="mt-3 space-y-3">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-field text-sm" placeholder={L('Notes for suppliers (optional)', 'نوٹس (اختیاری)', 'ملاحظات للموردين (اختياري)')} />
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
                  {L('Only verified suppliers', 'صرف تصدیق شدہ سپلائرز', 'الموردون الموثّقون فقط')}
                </label>
              </div>
            </details>
          </div>
        )}
        </div>
      </div>

      {/* owner 2026-10-17: the send bar is always there once there is an item; the review dialog
          and validate() still catch incomplete lines */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 px-4 pt-3 z-30" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-3 lg:pe-24">
            <span className="text-sm text-gray-500">{lines.length} {L('items', 'اشیاء', 'مواد')}</span>
            <button type="button" onClick={review} disabled={sending || photos.some(p => p.status === 'identifying')}
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
                <div className="text-xs font-bold text-gray-500 mb-2">{L('Materials', 'سامان', 'المواد')} ({lines.length})</div>
                <ol className="space-y-2">
                  {lines.map((l, i) => {
                    const sp = Object.values(l.specs || {}).filter(v => (v || '').trim())
                    return (
                      <li key={l.key} className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-navy" dir="auto">{i + 1}. {nameLabel(l.product_name)}</span>
                          <span className="font-bold text-[#9D7425] whitespace-nowrap">{l.quantity} {unitLabel(l.unit)}</span>
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
                {notes.trim() && (<>
                  <dt className="text-gray-500">{L('Notes', 'نوٹس', 'ملاحظات')}</dt>
                  <dd className="font-semibold whitespace-pre-wrap" dir="auto">{notes.trim()}</dd>
                </>)}
              </dl>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {hideIdentity && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{L('Name hidden', 'نام چھپا', 'الاسم مخفي')}</span>}
                {vatRequired && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{L('VAT invoice', 'VAT انوائس', 'فاتورة ضريبية')}</span>}
                {verifiedOnly && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{L('Verified suppliers only', 'صرف تصدیق شدہ', 'الموردون الموثّقون فقط')}</span>}
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
