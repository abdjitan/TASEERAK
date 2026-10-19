/**
 * Next.js Server-Side Middleware — Route Protection
 *
 * This runs on the SERVER before any page is rendered in the browser.
 * It is the ONLY reliable way to protect routes; client-side checks
 * can be bypassed with DevTools.
 *
 * Rules:
 *  • /login, /register    → redirect to / if already logged in
 *  • /contractor, /supplier, /settings, /location, /market
 *                         → redirect to /login if NOT logged in
 *  • /admin               → redirect to / if NOT admin (checked in DB)
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Route lists ─────────────────────────────────────────────────────────────

/** Any logged-in user can access these (but NOT anonymous visitors) */
const PROTECTED = [
  '/contractor',
  '/supplier',
  '/settings',
  '/admin',
  '/location',
  '/market',
  '/onboarding',
  '/welcome',
  '/messages',
  '/notifications',
  '/verification',
]

/** Only users with role = 'admin' can access these */
const ADMIN_ONLY = ['/admin']

/** Redirect logged-in users AWAY from these (they're already authed) */
const AUTH_PAGES = ['/login', '/register']

// ─── Signed role cookie ───────────────────────────────────────────────────────

const ROLE_SECRET = process.env.ROLE_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
let roleKey: Promise<CryptoKey> | null = null

