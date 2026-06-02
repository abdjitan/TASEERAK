// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import Logo from '@/components/shared/Logo'
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
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-[#1B2D5B] font-semibold text-sm">جارٍ التحميل...</div>
      </div>
    </div>
  )

  const active = rfqs.filter(r => r.status === 'open')
  const closed = rfqs.filter(r => r.status === 'closed')
  const totalOffers = rfqs.reduce((s, r) => s + (r.offer_count || 0), 0)

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#f4f6f9' }}>
      {/* Background pattern */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />
      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/contractor/rfq/new" className="btn-orange text-xs px-4 py-2">+ طلب تسعير</a>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-all">خروج</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-[#1B2D5B]">أهلاً، {profile?.company_name_ar} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">إليك ملخص طلباتك وعروضك</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: 'طلبات نشطة', value: active.length, icon: '📋', bg: '#1B2D5B' },
            { label: 'إجمالي العروض', value: totalOffers, icon: '💬', bg: '#F5831F' },
            { label: 'صفقات مكتملة', value: closed.length, icon: '✅', bg: '#0F6E56' },
            { label: 'إجمالي الطلبات', value: rfqs.length, icon: '📊', bg: '#7c3aed' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg text-white" style={{ background: bg }}>{icon}</div>
                <div className="text-3xl font-bold text-[#1B2D5B]">{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* RFQs */}
        {rfqs.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center animate-slide-up">
            <div className="text-6xl mb-5 animate-float">📋</div>
            <h2 className="text-xl font-bold text-[#1B2D5B] mb-3">لا يوجد طلبات بعد</h2>
            <p className="text-gray-500 mb-6 text-sm">أرسل أول طلب تسعير وابدأ تلقي عروض من مئات الموردين</p>
            <a href="/contractor/rfq/new" className="inline-block btn-orange px-10 py-4 text-base rounded-2xl">+ طلب تسعير جديد</a>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#1B2D5B]">طلبات التسعير</h2>
              <span className="text-xs text-gray-400">{rfqs.length} طلب</span>
            </div>
            <div className="space-y-3 stagger">
              {rfqs.map(rfq => (
                <a key={rfq.id} href={`/contractor/rfq/${rfq.id}`}
                  className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F5831F]/30 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                        rfq.status === 'open' ? 'bg-[#1B2D5B]/10' : rfq.status === 'closed' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                        {rfq.status === 'open' ? '📋' : rfq.status === 'closed' ? '✅' : '⏰'}
                      </div>
                      <div>
                        <div className="font-bold text-[#1B2D5B]">{rfq.product_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-blue text-[10px]">{SECTOR_LABELS[rfq.sector] || rfq.sector}</span>
                          <span className={`badge text-[10px] ${
                            rfq.status === 'open' ? 'badge-green' : rfq.status === 'closed' ? 'badge-gray' : 'badge-red'
                          }`}>{rfq.status === 'open' ? '● مفتوح' : rfq.status === 'closed' ? '● مغلق' : '● منتهي'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center rounded-xl px-4 py-2" style={{ background: '#1B2D5B' }}>
                      <div className="text-xl font-bold text-white">{rfq.offer_count || 0}</div>
                      <div className="text-[10px] text-blue-200">عرض</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                    <span>📦 {rfq.quantity} {rfq.unit}</span>
                    <span>📍 {rfq.region}</span>
                    {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                    <span className="mr-auto" style={{ color: '#F5831F' }}>عرض التفاصيل ←</span>
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
