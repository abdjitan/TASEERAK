// Home-screen section order by demand (owner 2026-11-22: what is requested most first, mostly for homes).
// get_section_demand() (migration 252) gives request counts per sub-category for the last 180 days;
// they are summed per browse section. Until there is enough data (MIN_TOTAL requests) a fixed order
// is used: for home buyers the things a home asks for most often (lighting, bathroom, paint, AC...).
import { sectionOfSub, type BrowseSection } from '@/lib/browseCategories'

export const HOME_ORDER: BrowseSection[] = ['electrical', 'plumbing', 'finishing', 'hvac_fire', 'furniture', 'tools', 'insulation', 'outdoor', 'building', 'machinery']
export const BUSINESS_ORDER: BrowseSection[] = ['building', 'finishing', 'electrical', 'plumbing', 'hvac_fire', 'insulation', 'tools', 'machinery', 'furniture', 'outdoor']
const MIN_TOTAL = 20

export type DemandRow = { sub: string; n_home: number; n_all: number }

export function sectionRank(homeBuyer: boolean, demand: DemandRow[] | null | undefined): BrowseSection[] {
  const base = homeBuyer ? HOME_ORDER : BUSINESS_ORDER
  const score: Partial<Record<BrowseSection, number>> = {}
  let total = 0
  for (const r of demand || []) {
    const s = sectionOfSub(r.sub, null)
    const n = Number(homeBuyer ? r.n_home : r.n_all) || 0
    if (!s || !n) continue
    score[s] = (score[s] || 0) + n
    total += n
  }
  if (total < MIN_TOTAL) return base
  return [...base].sort((a, b) => ((score[b] || 0) - (score[a] || 0)) || (base.indexOf(a) - base.indexOf(b)))
}

/** Sort any list of items carrying a section key by the rank (unknown keys keep their place at the end). */
export function bySectionRank<T>(items: T[], key: (t: T) => string, rank: BrowseSection[]): T[] {
  const pos = (k: string) => { const i = rank.indexOf(k as BrowseSection); return i < 0 ? 99 : i }
  return [...items].sort((a, b) => pos(key(a)) - pos(key(b)))
}
