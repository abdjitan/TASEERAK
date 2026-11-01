// Numbers as people write them in an order: Arabic-Indic / Urdu digits, «٫» and «,» decimals,
// «١٬٢٥٠» thousands, number words («عشرين»، «مية»، «نص»), «ونص» (+½), «ربع», ranges («10-12»),
// and the Arabic dual («كيسين» = 2 bags). Deterministic: these are read before any AI sees the text.
import { toLatinDigits } from '@/lib/phone'

/** Latin digits, «٫» → «.», «٬» thousands removed, «1,250» → «1250», «2,5» → «2.5». */
export function normalizeDigits(s: string): string {
  return toLatinDigits(s || '')
    .replace(/٬/g, '')
    .replace(/(\d)٫(\d)/g, '$1.$2')
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2') // thousands separator
    .replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2') // European decimal comma («2,5»)
    .replace(/[  ]/g, ' ')
}

// whole-word number words (normalised spelling: no hamza, ة → ه)
const WORDS: Record<string, number> = {
  'واحد': 1, 'واحده': 1, 'وحده': 1, 'ايك': 1, 'one': 1,
  'اثنين': 2, 'اثنان': 2, 'اتنين': 2, 'ثنتين': 2, 'تنين': 2, 'دو': 2, 'two': 2,
  'ثلاث': 3, 'ثلاثه': 3, 'تلات': 3, 'تلاته': 3, 'three': 3,
  'اربع': 4, 'اربعه': 4, 'four': 4,
  'خمس': 5, 'خمسه': 5, 'five': 5,
  'ست': 6, 'سته': 6, 'six': 6,
  'سبع': 7, 'سبعه': 7, 'seven': 7,
  'ثمان': 8, 'ثمانيه': 8, 'تمن': 8, 'تمانيه': 8, 'eight': 8,
  'تسع': 9, 'تسعه': 9, 'nine': 9,
  'عشر': 10, 'عشره': 10, 'ten': 10,
  'عشرين': 20, 'عشرون': 20, 'twenty': 20,
  'ثلاثين': 30, 'تلاتين': 30, 'اربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تمانين': 80, 'تسعين': 90,
  'ميه': 100, 'مئه': 100, 'مية': 100, 'مائه': 100, 'hundred': 100,
  'ميتين': 200, 'مئتين': 200, 'متين': 200,
  'الف': 1000, 'thousand': 1000, 'الفين': 2000,
  'نص': 0.5, 'نصف': 0.5, 'half': 0.5, 'ربع': 0.25,
}
// Arabic dual: «كيسين» = 2 × كيس. Maps the dual form to its singular unit word.
export const DUAL_UNITS: Record<string, string> = {
  'كيسين': 'كيس', 'طنين': 'طن', 'لفتين': 'لفة', 'لفين': 'لفة', 'حبتين': 'حبة', 'نقلتين': 'نقلة', 'لوحين': 'لوح',
  'سطلين': 'سطل', 'كرتونين': 'كرتون', 'جالونين': 'جالون', 'يومين': 'يوم', 'ساعتين': 'ساعة', 'شهرين': 'شهر',
  'مترين': 'متر', 'طقمين': 'طقم', 'شوالين': 'كيس', 'رولين': 'لفة', 'طبليتين': 'طبلية',
}

const fold = (w: string) => w.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^ال(?=.{3,})/, '')

/** The value of a number word («عشرين» → 20, «نص» → 0.5), or null. */
export function wordNumber(w: string): number | null {
  const v = WORDS[fold(w.toLowerCase())]
  return v === undefined ? null : v
}

/** Replace number words with digits («عشرين كيس» → «20 كيس», «طن ونص» → «1.5 طن»). */
export function wordsToDigits(s: string): string {
  let out = s
  // «X ونص» / «X و نص» → X.5 ; «طن ونص» (no number) → 1.5 طن
  out = out.replace(/(\d+(?:\.\d+)?)\s*(\S*?)\s*و\s?(?:نص|نصف)(?=\s|$|[،,])/g, (_m, n, mid) => `${parseFloat(n) + 0.5} ${mid}`.trim())
  out = out.replace(/(^|[\s،,])([^\s\d،,]{2,})\s+و\s?(?:نص|نصف)(?=\s|$|[،,])/g, (_m, pre, unit) => `${pre}1.5 ${unit}`)
  out = out.replace(/(\d+(?:\.\d+)?)\s*(?:و\s?ربع)(?=\s|$|[،,])/g, (_m, n) => `${parseFloat(n) + 0.25}`)
  // «عشرين و خمس» style compounds → 25
  out = out.replace(/(^|\s)(\S+)\s+و\s?(\S+)(?=\s|$)/g, (m, pre, a, b) => {
    const x = wordNumber(b), y = wordNumber(a)
    // «خمسة وعشرين» = 25 (unit first, then tens)
    if (x != null && y != null && x >= 20 && x % 10 === 0 && y < 10) return `${pre}${x + y}`
    return m
  })
  return out.split(/(\s+)/).map(tok => {
    const v = /^\s+$/.test(tok) ? null : wordNumber(tok)
    return v != null ? String(v) : tok
  }).join('')
}

/** A quantity cell («1,250.5», «10-12», «12 طن», «٥٠») → number (a range gives its upper bound). */
export function parseQuantity(raw: unknown): { value: number | null; range: [number, number] | null } {
  if (raw == null || raw === '') return { value: null, range: null }
  if (typeof raw === 'number') return { value: isFinite(raw) ? raw : null, range: null }
  let s = toLatinDigits(String(raw)).replace(/٬/g, '').replace(/٫/g, '.').trim()
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.') // «1.234,5»
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.') // «2,5»
  s = s.replace(/,/g, '')
  const r = s.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|الى|إلى|to|~)\s*(\d+(?:\.\d+)?)/i)
  if (r) {
    const a = parseFloat(r[1]), b = parseFloat(r[2])
    if (b > a) return { value: b, range: [a, b] }
  }
  const m = s.match(/-?\d+(?:\.\d+)?/)
  const n = m ? parseFloat(m[0]) : NaN
  return { value: isNaN(n) ? null : n, range: null }
}

/** Every number written in a text (after digit normalisation), for grounding checks. */
export function numbersIn(s: string): number[] {
  return (wordsToDigits(normalizeDigits(s)).match(/\d+(?:\.\d+)?/g) || []).map(Number)
}
