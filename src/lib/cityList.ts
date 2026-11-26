// All the cities of CITIES_BY_REGION (src/types) as one flat list, each with its region, for a single
// searchable «المدينة» picker (owner 2026-11-26): the region is derived from the chosen city.
import { CITIES_BY_REGION, getRegionLabel } from '@/types'
import { normalizeText } from '@/lib/normalize'

export type CityOption = { ar: string; en: string; region: string; dup: boolean }

export const ALL_CITIES: CityOption[] = (() => {
  const flat = Object.entries(CITIES_BY_REGION).flatMap(([region, list]) => list.map(c => ({ ar: c.ar, en: c.en, region })))
  const count: Record<string, number> = {}
  for (const c of flat) count[c.ar] = (count[c.ar] || 0) + 1
  return flat.map(c => ({ ...c, dup: count[c.ar] > 1 }))
})()

/** The city in the reader's language (Urdu readers read the Arabic city names), with its region in
 *  brackets when the same name exists in two regions. */
export function cityOptionLabel(c: CityOption, locale: string): string {
  const name = locale === 'en' ? c.en : c.ar
  return c.dup ? `${name} (${getRegionLabel(c.region, locale)})` : name
}

/** The option for a saved city + region (region disambiguates a duplicated name). */
export function findCityOption(city: string, region: string): CityOption | null {
  if (!city) return null
  return ALL_CITIES.find(c => c.ar === city && c.region === region) || ALL_CITIES.find(c => c.ar === city) || null
}

/** Cities matching a typed query (Arabic tolerant: hamza/ة/ى folding; English case-insensitive). */
export function searchCities(q: string, locale: string): CityOption[] {
  const n = normalizeText(q)
  if (!n) return ALL_CITIES
  return ALL_CITIES.filter(c => normalizeText(c.ar).includes(n) || normalizeText(c.en).includes(n)
    || normalizeText(getRegionLabel(c.region, locale)).includes(n) || normalizeText(c.region).includes(n))
}
