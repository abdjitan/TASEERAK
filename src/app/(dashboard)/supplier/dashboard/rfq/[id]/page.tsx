// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SECTOR_LABELS } from '@/types'

export default function SupplierRFQPage() {
  const { id } = useParams()
  const { locale, dir } = useTranslation()
  const [user, setUser] = useState(null)
  const [rfq, setRfq] = useState(null)
  const [existingOffer, setExistingOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState('')

  const [totalPrice, setTotalPrice] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('')
  const [notes, setNotes] = useState('')
  const [validity, setValidity] = useState('')

  // خصائص المنتج (key-value)
  const [attributes, setAttributes] = useState([{ key: '', value: '' }])

  // dismiss modal
  const [showDismiss, setShowDismiss] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)

      const { data: rfqData } = await supabase
        .from('rfqs').select('*, contractor:profiles(company_name_ar, company_name_en)').eq('id', id).single()
      setRfq(rfqData)

      // auto-calc unit price from quantity
      const { data: offerData } = await supabase
        .from('offers').select('*').eq('rfq_id', id).eq('supplier_id', session.user.id).single()
      if (offerData) setExistingOffer(offerData)

      setLoading(false)
    }
    load()
  }, [id])

  // حساب سعر الوحدة تلقائياً
  function handleTotalChange(val) {
    setTotalPrice(val)
    if (rfq?.quantity && val) {
      setUnitPrice((parseFloat(val) / rfq.quantity).toFixed(2))
    }
  }

  function addAttribute() {
    setAttributes(prev => [...prev, { key: '', value: '' }])
  }
  function updateAttribute(i, field, val) {
    setAttributes(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  }
  function removeAttribute(i) {
    setAttributes(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError('')

    const validAttrs = attributes.filter(a => a.key && a.value)
    const attrObj = validAttrs.reduce((acc, a) => { acc[a.key] = a.value; return acc }, {})

    const supabase = createClient()
    const { error: insertError } = await supabase.from('offers').insert({
      rfq_id: id,
      supplier_id: user.id,
      total_price: parseFloat(totalPrice),
      unit_price: unitPrice ? parseFloat(unitPrice) : null,
      delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
      notes: notes || null,
      attributes: validAttrs.length > 0 ? attrObj : null,
    })

    if (insertError) { setError(`خطأ: ${insertError.message}`); setSubmitting(false); return }
    setSuccess(true); setSubmitting(false)
  }

  async function handleDismiss() {
    const supabase = createClient()
    await supabase.from('rfq_dismissals').insert({
      rfq_id: id, supplier_id: user.id, reason: dismissReason || null,
    })
    setDismissed(true)
    setShowDismiss(false)
  }

  const T = {
    ar: {
      back: '← رجوع', details: 'تفاصيل الطلب', sector: 'القطاع', qty: 'الكمية',
      location: 'الموقع', contractor: 'المقاول', spec: 'المواصفات', notes: 'ملاحظات',
      delivery: 'التوصيل', vat: 'فاتورة ضريبية', required: 'مطلوب', notRequired: 'غير مطلوب',
      submitOffer: 'تقديم عرض سعر', totalPrice: 'السعر الإجمالي (ر.س)', unitPrice: 'سعر الوحدة (ر.س)',
      deliveryDays: 'مدة التوصيل (أيام)', attributes: 'خصائص المنتج المعروض',
      attrHint: 'أضف خصائص مثل: العلامة التجارية، بلد المنشأ، الضمان...',
      attrKey: 'الخاصية', attrValue: 'القيمة', addAttr: '+ إضافة خاصية',
      offerNotes: 'ملاحظات إضافية', send: 'إرسال العرض ←', sending: 'جارٍ الإرسال...',
      dismiss: 'تجاهل الطلب', dismissTitle: 'تجاهل هذا الطلب؟',
      dismissSub: 'لن يظهر هذا الطلب مرة أخرى في قائمتك', dismissReason: 'سبب التجاهل (اختياري)',
      confirmDismiss: 'تأكيد التجاهل', cancel: 'إلغاء',
      attachedFile: 'ملف مواصفات مرفق', viewFile: 'عرض الملف',
      successTitle: 'تم إرسال العرض', successSub: 'سيتم إخطارك عند قبول أو رفض العرض',
      dismissedTitle: 'تم تجاهل الطلب', dismissedSub: 'لن يظهر هذا الطلب في قائمتك',
      backDash: 'رجوع للوحة التحكم',
      alreadyTitle: { accepted: 'تم قبول عرضك!', rejected: 'تم رفض العرض', pending: 'عرضك قيد المراجعة' },
      closed: 'هذا الطلب مغلق', closedSub: 'لا يقبل عروض جديدة',
    },
    en: {
      back: '← Back', details: 'Request Details', sector: 'Sector', qty: 'Quantity',
      location: 'Location', contractor: 'Contractor', spec: 'Specification', notes: 'Notes',
      delivery: 'Delivery', vat: 'Tax Invoice', required: 'Required', notRequired: 'Not Required',
      submitOffer: 'Submit Price Offer', totalPrice: 'Total Price (SAR)', unitPrice: 'Unit Price (SAR)',
      deliveryDays: 'Delivery Time (days)', attributes: 'Product Attributes',
      attrHint: 'Add attributes like: Brand, Country of origin, Warranty...',
      attrKey: 'Attribute', attrValue: 'Value', addAttr: '+ Add Attribute',
      offerNotes: 'Additional Notes', send: 'Send Offer →', sending: 'Sending...',
      dismiss: 'Dismiss Request', dismissTitle: 'Dismiss this request?',
      dismissSub: 'This request will not appear again in your list', dismissReason: 'Reason (optional)',
      confirmDismiss: 'Confirm Dismiss', cancel: 'Cancel',
      attachedFile: 'Spec file attached', viewFile: 'View File',
      successTitle: 'Offer Sent', successSub: 'You will be notified when accepted or rejected',
      dismissedTitle: 'Request Dismissed', dismissedSub: 'This request will not appear in your list',
      backDash: 'Back to Dashboard',
      alreadyTitle: { accepted: 'Your offer was accepted!', rejected: 'Offer rejected', pending: 'Your offer is under review' },
      closed: 'This request is closed', closedSub: 'No new offers accepted',
    },
    ur: {
      back: '← واپس', details: 'درخواست کی تفصیلات', sector: 'شعبہ', qty: 'مقدار',
      location: 'مقام', contractor: 'ٹھیکیدار', spec: 'تفصیلات', notes: 'نوٹس',
      delivery: 'ڈیلیوری', vat: 'ٹیکس رسید', required: 'ضروری', notRequired: 'غیر ضروری',
      submitOffer: 'قیمت پیش کریں', totalPrice: 'کل قیمت (ریال)', unitPrice: 'فی یونٹ قیمت (ریال)',
      deliveryDays: 'ڈیلیوری وقت (دن)', attributes: 'پروڈکٹ کی خصوصیات',
      attrHint: 'خصوصیات شامل کریں: برانڈ، ملک، وارنٹی...',
      attrKey: 'خصوصیت', attrValue: 'قیمت', addAttr: '+ خصوصیت شامل کریں',
      offerNotes: 'اضافی نوٹس', send: 'پیشکش بھیجیں →', sending: 'بھیجا جا رہا ہے...',
      dismiss: 'درخواست نظر انداز کریں', dismissTitle: 'یہ درخواست نظر انداز کریں؟',
      dismissSub: 'یہ درخواست دوبارہ نظر نہیں آئے گی', dismissReason: 'وجہ (اختیاری)',
      confirmDismiss: 'تصدیق کریں', cancel: 'منسوخ',
      attachedFile: 'تفصیلات فائل منسلک', viewFile: 'فائل دیکھیں',
      successTitle: 'پیشکش بھیج دی', successSub: 'قبول یا رد ہونے پر مطلع کیا جائے گا',
      dismissedTitle: 'درخواست نظر انداز', dismissedSub: 'یہ درخواست نظر نہیں آئے گی',
      backDash: 'ڈیش بورڈ پر واپس',
      alreadyTitle: { accepted: 'آپ کی پیشکش قبول!', rejected: 'پیشکش مسترد', pending: 'آپ کی پیشکش زیر جائزہ' },
      closed: 'یہ درخواست بند ہے', closedSub: 'نئی پیشکشیں قبول نہیں',
    },
  }[locale] || {}

  const sectors = { ar: SECTOR_LABELS, en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical' }, ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل' } }[locale] || SECTOR_LABELS

  // استخراج رابط الملف من الـ notes
  const specFileMatch = rfq?.notes?.match(/\[مواصفات مرفقة: ([^\]]+)\]/)
  const specFileUrl = specFileMatch ? specFileMatch[1] : null
  const cleanNotes = rfq?.notes?.replace(/\n?\[مواصفات مرفقة:[^\]]+\]/, '').trim()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>...</div>
      </div>
    </div>
  )

  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]"><div className="text-gray-500">الطلب غير موجود</div></div>

  // Success / Dismissed states
  if (success || dismissed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={dir} style={{ background: '#f4f6f9' }}>
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">{success ? '✅' : '🚫'}</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1B2D5B' }}>
            {success ? T.successTitle : T.dismissedTitle}
          </h2>
          <p className="text-sm text-gray-500 mb-6">{success ? T.successSub : T.dismissedSub}</p>
          <a href="/supplier/dashboard" className="block py-3 rounded-xl font-semibold text-white text-center" style={{ background: '#1B2D5B' }}>
            {T.backDash}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/supplier/dashboard" className="text-xs text-gray-400 hover:text-gray-600">{T.back}</a>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* RFQ Details */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 mb-5">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#1B2D5B' }}>{rfq.product_name}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-400 text-xs">🏗 {T.sector}</span><br/><strong>{sectors[rfq.sector] || rfq.sector}</strong></div>
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-400 text-xs">📦 {T.qty}</span><br/><strong>{rfq.quantity} {rfq.unit}</strong></div>
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-400 text-xs">📍 {T.location}</span><br/><strong>{rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</strong></div>
            {!rfq.hide_identity && rfq.contractor && (
              <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-400 text-xs">🏢 {T.contractor}</span><br/><strong>{rfq.contractor.company_name_ar}</strong></div>
            )}
            {rfq.specification && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-400 text-xs">⚙️ {T.spec}</span><br/><strong>{rfq.specification}</strong></div>}
            {cleanNotes && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-400 text-xs">📝 {T.notes}</span><br/>{cleanNotes}</div>}
          </div>

          {/* ملف المواصفات المرفق */}
          {specFileUrl && (
            <a href={specFileUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 hover:bg-blue-100 transition-all">
              <span className="text-xl">📎</span>
              <span className="text-sm font-semibold text-blue-700 flex-1">{T.attachedFile}</span>
              <span className="text-xs text-blue-600">{T.viewFile} ←</span>
            </a>
          )}
        </div>

        {existingOffer ? (
          <div className={`bg-white rounded-2xl p-6 shadow-sm border text-center ${
            existingOffer.status === 'accepted' ? 'border-emerald-300 bg-emerald-50' :
            existingOffer.status === 'rejected' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
          }`}>
            <div className="text-4xl mb-2">{existingOffer.status === 'accepted' ? '✅' : existingOffer.status === 'rejected' ? '❌' : '⏳'}</div>
            <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>{T.alreadyTitle[existingOffer.status] || T.alreadyTitle.pending}</h3>
            <p className="text-sm text-gray-600">{existingOffer.total_price?.toLocaleString()} ر.س</p>
          </div>
        ) : rfq.status !== 'open' ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2">🔒</div>
            <h3 className="font-bold" style={{ color: '#1B2D5B' }}>{T.closed}</h3>
            <p className="text-sm text-gray-500">{T.closedSub}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1B2D5B' }}>{T.submitOffer}</h3>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.totalPrice} *</label>
                <input type="number" value={totalPrice} onChange={e => handleTotalChange(e.target.value)}
                  className="input-field" placeholder="0.00" required min="0" step="any" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.unitPrice}</label>
                  <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                    className="input-field bg-gray-50" placeholder="تلقائي" min="0" step="any" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.deliveryDays}</label>
                  <input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)}
                    className="input-field" placeholder="3" min="0" />
                </div>
              </div>

              {/* خصائص المنتج */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold mb-1" style={{ color: '#1B2D5B' }}>{T.attributes}</label>
                <p className="text-xs text-gray-400 mb-3">{T.attrHint}</p>
                <div className="space-y-2">
                  {attributes.map((attr, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={attr.key} onChange={e => updateAttribute(i, 'key', e.target.value)}
                        className="input-field text-sm flex-1" placeholder={T.attrKey} />
                      <input value={attr.value} onChange={e => updateAttribute(i, 'value', e.target.value)}
                        className="input-field text-sm flex-1" placeholder={T.attrValue} />
                      {attributes.length > 1 && (
                        <button type="button" onClick={() => removeAttribute(i)}
                          className="px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAttribute}
                  className="mt-2 text-xs font-semibold" style={{ color: '#F5831F' }}>{T.addAttr}</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.offerNotes}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field" rows={3} placeholder="..." />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <button type="submit" disabled={submitting || !totalPrice}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg"
                style={{ background: '#0F6E56' }}>
                {submitting ? T.sending : T.send}
              </button>
              <button type="button" onClick={() => setShowDismiss(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm border-2 border-red-200 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                ✕ {T.dismiss}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Dismiss Modal */}
      {showDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={dir}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="text-4xl text-center mb-3">🚫</div>
            <h3 className="text-lg font-bold text-center mb-1" style={{ color: '#1B2D5B' }}>{T.dismissTitle}</h3>
            <p className="text-sm text-gray-500 text-center mb-4">{T.dismissSub}</p>
            <textarea value={dismissReason} onChange={e => setDismissReason(e.target.value)}
              className="input-field mb-4" rows={2} placeholder={T.dismissReason} />
            <div className="flex gap-3">
              <button onClick={handleDismiss}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm bg-red-500 hover:bg-red-600 transition-all">
                {T.confirmDismiss}
              </button>
              <button onClick={() => setShowDismiss(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                {T.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
