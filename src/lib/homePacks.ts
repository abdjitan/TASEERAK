// Ready-made home project packs (owner 2026-11-22): one tap lists the materials a typical home job
// needs; the buyer unticks what they don't need, sets the quantities and adds them to the request.
// Every name MUST be an exact catalog product (SECTOR_PRODUCTS) with its sector, so each line is
// routed to the right specialist (the plumber prices the mixers, the tile shop the tiles).
// qty: a sensible default for pieces; null = measured by the buyer (area, length…) with a hint.
// unit: the order unit the hint talks about (UX-005: the hint and the unit must agree, otherwise the buyer
// sends «40 جالون» for 40 m² of wall); without it the catalog default unit is used.
import type { Sector } from '@/types'
import { getProductLabel } from '@/types'
import { cleanArName } from '@/lib/displayName'

// calc (round-3 UX-061): how the quantity calculator works for this item.
//   'room' = from a room's floor or walls (tiles, paint, wallpaper); 'area' = the buyer writes the area
//   directly, no waste (outdoor shades, grass); 'none' = no calculator (curtains: window sizes, not a room).
//   Without calc, an item ordered in م²/جالون/لفة gets the room calculator.
// cover: square metres one unit covers in ONE coat (paint ≈ 30 m²/gallon/coat, primer ≈ 30, wallpaper ≈ 5);
// coats: how many coats (paint 2, primer 1). The web and the app use the same numbers (calcQuantity).
// on: false = listed but unticked by default (an alternative to another row, round-5 UX-122).
// derive (round-4 UX-185): the quantity follows other rows of the pack (sum ÷ per, rounded up) until the buyer edits it,
//   e.g. tile adhesive = one bag per 4 m² of the wall and floor tiles.
export type PackCalc = 'room' | 'area' | 'none'
export type PackItem = { name: string; sector: Sector; qty: number | null; unit?: string; on?: boolean; hint?: { ar: string; en: string; ur: string }; calc?: PackCalc; cover?: number; coats?: number; derive?: { from: string[]; per: number } }
export type HomePack = {
  id: string
  img: string // /images/sections/<img>.webp (sheet header background)
  cover: string // a catalog product whose photo is the pack's card picture (each pack its own)
  photo?: string // a room photo (public/images/packs/<id>.webp) once the owner supplies it; preferred over cover
  ar: string; en: string; ur: string
  sub: { ar: string; en: string; ur: string }
  items: PackItem[]
}

const AREA = { ar: 'المساحة بالمتر المربع، أو احسبها من مقاس الغرفة', en: 'The area in square metres, or work it out from the room size', ur: 'رقبہ مربع میٹر میں، یا کمرے کے سائز سے حساب کریں' }
const LEN = { ar: 'قِس الطول بالمتر', en: 'Measure the length in metres', ur: 'لمبائی میٹر میں ناپیں' }
const HOW_MANY = { ar: 'اكتب العدد الذي تحتاجه', en: 'Write how many you need', ur: 'تعداد لکھیں' }
const WINDOWS = { ar: 'اضرب عرض كل نافذة في ارتفاعها بالمتر، ثم اجمع النتائج', en: 'Multiply each window’s width by its height in metres, then add the results', ur: 'ہر کھڑکی کی چوڑائی کو اس کی اونچائی سے میٹر میں ضرب دیں، پھر نتائج جمع کریں' }
const OUT_AREA = { ar: 'اكتب المساحة بالمتر المربع (مثلاً 4 × 5 = 20)', en: 'Write the area in square metres (e.g. 4 × 5 = 20)', ur: 'رقبہ مربع میٹر میں لکھیں (مثلاً 4 × 5 = 20)' }

