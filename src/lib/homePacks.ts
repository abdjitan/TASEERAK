// Ready-made home project packs (owner 2026-11-22): one tap lists the materials a typical home job
// needs; the buyer unticks what they don't need, sets the quantities and adds them to the request.
// Every name MUST be an exact catalog product (SECTOR_PRODUCTS) with its sector, so each line is
// routed to the right specialist (the plumber prices the mixers, the tile shop the tiles).
// qty: a sensible default for pieces; null = measured by the buyer (area, length…) with a hint.
import type { Sector } from '@/types'

export type PackItem = { name: string; sector: Sector; qty: number | null; hint?: { ar: string; en: string; ur: string } }
export type HomePack = {
  id: string
  img: string // /images/sections/<img>.webp (sheet header background)
  cover: string // a catalog product whose photo is the pack's card picture (each pack its own)
  photo?: string // a room photo (public/images/packs/<id>.webp) once the owner supplies it; preferred over cover
  ar: string; en: string; ur: string
  sub: { ar: string; en: string; ur: string }
  items: PackItem[]
}

const AREA = { ar: 'قِس المساحة بالمتر المربع', en: 'Measure the area in m²', ur: 'رقبہ مربع میٹر میں ناپیں' }
const LEN = { ar: 'قِس الطول بالمتر', en: 'Measure the length in metres', ur: 'لمبائی میٹر میں ناپیں' }
const HOW_MANY = { ar: 'اكتب العدد الذي تحتاجه', en: 'Write how many you need', ur: 'تعداد لکھیں' }

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
      { name: 'بلاط سيراميك جدار', sector: 'architectural', qty: null, hint: AREA },
      { name: 'غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)', sector: 'architectural', qty: null, hint: { ar: 'كيس لكل ٤ م² تقريباً', en: 'About one bag per 4 m²', ur: 'تقریباً ہر 4 مربع میٹر کے لیے ایک بوری' } },
      { name: 'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)', sector: 'architectural', qty: null, hint: AREA },
      { name: 'سيليكون صحي مضاد للفطريات (حمامات ومطابخ)', sector: 'civil', qty: 2 },
    ],
  },
  {
    id: 'paint', img: 'finishing', cover: 'رولة دهان', ar: 'دهان شقة', en: 'Paint an apartment', ur: 'اپارٹمنٹ پینٹ',
    sub: { ar: 'دهان ومعجون وأدوات', en: 'Paint, filler and tools', ur: 'پینٹ، پٹی اور اوزار' },
    items: [
      { name: 'دهان داخلي', sector: 'supply_store', qty: null, hint: { ar: 'جالون لكل ٣٠ م² من الجدران تقريباً (وجهان)', en: 'About one gallon per 30 m² of wall (two coats)', ur: 'تقریباً ہر 30 مربع میٹر دیوار کے لیے ایک گیلن' } },
      { name: 'دهان أساس (برايمر)', sector: 'architectural', qty: null, hint: AREA },
      { name: 'معجون جدران جاهز (أكريليك – سطل)', sector: 'architectural', qty: 1 },
      { name: 'معجون حشو شقوق جاهز (أنبوب/علبة)', sector: 'supply_store', qty: 1 },
      { name: 'ورق صنفرة', sector: 'supply_store', qty: 5 },
      { name: 'رولة دهان', sector: 'supply_store', qty: 2 },
      { name: 'فرشاة دهان', sector: 'supply_store', qty: 2 },
      { name: 'شريط لاصق', sector: 'supply_store', qty: 2 },
    ],
  },
  {
    id: 'lighting', img: 'lighting', cover: 'إنارة سقف مودرن (بلافونيير)', ar: 'إنارة غرفة', en: 'Light a room', ur: 'کمرے کی روشنی',
    sub: { ar: 'سبوتات وثريا ومفاتيح', en: 'Spotlights, ceiling light, switches', ur: 'اسپاٹ، چھت کی لائٹ، سوئچ' },
    items: [
      { name: 'إنارة سقف مودرن (بلافونيير)', sector: 'electrical', qty: 1 },
      { name: 'لمبة سبوت GU10 / MR16', sector: 'supply_store', qty: 6 },
      { name: 'لمبة LED', sector: 'supply_store', qty: 2 },
      { name: 'شريط ليد مرن (SMD)', sector: 'electrical', qty: null, hint: LEN },
      { name: 'مفتاح إنارة', sector: 'supply_store', qty: 2 },
      { name: 'فيش كهرباء', sector: 'supply_store', qty: 3 },
      { name: 'سلك كهرباء 2.5مم', sector: 'supply_store', qty: null, hint: LEN },
    ],
  },
  {
    id: 'ac', img: 'hvac_fire', cover: 'مكيف سبليت', ar: 'تكييف غرفة', en: 'Air-condition a room', ur: 'کمرے کا اے سی',
    sub: { ar: 'مكيف سبليت وتركيبه', en: 'Split AC and its fittings', ur: 'اسپلٹ اے سی اور فٹنگ' },
    items: [
      { name: 'مكيف سبليت', sector: 'mechanical', qty: 1 },
      { name: 'حامل وقاعدة مكيف', sector: 'mechanical', qty: 1 },
      { name: 'مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)', sector: 'electrical', qty: 1 },
    ],
  },
  {
    id: 'heater', img: 'plumbing', cover: 'سخانات مياه كهربائية', ar: 'تغيير سخان', en: 'Replace a water heater', ur: 'گیزر بدلیں',
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
      { name: 'ستائر قماش', sector: 'architectural', qty: null, hint: { ar: 'اكتب عرض النوافذ بالمتر', en: 'Write the window width in metres', ur: 'کھڑکی کی چوڑائی میٹر میں لکھیں' } },
      { name: 'ستائر رول (بلاك آوت)', sector: 'architectural', qty: null, hint: HOW_MANY },
      { name: 'مجاري وحوامل الستائر', sector: 'architectural', qty: null, hint: LEN },
    ],
  },
  {
    // owner 2026-11-22: an outdoor sitting area with a shade or pergola
    id: 'outdoor', img: 'outdoor', cover: 'برجولات ومظلات حدائق', ar: 'قعدة خارجية', en: 'Outdoor sitting area', ur: 'بیرونی بیٹھک',
    sub: { ar: 'مظلة أو برجولا وجلسة وإنارة', en: 'Shade or pergola, seating, lights', ur: 'سائبان یا پرگولا، بیٹھک، روشنی' },
    items: [
      { name: 'برجولات ومظلات حدائق', sector: 'civil', qty: null, hint: { ar: 'اكتب المساحة بالمتر المربع (مثلاً ٤×٥ = ٢٠)', en: 'Write the area in m² (e.g. 4×5 = 20)', ur: 'رقبہ مربع میٹر میں لکھیں' } },
      { name: 'مظلات شراع (شد إنشائي)', sector: 'civil', qty: null, hint: AREA },
      { name: 'أثاث خارجي (جلسات حدائق)', sector: 'architectural', qty: 1 },
      { name: 'إنارة حدائق وممرات', sector: 'electrical', qty: 4 },
      { name: 'سبوت حدائق بوتد (Spike Light)', sector: 'electrical', qty: 4 },
      { name: 'عشب صناعي', sector: 'civil', qty: null, hint: AREA },
      { name: 'إنترلوك رصف', sector: 'civil', qty: null, hint: AREA },
    ],
  },
  {
    // owner 2026-11-22: turning an office into something elegant: shelves, a new desk, decor
    id: 'office', img: 'furniture', cover: 'مكتب خشبي حسب الطلب', ar: 'تجهيز مكتب فخم', en: 'An elegant office', ur: 'شاندار دفتر',
    sub: { ar: 'مكتب ورفوف وقواطع وديكور', en: 'Desk, shelving, partitions, decor', ur: 'میز، شیلف، پارٹیشن، سجاوٹ' },
    items: [
      { name: 'مكتب خشبي حسب الطلب', sector: 'architectural', qty: 1 },
      { name: 'أثاث مكتبي (كراسي ومكاتب وخزائن ملفات)', sector: 'architectural', qty: null, hint: HOW_MANY },
      { name: 'مكتبة ورفوف حسب الطلب', sector: 'architectural', qty: null, hint: LEN },
      { name: 'رفوف حائط ديكور', sector: 'architectural', qty: 3 },
      { name: 'قواطع زجاجية للمكاتب', sector: 'architectural', qty: null, hint: AREA },
      { name: 'ورق جدران', sector: 'architectural', qty: null, hint: AREA },
      { name: 'باركيه خشبي', sector: 'architectural', qty: null, hint: AREA },
      { name: 'سبوت متحرك COB للأسقف الجبسية', sector: 'electrical', qty: 6 },
      { name: 'مصباح طاولة ومكتب LED', sector: 'electrical', qty: 1 },
      { name: 'ستائر شرائح (Blinds)', sector: 'architectural', qty: null, hint: HOW_MANY },
    ],
  },
]

export const packById = (id: string | null | undefined) => HOME_PACKS.find(p => p.id === id) || null
