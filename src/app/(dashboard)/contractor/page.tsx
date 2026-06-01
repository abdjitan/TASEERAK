// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

export default function ContractorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [rfqs, setRfqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = '/login'
        return
      }

      setUser(session.user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData)

      const { data: rfqData } = await supabase
        .from('rfqs')
        .select('*')
        .eq('contractor_id', session.user.id)
        .order('created_at', { ascending: false })

      setRfqs(rfqData || [])
      setLoading(false)
    }

    init()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-gray-500">جارٍ التحميل...</div>
      </div>
    )
  }

  const activeRFQs = rfqs.filter(r => r.status === 'open')
  const totalOffers = rfqs.reduce((sum, r) => sum + (r.offer_count || 0), 0)
  const completedDeals = rfqs.filter(r => r.status === 'closed').length

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
            <p className="text-sm text-gray-500 mt-1">
              أهلاً، {profile?.company_name_ar || user?.email}
            </p>
          </div>
          <div className="flex gap-3">
            <a href="/contractor/rfq/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              + طلب تسعير جديد
            </a>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors border border-gray-200 px-4 py-2 rounded-lg"
            >
              خروج
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">{activeRFQs.length}</div>
            <div className="text-xs text-gray-500 mt-1">طلبات نشطة</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{totalOffers}</div>
            <div className="text-xs text-gray-500 mt-1">العروض المستلمة</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-amber-600">{completedDeals}</div>
            <div className="text-xs text-gray-500 mt-1">الصفقات المكتملة</div>
          </div>
        </div>

        {/* RFQ List */}
        {rfqs.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">لا يوجد طلبات تسعير بعد</h2>
            <p className="text-sm text-gray-500 mb-4">أرسل أول طلب تسعير وابدأ تلقي عروض من الموردين</p>
            <a href="/contractor/rfq/new" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              + طلب تسعير جديد
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">طلبات التسعير ({rfqs.length})</h2>
            {rfqs.map(rfq => (
              <div key={rfq.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{rfq.product_name}</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                      {SECTOR_LABELS[rfq.sector] || rfq.sector}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    rfq.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : rfq.status === 'closed'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {rfq.status === 'open' ? 'مفتوح' : rfq.status === 'closed' ? 'مغلق' : 'منتهي'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>📦 {rfq.quantity} {rfq.unit}</span>
                  <span>📍 {rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</span>
                  <span>💬 {rfq.offer_count || 0} عرض</span>
                  {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                </div>
                {rfq.notes && (
                  <p className="text-xs text-gray-400 mt-2">{rfq.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
