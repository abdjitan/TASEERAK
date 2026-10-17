// Suppliers from their OWN websites (found via web search): visits each business site's
// homepage + one contact page and reads the phone / WhatsApp / email the business publishes.
// Marketplaces, classifieds, social networks and directories are skipped (their terms forbid
// harvesting). Deduplicated against the Google Places lists by phone and by domain.
//   node scripts/web-suppliers.mjs --in <urls.json> --known <rows1.json,rows2.json> --out <dir>
// urls.json: [{ "url": "...", "q": "search words", "city": "الرياض" }]
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d }
const IN = arg('in'), OUT = arg('out'), KNOWN = (arg('known', '') || '').split(',').filter(Boolean)
fs.mkdirSync(OUT, { recursive: true })

const SKIP = /(haraj|opensooq|mstaml|snapchat|instagram|tiktok|facebook|twitter|x\.com|youtube|linkedin|magicpin|eyeofriyadh|bayut|hawamer|almrsal|albanknote|projectsegy|egyprojects|small-projects|post\.sa|wareshop|saudi-equipment|steel-network|readymix\.sa|guide\.alriyadhcity|telooa|almrj3|cleaningpioneers|netlify|manus\.space|youm7|sabic\.com|wikipedia|google\.|yellowpages|dalili|daleeli|zawya|amazon|noon\.com|\.gov\.)/i
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const BAD_EMAIL = /(example\.|sentry|wixpress|domain\.com|email\.com|yourcompany|test@|\.png|\.jpe?g|\.webp|\.svg|noreply|no-reply)/i
const DIG = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' }
const latin = s => s.replace(/[٠-٩]/g, d => DIG[d])
const safeDecode = s => { try { return decodeURIComponent(s) } catch { return s } }

function phonesIn(html) {
  const t = latin(html.replace(/<[^>]+>/g, ' ')) + ' ' + latin(safeDecode(html))
  const out = new Set()
  for (const m of t.matchAll(/(?:\+|00)?966[\s-]?5\d(?:[\s-]?\d){7}|\b05\d(?:[\s-]?\d){7}\b|\b9200(?:[\s-]?\d){5}\b|(?:\+|00)?966[\s-]?1\d(?:[\s-]?\d){7}|\b01\d(?:[\s-]?\d){7}\b/g)) {
    let d = m[0].replace(/\D/g, '')
    if (d.startsWith('00966')) d = d.slice(5); else if (d.startsWith('966')) d = d.slice(3)
    if (d.startsWith('0')) d = d.slice(1)
    if (/^5\d{8}$/.test(d) || /^1\d{8}$/.test(d) || /^9200\d{5}$/.test(d)) out.add(d)
  }
  for (const m of t.matchAll(/wa\.me\/(?:966)?0?(5\d{8})/g)) out.add(m[1])
  return [...out]
}
const emailsIn = html => [...new Set([...html.matchAll(/mailto:([^"'?>\s]+)/gi)].map(m => safeDecode(m[1]).toLowerCase()).concat([...html.matchAll(EMAIL_RE)].map(m => m[0].toLowerCase())))].filter(e => !BAD_EMAIL.test(e) && e.length < 60)

async function get(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000)
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (TaseerakDirectory; business contact lookup; info@taseerak.com)', 'Accept-Language': 'ar,en' } })
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return ''
    return (await res.text()).slice(0, 800000)
  } catch { return '' } finally { clearTimeout(t) }
}
const titleOf = html => {
  const og = html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i)?.[1]
  const t = html.match(/<title[^>]*>([^<]+)/i)?.[1]
  return (og || t || '').replace(/&amp;/g, '&').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)
}

const CACHE = path.join(OUT, 'web-cache.json')
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}
const inputs = JSON.parse(fs.readFileSync(IN, 'utf8'))
const byHost = new Map()
for (const it of inputs) {
  let u; try { u = new URL(it.url) } catch { continue }
  if (SKIP.test(u.hostname)) continue
  const host = u.hostname.replace(/^www\./, '')
  const prev = byHost.get(host)
  if (prev) { if (!prev.q.includes(it.q)) prev.q.push(it.q) } else byHost.set(host, { host, origin: u.origin, page: u.href, q: [it.q], city: it.city || '' })
}

let i = 0
const sites = [...byHost.values()]
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < sites.length) {
    const s = sites[i++]
    if (cache[s.host]) continue
    const pages = [s.page, s.origin + '/']
    let html = ''
    for (const p of [...new Set(pages)]) html += await get(p)
    const contact = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map(m => m[1]).find(h => /contact|اتصل|تواصل/i.test(safeDecode(h)))
    if (contact) { try { html += await get(new URL(contact, s.origin).href) } catch {} }
    cache[s.host] = { title: titleOf(html), phones: phonesIn(html), emails: emailsIn(html).slice(0, 3), ok: !!html }
  }
}))
fs.writeFileSync(CACHE, JSON.stringify(cache))

// Known phones / domains from the Google Places lists
const knownPhones = new Set(), knownHosts = new Set()
for (const f of KNOWN) for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  if (r.phone_norm) knownPhones.add(r.phone_norm)
  try { if (r.website) knownHosts.add(new URL(r.website).hostname.replace(/^www\./, '')) } catch {}
}
const rows = sites.map(s => ({ ...s, ...cache[s.host] })).filter(s => s.ok && (s.phones?.length || s.emails?.length))
const fresh = rows.filter(s => !knownHosts.has(s.host) && !s.phones.some(p => knownPhones.has(p)))
fs.writeFileSync(path.join(OUT, 'web-suppliers.json'), JSON.stringify(rows))
console.log(`sites ${sites.length}, with contacts ${rows.length}, NEW (not in Google lists) ${fresh.length}, new mobiles ${fresh.filter(s => s.phones.some(p => p.startsWith('5'))).length}, new emails ${fresh.filter(s => s.emails.length).length}`)
