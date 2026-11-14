// POST /api/phone/confirm { idToken } — the user proved the mobile is theirs with an SMS code
// (Firebase phone auth on the client). We check the Firebase ID token with Google, save the number
// as verified, then ask wa-webhook to send the phone_confirmed WhatsApp message: when Meta reports it
// delivered, the number is marked as having WhatsApp (whatsapp_verified_at). Owner 2026-11-14.
import { NextResponse } from 'next/server'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'
import { FIREBASE_CONFIG } from '@/lib/firebaseConfig'

export async function POST(req: Request) {
  const { user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  const { idToken } = await req.json().catch(() => ({}))
  if (!idToken || typeof idToken !== 'string' || !FIREBASE_CONFIG.apiKey) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  // Google validates the token (signature, expiry, project) and returns the verified phone number.
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  })
  const j: any = await r.json().catch(() => ({}))
  const fu = j?.users?.[0]
  const phone: string = fu?.phoneNumber || ''
  if (!r.ok || !/^\+\d{11,15}$/.test(phone)) return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  // only a code entered just now counts
  if (Date.now() - Number(fu.lastLoginAt || 0) > 15 * 60 * 1000) return NextResponse.json({ error: 'stale' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const { data: taken } = await admin.from('profiles').select('id').eq('phone', phone).not('phone_verified_at', 'is', null).neq('id', user.id).limit(1)
  if (taken && taken.length) return NextResponse.json({ error: 'phone_taken' }, { status: 409 })

  const { error } = await admin.from('profiles').update({
    phone, phone_verified_at: new Date().toISOString(), whatsapp_verified_at: null, wa_check_msg_id: null, wa_check_status: null,
  }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'save' }, { status: 500 })

  // the WhatsApp check (best effort: the phone stays verified even if WhatsApp can't be checked now)
  let whatsapp: any = null
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
    const w = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wa-webhook?action=check`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }),
    })
    whatsapp = await w.json().catch(() => null)
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, phone, whatsapp })
}
