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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _client
}
