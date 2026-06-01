// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="text-center animate-pulse">
        <img src="/logo-outlined.png" alt="" className="w-16 h-16 mx-auto mb-4 animate-float" />
        <div className="text-blue-600 font-semibold">جارٍ التحميل...</div>
      </div>
    </div>
  )

  const active = rfqs.filter(r => r.status === 'open')
  const closed = rfqs.filter(r => r.status === 'closed')
  const totalOffers = rfqs.reduce((s, r) => s + (r.offer_count || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 bg-dots" dir="rtl">
      {/* Nav */}
      <nav className="glass sticky top-0 z-50 border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-outlined.png" alt="تسعيرك" className="w-8 h-8" />
            <span className="font-bold text-gray-900">تسعيرك</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">مقاول</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/contractor/rfq/new"
              className="gradient-blue text-white px-5 py-2 rounded-xl text-sm font-semibold
              hover:shadow-lg hover:shadow-blue-300/30 transition-all duration-300 active:scale-[0.98]">
              + طلب تسعير
            </a>
            <LanguageSwitcher variant="minimal" />
            <button onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-all">
              خروج
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900">
            أهلاً، {profile?.company_name_ar} 👋
          </h1>
          <p className="text-gray-500 mt-1">إليك ملخص طلباتك وعروضك</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: 'طلبات نشطة', value: active.length, icon: '📋', gradient: 'from-blue-500 to-blue-600' },
            { label: 'إجمالي العروض', value: totalOffers, icon: '💬', gradient: 'from-emerald-500 to-emerald-600' },
            { label: 'صفقات مكتملة', value: closed.length, icon: '✅', gradient: 'from-amber-500 to-orange-500' },
            { label: 'إجمالي الطلبات', value: rfqs.length, icon: '📊', gradient: 'from-purple-500 to-indigo-600' },
          ].map(({ label, value, icon, gradient }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-sm`}>
                  {icon}
                </div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-gray-900">{value}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* RFQ List */}
        {rfqs.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center animate-slide-up">
            <div className="text-7xl mb-6 animate-float">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">لا يوجد طلبات بعد</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">أرسل أول طلب تسعير وابدأ تلقي عروض من مئات الموردين المعتمدين</p>
            <a href="/contractor/rfq/new"
              className="inline-block gradient-blue text-white px-10 py-4 rounded-xl font-semibold
              hover:shadow-lg hover:shadow-blue-300/30 transition-all duration-300 text-lg">
              + طلب تسعير جديد
            </a>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">طلبات التسعير</h2>
              <span className="text-xs text-gray-400">{rfqs.length} طلب</span>
            </div>
            <div className="space-y-3 stagger">
              {rfqs.map(rfq => (
                <a key={rfq.id} href={`/contractor/rfq/${rfq.id}`}
                  className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm
                  hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                        rfq.status === 'open' ? 'bg-blue-50' : rfq.status === 'closed' ? 'bg-emerald-50' : 'bg-gray-50'
                      }`}>
                        {rfq.status === 'open' ? '📋' : rfq.status === 'closed' ? '✅' : '⏰'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{rfq.product_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-blue text-[10px]">{SECTOR_LABELS[rfq.sector] || rfq.sector}</span>
                          <span className={`badge text-[10px] ${
                            rfq.status === 'open' ? 'badge-green' : rfq.status === 'closed' ? 'badge-gray' : 'badge-red'
                          }`}>
                            {rfq.status === 'open' ? '● مفتوح' : rfq.status === 'closed' ? '● مغلق' : '● منتهي'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center bg-blue-50 rounded-xl px-4 py-2">
                      <div className="text-xl font-bold text-blue-600">{rfq.offer_count || 0}</div>
                      <div className="text-[10px] text-blue-400 font-medium">عرض</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                    <span>📦 {rfq.quantity} {rfq.unit}</span>
                    <span>📍 {rfq.region}</span>
                    {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                    <span className="mr-auto text-blue-500">عرض التفاصيل ←</span>
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
