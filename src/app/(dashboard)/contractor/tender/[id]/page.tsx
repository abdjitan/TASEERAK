'use client'

// «مسار العطاء» — step 2: review. Summary of items and flags, a filterable items table, and per
// item a side panel with its sources (BOQ row, spec quotes, drawing sheets with tag counts),
// edit fields and «اعتماد». Only approved MATERIAL items go to suppliers, through the existing
// project → price request path (/contractor/project/new receives them as a draft).
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import Glyph from '@/components/shared/Glyph'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, SUB_CATEGORIES, SECTOR_PRODUCTS, UNIT_OPTIONS, getSubCategoryLabel, type Sector } from '@/types'
import { runChecks, specCheck, isFlagFree, SEVERITY_ORDER } from '@/lib/tender/checks'
import { specHitsFor } from '@/lib/tender/checks'
import { buildSpecIndex } from '@/lib/tender/specIndex'
import { rowToItem, slimFlags, draftItemFromRow } from '@/lib/tender/rows'
import { catalogCandidates } from '@/lib/ai/catalogGround'
import type { DrawingSummary, SpecIndex, PdfPageText, TenderFlag } from '@/lib/tender/types'
import { makeL, kindLabel, KIND_TONE, severityLabel, SEVERITY_TONE, fmtNum, areaStatusLabel, AREA_TONE } from '@/components/tender/labels'
import type { AreaCheckRow } from '@/lib/tender/checks'

const PROJECT_DRAFT_KEY = 'tsk_project_draft' // the project page's draft (restored on open)
const PAGE = 150

