// Full-city supplier discovery via Google Places API (New) Text Search — official API only.
// Covers every shop type in docs/CATALOG_FOR_DISCOVERY.md. Beats the 60-results-per-query
// cap with adaptive tiling: a rectangle that returns a full 60 is split in 4 and re-searched.
// Every Google response is cached on disk, so re-runs and resumes never pay twice.
// Results are merged with earlier survey exports, classified (src/lib/discovery.ts) and
// deduplicated by place_id → Maps CID → phone, then written to one Excel workbook.
//
//   node scripts/discover-city.mjs --out <dir> [--old <dir-with-old-xlsx>] [--max-calls 3000] [--dry]
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const jiti = require('jiti')(ROOT + '/scripts/x.js', { alias: { '@': ROOT + '/src' } })
const D = jiti(ROOT + '/src/lib/discovery.ts')
const XLSX = require('xlsx')

const args = process.argv.slice(2)
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d }
const OUT = arg('out', process.cwd())
const OLD = arg('old', '')
const MAX_CALLS = Number(arg('max-calls', '3000'))
const DRY = args.includes('--dry')
const CONCURRENCY = 4
const CITY = 'الرياض'
// Riyadh metro incl. الحائر / الدرعية / outskirts industrial areas.
const BBOX = { s: 24.35, w: 46.40, n: 25.05, e: 47.10 }
const MIN_SPAN = 0.015 // ≈1.6 km: stop splitting below this

// Shop-type search terms covering every catalog specialty: [term, pack] from PACK_QUERIES.
const TERMS = Object.entries(D.PACK_QUERIES).flatMap(([pack, terms]) => terms.map(t => [t, pack]))
function readKey() {
  const txt = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  const m = txt.match(/^\s*GOOGLE_MAPS_API_KEY\s*=\s*(.+?)\s*$/m)
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
}
const KEY = readKey()
if (!KEY) { console.error('NO_KEY'); process.exit(1) }

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.addressComponents',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.websiteUri', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.googleMapsUri', 'places.businessStatus',
  'places.primaryTypeDisplayName', 'nextPageToken',
].join(',')

fs.mkdirSync(OUT, { recursive: true })
const CACHE_FILE = path.join(OUT, 'google-cache.json')
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
let calls = 0, cached = 0, budgetHit = false
const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))

async function page(term, rect, token) {
  const k = `${term}|${rect.s},${rect.w},${rect.n},${rect.e}|${token || ''}`
  if (cache[k]) { cached++; return cache[k] }
  if (DRY || calls >= MAX_CALLS) { budgetHit = true; return null }
  calls++
  const body = {
    textQuery: `${term} ${CITY}`, regionCode: 'SA', languageCode: 'ar', pageSize: 20,
    locationRestriction: { rectangle: { low: { latitude: rect.s, longitude: rect.w }, high: { latitude: rect.n, longitude: rect.e } } },
  }
  if (token) body.pageToken = token
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000)
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
        body: JSON.stringify(body),
      })
      clearTimeout(t)
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue }
        throw new Error(data?.error?.message || 'google ' + res.status)
      }
      const out = { places: data.places || [], next: data.nextPageToken || null }
      cache[k] = out
      if (calls % 25 === 0) saveCache()
      return out
    } catch (e) {
      if (attempt === 2) throw e
      await new Promise(r => setTimeout(r, 1500))
    }
  }
}

const found = new Map() // place_id → { p, terms:Set }
async function searchRect(term, pack, rect, depth = 0) {
  let token = null, n = 0, pages = 0
  do {
    const r = await page(term, rect, token)
    if (!r) return
    pages++
    for (const p of r.places) {
      n++
      const f = found.get(p.id) || { p, terms: new Set(), packs: new Set() }
      f.terms.add(term); f.packs.add(pack); found.set(p.id, f)
    }
    token = r.next
  } while (token && pages < 3)
  const saturated = n >= 60 || (token && pages >= 3)
  if (saturated && (rect.n - rect.s) > MIN_SPAN) {
    const mLat = (rect.s + rect.n) / 2, mLng = (rect.w + rect.e) / 2
    const quads = [
      { s: rect.s, w: rect.w, n: mLat, e: mLng }, { s: rect.s, w: mLng, n: mLat, e: rect.e },
      { s: mLat, w: rect.w, n: rect.n, e: mLng }, { s: mLat, w: mLng, n: rect.n, e: rect.e },
    ]
    for (const q of quads) await searchRect(term, pack, q, depth + 1)
  }
}

