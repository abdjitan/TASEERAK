// Completeness sweep using Places Text Search "Essentials (IDs Only)" — field mask
// `places.id` only, which Google bills at $0 with no monthly cap. Tiles the city adaptively
// for every trade term plus generic words, then lists the place IDs we have NOT fetched yet,
// so details are paid for only on genuinely new places (see fetch-details.mjs).
//   node scripts/sweep-ids.mjs --dir <discover-city out dir> [--city الرياض]
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
const CITY = arg('city', 'الرياض')
const BBOX = D.DISCOVERY_CITIES[CITY].bbox
const MIN_SPAN = Number(arg('min-span', '0.006')) // ≈650 m
const CONCURRENCY = 3
const KEY = (fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^\s*GOOGLE_MAPS_API_KEY\s*=\s*(.+?)\s*$/m) || [])[1]
const GENERIC = ['محل', 'مؤسسة', 'معرض', 'شركة', 'مستودع', 'ورشة', 'مصنع', 'تجارة']
// Generic words return every business in the city (slow, mostly irrelevant): opt-in only.
const TERMS = [...Object.values(D.PACK_QUERIES).flat(), ...(args.includes('--generic') ? GENERIC : [])]

// Every place we already paid details for (main run + probe), kept or dropped.
const known = new Set()
for (const f of ['google-cache.json', 'probe-cache.json']) {
  const p = path.join(DIR, f)
  if (!fs.existsSync(p)) continue
  for (const v of Object.values(JSON.parse(fs.readFileSync(p, 'utf8')))) for (const pl of v.places || []) known.add(pl.id)
}
const CACHE_FILE = path.join(DIR, 'ids-cache.json')
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
let calls = 0

async function page(term, r, token) {
  const k = `${term}|${r.s},${r.w},${r.n},${r.e}|${token || ''}`
  if (cache[k]) return cache[k]
  const body = { textQuery: `${term} ${CITY}`, regionCode: 'SA', languageCode: 'ar', pageSize: 20,
    locationRestriction: { rectangle: { low: { latitude: r.s, longitude: r.w }, high: { latitude: r.n, longitude: r.e } } } }
  if (token) body.pageToken = token
  let last = ''
  for (let a = 0; a < 10; a++) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'places.id,nextPageToken' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (res.ok) {
      calls++
      if (calls % 200 === 0) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
      return (cache[k] = { ids: (data.places || []).map(p => p.id), next: data.nextPageToken || null })
    }
    last = `${res.status} ${data?.error?.message || ''}`
    if (res.status === 429 || res.status >= 500) { await new Promise(s => setTimeout(s, Math.min(60000, 4000 * 2 ** a))); continue }
    throw new Error(data?.error?.message || res.status)
  }
  throw new Error('rate limited: ' + last)
}

const hits = new Map() // id → Set(terms)
async function sweep(term, r) {
  let token = null, n = 0, pages = 0
  do {
    const p = await page(term, r, token); pages++
    for (const id of p.ids) { n++; (hits.get(id) || hits.set(id, new Set()).get(id)).add(term) }
    token = p.next
  } while (token && pages < 3)
  if ((n >= 60 || token) && (r.n - r.s) > MIN_SPAN) {
    const mLat = (r.s + r.n) / 2, mLng = (r.w + r.e) / 2
    for (const q of [{ s: r.s, w: r.w, n: mLat, e: mLng }, { s: r.s, w: mLng, n: mLat, e: r.e }, { s: mLat, w: r.w, n: r.n, e: mLng }, { s: mLat, w: mLng, n: r.n, e: r.e }])
      await sweep(term, q)
  }
}

let ti = 0
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (ti < TERMS.length) {
    const term = TERMS[ti++]
    const before = hits.size
    await sweep(term, BBOX)
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
    console.log(`[${ti}/${TERMS.length}] ${term}: ids ${hits.size} (+${hits.size - before}) free calls ${calls}`)
  }
}))
fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
const unknown = [...hits].filter(([id]) => !known.has(id)).map(([id, t]) => ({ id, terms: [...t] }))
fs.writeFileSync(path.join(DIR, 'unknown-ids.json'), JSON.stringify(unknown))
const tradeOnly = unknown.filter(u => u.terms.some(t => !GENERIC.includes(t)))
console.log(`ids seen ${hits.size}, already known ${hits.size - unknown.length}, NEW ${unknown.length} (found by a trade term: ${tradeOnly.length}), free calls ${calls}`)