export default function TenderReviewPage() {
  const params = useParams() as any
  const id = String(params?.id || '')
  const { locale, dir } = useTranslation()
  const L = makeL(locale)
  const [user, setUser] = useState<any>(null)
  const [tender, setTender] = useState<any>(null)
  const [files, setFiles] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [specs, setSpecs] = useState<{ index: SpecIndex; pages: PdfPageText[] }[]>([])
  const [specLoading, setSpecLoading] = useState(false)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [selId, setSelId] = useState<string | null>(null)
  const [edit, setEdit] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  // filters
  const [fSheet, setFSheet] = useState('')
  const [fKind, setFKind] = useState('material')
  const [fFlag, setFFlag] = useState('')
  const [fText, setFText] = useState('')
  const [limit, setLimit] = useState(PAGE)

  // ── load ─────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
      const { data: t, error: tErr } = await supabase.from('tenders').select('*').eq('id', id).single()
      if (tErr || !t) { setLoadError(L('Tender not found.', 'ٹینڈر نہیں ملا۔', 'العطاء غير موجود.')); setLoading(false); return }
      setTender(t)
      const { data: f } = await supabase.from('tender_files').select('*').eq('tender_id', id).order('created_at')
      setFiles(f || [])
      // all items (PostgREST returns at most 1000 rows per call)
      const all: any[] = []
      for (let from = 0; from < 20000; from += 1000) {
        const { data: chunk, error } = await supabase.from('tender_items').select('*').eq('tender_id', id).order('sheet').order('row_no').range(from, from + 999)
        if (error) break
        all.push(...(chunk || []))
        if (!chunk || chunk.length < 1000) break
      }
      // workbook order: the sheet number prefix («8 - …», «14 - …»), then the row
      const sheetNo = (s: string) => parseInt((s || '').match(/^\s*(\d+)/)?.[1] || '9999', 10)
      all.sort((a, b) => sheetNo(a.sheet) - sheetNo(b.sheet) || String(a.sheet).localeCompare(String(b.sheet)) || (a.row_no || 0) - (b.row_no || 0))
      setRows(all)
      setLoading(false)
      // drawing thumbnails (signed, private bucket)
      const paths: string[] = []
      for (const file of f || []) for (const d of (file.summary?.drawings || []) as any[]) if (d.thumb_path) paths.push(d.thumb_path)
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('tenders').createSignedUrls(paths, 3600)
        const map: Record<string, string> = {}
        for (const s of (signed || []) as any[]) if (s.signedUrl && s.path) map[s.path] = s.signedUrl
        setThumbs(map)
      }
      // specifications: their extracted text, for quotes
      const specFiles = (f || []).filter((x: any) => x.kind === 'spec' && x.extracted_path)
      if (specFiles.length) {
        setSpecLoading(true)
        const out: { index: SpecIndex; pages: PdfPageText[] }[] = []
        for (const sf of specFiles) {
          try {
            const { data: blob } = await supabase.storage.from('tenders').download(sf.extracted_path)
            if (!blob) continue
            const json = JSON.parse(await blob.text())
            out.push({ index: buildSpecIndex(sf.name, json.pages || []), pages: json.pages || [] })
          } catch { /* a missing spec file only removes its quotes */ }
        }
        setSpecs(out)
        setSpecLoading(false)
      }
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const drawings: DrawingSummary[] = useMemo(() => files.filter(f => f.kind === 'drawing').flatMap(f => (f.summary?.drawings || []) as DrawingSummary[]), [files])
  const items = useMemo(() => rows.map(rowToItem), [rows])
  const fast = useMemo(() => runChecks({ items, drawings }), [items, drawings])
  // spec matching is heavier: once per set of materials
  const materialKeys = useMemo(() => items.filter(i => i.kind === 'material').map(i => i.key).join('|'), [items])
  const specRes = useMemo(() => specCheck(items.filter(i => i.kind === 'material'), specs), [specs, materialKeys]) // eslint-disable-line react-hooks/exhaustive-deps
  const byItem = useMemo(() => {
    const m: Record<string, TenderFlag[]> = {}
    for (const f of [...fast.flags, ...specRes.flags]) if (f.item_key) (m[f.item_key] = m[f.item_key] || []).push(f)
    for (const k of Object.keys(m)) m[k].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    return m
  }, [fast, specRes])
  const tenderFlags = useMemo(() => fast.flags.filter(f => !f.item_key), [fast])

  // ── summary ──────────────────────────────────────────────────────────────────────────────
  const kindCount: Record<string, number> = {}
  for (const r of rows) kindCount[r.kind] = (kindCount[r.kind] || 0) + 1
  const sevCount: Record<string, number> = {}
  for (const f of [...fast.flags, ...specRes.flags]) sevCount[f.severity] = (sevCount[f.severity] || 0) + 1
  const approvedMaterials = rows.filter(r => r.approved && r.kind === 'material')
  const sheets = useMemo(() => Array.from(new Set(rows.map(r => r.sheet))).filter(Boolean), [rows])

  const filtered = useMemo(() => {
    const q = fText.trim().toLowerCase()
    return rows.filter(r => {
      if (fSheet && r.sheet !== fSheet) return false
      if (fKind && r.kind !== fKind) return false
      const fl = byItem[r.item_key] || []
      if (fFlag === 'flagged' && isFlagFree(fl)) return false
      if (fFlag === 'clean' && !isFlagFree(fl)) return false
      if (fFlag === 'approved' && !r.approved) return false
      if (fFlag === 'pending' && r.approved) return false
      if (['error', 'warning', 'review'].includes(fFlag) && !fl.some(f => f.severity === fFlag)) return false
      if (q && !`${r.description} ${r.product_name || ''} ${(r.codes || []).join(' ')} ${r.ref || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, fSheet, fKind, fFlag, fText, byItem])

  const sel = rows.find(r => r.id === selId) || null
  useEffect(() => {
    if (!sel) { setEdit(null); return }
    setEdit({ product_name: sel.product_name || '', unit: sel.unit || '', qty: sel.qty == null ? '' : String(sel.qty), kind: sel.kind, specification: sel.specification || '', sector: sel.sector || 'civil', sub_category: sel.sub_category || '' })
  }, [selId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── writes ───────────────────────────────────────────────────────────────────────────────
  const sent = tender?.status === 'sent'
  async function saveItem(approve?: boolean) {
    if (!sel || !edit || sent) return
    setBusy(true); setMsg('')
    const supabase = createClient()
    const qty = edit.qty === '' ? null : Number(String(edit.qty).replace(/[^0-9.]/g, ''))
    const next: Record<string, any> = {
      product_name: edit.product_name.trim().slice(0, 120) || null, unit: edit.unit || null, qty: qty != null && Number.isFinite(qty) ? qty : null,
      kind: edit.kind, specification: edit.specification.trim().slice(0, 600) || null, sector: edit.sector || null, sub_category: edit.sub_category || null,
    }
    // remember the BOQ's own value of every field the company changes (traceability)
    const edited = { ...(sel.edited || {}) }
    for (const k of Object.keys(next)) {
      const before = sel[k] == null ? null : sel[k]
      const after = next[k]
      if (String(before ?? '') !== String(after ?? '') && !(k in edited)) edited[k] = before
    }
    const patch: Record<string, any> = { ...next, edited }
    if (approve !== undefined) { patch.approved = approve; patch.approved_at = approve ? new Date().toISOString() : null }
    const updatedRow = { ...sel, ...patch }
    const fl = runChecks({ items: [rowToItem(updatedRow)], drawings }).byItem[sel.item_key] || []
    patch.flags = slimFlags([...fl, ...(specRes.flags.filter(f => f.item_key === sel.item_key))])
    const { error } = await supabase.from('tender_items').update(patch).eq('id', sel.id)
    setBusy(false)
    if (error) { setMsg(L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔', 'تعذّر الحفظ. حاول مرة أخرى.')); return }
    setRows(rs => rs.map(r => (r.id === sel.id ? { ...r, ...patch } : r)))
    setMsg(approve ? L('Approved.', 'منظور۔', 'اعتُمد البند.') : approve === false ? L('Approval removed.', 'منظوری ہٹا دی۔', 'أُلغي الاعتماد.') : L('Saved.', 'محفوظ۔', 'حُفظ.'))
  }

  async function bulkApprove() {
    if (sent) return
    const ids = filtered.filter(r => r.kind === 'material' && !r.approved && isFlagFree(byItem[r.item_key]) && r.sub_category && (Number(r.qty) > 0 || r.lump_sum)).map(r => r.id)
    if (!ids.length) { setMsg(L('No flag-free materials to approve in this view.', 'کوئی صاف آئٹم نہیں۔', 'لا توجد مواد خالية من التنبيهات لاعتمادها في هذا العرض.')); return }
    if (!confirm(L(`Approve ${ids.length} flag-free material items shown?`, `${ids.length} آئٹمز منظور کریں؟`, `اعتماد ${ids.length} بنداً من المواد الخالية من التنبيهات في هذا العرض؟`))) return
    setBusy(true)
    const supabase = createClient()
    const at = new Date().toISOString()
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from('tender_items').update({ approved: true, approved_at: at }).in('id', ids.slice(i, i + 200))
      if (error) { setBusy(false); setMsg(L('Could not approve all. Try again.', 'سب منظور نہیں ہو سکے۔', 'تعذّر اعتماد الكل. حاول مرة أخرى.')); return }
    }
    const set = new Set(ids)
    setRows(rs => rs.map(r => (set.has(r.id) ? { ...r, approved: true, approved_at: at } : r)))
    setBusy(false)
    setMsg(L(`${ids.length} items approved.`, `${ids.length} منظور۔`, `اعتُمد ${ids.length} بنداً.`))
  }

  function sendApproved() {
    if (!approvedMaterials.length) return
    const unrouted = approvedMaterials.filter(r => !r.sub_category).length
    if (!confirm(L(`Send ${approvedMaterials.length} approved material items to the price request page?${unrouted ? ` (${unrouted} have no specialty yet: choose it there.)` : ''}\n\nWorks, provisional sums and unapproved items are not sent.`,
      `${approvedMaterials.length} منظور آئٹمز قیمت کی درخواست کے صفحے پر بھیجیں؟`,
      `نقل ${approvedMaterials.length} بنداً معتمداً من المواد إلى صفحة طلب التسعير؟${unrouted ? ` (${unrouted} بلا تخصص بعد: اختره هناك.)` : ''}\n\nلا تُرسل الأعمال ولا المبالغ الاحتياطية ولا البنود غير المعتمدة.`))) return
    const draft = {
      title: tender.title,
      projectNotes: `مسار العطاء: ${tender.title} — ${approvedMaterials.length} بنداً معتمداً من جدول الكميات`,
      deliveryRequired: true, deliveryLocation: '',
      items: approvedMaterials.map((r, i) => draftItemFromRow(r, i)),
      tender_id: tender.id,
    }
    try { localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify(draft)) } catch {
      alert(L('Could not prepare the request in this browser.', 'تیار نہیں ہو سکا۔', 'تعذّر تجهيز الطلب في هذا المتصفح.')); return
    }
    window.location.href = '/contractor/project/new'
  }

  // ── side panel data ──────────────────────────────────────────────────────────────────────
  const selItem = sel ? items.find(i => i.key === sel.item_key) : null
  const selLinks = sel ? fast.codeLinks.filter(l => (sel.codes || []).includes(l.code)) : []
  const selSpec = useMemo(() => (selItem && specs.length ? specHitsFor(selItem, specs).slice(0, 3) : []), [selItem, specs])
  const selArea = sel ? fast.areaChecks.filter(a => a.boq_items.includes(sel.item_key)) : []
  const pct = (n: number | null) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n}%`)
  const roomsOf = (a: AreaCheckRow) => a.rooms.map(r => `${r.code || ''} ${r.name} ${fmtNum(r.area)}${r.low ? '?' : ''}`.trim()).join(' · ')
  const areaNote = (a: AreaCheckRow) => a.status === 'partial'
    ? a.partial.map(p => L(`Partial: ${p.have} of ${p.of} sheets of this level uploaded`, `جزوی: اس لیول کی ${p.of} میں سے ${p.have} شیٹس`, `جزئية: رُفعت ${p.have} من ${p.of} لوحات من هذا المستوى`)).join(' · ')
    : a.status === 'walls' ? L('Paint is on walls: floor area is not comparable.', 'پینٹ دیواروں پر: فرش کا رقبہ موازنہ کے قابل نہیں۔', 'الدهان على الجدران: مساحة الأرضية لا تصلح للمقارنة.')
    : ''
  const thumbFor = (file: string, page: number) => {
    const d = drawings.find(x => x.file === file && x.page === page)
    return d?.thumb_path ? thumbs[d.thumb_path] : undefined
  }
  const candidates = useMemo(() => {
    if (!edit?.product_name || edit.product_name.length < 2) return []
    try { return catalogCandidates([edit.product_name], (edit.sector || null) as Sector, 4) } catch { return [] }
  }, [edit?.product_name, edit?.sector]) // eslint-disable-line react-hooks/exhaustive-deps
  const catalogNames = useMemo(() => Array.from(new Set(Object.values(SECTOR_PRODUCTS).flat())), [])

  const card = (label: string, value: number | string, tone = 'text-[#0B2438]') => (
    <div className="bg-white rounded-2xl border border-gray-200 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-extrabold ${tone}`}>{value}</div>
    </div>
  )

  return (
    <AppShell title={L('Tender review', 'ٹینڈر جائزہ', 'مراجعة العطاء')} nav={getNav('contractor', locale, '/contractor/tender')} dir={dir}>
      <div className="max-w-7xl mx-auto space-y-4">
        {loading && <p className="text-sm text-gray-500">{loadError || L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</p>}
        {!loading && loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!loading && tender && (<>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Link href="/contractor/tender" className="text-xs font-bold text-[#8F6820] hover:underline">{L('All tenders', 'تمام ٹینڈرز', 'كل العطاءات')}</Link>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0B2438]">{tender.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">{files.map(f => `${f.kind === 'boq' ? L('BOQ', 'BOQ', 'جدول الكميات') : f.kind === 'spec' ? L('Spec', 'تفصیل', 'مواصفات') : L('Drawing', 'ڈرائنگ', 'مخطط')}: ${f.name}${f.storage_path ? '' : f.kind !== 'boq' ? L(' (text only)', ' (صرف متن)', ' (النص فقط)') : ''}`).join(' · ')}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {sent && tender.project_rfq_id && <span className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0F6E56]/10 text-[#0F6E56]">{L('Sent for pricing', 'بھیج دیا گیا', 'أُرسل للتسعير')}</span>}
              <button type="button" disabled={busy || sent} onClick={bulkApprove} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-[#0F6E56] text-[#0F6E56] disabled:opacity-40">
                {L('Approve flag-free materials shown', 'صاف مواد منظور کریں', 'اعتماد المواد الخالية من التنبيهات (المعروضة)')}
              </button>
              <button type="button" disabled={busy || sent || !approvedMaterials.length} onClick={sendApproved} className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {L(`Send approved materials for pricing (${approvedMaterials.length})`, `منظور مواد قیمت کے لیے بھیجیں (${approvedMaterials.length})`, `إرسال المواد المعتمدة للتسعير (${approvedMaterials.length})`)}
              </button>
            </div>
          </div>
          {msg && <div className="rounded-xl bg-[#0B2438]/5 p-2.5 text-sm text-[#0B2438]">{msg}</div>}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {card(kindLabel('material', L), kindCount.material || 0, 'text-[#0F6E56]')}
            {card(kindLabel('works', L), kindCount.works || 0, 'text-gray-600')}
            {card(kindLabel('provisional', L), kindCount.provisional || 0, 'text-[#8F6820]')}
            {card(L('Approved materials', 'منظور مواد', 'مواد معتمدة'), `${approvedMaterials.length}/${kindCount.material || 0}`)}
            {card(severityLabel('error', L), sevCount.error || 0, 'text-red-600')}
            {card(severityLabel('warning', L), sevCount.warning || 0, 'text-amber-700')}
            {card(severityLabel('review', L), sevCount.review || 0, 'text-sky-700')}
            {card(L('Drawings / specs', 'ڈرائنگز / تفصیلات', 'المخططات / المواصفات'), `${drawings.length} / ${specs.length}${specLoading ? '…' : ''}`)}
          </div>

          {tenderFlags.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 p-3">
              <summary className="text-sm font-bold text-[#0B2438] cursor-pointer">{L(`Tender-wide findings (${tenderFlags.length}): codes on the drawings without a BOQ item`, `عمومی نتائج (${tenderFlags.length})`, `ملاحظات على مستوى العطاء (${tenderFlags.length}): رموز في المخططات بلا بند في الجدول`)}</summary>
              <ul className="mt-2 space-y-1.5">
                {tenderFlags.map((f, i) => (
                  <li key={i} className={`text-xs rounded-lg border p-2 ${SEVERITY_TONE[f.severity]}`}>
                    <b>{severityLabel(f.severity, L)}:</b> {locale === 'ar' || locale === 'ur' ? f.ar : f.en}
                    <span className="block text-[11px] opacity-80 mt-0.5">{f.sources.map(s => `${s.sheet || s.file}${s.page ? ` p${s.page}` : ''}`).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {fast.areaChecks.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 p-3">
              <summary className="text-sm font-bold text-[#0B2438] cursor-pointer">
                {L(`Area comparison (${fast.areaChecks.length}): room areas on the drawings vs BOQ m²`, `رقبے کا موازنہ (${fast.areaChecks.length})`, `مقارنة المساحات (${fast.areaChecks.length}): مساحات الغرف في المخططات مقابل م² في الجدول`)}
              </summary>
              <p className="text-[11px] text-gray-500 mt-1">{L('Rooms are matched to finish tags by position on the sheet (a «?» marks a low-confidence room). A difference needs review; it is not an error.', 'کمروں کو شیٹ پر مقام سے ملایا گیا ہے («?» = کم یقین)۔ فرق جائزہ مانگتا ہے، غلطی نہیں۔', 'تُنسب الغرف إلى رموز التشطيب حسب موقعها في اللوحة (علامة «?» تعني نسبة غير مؤكدة). الفرق يحتاج مراجعة وليس خطأً.')}</p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 text-start">
                      <th className="p-1.5 text-start">{L('Code', 'کوڈ', 'الرمز')}</th>
                      <th className="p-1.5 text-start">{L('Legend', 'لیجنڈ', 'وصف المفتاح')}</th>
                      <th className="p-1.5 text-start">{L('BOQ m²', 'BOQ م²', 'الجدول م²')}</th>
                      <th className="p-1.5 text-start">{L('Drawings m²', 'ڈرائنگز م²', 'المخططات م²')}</th>
                      <th className="p-1.5 text-start">{L('Difference', 'فرق', 'الفرق')}</th>
                      <th className="p-1.5 text-start">{L('Status', 'حالت', 'الحالة')}</th>
                      <th className="p-1.5 text-start">{L('Rooms / sheets', 'کمرے / شیٹس', 'الغرف / اللوحات')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fast.areaChecks.map(a => (
                      <tr key={a.code} className="border-t border-gray-100 align-top">
                        <td className="p-1.5 font-mono font-bold text-[#0B2438]" dir="ltr">{a.code}</td>
                        <td className="p-1.5" dir="ltr">{a.legend || '—'}</td>
                        <td className="p-1.5" dir="ltr">{fmtNum(a.boq_qty)}</td>
                        <td className="p-1.5" dir="ltr">{fmtNum(a.drawing_area)}</td>
                        <td className="p-1.5" dir="ltr">{a.status === 'walls' ? '—' : pct(a.diff_pct)}</td>
                        <td className="p-1.5"><span className={`px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${AREA_TONE[a.status] || ''}`}>{areaStatusLabel(a.status, L)}</span>{areaNote(a) && <span className="block text-[11px] text-gray-500 mt-0.5">{areaNote(a)}</span>}</td>
                        <td className="p-1.5 text-gray-600"><span dir="ltr">{roomsOf(a) || '—'}</span><span className="block text-[11px] text-gray-400 break-all" dir="ltr">{a.sheets.join(' · ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select value={fSheet} onChange={(e: any) => { setFSheet(e.target.value); setLimit(PAGE) }} className="input-field text-sm">
              <option value="">{L('All trades', 'تمام شعبے', 'كل الأعمال (الأوراق)')}</option>
              {sheets.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={fKind} onChange={(e: any) => { setFKind(e.target.value); setLimit(PAGE) }} className="input-field text-sm">
              <option value="">{L('All kinds', 'تمام اقسام', 'كل الأنواع')}</option>
              {(['material', 'works', 'provisional'] as const).map(k => <option key={k} value={k}>{kindLabel(k, L)}</option>)}
            </select>
            <select value={fFlag} onChange={(e: any) => { setFFlag(e.target.value); setLimit(PAGE) }} className="input-field text-sm">
              <option value="">{L('All items', 'تمام آئٹمز', 'كل البنود')}</option>
              <option value="flagged">{L('With flags', 'نشان والے', 'عليها تنبيهات')}</option>
              <option value="clean">{L('Flag-free', 'صاف', 'خالية من التنبيهات')}</option>
              <option value="error">{severityLabel('error', L)}</option>
              <option value="warning">{severityLabel('warning', L)}</option>
              <option value="review">{severityLabel('review', L)}</option>
              <option value="approved">{L('Approved', 'منظور', 'معتمدة')}</option>
              <option value="pending">{L('Not approved', 'غیر منظور', 'غير معتمدة')}</option>
            </select>
            <input value={fText} onChange={(e: any) => { setFText(e.target.value); setLimit(PAGE) }} className="input-field text-sm" placeholder={L('Search: words, code, ref', 'تلاش', 'بحث: كلمات، رمز، مرجع')} />
          </div>

          <div className="grid lg:grid-cols-[1fr_440px] gap-4 items-start">
            {/* table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">{L(`${filtered.length} items`, `${filtered.length} آئٹمز`, `${filtered.length} بنداً`)}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="p-2 text-start whitespace-nowrap">{L('Ref', 'حوالہ', 'المرجع')}</th>
                      <th className="p-2 text-start">{L('Description', 'تفصیل', 'الوصف')}</th>
                      <th className="p-2 text-start whitespace-nowrap">{L('Qty', 'مقدار', 'الكمية')}</th>
                      <th className="p-2 text-start whitespace-nowrap">{L('Checks', 'جانچ', 'الفحص')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, limit).map(r => {
                      const fl = byItem[r.item_key] || []
                      const worst = fl[0]?.severity
                      return (
                        <tr key={r.id} onClick={() => setSelId(r.id)} className={`border-t border-gray-100 cursor-pointer hover:bg-[#D4A543]/5 ${selId === r.id ? 'bg-[#D4A543]/10' : ''}`}>
                          <td className="p-2 align-top whitespace-nowrap text-xs text-gray-600" dir="ltr">{r.ref || `${r.row_no}`}</td>
                          <td className="p-2 align-top">
                            <div className="text-gray-900 line-clamp-2" dir="ltr">{r.item_text}</div>
                            <div className="text-[11px] text-gray-500 line-clamp-1" dir="ltr">{r.lead_in || ''}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.kind !== 'material' && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${KIND_TONE[r.kind]}`}>{kindLabel(r.kind, L)}</span>}
                              {(r.codes || []).map((c: string) => <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B2438]/5 text-[#0B2438]" dir="ltr">{c}</span>)}
                              {r.product_name && r.kind === 'material' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{r.product_name.slice(0, 50)}</span>}
                            </div>
                          </td>
                          <td className="p-2 align-top whitespace-nowrap" dir="ltr">{r.lump_sum && r.qty == null ? L('lump sum', 'یکمشت', 'مقطوعية') : `${fmtNum(r.qty)} ${r.unit || ''}`}</td>
                          <td className="p-2 align-top whitespace-nowrap">
                            {r.approved && <span className="text-[11px] font-bold text-[#0F6E56] block"><Glyph e="✅" /> {L('Approved', 'منظور', 'معتمد')}</span>}
                            {worst ? <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${SEVERITY_TONE[worst]}`}>{severityLabel(worst, L)}{fl.length > 1 ? ` +${fl.length - 1}` : ''}</span>
                              : !r.approved && <span className="text-[11px] text-gray-400">{L('clean', 'صاف', 'سليم')}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > limit && (
                <button type="button" onClick={() => setLimit(l => l + PAGE)} className="w-full py-2.5 text-sm font-bold text-[#8F6820] border-t border-gray-100">{L('Show more', 'مزید دکھائیں', 'عرض المزيد')}</button>
              )}
            </div>

            {/* side panel */}
            <div className={`${sel ? 'fixed inset-0 z-40 bg-black/30 lg:static lg:bg-transparent lg:z-auto' : 'hidden lg:block'}`} onClick={() => setSelId(null)}>
              <aside onClick={(e: any) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl lg:max-h-[calc(100vh-120px)] lg:sticky lg:top-4 bg-white border border-gray-200 p-4 space-y-4">
                {!sel && <p className="text-sm text-gray-500">{L('Choose an item to see its sources and approve it.', 'آئٹم منتخب کریں۔', 'اختر بنداً لعرض مصادره واعتماده.')}</p>}
                {sel && edit && (<>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-gray-500" dir="ltr">{sel.sheet} · {L('row', 'قطار', 'صف')} {sel.row_no}{sel.ref ? ` · ${sel.ref}` : ''}</div>
                      <span className={`inline-block mt-1 text-[11px] font-bold px-1.5 py-0.5 rounded ${KIND_TONE[sel.kind]}`}>{kindLabel(sel.kind, L)}{sel.kind_reason ? ` («${sel.kind_reason}»)` : ''}</span>
                    </div>
                    <button type="button" onClick={() => setSelId(null)} className="text-sm font-bold text-gray-500">{L('Close', 'بند کریں', 'إغلاق')}</button>
                  </div>

                  {/* flags */}
                  {(byItem[sel.item_key] || []).length > 0 && (
                    <ul className="space-y-1.5">
                      {(byItem[sel.item_key] || []).map((f, i) => (
                        <li key={i} className={`text-xs rounded-lg border p-2 ${SEVERITY_TONE[f.severity]}`}>
                          <b>{severityLabel(f.severity, L)}:</b> {locale === 'en' ? f.en : f.ar}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* BOQ source */}
                  <section>
                    <h3 className="text-xs font-bold text-[#0B2438] mb-1"><Glyph e="📋" /> {L('BOQ source', 'BOQ ماخذ', 'المصدر في جدول الكميات')}</h3>
                    <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-800 space-y-1" dir="ltr">
                      {sel.section && <div className="text-gray-500">{sel.trade} › {sel.section}{sel.series ? ` › ${sel.series}` : ''}</div>}
                      {sel.lead_in && <div className="text-gray-600">{sel.lead_in}</div>}
                      <div className="font-semibold">{sel.ref ? `${sel.ref.split(' ').pop()} | ` : ''}{sel.item_text}</div>
                      <div>{L('Unit', 'یونٹ', 'الوحدة')}: {sel.unit_raw || '—'} · {L('Qty', 'مقدار', 'الكمية')}: {fmtNum(sel.edited && 'qty' in sel.edited ? sel.edited.qty : sel.qty)}{sel.rate != null ? ` · ${L('Rate', 'ریٹ', 'السعر')}: ${fmtNum(sel.rate)}` : ''}{sel.amount != null ? ` · ${L('Amount', 'رقم', 'الإجمالي')}: ${fmtNum(sel.amount)}` : ''}</div>
                      {sel.etimad_code && <div className="text-gray-500">Etimad: {sel.etimad_label ? `${sel.etimad_label} - ` : ''}{sel.etimad_code}</div>}
                      {sel.edited && Object.keys(sel.edited).length > 0 && <div className="text-[#8F6820]" dir={dir}>{L('Changed by you: ', 'آپ نے بدلا: ', 'عدّلتَ: ')}{Object.keys(sel.edited).join('، ')}</div>}
                    </div>
                  </section>

                  {/* spec */}
                  {specs.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold text-[#0B2438] mb-1"><Glyph e="📑" /> {L('Specification', 'تفصیلات', 'المواصفات')}</h3>
                      {selSpec.length === 0 && <p className="text-xs text-gray-500">{L('No section found.', 'کوئی حصہ نہیں ملا۔', 'لم يُعثر على قسم.')}</p>}
                      {selSpec.map((h, i) => (
                        <div key={i} className="rounded-xl bg-gray-50 p-2.5 text-xs mb-1.5" dir="ltr">
                          <div className="font-semibold text-[#0B2438]">{h.section.id} {h.section.title} <span className="text-gray-500 font-normal">· {h.file} p{h.quotes[0]?.page || h.section.page_from}</span></div>
                          {h.quotes.map((q, k) => <div key={k} className="text-gray-700 mt-1">«{q.text}» <span className="text-gray-400">p{q.page}</span></div>)}
                        </div>
                      ))}
                    </section>
                  )}

                  {/* area comparison */}
                  {selArea.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold text-[#0B2438] mb-1"><Glyph e="🗺" /> {L('Area comparison', 'رقبے کا موازنہ', 'مقارنة المساحات')}</h3>
                      {selArea.map(a => (
                        <div key={a.code} className="rounded-xl bg-gray-50 p-2.5 text-xs mb-1.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <b className="font-mono" dir="ltr">{a.code}</b>
                            <span className={`px-1.5 py-0.5 rounded-md font-bold ${AREA_TONE[a.status] || ''}`}>{areaStatusLabel(a.status, L)}</span>
                          </div>
                          {a.status !== 'walls' && <div>{L(`BOQ ${fmtNum(a.boq_qty)} m² · drawings ${fmtNum(a.drawing_area)} m² (${pct(a.diff_pct)})`, `BOQ ${fmtNum(a.boq_qty)} م² · ڈرائنگز ${fmtNum(a.drawing_area)} م² (${pct(a.diff_pct)})`, `في الجدول ${fmtNum(a.boq_qty)} م² · في المخططات ${fmtNum(a.drawing_area)} م² (${pct(a.diff_pct)})`)}{a.boq_items.length > 1 ? L(` · sum of ${a.boq_items.length} items`, ` · ${a.boq_items.length} آئٹمز کا مجموعہ`, ` · مجموع ${a.boq_items.length} بنود`) : ''}</div>}
                          {areaNote(a) && <div className="text-gray-500">{areaNote(a)}</div>}
                          <div className="text-gray-600" dir="ltr">{roomsOf(a) || '—'}</div>
                          <div className="text-[11px] text-gray-400 break-all" dir="ltr">{a.sheets.join(' · ')}</div>
                        </div>
                      ))}
                    </section>
                  )}

                  {/* drawings */}
                  {selLinks.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold text-[#0B2438] mb-1"><Glyph e="📏" /> {L('Drawings', 'ڈرائنگز', 'المخططات')}</h3>
                      {selLinks.map(l => (
                        <div key={l.code} className="rounded-xl bg-gray-50 p-2.5 text-xs mb-1.5 space-y-1.5">
                          <div dir="ltr"><b className="font-mono">{l.code}</b>{l.legend ? ` — ${l.legend}` : ''}</div>
                          <div>{L(`BOQ ${fmtNum(l.boq_qty)} · on the uploaded drawings ${l.drawing_count}`, `BOQ ${fmtNum(l.boq_qty)} · ڈرائنگز ${l.drawing_count}`, `في الجدول ${fmtNum(l.boq_qty)} · في المخططات المرفوعة ${l.drawing_count}`)}</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {l.on_drawings.map((o, k) => {
                              const src = thumbFor(o.file, o.page)
                              return (
                                <a key={k} href={src || undefined} target="_blank" rel="noreferrer" className="block rounded-lg border border-gray-200 bg-white p-1">
                                  {src ? <img src={src} alt="" className="w-full h-24 object-contain" /> : <div className="h-24 grid place-items-center text-gray-400"><Glyph e="📄" /></div>}
                                  <div className="text-[10px] text-gray-600 mt-0.5 break-all" dir="ltr">{o.sheet || o.file} · ×{o.count}</div>
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </section>
                  )}

                  {/* edit */}
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold text-[#0B2438]"><Glyph e="✏" /> {L('What suppliers will receive', 'سپلائرز کو کیا ملے گا', 'ما سيصل إلى الموردين')}</h3>
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{L('Material name', 'مواد کا نام', 'اسم المادة')}</span>
                      <input list="tender-catalog" value={edit.product_name} disabled={sent} onChange={(e: any) => setEdit((d: any) => ({ ...d, product_name: e.target.value }))} className="input-field text-sm" />
                      <datalist id="tender-catalog">{catalogNames.map(n => <option key={n} value={n} />)}</datalist>
                    </label>
                    {candidates.length > 0 && !sent && (
                      <div className="flex flex-wrap gap-1">
                        {candidates.filter(c => c.name !== edit.product_name).map(c => (
                          <button key={c.sector + c.name} type="button" onClick={() => setEdit((d: any) => ({ ...d, product_name: c.name, sector: c.sector }))} className="text-[11px] px-2 py-1 rounded-lg border border-[#D4A543]/50 bg-[#D4A543]/5 text-[#8F6820]">{c.name}</button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{L('Quantity', 'مقدار', 'الكمية')}</span>
                        <input inputMode="decimal" value={edit.qty} disabled={sent} onChange={(e: any) => setEdit((d: any) => ({ ...d, qty: e.target.value }))} className="input-field text-sm" dir="ltr" />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{L('Unit', 'یونٹ', 'الوحدة')}</span>
                        <select value={edit.unit} disabled={sent} onChange={(e: any) => setEdit((d: any) => ({ ...d, unit: e.target.value }))} className="input-field text-sm">
                          <option value="">—</option>
                          {Array.from(new Set([edit.unit, 'مقطوعية', 'عدد', ...UNIT_OPTIONS].filter(Boolean))).map((u: string) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{L('Sector', 'شعبہ', 'القطاع')}</span>
                        <select value={edit.sector} disabled={sent} onChange={(e: any) => setEdit((d: any) => ({ ...d, sector: e.target.value, sub_category: '' }))} className="input-field text-sm">
                          {(Object.keys(SECTOR_LABELS) as Sector[]).map(s => <option key={s} value={s}>{SECTOR_LABELS[s]}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{L('Specialty', 'مہارت', 'التخصص')}</span>
                        <select value={edit.sub_category} disabled={sent} onChange={(e: any) => setEdit((d: any) => ({ ...d, sub_category: e.target.value }))} className={`input-field text-sm ${!edit.sub_category ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}>
                          <option value="">{L('Choose', 'منتخب کریں', 'اختر')}</option>
                          {Object.keys((SUB_CATEGORIES as any)[edit.sector] || {}).map(k => <option key={k} value={k}>{getSubCategoryLabel(edit.sector as Sector, k, locale)}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{L('Kind', 'قسم', 'النوع')}</span>
                      <select value={edit.kind} disabled={sent} onChange={(e: any) => setEdit((d: any) => ({ ...d, kind: e.target.value }))} className="input-field text-sm">
                        {(['material', 'works', 'provisional'] as const).map(k => <option key={k} value={k}>{kindLabel(k, L)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-gray-600 mb-0.5">{L('Specification for suppliers (empty = the BOQ wording)', 'تفصیل', 'المواصفة للموردين (فارغة = نص جدول الكميات)')}</span>
                      <textarea value={edit.specification} disabled={sent} onChange={(e: any) => setEdit((d: any) => ({ ...d, specification: e.target.value }))} rows={3} className="input-field text-sm" dir="auto" />
                    </label>
                    {!sent && (
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" disabled={busy} onClick={() => saveItem()} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-300 text-gray-700 disabled:opacity-40">{L('Save', 'محفوظ کریں', 'حفظ')}</button>
                        {sel.approved
                          ? <button type="button" disabled={busy} onClick={() => saveItem(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 text-red-700 disabled:opacity-40">{L('Remove approval', 'منظوری ہٹائیں', 'إلغاء الاعتماد')}</button>
                          : <button type="button" disabled={busy || edit.kind !== 'material'} onClick={() => saveItem(true)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#0F6E56' }}>{L('Save and approve', 'محفوظ اور منظور', 'حفظ واعتماد')}</button>}
                      </div>
                    )}
                  </section>
                </>)}
              </aside>
            </div>
          </div>
        </>)}
      </div>
    </AppShell>
  )
}
