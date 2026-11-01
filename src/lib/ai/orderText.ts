// Rule-based reading of an order written the way people write it on WhatsApp:
//   «كيس اسمنت ٥٠ عدد» · «طن حديد ١٢ ملم» · «بلك ٢٠ ٥٠٠ حبة» · «10 اكياس اسمنت و 2 طن حديد»
//   «كيسين جبس» · «طن ونص حديد 16» · «5 الاف بلك» · «20 m3 readymix C30»
// Runs before any AI (free, instant). Lines it reads with confidence never reach the AI; the rest
// go to the AI with these numbers as the only numbers it may use (grounding check in the route).
import { normalizeDigits, wordsToDigits, DUAL_UNITS, parseQuantity } from '@/lib/ai/numbers'
import { normalizeUnit, unitWordList, SIZE_UNIT_RE } from '@/lib/ai/units'
import { normalizeText } from '@/lib/normalize'

export type PreLine = {
  raw: string
  name: string
  quantity: number | null
  unit: string | null
  details: string | null
  range: [number, number] | null
  /** quantity read from a written number (false = implied by a bare unit, «طن حديد» = 1 ton) */
  qtyExplicit: boolean
  /** every number in the line: the AI may not return a quantity outside this list */
  numbers: number[]
}

const FILLER_START = /^(?:(?:بدي|بدنا|ابغى|أبغى|ابغي|ابي|أبي|نبي|نبغى|نبغي|اريد|أريد|نريد|محتاج|محتاجين|نحتاج|احتاج|أحتاج|عايز|عاوز|مطلوب|المطلوب|لو سمحت|الرجاء|من فضلك|يا ريت|ياريت|i need|we need|need|please|pls|send|want)\s+)+/i
const FILLER_END = /\s+(?:لو سمحت|من فضلك|please|pls|فقط|بس|تقريبا|تقريباً|حوالي)$/i
const FILLER_ANY = /(?:^|\s)(?:حوالي|تقريبا|تقريباً|approx\.?|about|نحو)(?=\s|$)/gi

// Nouns whose bare number is a SIZE, not an amount («بلك 20» = 20 cm block, «حديد 12» = Ø12).
const SIZE_NOUNS: [RegExp, number[]][] = [
  [/^(?:بلك|بلوك|بلكه|بلوكه|طوب|طابوق|block|blocks)$/, [10, 15, 20, 25, 30]],
  [/^(?:حديد|سيخ|اسياخ|تسليح|rebar|steel)$/, [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32]],
  [/^(?:سلك|اسلاك|كيبل|كابل|كيابل|واير|cable|wire)$/, [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300]],
  [/^(?:ماسوره|مواسير|بايب|انبوب|انابيب|بوري|pipe|pipes|كوع|تي|محبس)$/, [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 160, 200, 250, 315]],
  [/^(?:مكيف|مكيفات|سبليت|سبلت|ac)$/, [1, 1.5, 2, 2.5, 3, 4, 5, 18000, 24000, 30000, 36000]],
  [/^(?:سخان|سخانات|heater)$/, [30, 40, 50, 60, 80, 100, 120]],
  [/^(?:خزان|خزانات|tank)$/, [300, 500, 1000, 1500, 2000, 3000, 4000, 5000, 10000]],
  [/^(?:لوح|الواح|بليوود|ابلكاش|plywood|جبس|جبسن)$/, [3, 4, 6, 9, 12, 12.5, 15, 18, 25]],
  [/^(?:بلاط|سيراميك|بورسلان|tiles?)$/, [20, 30, 40, 45, 60, 80, 90, 120]],
  [/^(?:مسمار|مسامير|برغي|براغي)$/, [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20]],
  [/^(?:قاطع|بريكر|breaker)$/, [6, 10, 16, 20, 25, 32, 40, 50, 63, 100, 125, 160, 200, 250, 400]],
  [/^(?:لمبه|لمبات|كشاف|سبوت|ليد|led)$/, [5, 7, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 50, 100, 150, 200]],
]
const fold = (w: string) => normalizeText(w).replace(/^(?:وال|بال|ال)(?=.{3,})/, '')

const UNIT_WORDS = unitWordList().filter(u => u.word.length >= 2 || /[؀-ۿ]/.test(u.word))
const ORDER_UNIT_CANON = new Set(['كيس', 'طن', 'م³', 'م²', 'م.ط', 'متر', 'حبة', 'لفة', 'كرتون', 'علبة', 'سطل', 'لوح', 'جالون', 'لتر', 'كغ', 'طقم', 'نقلة', 'يوم', 'ساعة', 'شهر', 'طبلية', 'ألف حبة', 'سيخ', 'مقطوعية'])
// a unit word at the very start without a number means ONE of it: «طن حديد», «كيس اسمنت»
const CONTAINER_UNITS = new Set(['كيس', 'طن', 'لفة', 'كرتون', 'سطل', 'لوح', 'جالون', 'طقم', 'نقلة', 'طبلية', 'علبة'])

