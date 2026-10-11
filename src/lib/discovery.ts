// Supplier discovery engine (docs/SUPPLIER_DISCOVERY_BRIEF.md): discovery zones, search
// keywords per supplier pack, auto-classification (pack + sector + relevance), phone
// normalisation for dedup, and address → city / district parsing.
// Shared by the admin page and the /api/discover-suppliers routes.
import { normalizeText } from '@/lib/normalize'
import { toLatinDigits } from '@/lib/phone'
import { SUPPLIER_PACKS } from '@/lib/supplierPacks'
import { CITIES_BY_REGION } from '@/types'

// ── Zones ───────────────────────────────────────────────────────────────────
// Each zone is searched as "<keyword> في <zone> <city>" with a location bias circle around
// its centre, so Google's 60-results-per-query cap applies per zone, not per city.
export type DiscoveryZone = { name: string; lat: number; lng: number; radiusKm: number; priority?: boolean }

export const DISCOVERY_CITIES: Record<string, {
  region: string
  bbox: { s: number; w: number; n: number; e: number }
  zones: DiscoveryZone[]
  /** Cities whose shops count for this discovery area (default: the key itself). */
  cities?: string[]
  /** Place word appended to search text (default: the key). */
  queryCity?: string
}> = {
  'الرياض': {
    region: 'الرياض',
    bbox: { s: 24.35, w: 46.40, n: 25.05, e: 47.10 },
    zones: [
      // High-density trade areas first (brief §2).
      { name: 'البطحاء', lat: 24.637, lng: 46.716, radiusKm: 2.5, priority: true },
      { name: 'السلي', lat: 24.660, lng: 46.840, radiusKm: 4, priority: true },
      { name: 'المدينة الصناعية الأولى', lat: 24.598, lng: 46.758, radiusKm: 3, priority: true },
      { name: 'المدينة الصناعية الثانية', lat: 24.545, lng: 46.865, radiusKm: 4, priority: true },
      { name: 'المدينة الصناعية الثالثة', lat: 24.470, lng: 46.900, radiusKm: 5, priority: true },
      { name: 'الدائري الجنوبي', lat: 24.598, lng: 46.720, radiusKm: 4, priority: true },
      { name: 'طريق الخرج', lat: 24.570, lng: 46.810, radiusKm: 4, priority: true },
      { name: 'العزيزية', lat: 24.585, lng: 46.770, radiusKm: 3, priority: true },
      { name: 'الشفا', lat: 24.555, lng: 46.700, radiusKm: 3, priority: true },
      { name: 'النسيم', lat: 24.735, lng: 46.830, radiusKm: 3, priority: true },
      { name: 'المصانع', lat: 24.590, lng: 46.700, radiusKm: 2.5, priority: true },
      { name: 'الحائر', lat: 24.390, lng: 46.830, radiusKm: 6, priority: true },
      { name: 'منفوحة واليمامة', lat: 24.605, lng: 46.735, radiusKm: 2, priority: true },
      { name: 'المنصورة', lat: 24.600, lng: 46.752, radiusKm: 1.8, priority: true },
      { name: 'الديرة والمرقب', lat: 24.635, lng: 46.712, radiusKm: 1.8, priority: true },
      { name: 'الفيصلية', lat: 24.600, lng: 46.680, radiusKm: 2.5, priority: true },
      { name: 'الدار البيضاء الصناعية', lat: 24.545, lng: 46.790, radiusKm: 3, priority: true },
      // Rest of the city.
      { name: 'الدار البيضاء', lat: 24.560, lng: 46.770, radiusKm: 3 },
      { name: 'الملز', lat: 24.670, lng: 46.735, radiusKm: 2.5 },
      { name: 'الربوة', lat: 24.690, lng: 46.770, radiusKm: 2.5 },
      { name: 'الروضة', lat: 24.735, lng: 46.770, radiusKm: 2.5 },
      { name: 'الريان', lat: 24.700, lng: 46.795, radiusKm: 2.5 },
      { name: 'النهضة', lat: 24.760, lng: 46.810, radiusKm: 2.5 },
      { name: 'الخليج', lat: 24.775, lng: 46.835, radiusKm: 2.5 },
      { name: 'النظيم', lat: 24.745, lng: 46.880, radiusKm: 3 },
      { name: 'الرمال', lat: 24.845, lng: 46.860, radiusKm: 4 },
      { name: 'اشبيلية', lat: 24.795, lng: 46.800, radiusKm: 2.5 },
      { name: 'العليا', lat: 24.700, lng: 46.680, radiusKm: 3 },
      { name: 'السويدي', lat: 24.590, lng: 46.665, radiusKm: 3 },
      { name: 'العريجاء', lat: 24.620, lng: 46.640, radiusKm: 3 },
      { name: 'ظهرة لبن', lat: 24.640, lng: 46.560, radiusKm: 3.5 },
      { name: 'نمار', lat: 24.565, lng: 46.650, radiusKm: 3 },
      { name: 'الملقا', lat: 24.810, lng: 46.610, radiusKm: 3 },
      { name: 'النرجس', lat: 24.860, lng: 46.660, radiusKm: 3.5 },
    ],
  },
  'جدة': {
    region: 'مكة المكرمة',
    bbox: { s: 21.20, w: 39.05, n: 21.95, e: 39.40 },
    zones: [
      { name: 'المنطقة الصناعية', lat: 21.415, lng: 39.225, radiusKm: 4, priority: true },
      { name: 'البغدادية والكندرة', lat: 21.490, lng: 39.190, radiusKm: 2, priority: true },
      { name: 'طريق مكة القديم', lat: 21.470, lng: 39.215, radiusKm: 3, priority: true },
      { name: 'الصفا والمروة', lat: 21.580, lng: 39.215, radiusKm: 3, priority: true },
      { name: 'الحرازات', lat: 21.520, lng: 39.300, radiusKm: 4, priority: true },
      { name: 'السامر والأجواد', lat: 21.590, lng: 39.250, radiusKm: 3, priority: true },
      { name: 'الخمرة', lat: 21.340, lng: 39.200, radiusKm: 4, priority: true },
      { name: 'الحمراء والروضة', lat: 21.540, lng: 39.160, radiusKm: 3 },
      { name: 'الفيصلية والنزهة', lat: 21.600, lng: 39.165, radiusKm: 3 },
      { name: 'أبحر', lat: 21.750, lng: 39.130, radiusKm: 5 },
    ],
  },
  'الدمام والخبر': {
    region: 'المنطقة الشرقية',
    bbox: { s: 26.15, w: 49.90, n: 26.60, e: 50.25 },
    cities: ['الدمام', 'الخبر', 'الظهران'],
    queryCity: 'الدمام',
    zones: [
      { name: 'الصناعية الأولى بالدمام', lat: 26.405, lng: 50.100, radiusKm: 3, priority: true },
      { name: 'الصناعية الثانية بالدمام', lat: 26.330, lng: 50.010, radiusKm: 5, priority: true },
      { name: 'طريق الملك فهد والعدامة', lat: 26.430, lng: 50.110, radiusKm: 2.5, priority: true },
      { name: 'الثقبة', lat: 26.270, lng: 50.195, radiusKm: 2.5, priority: true },
      { name: 'الخبر الشمالية والعقربية', lat: 26.300, lng: 50.205, radiusKm: 2.5, priority: true },
      { name: 'الفيصلية والريان', lat: 26.440, lng: 50.050, radiusKm: 3 },
    ],
  },
}