export const HOME_PACKS: HomePack[] = [
  {
    id: 'bathroom', img: 'plumbing', cover: 'مغسلة Wash Basin', photo: '/images/packs/bathroom.webp', ar: 'تجديد حمّام', en: 'Bathroom renovation', ur: 'باتھ روم کی تجدید',
    sub: { ar: 'أدوات صحية وخلاطات وبلاط', en: 'Fixtures, mixers and tiles', ur: 'سینیٹری، مکسر اور ٹائل' },
    items: [
      { name: 'مرحاض WC مع خزان', sector: 'mechanical', qty: 1 },
      { name: 'مغسلة Wash Basin', sector: 'mechanical', qty: 1 },
      { name: 'خلاط مغسلة', sector: 'mechanical', qty: 1 },
      { name: 'خلاط دش', sector: 'mechanical', qty: 1 },
      { name: 'خلاط شطاف', sector: 'mechanical', qty: 1 },
      { name: 'رأس دش', sector: 'mechanical', qty: 1 },
      { name: 'سيفون مغسلة', sector: 'mechanical', qty: 1 },
      { name: 'بلاط سيراميك جدار', sector: 'architectural', qty: null, unit: 'م²', hint: AREA, calc: 'room' },
      { name: 'بلاط سيراميك', sector: 'architectural', qty: null, unit: 'م²', hint: AREA, calc: 'room' }, // the floor tiles (UX-132)
      { name: 'غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)', sector: 'architectural', qty: null, unit: 'كيس', derive: { from: ['بلاط سيراميك جدار', 'بلاط سيراميك'], per: 4 }, hint: { ar: 'كيس لكل 4 أمتار مربعة من البلاط. تُحسب تلقائياً عند كتابة مساحة البلاط، ويمكنك تعديلها', en: 'One bag per 4 square metres of tiles. Worked out automatically once you write the tile area; you can change it', ur: 'ہر 4 مربع میٹر ٹائل کے لیے ایک بوری۔ ٹائل کا رقبہ لکھنے پر خود حساب ہو جائے گی، آپ بدل سکتے ہیں' } },
      { name: 'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)', sector: 'architectural', qty: null, unit: 'م²', hint: AREA },
      { name: 'سيليكون صحي مضاد للفطريات (حمامات ومطابخ)', sector: 'civil', qty: 2 },
    ],
  },
  {
    id: 'paint', img: 'finishing', cover: 'رولة دهان', photo: '/images/packs/paint.webp', ar: 'دهان شقة', en: 'Paint an apartment', ur: 'اپارٹمنٹ پینٹ',
    sub: { ar: 'دهان ومعجون وأدوات', en: 'Paint, filler and tools', ur: 'پینٹ، پٹی اور اوزار' },
    items: [
      { name: 'دهان داخلي', sector: 'supply_store', qty: null, unit: 'جالون', calc: 'room', cover: 30, coats: 2, hint: { ar: 'جالون لكل 15 متراً مربعاً من الجدران تقريباً (وجهان)، أو احسبها من مقاس الغرفة', en: 'About one gallon per 15 square metres of wall (two coats), or work it out from the room size', ur: 'تقریباً ہر 15 مربع میٹر دیوار کے لیے ایک گیلن (دو کوٹ)' } },
      { name: 'دهان أساس (برايمر)', sector: 'architectural', qty: null, unit: 'جالون', calc: 'room', cover: 30, coats: 1, hint: { ar: 'جالون لكل 30 متراً مربعاً تقريباً (وجه واحد)', en: 'About one gallon per 30 square metres (one coat)', ur: 'تقریباً ہر 30 مربع میٹر کے لیے ایک گیلن (ایک کوٹ)' } },
      { name: 'معجون جدران جاهز (أكريليك – سطل)', sector: 'architectural', qty: 1, unit: 'سطل' },
      { name: 'معجون حشو شقوق جاهز (أنبوب/علبة)', sector: 'supply_store', qty: 1 },
      { name: 'ورق صنفرة', sector: 'supply_store', qty: 5 },
      { name: 'رولة دهان', sector: 'supply_store', qty: 2 },
      { name: 'فرشاة دهان', sector: 'supply_store', qty: 2 },
      { name: 'شريط لاصق', sector: 'supply_store', qty: 2 },
    ],
  },
  {
    id: 'lighting', img: 'lighting', cover: 'إنارة سقف مودرن (بلافونيير)', photo: '/images/packs/lighting.webp', ar: 'إنارة غرفة', en: 'Light a room', ur: 'کمرے کی روشنی',
    sub: { ar: 'مصابيح سبوت وثريا ومفاتيح', en: 'Spotlights, ceiling light, switches', ur: 'اسپاٹ، چھت کی لائٹ، سوئچ' },
    items: [
      { name: 'إنارة سقف مودرن (بلافونيير)', sector: 'electrical', qty: 1 },
      { name: 'لمبة سبوت GU10 / MR16', sector: 'supply_store', qty: 6 },
      { name: 'لمبة LED', sector: 'supply_store', qty: 2 },
      { name: 'شريط ليد مرن (SMD)', sector: 'electrical', qty: null, unit: 'متر', hint: LEN },
      { name: 'مفتاح إنارة', sector: 'supply_store', qty: 2 },
      { name: 'فيش كهرباء', sector: 'supply_store', qty: 3 },
      { name: 'سلك كهرباء 2.5مم', sector: 'supply_store', qty: null, unit: 'متر', hint: LEN },
    ],
  },
  {
    id: 'ac', img: 'hvac_fire', cover: 'مكيف سبليت', photo: '/images/packs/ac.webp', ar: 'تكييف غرفة', en: 'Air-condition a room', ur: 'کمرے کا اے سی',
    sub: { ar: 'مكيف سبليت وملحقات تركيبه', en: 'Split AC and its mounting parts', ur: 'اسپلٹ اے سی اور اس کی فٹنگ' },
    items: [
      { name: 'مكيف سبليت', sector: 'mechanical', qty: 1 },
      { name: 'حامل وقاعدة مكيف', sector: 'mechanical', qty: 1 },
      { name: 'مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)', sector: 'electrical', qty: 1 },
    ],
  },
  {
    id: 'heater', img: 'plumbing', cover: 'سخانات مياه كهربائية', photo: '/images/packs/heater.webp', ar: 'تغيير سخان', en: 'Replace a water heater', ur: 'گیزر بدلیں',
    sub: { ar: 'سخان وصمام أمان وتوصيلات', en: 'Heater, safety valve, hoses', ur: 'گیزر، سیفٹی والو، پائپ' },
    items: [
      { name: 'سخانات مياه كهربائية', sector: 'mechanical', qty: 1 },
      { name: 'صمام أمان السخان (Water Heater Safety Valve)', sector: 'mechanical', qty: 1 },
      { name: 'خرطوم سخان مرن', sector: 'mechanical', qty: 2 },
      { name: 'مجموعة تثبيت حائط للسخان والغسالة (Wall-mount Group)', sector: 'mechanical', qty: 1 },
    ],
  },
  {
    id: 'curtains', img: 'furniture', cover: 'ستائر قماش', photo: '/images/packs/curtains.webp', ar: 'ستائر غرفة', en: 'Curtains for a room', ur: 'کمرے کے پردے',
    sub: { ar: 'ستائر وحوامل', en: 'Curtains and rails', ur: 'پردے اور ریلیں' },
    items: [
      { name: 'ستائر قماش', sector: 'architectural', qty: null, unit: 'م.ط', calc: 'none', hint: { ar: 'اكتب عرض النوافذ بالمتر', en: 'Write the window width in metres', ur: 'کھڑکی کی چوڑائی میٹر میں لکھیں' } },
      { name: 'ستائر رول (بلاك آوت)', sector: 'architectural', qty: null, unit: 'م²', hint: WINDOWS, calc: 'none' },
      { name: 'مجاري وحوامل الستائر', sector: 'architectural', qty: null, unit: 'م.ط', hint: LEN },
    ],
  },
  {
    // owner 2026-11-22: an outdoor sitting area with a shade or pergola
    id: 'outdoor', img: 'outdoor', cover: 'برجولات ومظلات حدائق', photo: '/images/packs/outdoor.webp', ar: 'جلسة خارجية', en: 'Outdoor sitting area', ur: 'بیرونی بیٹھک',
    sub: { ar: 'مظلة أو برجولا وجلسة وإنارة', en: 'Shade or pergola, seating, lights', ur: 'سائبان یا پرگولا، بیٹھک، روشنی' },
    items: [
      { name: 'برجولات ومظلات حدائق', sector: 'civil', qty: null, unit: 'م²', hint: OUT_AREA, calc: 'area' },
      { name: 'مظلات شراع (شد إنشائي)', sector: 'civil', qty: null, unit: 'م²', on: false, calc: 'area', hint: { ar: 'بديل عن البرجولا، اختر أحدهما. اكتب المساحة بالمتر المربع', en: 'An alternative to the pergola: choose one of them. Write the area in square metres', ur: 'پرگولا کا متبادل، ان میں سے ایک چنیں۔ رقبہ مربع میٹر میں لکھیں' } }, // round-5 UX-122
      { name: 'أثاث خارجي (جلسات حدائق)', sector: 'architectural', qty: 1 },
      { name: 'إنارة حدائق وممرات', sector: 'electrical', qty: 4 },
      { name: 'سبوت حدائق بوتد (Spike Light)', sector: 'electrical', qty: 4 },
      { name: 'عشب صناعي', sector: 'civil', qty: null, unit: 'م²', hint: OUT_AREA, calc: 'area' },
      { name: 'إنترلوك رصف', sector: 'civil', qty: null, unit: 'م²', hint: OUT_AREA, calc: 'area' },
    ],
  },
  {
    // owner 2026-11-22: turning an office into something elegant: shelves, a new desk, decor
    id: 'office', img: 'furniture', cover: 'مكتب خشبي حسب الطلب', photo: '/images/packs/office.webp', ar: 'تجهيز مكتب فخم', en: 'An elegant office', ur: 'شاندار دفتر',
    sub: { ar: 'مكتب ورفوف وقواطع وديكور', en: 'Desk, shelving, partitions, decor', ur: 'میز، شیلف، پارٹیشن، سجاوٹ' },
    items: [
      { name: 'مكتب خشبي حسب الطلب', sector: 'architectural', qty: 1 },
      { name: 'أثاث مكتبي (كراسي ومكاتب وخزائن ملفات)', sector: 'architectural', qty: null, hint: HOW_MANY },
      { name: 'مكتبة ورفوف حسب الطلب', sector: 'architectural', qty: null, unit: 'م.ط', hint: LEN },
      { name: 'رفوف حائط ديكور', sector: 'architectural', qty: 3 },
      { name: 'قواطع زجاجية للمكاتب', sector: 'architectural', qty: null, unit: 'م²', hint: AREA },
      { name: 'ورق جدران', sector: 'architectural', qty: null, unit: 'لفة', calc: 'room', cover: 5, coats: 1, hint: { ar: 'لفة لكل 5 أمتار مربعة من الجدار تقريباً', en: 'About one roll per 5 square metres of wall', ur: 'تقریباً ہر 5 مربع میٹر دیوار کے لیے ایک رول' } },
      { name: 'باركيه خشبي', sector: 'architectural', qty: null, unit: 'م²', hint: AREA },
      { name: 'سبوت متحرك COB للأسقف الجبسية', sector: 'electrical', qty: 6 },
      { name: 'مصباح طاولة ومكتب LED', sector: 'electrical', qty: 1 },
      { name: 'ستائر شرائح (Blinds)', sector: 'architectural', qty: null, unit: 'م²', hint: WINDOWS, calc: 'none' },
    ],
  },
]

