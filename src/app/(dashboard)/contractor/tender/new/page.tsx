'use client'

// «مسار العطاء» — step 1: upload the tender documents. Everything is read IN THE BROWSER:
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
import { canUseProjects } from '@/lib/plans'
import { readBoqWorkbook, readNrmBoq } from '@/lib/tender/boqNrm'
import { readDrawings } from '@/lib/tender/drawingText'
import { buildSpecIndex } from '@/lib/tender/specIndex'
import { runChecks } from '@/lib/tender/checks'
import { routeItem } from '@/lib/tender/classify'
import { itemToRow } from '@/lib/tender/rows'
import { MAX_ORIGINAL_BYTES, MAX_BOQ_BYTES, extractPdfInBrowser } from '@/lib/tender/browserPdf'
import type { TenderItem, BoqReadStats, ExtractedPdf, DrawingSummary, SpecIndex } from '@/lib/tender/types'
import { makeL, kindLabel, fmtSize } from '@/components/tender/labels'

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
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const stopRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
      supabase.from('profiles').select('role, verification_status, cr_verified_at, subscription_plan, subscription_expires_at').eq('id', data.session.user.id).single()
        .then(({ data: p }: any) => setAllowed(canUseProjects(p)))
    })
    return () => { stopRef.current = true }
  }, [])

  // ── BOQ: read in the browser ──────────────────────────────────────────────────────────────
  async function onBoq(file: File | null) {
    if (!file) return
    setError('')
    if (file.size > MAX_BOQ_BYTES) { setError(L('The BOQ file is larger than 15 MB.', 'BOQ فائل 15 MB سے بڑی ہے۔', 'ملف جدول الكميات أكبر من 15 ميجابايت.')); return }
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setError(L('The BOQ must be an Excel file (xlsx, xls) or CSV.', 'BOQ ایکسل (xlsx, xls) یا CSV ہونی چاہیے۔', 'يجب أن يكون جدول الكميات ملف Excel (xlsx أو xls) أو CSV.')); return }
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
    const add: PdfJob[] = []
    for (const f of Array.from(list)) {
      if (!/\.pdf$/i.test(f.name)) { setError(L('Only PDF files here.', 'یہاں صرف PDF فائلیں۔', 'تُقبل ملفات PDF فقط هنا.')); continue }
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
      .catch(() => patch({ status: 'error', error: L('Could not read this PDF (protected or damaged?).', 'یہ PDF نہیں پڑھی جا سکی۔', 'تعذّرت قراءة ملف PDF هذا (محمي أو تالف؟).') }))
      .finally(() => { busyRef.current = false; setJobs(js => [...js]) })
  }, [jobs]) // eslint-disable-line react-hooks/exhaustive-deps

  const reading = jobs.some(j => j.status === 'queued' || j.status === 'reading') || boq?.status === 'reading'
  const doneDrawings = jobs.filter(j => j.kind === 'drawing' && j.status === 'done')
  const doneSpecs = jobs.filter(j => j.kind === 'spec' && j.status === 'done')
  const canSave = !!user && !!title.trim() && boq?.status === 'done' && boq.items.length > 0 && !reading && !saving

  // ── save: tender → files (+ extracted JSON, thumbnails) → checked items ────────────────────
  async function save() {
    if (!canSave || !boq) return
    setSaving(true); setError('')
    const supabase = createClient()
    const bucket = supabase.storage.from('tenders')
    try {
      setSaveMsg(L('Creating the tender…', 'ٹینڈر بنایا جا رہا ہے…', 'جارٍ إنشاء العطاء…'))
      const { data: tender, error: tErr } = await supabase.from('tenders').insert({ contractor_id: user.id, title: title.trim().slice(0, 200), status: 'draft' }).select('id').single()
      if (tErr || !tender) throw new Error(tErr?.message || 'tender')
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
        setSaveMsg(L(`Saving ${j.file.name}…`, `${j.file.name} محفوظ…`, `جارٍ حفظ ${j.file.name}…`))
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
      setSaveMsg(L('Checking the BOQ against the drawings and specifications…', 'جانچ ہو رہی ہے…', 'جارٍ مطابقة جدول الكميات مع المخططات والمواصفات…'))
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
      window.location.href = `/contractor/tender/${tender.id}`
    } catch (e: any) {
      const m = String(e?.message || '')
      setError(m.includes('tenders_daily_limit') ? L('Daily limit of new tenders reached.', 'نئے ٹینڈرز کی روزانہ حد پوری۔', 'وصلت إلى الحد اليومي للعطاءات الجديدة.')
        : m.includes('Bucket not found') || m.includes('relation') ? L('The tender workspace is not enabled yet on the server.', 'سرور پر ابھی فعال نہیں۔', 'مسار العطاء غير مفعّل على الخادم بعد.')
        : L('Could not save the tender. Check your connection and try again.', 'ٹینڈر محفوظ نہیں ہو سکا۔', 'تعذّر حفظ العطاء. تحقّق من الاتصال وحاول مرة أخرى.'))
      setSaving(false); setSaveMsg('')
    }
  }

  const byKind = boq?.stats?.by_kind
  const boqCodes = boq ? new Set(boq.items.flatMap(i => i.codes)).size : 0

  return (
    <AppShell title={L('Tender pricing', 'ٹینڈر قیمت', 'مسار العطاء')} nav={getNav('contractor', locale, '/contractor/tender')} dir={dir}>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0B2438]">{L('New tender', 'نیا ٹینڈر', 'عطاء جديد')}</h1>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {L('Upload the bill of quantities, the specifications and the drawings. They are read in your browser; every number is linked to its source, every inconsistency is flagged, and nothing goes to suppliers until you approve it.',
              'BOQ، تفصیلات اور ڈرائنگز اپلوڈ کریں۔ ہر عدد اپنے ماخذ سے جڑا ہے، ہر تضاد نشان زد ہوتا ہے، اور آپ کی منظوری کے بغیر کچھ سپلائرز کو نہیں جاتا۔',
              'ارفع جدول الكميات والمواصفات والمخططات. تُقرأ الملفات في متصفحك، ويُربط كل رقم بمصدره، ويُنبَّه إلى كل تعارض، ولا يُرسل شيء للموردين قبل اعتمادك.')}
          </p>
        </div>

        {allowed === false && (
          <div className="bg-white rounded-2xl border border-[#D4A543]/40 p-6 text-center">
            <p className="text-sm text-gray-700 mb-3">{L('The tender workspace is for verified companies.', 'یہ تصدیق شدہ کمپنیوں کے لیے ہے۔', 'مسار العطاء متاح لحسابات الشركات الموثّقة.')}</p>
            <Link href="/settings" className="inline-block px-5 py-2.5 rounded-xl font-bold text-white text-sm bg-[#0B2438]">{L('Verify my commercial registration', 'تجارتی رجسٹریشن کی تصدیق', 'وثّق سجلك التجاري')}</Link>
          </div>
        )}

        {allowed !== false && (<>
          <label className="block bg-white rounded-2xl border border-gray-200 p-4">
            <span className="block text-sm font-bold text-[#0B2438] mb-1.5">{L('Tender name', 'ٹینڈر کا نام', 'اسم العطاء')}</span>
            <input value={title} onChange={(e: any) => setTitle(e.target.value.slice(0, 200))} className="input-field" placeholder={L('e.g. Energy centre — stage 4', 'مثلاً انرجی سینٹر', 'مثال: مركز الطاقة — المرحلة الرابعة')} />
          </label>

          {/* BOQ */}
          <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-bold text-[#0B2438]"><Glyph e="📋" /> {L('1. Bill of quantities (Excel)', '1. BOQ (ایکسل)', '1. جدول الكميات (Excel)')}</h2>
              <label className="px-4 py-2 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 text-sm font-bold text-[#8F6820] cursor-pointer">
                {boq ? L('Replace', 'تبدیل کریں', 'استبدال') : L('Choose file', 'فائل منتخب کریں', 'اختر الملف')}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e: any) => onBoq(e.target.files?.[0] || null)} />
              </label>
            </div>
            {!boq && <p className="text-xs text-gray-500">{L('Required. Up to 15 MB.', 'ضروری۔ 15 MB تک۔', 'مطلوب. حتى 15 ميجابايت.')}</p>}
            {boq && (
              <div className="rounded-xl bg-gray-50 p-3 text-sm">
                <div className="font-semibold text-gray-800">{boq.file.name} <span className="text-gray-500 font-normal">· {fmtSize(boq.file.size)}</span></div>
                {boq.status === 'reading' && <p className="text-gray-600 mt-1">{L('Reading…', 'پڑھا جا رہا ہے…', 'جارٍ القراءة…')}</p>}
                {boq.status === 'error' && <p className="text-red-600 mt-1">{boq.error}</p>}
                {boq.status === 'done' && boq.stats && (
                  <div className="mt-2 space-y-1 text-gray-700">
                    <p>{L(`${boq.stats.sheets_read.length} trade sheets read, ${boq.stats.sheets_skipped.length} skipped (cover, summary, collections).`, `${boq.stats.sheets_read.length} شیٹس پڑھی گئیں، ${boq.stats.sheets_skipped.length} چھوڑی گئیں۔`, `قُرئت ${boq.stats.sheets_read.length} ورقة أعمال، وتُجوهلت ${boq.stats.sheets_skipped.length} (الغلاف والملخص وأوراق التجميع).`)}</p>
                    <p className="font-semibold">{L(`${boq.items.length} items`, `${boq.items.length} آئٹمز`, `${boq.items.length} بنداً`)}: {(['material', 'works', 'provisional'] as const).map(k => `${kindLabel(k, L)} ${byKind?.[k] || 0}`).join(' · ')}</p>
                    <p>{L(`${boqCodes} drawing codes, ${boq.sections} headings.`, `${boqCodes} کوڈز، ${boq.sections} سرخیاں۔`, `${boqCodes} رمزاً للمخططات، و${boq.sections} عنواناً.`)}</p>
                    {boq.items.length === 0 && <p className="text-red-600">{L('No priced rows found (no «Unit / Qty» header).', 'کوئی آئٹم نہیں ملا۔', 'لم يُعثر على بنود (لا يوجد عنوان «الوحدة / الكمية»).')}</p>}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* PDFs */}
          {(['spec', 'drawing'] as PdfKind[]).map((kind, idx) => (
            <section key={kind} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="font-bold text-[#0B2438]"><Glyph e={kind === 'spec' ? '📑' : '📏'} /> {idx + 2}. {kind === 'spec' ? L('Specifications (PDF)', 'تفصیلات (PDF)', 'المواصفات (PDF)') : L('Drawings (PDF)', 'ڈرائنگز (PDF)', 'المخططات (PDF)')}</h2>
                <label className="px-4 py-2 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 text-sm font-bold text-[#8F6820] cursor-pointer">
                  {L('Add files', 'فائلیں شامل کریں', 'أضف ملفات')}
                  <input type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={(e: any) => { addPdfs(e.target.files, kind); e.target.value = '' }} />
                </label>
              </div>
              <p className="text-xs text-gray-500">{L('Optional. Any size: large files are read here page by page; files above 15 MB are not uploaded, only their text.', 'اختیاری۔ کوئی بھی سائز۔', 'اختياري. أي حجم: تُقرأ الملفات الكبيرة هنا صفحةً صفحة، وما يزيد على 15 ميجابايت لا يُرفع، بل نصّه المستخرج فقط.')}</p>
              {jobs.filter(j => j.kind === kind).map(j => (
                <div key={j.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800 break-all">{j.file.name} <span className="text-gray-500 font-normal">· {fmtSize(j.file.size)}</span></span>
                    {(j.status === 'queued' || j.status === 'error') && (
                      <button type="button" onClick={() => setJobs(js => js.filter(x => x.id !== j.id))} className="text-xs font-bold text-gray-500 hover:underline">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
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
                      <p>{L(`${j.data.numPages} pages read.`, `${j.data.numPages} صفحات پڑھے گئے۔`, `قُرئت ${j.data.numPages} صفحة.`)}
                        {j.data.emptyPages.length > 0 && <span className="text-amber-700"> {L(`${j.data.emptyPages.length} pages have no text (scans): not read.`, `${j.data.emptyPages.length} صفحات میں متن نہیں۔`, `${j.data.emptyPages.length} صفحة بلا نص (ممسوحة ضوئياً) لم تُقرأ.`)}</span>}
                      </p>
                      {j.kind === 'spec' && j.index && <p>{L(`${j.index.sections.filter(s => s.level === 0).length} sections, ${j.index.sections.length} headings found.`, `${j.index.sections.length} سرخیاں ملیں۔`, `وُجد ${j.index.sections.filter(s => s.level === 0).length} قسماً و${j.index.sections.length} عنواناً.`)}</p>}
                      {j.kind === 'spec' && j.index?.codes && <p className="text-[#0F6E56] font-semibold">{L(`Code coordination matrix: ${Object.keys(j.index.codes).length} codes linked to their sections.`, `کوڈ میٹرکس: ${Object.keys(j.index.codes).length} کوڈ اپنے سیکشن سے منسلک۔`, `جدول تنسيق الرموز: رُبط ${Object.keys(j.index.codes).length} رمزاً بأقسام المواصفات.`)}</p>}
                      {j.kind === 'drawing' && (j.drawings || []).map(d => (
                        <p key={d.page}>
                          <b>{d.sheet_no || L(`Page ${d.page}`, `صفحہ ${d.page}`, `الصفحة ${d.page}`)}</b>{d.title ? ` — ${d.title}` : ''}
                          {' · '}{L(`${d.rooms.length} rooms, ${d.tags.reduce((s, t) => s + t.count, 0)} tags (${d.tags.length} codes), ${Object.keys(d.legend).length} legend entries`, `${d.rooms.length} کمرے، ${d.tags.length} کوڈز`, `${d.rooms.length} غرفة، ${d.tags.reduce((s, t) => s + t.count, 0)} وسماً (${d.tags.length} رمزاً)، ${Object.keys(d.legend).length} بنداً في المفتاح`)}
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
              {reading ? L('Reading files… you can keep adding files.', 'فائلیں پڑھی جا رہی ہیں…', 'جارٍ قراءة الملفات… يمكنك متابعة إضافة الملفات.')
                : saving ? saveMsg
                : L(`Ready: BOQ ${boq?.status === 'done' ? '✓' : '—'} · specifications ${doneSpecs.length} · drawings ${doneDrawings.length}`, `تیار: BOQ · تفصیلات ${doneSpecs.length} · ڈرائنگز ${doneDrawings.length}`, `الجاهز: جدول الكميات ${boq?.status === 'done' ? '✓' : '—'} · المواصفات ${doneSpecs.length} · المخططات ${doneDrawings.length}`)}
            </p>
            <button type="button" disabled={!canSave} onClick={save} className="px-6 py-3 rounded-xl font-bold text-sm text-[#071827] disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
              {saving ? L('Saving…', 'محفوظ…', 'جارٍ الحفظ…') : L('Save and open the review', 'محفوظ کریں اور جائزہ کھولیں', 'احفظ وافتح المراجعة')}
            </button>
          </div>
        </>)}
      </div>
    </AppShell>
  )
}