// ── Pack search keywords (brief §2 table) ─────────────────────────────────────
// Covers every specialty in docs/CATALOG_FOR_DISCOVERY.md (also used by scripts/discover-city.mjs).
export const PACK_QUERIES: Record<string, string[]> = {
  general_building: ['محل مواد بناء', 'لوازم بناء', 'أسمنت', 'رمل وبحص وكسارة', 'عوازل مائية', 'كيماويات بناء', 'مستودع مواد بناء', 'تاجر جملة مواد بناء', 'عزل أسطح', 'فوم وسيليكون', 'جبس'],
  concrete_blocks: ['مصنع بلك', 'طوب أحمر', 'خرسانة جاهزة', 'خرسانة مسبقة الصنع', 'إنترلوك وبردورات', 'بلك أبيض', 'مصنع طوب', 'كسارات', 'مصنع بلاط'],
  steel: ['حديد تسليح', 'حديد وقطاعات', 'صاج', 'شبك حديد', 'شبوك وتسييج', 'درابزين ستانلس', 'حدادة', 'ستانلس ستيل', 'مصنع حديد', 'هناجر'],
  formwork_scaffold: ['بليود وأخشاب', 'سقالات', 'طوبار معدني وجاكات', 'خشب بناء', 'تأجير سقالات'],
  electrical_shop: ['أدوات كهربائية', 'إنارة', 'ثريات ونجف', 'ليد إضاءة', 'كابلات كهربائية', 'لوحات كهربائية', 'مولدات كهرباء', 'أفياش ومفاتيح كهرباء', 'كهرباء جملة', 'طاقة شمسية', 'مصابيح'],
  low_current: ['كاميرات مراقبة', 'أنظمة صوتيات', 'أنظمة تحكم دخول وبوابات', 'شاشات ليد', 'شبكات وسنترالات', 'انتركم', 'أنظمة أمنية'],
  plumbing_shop: ['أدوات صحية', 'محل سباكة', 'مواسير', 'مضخات مياه', 'خزانات مياه', 'سخانات مياه', 'فلاتر وتحلية مياه', 'مناهل وغرف تفتيش', 'خلاطات', 'مغاسل وكراسي حمامات', 'سباكة جملة', 'خزانات فايبر', 'عوازل خزانات'],
  finishing: ['دهانات', 'بلاط وسيراميك', 'رخام وجرانيت', 'جبس بورد', 'أسقف مستعارة', 'باركيه', 'حجر واجهات', 'جي آر سي', 'موكيت وسجاد', 'عوازل حرارية', 'عزل صوتي', 'بويات', 'سيراميك', 'ديكورات', 'ورق جدران', 'مصنع رخام', 'بديل الخشب'],
  doors_windows: ['ألمنيوم', 'زجاج سيكوريت', 'أبواب خشب', 'أبواب حديد', 'أبواب أوتوماتيكية وكراجات', 'مظلات وسواتر', 'منجرة', 'قواطع حمامات', 'مصاعد', 'كلادينج', 'زجاج ومرايا', 'نجارة', 'مصنع ألمنيوم', 'مصنع أبواب', 'شتر وأبواب رول'],
  hvac: ['مكيفات', 'دكت تكييف', 'مراوح شفط وتهوية', 'قطع غيار تكييف', 'مكيفات سبليت', 'تبريد مركزي', 'مراوح'],
  fire_safety: ['معدات إطفاء حريق', 'أنظمة إنذار حريق', 'معدات سلامة', 'طفايات حريق', 'ملابس سلامة'],
  equipment_rental: ['تأجير معدات ثقيلة', 'تأجير رافعات', 'تأجير شاحنات ونقل', 'وايت ماء', 'مضخات خرسانة', 'تأجير مولدات', 'تأجير حفارات', 'تأجير شيول', 'قلابات', 'معدات بناء', 'كمبروسرات'],
  hardware: ['عدد وأدوات', 'خردوات', 'عدد كهربائية', 'مسامير وبراغي', 'أقفال ومفصلات وإكسسوارات أبواب', 'معدات لحام', 'غسالات ضغط عالي', 'مستلزمات ورش', 'معدات صناعية', 'عدد يدوية'],
  landscape: ['عشب صناعي', 'شبكات ري', 'نوافير', 'مشتل', 'تنسيق حدائق', 'أشجار ونخيل', 'حجر زينة', 'ألعاب حدائق'],
}

