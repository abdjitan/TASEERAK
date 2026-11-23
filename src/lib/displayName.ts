// A cleaner Arabic display name for home buyers (UX study 2026-11-22: half the catalog names carry
// English, e.g. «مغسلة Wash Basin», «خلاط دفن (Concealed Mixer Valve)»). Display only: the stored
// product_name sent to suppliers never changes. Model codes with digits (GU10, C1, 4×16) are kept.
export function cleanArName(name: string): string {
  if (!name) return name
  let s = name.replace(/\s*\((?=[^)]*[A-Za-z])[^)]*\)/g, '')        // «(Concealed Mixer Valve)»
  s = s.replace(/(\s+[A-Za-z][A-Za-z'&.\-]{2,})+\s*$/g, '')           // trailing plain English words
  s = s.replace(/\s{2,}/g, ' ').trim()
  return /[؀-ۿ]/.test(s) ? s : name                           // never leave an empty/Latin-only name
}

/** The product name to show: a home buyer reading Arabic gets cleanArName; everyone else getProductLabel. */
import { getProductLabel } from '@/types'
export function displayProductName(name: string, locale: string, homeBuyer: boolean): string {
  if (!name) return name
  return homeBuyer && locale === 'ar' ? cleanArName(name) : getProductLabel(name, locale)
}

// A city/region in the reader's language (round-5 UX-140): English readers get the English names; Urdu
// readers the Urdu region name and the city in the shared Arabic script (no Latin next to Urdu).
import { CITIES_BY_REGION, getRegionLabel } from '@/types'
export function getPlaceLabel(city: string | null | undefined, region: string | null | undefined, locale: string): string {
  const c = String(city || '').trim(), r = String(region || '').trim()
  const cityL = (name: string) => {
    if (!name || locale !== 'en') return name
    for (const list of Object.values(CITIES_BY_REGION)) { const hit = list.find(x => x.ar === name); if (hit) return hit.en }
    return name
  }
  const parts = [cityL(c), r ? getRegionLabel(r, locale) : ''].filter(Boolean)
  // the city and its region, once («الرياض، منطقة الرياض» → keep both only when they differ)
  return Array.from(new Set(parts)).join(locale === 'en' ? ', ' : '، ')
}
