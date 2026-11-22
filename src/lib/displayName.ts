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
