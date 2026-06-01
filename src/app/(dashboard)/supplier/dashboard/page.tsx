// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

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

      const { data: rfqs } = await supabase
        .from('rfqs').select('*, contractor:profiles(company_name_ar)')
        .eq('status', 'open').order('created_at', { ascending: false })
      setOpenRfqs(rfqs || [])

      const { data: offers } = await supabase
        .from('offers').select('*, rfq:rfqs(product_name, sector, quantity, unit, region, status)')
        .eq('supplier_id', session.user.id).order('created_at', { ascending: false })
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50">
      <div className="animate-pulse text-green-600 font-semibold">جارٍ التحميل...</div>
    </div>
  )

  const accepted = myOffers.filter(o => o.status === 'accepted').length
  const pending = myOffers.filter(o => o.status === 'pending').length
  const totalRevenue = myOffers.filter(o => o.status === 'accepted').reduce((s, o) => s + (o.total_price || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50" dir="rtl">
      {/* Top Nav */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-outlined.png" alt="Taseerak" className="w-9 h-9" />
            <div>
              <span className="font-bold text-gray-900">Taseerak</span>
              <span className="text-xs text-gray-400 mr-2">| {profile?.company_name_ar}</span>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            خروج
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">أهلاً، {profile?.company_name_ar} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">إليك طلبات التسعير المتاحة وعروضك</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'طلبات مفتوحة', value: openRfqs.length, icon: '📋', color: 'blue' },
            { label: 'عروض قيد المراجعة', value: pending, icon: '⏳', color: 'amber' },
            { label: 'عروض مقبولة', value: accepted, icon: '✅', color: 'green' },
            { label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()} ر.س`, icon: '💰', color: 'emerald' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{icon}</span>
                <span className={`text-lg font-bold text-${color}-600`}>{value}</span>
              </div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'rfqs', label: `طلبات التسعير (${openRfqs.length})` },
            { key: 'offers', label: `عروضي (${myOffers.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Open RFQs */}
        {tab === 'rfqs' && (
          <div className="space-y-3">
            {openRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                <div className="text-5xl mb-3">📭</div>
                <h3 className="font-bold text-gray-900 mb-1">لا توجد طلبات مفتوحة</h3>
                <p className="text-sm text-gray-500">سيتم إخطارك عند وصول طلبات جديدة</p>
              </div>
            ) : (
              openRfqs.map(rfq => (
                <a key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`}
                  className="block bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow hover:border-green-200 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-lg">📦</div>
                      <div>
                        <span className="font-bold text-gray-900">{rfq.product_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            {SECTOR_LABELS[rfq.sector] || rfq.sector}
                          </span>
                          {!rfq.hide_identity && rfq.contractor?.company_name_ar && (
                            <span className="text-[10px] text-gray-400">🏢 {rfq.contractor.company_name_ar}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                      تقديم عرض →
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📦 {rfq.quantity} {rfq.unit}</span>
                    <span>📍 {rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</span>
                    {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                    <span>💬 {rfq.offer_count || 0} عرض</span>
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        {/* My Offers */}
        {tab === 'offers' && (
          <div className="space-y-3">
            {myOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                <div className="text-5xl mb-3">📤</div>
                <h3 className="font-bold text-gray-900 mb-1">لم تقدم أي عروض بعد</h3>
                <p className="text-sm text-gray-500">تصفح طلبات التسعير وقدم أول عرض</p>
              </div>
            ) : (
              myOffers.map(offer => (
                <div key={offer.id} className={`bg-white rounded-xl p-5 border shadow-sm ${
                  offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                  offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-gray-900">{offer.rfq?.product_name || '—'}</span>
                      {offer.rfq?.sector && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold mr-2">
                          {SECTOR_LABELS[offer.rfq.sector] || offer.rfq.sector}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      offer.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {offer.status === 'accepted' ? '✓ مقبول' : offer.status === 'rejected' ? '✕ مرفوض' : '⏳ قيد المراجعة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>💰 {offer.total_price?.toLocaleString()} ر.س</span>
                    {offer.delivery_days && <span>📦 {offer.delivery_days} يوم</span>}
                    {offer.rfq?.region && <span>📍 {offer.rfq.region}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
