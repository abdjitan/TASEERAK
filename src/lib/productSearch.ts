// Smart product search for the RFQ picker (and anywhere a material is chosen).
//
// What it handles, all on the client, in a few ms over the whole catalog:
//   - partial typing:   "بل"      -> بلوك، بلاط، بلاستيك…   (prefix match on every word)
//   - spelling variants: hamza/ta-marbuta/alef-maqsura via normalizeText, "ال" prefix dropped
//   - typos:            "بلوط" / "اسمنط" / "cemnt" -> closest items (edit distance, prefix-aware)
//   - trade synonyms:   بلك = بلوك = طوب، سيخ = حديد تسليح، فيش = بريزة، شيول = لودر…
//   - English / Urdu names and sub-category names + keywords
// Every query word must match something (AND); if nothing matches, it retries with any word (OR)
// so the user still sees the closest items instead of an empty list.
import { SECTOR_PRODUCTS, SUB_CATEGORIES, detectSubCategory, getProductLabel, type Sector } from '@/types'
import { normalizeText } from '@/lib/normalize'

// Each line is one group of words people use for the same thing (Saudi trade + common typos).
// Extend freely: a product that contains ANY member of a group is findable by ALL members.
export const SEARCH_SYNONYMS: string[][] = [
  ['بلوك', 'بلك', 'بلوكه', 'بلكه', 'طوب', 'طابوق', 'block'],
  ['اسمنت', 'سمنت', 'اسمنط', 'cement'],
  ['خرسانه', 'خرسانة', 'كونكريت', 'صبه', 'ريدي مكس', 'جاهزه', 'concrete', 'readymix'],
  ['حديد', 'سيخ', 'اسياخ', 'تسليح', 'rebar', 'steel'],
  ['رمل', 'رمله', 'sand'],
  ['بحص', 'حصى', 'حصمه', 'زلط', 'كسارة', 'aggregate', 'gravel'],
  ['بلاط', 'سيراميك', 'بورسلان', 'بورسلين', 'tiles', 'ceramic', 'porcelain'],
  ['رخام', 'جرانيت', 'marble', 'granite'],
  ['دهان', 'بويه', 'صبغ', 'طلاء', 'paint'],
  ['جبس', 'جبسوم', 'جبس بورد', 'gypsum'],
  ['خشب', 'ابلكاش', 'بليوود', 'بلاي وود', 'كونتر', 'plywood', 'wood'],
  ['عزل', 'عازل', 'insulation', 'waterproofing'],
  ['ماسوره', 'مواسير', 'بايب', 'انبوب', 'انابيب', 'pipe'],
  ['بي بي ار', 'ppr'],
  ['يو بي في سي', 'upvc', 'pvc'],
  ['كيبل', 'كابل', 'كيابل', 'سلك', 'اسلاك', 'cable', 'wire'],
  ['فيش', 'افياش', 'بريزه', 'مقبس', 'socket'],
  ['مفتاح', 'سويتش', 'switch'],
  ['لمبه', 'ليد', 'كشاف', 'اضاءه', 'انارة', 'led', 'light', 'lamp'],
  ['قاطع', 'بريكر', 'breaker', 'mcb'],
  ['لوحه كهرباء', 'طبلون', 'distribution board', 'db'],
  ['مكيف', 'تكييف', 'سبليت', 'سبلت', 'اسبلت', 'ac', 'split'],
  ['سخان', 'heater'],
  ['خزان', 'تانكي', 'tank'],
  ['مضخه', 'طرمبه', 'دينمو', 'pump'],
  ['خلاط', 'حنفيه', 'محبس', 'mixer', 'faucet', 'tap'],
  ['مغسله', 'حوض', 'basin', 'sink'],
  ['كرسي حمام', 'مرحاض', 'تواليت', 'toilet', 'wc'],
  ['حفار', 'حفاره', 'بوكلين', 'excavator'],
  ['شيول', 'لودر', 'loader'],
  ['بوبكات', 'بوب كات', 'bobcat'],
  ['كرين', 'ونش', 'رافعه', 'crane'],
  ['قلاب', 'دينه', 'شاحنه', 'truck', 'dump'],
  ['وايت', 'صهريج', 'تانكر', 'tanker'],
  ['مولد', 'ماطور', 'جنريتر', 'generator'],
  ['كمبروسر', 'ضاغط', 'compressor'],
  ['سقاله', 'سقالات', 'scaffold'],
  ['قده', 'طوبار', 'شده', 'formwork'],
  ['مسمار', 'مسامير', 'nail'],
  ['برغي', 'براغي', 'قلاووظ', 'screw', 'bolt'],
  ['سيليكون', 'سلكون', 'silicone'],
  ['فوم', 'رغوه', 'foam'],
  ['شريط', 'تيب', 'لاصق', 'tape'],
  ['قفل', 'كالون', 'lock'],
  ['مفصله', 'مفاصل', 'hinge'],
  ['خوذه', 'هيلمت', 'helmet'],
  ['قفاز', 'قفازات', 'جوانتي', 'gloves'],
  ['حذاء سلامه', 'سيفتي شوز', 'safety shoes'],
  ['سلم', 'سلالم', 'ladder'],
  ['عربيه', 'عربانه', 'ونش يدوي', 'wheelbarrow'],
  ['اسفلت', 'زفت', 'asphalt'],
  ['انترلوك', 'interlock'],
  ['بردوره', 'كربستون', 'kerb', 'curb'],
  ['منهول', 'غرفه تفتيش', 'manhole'],
]

