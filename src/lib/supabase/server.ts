import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server client — use in Server Components, API Routes, Middleware
export function createServerSupabaseClient() {
  const cookieStore = cookies()
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