// Each term starts city-wide; only saturated rectangles get split (sparse trades cost 1–3 calls).
// --focus: also search every term inside each priority (dense trade) zone, which surfaces shops
// that the city-wide ranking cuts off. The city-wide part replays from cache for free.
const FOCUS = args.includes('--focus')
const START = [BBOX, ...(FOCUS ? D.DISCOVERY_CITIES[CITY].zones.filter(z => z.priority).map(z => {
  const h = z.radiusKm / 111
  return { s: +(z.lat - h).toFixed(4), w: +(z.lng - h).toFixed(4), n: +(z.lat + h).toFixed(4), e: +(z.lng + h).toFixed(4) }
}) : [])]

const t0 = Date.now()
let ti = 0
async function worker() {
  while (ti < TERMS.length) {
    const [term, pack] = TERMS[ti++]
    const before = found.size
    for (const r of START) await searchRect(term, pack, r)
    console.log(`[${ti}/${TERMS.length}] ${term}: +${found.size - before} (total ${found.size}) calls=${calls} cached=${cached}`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
saveCache()
console.log(`google done: ${found.size} places, ${calls} paid calls, ${cached} cached, budgetHit=${budgetHit}, ${Math.round((Date.now() - t0) / 1000)}s`)

// ── Build rows ────────────────────────────────────────────────────────────────
const comp = (p, types) => { for (const t of types) { const c = (p.addressComponents || []).find(a => (a.types || []).includes(t)); if (c?.longText) return c.longText } return null }
const drop = {}, rows = []
const bump = k => { drop[k] = (drop[k] || 0) + 1 }
for (const { p, terms, packs } of found.values()) {
  const termList = [...terms]
  const { row, reason } = D.toSupplierRow({
    placeId: p.id, mapsUrl: p.googleMapsUri, name: p.displayName?.text, googleType: p.primaryTypeDisplayName?.text,
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber, website: p.websiteUri, address: p.formattedAddress,
    lat: p.location?.latitude, lng: p.location?.longitude, rating: p.rating, reviews: p.userRatingCount,
    status: p.businessStatus, city: comp(p, ['locality']), district: comp(p, ['sublocality_level_1', 'neighborhood', 'sublocality']),
    query: termList.join(' / '),
  }, { fallbackPack: [...packs][0], source: 'places_api' })
  if (!row) { bump(reason); continue }
  row.found_by = termList
  row.found_packs = [...packs]
  rows.push(row)
}

// Old survey exports (CID only; Google rows win on conflict).
let oldRows = 0
if (OLD && fs.existsSync(OLD)) {
  const H = { 'اسم المحل': 'name', 'النوع': 'type', 'الجوال': 'phone', 'الموقع الإلكتروني': 'website', 'العنوان': 'address', 'التقييم': 'rating', 'عدد المراجعات': 'reviews', 'المدينة': 'city', 'الصنف المبحوث': 'query', 'رابط الخريطة': 'maps_url' }
  for (const f of fs.readdirSync(OLD).filter(f => f.startsWith('موردين-') && f.endsWith('.xlsx')).sort().reverse()) {
    const wb = XLSX.read(fs.readFileSync(path.join(OLD, f)))
    for (const r of XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })) {
      const o = {}; for (const [h, k] of Object.entries(H)) o[k] = String(r[h] ?? '').trim()
      oldRows++
      const { row, reason } = D.toSupplierRow({ mapsUrl: o.maps_url, name: o.name, googleType: o.type, phone: o.phone, website: o.website, address: o.address, rating: o.rating ? +o.rating : null, reviews: o.reviews ? +o.reviews : null, city: o.city, query: o.query }, { source: 'old_survey_2026_06' })
      if (!row) { bump('old_' + reason); continue }
      row.found_by = o.query ? [o.query] : []
      row.found_packs = []
      rows.push(row)
    }
  }
}

// Suppliers surfaced by scripts/probe-coverage.mjs (generic words in dense zones).
const PROBE = path.join(OUT, 'probe-new.json')
if (fs.existsSync(PROBE)) for (const r of JSON.parse(fs.readFileSync(PROBE, 'utf8'))) rows.push(r)

// Dedup: place_id → CID → phone. Merge "found_by" so we keep everything a shop was found for.
const byKey = new Map(), byPhone = new Map(), out = []
let dupSame = 0, dupPhone = 0
for (const r of rows) {
  const keys = [r.place_id && 'p:' + r.place_id, r.cid && 'c:' + r.cid].filter(Boolean)
  let hit = keys.map(k => byKey.get(k)).find(Boolean)
  if (!hit && r.phone_norm && byPhone.has(r.phone_norm)) { hit = byPhone.get(r.phone_norm); hit.branches = (hit.branches || 1) + 1; dupPhone++ }
  else if (hit) dupSame++
  if (hit) {
    for (const t of r.found_by) if (!hit.found_by.includes(t)) hit.found_by.push(t)
    hit.cid = hit.cid || r.cid
    for (const k of keys) byKey.set(k, hit)
    continue
  }
  for (const k of keys) byKey.set(k, r)
  if (r.phone_norm) byPhone.set(r.phone_norm, r)
  out.push(r)
}

// A generic-type shop that several different trade searches all returned is a real trade shop.
for (const r of out) if (r.relevance === 'review' && r.found_by.length >= 3) r.relevance = 'supplier'

const riyadh = out.filter(r => r.city === CITY)
const cnt = (arr, f) => arr.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {})
console.log('rows', rows.length, 'unique', out.length, 'riyadh', riyadh.length, 'dupSame', dupSame, 'dupPhone', dupPhone, 'dropped', drop)
console.log('riyadh relevance', cnt(riyadh, r => r.relevance), 'mobile', riyadh.filter(r => r.is_mobile).length)

