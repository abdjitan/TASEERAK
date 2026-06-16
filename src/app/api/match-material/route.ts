import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { aiJson, buildTaxonomyRef } from '@/lib/ai'
import { SECTOR_LABELS, SUB_CATEGORIES, getSubCategoryLabel, GROUP_LABELS } from '@/types'
import { detectSpecialtiesFromText } from '@/lib/classify'

export const runtime = 'nodejs'
export const maxDuration = 30

const SECTORS = ['civil', 'architectural', 'electrical', 'mechanical', 'equipment', 'supply_store']

// POST /api/match-material  { text, sector? }
// يحلّل نصاً حراً لمادة ويُرجع أفضل مطابقة في شجرة الموادنا:
// { sector, sub_category, group, product_name, confidence, source }
// يُستخدم في: طلب مادة جديدة (المقاول/المورد) + تصنيف طلبات المواد (الأدمن).
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const text = String(body?.text || '').trim()
  const hintSector = SECTORS.includes(body?.sector) ? body.sector : null
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  // ── الذكاء الاصطناعي أولاً ──
  const ai = await aiJson({
    maxTokens: 500,
    system: `أنت خبير تصنيف مواد بناء في منصة مشتريات سعودية. ستصلك مادة بنص حر.
حدّد مكانها الصحيح في شجرة الموادنا. أعد:
- sector: واحد من: ${SECTORS.join(', ')}.
- sub_category: مفتاح التخصص الفرعي الصحيح من القائمة أدناه (المفتاح الإنجليزي فقط).
- product_name: اسم مادة مختصر ومرتّب بالعربية.
- confidence: ثقة من 0 إلى 100.
استخدم فقط مفاتيح sub_category الموجودة في الشجرة. شجرة المواد:
${buildTaxonomyRef(SUB_CATEGORIES, SECTOR_LABELS)}`,
    user: `المادة: «${text}»${hintSector ? `\nالقطاع المُرجّح: ${hintSector}` : ''}\nصنّفها.`,
    schema: {
      type: 'object',
      properties: {
        sector: { type: 'string', enum: SECTORS },
        sub_category: { type: 'string' },
        product_name: { type: 'string' },
        confidence: { type: 'integer' },
      },
      required: ['sector', 'sub_category', 'product_name', 'confidence'],
      additionalProperties: false,
    },
  })

  if (ai && (SUB_CATEGORIES as any)[ai.sector]?.[ai.sub_category]) {
    const group = (SUB_CATEGORIES as any)[ai.sector][ai.sub_category].group
    return NextResponse.json({
      ok: true, source: 'ai',
      sector: ai.sector,
      sub_category: ai.sub_category,
      sub_category_label: getSubCategoryLabel(ai.sector, ai.sub_category, 'ar'),
      group,
      group_label: GROUP_LABELS[group]?.ar || group,
      product_name: String(ai.product_name || text).slice(0, 120),
      confidence: Math.max(0, Math.min(100, Number(ai.confidence) || 0)),
    })
  }

  // ── خطة بديلة (كلمات مفتاحية) ──
  const det = detectSpecialtiesFromText(hintSector ? text : `${text}`)
  let sector = hintSector || det.sectors[0] || null
  let subKey: string | null = null
  if (sector) {
    // ابحث عن أول تخصص مكتشف ينتمي لهذا القطاع
    subKey = det.specialties.find(k => (SUB_CATEGORIES as any)[sector]?.[k]) || null
  }
  if (!subKey && det.specialties.length) {
    subKey = det.specialties[0]
    for (const s of SECTORS) if ((SUB_CATEGORIES as any)[s]?.[subKey]) { sector = s; break }
  }
  if (sector && subKey && (SUB_CATEGORIES as any)[sector]?.[subKey]) {
    const group = (SUB_CATEGORIES as any)[sector][subKey].group
    return NextResponse.json({
      ok: true, source: 'keyword',
      sector, sub_category: subKey,
      sub_category_label: getSubCategoryLabel(sector, subKey, 'ar'),
      group, group_label: GROUP_LABELS[group]?.ar || group,
      product_name: text.slice(0, 120),
      confidence: 50,
    })
  }

  return NextResponse.json({ ok: true, source: 'none', sector: hintSector, sub_category: null, product_name: text, confidence: 0 })
}
