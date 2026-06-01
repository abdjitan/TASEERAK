// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <div className="text-center animate-pulse">
        <img src="/logo-outlined.png" alt="" className="w-16 h-16 mx-auto mb-4 animate-float" />
        <div className="text-emerald-600 font-semibold">جارٍ التحميل...</div>
      </div>
    </div>
  )

  const accepted = myOffers.filter(o => o.status === 'accepted').length
  const pending = myOffers.filter(o => o.status === 'pending').length
  const totalRevenue = myOffers.filter(o => o.status === 'accepted').reduce((s, o) => s + (o.total_price || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50 bg-dots" dir="rtl">
      {/* Nav */}
      <nav className="glass sticky top-0 z-50 border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-outlined.png" alt="تسعيرك" className="w-8 h-8" />
            <span className="font-bold text-gray-900">تسعيرك</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">مورد</span>
          </div>
          <LanguageSwitcher variant="minimal" />
          <button onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-all">
            خروج
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900">أهلاً، {profile?.company_name_ar} 👋</h1>
          <p className="text-gray-500 mt-1">تصفح طلبات التسعير المتاحة وقدم عروضك</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: 'طلبات مفتوحة', value: openRfqs.length, icon: '📋', gradient: 'from-blue-500 to-blue-600' },
            { label: 'عروض قيد المراجعة', value: pending, icon: '⏳', gradient: 'from-amber-500 to-orange-500' },
            { label: 'عروض مقبولة', value: accepted, icon: '✅', gradient: 'from-emerald-500 to-emerald-600' },
            { label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()}`, icon: '💰', gradient: 'from-purple-500 to-indigo-600' },
          ].map(({ label, value, icon, gradient }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-sm`}>
                  {icon}
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'rfqs', label: `طلبات التسعير (${openRfqs.length})`, icon: '📋' },
            { key: 'offers', label: `عروضي (${myOffers.length})`, icon: '📤' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                tab === t.key
                  ? 'gradient-green text-white shadow-sm shadow-emerald-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'rfqs' && (
          <div className="stagger">
            {openRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-6xl mb-4 animate-float">📭</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات مفتوحة</h3>
                <p className="text-gray-500">سيتم إخطارك عند وصول طلبات جديدة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openRfqs.map(rfq => (
                  <a key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`}
                    className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm
                    hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-lg">📦</div>
                        <div>
                          <div className="font-bold text-gray-900">{rfq.product_name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge badge-blue text-[10px]">{SECTOR_LABELS[rfq.sector] || rfq.sector}</span>
                            {!rfq.hide_identity && rfq.contractor?.company_name_ar && (
                              <span className="text-[10px] text-gray-400">🏢 {rfq.contractor.company_name_ar}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="gradient-green text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm">
                        تقديم عرض →
                      </div>
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
                <div className="text-6xl mb-4 animate-float">📤</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">لم تقدم أي عروض بعد</h3>
                <p className="text-gray-500">تصفح طلبات التسعير وقدم أول عرض</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOffers.map(offer => (
                  <div key={offer.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all duration-300 ${
                    offer.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/50' :
                    offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100 hover:shadow-md'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          offer.status === 'accepted' ? 'bg-emerald-100' :
                          offer.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                        }`}>
                          {offer.status === 'accepted' ? '✅' : offer.status === 'rejected' ? '❌' : '⏳'}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900">{offer.rfq?.product_name || '—'}</span>
                          {offer.rfq?.sector && (
                            <span className="badge badge-blue text-[10px] mr-2">{SECTOR_LABELS[offer.rfq.sector]}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-gray-900">{offer.total_price?.toLocaleString()} <span className="text-xs text-gray-400">ر.س</span></div>
                        <span className={`badge text-[10px] ${
                          offer.status === 'accepted' ? 'badge-green' : offer.status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>
                          {offer.status === 'accepted' ? '✓ مقبول' : offer.status === 'rejected' ? '✕ مرفوض' : '⏳ قيد المراجعة'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      {offer.delivery_days && <span>📦 {offer.delivery_days} يوم</span>}
                      {offer.rfq?.region && <span>📍 {offer.rfq.region}</span>}
                      {offer.rfq?.quantity && <span>📦 {offer.rfq.quantity} {offer.rfq.unit}</span>}
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
