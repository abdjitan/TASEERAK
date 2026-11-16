// POST /api/admin/wa-reply { phone, text } — an admin answers a WhatsApp support message from
// /admin/whatsapp (owner 2026-11-16). Needs an admin with the two-step sign-in (isAdminSession);
// the send itself happens in the wa-webhook edge function (it holds the WhatsApp token), which only
// allows free-form replies within 24 h of the customer's last message.
import { NextResponse } from 'next/server'
import { getRouteUser, isAdminSession } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!(await isAdminSession(supabase))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { phone, text } = await req.json().catch(() => ({}))
  if (typeof phone !== 'string' || typeof text !== 'string' || !text.trim()) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wa-webhook?action=reply`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, text: text.slice(0, 3000), admin_id: user.id }),
  })
  const j: any = await r.json().catch(() => ({}))
  if (!j?.ok) return NextResponse.json({ error: j?.error || 'send' }, { status: j?.error === 'window' ? 409 : 502 })
  return NextResponse.json({ ok: true })
}
