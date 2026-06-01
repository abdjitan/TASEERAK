'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SubcontractorRequest, SubcontractorOffer, SubRequestFormData, SubcontractorSpecialty, ContractorGrade } from '@/types'
import { toast } from 'sonner'

// ─── For contractors looking for subcontractors ───────────────────────────────
export function useSubcontractorRequests(requesterId?: string) {
  const [requests, setRequests] = useState<SubcontractorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!requesterId) return
    fetchRequests()
  }, [requesterId])

  async function fetchRequests() {
    setLoading(true)
    const { data, error } = await supabase
      .from('subcontractor_requests')
      .select('*')
      .eq('requester_id', requesterId!)
      .order('created_at', { ascending: false })

    if (!error && data) setRequests(data as SubcontractorRequest[])
    setLoading(false)
  }

  async function createRequest(formData: SubRequestFormData) {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + formData.validity_hours)

    const { data, error } = await supabase
      .from('subcontractor_requests')
      .insert({
        requester_id: requesterId,
        specialty: formData.specialty,
        min_grade: formData.min_grade,
        region: formData.region,
        city: formData.city,
        project_value: formData.project_value,
        start_date: formData.start_date,
        duration_months: formData.duration_months,
        description: formData.description,
        requires_permit: formData.requires_permit,
        requires_warranty: formData.requires_warranty,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) { toast.error('حدث خطأ أثناء إرسال الطلب'); return null }
    toast.success('تم إرسال طلبك للمقاولين الفرعيين المؤهلين')
    await fetchRequests()
    return data
  }

  return { requests, loading, createRequest, refresh: fetchRequests }
}

// ─── Browse subcontractors ────────────────────────────────────────────────────
export function useSubcontractors(filters?: {
  specialty?: SubcontractorSpecialty
  minGrade?: ContractorGrade
  region?: string
}) {
  const [contractors, setContractors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchContractors() }, [JSON.stringify(filters)])

  async function fetchContractors() {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('*, contractor_specialties(specialty)')
      .eq('is_subcontractor', true)
      .eq('verification_status', 'verified')

    if (filters?.region) query = query.eq('region', filters.region)

    const gradeOrder: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 }
    if (filters?.minGrade) {
      const minVal = gradeOrder[filters.minGrade]
      const validGrades = Object.entries(gradeOrder)
        .filter(([, v]) => v >= minVal)
        .map(([k]) => k)
      query = query.in('contractor_grade', validGrades)
    }

    const { data, error } = await query.order('rating_avg', { ascending: false })

    if (!error && data) {
      let result = data
      if (filters?.specialty) {
        result = data.filter((c: any) =>
          c.contractor_specialties?.some((s: any) => s.specialty === filters.specialty)
        )
      }
      setContractors(result)
    }
    setLoading(false)
  }

  return { contractors, loading, refresh: fetchContractors }
}

// ─── Incoming requests for subcontractors ────────────────────────────────────
export function useIncomingSubRequests(contractorId?: string, specialties?: SubcontractorSpecialty[]) {
  const [requests, setRequests] = useState<SubcontractorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!contractorId || !specialties?.length) return
    fetchIncoming()

    // Real-time
    const channel = supabase
      .channel(`sub-requests-${contractorId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'subcontractor_requests',
        filter: `status=eq.open`,
      }, () => fetchIncoming())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [contractorId, specialties?.join(',')])

  async function fetchIncoming() {
    setLoading(true)
    const { data, error } = await supabase
      .from('subcontractor_requests')
      .select('*, requester:requester_id(company_name_ar, region, contractor_grade, rating_avg)')
      .eq('status', 'open')
      .in('specialty', specialties ?? [])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) setRequests(data as SubcontractorRequest[])
    setLoading(false)
  }

  async function submitOffer(requestId: string, offer: {
    proposed_value?: number
    proposed_duration_months?: number
    notes?: string
  }) {
    const { error } = await supabase
      .from('subcontractor_offers')
      .insert({ request_id: requestId, supplier_id: contractorId, ...offer })

    if (error) {
      toast.error(error.code === '23505' ? 'أرسلت عرضاً لهذا الطلب مسبقاً' : 'حدث خطأ')
      return false
    }
    toast.success('تم إرسال عرضك بنجاح')
    return true
  }

  return { requests, loading, submitOffer, refresh: fetchIncoming }
}
