import { SECTOR_PRODUCTS, getGroupedProducts, detectSubCategory, type Sector } from '@/types'

// User-facing browse sections (owner decision 2026-10-12, from the "universal categories" study).
//
// This is a DISPLAY layer only. Routing to suppliers still uses the 6 internal sectors and the
// sub-category keys (profile_sectors / profile_specialties / notify_suppliers_new_rfq), which are
// not touched. Every sub-category maps to exactly one section; a section shows its groups and
// products with the same images and search.

export type BrowseSection =
  | 'building' | 'finishing' | 'electrical' | 'plumbing' | 'hvac_fire' | 'insulation' | 'tools' | 'outdoor'

export const BROWSE_SECTIONS: { key: BrowseSection; icon: string; ar: string; en: string; ur: string; hint: { ar: string; en: string; ur: string } }[] = [
  { key: 'building', icon: '🧱', ar: 'البناء والإنشاءات', en: 'Building & structure', ur: 'تعمیر و ڈھانچہ',
    hint: { ar: 'أسمنت، خرسانة، حديد، بلك، رمل، شدّات', en: 'Cement, concrete, rebar, blocks, sand, formwork', ur: 'سیمنٹ، کنکریٹ، سریا، بلاک، ریت' } },
  { key: 'finishing', icon: '🎨', ar: 'التشطيبات والديكور', en: 'Finishing & decoration', ur: 'فنشنگ اور سجاوٹ',
    hint: { ar: 'بلاط، رخام، دهان، جبس، أبواب وشبابيك', en: 'Tiles, marble, paint, gypsum, doors & windows', ur: 'ٹائلیں، ماربل، پینٹ، جپسم، دروازے' } },
  { key: 'electrical', icon: '⚡', ar: 'الكهرباء والإنارة', en: 'Electrical & lighting', ur: 'بجلی اور روشنی',
    hint: { ar: 'أسلاك، قواطع، مفاتيح، إنارة، كاميرات', en: 'Cables, breakers, switches, lighting, CCTV', ur: 'تاریں، بریکر، سوئچ، لائٹس' } },
  { key: 'plumbing', icon: '🚿', ar: 'السباكة والمياه', en: 'Plumbing & water', ur: 'پلمبنگ اور پانی',
    hint: { ar: 'مواسير، خلاطات، مضخات، خزانات، أدوات صحية', en: 'Pipes, mixers, pumps, tanks, sanitary ware', ur: 'پائپ، مکسر، پمپ، ٹینک' } },
  { key: 'hvac_fire', icon: '❄️', ar: 'التكييف والتهوية والحريق', en: 'AC, ventilation & firefighting', ur: 'اے سی، وینٹیلیشن، فائر',
    hint: { ar: 'مكيفات، دكت، مراوح شفط، رشاشات وإطفاء', en: 'AC units, ducts, fans, sprinklers', ur: 'اے سی، ڈکٹ، پنکھے، فائر' } },
  { key: 'insulation', icon: '💧', ar: 'العزل والكيماويات', en: 'Insulation & chemicals', ur: 'انسولیشن اور کیمیکل',
    hint: { ar: 'عزل مائي وحراري وصوتي، سيليكون، لواصق، إيبوكسي', en: 'Water/thermal/acoustic insulation, sealants, adhesives', ur: 'واٹر پروفنگ، انسولیشن، سیلنٹ' } },
  { key: 'tools', icon: '🛠️', ar: 'العدد والمعدات والسلامة', en: 'Tools, equipment & safety', ur: 'اوزار، مشینری، حفاظت',
    hint: { ar: 'عدد يدوية وكهربائية، مسامير، أقفال، سقالات، آليات، سلامة', en: 'Hand/power tools, fasteners, hardware, scaffolding, machinery', ur: 'اوزار، کیل، تالے، سکیفولڈنگ، مشینری' } },
  { key: 'outdoor', icon: '🌳', ar: 'الحدائق والأعمال الخارجية', en: 'Garden & outdoor works', ur: 'باغ اور بیرونی کام',
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
  cabling: 'electrical', panels_switches: 'electrical', lighting: 'electrical', low_current: 'electrical',
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
}

export function sectionOfSub(subKey: string | null | undefined, groupKey: string | null | undefined): BrowseSection | null {
  if (subKey && BY_SUB[subKey]) return BY_SUB[subKey]
  return (groupKey && BY_GROUP[groupKey]) || null
}

// Groups and products of one section, gathered across the internal sectors (a section such as
// "plumbing" takes items from mechanical, architectural and supply_store). Each product keeps its
// real sector so the request line routes to the right suppliers.

export type SectionGroup = { group: string; icon: string; ar: string; en: string; ur: string; items: { name: string; sector: Sector }[] }

export function getSectionGroups(section: BrowseSection): SectionGroup[] {
  const out: Record<string, SectionGroup> = {}
  const order: string[] = []
  for (const sector of Object.keys(SECTOR_PRODUCTS) as Sector[]) {
    for (const g of getGroupedProducts(sector)) {
      for (const name of g.items) {
        const sub = detectSubCategory(name, sector)
        if (sectionOfSub(sub, g.group) !== section) continue
        if (!out[g.group]) { out[g.group] = { group: g.group, icon: g.icon, ar: g.ar, en: g.en, ur: g.ur, items: [] }; order.push(g.group) }
        if (!out[g.group].items.some(i => i.name === name)) out[g.group].items.push({ name, sector })
      }
    }
  }
  return order.map(k => out[k])
}

export function sectionCount(section: BrowseSection): number {
  return getSectionGroups(section).reduce((n, g) => n + g.items.length, 0)
}