export const PACK_IDS = SUPPLIER_PACKS.map(p => p.id)
export function packLabel(id: string | null | undefined): string {
  return SUPPLIER_PACKS.find(p => p.id === id)?.ar || 'غير مصنّف'
}
export function packIcon(id: string | null | undefined): string {
  return SUPPLIER_PACKS.find(p => p.id === id)?.icon || '❔'
}
/** The pack's primary sector (first sector of its specialties). */
export function packSector(id: string | null | undefined): string | null {
  const p = SUPPLIER_PACKS.find(x => x.id === id)
  return p ? (Object.keys(p.specialties)[0] || null) : null
}

// ── Classification ────────────────────────────────────────────────────────────
// Ordered: the first pack whose keyword appears wins. Specific trades come before the
// generic ones ("أدوات صحية" must hit plumbing before "أدوات" hits hardware).
const PACK_RULES: [string, string[]][] = [
  ['general_building', ['مواد بناء', 'مواد البناء', 'لوازم بناء', 'لوازم البناء', 'building material']],
  ['hvac', ['تكييف', 'مكيف', 'تبريد', 'فريون', 'hvac', 'دكت', 'air condition']],
  ['fire_safety', ['اطفاء', 'حريق', 'معدات سلامه', 'معدات السلامه', 'مستلزمات سلامه', 'مستلزمات السلامه', 'ادوات السلامه', 'fire', 'safety']],
  ['low_current', ['انظمه امنيه', 'انظمة أمنية', 'كاميرات', 'مراقبه', 'cctv', 'شبكات', 'انتركم', 'صوتيات', 'تيار خفيف', 'security system']],
  ['landscape', ['مشتل', 'مشاتل', 'نباتات', 'حدائق', 'عشب', 'تنسيق', 'نجيل', 'مظلات', 'سواتر', 'landscap', 'garden']],
  ['concrete_blocks', ['خرسانه', 'بلك', 'بلوك', 'طابوق', 'ريدي مكس', 'ready mix', 'readymix', 'انترلوك', 'مسبق الصنع', 'concrete', 'block']],
  ['steel', ['حديد', 'حداده', 'ستيل', 'ستانلس', 'معادن', 'steel', 'هناجر', 'metal']],
  ['doors_windows', ['ابواب', 'شبابيك', 'نوافذ', 'المنيوم', 'الومنيوم', 'زجاج', 'منجور', 'نجار', 'مطابخ', 'بوابات', 'مصاعد', 'مصعد', 'قواطع حمامات', 'كلادينج', 'elevator', 'alumin', 'glass', 'door']],
  ['formwork_scaffold', ['سقالات', 'شدات', 'بليود', 'ابلكاش', 'اخشاب', 'خشب', 'scaffold', 'timber', 'wood']],
  ['equipment_rental', ['تاجير', 'ايجار', 'حفار', 'رافع', 'كرين', 'ونش', 'وايت', 'شيول', 'قلاب', 'معدات ثقيله', 'rental', 'crane']],
  ['plumbing_shop', ['سباكه', 'صحيه', 'مواسير', 'انابيب', 'خزانات', 'مضخات', 'صرف', 'سخانات', 'تحليه', 'فلاتر مياه', 'فلاتر', 'plumb', 'sanitary']],
  ['electrical_shop', ['كهرب', 'اناره', 'اضاءه', 'كوابل', 'كابلات', 'ثريات', 'نجف', 'اسلاك', 'مولدات', 'electric', 'lighting']],
  ['finishing', ['دهان', 'بويات', 'اصباغ', 'جبس', 'بلاط', 'سيراميك', 'رخام', 'جرانيت', 'باركيه', 'ورق جدران', 'ديكور', 'ارضيات', 'قرميد', 'paint', 'tiles', 'marble', 'ceramic', 'grc', 'جي ار سي']],
  ['hardware', ['عدد واد', 'العدد', 'ادوات', 'خردوات', 'hardware', 'tools', 'لحام', 'معدات']],
  ['general_building', ['اسمنت', 'عزل', 'عوازل', 'كيماويات', 'رمل', 'بحص', 'لياسه', 'لاصق', 'سيليكون', 'cement', 'insulation']],
]
const NORM_RULES = PACK_RULES.map(([pack, kws]) => [pack, kws.map(k => normalizeText(k))] as [string, string[]])