// ── Excel ─────────────────────────────────────────────────────────────────────
const REL = { supplier: 'مورد', review: 'بحاجة مراجعة', contractor: 'مقاول' }
const sheet = rs => rs
  .sort((a, b) => (D.packLabel(a.pack)).localeCompare(D.packLabel(b.pack), 'ar') || (b.google_reviews || 0) - (a.google_reviews || 0))
  .map(r => ({
    'الاسم': r.name, 'التصنيف': REL[r.relevance] || r.relevance, 'النوع (الباقة)': D.packLabel(r.pack), 'القطاع': r.sector || '',
    'لقيناه بالبحث عن': r.found_by.join('، '), 'الحي': r.district || '', 'الجوال': r.phone_norm ? '0' + r.phone_norm : '',
    'واتساب؟': r.is_mobile ? 'نعم' : '', 'فروع بنفس الرقم': r.branches || '', 'نوع Google': r.google_type || '',
    'التقييم': r.google_rating ?? '', 'المراجعات': r.google_reviews ?? '', 'العنوان': r.address || '', 'الموقع الإلكتروني': r.website || '',
    'رابط الخريطة': r.maps_url || (r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : ''),
    'المصدر': r.source === 'places_api' ? 'بحث جديد' : 'المسح القديم', 'place_id': r.place_id || '', 'lat': r.lat ?? '', 'lng': r.lng ?? '',
  }))
const sup = riyadh.filter(r => r.relevance === 'supplier')
const wb = XLSX.utils.book_new()
const packRows = Object.entries(cnt(sup, r => r.pack || '_none')).sort((a, b) => b[1] - a[1])
  .map(([p, n]) => [D.packLabel(p), n, sup.filter(r => (r.pack || '_none') === p && r.is_mobile).length])
const distRows = Object.entries(cnt(sup, r => r.district || 'غير محدد')).sort((a, b) => b[1] - a[1])
  .map(([d, n]) => [d, n, sup.filter(r => (r.district || 'غير محدد') === d && r.is_mobile).length])
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ['البند', 'العدد'],
  ['محلات الرياض (بعد إزالة التكرار)', riyadh.length], ['موردين', sup.length],
  ['بحاجة مراجعة', riyadh.filter(r => r.relevance === 'review').length], ['مقاولين', riyadh.filter(r => r.relevance === 'contractor').length],
  ['موردين عندهم جوال (واتساب)', sup.filter(r => r.is_mobile).length],
  ['من البحث الجديد', riyadh.filter(r => r.source === 'places_api').length], ['من المسح القديم فقط', riyadh.filter(r => r.source !== 'places_api').length],
  ['مكرر نفس المحل (اندمج)', dupSame], ['مكرر بنفس الجوال (اندمج كفرع)', dupPhone],
  ['مستبعد: مش مورد', (drop.irrelevant || 0) + (drop.old_irrelevant || 0)], ['مستبعد: مغلق نهائياً', drop.closed || 0],
  ['مستبعد: خارج السعودية', (drop.foreign || 0) + (drop.old_foreign || 0)],
  ['طلبات Google (كل التشغيلات)', Object.keys(cache).length], [],
  ['النوع', 'موردين', 'منهم جوال'], ...packRows, [],
  ['الحي', 'موردين', 'منهم جوال'], ...distRows,
]), 'الملخص')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet(sup)), 'موردين الرياض')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet(riyadh.filter(r => r.relevance === 'review'))), 'بحاجة مراجعة')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet(riyadh.filter(r => r.relevance === 'contractor'))), 'مقاولين')
for (const ws of Object.values(wb.Sheets)) ws['!views'] = [{ RTL: true }]
wb.Workbook = { Views: [{ RTL: true }] }
const file = path.join(OUT, `محلات-الرياض-كل-التصنيفات-${new Date().toISOString().slice(0, 10)}.xlsx`)
XLSX.writeFile(wb, file)
fs.writeFileSync(path.join(OUT, 'riyadh-rows.json'), JSON.stringify(riyadh))
console.log('wrote', file)
