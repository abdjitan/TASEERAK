// Fetches details for the NEW place IDs found by sweep-ids.mjs, in two paid stages so we only
// pay for phone numbers of real suppliers:
//   1. Place Details Pro (name, type, address, location)  → classify, drop non-suppliers / other cities
//   2. Place Details Enterprise (phone, website, rating)   → only for suppliers + "review"
// Without --yes it only prints the estimated cost. Output: <dir>/details-new.json (merged by
// discover-city.mjs on its next run).
//   node scripts/fetch-details.mjs --dir <dir> [--city الرياض] [--yes] [--limit N]
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
const YES = args.includes('--yes')
const LIMIT = Number(arg('limit', '1000000'))
const KEY = (fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^\s*GOOGLE_MAPS_API_KEY\s*=\s*(.+?)\s*$/m) || [])[1]
const PRO = 'id,displayName,primaryTypeDisplayName,formattedAddress,addressComponents,location,businessStatus,googleMapsUri'
const ENT = 'id,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount'
// Google list prices per 1000 (Places API New), after the monthly free caps.
const PRICE = { pro: 17, ent: 20 }, FREE = { pro: 5000, ent: 1000 }

const GENERIC = ['محل', 'مؤسسة', 'معرض', 'شركة', 'مستودع', 'ورشة', 'مصنع', 'تجارة']
// IDs seen only under generic words ("محل", "شركة") are mostly clothing/food/etc. — skipped
// unless --include-generic, so we don't pay to look at every shop in the city.
const unknown = JSON.parse(fs.readFileSync(path.join(DIR, 'unknown-ids.json'), 'utf8'))
  .filter(u => args.includes('--include-generic') || u.terms.some(t => !GENERIC.includes(t)))
  .slice(0, LIMIT)
const CACHE_FILE = path.join(DIR, 'details-cache.json')
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}

const todoPro = unknown.filter(u => !cache['pro|' + u.id])
const usd = (n, sku) => Math.max(0, n - FREE[sku]) * PRICE[sku] / 1000
console.log(`new IDs ${unknown.length}; stage 1 (Pro) calls needed ${todoPro.length} ≈ $${usd(todoPro.length, 'pro').toFixed(0)} (first ${FREE.pro}/month free)`)
console.log(`stage 2 (Enterprise) only for suppliers — typically 30–50% of stage 1 ≈ $${usd(Math.round(todoPro.length * 0.5), 'ent').toFixed(0)} max (first ${FREE.ent}/month free)`)
if (!YES) { console.log('estimate only — re-run with --yes to fetch'); process.exit(0) }

async function details(id, mask) {
  for (let a = 0; a < 8; a++) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=ar&regionCode=SA`, { headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': mask } })
    const data = await res.json()
    if (res.ok) return data
    if (res.status === 429 || res.status >= 500) { await new Promise(s => setTimeout(s, Math.min(60000, 3000 * 2 ** a))); continue }
    if (res.status === 404) return {}
    throw new Error(`${res.status} ${data?.error?.message || ''}`)
  }
  throw new Error('rate limited')
}

async function pool(items, fn, n = 4) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { await fn(items[i++]); if (i % 200 === 0) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)) } }))
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
}

const comp = (p, types) => { for (const t of types) { const c = (p.addressComponents || []).find(a => (a.types || []).includes(t)); if (c?.longText) return c.longText } return null }
await pool(unknown, async u => { if (!cache['pro|' + u.id]) cache['pro|' + u.id] = await details(u.id, PRO) })

const keep = []
const drop = {}
for (const u of unknown) {
  const p = cache['pro|' + u.id] || {}
  const trade = u.terms.filter(t => !GENERIC.includes(t))
  const fallbackPack = Object.entries(D.PACK_QUERIES).find(([, ts]) => ts.includes(trade[0]))?.[0] || null
  const { row, reason } = D.toSupplierRow({ placeId: u.id, mapsUrl: p.googleMapsUri, name: p.displayName?.text, googleType: p.primaryTypeDisplayName?.text,
    address: p.formattedAddress, lat: p.location?.latitude, lng: p.location?.longitude, status: p.businessStatus,
    city: comp(p, ['locality']), district: comp(p, ['sublocality_level_1', 'neighborhood', 'sublocality']), query: trade.join(' / ') }, { fallbackPack })
  if (!row) { drop[reason] = (drop[reason] || 0) + 1; continue }
  if (row.city !== CITY) { drop.other_city = (drop.other_city || 0) + 1; continue }
  if (row.relevance === 'contractor') { drop.contractor = (drop.contractor || 0) + 1; continue }
  row.found_by = trade.length ? trade : u.terms
  row.found_packs = []
  keep.push(row)
}
console.log(`stage 1 done: keep ${keep.length}, dropped`, drop, `→ stage 2 calls ${keep.filter(r => !cache['ent|' + r.place_id]).length}`)

await pool(keep, async r => { if (!cache['ent|' + r.place_id]) cache['ent|' + r.place_id] = await details(r.place_id, ENT) })
for (const r of keep) {
  const e = cache['ent|' + r.place_id] || {}
  const ph = D.normalizePhone(e.nationalPhoneNumber || e.internationalPhoneNumber)
  Object.assign(r, { phone: e.nationalPhoneNumber || e.internationalPhoneNumber || null, phone_norm: ph.norm, is_mobile: ph.mobile,
    website: e.websiteUri || null, google_rating: e.rating ?? null, google_reviews: e.userRatingCount ?? null })
}
fs.writeFileSync(path.join(DIR, 'details-new.json'), JSON.stringify(keep))
console.log(`wrote ${keep.length} new rows (suppliers ${keep.filter(r => r.relevance === 'supplier').length}, with mobile ${keep.filter(r => r.is_mobile).length})`)
