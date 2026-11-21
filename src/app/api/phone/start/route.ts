// POST /api/phone/start — the mobile app (Bearer) gets a single-use, 10-minute link to the web
// phone-verification page, so it can verify without Firebase native code (owner 2026-11-14).
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'
import { firebaseReady } from '@/lib/firebaseConfig'

export async function POST() {
  const { user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!firebaseReady()) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const admin = createAdminSupabaseClient()
  // tidy: old links of this user
  await admin.from('phone_handoffs').delete().eq('user_id', user.id)
  const token = randomBytes(32).toString('base64url')
  const { error } = await admin.from('phone_handoffs').insert({ token, user_id: user.id, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
  if (error) return NextResponse.json({ error: 'save' }, { status: 500 })
  // never hand a phone a localhost link (bug 2026-11-22: NEXT_PUBLIC_APP_URL was http://localhost:3000 on Vercel,
  // so the app's «وثّق رقم جوالك» opened localhost:3000 → ERR_CONNECTION_REFUSED)
  const env = process.env.NEXT_PUBLIC_APP_URL || ''
  const site = env && !/localhost|127.0.0.1/.test(env) ? env : 'https://taseerak.com'
  return NextResponse.json({ url: `${site.replace(/\/$/, '')}/phone-verify?h=${token}` })
}
