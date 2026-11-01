// Ground a name (typed by the buyer, read from a photo, or proposed by the AI) in the catalog:
// the final product name is the catalog's own Arabic name whenever it is the same item, and the
// top candidates come with a 0–1 score so the page can offer «هل تقصد…» and the lab can show why.
// Retrieval is our product search (synonyms, typos, learned words); the AI never invents the name.
import { searchProducts } from '@/lib/productSearch'
import { suggestCatalog, coreName } from '@/lib/catalogSuggest'
import { normalizeText } from '@/lib/normalize'
import { SECTOR_PRODUCTS, type Sector } from '@/types'

let SECTOR_OF: Map<string, Sector> | null = null
/** The sector a catalog product is listed under (its first one), or null for a free-text name. */
export function sectorOfProduct(name: string, prefer?: Sector | null): Sector | null {
  if (prefer && (SECTOR_PRODUCTS[prefer] || []).includes(name)) return prefer
  if (!SECTOR_OF) {
    SECTOR_OF = new Map()
    for (const s of Object.keys(SECTOR_PRODUCTS) as Sector[]) for (const p of SECTOR_PRODUCTS[s]) if (!SECTOR_OF.has(p)) SECTOR_OF.set(p, s)
  }
  return SECTOR_OF.get(name) || null
}

export type Candidate ={ name: string; sector: Sector; score: number }
export type Grounded = {
  product_name: string          // catalog name when exact, else the cleaned input
  exact: boolean
  suggestion: { name: string; sector: Sector } | null
  candidates: Candidate[]       // up to 3, best first
  extra_details: string | null  // words dropped to reach the catalog name («اسمنت مقاوم» → «مقاوم»)
}

/** Top catalog candidates for one or more names (e.g. the AI's name + its alternatives). */
export function catalogCandidates(names: string[], sector?: Sector | null, limit = 3): Candidate[] {
  const best = new Map<string, Candidate>()
  for (const raw of names.filter(Boolean).slice(0, 4)) {
    const core = coreName(raw)
    if (core.length < 2) continue
    const hits = [...(sector ? searchProducts(core, { sector, limit: 5 }) : []), ...searchProducts(core, { limit: 6 })]
    const top = hits.reduce((m, h) => Math.max(m, h.score), 0) || 1
    for (const h of hits) {
      if (h.score < 9) continue
      // relative to the best hit of this query, nudged by absolute strength (a 30+ hit is a clear match)
      const s = Math.min(1, (h.score / top) * 0.7 + Math.min(h.score, 40) / 40 * 0.3)
      const k = h.sector + '|' + h.name
      const prev = best.get(k)
      if (!prev || prev.score < s) best.set(k, { name: h.name, sector: h.sector, score: Math.round(s * 100) / 100 })
    }
  }
  return Array.from(best.values()).sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Exact catalog match for the whole name, or for a shorter head of it («اسمنت مقاوم للكبريت» →
 * «أسمنت» + details «مقاوم للكبريت»). Shorter heads are tried only down to the first word.
 */
export function groundName(name: string, sector?: Sector | null, details?: string | null): Grounded {
  const clean = (name || '').trim()
  const full = suggestCatalog(clean, sector || null, details || null)
  const candidates = catalogCandidates([clean], sector)
  if (full.exact) return { product_name: full.exact, exact: true, suggestion: null, candidates, extra_details: null }
  // a more specific catalog item that holds every word written, and is the clear best
  // («اسمنت مقاوم» → «أسمنت مقاوم للكبريتات (SRC)»)
  const top = candidates[0]
  if (top && top.score >= 0.9 && (!candidates[1] || candidates[1].score < top.score) && covers(clean, top.name)) {
    return { product_name: top.name, exact: true, suggestion: null, candidates, extra_details: null }
  }
  const words = clean.split(/\s+/)
  for (let n = words.length - 1; n >= 1; n--) {
    const head = words.slice(0, n).join(' ')
    if (normalizeText(head).length < 3) break
    const m = suggestCatalog(head, sector || null, details || null)
    if (m.exact) return { product_name: m.exact, exact: true, suggestion: null, candidates, extra_details: words.slice(n).join(' ') }
  }
  return { product_name: clean, exact: false, suggestion: full.suggestion, candidates, extra_details: null }
}

const wordsOf = (s: string) => normalizeText(coreName(s)).replace(/[()[\]{}،,/\\«»"'\-]/g, ' ').split(/\s+/).map(w => w.replace(/^(?:وال|بال|ال)(?=.{3,})/, '')).filter(w => w.length >= 2)
/** Every written word (≥ 3 letters) starts a word of the product name. */
function covers(query: string, product: string): boolean {
  const q = wordsOf(query).filter(w => w.length >= 3), p = wordsOf(product)
  return q.length > 0 && q.every(a => p.some(b => b.startsWith(a) || (a.length >= 4 && a.startsWith(b) && b.length >= 3)))
}

/** «هل تقصد X أم Y؟» when the two best candidates are close (one question that splits them). */
export function splitQuestion(c: Candidate[]): { ar: string; en: string } | null {
  if (c.length < 2 || c[0].score - c[1].score > 0.12) return null
  return { ar: `هل المادة «${c[0].name}» أم «${c[1].name}»؟`, en: `Is it «${c[0].name}» or «${c[1].name}»?` }
}
