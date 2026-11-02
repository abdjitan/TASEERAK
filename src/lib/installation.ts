// «مع التركيب» (supply + install) — owner decision 2026-11-02: a minimal option on a request line,
// NOT a services marketplace. The buyer may ask a line to be priced with installation when the
// line's specialty is one where installation is commonly sold with the material; the supplier
// then quotes an installation amount for the line (or says he does not install).
//
// Kept out of src/types/index.ts on purpose (the catalog file is edited separately). Keys below
// are SUB_CATEGORIES keys that exist in src/types/index.ts.
//
// Line data:
//   rfqs.items[i].with_install          = true when the buyer asked for installation
//   offers.item_prices[i].install_offered = whether the supplier includes installation
//   offers.item_prices[i].install_total   = installation amount for the line (0 when not offered)
//   offers.item_prices[i].material_total  = the material part (unit price x quantity)
//   offers.item_prices[i].total           = material_total + install_total (awards, comparisons,
//                                           purchase orders keep using `total`)

export const INSTALLABLE_SUBS: Set<string> = new Set([
  // electrical / low current
  'solar_pv', 'smart_home', 'cctv', 'fire_alarm', 'access_control', 'data_network', 'sound_systems', 'led_screens',
  // HVAC
  'ac_units', 'ductwork', 'flexible_ducts', 'ventilation_fans',
  // doors, windows, facades
  'aluminum', 'wood_doors', 'fire_doors', 'auto_doors', 'curtain_wall', 'rainscreen', 'stone_facade', 'louvers', 'grc_facade',
  // ceilings, partitions, floors
  'gypsum', 'false_ceiling', 'drywall_metal', 'acoustic_panels', 'wood_floor', 'tiles', 'marble',
  // joinery and interiors
  'millwork', 'fitted_furniture', 'custom_furniture', 'curtains', 'cubicles',
  // landscape and outdoor
  'shades_screens', 'pools', 'playground', 'turf', 'fountains', 'fencing', 'prefab_buildings',
  // plumbing / water
  'water_treatment', 'tanks_heaters',
  // fire fighting
  'fire_fighting', 'fire_pumps',
  // lifts
  'vertical_transport',
  // scaffolding (erection with the rental)
  'scaffold_structure', 'scaffolding_equip',
])

// `sector` is accepted for future per-sector rules; the keys above are unique across sectors.
export function isInstallable(_sector: string | null | undefined, sub: string | null | undefined): boolean {
  return !!sub && INSTALLABLE_SUBS.has(sub)
}

// Install amount of one item_prices entry (0 when not offered or missing).
export const installTotalOf = (entry: any): number =>
  entry && entry.install_offered ? Math.max(0, Number(entry.install_total) || 0) : 0

// Material part of one item_prices entry: material_total when stored, else total minus install.
export const materialTotalOf = (entry: any): number => {
  if (!entry) return 0
  const m = Number(entry.material_total)
  if (Number.isFinite(m) && entry.material_total != null) return m
  return (Number(entry.total) || 0) - installTotalOf(entry)
}
