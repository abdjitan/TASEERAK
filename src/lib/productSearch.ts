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
  // How people actually write it: Saudi/Gulf, Levantine, Egyptian and Iraqi words, plus English.
  // The FIRST word of a group is the catalog's own word: products whose name holds it rank first
  // when the buyer's words name the group (see searchProducts). Whole-word matching only.
  // ── building & structure
  ['بلوك', 'بلك', 'بلوكه', 'بلكه', 'طوب', 'طابوق', 'طابوقه', 'block', 'brick'],
  ['اسمنت', 'سمنت', 'اسمنط', 'شمنتو', 'cement'],
  ['خرسانه', 'خرسانة', 'كونكريت', 'صبه', 'باطون', 'بيتون', 'ريدي مكس', 'جاهزه', 'concrete', 'readymix'],
  ['حديد', 'سيخ', 'اسياخ', 'تسليح', 'حديد مبروم', 'rebar', 'steel'],
  ['رمل', 'رمله', 'بطحاء', 'بطحا', 'sand'],
  ['حصى', 'بحص', 'حصمه', 'زلط', 'نيس', 'كسارة', 'aggregate', 'gravel'],
  ['لياسه', 'محاره', 'بياض', 'تلبيس', 'plaster'],
  ['قده', 'طوبار', 'شده', 'شدات', 'formwork'],
  // ── finishing
  ['بلاط', 'سيراميك', 'بورسلان', 'بورسلين', 'كاشي', 'قيشاني', 'بلاطه', 'سيراميك ارضيات', 'بلاط ارضيات', 'بلاط حمام', 'tiles', 'tile', 'ceramic', 'porcelain'],
  ['رخام', 'جرانيت', 'رخامه', 'marble', 'granite'],
  ['باركيه', 'ارضيات خشب', 'خشب ارضيات', 'بركيه', 'parquet', 'laminate'],
  ['سجاد', 'موكيت', 'زوليه', 'سجاده', 'بساط', 'carpet', 'rug'],
  ['دهان', 'بويه', 'صبغ', 'صباغ', 'طلاء', 'paint'],
  ['جبس', 'جبص', 'جبسن', 'جبسوم', 'جبس بورد', 'gypsum'],
  ['ورق جدران', 'ورق حائط', 'ورق جدار', 'wallpaper'],
  ['معجون جدران', 'بتي', 'معجون', 'putty'],
  ['نوافذ', 'نافذه', 'شباك', 'شبابيك', 'دريشه', 'دريشات', 'شيش', 'window', 'windows'],
  ['باب', 'ابواب', 'بيبان', 'door', 'doors'],
  ['زجاج', 'قزاز', 'ازاز', 'glass'],
  ['مرايه', 'مرآه', 'مرايا', 'mirror'],
  ['خشب', 'ابلكاش', 'بليوود', 'بلاي وود', 'كونتر', 'لوح خشب', 'plywood', 'wood'],
  ['واجهات', 'واجهه', 'كلادينج', 'كلادنج', 'cladding', 'facade'],
  // ── furniture & decor (custom-made)
  ['طاوله', 'طاولات', 'ترابيزه', 'طرابيزه', 'طربيزه', 'ميز', 'سفره', 'table'],
  ['كنب', 'كنبه', 'كنبات', 'كنبايه', 'قنفه', 'صوفا', 'اريكه', 'كرويته', 'sofa', 'couch'],
  ['دولاب', 'خزانه ملابس', 'خزانه', 'دواليب', 'كبت', 'كبتات', 'وردروب', 'wardrobe', 'closet'],
  ['سرير', 'سراير', 'اسره', 'تخت', 'bed'],
  ['كراسي', 'كرسي طعام', 'كرسي مكتب', 'chairs'],
  ['مكتبه', 'رفوف', 'ارفف', 'رف', 'bookcase', 'shelves'],
  ['ستائر', 'ستاره', 'ستاير', 'برادي', 'برداية', 'بردايه', 'بلاك اوت', 'blinds', 'curtain', 'curtains'],
  ['خزائن مطبخ', 'مطبخ', 'مطابخ', 'كبتات مطبخ', 'kitchen'],
  // ── lighting
  ['لمبه', 'لمبات', 'ليد', 'كشاف', 'اضاءه', 'اضائه', 'اناره', 'انارة', 'ضو', 'ضوء', 'اضويه', 'نور', 'انوار', 'لايت', 'ليت', 'سبوت', 'led', 'light', 'lights', 'lamp'],
  ['ثريا', 'ثريات', 'نجفه', 'نجف', 'تريا', 'تريات', 'شاندلير', 'chandelier'],
  ['اباجوره', 'ابجوره', 'اباجورات', 'table lamp'],
  ['ابليك', 'ابليكات', 'اناره جداريه', 'wall light', 'sconce'],
  ['معلقه', 'اناره معلقه', 'لمبه معلقه', 'pendant'],
  // ── electrical
  ['كيبل', 'كابل', 'كيابل', 'سلك', 'اسلاك', 'واير', 'وايرات', 'cable', 'wire'],
  ['فيش', 'افياش', 'فيشه', 'بريزه', 'بريز', 'مقبس', 'socket', 'plug'],
  ['مفتاح', 'سويتش', 'مفتاح نور', 'switch'],
  ['قاطع', 'بريكر', 'فيوز', 'breaker', 'mcb'],
  ['لوحه كهرباء', 'لوحه توزيع', 'طبلون', 'distribution board', 'db'],
  ['انتركم', 'جرس باب', 'جرس', 'intercom', 'doorbell'],
  ['كاميرا', 'كاميرات', 'كاميرات مراقبه', 'مراقبه', 'cctv', 'camera'],
  // ── AC & ventilation
  ['مكيف', 'مكيفات', 'تكييف', 'سبليت', 'سبلت', 'اسبلت', 'كندشن', 'كوندشن', 'كونديشن', 'ac', 'split'],
  ['مروحه', 'مراوح', 'هوايه', 'fan'],
  ['مراوح استخلاص', 'شفاط', 'شفاطات', 'مروحه شفط', 'exhaust'],
  // ── plumbing & water
  ['ماسوره', 'مواسير', 'بايب', 'بوري', 'انبوب', 'انابيب', 'pipe'],
  ['بي بي ار', 'ppr'],
  ['يو بي في سي', 'upvc', 'pvc'],
  ['سخان', 'سخانات', 'كيزر', 'heater', 'geyser'],
  ['خزان', 'تانكي', 'تنك', 'تانك', 'tank'],
  ['مضخه', 'طرمبه', 'دينمو', 'ماطور ماء', 'ماطور ماي', 'مكينه ماء', 'pump'],
  ['خلاط', 'حنفيه', 'حنفيات', 'بزبوز', 'صنبور', 'محبس', 'mixer', 'faucet', 'tap'],
  ['مغسله', 'مغاسل', 'حوض', 'basin'],
  ['حوض مطبخ', 'مجلى', 'مجلي', 'مغسله مطبخ', 'sink'],
  ['دش', 'دوش', 'شاور', 'shower'],
  ['مرحاض', 'كرسي حمام', 'كرسي افرنجي', 'كرسي عربي', 'تواليت', 'toilet', 'wc'],
  ['حوض استحمام', 'بانيو', 'bathtub'],
  ['غطاسه', 'مضخه غاطسه', 'مضخه نزح', 'submersible'],
  // ── insulation & chemicals
  ['عزل', 'عازل', 'بيتومين', 'insulation', 'waterproofing'],
  ['سيليكون', 'سلكون', 'silicone'],
  ['فوم', 'رغوه', 'foam'],
  ['شريط', 'تيب', 'لاصق', 'tape'],
  // ── tools, hardware & safety
  ['دريل', 'شنيور', 'دريله', 'drill'],
  ['صاروخ', 'جلاخه', 'grinder'],
  ['مسمار', 'مسامير', 'بسمار', 'nail'],
  ['برغي', 'براغي', 'قلاووظ', 'صامولة', 'صواميل', 'screw', 'bolt'],
  ['قفل', 'كالون', 'طبله', 'lock'],
  ['مقبض', 'مسكه', 'اوكره', 'يد باب', 'handle'],
  ['مفصله', 'مفاصل', 'مفصلات', 'hinge'],
  ['خوذه', 'هيلمت', 'helmet'],
  ['قفاز', 'قفازات', 'جوانتي', 'gloves'],
  ['حذاء سلامه', 'سيفتي شوز', 'safety shoes'],
  ['سلم', 'سلالم', 'ladder'],
  ['سقاله', 'سقالات', 'scaffold'],
  ['عربانه', 'عربيه', 'عربيه يد', 'عربه يد', 'ونش يدوي', 'wheelbarrow'],
  // ── equipment
  ['حفار', 'حفاره', 'بوكلين', 'excavator'],
  ['شيول', 'لودر', 'loader'],
  ['بوبكات', 'بوب كات', 'bobcat'],
  ['كرين', 'ونش', 'رافعه', 'crane'],
  ['قلاب', 'دينه', 'شاحنه', 'truck', 'dump'],
  ['وايت', 'صهريج', 'تانكر', 'tanker'],
  ['مولد', 'ماطور', 'جنريتر', 'generator'],
  ['كمبروسر', 'ضاغط', 'compressor'],
  // ── outdoor
  ['انترلوك', 'بلاط رصف', 'بلوك رصف', 'interlock'],
  ['اسفلت', 'زفت', 'asphalt'],
  ['بردوره', 'كربستون', 'kerb', 'curb'],
  ['منهول', 'غرفه تفتيش', 'manhole'],
  ['مظله', 'مظلات', 'shade'],
  ['سياج', 'سور', 'شبك', 'سواتر', 'ساتر', 'fence'],
  ['عشب', 'نجيل', 'grass', 'turf'],
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
type Doc = { name: string; sector: Sector; sub: string | null; nameNorm: string; fields: Field[]; groups?: number[] }

