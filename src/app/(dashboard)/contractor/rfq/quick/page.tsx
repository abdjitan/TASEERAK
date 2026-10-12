'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { REGIONS, CITIES_BY_REGION, SECTOR_LABELS, detectSubCategory, getDefaultUnit, type Sector } from '@/types'
import CatalogPicker, { CatalogBrowser } from '@/components/shared/CatalogPicker'
import { productImageUrl } from '@/lib/productImage'
import { loadLocalDraft, saveLocalDraft, clearLocalDraft, putDraftBlob, getDraftBlob, deleteDraftBlobs } from '@/lib/localDraft'

// Quick request: for anyone, no engineering terms. Write, dictate or photograph what you need;
// we turn it into lines you can fix, then send. Detailed specs stay on /contractor/rfq/new.

const UNITS = ['حبة', 'كيس', 'طن', 'م³', 'م²', 'متر', 'م.ط', 'لفة', 'كرتون', 'سطل', 'لوح', 'جالون', 'لتر', 'كغ', 'طقم', 'نقلة', 'يوم', 'ساعة', 'عدد']

type Line = {
  key: string
  product_name: string
  sector: string
  quantity: string
  unit: string
  details: string
  photoId?: string
  original?: string // what the buyer wrote, when it differs from the Arabic name suppliers see
  suggestion?: { name: string; sector: string } | null
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
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const recRef = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?next=/contractor/rfq/quick'; return }
      setUserId(user.id)
      const { data: p } = await supabase.from('profiles').select('region, city').eq('id', user.id).single()
      if (p?.region) setRegion(p.region)
      if (p?.city) setCity(p.city)
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
      text, lines, region, city, hours, notes, hideIdentity,
      photos: photos.map(p => ({ id: p.id, name: p.file.name, type: p.file.type, status: p.status, share: p.share, confidence: p.confidence, localName: p.localName })),
    }), 300)
    return () => clearTimeout(t)
  }, [restored, userId, done, text, lines, region, city, hours, notes, hideIdentity, photos])

  function startOver() {
    deleteDraftBlobs(photos.map(p => p.id))
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

  function updateLine(key: string, patch: Partial<Line>) { setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l)) }
  function removeLine(key: string) {
    const l = lines.find(x => x.key === key)
    setLines(prev => prev.filter(x => x.key !== key))
    if (l?.photoId) { deleteDraftBlobs([l.photoId]); setPhotos(prev => prev.filter(p => p.id !== l.photoId)) }
  }

  const ready = lines.length > 0 && lines.every(l => l.product_name.trim() && parseFloat(l.quantity) > 0 && l.unit) && !!region

  async function send() {
    setError('')
    if (!lines.length) { setError(L('Add at least one item.', 'کم از کم ایک چیز شامل کریں۔', 'أضف مادة واحدة على الأقل.')); return }
    const bad = lines.find(l => !l.product_name.trim() || !(parseFloat(l.quantity) > 0) || !l.unit)
    if (bad) { setError(L('Every line needs a name, a quantity and a unit.', 'ہر لائن میں نام، مقدار اور یونٹ چاہیے۔', 'كل سطر يحتاج إلى اسم وكمية ووحدة.')); return }
    if (!region) { setError(L('Choose your region.', 'اپنا علاقہ منتخب کریں۔', 'اختر منطقتك.')); return }
    setSending(true)
    const supabase = createClient()
    try {
      const items: any[] = []
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        const ph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
        let photoUrl: string | null = null
        if (ph && ph.share) {
          const ext = ph.file.type === 'image/png' ? 'png' : ph.file.type === 'image/webp' ? 'webp' : 'jpg'
          const path = `${userId}/photo-${Date.now()}-${i}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, ph.file, { upsert: false, contentType: ph.file.type })
          if (up) photoUrl = supabase.storage.from('licenses').getPublicUrl(up.path).data.publicUrl
        }
        items.push({
          sector: l.sector,
          product_name: l.product_name.trim(),
          sub_category: detectSubCategory(l.product_name, l.sector as any),
          specification: l.details.trim() || null,
          quantity: parseFloat(l.quantity),
          unit: l.unit,
          supplier_tiers: null, in_stock: false, max_days: null, specsObj: {},
          spec_file_url: photoUrl, spec_file_name: photoUrl ? L('Photo of the item', 'تصویر', 'صورة المادة') : null,
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
        region, city: city || null, delivery_required: true, vat_invoice_required: false,
        hide_identity: hideIdentity, verified_only: false, nearby_only: false,
        notes: notes.trim() || null,
        expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      })
      if (insErr) {
        setError((insErr.message || '').includes('rfq_daily_limit')
          ? L('Daily request limit reached. Try again later.', 'روزانہ حد پوری ہو گئی۔', 'وصلت إلى الحد اليومي للطلبات. حاول لاحقاً.')
          : L('Could not send. Try again.', 'نہیں بھیج سکے۔', 'تعذّر إرسال الطلب. حاول مرة أخرى.'))
        return
      }
      deleteDraftBlobs(photos.map(p => p.id))
      clearLocalDraft('quick:' + userId)
      setDone(true)
    } finally { setSending(false) }
  }

  const sectorLabel = (s: string) => {
    const lab: any = (SECTOR_LABELS as any)[s]
    return typeof lab === 'string' ? lab : (lab?.[locale] || lab?.ar || s)
  }

  if (done) {
    return (
      <AppShell title={L('Price request', 'قیمت کی درخواست', 'طلب تسعير')} nav={getNav('contractor', locale, '/contractor/rfq/quick')} dir={dir}>
        <div className="max-w-lg mx-auto bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-extrabold text-navy mb-2">{L('Request sent', 'درخواست بھیج دی گئی', 'تم إرسال طلبك')}</h2>
          <p className="text-gray-500 mb-6">{L('Suppliers near you will send their prices. We will notify you as quotes arrive.', 'قریبی سپلائرز قیمتیں بھیجیں گے۔', 'سيرسل الموردون القريبون منك أسعارهم، وسنُبلغك فور وصول أي عرض.')}</p>
          <div className="flex gap-3">
            <Link href="/contractor" className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: '#1B2D5B' }}>{L('My requests', 'میری درخواستیں', 'طلباتي')}</Link>
            <button type="button" onClick={() => { setDone(false); setLines([]); setPhotos([]); setNotes('') }} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-700">{L('New request', 'نئی درخواست', 'طلب جديد')}</button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={L('Price request', 'قیمت کی درخواست', 'طلب تسعير')} nav={getNav('contractor', locale, '/contractor/rfq/quick')} dir={dir}>
      <div className="max-w-6xl mx-auto pb-28 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)] lg:gap-6 lg:items-start">
        {/* A: how to add (main column on desktop, first on mobile) */}
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{L('What do you need?', 'آپ کو کیا چاہیے؟', 'ماذا تحتاج؟')}</h1>
          <p className="text-sm text-gray-500 mt-1">{L('Write it, say it, photograph it or pick it from the catalog. We will organise it into a list.', 'لکھیں، بولیں، تصویر لیں یا فہرست سے منتخب کریں۔', 'اكتبها، أو تحدّث بها، أو صوّرها، أو اخترها من القائمة، وسنرتّبها لك في قائمة.')}</p>
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
                {listening ? '⏺ ' + L('Listening… tap to stop', 'سن رہے ہیں…', 'جارٍ الاستماع… اضغط للإيقاف') : '🎤 ' + L('Say it', 'بولیں', 'تحدّث')}
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2.5 rounded-xl font-bold border bg-white border-gray-200 text-gray-700">
              📷 {L('Add a photo', 'تصویر شامل کریں', 'صوّر المادة')}
            </button>
            <button type="button" onClick={() => setShowCatalog(true)} className="lg:hidden px-4 py-2.5 rounded-xl font-bold border bg-white border-gray-200 text-gray-700">
              🔍 {L('Pick from the catalog', 'فہرست سے منتخب کریں', 'اختر من القائمة')}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="hidden"
              onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3" role="alert">{error}</div>}
        </div>

        {/* Desktop: the catalog fills the main column; phones open it as a sheet */}
        <div className="hidden lg:block lg:col-start-1 lg:row-start-2 lg:mt-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <h2 className="font-bold text-navy">🔍 {L('Pick from the catalog', 'فہرست سے منتخب کریں', 'اختر من القائمة')}</h2>
          <CatalogBrowser inline locale={locale} picked={lines.map(l => ({ key: l.key, name: l.product_name }))} onPick={addFromCatalog} />
        </div>

        {/* B: the chosen list + delivery, a side column on desktop (sticky), under the inputs on mobile */}
        <div className="space-y-5 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
        {lines.length === 0 ? (
          <div className="hidden lg:block bg-white rounded-2xl p-6 border border-dashed border-gray-200 text-center text-sm text-gray-400">
            <div className="text-3xl mb-2">🧾</div>
            {L('Your list is empty. Add materials by writing, speaking, a photo or from the catalog.', 'آپ کی فہرست خالی ہے۔', 'قائمتك فارغة. أضف موادك بالكتابة أو الصوت أو الصورة أو من القائمة.')}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy">{L('Your list', 'آپ کی فہرست', 'قائمتك')} <span className="text-gray-400 font-normal">({lines.length})</span></h2>
              <span className="text-xs text-gray-400">{L('Check each line before sending', 'بھیجنے سے پہلے چیک کریں', 'راجع كل سطر قبل الإرسال')}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>💾 {L('Saved on this device, you can leave and come back', 'اس ڈیوائس پر محفوظ ہے، واپس آ سکتے ہیں', 'محفوظة على جهازك، يمكنك المغادرة والعودة لاحقاً')}</span>
              <button type="button" onClick={() => { if (window.confirm(L('Clear the whole list?', 'پوری فہرست صاف کریں؟', 'هل تريد مسح القائمة بالكامل؟'))) startOver() }} className="font-bold text-gray-500 hover:text-red-500">
                {L('Start over', 'نئے سرے سے', 'ابدأ من جديد')}
              </button>
            </div>
            {lines.map(l => {
              const ph = l.photoId ? photos.find(p => p.id === l.photoId) : undefined
              return (
                <div key={l.key} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex gap-3 items-start">
                    {ph ? <img src={ph.url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-100" />
                      : l.product_name ? <img src={productImageUrl(l.product_name)} alt="" loading="lazy" className="w-16 h-16 rounded-lg object-contain shrink-0 border border-gray-100 bg-gray-50"
                          onError={(e: any) => { e.currentTarget.style.display = 'none' }} /> : null}
                    <div className="flex-1 min-w-0 space-y-1">
                      <input value={l.product_name} onChange={e => updateLine(l.key, { product_name: e.target.value })} aria-label={L('Item name', 'نام', 'اسم المادة')}
                        className="input-field font-semibold" placeholder={ph?.status === 'identifying' ? L('Recognising the photo…', 'تصویر پہچان رہے ہیں…', 'جارٍ التعرّف على الصورة…') : L('Item name', 'نام', 'اسم المادة')} />
                      {locale !== 'ar' && l.original && !ph && (
                        <p className="text-[11px] font-semibold text-gray-700" dir="auto">= {l.original}</p>
                      )}
                      {ph && ph.status === 'done' && (
                        <p className="text-[11px] text-gray-500">🤖 {L('Suggested from the photo, please check it', 'تصویر سے تجویز، چیک کریں', 'اقتراح من الصورة، تأكّد منه')}{ph.confidence === 'low' ? ' · ' + L('not sure', 'یقینی نہیں', 'غير متأكد') : ''}
                          {locale !== 'ar' && ph.localName && <span className="block font-semibold text-gray-700" dir="auto">= {ph.localName}</span>}
                        </p>
                      )}
                      {ph && ph.status === 'failed' && (
                        <p className="text-[11px] text-gray-500">{L('Could not recognise it. Write the name, or just send the photo to suppliers.', 'پہچان نہیں سکے۔', 'تعذّر التعرّف عليها. اكتب اسمها، أو أرسل الصورة للموردين ليتعرّفوا عليها.')}</p>
                      )}
                      {l.suggestion && l.suggestion.name !== l.product_name && (
                        <button type="button" onClick={() => updateLine(l.key, { product_name: l.suggestion!.name, sector: l.suggestion!.sector, suggestion: null })}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-dashed hover:bg-[#0F6E56]/5" style={{ borderColor: '#0F6E56', color: '#0F6E56' }}>
                          📦 {L('Did you mean', 'کیا آپ کا مطلب', 'هل تقصد')}: {l.suggestion.name}؟
                        </button>
                      )}
                      <div className="text-[11px] text-gray-400">{sectorLabel(l.sector)}</div>
                    </div>
                    <button type="button" onClick={() => removeLine(l.key)} className="text-gray-400 hover:text-red-500 text-lg leading-none px-1" aria-label={L('Remove', 'ہٹائیں', 'احذف')}>×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" inputMode="decimal" min="0" value={l.quantity} onChange={e => updateLine(l.key, { quantity: e.target.value })}
                      className="input-field" placeholder={L('Quantity', 'مقدار', 'الكمية')} aria-label={L('Quantity', 'مقدار', 'الكمية')} />
                    <select value={l.unit} onChange={e => updateLine(l.key, { unit: e.target.value })} className="input-field" aria-label={L('Unit', 'یونٹ', 'الوحدة')}>
                      <option value="">{L('Unit', 'یونٹ', 'الوحدة')}</option>
                      {Array.from(new Set([...(l.unit && !UNITS.includes(l.unit) ? [l.unit] : []), ...UNITS])).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <input value={l.details} onChange={e => updateLine(l.key, { details: e.target.value })} className="input-field text-sm"
                    placeholder={L('Size, type or brand (optional)', 'سائز یا برانڈ (اختیاری)', 'المقاس أو النوع أو الماركة (اختياري)')} />
                  {ph && (
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                      <input type="checkbox" checked={ph.share} onChange={e => setPhotos(prev => prev.map(p => p.id === ph.id ? { ...p, share: e.target.checked } : p))} className="w-4 h-4 accent-[#0F6E56]" />
                      {L('Send this photo to suppliers so they quote the same item', 'یہ تصویر سپلائرز کو بھیجیں', 'أرسل الصورة للموردين ليسعّروا المادة نفسها')}
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* C: delivery + options, under the list */}
        {lines.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h2 className="font-bold text-navy">📍 {L('Delivery to', 'ڈیلیوری', 'التوصيل لـ')}</h2>
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
            <details>
              <summary className="cursor-pointer text-xs font-bold text-[#d96f15] select-none">{L('More options (optional)', 'مزید اختیارات', 'خيارات إضافية (اختياري)')}</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{L('Suppliers can send prices for', 'قیمت بھیجنے کا وقت', 'يمكن للموردين إرسال الأسعار خلال')}</label>
                  <select value={hours} onChange={e => setHours(parseInt(e.target.value))} className="input-field">
                    {[6, 24, 48, 72, 168].map(h => <option key={h} value={h}>{h < 24 ? `${h} ${L('hours', 'گھنٹے', 'ساعات')}` : `${h / 24} ${L('day(s)', 'دن', h === 24 ? 'يوم' : 'أيام')}`}</option>)}
                  </select>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-field text-sm" placeholder={L('Notes for suppliers (optional)', 'نوٹس (اختیاری)', 'ملاحظات للموردين (اختياري)')} />
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={hideIdentity} onChange={e => setHideIdentity(e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                  {L('Hide my name until I choose a supplier', 'سپلائر چننے تک نام چھپائیں', 'إخفاء اسمي حتى أختار المورد')}
                </label>
              </div>
            </details>
          </div>
        )}
        </div>
      </div>

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 px-4 pt-3 z-30" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">{lines.length} {L('items', 'اشیاء', 'مواد')}</span>
            <button type="button" onClick={send} disabled={sending || photos.some(p => p.status === 'identifying')}
              className="btn-orange px-6 py-3 rounded-xl font-extrabold disabled:opacity-50">
              {sending ? L('Sending…', 'بھیج رہے ہیں…', 'جارٍ الإرسال…') : ready ? L('Send for prices', 'قیمت منگوائیں', 'أرسل طلب التسعير') : L('Complete the lines', 'لائنیں مکمل کریں', 'أكمل البيانات')}
            </button>
          </div>
        </div>
      )}
      {showCatalog && (
        <CatalogPicker locale={locale} onClose={() => setShowCatalog(false)}
          picked={lines.map(l => ({ key: l.key, name: l.product_name }))}
          onRemove={(key: string) => removeLine(key)}
          onPick={addFromCatalog} />
      )}
    </AppShell>
  )
}
