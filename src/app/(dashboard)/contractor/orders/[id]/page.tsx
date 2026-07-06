'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileHref } from '@/lib/fileHref'
import { SECTOR_LABELS } from '@/types'
// @ts-ignore — qrcode has no bundled types
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
  const [offer, setOffer] = useState<any>(null)
  const [rfq, setRfq] = useState<any>(null)
  const [supplier, setSupplier] = useState<any>(null)
  const [contractor, setContractor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<any>(null)
  const [existingReview, setExistingReview] = useState<any>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [awards, setAwards] = useState<any[]>([]) // ترسية بند-بند: مواد هذا المورد فقط (إن وُجدت)

  // Generate the ZATCA invoice QR once the deal parties are loaded.
  useEffect(() => {
    if (!offer || !supplier) return
    const exSum = (Array.isArray(offer.extra_charges) ? offer.extra_charges : []).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
    const entered = (Array.isArray(awards) && awards.length > 0)
      ? awards.reduce((s: number, a: any) => s + (Number(a.total) || 0), 0) + exSum
      : (Number(offer.total_price) || 0)
    const base = offer.vat_included ? entered / 1.15 : entered // net (pre-VAT) — QR adds VAT back
    const iso = new Date(offer.accepted_at || offer.created_at).toISOString()
    const payload = zatcaQrPayload(
      supplier.company_name_ar || 'Supplier',
      supplier.vat_number || '0',
      iso,
      (base * 1.15).toFixed(2),
      (base * 0.15).toFixed(2),
    )
    QRCode.toDataURL(payload, { margin: 1, width: 160 }).then(setQrUrl).catch(() => {})
  }, [offer, supplier, awards])

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

      // ترسية بند-بند: المواد المُرساة على هذا المورد في هذا الطلب
      const { data: awardRows } = await supabase
        .from('rfq_item_awards').select('*')
        .eq('rfq_id', offerData.rfq_id).eq('supplier_id', offerData.supplier_id)
        .order('item_index')
      setAwards(awardRows || [])

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
  // Gregorian calendar pinned to KSA time so the printed date matches the QR (B3)
  const date = new Date(offer.accepted_at || offer.created_at).toLocaleDateString('ar-SA-u-ca-gregory', { timeZone: 'Asia/Riyadh' })
  // المواد المسعّرة بند-بند. عند الترسية بند-بند نعرض فقط مواد هذا المورد المُرساة عليه،
  // وإلا كل بنود العرض (طلب متعدّد المواد) — تُعرض كأسطر في أمر الشراء والفاتورة.
  const hasAwards = Array.isArray(awards) && awards.length > 0
  const ipRaw = hasAwards
    ? awards.map((a: any) => ({ product_name: a.item_key, sector: rfq?.items?.[a.item_index]?.sector, quantity: a.quantity, unit: a.unit, unit_price: a.unit_price, total: a.total, specification: rfq?.items?.[a.item_index]?.specification }))
    : (Array.isArray(offer.item_prices) ? offer.item_prices : [])
  const _ex = Array.isArray(offer.extra_charges) ? offer.extra_charges : []
  const vatIncl = !!offer.vat_included
  const toNet = (n: any) => (vatIncl ? (Number(n) || 0) / 1.15 : (Number(n) || 0))
  // ZATCA: every displayed line is ex-VAT so the amount column sums to the pre-VAT subtotal, and
  // extra charges (delivery/installation/fees) show as their own line items — not hidden in the total (B1).
  const rows: any[] = (ipRaw.length > 0
    ? ipRaw.map((it: any) => ({ product_name: it.product_name, sector: it.sector, specification: it.specification, notes: it.notes, attachment_url: it.attachment_url, attachment_name: it.attachment_name, quantity: it.quantity, unit: it.unit, unitNet: Number(it.unit_price) > 0 ? toNet(it.unit_price) : null, net: toNet(it.total) }))
    : [{ product_name: rfq.product_name, sector: rfq.sector, specification: rfq.specification, quantity: rfq.quantity, unit: rfq.unit, unitNet: offer.unit_price ? toNet(offer.unit_price) : null, net: toNet(offer.total_price) }])
  for (const e of _ex) rows.push({ product_name: e.label || 'رسوم إضافية', sector: null, quantity: '', unit: '', unitNet: null, net: toNet(e.amount), isExtra: true })
  const dealNet = rows.reduce((s: number, r: any) => s + (Number(r.net) || 0), 0)
  const dealVat = dealNet * 0.15
  const dealGross = dealNet + dealVat

  return (
    <div className="min-h-screen bg-slate-50 p-4 print:bg-white print:p-0" dir="rtl">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Actions - hidden in print */}
        <div className="flex items-center justify-between mt-4 print:hidden">
          <Link href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← رجوع للوحة التحكم</Link>
          <button onClick={handlePrint}
            className="bg-[#1B2D5B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0f1d3d] transition-colors">
            🖨️ طباعة أمر الشراء
          </button>
        </div>

        {/* Purchase Order Document */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-2 print:shadow-none print:border-none print:rounded-none">

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
              {(contractor?.city || contractor?.region) && <div className="text-sm text-gray-500">{contractor.city || contractor.region}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">البائع (المورد)</div>
              <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>
              {supplier?.commercial_registration && (
                <div className="text-sm text-gray-500 mt-1">سجل تجاري: {supplier.commercial_registration}</div>
              )}
              {supplier?.phone && <div className="text-sm text-gray-500">جوال: {supplier.phone}</div>}
              {(supplier?.city || supplier?.region) && <div className="text-sm text-gray-500">{supplier.city || supplier.region}</div>}
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
                    {Object.entries(offer.attributes).map(([k, v]: any) => (
                      <span key={k} className="text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <strong className="text-gray-700">{k}:</strong> <span className="text-gray-600">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {offer?.attachment_url && (
                <a href={fileHref(offer.attachment_url)} target="_blank" rel="noopener noreferrer"
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
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">الإجمالي (قبل الضريبة)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it: any, idx: any) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-gray-500">{idx + 1}</td>
                    <td className="py-4">
                      <div className="font-semibold text-gray-900">{it.product_name}</div>
                      {(it.specification || it.notes) && <div className="text-xs text-gray-400 mt-0.5">{it.specification || it.notes}</div>}
                      {it.attachment_url && (
                        <a href={fileHref(it.attachment_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-[#d96f15] hover:underline print:hidden">📎 {it.attachment_name || 'ملف المواصفات'}</a>
                      )}
                    </td>
                    <td className="py-4 text-sm text-gray-600">{it.sector ? ((SECTOR_LABELS as any)[it.sector] || it.sector) : '—'}</td>
                    <td className="py-4 text-sm text-gray-600">{it.quantity} {it.unit}</td>
                    <td className="py-4 text-sm text-gray-600">{Number(it.unitNet) > 0 ? `${Number(it.unitNet).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س` : '—'}</td>
                    <td className="py-4 font-bold text-gray-900">{Number(it.net).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">المجموع الفرعي (قبل الضريبة)</span>
                  <span className="text-gray-900">{dealNet.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ضريبة القيمة المضافة (15%)</span>
                  <span className="text-gray-900">{dealVat.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">الإجمالي شامل الضريبة</span>
                  <span className="font-bold text-[#d96f15] text-lg">{dealGross.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span>
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
                <span>موقع التسليم: {rfq.city || rfq.region}</span>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-3">
          <div className="p-6 border-b border-gray-100 flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1B2D5B' }}>فاتورة ضريبية</h2>
              <p className="text-xs text-gray-400">Tax Invoice · متوافقة مع هيئة الزكاة والضريبة (ZATCA)</p>
              <div className="text-xs text-gray-500 mt-2">رقم الفاتورة: <span className="font-mono" dir="ltr">{offer.invoice_number || `INV-${offer.id.slice(0, 8).toUpperCase()}`}</span></div>
              <div className="text-xs text-gray-500">التاريخ: {new Date(offer.accepted_at || offer.created_at).toLocaleString('ar-SA-u-ca-gregory', { timeZone: 'Asia/Riyadh' })}</div>
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
              <thead><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="text-right pb-2">الصنف</th><th className="text-right pb-2">الكمية</th><th className="text-right pb-2">سعر الوحدة</th><th className="text-right pb-2">الإجمالي (قبل الضريبة)</th></tr></thead>
              <tbody>
                {rows.map((it: any, idx: any) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2 font-semibold text-gray-900">{it.product_name}</td>
                    <td className="py-2 text-gray-600">{it.quantity} {it.unit}</td>
                    <td className="py-2 text-gray-600">{Number(it.unitNet) > 0 ? Number(it.unitNet).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</td>
                    <td className="py-2 font-bold text-gray-900">{Number(it.net).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">المجموع (غير شامل الضريبة)</span><span>{dealNet.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ضريبة القيمة المضافة 15%</span><span>{dealVat.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span></div>
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1"><span>الإجمالي شامل الضريبة</span><span style={{ color: '#0F6E56' }}>{dealGross.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span></div>
              </div>
            </div>
            {!supplier?.vat_number && (
              <div className="mt-3 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 print:hidden">
                ⚠ المورد لم يسجّل رقمه الضريبي بعد — يلزم لإصدار فاتورة ضريبية رسمية. (يضيفه من الإعدادات)
              </div>
            )}
          </div>
        </div>

        {/* تقييم المورد — للمقاول فقط بعد القبول */}
        {offer.status === 'accepted' && myId && rfq.contractor_id === myId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 order-4 print:hidden" dir="rtl">
            {existingReview ? (
              <div className="text-center">
                <div className="text-sm font-bold text-gray-900 mb-2">شكراً لتقييمك ⭐</div>
                <div className="flex items-center justify-center gap-0.5 text-xl">
                  {[1, 2, 3, 4, 5].map((n: any) => (
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
                  {[1, 2, 3, 4, 5].map((n: any) => (
                    <button key={n} type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-3xl transition-transform hover:scale-110 leading-none">
                      <span className={n <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                    </button>
                  ))}
                </div>
                <textarea value={reviewComment} onChange={(e: any) => setReviewComment(e.target.value)}
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
