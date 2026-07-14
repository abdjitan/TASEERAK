import { NextResponse } from 'next/server'
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// تسجيل الدخول برقم الجوال (المرحلة الأولى — بكلمة المرور؛ OTP لاحقاً).
// نحوّل الرقم→البريد على الخادم فقط (البريد لا يُعاد للعميل إطلاقاً)، ونسجّل الدخول من
// الخادم بجلسة كوكيز (العميل يقرأها لأن المتصفح يخزّن الجلسة في الكوكيز). رسالة الخطأ
// عامّة دائماً حتى لا يُستدل على رقم مسجّل — لا يُكشف البريد إلا لمن يملك كلمة المرور أصلاً.
export async function POST(req: Request) {
  try {
    const { phone, password, captchaToken } = await req.json().catch(() => ({}))
    const p = String(phone || '').trim()
    if (!/^05[0-9]{8}$/.test(p) || typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }

    const svc = createServiceClient()
    const { data: rows } = await svc.from('profiles').select('id, role, region').eq('phone', p).limit(1)
    const prof = rows?.[0]
    if (!prof?.id) return NextResponse.json({ error: 'invalid' }, { status: 401 })

    const { data: u } = await svc.auth.admin.getUserById(prof.id)
    const email = u?.user?.email
    if (!email) return NextResponse.json({ error: 'invalid' }, { status: 401 })

    // يسجّل الدخول ويضبط كوكيز الجلسة على الاستجابة.
    const server = createServerSupabaseClient()
    const { data: signin, error } = await server.auth.signInWithPassword({
      email, password, options: { captchaToken: captchaToken || undefined },
    })
    if (error || !signin?.session) {
      if (/captcha/i.test(error?.message || '')) return NextResponse.json({ error: 'captcha' }, { status: 400 })
      return NextResponse.json({ error: 'invalid' }, { status: 401 })
    }

    return NextResponse.json({ ok: true, role: prof.role || null, region: prof.region || null })
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
