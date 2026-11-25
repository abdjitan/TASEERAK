'use client'

// «تسعير مناقصة» (tender pricing) — step 2: review. Summary of items and flags, a filterable items table, and per
// item a side panel with its sources (BOQ row, spec quotes, drawing sheets with tag counts),
// edit fields and «اعتماد». Only approved MATERIAL items go to suppliers, through the existing
// project → price request path (/contractor/project/new receives them as a draft).
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import Glyph from '@/components/shared/Glyph'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, getSectorLabel, SUB_CATEGORIES, SECTOR_PRODUCTS, UNIT_OPTIONS, getSubCategoryLabel, getUnitLabel, getProductLabel, detectSubCategory, missingSpecs, type Sector } from '@/types'
import ItemSpecFields from '@/components/tender/ItemSpecFields'
import { useFocusTrap } from '@/components/shared/useFocusTrap'
import { readProjectDraft, writeProjectDraft, fetchBoqServerDraft } from '@/lib/tender/projectDraft'
import { toLatinDigits } from '@/lib/phone'
import { arItems } from '@/lib/text'
import { runChecks, specCheck, isFlagFree, SEVERITY_ORDER } from '@/lib/tender/checks'
import { specHitsFor } from '@/lib/tender/checks'
import { buildSpecIndex } from '@/lib/tender/specIndex'
import { rowToItem, slimFlags, draftItemFromRow } from '@/lib/tender/rows'
import { catalogCandidates } from '@/lib/ai/catalogGround'
import type { DrawingSummary, SpecIndex, PdfPageText, TenderFlag } from '@/lib/tender/types'
import { makeL, kindLabel, KIND_TONE, severityLabel, SEVERITY_TONE, fmtNum, areaStatusLabel, AREA_TONE } from '@/components/tender/labels'
import type { AreaCheckRow } from '@/lib/tender/checks'
import { askConfirm } from '@/lib/askConfirm'
import PageLoader from '@/components/shared/PageLoader'
import { storedBuyerType } from '@/lib/buyerType'
import { arCount, arMaterials } from '@/lib/text'
import HomeModeNotice from '@/components/tender/HomeModeNotice'

// a sector + specialty pair suppliers can be routed by (UX-023): the specialty must belong to the sector
const validPair = (sector: string | null | undefined, sub: string | null | undefined) => !!sector && !!sub && !!(SUB_CATEGORIES as any)[sector]?.[sub]
// the specialty of a material in a sector: its own when it belongs there, else the best keyword match, else none
const subFor = (name: string, sector: string, current?: string | null) => (validPair(sector, current) ? String(current) : (name ? detectSubCategory(name, sector as Sector) || '' : ''))

