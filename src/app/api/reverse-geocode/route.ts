import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Reverse-geocode lat/lng → city + region (Arabic) using Google's Geocoding API.
// The key stays server-side (GOOGLE_MAPS_API_KEY). If it's not configured the
// caller just keeps the raw maps link.
const KEY = process.env.GOOGLE_MAPS_API_KEY

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng || !/^-?\d+(\.\d+)?$/.test(lat) || !/^-?\d+(\.\d+)?$/.test(lng)) {
    return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 })
  }
  if (!KEY) return NextResponse.json({ ok: false, error: 'no_key' })
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ar&key=${KEY}`
    const res = await fetch(url, { cache: 'no-store' })
    const j: any = await res.json()
    if (j.status !== 'OK' || !Array.isArray(j.results) || !j.results.length) {
      return NextResponse.json({ ok: false, error: 'no_result', status: j.status })
    }
    let city = '', region = ''
    for (const r of j.results) {
      for (const comp of r.address_components || []) {
        const types = comp.types || []
        if (!region && types.includes('administrative_area_level_1')) region = comp.long_name
        if (!city && (types.includes('locality') || types.includes('administrative_area_level_2'))) city = comp.long_name
      }
      if (city && region) break
    }
    return NextResponse.json({ ok: true, city, region, formatted: j.results[0].formatted_address || '' })
  } catch {
    return NextResponse.json({ ok: false, error: 'fetch_failed' })
  }
}
