// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import { waLink } from '@/lib/wa'
import QRCode from 'qrcode'

// ZATCA Phase-1 simplified-invoice QR: base64 of TLV (Tag-Length-Value) fields:
// 1=seller name, 2=VAT number, 3=timestamp (ISO), 4=total w/ VAT, 5=VAT total.
function zatcaQrPayload(sellerName: string, vatNumber: string, isoTs: string, totalWithVat: string, vatTotal: string) {
  const enc = new TextEncoder()
  const tlv = (tag: number, val: string) => { const v = enc.encode(val); return [tag, v.length, ...Array.from(v)] }
  const bytes = [...tlv(1, sellerName), ...tlv(2, vatNumber), ...tlv(3, isoTs), ...tlv(4, totalWithVat), ...tlv(5, vatTotal)]
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

export default function OrderDetailPage() {
  const { id } = useParams() // offer id
  const [offer, setOffer] = useState(null)
  const [rfq, setRfq] = useState(null)
  const [supplier, setSupplier] = useState(null)
  const [contractor, setContractor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState(null)
  const [existingReview, setExistingReview] = useState(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  // Deal protection
  const [busy, setBusy] = useState('')
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [qrUrl, setQrUrl] = useState('')

  // Generate the ZATCA invoice QR once the deal parties are loaded.
  useEffect(() => {
    if (!offer || !supplier) return
    const base = Number(offer.total_price) || 0
    const iso = new Date(offer.accepted_at || offer.created_at).toISOString()
    const payload = zatcaQrPayload(
      supplier.company_name_ar || 'Supplier',
      supplier.vat_number || '0',
      iso,
      (base * 1.15).toFixed(2),
      (base * 0.15).toFixed(2),
    )
    QRCode.toDataURL(payload, { margin: 1, width: 160 }).then(setQrUrl).catch(() => {})
  }, [offer, supplier])

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

      // current user + any existing review for this order
      setMyId(session.user.id)
      const { data: rev } = await supabase
        .from('reviews').select('*')
        .eq('offer_id', id).eq('reviewer_id', session.user.id).maybeSingle()
      if (rev) setExistingReview(rev)

      setLoading(false)
    }
    load()
  }, [id])

  function handlePrint() {
    window.print()
  }

  // Update the accepted offer (deal record). RLS lets both parties + admin update.
  async function patch(fields, label) {
    setBusy(label)
    const supabase = createClient()
    const { error } = await supabase.from('offers').update(fields).eq('id', offer.id)
    if (!error) setOffer({ ...offer, ...fields })
    setBusy('')
  }
  const now = () => new Date().toISOString()

  async function submitReview() {
    if (!rating || !myId || !supplier) return
    setReviewSubmitting(true); setReviewMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: myId,
      reviewed_id: supplier.id,
      offer_id: offer.id,
      rating,
      comment: reviewComment || null,
    })
    setReviewSubmitting(false)
    if (error) { setReviewMsg('حدث خطأ، حاول مرة أخرى'); return }
    setExistingReview({ rating, comment: reviewComment })
  }

  if (loading) return <PageLoader />

  if (!offer || !rfq) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-gray-500">الطلب غير موجود</div>
    </div>
  )

  const poNumber = `PO-${offer.id.slice(0, 8).toUpperCase()}`
  const date = new Date(offer.accepted_at || offer.created_at).toLocaleDateString('ar-SA')
  const isContractor = rfq?.contractor_id === myId
  const isSupplier = offer?.supplier_id === myId

  return (
    <div className="min-h-screen bg-slate-50 p-4 print:bg-white print:p-0" dir="rtl">
      <div className="max-w-3xl mx-auto">

        {/* Actions - hidden in print */}
        <div className="flex items-center justify-between mb-6 mt-4 print:hidden">
          <a href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← رجوع للوحة التحكم</a>
          <button onClick={handlePrint}
            className="bg-[#1B2D5B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0f1d3d] transition-colors">
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
                  className="inline-block text-xs text-[#d96f15] hover:underline mt-1 print:hidden">
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
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#d96f15] hover:underline print:hidden">
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
                  <td className="py-4 text-sm text-gray-600">{offer.unit_price ? `${offer.unit_price.toLocaleString('en-US')} ر.س` : '—'}</td>
                  <td className="py-4 font-bold text-gray-900">{offer.total_price?.toLocaleString('en-US')} ر.س</td>
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
                  <span className="text-gray-900">{offer.total_price?.toLocaleString('en-US')} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ضريبة القيمة المضافة (15%)</span>
                  <span className="text-gray-900">{(offer.total_price * 0.15)?.toLocaleString('en-US')} ر.س</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">الإجمالي شامل الضريبة</span>
                  <span className="font-bold text-[#d96f15] text-lg">{(offer.total_price * 1.15)?.toLocaleString('en-US')} ر.س</span>
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

        {/* 🧾 فاتورة ضريبية متوافقة مع ZATCA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100 flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1B2D5B' }}>فاتورة ضريبية</h2>
              <p className="text-xs text-gray-400">Tax Invoice · متوافقة مع هيئة الزكاة والضريبة (ZATCA)</p>
              <div className="text-xs text-gray-500 mt-2">رقم الفاتورة: <span className="font-mono" dir="ltr">INV-{offer.id.slice(0, 8).toUpperCase()}</span></div>
              <div className="text-xs text-gray-500">التاريخ: {new Date(offer.accepted_at || offer.created_at).toLocaleString('ar-SA')}</div>
            </div>
            {qrUrl && (
              <div className="text-center">
                <img src={qrUrl} alt="ZATCA QR" className="w-28 h-28" />
                <div className="text-[9px] text-gray-400 mt-1">رمز التحقق الضريبي</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6 p-6 border-b border-gray-100 text-sm">
            <div>
              <div className="text-xs font-bold text-gray-400 mb-1">البائع (المورد)</div>
              <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>
              <div className="text-gray-500">الرقم الضريبي: {supplier?.vat_number || '— غير مُسجّل'}</div>
              {supplier?.commercial_registration && <div className="text-gray-500">سجل تجاري: {supplier.commercial_registration}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 mb-1">المشتري (المقاول)</div>
              <div className="font-bold text-gray-900">{contractor?.company_name_ar || '—'}</div>
              <div className="text-gray-500">الرقم الضريبي: {contractor?.vat_number || '—'}</div>
              {contractor?.commercial_registration && <div className="text-gray-500">سجل تجاري: {contractor.commercial_registration}</div>}
            </div>
          </div>
          <div className="p-6">
            <table className="w-full text-sm mb-4">
              <thead><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="text-right pb-2">الصنف</th><th className="text-right pb-2">الكمية</th><th className="text-right pb-2">سعر الوحدة</th><th className="text-right pb-2">الإجمالي</th></tr></thead>
              <tbody><tr><td className="py-2 font-semibold text-gray-900">{rfq.product_name}</td><td className="py-2 text-gray-600">{rfq.quantity} {rfq.unit}</td><td className="py-2 text-gray-600">{offer.unit_price ? offer.unit_price.toLocaleString('en-US') : '—'}</td><td className="py-2 font-bold text-gray-900">{offer.total_price?.toLocaleString('en-US')} ر.س</td></tr></tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">المجموع (غير شامل الضريبة)</span><span>{offer.total_price?.toLocaleString('en-US')} ر.س</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ضريبة القيمة المضافة 15%</span><span>{(offer.total_price * 0.15).toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</span></div>
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1"><span>الإجمالي شامل الضريبة</span><span style={{ color: '#0F6E56' }}>{(offer.total_price * 1.15).toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</span></div>
              </div>
            </div>
            {!supplier?.vat_number && (
              <div className="mt-3 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 print:hidden">
                ⚠ المورد لم يسجّل رقمه الضريبي بعد — يلزم لإصدار فاتورة ضريبية رسمية. (يضيفه من الإعدادات)
              </div>
            )}
          </div>
        </div>

        {/* 🛡 حماية الصفقة — محضر استلام + تأكيد دفع + نزاع (للطرفين) */}
        {offer.status === 'accepted' && (isContractor || isSupplier) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6 print:hidden" dir="rtl">
            <h3 className="text-base font-bold mb-1" style={{ color: '#1B2D5B' }}>🛡 حماية الصفقة</h3>
            <p className="text-xs text-gray-400 mb-3">توثّق المنصة مراحل الصفقة كدليل يحمي الطرفين — ولا تحتفظ بأي مبالغ.</p>
            {(() => {
              const other = isContractor ? supplier : contractor
              const w = waLink(other?.phone, `بخصوص أمر الشراء ${poNumber} في منصة تسعيرك`)
              return w ? (
                <a href={w} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs mb-4 px-3 py-1.5 rounded-full font-semibold text-white" style={{ background: '#25D366' }}>
                  💬 تواصل مع {isContractor ? 'المورد' : 'المقاول'} عبر واتساب
                </a>
              ) : null
            })()}

            {/* Tracker */}
            <div className="grid grid-cols-4 gap-2 mb-5 text-center text-[11px]">
              {[
                { k: 'accept', label: 'قبول العرض', done: true, at: offer.accepted_at },
                { k: 'deliver', label: 'تسليم المورد', done: !!offer.supplier_delivered_at, at: offer.supplier_delivered_at },
                { k: 'receipt', label: 'استلام المقاول', done: !!offer.received_at, at: offer.received_at },
                { k: 'paid', label: 'الدفع', done: offer.payment_status === 'paid', at: offer.payment_confirmed_at || offer.paid_marked_at },
              ].map((s, i) => (
                <div key={s.k} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${s.done ? 'text-white' : 'bg-gray-100 text-gray-400'}`} style={s.done ? { background: '#0F6E56' } : {}}>{s.done ? '✓' : i + 1}</div>
                  <div className={`mt-1 ${s.done ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>{s.label}</div>
                  {s.at && <div className="text-[9px] text-gray-400">{new Date(s.at).toLocaleDateString('ar-SA')}</div>}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {/* Delivery */}
              <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
                <div className="text-sm">
                  <div className="font-semibold text-gray-700">تسليم البضاعة</div>
                  <div className="text-xs text-gray-400">{offer.supplier_delivered_at ? `✓ أكّد المورد التسليم — ${new Date(offer.supplier_delivered_at).toLocaleString('ar-SA')}` : 'بانتظار تأكيد المورد'}</div>
                </div>
                {!offer.supplier_delivered_at && isSupplier && (
                  <button onClick={() => patch({ supplier_delivered_at: now() }, 'deliver')} disabled={busy === 'deliver'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#1B2D5B' }}>✓ أكّدت التسليم</button>
                )}
              </div>

              {/* Receipt = محضر استلام */}
              <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: offer.received_at ? '#E1F5EE' : '#f9fafb' }}>
                <div className="text-sm">
                  <div className="font-semibold text-gray-700">محضر الاستلام</div>
                  <div className="text-xs text-gray-400">{offer.received_at ? `✓ موثّق — أكّد المقاول الاستلام ${new Date(offer.received_at).toLocaleString('ar-SA')}` : 'بانتظار تأكيد المقاول لاستلام البضاعة'}</div>
                </div>
                {!offer.received_at && isContractor && (
                  <button onClick={() => { if (confirm('تأكيد استلام البضاعة؟ سيُسجّل محضر موثّق بالتاريخ.')) patch({ received_at: now(), received_by: myId }, 'receipt') }} disabled={busy === 'receipt'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>✓ أؤكّد الاستلام</button>
                )}
              </div>

              {/* Payment */}
              <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
                <div className="text-sm">
                  <div className="font-semibold text-gray-700">الدفع</div>
                  <div className="text-xs text-gray-400">
                    {offer.payment_status === 'paid'
                      ? (offer.payment_confirmed_at ? `✓ أكّد المورد استلام الدفعة — ${new Date(offer.payment_confirmed_at).toLocaleString('ar-SA')}` : 'أكّد المقاول الدفع — بانتظار تأكيد المورد')
                      : 'لم تُؤكَّد الدفعة بعد'}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {offer.payment_status !== 'paid' && isContractor && (
                    <button onClick={() => patch({ payment_status: 'paid', paid_marked_at: now() }, 'paid')} disabled={busy === 'paid'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#1B2D5B' }}>✓ أكّدت الدفع</button>
                  )}
                  {offer.payment_status === 'paid' && !offer.payment_confirmed_at && isSupplier && (
                    <button onClick={() => patch({ payment_confirmed_at: now() }, 'paycfm')} disabled={busy === 'paycfm'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>✓ أكّدت استلام الدفعة</button>
                  )}
                </div>
              </div>
            </div>

            {/* Dispute */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              {offer.dispute_status === 'open' ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                  <div className="font-bold text-red-700">⚠ نزاع مفتوح</div>
                  <div className="text-xs text-red-600 mt-1">{offer.dispute_reason}</div>
                  <div className="text-[11px] text-gray-500 mt-1">فريق المنصة سيتواصل مع الطرفين للوساطة.</div>
                </div>
              ) : offer.dispute_status === 'resolved' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">✓ تم حل النزاع{offer.dispute_resolution ? `: ${offer.dispute_resolution}` : ''}</div>
              ) : !showDispute ? (
                <button onClick={() => setShowDispute(true)} className="text-xs text-red-600 hover:underline">⚠ واجهت مشكلة؟ افتح نزاعاً</button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <label className="block text-xs font-bold text-red-700 mb-1.5">صف المشكلة</label>
                  <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} className="input-field" rows={2} placeholder="مثال: البضاعة لم تُسلّم / مختلفة عن المواصفات / تأخّر الدفع..." />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { if (!disputeReason) return; patch({ dispute_status: 'open', dispute_reason: disputeReason, dispute_by: myId, dispute_opened_at: now() }, 'dispute'); setShowDispute(false) }} disabled={!disputeReason || busy === 'dispute'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white bg-red-500 disabled:opacity-50">إرسال النزاع</button>
                    <button onClick={() => setShowDispute(false)} className="text-xs px-3 py-2 text-gray-500">إلغاء</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* تقييم المورد — للمقاول فقط بعد القبول */}
        {offer.status === 'accepted' && myId && rfq.contractor_id === myId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6 print:hidden" dir="rtl">
            {existingReview ? (
              <div className="text-center">
                <div className="text-sm font-bold text-gray-900 mb-2">شكراً لتقييمك ⭐</div>
                <div className="flex items-center justify-center gap-0.5 text-xl">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={n <= existingReview.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                  ))}
                </div>
                {existingReview.comment && <p className="text-xs text-gray-500 mt-2">{existingReview.comment}</p>}
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">قيّم تعاملك مع {supplier?.company_name_ar || 'المورد'}</h3>
                <p className="text-xs text-gray-400 mb-3">تقييمك يساعد بقية المقاولين على اختيار الموردين</p>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-3xl transition-transform hover:scale-110 leading-none">
                      <span className={n <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                    </button>
                  ))}
                </div>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 focus:border-[#0F6E56] outline-none" rows={2}
                  placeholder="تعليق اختياري عن جودة المنتج والتعامل..." />
                {reviewMsg && <p className="text-xs text-red-500 mb-2">{reviewMsg}</p>}
                <button onClick={submitReview} disabled={!rating || reviewSubmitting}
                  className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow"
                  style={{ background: '#0F6E56' }}>
                  {reviewSubmitting ? 'جارٍ الإرسال...' : 'إرسال التقييم'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
