// تصنيف خادمي معتمد على قاعدة البيانات: يقرأ كلمات جدول taxonomy (بما فيها إضافات
// الأدمن) ويصنّف بها — فأي تعديل للكلمات يسري فوراً دون نشر جديد. مع كاش بالذاكرة.
import { createServiceClient } from '@/lib/supabase/server'
import { normalizeText } from '@/lib/normalize'

export type TaxRow = { sector: string; sub_key: string; keywords: string[] }

let cache: { rows: TaxRow[]; at: number } | null = null
const TTL = 5 * 60 * 1000 // 5 دقائق

// يجلب صفوف التصنيف من الـDB (service-role، يتجاوز RLS لقراءة بيانات مرجعية غير حسّاسة).
export async function getTaxonomyRows(): Promise<TaxRow[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows
  try {
    const c = createServiceClient()
    const { data } = await c.from('taxonomy').select('sector, sub_key, keywords').eq('is_active', true)
    const rows: TaxRow[] = (data || []).map((r: any) => ({
      sector: r.sector,
      sub_key: r.sub_key,
      keywords: Array.isArray(r.keywords) ? r.keywords : [],
    }))
    cache = { rows, at: Date.now() }
    return rows
  } catch {
    return cache?.rows || []
  }
}

// نفس خوارزمية detectSubCategory لكن على كلمات الـDB (أعلى نتيجة تفوز).
export function detectSubCategoryDb(text: string, sector: string, rows: TaxRow[]): string | null {
  const norm = normalizeText(text)
  let best: string | null = null
  let max = 0
  for (const r of rows) {
    if (r.sector !== sector) continue
    let score = 0
    for (const kw of r.keywords) {
      const nkw = normalizeText(kw)
      if (nkw.length > 0 && norm.includes(nkw)) score++
    }
    if (score > max) { max = score; best = r.sub_key }
  }
  return best
}
