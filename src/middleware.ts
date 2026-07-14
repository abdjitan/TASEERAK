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
]

/** Only users with role = 'admin' can access these */
const ADMIN_ONLY = ['/admin']

/** Redirect logged-in users AWAY from these (they're already authed) */
const AUTH_PAGES = ['/login', '/register']

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

  // getUser() validates the JWT with Supabase Auth servers — more secure
  // than getSession() which only reads the local cookie without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Build a redirect that PRESERVES any refreshed auth cookies. Without this,
  // when getUser() rotates the session, the redirect would drop the new
  // cookies and the next request would fail auth → redirect loop.
  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c))
    return res
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
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role || (user.user_metadata as any)?.role
      home = role === 'admin' ? '/admin' : role === 'supplier' ? '/supplier/dashboard' : '/contractor'
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

  // ── Rule 2.5: role separation — a supplier can't browse contractor pages and
  // vice-versa (previously client-side only). Admin may view both.
  if (user && (matches('/contractor') || matches('/supplier'))) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    // احتياطي من JWT: قراءة الملف قد تُرجع null بُعيد التسجيل مباشرة — لا نترك مورّداً على صفحة مقاول
    const role = profile?.role || (user.user_metadata as any)?.role
    if (role === 'supplier' && matches('/contractor')) return redirectTo(new URL('/supplier/dashboard', request.url))
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
  return response
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Run middleware on every route EXCEPT static assets and image optimisation
// so we don't waste CPU on files that don't need auth checks.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
