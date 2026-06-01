// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

export default function SupplierDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [openRfqs, setOpenRfqs] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'rfqs' | 'offers'>('rfqs')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      setUser(session.user)

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(profileData)

      // Get all open RFQs
      const { data: rfqData } = await supabase
        .from('rfqs').select('*, contractor:profiles(company_name_ar)')
        .eq('status', 'open').order('created_at', { ascending: false })
      setOpenRfqs(rfqData || [])

      // Get my offers
      const { data: offerData } = await supabase
        .from('offers').select('*, rfq:rfqs(product_name, sector, quantity, unit, region, status)')
        .eq('supplier_id', session.user.id).order('created_at', { ascending: false })
      setMyOffers(offerData || [])

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-gray-500">جارٍ التحميل...</div>
    </div>
  )

  const acceptedOffers = myOffers.filter(o => o.status === 'accepted').length
  const pendingOffers = myOffers.filter(o => o.status === 'pending').length

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">لوحة المورد</h1>
            <p className="text-sm text-gray-500 mt-1">أهلاً، {profile?.company_name_ar || user?.email}</p>
          </div>
          <button onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 px-4 py-2 rounded-lg transition-colors">
            خروج
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">{openRfqs.length}</div>
            <div className="text-xs text-gray-500 mt-1">طلبات مفتوحة</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-amber-600">{pendingOffers}</div>
            <div className="text-xs text-gray-500 mt-1">عروض قيد المراجعة</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{acceptedOffers}</div>
            <div className="text-xs text-gray-500 mt-1">عروض مقبولة</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('rfqs')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'rfqs' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            طلبات التسعير ({openRfqs.length})
          </button>
          <button onClick={() => setTab('offers')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'offers' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            عروضي ({myOffers.length})
          </button>
        </div>

        {/* Open RFQs */}
        {tab === 'rfqs' && (
          <div className="space-y-3">
            {openRfqs.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm text-gray-500">لا توجد طلبات تسعير مفتوحة حالياً</p>
              </div>
            ) : (
              openRfqs.map(rfq => (
                <a key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`}
                  className="block bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{rfq.product_name}</span>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                        {SECTOR_LABELS[rfq.sector] || rfq.sector}
                      </span>
                    </div>
                    <span className="text-xs text-blue-600 font-semibold">تقديم عرض →</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📦 {rfq.quantity} {rfq.unit}</span>
                    <span>📍 {rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</span>
                    {!rfq.hide_identity && rfq.contractor?.company_name_ar && (
                      <span>🏢 {rfq.contractor.company_name_ar}</span>
                    )}
                    <span>💬 {rfq.offer_count || 0} عرض</span>
                  </div>
                  {rfq.specification && <p className="text-xs text-gray-400 mt-1">⚙️ {rfq.specification}</p>}
                </a>
              ))
            )}
          </div>
        )}

        {/* My Offers */}
        {tab === 'offers' && (
          <div className="space-y-3">
            {myOffers.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                <div className="text-3xl mb-2">📤</div>
                <p className="text-sm text-gray-500">لم تقدم أي عروض بعد</p>
              </div>
            ) : (
              myOffers.map(offer => (
                <div key={offer.id} className={`bg-white rounded-xl p-4 border shadow-sm ${
                  offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                  offer.status === 'rejected' ? 'border-red-200 opacity-60' : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{offer.rfq?.product_name || '—'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      offer.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {offer.status === 'accepted' ? '✓ مقبول' : offer.status === 'rejected' ? '✕ مرفوض' : '⏳ قيد المراجعة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>💰 {offer.total_price?.toLocaleString()} ر.س</span>
                    {offer.delivery_days && <span>📦 {offer.delivery_days} يوم</span>}
                    {offer.rfq && <span>📍 {offer.rfq.region}</span>}
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
