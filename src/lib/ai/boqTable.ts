// BOQ (جدول كميات) → items, by rules. Handles what real BOQs do:
//  • the header row is found by its words (ar/en) anywhere in the first 40 rows, also when it is
//    split over two rows («Quantity» over «Qty | Unit»); without a header the columns are inferred
//    from the data (long text = description, unit words = unit, numbers = qty / rate / amount);
//  • merged cells are filled from their top-left text;
//  • section headings («DIVISION 03 – CONCRETE», «أعمال الكهرباء») are carried as context;
//  • a lead-in paragraph («Supply and install uPVC pipes…:») is joined to its short sub-items
//    («a) 110 mm dia»), and wrapped description lines are joined to their item;
//  • totals / subtotals / carried-forward rows are skipped;
//  • units are normalised (m3/cum → م³, LM → م.ط, nos → عدد…), quantities read safely
//    («1,250.50», «١٢٫٥», ranges), qty × rate ≈ amount checked, a missing qty taken from amount ÷ rate;
//  • the same item repeated (several buildings / sections) is merged and its quantities summed.
// Every item carries flags + a 0–1 confidence; low ones are shown «يحتاج مراجعة».
import { SAFE_XLSX_READ } from '@/lib/serverUpload'
import { normalizeText } from '@/lib/normalize'
import { parseQuantity, normalizeDigits } from '@/lib/ai/numbers'
import { normalizeUnit } from '@/lib/ai/units'
import { detectSectorsFromText } from '@/lib/classify'
import type { Sector } from '@/types'

export type Sheet = { name: string; rows: any[][] }
export type BoqItem = {
  ref: string | null
  product_name: string
  description: string
  quantity: number | null
  needs_quantity: boolean
  unit: string
  unit_raw: string | null
  rate: number | null
  amount: number | null
  specification: string
  sector: Sector
  sector_score: number
  section: string | null
  source_sheet: string
  row: number
  merged_count: number
  flags: string[]
  confidence: number
}

// ── reading the file ────────────────────────────────────────────────────────────────────────
export async function readSheets(buffer: Buffer, ext: string): Promise<Sheet[]> {
  const XLSX = await import('xlsx')
  const wb = ext === 'csv' || ext === 'tsv' || ext === 'txt'
    ? XLSX.read(buffer.toString('utf8').replace(/^﻿/, ''), { type: 'string', dense: true, cellFormula: false, cellHTML: false, FS: ext === 'tsv' ? '\t' : undefined } as any)
    : XLSX.read(buffer, SAFE_XLSX_READ)
  const out: Sheet[] = []
  for (const name of wb.SheetNames) {
    // summary / index sheets only (a sheet called «Tender BOQ» is the real one)
    if (/collection|summary|^\s*index\s*$|_xlnm|ملخص|الخلاصه|الخلاصة|الفهرس/i.test(name)) continue
    const ws: any = wb.Sheets[name]
    if (!ws || !ws['!ref']) continue
    const range = XLSX.utils.decode_range(ws['!ref'])
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: true }) as any[][]
    // merged cells: a short text merged DOWN several rows (typically the unit «m2» for a group of
    // items) is copied to each row. Numbers are never copied (a merged quantity must not count
    // twice), nor long texts (a description spanning rows stays on its first row; a description
    // merged ACROSS columns is found by the «longest text cell» rule below).
    for (const m of (ws['!merges'] || []) as any[]) {
      const r0 = m.s.r - range.s.r, c0 = m.s.c - range.s.c
      const v = rows[r0]?.[c0]
      if (typeof v !== 'string' || !v.trim() || v.trim().length > 15 || m.e.r === m.s.r) continue
      for (let r = r0 + 1; r <= m.e.r - range.s.r; r++) {
        if (!rows[r]) rows[r] = []
        if (rows[r][c0] === '' || rows[r][c0] == null) rows[r][c0] = v
      }
    }
    if (rows.length) out.push({ name, rows })
  }
  return out
}

// ── header detection ────────────────────────────────────────────────────────────────────────
type Cols = { no: number; desc: number; unit: number; qty: number; rate: number; amount: number }
const cellText = (c: any) => normalizeText(String(c ?? '')).replace(/\s+/g, ' ').trim()

