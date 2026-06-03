// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'

export default function OrderDetailPage() {
  const { id } = useParams() // offer id
  const [offer, setOffer] = useState(null)
  const [rfq, setRfq] = useState(null)
  const [supplier, setSupplier] = useState(null)
  const [contractor, setContractor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: offerData } = await supabase
        .from('offers').select('*').eq('id', id).single()
      if (!offerData) { setLoading(false); return }
      setOffer(offerData)

      const { data: rfqData } = await supabase
        .from('rfqs').select('*').eq('id', offerData.rfq_id).single()
      setRfq(rfqData)

      const { data: supplierData } = await supabase
        .from('profiles').select('*').eq('id', offerData.supplier_id).single()
      setSupplier(supplierData)

      if (rfqData) {
        const { data: contractorData } = await supabase
          .from('profiles').select('*').eq('id', rfqData.contractor_id).single()
        setContractor(contractorData)
      }

      setLoading(false)
    }
    load()
  }, [id])

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-blue-600 font-semibold">جارٍ التحميل...</div>
    </div>
  )

  if (!offer || !rfq) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-gray-500">الطلب غير موجود</div>
    </div>
  )

  const poNumber = `PO-${offer.id.slice(0, 8).toUpperCase()}`
  const date = new Date(offer.accepted_at || offer.created_at).toLocaleDateString('ar-SA')

  return (
    <div className="min-h-screen bg-slate-50 p-4 print:bg-white print:p-0" dir="rtl">
      <div className="max-w-3xl mx-auto">

        {/* Actions - hidden in print */}
        <div className="flex items-center justify-between mb-6 mt-4 print:hidden">
          <a href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← رجوع للوحة التحكم</a>
          <button onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            🖨️ طباعة أمر الشراء
          </button>
        </div>

        {/* Purchase Order Document */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

          {/* Header */}
          <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white p-8 print:bg-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">أمر شراء</h1>
                <p className="text-blue-200 text-sm mt-1">Purchase Order</p>
              </div>
              <div className="text-left">
                <div className="text-sm text-blue-200">رقم الأمر</div>
                <div className="text-xl font-bold font-mono">{poNumber}</div>
                <div className="text-sm text-blue-200 mt-1">التاريخ: {date}</div>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6 p-8 border-b border-gray-100">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">المشتري (المقاول)</div>
              <div className="font-bold text-gray-900">{contractor?.company_name_ar || '—'}</div>
              {contractor?.commercial_registration && (
                <div className="text-sm text-gray-500 mt-1">سجل تجاري: {contractor.commercial_registration}</div>
              )}
              {contractor?.phone && <div className="text-sm text-gray-500">جوال: {contractor.phone}</div>}
              {contractor?.region && <div className="text-sm text-gray-500">{contractor.region}{contractor.city ? ` - ${contractor.city}` : ''}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">البائع (المورد)</div>
              <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>
              {supplier?.commercial_registration && (
                <div className="text-sm text-gray-500 mt-1">سجل تجاري: {supplier.commercial_registration}</div>
              )}
              {supplier?.phone && <div className="text-sm text-gray-500">جوال: {supplier.phone}</div>}
              {supplier?.region && <div className="text-sm text-gray-500">{supplier.region}{supplier.city ? ` - ${supplier.city}` : ''}</div>}
              {supplier?.national_short_address && (
                <div className="text-sm text-gray-500 font-mono" dir="ltr">🏛 {supplier.national_short_address}</div>
              )}
              {supplier?.building_number && supplier?.street_name && (
                <div className="text-xs text-gray-400">
                  {supplier.building_number}, {supplier.street_name}{supplier.district ? `, ${supplier.district}` : ''}{supplier.postal_code ? `, ${supplier.postal_code}` : ''}
                </div>
              )}
              {supplier?.latitude && supplier?.longitude && (
                <a href={`https://www.google.com/maps?q=${supplier.latitude},${supplier.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-600 hover:underline mt-1 print:hidden">
                  🗺 عرض الموقع على الخريطة ←
                </a>
              )}
            </div>
          </div>

          {/* خصائص المنتج المعروض + الملف المرفق */}
          {(offer?.attributes || offer?.attachment_url) && (
            <div className="px-8 pb-6 border-b border-gray-100">
              {offer?.attributes && Object.keys(offer.attributes).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">خصائص المنتج</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(offer.attributes).map(([k, v]) => (
                      <span key={k} className="text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <strong className="text-gray-700">{k}:</strong> <span className="text-gray-600">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {offer?.attachment_url && (
                <a href={offer.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline print:hidden">
                  📎 {offer.attachment_name || 'كتالوج المنتج'} ←
                </a>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="p-8 border-b border-gray-100">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right text-xs font-bold text-gray-500 pb-3 w-8">#</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">الصنف</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">القطاع</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">الكمية</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">سعر الوحدة</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 text-sm text-gray-500">1</td>
                  <td className="py-4">
                    <div className="font-semibold text-gray-900">{rfq.product_name}</div>
                    {rfq.specification && <div className="text-xs text-gray-400 mt-0.5">{rfq.specification}</div>}
                  </td>
                  <td className="py-4 text-sm text-gray-600">{SECTOR_LABELS[rfq.sector] || rfq.sector}</td>
                  <td className="py-4 text-sm text-gray-600">{rfq.quantity} {rfq.unit}</td>
                  <td className="py-4 text-sm text-gray-600">{offer.unit_price ? `${offer.unit_price.toLocaleString()} ر.س` : '—'}</td>
                  <td className="py-4 font-bold text-gray-900">{offer.total_price?.toLocaleString()} ر.س</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">المجموع الفرعي</span>
                  <span className="text-gray-900">{offer.total_price?.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ضريبة القيمة المضافة (15%)</span>
                  <span className="text-gray-900">{(offer.total_price * 0.15)?.toLocaleString()} ر.س</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">الإجمالي شامل الضريبة</span>
                  <span className="font-bold text-blue-600 text-lg">{(offer.total_price * 1.15)?.toLocaleString()} ر.س</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="p-8 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3">شروط التوريد</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>{rfq.delivery_required ? '✅' : '❌'}</span>
                <span>التوصيل {rfq.delivery_required ? 'مشمول' : 'غير مشمول'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{rfq.vat_invoice_required ? '✅' : '❌'}</span>
                <span>فاتورة ضريبية {rfq.vat_invoice_required ? 'مطلوبة' : 'غير مطلوبة'}</span>
              </div>
              {offer.delivery_days && (
                <div className="flex items-center gap-2">
                  <span>📦</span>
                  <span>مدة التوصيل: {offer.delivery_days} يوم عمل</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>موقع التسليم: {rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</span>
              </div>
            </div>
            {offer.notes && (
              <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <strong>ملاحظات المورد:</strong> {offer.notes}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl">
              <span className="text-xl">✅</span>
              <div>
                <div className="font-bold">تمت الموافقة على العرض</div>
                <div className="text-xs text-green-600">بتاريخ {date}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
