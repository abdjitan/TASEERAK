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
    createClient().auth.getSession().then(({ data }: any) => { if (alive) setSignedIn(!!data?.session) }, () => {})
    return () => { alive = false }
  }, [])
  return signedIn
}