function matchPack(text: string): string | null {
  const t = normalizeText(text)
  if (!t) return null
  for (const [pack, kws] of NORM_RULES) if (kws.some(k => t.includes(k))) return pack
  return null
}

// Google primary types that are never building-material suppliers.
const IRRELEVANT_TYPES = [
  'اثاث', 'تجميل', 'تصليح سيارات', 'قطع غيار سيارات', 'كافيه', 'مقهي', 'مطعم', 'صالون', 'سوبرماركت', 'بقاله',
  'صيدليه', 'ملابس', 'رياضيه', 'رياضي', 'طبي', 'صحه', 'مدرسه', 'حكومي', 'متنزه', 'قاعه مناسبات', 'زهور',
  'هدايا', 'مخبز', 'العاب', 'دراجات', 'مكتبه', 'فندق', 'مسجد', 'بنك', 'مستشفي', 'عياده', 'مغسله', 'عطور',
  'مجوهرات', 'نظارات', 'جوالات', 'هواتف', 'حيوانات', 'شقق', 'عقار', 'سياحه', 'تعليم', 'جمعيه', 'منظمه',
  'حلويات', 'تموينات', 'اطفال', 'ساعات', 'نقل الركاب', 'خدمه وسائل النقل', 'خدمه نقل', 'ملحمه', 'محمصه', 'احذيه',
  'غسل سيارات', 'محطه وقود', 'سكن', 'مبني سكني', 'متجر كتب', 'مصارف', 'معرض فني', 'اتصالات', 'تخفيضات', 'اطعمه', 'مخبز',
]
// Types that describe contractors/consultants: potential buyers, not suppliers.
const CONTRACTOR_TYPES = ['مقاول', 'مكتب الشركات', 'مستشار', 'مهندس', 'تصميم', 'سباك', 'كهربائي', 'دهان', 'نجار']
const SUPPLIER_TYPES = ['مواد بناء', 'خردوات', 'متجر ادوات', 'كهربائيه', 'سباكه', 'دهانات', 'بلاط', 'اخشاب', 'حديد']
// Name words that mark a non-building business even when a trade word also appears
// ("دهانات سيارات", "أخشاب العود", "مفروشات").
const IRRELEVANT_NAME = ['سيارات', 'سياره', 'عطور', 'العود', 'مفروشات', 'غرف نوم', 'حلاق', 'اسنان', 'مطعم', 'كافيه', 'قهوه',
  'العاب', 'الالعاب', 'لانجري', 'اساور', 'تجميل', 'شراشف', 'خياطه', 'نسيج', 'اقمشه', 'معادن ثمينه', 'ذهب', 'مجوهرات',
  'حلويات', 'تمور', 'بهارات', 'جوالات', 'عبايات', 'احذيه', 'شنط', 'هدايا', 'زينه السيارات', 'lingerie', 'toys']
