// POST /api/auth/phone-session { idToken, mode: 'login'|'signup', full_name?, terms_version?, locale?, client? }
// Buyer sign-up / sign-in with the mobile only (owner 2026-11-17, migration 220). The browser (or app)
// proves the number with a Google SMS code (Firebase phone auth) and sends the ID token here.
//  - login: the buyer account that owns this verified number gets a Supabase session.
//  - signup: no account yet → a buyer account is created (role contractor, phone verified); its auth
//    email is an internal placeholder until the buyer adds and verifies a real one (/api/email/*).
// Sellers may also SIGN IN with their verified mobile (owner 2026-11-21); they still sign up with email
// (kind, CR) and verify the mobile there. Admins keep email + password + 2FA ('use_email').
// The session is minted with an admin magic link verified server-side: the web gets the cookie,
// the app (client: 'app') gets the tokens in the response.
import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { verifiedPhoneFromIdToken } from '@/lib/firebaseVerify'
import { isAllowedPhone } from '@/lib/firebaseConfig'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const mode = body?.mode === 'signup' ? 'signup' : 'login'
  const phone = await verifiedPhoneFromIdToken(body?.idToken)
  if (!phone) return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  const admin = createAdminSupabaseClient()

  const { data: allowed } = await admin.rpc('check_rate_limit', { p_bucket: 'phone-session:' + phone, p_max: 10, p_window_seconds: 3600 })
  if (allowed === false) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const { data: rows } = await admin.rpc('account_by_verified_phone', { p_phone: phone })
  const acc: any = Array.isArray(rows) ? rows[0] : null
  let email: string = acc?.email || ''
  let created = false

  if (acc) {
    if (acc.role === 'admin') return NextResponse.json({ error: 'use_email' }, { status: 409 })
  } else {
    if (mode !== 'signup') return NextResponse.json({ error: 'no_account' }, { status: 404 })
    if (!isAllowedPhone(phone)) return NextResponse.json({ error: 'country_not_allowed' }, { status: 400 })
    const name = String(body?.full_name || '').trim().slice(0, 80)
    if (name.length < 2) return NextResponse.json({ error: 'name_required' }, { status: 400 })
    if (!body?.terms_version) return NextResponse.json({ error: 'terms_required' }, { status: 400 })
    const locale = ['ar', 'en', 'ur'].includes(body?.locale) ? body.locale : 'ar'
    email = `m${phone.replace(/\D/g, '')}@phone.taseerak.com` // placeholder, never mailed (no MX)
    const { data: cu, error: cErr } = await admin.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { role: 'contractor', full_name: name, company_name_ar: name, phone, preferred_language: locale,
        terms_version: String(body.terms_version).slice(0, 20), client: body?.client === 'app' ? 'app' : 'web', signup_method: 'phone' },
    })
    if (cErr || !cu?.user) {
      console.error('phone-session createUser', cErr?.message)
      return NextResponse.json({ error: 'signup_failed' }, { status: 500 })
    }
    created = true
    await admin.from('profiles').update({ phone, phone_verified_at: new Date().toISOString() }).eq('id', cu.user.id)
    // WhatsApp check (best effort), as /api/phone/confirm does
    try {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wa-webhook?action=check`, {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: cu.user.id }),
      })
    } catch { /* ignore */ }
  }

  // mint the session: admin magic link (not mailed) → verified server-side
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const tokenHash = (link as any)?.properties?.hashed_token
  if (lErr || !tokenHash) {
    console.error('phone-session generateLink', lErr?.message)
    return NextResponse.json({ error: 'session_failed' }, { status: 500 })
  }
  const supabase = await createServerSupabaseClient()
  const { data: v, error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  if (vErr || !v?.session) {
    console.error('phone-session verifyOtp', vErr?.message)
    return NextResponse.json({ error: 'session_failed' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true, created,
    ...(body?.client === 'app' ? { access_token: v.session.access_token, refresh_token: v.session.refresh_token } : {}),
  })
}
