import { SECTOR_PRODUCTS, SUB_CATEGORIES, GROUP_LABELS, getGroupedProducts, detectSubCategory, taxonomyVersion, type Sector } from '@/types'

// User-facing browse sections (owner decision 2026-10-12, from the "universal categories" study).
//
// This is a DISPLAY layer only. Routing to suppliers still uses the 6 internal sectors and the
// sub-category keys (profile_sectors / profile_specialties / notify_suppliers_new_rfq), which are
// not touched. Every sub-category maps to exactly one section; a section shows its groups and
// products with the same images and search.

// 'insulation' is no longer a section (merged into building 2026-10-19); kept in the type so older
// callers (mobile app, section photos) still compile.
export type BrowseSection =
  | 'building' | 'finishing' | 'furniture' | 'electrical' | 'plumbing' | 'hvac_fire' | 'insulation' | 'tools' | 'machinery' | 'outdoor'

// cat = CatIcon key (line icon, same set as the groups); icon = emoji kept for plain-text places
export const BROWSE_SECTIONS: { key: BrowseSection; icon: string; cat?: string; ar: string; en: string; ur: string; hint: { ar: string; en: string; ur: string } }[] = [
  { key: 'building', cat: 'civil', icon: '🧱', ar: 'البناء والإنشاءات', en: 'Building & structure', ur: 'تعمیر و ڈھانچہ',
    hint: { ar: 'أسمنت، حديد، بلوك، شدّات، عزل وكيماويات، مسامير وانكرات', en: 'Cement, rebar, blocks, formwork, insulation & chemicals, fixings', ur: 'سیمنٹ، سریا، بلاک، شٹرنگ، انسولیشن اور کیمیکل، فکسنگ' } },
  { key: 'finishing', cat: 'paint_facade', icon: '🎨', ar: 'التشطيبات', en: 'Finishing', ur: 'فنشنگ',
    hint: { ar: 'بلاط، رخام، دهان، جبس، أبواب وشبابيك', en: 'Tiles, marble, paint, gypsum, doors & windows', ur: 'ٹائلیں، ماربل، پینٹ، جپسم، دروازے' } },
  { key: 'furniture', cat: 'furniture', icon: '🛋️', ar: 'الأثاث والديكور', en: 'Furniture & decor', ur: 'فرنیچر اور سجاوٹ',
    hint: { ar: 'طاولات، كنب، خزائن، ستائر، مجالس وسجاد', en: 'Custom tables, sofas, wardrobes, curtains, majlis, rugs', ur: 'میزیں، صوفے، الماریاں، پردے، مجلس' } },
  { key: 'electrical', cat: 'lighting', icon: '⚡', ar: 'الكهرباء والإنارة', en: 'Electrical & lighting', ur: 'بجلی اور روشنی',
    hint: { ar: 'ثريات وإنارة ديكور، سبوتات، أسلاك، مفاتيح، طاقة شمسية', en: 'Chandeliers, decor lighting, spots, cables, switches, solar', ur: 'جھومر، لائٹس، تاریں، سوئچ، سولر' } },
  { key: 'plumbing', cat: 'plumbing', icon: '🚿', ar: 'السباكة والمياه', en: 'Plumbing & water', ur: 'پلمبنگ اور پانی',
    hint: { ar: 'مواسير، خلاطات، مضخات، خزانات، أدوات صحية', en: 'Pipes, mixers, pumps, tanks, sanitary ware', ur: 'پائپ، مکسر، پمپ، ٹینک' } },
  { key: 'hvac_fire', cat: 'hvac', icon: '❄️', ar: 'التكييف والتهوية والحريق', en: 'AC, ventilation & firefighting', ur: 'اے سی، وینٹیلیشن، فائر',
    hint: { ar: 'مكيفات، دكت، مراوح شفط، رشاشات وإطفاء', en: 'AC units, ducts, fans, sprinklers', ur: 'اے سی، ڈکٹ، پنکھے، فائر' } },
  // «العزل والكيماويات» merged into «البناء والإنشاءات» (owner 2026-10-19, after a 4-persona study):
  // contractor-grade insulation and chemicals sit with building; shop silicone/adhesives with finishing.
  { key: 'tools', cat: 'store_tools', icon: '🛠️', ar: 'العدد والمعدات والسلامة', en: 'Tools, equipment & safety', ur: 'اوزار، مشینری، حفاظت',
    hint: { ar: 'عدد يدوية وكهربائية، مسامير، أقفال، سقالات، لحام، سلامة', en: 'Hand/power tools, fasteners, hardware, scaffolding, welding, safety', ur: 'اوزار، کیل، تالے، سکیفولڈنگ، ویلڈنگ' } },
  // heavy and concrete machinery got their own section (owner, 2026-10-15): renting a crane or a
  // concrete pump is a different purchase from buying a drill
  { key: 'machinery', cat: 'heavy_equipment', icon: '🚜', ar: 'الآليات والمعدات الثقيلة', en: 'Machinery & heavy equipment', ur: 'مشینری اور بھاری سامان',
    hint: { ar: 'حفارات، رافعات، شاحنات، مضخات وخلاطات خرسانة، مولدات', en: 'Excavators, cranes, trucks, concrete pumps and mixers, generators', ur: 'کھدائی، کرین، ٹرک، کنکریٹ پمپ، جنریٹر' } },
  { key: 'outdoor', cat: 'landscape', icon: '🌳', ar: 'الحدائق والأعمال الخارجية', en: 'Garden & outdoor works', ur: 'باغ اور بیرونی کام',
    hint: { ar: 'عشب، ري، إنترلوك، أسوار، صرف خارجي', en: 'Turf, irrigation, interlock, fencing, external drainage', ur: 'گھاس، آبپاشی، انٹرلاک، باڑ' } },
]

