'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileHref } from '@/lib/fileHref'
import { SECTOR_LABELS, getProductLabel, getUnitLabel } from '@/types'
import { useTranslation } from '@/i18n'
import { rfqRef } from '@/lib/rfqName'
import Glyph from '@/components/shared/Glyph'
import { paymentTermsLabel } from '@/lib/paymentTerms'
import { showsVatBreakdown } from '@/lib/vat'

const SECTOR_I18N: Record<string, Record<string, string>> = {
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}
export default function OrderDetailPage() {
  const { id } = useParams() // offer id
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK' : 'ar-SA-u-ca-gregory'
  const SAR = L('SAR', 'SAR', 'ر.س')
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
  const [awards, setAwards] = useState<any[]>([]) // ترسية بند-بند: مواد هذا المورد فقط (إن وُجدت)

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
    if (error) { setReviewMsg(L('Something went wrong, please try again', 'کوئی خرابی ہوئی، دوبارہ کوشش کریں', 'حدث خطأ، حاول مرة أخرى')); return }
    setExistingReview({ rating, comment: reviewComment })
  }

  if (loading) return <PageLoader />

  if (!offer || !rfq) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-gray-500">{L('Order not found', 'آرڈر نہیں ملا', 'الطلب غير موجود')}</div>
    </div>
  )

  const poNumber = `PO-${offer.id.slice(0, 8).toUpperCase()}`
  // Gregorian calendar pinned to KSA time so the printed date matches the QR (B3)
  const date = new Date(offer.accepted_at || offer.created_at).toLocaleDateString(dloc, { timeZone: 'Asia/Riyadh' })
  // المواد المسعّرة بند-بند. عند الترسية بند-بند نعرض فقط مواد هذا المورد المُرساة عليه،
  // وإلا كل بنود العرض (طلب متعدّد المواد) — تُعرض كأسطر في أمر الشراء والفاتورة.
  const hasAwards = Array.isArray(awards) && awards.length > 0
  const ipRaw = hasAwards
    ? awards.map((a: any) => ({ product_name: a.item_key, sector: rfq?.items?.[a.item_index]?.sector, quantity: a.quantity, unit: a.unit, unit_price: a.unit_price, total: a.total, specification: rfq?.items?.[a.item_index]?.specification, warranty: (Array.isArray(offer.item_prices) ? offer.item_prices : []).find((e: any) => e.item_index === a.item_index)?.warranty }))
    : (Array.isArray(offer.item_prices) ? offer.item_prices : [])
  const _ex = Array.isArray(offer.extra_charges) ? offer.extra_charges : []
  const vatIncl = !!offer.vat_included
  // a seller without a VAT number (offers.vat_status): amounts are final, no VAT is split out or added
  const vatBreak = showsVatBreakdown(offer)
  const toNet = (n: any) => (vatBreak && vatIncl ? (Number(n) || 0) / 1.15 : (Number(n) || 0))
  // ZATCA: every displayed line is ex-VAT so the amount column sums to the pre-VAT subtotal, and
  // extra charges (delivery/installation/fees) show as their own line items — not hidden in the total (B1).
  const rows: any[] = (ipRaw.length > 0
    ? ipRaw.map((it: any) => ({ product_name: it.product_name, warranty: it.warranty || null, sector: it.sector, specification: it.specification, notes: it.notes, attachment_url: it.attachment_url, attachment_name: it.attachment_name, quantity: it.quantity, unit: it.unit, unitNet: Number(it.unit_price) > 0 ? toNet(it.unit_price) : null, net: toNet(it.total) }))
    : [{ product_name: rfq.product_name, sector: rfq.sector, specification: rfq.specification, quantity: rfq.quantity, unit: rfq.unit, unitNet: offer.unit_price ? toNet(offer.unit_price) : null, net: toNet(offer.total_price) }])
  for (const e of _ex) rows.push({ product_name: e.label || L('Extra charges', 'اضافی چارجز', 'رسوم إضافية'), sector: null, quantity: '', unit: '', unitNet: null, net: toNet(e.amount), isExtra: true })
  const dealNet = rows.reduce((s: number, r: any) => s + (Number(r.net) || 0), 0)
  const dealVat = vatBreak ? dealNet * 0.15 : 0
  const dealGross = dealNet + dealVat

  return (
    <div className="min-h-screen bg-slate-50 p-4 print:bg-white print:p-0" dir={dir}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Actions - hidden in print */}
        <div className="flex items-center justify-between mt-4 print:hidden">
          <Link href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← {L('Back to dashboard', 'ڈیش بورڈ پر واپس', 'رجوع للوحة التحكم')}</Link>
          <div className="flex items-center gap-2">
            {offer?.rfq_id && (
              <Link href={`/contractor/rfq/quick?from=${offer.rfq_id}`}
                className="border border-[#0B2438] text-[#0B2438] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0B2438]/5 transition-colors">
                <Glyph e="🔁" /> {L('Reorder', 'دوبارہ آرڈر کریں', 'أعد الطلب')}
              </Link>
            )}
            <button onClick={handlePrint}
              className="bg-[#0B2438] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#071827] transition-colors">
              <Glyph e="🖨" /> {L('Print purchase order', 'پرچیز آرڈر پرنٹ کریں', 'طباعة أمر الشراء')}
            </button>
          </div>
        </div>

        {/* Purchase Order Document */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-2 print:shadow-none print:border-none print:rounded-none">

          {/* Header */}
          <div className="bg-gradient-to-l from-[#071827] via-[#0B2438] to-[#123B53] text-white p-4 sm:p-8 border-b-2 border-[#D4A543] print:bg-[#0B2438]">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{L('Purchase Order', 'پرچیز آرڈر', 'أمر شراء')}</h1>
                {locale !== 'en' && <p className="text-[#F5C55B] text-sm mt-1">Purchase Order</p>}
              </div>
              <div className="text-left">
                <div className="text-sm text-[#F5C55B]">{L('Order no.', 'آرڈر نمبر', 'رقم الأمر')}</div>
                <div className="text-xl font-bold font-mono">{poNumber}</div>
                <div className="text-sm text-[#F5C55B] mt-1">{L('Date:', 'تاریخ:', 'التاريخ:')} {date}</div>
                {rfqRef(rfq) && <div className="text-sm text-[#F5C55B] mt-1">{L('Request:', 'درخواست:', 'الطلب:')} <span className="font-mono" dir="ltr">{rfqRef(rfq)}</span></div>}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-8 border-b border-gray-100">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">{L('Buyer', 'خریدار', 'المشتري')}</div>
              <div className="font-bold text-gray-900">{contractor?.company_name_ar || '—'}</div>
              {contractor?.commercial_registration && (
                <div className="text-sm text-gray-500 mt-1">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {contractor.commercial_registration}</div>
              )}
              {contractor?.phone && <div className="text-sm text-gray-500">{L('Mobile:', 'موبائل:', 'جوال:')} {contractor.phone}</div>}
              {(contractor?.city || contractor?.region) && <div className="text-sm text-gray-500">{contractor.city || contractor.region}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">{L('Seller (supplier)', 'بیچنے والا (سپلائر)', 'البائع (المورد)')}</div>
              <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>
              {supplier?.commercial_registration && (
                <div className="text-sm text-gray-500 mt-1">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {supplier.commercial_registration}</div>
              )}
              {supplier?.phone && <div className="text-sm text-gray-500">{L('Mobile:', 'موبائل:', 'جوال:')} {supplier.phone}</div>}
              {(supplier?.city || supplier?.region) && <div className="text-sm text-gray-500">{supplier.city || supplier.region}</div>}
              {supplier?.national_short_address && (
                <div className="text-sm text-gray-500 font-mono" dir="ltr"><Glyph e="🏛" /> {supplier.national_short_address}</div>
              )}
              {supplier?.building_number && supplier?.street_name && (
                <div className="text-xs text-gray-400">
                  {supplier.building_number}, {supplier.street_name}{supplier.district ? `, ${supplier.district}` : ''}{supplier.postal_code ? `, ${supplier.postal_code}` : ''}
                </div>
              )}
              {supplier?.latitude && supplier?.longitude && (
                <a href={`https://www.google.com/maps?q=${supplier.latitude},${supplier.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-block text-xs text-[#9D7425] hover:underline mt-1 print:hidden">
                  <Glyph e="🗺" /> {L('View location on map', 'نقشے پر مقام دیکھیں', 'عرض الموقع على الخريطة')} ←
                </a>
              )}
            </div>
          </div>

          {/* خصائص المنتج المعروض + الملف المرفق */}
          {(offer?.attributes || offer?.attachment_url) && (
            <div className="px-8 pb-6 border-b border-gray-100">
              {offer?.attributes && Object.keys(offer.attributes).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">{L('Product attributes', 'پروڈکٹ کی خصوصیات', 'خصائص المنتج')}</div>
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
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#9D7425] hover:underline print:hidden">
                  <Glyph e="📎" /> {offer.attachment_name || L('Product catalog', 'پروڈکٹ کیٹلاگ', 'كتالوج المنتج')} ←
                </a>
              )}
            </div>
          )}

          {/* Items Table — قابلة للتمرير أفقياً على الجوال بدل سحب الصفحة كلها */}
          <div className="p-4 sm:p-8 border-b border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right text-xs font-bold text-gray-500 pb-3 w-8">#</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">{L('Item', 'آئٹم', 'الصنف')}</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">{L('Sector', 'شعبہ', 'القطاع')}</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">{L('Quantity', 'مقدار', 'الكمية')}</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">{L('Unit price', 'فی یونٹ قیمت', 'سعر الوحدة')}</th>
                  <th className="text-right text-xs font-bold text-gray-500 pb-3">{vatBreak ? L('Total (before VAT)', 'کل (ٹیکس سے پہلے)', 'الإجمالي (قبل الضريبة)') : L('Total incl. VAT', 'کل ٹیکس سمیت', 'الإجمالي شامل الضريبة')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it: any, idx: any) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-gray-500">{idx + 1}</td>
                    <td className="py-4">
                      <div className="font-semibold text-gray-900">{getProductLabel(it.product_name, locale)}</div>
                      {(it.specification || it.notes) && <div className="text-xs text-gray-400 mt-0.5">{it.specification || it.notes}</div>}
                      {it.attachment_url && (
                        <a href={fileHref(it.attachment_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-[#9D7425] hover:underline print:hidden"><Glyph e="📎" /> {it.attachment_name || L('Specs file', 'اسپیسیفکیشن فائل', 'ملف المواصفات')}</a>
                      )}
                    </td>
                    <td className="py-4 text-sm text-gray-600">{it.sector ? ((locale !== 'ar' && SECTOR_I18N[locale]?.[it.sector]) || (SECTOR_LABELS as any)[it.sector] || it.sector) : '—'}</td>
                    <td className="py-4 text-sm text-gray-600">{it.quantity} {getUnitLabel(it.unit, locale)}</td>
                    <td className="py-4 text-sm text-gray-600">{Number(it.unitNet) > 0 ? `${Number(it.unitNet).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${SAR}` : '—'}</td>
                    <td className="py-4 font-bold text-gray-900">{Number(it.net).toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-4 sm:p-8 border-b border-gray-100">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                {vatBreak && (<>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{L('Subtotal (before VAT)', 'ذیلی کل (ٹیکس سے پہلے)', 'المجموع الفرعي (قبل الضريبة)')}</span>
                  <span className="text-gray-900">{dealNet.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{L('VAT (15%)', 'ویٹ (VAT) (15%)', 'ضريبة القيمة المضافة (15%)')}</span>
                  <span className="text-gray-900">{dealVat.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span>
                </div>
                </>)}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">{L('Total incl. VAT', 'کل رقم ٹیکس سمیت', 'الإجمالي شامل الضريبة')}</span>
                  <span className="font-bold text-[#9D7425] text-lg">{dealGross.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="p-4 sm:p-8 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3">{L('Supply terms', 'سپلائی کی شرائط', 'شروط التوريد')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>{rfq.delivery_required ? <Glyph e="✅" /> : <Glyph e="❌" />}</span>
                <span>{rfq.delivery_required ? L('Delivery included', 'ڈیلیوری شامل ہے', 'التوصيل مشمول') : L('Delivery not included', 'ڈیلیوری شامل نہیں', 'التوصيل غير مشمول')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{rfq.vat_invoice_required ? <Glyph e="✅" /> : <Glyph e="❌" />}</span>
                <span>{rfq.vat_invoice_required ? L('Tax invoice required', 'ٹیکس انوائس درکار ہے', 'فاتورة ضريبية مطلوبة') : L('Tax invoice not required', 'ٹیکس انوائس درکار نہیں', 'فاتورة ضريبية غير مطلوبة')}</span>
              </div>
              {offer.payment_terms && (
                <div className="flex items-center gap-2">
                  <span><Glyph e="💳" /></span>
                  <span>{L('Payment terms:', 'ادائیگی کی شرائط:', 'شروط الدفع:')} <b>{paymentTermsLabel(offer.payment_terms, locale)}</b></span>
                </div>
              )}
              {offer.delivery_days && (
                <div className="flex items-center gap-2">
                  <span><Glyph e="📦" /></span>
                  <span>{L('Delivery time:', 'ڈیلیوری کا وقت:', 'مدة التوصيل:')} {offer.delivery_days} {L('working days', 'کاروباری دن', 'يوم عمل')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span><Glyph e="📍" /></span>
                <span>{L('Delivery location:', 'ڈیلیوری کی جگہ:', 'موقع التسليم:')} {rfq.city || rfq.region}</span>
              </div>
            </div>
            {offer.notes && (
              <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <strong>{L('Supplier notes:', 'سپلائر کے نوٹس:', 'ملاحظات المورد:')}</strong> {offer.notes}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="p-4 sm:p-8 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl">
              <span className="text-xl"><Glyph e="✅" /></span>
              <div>
                <div className="font-bold">{L('Offer approved', 'آفر منظور ہو گئی', 'تمت الموافقة على العرض')}</div>
                <div className="text-xs text-green-600">{L('on', 'بتاریخ', 'بتاريخ')} {date}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 🧾 بيان الصفقة: مستند صوري غير رسمي لمبلغ الصفقة. الفاتورة الرسمية يصدرها المورد
            (من عنده، أو من المحل الذي اشترى منه) ويرفعها في صفحة الصفقة، وتظهر هنا للمشتري. */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-3">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold" style={{ color: '#0B2438' }}>{L('Deal statement', 'ڈیل اسٹیٹمنٹ', 'بيان الصفقة')}</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{L('An unofficial document showing the deal amount — not a tax invoice. The official invoice is issued by the supplier and attached below.', 'یہ غیر سرکاری دستاویز ہے جو ڈیل کی رقم دکھاتی ہے، ٹیکس انوائس نہیں ہے۔ باضابطہ انوائس سپلائر جاری کرتا ہے اور نیچے منسلک ہوتی ہے۔', 'مستند غير رسمي يوضّح مبلغ الصفقة، وليس فاتورة ضريبية. الفاتورة الرسمية يصدرها المورد وتُرفق أدناه.')}</p>
            <div className="text-xs text-gray-500 mt-2">{L('Statement no.:', 'اسٹیٹمنٹ نمبر:', 'رقم البيان:')} <span className="font-mono" dir="ltr">{(offer.invoice_number || '').replace(/^INV-/, 'ST-') || `ST-${offer.id.slice(0, 8).toUpperCase()}`}</span></div>
            <div className="text-xs text-gray-500">{L('Date:', 'تاریخ:', 'التاريخ:')} {new Date(offer.accepted_at || offer.created_at).toLocaleString(dloc, { timeZone: 'Asia/Riyadh' })}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-6 border-b border-gray-100 text-sm">
            <div>
              <div className="text-xs font-bold text-gray-400 mb-1">{L('Supplier', 'سپلائر', 'المورد')}</div>
              <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>
              {supplier?.vat_number && <div className="text-gray-500">{L('VAT no.:', 'ٹیکس نمبر:', 'الرقم الضريبي:')} {supplier.vat_number}</div>}
              {supplier?.commercial_registration && <div className="text-gray-500">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {supplier.commercial_registration}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 mb-1">{L('Buyer', 'خریدار', 'المشتري')}</div>
              <div className="font-bold text-gray-900">{contractor?.company_name_ar || '—'}</div>
              {contractor?.vat_number && <div className="text-gray-500">{L('VAT no.:', 'ٹیکس نمبر:', 'الرقم الضريبي:')} {contractor.vat_number}</div>}
              {contractor?.commercial_registration && <div className="text-gray-500">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {contractor.commercial_registration}</div>}
            </div>
          </div>
          <div className="p-4 sm:p-6 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm mb-4">
              <thead><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="text-right pb-2">{L('Item', 'آئٹم', 'الصنف')}</th><th className="text-right pb-2">{L('Quantity', 'مقدار', 'الكمية')}</th><th className="text-right pb-2">{L('Unit price', 'فی یونٹ قیمت', 'سعر الوحدة')}</th><th className="text-right pb-2">{vatBreak ? L('Total (before VAT)', 'کل (ٹیکس سے پہلے)', 'الإجمالي (قبل الضريبة)') : L('Total incl. VAT', 'کل ٹیکس سمیت', 'الإجمالي شامل الضريبة')}</th></tr></thead>
              <tbody>
                {rows.map((it: any, idx: any) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2 font-semibold text-gray-900">{getProductLabel(it.product_name, locale)}{it.warranty ? <span className="block text-[11px] font-normal text-gray-500"><Glyph e="🛡" /> {L('Warranty:', 'وارنٹی:', 'الضمان:')} {it.warranty}</span> : null}</td>
                    <td className="py-2 text-gray-600">{it.quantity} {getUnitLabel(it.unit, locale)}</td>
                    <td className="py-2 text-gray-600">{Number(it.unitNet) > 0 ? Number(it.unitNet).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</td>
                    <td className="py-2 font-bold text-gray-900">{Number(it.net).toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                {vatBreak ? (<>
                <div className="flex justify-between"><span className="text-gray-500">{L('Total (excl. VAT)', 'کل (ٹیکس کے بغیر)', 'المجموع (غير شامل الضريبة)')}</span><span>{dealNet.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{L('VAT 15%', 'ویٹ (VAT) 15%', 'ضريبة القيمة المضافة 15%')}</span><span>{dealVat.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span></div>
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1"><span>{L('Total incl. VAT', 'کل رقم ٹیکس سمیت', 'الإجمالي شامل الضريبة')}</span><span style={{ color: '#0F6E56' }}>{dealGross.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span></div>
                </>) : (
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1"><span>{L('Total incl. VAT', 'کل رقم ٹیکس سمیت', 'الإجمالي شامل الضريبة')}</span><span style={{ color: '#0F6E56' }}>{dealGross.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span></div>
                )}
              </div>
            </div>
          </div>
          {/* الفاتورة الرسمية من المورد */}
          <div className="px-4 sm:px-6 pb-6">
            {offer.supplier_invoice_url ? (
              <a href={fileHref(offer.supplier_invoice_url)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm hover:shadow-sm">
                <span className="font-bold text-emerald-800"><Glyph e="📄" /> {L('Official invoice from the supplier', 'سپلائر کی باضابطہ انوائس', 'الفاتورة الرسمية من المورد')}</span>
                <span className="text-xs text-emerald-700">{new Date(offer.supplier_invoice_at).toLocaleDateString(dloc)} · {L('Download', 'ڈاؤن لوڈ', 'تنزيل')} ←</span>
              </a>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 leading-relaxed">
                <Glyph e="🧾" /> {L('The supplier has not attached the official invoice yet. It is usually attached on delivery and will show here.', 'سپلائر نے ابھی باضابطہ انوائس منسلک نہیں کی۔ عام طور پر ڈیلیوری پر منسلک کی جاتی ہے اور یہاں نظر آئے گی۔', 'لم يرفق المورد فاتورته الرسمية بعد. يرفقها عادةً عند التوصيل، وستظهر هنا.')}
              </div>
            )}
          </div>
        </div>

        {/* تقييم المورد — للمشتري فقط بعد تأكيد الاستلام (لا يكفي القبول) */}
        {offer.status === 'accepted' && myId && rfq.contractor_id === myId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 order-4 print:hidden" dir={dir}>
            {existingReview ? (
              <div className="text-center">
                <div className="text-sm font-bold text-gray-900 mb-2">{L('Thanks for your rating', 'ریٹنگ کا شکریہ', 'شكراً لتقييمك')} <Glyph e="⭐" /></div>
                <div className="flex items-center justify-center gap-0.5 text-xl">
                  {[1, 2, 3, 4, 5].map((n: any) => (
                    <span key={n} className={n <= existingReview.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                  ))}
                </div>
                {existingReview.comment && <p className="text-xs text-gray-500 mt-2">{existingReview.comment}</p>}
              </div>
            ) : offer.received_at ? (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{L('Rate your experience with', 'اپنے تجربے کی ریٹنگ دیں:', 'قيّم تعاملك مع')} {supplier?.company_name_ar || L('the supplier', 'سپلائر', 'المورد')}</h3>
                <p className="text-xs text-gray-400 mb-3">{L('Your rating helps other buyers choose suppliers', 'آپ کی ریٹنگ دوسرے خریداروں کو سپلائر چننے میں مدد دیتی ہے', 'تقييمك يساعد بقية المشترين على اختيار الموردين')}</p>
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
                  placeholder={L('Optional comment on product quality and service...', 'پروڈکٹ کی کوالٹی اور معاملے کے بارے میں اختیاری تبصرہ...', 'تعليق اختياري عن جودة المنتج والتعامل...')} />
                {reviewMsg && <p className="text-xs text-red-500 mb-2">{reviewMsg}</p>}
                <button onClick={submitReview} disabled={!rating || reviewSubmitting}
                  className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow"
                  style={{ background: '#0F6E56' }}>
                  {reviewSubmitting ? L('Sending...', 'بھیجا جا رہا ہے...', 'جارٍ الإرسال...') : L('Submit rating', 'ریٹنگ بھیجیں', 'إرسال التقييم')}
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="text-2xl mb-1"><Glyph e="📦" /></div>
                <div className="text-sm font-bold text-gray-700 mb-1">{L('Rate the supplier after receipt', 'وصولی کے بعد سپلائر کی ریٹنگ دیں', 'قيّم المورد بعد الاستلام')}</div>
                <p className="text-xs text-gray-400">{L('Rating opens once receipt of the goods is confirmed (receipt record), so it reflects the actual delivery.', 'مال کی وصولی کنفرم ہوتے ہی (وصولی کا ریکارڈ) ریٹنگ کھل جائے گی — تاکہ ریٹنگ اصل ڈیلیوری کے مطابق ہو۔', 'يفتح التقييم بمجرد تأكيد استلام البضاعة (تأكيد الاستلام) — ليعكس التقييمُ التسليمَ الفعلي.')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