const PAGE = 150
// one sector name per language on every page (round-7 UX-141): no local name map
const sectorName = (s: string, locale: string) => getSectorLabel(s, locale)
// «١٢٫٥» / «12,500» / «١٢٬٥٠٠» → 12.5 / 12500 / 12500 (a comma is always a thousands separator: UX-002); '' → null; NaN → undefined (refused)
function parseQty(v: string): number | null | undefined {
  const t = toLatinDigits(String(v || '')).replace(/٫/g, '.').replace(/[,،٬\s]/g, '').trim()
  if (!t) return null
  if (!/^\d*\.?\d+$/.test(t)) return undefined
  return Number(t)
}

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
  const [homeMode, setHomeMode] = useState(false)
  // the save step could not upload an original file (only its read items/text are kept): UX-136
  const [originalsFailed, setOriginalsFailed] = useState(false)
  useEffect(() => { try { setOriginalsFailed(new URLSearchParams(window.location.search).get('originals') === 'failed') } catch {} }, [])
  const [specs, setSpecs] = useState<{ index: SpecIndex; pages: PdfPageText[] }[]>([])
  const [specLoading, setSpecLoading] = useState(false)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [selId, setSelId] = useState<string | null>(null)
  const [edit, setEdit] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [triedApprove, setTriedApprove] = useState(false) // round-7 UX-173: empty required specs show as errors after an approve attempt
  const [nameLocked, setNameLocked] = useState(true) // a catalog material's name is read-only until «تغيير المادة»
  // filters
  const [fSheet, setFSheet] = useState('')
  const [fKind, setFKind] = useState('material')
  const [fFlag, setFFlag] = useState('')
  const [fText, setFText] = useState('')
  const [limit, setLimit] = useState(PAGE)

  // ── load ─────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    // «لبيتي» mode hides tenders (never deletes them): say so, with the way back, instead of a silent redirect (UX-098)
    if (storedBuyerType() === 'individual') { setHomeMode(true); setLoading(false); return }
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
      const { data: bt } = await supabase.from('profiles').select('buyer_type').eq('id', data.session.user.id).maybeSingle()
      if ((bt as any)?.buyer_type === 'individual') { setHomeMode(true); setLoading(false); return }
      const { data: t, error: tErr } = await supabase.from('tenders').select('*').eq('id', id).single()
      if (tErr || !t) {
        // «not found» only when the row is really missing (PGRST116); otherwise the real problem
        setLoadError(!tErr || tErr.code === 'PGRST116' ? L('This tender was not found. It may have been deleted, or it belongs to another account.', 'یہ ٹینڈر نہیں ملا۔ شاید حذف ہو گیا ہے یا کسی اور اکاؤنٹ کا ہے۔', 'لم يُعثر على هذه المناقصة. ربما حُذفت، أو تخص حساباً آخر.')
          : L('Could not load the tender. Check your connection and reload the page.', 'ٹینڈر لوڈ نہیں ہو سکا۔ کنکشن چیک کر کے صفحہ دوبارہ لوڈ کریں۔', 'تعذّر تحميل المناقصة. تحقّق من الاتصال وأعد تحميل الصفحة.'))
        setLoading(false); return
      }
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
  // round-5 UX-021: an item already sent for pricing carries its request (sent_rfq_id) and is locked on its own;
  // only approved materials NOT sent yet go to the sending page
  const sentMaterials = rows.filter(r => r.kind === 'material' && r.sent_rfq_id)
  const approvedAll = rows.filter(r => r.approved && r.kind === 'material')
  const approvedMaterials = approvedAll.filter(r => !r.sent_rfq_id)
  const flaggedMaterials = rows.filter(r => r.kind === 'material' && !isFlagFree(byItem[r.item_key])).length
  // step 1 is done when every flagged material was looked at and approved (approving it = reviewed it): UX-095
  const flaggedPending = rows.filter(r => r.kind === 'material' && !r.approved && !isFlagFree(byItem[r.item_key])).length
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
    // a stored specialty that does not belong to the item's sector is cleared, never shown as chosen (UX-023)
    const sector0 = sel.sector || 'civil'
    setEdit({ product_name: sel.product_name || '', unit: sel.unit || '', qty: sel.qty == null ? '' : String(sel.qty), kind: sel.kind, specification: sel.specification || '', specs: sel.specs || {}, sector: sector0, sub_category: validPair(sector0, sel.sub_category) ? sel.sub_category : '' })
    setNameLocked(true); setMsg(''); setTriedApprove(false)
  }, [selId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── writes ───────────────────────────────────────────────────────────────────────────────
  const sent = tender?.status === 'sent'
  // sent in part: some materials went to suppliers (a request is linked) while the tender is still open
  const partSent = !sent && (!!tender?.project_rfq_id || sentMaterials.length > 0)
  // the offers: straight to the request when known (round-5 UX-158), else the project page
  // round-7 UX-078: every send is its own request (a «batch»); each keeps its own link to its offers
  const batchMap = new Map<string, number>()
  for (const r of sentMaterials) batchMap.set(String(r.sent_rfq_id), (batchMap.get(String(r.sent_rfq_id)) || 0) + 1)
  const batches = Array.from(batchMap.entries()).map(([rfqId, n]) => ({ rfqId, n }))
  const lastRfq = batches.length === 1 ? batches[0].rfqId : tender?.rfq_id || sentMaterials[sentMaterials.length - 1]?.sent_rfq_id || null
  const offersHref = batches.length > 1 ? '#tender-batches' : lastRfq ? `/contractor/rfq/${lastRfq}` : tender?.project_rfq_id ? `/contractor/project/${tender.project_rfq_id}` : null
  const selSent = !!sel?.sent_rfq_id // this item was sent: it cannot change (the rest of the tender can)
  const locked = sent || selSent
  // the required specs (size, grade…) still empty for the item being edited (round-5 UX-091)
  const specText = (e: any, r: any) => [(e?.specification || '').trim(), (r?.description || '').trim()].filter(Boolean).join(' ')
  const editMissingSpecs = !!edit && edit.kind === 'material' && !!edit.product_name ? missingSpecs(edit.product_name, (edit.sector || 'civil') as Sector, edit.specs || {}, specText(edit, sel)) : []
  async function saveItem(approve?: boolean, goNext = false) {
    if (!sel || !edit || locked) return
    const qty = parseQty(edit.qty)
    // Arabic digits are read as numbers; an unreadable or zero quantity is refused instead of saved as 0
    if (qty === undefined || qty === 0) { setMsg(L('Enter a quantity greater than zero (or leave it empty).', 'صفر سے زیادہ مقدار لکھیں (یا خالی چھوڑیں)۔', 'أدخل كمية أكبر من صفر (أو اتركها فارغة).')); return }
    // an approved item goes to suppliers: it needs a quantity (a lump sum counts as one) (UX-073)
    if (approve && !validPair(edit.sector, edit.sub_category)) { setMsg(L('Choose a specialty of this sector first: it routes the item to the right suppliers.', 'پہلے اس سیکٹر کا شعبہ منتخب کریں: یہی آئٹم کو صحیح سپلائرز تک پہنچاتا ہے۔', 'اختر تخصصاً من هذا القطاع أولاً، فهو ما يوصل البند إلى الموردين المختصين.')); return }
    if (approve && qty == null && !sel.lump_sum) { setMsg(L('Enter the quantity first: an item without a quantity cannot be priced.', 'پہلے مقدار لکھیں: بغیر مقدار آئٹم کی قیمت نہیں لگائی جا سکتی۔', 'أدخل الكمية أولاً، فلا يُسعَّر بند بلا كمية.')); return }
    if (approve && editMissingSpecs.length) { setTriedApprove(true); setMsg(L('Complete the required specifications (size, grade…) so suppliers can price it.', 'ضروری تفصیلات (سائز، گریڈ…) مکمل کریں تاکہ سپلائرز قیمت دے سکیں۔', 'أكمل المواصفات المطلوبة (المقاس، الدرجة…) ليتمكن الموردون من التسعير.')); return }
    setBusy(true); setMsg('')
    const supabase = createClient()
    const next: Record<string, any> = {
      product_name: edit.product_name.trim().slice(0, 120) || null, unit: edit.unit || null, qty: qty != null && Number.isFinite(qty) ? qty : null,
      kind: edit.kind, specification: edit.specification.trim().slice(0, 600) || null, sector: edit.sector || null, sub_category: edit.sub_category || null,
    }
    // the chosen spec fields (UX-091): stored apart from the traced fields (they are not in the BOQ)
    const specsClean: Record<string, string> = {}
    for (const [k, v] of Object.entries(edit.specs || {})) if (String(v || '').trim()) specsClean[k] = String(v).trim().slice(0, 80)
    // remember the BOQ's own value of every field the company changes (traceability)
    const edited = { ...(sel.edited || {}) }
    for (const k of Object.keys(next)) {
      const before = sel[k] == null ? null : sel[k]
      const after = next[k]
      if (String(before ?? '') !== String(after ?? '') && !(k in edited)) edited[k] = before
    }
    const patch: Record<string, any> = { ...next, edited, specs: specsClean }
    if (approve !== undefined) { patch.approved = approve; patch.approved_at = approve ? new Date().toISOString() : null }
    // round-7 UX-143: «حفظ» on an approved item that can no longer be approved (no specialty, no quantity, missing
    // specs, or no longer a material) saves it AND removes the approval, so it never goes to suppliers incomplete
    const lostApproval = approve === undefined && !!sel.approved &&
      (edit.kind !== 'material' || !validPair(edit.sector, edit.sub_category) || (qty == null && !sel.lump_sum) || editMissingSpecs.length > 0)
    if (lostApproval) { patch.approved = false; patch.approved_at = null }
    const updatedRow = { ...sel, ...patch }
    const fl = runChecks({ items: [rowToItem(updatedRow)], drawings }).byItem[sel.item_key] || []
    patch.flags = slimFlags([...fl, ...(specRes.flags.filter(f => f.item_key === sel.item_key))])
    const { error } = await supabase.from('tender_items').update(patch).eq('id', sel.id)
    setBusy(false)
    if (error) { setMsg(L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ. حاول مرة أخرى.')); return }
    setRows(rs => rs.map(r => (r.id === sel.id ? { ...r, ...patch } : r)))
    // the next item in the current view that still needs approval (approve and move on)
    if (goNext) {
      const at = filtered.findIndex(r => r.id === sel.id)
      const open = (r: any) => !r.approved && !r.sent_rfq_id && r.kind === 'material'
      const next = filtered.slice(at + 1).find(open) || filtered.find(r => r.id !== sel.id && open(r))
      if (next) { setSelId(next.id); setTimeout(() => setMsg(L('Approved. This is the next item.', 'منظور۔ یہ اگلا آئٹم ہے۔', 'اعتُمد البند، وهذا البند التالي.')), 0); return }
    }
    if (lostApproval) { setMsg(L('Saved, and the approval was removed: the item needs a specialty, a quantity and complete specifications.', 'محفوظ کر لیا گیا اور منظوری ہٹا دی گئی، کیونکہ آئٹم کو شعبہ، مقدار اور مکمل تفصیلات درکار ہیں۔', 'حُفظ وأُلغي الاعتماد لأن البند يحتاج تخصصاً وكمية ومواصفات مكتملة.')); return }
    setMsg(approve ? L('Approved.', 'منظور۔', 'اعتُمد البند.') : approve === false ? L('Approval removed.', 'منظوری ہٹا دی۔', 'أُلغي الاعتماد.') : L('Saved.', 'محفوظ۔', 'حُفظ.'))
  }

  async function bulkApprove() {
    if (sent) return
    const ids = bulkIds
    // «من البنود الظاهرة», never «في هذا العرض» (it reads as a supplier's offer): round-6 UX-102
    if (!ids.length) { setMsg(L('No materials without flags (with a specialty and a quantity) to approve among the items shown.', 'دکھائے گئے آئٹمز میں منظوری کے لیے بغیر انتباہ کوئی مواد (شعبے اور مقدار کے ساتھ) نہیں۔', 'لا توجد مواد بلا تنبيهات (ولها تخصص وكمية) لاعتمادها من البنود الظاهرة.')); return }
    if (!(await askConfirm(L(`Approve ${ids.length} material items without flags among the items shown?`, `دکھائے گئے آئٹمز میں سے بغیر انتباہ ${ids.length} مواد آئٹمز منظور کریں؟`, `اعتماد ${arItems(ids.length)} من المواد بلا تنبيهات من البنود الظاهرة؟`)))) return
    setBusy(true)
    const supabase = createClient()
    const at = new Date().toISOString()
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from('tender_items').update({ approved: true, approved_at: at }).in('id', ids.slice(i, i + 200))
      if (error) { setBusy(false); setMsg(L('Could not approve all. Try again.', 'سب منظور نہیں ہو سکے۔ دوبارہ کوشش کریں۔', 'تعذّر اعتماد الكل. حاول مرة أخرى.')); return }
    }
    const set = new Set(ids)
    setRows(rs => rs.map(r => (set.has(r.id) ? { ...r, approved: true, approved_at: at } : r)))
    setBusy(false)
    setMsg(L(`${ids.length} items approved.`, `${ids.length} آئٹمز منظور ہو گئے۔`, `اعتُمد ${arItems(ids.length)}.`))
  }

  async function sendApproved() {
    if (!approvedMaterials.length) return
    // a line whose specialty does not belong to its sector goes as «choose its specialty», never mismatched (UX-023)
    const toLine = (r: any, i: number) => {
      const it: any = draftItemFromRow(r, i)
      if (!validPair(it.sector, it.sub_category)) { it.sub_category = null; it.needs_classification = true; it.done = false }
      return it
    }
    const unrouted = approvedMaterials.filter(r => !validPair(r.sector, r.sub_category)).length
    // this opens the sending page (nothing is sent yet). The list already there from THIS tender is merged, never
    // replaced: its settings and lines (with the buyer's edits) stay, and only newly approved items are added (UX-093).
    // Another unsent list is replaced, after saying so.
    const uid = user?.id || ''
    let prev: any = readProjectDraft(uid)
    if (!prev?.items?.length) { try { prev = (await fetchBoqServerDraft(createClient()))?.data || prev } catch {} }
    const prevItems: any[] = prev && Array.isArray(prev.items) ? prev.items : []
    const sameTender = !!prev && prev.tender_id === tender.id && prevItems.length > 0
    const other = !sameTender && prevItems.length ? prevItems.length : 0
    const have = new Set(sameTender ? prevItems.map((it: any) => it.tender_item_id).filter(Boolean) : [])
    const fresh = approvedMaterials.filter(r => !have.has(r.id))
    if (sameTender && !fresh.length) { window.location.href = '/contractor/project/new'; return }
    const moveN = sameTender ? fresh.length : approvedMaterials.length
    const mergeEn = sameTender ? `\n\nThe list already on that page (${prevItems.length} items) keeps your edits; only the new items are added.` : ''
    const mergeUr = sameTender ? `\n\nاس صفحے پر موجود فہرست (${prevItems.length} آئٹمز) میں آپ کی ترامیم باقی رہیں گی؛ صرف نئے آئٹمز شامل ہوں گے۔` : ''
    const mergeAr = sameTender ? `\n\nتبقى القائمة الموجودة في تلك الصفحة (${arItems(prevItems.length)}) بتعديلاتك، وتُضاف إليها البنود الجديدة فقط.` : ''
    if (!(await askConfirm(L(`Move ${moveN} approved material items to the sending page? You review the delivery details there and send.${unrouted ? ` (${unrouted} have no specialty yet: choose it there.)` : ''}\n\nWorks, provisional sums and unapproved items are not moved.${mergeEn}${other ? `\n\nThis replaces another unsent list on that page (${other} items).` : ''}`,
      `${moveN} منظور مواد آئٹمز بھیجنے کے صفحے پر لے جائیں؟ وہاں ڈیلیوری کی تفصیل دیکھ کر بھیجیں۔${unrouted ? ` (${unrouted} کا شعبہ ابھی منتخب نہیں: وہاں منتخب کریں۔)` : ''}\n\nکام، عارضی رقمیں اور غیر منظور آئٹمز منتقل نہیں ہوتے۔${mergeUr}${other ? `\n\nیہ اس صفحے پر موجود ایک اور نہ بھیجی گئی فہرست (${other} آئٹمز) کی جگہ لے گا۔` : ''}`,
      `نقل ${arItems(moveN)} معتمدة من المواد إلى صفحة الإرسال؟ تراجع هناك بيانات التوصيل ثم ترسل.${unrouted ? ` (${arItems(unrouted)} بلا تخصص بعد: اختره هناك.)` : ''}\n\nلا تُنقل الأعمال ولا المبالغ الاحتياطية ولا البنود غير المعتمدة.${mergeAr}${other ? `\n\nسيحلّ هذا محل قائمة أخرى غير مرسلة في تلك الصفحة (${arItems(other)}).` : ''}`), { okLabel: L('Continue', 'جاری رکھیں', 'متابعة'), ...(other ? { danger: true } : {}) }))) return
    // the tender name is the company's private label: it goes to the project name only (seen by the buyer),
    // never into notes suppliers read (UX-002). The sending page has one visible «ملاحظات للموردين» field.
    const draft = sameTender
      ? { ...prev, items: [...prevItems, ...fresh.map((r, i) => ({ ...toLine(r, prevItems.length + i), id: `tender-${Date.now()}-${i}` }))], tender_id: tender.id }
      : {
        title: tender.title,
        supplierNotes: '',
        deliveryRequired: true, deliveryLocation: '',
        items: approvedMaterials.map((r, i) => toLine(r, i)),
        tender_id: tender.id,
      }
    if (!writeProjectDraft(uid, draft)) {
      setMsg(L('Could not prepare the request in this browser (its storage is full or blocked).', 'اس براؤزر میں درخواست تیار نہیں ہو سکی (اس کی اسٹوریج بھری ہوئی یا بند ہے)۔', 'تعذّر تجهيز الطلب في هذا المتصفح (مساحة التخزين ممتلئة أو محظورة).')); return
    }
    window.location.href = '/contractor/project/new'
  }

  // ── side panel data ──────────────────────────────────────────────────────────────────────
  const selItem = sel ? items.find(i => i.key === sel.item_key) : null
  const selLinks = sel ? fast.codeLinks.filter(l => (sel.codes || []).includes(l.code)) : []
  const selSpec = useMemo(() => (selItem && specs.length ? specHitsFor(selItem, specs).slice(0, 3) : []), [selItem, specs])
  const selArea = sel ? fast.areaChecks.filter(a => a.boq_items.includes(sel.item_key)) : []
  // «الكمية (كانت 120)» instead of raw field names (UX-095): the field's label and the BOQ's own value
  const editedText = (k: string, before: any, row: any) => {
    const label: Record<string, string> = {
      product_name: L('material', 'مواد', 'المادة'), unit: L('unit', 'یونٹ', 'الوحدة'), qty: L('quantity', 'مقدار', 'الكمية'),
      kind: L('kind', 'قسم', 'النوع'), specification: L('specification', 'تفصیل', 'المواصفة'), sector: L('sector', 'سیکٹر', 'القطاع'),
      sub_category: L('specialty', 'شعبہ', 'التخصص'),
    }
    const empty = L('empty', 'خالی', 'فارغ')
    const v = before == null || before === '' ? empty
      : k === 'qty' ? fmtNum(Number(before))
      : k === 'unit' ? getUnitLabel(String(before), locale)
      : k === 'kind' ? kindLabel(before, L)
      : k === 'sector' ? sectorName(String(before), locale)
      : k === 'sub_category' ? (getSubCategoryLabel(((row.edited && row.edited.sector) || row.sector) as Sector, String(before), locale) || String(before))
      : k === 'product_name' ? getProductLabel(String(before), locale)
      : String(before).length > 40 ? `${String(before).slice(0, 40)}…` : String(before)
    const was = ['kind', 'sector', 'sub_category'].includes(k) ? 'كان' : 'كانت' // Arabic gender of the field name
    return L(`${label[k] || k} (was ${v})`, `${label[k] || k} (پہلے ${v})`, `${label[k] || k} (${was} ${v})`)
  }
  const flagText = (f: TenderFlag) => (locale === 'ar' ? f.ar : locale === 'ur' ? (f.ur || f.en) : f.en)
  const pg = (n: number | null | undefined) => L(`p. ${n ?? ""}`, `صفحہ ${n ?? ""}`, `ص ${n ?? ""}`)
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
  const catalogSet = useMemo(() => new Set(catalogNames), [catalogNames])

  // the item sheet on a phone is a modal dialog (round-5 UX-141); on a wide screen it is a side panel, not trapped
  const sheetRef = useRef<HTMLElement | null>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    try {
      const mq = window.matchMedia('(max-width: 1023px)')
      const on = () => setNarrow(mq.matches)
      on(); mq.addEventListener('change', on)
      return () => mq.removeEventListener('change', on)
    } catch { return undefined }
  }, [])
  const sheetModal = !!sel && narrow
  useFocusTrap(sheetRef, sheetModal, { lockScroll: true })
  useEffect(() => {
    if (!selId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelId(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selId])

  // only a material with a specialty can be approved (works are not sent; the specialty routes the item)
  // and a quantity: an item without one cannot be priced (UX-073); a lump sum counts as one
  const editHasQty = !!edit && (Number(parseQty(edit.qty) || 0) > 0 || (!!sel?.lump_sum && !String(edit.qty || '').trim()))
  // the specialty must belong to the sector, or the item would reach the wrong suppliers (or none): UX-023
  const canApprove = !!edit && edit.kind === 'material' && validPair(edit.sector, edit.sub_category) && editHasQty && editMissingSpecs.length === 0
  // the materials «اعتماد المواد بلا تنبيهات» would approve in the current view (its count is on the button)
  const bulkIds = filtered.filter(r => r.kind === 'material' && !r.approved && !r.sent_rfq_id && isFlagFree(byItem[r.item_key]) && validPair(r.sector, r.sub_category) && (Number(r.qty) > 0 || r.lump_sum)
    && (!r.product_name || missingSpecs(r.product_name, r.sector as Sector, r.specs || {}, specText(r, r)).length === 0)).map(r => r.id)
  const allApproved = (kindCount.material || 0) > 0 && approvedAll.length === (kindCount.material || 0) && approvedMaterials.length > 0
  // a summary card is a filter: a tap shows those items in the table (UX-136)
  const card = (label: string, value: number | string, tone = 'text-[#0B2438]', filter?: { kind: string; flag: string }) => {
    if (!filter) return (
      <div className="shrink-0 min-w-[8.5rem] snap-start sm:min-w-0 bg-white rounded-2xl border border-gray-200 p-3">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-xl font-extrabold ${tone}`}>{value}</div>
      </div>
    )
    const on = fKind === filter.kind && fFlag === filter.flag
    return (
      <button type="button" aria-pressed={on} onClick={() => { setFKind(filter.kind); setFFlag(filter.flag); setFSheet(''); setLimit(PAGE); setTimeout(() => document.getElementById('tender-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
        className={`shrink-0 min-w-[8.5rem] snap-start sm:min-w-0 min-h-11 text-start bg-white rounded-2xl border p-3 transition-colors hover:border-[#D4A543] ${on ? 'border-[#D4A543] ring-2 ring-[#D4A543]/40' : 'border-gray-200'}`}>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-xl font-extrabold ${tone}`}>{value}</div>
      </button>
    )
  }

  // phones (round-6 UX-083): the filters fold into «تصفية», and a pinned «إلى البنود» link shows until the items table
  // is reached, so the contractor is not scrolled through every summary before the first item
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilters = (fSheet ? 1 : 0) + (fKind !== 'material' ? 1 : 0) + (fFlag ? 1 : 0) + (fText.trim() ? 1 : 0)
  const [tableAhead, setTableAhead] = useState(false)
  useEffect(() => {
    if (loading || !tender) return
    const el = document.getElementById('tender-table')
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setTableAhead(!e.isIntersecting && e.boundingClientRect.top > 0))
    io.observe(el)
    return () => io.disconnect()
  }, [loading, tender])
  const toTable = () => document.getElementById('tender-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // the current step of the three, for the one-line summary on a phone
  const matTotal = kindCount.material || 0
  const curStep = flaggedPending > 0 ? 1 : approvedAll.length < matTotal ? 2 : 3
  const curStepText = curStep === 1
    ? L(`Review the flags (${flaggedPending})`, `انتباہات دیکھیں (${flaggedPending})`, `راجع التنبيهات (${flaggedPending})`)
    : curStep === 2
      ? L(`Approve the materials (${approvedAll.length}/${matTotal})`, `مواد منظور کریں (${approvedAll.length}/${matTotal})`, `اعتمد المواد (${approvedAll.length}/${matTotal})`)
      : L('Send them for pricing', 'قیمت کے لیے بھیجیں', 'أرسلها للتسعير')

  if (loading) return <PageLoader />

  return (
    <AppShell title={homeMode ? L('Company tools', 'کمپنی کے ٹولز', 'أدوات الشركات') : L('Tender review', 'ٹینڈر جائزہ', 'مراجعة المناقصة')} nav={getNav('contractor', locale, '/contractor/tender')} dir={dir}>
      <div className="max-w-7xl mx-auto space-y-4">
        {homeMode && <HomeModeNotice locale={locale} what="tender" />}
        {/* an error always has a way out (UX-142) */}
        {!loading && loadError && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-4xl text-[#8F6820] mb-3"><Glyph e="🔍" /></div>
            <h1 className="text-lg font-bold text-[#0B2438] mb-2">{L('Tender not found', 'ٹینڈر نہیں ملا', 'لم يُعثر على المناقصة')}</h1>
            <p className="text-sm text-gray-600 mb-5">{loadError}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/contractor/tender" className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm text-white bg-[#0B2438]">{L('All tenders', 'تمام ٹینڈرز', 'كل المناقصات')}</Link>
              <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm border border-[#0B2438]/30 text-[#0B2438] bg-white">{L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}</button>
            </div>
          </div>
        )}
        {!loading && tender && (<>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Link href="/contractor/tender" className="inline-flex items-center min-h-11 text-[13px] font-bold text-[#8F6820] hover:underline">{L('All tenders', 'تمام ٹینڈرز', 'كل المناقصات')}</Link>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0B2438]">{tender.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 sm:line-clamp-none">{files.map(f => `${f.kind === 'boq' ? L('BOQ', 'BOQ', 'جدول الكميات') : f.kind === 'spec' ? L('Spec', 'تفصیل', 'مواصفات') : L('Drawing', 'ڈرائنگ', 'مخطط')}: ${f.name}${f.storage_path ? '' : f.kind === 'boq' ? L(' (the read items only; the original was not saved)', ' (صرف پڑھے گئے آئٹمز؛ اصل فائل محفوظ نہیں ہوئی)', ' (البنود المقروءة فقط، ولم تُحفظ النسخة الأصلية)') : f.summary?.original_failed ? L(' (the read text only; the original was not saved)', ' (صرف پڑھا گیا متن؛ اصل فائل محفوظ نہیں ہوئی)', ' (النص المقروء فقط، ولم تُحفظ النسخة الأصلية)') : L(' (text only)', ' (صرف متن)', ' (النص فقط)')}`).join(' · ')}</p>
              {(originalsFailed || files.some(f => !f.storage_path && (f.kind === 'boq' || f.summary?.original_failed))) && (
                <p className="mt-1 text-xs font-semibold text-[#8F6820]" role="status"><Glyph e="⚠" /> {L('An original file could not be uploaded: only what was read from it is kept. Keep the original with you.', 'ایک اصل فائل اپ لوڈ نہیں ہو سکی: صرف اس سے پڑھا گیا مواد محفوظ ہے۔ اصل فائل اپنے پاس رکھیں۔', 'تعذّر رفع ملف أصلي، فحُفظ ما قُرئ منه فقط. احتفظ بالنسخة الأصلية لديك.')}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {sent && tender.project_rfq_id && <span className="min-h-11 inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-[#0F6E56]/10 text-[#0F6E56]">{L('Sent for pricing', 'بھیج دیا گیا', 'أُرسلت للتسعير')}</span>}
              {/* a partly sent tender stays open (round-5 UX-021) */}
              {!sent && partSent && <span className="min-h-11 inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-[#D4A543]/15 text-[#8F6820]">{sentMaterials.length
                ? L(`Partly sent (${sentMaterials.length} of ${kindCount.material || 0})`, `جزوی طور پر بھیجا گیا (${kindCount.material || 0} میں سے ${sentMaterials.length})`, `أُرسل جزء منها (${sentMaterials.length} من ${kindCount.material || 0})`)
                : L('Partly sent', 'جزوی طور پر بھیجا گیا', 'أُرسل جزء منها')}</span>}
              {(sent || partSent) && offersHref && (
                <Link href={offersHref} className={`min-h-11 inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold ${sent ? 'text-[#071827]' : 'border border-[#0B2438] text-[#0B2438]'}`} style={sent ? { background: 'linear-gradient(135deg,#F5C55B,#D4A543)' } : undefined}>
                  {batches.length > 1
                    ? L(`View the offers (${batches.length} batches)`, `آفرز دیکھیں (${batches.length} کھیپیں)`, `عرض العروض (${arCount(batches.length, 'دفعة واحدة', 'دفعتان', 'دفعات', 'دفعة')})`)
                    : L('View the offers received →', 'موصول آفرز دیکھیں ←', 'عرض العروض الواردة ←')}
                </Link>
              )}
              {!sent && (<>
              <button type="button" disabled={busy || !bulkIds.length} onClick={bulkApprove} className="min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] disabled:opacity-40">
                {bulkIds.length
                  ? L(`Approve ${bulkIds.length} items without flags among the items shown`, `دکھائے گئے آئٹمز میں سے بغیر انتباہ ${bulkIds.length} آئٹمز منظور کریں`, `اعتماد ${arItems(bulkIds.length)} بلا تنبيهات من البنود الظاهرة`)
                  : L('Approve the materials without flags among the items shown', 'دکھائے گئے آئٹمز میں سے بغیر انتباہ مواد منظور کریں', 'اعتماد المواد بلا تنبيهات من البنود الظاهرة')}
              </button>
              <button type="button" disabled={busy || !approvedMaterials.length} onClick={sendApproved} aria-describedby={!approvedMaterials.length ? 'tender-send-why' : undefined} className="min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {L(`Continue to the sending page (${approvedMaterials.length}) →`, `بھیجنے کے صفحے پر جائیں (${approvedMaterials.length}) ←`, `متابعة إلى صفحة الإرسال (${approvedMaterials.length}) ←`)}
              </button>
              </>)}
            </div>
          </div>
          {/* round-7 UX-078: a tender sent in several batches lists each one with the way to its offers */}
          {batches.length > 1 && (
            <div id="tender-batches" className="bg-white rounded-2xl border border-gray-200 p-3 scroll-mt-24">
              <div className="text-sm font-bold text-[#0B2438] mb-1">{L('Sent in batches', 'کھیپوں میں بھیجا گیا', 'أُرسلت على دفعات')}</div>
              <ul className="divide-y divide-gray-100">
                {batches.map((b, k) => (
                  <li key={b.rfqId}>
                    <Link href={`/contractor/rfq/${b.rfqId}`} className="flex items-center justify-between gap-2 min-h-11 text-sm text-[#0B2438] hover:underline">
                      <span>{L(`Batch ${k + 1} · ${b.n} materials`, `کھیپ ${k + 1} · ${b.n} مواد`, `الدفعة ${k + 1} · ${arMaterials(b.n)}`)}</span>
                      <span className="font-bold text-[#8F6820] shrink-0">{L('View the offers →', 'آفرز دیکھیں ←', 'عرض العروض ←')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* a disabled button always says why (UX-142) */}
          {!sent && !approvedMaterials.length && (
            <p id="tender-send-why" className="text-xs text-gray-600 -mt-2">{partSent
              ? L('Approve a material that has not been sent yet to continue to the sending page.', 'بھیجنے کے صفحے پر جانے کے لیے ایسا مواد منظور کریں جو ابھی نہیں بھیجا گیا۔', 'اعتمد مادة لم تُرسل بعد لتنتقل إلى صفحة الإرسال.')
              : L('Approve at least one material to continue to the sending page.', 'بھیجنے کے صفحے پر جانے کے لیے کم از کم ایک مواد منظور کریں۔', 'اعتمد مادة واحدة على الأقل لتنتقل إلى صفحة الإرسال.')}</p>
          )}
          {/* «اعتمدتَ X من Y» */}
          {!sent && (kindCount.material || 0) > 0 && (
            <div>
              {/* a phone: one line «الخطوة 2 من 3: اعتمد المواد (14/40)» instead of the three step cards (UX-083) */}
              <div className="sm:hidden flex items-center justify-between gap-2 text-[13px] font-bold text-[#0B2438] mb-1">
                <span>{L(`Step ${curStep} of 3: ${curStepText}`, `مرحلہ ${curStep} از 3: ${curStepText}`, `الخطوة ${curStep} من 3: ${curStepText}`)}</span>
                <span dir="ltr" className="shrink-0">{Math.round((approvedAll.length / (kindCount.material || 1)) * 100)}%</span>
              </div>
              <div className="hidden sm:flex items-center justify-between text-xs font-bold text-[#0B2438] mb-1">
                <span>{L(`You approved ${approvedAll.length} of ${kindCount.material || 0} materials`, `آپ نے ${kindCount.material || 0} میں سے ${approvedAll.length} مواد منظور کیے`, `اعتمدتَ ${approvedAll.length} من ${arMaterials(kindCount.material || 0)}`)}</span>
                <span dir="ltr">{Math.round((approvedAll.length / (kindCount.material || 1)) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={kindCount.material || 0} aria-valuenow={approvedAll.length}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((approvedAll.length / (kindCount.material || 1)) * 100)}%`, background: 'linear-gradient(90deg,#F5C55B,#D4A543)' }} />
              </div>
            </div>
          )}
          {/* every material approved: the way to the last step (UX-073) */}
          {!sent && allApproved && (
            <div className="rounded-2xl border-2 border-[#D4A543] bg-[#D4A543]/10 p-4 flex flex-wrap items-center justify-between gap-3" role="status">
              <p className="text-sm font-bold text-[#0B2438]"><Glyph e="✓" /> {L(`You approved all the materials (${approvedAll.length}). Last step: review the delivery details and send.`, `آپ نے تمام مواد منظور کر لیے (${approvedAll.length})۔ آخری قدم: ڈیلیوری کی تفصیل دیکھیں اور بھیجیں۔`, `اعتمدتَ كل المواد (${approvedAll.length}). الخطوة الأخيرة: راجع بيانات التوصيل وأرسل.`)}</p>
              <button type="button" disabled={busy} onClick={sendApproved} className="min-h-11 px-5 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {L('Continue to the sending page', 'بھیجنے کے صفحے پر جائیں', 'متابعة إلى صفحة الإرسال')}
              </button>
            </div>
          )}
          {/* the order of work, with progress */}
          {!sent && (
            <ol className="hidden sm:grid grid-cols-3 gap-2">
              {[
                { n: 1, t: L('Review the flags', 'انتباہات دیکھیں', 'راجع التنبيهات'), d: flaggedPending ? L(`Materials with flags not approved yet: ${flaggedPending}`, `انتباہ والے مواد جو ابھی منظور نہیں ہوئے: ${flaggedPending}`, `مواد عليها تنبيهات لم تُعتمد بعد: ${flaggedPending}`) : flaggedMaterials ? L('You reviewed all the flags', 'آپ نے تمام انتباہات دیکھ لیے', 'راجعتَ كل التنبيهات') : L('No material has flags', 'کسی مواد پر انتباہ نہیں', 'لا توجد مواد عليها تنبيهات'), done: flaggedPending === 0 },
                { n: 2, t: L(`Approve the materials (${approvedAll.length}/${kindCount.material || 0})`, `مواد منظور کریں (${approvedAll.length}/${kindCount.material || 0})`, `اعتمد المواد (${approvedAll.length}/${kindCount.material || 0})`), d: L('Open an item, check it and approve it, or approve the ones without flags at once.', 'آئٹم کھولیں، جانچیں اور منظور کریں، یا بغیر انتباہ والے سب ایک ساتھ منظور کریں۔', 'افتح البند وراجعه واعتمده، أو اعتمد المواد بلا تنبيهات دفعة واحدة.'), done: !!approvedAll.length && approvedAll.length === (kindCount.material || 0) },
                { n: 3, t: L('Send them for pricing', 'قیمت کے لیے بھیجیں', 'أرسلها للتسعير'), d: L('«Continue to the sending page» opens the request with the approved materials.', '«بھیجنے کے صفحے پر جائیں» منظور مواد کے ساتھ درخواست کھولتا ہے۔', '«متابعة إلى صفحة الإرسال» تفتح الطلب بالمواد المعتمدة.'), done: false },
              ].map(s => (
                <li key={s.n} className={`rounded-2xl border p-3 bg-white ${s.done ? 'border-[#0F6E56]/40' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0B2438]">
                    <span className={`w-6 h-6 rounded-full grid place-items-center text-xs shrink-0 ${s.done ? 'bg-[#0F6E56] text-white' : 'bg-[#0B2438] text-white'}`}>{s.done ? <Glyph e="✓" /> : s.n}</span>{s.t}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{s.d}</p>
                </li>
              ))}
            </ol>
          )}
          {msg && !sel && <div className="rounded-xl bg-[#0B2438]/5 p-2.5 text-sm text-[#0B2438]" role="status">{msg}</div>}

          {/* a phone: one row of summary cards that scrolls sideways (UX-083) */}
          <div className="flex overflow-x-auto snap-x gap-2 pb-1 sm:pb-0 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible">
            {card(kindLabel('material', L), kindCount.material || 0, undefined, { kind: 'material', flag: '' })}
            {card(kindLabel('works', L), kindCount.works || 0, 'text-gray-600', { kind: 'works', flag: '' })}
            {card(kindLabel('provisional', L), kindCount.provisional || 0, 'text-[#8F6820]', { kind: 'provisional', flag: '' })}
            {card(L('Approved materials', 'منظور مواد', 'مواد معتمدة'), `${approvedAll.length}/${kindCount.material || 0}`, undefined, { kind: 'material', flag: 'approved' })}
            {card(severityLabel('error', L), sevCount.error || 0, 'text-red-600', { kind: '', flag: 'error' })}
            {card(severityLabel('warning', L), sevCount.warning || 0, 'text-[#8F6820]', { kind: '', flag: 'warning' })}
            {card(severityLabel('review', L), sevCount.review || 0, 'text-[#102E45]', { kind: '', flag: 'review' })}
            {card(L('Drawings / specs', 'ڈرائنگز / تفصیلات', 'المخططات / المواصفات'), `${drawings.length} / ${specs.length}${specLoading ? '…' : ''}`)}
          </div>

          {tenderFlags.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 p-3">
              <summary className="text-sm font-bold text-[#0B2438] cursor-pointer min-h-11 flex items-center">{L(`Tender-wide findings (${tenderFlags.length}): codes on the drawings without a BOQ item`, `پورے ٹینڈر کے نتائج (${tenderFlags.length}): ڈرائنگز پر ایسے کوڈ جن کا مقداروں کے جدول میں کوئی آئٹم نہیں`, `ملاحظات على مستوى المناقصة (${tenderFlags.length}): رموز في المخططات بلا بند في جدول الكميات`)}</summary>
              <ul className="mt-2 space-y-1.5">
                {tenderFlags.map((f, i) => (
                  <li key={i} className={`text-xs rounded-lg border p-2 ${SEVERITY_TONE[f.severity]}`}>
                    <b>{severityLabel(f.severity, L)}:</b> <span dir="auto">{flagText(f)}</span>
                    <span className="block text-xs opacity-80 mt-0.5" dir="auto">{f.sources.map(s => `${s.sheet || s.file}${s.page ? ` ${pg(s.page)}` : ''}`).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {fast.areaChecks.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 p-3">
              <summary className="text-sm font-bold text-[#0B2438] cursor-pointer min-h-11 flex items-center">
                {L(`Area comparison (${fast.areaChecks.length}): room areas on the drawings vs BOQ m²`, `رقبے کا موازنہ (${fast.areaChecks.length}): ڈرائنگز میں کمروں کا رقبہ بمقابلہ جدول کے م²`, `مقارنة المساحات (${fast.areaChecks.length}): مساحات الغرف في المخططات مقابل م² في الجدول`)}
              </summary>
              <p className="text-xs text-gray-500 mt-1">{L('Rooms are matched to finish tags by position on the sheet (a «?» marks a low-confidence room). A difference needs review; it is not an error.', 'کمروں کو شیٹ پر ان کے مقام سے فنشنگ کوڈز سے ملایا گیا ہے («?» = کم یقینی)۔ فرق جائزہ مانگتا ہے، یہ غلطی نہیں۔', 'تُنسب الغرف إلى رموز التشطيب حسب موقعها في اللوحة (علامة «?» تعني نسبة غير مؤكدة). الفرق يحتاج مراجعة وليس خطأً.')}</p>
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
                        <td className="p-1.5" dir="auto">{a.legend || '—'}</td>
                        <td className="p-1.5" dir="ltr">{fmtNum(a.boq_qty)}</td>
                        <td className="p-1.5" dir="ltr">{fmtNum(a.drawing_area)}</td>
                        <td className="p-1.5" dir="ltr">{a.status === 'walls' ? '—' : pct(a.diff_pct)}</td>
                        <td className="p-1.5"><span className={`px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${AREA_TONE[a.status] || ''}`}>{areaStatusLabel(a.status, L)}</span>{areaNote(a) && <span className="block text-xs text-gray-500 mt-0.5">{areaNote(a)}</span>}</td>
                        <td className="p-1.5 text-gray-600"><span dir="auto">{roomsOf(a) || '—'}</span><span className="block text-xs text-gray-500 break-all" dir="ltr">{a.sheets.join(' · ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* filters: folded into «تصفية» on a phone (UX-083) */}
          <button type="button" onClick={() => setFiltersOpen(o => !o)} aria-expanded={filtersOpen} aria-controls="tender-filters"
            className="sm:hidden w-full min-h-11 flex items-center justify-between gap-2 px-4 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-[#0B2438]">
            <span>{L('Filter', 'فلٹر', 'تصفية')}{activeFilters ? ` (${activeFilters})` : ''}</span>
            <Glyph e={filtersOpen ? '▴' : '▾'} />
          </button>
          <div id="tender-filters" className={`${filtersOpen ? 'grid' : 'hidden'} sm:grid bg-white rounded-2xl border border-gray-200 p-3 grid-cols-1 sm:grid-cols-4 gap-2`}>
            <select value={fSheet} aria-label={L('Trade (workbook sheet)', 'کام (ورک بک شیٹ)', 'الأعمال (ورقة الجدول)')} onChange={(e: any) => { setFSheet(e.target.value); setLimit(PAGE) }} className="input-field text-sm">
              <option value="">{L('All trades (workbook sheets)', 'تمام کام (ورک بک شیٹس)', 'كل الأعمال (أوراق الجدول)')}</option>
              {sheets.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={fKind} aria-label={L('Kind', 'قسم', 'النوع')} onChange={(e: any) => { setFKind(e.target.value); setLimit(PAGE) }} className="input-field text-sm">
              <option value="">{L('All kinds', 'تمام اقسام', 'كل الأنواع')}</option>
              {(['material', 'works', 'provisional'] as const).map(k => <option key={k} value={k}>{kindLabel(k, L)}</option>)}
            </select>
            <select value={fFlag} aria-label={L('Checks and approval', 'جانچ اور منظوری', 'الفحص والاعتماد')} onChange={(e: any) => { setFFlag(e.target.value); setLimit(PAGE) }} className="input-field text-sm">
              <option value="">{L('All items', 'تمام آئٹمز', 'كل البنود')}</option>
              <option value="flagged">{L('With flags', 'نشان والے', 'عليها تنبيهات')}</option>
              <option value="clean">{L('Without flags', 'بغیر انتباہ', 'بلا تنبيهات')}</option>
              <option value="error">{severityLabel('error', L)}</option>
              <option value="warning">{severityLabel('warning', L)}</option>
              <option value="review">{severityLabel('review', L)}</option>
              <option value="approved">{L('Approved', 'منظور', 'معتمدة')}</option>
              <option value="pending">{L('Not approved', 'غیر منظور', 'غير معتمدة')}</option>
            </select>
            <input value={fText} type="search" aria-label={L('Search', 'تلاش', 'بحث')} onChange={(e: any) => { setFText(e.target.value); setLimit(PAGE) }} className="input-field text-sm" placeholder={L('Search: words, code, ref', 'تلاش: الفاظ، کوڈ، حوالہ', 'بحث: كلمات، رمز، مرجع')} />
          </div>

          <div id="tender-table" className="grid lg:grid-cols-[1fr_440px] gap-4 items-start scroll-mt-20">
            {/* table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">{L(`${filtered.length} items`, `${filtered.length} آئٹمز`, filtered.length ? arItems(filtered.length) : 'لا توجد بنود تطابق التصفية الحالية')}</div>
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
                        <tr key={r.id} onClick={() => setSelId(r.id)} tabIndex={0} role="button" aria-pressed={selId === r.id}
                          aria-label={`${r.ref || r.row_no}: ${r.product_name ? getProductLabel(r.product_name, locale) : r.item_text || ''}`}
                          onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelId(r.id) } }}
                          className={`border-t border-gray-100 cursor-pointer hover:bg-[#D4A543]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4A543] ${selId === r.id ? 'bg-[#D4A543]/10' : ''}`}>
                          <td className="p-2 align-top whitespace-nowrap text-xs text-gray-600" dir="ltr">{r.ref || `${r.row_no}`}</td>
                          <td className="p-2 align-top">
                            <div className="text-gray-900 line-clamp-2" dir="auto">{r.item_text}</div>
                            <div className="text-xs text-gray-500 line-clamp-1" dir="auto">{r.lead_in || ''}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.kind !== 'material' && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${KIND_TONE[r.kind]}`}>{kindLabel(r.kind, L)}</span>}
                              {(r.codes || []).map((c: string) => <span key={c} className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#0B2438]/5 text-[#0B2438]" dir="ltr">{c}</span>)}
                              {r.product_name && r.kind === 'material' && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{getProductLabel(r.product_name, locale).slice(0, 50)}</span>}
                            </div>
                          </td>
                          <td className="p-2 align-top whitespace-nowrap" dir="ltr">{r.lump_sum && r.qty == null ? L('lump sum', 'یکمشت', 'مقطوعية') : `${fmtNum(r.qty)} ${getUnitLabel(r.unit, locale)}`}</td>
                          <td className="p-2 align-top whitespace-nowrap">
                            {r.sent_rfq_id ? <span className="text-xs font-bold text-[#0F6E56] block"><Glyph e="📤" /> {L('Sent', 'بھیج دیا گیا', 'أُرسل')}</span>
                              : r.approved && <span className="text-xs font-bold text-[#0F6E56] block"><Glyph e="✅" /> {L('Approved', 'منظور', 'معتمد')}</span>}
                            {worst ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${SEVERITY_TONE[worst]}`}>{severityLabel(worst, L)}{fl.length > 1 ? ` +${fl.length - 1}` : ''}</span>
                              : !r.approved && <span className="text-xs text-gray-500">{L('No flags', 'بغیر انتباہ', 'بلا تنبيهات')}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* an empty filter result always has a way back (round-5 UX-157) */}
              {filtered.length === 0 && rows.length > 0 && (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-600">{L('No items match the current filter.', 'موجودہ فلٹر سے کوئی آئٹم میل نہیں کھاتا۔', 'لا توجد بنود تطابق التصفية الحالية.')}</p>
                  <button type="button" onClick={() => { setFSheet(''); setFKind(''); setFFlag(''); setFText(''); setLimit(PAGE) }} className="mt-3 min-h-11 px-4 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white">{L('Show all items', 'تمام آئٹمز دکھائیں', 'عرض كل البنود')}</button>
                </div>
              )}
              {filtered.length > limit && (
                <button type="button" onClick={() => setLimit(l => l + PAGE)} className="w-full min-h-11 py-2.5 text-sm font-bold text-[#8F6820] border-t border-gray-100">{L('Show more', 'مزید دکھائیں', 'عرض المزيد')}</button>
              )}
            </div>

            {/* side panel */}
            {/* phones: a bottom sheet ABOVE the bottom navigation (z-50), with the action row pinned to its bottom */}
            <div className={`${sel ? 'fixed inset-0 z-50 bg-black/30 lg:static lg:bg-transparent lg:z-auto' : 'hidden lg:block'}`} onClick={() => setSelId(null)}>
              <aside ref={sheetRef} onClick={(e: any) => e.stopPropagation()} {...(sheetModal ? { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'tender-sheet-title' } : {})} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl lg:max-h-[calc(100vh-120px)] lg:sticky lg:top-4 bg-white border border-gray-200 p-4 pb-0 lg:pb-4 space-y-4">
                {!sel && <p className="text-sm text-gray-500">{L('Choose an item to see its sources and approve it.', 'آئٹم منتخب کریں تاکہ اس کے ماخذ دیکھیں اور اسے منظور کریں۔', 'اختر بنداً لعرض مصادره واعتماده.')}</p>}
                {sel && edit && (<>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div id="tender-sheet-title" className="text-xs text-gray-500" dir="ltr">{sel.sheet} · {L('row', 'قطار', 'صف')} {sel.row_no}{sel.ref ? ` · ${sel.ref}` : ''}</div>
                      <span className={`inline-block mt-1 text-xs font-bold px-1.5 py-0.5 rounded ${KIND_TONE[sel.kind]}`}>{kindLabel(sel.kind, L)}{sel.kind_reason ? ` («${sel.kind_reason}»)` : ''}</span>
                    </div>
                    <button type="button" onClick={() => setSelId(null)} className="min-h-11 px-2 text-sm font-bold text-gray-500">{L('Close', 'بند کریں', 'إغلاق')}</button>
                  </div>

                  {/* flags */}
                  {(byItem[sel.item_key] || []).length > 0 && (
                    <ul className="space-y-1.5">
                      {(byItem[sel.item_key] || []).map((f, i) => (
                        <li key={i} className={`text-xs rounded-lg border p-2 ${SEVERITY_TONE[f.severity]}`}>
                          <b>{severityLabel(f.severity, L)}:</b> <span dir="auto">{flagText(f)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* BOQ source */}
                  <section>
                    <h3 className="text-xs font-bold text-[#0B2438] mb-1"><Glyph e="📋" /> {L('BOQ source', 'BOQ ماخذ', 'المصدر في جدول الكميات')}</h3>
                    <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-800 space-y-1" dir="auto">
                      {sel.section && <div className="text-gray-500">{sel.trade} › {sel.section}{sel.series ? ` › ${sel.series}` : ''}</div>}
                      {sel.lead_in && <div className="text-gray-600">{sel.lead_in}</div>}
                      <div className="font-semibold">{sel.ref ? `${sel.ref.split(' ').pop()} | ` : ''}{sel.item_text}</div>
                      <div>{L('Unit', 'یونٹ', 'الوحدة')}: {sel.unit_raw || '—'} · {L('Qty', 'مقدار', 'الكمية')}: {fmtNum(sel.edited && 'qty' in sel.edited ? sel.edited.qty : sel.qty)}{sel.rate != null ? ` · ${L('Rate', 'ریٹ', 'السعر')}: ${fmtNum(sel.rate)}` : ''}{sel.amount != null ? ` · ${L('Amount', 'رقم', 'الإجمالي')}: ${fmtNum(sel.amount)}` : ''}</div>
                      {sel.etimad_code && <div className="text-gray-500">{L('Etimad platform code: ', 'اعتماد پلیٹ فارم کوڈ: ', 'رمز منصة اعتماد: ')}{sel.etimad_label ? `${sel.etimad_label} - ` : ''}{sel.etimad_code}</div>}
                      {sel.edited && Object.keys(sel.edited).length > 0 && <div className="text-[#8F6820]" dir={dir}>{L('Changed by you: ', 'آپ نے بدلا: ', 'عدّلتَ: ')}{Object.keys(sel.edited).map(k => editedText(k, sel.edited[k], sel)).join(locale === 'ar' ? '، ' : ', ')}</div>}
                    </div>
                  </section>

                  {/* spec */}
                  {specs.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold text-[#0B2438] mb-1"><Glyph e="📑" /> {L('Specification', 'تفصیلات', 'المواصفات')}</h3>
                      {selSpec.length === 0 && <p className="text-xs text-gray-500">{L('No section found.', 'کوئی حصہ نہیں ملا۔', 'لم يُعثر على قسم.')}</p>}
                      {selSpec.map((h, i) => (
                        <div key={i} className="rounded-xl bg-gray-50 p-2.5 text-xs mb-1.5" dir="auto">
                          <div className="font-semibold text-[#0B2438]">{h.section.id} {h.section.title} <span className="text-gray-500 font-normal">· <bdi>{h.file}</bdi> {pg(h.quotes[0]?.page || h.section.page_from)}</span></div>
                          {h.quotes.map((q, k) => <div key={k} className="text-gray-700 mt-1" dir="auto">«{q.text}» <span className="text-gray-500">{pg(q.page)}</span></div>)}
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
                          {a.status !== 'walls' && <div>{L(`BOQ ${fmtNum(a.boq_qty)} m² · drawings ${fmtNum(a.drawing_area)} m² (${pct(a.diff_pct)})`, `BOQ ${fmtNum(a.boq_qty)} م² · ڈرائنگز ${fmtNum(a.drawing_area)} م² (${pct(a.diff_pct)})`, `في الجدول ${fmtNum(a.boq_qty)} م² · في المخططات ${fmtNum(a.drawing_area)} م² (${pct(a.diff_pct)})`)}{a.boq_items.length > 1 ? L(` · sum of ${a.boq_items.length} items`, ` · ${a.boq_items.length} آئٹمز کا مجموعہ`, ` · مجموع ${arItems(a.boq_items.length)}`) : ''}</div>}
                          {areaNote(a) && <div className="text-gray-500">{areaNote(a)}</div>}
                          <div className="text-gray-600" dir="ltr">{roomsOf(a) || '—'}</div>
                          <div className="text-xs text-gray-500 break-all" dir="ltr">{a.sheets.join(' · ')}</div>
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
                                  <div className="text-xs text-gray-600 mt-0.5 break-all" dir="ltr">{o.sheet || o.file} · {L(`${o.count} times`, `${o.count} بار`, arCount(o.count, 'مرة واحدة', 'مرتان', 'مرات', 'مرة'))}</div>
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
                    {/* a catalog material's name is the routing key: shown (translated) read-only, «تغيير المادة» to pick another */}
                    {nameLocked && catalogSet.has(edit.product_name) ? (
                      <div className="block">
                        <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Material', 'مواد', 'المادة')}</span>
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                          <span className="flex-1 min-w-0 text-sm font-semibold text-[#0B2438]">{getProductLabel(edit.product_name, locale)}</span>
                          {!locked && <button type="button" onClick={() => setNameLocked(false)} className="min-h-11 px-2 text-xs font-bold text-[#8F6820] hover:underline shrink-0">{L('Change the material', 'مواد بدلیں', 'تغيير المادة')}</button>}
                        </div>
                      </div>
                    ) : (
                    <label className="block">
                      <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Material name (Arabic catalog name)', 'مواد کا نام (عربی کیٹلاگ نام)', 'اسم المادة (كما في دليل المواد)')}</span>
                      <input list="tender-catalog" value={edit.product_name} disabled={locked} onChange={(e: any) => setEdit((d: any) => ({ ...d, product_name: e.target.value }))} className="input-field text-sm" dir="auto" />
                      <datalist id="tender-catalog">{catalogNames.map(n => <option key={n} value={n} />)}</datalist>
                    </label>
                    )}
                    {candidates.length > 0 && !locked && !(nameLocked && catalogSet.has(edit.product_name)) && (
                      <div className="flex flex-wrap gap-1">
                        {candidates.filter(c => c.name !== edit.product_name).map(c => (
                          <button key={c.sector + c.name} type="button" onClick={() => { setEdit((d: any) => ({ ...d, product_name: c.name, sector: c.sector, sub_category: c.sector === d.sector && validPair(c.sector, d.sub_category) ? d.sub_category : subFor(c.name, c.sector) })); setNameLocked(true) }} className="min-h-11 text-xs px-2 py-1 rounded-lg border border-[#D4A543]/50 bg-[#D4A543]/5 text-[#8F6820]">{getProductLabel(c.name, locale)}</button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Quantity', 'مقدار', 'الكمية')}</span>
                        <input inputMode="decimal" value={edit.qty} disabled={locked} onChange={(e: any) => setEdit((d: any) => ({ ...d, qty: e.target.value }))}
                          aria-invalid={String(edit.qty || '').trim() !== '' && (parseQty(edit.qty) === undefined || parseQty(edit.qty) === 0)} className="input-field text-sm" dir="ltr" />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Unit', 'یونٹ', 'الوحدة')}</span>
                        <select value={edit.unit} disabled={locked} onChange={(e: any) => setEdit((d: any) => ({ ...d, unit: e.target.value }))} className="input-field text-sm">
                          <option value="">—</option>
                          {Array.from(new Set([edit.unit, 'مقطوعية', 'عدد', ...UNIT_OPTIONS].filter(Boolean))).map((u: string) => <option key={u} value={u}>{getUnitLabel(u, locale)}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Sector', 'سیکٹر', 'القطاع')}</span>
                        <select value={edit.sector} disabled={locked} onChange={(e: any) => { const sc = e.target.value; setEdit((d: any) => ({ ...d, sector: sc, sub_category: subFor(d.product_name, sc) })) }} className="input-field text-sm">
                          {(Object.keys(SECTOR_LABELS) as Sector[]).map(s => <option key={s} value={s}>{sectorName(s, locale)}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Specialty', 'شعبہ', 'التخصص')}</span>
                        <select value={edit.sub_category} disabled={locked} onChange={(e: any) => setEdit((d: any) => ({ ...d, sub_category: e.target.value }))} className={`input-field text-sm ${!edit.sub_category ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}>
                          <option value="">{L('Choose', 'منتخب کریں', 'اختر')}</option>
                          {Object.keys((SUB_CATEGORIES as any)[edit.sector] || {}).map(k => <option key={k} value={k}>{getSubCategoryLabel(edit.sector as Sector, k, locale)}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Kind', 'قسم', 'النوع')}</span>
                      <select value={edit.kind} disabled={locked} onChange={(e: any) => setEdit((d: any) => ({ ...d, kind: e.target.value }))} className="input-field text-sm">
                        {(['material', 'works', 'provisional'] as const).map(k => <option key={k} value={k}>{kindLabel(k, L)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs font-semibold text-gray-600 mb-0.5">{L('Specification for suppliers (empty = the BOQ wording)', 'سپلائرز کے لیے تفصیل (خالی = مقداروں کے جدول کی عبارت)', 'المواصفة للموردين (فارغة = نص جدول الكميات)')}</span>
                      <textarea value={edit.specification} disabled={locked} onChange={(e: any) => setEdit((d: any) => ({ ...d, specification: e.target.value }))} rows={3} className="input-field text-sm" dir="auto" />
                    </label>
                    {edit.kind === 'material' && edit.product_name && (
                      <ItemSpecFields name={edit.product_name} sector={edit.sector || 'civil'} specs={edit.specs} locale={locale} showErrors={triedApprove} disabled={locked} onChange={(v: Record<string, string>) => setEdit((d: any) => ({ ...d, specs: v }))} />
                    )}
                  </section>
                  {/* the confirmation and the actions stay in view: pinned to the bottom of the sheet, above the safe area */}
                  <div className="sticky bottom-0 -mx-4 px-4 pt-3 bg-white border-t border-gray-100 lg:static lg:mx-0 lg:px-0 lg:border-0 space-y-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                    {msg && <div className="rounded-xl bg-[#0B2438]/5 p-2.5 text-sm font-semibold text-[#0B2438]" role="status">{msg}</div>}
                    {sent ? (
                      <p className="text-xs text-gray-500">{L('This tender was sent: its items can no longer be changed.', 'یہ ٹینڈر بھیج دیا گیا: اب آئٹمز نہیں بدلے جا سکتے۔', 'أُرسلت هذه المناقصة، فلا يمكن تعديل بنودها.')}</p>
                    ) : selSent ? (
                      <p className="text-xs font-semibold text-[#0F6E56]"><Glyph e="📤" /> {L('This item was sent for pricing, so it cannot be changed.', 'یہ آئٹم قیمت کے لیے بھیج دیا گیا، اس لیے اسے بدلا نہیں جا سکتا۔', 'أُرسل هذا البند للتسعير، فلا يمكن تعديله.')}</p>
                    ) : sel.approved ? (
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" disabled={busy} onClick={() => saveItem()} className="min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] disabled:opacity-40">{L('Save', 'محفوظ کریں', 'حفظ')}</button>
                        <button type="button" disabled={busy} onClick={() => saveItem(false)} className="min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white disabled:opacity-40">{L('Remove approval', 'منظوری ہٹائیں', 'إلغاء الاعتماد')}</button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" disabled={busy || !canApprove} onClick={() => saveItem(true, true)} aria-describedby={!canApprove ? 'tender-approve-why' : undefined} className="flex-1 min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Approve and go to the next', 'منظور کریں اور اگلے پر جائیں', 'اعتماد والانتقال إلى التالي')}</button>
                          <button type="button" disabled={busy} onClick={() => saveItem()} className="min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] disabled:opacity-40">{L('Save without approving', 'منظوری کے بغیر محفوظ کریں', 'حفظ دون اعتماد')}</button>
                        </div>
                        {canApprove && (
                          <button type="button" disabled={busy} onClick={() => saveItem(true)} className="min-h-11 px-1 text-xs font-bold text-[#8F6820] underline underline-offset-2 disabled:opacity-40">{L('Approve and stay here', 'منظور کریں اور یہیں رہیں', 'اعتماد والبقاء هنا')}</button>
                        )}
                      </div>
                    )}
                    {/* a disabled approval always says why (UX-142) */}
                    {!locked && !sel.approved && !canApprove && (
                      <p id="tender-approve-why" className="text-xs font-semibold text-[#8F6820]">
                        {/* a reason that fits the item's kind (round-6 UX-102) */}
                        {edit.kind === 'provisional'
                          ? L('Provisional and general sums are not sent to suppliers. If this line is really a material to buy, change its kind to «Material».', 'عارضی اور عمومی رقمیں سپلائرز کو نہیں بھیجی جاتیں۔ اگر یہ لائن واقعی خریدنے کا مواد ہے تو اس کی قسم «مواد» کریں۔', 'المبالغ الاحتياطية والعامة لا تُرسل إلى الموردين؛ وإن كان هذا البند مادة تُشترى فعلاً فغيّر نوعه إلى «مادة».')
                          : edit.kind !== 'material'
                          ? L('Works (labour and installation) are not sent to suppliers. To send this item as a material to buy, change its kind to «Material».', 'کام (مزدوری اور تنصیب) سپلائرز کو نہیں بھیجے جاتے۔ اسے خریدنے کے مواد کے طور پر بھیجنے کے لیے اس کی قسم «مواد» کریں۔', 'الأعمال (المصنعيات والتركيب) لا تُرسل إلى الموردين؛ لإرسال هذا البند مادةً تُشترى غيّر نوعه إلى «مادة».')
                          : !validPair(edit.sector, edit.sub_category)
                            ? L('Choose the specialty first: it routes the item to the right suppliers.', 'پہلے شعبہ منتخب کریں: یہی آئٹم کو صحیح سپلائرز تک پہنچاتا ہے۔', 'اختر التخصص أولاً، فهو ما يوصل البند إلى الموردين المختصين.')
                            : !editHasQty
                              ? L('Enter the quantity first: an item without a quantity cannot be priced.', 'پہلے مقدار لکھیں: بغیر مقدار آئٹم کی قیمت نہیں لگائی جا سکتی۔', 'أدخل الكمية أولاً، فلا يُسعَّر بند بلا كمية.')
                              : L('Complete the required specifications (size, grade…) so suppliers can price it.', 'ضروری تفصیلات (سائز، گریڈ…) مکمل کریں تاکہ سپلائرز قیمت دے سکیں۔', 'أكمل المواصفات المطلوبة (المقاس، الدرجة…) ليتمكن الموردون من التسعير.')}
                      </p>

                    )}
                  </div>
                </>)}
              </aside>
            </div>
          </div>
          {/* a phone: «إلى البنود» stays in view until the items table is reached (UX-083), above the bottom navigation */}
          {tableAhead && !sel && (
            <button type="button" onClick={toTable}
              className="sm:hidden fixed z-30 end-4 bottom-[calc(88px+env(safe-area-inset-bottom))] min-h-11 px-4 rounded-full shadow-lg text-sm font-bold text-white bg-[#0B2438]">
              {L(`To the items (${filtered.length})`, `آئٹمز کی طرف (${filtered.length})`, `إلى البنود (${filtered.length})`)} <Glyph e="▾" />
            </button>
          )}
        </>)}
      </div>
    </AppShell>
  )
}