// group key (GROUP_LABELS) -> section. Most sub-categories follow their group.
const BY_GROUP: Record<string, BrowseSection> = {
  concrete: 'building', masonry: 'building', steel: 'building', rawmaterials: 'building', formwork: 'building',
  infrastructure: 'building', drainage_grp: 'outdoor', landscape: 'outdoor', scaffolding: 'building',
  floors_walls: 'finishing', paint_facade: 'finishing', ceiling_decor: 'finishing', doors_windows: 'finishing',
  facade_systems: 'finishing', joinery: 'finishing', arch_metalwork: 'finishing',
  acoustic: 'finishing', building_insulation: 'building', mech_insulation: 'hvac_fire',
  sanitary_finish: 'plumbing',
  cabling: 'electrical', panels_switches: 'electrical', lighting: 'electrical', low_current: 'electrical', solar: 'electrical',
  hvac: 'hvac_fire', firefighting: 'hvac_fire',
  plumbing: 'plumbing', plumbing_supplies: 'plumbing',
  heavy_equipment: 'machinery', concrete_machinery: 'machinery', light_equipment: 'machinery', workshop_equip: 'tools',
  access_equipment: 'building', // 2026-11-02: scaffolding showed in building AND tools; it is kept in building
  earthing_grp: 'electrical',
  store_plumbing: 'plumbing', store_electrical: 'electrical', store_tools: 'tools', store_fasteners: 'building', // owner 2026-10-19: nails, screws and anchors sit with building materials
 
  store_safety: 'tools', store_paint: 'finishing', store_hardware: 'tools',
}

// sub-category exceptions to its group's section
const BY_SUB: Record<string, BrowseSection> = {
  piling: 'building',               // infrastructure group, but it is structure
  store_adhesives: 'finishing',    // sealants, silicone, foam
  duct_insulation: 'hvac_fire',     // bought with the ducts
  custom_furniture: 'furniture',    // made-to-order furniture, curtains and decorative lighting:
  curtains: 'furniture',            // what a home owner looks for («a table / a chandelier like this»)
  kitchen_appliances: 'furniture',  // built-in appliances and kitchen fittings
  office_furniture: 'furniture',
  fitted_furniture: 'furniture',
}

export function sectionOfSub(subKey: string | null | undefined, groupKey: string | null | undefined): BrowseSection | null {
  if (subKey && BY_SUB[subKey]) return BY_SUB[subKey]
  return (groupKey && BY_GROUP[groupKey]) || null
}

// Groups and products of one section, gathered across the internal sectors (a section such as
// "plumbing" takes items from mechanical, architectural and supply_store). Each product keeps its
// real sector so the request line routes to the right suppliers.

export type SectionGroup = { group: string; icon: string; ar: string; en: string; ur: string; items: { name: string; sector: Sector }[] }

