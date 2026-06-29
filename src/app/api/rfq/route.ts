import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/rfq — list RFQs (filtered by role)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, profile_sectors(sector)')
    .eq('id', user.id)
    .single()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const sector = searchParams.get('sector')
  const region = searchParams.get('region')

  let query = supabase.from('rfqs').select('*, contractor:profiles_public!contractor_id(company_name_ar, region)')

  // Contractors see their own RFQs
  if (profile?.role === 'contractor') {
    query = query.eq('contractor_id', user.id)
  }
  // Suppliers see open RFQs in their sectors
  else if (profile?.role === 'supplier') {
    const sectors = profile.profile_sectors?.map((s: any) => s.sector) ?? []
    query = query.eq('status', 'open').in('sector', sectors)
  }

  if (status) query = query.eq('status', status)
  if (sector) query = query.eq('sector', sector)
  if (region) query = query.eq('region', region)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/rfq — create new RFQ
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, subscription_plan')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'contractor') {
    return NextResponse.json({ error: 'Only contractors can create RFQs' }, { status: 403 })
  }

  // Free plan: limit 5 RFQs per month
  if (profile.subscription_plan === 'free') {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('rfqs')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if ((count ?? 0) >= 5) {
      return NextResponse.json({
        error: 'وصلت للحد الأقصى للخطة المجانية (5 طلبات/شهر). رقّ للخطة الاحترافية'
      }, { status: 403 })
    }
  }

  const body = await request.json()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + (body.validity_hours || 24))

  const { data, error } = await supabase
    .from('rfqs')
    .insert({
      contractor_id: user.id,
      sector: body.sector,
      product_name: body.product_name,
      specification: body.specification,
      quantity: body.quantity,
      unit: body.unit,
      region: body.region,
      city: body.city,
      delivery_required: body.delivery_required ?? true,
      vat_invoice_required: body.vat_invoice_required ?? true,
      hide_identity: body.hide_identity ?? true,
      notes: body.notes,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // TODO: Trigger WhatsApp notifications to relevant suppliers
  // await notifySuppliers(data.id, data.sector, data.region)

  return NextResponse.json({ data }, { status: 201 })
}
