import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

// Server client — use in Server Components and API Routes (Next 15: cookies() is async)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Expose BOTH cookie interfaces so this works on any @supabase/ssr
      // version: get/set/remove (0.3.x, installed now) + getAll/setAll (0.4+).
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Pure service-role client (no cookies → always authenticated as `service_role`).
// Use ONLY in trusted server code for privileged actions (e.g. auto-verification
// via admin_set_verification, which is granted to service_role only).
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Public anon client (no cookies) — for public SSR/ISR pages that call
// anon-granted RPCs (e.g. /prices, /suppliers). Uses only NEXT_PUBLIC_* vars,
// so it never needs the service-role key at build time. No cookies → the page
// can be statically prerendered / ISR-cached.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Admin client (bypasses RLS) — use only in trusted server-side code, AFTER checking the caller.
// It must NOT read the request cookies: with cookies @supabase/ssr sends the signed-in user's JWT,
// so every call ran with the user's permissions instead of the service role (uploads to the
// private "licenses" bucket and signed URLs in /api/file failed).
export function createAdminSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// API routes: the signed-in user from EITHER the site's session cookie OR a mobile-app
// `Authorization: Bearer <access_token>` header (the Expo app has no site cookies).
// The returned client acts as that user, so RLS applies exactly as on the site.
type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>
export async function getRouteUser(): Promise<{ supabase: ServerClient; user: any }> {
  const m = /^Bearer\s+(.+)$/i.exec((await headers()).get('authorization') || '')
  if (m) {
    const token = m[1].trim()
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data } = await supabase.auth.getUser(token)
    return { supabase: supabase as unknown as ServerClient, user: data?.user || null }
  }
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}