// Inside a section, near-duplicate groups (an engineering group and its shop twin) show as one.
// Display only: each product keeps its sector and sub-category.
const MERGE: Partial<Record<BrowseSection, Record<string, string>>> = {
  plumbing: { store_plumbing: 'plumbing_supplies', sanitary_finish: 'plumbing' },
  building: { access_equipment: 'scaffolding' },
  finishing: { store_paint: 'paint_facade' },
}
// Oversized groups split by specialty (catalog review 2026-11-02, display only): sub-category key →
// display group of that section. Checked before MERGE; labels in LABEL below, order in SECTION_ORDER.
const SUB_GROUP: Partial<Record<BrowseSection, Record<string, string>>> = {
  plumbing: {
    sanitary_ware: 'plb_sanitary', bath_accessories: 'plb_sanitary', faucets_mixers: 'plb_sanitary', shower_accessories: 'plb_sanitary', store_faucets: 'plb_sanitary',
    water_supply: 'plb_pipes', pressure_pipes: 'plb_pipes', drainage_pipes: 'plb_pipes', silent_drainage: 'plb_pipes', storm_drainage: 'plb_pipes', central_gas: 'plb_pipes',
    valves_fittings: 'plb_valves', copper_fittings: 'plb_valves',
    pumps: 'plb_equipment', tanks_heaters: 'plb_equipment', water_treatment: 'plb_equipment', fuel_systems: 'plb_equipment',
    traps_drains: 'plb_small', flex_hoses: 'plb_small', plumbing_consumables: 'plb_small', floats_tanks: 'plb_small', store_valves: 'plb_small', store_hoses: 'plb_small',
  },
  finishing: {
    paint: 'fin_paint', store_paint: 'fin_paint', plaster: 'fin_plaster', store_adhesives: 'fin_adhesives',
  },
  tools: { store_hand_tools: 'tools_hand', store_power_tools: 'tools_power', store_bits: 'tools_bits' },
  outdoor: {
    hardscape: 'out_hardscape', fencing: 'out_fencing', shades_screens: 'out_shades', pools: 'out_pools', fountains: 'out_pools',
    irrigation: 'out_irrigation', turf: 'out_planting', planters: 'out_planting', playground: 'out_planting',
  },
}
const SECTION_ORDER: Partial<Record<BrowseSection, string[]>> = {
  plumbing: ['plb_sanitary', 'plb_pipes', 'plb_valves', 'plb_equipment', 'plb_small'],
  finishing: ['floors_walls', 'ceiling_decor', 'fin_plaster', 'fin_paint', 'fin_adhesives', 'doors_windows', 'facade_systems', 'arch_metalwork', 'joinery', 'acoustic'],
  tools: ['tools_hand', 'tools_power', 'tools_bits', 'store_hardware', 'store_safety', 'workshop_equip'],
  outdoor: ['out_hardscape', 'out_fencing', 'out_shades', 'out_pools', 'out_planting', 'out_irrigation', 'drainage_grp'],
}
const LABEL: Partial<Record<BrowseSection, Record<string, { ar: string; en: string; ur: string }>>> = {
  building: {
    infrastructure: { ar: 'الأساسات والخوازيق', en: 'Foundations & piles', ur: 'بنیادیں اور پائلز' },
    building_insulation: { ar: 'العزل الحراري', en: 'Thermal insulation', ur: 'حرارتی انسولیشن' },
    // names that match their contents (catalog review 2026-10-31)
    rawmaterials: { ar: 'الركام ومواد الردم والأساس', en: 'Aggregates, fill & sub-base', ur: 'بجری، بھرائی اور بیس' },
    scaffolding: { ar: 'السقالات والدعامات', en: 'Scaffolding & shoring', ur: 'سکیفولڈنگ' },
    formwork: { ar: 'الطوبار والشدّات (خشبية ومعدنية)', en: 'Formwork & shuttering (timber & steel)', ur: 'شٹرنگ اور فارم ورک (لکڑی اور اسٹیل)' },
  },
  finishing: {
    fin_paint: { ar: 'الدهانات', en: 'Paints', ur: 'پینٹ' },
    fin_plaster: { ar: 'اللياسة ومواد التحضير', en: 'Plaster & surface preparation', ur: 'پلستر اور سطح کی تیاری' },
    fin_adhesives: { ar: 'لواصق وسيليكون وفوم', en: 'Adhesives, silicone & foam', ur: 'گلو، سلیکون اور فوم' },
    ceiling_decor: { ar: 'الجبس والأسقف المستعارة', en: 'Gypsum & false ceilings', ur: 'جپسم اور فالس سیلنگ' },
    doors_windows: { ar: 'الأبواب والشبابيك', en: 'Doors & windows', ur: 'دروازے اور کھڑکیاں' },
    facade_systems: { ar: 'الواجهات والزجاج', en: 'Facades & glass', ur: 'فیساڈ اور شیشہ' },
  },
  electrical: {
    panels_switches: { ar: 'اللوحات والقواطع والمولدات', en: 'Panels, breakers & generators', ur: 'پینل، بریکر اور جنریٹر' },
    store_electrical: { ar: 'مستلزمات كهرباء بسيطة', en: 'Basic electrical supplies', ur: 'بجلی کا عام سامان' },
  },
  hvac_fire: { mech_insulation: { ar: 'عزل الأنابيب ومجاري الهواء', en: 'Pipe & duct insulation', ur: 'پائپ اور ڈکٹ انسولیشن' } },
  machinery: { concrete_machinery: { ar: 'معدات الخرسانة والتسليح', en: 'Concrete & rebar machinery', ur: 'کنکریٹ اور سریا مشینری' } },
  plumbing: {
    plb_sanitary: { ar: 'الأدوات الصحية', en: 'Sanitary ware & mixers', ur: 'سینیٹری کا سامان' },
    plb_pipes: { ar: 'المواسير', en: 'Pipes', ur: 'پائپ' },
    plb_valves: { ar: 'الوصلات والمحابس والحوامل', en: 'Fittings, valves & supports', ur: 'فٹنگز، والو اور سپورٹ' },
    plb_equipment: { ar: 'المضخات والخزانات والسخانات والمعالجة', en: 'Pumps, tanks, heaters & treatment', ur: 'پمپ، ٹینک، ہیٹر اور ٹریٹمنٹ' },
    plb_small: { ar: 'لوازم سباكة صغيرة', en: 'Small plumbing supplies', ur: 'پلمبنگ کا چھوٹا سامان' },
  },
  tools: {
    tools_hand: { ar: 'عدد يدوية', en: 'Hand tools', ur: 'ہاتھ کے اوزار' },
    tools_power: { ar: 'عدد كهربائية', en: 'Power tools', ur: 'بجلی کے اوزار' },
    tools_bits: { ar: 'ريش وأقراص وشفرات', en: 'Bits, discs & blades', ur: 'بٹ، ڈسک اور بلیڈ' },
    workshop_equip: { ar: 'معدات اللحام وغسالات الضغط', en: 'Welding equipment & pressure washers', ur: 'ویلڈنگ اور پریشر واشر' },
  },
  outdoor: {
    out_hardscape: { ar: 'الرصف والإنترلوك والأسفلت', en: 'Paving, interlock & asphalt', ur: 'پیونگ، انٹرلاک اور اسفالٹ' },
    out_fencing: { ar: 'الأسوار والشبك والبوابات', en: 'Fencing, mesh & gates', ur: 'باڑ، جالی اور گیٹ' },
    out_shades: { ar: 'المظلات والسواتر', en: 'Shades & screens', ur: 'سائبان اور اسکرین' },
    out_pools: { ar: 'المسابح والنوافير', en: 'Pools & fountains', ur: 'سوئمنگ پول اور فوارے' },
    out_planting: { ar: 'العشب والزراعة وألعاب الأطفال', en: 'Turf, planting & playgrounds', ur: 'گھاس، شجرکاری اور کھیل کا سامان' },
    out_irrigation: { ar: 'الري', en: 'Irrigation', ur: 'آبپاشی' },
  },
}

