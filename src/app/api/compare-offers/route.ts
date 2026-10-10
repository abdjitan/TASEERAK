import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { overHourlyLimit, RATE_LIMITED_AR } from '@/lib/rateLimit'
import { aiJson } from '@/lib/ai'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST /api/compare-offers  { rfqId }
// مستشار مقارنة العروض: يوازن السعر/التوريد/التقييم/التوثيق ويوصّي بالأفضل.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (await overHourlyLimit(supabase, 'compare-offers', user.id, 30)) return NextResponse.json({ error: RATE_LIMITED_AR }, { status: 429 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const rfqId = String(body?.rfqId || '')
  if (!rfqId) return NextResponse.json({ error: 'rfqId required' }, { status: 400 })

  // تحقّق الملكية (المقاول صاحب الطلب أو الأدمن)
  const { data: rfq } = await supabase.from('rfqs').select('id, contractor_id, product_name, items, notes').eq('id', rfqId).single()
  if (!rfq) return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
  if (rfq.contractor_id !== user.id) {
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: offers } = await supabase
    .from('offers')
    .select('id, total_price, delivery_days, vat_included, item_prices, status, supplier:profiles_public(company_name_ar, rating_avg, supplier_tier, city, verification_status)')
    .eq('rfq_id', rfqId)
    .neq('status', 'rejected')
    .order('total_price', { ascending: true })

  const active = (offers || []).filter(o => o.status !== 'rejected')
  if (active.length < 2) {
    return NextResponse.json({ ok: true, enough: false, message: 'لا يوجد عرضان أو أكثر للمقارنة بعد.' })
  }

  const tierAr: Record<string, string> = { manufacturer: 'مصنع', commercial: 'تاجر', local: 'محلي' }
  // Supplier names are supplier-controlled text: never put them in the prompt (prompt injection,
  // OWASP LLM01). The model sees neutral labels; names are mapped back server-side below.
  const labelOf = (i: number) => 'مورد ' + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '')
  const payload = {
    request: rfq.product_name || 'طلب تسعير',
    items_count: Array.isArray(rfq.items) ? rfq.items.length : 1,
    offers: active.map((o, i) => ({
      offer_id: o.id,
      supplier: labelOf(i),
      total_price_sar: o.total_price,
      delivery_days: o.delivery_days ?? null,
      vat_included: !!o.vat_included,
      supplier_rating: (o.supplier as any)?.rating_avg ?? null,
      supplier_type: tierAr[(o.supplier as any)?.supplier_tier] || (o.supplier as any)?.supplier_tier || null,
      verified: (o.supplier as any)?.verification_status === 'verified',
      city: (o.supplier as any)?.city || null,
    })),
  }

  const ai = await aiJson({
    maxTokens: 1500,
    system: `أنت مستشار مشتريات محايد في منصة مقاولات سعودية. قارن عروض الموردين لطلب تسعير واحد.
وازن بين: السعر الإجمالي (ر.س)، مدة التوريد (أيام)، تقييم المورد، نوعه (مصنع/تاجر/محلي)، توثيقه، وشمول السعر للضريبة.
أعد:
- summary: ملخّص موجز للمقارنة بالعربية.
- best_offer_id: معرّف أفضل عرض من القائمة (الأفضل قيمةً عموماً، ليس الأرخص دائماً).
- ranked: ترتيب العروض من الأفضل للأقل، كل عنصر { offer_id, reason } بسبب موجز.
- advice: نصيحة عملية واحدة للمقاول.
كن دقيقاً ومبنياً على الأرقام، ولا تخترع بيانات.`,
    user: `بيانات الطلب والعروض (JSON):\n${JSON.stringify(payload)}`,
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        best_offer_id: { type: 'string' },
        ranked: {
          type: 'array',
          items: { type: 'object', properties: { offer_id: { type: 'string' }, reason: { type: 'string' } }, required: ['offer_id', 'reason'], additionalProperties: false },
        },
        advice: { type: 'string' },
      },
      required: ['summary', 'best_offer_id', 'ranked'],
      additionalProperties: false,
    },
  })

  if (!ai) return NextResponse.json({ ok: true, enough: true, ai: false, message: 'تحليل الذكاء الاصطناعي غير متاح حالياً (المفتاح غير مُفعّل).' })

  // اربط الاسم بأفضل عرض للعرض في الواجهة
  const byId: Record<string, any> = {}
  for (const o of active) byId[o.id] = (o.supplier as any)?.company_name_ar || 'مورد'
  const unlabel = (s: string) => active.reduce((acc: string, o: any, i: number) => acc.split(labelOf(i)).join(byId[o.id]), String(s || ''))
  return NextResponse.json({
    ok: true, enough: true, ai: true,
    summary: unlabel(ai.summary),
    best_offer_id: ai.best_offer_id,
    best_supplier: byId[ai.best_offer_id] || null,
    ranked: (ai.ranked || []).map((r: any) => ({ ...r, reason: unlabel(r.reason), supplier: byId[r.offer_id] || null })),
    advice: unlabel(ai.advice || ''),
  })
}
