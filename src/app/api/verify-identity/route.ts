// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// =============================================================
// TWO-FACTOR VERIFICATION (server-authoritative).
// The client UI shows a CR + owner-national-ID match for UX, but that result is
// NOT trusted. Here, for a LOGGED-IN user, we re-pull the CR from Wathq on the
// server and confirm the national ID is an owner/manager. Only then do we mark
// the account verified — via the service-role-only admin_set_verification RPC
// (the single path allowed to set verification). The national ID is used
// transiently for the match and never stored.
// =============================================================

const WATHQ_KEY = process.env.WATHQ_API_KEY
const WATHQ_BASE = process.env.WATHQ_API_BASE || 'https://api.wathq.sa'
const WATHQ_CR_PATH = process.env.WATHQ_CR_PATH || '/sandbox/commercial-registration/fullinfo/'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const cr = String(body?.cr || '').trim()
  const nationalId = String(body?.nationalId || '').trim()
  if (!/^\d{10}$/.test(cr) || !/^[12]\d{9}$/.test(nationalId)) {
    return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 })
  }
  if (!WATHQ_KEY) return NextResponse.json({ ok: true, verified: false, reason: 'wathq_off' })

  // Only verify against the CR the user actually registered with (anti-tamper).
  const { data: prof } = await supabase.from('profiles').select('commercial_registration, verification_status').eq('id', user.id).single()
  if (!prof || (prof.commercial_registration && prof.commercial_registration !== cr)) {
    return NextResponse.json({ ok: false, error: 'cr_mismatch' }, { status: 400 })
  }
  if (prof.verification_status === 'verified') return NextResponse.json({ ok: true, verified: true, already: true })

  // Server-side Wathq pull (can't be spoofed by the client).
  let j: any = {}
  try {
    const res = await fetch(`${WATHQ_BASE}${WATHQ_CR_PATH}${cr}?language=ar`, {
      headers: { apiKey: WATHQ_KEY, Accept: 'application/json' }, cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ ok: true, verified: false, reason: 'wathq_error', status: res.status })
    j = await res.json()
  } catch {
    return NextResponse.json({ ok: true, verified: false, reason: 'network' })
  }

  const statusName = j?.status?.name ?? (typeof j?.status === 'string' ? j.status : null)
  const isActive = j?.status?.id === 1 || /نشط|active|ساري|قائم|valid/i.test(String(statusName ?? ''))

  const parties = Array.isArray(j?.parties) ? j.parties : []
  const managers = Array.isArray(j?.management?.managers) ? j.management.managers : []
  const isOwner = parties.some((p: any) => p?.identity?.id != null && String(p.identity.id) === nationalId)
  const isManager = managers.some((m: any) => m?.identity?.id != null && String(m.identity.id) === nationalId)
  const authorized = isOwner || isManager

  if (isActive && authorized) {
    const svc = createServiceClient()
    await svc.rpc('admin_set_verification', {
      p_user_id: user.id,
      p_source: 'wathq_owner',
      p_official_name: j?.name || null,
      p_cr_status: statusName || null,
      p_activity: (Array.isArray(j?.activities) && j.activities[0]?.name) || null,
    })
    return NextResponse.json({ ok: true, verified: true, owner: isOwner, manager: isManager })
  }

  return NextResponse.json({ ok: true, verified: false, active: isActive, authorized })
}