/** Split a pasted / dictated list into lines. */
export function splitOrderLines(text: string): string[] {
  // «20 ألف» = 20000 (read before the number words, where «ألف» alone is 1000)
  let t = normalizeDigits(text || '').replace(/(\d+(?:\.\d+)?)\s*(?:الاف|آلاف|ألاف|الف|ألف|k)(?=\s|$)/gi, (_m, n) => String(Math.round(parseFloat(n) * 1000)))
  t = wordsToDigits(t)
  let parts = t.split(/\n|،|؛|;|\s\+\s|\s-\s(?=\D)|•|\|/).flatMap(s => s.split(/,(?!\d)/))
  // «10 اكياس اسمنت و 2 طن حديد» / «... and 5 bags ...»: «و» or «and» before a number starts a new item
  parts = parts.flatMap(s => s.split(/\s+(?:و|and|&)\s*(?=\d)/i))
  parts = parts.map(s => s.trim()).filter(Boolean)
  // a numbered list («1- …», «2) …») — drop the numbering only when it really counts 1, 2, 3…
  const idx = parts.map(s => s.match(/^(\d{1,2})\s*[-).:]\s*/))
  if (parts.length >= 2 && idx.every((m, i) => m && Number(m[1]) === i + 1)) parts = parts.map((s, i) => s.slice(idx[i]![0].length))
  return parts.slice(0, 60)
}

