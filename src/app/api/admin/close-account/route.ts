// POST /api/admin/close-account { userId } — the admin closes an account for good (owner 2026-11-17,
// migration 223): admin_close_account() erases the personal data and closes the sign-in like
// delete_my_account(); the person's own verification documents are removed too. Deals stay.
import { NextResponse } from 'next/server'
import { getRouteUser, createAdminSupabaseClient, isAdminSession } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!(await isAdminSession(supabase))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { userId } = await req.json().catch(() => ({}))
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId) || userId === user.id) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const { error } = await supabase.rpc('admin_close_account', { p_user: userId })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  try {
    const admin = createAdminSupabaseClient()
    const { data: files } = await admin.storage.from('licenses').list(userId, { limit: 100 })
    const docs = (files || []).map((f: any) => f.name).filter((n: string) => /^(license|cr|doc)\.[a-z0-9]+$/i.test(n))
    if (docs.length) await admin.storage.from('licenses').remove(docs.map((n: string) => `${userId}/${n}`))
    const { data: ver } = await admin.storage.from('verification').list(userId, { limit: 100 })
    if (ver?.length) await admin.storage.from('verification').remove(ver.map((f: any) => `${userId}/${f.name}`))
  } catch { /* the account is closed; leftover files are unreachable */ }
  return NextResponse.json({ ok: true })
}