// Plain names for a home buyer (UX-172): no model codes, no English, MSA. Display only; the line keeps
// the catalog name that routes the request.
const HOME_NAMES: Record<string, string> = {
  'لمبة سبوت GU10 / MR16': 'مصابيح سقف موجّهة (سبوت)',
  'لمبة LED': 'مصباح LED',
  'غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)': 'غراء بلاط',
  'سلك كهرباء 2.5مم': 'سلك كهرباء (سُمك 2.5 مليمتر)',
  'سخانات مياه كهربائية': 'سخان مياه كهربائي',
  'مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)': 'مفتاح مكيّف',
  'شريط ليد مرن (SMD)': 'شريط إضاءة LED مرن',
  'سبوت متحرك COB للأسقف الجبسية': 'مصباح سبوت متحرك للسقف الجبسي',
  'مرحاض WC مع خزان': 'مرحاض مع خزان',
  'مغسلة Wash Basin': 'مغسلة',
  // round-2 UX-036: no trade words a home buyer does not know
  'إنارة سقف مودرن (بلافونيير)': 'إنارة سقف حديثة',
  'سبوت حدائق بوتد (Spike Light)': 'كشاف حديقة يُثبَّت في التربة',
  'ستائر رول (بلاك آوت)': 'ستائر رول معتمة',
  'ستائر شرائح (Blinds)': 'ستائر شرائح',
  'دهان أساس (برايمر)': 'دهان أساس',
  'معجون جدران جاهز (أكريليك – سطل)': 'معجون جدران جاهز',
  'معجون حشو شقوق جاهز (أنبوب/علبة)': 'معجون حشو الشقوق',
  'مظلات شراع (شد إنشائي)': 'مظلات شراعية',
  'إنترلوك رصف': 'بلاط رصف متداخل (إنترلوك)',
  'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)': 'عازل مائي سائل تحت البلاط',
  'مجموعة تثبيت حائط للسخان والغسالة (Wall-mount Group)': 'طقم تثبيت السخان على الحائط',
  'سيليكون صحي مضاد للفطريات (حمامات ومطابخ)': 'سيليكون للحمامات والمطابخ',
  'أثاث خارجي (جلسات حدائق)': 'جلسة حديقة',
  // round-3 UX-132: MSA names, the common word in brackets
  'فيش كهرباء': 'مقبس كهربائي (فيش)',
  'رولة دهان': 'أسطوانة دهان (رولة)',
  // round-4 UX-114: which tiles are for the walls and which for the floor
  'بلاط سيراميك جدار': 'بلاط جدران (سيراميك)',
  'بلاط سيراميك': 'بلاط أرضية (سيراميك)',
}

