// POST /api/email/confirm { code } — check the 6-digit email code (/api/email/start) and mark the
// email verified (profiles.email_verified_at, migration 220). If it differs from the account's
// sign-in email (e.g. a phone-only buyer's placeholder), the sign-in email becomes this one, so it
// also works for the email sign-in fallback.
import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  const { code: raw } = await req.json().catch(() => ({}))
  const code = String(raw || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '')
  if (code.length !== 6) return NextResponse.json({ error: 'bad_code' }, { status: 400 })
  const admin = createAdminSupabaseClient()
  const { data: row } = await admin.from('email_codes').select('*').eq('user_id', user.id).maybeSingle()
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'expired' }, { status: 400 })
  if (row.attempts >= 5) return NextResponse.json({ error: 'too_many' }, { status: 429 })
  const want = Buffer.from(row.code_hash, 'hex')
  const got = createHash('sha256').update(user.id + ':' + code).digest()
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    await admin.from('email_codes').update({ attempts: row.attempts + 1 }).eq('user_id', user.id)
    return NextResponse.json({ error: 'bad_code' }, { status: 400 })
  }
  const { data: taken } = await admin.rpc('email_taken', { p_email: row.email, p_user: user.id })
  if (taken === true) return NextResponse.json({ error: 'email_taken' }, { status: 409 })
  if (String(user.email || '').toLowerCase() !== row.email) {
    const { error: uErr } = await admin.auth.admin.updateUserById(user.id, { email: row.email, email_confirm: true })
    if (uErr) return NextResponse.json({ error: 'save' }, { status: 500 })
  }
  await admin.from('profiles').update({ email_verified_at: new Date().toISOString() }).eq('id', user.id)
  await admin.from('email_codes').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true, email: row.email })
}
