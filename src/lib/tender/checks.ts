// Cross-checks of a tender: BOQ ↔ drawings ↔ specification. Every flag names its sources
// (BOQ sheet/row, drawing sheet/page, spec section/page) so the company can verify it in seconds.
// Severity: error = must be fixed before sending; warning = likely wrong; review = needs a human
// look (e.g. a tag count, since a tag can be printed twice or sit on a sheet not uploaded); info.
import type { TenderItem, DrawingSummary, SpecIndex, SpecHit, PdfPageText, TenderFlag, SourceRef } from './types'
import { findSpec } from './specIndex'
import { familyOf, isFinishCode, sheetPartOf } from './drawingText'

const boqSrc = (it: TenderItem): SourceRef => ({ kind: 'boq', sheet: it.sheet, row: it.row, ref: it.ref || undefined, quote: it.description.slice(0, 240) })
const drawSrc = (d: DrawingSummary, code?: string, quote?: string): SourceRef => ({ kind: 'drawing', file: d.file, sheet: d.sheet_no || undefined, page: d.page, ref: code, quote })
const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString()
const COUNTABLE = new Set(['عدد', 'حبة', 'طقم'])
const normWords = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !/^(?:with|including|includes|system|systems|finish|finishes|type|external|internal|all|and|the|over|plant|boh|foh)$/.test(w)).map(w => w.slice(0, 6))
// materials that exclude each other when one document names one and the other names another
const MATERIAL_GROUPS: string[][] = [
  ['epoxy', 'polyurethane', 'pu ', 'acrylic', 'cementitious', 'vinyl', 'carpet', 'ceramic', 'porcelain', 'terrazzo', 'granite', 'marble'],
  ['timber', 'wood', 'steel', 'metal', 'aluminium', 'aluminum', 'glazed', 'upvc', 'pvc'],
  ['gypsum', 'cement board', 'mineral fibre', 'metal ceiling'],
  ['bitumen', 'bituminous', 'polyurethane membrane', 'pvc membrane', 'epdm', 'tpo'],
]
function materialsIn(s: string): Set<string> {
  const t = ` ${s.toLowerCase()} `
  const out = new Set<string>()
  for (const g of MATERIAL_GROUPS) for (const m of g) if (t.includes(m)) out.add(m.trim())
  return out
}

export type CheckInput = {
  items: TenderItem[]
  drawings?: DrawingSummary[]
  specs?: { index: SpecIndex; pages: PdfPageText[] }[]
}

export type CheckResult = {
  flags: TenderFlag[]
  byItem: Record<string, TenderFlag[]>
  codeLinks: { code: string; boq_items: string[]; boq_qty: number | null; drawing_count: number; on_drawings: { sheet: string | null; page: number; file: string; count: number }[]; legend: string | null }[]
  specLinks: Record<string, { id: string; title: string; page: number; quote: string; file: string }[]>
  areaChecks: AreaCheckRow[]
}

/** Floor-type finish (FL/CLG/SCR/WPS/TRM) in m² on the BOQ vs room areas tagged with it on the sheets. */
export type AreaCheckRow = {
  code: string
  legend: string | null
  /** ok = within ±5%; review = outside, needs a human look; partial = not all sheets of the level uploaded;
   *  walls = paint (applies to walls, floor area is not comparable); no_rooms = tagged but no room found */
  status: 'ok' | 'review' | 'partial' | 'walls' | 'no_rooms'
  boq_qty: number | null
  boq_items: string[]
  basis: 'code' | 'legend' | null       // how the BOQ items were found
  drawing_area: number
  diff_pct: number | null               // (drawings − BOQ) / BOQ × 100
  rooms: { code: string | null; name: string; area: number; sheets: string[]; low: boolean }[]
  sheets: string[]
  unassigned: number                    // tags of this code no room could be assigned to
  partial: { level: string; have: number; of: number }[]
}

export const AREA_TOLERANCE_PCT = 5

