import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// POST /api/discover-suppliers/save  { places:[...], region, city, category }  (admin only)
// Persists discovered Google-Places results as CLAIMABLE directory listings so the public
// /suppliers page shows density before real suppliers register. Contact fields are stored
// for admin outreach but are never exposed by the public directory function.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', message: 'سجّل الدخول أولاً.' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden', message: 'هذه الأداة للإدارة فقط.' }, { status: 403 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const places: any[] = Array.isArray(body.places) ? body.places : []
  const region = (body.region || '').toString().trim() || null
  const city = (body.city || '').toString().trim() || null
  const category = (body.category || '').toString().trim() || null
  if (places.length === 0) return NextResponse.json({ error: 'no_places', message: 'لا توجد نتائج لحفظها.' }, { status: 400 })

  const rows = places
    .filter((p: any) => p && (p.id || p.name))
    .map((p: any) => ({
      place_id: p.id || null,
      name: p.name || 'مورد',
      category, sector: null, region, city,
      address: p.address || null,
      phone: p.phone || null,
      email: (p.email && p.email !== '—') ? p.email : null,
      website: p.website || null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      google_rating: p.rating ?? null,
      google_reviews: p.reviews ?? null,
      maps_url: p.mapsUrl || null,
      status: p.status || null,
      created_by: user.id,
    }))

  // upsert by place_id (dedup across repeated searches); claimed_by/is_listed are preserved
  const withId = rows.filter(r => r.place_id)
  const withoutId = rows.filter(r => !r.place_id)
  let saved = 0
  if (withId.length) {
    const { error, count } = await supabase
      .from('discovered_suppliers')
      .upsert(withId, { onConflict: 'place_id', ignoreDuplicates: false, count: 'exact' })
    if (error) { console.error('[discover-suppliers/save]', error.message); return NextResponse.json({ error: 'db' }, { status: 500 }) }
    saved += count ?? withId.length
  }
  if (withoutId.length) {
    const { error } = await supabase.from('discovered_suppliers').insert(withoutId)
    if (!error) saved += withoutId.length
  }

  return NextResponse.json({ ok: true, saved })
}
