// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

export default function SupplierDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [openRfqs, setOpenRfqs] = useState([])
  const [myOffers, setMyOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rfqs')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)
      const { data: rfqs } = await supabase.from('rfqs').select('*, contractor:profiles(company_name_ar)').eq('status', 'open').order('created_at', { ascending: false })
      setOpenRfqs(rfqs || [])
      const { data: offers } = await supabase.from('offers').select('*, rfq:rfqs(product_name, sector, quantity, unit, region, status)').eq('supplier_id', session.user.id).order('created_at', { ascending: false })
      setMyOffers(offers || [])
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

  const accepted = myOffers.filter(o => o.status === 'accepted').length
  const pending = myOffers.filter(o => o.status === 'pending').length
  const totalRevenue = myOffers.filter(o => o.status === 'accepted').reduce((s, o) => s + (o.total_price || 0), 0)

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#f4f6f9' }}>
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-all">خروج</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-[#1B2D5B]">أهلاً، {profile?.company_name_ar} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">تصفح طلبات التسعير المتاحة وقدم عروضك</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: 'طلبات مفتوحة', value: openRfqs.length, icon: '📋', bg: '#1B2D5B' },
            { label: 'عروض قيد المراجعة', value: pending, icon: '⏳', bg: '#F5831F' },
            { label: 'عروض مقبولة', value: accepted, icon: '✅', bg: '#0F6E56' },
            { label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()}`, icon: '💰', bg: '#7c3aed' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg text-white" style={{ background: bg }}>{icon}</div>
                <div className="text-2xl font-bold text-[#1B2D5B]">{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {[{ key: 'rfqs', label: `طلبات التسعير (${openRfqs.length})` }, { key: 'offers', label: `عروضي (${myOffers.length})` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key ? 'text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
              }`} style={tab === t.key ? { background: '#1B2D5B' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'rfqs' && (
          <div className="stagger">
            {openRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float">📭</div>
                <h3 className="text-lg font-bold text-[#1B2D5B] mb-2">لا توجد طلبات مفتوحة</h3>
                <p className="text-sm text-gray-500">سيتم إخطارك عند وصول طلبات جديدة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openRfqs.map(rfq => (
                  <a key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`}
                    className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F5831F]/30 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-[#1B2D5B]/10 rounded-xl flex items-center justify-center text-lg">📦</div>
                        <div>
                          <div className="font-bold text-[#1B2D5B]">{rfq.product_name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge badge-blue text-[10px]">{SECTOR_LABELS[rfq.sector] || rfq.sector}</span>
                            {!rfq.hide_identity && rfq.contractor?.company_name_ar && (
                              <span className="text-[10px] text-gray-400">🏢 {rfq.contractor.company_name_ar}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-white text-xs font-semibold px-4 py-2 rounded-xl" style={{ background: '#F5831F' }}>تقديم عرض →</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      <span>📦 {rfq.quantity} {rfq.unit}</span>
                      <span>📍 {rfq.region}</span>
                      {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                      <span>💬 {rfq.offer_count || 0} عرض</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'offers' && (
          <div className="stagger">
            {myOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float">📤</div>
                <h3 className="text-lg font-bold text-[#1B2D5B] mb-2">لم تقدم أي عروض بعد</h3>
                <p className="text-sm text-gray-500">تصفح طلبات التسعير وقدم أول عرض</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOffers.map(offer => (
                  <div key={offer.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
                    offer.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/50' :
                    offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          offer.status === 'accepted' ? 'bg-emerald-100' : offer.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                        }`}>{offer.status === 'accepted' ? '✅' : offer.status === 'rejected' ? '❌' : '⏳'}</div>
                        <div>
                          <span className="font-bold text-[#1B2D5B]">{offer.rfq?.product_name || '—'}</span>
                          {offer.rfq?.sector && <span className="badge badge-blue text-[10px] mr-2">{SECTOR_LABELS[offer.rfq.sector]}</span>}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-[#1B2D5B]">{offer.total_price?.toLocaleString()} <span className="text-xs text-gray-400">ر.س</span></div>
                        <span className={`badge text-[10px] ${
                          offer.status === 'accepted' ? 'badge-green' : offer.status === 'rejected' ? 'badge-red' : 'badge-orange'
                        }`}>{offer.status === 'accepted' ? '✓ مقبول' : offer.status === 'rejected' ? '✕ مرفوض' : '⏳ قيد المراجعة'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      {offer.delivery_days && <span>📦 {offer.delivery_days} يوم</span>}
                      {offer.rfq?.region && <span>📍 {offer.rfq.region}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
