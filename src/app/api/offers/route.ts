// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST /api/offers — submit an offer
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, verification_status')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'supplier') {
    return NextResponse.json({ error: 'Only suppliers can submit offers' }, { status: 403 })
  }

  if (profile.verification_status !== 'verified') {
    return NextResponse.json({ error: 'يجب التحقق من حسابك أولاً قبل إرسال العروض' }, { status: 403 })
  }

  const body = await request.json()

  // Verify RFQ is still open
  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, status, expires_at, contractor_id')
    .eq('id', body.rfq_id)
    .single()

  if (!rfq || rfq.status !== 'open') {
    return NextResponse.json({ error: 'الطلب لم يعد متاحاً' }, { status: 400 })
  }

  if (new Date(rfq.expires_at) < new Date()) {
    return NextResponse.json({ error: 'انتهت صلاحية هذا الطلب' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('offers')
    .insert({
      rfq_id: body.rfq_id,
      supplier_id: user.id,
      total_price: body.total_price,
      unit_price: body.unit_price,
      delivery_days: body.delivery_days,
      notes: body.notes,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'أرسلت عرضاً لهذا الطلب مسبقاً' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create notification for contractor
  await supabase.from('notifications').insert({
    user_id: rfq.contractor_id,
    type: 'rfq_offer',
    title: 'عرض سعر جديد',
    body: `وصلك عرض جديد بسعر SAR ${body.total_price.toLocaleString('en-US')}`,
    data: { rfq_id: body.rfq_id, offer_id: data.id },
  })

  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/offers — accept or reject an offer
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { offer_id, action, po_number } = body

  // Verify the contractor owns the RFQ
  const { data: offer } = await supabase
    .from('offers')
    .select('*, rfq:rfq_id(contractor_id, id)')
    .eq('id', offer_id)
    .single()

  if (!offer) return NextResponse.json({ error: 'العرض غير موجود' }, { status: 404 })
  if ((offer.rfq as any).contractor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'accept') {
    // Accept this offer
    await supabase.from('offers').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      po_number,
    }).eq('id', offer_id)

    // Reject all other offers
    await supabase.from('offers')
      .update({ status: 'rejected' })
      .eq('rfq_id', (offer.rfq as any).id)
      .neq('id', offer_id)

    // Close the RFQ
    await supabase.from('rfqs')
      .update({ status: 'closed' })
      .eq('id', (offer.rfq as any).id)

    // Notify the winning supplier
    await supabase.from('notifications').insert({
      user_id: offer.supplier_id,
      type: 'offer_accepted',
      title: 'تم قبول عرضك! 🎉',
      body: 'قبل المقاول عرضك — تواصل معه لتنسيق التسليم',
      data: { offer_id, rfq_id: (offer.rfq as any).id },
    })

  } else if (action === 'reject') {
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offer_id)

    await supabase.from('notifications').insert({
      user_id: offer.supplier_id,
      type: 'offer_rejected',
      title: 'لم يتم قبول عرضك',
      body: 'اختار المقاول مورداً آخر في هذا الطلب',
      data: { offer_id },
    })
  }

  return NextResponse.json({ success: true })
}