const AR_ARTICLE = /^(وال|بال|فال|كال|لل|ال)(?=.{3,})/

function norm(s: string): string {
  return normalizeText(s).replace(/[()\[\]{}\/\\|,،؛;:.+_*"'«»\-–—]/g, ' ').replace(/\s+/g, ' ').trim()
}
function tokens(s: string): string[] {
  const out: string[] = []
  for (const t of norm(s).split(' ')) {
    if (!t) continue
    out.push(t)
    const bare = t.replace(AR_ARTICLE, '')
    if (bare !== t) out.push(bare)
  }
  return out
}

// Restricted Damerau-Levenshtein with an early exit once the distance exceeds `max`.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev2: number[] = new Array(b.length + 1).fill(0)
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur.push(v)
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j]
    prev = cur
  }
  return prev[b.length]
}

type Field = { toks: string[]; weight: number }
type Doc = { name: string; sector: Sector; sub: string | null; nameNorm: string; fields: Field[] }

let INDEX: Doc[] | null = null
let SYN_NORM: string[][] | null = null

function synonymGroups(): string[][] {
  if (!SYN_NORM) SYN_NORM = SEARCH_SYNONYMS.map(g => g.map(norm))
  return SYN_NORM
}

// Whole-word matching only: "سلك" (wire) must not tag "سلكون" (silicone), "ac" must not tag "access".
function expandSynonyms(text: string): string[] {
  const words = new Set(tokens(text))
  const hay = ' ' + Array.from(words).join(' ') + ' '
  const extra: string[] = []
  for (const g of synonymGroups()) {
    if (g.some(w => (w.includes(' ') ? hay.includes(' ' + w + ' ') : words.has(w)))) extra.push(...g.flatMap(tokens))
  }
  return extra
}