// The furniture section is browsed by ROOM (what a home buyer thinks in), not by trade group.
// First matching rule wins; anything unmatched lands in «أثاث وديكور متنوّع».
// Rooms with one or two items were merged (catalog review 2026-11-02): kids → bedrooms, bathrooms →
// kitchens, outdoor furniture → living rooms. A rule's key is the room it fills (labels in ROOM_LABELS).
const ROOM_LABELS: Record<string, { ar: string; en: string; ur: string; icon: string }> = {
  room_any: { ar: 'قطع حسب الطلب (أي نوع)', en: 'Made to order (any type)', ur: 'آرڈر پر (کوئی بھی قسم)', icon: '✨' },
  room_living: { ar: 'المجالس والمعيشة والجلسات الخارجية', en: 'Living rooms, majlis & outdoor seating', ur: 'لونگ روم، مجلس اور بیرونی نشست', icon: '🛋' },
  room_bed: { ar: 'غرف النوم وغرف الأطفال', en: "Bedrooms & kids' rooms", ur: 'بیڈروم اور بچوں کے کمرے', icon: '🛏' },
  room_dining: { ar: 'السفرة والطعام', en: 'Dining', ur: 'ڈائننگ', icon: '🍽' },
  room_kitchen: { ar: 'المطابخ والحمّامات', en: 'Kitchens & bathrooms', ur: 'کچن اور باتھ روم', icon: '🍳' },
  room_office: { ar: 'المكاتب والمكتبات', en: 'Offices & bookcases', ur: 'دفاتر اور لائبریری', icon: '🗄' },
  room_walls: { ar: 'الجدران والديكور والخزائن المدمجة', en: 'Walls, decor & built-ins', ur: 'دیواریں، سجاوٹ اور بلٹ اِن', icon: '🖼' },
  room_curtains: { ar: 'الستائر', en: 'Curtains & blinds', ur: 'پردے', icon: '🪟' },
}
const ROOMS: { key: string; re: RegExp }[] = [
  { key: 'room_any', re: /أي نوع/ },
  { key: 'room_bed', re: /أطفال|اطفال|دورين/ },
  { key: 'room_bed', re: /غرفة نوم|سرير|خزانة ملابس|دولاب|مراتب|فرشات|تسريحة|كومودينو/ },
  { key: 'room_living', re: /كنب|مجلس|طاولة قهوة|طاولات جانبية|وحدة تلفزيون|سجاد|زوالي|موكيت/ },
  { key: 'room_dining', re: /طعام|سفرة|بوفيه/ },
  { key: 'room_kitchen', re: /مطبخ|المطبخ/ },
  { key: 'room_office', re: /مكتب|مكتبة|رفوف معدنية|ملفات/ },
  { key: 'room_walls', re: /جدار|جدران|لوحات|تحف|مشب|رفوف حائط|أرفف|خزائن حائط|Built-in|قواطع ديكور|أحذية|جزامة/ },
  { key: 'room_curtains', re: /ستائر|ستارة|الستائر/ },
  { key: 'room_kitchen', re: /مغسلة|فانيتي|حمّام|حمام/ },
  { key: 'room_living', re: /خارجي|حدائق/ },
]
function byRoom(groups: SectionGroup[]): SectionGroup[] {
  const out: Record<string, SectionGroup> = {}
  const other: SectionGroup = { group: 'room_other', icon: '🛋', ar: 'أثاث وديكور متنوّع', en: 'More furniture & decor', ur: 'مزید فرنیچر', items: [] }
  for (const g of groups) for (const it of g.items) {
    const r = ROOMS.find(x => x.re.test(it.name))
    const lab = r && ROOM_LABELS[r.key]
    const bucket = r && lab ? (out[r.key] ||= { group: r.key, icon: lab.icon, ar: lab.ar, en: lab.en, ur: lab.ur, items: [] }) : other
    if (!bucket.items.some(i => i.name === it.name)) bucket.items.push(it)
  }
  const SHOW = ['room_any', 'room_living', 'room_bed', 'room_dining', 'room_kitchen', 'room_office', 'room_walls', 'room_curtains']
  return [...SHOW.map(k => out[k]).filter(Boolean), ...(other.items.length ? [other] : [])]
}