/** Spec sections for an item: its named section («23 21 13») first, then its code, then its words. */
export function specHitsFor(it: TenderItem, specs: { index: SpecIndex; pages: PdfPageText[] }[]): (SpecHit & { file: string })[] {
  const run = (q: string, n: number, min = 0) => specs.flatMap(s => findSpec(s.index, s.pages, q, n).filter(h => h.score >= min).map(h => ({ ...h, file: s.index.file })))
  let hits = it.spec_refs.flatMap(r => run(r, 1))
  // a code the coordination matrix (CCM) maps to a section: «FL-303» → 09 67 23
  if (!hits.length) {
    const csi = Array.from(new Set(it.codes.flatMap(c => {
      const base = c.replace(/-T\d{1,2}$/, '')
      return specs.map(s => (s.index.codes?.[c] || s.index.codes?.[base])?.csi).filter((x): x is string => !!x)
    })))
    hits = csi.flatMap(n => run(n, 1))
  }
  if (!hits.length) hits = it.codes.flatMap(c => run(c, 2))
  if (!hits.length) hits = run(`${it.item_text} ${it.lead_in || ''}`.slice(0, 200), 2, 12)
  // the same section from two revisions of one book (or printed twice) is one link
  const seen = new Set<string>()
  return hits.sort((a, b) => b.score - a.score).filter(h => { const k = h.section.id + '|' + h.section.title.toUpperCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

export function runChecks({ items, drawings = [], specs = [] }: CheckInput): CheckResult {
  const flags: TenderFlag[] = []
  const push = (f: TenderFlag) => flags.push(f)

  // 1) arithmetic, missing quantity / unit (from the reader)
  for (const it of items) {
    if (it.kind === 'header') continue
    const f = new Set(it.flags)
    if (f.has('qty_missing')) push({ code: 'qty_missing', severity: it.kind === 'material' ? 'error' : 'warning', item_key: it.key, ar: 'لا توجد كمية لهذا البند في جدول الكميات', en: 'No quantity in the BOQ', sources: [boqSrc(it)] })
    if (f.has('unit_missing') || f.has('unit_unrecognized')) push({ code: 'unit', severity: 'error', item_key: it.key, ar: `الوحدة غير معروفة${it.unit_raw ? ` («${it.unit_raw}»)` : ''}`, en: `Unknown unit${it.unit_raw ? ` («${it.unit_raw}»)` : ''}`, sources: [boqSrc(it)] })
    if (f.has('qty_rate_amount_mismatch')) push({ code: 'arithmetic', severity: 'error', item_key: it.key, ar: `الكمية × السعر (${fmt((it.qty || 0) * (it.rate || 0))}) لا تساوي الإجمالي (${fmt(it.amount || 0)})`, en: `Qty × rate (${fmt((it.qty || 0) * (it.rate || 0))}) ≠ amount (${fmt(it.amount || 0)})`, sources: [boqSrc(it)] })
    if (f.has('qty_approximate')) push({ code: 'qty_approx', severity: 'review', item_key: it.key, ar: 'الكمية تقريبية حسب الجدول («approx quantity»)', en: 'Quantity marked approximate in the BOQ', sources: [boqSrc(it)] })
    if (f.has('tbc')) push({ code: 'tbc', severity: 'warning', item_key: it.key, ar: 'الوصف يحتوي على «يؤكَّد لاحقاً» (TBC/TBA): المواصفة غير مكتملة', en: 'Description says TBC/TBA: the specification is incomplete', sources: [boqSrc(it)] })
    if (it.kind === 'material' && it.qty != null && it.unit && COUNTABLE.has(it.unit) && !Number.isInteger(it.qty)) push({ code: 'qty_fraction', severity: 'warning', item_key: it.key, ar: `كمية كسرية (${it.qty}) لوحدة تُعدّ بالعدد`, en: `Fractional quantity (${it.qty}) for a counted unit`, sources: [boqSrc(it)] })
    if (it.lump_sum && it.kind === 'material') push({ code: 'lump_sum', severity: 'review', item_key: it.key, ar: 'بند مقطوعية بلا كمية: يُسعَّر كوحدة واحدة، حدّد نطاقه للمورد', en: 'Lump-sum item without quantity: priced as one lot, define its scope for suppliers', sources: [boqSrc(it)] })
  }

  // 2) duplicates: the same description and unit twice
  const seen = new Map<string, TenderItem[]>()
  for (const it of items) {
    if (it.kind !== 'material') continue
    const k = `${it.description.toLowerCase().replace(/\s+/g, ' ')}|${it.unit}`
    seen.set(k, [...(seen.get(k) || []), it])
  }
  for (const list of Array.from(seen.values())) {
    if (list.length < 2) continue
    for (const it of list) {
      const others = list.filter(o => o !== it)
      push({ code: 'duplicate', severity: 'warning', item_key: it.key, ar: `البند مكرر بنفس الوصف والوحدة (${others.map(o => `${o.sheet} صف ${o.row}`).join('، ')}): تأكّد أنه ليس عدّاً مزدوجاً`, en: `Same description and unit repeated (${others.map(o => `${o.sheet} row ${o.row}`).join(', ')}): make sure it is not counted twice`, sources: [boqSrc(it), ...others.map(boqSrc)] })
    }
  }

  // 3) codes: BOQ ↔ drawings
  const codeLinks: CheckResult['codeLinks'] = []
  if (drawings.length) {
    const drawCodes = new Map<string, { d: DrawingSummary; count: number }[]>()
    const legendAll: Record<string, { text: string; d: DrawingSummary }> = {}
    for (const d of drawings) {
      for (const t of d.tags) drawCodes.set(t.code, [...(drawCodes.get(t.code) || []), { d, count: t.count }])
      for (const [code, text] of Object.entries(d.legend)) if (!legendAll[code]) legendAll[code] = { text, d }
    }
    const families = new Set<string>([...Array.from(drawCodes.keys()), ...Object.keys(legendAll)].map(familyOf))
    const boqByCode = new Map<string, TenderItem[]>()
    for (const it of items) for (const c of it.codes) boqByCode.set(c, [...(boqByCode.get(c) || []), it])
    const boqMentions = new Set<string>()
    for (const it of items) for (const c of [...it.codes, ...it.refs]) { boqMentions.add(c); boqMentions.add(c.replace(/-T\d+$/, '')) }

    for (const [code, list] of Array.from(boqByCode.entries())) {
      const onD = drawCodes.get(code) || []
      const inLegend = legendAll[code] || legendAll[code.replace(/-T\d+$/, '')] || null
      const count = onD.reduce((s, x) => s + x.count, 0)
      const allQty = list.every(i => i.qty != null)
      const boqQty = allQty ? list.reduce((s, i) => s + (i.qty || 0), 0) : null
      codeLinks.push({ code, boq_items: list.map(i => i.key), boq_qty: boqQty, drawing_count: count, on_drawings: onD.map(x => ({ sheet: x.d.sheet_no, page: x.d.page, file: x.d.file, count: x.count })), legend: inLegend?.text || null })
      if (!onD.length && !inLegend && families.has(familyOf(code))) {
        for (const it of list) push({ code: 'code_not_on_drawings', severity: 'review', item_key: it.key, ar: `الرمز ${code} غير موجود في المخططات المرفوعة (قد يكون في لوحات لم تُرفع)`, en: `Code ${code} is not on the uploaded drawings (it may be on sheets not uploaded)`, sources: [boqSrc(it)] })
      }
      // tag count vs quantity, for counted units only
      const countable = list.every(i => i.unit && COUNTABLE.has(i.unit))
      if (onD.length && countable && boqQty != null && Math.round(boqQty) !== count) {
        const more = count > boqQty
        const perSheet = onD.map(x => `${x.d.sheet_no || x.d.file}: ${x.count}`).join('، ')
        for (const it of list) push({
          code: 'tag_count', severity: 'review', item_key: it.key,
          ar: `الرمز ${code}: الكمية في الجدول ${fmt(boqQty)}${list.length > 1 ? ` (مجموع ${list.length} بنود)` : ''}، والمخططات المرفوعة تُظهره ${count} مرة (${perSheet}). ${more ? 'المخططات تُظهر أكثر من الجدول: راجع الكمية.' : 'قد تكون البقية في لوحات لم تُرفع.'} قد يُطبع الرمز مرتين للعنصر نفسه.`,
          en: `Code ${code}: BOQ quantity ${fmt(boqQty)}${list.length > 1 ? ` (sum of ${list.length} items)` : ''}, uploaded drawings show it ${count} times (${perSheet}). ${more ? 'Drawings show more than the BOQ: check the quantity.' : 'The rest may be on sheets not uploaded.'} A tag can be printed twice for one element.`,
          sources: [boqSrc(it), ...onD.map(x => drawSrc(x.d, code, `${code} × ${x.count}`))],
        })
      }
      // legend wording vs BOQ wording
      if (inLegend) {
        const lw = new Set(normWords(inLegend.text))
        for (const it of list) {
          const bw = normWords(it.description)
          const overlap = bw.filter(w => lw.has(w)).length
          const lm = materialsIn(inLegend.text), bm = materialsIn(it.description)
          const conflict = lm.size > 0 && bm.size > 0 && !Array.from(lm).some(m => bm.has(m))
          if (conflict) push({ code: 'legend_conflict', severity: 'warning', item_key: it.key, ar: `وصف ${code} في مفتاح المخطط («${inLegend.text}») يذكر مادة مختلفة عن جدول الكميات`, en: `Drawing legend for ${code} («${inLegend.text}») names a different material than the BOQ`, sources: [boqSrc(it), drawSrc(inLegend.d, code, `${code} - ${inLegend.text}`)] })
          else if (overlap === 0 && lw.size > 0) push({ code: 'legend_mismatch', severity: 'review', item_key: it.key, ar: `وصف ${code} في مفتاح المخطط («${inLegend.text}») لا يشبه وصف البند`, en: `Drawing legend for ${code} («${inLegend.text}») does not resemble the BOQ wording`, sources: [boqSrc(it), drawSrc(inLegend.d, code, `${code} - ${inLegend.text}`)] })
        }
      }
    }
    // on the drawings, not in the BOQ
    const reported = new Set<string>()
    for (const [code, list] of Array.from(drawCodes.entries())) {
      if (boqMentions.has(code) || boqMentions.has(code.replace(/-T\d+$/, '')) || Array.from(boqMentions).some(b => b.startsWith(code + '-'))) continue
      reported.add(code)
      push({ code: 'drawing_code_not_in_boq', severity: 'warning', ar: `الرمز ${code} ظاهر في المخططات (${list.reduce((s, x) => s + x.count, 0)} مرة) ولا يوجد له بند في جدول الكميات: بند ناقص؟`, en: `Code ${code} is on the drawings (${list.reduce((s, x) => s + x.count, 0)}×) but has no BOQ item: missing item?`, sources: list.map(x => drawSrc(x.d, code, `${code} × ${x.count}`)) })
    }
    for (const [code, l] of Object.entries(legendAll)) {
      if (reported.has(code) || boqMentions.has(code) || Array.from(boqMentions).some(b => b.startsWith(code + '-'))) continue
      push({ code: 'legend_code_not_in_boq', severity: 'review', ar: `الرمز ${code} («${l.text}») في مفتاح المخطط ولا يوجد له بند في جدول الكميات`, en: `Legend code ${code} («${l.text}») has no BOQ item`, sources: [drawSrc(l.d, code, `${code} - ${l.text}`)] })
    }
  }

  // 4) room areas on the drawings vs m² finish quantities
  const ac = areaCheck(items, drawings)
  flags.push(...ac.flags)

  // 5) specification: every material should have a section
  const sc = specCheck(items, specs)
  flags.push(...sc.flags)
  const specLinks = sc.links

  const byItem: Record<string, TenderFlag[]> = {}
  for (const f of flags) if (f.item_key) (byItem[f.item_key] = byItem[f.item_key] || []).push(f)
  return { flags, byItem, codeLinks, specLinks, areaChecks: ac.rows }
}

/**
 * «مقارنة المساحات»: for every finish code tagged in rooms on the sheets, the BOQ m² quantity
 * (items carrying the code, else items whose wording contains every word of the legend text) vs the
 * sum of the areas of the distinct rooms tagged with it (a room on two sheets counts once).
 * Paint (PT) is on walls: only the rooms are listed. When a sheet's title says «1/4», «2/4»… and not
 * all parts of that level are uploaded, the numbers are shown as «partial», not compared.
 * A difference is never an error: it is «needs review» (room areas are net floor areas; a BOQ may
 * add upstands, coves, other levels or rooms on sheets not uploaded).
 */
export function areaCheck(items: TenderItem[], drawings: DrawingSummary[]): { rows: AreaCheckRow[]; flags: TenderFlag[] } {
  const rows: AreaCheckRow[] = []
  const flags: TenderFlag[] = []
  if (!drawings.some(d => (d.rooms || []).some(r => r.tags && Object.keys(r.tags).length))) return { rows, flags }
  const sheetOf = (d: DrawingSummary) => d.sheet_no || `${d.file} p${d.page}`
  // which parts of each level are uploaded
  const levels = new Map<string, { of: number; have: Set<number> }>()
  for (const d of drawings) {
    const p = sheetPartOf(d.title)
    if (!p) continue
    const l = levels.get(p.level) || { of: p.of, have: new Set<number>() }
    l.of = Math.max(l.of, p.of); l.have.add(p.n); levels.set(p.level, l)
  }
  // code → distinct rooms (by room code, else name + area) and the sheets they are on
  type Acc = { rooms: Map<string, AreaCheckRow['rooms'][number]>; sheets: Set<string>; drawings: Set<DrawingSummary>; unassigned: number; legend: string | null }
  const byCode = new Map<string, Acc>()
  const accOf = (code: string) => { let a = byCode.get(code); if (!a) { a = { rooms: new Map(), sheets: new Set(), drawings: new Set(), unassigned: 0, legend: null }; byCode.set(code, a) } return a }
  for (const d of drawings) {
    for (const r of d.rooms || []) for (const code of Object.keys(r.tags || {})) {
      if (!isFinishCode(code) || !r.area) continue
      const a = accOf(code)
      const k = r.code || `${r.name}|${r.area}`
      const room = a.rooms.get(k) || { code: r.code, name: r.name, area: r.area, sheets: [], low: false }
      if (!room.sheets.includes(sheetOf(d))) room.sheets.push(sheetOf(d))
      if ((r.low_tags || []).includes(code)) room.low = true
      a.rooms.set(k, room); a.sheets.add(sheetOf(d)); a.drawings.add(d)
    }
    for (const [code, n] of Object.entries(d.unassigned_finish || {})) { const a = accOf(code); a.unassigned += n; a.sheets.add(sheetOf(d)); a.drawings.add(d) }
  }
  for (const d of drawings) for (const [code, text] of Object.entries(d.legend || {})) { const a = byCode.get(code); if (a && !a.legend) a.legend = text }

  const m2 = items.filter(i => i.kind !== 'header' && i.unit === 'م²')
  for (const [code, a] of Array.from(byCode.entries()).sort((x, y) => x[0].localeCompare(y[0]))) {
    let basis: AreaCheckRow['basis'] = null
    let list = m2.filter(i => i.codes.some(c => c === code || c.replace(/-T\d+$/, '') === code))
    if (list.length) basis = 'code'
    else if (a.legend) {
      const lw = Array.from(new Set(normWords(a.legend)))
      if (lw.length >= 2) {
        list = m2.filter(i => { const bw = new Set(normWords(i.description)); return lw.every(w => bw.has(w)) })
        if (list.length) basis = 'legend'
      }
    }
    const paint = familyOf(code) === 'PT'
    if (!list.length && !paint) continue // only finishes that have an m² BOQ item
    const withQty = list.filter(i => i.qty != null)
    const boqQty = withQty.length ? withQty.reduce((s, i) => s + (i.qty || 0), 0) : null
    const rooms = Array.from(a.rooms.values()).sort((x, y) => y.area - x.area)
    const area = Math.round(rooms.reduce((s, r) => s + r.area, 0) * 1000) / 1000
    const partial: AreaCheckRow['partial'] = []
    for (const d of Array.from(a.drawings)) {
      const p = sheetPartOf(d.title)
      const l = p ? levels.get(p.level) : null
      if (p && l && l.have.size < l.of && !partial.some(x => x.level === p.level)) partial.push({ level: p.level, have: l.have.size, of: l.of })
    }
    const diff = boqQty ? Math.round(((area - boqQty) / boqQty) * 1000) / 10 : null
    const status: AreaCheckRow['status'] = paint ? 'walls' : !rooms.length ? 'no_rooms' : partial.length ? 'partial'
      : diff != null && Math.abs(diff) <= AREA_TOLERANCE_PCT ? 'ok' : 'review'
    const row: AreaCheckRow = { code, legend: a.legend, status, boq_qty: boqQty, boq_items: list.map(i => i.key), basis, drawing_area: area, diff_pct: diff, rooms, sheets: Array.from(a.sheets), unassigned: a.unassigned, partial }
    rows.push(row)

    // flags on the BOQ items (paint: none; ok: none)
    if (status === 'walls' || status === 'ok' || !list.length) continue
    const roomsTxt = rooms.slice(0, 8).map(r => `${r.code || r.name} ${fmt(r.area)}`).join('، ') + (rooms.length > 8 ? '…' : '')
    const roomsEn = rooms.slice(0, 8).map(r => `${r.code || r.name} ${fmt(r.area)}`).join(', ') + (rooms.length > 8 ? '…' : '')
    const lowN = rooms.filter(r => r.low).length
    const sheetsTxt = row.sheets.join('، ')
    const partTxt = partial.map(p => `${p.have} من ${p.of}`).join('، ')
    const wps = familyOf(code) === 'WPS'
    let ar: string, en: string
    if (status === 'partial') {
      ar = `مقارنة المساحات للرمز ${code}: جزئية، رُفعت ${partTxt} لوحات من هذا المستوى. في الجدول ${fmt(boqQty || 0)} م²، وفي اللوحات المرفوعة ${fmt(area)} م² (${roomsTxt}).`
      en = `Area check ${code}: partial, ${partial.map(p => `${p.have} of ${p.of}`).join(', ')} sheets of this level uploaded. BOQ ${fmt(boqQty || 0)} m², uploaded sheets ${fmt(area)} m² (${roomsEn}).`
    } else if (status === 'no_rooms') {
      ar = `الرمز ${code} ظاهر في المخططات (${sheetsTxt}) ولم يُنسب إلى غرفة بعينها: قارن المساحة يدوياً.`
      en = `Code ${code} is on the drawings (${row.sheets.join(', ')}) but no room could be assigned: compare the area by hand.`
    } else {
      ar = `مقارنة المساحات للرمز ${code}: في الجدول ${fmt(boqQty || 0)} م²${list.length > 1 ? ` (مجموع ${list.length} بنود)` : ''}، ومساحات الغرف الموسومة به ${fmt(area)} م² (${diff != null ? `${diff > 0 ? '+' : ''}${diff}%` : '—'}). الغرف: ${roomsTxt}. اللوحات: ${sheetsTxt}.${lowN ? ` نسبة ${lowN} من الغرف إلى الرمز غير مؤكدة.` : ''}${wps ? ' العزل المائي قد يشمل الجدران والقوائم فلا يساوي مساحة الأرضية.' : ''} يحتاج مراجعة، وليس بالضرورة خطأ.`
      en = `Area check ${code}: BOQ ${fmt(boqQty || 0)} m²${list.length > 1 ? ` (sum of ${list.length} items)` : ''}, tagged room areas ${fmt(area)} m² (${diff != null ? `${diff > 0 ? '+' : ''}${diff}%` : '—'}). Rooms: ${roomsEn}. Sheets: ${row.sheets.join(', ')}.${lowN ? ` ${lowN} room assignment(s) are low-confidence.` : ''}${wps ? ' Waterproofing may include walls and upstands, so it need not equal the floor area.' : ''} Needs review, not necessarily an error.`
    }
    const srcs: SourceRef[] = Array.from(a.drawings).map(d => drawSrc(d, code, `${code}: ${rooms.filter(r => r.sheets.includes(sheetOf(d))).map(r => `${r.code || r.name} ${fmt(r.area)} m²`).join(', ')}`))
    for (const it of list) flags.push({ code: 'area_check', severity: status === 'review' ? 'review' : 'info', item_key: it.key, ar, en, sources: [boqSrc(it), ...srcs] })
  }
  return { rows, flags }
}

/** Spec links + «no section» flags (separate so a page can run it once and the fast checks often). */
export function specCheck(items: TenderItem[], specs: { index: SpecIndex; pages: PdfPageText[] }[]): { links: CheckResult['specLinks']; flags: TenderFlag[] } {
  const links: CheckResult['specLinks'] = {}
  const flags: TenderFlag[] = []
  const usable = specs.filter(s => s.index.sections.length || s.index.codes)
  if (!usable.length) return { links, flags }
  for (const it of items) {
    if (it.kind !== 'material') continue
    const hits = specHitsFor(it, usable)
    links[it.key] = hits.slice(0, 2).map(h => ({ id: h.section.id, title: h.section.title, page: h.quotes[0]?.page || h.section.page_from, quote: h.quotes[0]?.text || '', file: h.file }))
    if (!hits.length) flags.push({ code: 'no_spec', severity: 'review', item_key: it.key, ar: 'لم يُعثر على قسم في المواصفات لهذا البند', en: 'No specification section found for this item', sources: [boqSrc(it)] })
  }
  return { links, flags }
}

export const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, review: 2, info: 3 }
/** An item may go to suppliers without a second look when nothing above «info» is flagged. */
export const isFlagFree = (list: TenderFlag[] | undefined) => !(list || []).some(f => f.severity !== 'info')
