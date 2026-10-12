// Use @supabase/ssr so the browser stores the session in COOKIES (not
// localStorage). The middleware + server read cookies — if the browser used
// localStorage, the server would never see the session and every protected
// route would bounce back to /login, causing an infinite redirect loop.
import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Never let the browser's HTTP cache answer a data request. Some PostgREST errors (e.g. a
      // 300 "ambiguous embed") are heuristically cacheable, and a cached error kept a page
      // broken for users even after the schema was fixed.
      global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) },
    }
  )
  // Speed: pages call auth.getUser() on mount, which asks Supabase Auth over the network every
  // time (a round trip to the database region before the page can load its data). In the browser
  // the signed-in user is already in the session cookie, kept fresh by auto-refresh, so read it
  // locally. This is not a security check: RLS verifies the token on every data request.
  const auth: any = _client.auth
  const remoteGetUser = auth.getUser.bind(auth)
  auth.getUser = async (jwt?: string) => {
    if (jwt) return remoteGetUser(jwt)
    const { data: { session }, error } = await auth.getSession()
    if (session?.user) return { data: { user: session.user }, error: null }
    return error ? { data: { user: null }, error } : remoteGetUser()
  }
  return _client
}
