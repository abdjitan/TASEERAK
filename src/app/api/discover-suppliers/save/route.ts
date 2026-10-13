import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/supabase/server'
import { toSupplierRow } from '@/lib/discovery'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/discover-suppliers/save  { rows:[...], source? }  (admin only)
// Imports rows from an earlier survey export (Excel columns mapped client-side). Every row
// goes through the same classifier + dedup (place_id → CID → phone) as live discovery.
export async function POST(req: NextRequest) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', message: 'سجّل الدخول أولاً.' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden', message: 'هذه الأداة للإدارة فقط.' }, { status: 403 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const input: any[] = Array.isArray(body.rows) ? body.rows.slice(0, 1000) : []
  if (input.length === 0) return NextResponse.json({ error: 'no_rows', message: 'لا توجد صفوف للاستيراد.' }, { status: 400 })
  const source = String(body.source || 'excel_import').slice(0, 60)

  const reasons: Record<string, number> = {}
  const rows: any[] = []
  const seenCid = new Set<string>()
  for (const r of input) {
    const num = (v: any) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const { row, reason } = toSupplierRow({
      placeId: r.place_id || null,
      mapsUrl: r.maps_url,
      name: r.name,
      googleType: r.type,
      phone: r.phone,
      website: r.website,
      address: r.address,
      rating: num(r.rating),
      reviews: num(r.reviews),
      lat: num(r.lat),
      lng: num(r.lng),
      city: r.city,
      district: r.district || null,
      query: r.query,
    }, { source })
    if (!row) { reasons[reason || 'empty'] = (reasons[reason || 'empty'] || 0) + 1; continue }
    if (row.cid) { if (seenCid.has(row.cid)) { reasons.dup_in_file = (reasons.dup_in_file || 0) + 1; continue } seenCid.add(row.cid) }
    rows.push(row)
  }

  let inserted = 0, updated = 0, dupPhone = 0
  for (let i = 0; i < rows.length; i += 250) {
    const { data, error } = await supabase.rpc('upsert_discovered_suppliers', { p_rows: rows.slice(i, i + 250) })
    if (error) { console.error('[discover-suppliers/save]', error.message); return NextResponse.json({ error: 'db', message: 'تعذّر الحفظ.' }, { status: 500 }) }
    inserted += data?.inserted || 0; updated += data?.updated || 0; dupPhone += data?.dup_phone || 0
  }
  return NextResponse.json({ ok: true, received: input.length, inserted, updated, dupPhone, dropped: reasons })
}
