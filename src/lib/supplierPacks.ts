// Ready-made "What do you sell?" packs: one tap selects every sector + specialty a typical
// Saudi shop / supplier of that kind deals in. Suppliers can fine-tune afterwards.
// Keys are SUB_CATEGORIES sub_keys (they must exist in both TS and the DB taxonomy table).
import type { Sector } from '@/types'

export type SupplierPack = {
  id: string
  icon: string
  ar: string
  en: string
  ur: string
  hint: { ar: string; en: string; ur: string }
  specialties: Partial<Record<Sector, string[]>>
}

export const SUPPLIER_PACKS: SupplierPack[] = [
  {
    id: 'general_building', icon: '🧱', ar: 'مواد بناء عامة', en: 'General building materials', ur: 'عمومی تعمیراتی سامان',
    hint: { ar: 'أسمنت، بلك، حديد، رمل، عوازل', en: 'Cement, blocks, rebar, sand, insulation', ur: 'سیمنٹ، بلاک، سریا، ریت' },
    specialties: {
      civil: ['cement', 'blocks', 'rebar', 'steel_mesh', 'aggregates', 'waterproofing', 'construction_chemicals', 'formwork_ply'],
      architectural: ['plaster', 'tile_adhesive'],
      supply_store: ['store_fasteners', 'store_hand_tools', 'store_consumables', 'store_safety', 'store_adhesives'],
    },
  },
  {
    id: 'electrical_shop', icon: '⚡', ar: 'محل كهرباء', en: 'Electrical shop', ur: 'الیکٹریکل دکان',
    hint: { ar: 'أسلاك، أفياش، قواطع، إنارة', en: 'Wires, sockets, breakers, lighting', ur: 'تار، ساکٹ، بریکر، لائٹنگ' },
    specialties: {
      electrical: ['lv_cables', 'conduits', 'panels', 'breakers', 'switches', 'wiring_devices', 'indoor_lighting', 'led_strips', 'outdoor_lighting', 'earthing'],
      supply_store: ['store_wires', 'store_switches', 'store_lighting', 'store_elec_access', 'store_elec_consumables'],
    },
  },
  {
    id: 'plumbing_shop', icon: '🚿', ar: 'سباكة وأدوات صحية', en: 'Plumbing & sanitary', ur: 'پلمبنگ اور سینیٹری',
    hint: { ar: 'مواسير، خلاطات، سخانات، مضخات', en: 'Pipes, mixers, heaters, pumps', ur: 'پائپ، مکسر، ہیٹر، پمپ' },
    specialties: {
      mechanical: ['water_supply', 'drainage_pipes', 'pumps', 'tanks_heaters', 'faucets_mixers', 'valves_fittings', 'traps_drains', 'flex_hoses', 'plumbing_consumables', 'shower_accessories', 'floats_tanks'],
      architectural: ['sanitary_ware', 'bath_accessories'],
      supply_store: ['store_faucets', 'store_valves', 'store_hoses'],
    },
  },
  {
    id: 'finishing', icon: '🎨', ar: 'دهانات وتشطيبات', en: 'Paints & finishing', ur: 'پینٹ اور فنشنگ',
    hint: { ar: 'دهان، جبس، بلاط، باركيه', en: 'Paint, gypsum, tiles, flooring', ur: 'پینٹ، جپسم، ٹائلز' },
    specialties: {
      architectural: ['paint', 'plaster', 'gypsum', 'drywall_metal', 'false_ceiling', 'tiles', 'marble', 'tile_adhesive', 'wood_floor', 'thermal_insulation'],
      supply_store: ['store_paint', 'store_adhesives'],
    },
  },
  {
    id: 'hardware', icon: '🔩', ar: 'عدد وأدوات وخردوات', en: 'Tools & hardware', ur: 'اوزار اور ہارڈویئر',
    hint: { ar: 'عدد، مسامير، أقفال، سلامة', en: 'Tools, fasteners, locks, safety', ur: 'اوزار، پیچ، تالے' },
    specialties: {
      supply_store: ['store_hand_tools', 'store_power_tools', 'store_bits', 'store_fasteners', 'store_safety', 'store_consumables', 'store_paint', 'store_adhesives', 'store_hinges', 'store_locks', 'store_handles', 'store_closers'],
    },
  },
  {
    id: 'concrete_blocks', icon: '🏭', ar: 'خرسانة وبلك (مصنع/مورد)', en: 'Concrete & blocks', ur: 'کنکریٹ اور بلاک',
    hint: { ar: 'خرسانة جاهزة، بلك، مسبق الصنع، إنترلوك', en: 'Ready-mix, blocks, precast, interlock', ur: 'ریڈی مکس، بلاک' },
    specialties: { civil: ['readymix', 'blocks', 'precast', 'cement', 'aggregates', 'hardscape'] },
  },
  {
    id: 'steel', icon: '🏗️', ar: 'حديد ومعادن', en: 'Steel & metals', ur: 'سریا اور دھات',
    hint: { ar: 'حديد تسليح، قطاعات، شبك، تسييج', en: 'Rebar, sections, mesh, fencing', ur: 'سریا، سیکشن، جالی' },
    specialties: { civil: ['rebar', 'structural_steel', 'steel_sections', 'steel_mesh', 'fencing'], architectural: ['metal_features'] },
  },
  {
    id: 'equipment_rental', icon: '🚜', ar: 'تأجير معدات ونقل', en: 'Equipment rental & transport', ur: 'مشینری کرایہ اور ٹرانسپورٹ',
    hint: { ar: 'حفار، شيول، كرين، وايت، قلاب', en: 'Excavator, loader, crane, tanker, tipper', ur: 'ایکسکیویٹر، کرین، ٹینکر' },
    specialties: {
      equipment: ['heavy_machinery', 'cranes', 'trucks', 'concrete_equip', 'compaction', 'generators_equip', 'pumps_equip', 'scaffolding_equip'],
      civil: ['earthworks'],
    },
  },
  {
    id: 'hvac', icon: '❄️', ar: 'تكييف وتبريد', en: 'AC & HVAC', ur: 'اے سی اور کولنگ',
    hint: { ar: 'مكيفات، دكت، مراوح، نحاس', en: 'AC units, ducts, fans, copper', ur: 'اے سی، ڈکٹ، پنکھے' },
    specialties: { mechanical: ['ac_units', 'ductwork', 'duct_insulation', 'hvac_dampers', 'ventilation_fans', 'flexible_ducts', 'chilled_water_insulation', 'copper_fittings'] },
  },
  {
    id: 'doors_windows', icon: '🚪', ar: 'أبواب وشبابيك وألمنيوم', en: 'Doors, windows & aluminium', ur: 'دروازے اور کھڑکیاں',
    hint: { ar: 'ألمنيوم، أبواب، زجاج، أقفال', en: 'Aluminium, doors, glazing, locks', ur: 'المونیم، دروازے، تالے' },
    specialties: {
      architectural: ['aluminum', 'wood_doors', 'fire_doors', 'auto_doors', 'curtain_wall', 'louvers', 'millwork'],
      supply_store: ['store_locks', 'store_hinges', 'store_handles', 'store_closers'],
    },
  },
  {
    id: 'fire_safety', icon: '🧯', ar: 'إطفاء وإنذار حريق', en: 'Fire fighting & alarm', ur: 'فائر سیفٹی',
    hint: { ar: 'رشاشات، صناديق حريق، مضخات، إنذار', en: 'Sprinklers, cabinets, pumps, alarm', ur: 'اسپرنکلر، فائر پمپ، الارم' },
    specialties: {
      mechanical: ['fire_fighting', 'fire_pumps', 'fire_cabinets', 'fire_valves', 'fire_connections'],
      electrical: ['fire_alarm'],
      supply_store: ['store_safety'],
    },
  },
  {
    id: 'low_current', icon: '📹', ar: 'تيار خفيف وكاميرات', en: 'Low current & CCTV', ur: 'سی سی ٹی وی اور نیٹ ورک',
    hint: { ar: 'كاميرات، شبكات، صوتيات، بوابات', en: 'CCTV, networks, sound, access', ur: 'کیمرے، نیٹ ورک، ساؤنڈ' },
    specialties: { electrical: ['cctv', 'fire_alarm', 'data_network', 'sound_systems', 'access_control', 'led_screens'] },
  },
  {
    id: 'formwork_scaffold', icon: '🪵', ar: 'شدّات وسقالات وأخشاب', en: 'Formwork, scaffolding & timber', ur: 'شٹرنگ اور اسکیفولڈنگ',
    hint: { ar: 'بليود، مرابيع، سقالات، دعامات', en: 'Plywood, timber, scaffolds, props', ur: 'پلائی، لکڑی، اسکیفولڈ' },
    specialties: { civil: ['formwork_ply', 'formwork_timber', 'formwork_steel', 'scaffold_structure', 'scaffold_jacks', 'shoring_props'] },
  },
  {
    id: 'landscape', icon: '🌳', ar: 'تنسيق حدائق وأعمال خارجية', en: 'Landscape & external works', ur: 'لینڈ اسکیپ',
    hint: { ar: 'عشب، ري، إنترلوك، صرف خارجي', en: 'Turf, irrigation, interlock, drainage', ur: 'گھاس، آبپاشی، انٹرلاک' },
    specialties: { civil: ['turf', 'irrigation', 'fountains', 'hardscape', 'planters', 'fencing', 'drainage'] },
  },
  {
    id: 'furniture', icon: '🛋', ar: 'أثاث وورش نجارة', en: 'Furniture & joinery workshops', ur: 'فرنیچر اور بڑھئی ورکشاپ',
    hint: { ar: 'أثاث حسب الطلب، مطابخ، خزائن، تنجيد، ستائر', en: 'Custom furniture, kitchens, wardrobes, upholstery, curtains', ur: 'آرڈر پر فرنیچر، کچن، الماریاں، پردے' },
    specialties: {
      architectural: ['custom_furniture', 'fitted_furniture', 'millwork', 'curtains', 'wood_doors'],
      supply_store: ['store_hinges', 'store_handles'],
    },
  },
]

export function packSectors(p: SupplierPack): string[] {
  return Object.keys(p.specialties)
}
export function packSpecialties(p: SupplierPack): string[] {
  return Object.values(p.specialties).flat() as string[]
}
/** A pack counts as selected when every one of its specialties is selected. */
export function isPackSelected(p: SupplierPack, specialties: string[]): boolean {
  const set = new Set(specialties)
  return packSpecialties(p).every(k => set.has(k))
}
