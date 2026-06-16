import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { aiJson } from '@/lib/ai'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST /api/assist-rfq  { product_name, sector?, rough? }
// مساعد كتابة الطلب / استخراج المواصفات: يحوّل وصفاً خاماً إلى مواصفات احترافية.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const product = String(body?.product_name || '').trim()
  const rough = String(body?.rough || '').trim()
  if (!product) return NextResponse.json({ error: 'product_name required' }, { status: 400 })

  const ai = await aiJson({
    maxTokens: 600,
    system: `أنت مهندس مشتريات خبير في السوق السعودي. ستصلك مادة بناء ووصف خام من المقاول.
اكتب مواصفات احترافية موجزة ومرتبة لطلب التسعير بالعربية، تشمل ما يهمّ المورد فعلاً حسب نوع المادة
(المقاس، الدرجة/القوة، المعيار، التشطيب، العلامة إن لزم). أعد:
- specification: مواصفات نظيفة في سطر إلى سطرين، بدون مقدمات أو حشو.
- questions: حتى 3 أسئلة قصيرة لمعلومات ناقصة تساعد المورد على تسعير أدق (أو مصفوفة فارغة).`,
    user: `المادة: ${product}\nالوصف الخام من المقاول: ${rough || '— (لا يوجد، اقترح مواصفات قياسية مناسبة)'}`,
    schema: {
      type: 'object',
      properties: {
        specification: { type: 'string' },
        questions: { type: 'array', items: { type: 'string' } },
      },
      required: ['specification'],
      additionalProperties: false,
    },
  })

  if (!ai) return NextResponse.json({ ok: true, ai: false, message: 'مساعد المواصفات غير مُفعّل حالياً (المفتاح غير مضبوط).' })
  return NextResponse.json({
    ok: true, ai: true,
    specification: String(ai.specification || '').slice(0, 300),
    questions: (ai.questions || []).filter(Boolean).slice(0, 3),
  })
}
