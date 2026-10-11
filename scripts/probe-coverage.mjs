// Coverage probe for dense trade areas: searches small tiles of each priority zone with
// generic words ("محل", "مؤسسة", "معرض") and reports how many building suppliers Google
// shows there that the main run hasn't found yet. With --deep, every new supplier is added
// to the found set and saturated tiles are split further (same cache format as discover-city).
//   node scripts/probe-coverage.mjs --dir <out-dir-of-discover-city> [--max-calls 800]
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const jiti = require('jiti')(ROOT + '/scripts/x.js', { alias: { '@': ROOT + '/src' } })
const D = jiti(ROOT + '/src/lib/discovery.ts')

const args = process.argv.slice(2)
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d }
const DIR = arg('dir')
const MAX_CALLS = Number(arg('max-calls', '800'))
const PROBE_TERMS = (arg('terms', 'محل|مؤسسة|معرض')).split('|')
const HALF = Number(arg('half', '0.012')) // ≈1.3 km → each zone probed as a 2.6 km square in 4 tiles
const KEY = (fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^\s*GOOGLE_MAPS_API_KEY\s*=\s*(.+?)\s*$/m) || [])[1]
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,places.primaryTypeDisplayName,nextPageToken'

const known = new Set(JSON.parse(fs.readFileSync(path.join(DIR, 'riyadh-rows.json'), 'utf8')).map(r => r.place_id).filter(Boolean))
const CACHE_FILE = path.join(DIR, 'probe-cache.json')
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
let calls = 0

async function page(term, r, token) {
  const k = `${term}|${r.s},${r.w},${r.n},${r.e}|${token || ''}`
  if (cache[k]) return cache[k]
  if (calls >= MAX_CALLS) return null
  calls++
  const body = { textQuery: term, regionCode: 'SA', languageCode: 'ar', pageSize: 20,
    locationRestriction: { rectangle: { low: { latitude: r.s, longitude: r.w }, high: { latitude: r.n, longitude: r.e } } } }
  if (token) body.pageToken = token
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || res.status)
  return (cache[k] = { places: data.places || [], next: data.nextPageToken || null })
}

const comp = (p, types) => { for (const t of types) { const c = (p.addressComponents || []).find(a => (a.types || []).includes(t)); if (c?.longText) return c.longText } return null }
const report = []
const newPlaces = new Map()
for (const z of D.DISCOVERY_CITIES['الرياض'].zones.filter(z => z.priority)) {
  const box = { s: z.lat - HALF, w: z.lng - HALF, n: z.lat + HALF, e: z.lng + HALF }
  const mLat = z.lat, mLng = z.lng
  const tiles = [{ s: box.s, w: box.w, n: mLat, e: mLng }, { s: box.s, w: mLng, n: mLat, e: box.e }, { s: mLat, w: box.w, n: box.n, e: mLng }, { s: mLat, w: mLng, n: box.n, e: box.e }]
  const seen = new Map()
  for (const term of PROBE_TERMS) for (const t of tiles) {
    let token = null, pages = 0
    do {
      const r = await page(term, t, token); if (!r) break
      pages++
      for (const p of r.places) seen.set(p.id, p)
      token = r.next
    } while (token && pages < 3)
  }
  let sup = 0, supKnown = 0
  for (const p of seen.values()) {
    const { row } = D.toSupplierRow({ placeId: p.id, mapsUrl: p.googleMapsUri, name: p.displayName?.text, googleType: p.primaryTypeDisplayName?.text,
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber, website: p.websiteUri, address: p.formattedAddress, lat: p.location?.latitude, lng: p.location?.longitude,
      rating: p.rating, reviews: p.userRatingCount, status: p.businessStatus, city: comp(p, ['locality']), district: comp(p, ['sublocality_level_1', 'neighborhood', 'sublocality']), query: '' }, {})
    if (!row || row.relevance !== 'supplier') continue
    sup++
    if (known.has(p.id)) supKnown++
    else newPlaces.set(p.id, { ...row, found_by: ['فحص تغطية ' + z.name], found_packs: [] })
  }
  report.push({ zone: z.name, places: seen.size, suppliers: sup, known: supKnown, missing: sup - supKnown, coverage: sup ? Math.round(100 * supKnown / sup) + '%' : '-' })
}
fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
fs.writeFileSync(path.join(DIR, 'probe-new.json'), JSON.stringify([...newPlaces.values()]))
console.table(report)
console.log('paid calls', calls, 'new suppliers found by probe', newPlaces.size)
for (const r of [...newPlaces.values()].slice(0, 25)) console.log(' +', r.name, '|', r.google_type, '|', r.district)
