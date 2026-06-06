// =============================================================
// Supplier auto-classification — Layer 1 (keyword / offline)
// =============================================================
// Compares what a supplier CLAIMS (chosen sectors + tier) against the
// real activity signal we have (company name + official CR activity from
// Wathq, when available). Pure + isomorphic — no network, no API key.
// The AI layer (Claude) in /api/classify-supplier refines the gray cases.

import { SUB_CATEGORIES, type Sector } from '@/types'
import { normalizeText } from '@/lib/normalize'

export type Verdict = 'match' | 'review' | 'mismatch'

// كلمات تدل على نوع المورد (مصنع / موزع / محلي)
const TIER_HINTS: Record<string, string[]> = {
  manufacturer: ['مصنع', 'مصانع', 'تصنيع', 'إنتاج', 'factory', 'manufactur', 'plant', 'industries', 'industrial', 'production'],
  commercial: ['موزع', 'موزّع', 'توزيع', 'استيراد', 'تصدير', 'وكيل', 'وكالة', 'تجارة', 'تجارية', 'distributor', 'import', 'export', 'trading', 'agency', 'agent', 'wholesale'],
  local: ['محل', 'متجر', 'مؤسسة', 'مستلزمات', 'بقالة', 'store', 'shop', 'retail', 'establishment'],
}

/** Score each sector by how many of its sub-category keywords appear in the text. */
export function detectSectorsFromText(text: string): { sector: Sector; score: number }[] {
  const norm = normalizeText(text)
  if (!norm) return []
  const scores: Record<string, number> = {}
  for (const [sector, subs] of Object.entries(SUB_CATEGORIES)) {
    let s = 0
    for (const sub of Object.values(subs as Record<string, { keywords: string[] }>)) {
      for (const kw of sub.keywords) {
        const nkw = normalizeText(kw)
        if (nkw && nkw.length >= 3 && norm.includes(nkw)) s++
      }
    }
    if (s > 0) scores[sector] = s
  }
  return Object.entries(scores)
    .map(([sector, score]) => ({ sector: sector as Sector, score }))
    .sort((a, b) => b.score - a.score)
}

/** Guess the supplier tier (factory / distributor / local) from free text. */
export function detectTierFromText(text: string): 'manufacturer' | 'commercial' | 'local' | null {
  const norm = normalizeText(text)
  if (!norm) return null
  for (const tier of ['manufacturer', 'commercial', 'local'] as const) {
    if (TIER_HINTS[tier].some(h => { const n = normalizeText(h); return n && norm.includes(n) })) {
      return tier
    }
  }
  return null
}

export interface ClassifyInput {
  companyNameAr?: string | null
  companyNameEn?: string | null
  crActivity?: string | null
  chosenSectors: string[]
  chosenTier?: string | null
}

export interface ClassifyResult {
  verdict: Verdict
  confidence: number          // 0..100
  detectedSectors: string[]
  suggestedTier: string | null
  reason: string              // Arabic, shown to admin
}

/**
 * Layer-1 verdict from keywords alone.
 *   match    → claimed sectors overlap the activity signal
 *   mismatch → activity clearly points elsewhere than what was chosen
 *   review   → no usable keyword signal (needs the AI layer or a human)
 */
export function keywordClassify(input: ClassifyInput): ClassifyResult {
  const activityText = [input.companyNameAr, input.companyNameEn, input.crActivity]
    .filter(Boolean)
    .join(' ')
  const detected = detectSectorsFromText(activityText)
  const detectedSectors: string[] = detected.map(d => d.sector)
  const suggestedTier = detectTierFromText(activityText)
  const chosen = input.chosenSectors || []

  if (detected.length === 0) {
    return {
      verdict: 'review',
      confidence: 25,
      detectedSectors: [],
      suggestedTier,
      reason: 'لا توجد كلمات دالة في الاسم أو نشاط السجل — يحتاج مراجعة',
    }
  }

  const overlap = chosen.some(c => detectedSectors.includes(c))
  if (overlap) {
    return {
      verdict: 'match',
      confidence: 80,
      detectedSectors,
      suggestedTier,
      reason: 'التخصصات المختارة تطابق نشاط الشركة',
    }
  }

  return {
    verdict: 'mismatch',
    confidence: 65,
    detectedSectors,
    suggestedTier,
    reason: `النشاط يدل على (${detectedSectors.join('، ')}) بينما المورد اختار (${chosen.join('، ') || '—'})`,
  }
}
