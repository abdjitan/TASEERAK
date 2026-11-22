import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/supabase/server'
import { overHourlyLimit, RATE_LIMITED_AR } from '@/lib/rateLimit'

export const runtime = 'nodejs'

// Resolves a short Google Maps link (maps.app.goo.gl / goo.gl/maps) to the place's lat/lng (UX-073):
// the browser cannot follow it (CORS), so the server follows the redirects itself. Only Google Maps
// hosts over https are ever fetched (no SSRF), at most 5 hops, 5 s in total.
const MAX_HOPS = 5
const TIMEOUT_MS = 5000

function allowed(u: URL): boolean {
  if (u.protocol !== 'https:' || u.port || u.username || u.password) return false
  const h = u.hostname.toLowerCase()
  if (h === 'maps.app.goo.gl' || h === 'maps.google.com') return true
  if (h === 'goo.gl') return u.pathname.startsWith('/maps')
  if (h === 'www.google.com' || h === 'google.com') return u.pathname.startsWith('/maps')
  return false
}

function valid(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
}

// The place's own pin (!3d…!4d…) first, then the map centre (@lat,lng), then a q= point.
function coordsFrom(raw: string): { lat: number; lng: number } | null {
  let s = raw
  try { s = decodeURIComponent(raw) } catch { /* keep raw */ }
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination|daddr)=(-?\d+(?:\.\d+)?),\s*\+?(-?\d+(?:\.\d+)?)/,
  ]
  for (const p of patterns) {
    const m = s.match(p)
    if (m) {
      const lat = parseFloat(parseFloat(m[1]).toFixed(7)), lng = parseFloat(parseFloat(m[2]).toFixed(7))
      if (valid(lat, lng)) return { lat, lng }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (await overHourlyLimit(supabase, 'maps-resolve', user.id, 30)) return NextResponse.json({ error: RATE_LIMITED_AR }, { status: 429 })

  let body: any = null
  try { body = await req.json() } catch { /* handled below */ }
  const input = String(body?.url || '').trim()
  if (!input || input.length > 1000) return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  let current: URL
  try { current = new URL(input) } catch { return NextResponse.json({ error: 'invalid_url' }, { status: 400 }) }
  if (!allowed(current)) return NextResponse.json({ error: 'host_not_allowed' }, { status: 400 })

  const direct = coordsFrom(current.toString())
  if (direct) return NextResponse.json(direct)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const res = await fetch(current.toString(), {
        method: 'GET', redirect: 'manual', signal: ctrl.signal, cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MapsLinkResolver/1.0)', 'Accept-Language': 'ar,en;q=0.8' },
      })
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
      try { await res.body?.cancel() } catch { /* ignore */ }
      if (!loc) break
      let next: URL
      try { next = new URL(loc, current) } catch { break }
      // the coordinates are usually already in the redirect target; read them without fetching it
      const found = coordsFrom(next.toString())
      if (found) return NextResponse.json(found)
      // Google's cookie-consent page carries the real maps URL in ?continue=
      if (next.hostname === 'consent.google.com') {
        const cont = next.searchParams.get('continue') || ''
        const c = coordsFrom(cont)
        if (c) return NextResponse.json(c)
        try { next = new URL(cont) } catch { break }
      }
      if (!allowed(next)) break
      current = next
    }
    return NextResponse.json({ error: 'no_coordinates' }, { status: 422 })
  } catch {
    return NextResponse.json({ error: 'resolve_failed' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
