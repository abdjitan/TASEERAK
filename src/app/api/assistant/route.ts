// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const SYSTEM = `أنت «مساعد تسعيرك» — مساعد ذكي داخل منصة مشتريات مقاولات سعودية اسمها «تسعيرك».
تساعد المقاولين والموردين في:
- فهم كيفية استخدام المنصة (طلبات التسعير، العروض، الترسية، أوامر الشراء، الرسائل، التوثيق).
- صياغة وتوضيح طلبات التسعير ومواصفات المواد.
- معرفة تصنيف مواد البناء والقطاع المناسب لها.
- نصائح عملية في الشراء والمقارنة بين الموردين.
- أسئلة عامة عن مواد ومعدات البناء في السوق السعودي.
أجب بالعربية بإيجاز ووضوح وبأسلوب ودود. استخدم نقاطاً عند الحاجة.
لا تخترع بيانات حساب المستخدم أو أرقاماً غير معطاة لك. لا تقدّم استشارات مالية أو قانونية مُلزِمة — وجّه المستخدم لمختص عند اللزوم.`

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: 'المساعد الذكي غير مُفعّل حالياً. يتم تفعيله قريباً 🤖' })
  }

  let body: any = {}
  try { body = await req.json() } catch {}
  const msgs = Array.isArray(body?.messages) ? body.messages.slice(-12) : []
  const clean = msgs
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'no user message' }, { status: 400 })
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await client.messages.create({
      model: process.env.AI_MODEL || 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM,
      messages: clean,
    })
    const reply = ((resp as any).content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
    return NextResponse.json({ reply: reply || 'لم أفهم تماماً — ممكن توضّح أكثر؟' })
  } catch (e: any) {
    console.error('assistant error:', e?.message || e)
    return NextResponse.json({ reply: 'تعذّر الوصول للمساعد حالياً، حاول بعد قليل.' })
  }
}
