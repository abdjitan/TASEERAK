import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { keywordClassify } from '@/lib/classify'
import { SECTOR_LABELS } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

const ALLOWED_SECTORS = ['civil', 'architectural', 'electrical', 'mechanical', 'equipment', 'supply_store']

// POST /api/classify-supplier  { supplierId? }
// - No supplierId  → classify the signed-in supplier (used right after registration).
// - With supplierId → admin re-classifies a specific supplier.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const targetId = body.supplierId || user.id

  // Only an admin may classify someone else.
  if (targetId !== user.id) {
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Load the target supplier + their chosen sectors.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, verification_status, company_name_ar, company_name_en, supplier_tier, cr_activity, cr_official_name, commercial_registration')
    .eq('id', targetId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  if (profile.role !== 'supplier') return NextResponse.json({ error: 'Not a supplier' }, { status: 400 })

  const { data: sectorRows } = await supabase.from('profile_sectors').select('sector').eq('profile_id', targetId)
  const chosenSectors = (sectorRows || []).map(r => r.sector)

  // ---- Layer 1: keyword (always runs, free, offline) ----
  let result = keywordClassify({
    companyNameAr: profile.company_name_ar,
    companyNameEn: profile.company_name_en,
    crActivity: profile.cr_activity,
    chosenSectors,
    chosenTier: profile.supplier_tier,
  })
  let source = 'keyword'

  // ---- Layer 2: AI (Claude Haiku) — refines the gray cases when a key is set ----
  // Runs when Layer 1 is unsure ('review') or flags a conflict ('mismatch').
  if (process.env.ANTHROPIC_API_KEY && result.verdict !== 'match') {
    try {
      const ai = await classifyWithClaude({
        companyNameAr: profile.company_name_ar,
        companyNameEn: profile.company_name_en,
        crActivity: profile.cr_activity,
        crOfficialName: profile.cr_official_name,
        chosenSectors,
        chosenTier: profile.supplier_tier,
      })
      if (ai) { result = ai; source = 'ai' }
    } catch (e) {
      // AI failed → keep the keyword verdict. Never block on the AI layer.
      console.error('classify-supplier AI error:', (e as any)?.message || e)
    }
  }

  // ---- Persist the verdict ----
  const update: any = {
    auto_classification: result.verdict,
    auto_classification_note: result.reason,
    auto_classification_confidence: result.confidence,
    auto_classification_source: source,
    auto_classified_at: new Date().toISOString(),
  }

  await supabase.from('profiles').update(update).eq('id', targetId)

  // ---- Auto-verify a clear, confident match (only while still pending) ----
  // Verification fields are locked against client/authenticated writes, so we
  // set them from the TRUSTED SERVER only (service role → admin_set_verification).
  // This keeps verification automatic/AI-driven without reopening the spoof hole.
  // 🔒 SECURITY (C1): AI classification is ADVISORY ONLY — it NEVER grants "verified" status.
  // The classifier reads the supplier's SELF-PROVIDED company name / activity (not a trusted
  // document), so auto-verifying on it would let anyone self-verify by naming their company
  // convincingly. Real verification requires Wathq (verify-identity) or explicit admin approval.
  // The classification stored above is kept purely as a hint for the admin to review.
  const autoVerified = false

  return NextResponse.json({ ok: true, ...result, source, autoVerified })
}

// ---------------------------------------------------------------------
// Claude (Haiku) classification with structured JSON output.
// ---------------------------------------------------------------------
async function classifyWithClaude(input: {
  companyNameAr?: string | null
  companyNameEn?: string | null
  crActivity?: string | null
  crOfficialName?: string | null
  chosenSectors: string[]
  chosenTier?: string | null
}) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const sectorList = ALLOWED_SECTORS.map(s => `${s} (${(SECTOR_LABELS as any)[s] || s})`).join(', ')

  const facts = [
    `الاسم (عربي): ${input.companyNameAr || '—'}`,
    `الاسم (إنجليزي): ${input.companyNameEn || '—'}`,
    `الاسم الرسمي بالسجل: ${input.crOfficialName || '—'}`,
    `النشاط في السجل التجاري: ${input.crActivity || '— (غير متوفر)'}`,
    `القطاعات التي اختارها المورد: ${input.chosenSectors.join('، ') || '—'}`,
    `نوع المورد المُعلن: ${input.chosenTier || '—'}`,
  ].join('\n')

  const system = `أنت مدقّق تصنيف موردين في منصة مشتريات مقاولات سعودية.
مهمتك: قرّر هل القطاعات التي اختارها المورد تطابق نشاطه الحقيقي (من اسمه ونشاط سجله التجاري).
القطاعات المسموحة: ${sectorList}.
أنواع المورد: manufacturer (مصنع / مورد رئيسي) ، commercial (مورد تجاري) ، local (مورد محلي).
- verdict = "match" إذا كان الاختيار منطقياً ومتوافقاً مع النشاط.
- verdict = "mismatch" إذا كان النشاط يدل بوضوح على قطاع مختلف عمّا اختاره.
- verdict = "review" إذا لم تكن المعلومات كافية للحكم.
أعطِ confidence من 0 إلى 100، واقترح القطاعات الصحيحة ونوع المورد إن أمكن، وسبباً موجزاً بالعربية.`

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system,
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            verdict: { type: 'string', enum: ['match', 'review', 'mismatch'] },
            confidence: { type: 'integer' },
            correct_sectors: { type: 'array', items: { type: 'string', enum: ALLOWED_SECTORS } },
            suggested_tier: { type: 'string', enum: ['manufacturer', 'commercial', 'local'] },
            reason: { type: 'string' },
          },
          required: ['verdict', 'confidence', 'reason'],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: 'user', content: `بيانات المورد:\n${facts}\n\nصنّف هذا المورد.` }],
  })

  const text = ((resp.content || []).find((b: any) => b.type === 'text') as any)?.text
  if (!text) return null
  const j = JSON.parse(text)

  const verdict = ['match', 'review', 'mismatch'].includes(j.verdict) ? j.verdict : 'review'
  const confidence = Math.max(0, Math.min(100, Number(j.confidence) || 0))
  const detectedSectors = Array.isArray(j.correct_sectors) ? j.correct_sectors : []
  const suggestedTier = ['manufacturer', 'commercial', 'local'].includes(j.suggested_tier) ? j.suggested_tier : null

  return {
    verdict,
    confidence,
    detectedSectors,
    suggestedTier,
    reason: String(j.reason || '').slice(0, 400),
  }
}
