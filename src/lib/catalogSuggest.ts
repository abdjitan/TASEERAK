// Suggest (never force) a catalog product for something a buyer wrote or the AI read from a
// photo. Sizes/numbers are ignored for matching ("بلك 20" must not match "خزان 20م³").
// Returns the catalog name only when it is the same item spelled differently; otherwise a
// separate suggestion the buyer can tap.
import { searchProducts, SEARCH_SYNONYMS } from '@/lib/productSearch'
import { normalizeText } from '@/lib/normalize'
import { toLatinDigits } from '@/lib/phone'
import type { Sector } from '@/types'

export function coreName(s: string): string {
  return toLatinDigits(s || '')
    .replace(/\d+(?:[.,/]\d+)?\s*(?:سم|مم|ملي|مل|م³|م²|م|ألف|الف|طن|كيلو|كغ|cm|mm|m|kg|ton|"|×|x)?/gi, ' ')
    .replace(/[()×x*\-]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function suggestCatalog(name: string, sector?: Sector | null): { exact: string | null; suggestion: { name: string; sector: Sector } | null } {
  const core = coreName(name)
  if (core.length < 2) return { exact: null, suggestion: null }
  const hit = (sector && searchProducts(core, { sector, limit: 1 })[0]) || searchProducts(core, { limit: 1 })[0]
  if (!hit || hit.score < 9 || !sharesNameWord(core, hit.name)) return { exact: null, suggestion: null }
  const same = normalizeText(coreName(hit.name)).replace(/\s+/g, '') === normalizeText(core).replace(/\s+/g, '')
  return same ? { exact: hit.name, suggestion: null } : { exact: null, suggestion: { name: hit.name, sector: hit.sector } }
}

// The suggestion must come from the product NAME (same word, its start, or a known trade
// synonym), not from category keywords: "وايت ماء" must not suggest a welding machine.
const words = (s: string) => normalizeText(coreName(s)).split(' ').map(w => w.replace(/^ال(?=.{3,})/, '')).filter(w => w.length >= 2)
function sharesNameWord(query: string, product: string): boolean {
  const q = words(query), p = words(product)
  if (q.some(a => p.some(b => a === b || (a.length >= 3 && b.startsWith(a)) || (b.length >= 3 && a.startsWith(b))))) return true
  const groups = SEARCH_SYNONYMS.map(g => g.map(w => normalizeText(w)))
  return groups.some(g => q.some(a => g.includes(a)) && p.some(b => g.includes(b)))
}
