// POST /api/email/start { email } — send a 6-digit code to verify an email (owner 2026-11-17,
// migration 220). Works for the signed-in user (web cookie or app Bearer). The code is stored hashed
// for 15 minutes; /api/email/confirm checks it. Sent through Resend (key in notify_config).
import { NextResponse } from 'next/server'
import { createHash, randomInt } from 'crypto'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: Request) {
  const { user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  const { email: raw, locale } = await req.json().catch(() => ({}))
  const email = String(raw || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 200 || email.endsWith('@phone.taseerak.com')) return NextResponse.json({ error: 'bad_email' }, { status: 400 })
  const admin = createAdminSupabaseClient()

  const { data: allowed } = await admin.rpc('check_rate_limit', { p_bucket: 'email-code:' + user.id, p_max: 5, p_window_seconds: 3600 })
  if (allowed === false) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  const { data: taken } = await admin.rpc('email_taken', { p_email: email, p_user: user.id })
  if (taken === true) return NextResponse.json({ error: 'email_taken' }, { status: 409 })

  const code = String(randomInt(0, 1000000)).padStart(6, '0')
  const code_hash = createHash('sha256').update(user.id + ':' + code).digest('hex')
  const { error: sErr } = await admin.from('email_codes').upsert({
    user_id: user.id, email, code_hash, attempts: 0,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), sent_at: new Date().toISOString(),
  })
  if (sErr) return NextResponse.json({ error: 'save' }, { status: 500 })

  const { data: cfg } = await admin.from('notify_config').select('resend_api_key, from_email').eq('id', true).single()
  if (!cfg?.resend_api_key) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const lang = locale === 'en' ? 'en' : locale === 'ur' ? 'ur' : 'ar'
  const T = (en: string, ur: string, ar: string) => (lang === 'en' ? en : lang === 'ur' ? ur : ar)
  const subject = T(`Your Taseerak code: ${code}`, `آپ کا تسعیرک کوڈ: ${code}`, `رمز تسعيرك: ${code}`)
  const line = T('Use this code to verify your email on Taseerak. It expires in 15 minutes.', 'اس کوڈ سے تسعیرک پر اپنی ای میل تصدیق کریں۔ یہ 15 منٹ میں ختم ہو جائے گا۔', 'استخدم هذا الرمز لتوثيق بريدك الإلكتروني في تسعيرك. صالح لمدة 15 دقيقة.')
  const ignore = T('If you did not ask for it, ignore this email.', 'اگر آپ نے یہ نہیں مانگا تو اس ای میل کو نظر انداز کریں۔', 'إن لم تطلبه فتجاهل هذه الرسالة.')
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${cfg.resend_api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Taseerak <${cfg.from_email || 'no-reply@taseerak.com'}>`, to: email, subject,
      text: `${line}\n\n${code}\n\n${ignore}`,
      html: `<div dir="${lang === 'en' ? 'ltr' : 'rtl'}" style="font-family:Tahoma,Arial,sans-serif;max-width:480px;margin:auto"><p style="color:#444">${line}</p><p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#0B2438;text-align:center">${code}</p><p style="color:#999;font-size:12px">${ignore}</p></div>`,
    }),
  })
  if (!r.ok) {
    console.error('email code send', r.status)
    return NextResponse.json({ error: 'send' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
