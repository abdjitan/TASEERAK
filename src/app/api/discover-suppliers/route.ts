import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/supabase/server'
import { DISCOVERY_CITIES, toSupplierRow } from '@/lib/discovery'

export const runtime = 'nodejs'
export const maxDuration = 60

// The field mask drives the billing SKU: only what the directory/invitation flow uses.
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.primaryTypeDisplayName',
  'nextPageToken',
].join(',')

const MAX_PAGES = 3 // Google caps Text Search at 60 results (3 × 20)

function component(p: any, types: string[]): string | null {
  for (const t of types) {
    const c = (p.addressComponents || []).find((a: any) => (a.types || []).includes(t))
    if (c?.longText) return c.longText
  }
  return null
}

// POST /api/discover-suppliers  { city, zone, pack?, query }  (admin only)
// Runs ONE keyword in ONE zone (≤3 Google pages, stops early once a page brings nothing
// new), classifies every place, dedups + saves via upsert_discovered_suppliers and logs
// the run in discovery_runs. The admin page drives batches by calling this per cell.
export async function POST(req: NextRequest) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', message: 'سجّل الدخول أولاً.' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden', message: 'هذه الأداة للإدارة فقط.' }, { status: 403 })

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'missing_key', message: 'مفتاح Google غير مُعدّ بعد. أضِف GOOGLE_MAPS_API_KEY في إعدادات Vercel ثم أعد المحاولة.' },
      { status: 503 },
    )
  }

  let body: any = {}
  try { body = await req.json() } catch {}
  const city = String(body.city || '').trim()
  const zoneName = String(body.zone || '').trim()
  const pack = body.pack ? String(body.pack) : null
  const keyword = String(body.query || '').trim().slice(0, 80)
  const cfg = DISCOVERY_CITIES[city]
  const zone = cfg?.zones.find(z => z.name === zoneName)
  if (!cfg || !zone || !keyword) return NextResponse.json({ error: 'bad_request', message: 'المدينة أو المنطقة أو كلمة البحث غير صحيحة.' }, { status: 400 })

  const textQuery = `${keyword} في ${zone.name} ${city}`
  const locationBias = { circle: { center: { latitude: zone.lat, longitude: zone.lng }, radius: Math.min(zone.radiusKm * 1000, 50000) } }

  let pageToken: string | null = null
  let pages = 0, results = 0, inserted = 0, updated = 0, dupPhone = 0, skipped = 0
  const seen = new Set<string>()
  try {
    do {
      const payload: any = { textQuery, regionCode: 'SA', languageCode: 'ar', pageSize: 20, locationBias }
      if (pageToken) payload.pageToken = pageToken
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        if (pages === 0) return NextResponse.json({ error: 'google_error', message: data?.error?.message || 'خطأ من Google Maps.' }, { status: 502 })
        break
      }
      pages++
      const places: any[] = data.places || []
      results += places.length
      const rows: any[] = []
      for (const p of places) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        const { row } = toSupplierRow({
          placeId: p.id,
          mapsUrl: p.googleMapsUri,
          name: p.displayName?.text,
          googleType: p.primaryTypeDisplayName?.text,
          phone: p.nationalPhoneNumber || p.internationalPhoneNumber,
          website: p.websiteUri,
          address: p.formattedAddress,
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          rating: p.rating ?? null,
          reviews: p.userRatingCount ?? null,
          status: p.businessStatus,
          city: component(p, ['locality']),
          district: component(p, ['sublocality_level_1', 'neighborhood', 'sublocality']),
          query: keyword,
        }, { zone: zone.name, fallbackPack: pack, fallbackCity: null })
        if (row) rows.push(row); else skipped++
      }
      let pageNew = 0
      if (rows.length) {
        const { data: r, error } = await supabase.rpc('upsert_discovered_suppliers', { p_rows: rows })
        if (error) { console.error('[discover-suppliers]', error.message); return NextResponse.json({ error: 'db', message: 'تعذّر الحفظ في قاعدة البيانات.' }, { status: 500 }) }
        inserted += r?.inserted || 0; updated += r?.updated || 0; dupPhone += r?.dup_phone || 0
        pageNew = r?.inserted || 0
      }
      pageToken = data.nextPageToken || null
      // Two pages and the last brought nothing new → deeper pages are known too; save the quota.
      if (pageNew === 0 && pages >= 2) break
    } while (pageToken && pages < MAX_PAGES)
  } catch {
    return NextResponse.json({ error: 'fetch_failed', message: 'تعذّر الاتصال بـ Google Maps. حاول مرة ثانية.' }, { status: 502 })
  }

  await supabase.from('discovery_runs').insert({
    city, zone: zone.name, pack, query: keyword, pages, results, inserted, updated, dup_phone: dupPhone, skipped, ran_by: user.id,
  })
  return NextResponse.json({ ok: true, pages, results, inserted, updated, dupPhone, skipped })
}
