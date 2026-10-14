import { SECTOR_PRODUCTS, GROUP_LABELS, getGroupedProducts, detectSubCategory, type Sector } from '@/types'

// User-facing browse sections (owner decision 2026-10-12, from the "universal categories" study).
//
// This is a DISPLAY layer only. Routing to suppliers still uses the 6 internal sectors and the
// sub-category keys (profile_sectors / profile_specialties / notify_suppliers_new_rfq), which are
// not touched. Every sub-category maps to exactly one section; a section shows its groups and
// products with the same images and search.

export type BrowseSection =
  | 'building' | 'finishing' | 'furniture' | 'electrical' | 'plumbing' | 'hvac_fire' | 'insulation' | 'tools' | 'outdoor'

// cat = CatIcon key (line icon, same set as the groups); icon = emoji kept for plain-text places
export const BROWSE_SECTIONS: { key: BrowseSection; icon: string; cat?: string; ar: string; en: string; ur: string; hint: { ar: string; en: string; ur: string } }[] = [
  { key: 'building', cat: 'civil', icon: '🧱', ar: 'البناء والإنشاءات', en: 'Building & structure', ur: 'تعمیر و ڈھانچہ',
    hint: { ar: 'أسمنت، خرسانة، حديد، بلك، رمل، شدّات', en: 'Cement, concrete, rebar, blocks, sand, formwork', ur: 'سیمنٹ، کنکریٹ، سریا، بلاک، ریت' } },
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
  { key: 'insulation', cat: 'building_insulation', icon: '💧', ar: 'العزل والكيماويات', en: 'Insulation & chemicals', ur: 'انسولیشن اور کیمیکل',
    hint: { ar: 'عزل مائي وحراري وصوتي، سيليكون، لواصق، إيبوكسي', en: 'Water/thermal/acoustic insulation, sealants, adhesives', ur: 'واٹر پروفنگ، انسولیشن، سیلنٹ' } },
  { key: 'tools', cat: 'store_tools', icon: '🛠️', ar: 'العدد والمعدات والسلامة', en: 'Tools, equipment & safety', ur: 'اوزار، مشینری، حفاظت',
    hint: { ar: 'عدد يدوية وكهربائية، مسامير، أقفال، سقالات، آليات، سلامة', en: 'Hand/power tools, fasteners, hardware, scaffolding, machinery', ur: 'اوزار، کیل، تالے، سکیفولڈنگ، مشینری' } },
  { key: 'outdoor', cat: 'landscape', icon: '🌳', ar: 'الحدائق والأعمال الخارجية', en: 'Garden & outdoor works', ur: 'باغ اور بیرونی کام',
    hint: { ar: 'عشب، ري، إنترلوك، أسوار، صرف خارجي', en: 'Turf, irrigation, interlock, fencing, external drainage', ur: 'گھاس، آبپاشی، انٹرلاک، باڑ' } },
]

// group key (GROUP_LABELS) -> section. Most sub-categories follow their group.
const BY_GROUP: Record<string, BrowseSection> = {
  concrete: 'building', masonry: 'building', steel: 'building', rawmaterials: 'building', formwork: 'building',
  infrastructure: 'insulation', drainage_grp: 'outdoor', landscape: 'outdoor', scaffolding: 'tools',
  floors_walls: 'finishing', paint_facade: 'finishing', ceiling_decor: 'finishing', doors_windows: 'finishing',
  facade_systems: 'finishing', joinery: 'finishing', arch_metalwork: 'finishing',
  acoustic: 'insulation', building_insulation: 'insulation', mech_insulation: 'insulation',
  sanitary_finish: 'plumbing',
  cabling: 'electrical', panels_switches: 'electrical', lighting: 'electrical', low_current: 'electrical', solar: 'electrical',
  hvac: 'hvac_fire', firefighting: 'hvac_fire',
  plumbing: 'plumbing', plumbing_supplies: 'plumbing',
  heavy_equipment: 'tools', concrete_machinery: 'tools', light_equipment: 'tools', access_equipment: 'tools', workshop_equip: 'tools',
  store_plumbing: 'plumbing', store_electrical: 'electrical', store_tools: 'tools', store_fasteners: 'tools',
  store_safety: 'tools', store_paint: 'finishing', store_hardware: 'tools',
}

// sub-category exceptions to its group's section
const BY_SUB: Record<string, BrowseSection> = {
  piling: 'building',               // infrastructure group, but it is structure
  store_adhesives: 'insulation',    // sealants, silicone, foam
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
  tools: { access_equipment: 'scaffolding' },
  finishing: { store_paint: 'paint_facade' },
  insulation: { mech_insulation: 'building_insulation' },
}
const LABEL: Partial<Record<BrowseSection, Record<string, { ar: string; en: string; ur: string }>>> = {
  furniture: {
    joinery: { ar: 'أثاث وخزائن وستائر حسب الطلب', en: 'Custom furniture, wardrobes & curtains', ur: 'آرڈر پر فرنیچر اور پردے' },
    lighting: { ar: 'ثريات وإنارة ديكور', en: 'Chandeliers & decorative lighting', ur: 'جھومر اور سجاوٹی روشنی' },
  },
  building: { infrastructure: { ar: 'الخوازيق والأساسات', en: 'Piling & foundations', ur: 'پائلنگ اور بنیادیں' } },
  plumbing: { plumbing_supplies: { ar: 'لوازم وأدوات السباكة', en: 'Plumbing supplies & tools', ur: 'پلمبنگ کا سامان' } },
  tools: { scaffolding: { ar: 'السقالات ومنصات الرفع', en: 'Scaffolding & access platforms', ur: 'سکیفولڈنگ اور لفٹ پلیٹ فارم' } },
  insulation: {
    building_insulation: { ar: 'العزل الحراري والمائي', en: 'Thermal & water insulation', ur: 'حرارتی اور واٹر پروفنگ' },
    store_paint: { ar: 'لواصق وسيليكون ورغوة', en: 'Adhesives, silicone & foam', ur: 'گلو، سلیکون اور فوم' },
  },
}

