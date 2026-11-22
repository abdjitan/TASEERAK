// POST /api/auth/fix-signup-email { email, password, newEmail, captchaToken? } → { ok } | { error }
// Owner 2026-11-22: a seller typed «gmail.comm», the confirmation link went nowhere and the account was
// stuck (a new sign-up is refused because the phone is taken). While the e-mail is NOT confirmed yet, the
// owner of the account can correct it here and get a new link.
// Proof of ownership: the e-mail + password they signed up with. Supabase answers a correct password on an
// unconfirmed account with «email_not_confirmed» (a wrong password gives «invalid_credentials»), so only
// that answer lets the change through. Confirmed accounts are never touched (they change e-mail in Settings).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const err = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status })

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 200)
  const password = String(body?.password || '').slice(0, 200)
  const newEmail = String(body?.newEmail || '').trim().toLowerCase().slice(0, 200)
  if (!email || !password || !EMAIL_RE.test(newEmail)) return err('bad_request')
  if (newEmail === email) return err('same_email')

  const admin = createAdminSupabaseClient()
  // 5 tries an hour per account e-mail, 200 a day in total
  try {
    const { data: okEmail } = await admin.rpc('check_rate_limit', { p_bucket: `fix-signup-email:${email}`, p_max: 5, p_window_seconds: 3600 })
    const { data: okAll } = await admin.rpc('check_rate_limit', { p_bucket: 'fix-signup-email:global', p_max: 200, p_window_seconds: 86400 })
    if (okEmail === false || okAll === false) return err('rate', 429)
  } catch { return err('rate', 429) }

  // ownership: the password must be right AND the account unconfirmed
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: si, error: siErr } = await anon.auth.signInWithPassword({ email, password, options: { captchaToken: body?.captchaToken || undefined } } as any)
  if (!siErr) {
    if (si?.session) await anon.auth.signOut().catch(() => {})
    return err('already_confirmed')
  }
  const code = (siErr as any)?.code || ''
  if (/captcha/i.test(siErr.message || '')) return err('captcha')
  if (code !== 'email_not_confirmed' && !/not confirmed/i.test(siErr.message || '')) return err('bad_credentials', 401)

  const { data: rows } = await admin.rpc('admin_user_by_email', { p_email: email })
  const u = Array.isArray(rows) ? rows[0] : null
  if (!u?.id || u.email_confirmed) return err('bad_credentials', 401)
  if (Date.now() - new Date(u.created_at).getTime() > 14 * 24 * 3600 * 1000) return err('too_old')
  const { data: taken } = await admin.rpc('admin_user_by_email', { p_email: newEmail })
  if (Array.isArray(taken) && taken[0]?.id) return err('email_taken', 409)

  const { error: upErr } = await admin.auth.admin.updateUserById(u.id, { email: newEmail })
  if (upErr) return err(/already|exists|registered/i.test(upErr.message || '') ? 'email_taken' : 'update_failed', 500)
  const origin = req.headers.get('origin') || 'https://taseerak.com'
  const { error: rsErr } = await anon.auth.resend({ type: 'signup', email: newEmail, options: { emailRedirectTo: `${origin}/login` } })
  return NextResponse.json({ ok: true, resent: !rsErr })
}