/** A derived row's quantity from the rows it follows (round-4 UX-185); '' when they are still empty. */
export function deriveQty(rule: { from: string[]; per: number }, rows: { name: string; quantity: string; on?: boolean }[]): string {
  const sum = rows.filter(r => r.on !== false && rule.from.includes(r.name)).reduce((t, r) => t + (parseFloat(r.quantity) || 0), 0)
  return sum > 0 ? String(Math.max(1, Math.ceil(sum / rule.per))) : ''
}

/** One quantity rule for the web and the app (UX-061): area in m² → order quantity for the item's unit.
 *  Paint/primer/wallpaper: area × coats ÷ cover, rounded up; tiles/floors from a room: +10% waste;
 *  an outdoor area typed directly ('area'): no waste. */
export function calcQuantity(area: number, unit: string, opts: { calc?: PackCalc; cover?: number; coats?: number } = {}): { qty: number; waste: boolean } {
  if (!(area > 0)) return { qty: 0, waste: false }
  if (unit === 'جالون') { const cover = opts.cover || 30, coats = opts.coats || 2; return { qty: Math.max(1, Math.ceil(area * coats / cover)), waste: false } }
  if (unit === 'لفة') { const cover = opts.cover || 5, coats = opts.coats || 1; return { qty: Math.max(1, Math.ceil(area * coats / cover)), waste: false } }
  const waste = unit === 'م²' && opts.calc !== 'area'
  return { qty: Math.ceil(area * (waste ? 1.1 : 1)), waste }
}
// The same plain names in English and Urdu (round-5 UX-123): no model codes (GU10 / MR16, C1) for any reader.
const HOME_NAMES_I18N: Record<string, { en: string; ur: string }> = {
  'لمبة سبوت GU10 / MR16': { en: 'Ceiling spotlights', ur: 'چھت کی اسپاٹ لائٹس' },
  'لمبة LED': { en: 'LED bulb', ur: 'ایل ای ڈی بلب' },
  'غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)': { en: 'Tile adhesive', ur: 'ٹائل گوند' },
  'سلك كهرباء 2.5مم': { en: 'Electric wire (2.5 mm thick)', ur: 'بجلی کی تار (2.5 ملی میٹر موٹی)' },
  'سخانات مياه كهربائية': { en: 'Electric water heater', ur: 'بجلی کا گیزر' },
  'مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)': { en: 'AC switch', ur: 'اے سی سوئچ' },
  'شريط ليد مرن (SMD)': { en: 'Flexible LED strip', ur: 'لچکدار ایل ای ڈی پٹی' },
  'سبوت متحرك COB للأسقف الجبسية': { en: 'Adjustable spotlight for a gypsum ceiling', ur: 'جپسم چھت کے لیے گھومنے والی اسپاٹ لائٹ' },
  'مرحاض WC مع خزان': { en: 'Toilet with cistern', ur: 'ٹینک والا کموڈ' },
  'مغسلة Wash Basin': { en: 'Wash basin', ur: 'واش بیسن' },
  'إنارة سقف مودرن (بلافونيير)': { en: 'Modern ceiling light', ur: 'جدید چھت کی لائٹ' },
  'سبوت حدائق بوتد (Spike Light)': { en: 'Garden light fixed in the soil', ur: 'مٹی میں لگنے والی باغ کی لائٹ' },
  'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)': { en: 'Liquid waterproofing under tiles', ur: 'ٹائل کے نیچے مائع واٹر پروفنگ' },
  'مجموعة تثبيت حائط للسخان والغسالة (Wall-mount Group)': { en: 'Wall-mount kit for the heater', ur: 'گیزر کو دیوار پر لگانے کا سیٹ' },
  'ستائر رول (بلاك آوت)': { en: 'Blackout roller blinds', ur: 'اندھیرا کرنے والے رول پردے' },
  'ستائر شرائح (Blinds)': { en: 'Slat blinds', ur: 'پٹیوں والے پردے' },
  'بلاط سيراميك جدار': { en: 'Wall tiles (ceramic)', ur: 'دیوار کی ٹائلیں (سیرامک)' },
  'بلاط سيراميك': { en: 'Floor tiles (ceramic)', ur: 'فرش کی ٹائلیں (سیرامک)' },
}

