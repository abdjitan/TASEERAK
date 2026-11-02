// tender_items rows ↔ TenderItem, and an approved row → a line of the project request draft
// (the existing project → request path in /contractor/project/new sends it).
import type { TenderItem, TenderFlag } from './types'
import type { Routed } from './classify'

export function itemToRow(tenderId: string, it: TenderItem, routed: Routed | null, flags: TenderFlag[], links: any): Record<string, any> {
  return {
    tender_id: tenderId, item_key: it.key, ref: it.ref, sheet: it.sheet, trade: it.trade, section: it.section, series: it.series,
    row_no: it.row, lead_in: it.lead_in, item_text: it.item_text, description: it.description,
    unit: it.unit, unit_raw: it.unit_raw, qty: it.qty, rate: it.rate, amount: it.amount,
    codes: it.codes, refs: it.refs, spec_refs: it.spec_refs, kind: it.kind, kind_reason: it.kind_reason || null, lump_sum: it.lump_sum,
    etimad_code: it.etimad_code, etimad_label: it.etimad_label,
    sector: routed?.sector || null, sub_category: routed?.sub_category || null, product_name: routed?.product_name || null,
    flags: slimFlags(flags), links: links || {},
  }
}

/** Flags as stored (sources keep refs, quotes shortened). */
export function slimFlags(flags: TenderFlag[]): any[] {
  return flags.map(f => ({ code: f.code, severity: f.severity, ar: f.ar, en: f.en, sources: f.sources.map(s => ({ ...s, quote: s.quote ? s.quote.slice(0, 160) : undefined })) }))
}

/** A stored row back to the reader's shape (with the company's edits applied) for the checks. */
export function rowToItem(r: any): TenderItem {
  return {
    key: r.item_key, ref: r.ref, sheet: r.sheet || '', trade: r.trade, section: r.section, series: r.series, row: r.row_no || 0,
    lead_in: r.lead_in, item_text: r.item_text || '', description: r.description || '',
    unit: r.unit, unit_raw: r.unit_raw, qty: r.qty == null ? null : Number(r.qty), rate: r.rate == null ? null : Number(r.rate), amount: r.amount == null ? null : Number(r.amount),
    codes: r.codes || [], refs: r.refs || [], spec_refs: r.spec_refs || [],
    etimad_code: r.etimad_code, etimad_label: r.etimad_label,
    kind: r.kind, kind_reason: r.kind_reason || '', lump_sum: !!r.lump_sum,
    // reader flags that the company's edits have resolved are dropped
    flags: readerFlags(r),
  }
}

function readerFlags(r: any): string[] {
  const out: string[] = []
  const qty = r.qty == null ? null : Number(r.qty)
  if ((qty == null || qty <= 0) && !r.lump_sum) out.push('qty_missing')
  if (!r.unit) out.push('unit_missing')
  const stored: string[] = (Array.isArray(r.flags) ? r.flags : []).map((f: any) => f.code)
  if (stored.includes('arithmetic') && !r.edited?.qty) out.push('qty_rate_amount_mismatch')
  if (stored.includes('qty_approx') && !r.edited?.qty) out.push('qty_approximate')
  if (stored.includes('tbc') && !r.edited?.specification) out.push('tbc')
  return out
}

/** What a supplier reads: the BOQ words, the codes, the spec section and the drawing references. */
export function composeSpecification(r: any): string {
  const parts: string[] = []
  const own = (r.specification || '').trim()
  parts.push(own || (r.description || '').trim())
  if ((r.codes || []).length) parts.push(`الرمز: ${(r.codes || []).join('، ')}`)
  const spec = (r.links?.spec || [])[0]
  if (spec) parts.push(`المواصفات: القسم ${spec.id}${spec.title ? ` (${spec.title})` : ''} ص${spec.page}${spec.quote ? `: «${String(spec.quote).slice(0, 160)}»` : ''}`)
  const dr = (r.links?.drawings || []) as any[]
  if (dr.length) parts.push(`المخططات: ${dr.slice(0, 3).map((d: any) => `${d.sheet || d.file} (${d.count})`).join('، ')}`)
  if (r.ref || r.sheet) parts.push(`مرجع جدول الكميات: ${[r.sheet, r.ref, r.row_no ? `صف ${r.row_no}` : ''].filter(Boolean).join(' / ')}`)
  return parts.filter(Boolean).join(' — ').slice(0, 900)
}

/** One approved material row → one line of the project draft (same shape the project page uses). */
export function draftItemFromRow(r: any, i: number): Record<string, any> {
  const qty = r.qty == null ? (r.lump_sum ? 1 : '') : Number(r.qty)
  return {
    id: `tender-${i}`,
    product_name: (r.product_name || r.item_text || '').slice(0, 120),
    sector: r.sector || 'civil',
    quantity: qty === '' ? '' : String(qty),
    unit: r.lump_sum ? 'مقطوعية' : (r.unit || 'عدد'),
    specification: composeSpecification(r),
    specs: r.specs || {},
    sub_category: r.sub_category || null,
    needs_classification: !r.sub_category,
    selected: true,
    done: Number(qty) > 0 && !!r.sub_category,
    custom: !r.links?.catalog,
    description: r.description,
    ref: (r.codes || [])[0] || r.ref || '',
    tender_item_id: r.id,
  }
}
