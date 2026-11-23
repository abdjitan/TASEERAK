import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/supabase/server'
import { overHourlyLimit, overGlobalDailyLimit, RATE_LIMITED_AR } from '@/lib/rateLimit'
import { aiText, AI_ENABLED } from '@/lib/ai'

export const runtime = 'nodejs'
export const maxDuration = 30

const SYSTEM = `أنت «مساعد تسعيرك» — مساعد ذكي داخل منصة سعودية لتسعير مواد البناء وتوريدها اسمها «تسعيرك».
تساعد المشترين (مقاولين وأصحاب مشاريع وأفراداً) والموردين في:
- فهم كيفية استخدام المنصة (طلبات التسعير، العروض، اختيار العرض، أوامر الشراء، الرسائل، التوثيق).
- صياغة وتوضيح طلبات التسعير ومواصفات المواد.
- معرفة تصنيف مواد البناء والقطاع المناسب لها.
- نصائح عملية في الشراء والمقارنة بين الموردين.
- أسئلة عامة عن مواد ومعدات البناء في السوق السعودي.
أجب بلغة رسالة المستخدم (العربية الفصحى أو الإنجليزية أو الأردية) بإيجاز ووضوح وبأسلوب ودود، ودون رموز تعبيرية. استخدم نقاطاً عند الحاجة.
لا تخترع بيانات حساب المستخدم أو أرقاماً غير معطاة لك. لا تقدّم استشارات مالية أو قانونية مُلزِمة — وجّه المستخدم لمختص عند اللزوم.`

// the floating button asks first and hides itself while the assistant is switched off (UX-113)
export async function GET() {
  return NextResponse.json({ enabled: !!AI_ENABLED })
}

const fallback = (locale: string) => locale === 'en' ? 'The assistant cannot be reached right now. Please try again shortly.'
  : locale === 'ur' ? 'اسسٹنٹ سے ابھی رابطہ نہیں ہو سکا، تھوڑی دیر بعد کوشش کریں۔'
  : 'تعذّر الوصول إلى المساعد حالياً، حاول بعد قليل.'

export async function POST(req: NextRequest) {
  const { supabase: supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (await overHourlyLimit(supabase, 'assistant', user.id, 60)) return NextResponse.json({ error: RATE_LIMITED_AR }, { status: 429 })
  // ceiling across all users per day, so many accounts together can't run up the AI bill
  if (await overGlobalDailyLimit('assistant', 2000)) return NextResponse.json({ error: RATE_LIMITED_AR, error_en: 'Too many requests right now, please try again later.' }, { status: 429 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const locale = ['en', 'ur'].includes(body?.locale) ? body.locale : 'ar'
  if (!AI_ENABLED) {
    return NextResponse.json({ disabled: true, reply: locale === 'en' ? 'The assistant is not available at the moment.' : locale === 'ur' ? 'اسسٹنٹ فی الحال دستیاب نہیں۔' : 'المساعد غير متاح حالياً.' })
  }
  const msgs = Array.isArray(body?.messages) ? body.messages.slice(-12) : []
  const clean = msgs
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'no user message' }, { status: 400 })
  }

  const reply = await aiText(SYSTEM, clean, 1024)
  if (!reply) return NextResponse.json({ error: 'unavailable', reply: fallback(locale) }, { status: 503 })
  return NextResponse.json({ reply })
}