// Cached per section (it walks every product): rebuilt when the taxonomy or product list changes.
const SECTION_GROUPS_CACHE = new Map<string, { v: number; groups: SectionGroup[] }>()
export function getSectionGroups(section: BrowseSection): SectionGroup[] {
  const v = taxonomyVersion()
  const hit = SECTION_GROUPS_CACHE.get(section)
  if (hit && hit.v === v) return hit.groups
  const groups = section === 'furniture' ? byRoom(getTradeGroups(section)) : getTradeGroups(section)
  SECTION_GROUPS_CACHE.set(section, { v, groups })
  return groups
}

// «مواد كيميائية للبناء» holds ~108 products: inside «البناء والإنشاءات» it shows as four groups
// (owner 2026-10-19). Display only — every product keeps its sub-category and routing.
const CHEM_GROUPS: { key: string; ar: string; en: string; ur: string; icon: string; re: RegExp }[] = [
  { key: 'chem_fire', ar: 'الحماية من الحريق والدهانات الواقية', en: 'Fire protection & protective coatings', ur: 'آگ سے حفاظت اور حفاظتی کوٹنگ', icon: '🔥', re: /حريق|منتفخ|دهان حماية|طارد ماء|سيلان|كربنة|طلاء|^دهان|بطانة/ },
  { key: 'chem_seal', ar: 'مانعات التسرب والسيليكون والفوم', en: 'Sealants, silicone & foam', ur: 'سیلنٹ، سلیکون اور فوم', icon: '🧴', re: /سيليكون|مانع (ال)?تسرب|ماستك|فوم|حشوة|فلر|سلفايد|شريط|فواصل/ },
  { key: 'chem_repair', ar: 'الجراوت والإصلاح والتثبيت', en: 'Grouts, repair & anchoring', ur: 'گراؤٹ، مرمت اور اینکرنگ', icon: '🧰', re: /جراوت|مونة|إصلاح|اصلاح|حقن|كربون|إيبوكسي|ايبوكسي|انكر|أنكر|مثبت|تثبيت|ترميم|ميكرو|لاصق|خرسانة دقيقة|تسوية/ },
  { key: 'chem_admix', ar: 'إضافات ومعالجة الخرسانة', en: 'Concrete admixtures & curing', ur: 'کنکریٹ ایڈمکسچر اور کیورنگ', icon: '🧪', re: /./ },
]
// «العزل المائي» is its own group (owner 2026-10-31: «العزل» only, not «عزل الأساسات»; piles stay under «الأساسات»)
const WATERPROOF_GROUP = { key: 'waterproofing', ar: 'العزل المائي', en: 'Waterproofing', ur: 'واٹر پروفنگ', icon: '🛡' }
SECTION_ORDER.building = ['concrete', 'steel', 'masonry', 'rawmaterials', 'formwork', 'scaffolding', 'waterproofing', 'building_insulation', 'infrastructure', 'chem_admix', 'chem_repair', 'chem_seal', 'chem_fire', 'store_fasteners']

