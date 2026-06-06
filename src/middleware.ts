// @ts-nocheck
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
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies to the *request* first so downstream server
          // components see the refreshed session immediately.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Re-create response so we can set cookies on it as well.
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

  // ── Rule 1: Already logged in → skip login/register ──────────────────────
  if (user && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return redirectTo(new URL('/', request.url))
  }

  // ── Rule 2: Not logged in → can't access protected pages ─────────────────
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url)
    // Remember where they were going so we can redirect back after login
    loginUrl.searchParams.set('next', pathname)
    return redirectTo(loginUrl)
  }

  // ── Rule 3: Admin routes → verify role in database ───────────────────────
  // This DB query only runs for /admin/* routes, so it doesn't slow down
  // regular pages.
  if (user && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
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