function splitGlued(s: string): string {
  return s
    // «10كيس» → «10 كيس» (a number glued to a word), but «م3», «m2», «C30», «PN16» stay glued
    .replace(/(\d)([؀-ۿ])/g, '$1 $2')
    .replace(/([؀-ۿ]{2,})(\d)/g, '$1 $2')
    .replace(/(\d)\s*(kg|kgs|ton|tons|pcs|bags?|rolls?|m3|m2|lm|mm|cm)\b/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

const DIM_RE = /\d+(?:\.\d+)?\s*[x×*]\s*\d+(?:\.\d+)?(?:\s*[x×*]\s*\d+(?:\.\d+)?)?(?:\s*(?:سم|مم|ملم|م|cm|mm|m)(?=\s|$))?/gi
const STD_RE = /\b(?:SASO|SSA|ASTM|BS\s?EN|BS|EN|ISO|DIN|IEC|NFPA|UL|SBC|AASHTO|ACI)\s?[A-Z]?\s?\d+[A-Z0-9.\-/]*/gi
const CODE_RE = /\b(?:[A-Za-z]{1,5}-?\d+[A-Za-z0-9/.-]*|[A-Z]{2,6})\b/g

/** Read one line. */
export function preParseLine(line: string): PreLine {
  const raw = line.trim()
  let s = splitGlued(raw).replace(FILLER_START, '').replace(FILLER_END, '').replace(FILLER_ANY, ' ').replace(/\s+/g, ' ').trim()
  const numbers = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number)
  const details: string[] = []
  let quantity: number | null = null
  let unit: string | null = null
  let qtyExplicit = false
  let range: [number, number] | null = null

  // 1) sizes written as dimensions, standards and codes are specifications
  s = s.replace(DIM_RE, m => { details.push(m.trim()); return ' ' })
  s = s.replace(STD_RE, m => { details.push(m.trim()); return ' ' })

  // 2) a range «10-12 كيس»
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:-|–|الى|إلى|to)\s*(\d+(?:\.\d+)?)(?=\s|$)/i, (m) => {
    const q = parseQuantity(m)
    if (q.range) { range = q.range; return ` ${q.range[1]} ` }
    return m
  })

  let toks = s.split(' ').filter(Boolean)

  // 3) the Arabic dual «كيسين», «طنين» = 2 of the unit
  toks = toks.flatMap(t => {
    const u = DUAL_UNITS[normalizeText(t).replace(/ه$/, 'ه')] || DUAL_UNITS[t]
    return u ? ['2', u] : [t]
  })

  // unit at position i (one or two words, e.g. «متر مكعب»): returns [canon, words used]
  const unitAt = (i: number): [string, number] | null => {
    for (const len of [3, 2, 1]) {
      if (i + len > toks.length) continue
      const phrase = normalizeText(toks.slice(i, i + len).join(' '))
      const hit = UNIT_WORDS.find(u => u.word === phrase)
      if (hit && ORDER_UNIT_CANON.has(hit.canon)) return [hit.canon, len]
    }
    return null
  }
  const isNum = (t: string | undefined) => !!t && /^\d+(?:\.\d+)?$/.test(t)
  const used = new Array(toks.length).fill(false)

  // an air-conditioner's «2 طن» is its capacity, not 2 tons ordered
  const firstWord = fold(toks.find(t => !isNum(t)) || '')
  if (/^(?:مكيف|مكيفات|سبليت|سبلت|شباك|ac|split)$/.test(firstWord)) {
    for (let i = 0; i < toks.length - 1; i++) if (isNum(toks[i]) && /^(?:طن|ton|btu|وحده)$/i.test(normalizeText(toks[i + 1]))) { details.push(`${toks[i]} ${toks[i + 1]}`); used[i] = used[i + 1] = true }
  }
  // 4) a number followed by a SIZE unit («12 ملم», «2.5 مم», «100 واط») is a spec
  for (let i = 0; i < toks.length - 1; i++) {
    if (isNum(toks[i]) && SIZE_UNIT_RE.test(normalizeText(toks[i + 1]))) { details.push(`${toks[i]} ${toks[i + 1]}`); used[i] = used[i + 1] = true }
  }
  // 5) «N unit» or «unit N» (the first pair wins), «عدد N»
  for (let i = 0; i < toks.length && quantity == null; i++) {
    if (used[i] || !isNum(toks[i])) continue
    const after = unitAt(i + 1)
    if (after && !used[i + 1]) {
      // «كيس اسمنت 50 عدد»: a container named at the start + «N عدد/حبة» = N of that container
      const lead = unitAt(0)
      if ((after[0] === 'حبة') && lead && lead[0] !== 'حبة' && CONTAINER_UNITS.has(lead[0]) && i > 0) {
        quantity = Number(toks[i]); unit = lead[0]; qtyExplicit = true
        used[i] = true; for (let k = 0; k < after[1]; k++) used[i + 1 + k] = true
        for (let k = 0; k < lead[1]; k++) used[k] = true
        break
      }
      quantity = Number(toks[i]); unit = after[0]; qtyExplicit = true
      used[i] = true; for (let k = 0; k < after[1]; k++) used[i + 1 + k] = true
    }
  }
  if (quantity == null) {
    // «عدد 5», «كمية 5», «qty 5»
    for (let i = 0; i < toks.length - 1; i++) {
      if (!used[i] && /^(?:عدد|كميه|الكميه|qty|quantity)$/i.test(normalizeText(toks[i])) && isNum(toks[i + 1]) && !used[i + 1]) {
        quantity = Number(toks[i + 1]); qtyExplicit = true; used[i] = used[i + 1] = true
        if (!unit) unit = 'حبة'
        break
      }
    }
  }
  // 6) a bare unit word at the start: «طن حديد 12» = 1 ton (implied), «كيس اسمنت» = 1 bag
  if (!unit) {
    const lead = unitAt(0)
    if (lead && CONTAINER_UNITS.has(lead[0])) { unit = lead[0]; for (let k = 0; k < lead[1]; k++) used[k] = true }
  }
  // the noun the line is about (first unused word) decides whether a bare number is a size
  const headIdx = toks.findIndex((t, i) => !used[i] && !isNum(t))
  const head = headIdx >= 0 ? fold(toks[headIdx]) : ''
  const sizes = SIZE_NOUNS.find(([re]) => re.test(head))?.[1] || null
  // 7) bare numbers left over
  const bare = toks.map((t, i) => (!used[i] && isNum(t) ? i : -1)).filter(i => i >= 0)
  for (const i of bare) {
    const v = Number(toks[i])
    const afterHead = headIdx >= 0 && i > headIdx
    if (sizes && afterHead && sizes.includes(v) && (quantity != null || bare.length > 1 || i === headIdx + 1)) {
      details.push(toks[i]); used[i] = true
    }
  }
  const left = toks.map((t, i) => (!used[i] && isNum(t) ? i : -1)).filter(i => i >= 0)
  if (quantity == null && left.length) {
    // a number at the start, else the last one («اسمنت 10»)
    const i = left[0] === 0 ? 0 : left[left.length - 1]
    quantity = Number(toks[i]); qtyExplicit = true; used[i] = true
  }
  for (const i of toks.map((t, i) => (!used[i] && isNum(t) ? i : -1)).filter(i => i >= 0)) { details.push(toks[i]); used[i] = true }
  if (quantity == null && unit && CONTAINER_UNITS.has(unit)) quantity = 1 // «طن حديد»

  // 8) codes left in the name (C30, SRC, PN16) are specs too
  let name = toks.filter((_, i) => !used[i]).join(' ')
  name = name.replace(CODE_RE, m => {
    if (/^(?:PVC|UPVC|CPVC|PPR|HDPE|LED|MDF|AAC|EPS|GRP|GRC|SBS|APP|AC|DB|UPS)$/i.test(m)) return m // part of the name
    details.push(m); return ' '
  })
  name = name.replace(/^(?:من|of)\s+/i, '').replace(/[()«»"'\-–:]+/g, ' ').replace(/\s+/g, ' ').trim()
  const det = Array.from(new Set(details.map(d => d.trim()).filter(Boolean))).join('، ')
  return { raw, name, quantity: quantity != null && quantity > 0 ? quantity : null, unit: unit ? normalizeUnit(unit, 'order') || unit : null, details: det || null, range, qtyExplicit, numbers }
}

export function preParseOrder(text: string): PreLine[] {
  return splitOrderLines(text).map(preParseLine).filter(l => l.name || l.quantity != null)
}
