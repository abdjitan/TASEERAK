// NRM / SMM tender BOQ reader (rules only, no AI). Built on the shapes real QS bills use:
//  • a workbook = cover + summary + index + one sheet per trade («14 - H DOORS AND WINDOWS»)
//    + a «Collection» sheet after each trade. Only sheets with a pricing header are read;
//  • every printed page repeats the project title, the trade title, the header row
//    («Item | | Unit | Qty | Rate | Cost») and ends with «To Collection» + a footer
//    («Printed … | 14/3»): rows outside header→footer are page furniture, not items;
//  • a description paragraph («Excavation to reduce levels. All in accordance…») is followed by
//    lettered sub-items («B | to reduce level | m³ | 6845»): the item is lead-in + sub-item;
//  • «Local Procurement Etimad Code: …» lines and series headers («DRS-200 Series») apply to
//    the items below them; «(Cont'd)» repeats them on the next page;
//  • drawing / keynote codes are written in brackets at the end («(DRS-254-T13)»).
// Each item keeps sheet + row (+ page/letter ref) so the number can be traced to the file.
import { normalizeUnit } from '@/lib/ai/units'
import type { TenderItem, ItemKind, BoqSection, BoqReadStats } from './types'

export type Sheet = { name: string; rows: any[][] }

// ── reading the workbook (browser or Node: the caller passes the xlsx module) ───────────────
/** Sheets of a workbook as row arrays. Short texts merged down several rows are copied to each row. */
export function sheetsFromWorkbook(XLSX: any, wb: any): Sheet[] {
  const out: Sheet[] = []
  for (const name of wb.SheetNames as string[]) {
    const ws: any = wb.Sheets[name]
    if (!ws || !ws['!ref']) continue
    const range = XLSX.utils.decode_range(ws['!ref'])
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: true }) as any[][]
    for (const m of (ws['!merges'] || []) as any[]) {
      const r0 = m.s.r - range.s.r, c0 = m.s.c - range.s.c
      const v = rows[r0]?.[c0]
      if (typeof v !== 'string' || !v.trim() || v.trim().length > 15 || m.e.r === m.s.r) continue
      for (let r = r0 + 1; r <= m.e.r - range.s.r; r++) {
        if (!rows[r]) rows[r] = []
        if (rows[r][c0] === '' || rows[r][c0] == null) rows[r][c0] = v
      }
    }
    out.push({ name, rows })
  }
  return out
}

/** Read an .xlsx / .xls / .csv file's bytes (browser: ArrayBuffer from File.arrayBuffer()). */
export async function readBoqWorkbook(data: ArrayBuffer | Uint8Array): Promise<Sheet[]> {
  const XLSX: any = await import('xlsx')
  const wb = XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), { type: 'array', dense: true, cellFormula: false, cellHTML: false })
  return sheetsFromWorkbook(XLSX, wb)
}

