// Cross-checks of a tender: BOQ ↔ drawings ↔ specification. Every flag names its sources
// (BOQ sheet/row, drawing sheet/page, spec section/page) so the company can verify it in seconds.
// Severity: error = must be fixed before sending; warning = likely wrong; review = needs a human
// look (e.g. a tag count, since a tag can be printed twice or sit on a sheet not uploaded); info.
import type { TenderItem, DrawingSummary, SpecIndex, SpecHit, PdfPageText, TenderFlag, SourceRef } from './types'
import { findSpec } from './specIndex'
import { familyOf } from './drawingText'

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
}

/** Spec sections for an item: its named section («23 21 13») first, then its code, then its words. */
export function specHitsFor(it: TenderItem, specs: { index: SpecIndex; pages: PdfPageText[] }[]): (SpecHit & { file: string })[] {
  const run = (q: string, n: number, min = 0) => specs.flatMap(s => findSpec(s.index, s.pages, q, n).filter(h => h.score >= min).map(h => ({ ...h, file: s.index.file })))
  let hits = it.spec_refs.flatMap(r => run(r, 1))
  if (!hits.length) hits = it.codes.flatMap(c => run(c, 2))
  if (!hits.length) hits = run(`${it.item_text} ${it.lead_in || ''}`.slice(0, 200), 2, 12)
  return hits.sort((a, b) => b.score - a.score)
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

  // 4) specification: every material should have a section
  const sc = specCheck(items, specs)
  flags.push(...sc.flags)
  const specLinks = sc.links

  const byItem: Record<string, TenderFlag[]> = {}
  for (const f of flags) if (f.item_key) (byItem[f.item_key] = byItem[f.item_key] || []).push(f)
  return { flags, byItem, codeLinks, specLinks }
}

/** Spec links + «no section» flags (separate so a page can run it once and the fast checks often). */
export function specCheck(items: TenderItem[], specs: { index: SpecIndex; pages: PdfPageText[] }[]): { links: CheckResult['specLinks']; flags: TenderFlag[] } {
  const links: CheckResult['specLinks'] = {}
  const flags: TenderFlag[] = []
  const usable = specs.filter(s => s.index.sections.length)
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