function roleOf(t: string): keyof Cols | null {
  if (!t || t.length > 60) return null
  if (/unit\s*(?:rate|price|cost)|^rate|\brate\b|unit price|سعر الوحده|سعر الافرادي|سعر افرادي|الفئه|^فئه|^السعر$|^سعر$|price/.test(t)) return 'rate'
  if (/amount|total|value|المبلغ|الاجمالي|اجمالي|القيمه|المجموع|السعر الكلي/.test(t)) return 'amount'
  if (/^(?:unit|units|uom|u\.?o\.?m\.?|u\/m|الوحده|وحده|وحده القياس|الوحده المستخدمه)$/.test(t)) return 'unit'
  if (/q'?ty|quantit|qnty|^الكميه|^كميه|^الكميات|^العدد$/.test(t)) return 'qty'
  if (/descrip|particular|\bitem desc|^works?$|specification|^details?$|الوصف|وصف|البيان|بيان|^الاعمال$|^الاعمال المطلوبه/.test(t)) return 'desc'
  if (/^(?:item|items|item\s*no\.?|item\s*#|no\.?|s\.?\s*no\.?|sr\.?(?:\s*no\.?)?|ref\.?|ref\s*no\.?|code|رقم|م|ت|البند|رقم البند|الرمز|مسلسل)$/.test(t)) return 'no'
  return null
}

function detectHeader(rows: any[][]): { row: number; cols: Cols; score: number } | null {
  let best: { row: number; cols: Cols; score: number } | null = null
  for (let r = 0; r < Math.min(40, rows.length); r++) {
    const a = rows[r] || [], b = rows[r + 1] || []
    const width = Math.max(a.length, b.length)
    for (const two of [false, true]) {
      const cols: Cols = { no: -1, desc: -1, unit: -1, qty: -1, rate: -1, amount: -1 }
      let score = 0
      for (let c = 0; c < width; c++) {
        const t = cellText(a[c]) + (two ? ' ' + cellText(b[c]) : '')
        let role = roleOf(t.trim())
        if (!role && two) role = roleOf(cellText(b[c])) || roleOf(cellText(a[c]))
        if (role && cols[role] < 0) { cols[role] = c; score++ }
      }
      // a two-row header must not swallow a data row (numbers in the second row)
      if (two && (b as any[]).some((v: any) => typeof v === 'number')) continue
      if (cols.desc < 0) continue
      if (score >= 2 && (!best || score > best.score)) best = { row: two ? r + 1 : r, cols, score }
    }
    if (best && best.score >= 4) break
  }
  return best
}

// No header found: guess the columns from the data.
function inferCols(rows: any[][], start: number): Cols {
  const win = rows.slice(start, start + 80)
  const width = win.reduce((m, r) => Math.max(m, (r || []).length), 0)
  const stats = Array.from({ length: width }, () => ({ len: 0, txt: 0, num: 0, unit: 0 }))
  for (const r of win) for (let c = 0; c < width; c++) {
    const v = r?.[c]
    if (v === '' || v == null) continue
    if (typeof v === 'number' || /^\s*[\d٠-٩.,]+\s*$/.test(String(v))) { stats[c].num++; continue }
    const s = String(v).trim()
    if (normalizeUnit(s, 'boq')) stats[c].unit++
    else { stats[c].txt++; stats[c].len += s.length }
  }
  const desc = stats.reduce((bi, s, i) => (s.txt && s.len / Math.max(1, s.txt) * Math.min(1, s.txt / 5) > (stats[bi]?.len || 0) / Math.max(1, stats[bi]?.txt || 1) * Math.min(1, (stats[bi]?.txt || 0) / 5) ? i : bi), 0)
  const unit = stats.reduce((bi, s, i) => (i !== desc && s.unit > (bi < 0 ? 2 : stats[bi].unit) ? i : bi), -1)
  const nums = stats.map((s, i) => ({ i, n: s.num })).filter(x => x.i > desc && x.i !== unit && x.n >= 3).map(x => x.i)
  const no = stats.findIndex((s, i) => i < desc && s.num + s.txt > 3)
  return { no, desc, unit, qty: nums[0] ?? -1, rate: nums[1] ?? -1, amount: nums[2] ?? -1 }
}

// ── row kinds ───────────────────────────────────────────────────────────────────────────────
const TOTAL_RE = /^(?:sub[\s-]?total|total|grand total|carried|brought|b\/f|c\/f|to collection|to summary|carried to|page total|المجموع|مجموع|الاجمالي|اجمالي|المجموع الفرعي|مرحل|منقول|المنقول|اجمالي الصفحه|الاجمالي العام)/i
const SKIP_RE = /^(?:note|notes|preamble|general notes|description only|prepared by|printed|page \d|ملاحظه|ملاحظات|عام$)/i
const SECTION_RE = /^(?:bill(?:\s*no\.?)?\s*\d*|section|division|div\.?\s*\d|part\s|chapter|schedule|القسم|قسم|الباب|باب|الفصل|اعمال|الاعمال|جدول)\b/i
const CONT_RE = /^(?:[-–•·(]|incl|including|complete|with|and|as\s|to\s|for\s|in\s|of\s|at\s|و|مع|شامل|بما|حسب|من\s|على\s|في\s)/i
const ENUM_RE = /^(?:[a-zA-Z]\s*[).]|\(?[ivx]{1,4}\)|\d{1,2}\s*[).-]|[أ-ي]\s*[)-]|[-–•·])\s*/

const SPEC_RE = /(\d+(?:[.,]\d+)?\s?[x×*]\s?\d+(?:[.,]\d+)?(?:\s?[x×*]\s?\d+)?\s?(?:mm|cm|m|مم|سم|م)?|\bC\s?\d{2}(?:\/\d{2})?\b|\bK\d{3}\b|\bgrade\s?\d+|\bB500[ABC]\b|\bPN\s?\d+|\bSDR\s?\d+|\bIP\s?\d{2}\b|\b(?:SASO|ASTM|BS\s?EN|BS|EN|ISO)\s?[A-Z]?\d+[A-Z0-9.\-/]*|\d+(?:[.,]\d+)?\s?(?:mm2|mm²|mm|cm|kva|kv|kw|w\b|kg|amp|a\b|bar|btu|ton|hp|v\b|lux|min)|\bM\d{1,2}\b|Ø\s?\d+|(?:قطر|سماكة|سمك|قوة|مقاس)\s*\d+(?:[.,]\d+)?\s*(?:مم|سم|م|نيوتن)?|\d+(?:[.,]\d+)?\s?(?:مم|سم|كجم|كغ|حصان|واط|أمبير|بار|نيوتن|ميجا\s?باسكال|طن))/gi

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const str = (v: any) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim()
const numOrNull = (v: any) => { const q = parseQuantity(v); return q.value != null && q.value >= 0 ? q.value : null }

function shortName(desc: string): string {
  const d = desc.replace(/\b(?:ref|reference)\s*[:.]?\s*\S+/gi, '').replace(/\s+/g, ' ').trim()
  const cut = d.split(/\s*(?:[;؛]|,\s|،\s|\s[-–—]\s|\bincluding\b|\bcomplete with\b|\bas per\b|\bas specified\b|\bin accordance\b|\bto be\b|\bshall be\b|\bشاملا?\b|\bحسب المواصفات\b|\bوفقا\b)/i)[0]
  const name = cut.length >= 6 ? cut : d
  return name.slice(0, 120).trim()
}

// section words that decide the sector of everything under them
const SECTION_SECTOR: [RegExp, Sector][] = [
  [/electric|كهرب|lighting|اناره|low current|fire alarm|انذار|cctv|بيانات|data/i, 'electrical'],
  [/mechanic|plumbing|hvac|air condition|ميكانيك|سباكه|صحي|تكييف|تهويه|fire fighting|مكافحه|drainage|صرف/i, 'mechanical'],
  [/finish|architect|معماري|تشطيب|joinery|نجاره|doors|ابواب|ceiling|اسقف|paint|دهان|flooring|ارضيات/i, 'architectural'],
  [/concrete|civil|struct|earth|masonry|خرسان|انشائ|مدني|حفر|ردم|مباني|بلك|steel reinforcement|external works|اعمال خارجيه|landscap/i, 'civil'],
  [/equipment hire|plant hire|معدات|اليات/i, 'equipment'],
]
// CSI MasterFormat division numbers
const CSI: Record<string, Sector> = { '02': 'civil', '03': 'civil', '04': 'civil', '05': 'civil', '06': 'architectural', '07': 'architectural', '08': 'architectural', '09': 'architectural', '10': 'architectural', '12': 'architectural', '21': 'mechanical', '22': 'mechanical', '23': 'mechanical', '26': 'electrical', '27': 'electrical', '28': 'electrical', '31': 'civil', '32': 'civil', '33': 'civil' }

export function sectorOf(text: string, section: string | null): { sector: Sector; score: number; margin: number } {
  const scores: Record<string, number> = {}
  for (const d of detectSectorsFromText(text)) scores[d.sector] = d.score
  if (section) {
    const ns = normalizeText(section)
    const div = ns.match(/(?:division|div\.?|القسم|قسم)\s*(\d{2})/i)
    const hint = (div && CSI[div[1]]) || SECTION_SECTOR.find(([re]) => re.test(ns))?.[1]
    if (hint) scores[hint] = (scores[hint] || 0) + 2
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (!ranked.length) return { sector: 'civil', score: 0, margin: 0 }
  return { sector: ranked[0][0] as Sector, score: ranked[0][1], margin: ranked[0][1] - (ranked[1]?.[1] || 0) }
}

// ── the extraction ──────────────────────────────────────────────────────────────────────────
export function extractBoq(sheets: Sheet[], opts: { fromScan?: boolean } = {}): { items: BoqItem[]; stats: { sheets: number; rows: number; header: boolean[]; skipped_totals: number; sections: number; merged: number } } {
  const items: BoqItem[] = []
  const stats = { sheets: sheets.length, rows: 0, header: [] as boolean[], skipped_totals: 0, sections: 0, merged: 0 }
  for (const sh of sheets) {
    const rows = sh.rows
    const h = detectHeader(rows)
    stats.header.push(!!h)
    const start = h ? h.row + 1 : 0
    const cols = h ? { ...inferColsMissing(rows, start, h.cols) } : inferCols(rows, start)
    let section: string | null = null
    let context: string | null = null
    let contextRef: string | null = null
    let last: BoqItem | null = null
    let lastRow = -2
    for (let r = start; r < rows.length; r++) {
      const row = rows[r] || []
      stats.rows++
      const get = (c: number) => (c >= 0 ? row[c] : '')
      let desc = str(get(cols.desc))
      const no = str(get(cols.no))
      // description spilled into a neighbouring column (merged cells): take the longest text cell
      if (!desc) {
        const texts = row.map((v, i) => ({ i, s: str(v) })).filter(x => x.s && ![cols.no, cols.unit, cols.qty, cols.rate, cols.amount].includes(x.i) && !/^[\d.,\s]+$/.test(x.s))
        desc = texts.sort((a, b) => b.s.length - a.s.length)[0]?.s || ''
      }
      const unitRaw = str(get(cols.unit))
      const qtyCell = get(cols.qty), rateCell = get(cols.rate), amtCell = get(cols.amount)
      const qty = numOrNull(qtyCell), rate = numOrNull(rateCell), amount = numOrNull(amtCell)
      const hasNums = qty != null || rate != null || amount != null
      if (!desc && !hasNums) continue
      const nd = normalizeText(desc)
      if (TOTAL_RE.test(nd) || TOTAL_RE.test(normalizeText(no))) { stats.skipped_totals++; continue }
      if (SKIP_RE.test(nd)) continue
      const unitN = normalizeUnit(unitRaw, 'boq')

      if (!hasNums && !unitN) {
        // a heading, a lead-in paragraph, or the next line of the previous description
        if (!desc) continue
        const looksSection = SECTION_RE.test(nd) || (words(desc) <= 8 && !/[.:]$/.test(desc) && (desc === desc.toUpperCase() && /[A-Z]/.test(desc) || /^[A-Z]?\d{0,2}$/i.test(no) || words(desc) <= 4))
        if (last && lastRow === r - 1 && !no && CONT_RE.test(desc)) { last.description = (last.description + ' ' + desc).slice(0, 400); lastRow = r; continue }
        if (looksSection && !/:$/.test(desc)) { section = desc.slice(0, 120); context = null; contextRef = null; stats.sections++; continue }
        context = desc.replace(/:\s*$/, '').slice(0, 300)
        contextRef = no || null
        continue
      }
      if (!desc && !context) continue
      // a sub-item under a lead-in paragraph: «a) 110 mm dia», «- 25 mm thick», or a short phrase
      let full = desc
      let name = desc && words(desc) > 3 && !ENUM_RE.test(desc) ? shortName(desc) : ''
      let ref = no || null
      const sub = desc.replace(ENUM_RE, '').trim()
      // «a)», «(ii)», «ب)» in the number column = a sub-item; «2.2», «A3» = an item of its own
      const noIsEnum = /^\(?(?:[a-zA-Z]|[ivx]{1,4}|[ء-ي])\s*[).]?$/i.test(no)
      const ownNo = !!no && !noIsEnum
      if (context && !ownNo && (!desc || ENUM_RE.test(desc) || noIsEnum || words(desc) <= 8)) {
        full = `${context} — ${sub}`.replace(/ — $/, '')
        name = `${shortName(context)}${sub ? ' — ' + sub : ''}`.slice(0, 120)
        if (contextRef) ref = `${contextRef}${no ? ' ' + no : ''}`
      } else if (ownNo || (desc && words(desc) > 12)) { context = null; contextRef = null }
      if (!name) name = shortName(full)
      full = full.slice(0, 400)

      const flags: string[] = []
      let q = qty
      if (q == null && rate && amount) { q = Math.round((amount / rate) * 1000) / 1000; flags.push('qty_from_amount') }
      if (q != null && rate != null && amount != null && amount > 0 && Math.abs(q * rate - amount) > Math.max(1, amount * 0.02)) flags.push('qty_rate_amount_mismatch')
      let unit = unitN
      if (!unit && unitRaw) { unit = unitRaw.slice(0, 15); flags.push('unit_unrecognized') }
      if (!unit) {
        const fromDesc = (normalizeDigits(full).match(/\b(?:per|بال)\s*([^\s,;،]+)/i)?.[1]) || null
        unit = (fromDesc && normalizeUnit(fromDesc, 'boq')) || null
        if (unit) flags.push('unit_guessed')
        else { unit = 'عدد'; flags.push('unit_missing') }
      }
      if (q == null || q <= 0) flags.push('qty_missing')
      if (opts.fromScan) flags.push('from_scan')
      const specification = Array.from(new Set((full.match(SPEC_RE) || []).map(x => x.trim()))).join('، ').slice(0, 120)
      const sec = sectorOf(`${full} ${section || ''}`, section)
      if (sec.score === 0) flags.push('sector_guessed')
      const item: BoqItem = {
        ref: ref ? ref.slice(0, 40) : null,
        product_name: name,
        description: full,
        quantity: q, needs_quantity: q == null || q <= 0,
        unit, unit_raw: unitRaw || null, rate, amount, specification,
        sector: sec.sector, sector_score: sec.score, section,
        source_sheet: sh.name, row: r + 1, merged_count: 1, flags, confidence: 0,
      }
      item.confidence = rowConfidence(item, sec.margin)
      items.push(item)
      last = item; lastRow = r
    }
  }
  // the same item listed again (another building / section): one line, quantities summed
  const byKey = new Map<string, BoqItem>()
  const merged: BoqItem[] = []
  for (const it of items) {
    const k = `${normalizeText(it.description)}|${it.unit}|${normalizeText(it.specification)}`
    const prev = byKey.get(k)
    if (!prev) { byKey.set(k, it); merged.push(it); continue }
    prev.merged_count++
    stats.merged++
    if (prev.quantity != null && it.quantity != null) prev.quantity = Math.round((prev.quantity + it.quantity) * 1000) / 1000
    else if (prev.quantity == null) prev.quantity = it.quantity
    prev.needs_quantity = prev.quantity == null || prev.quantity <= 0
    if (prev.amount != null && it.amount != null) prev.amount += it.amount
    if (!prev.flags.includes('merged')) prev.flags.push('merged')
  }
  return { items: merged, stats }
}

// A header row may name only some columns: infer the rest (e.g. no «Unit» heading).
function inferColsMissing(rows: any[][], start: number, cols: Cols): Cols {
  if (cols.qty >= 0 && cols.unit >= 0) return cols
  const guess = inferCols(rows, start)
  const taken = new Set(Object.values(cols).filter(c => c >= 0))
  const out = { ...cols }
  for (const k of ['unit', 'qty', 'rate', 'amount'] as const) if (out[k] < 0 && guess[k] >= 0 && !taken.has(guess[k])) { out[k] = guess[k]; taken.add(guess[k]) }
  return out
}

export function rowConfidence(it: Pick<BoqItem, 'flags' | 'sector_score'>, margin = 1): number {
  let c = 0.9
  const f = new Set(it.flags)
  if (f.has('qty_missing')) c -= 0.3
  if (f.has('qty_rate_amount_mismatch')) c -= 0.2
  if (f.has('qty_from_amount')) c -= 0.05
  if (f.has('unit_missing')) c -= 0.2
  if (f.has('unit_guessed') || f.has('unit_unrecognized')) c -= 0.1
  if (f.has('from_scan')) c -= 0.1
  if (f.has('sector_guessed')) c -= 0.2
  else if (margin < 1) c -= 0.1
  return Math.max(0.05, Math.round(c * 100) / 100)
}

/** Rows transcribed from a PDF / scan by the AI → the same pipeline as a spreadsheet. */
export function sheetFromAiRows(rows: any[], name = 'PDF'): Sheet {
  const out: any[][] = [['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Amount']]
  let section = ''
  for (const r of rows || []) {
    const sec = str(r?.section)
    if (sec && sec !== section) { out.push(['', sec]); section = sec }
    out.push([str(r?.item_no), str(r?.description), str(r?.unit), r?.qty ?? '', r?.rate ?? '', r?.amount ?? ''])
  }
  return { name, rows: out }
}