// The furniture section is browsed by ROOM (what a home buyer thinks in), not by trade group.
// First matching rule wins; anything unmatched lands in «أثاث وديكور متنوّع».
const ROOMS: { key: string; ar: string; en: string; ur: string; icon: string; re: RegExp }[] = [
  { key: 'room_kids', ar: 'غرف الأطفال', en: "Kids' rooms", ur: 'بچوں کے کمرے', icon: '🧸', re: /أطفال|اطفال|دورين/ },
  { key: 'room_bed', ar: 'غرف النوم', en: 'Bedrooms', ur: 'بیڈروم', icon: '🛏', re: /غرفة نوم|سرير|خزانة ملابس|دولاب|مراتب|فرشات|تسريحة|كومودينو/ },
  { key: 'room_living', ar: 'غرف المعيشة والمجالس', en: 'Living rooms & majlis', ur: 'لونگ روم اور مجلس', icon: '🛋', re: /كنب|مجلس|طاولة قهوة|طاولات جانبية|وحدة تلفزيون|مشب|سجاد|زوالي|موكيت/ },
  { key: 'room_dining', ar: 'السفرة والطعام', en: 'Dining', ur: 'ڈائننگ', icon: '🍽', re: /طعام|سفرة|بوفيه/ },
  { key: 'room_kitchen', ar: 'المطابخ', en: 'Kitchens', ur: 'کچن', icon: '🍳', re: /مطبخ|المطبخ/ },
  { key: 'room_office', ar: 'المكاتب والمكتبات', en: 'Offices & bookcases', ur: 'دفاتر اور لائبریری', icon: '🗄', re: /مكتب|مكتبة|رفوف معدنية|ملفات/ },
  { key: 'room_walls', ar: 'الجدران والديكور', en: 'Walls & decor', ur: 'دیواریں اور سجاوٹ', icon: '🖼', re: /جدار|لوحات|تحف|رفوف حائط|قواطع ديكور|أحذية|جزامة/ },
  { key: 'room_curtains', ar: 'الستائر', en: 'Curtains & blinds', ur: 'پردے', icon: '🪟', re: /ستائر|ستارة|الستائر/ },
  { key: 'room_bath', ar: 'الحمّامات', en: 'Bathrooms', ur: 'باتھ روم', icon: '🛁', re: /مغسلة|فانيتي|حمّام|حمام/ },
  { key: 'room_outdoor', ar: 'الأثاث الخارجي', en: 'Outdoor furniture', ur: 'بیرونی فرنیچر', icon: '⛱', re: /خارجي|حدائق/ },
]
function byRoom(groups: SectionGroup[]): SectionGroup[] {
  const out: Record<string, SectionGroup> = {}
  const other: SectionGroup = { group: 'room_other', icon: '🛋', ar: 'أثاث وديكور متنوّع', en: 'More furniture & decor', ur: 'مزید فرنیچر', items: [] }
  for (const g of groups) for (const it of g.items) {
    const r = ROOMS.find(x => x.re.test(it.name))
    const bucket = r ? (out[r.key] ||= { group: r.key, icon: r.icon, ar: r.ar, en: r.en, ur: r.ur, items: [] }) : other
    if (!bucket.items.some(i => i.name === it.name)) bucket.items.push(it)
  }
  const SHOW = ['room_living', 'room_bed', 'room_kids', 'room_dining', 'room_kitchen', 'room_office', 'room_walls', 'room_curtains', 'room_bath', 'room_outdoor']
  return [...SHOW.map(k => out[k]).filter(Boolean), ...(other.items.length ? [other] : [])]
}

export function getSectionGroups(section: BrowseSection): SectionGroup[] {
  if (section === 'furniture') return byRoom(getTradeGroups(section))
  return getTradeGroups(section)
}

function getTradeGroups(section: BrowseSection): SectionGroup[] {
  const out: Record<string, SectionGroup> = {}
  const order: string[] = []
  for (const sector of Object.keys(SECTOR_PRODUCTS) as Sector[]) {
    for (const g of getGroupedProducts(sector)) {
      for (const name of g.items) {
        const sub = detectSubCategory(name, sector)
        if (sectionOfSub(sub, g.group) !== section) continue
        const key = MERGE[section]?.[g.group] || g.group
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
  return order.map(k => out[k])
}

export function sectionCount(section: BrowseSection): number {
  return getSectionGroups(section).reduce((n, g) => n + g.items.length, 0)
}
