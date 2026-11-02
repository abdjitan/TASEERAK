// Route a tender item to the app's taxonomy (sector → specialty) and propose a catalog product.
// Rules only: the trade sheet («Q MECHANICAL…», «H DOORS AND WINDOWS») gives a strong sector hint,
// the words of the item give the rest. The catalog name is a proposal the company confirms.
import { detectSectorsFromText } from '@/lib/classify'
import { detectSubCategory, type Sector } from '@/types'
import { catalogCandidates } from '@/lib/ai/catalogGround'
import type { TenderItem } from './types'

const TRADE_SECTOR: [RegExp, Sector][] = [
  [/electrical|lighting|earthing|lightning|communication|security|small power|mains and submains/i, 'electrical'],
  [/mechanical|sanitary|disposal installations|water installations|ventilation|air condition|fire protection|fuel installations|plumbing|hvac|drainage/i, 'mechanical'],
  [/doors|windows|finishes|accessories|thermal and moisture|partitions|ceilings|joinery|ironmongery|cladding|roof/i, 'architectural'],
  [/site work|concrete|masonry|metal ?work|structural|earthworks|external works|piling/i, 'civil'],
]

export function sectorOfItem(it: Pick<TenderItem, 'trade' | 'section' | 'description'>): { sector: Sector; score: number } {
  const scores: Record<string, number> = {}
  for (const d of detectSectorsFromText(it.description)) scores[d.sector] = d.score
  const ctx = `${it.trade || ''} ${it.section || ''}`
  const hint = TRADE_SECTOR.find(([re]) => re.test(ctx))?.[1]
  if (hint) scores[hint] = (scores[hint] || 0) + 3
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (!ranked.length) return { sector: 'civil', score: 0 }
  return { sector: ranked[0][0] as Sector, score: ranked[0][1] }
}

/** The words a supplier recognises first: the item's first clause, else the lead-in's. */
export function shortNameOf(it: Pick<TenderItem, 'item_text' | 'lead_in'>): string {
  const first = (s: string) => s.split(/\s*[;:]\s*|\s+—\s+|\.\s/)[0].replace(/\([^)]*\)/g, '').trim()
  const own = first(it.item_text || '')
  // «20 mm», «to reduce level»: too short to name the material → lead-in head + own words
  if (own.split(/\s+/).length < 3 || /^\d|^to\s/i.test(own)) {
    const head = first(it.lead_in || '')
    return [head, own].filter(Boolean).join(' — ').slice(0, 120)
  }
  return own.slice(0, 120)
}

const stem = (w: string) => w.toLowerCase().replace(/(?:ies|es|s)$/, '').slice(0, 6)
function latinCovered(catalogName: string, text: string): boolean {
  const words = (catalogName.match(/[A-Za-z]{3,}/g) || []).map(stem)
  if (words.length < 2) return false // one shared word («Switch», «Stud») is not the same item
  const t = new Set((text.match(/[A-Za-z]{3,}/g) || []).map(stem))
  if (!words.every(w => t.has(w))) return false
  // sizes / grades in the catalog name must be in the text too («Sch 80» is not «Sch. 40»)
  const nums = catalogName.replace(/\([^)]*[؀-ۿ][^)]*\)/g, ' ').match(/\d+(?:\.\d+)?/g) || []
  const tn = new Set(text.match(/\d+(?:\.\d+)?/g) || [])
  return nums.every(n => tn.has(n))
}

export type Routed = {
  sector: Sector
  sub_category: string | null
  product_name: string          // a catalog name when the match is clear, else the BOQ short name
  catalog: boolean
  candidates: { name: string; sector: Sector; score: number }[]
}

export function routeItem(it: TenderItem): Routed {
  const { sector } = sectorOfItem(it)
  const short = shortNameOf(it)
  const sub = detectSubCategory(`${short} ${it.description}`, sector) || null
  let candidates: Routed['candidates'] = []
  try { candidates = catalogCandidates([short, it.item_text].filter(Boolean), sector, 3) } catch { candidates = [] }
  // English tender wording vs Arabic catalog names: accept a catalog item only when every Latin
  // word of its name is in the item's text («Fire Pump» for «Fire pump ref FWEP…», never «Cable
  // Reel» for «Cable Tray»). A wrong catalog name is worse than the BOQ's own words.
  const latinText = /[a-z]{3}/i.test(it.description)
  candidates = candidates.filter(c => !latinText || latinCovered(c.name, it.description))
  const top = candidates[0]
  const clear = !!top && top.score >= 0.8 && (!candidates[1] || top.score - candidates[1].score >= 0.1)
  return {
    sector: clear ? top.sector : sector,
    sub_category: sub || (clear ? detectSubCategory(top.name, top.sector) : null),
    product_name: clear ? top.name : short,
    catalog: clear,
    candidates,
  }
}