let INDEX: Doc[] | null = null
let SYN_NORM: string[][] | null = null

function synonymGroups(): string[][] {
  if (!SYN_NORM) SYN_NORM = SEARCH_SYNONYMS.map(g => g.map(norm))
  return SYN_NORM
}

// Whole-word matching only: "سلك" (wire) must not tag "سلكون" (silicone), "ac" must not tag "access".
function synonymGroupsOf(text: string): number[] {
  const words = new Set(tokens(text))
  const hay = ' ' + Array.from(words).join(' ') + ' '
  const out: number[] = []
  synonymGroups().forEach((g, i) => {
    if (g.some(w => (w.includes(' ') ? hay.includes(' ' + w + ' ') : words.has(w)))) out.push(i)
  })
  return out
}
function expandSynonyms(text: string): string[] {
  const groups = synonymGroups()
  return synonymGroupsOf(text).flatMap(i => groups[i].flatMap(tokens))
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
        groups: synonymGroupsOf(name + ' ' + en),
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

// ── Learned words (migration 142) ───────────────────────────────────────────────────────────
// Words the platform learned: seeded from this dictionary, then from what people search and the
// product they choose (search_events → learned_synonyms, approved after 3 different people).
// Loaded once from get_learned_synonyms() by TaxonomyProvider and cached on the device.
let LEARNED: Map<string, { name: string; sector: Sector }[]> = new Map()
export function setLearnedSynonyms(rows: { term_norm: string; product_name: string; sector: string }[]) {
  const m = new Map<string, { name: string; sector: Sector }[]>()
  for (const r of rows || []) {
    if (!r?.term_norm || !r?.product_name) continue
    const k = norm(r.term_norm)
    const list = m.get(k) || []
    if (!list.some(x => x.name === r.product_name)) list.push({ name: r.product_name, sector: (r.sector || 'supply_store') as Sector })
    m.set(k, list)
  }
  LEARNED = m
}
/** The normalized form the learning tables use (same as the search's own matching). */
export function normQuery(s: string): string { return norm(s) }

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
  // The buyer's words name a synonym group ("كرسي افرنجي" → toilets, "طبلون" → distribution
  // boards): products of that group rank above ones that merely share a literal word.
  const qGroups = synonymGroupsOf(query)

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
      // only the thing itself (its name holds the group's first word, e.g. "مرحاض"), not its parts
      // ("سيفون كرسي" shares the group through "WC" but is not a toilet)
      if (qGroups.some(g => d.groups?.includes(g) && d.nameNorm.includes(synonymGroups()[g][0]))) total += 12
      total -= d.name.length / 200 // shorter (more generic) names first on ties
      hits.push({ name: d.name, sector: d.sector, sub: d.sub, score: total })
    }
    return hits.sort((a, b) => b.score - a.score)
  }

  let hits = run(true)
  if (!hits.length && qToks.length > 1) hits = run(false)

  // Learned words: the whole query or one of its words was searched before and people chose these
  // products, so they go first (and appear even when no catalog word matched at all).
  if (LEARNED.size) {
    // The whole phrase the buyer wrote ("ثيل صناعي") outweighs one of its words ("ثيل").
    const learned = [...(LEARNED.get(qNorm) || []).map(l => ({ ...l, w: 10 })), ...qToks.flatMap(t => LEARNED.get(t) || []).map(l => ({ ...l, w: 0 }))]
    for (const l of learned) {
      if (opts.sector && l.sector !== opts.sector) continue
      const h = hits.find(x => x.name === l.name)
      if (h) h.score += 14 + l.w
      else hits.push({ name: l.name, sector: l.sector, sub: null, score: 30 + l.w - l.name.length / 200 })
    }
    hits.sort((a, b) => b.score - a.score)
  }
  const seen = new Set<string>()
  return hits.filter(h => (seen.has(h.sector + '|' + h.name) ? false : (seen.add(h.sector + '|' + h.name), true))).slice(0, opts.limit ?? 40)
}
