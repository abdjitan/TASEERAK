// POST /api/track-location — record where the signed-in user is connecting from (owner 2026-11-17,
// migration 229). Called once per session by the site (AppShell) and the app (Bearer). The location
// is approximate and comes from the connection (Vercel geo headers): country, region, city. No GPS,
// no raw IP stored. The first call after sign-up also fills signup_country; a sign-up from outside
// Saudi Arabia alerts the admins. Nothing is blocked.
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'

const dec = (v: string | null) => { try { return v ? decodeURIComponent(v).slice(0, 80) : null } catch { return v ? v.slice(0, 80) : null } }

export async function POST(req: Request) {
  const { user } = await getRouteUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const h = await headers()
  const country = (h.get('x-vercel-ip-country') || '').toUpperCase().slice(0, 2) || null
  const region = dec(h.get('x-vercel-ip-country-region'))
  const city = dec(h.get('x-vercel-ip-city'))
  if (!country) return NextResponse.json({ ok: true, skipped: 'no-geo' }) // local dev / unknown
  const { client } = await req.json().catch(() => ({}))
  const admin = createAdminSupabaseClient()

  const { data: p } = await admin.from('profiles').select('role, signup_country, company_name_ar, full_name').eq('id', user.id).maybeSingle()
  const now = new Date().toISOString()
  await admin.from('user_locations').insert({ user_id: user.id, country, region, city, client: client === 'app' ? 'app' : 'web' })
  const firstTime = !!p && !p.signup_country
  await admin.from('profiles').update({
    last_country: country, last_city: city, last_location_at: now,
    ...(firstTime ? { signup_country: country, signup_city: city } : {}),
  }).eq('id', user.id)

  if (firstTime && country !== 'SA' && p?.role !== 'admin') {
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
    const name = p?.company_name_ar || p?.full_name || 'مستخدم جديد'
    for (const a of admins || []) {
      await admin.from('notifications').insert({
        user_id: a.id, type: 'announcement', title: 'تسجيل من خارج السعودية',
        body: `${name} — ${[city, country].filter(Boolean).join('، ')}`,
        data: { url: '/admin/users/' + user.id, admin_alert: true },
      })
    }
  }
  return NextResponse.json({ ok: true })
}