const NORM_IRRELEVANT = IRRELEVANT_TYPES.map(normalizeText)
const NORM_IRRELEVANT_NAME = IRRELEVANT_NAME.map(normalizeText)
const NORM_CONTRACTOR = CONTRACTOR_TYPES.map(normalizeText)
const NORM_SUPPLIER_TYPES = SUPPLIER_TYPES.map(normalizeText)

export type Relevance = 'supplier' | 'review' | 'contractor' | 'irrelevant'

/**
 * Classifies a discovered place. Pack comes from the shop name first (strongest signal),
 * then the Google type, then the search keyword that found it.
 * Relevance: irrelevant (drop), contractor (keep unlisted), review (unsure) or supplier.
 */
export function classifyPlace(p: { name?: string; googleType?: string; query?: string; fallbackPack?: string | null }) {
  const name = p.name || ''
  const type = normalizeText(p.googleType || '')
  const nameOrTypePack = matchPack(name) || matchPack(p.googleType || '')
  const pack = nameOrTypePack || matchPack(p.query || '') || p.fallbackPack || null

  let relevance: Relevance = 'supplier'
  const typeIs = (list: string[]) => !!type && list.some(k => type === k || type.includes(k))
  const nName = normalizeText(name)
  if (NORM_IRRELEVANT_NAME.some(k => nName.includes(k))) relevance = 'irrelevant'
  else if (typeIs(NORM_SUPPLIER_TYPES)) relevance = 'supplier'
  else if (typeIs(NORM_IRRELEVANT)) relevance = nameOrTypePack ? 'review' : 'irrelevant'
  else if (typeIs(NORM_CONTRACTOR)) relevance = 'contractor'
  else if (!nameOrTypePack) relevance = 'review' // generic type ("خدمات", "متجر") and nothing in the name

  return { pack, sector: packSector(pack), relevance }
}

