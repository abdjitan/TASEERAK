import { NextResponse } from 'next/server'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Close the caller's account for good (site: cookie; mobile app: Authorization: Bearer).
// delete_my_account() (migration 137) erases the personal data and destroys the sign-in; here we
// also remove the verification documents the user uploaded (licenses/<uid>/license|cr|doc.*, verification/<uid>/*).
// Files shared inside deals (spec files, invoices) stay, as the other party's records.
export async function POST() {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    const code = /admin_cannot_self_delete/.test(error.message) ? 'admin_cannot_self_delete' : 'delete_failed'
    return NextResponse.json({ ok: false, error: code }, { status: code === 'delete_failed' ? 500 : 400 })
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data: files } = await admin.storage.from('licenses').list(user.id, { limit: 100 })
    const docs = (files || []).map((f: any) => f.name).filter((n: string) => /^(license|cr|doc)\.[a-z0-9]+$/i.test(n))
    if (docs.length) await admin.storage.from('licenses').remove(docs.map((n: string) => `${user.id}/${n}`))
    // verification/<uid>/ holds only the user's own CR / license / ID documents (upload-verification):
    // all of it goes (PDPL, audit M7).
    const { data: ver } = await admin.storage.from('verification').list(user.id, { limit: 100 })
    if (ver?.length) await admin.storage.from('verification').remove(ver.map((f: any) => `${user.id}/${f.name}`))
  } catch { /* the account is already closed; a leftover file is unreachable without a session */ }

  return NextResponse.json({ ok: true })
}
