// @ts-nocheck
// TEMPORARY diagnostic — probes which Wathq endpoint accepts a given CR number
// (old 1010/4030 vs unified 700) using the server's WATHQ_API_KEY. Token-gated
// to avoid abuse/quota drain. DELETE after we pick the right resolver.
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

const KEY = process.env.WATHQ_API_KEY
const BASE = process.env.WATHQ_API_BASE || 'https://api.wathq.sa'
const TOKEN = 'probe_8f3k2qz'

const PATHS = [
  '/commercial-registration/fullinfo/',
  '/commercialregistration/info/',
  '/commercialregistration/fullinfo/',
  '/v5/commercialregistration/info/',
  '/commercial-registration/info/',
]

export async function GET(req: NextRequest) {
  const cr = (req.nextUrl.searchParams.get('cr') || '').trim()
  const token = req.nextUrl.searchParams.get('token') || ''
  if (token !== TOKEN) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!KEY) return NextResponse.json({ error: 'no_key' })
  if (!/^\d{10}$/.test(cr)) return NextResponse.json({ error: 'bad_cr' })

  const out: any[] = []
  for (const p of PATHS) {
    const url = `${BASE}${p}${cr}?language=ar`
    try {
      const res = await fetch(url, { headers: { apiKey: KEY, Accept: 'application/json' }, cache: 'no-store' })
      const txt = await res.text()
      let j: any = null; try { j = JSON.parse(txt) } catch {}
      out.push({
        path: p,
        status: res.status,
        name: j?.name ?? null,
        crNationalNumber: j?.crNationalNumber ?? null,
        crNumber: j?.crNumber ?? null,
        statusName: j?.status?.name ?? j?.status ?? null,
        parties: Array.isArray(j?.parties) ? j.parties.length : (j?.parties ? 'obj' : 0),
        managers: Array.isArray(j?.management?.managers) ? j.management.managers.length : 0,
        topKeys: j ? Object.keys(j).slice(0, 20) : null,
        snippet: txt.slice(0, 200),
      })
    } catch (e: any) {
      out.push({ path: p, error: e?.message || 'fetch_failed' })
    }
  }
  return NextResponse.json({ cr, results: out })
}