// ── Phones ────────────────────────────────────────────────────────────────────
/** National digits used for dedup: 5XXXXXXXX for mobiles, 11XXXXXXX / 920XXXXXX for others. */
export function normalizePhone(input: string | null | undefined): { norm: string | null; mobile: boolean } {
  let d = toLatinDigits(String(input || '')).replace(/\D/g, '')
  if (d.startsWith('00966')) d = d.slice(5)
  else if (d.startsWith('966')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length < 7) return { norm: null, mobile: false }
  return { norm: d, mobile: /^5\d{8}$/.test(d) }
}

/** wa.me link for a Saudi mobile, or '' when the number isn't a mobile. */
export function waLink(phoneNorm: string | null | undefined, text: string): string {
  if (!phoneNorm || !/^5\d{8}$/.test(phoneNorm)) return ''
  return `https://wa.me/966${phoneNorm}?text=${encodeURIComponent(text)}`
}

// ── Address parsing ───────────────────────────────────────────────────────────
const CITY_REGION = new Map<string, { city: string; region: string }>()
for (const [region, cities] of Object.entries(CITIES_BY_REGION)) {
  for (const c of cities) {
    CITY_REGION.set(normalizeText(c.ar), { city: c.ar, region })
    CITY_REGION.set(normalizeText(c.en), { city: c.ar, region })
  }
}
// Common spellings Google uses that differ from our list.
for (const [alias, city, region] of [
  ['Riyadh', 'الرياض', 'الرياض'], ['Jeddah', 'جدة', 'مكة المكرمة'], ['مكه', 'مكة المكرمة', 'مكة المكرمة'],
  ['الدرعيه', 'الدرعية', 'الرياض'], ['ملهم', 'ملهم', 'الرياض'], ['المزاحميه', 'المزاحمية', 'الرياض'],
  ['ضرما', 'ضرما', 'الرياض'], ['حريملاء', 'حريملاء', 'الرياض'], ['الدلم', 'الدلم', 'الرياض'],
] as [string, string, string][]) CITY_REGION.set(normalizeText(alias), { city, region })

const FOREIGN = ['مصر', 'الكويت', 'العراق', 'الامارات', 'البحرين', 'قطر', 'عمان', 'الاردن', 'اليمن', 'السودان', 'باكستان', 'الهند', 'egypt', 'kuwait', 'uae', 'bahrain', 'qatar', 'jordan']
const NORM_FOREIGN = FOREIGN.map(normalizeText)

function cleanSeg(s: string) {
  return toLatinDigits(s).replace(/‎|‏/g, '').replace(/\d{5}(-\d{4})?/g, '').trim()
}

