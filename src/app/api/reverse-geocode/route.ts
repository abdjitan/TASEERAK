import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Reverse-geocode lat/lng → city + region (Arabic).
// Uses Google's Geocoding API when GOOGLE_MAPS_API_KEY is set (more accurate),
// otherwise falls back to OpenStreetMap Nominatim which needs NO key — so the
// "auto-locate → fill city" feature works out of the box.
const KEY = process.env.GOOGLE_MAPS_API_KEY

async function viaGoogle(lat: string, lng: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ar&key=${KEY}`
  const res = await fetch(url, { cache: 'no-store' })
  const j: any = await res.json()
  if (j.status !== 'OK' || !Array.isArray(j.results) || !j.results.length) return null
  let city = '', region = ''
  for (const r of j.results) {
    for (const comp of r.address_components || []) {
      const types = comp.types || []
      if (!region && types.includes('administrative_area_level_1')) region = comp.long_name
      if (!city && (types.includes('locality') || types.includes('administrative_area_level_2'))) city = comp.long_name
    }
    if (city && region) break
  }
  return { city, region, formatted: j.results[0].formatted_address || '' }
}

async function viaNominatim(lat: string, lng: string) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar&zoom=12`
  const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'Taseerak/1.0 (rfq-location)' } })
  if (!res.ok) return null
  const j: any = await res.json()
  const a = j.address || {}
  const city = a.city || a.town || a.municipality || a.village || a.county || a.suburb || a.city_district || a.province || ''
  const region = a.state || a.region || a.province || ''
  return { city, region, formatted: j.display_name || '' }
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng || !/^-?\d+(\.\d+)?$/.test(lat) || !/^-?\d+(\.\d+)?$/.test(lng)) {
    return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 })
  }
  try {
    let out = KEY ? await viaGoogle(lat, lng) : null
    if (!out) out = await viaNominatim(lat, lng)
    if (!out || (!out.city && !out.region)) return NextResponse.json({ ok: false, error: 'no_result' })
    return NextResponse.json({ ok: true, ...out })
  } catch {
    return NextResponse.json({ ok: false, error: 'fetch_failed' })
  }
}
