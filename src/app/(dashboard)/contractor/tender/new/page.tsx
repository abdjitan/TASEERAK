'use client'

// «تسعير مناقصة» (tender pricing) — step 1: upload the tender documents. Everything is read IN THE BROWSER:
// the BOQ workbook (xlsx), and the PDFs (specifications, drawings) with pdfjs in its web worker,
// page by page. Only the extracted text is stored (+ a small thumbnail of each drawing page);
// an original is kept only when it is ≤ 15 MB. Nothing is sent to an AI.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import Glyph from '@/components/shared/Glyph'
import { getNav } from '@/lib/nav'
import { canUseProjects, PROJECTS_OPEN_TO_ALL } from '@/lib/plans'
import { arItems, arCount } from '@/lib/text'

// Arabic counted nouns for the reading summary (UX-153: «1 صفحة» → «صفحة واحدة», «11 صفحةً»)
const arPages = (n: number) => arCount(n, 'صفحة واحدة', 'صفحتان', 'صفحات', 'صفحةً')
const arSheets = (n: number) => arCount(n, 'ورقة واحدة', 'ورقتان', 'أوراق', 'ورقةً')
const arCodes = (n: number) => arCount(n, 'رمز واحد', 'رمزان', 'رموز', 'رمزاً')
const arHeadings = (n: number) => arCount(n, 'عنوان واحد', 'عنوانان', 'عناوين', 'عنواناً')
import { readBoqWorkbook, readNrmBoq } from '@/lib/tender/boqNrm'
import { readDrawings } from '@/lib/tender/drawingText'
import { buildSpecIndex } from '@/lib/tender/specIndex'
import { runChecks } from '@/lib/tender/checks'
import { routeItem } from '@/lib/tender/classify'
import { itemToRow } from '@/lib/tender/rows'
import { MAX_ORIGINAL_BYTES, MAX_BOQ_BYTES, extractPdfInBrowser } from '@/lib/tender/browserPdf'
import type { TenderItem, BoqReadStats, ExtractedPdf, DrawingSummary, SpecIndex } from '@/lib/tender/types'
import { makeL, kindLabel, fmtSize } from '@/components/tender/labels'
import { storedBuyerType } from '@/lib/buyerType'

type PdfKind = 'spec' | 'drawing'
type PdfJob = {
  id: string
  file: File
  kind: PdfKind
  status: 'queued' | 'reading' | 'done' | 'error'
  done: number
  total: number
  data?: ExtractedPdf
  thumbs?: Map<number, Blob>
  drawings?: DrawingSummary[]
  index?: SpecIndex
  error?: string
}
type BoqState = { file: File; status: 'reading' | 'done' | 'error'; items: TenderItem[]; stats: BoqReadStats | null; sections: number; error?: string }

const uid = () => Math.random().toString(36).slice(2, 10)
const safeName = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80)

