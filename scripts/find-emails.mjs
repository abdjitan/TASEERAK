// Finds a public business contact email on each shop's own website (homepage + one
// contact page). Results are cached per website so re-runs only fetch new sites.
//   node scripts/find-emails.mjs --rows <riyadh-rows.json> --out <emails.json>
import fs from 'node:fs'

const args = process.argv.slice(2)
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d }
const ROWS = arg('rows'), OUT = arg('out')
const CONCURRENCY = 12
const rows = JSON.parse(fs.readFileSync(ROWS, 'utf8'))
const cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}

const SKIP_HOSTS = /(instagram|facebook|fb\.com|twitter|x\.com|tiktok|snapchat|youtube|linkedin|wa\.me|whatsapp|t\.me|google\.|goo\.gl|maps\.app|linktr\.ee|haraj|bit\.ly)/i
const BAD_EMAIL = /(example\.|sentry|wixpress|domain\.com|email\.com|yourcompany|test@|@sentry|\.png|\.jpe?g|\.gif|\.webp|\.svg|@2x|u00|noreply|no-reply)/i
const safeDecode = s => { try { return decodeURIComponent(s) } catch { return s } }
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

async function get(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 9000)
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (TaseerakDirectory; contact lookup)' } })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !type.includes('html')) return ''
    return (await res.text()).slice(0, 600000)
  } catch { return '' } finally { clearTimeout(t) }
}

function emailsIn(html) {
  const found = new Set()
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) found.add(safeDecode(m[1]).toLowerCase())
  for (const m of html.matchAll(EMAIL_RE)) found.add(m[0].toLowerCase())
  return [...found].filter(e => !BAD_EMAIL.test(e) && e.length < 60)
}

async function lookup(site) {
  let u
  try { u = new URL(site) } catch { return [] }
  if (!/^https?:$/.test(u.protocol) || SKIP_HOSTS.test(u.hostname)) return []
  const home = await get(u.href)
  let emails = emailsIn(home)
  if (emails.length === 0 && home) {
    const links = [...home.matchAll(/href=["']([^"'#]+)["']/gi)].map(m => m[1])
      .filter(h => /contact|about|اتصل|تواصل|من-نحن/i.test(safeDecode(h)))
    for (const h of links.slice(0, 2)) {
      try { emails = emailsIn(await get(new URL(h, u).href)) } catch {}
      if (emails.length) break
    }
  }
  // Prefer an address on the shop's own domain.
  const host = u.hostname.replace(/^www\./, '')
  return emails.sort((a, b) => Number(b.endsWith(host)) - Number(a.endsWith(host))).slice(0, 2)
}

const sites = [...new Set(rows.map(r => r.website).filter(Boolean))].filter(s => !(s in cache))
console.log('websites to check', sites.length, 'cached', Object.keys(cache).length)
let i = 0, done = 0, hits = 0
async function worker() {
  while (i < sites.length) {
    const s = sites[i++]
    try { cache[s] = await lookup(s) } catch { cache[s] = [] }
    if (cache[s].length) hits++
    if (++done % 100 === 0) { fs.writeFileSync(OUT, JSON.stringify(cache)); console.log(done, '/', sites.length, 'emails', hits) }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
fs.writeFileSync(OUT, JSON.stringify(cache))
console.log('done', done, 'with email', hits)
