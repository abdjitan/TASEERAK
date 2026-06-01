// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

export default function RFQDetailPage() {
  const { id } = useParams()
  const [rfq, setRfq] = useState(null)
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editSpec, setEditSpec] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: rfqData } = await supabase.from('rfqs').select('*').eq('id', id).single()
      setRfq(rfqData)
      setEditNotes(rfqData?.notes || '')
      setEditSpec(rfqData?.specification || '')

      const { data: offersData } = await supabase
        .from('offers').select('*, supplier:profiles(company_name_ar, phone, rating_avg, city, region)')
        .eq('rfq_id', id).order('total_price', { ascending: true })
      setOffers(offersData || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function acceptOffer(offerId) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', offerId)
    // Reject all other pending offers
    await supabase.from('offers').update({ status: 'rejected' }).eq('rfq_id', id).neq('id', offerId).eq('status', 'pending')
    await supabase.from('rfqs').update({ status: 'closed' }).eq('id', id)
    window.location.href = `/contractor/orders/${offerId}`
  }

  async function rejectOffer(offerId) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    window.location.reload()
  }

  async function saveEdit() {
    const supabase = createClient()
    await supabase.from('rfqs').update({ notes: editNotes, specification: editSpec }).eq('id', id)
    setRfq({ ...rfq, notes: editNotes, specification: editSpec })
    setEditing(false)
  }

  async function cancelRfq() {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return
    const supabase = createClient()
    await supabase.from('rfqs').update({ status: 'cancelled' }).eq('id', id)
    window.location.href = '/contractor'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-blue-600 font-semibold animate-pulse">جارٍ التحميل...</div></div>
  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">الطلب غير موجود</div></div>

  const acceptedOffer = offers.find(o => o.status === 'accepted')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-4">
          <h1 className="text-xl font-bold text-gray-900">تفاصيل طلب التسعير</h1>
          <a href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← رجوع</a>
        </div>

        {/* RFQ Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{rfq.product_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {SECTOR_LABELS[rfq.sector] || rfq.sector}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  rfq.status === 'open' ? 'bg-green-100 text-green-700' :
                  rfq.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  rfq.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {rfq.status === 'open' ? '● مفتوح' : rfq.status === 'closed' ? '● مغلق' : rfq.status === 'cancelled' ? '● ملغي' : '● منتهي'}
                </span>
              </div>
            </div>
            {rfq.status === 'open' && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(!editing)}
                  className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                  ✏️ تعديل
                </button>
                <button onClick={cancelRfq}
                  className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  إلغاء
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 bg-blue-50 rounded-xl p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">المواصفات</label>
                <input value={editSpec} onChange={e => setEditSpec(e.target.value)} className="input-field" placeholder="المواصفات" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ملاحظات</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="input-field" rows={3} placeholder="ملاحظات" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">حفظ</button>
                <button onClick={() => setEditing(false)} className="text-sm text-gray-500">إلغاء</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📦 الكمية</span><br/><strong>{rfq.quantity} {rfq.unit}</strong></div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📍 الموقع</span><br/><strong>{rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</strong></div>
              {rfq.specification && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">⚙️ المواصفات</span><br/><strong>{rfq.specification}</strong></div>}
              {rfq.notes && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">📝 ملاحظات</span><br/>{rfq.notes}</div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🚚 التوصيل</span><br/><strong>{rfq.delivery_required ? 'مطلوب' : 'غير مطلوب'}</strong></div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🧾 فاتورة ضريبية</span><br/><strong>{rfq.vat_invoice_required ? 'مطلوبة' : 'غير مطلوبة'}</strong></div>
            </div>
          )}
        </div>

        {/* Accepted Offer → PO Link */}
        {acceptedOffer && (
          <a href={`/contractor/orders/${acceptedOffer.id}`}
            className="block bg-green-50 rounded-2xl p-6 border border-green-200 mb-6 hover:shadow transition-shadow text-center">
            <div className="text-3xl mb-2">📄</div>
            <h3 className="font-bold text-green-800 mb-1">تم قبول عرض من {acceptedOffer.supplier?.company_name_ar}</h3>
            <p className="text-sm text-green-600">السعر: {acceptedOffer.total_price?.toLocaleString()} ر.س — اضغط لعرض أمر الشراء</p>
          </a>
        )}

        {/* Offers List */}
        <h3 className="text-sm font-bold text-gray-900 mb-3">العروض ({offers.length})</h3>
        {offers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h4 className="font-bold text-gray-900 mb-1">لم تصل عروض بعد</h4>
            <p className="text-sm text-gray-500">سيتم إخطارك فور وصول أي عرض</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer, i) => (
              <div key={offer.id} className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${
                offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100 hover:border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      {i + 1}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">{offer.supplier?.company_name_ar || 'مورد'}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {offer.supplier?.rating_avg > 0 && <span>⭐ {offer.supplier.rating_avg}</span>}
                        {offer.supplier?.region && <span>📍 {offer.supplier.region}</span>}
                        {offer.supplier?.phone && <span>📞 {offer.supplier.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-blue-600">{offer.total_price?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">ر.س</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {offer.unit_price && <span>سعر الوحدة: {offer.unit_price} ر.س</span>}
                  {offer.delivery_days && <span>📦 التوصيل: {offer.delivery_days} يوم</span>}
                </div>
                {offer.notes && <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg mb-3">{offer.notes}</p>}

                {offer.status === 'pending' && rfq.status === 'open' && (
                  <div className="flex gap-2">
                    <button onClick={() => acceptOffer(offer.id)}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                      ✓ قبول العرض
                    </button>
                    <button onClick={() => rejectOffer(offer.id)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                      ✕ رفض
                    </button>
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <a href={`/contractor/orders/${offer.id}`}
                    className="block text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    📄 عرض أمر الشراء
                  </a>
                )}

                {offer.status !== 'pending' && (
                  <div className={`text-center text-xs font-semibold py-1 ${
                    offer.status === 'accepted' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {offer.status === 'accepted' ? '✓ تم القبول' : '✕ مرفوض'}
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
