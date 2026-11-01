// Unit normalisation shared by the order-text parser, the BOQ reader and the AI post-processing.
// One table, Arabic / English / Urdu spellings (and BOQ abbreviations) → the app's order units.
// Deterministic and free: the AI is never needed to read «م3», «cum», «LM», «nos» or «شوال».
import { normalizeText } from '@/lib/normalize'
import { toLatinDigits } from '@/lib/phone'

/** 'order' = the request page's units (a piece is «حبة»); 'boq' = BOQ wording (a piece is «عدد»). */
export type UnitFlavor = 'order' | 'boq'

// canonical → spellings. Matching is on the whole (normalised) cell / word, never a substring.
const TABLE: [string, string[]][] = [
  ['م³', ['م3', 'م٣', 'م³', 'متر مكعب', 'امتار مكعبه', 'متر مكعب واحد', 'مكعب', 'm3', 'm³', 'cum', 'cu m', 'cu.m', 'cu.m.', 'cbm', 'cubic meter', 'cubic metre', 'cubic meters', 'cubic metres']],
  ['م²', ['م2', 'م٢', 'م²', 'متر مربع', 'امتار مربعه', 'مربع', 'm2', 'm²', 'sqm', 'sq m', 'sq.m', 'sq.m.', 'square meter', 'square metre', 'square meters', 'square metres']],
  ['م.ط', ['م.ط', 'م ط', 'مط', 'م.طولي', 'متر طولي', 'امتار طوليه', 'طولي', 'lm', 'l.m', 'l.m.', 'lin m', 'lin.m', 'lin. m', 'rm', 'r.m', 'r.m.', 'rmt', 'running meter', 'running metre', 'linear meter', 'linear metre']],
  ['متر', ['متر', 'امتار', 'مترات', 'م', 'm', 'meter', 'metre', 'meters', 'metres', 'mtr', 'mtrs', 'میٹر']],
  ['طن', ['طن', 'اطنان', 'طنان', 'ton', 'tons', 'tonne', 'tonnes', 'mt', 't', 'ٹن']],
  ['كغ', ['كغ', 'كجم', 'كلغ', 'كيلو', 'كيلوغرام', 'كيلوجرام', 'kg', 'kgs', 'kilo', 'kilogram', 'kilograms', 'کلو']],
  ['كيس', ['كيس', 'اكياس', 'شوال', 'شوالات', 'شكاره', 'شيكاره', 'كيسه', 'bag', 'bags', 'sack', 'sacks', 'بوری', 'بوریاں']],
  ['حبة', ['حبه', 'حبات', 'عدد', 'قطعه', 'قطع', 'وحده', 'نمره', 'pc', 'pcs', 'piece', 'pieces', 'no', 'no.', 'nos', 'nos.', 'nr', 'nr.', 'number', 'each', 'ea', 'unit', 'units', 'item', 'items', 'عدد واحد', 'دانه', 'پیس']],
  ['لفة', ['لفه', 'لفات', 'رول', 'رولات', 'لفافه', 'roll', 'rolls', 'coil', 'coils', 'رولز']],
  ['كرتون', ['كرتون', 'كراتين', 'كرتونه', 'carton', 'cartons', 'ctn', 'box', 'boxes', 'کارٹن']],
  ['علبة', ['علبه', 'علب', 'باكيت', 'pack', 'packs', 'packet', 'packets', 'pkt']],
  ['سطل', ['سطل', 'سطول', 'جردل', 'pail', 'pails', 'bucket', 'buckets', 'بالٹی']],
  ['لوح', ['لوح', 'الواح', 'لوحه خشب', 'sheet', 'sheets', 'board', 'boards', 'panel', 'panels', 'شیٹ']],
  ['جالون', ['جالون', 'جالونات', 'غالون', 'gallon', 'gallons', 'gal', 'گیلن']],
  ['لتر', ['لتر', 'لترات', 'ليتر', 'l', 'lt', 'ltr', 'ltrs', 'liter', 'litre', 'liters', 'litres', 'لیٹر']],
  ['طقم', ['طقم', 'اطقم', 'set', 'sets', 'kit', 'kits', 'سیٹ']],
  ['نقلة', ['نقله', 'نقلات', 'رد', 'trip', 'trips', 'load', 'loads', 'truckload', 'truck load']],
  ['يوم', ['يوم', 'ايام', 'day', 'days', 'دن']],
  ['ساعة', ['ساعه', 'ساعات', 'hour', 'hours', 'hr', 'hrs', 'گھنٹہ']],
  ['شهر', ['شهر', 'اشهر', 'شهور', 'month', 'months', 'mon']],
  ['طبلية', ['طبليه', 'طبليات', 'بالته', 'pallet', 'pallets', 'پیلیٹ']],
  ['ألف حبة', ['الف حبه', 'بالالف', 'بالالف حبه', '1000 pcs', 'thousand', 'per 1000']],
  ['مقطوعية', ['مقطوعيه', 'مقطوع', 'اجمالي', 'ls', 'l.s', 'l.s.', 'lump sum', 'lumpsum', 'lot', 'job', 'یکمشت']],
  ['سيخ', ['سيخ', 'اسياخ', 'bar', 'bars', 'سریا']],
]

const key = (s: string) => normalizeText(toLatinDigits(s)).replace(/[()[\]{}]/g, ' ').replace(/\s+/g, ' ').replace(/\.$/, '').trim()

const LOOKUP = new Map<string, string>()
for (const [canon, words] of TABLE) {
  for (const w of [canon, ...words]) {
    const k = key(w)
    if (k && !LOOKUP.has(k)) LOOKUP.set(k, canon)
  }
}

/** A unit cell or word → the canonical unit, or null when it is not a unit we know. */
export function normalizeUnit(raw: string | null | undefined, flavor: UnitFlavor = 'order'): string | null {
  if (raw == null) return null
  const k = key(String(raw))
  if (!k) return null
  let u = LOOKUP.get(k) || LOOKUP.get(k.replace(/\./g, '')) || LOOKUP.get(k.replace(/s$/, '')) || null
  // «كيس 50 كجم», «م³ (متر مكعب)»: a known unit followed by a qualifier
  if (!u) {
    const first = k.split(' ')[0]
    u = LOOKUP.get(first) || null
    if (u === 'متر' && k !== first) u = LOOKUP.get(k.split(' ').slice(0, 2).join(' ')) || u
  }
  if (!u) return null
  if (flavor === 'boq' && u === 'حبة') return 'عدد'
  return u
}

/** The unit words the order-text parser looks for (longest first, so «متر مكعب» wins over «متر»). */
export function unitWordList(): { word: string; canon: string }[] {
  return Array.from(LOOKUP.entries())
    .filter(([w]) => w.length >= 2 || /[a-z]/.test(w) === false) // single latin letters only inside BOQ unit cells
    .map(([word, canon]) => ({ word, canon }))
    .sort((a, b) => b.word.length - a.word.length)
}

/** Units that describe a size, not an amount ordered («12 مم», «20 سم», «2 بوصة»). */
export const SIZE_UNIT_RE = /^(?:مم|ملم|ملي|مللي|ملیمیٹر|سم|سانتي|سنتي|انش|انج|بوصه|بوصة|إنش|"|mm|cm|in|inch|inches|mm2|mm²|مم2|مم²|kva|kv|kw|w|واط|وات|كيلوواط|امبير|أمبير|a|amp|amps|bar|بار|hp|حصان|btu|psi|v|فولت|ميجا|mpa|نيوتن|درجه|ton\s*ac)$/i