/** City/region/district from a Google formatted address ("…، الحي، الرياض 12345"). */
export function parseAddress(address: string | null | undefined): { city: string | null; region: string | null; district: string | null; foreign: boolean } {
  const segs = String(address || '').split(/[،,]/).map(cleanSeg).filter(Boolean)
  for (let i = segs.length - 1; i >= 0; i--) {
    const n = normalizeText(segs[i])
    if (NORM_FOREIGN.some(f => n === f)) return { city: null, region: null, district: null, foreign: true }
    if (n === 'السعوديه' || n === 'saudi arabia' || n === 'المملكه العربيه السعوديه') continue
    const hit = CITY_REGION.get(n)
    if (hit) {
      let district: string | null = null
      for (let j = i - 1; j >= 0 && j >= i - 2; j--) {
        const s = segs[j]
        if (/\d|\+/.test(s) || /^(شارع|طريق|مخرج|street|road|st\b|rd\b)/i.test(s)) continue
        district = s.replace(/^حي\s+/, '').replace(/\s+District$/i, '').trim() || null
        break
      }
      return { ...hit, district, foreign: false }
    }
  }
  return { city: null, region: null, district: null, foreign: false }
}

/** Google Maps CID from a maps URL (stable id present in old exports). */
export function cidFromUrl(url: string | null | undefined): string | null {
  const m = String(url || '').match(/[?&]cid=(\d+)/)
  return m ? m[1] : null
}

// ── Row builder (Google result / old Excel row → discovered_suppliers row) ────────
export type RawPlace = {
  placeId?: string | null; mapsUrl?: string | null; name?: string; googleType?: string; phone?: string | null
  website?: string | null; address?: string | null; lat?: number | null; lng?: number | null
  rating?: number | null; reviews?: number | null; status?: string | null
  city?: string | null; district?: string | null; query?: string | null
}

/** Builds the upsert row, or returns the reason it's dropped (foreign / irrelevant / closed). */
export function toSupplierRow(p: RawPlace, ctx: { zone?: string | null; fallbackPack?: string | null; source?: string; fallbackCity?: string | null }):
  { row: Record<string, any> | null; reason?: 'foreign' | 'irrelevant' | 'closed' | 'empty' } {
  if (!p.name && !p.placeId) return { row: null, reason: 'empty' }
  if (p.status === 'CLOSED_PERMANENTLY') return { row: null, reason: 'closed' }
  const addr = parseAddress(p.address)
  if (addr.foreign) return { row: null, reason: 'foreign' }
  const cls = classifyPlace({ name: p.name, googleType: p.googleType || '', query: p.query || '', fallbackPack: ctx.fallbackPack })
  if (cls.relevance === 'irrelevant') return { row: null, reason: 'irrelevant' }
  const ph = normalizePhone(p.phone)
  const knownCity = p.city ? CITY_REGION.get(normalizeText(p.city)) : undefined
  const city = addr.city || knownCity?.city || ctx.fallbackCity || null
  const region = addr.region || knownCity?.region || (city ? CITY_REGION.get(normalizeText(city))?.region : null) || null
  return {
    row: {
      place_id: p.placeId || null,
      cid: cidFromUrl(p.mapsUrl),
      name: (p.name || '').trim() || 'مورد',
      category: p.query || null,
      sector: cls.sector,
      pack: cls.pack,
      relevance: cls.relevance,
      region, city,
      district: p.district || addr.district,
      zone: ctx.zone || null,
      address: p.address || null,
      phone: p.phone || null,
      phone_norm: ph.norm,
      is_mobile: ph.mobile,
      website: p.website || null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      google_rating: p.rating ?? null,
      google_reviews: p.reviews ?? null,
      maps_url: p.mapsUrl || null,
      status: p.status || null,
      google_type: p.googleType || null,
      search_query: p.query || null,
      source: ctx.source || 'places_api',
    },
  }
}

// ── Invitation ────────────────────────────────────────────────────────────────
export const INVITE_COOLDOWN_DAYS = 30

export function inviteText(city: string | null | undefined, pack: string | null | undefined, origin: string) {
  const what = pack ? packLabel(pack) : 'مواد البناء'
  return `السلام عليكم، معك فريق تسعيرك 👋\nفي مقاولين وأصحاب مشاريع بـ${city || 'منطقتك'} عم يطلبوا أسعار ${what} يومياً.\nسجّل محلك مجاناً ووصلك الطلبات القريبة منك، وسعّر من جوالك بدقيقة:\n${origin}/register?role=supplier\nوإذا ما بدك رسائل منا، ردّ بكلمة "إيقاف".`
}