/** A product name as a home buyer reads it: the plain name above (Arabic, or English/Urdu), else the catalog label. */
export function homeName(name: string, locale: string = 'ar'): string {
  const key = (name || '').trim()
  if (locale === 'en' || locale === 'ur') return HOME_NAMES_I18N[key]?.[locale] || getProductLabel(name, locale)
  return HOME_NAMES[key] || cleanArName(name)
}

// The hint and the unit must agree (UX-005). Checked in development by PackSheet; returns the items
// whose hint names one unit while the item orders in another.
export function packUnitMismatches(): string[] {
  const out: string[] = []
  for (const p of HOME_PACKS) for (const it of p.items) {
    const h = it.hint?.ar || ''
    if (!h) continue
    const says = /جالون/.test(h) ? 'جالون' : /كيس/.test(h) ? 'كيس' : /لفة/.test(h) ? 'لفة'
      : /بالمتر المربع|مساحة|ارتفاعها/.test(h) ? 'م²' : /عرض النوافذ|الطول بالمتر/.test(h) ? 'length' : /العدد/.test(h) ? 'count' : ''
    const u = it.unit || ''
    const ok = !says || (says === 'length' ? ['م.ط', 'متر'].includes(u) : says === 'count' ? (!u || ['حبة', 'عدد', 'طقم'].includes(u)) : says === u)
    if (!ok) out.push(p.id + ': ' + it.name)
  }
  return out
}

export const packById = (id: string | null | undefined) => HOME_PACKS.find(p => p.id === id) || null
/** The packs shown under «جهّز بيتك»: home rooms only, not the office (round-2 UX-133). */
export const HOME_ROOM_PACKS = HOME_PACKS.filter(p => p.id !== 'office')
