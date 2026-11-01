// Map what a buyer wrote / a photo label showed («12 ملم», «C30», «مقاوم», «سابك») onto the
// product's own spec fields (PRODUCT_SPECS: diameter, grade, strength, size, brand…), so the
// request line opens with those fields already chosen. Deterministic and conservative: a field is
// filled only when exactly one of its options is clearly named; otherwise it is left for the buyer.
// Callers on the server must `await loadCatalogSpecs()` first.
import { getProductSpecs, type SpecField } from '@/types'
import { normalizeText } from '@/lib/normalize'
import { normalizeDigits } from '@/lib/ai/numbers'

// unit spellings folded to one form so «12 ملم» meets the option «12 مم»
const UNIT_FOLD: [RegExp, string][] = [
  [/^(?:ملم|ملي|مللي|مم|mm|ملیمیٹر)$/, 'مم'],
  [/^(?:سم|سنتي|سانتي|cm)$/, 'سم'],
  [/^(?:متر|م|m|meter|metre)$/, 'م'],
  [/^(?:انش|انج|بوصه|"|in|inch)$/, 'انش'],
  [/^(?:كجم|كغ|كيلو|kg)$/, 'كغ'],
  [/^(?:طن|ton)$/, 'طن'],
  [/^(?:واط|وات|w)$/, 'واط'],
  [/^(?:امبير|a|amp)$/, 'امبير'],
  [/^(?:لتر|l|ltr)$/, 'لتر'],
]
const foldUnit = (u: string) => { const n = normalizeText(u); for (const [re, v] of UNIT_FOLD) if (re.test(n)) return v; return n }

const STOP = new Set(['اي', 'علامه', 'معتمده', 'حسب', 'الطلب', 'اختياري', 'بدون', 'نوع', 'مع', 'او', 'من', 'في', 'على', 'غير', 'محدد', 'عادي', 'other', 'any', 'per', 'with', 'the', 'and', 'or', 'for', 'type'])
const SKIP_OPTION = /حسب|غير محدد|^اي |^أي |≥|≤|>|<|سأرفق|بحاجة/

const tokensOf = (s: string) => normalizeText(normalizeDigits(s)).replace(/[()[\]{}،,؛;:+/\\«»"'|]/g, ' ').split(/\s+/)
  .map(w => w.replace(/^(?:وال|بال|ال)(?=.{3,})/, '')).filter(w => w.length >= 2)
const codesOf = (s: string) => (normalizeDigits(s).match(/\b[A-Za-z]{1,6}[\s-]?\d+[A-Za-z0-9]*\b|\b[A-Z]{2,6}\b/g) || []).map(c => c.replace(/[\s-]/g, '').toUpperCase())
type Num = { v: number; u: string }
function numsOf(s: string): Num[] {
  const out: Num[] = []
  const t = normalizeDigits(s)
  const re = /(\d+(?:\.\d+)?)\s*(ملم|مم|ملي|مللي|سم|سنتي|سانتي|متر|م(?![؀-ۿ])|انش|انج|بوصه|بوصة|"|كجم|كغ|كيلو|طن|واط|وات|امبير|أمبير|لتر|mm|cm|m(?![a-z])|in(?:ch)?|kg|w(?![a-z])|a(?![a-z])|l(?![a-z]))?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) out.push({ v: Number(m[1]), u: m[2] ? foldUnit(m[2]) : '' })
  return out
}
const dimsOf = (s: string) => (normalizeDigits(s).match(/\d+(?:\.\d+)?\s*[x×*]\s*\d+(?:\.\d+)?(?:\s*[x×*]\s*\d+(?:\.\d+)?)?/gi) || []).map(d => d.replace(/\s/g, '').replace(/[×*]/g, 'x').toLowerCase())

const PRIMARY = ['diameter', 'size', 'thickness', 'strength', 'section', 'cross_section', 'capacity', 'power', 'rating', 'grade', 'class', 'type']

/**
 * Spec values found in `text` for this catalog product: { fieldKey: optionText }. Never the 'unit'
 * field (the line's unit is separate). Empty when the product has no spec fields.
 */
export function mapSpecsToFields(productName: string, text: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  const t = String(text || '').trim()
  if (!t) return out
  const fields = getProductSpecs(productName).filter(f => f.key !== 'unit')
  if (!fields.length) return out
  const nameToks = new Set(tokensOf(productName))
  const tToks = new Set(tokensOf(t))
  const tCodes = new Set(codesOf(t))
  const tNums = numsOf(t)
  const tDims = new Set(dimsOf(t))
  const usedBare = new Set<number>()
  // fields in a stable order: primary dimensions first, so a bare «12» goes to the diameter
  const ordered = [...fields].sort((a, b) => rank(a) - rank(b))
  for (const f of ordered) {
    const scored = f.options.filter(o => !SKIP_OPTION.test(o)).map(o => ({ o, s: scoreOption(f, o) }))
    scored.sort((a, b) => b.s - a.s)
    const best = scored[0]
    if (!best || best.s < 1.5) continue
    if (scored[1] && scored[1].s === best.s) continue // two options equally named: leave it to the buyer
    out[f.key] = best.o
    for (const n of numsOf(best.o)) if (!n.u) usedBare.add(n.v)
  }
  return out

  function rank(f: SpecField) { const i = PRIMARY.findIndex(k => f.key.includes(k)); return i < 0 ? 99 : i }

  function scoreOption(f: SpecField, o: string): number {
    let s = 0
    // codes: «C30» = «C-30», «SRC», «B500B», «PN16»
    const oc = codesOf(o)
    if (oc.some(c => tCodes.has(c))) s += 3
    // full dimensions «20×20×40»
    const od = dimsOf(o)
    if (od.some(d => tDims.has(d))) s += 4
    // a number with its unit («12 مم»), or a bare number for the first numeric field
    const on = numsOf(o)
    if (on.length === 1 || (on.length > 1 && od.length)) {
      const n = on[0]
      const withUnit = tNums.some(x => x.v === n.v && x.u && x.u === n.u)
      const bare = tNums.some(x => x.v === n.v && !x.u) && !usedBare.has(n.v)
      if (withUnit) s += 3
      else if (bare && rank(f) < 99) {
        // a bare number only for a primary field, and only when no sibling option shares it as first number
        const sameFirst = f.options.filter(x => numsOf(x)[0]?.v === n.v).length
        if (sameFirst === 1) s += 1.5
      }
    }
    // a distinctive word of this option (not shared by the other options, not the product's own name)
    const others = new Set(f.options.filter(x => x !== o).flatMap(tokensOf))
    const own = tokensOf(o).filter(w => w.length >= 3 && !STOP.has(w) && !others.has(w) && !nameToks.has(w) && !/^\d/.test(w))
    if (own.some(w => tToks.has(w))) s += 2
    return s
  }
}
