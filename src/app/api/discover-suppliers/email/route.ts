import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Google Places never returns emails. As a best-effort supplement, when a shop
// has a website we fetch a couple of likely pages and scrape a contact email.
// Works for some shops, not all — phone/WhatsApp stays the primary channel.
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const JUNK = /(sentry|example\.com|email\.com|domain\.com|yourdomain|wixpress|\.wix|godaddy|cloudflare|@2x|@3x)/i

async function grab(url: string): Promise<string> {
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 6000)
    const res = await fetch(url, {
      signal: c.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TaseerakBot/1.0)' },
    })
    clearTimeout(t)
    if (!res.ok) return ''
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text') && !ct.includes('html')) return ''
    return (await res.text()).slice(0, 500000)
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
