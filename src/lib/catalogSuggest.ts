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

// Sizes don't decide WHAT the item is, but among near-equal matches they pick the right one:
// "سلك" + "2.5" -> "سلك كهرباء 2.5مم" rather than "سلك تأريض".
export function suggestCatalog(name: string, sector?: Sector | null, details?: string | null): { exact: string | null; suggestion: { name: string; sector: Sector } | null } {
  // A brand the AI left in the name but also put in details ("سلك الفنار" + "الفنار") is not
  // part of what the item is.
  const detailWords = new Set(normalizeText(details || '').split(/[\s،,]+/).filter(w => w.length >= 2))
  const fullCore = coreName(name)
  const kept = fullCore.split(' ').filter(w =>!detailWords.has(normalizeText(w)))
  const core = kept.length ? kept.join(' ') : fullCore
  if (core.length < 2) return { exact: null, suggestion: null }
  const numsOf = (s: string): string[] => toLatinDigits(s).match(/\d+(?:\.\d+)?/g) || []
  const nums = numsOf(`${name} ${details || ''}`)
  const sizedIn = (hits: ReturnType<typeof searchProducts>) => nums.length
    ? hits.find(h => h.score >= hits[0].score * 0.7 && sharesNameWord(core, h.name) && numsOf(h.name).some(n => nums.includes(n)))
    : undefined
  const inSector = sector ? searchProducts(core, { sector, limit: 8 }) : []
  const global = searchProducts(core, { limit: 12 })
  // A brand/adjective after the noun ("سلك الفنار") can outweigh the noun, so the size is also
  // looked up on the head noun alone (Arabic puts it first).
  const head = core.split(' ')[0]
  const headHits = nums.length && head !== core && head.length >= 2 ? searchProducts(head, { limit: 12 }) : []
  // The sector is the AI's guess and can be wrong ("ثيل" filed under finishing): a weak hit inside
  // it must not beat a clearly better one in the whole catalog.
  const top = !inSector[0] ? global[0] : !global[0] ? inSector[0] : inSector[0].score >= global[0].score * 0.85 ? inSector[0] : global[0]
  const hit = sizedIn(inSector) || sizedIn(global) || sizedIn(headHits) || top
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
