// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/subcontractors — browse subcontractors
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const specialty = searchParams.get('specialty')
  const minGrade  = searchParams.get('minGrade')
  const region    = searchParams.get('region')

  let query = supabase
    .from('profiles')
    .select('*, contractor_specialties(specialty)')
    .eq('is_subcontractor', true)
    .eq('verification_status', 'verified')
    .eq('is_active', true)

  if (region)   query = query.eq('region', region)
  if (minGrade) {
    const order: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 }
    const valid = Object.entries(order)
      .filter(([, v]) => v >= (order[minGrade] ?? 0))
      .map(([k]) => k)
    query = query.in('contractor_grade', valid)
  }

  const { data, error } = await query.order('rating_avg', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result = data ?? []
  if (specialty) {
    result = result.filter((c: any) =>
      c.contractor_specialties?.some((s: any) => s.specialty === specialty)
    )
  }

  return NextResponse.json({ data: result, count: result.length })
}

// POST /api/subcontractors — create subcontractor request
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, verification_status, subscription_plan')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'contractor') {
    return NextResponse.json({ error: 'فقط المقاولون يمكنهم إرسال طلبات' }, { status: 403 })
  }
  if (profile?.verification_status !== 'verified') {
    return NextResponse.json({ error: 'يجب التحقق من حسابك أولاً' }, { status: 403 })
  }

  const body = await request.json()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + (body.validity_hours || 48))

  const { data, error } = await supabase
    .from('subcontractor_requests')
    .insert({
      requester_id: user.id,
      specialty: body.specialty,
      min_grade: body.min_grade,
      region: body.region,
      city: body.city,
      project_value: body.project_value,
      start_date: body.start_date,
      duration_months: body.duration_months,
      description: body.description,
      requires_permit: body.requires_permit ?? true,
      requires_warranty: body.requires_warranty ?? false,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify matching subcontractors
  const { data: matched } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_subcontractor', true)
    .eq('verification_status', 'verified')
    .eq('region', body.region)

  if (matched?.length) {
    const notifications = matched.map((c: any) => ({
      user_id: c.id,
      type: 'rfq_offer',
      title: 'طلب مقاول فرعي جديد',
      body: `طلب ${body.specialty} في ${body.region}`,
      data: { sub_request_id: data.id },
    }))
    await supabase.from('notifications').insert(notifications)
  }

  return NextResponse.json({ data }, { status: 201 })
}
