import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// H9: the 'licenses' bucket (RFQ spec files, offer catalogs, BOQs) is private. This auth-gated
// proxy turns a stored value (a full public-style URL or a bare object path) into a short-lived
// signed URL and redirects to it — so shared attachments require a logged-in session and the
// links expire, instead of being world-readable forever via a public URL.
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const raw = req.nextUrl.searchParams.get('p') || ''
  if (!raw) return NextResponse.json({ error: 'no_path' }, { status: 400 })

  // extract the object path (everything after '/licenses/'), tolerate a bare path too
  let path = raw
  const marker = '/licenses/'
  const i = raw.indexOf(marker)
  if (i >= 0) path = raw.slice(i + marker.length)
  path = decodeURIComponent(path.split('?')[0]).replace(/^\/+/, '')
  if (!path || path.includes('..')) return NextResponse.json({ error: 'bad_path' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage.from('licenses').createSignedUrl(path, 300)
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.redirect(data.signedUrl)
}