async function signRole(value: string): Promise<string> {
  roleKey ||= crypto.subtle.importKey('raw', new TextEncoder().encode('tsk_role|' + ROLE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', await roleKey, new TextEncoder().encode(value)))
  let b = ''
  for (let i = 0; i < mac.length; i++) b += String.fromCharCode(mac[i])
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  // We must create a new response object and forward cookies properly
  // so Supabase Auth session tokens get refreshed automatically.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // RESILIENT cookie adapter: we expose BOTH cookie interfaces so this
      // works no matter which @supabase/ssr version is installed:
      //   • get/set/remove  → used by 0.3.x (the version installed today)
      //   • getAll/setAll   → used by 0.4.0+ (if the library is ever upgraded)
      // History: the app shipped with ONLY getAll/setAll while 0.3.0 was
      // installed; 0.3.0 ignored it, read NO cookies, getUser() was always
      // null on the server, and every protected route bounced to /login →
      // infinite refresh loop. Providing both interfaces makes that class of
      // version-mismatch bug impossible to reintroduce.
      cookies: {
        // ── 0.3.x interface ──────────────────────────────────────────────
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Write to the *request* so downstream server code sees the refreshed
          // session immediately, then re-issue the response so the refreshed
          // cookie is also sent back to the browser.
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value: '', ...options })
        },
        // ── 0.4.0+ interface (forward-compatible) ────────────────────────
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Speed (2026-10-12): the database is far from our users, and getUser() re-verified the token
  // with Supabase Auth on EVERY navigation (a full round trip before the page could start).
  // Routing only needs to know who is signed in: getSession() reads the session cookie and
  // refreshes it only when it has expired. Data is still protected by RLS, which verifies the
  // JWT on every query, and admin routes are still checked against the database below.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  // The role/onboarding lookup is cached in a short-lived cookie (uid:role:1:hmac) so a normal
  // navigation makes no database call at all. Only cached once onboarding is done, so a new
  // account always sees its real state. Never trusted for /admin (checked in the DB below).
  // The cookie is HMAC-signed with a server-only secret (audit: an unsigned cookie let a user
  // pick their own role for page routing); without a secret the cache is simply not used.
  const ROLE_COOKIE = 'tsk_role'
  let roleCookie: string | null = null
  let profileMemo: any
  async function profileOf(uid: string): Promise<{ role?: string; role_chosen_at?: any } | null> {
    if (profileMemo !== undefined) return profileMemo
    const c = request.cookies.get(ROLE_COOKIE)?.value
    if (c && ROLE_SECRET) {
      const [id, role, chosen, sig] = c.split(':')
      if (id === uid && role && chosen === '1' && sig && sameText(sig, await signRole(`${id}:${role}:1`))) {
        profileMemo = { role, role_chosen_at: true }; return profileMemo
      }
    }
    const { data } = await supabase.from('profiles').select('role, role_chosen_at').eq('id', uid).single()
    if (data?.role && data.role_chosen_at && ROLE_SECRET) {
      const v = `${uid}:${data.role}:1`
      roleCookie = `${v}:${await signRole(v)}`
    }
    profileMemo = data || null
    return profileMemo
  }
  const withRole = (res: NextResponse) => {
    if (roleCookie) res.cookies.set(ROLE_COOKIE, roleCookie, { path: '/', maxAge: 600, httpOnly: true, sameSite: 'lax', secure: true })
    return res
  }

  const { pathname } = request.nextUrl

  // Build a redirect that PRESERVES any refreshed auth cookies. Without this,
  // when getUser() rotates the session, the redirect would drop the new
  // cookies and the next request would fail auth → redirect loop.
  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c))
    return withRole(res)
  }

  // Match a protected/auth prefix on a path-segment boundary so "/supplier" does
  // NOT also match the public "/suppliers" leaderboard page (B16).
  const matches = (p: string) => pathname === p || pathname.startsWith(p + '/')

  // ── Rule 1: Already logged in → skip login/register, go to the DASHBOARD ──
  // (not the marketing landing) so a post-login cookie-refresh race can't bounce
  // the user back to "/" and look like the login "failed".
  if (user && AUTH_PAGES.some(matches)) {
    let home = '/contractor'
    try {
      const profile = await profileOf(user.id)
      home = profile?.role === 'admin' ? '/admin' : !profile?.role_chosen_at ? '/welcome' : profile?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
    } catch {}
    return redirectTo(new URL(home, request.url))
  }

  // ── Rule 2: Not logged in → can't access protected pages ─────────────────
  if (!user && PROTECTED.some(matches)) {
    const loginUrl = new URL('/login', request.url)
    // Remember where they were going so we can redirect back after login
    loginUrl.searchParams.set('next', pathname)
    return redirectTo(loginUrl)
  }

  // ── Rule 2.2: phone signups pick what they want to do before anything else ──
  if (user && PROTECTED.some(matches) && !matches('/welcome') && !ADMIN_ONLY.some(matches)) {
    const profile = await profileOf(user.id)
    if (profile && profile.role !== 'admin' && !profile.role_chosen_at) return redirectTo(new URL('/welcome', request.url))
  }

  // ── Rule 2.5: role separation — a supplier can't browse contractor pages and
  // vice-versa (previously client-side only). Admin may view both.
  if (user && (matches('/contractor') || matches('/supplier'))) {
    const role = (await profileOf(user.id))?.role
    // The purchase order / deal statement is shared by both parties of the deal (data is
    // still scoped by RLS: a supplier only loads its own offers).
    const sharedDealPage = request.nextUrl.pathname.startsWith('/contractor/orders/')
    if (role === 'supplier' && matches('/contractor') && !sharedDealPage) return redirectTo(new URL('/supplier/dashboard', request.url))
    if (role === 'contractor' && matches('/supplier')) return redirectTo(new URL('/contractor', request.url))
  }

  // ── Rule 3: Admin routes → verify role in database ───────────────────────
  // This DB query only runs for /admin/* routes, so it doesn't slow down
  // regular pages.
  if (user && ADMIN_ONLY.some(matches)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      // Not an admin — send them home silently
      return redirectTo(new URL('/', request.url))
    }
  }

  // All checks passed — continue to the requested page
  return withRole(response)
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Run middleware on every route EXCEPT static assets and image optimisation
// so we don't waste CPU on files that don't need auth checks.
// Only the pages these rules are about. Public pages, assets and API routes no longer pay for an
// auth check on every request (API routes check the user themselves with getRouteUser()).
export const config = {
  matcher: [
    '/contractor/:path*', '/supplier/:path*', '/settings/:path*', '/admin/:path*', '/location/:path*',
    '/market/:path*', '/onboarding/:path*', '/welcome/:path*', '/messages/:path*', '/notifications/:path*',
    '/verification/:path*', '/login', '/register',
  ],
}
