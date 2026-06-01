// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RFQ, RFQFormData, Offer, OfferFormData } from '@/types'
import { toast } from 'sonner'

export function useRFQs(contractorId?: string) {
  const [rfqs, setRFQs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!contractorId) return
    fetchRFQs()
  }, [contractorId])

  async function fetchRFQs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rfqs')
      .select('*, offers(count)')
      .eq('contractor_id', contractorId!)
      .order('created_at', { ascending: false })

    if (!error && data) setRFQs(data as RFQ[])
    setLoading(false)
  }

  async function createRFQ(formData: RFQFormData) {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + formData.validity_hours)

    const { data, error } = await supabase
      .from('rfqs')
      .insert({
        contractor_id: contractorId,
        sector: formData.sector,
        product_name: formData.product_name,
        specification: formData.specification,
        quantity: formData.quantity,
        unit: formData.unit,
        region: formData.region,
        city: formData.city,
        delivery_required: formData.delivery_required,
        vat_invoice_required: formData.vat_invoice_required,
        hide_identity: formData.hide_identity,
        notes: formData.notes,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      toast.error('حدث خطأ أثناء إرسال الطلب')
      return null
    }

    toast.success('تم إرسال طلب التسعير لجميع الموردين')
    await fetchRFQs()
    return data
  }

  async function cancelRFQ(rfqId: string) {
    const { error } = await supabase
      .from('rfqs')
      .update({ status: 'cancelled' })
      .eq('id', rfqId)
      .eq('contractor_id', contractorId!)

    if (error) { toast.error('حدث خطأ'); return }
    toast.success('تم إلغاء الطلب')
    await fetchRFQs()
  }

  return { rfqs, loading, createRFQ, cancelRFQ, refresh: fetchRFQs }
}

// Hook for suppliers — see incoming RFQs
export function useIncomingRFQs(supplierId?: string, sectors?: string[]) {
  const [rfqs, setRFQs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!supplierId || !sectors?.length) return
    fetchIncoming()

    // Real-time subscription
    const channel = supabase
      .channel('rfqs-incoming')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rfqs',
        filter: `status=eq.open`,
      }, () => fetchIncoming())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supplierId, sectors?.join(',')])

  async function fetchIncoming() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rfqs')
      .select('*, contractor:contractor_id(company_name_ar, rating_avg, region)')
      .eq('status', 'open')
      .in('sector', sectors ?? [])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) setRFQs(data as RFQ[])
    setLoading(false)
  }

  return { rfqs, loading, refresh: fetchIncoming }
}

// Hook for offers on a single RFQ
export function useOffers(rfqId?: string) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!rfqId) return
    fetchOffers()

    const channel = supabase
      .channel(`offers-${rfqId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'offers',
        filter: `rfq_id=eq.${rfqId}`,
      }, () => fetchOffers())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rfqId])

  async function fetchOffers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('offers')
      .select('*, supplier:supplier_id(company_name_ar, rating_avg, rating_count, region, verification_status)')
      .eq('rfq_id', rfqId!)
      .order('total_price', { ascending: true })

    if (!error && data) setOffers(data as Offer[])
    setLoading(false)
  }

  async function sendOffer(formData: OfferFormData) {
    const { data, error } = await supabase
      .from('offers')
      .insert(formData)
      .select()
      .single()

    if (error) {
      toast.error(error.code === '23505' ? 'أرسلت عرضاً لهذا الطلب مسبقاً' : 'حدث خطأ')
      return null
    }
    toast.success('تم إرسال عرضك بنجاح')
    await fetchOffers()
    return data
  }

  async function acceptOffer(offerId: string, rfqId: string, poNumber?: string) {
    // Accept this offer
    const { error: e1 } = await supabase
      .from('offers')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), po_number: poNumber })
      .eq('id', offerId)

    // Reject all other offers for this RFQ
    const { error: e2 } = await supabase
      .from('offers')
      .update({ status: 'rejected' })
      .eq('rfq_id', rfqId)
      .neq('id', offerId)

    // Close the RFQ
    const { error: e3 } = await supabase
      .from('rfqs')
      .update({ status: 'closed' })
      .eq('id', rfqId)

    if (e1 || e2 || e3) { toast.error('حدث خطأ'); return }
    toast.success('تم قبول العرض وإشعار المورد')
    await fetchOffers()
  }

  return { offers, loading, sendOffer, acceptOffer, refresh: fetchOffers }
}
