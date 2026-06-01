// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

export default function RFQDetailPage() {
  const { id } = useParams()
  const [rfq, setRfq] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: rfqData } = await supabase
        .from('rfqs').select('*').eq('id', id).single()
      setRfq(rfqData)

      const { data: offersData } = await supabase
        .from('offers').select('*, supplier:profiles(company_name_ar, phone, rating_avg)')
        .eq('rfq_id', id).order('created_at', { ascending: false })
      setOffers(offersData || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function acceptOffer(offerId: string) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', offerId)
    await supabase.from('rfqs').update({ status: 'closed' }).eq('id', id)
    window.location.reload()
  }

  async function rejectOffer(offerId: string) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    window.location.reload()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">جارٍ التحميل...</div></div>

  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">الطلب غير موجود</div></div>

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-4">
          <h1 className="text-xl font-bold text-gray-900">تفاصيل الطلب</h1>
          <a href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← رجوع</a>
        </div>

        {/* RFQ Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">{rfq.product_name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rfq.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
              {rfq.status === 'open' ? 'مفتوح' : rfq.status === 'closed' ? 'مغلق' : 'منتهي'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div>📦 الكمية: <strong>{rfq.quantity} {rfq.unit}</strong></div>
            <div>🏗 القطاع: <strong>{SECTOR_LABELS[rfq.sector] || rfq.sector}</strong></div>
            <div>📍 الموقع: <strong>{rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</strong></div>
            <div>💬 العروض: <strong>{offers.length}</strong></div>
            {rfq.specification && <div className="col-span-2">⚙️ المواصفات: <strong>{rfq.specification}</strong></div>}
            {rfq.notes && <div className="col-span-2">📝 ملاحظات: {rfq.notes}</div>}
          </div>
        </div>

        {/* Offers */}
        <h3 className="text-sm font-semibold text-gray-900 mb-3">العروض ({offers.length})</h3>
        {offers.length === 0 ? (
          <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
            <div className="text-3xl mb-2">⏳</div>
            <p className="text-sm text-gray-500">لم تصل عروض بعد — سيتم إخطارك فور وصول عرض</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map(offer => (
              <div key={offer.id} className={`bg-white rounded-xl p-4 border shadow-sm ${
                offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                offer.status === 'rejected' ? 'border-red-200 opacity-60' : 'border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-gray-900">{offer.supplier?.company_name_ar || 'مورد'}</span>
                    {offer.supplier?.rating_avg > 0 && (
                      <span className="text-xs text-amber-600 mr-2">⭐ {offer.supplier.rating_avg}</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    offer.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {offer.status === 'accepted' ? 'مقبول' : offer.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span>💰 <strong>{offer.total_price?.toLocaleString()} ر.س</strong></span>
                  {offer.unit_price && <span>سعر الوحدة: {offer.unit_price} ر.س</span>}
                  {offer.delivery_days && <span>📦 التوصيل: {offer.delivery_days} يوم</span>}
                </div>
                {offer.notes && <p className="text-xs text-gray-400 mb-3">{offer.notes}</p>}

                {offer.status === 'pending' && rfq.status === 'open' && (
                  <div className="flex gap-2">
                    <button onClick={() => acceptOffer(offer.id)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                      ✓ قبول العرض
                    </button>
                    <button onClick={() => rejectOffer(offer.id)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                      ✕ رفض
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
