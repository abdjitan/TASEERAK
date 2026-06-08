// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Fields we ask Google for. The field mask drives the billing SKU, so we only
// request what the discovery tool actually shows.
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.primaryTypeDisplayName',
  'nextPageToken',
].join(',')

// POST /api/discover-suppliers  { query, pageToken? }  (admin only)
// Live Google Places (New) Text Search. Nothing is stored — results are
// returned to the admin to review/export/invite.
export async function POST(req: NextRequest) {
  // Admin-only: protects the Google quota from abuse.
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', message: 'سجّل الدخول أولاً.' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden', message: 'هذه الأداة للإدارة فقط.' }, { status: 403 })

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'missing_key', message: 'مفتاح Google غير مُعدّ بعد. أضِف GOOGLE_MAPS_API_KEY في إعدادات Vercel ثم أعد المحاولة.' },
      { status: 503 },
    )
  }

  let body: any = {}
  try { body = await req.json() } catch {}
  const query = (body.query || '').toString().trim()
  const pageToken = body.pageToken || null
  if (!query) return NextResponse.json({ error: 'no_query', message: 'اكتب نوع المواد أو نص البحث.' }, { status: 400 })

  const payload: any = { textQuery: query, regionCode: 'SA', languageCode: 'ar', pageSize: 20 }
  if (pageToken) payload.pageToken = pageToken

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        { error: 'google_error', message: data?.error?.message || 'خطأ من Google Maps. تأكد من تفعيل Places API وصلاحية المفتاح.' },
        { status: 502 },
      )
    }
    const places = (data.places || []).map((p: any) => ({
      id: p.id,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
      website: p.websiteUri || '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? null,
      mapsUrl: p.googleMapsUri || '',
      type: p.primaryTypeDisplayName?.text || '',
      status: p.businessStatus || '',
    }))
    return NextResponse.json({ places, nextPageToken: data.nextPageToken || null })
  } catch {
    return NextResponse.json({ error: 'fetch_failed', message: 'تعذّر الاتصال بـ Google Maps. حاول مرة ثانية.' }, { status: 502 })
  }
}
