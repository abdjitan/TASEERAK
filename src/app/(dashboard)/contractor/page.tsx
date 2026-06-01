// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

export default function ContractorDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)

      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)

      const { data: r } = await supabase.from('rfqs').select('*').eq('contractor_id', session.user.id).order('created_at', { ascending: false })
      setRfqs(r || [])
      setLoading(false)
    }
    init()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="animate-pulse text-blue-600 font-semibold">جارٍ التحميل...</div>
    </div>
  )

  const active = rfqs.filter(r => r.status === 'open')
  const closed = rfqs.filter(r => r.status === 'closed')
  const totalOffers = rfqs.reduce((s, r) => s + (r.offer_count || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Top Nav */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🏗</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">Taseerak</span>
              <span className="text-xs text-gray-400 mr-2">| {profile?.company_name_ar}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/contractor/rfq/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow">
              + طلب تسعير
            </a>
            <button onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              خروج
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">أهلاً، {profile?.company_name_ar} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">إليك ملخص طلباتك وعروضك</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'طلبات نشطة', value: active.length, icon: '📋', color: 'blue' },
            { label: 'إجمالي العروض', value: totalOffers, icon: '💬', color: 'emerald' },
            { label: 'صفقات مكتملة', value: closed.length, icon: '✅', color: 'amber' },
            { label: 'إجمالي الطلبات', value: rfqs.length, icon: '📊', color: 'purple' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{icon}</span>
                <span className={`text-2xl font-bold text-${color}-600`}>{value}</span>
              </div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* RFQ List */}
        {rfqs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">لا يوجد طلبات بعد</h2>
            <p className="text-sm text-gray-500 mb-6">أرسل أول طلب تسعير وابدأ تلقي عروض من الموردين</p>
            <a href="/contractor/rfq/new"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow">
              + طلب تسعير جديد
            </a>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-4">طلبات التسعير</h2>
            <div className="space-y-3">
              {rfqs.map(rfq => (
                <a key={rfq.id} href={`/contractor/rfq/${rfq.id}`}
                  className="block bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                        rfq.status === 'open' ? 'bg-blue-50' : rfq.status === 'closed' ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        {rfq.status === 'open' ? '📋' : rfq.status === 'closed' ? '✅' : '⏰'}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900">{rfq.product_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            {SECTOR_LABELS[rfq.sector] || rfq.sector}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            rfq.status === 'open' ? 'bg-green-100 text-green-700' :
                            rfq.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                          }`}>
                            {rfq.status === 'open' ? '● مفتوح' : rfq.status === 'closed' ? '● مغلق' : '● منتهي'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-blue-600">{rfq.offer_count || 0}</div>
                      <div className="text-[10px] text-gray-400">عرض</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 pr-13">
                    <span>📦 {rfq.quantity} {rfq.unit}</span>
                    <span>📍 {rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</span>
                    {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