// ── helpers ───────────────────────────────────────────────────────────────────────────────
const str = (v: any) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim()
const low = (s: string) => s.toLowerCase()
function num(v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = str(v).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٫/g, '.').replace(/,(?=\d{3}\b)/g, '')
  if (!/^-?\d+(?:\.\d+)?$/.test(s)) return null
  return Number(s)
}
const CONTD_RE = /\s*\(cont'?d\.?\)\s*$/i
const stripContd = (s: string) => s.replace(CONTD_RE, '').trim()

// header words
type Role = 'item' | 'desc' | 'unit' | 'qty' | 'rate' | 'amount'
function roleOf(t: string): Role | null {
  const s = low(t).replace(/[.:]/g, '').trim()
  if (!s || s.length > 40) return null
  if (/^(?:item|items|item no|item ref|ref|no|s ?no|sr|رقم البند|البند|م|الرمز)$/.test(s)) return 'item'
  if (/^(?:description|descriptions|particulars|description of works?|الوصف|البيان|وصف البند)$/.test(s)) return 'desc'
  if (/^(?:unit|units|uom|الوحدة|الوحده|وحدة القياس)$/.test(s)) return 'unit'
  if (/^(?:qty|quantity|quantities|q'ty|الكمية|الكميه)$/.test(s)) return 'qty'
  if (/^(?:rate|rate sar|rate \w{3}|unit rate|unit price|السعر|سعر الوحدة|الفئة)$/.test(s)) return 'rate'
  if (/^(?:cost|cost sar|cost \w{3}|amount|amount sar|amount \w{3}|total|value|المبلغ|الإجمالي|الاجمالي|القيمة)$/.test(s)) return 'amount'
  return null
}

type Header = { row: number; roles: Partial<Record<Role, number>> }
function headerOf(row: any[]): Header['roles'] | null {
  const roles: Header['roles'] = {}
  let n = 0
  row.forEach((v, c) => { const r = roleOf(str(v)); if (r && roles[r] == null) { roles[r] = c; n++ } })
  return n >= 3 && roles.unit != null && roles.qty != null ? roles : null
}

// sheets that never hold items
const SKIP_SHEET_RE = /collection|summary|^\s*index\s*$|cover|contents|ملخص|الخلاصة|الفهرس|الغلاف/i
// rows that end a page / a bill
const PAGE_END_RE = /^(?:to collection|to summary|carried (?:forward|to)|c\/f|page total|المجموع|مجموع الصفحة|مرحل)/i
const FOOTER_PAGE_RE = /(?:^|\s)(\d{1,3}\/\d{1,3})\s*$/
const ETIMAD_RE = /^local procurement etimad code\s*:\s*(.*)$/i
// «B9 EXCAVATION», «H1 DOORS», «C2 POURED CONCRETE»; or a short all-caps heading
const NRM_HEAD_RE = /^[A-Z]{1,2}\d{1,2}\s+[A-Z][A-Z0-9 ,&/()'-]+$/
const SERIES_RE = /\b([A-Z]{2,4})-(\d)00\s+series\b/i
const CODE_RE = /\b[A-Z]{2,4}-\d{3}(?:-T\d{1,2})?\b/g
const BRACKET_RE = /\(([^()]*\b[A-Z]{2,4}-\d{3}[^()]*)\)/g
const SPEC_SEC_RE = /\b(?:section|division)\s+(\d{2}\s\d{2}\s\d{1,2}(?:\.\d{2})?)\b/gi
const EQUIP_REF_RE = /\bref\.?\s+([A-Z]{2,4}(?:-[A-Z0-9]{1,6}){1,3})\b/g

const isItemLetter = (s: string) => /^(?:[A-Z]{1,2}|[a-z]\)?|\(?[ivx]{1,4}\)|\d{1,3}(?:\.\d{1,3}){0,3}[a-z]?)$/.test(s)

function isHeading(t: string): boolean {
  const s = stripContd(t)
  if (NRM_HEAD_RE.test(s)) return true
  // short ALL-CAPS line: «CHILLED WATER INSTALLATIONS», «GENERALLY», «EQUIPMENT AND ACCESSORIES»
  return s.length <= 70 && /[A-Z]{3}/.test(s) && s === s.toUpperCase() && !/\d{2,}\s*(?:mm|m)\b/i.test(s) && !/[;:]/.test(s)
}

// ── kind of an item (what goes to suppliers) ───────────────────────────────────────────────
const PROVISIONAL_RE = /\bprovisional\b|\bprime cost\b|\bp\.?c\.? sum\b|\bdaywork|\bpreliminar|\bcontingenc|\btenderer is to include\b|\bbill of additions\b|\badditions and omissions\b|\binsurances?\b|\bperformance bond\b|\bbonds?\b|\bovertime\b|\bmobili[sz]ation\b|\bsite establishment\b|مبلغ احتياطي|مبالغ احتياطية|تكاليف عامة|اعمال يومية/i
const WORKS_RE = /\bexcavat|\bbackfill|\bfilling\b|\bdisposal\b|material arising|\bcompact(?:ion|ing)\b|\btesting\b|\bcommissioning\b|\bco-?ordination\b|\bcutting or forming\b|\bbuilding in\b|\bmaking good\b|\bfire stopping of\b|\bidentification including\b|\bdocuments including\b|\btools and spares\b|\bflushing\b|clean,? flush|\bdosing\b(?!\s*(?:tank|pump|unit|pot|set|system))|\bcleaning\b|\bsetting out\b|\btemporary\b|\bdewater|\bdemoli|\bremoval\b|\btrial pits?\b|\blabou?r\b|\bsurvey\b|\btrimming\b|\bdisconnect|\bpre-comm\b|\bwork incidental\b|\bsundr(?:y|ies)\b|\bprotective painting and decorative painting\b|حفر|ردم|دك|ترحيل|نقل المخلفات|فحص|اختبار|تشغيل تجريبي|تنسيق|اعمال مؤقتة|ازالة|هدم/i
// installed systems priced per area/length are still materials to a supplier (doors, cladding…)

function classify(leadIn: string | null, itemText: string, section: string | null, trade: string | null): { kind: ItemKind; why: string } {
  const own = itemText || ''
  const all = `${leadIn || ''} ${own}`
  const ctx = `${trade || ''} ${section || ''}`
  let m = own.match(PROVISIONAL_RE) || all.match(PROVISIONAL_RE) || ctx.match(/tender adjustment|preliminar|provisional|dayworks?/i)
  if (m) return { kind: 'provisional', why: m[0] }
  // the item's own words decide first («Waterproofing…» under «Sundries» is still a material)
  m = own.match(WORKS_RE)
  if (m) return { kind: 'works', why: m[0] }
  m = (leadIn || '').match(WORKS_RE)
  if (m && own.split(/\s+/).length <= 6) return { kind: 'works', why: m[0] }
  if (/^generally$/i.test(stripContd(section || '')) && /\bsundr|incidental/i.test(leadIn || '')) return { kind: 'works', why: 'Sundries' }
  return { kind: 'material', why: '' }
}

function codesOf(text: string): { codes: string[]; refs: string[]; spec_refs: string[] } {
  const codes = new Set<string>()
  for (const m of Array.from(text.matchAll(BRACKET_RE))) for (const c of m[1].match(CODE_RE) || []) codes.add(c.toUpperCase())
  const refs = new Set<string>()
  for (const c of text.match(CODE_RE) || []) if (!codes.has(c.toUpperCase())) refs.add(c.toUpperCase())
  for (const m of Array.from(text.matchAll(EQUIP_REF_RE))) refs.add(m[1].toUpperCase())
  const spec_refs = new Set<string>()
  for (const m of Array.from(text.matchAll(SPEC_SEC_RE))) spec_refs.add(m[1].replace(/\s+/g, ' '))
  return { codes: Array.from(codes), refs: Array.from(refs), spec_refs: Array.from(spec_refs) }
}

/** The unit of a BOQ cell: NRM «Item» = a lump sum, «nr/No» = عدد, «t» = طن… */
function unitOf(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (/^(?:item|items|sum|ls|l\.s\.?|lump ?sum|مقطوعية)$/i.test(s)) return 'مقطوعية'
  if (/^(?:prov(?:isional)?\.? ?sum|ps|p\.s\.?)$/i.test(s)) return 'مقطوعية'
  if (/^(?:nr|no\.?|nos\.?|number|each|ea)$/i.test(s)) return 'عدد'
  if (/^(?:t|tonne|tonnes|ton|tons)$/i.test(s)) return 'طن'
  if (/^(?:m|lm|l\.m\.?|lin\.? ?m|rm)$/i.test(s)) return 'م.ط'
  return normalizeUnit(s, 'boq')
}

const tradeOfSheet = (name: string) => name.replace(/^\s*\d+\s*-\s*/, '').trim() || null

// ── the reader ─────────────────────────────────────────────────────────────────────────────
export function readNrmBoq(sheets: Sheet[]): { items: TenderItem[]; sections: BoqSection[]; stats: BoqReadStats } {
  const items: TenderItem[] = []
  const sections: BoqSection[] = []
  const stats: BoqReadStats = {
    sheets_total: sheets.length, sheets_read: [], sheets_skipped: [], header_rows: 0, page_footers: 0, lead_ins: 0, rows_skipped: 0,
    by_kind: { material: 0, works: 0, provisional: 0, header: 0 },
  }
  for (const sh of sheets) {
    if (SKIP_SHEET_RE.test(sh.name)) { stats.sheets_skipped.push({ name: sh.name, why: 'summary/index/collection' }); continue }
    const rows = sh.rows
    // the pricing header (repeated on every page); a sheet without one holds no items
    let cols: Header['roles'] | null = null
    for (let r = 0; r < rows.length && !cols; r++) cols = headerOf(rows[r] || [])
    if (!cols) { stats.sheets_skipped.push({ name: sh.name, why: 'no Unit/Qty header' }); continue }
    stats.sheets_read.push(sh.name)
    const c = resolveColumns(rows, cols)
    let trade = tradeOfSheet(sh.name)
    let section: string | null = null
    let leadIn: string | null = null
    let leadRow = -1
    let series: string | null = null
    let etimad: { code: string | null; label: string | null } = { code: null, label: null }
    let inBody = false
    let pagePending: TenderItem[] = []
    let last: TenderItem | null = null
    let lastRow = -9

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || []
      const cells = row.map(str)
      const joined = cells.filter(Boolean).join(' | ')
      if (!joined) continue
      if (headerOf(row)) { inBody = true; stats.header_rows++; continue }
      // footer of a printed page: «Pricing Document … Printed … | 14/3» → the page ref of its items
      const fm = cells.filter(Boolean).slice(-1)[0]?.match(FOOTER_PAGE_RE)
      if (/\bprinted\b/i.test(joined) || (fm && !inBody && cells.filter(Boolean).length <= 3 && /document|page/i.test(joined))) {
        const page = fm?.[1] || null
        for (const it of pagePending) if (page) it.ref = it.ref ? `${page} ${it.ref}` : page
        pagePending = []
        stats.page_footers++
        inBody = false
        continue
      }
      const desc = cells[c.desc] || ''
      const letter = c.item >= 0 && c.item !== c.desc ? cells[c.item] : ''
      if (PAGE_END_RE.test(desc) || PAGE_END_RE.test(cells.find(Boolean) || '')) { inBody = false; continue }
      if (!inBody) { stats.rows_skipped++; continue }
      // sheet title repeated in the body («8 - B SITE WORK | (Filtered by …)»)
      if (/\(filtered by\b/i.test(joined)) { stats.rows_skipped++; continue }

      const unitRaw = c.unit >= 0 ? cells[c.unit] : ''
      const qty = c.qty >= 0 ? num(row[c.qty]) : null
      const rate = c.rate >= 0 ? num(row[c.rate]) : null
      const amount = c.amount >= 0 ? num(row[c.amount]) : null
      const unit = unitOf(unitRaw)

      const em = desc.match(ETIMAD_RE)
      if (em) {
        const v = stripContd(em[1])
        if (!v || /^undefined$/i.test(v)) etimad = { code: null, label: null }
        else { const cm = v.match(/^(.*?)\s*-\s*(\d{3,6})$/); etimad = { code: cm ? cm[2] : v.slice(0, 40), label: cm ? cm[1].trim() : null } }
        continue
      }

      const isItem = !!desc && (!!unit || qty != null || (!!letter && isItemLetter(letter)))
      if (!isItem) {
        if (!desc) { stats.rows_skipped++; continue }
        // a wrapped line of the previous item («…including all necessary supports» on the next row)
        if (last && lastRow === r - 1 && /^[a-z(&,-]/.test(desc)) { last.item_text += ' ' + desc; last.description = joinDesc(last.lead_in, last.item_text); lastRow = r; continue }
        if (isHeading(desc)) {
          const t = stripContd(desc)
          if (t !== section) { section = t; sections.push({ sheet: sh.name, row: r + 1, title: t, trade }); leadIn = null; series = null }
          continue
        }
        const t = stripContd(desc)
        // a second paragraph right under the lead-in continues it
        if (leadIn && leadRow === r - 1 && /^[a-z(]/.test(t)) { leadIn = `${leadIn} ${t}`; leadRow = r; continue }
        if (t !== leadIn) { leadIn = t; stats.lead_ins++ }
        leadRow = r
        const sm = t.match(SERIES_RE)
        if (sm) series = `${sm[1].toUpperCase()}-${sm[2]}00 Series`
        else if (!/\(cont'?d/i.test(desc)) series = null
        continue
      }

      const itemText = desc
      const description = joinDesc(leadIn, itemText)
      const { codes, refs, spec_refs } = codesOf(`${leadIn || ''} ${itemText}`)
      const ownCodes = codesOf(itemText).codes
      const { kind, why } = classify(leadIn, itemText, section, trade)
      const flags: string[] = []
      const lumpSum = unit === 'مقطوعية' && (qty == null || qty <= 0)
      if (!unit) flags.push(unitRaw ? 'unit_unrecognized' : 'unit_missing')
      if ((qty == null || qty <= 0) && !lumpSum) flags.push('qty_missing')
      if (qty != null && rate != null && amount != null && amount > 0 && Math.abs(qty * rate - amount) > Math.max(1, amount * 0.01)) flags.push('qty_rate_amount_mismatch')
      if (/\bapprox(?:imate)?\.? quantit/i.test(itemText)) flags.push('qty_approximate')
      if (/\bTBC\b|\bTBA\b|to be confirmed|to be advised/i.test(description)) flags.push('tbc')
      const it: TenderItem = {
        key: `${sh.name}!${r + 1}`,
        ref: letter || null,
        sheet: sh.name, trade, section, series, row: r + 1,
        lead_in: leadIn, item_text: itemText, description,
        unit: unit || (unitRaw ? unitRaw.slice(0, 15) : null), unit_raw: unitRaw || null,
        qty, rate, amount, // a lump sum keeps no quantity: it is priced as one lot when sent
        // an item's own bracketed code wins over the series code of its lead-in
        codes: ownCodes.length ? ownCodes : codes, refs, spec_refs,
        etimad_code: etimad.code, etimad_label: etimad.label,
        kind, kind_reason: why, lump_sum: lumpSum, flags,
      }
      items.push(it); pagePending.push(it)
      stats.by_kind[kind]++
      last = it; lastRow = r
    }
  }
  return { items, sections, stats }
}

function joinDesc(leadIn: string | null, itemText: string): string {
  if (!leadIn) return itemText
  // the boilerplate «All in accordance with the drawings, specifications…» says nothing to a supplier
  const head = leadIn.replace(/\.?\s*all in accordance with[^.;]*[.;]?\s*$/i, '').replace(/;\s*$/, '').trim()
  if (!itemText) return head
  if (low(itemText).startsWith(low(head).slice(0, 25))) return itemText
  return `${head} — ${itemText}`
}

/**
 * The description column is the one with long texts; the item letter is the short column left of it.
 * (In NRM bills the «Item» heading often stands over the description, with the letters to its left.)
 */
function resolveColumns(rows: any[][], roles: Header['roles']): { item: number; desc: number; unit: number; qty: number; rate: number; amount: number } {
  const used = new Set([roles.unit, roles.qty, roles.rate, roles.amount].filter((v): v is number => v != null))
  const width = rows.reduce((m, r) => Math.max(m, (r || []).length), 0)
  const len = Array.from({ length: width }, () => 0), short = Array.from({ length: width }, () => 0)
  for (const row of rows.slice(0, 600)) for (let c = 0; c < width; c++) {
    if (used.has(c)) continue
    const s = str(row?.[c])
    if (!s) continue
    if (s.length > 12) len[c] += s.length
    else if (isItemLetter(s)) short[c]++
  }
  let desc = roles.desc ?? -1
  if (desc < 0) desc = len.reduce((bi, v, i) => (v > (len[bi] ?? -1) ? i : bi), 0)
  let item = roles.item != null && roles.item !== desc ? roles.item : -1
  if (item < 0) {
    let best = -1
    for (let c = 0; c < width; c++) if (c !== desc && !used.has(c) && short[c] > (best < 0 ? 2 : short[best])) best = c
    item = best
  }
  return { item, desc, unit: roles.unit ?? -1, qty: roles.qty ?? -1, rate: roles.rate ?? -1, amount: roles.amount ?? -1 }
}
