'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Public pages: is someone signed in on this device? Reads the local session only (no network call),
// so the header can say «حسابي» instead of «دخول» to a signed-in visitor (UX-143). /login sends a
// signed-in user to their own home, so «حسابي» links there.
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let alive = true
    const sb = createClient()
    sb.auth.getSession().then(({ data }: any) => { if (alive) setSignedIn(!!data?.session) }, () => {})
    // follows sign-in / sign-out on the page itself (e.g. right after deleting the account, round-4 UX-147)
    const { data: sub } = sb.auth.onAuthStateChange((_ev: any, session: any) => { if (alive) setSignedIn(!!session) })
    return () => { alive = false; sub?.subscription?.unsubscribe() }
  }, [])
  return signedIn
}
