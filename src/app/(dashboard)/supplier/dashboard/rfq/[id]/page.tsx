// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

export default function SupplierRFQPage() {
  const { id } = useParams()
  const [user, setUser] = useState<any>(null)
  const [rfq, setRfq] = useState<any>(null)
  const [existingOffer, setExistingOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [totalPrice, setTotalPrice] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)

      const { data: rfqData } = await supabase
        .from('rfqs').select('*, contractor:profiles(company_name_ar)').eq('id', id).single()
      setRfq(rfqData)

      // Check if already submitted offer
      const { data: offerData } = await supabase
        .from('offers').select('*').eq('rfq_id', id).eq('supplier_id', session.user.id).single()
      if (offerData) setExistingOffer(offerData)

      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { error: insertError } = await supabase.from('offers').insert({
      rfq_id: id,
      supplier_id: user.id,
      total_price: parseFloat(totalPrice),
      unit_price: unitPrice ? parseFloat(unitPrice) : null,
      delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
      notes: notes || null,
    })

    if (insertError) {
      setError(`خطأ: ${insertError.message}`)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">جارٍ التحميل...</div></div>
  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">الطلب غير موجود</div></div>

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">تم إرسال العرض</h2>
          <p className="text-sm text-gray-500 mb-6">سيتم إخطارك عند قبول أو رفض العرض</p>
          <a href="/supplier/dashboard" className="block bg-blue-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-blue-700 transition-colors">
            رجوع للوحة التحكم
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6 mt-4">
          <h1 className="text-xl font-bold text-gray-900">تفاصيل الطلب</h1>
          <a href="/supplier/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← رجوع</a>
        </div>

        {/* RFQ Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{rfq.product_name}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div>🏗 القطاع: <strong>{SECTOR_LABELS[rfq.sector] || rfq.sector}</strong></div>
            <div>📦 الكمية: <strong>{rfq.quantity} {rfq.unit}</strong></div>
            <div>📍 الموقع: <strong>{rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</strong></div>
            {!rfq.hide_identity && rfq.contractor?.company_name_ar && (
              <div>🏢 المقاول: <strong>{rfq.contractor.company_name_ar}</strong></div>
            )}
            {rfq.specification && <div className="col-span-2">⚙️ المواصفات: <strong>{rfq.specification}</strong></div>}
            {rfq.notes && <div className="col-span-2">📝 ملاحظات: {rfq.notes}</div>}
            <div>🚚 التوصيل: <strong>{rfq.delivery_required ? 'مطلوب' : 'غير مطلوب'}</strong></div>
            <div>🧾 فاتورة ضريبية: <strong>{rfq.vat_invoice_required ? 'مطلوبة' : 'غير مطلوبة'}</strong></div>
          </div>
        </div>

        {/* Already submitted */}
        {existingOffer ? (
          <div className={`bg-white rounded-2xl p-5 shadow-sm border text-center ${
            existingOffer.status === 'accepted' ? 'border-green-300 bg-green-50' :
            existingOffer.status === 'rejected' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
          }`}>
            <div className="text-3xl mb-2">
              {existingOffer.status === 'accepted' ? '✅' : existingOffer.status === 'rejected' ? '❌' : '⏳'}
            </div>
            <h3 className="font-bold text-gray-900 mb-1">
              {existingOffer.status === 'accepted' ? 'تم قبول عرضك!' :
               existingOffer.status === 'rejected' ? 'تم رفض العرض' : 'عرضك قيد المراجعة'}
            </h3>
            <p className="text-sm text-gray-600">السعر: {existingOffer.total_price?.toLocaleString()} ر.س</p>
          </div>
        ) : rfq.status !== 'open' ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-sm text-gray-500">هذا الطلب مغلق ولا يقبل عروض جديدة</p>
          </div>
        ) : (
          /* Submit Offer Form */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تقديم عرض سعر</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">السعر الإجمالي (ر.س) *</label>
                <input type="number" value={totalPrice} onChange={e => setTotalPrice(e.target.value)}
                  className="input-field" placeholder="0.00" required min="0" step="any" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">سعر الوحدة (ر.س)</label>
                  <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                    className="input-field" placeholder="0.00" min="0" step="any" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">مدة التوصيل (أيام)</label>
                  <input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)}
                    className="input-field" placeholder="3" min="0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field" rows={3} placeholder="تفاصيل إضافية عن العرض..." />
              </div>
            </div>

            <button type="submit" disabled={submitting || !totalPrice}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
              {submitting ? 'جارٍ الإرسال...' : 'إرسال العرض ←'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
