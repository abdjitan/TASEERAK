// POST /api/auth/fix-signup-email { email, password, newEmail } | { email, password, action: 'resend' } → { ok } | { error }
// Owner 2026-11-22: a seller typed «gmail.comm», the confirmation link went nowhere and the account was
// stuck (a new sign-up is refused because the phone is taken). While the e-mail is NOT confirmed yet, the
// owner of the account can correct it here and get a new link.
// Proof of ownership: the e-mail + password they signed up with, checked against the stored bcrypt hash
// (admin_account_owner, migrations 254/255) and only while the e-mail is unconfirmed. Confirmed accounts are never touched (they change e-mail in Settings).
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const err = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status })

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 200)
  const password = String(body?.password || '').slice(0, 200)
  const newEmail = String(body?.newEmail || '').trim().toLowerCase().slice(0, 200)
  const resendOnly = body?.action === 'resend'   // just send the link again to the same address
  if (!email || !password || (!resendOnly && !EMAIL_RE.test(newEmail))) return err('bad_request')
  if (!resendOnly && newEmail === email) return err('same_email')

  const admin = createAdminSupabaseClient()
  // 5 tries an hour per account e-mail, 200 a day in total
  try {
    const { data: okEmail } = await admin.rpc('check_rate_limit', { p_bucket: `fix-signup-email:${email}`, p_max: 5, p_window_seconds: 3600 })
    const { data: okAll } = await admin.rpc('check_rate_limit', { p_bucket: 'fix-signup-email:global', p_max: 200, p_window_seconds: 86400 })
    if (okEmail === false || okAll === false) return err('rate', 429)
  } catch { return err('rate', 429) }

  // ownership: the password must match AND the e-mail must still be unconfirmed (bcrypt checked in the DB,
  // migration 254: password sign-in needs a CAPTCHA, so the server cannot simply try to sign in)
  const { data: rows } = await admin.rpc('admin_account_owner', { p_email: email, p_password: password })
  const u = Array.isArray(rows) ? rows[0] : null
  if (!u?.id) return err('bad_credentials', 401)   // same answer whether or not the e-mail exists (migration 255)
  if (u.email_confirmed) return err('already_confirmed')
  if (Date.now() - new Date(u.created_at).getTime() > 14 * 24 * 3600 * 1000) return err('too_old')
  const origin = req.headers.get('origin') || 'https://taseerak.com'
  // the service role is not asked for a CAPTCHA (the browser's own resend would be)
  if (resendOnly) {
    const { error: rsErr } = await admin.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${origin}/login?confirmed=1` } })
    return rsErr ? err('resend_failed', 500) : NextResponse.json({ ok: true, resent: true })
  }
  const { data: taken } = await admin.rpc('admin_user_by_email', { p_email: newEmail })
  if (Array.isArray(taken) && taken[0]?.id) return err('email_taken', 409)

  const { error: upErr } = await admin.auth.admin.updateUserById(u.id, { email: newEmail })
  if (upErr) return err(/already|exists|registered/i.test(upErr.message || '') ? 'email_taken' : 'update_failed', 500)
  const { error: rsErr } = await admin.auth.resend({ type: 'signup', email: newEmail, options: { emailRedirectTo: `${origin}/login?confirmed=1` } })
  return NextResponse.json({ ok: true, resent: !rsErr })
}