export default function NewTenderPage() {
  const { locale, dir } = useTranslation()
  const L = makeL(locale)
  const [user, setUser] = useState<any>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [title, setTitle] = useState('')
  const [boq, setBoq] = useState<BoqState | null>(null)
  const [jobs, setJobs] = useState<PdfJob[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('') // save errors
  const [boqError, setBoqError] = useState('') // shown in the BOQ section
  const [boqNotExcel, setBoqNotExcel] = useState(false) // a PDF/photo: point to «إضافة جدول الكميات»
  const [pdfError, setPdfError] = useState<Record<string, string>>({}) // per PDF section
  const busyRef = useRef(false)
  const stopRef = useRef(false)
  const leavingRef = useRef(false) // set just before opening the review, so the leave warning stays quiet

  useEffect(() => {
    // a home buyer has no tenders: the simple request page (UX-078)
    if (storedBuyerType() === 'individual') { window.location.replace('/contractor/rfq/quick'); return }
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
      supabase.from('profiles').select('buyer_type').eq('id', data.session.user.id).maybeSingle()
        .then(({ data: bt }: any) => { if (bt?.buyer_type === 'individual') window.location.replace('/contractor/rfq/quick') })
      // open to everyone during the trial: decided before the profile read, so a failed read never shows a gate
      if (PROJECTS_OPEN_TO_ALL) { setAllowed(true); return }
      supabase.from('profiles').select('role, verification_status, cr_verified_at, subscription_plan, subscription_expires_at').eq('id', data.session.user.id).single()
        .then(({ data: p }: any) => setAllowed(canUseProjects(p)))
    })
    return () => { stopRef.current = true }
  }, [])

  // ── BOQ: read in the browser ──────────────────────────────────────────────────────────────
  async function onBoq(file: File | null) {
    if (!file) return
    setBoqError(''); setBoqNotExcel(false)
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setBoqNotExcel(true)
      setBoqError(L('Tender pricing reads a bill of quantities in Excel (xlsx, xls) or CSV.', 'ٹینڈر قیمت Excel (xlsx, xls) یا CSV میں مقداروں کا جدول پڑھتی ہے۔', 'يقرأ تسعير المناقصة جدول الكميات بصيغة Excel (xlsx أو xls) أو CSV.'))
      return
    }
    if (file.size > MAX_BOQ_BYTES) { setBoqError(L('The BOQ file is larger than 15 MB.', 'BOQ فائل 15 MB سے بڑی ہے۔', 'ملف جدول الكميات أكبر من 15 ميجابايت.')); return }
    setBoq({ file, status: 'reading', items: [], stats: null, sections: 0 })
    try {
      const sheets = await readBoqWorkbook(await file.arrayBuffer())
      const { items, sections, stats } = readNrmBoq(sheets)
      setBoq({ file, status: 'done', items, stats, sections: sections.length })
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 120))
    } catch {
      setBoq({ file, status: 'error', items: [], stats: null, sections: 0, error: L('Could not read this workbook.', 'یہ ورک بک نہیں پڑھی جا سکی۔', 'تعذّرت قراءة هذا الملف.') })
    }
  }

  // ── PDFs: one at a time, page by page ──────────────────────────────────────────────────────
  function addPdfs(list: FileList | null, kind: PdfKind) {
    if (!list) return
    setPdfError(m => ({ ...m, [kind]: '' }))
    const add: PdfJob[] = []
    for (const f of Array.from(list)) {
      if (!/\.pdf$/i.test(f.name)) { setPdfError(m => ({ ...m, [kind]: L(`«${f.name}» is not a PDF: only PDF files are accepted here.`, `«${f.name}» PDF نہیں: یہاں صرف PDF فائلیں۔`, `«${f.name}» ليس ملف PDF، وتُقبل ملفات PDF فقط هنا.`) })); continue }
      add.push({ id: uid(), file: f, kind, status: 'queued', done: 0, total: 0 })
    }
    setJobs(j => [...j, ...add])
  }
  useEffect(() => {
    if (busyRef.current) return
    const next = jobs.find(j => j.status === 'queued')
    if (!next) return
    busyRef.current = true
    const patch = (p: Partial<PdfJob>) => setJobs(js => js.map(j => (j.id === next.id ? { ...j, ...p } : j)))
    patch({ status: 'reading' })
    extractPdfInBrowser(next.file, next.kind, ({ done, total }) => patch({ done, total }), () => stopRef.current)
      .then(({ data, thumbs }) => {
        if (next.kind === 'drawing') patch({ status: 'done', data, thumbs, drawings: readDrawings([{ name: next.file.name, pages: data.pages }]) })
        else patch({ status: 'done', data, index: buildSpecIndex(next.file.name, data.pages) })
      })
      .catch(() => patch({ status: 'error', error: L('Could not read this PDF (protected or damaged?).', 'یہ PDF نہیں پڑھی جا سکی (محفوظ شدہ یا خراب؟)۔', 'تعذّرت قراءة ملف PDF هذا (محمي أو تالف؟).') }))
      .finally(() => { busyRef.current = false; setJobs(js => [...js]) })
  }, [jobs]) // eslint-disable-line react-hooks/exhaustive-deps

  // a file dropped outside a section must not make the browser open it and leave the page
  useEffect(() => {
    const stop = (e: DragEvent) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() }
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => { window.removeEventListener('dragover', stop); window.removeEventListener('drop', stop) }
  }, [])

  const reading = jobs.some(j => j.status === 'queued' || j.status === 'reading') || boq?.status === 'reading'
  const doneDrawings = jobs.filter(j => j.kind === 'drawing' && j.status === 'done')
  const doneSpecs = jobs.filter(j => j.kind === 'spec' && j.status === 'done')
  const canSave = !!user && !!title.trim() && boq?.status === 'done' && boq.items.length > 0 && !reading && !saving
  // leaving while files are read (in this browser) or saved loses that work: ask the browser to warn
  const hasWork = reading || saving || (!!boq && boq.status === 'done') || jobs.some(j => j.status === 'done')
  useEffect(() => {
    if (!hasWork) return
    const onLeave = (e: BeforeUnloadEvent) => { if (leavingRef.current) return; e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [hasWork])

  // ── save: tender → files (+ extracted JSON, thumbnails) → checked items ────────────────────
  async function save() {
    if (!canSave || !boq) return
    setSaving(true); setError('')
    const supabase = createClient()
    const bucket = supabase.storage.from('tenders')
    let createdId: string | null = null // removed again if a later step fails (no empty half-saved tender)
    try {
      setSaveMsg(L('Creating the tender…', 'ٹینڈر بنایا جا رہا ہے…', 'جارٍ إنشاء المناقصة…'))
      const { data: tender, error: tErr } = await supabase.from('tenders').insert({ contractor_id: user.id, title: title.trim().slice(0, 200), status: 'draft' }).select('id').single()
      if (tErr || !tender) throw new Error(tErr?.message || 'tender')
      createdId = tender.id
      const base = `${user.id}/${tender.id}`

      // BOQ original (always ≤ 15 MB here)
      setSaveMsg(L('Saving the BOQ…', 'BOQ محفوظ کی جا رہی ہے…', 'جارٍ حفظ جدول الكميات…'))
      const boqPath = `${base}/boq-${safeName(boq.file.name)}`
      const up = await bucket.upload(boqPath, boq.file, { upsert: true, contentType: boq.file.type || undefined })
      await supabase.from('tender_files').insert({
        tender_id: tender.id, kind: 'boq', name: boq.file.name.slice(0, 255), size: boq.file.size, pages: boq.stats?.sheets_read.length || null,
        storage_path: up.error ? null : boqPath, extracted_path: null,
        summary: { stats: boq.stats, sections: boq.sections, items: boq.items.length },
      })

      // PDFs
      const drawings: DrawingSummary[] = []
      const specs: { index: SpecIndex; pages: any[] }[] = []
      for (const j of jobs.filter(x => x.status === 'done' && x.data)) {
        setSaveMsg(L(`Saving ${j.file.name}…`, `${j.file.name} محفوظ کی جا رہی ہے…`, `جارٍ حفظ ${j.file.name}…`))
        const fid = uid()
        const jsonPath = `${base}/${fid}.json`
        const jsonUp = await bucket.upload(jsonPath, new Blob([JSON.stringify(j.data)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
        if (jsonUp.error) throw new Error(jsonUp.error.message)
        let storagePath: string | null = null
        if (j.file.size <= MAX_ORIGINAL_BYTES) {
          const p = `${base}/${fid}-${safeName(j.file.name)}`
          const o = await bucket.upload(p, j.file, { upsert: true, contentType: 'application/pdf' })
          if (!o.error) storagePath = p
        }
        let summary: any
        if (j.kind === 'drawing') {
          const ds = (j.drawings || []).map(d => ({ ...d }))
          for (const d of ds) {
            const b = j.thumbs?.get(d.page)
            if (!b) continue
            const tp = `${base}/${fid}-p${d.page}.webp`
            const t = await bucket.upload(tp, b, { upsert: true, contentType: 'image/webp' })
            if (!t.error) d.thumb_path = tp
          }
          drawings.push(...ds)
          summary = { drawings: ds, empty_pages: j.data!.emptyPages }
        } else {
          specs.push({ index: j.index!, pages: j.data!.pages })
          summary = { sections: j.index?.sections.filter(s => s.level === 0).length || 0, headings: j.index?.sections.length || 0, empty_pages: j.data!.emptyPages }
        }
        const { error: fErr } = await supabase.from('tender_files').insert({
          tender_id: tender.id, kind: j.kind, name: j.file.name.slice(0, 255), size: j.file.size, pages: j.data!.numPages,
          storage_path: storagePath, extracted_path: jsonPath, summary,
        })
        if (fErr) throw new Error(fErr.message)
      }

      // checks + routing → items
      setSaveMsg(L('Checking the BOQ against the drawings and specifications…', 'مقداروں کے جدول کو ڈرائنگز اور تفصیلات سے ملایا جا رہا ہے…', 'جارٍ مطابقة جدول الكميات مع المخططات والمواصفات…'))
      await new Promise(r => setTimeout(r, 0))
      const res = runChecks({ items: boq.items, drawings, specs })
      const rows = boq.items.map(it => {
        const routed = it.kind === 'material' ? routeItem(it) : null
        const dl = res.codeLinks.filter(l => it.codes.includes(l.code)).flatMap(l => l.on_drawings.map(o => ({ code: l.code, ...o })))
        const legend = res.codeLinks.filter(l => it.codes.includes(l.code) && l.legend).map(l => ({ code: l.code, text: l.legend }))
        return itemToRow(tender.id, it, routed, res.byItem[it.key] || [], {
          spec: res.specLinks[it.key] || [], drawings: dl, legend, catalog: !!routed?.catalog,
          candidates: routed?.candidates.slice(0, 3) || [],
        })
      })
      for (let i = 0; i < rows.length; i += 400) {
        setSaveMsg(L(`Saving items ${i + 1}–${Math.min(rows.length, i + 400)} of ${rows.length}…`, `آئٹمز محفوظ ${i + 1}–${Math.min(rows.length, i + 400)} / ${rows.length}…`, `جارٍ حفظ البنود ${i + 1}–${Math.min(rows.length, i + 400)} من ${rows.length}…`))
        const { error: iErr } = await supabase.from('tender_items').insert(rows.slice(i, i + 400))
        if (iErr) throw new Error(iErr.message)
      }
      const bySev: Record<string, number> = {}
      for (const f of res.flags) bySev[f.severity] = (bySev[f.severity] || 0) + 1
      await supabase.from('tenders').update({ status: 'review', summary: { items: rows.length, by_kind: boq.stats?.by_kind || {}, flags: bySev, drawings: drawings.length, specs: specs.length } }).eq('id', tender.id)
      leavingRef.current = true
      window.location.href = `/contractor/tender/${tender.id}`
    } catch (e: any) {
      const m = String(e?.message || '')
      // clean up the half-saved tender (its rows, files and the tender itself); the files read here stay on the page to retry
      if (createdId) {
        try {
          await supabase.from('tender_items').delete().eq('tender_id', createdId)
          await supabase.from('tender_files').delete().eq('tender_id', createdId)
          await supabase.from('tenders').delete().eq('id', createdId)
          const { data: left } = await bucket.list(`${user.id}/${createdId}`, { limit: 1000 })
          if (left?.length) await bucket.remove(left.map((f: any) => `${user.id}/${createdId}/${f.name}`))
        } catch { /* best effort */ }
      }
      setError(m.includes('tenders_daily_limit') ? L('Daily limit of new tenders reached. Try again tomorrow.', 'نئے ٹینڈرز کی روزانہ حد پوری ہو گئی۔ کل دوبارہ کوشش کریں۔', 'وصلت إلى الحد اليومي للمناقصات الجديدة، فحاول غداً.')
        : m.includes('Bucket not found') || m.includes('relation') ? L('Tender pricing is not enabled yet on the server.', 'ٹینڈر قیمت سرور پر ابھی فعال نہیں۔', 'تسعير المناقصات غير مفعّل على الخادم بعد.')
        : L('Could not save the tender. Your files are still here: check your connection and try again.', 'ٹینڈر محفوظ نہیں ہو سکا۔ آپ کی فائلیں یہیں ہیں: کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر حفظ المناقصة. ملفاتك ما زالت هنا: تحقّق من الاتصال وحاول مرة أخرى.'))
      setSaving(false); setSaveMsg('')
    }
  }

  // an unreadable workbook or one without items is never a dead end (UX-077)
  const otherFormatHelp = (
    <div className="mt-2 rounded-xl border border-[#D4A543]/40 bg-[#D4A543]/[.06] p-3 text-[13px] text-[#0B2438] leading-relaxed">
      {L('Tender pricing reads tables that have a «Unit» column and a «Quantity» column. If your table has another layout, try «Add a bill of quantities»: it reads Excel, PDF and photos.', 'ٹینڈر قیمت وہ جدول پڑھتی ہے جن میں «یونٹ» اور «مقدار» کے کالم ہوں۔ اگر آپ کا جدول کسی اور ترتیب میں ہے تو «مقداروں کا جدول شامل کریں» آزمائیں: یہ Excel، PDF اور تصاویر پڑھتا ہے۔', 'يقرأ تسعير المناقصات الجداول التي تحتوي عمودَي «الوحدة» و«الكمية». إن كان جدولك بتنسيق آخر، فجرّب «إضافة جدول الكميات»، فهي تقرأ ملفات Excel وPDF والصور.')}
      <Link href="/contractor/project/new" className="mt-1 flex items-center min-h-11 font-bold text-[#8F6820] underline">{L('Open «Add a bill of quantities» →', '«مقداروں کا جدول شامل کریں» کھولیں ←', 'افتح «إضافة جدول الكميات» ←')}</Link>
    </div>
  )
  const byKind = boq?.stats?.by_kind
  const boqCodes = boq ? new Set(boq.items.flatMap(i => i.codes)).size : 0

  return (
    <AppShell title={L('Tender pricing', 'ٹینڈر قیمت', 'تسعير مناقصة')} nav={getNav('contractor', locale, '/contractor/tender')} dir={dir}>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <Link href="/contractor/tender" className="inline-flex items-center min-h-11 text-xs font-bold text-[#8F6820] hover:underline">{L('All tenders', 'تمام ٹینڈرز', 'كل المناقصات')}</Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0B2438]">{L('New tender', 'نیا ٹینڈر', 'مناقصة جديدة')}</h1>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {L('Upload the bill of quantities, the specifications and the drawings. They are read in your browser; every number is linked to its source, every inconsistency is flagged, and nothing goes to suppliers until you approve it.',
              'مقداروں کا جدول، تفصیلات اور ڈرائنگز اپ لوڈ کریں۔ فائلیں آپ کے براؤزر میں پڑھی جاتی ہیں؛ ہر عدد اپنے ماخذ سے جڑا ہے، ہر تضاد پر انتباہ دیا جاتا ہے، اور آپ کی منظوری سے پہلے کچھ سپلائرز کو نہیں جاتا۔',
              'ارفع جدول الكميات والمواصفات والمخططات. تُقرأ الملفات في متصفحك، ويُربط كل رقم بمصدره، ويُنبَّه إلى كل تعارض، ولا يُرسل شيء للموردين قبل اعتمادك.')}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {L('Is your table a PDF or a photo? ', 'آپ کا جدول PDF یا تصویر ہے؟ ', 'الجدول بصيغة PDF أو صورة؟ ')}
            <Link href="/contractor/project/new" className="font-bold text-[#8F6820] underline">{L('Use «Add a bill of quantities»', '«مقداروں کا جدول شامل کریں» استعمال کریں', 'استخدم «إضافة جدول الكميات»')}</Link>
          </p>
        </div>

        {allowed === false && (
          <div className="bg-white rounded-2xl border border-[#D4A543]/40 p-6 text-center">
            <p className="text-sm text-gray-700 mb-3">{L('Tender pricing is for company accounts verified by their commercial registration.', 'ٹینڈر کی قیمت تجارتی رجسٹریشن سے تصدیق شدہ کمپنی اکاؤنٹس کے لیے دستیاب ہے۔', 'تسعير المناقصات متاح لحسابات الشركات الموثّقة بالسجل التجاري.')}</p>
            <Link href="/settings" className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-xl font-bold text-white text-sm bg-[#0B2438]">{L('Verify my commercial registration', 'تجارتی رجسٹریشن کی تصدیق', 'وثّق سجلك التجاري')}</Link>
          </div>
        )}

        {allowed !== false && (<>
          <label className="block bg-white rounded-2xl border border-gray-200 p-4">
            <span className="block text-sm font-bold text-[#0B2438] mb-1.5">{L('Tender name', 'ٹینڈر کا نام', 'اسم المناقصة')}</span>
            <input value={title} onChange={(e: any) => setTitle(e.target.value.slice(0, 200))} className="input-field" placeholder={L('e.g. Energy centre — stage 4', 'مثلاً: انرجی سینٹر — چوتھا مرحلہ', 'مثال: مركز الطاقة — المرحلة الرابعة')} />
            <span className="block text-xs text-gray-500 mt-1"><Glyph e="🔒" /> {L('Only you see this name; it is never sent to suppliers.', 'یہ نام صرف آپ دیکھتے ہیں؛ یہ کبھی سپلائرز کو نہیں بھیجا جاتا۔', 'يظهر هذا الاسم لك وحدك، ولا يُرسل إلى الموردين أبداً.')}</span>
          </label>

          {/* BOQ */}
          <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
            onDragOver={(e: any) => { if (!saving) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
            onDrop={(e: any) => { e.preventDefault(); e.stopPropagation(); if (!saving && boq?.status !== 'reading') onBoq(e.dataTransfer?.files?.[0] || null) }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-bold text-[#0B2438]"><Glyph e="📋" /> {L('1. Bill of quantities (Excel)', '1. مقداروں کا جدول (Excel)', '1. جدول الكميات (Excel)')}</h2>
              <label className="min-h-11 inline-flex items-center px-4 py-2 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 text-sm font-bold text-[#8F6820] cursor-pointer">
                {boq ? L('Replace', 'تبدیل کریں', 'استبدال') : L('Choose file', 'فائل منتخب کریں', 'اختر الملف')}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e: any) => { onBoq(e.target.files?.[0] || null); e.target.value = '' }} />
              </label>
            </div>
            {!boq && <p className="text-xs text-gray-500">{L('Required. Up to 15 MB. You can also drop the file here.', 'ضروری۔ 15 میگا بائٹ تک۔ آپ فائل یہاں چھوڑ بھی سکتے ہیں۔', 'مطلوب. حتى 15 ميجابايت. ويمكنك سحب الملف وإفلاته هنا.')}</p>}
            {boqError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {boqError}
                {boqNotExcel && (
                  <Link href="/contractor/project/new" className="block mt-1.5 font-bold text-[#0B2438] underline">
                    {L('For a PDF or a photo, use «Add a bill of quantities» →', 'PDF یا تصویر کے لیے «مقداروں کا جدول شامل کریں» استعمال کریں ←', 'للملف PDF أو الصورة استخدم «إضافة جدول الكميات» ←')}
                  </Link>
                )}
              </div>
            )}
            {boq && (
              <div className="rounded-xl bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-gray-800 break-all">{boq.file.name} <span className="text-gray-500 font-normal">· {fmtSize(boq.file.size)}</span></div>
                  {boq.status !== 'reading' && !saving && (
                    <button type="button" onClick={() => { setBoq(null); setBoqError('') }} className="min-h-11 px-2 text-xs font-bold text-gray-600 hover:underline shrink-0">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
                  )}
                </div>
                {boq.status === 'reading' && <p className="text-gray-600 mt-1">{L('Reading…', 'پڑھا جا رہا ہے…', 'جارٍ القراءة…')}</p>}
                {boq.status === 'error' && <p className="text-red-600 mt-1">{boq.error}</p>}
                {(boq.status === 'error' || (boq.status === 'done' && boq.items.length === 0)) && otherFormatHelp}
                {boq.status === 'done' && boq.stats && (
                  <div className="mt-2 space-y-1 text-gray-700">
                    <p>{L(`${boq.stats.sheets_read.length} trade sheets read, ${boq.stats.sheets_skipped.length} skipped (cover, summary, collections).`, `کاموں کی ${boq.stats.sheets_read.length} شیٹس پڑھی گئیں، ${boq.stats.sheets_skipped.length} چھوڑ دی گئیں (سرورق، خلاصہ اور مجموعے کی شیٹس)۔`, `أوراق الأعمال المقروءة: ${arSheets(boq.stats.sheets_read.length)}، والمتجاهَلة: ${arSheets(boq.stats.sheets_skipped.length)} (الغلاف والملخص وأوراق التجميع).`)}</p>
                    <p className="font-semibold">{L(`${boq.items.length} items`, `${boq.items.length} آئٹمز`, arItems(boq.items.length))}: {(['material', 'works', 'provisional'] as const).map(k => `${kindLabel(k, L)} ${byKind?.[k] || 0}`).join(' · ')}</p>
                    <p>{L(`${boqCodes} drawing codes, ${boq.sections} headings.`, `ڈرائنگ کے ${boqCodes} کوڈز، ${boq.sections} سرخیاں۔`, `رموز المخططات: ${arCodes(boqCodes)}، والعناوين: ${arHeadings(boq.sections)}.`)}</p>
                    {boq.items.length === 0 && <p className="text-red-600">{L('No priced rows found (no «Unit / Qty» header).', 'کوئی آئٹم نہیں ملا («یونٹ / مقدار» کی سرخی موجود نہیں)۔', 'لم يُعثر على بنود (لا يوجد عنوان «الوحدة / الكمية»).')}</p>}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* PDFs */}
          {(['spec', 'drawing'] as PdfKind[]).map((kind, idx) => (
            <section key={kind} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
              onDragOver={(e: any) => { if (!saving) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
              onDrop={(e: any) => { e.preventDefault(); e.stopPropagation(); if (!saving) addPdfs(e.dataTransfer?.files || null, kind) }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="font-bold text-[#0B2438]"><Glyph e={kind === 'spec' ? '📑' : '📏'} /> {idx + 2}. {kind === 'spec' ? L('Specifications (PDF)', 'تفصیلات (PDF)', 'المواصفات (PDF)') : L('Drawings (PDF)', 'ڈرائنگز (PDF)', 'المخططات (PDF)')}</h2>
                <label className="min-h-11 inline-flex items-center px-4 py-2 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 text-sm font-bold text-[#8F6820] cursor-pointer">
                  {L('Add files', 'فائلیں شامل کریں', 'أضف ملفات')}
                  <input type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={(e: any) => { addPdfs(e.target.files, kind); e.target.value = '' }} />
                </label>
              </div>
              <p className="text-xs text-gray-500">{L('Optional. Any size: large files are read here page by page; files above 15 MB are not uploaded, only their text.', 'اختیاری۔ کوئی بھی سائز: بڑی فائلیں یہیں صفحہ بہ صفحہ پڑھی جاتی ہیں؛ 15 میگا بائٹ سے بڑی فائلیں اپ لوڈ نہیں ہوتیں، صرف ان کا نکالا گیا متن۔', 'اختياري. أي حجم: تُقرأ الملفات الكبيرة هنا صفحةً صفحة، وما يزيد على 15 ميجابايت لا يُرفع، بل نصّه المستخرج فقط.')}</p>
              {pdfError[kind] && <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">{pdfError[kind]}</div>}
              {jobs.filter(j => j.kind === kind).map(j => (
                <div key={j.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800 break-all">{j.file.name} <span className="text-gray-500 font-normal">· {fmtSize(j.file.size)}</span></span>
                    {j.status !== 'reading' && !saving && (
                      <button type="button" onClick={() => setJobs(js => js.filter(x => x.id !== j.id))} className="min-h-11 px-2 text-xs font-bold text-gray-600 hover:underline shrink-0">
{L('Remove', 'ہٹائیں', 'إزالة')}</button>
                    )}
                  </div>
                  {j.status === 'queued' && <p className="text-gray-500 mt-1">{L('Waiting…', 'انتظار…', 'في الانتظار…')}</p>}
                  {j.status === 'reading' && (
                    <div className="mt-2">
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-[#D4A543] transition-all" style={{ width: `${j.total ? Math.round((j.done / j.total) * 100) : 3}%` }} /></div>
                      <p className="text-xs text-gray-600 mt-1">{L(`Page ${j.done} of ${j.total || '…'}`, `صفحہ ${j.done} / ${j.total || '…'}`, `الصفحة ${j.done} من ${j.total || '…'}`)}</p>
                    </div>
                  )}
                  {j.status === 'error' && <p className="text-red-600 mt-1">{j.error}</p>}
                  {j.status === 'done' && j.data && (
                    <div className="mt-1.5 space-y-1 text-gray-700">
                      <p>{L(`${j.data.numPages} pages read.`, `${j.data.numPages} صفحات پڑھے گئے۔`, `المقروء: ${arPages(j.data.numPages)}.`)}
                        {j.data.emptyPages.length > 0 && <span className="text-[#8F6820]"> {L(`${j.data.emptyPages.length} pages have no text (scans): not read.`, `${j.data.emptyPages.length} صفحات میں متن نہیں (اسکین شدہ)، اس لیے نہیں پڑھے گئے۔`, `بلا نص (ممسوحة ضوئياً) ولم تُقرأ: ${arPages(j.data.emptyPages.length)}.`)}</span>}
                      </p>
                      {j.kind === 'spec' && j.index && <p>{L(`${j.index.sections.filter(s => s.level === 0).length} sections, ${j.index.sections.length} headings found.`, `${j.index.sections.filter(s => s.level === 0).length} حصے اور ${j.index.sections.length} سرخیاں ملیں۔`, `الأقسام: ${j.index.sections.filter(s => s.level === 0).length}، والعناوين: ${arHeadings(j.index.sections.length)}.`)}</p>}
                      {j.kind === 'spec' && j.index?.codes && <p className="text-[#0F6E56] font-semibold">{L(`Code coordination matrix: ${Object.keys(j.index.codes).length} codes linked to their sections.`, `کوڈ میٹرکس: ${Object.keys(j.index.codes).length} کوڈ اپنے سیکشن سے منسلک۔`, `جدول تنسيق الرموز: رُبط ${arCodes(Object.keys(j.index.codes).length)} بأقسام المواصفات.`)}</p>}
                      {j.kind === 'drawing' && (j.drawings || []).map(d => (
                        <p key={d.page}>
                          <b>{d.sheet_no || L(`Page ${d.page}`, `صفحہ ${d.page}`, `الصفحة ${d.page}`)}</b>{d.title ? ` — ${d.title}` : ''}
                          {' · '}{L(`${d.rooms.length} rooms, ${d.tags.reduce((s, t) => s + t.count, 0)} tags (${d.tags.length} codes), ${Object.keys(d.legend).length} legend entries`, `${d.rooms.length} کمرے، ${d.tags.reduce((s, t) => s + t.count, 0)} ٹیگز (${d.tags.length} کوڈز)، لیجنڈ کے ${Object.keys(d.legend).length} اندراجات`
, `الغرف: ${d.rooms.length}، الوسوم: ${d.tags.reduce((s, t) => s + t.count, 0)} (${arCodes(d.tags.length)})، بنود المفتاح: ${Object.keys(d.legend).length}`)}
                        </p>
                      ))}
                      {j.file.size > MAX_ORIGINAL_BYTES && <p className="text-[#8F6820] font-semibold">{L('Only the extracted text is saved because the file is large; keep the original with you.', 'فائل بڑی ہے، صرف متن محفوظ ہوگا؛ اصل اپنے پاس رکھیں۔', 'حُفظ النص المستخرج فقط لأن الملف كبير؛ احتفظ بالأصل لديك.')}</p>}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-gray-600">
              {reading ? L('Reading files… you can keep adding files. Stay on this page: leaving stops the reading.', 'فائلیں پڑھی جا رہی ہیں… اس صفحے پر رہیں: صفحہ چھوڑنے سے پڑھنا رک جائے گا۔', 'جارٍ قراءة الملفات… يمكنك متابعة إضافة الملفات. ابقَ في هذه الصفحة، فمغادرتها توقف القراءة.')
                : saving ? saveMsg
                : <>{L('Ready: BOQ', 'تیار: مقداروں کا جدول', 'الجاهز: جدول الكميات')} {boq?.status === 'done' ? <Glyph e="✓" /> : '—'}{L(` · specifications ${doneSpecs.length} · drawings ${doneDrawings.length}`, ` · تفصیلات ${doneSpecs.length} · ڈرائنگز ${doneDrawings.length}`, ` · المواصفات ${doneSpecs.length} · المخططات ${doneDrawings.length}`)}</>}
              {/* a disabled button always says why (UX-142) */}
              {!canSave && !reading && !saving && (
                <span className="block text-xs font-semibold text-[#8F6820] mt-1">
                  {!title.trim()
                    ? L('Write the tender name to continue.', 'جاری رکھنے کے لیے ٹینڈر کا نام لکھیں۔', 'اكتب اسم المناقصة للمتابعة.')
                    : !(boq?.status === 'done' && boq.items.length > 0)
                      ? <>{L('Upload a bill of quantities in Excel with priced rows to continue.', 'جاری رکھنے کے لیے Excel میں مقداروں کا جدول اپ لوڈ کریں جس میں آئٹمز ہوں۔', 'ارفع جدول كميات بصيغة Excel يحتوي بنوداً للمتابعة.')}{boq && boq.status !== 'reading' && <> <Link href="/contractor/project/new" className="underline">{L('Or use «Add a bill of quantities».', 'یا «مقداروں کا جدول شامل کریں» استعمال کریں۔', 'أو استخدم «إضافة جدول الكميات».')}</Link></>}</>
                      : ''}
                </span>
              )}
            </p>
            <button type="button" disabled={!canSave} onClick={save} className="min-h-11 px-6 py-3 rounded-xl font-bold text-sm text-[#071827] disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
              {saving ? L('Saving…', 'محفوظ کیا جا رہا ہے…', 'جارٍ الحفظ…') : L('Save and open the review', 'محفوظ کریں اور جائزہ کھولیں', 'احفظ وافتح المراجعة')}
            </button>
          </div>
        </>)}
      </div>
    </AppShell>
  )
}