function buildIndex(): Doc[] {
  const docs: Doc[] = []
  for (const sector of Object.keys(SECTOR_PRODUCTS) as Sector[]) {
    for (const name of SECTOR_PRODUCTS[sector]) {
      const sub = detectSubCategory(name, sector)
      const sc: any = sub ? (SUB_CATEGORIES as any)[sector]?.[sub] : null
      const en = getProductLabel(name, 'en')
      const ur = getProductLabel(name, 'ur')
      docs.push({
        name, sector, sub,
        nameNorm: norm(name),
        fields: [
          { toks: tokens(name), weight: 1.6 },
          { toks: tokens(en === name ? '' : en), weight: 1.3 },
          { toks: tokens(ur === name ? '' : ur), weight: 1.0 },
          { toks: expandSynonyms(name + ' ' + en), weight: 1.0 },
          { toks: sc ? tokens([sc.ar, sc.en, ...(sc.keywords || [])].join(' ')) : [], weight: 0.7 },
        ],
      })
    }
  }
  return docs
}

/** Call after the DB taxonomy hydrates or the catalog changes so the index is rebuilt. */
export function resetProductSearchIndex() { INDEX = null }

function tokenScore(q: string, t: string): number {
  if (t === q) return 10
  if (t.startsWith(q)) return q.length >= 2 ? 8 : 6
  if (q.length >= 3 && t.includes(q)) return 5
  if (q.length >= 3 && q[0] === t[0]) { // typos rarely hit the first letter; keeps fuzzy noise down
    const max = q.length <= 5 ? 1 : 2
    // compare against the whole word and against its prefix of similar length (user still typing)
    const d = Math.min(editDistance(q, t, max), editDistance(q, t.slice(0, q.length), max), editDistance(q, t.slice(0, q.length + 1), max))
    if (d <= max) return d === 1 ? 4 : 2.5
  }
  return 0
}

export type ProductHit = { name: string; sector: Sector; sub: string | null; score: number }

export function searchProducts(query: string, opts: { sector?: Sector | ''; limit?: number; extra?: { name: string; sector: Sector }[] } = {}): ProductHit[] {
  const qToks = tokens(query).filter((t, i, a) => a.indexOf(t) === i)
  if (!qToks.length) return []
  if (!INDEX) INDEX = buildIndex()
  let docs = INDEX
  if (opts.extra?.length) {
    docs = docs.concat(opts.extra.map(e => ({ name: e.name, sector: e.sector, sub: null, nameNorm: norm(e.name), fields: [{ toks: tokens(e.name), weight: 1.6 }, { toks: expandSynonyms(e.name), weight: 1 }] })))
  }
  if (opts.sector) docs = docs.filter(d => d.sector === opts.sector)
  const qNorm = norm(query)

  // Score each query word against each distinct catalog word once (the vocabulary repeats a lot).
  const memo = qToks.map(() => new Map<string, number>())
  const scoreOf = (qi: number, t: string) => {
    const m = memo[qi]
    let v = m.get(t)
    if (v === undefined) { v = tokenScore(qToks[qi], t); m.set(t, v) }
    return v
  }

  const run = (requireAll: boolean): ProductHit[] => {
    const hits: ProductHit[] = []
    for (const d of docs) {
      let total = 0, matched = 0
      for (let qi = 0; qi < qToks.length; qi++) {
        let best = 0
        for (const f of d.fields) for (const t of f.toks) {
          const s = scoreOf(qi, t) * f.weight
          if (s > best) best = s
        }
        if (best > 0) { total += best; matched++ } else if (requireAll) { total = -1; break }
      }
      if (total <= 0 || matched === 0) continue
      if (d.nameNorm.startsWith(qNorm)) total += 6
      else if (d.nameNorm.includes(qNorm)) total += 3
      total -= d.name.length / 200 // shorter (more generic) names first on ties
      hits.push({ name: d.name, sector: d.sector, sub: d.sub, score: total })
    }
    return hits.sort((a, b) => b.score - a.score)
  }

  let hits = run(true)
  if (!hits.length && qToks.length > 1) hits = run(false)
  const seen = new Set<string>()
  return hits.filter(h => (seen.has(h.sector + '|' + h.name) ? false : (seen.add(h.sector + '|' + h.name), true))).slice(0, opts.limit ?? 40)
}
