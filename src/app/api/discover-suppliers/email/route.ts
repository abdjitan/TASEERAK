import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import dns from 'node:dns/promises'
import net from 'node:net'

export const runtime = 'nodejs'
export const maxDuration = 30

// Google Places never returns emails. As a best-effort supplement, when a shop
// has a website we fetch a couple of likely pages and scrape a contact email.
// Works for some shops, not all — phone/WhatsApp stays the primary channel.
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const JUNK = /(sentry|example\.com|email\.com|domain\.com|yourdomain|wixpress|\.wix|godaddy|cloudflare|@2x|@3x)/i

// SSRF guard (H8, hardened 2026-10-10): only fetch public http(s) hosts. The hostname is
// resolved and EVERY resolved address must be public (blocks 127.0.0.1.nip.io-style names,
// IPv6 incl. v4-mapped, CGNAT 100.64/10, metadata 169.254.169.254). Redirects are followed
// manually and each hop is re-checked. (Residual DNS-rebinding window between lookup and
// fetch is accepted: admin-only route.)
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  }
  const v = ip.toLowerCase()
  if (v.startsWith('::ffff:')) {
    const rest = v.slice(7)
    if (net.isIPv4(rest)) return isPrivateIp(rest)
    const m = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/) // ::ffff:7f00:1 == 127.0.0.1
    if (!m) return true
    const hi = parseInt(m[1], 16), lo = parseInt(m[2], 16)
    return isPrivateIp([hi >> 8, hi & 255, lo >> 8, lo & 255].join('.'))
  }
  return v === '::' || v === '::1' || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') ||
    v.startsWith('fc') || v.startsWith('fd') || v.startsWith('ff')
}

async function isSafeRemoteUrl(raw: string): Promise<boolean> {
  let u: URL
  try { u = new URL(raw) } catch { return false }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  if (u.username || u.password) return false
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (net.isIP(host)) return !isPrivateIp(host)
  try {
    const addrs = await dns.lookup(host, { all: true })
    return addrs.length > 0 && addrs.every((x) => !isPrivateIp(x.address))
  } catch { return false }
}

async function grab(url: string): Promise<string> {
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 6000)
    let current = url
    for (let hop = 0; hop < 4; hop++) {
      if (!(await isSafeRemoteUrl(current))) { clearTimeout(t); return '' }
      const res = await fetch(current, {
        signal: c.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TaseerakBot/1.0)' },
      })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) { clearTimeout(t); return '' }
        current = new URL(loc, current).toString()
        continue
      }
      clearTimeout(t)
      if (!res.ok) return ''
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('text') && !ct.includes('html')) return ''
      return (await res.text()).slice(0, 500000)
    }
    clearTimeout(t)
    return ''
  } catch { return '' }
}

function pickEmail(html: string): string | null {
  if (!html) return null
  const found = html.match(EMAIL_RE) || []
  for (const raw of found) {
    if (/\.(png|jpe?g|gif|webp|svg|css|js)$/i.test(raw)) continue
    if (JUNK.test(raw)) continue
    return raw
  }
  return null
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ email: null }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ email: null }, { status: 403 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const website = (body.website || '').toString().trim()
  if (!website) return NextResponse.json({ email: null })

  let origin = website
  try { origin = new URL(website).origin } catch {}
  const urls = Array.from(new Set([
    website,
    origin,
    origin + '/contact',
    origin + '/contact-us',
    origin + '/about',
    origin + '/اتصل-بنا',
  ]))

  for (const u of urls) {
    const email = pickEmail(await grab(u))
    if (email) return NextResponse.json({ email })
  }
  return NextResponse.json({ email: null })
}