function getTradeGroups(section: BrowseSection): SectionGroup[] {
  const out: Record<string, SectionGroup> = {}
  const order: string[] = []
  for (const sector of Object.keys(SECTOR_PRODUCTS) as Sector[]) {
    for (const g of getGroupedProducts(sector)) {
      for (const name of g.items) {
        const sub = detectSubCategory(name, sector)
        if (sectionOfSub(sub, g.group) !== section) continue
        const chem = section === 'building' && sector === 'civil' && sub === 'construction_chemicals' ? (/ميكروسيليكا|silica fume/i.test(name) ? CHEM_GROUPS.find(c => c.key === 'chem_admix') : CHEM_GROUPS.find(c => c.re.test(name))) // microsilica is a concrete additive
          : section === 'building' && sub === 'waterproofing' ? WATERPROOF_GROUP : undefined
        const key = chem ? chem.key : ((sub && SUB_GROUP[section]?.[sub]) || MERGE[section]?.[g.group] || g.group)
        if (chem && !out[key]) { out[key] = { group: key, icon: chem.icon, ar: chem.ar, en: chem.en, ur: chem.ur, items: [] }; order.push(key) }
        if (!out[key]) {
          const base: any = (GROUP_LABELS as any)[key] || g
          const lab = LABEL[section]?.[key] || base
          out[key] = { group: key, icon: base.icon || g.icon, ar: lab.ar, en: lab.en, ur: lab.ur, items: [] }
          order.push(key)
        }
        if (!out[key].items.some(i => i.name === name)) out[key].items.push({ name, sector })
      }
    }
  }
  const so = SECTION_ORDER[section]
  if (so) order.sort((a, b) => (so.indexOf(a) + 1 || 99) - (so.indexOf(b) + 1 || 99))
  return order.map(k => out[k])
}

export function sectionCount(section: BrowseSection): number {
  return getSectionGroups(section).reduce((n, g) => n + g.items.length, 0)
}

// Every specialty (sector + sub-category key) that belongs to a section — used to let the buyer
// file a free-text item («not in the list») under the right specialty so it reaches the
// specialist suppliers instead of the whole sector.
export type SectionSub = { sector: Sector; key: string; group: string; ar: string; en: string; ur: string }
const subsCache: Partial<Record<BrowseSection, SectionSub[]>> = {}
export function subsOfSection(section: BrowseSection): SectionSub[] {
  if (subsCache[section]) return subsCache[section]!
  const out: SectionSub[] = []
  for (const [sector, subs] of Object.entries(SUB_CATEGORIES)) {
    for (const [key, v] of Object.entries(subs as any)) {
      const sub: any = v
      if (sectionOfSub(key, sub.group) === section) out.push({ sector: sector as Sector, key, group: sub.group, ar: sub.ar, en: sub.en, ur: sub.ur })
    }
  }
  return (subsCache[section] = out)
}
