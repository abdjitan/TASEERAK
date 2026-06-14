// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, getProductLabel, getSubCategoryLabel, getUnitLabel } from '@/types'
import { validateUploadFile } from '@/lib/fileSafety'
import { isExpired, formatTimeLeft, formatDateTime, deadlineUrgency, urgencyStyle } from '@/lib/deadline'

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
  // تسعير بند-بند: لكل مادة بطاقة مستقلة (سعر الوحدة + خصائص + ملاحظة + كتالوج خاص)
  const [itemForms, setItemForms] = useState<any[]>([])
  const [openItem, setOpenItem] = useState<number | null>(null) // البطاقة المفتوحة (أكورديون)
  // المواد التي تخصّ هذا المورد فقط (ضمن قطاعاته/تخصصاته) — هي وحدها التي يسعّرها ويراها
  const [myItems, setMyItems] = useState<any[]>([])
  // العروض المنافسة (مجهولة الهوية) — لعرض موقع المورد التنافسي
  const [ranking, setRanking] = useState<any[]>([])
  const [deliveryDays, setDeliveryDays] = useState('')
  const [notes, setNotes] = useState('')
  const [validity, setValidity] = useState('')

  // خصائص المنتج (key-value)
  const [attributes, setAttributes] = useState([{ key: '', value: '' }])

  // ملف مرفق (كتالوج/بيانات منتج)
  const [attachFile, setAttachFile] = useState(null)

  // dismiss modal
  const [showDismiss, setShowDismiss] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

  // رد على طلب تخفيض السعر من المقاول
  const [newPrice, setNewPrice] = useState('')
  const [reducing, setReducing] = useState(false)
  async function submitReduction() {
    if (!newPrice || Number(newPrice) <= 0) return
    setReducing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('submit_price_reduction', { p_offer_id: existingOffer.id, p_new_total: Number(newPrice) })
    setReducing(false)
    if (error) { setError('تعذّر إرسال السعر الجديد — حاول مرة ثانية.'); return }
    window.location.reload()
  }

  // رد على طلب معلومات إضافية من المقاول
  const [infoReply, setInfoReply] = useState('')
  const [infoReplying, setInfoReplying] = useState(false)
  async function submitInfoResponse() {
    if (!infoReply.trim()) return
    setInfoReplying(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('respond_offer_info', { p_offer_id: existingOffer.id, p_answer: infoReply.trim() })
    setInfoReplying(false)
    if (error) { setError('تعذّر إرسال الرد — حاول مرة ثانية.'); return }
    window.location.reload()
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)

      const { data: rfqData } = await supabase
        .from('rfqs').select('*, contractor:profiles_public(company_name_ar, company_name_en)').eq('id', id).single()
      setRfq(rfqData)

      // ✅ المورد يرى/يسعّر فقط المواد ضمن تخصصه — لا تظهر له مواد قطاع لا يخدمه
      if (Array.isArray(rfqData?.items) && rfqData.items.length > 0) {
        const { data: p2 } = await supabase.from('profiles').select('supplier_tier').eq('id', session.user.id).single()
        const { data: secRows } = await supabase.from('profile_sectors').select('sector').eq('profile_id', session.user.id)
        const { data: specRows } = await supabase.from('profile_specialties').select('specialty').eq('profile_id', session.user.id)
        const mySectors = (secRows || []).map(r => r.sector)
        const mySpecialties = (specRows || []).map(r => r.specialty)
        const myTier = p2?.supplier_tier || 'local'
        const filtered = rfqData.items.filter((it: any) => {
          if (mySectors.length > 0 && !mySectors.includes(it.sector)) return false
          if (mySpecialties.length > 0 && it.sub_category && !mySpecialties.includes(it.sub_category)) return false
          if (Array.isArray(it.supplier_tiers) && it.supplier_tiers.length > 0 && !it.supplier_tiers.includes(myTier)) return false
          return true
        })
        setMyItems(filtered)
        setItemForms(filtered.map(() => ({ unit_price: '', line_total: '', saved: false, specs: '', file: null, priceDetails: false })))
        setOpenItem(null) // تبقى كل المواد مطويّة — المورد يضغط المادة التي يريد تسعيرها
      }

      // auto-calc unit price from quantity
      const { data: offerData } = await supabase
        .from('offers').select('*').eq('rfq_id', id).eq('supplier_id', session.user.id).single()
      if (offerData) setExistingOffer(offerData)

      // الموقع التنافسي: أسعار العروض الحالية (مجهولة الهوية)
      const { data: rk } = await supabase.rpc('get_rfq_offer_ranking', { p_rfq_id: id })
      setRanking(rk || [])

      setLoading(false)
    }
    load()
  }, [id])

  // نبضة كل دقيقة لتحديث العدّاد التنازلي لمهلة التسعير
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])
  const expired = isExpired(rfq?.expires_at)

  // حساب سعر الوحدة تلقائياً
  function handleTotalChange(val) {
    setTotalPrice(val)
    if (rfq?.quantity && val) {
      setUnitPrice((parseFloat(val) / rfq.quantity).toFixed(2))
    }
  }

  // تسعير بند-بند: لكل مادة سعر وحدة + خصائص + ملاحظة + كتالوج خاص
  // المورد يسعّر فقط myItems (مواد تخصصه) — لا كل مواد الطلب
  const rfqIsMulti = Array.isArray(rfq?.items) && rfq.items.length > 0
  const isMultiItem = rfqIsMulti
  // الإجمالي = مجموع سعر كل مادة (line_total) — المورد حر يدخله مباشرة أو يحسبه من سعر الوحدة
  function recomputeGoods(forms) {
    const sum = (myItems || []).reduce((s, it, idx) => s + (parseFloat(forms[idx]?.line_total) || 0), 0)
    setTotalPrice(sum ? String(+sum.toFixed(2)) : '')
  }
  // الوحدة التي يسعّر بها المورد تطابق الوحدة المطلوبة؟ (إن لم يحدّد وحدة خاصة)
  function sameUnit(f, i) { return !f?.priceUnit || f.priceUnit === (myItems[i]?.unit || '') }
  // أي تعديل على السعر يلغي حالة "محفوظ" حتى يحفظ المورد من جديد.
  // الربط التلقائي (سعر الوحدة × الكمية = الإجمالي) يعمل فقط عند التسعير بالوحدة المطلوبة؛
  // لو اختار المورد وحدة خاصة، يبقى الإجمالي وسعر الوحدة مستقلّين.
  function setItemUnit(i, val) {
    setItemForms(prev => {
      const next = prev.map((f, idx) => {
        if (idx !== i) return f
        const q = myItems[i]?.quantity || 0
        const lt = (sameUnit(f, i) && val !== '') ? (q > 0 ? String(+((parseFloat(val) || 0) * q).toFixed(2)) : f.line_total) : f.line_total
        return { ...f, unit_price: val, line_total: lt, saved: false }
      })
      recomputeGoods(next)
      return next
    })
  }
  function setItemPriceUnit(i, val) {
    setItemForms(prev => prev.map((f, idx) => idx === i ? { ...f, priceUnit: val, saved: false } : f))
  }
  function setItemTotal(i, val) {
    setItemForms(prev => {
      const next = prev.map((f, idx) => {
        if (idx !== i) return f
        const q = myItems[i]?.quantity || 0
        const up = (sameUnit(f, i) && val !== '') ? (q > 0 ? String(+((parseFloat(val) || 0) / q).toFixed(4)) : f.unit_price) : f.unit_price
        return { ...f, line_total: val, unit_price: up, saved: false }
      })
      recomputeGoods(next)
      return next
    })
  }
  function setItemField(i, field, val) {
    setItemForms(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  }
  // حفظ المادة: لازم سعر، ثم يُقفل البطاقة وينتقل للمادة التالية غير المحفوظة
  function saveItem(i) {
    const f = itemForms[i] || {}
    if (!(parseFloat(f.line_total) > 0)) { setError(`أدخل سعر «${myItems[i]?.product_name}» قبل الحفظ`); return }
    setError('')
    setItemForms(prev => prev.map((x, idx) => idx === i ? { ...x, saved: true } : x))
    const nextIdx = myItems.findIndex((_, idx) => idx !== i && !(itemForms[idx]?.saved) && idx > i)
    setOpenItem(nextIdx >= 0 ? nextIdx : null)
  }
  async function setItemFile(i, f) {
    if (!f) { setItemForms(prev => prev.map((x, idx) => idx === i ? { ...x, file: null } : x)); return }
    const v = await validateUploadFile(f)
    if (!v.ok) { setError(v.error); return }
    setError('')
    setItemForms(prev => prev.map((x, idx) => idx === i ? { ...x, file: f } : x))
  }
  // لإتاحة الإرسال: كل مادة لها سعر ومحفوظة
  const allItemsPriced = isMultiItem ? (myItems.length > 0 && myItems.every((_, i) => itemForms[i]?.saved && parseFloat(itemForms[i]?.line_total) > 0)) : true

  function addAttribute() {
    setAttributes(prev => [...prev, { key: '', value: '' }])
  }
  function updateAttribute(i, field, val) {
    setAttributes(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  }
  function removeAttribute(i) {
    setAttributes(prev => prev.filter((_, idx) => idx !== i))
  }

  // إضافات الفاتورة (توصيل/تركيب/رسوم) — label + amount
  const [extras, setExtras] = useState([{ label: '', amount: '' }])
  const [vatIncluded, setVatIncluded] = useState(false) // هل السعر المُدخل يشمل ضريبة القيمة المضافة 15%؟
  function addExtra() { setExtras(prev => [...prev, { label: '', amount: '' }]) }
  function updateExtra(i, field, val) { setExtras(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e)) }
  function removeExtra(i) { setExtras(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return
    if (isExpired(rfq?.expires_at)) {
      setError('انتهت مهلة التسعير لهذا الطلب — لم يعد بالإمكان إرسال عرض.')
      return
    }
    if (isMultiItem && !allItemsPriced) {
      setError('فيه مواد لسا ما حفظتها — افتح كل مادة، أدخل سعرها، واضغط «حفظ».')
      return
    }
    setSubmitting(true)
    setError('')

    const validAttrs = attributes.filter(a => a.key && a.value)
    const attrObj = validAttrs.reduce((acc, a) => { acc[a.key] = a.value; return acc }, {})

    const supabase = createClient()

    // رفع الملف المرفق إن وجد
    let attachUrl = null, attachName = null
    if (attachFile) {
      const safe = await validateUploadFile(attachFile) // fast client pre-check (UX only)
      if (!safe.ok) { setError(safe.error); setSubmitting(false); return }
      // Authoritative server-side validation + upload (the magic-byte check here
      // can't be bypassed from the browser).
      const fd = new FormData(); fd.append('file', attachFile)
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setError(j?.message || 'تعذّر رفع الملف المرفق — حاول مجدداً، أو أزل المرفق وأرسل العرض بدونه.')
        setSubmitting(false)
        return
      }
      attachUrl = j.url
      attachName = j.name
    }

    // إضافات الفاتورة → total النهائي = سعر البضاعة + الإضافات
    const validExtras = extras
      .filter(e => e.label && e.amount)
      .map(e => ({ label: e.label, amount: parseFloat(e.amount) || 0 }))
    const goods = parseFloat(totalPrice) || 0
    const finalTotal = goods + validExtras.reduce((s, e) => s + e.amount, 0)

    // تسعير بند-بند: لكل مادة سعرها + خصائصها + كتالوجها الخاص
    let itemPricesPayload = null
    if (isMultiItem) {
      itemPricesPayload = []
      for (let i = 0; i < myItems.length; i++) {
        const it = myItems[i]
        const form = itemForms[i] || {}
        // رفع كتالوج هذه المادة (إن وُجد) — فحص أمني على الخادم
        let upUrl = null, upName = null
        if (form.file) {
          const safe = await validateUploadFile(form.file)
          if (!safe.ok) { setError(`كتالوج «${it.product_name}»: ${safe.error}`); setSubmitting(false); return }
          const ifd = new FormData(); ifd.append('file', form.file)
          const ires = await fetch('/api/upload-attachment', { method: 'POST', body: ifd })
          const ij = await ires.json().catch(() => ({}))
          if (!ires.ok || !ij.ok) {
            setError(`تعذّر رفع كتالوج «${it.product_name}» — أزله أو حاول مجدداً.`)
            setSubmitting(false); return
          }
          upUrl = ij.url; upName = ij.name
        }
        const up = parseFloat(form.unit_price) || 0
        const lineTotal = parseFloat(form.line_total) || (up * (it.quantity || 0))
        itemPricesPayload.push({
          product_name: it.product_name, sub_category: it.sub_category || null, sector: it.sector,
          unit: (form.priceUnit && form.priceUnit.trim()) || it.unit, quantity: it.quantity,
          unit_price: up || null, total: +lineTotal.toFixed(2),
          specification: (form.specs || '').trim() || null,
          attachment_url: upUrl, attachment_name: upName,
        })
      }
    }

    const { error: insertError } = await supabase.from('offers').insert({
      rfq_id: id,
      supplier_id: user.id,
      total_price: finalTotal,
      vat_included: vatIncluded,
      item_prices: itemPricesPayload,
      unit_price: isMultiItem ? null : (unitPrice ? parseFloat(unitPrice) : null),
      delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
      notes: notes || null,
      attributes: validAttrs.length > 0 ? attrObj : null,
      extra_charges: validExtras.length > 0 ? validExtras : null,
      attachment_url: attachUrl,
      attachment_name: attachName,
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
      attachTitle: 'إرفاق ملف (كتالوج / بيانات منتج)', attachHint: 'PDF، صورة، Excel — يصل للمقاول مع عرضك',
      attachBtn: 'اضغط لرفع كتالوج أو ملف المنتج', removeAttach: 'إزالة',
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
      attachTitle: 'Attach File (catalog / product data)', attachHint: 'PDF, image, Excel — sent to contractor with your offer',
      attachBtn: 'Click to upload catalog or product file', removeAttach: 'Remove',
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
      attachTitle: 'فائل منسلک کریں (کیٹلاگ)', attachHint: 'PDF، تصویر، Excel',
      attachBtn: 'کیٹلاگ یا فائل اپلوڈ کریں', removeAttach: 'ہٹائیں',
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

  if (loading) return <PageLoader />

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
    <AppShell title={locale === 'en' ? 'Submit Offer' : locale === 'ur' ? 'پیشکش' : 'تقديم عرض'} nav={getNav('supplier', locale, '/supplier/dashboard')} dir={dir}>
      {(() => { const showPanel = rfq.status === 'open' && !expired; return (
      <div className={`max-w-6xl mx-auto grid gap-5 items-start ${showPanel ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        <div className={`min-w-0 ${showPanel ? 'lg:col-span-2' : ''}`}>
        {/* RFQ Details */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 mb-5">
          <div className="flex items-start justify-between gap-2">
            {/* عنوان عام — لا نُظهر للمورد الاسم الذي اختاره المقاول للطلب */}
            <h2 className="text-lg font-bold" style={{ color: '#1B2D5B' }}>
              {rfqIsMulti ? (locale === 'en' ? 'Price request' : locale === 'ur' ? 'قیمت کی درخواست' : 'طلب تسعير مواد') : rfq.product_name}
            </h2>
            <button type="button" onClick={async () => {
              const supabase = createClient()
              const { data, error } = await supabase.rpc('get_or_create_conversation', { p_rfq_id: id, p_supplier_id: user?.id })
              if (error || !data) { setError('تعذّر فتح المحادثة'); return }
              window.location.href = `/messages?c=${data}`
            }} className="text-xs px-3 py-1.5 rounded-xl font-semibold text-white shrink-0" style={{ background: '#1B2D5B' }}>💬 {locale === 'en' ? 'Message contractor' : 'راسل المقاول'}</button>
          </div>

          {rfqIsMulti && myItems.length > 0 && (
            <div className="my-4">
              <h3 className="font-bold text-sm mb-2 text-[#1B2D5B]">🧾 المواد ضمن تخصصك ({myItems.length})</h3>
              <p className="text-[11px] text-gray-400 mb-2">تظهر لك فقط المواد التي تقدر توردها — سعّرها وأرسل عرضك.</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="text-[13px] text-gray-500 bg-[#f4f6f9] border-b border-gray-100">
                    <th className="text-start py-2.5 px-3 font-bold">#</th>
                    <th className="text-start py-2.5 px-3 font-bold">المادة</th>
                    <th className="text-start py-2.5 px-3 font-bold">الكمية</th>
                    <th className="text-start py-2.5 px-3 font-bold">المواصفات المطلوبة</th>
                  </tr></thead>
                  <tbody>
                    {myItems.map((it: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 align-top">
                        <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[15px] text-[#1B2D5B]">{getProductLabel(it.product_name, locale)}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{sectors[it.sector] || it.sector}</span>
                            {it.in_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">⚡ توفّر فوري</span>}
                            {it.max_days && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">⏱ {it.max_days}ي</span>}
                            {it.spec_file_url && <a href={it.spec_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 hover:underline">📎 ملف</a>}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-[15px] text-[#d96f15] whitespace-nowrap">{it.quantity} {getUnitLabel(it.unit, locale)}</td>
                        <td className="py-3 px-3 text-sm text-gray-700 leading-relaxed">{it.specification || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm mt-4">
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold">🏗 {T.sector}</span><br/><strong>{rfqIsMulti ? [...new Set(myItems.map((it: any) => it.sector))].map((s: string) => sectors[s] || s).join(' + ') : (sectors[rfq.sector] || rfq.sector)}</strong></div>
            {(!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold">📦 {T.qty}</span><br/><strong>{rfq.quantity} {rfq.unit}</strong></div>}
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold">📍 {T.location}</span><br/><strong>{rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</strong></div>
            <div className={`rounded-lg p-3 col-span-2 ${rfq.delivery_required ? 'bg-amber-50 border border-amber-200' : 'bg-[#f4f6f9]'}`}>
              <span className="text-gray-500 text-[12px] font-semibold">🚚 {T.delivery}</span><br/>
              {rfq.delivery_required ? (
                <div className="flex items-center justify-between gap-2 flex-wrap mt-0.5">
                  <strong className="text-amber-800">{T.required}{rfq.delivery_location ? ` — ${rfq.delivery_location}` : ''}</strong>
                  {(rfq.delivery_geo || rfq.delivery_location) && (
                    <a href={rfq.delivery_geo ? `https://www.google.com/maps?q=${rfq.delivery_geo}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rfq.delivery_location)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold text-white rounded-lg px-3 py-1.5 hover:opacity-90 whitespace-nowrap shrink-0" style={{ background: '#1B2D5B' }}>
                      📍 {locale === 'en' ? 'Open in Maps' : 'افتح في الخرائط'}
                    </a>
                  )}
                </div>
              ) : <strong className="text-gray-500">{T.notRequired}</strong>}
            </div>
            {!rfq.hide_identity && rfq.contractor && (
              <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold">🏢 {T.contractor}</span><br/><strong>{rfq.contractor.company_name_ar}</strong></div>
            )}
            {rfq.specification && (!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-500 text-[12px] font-semibold">⚙️ {T.spec}</span><br/><strong>{rfq.specification}</strong></div>}
            {cleanNotes && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-500 text-[12px] font-semibold">📝 {T.notes}</span><br/>{cleanNotes}</div>}
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold">🗓 {locale === 'en' ? 'Posted' : 'تاريخ الطلب'}</span><br/><strong className="text-sm">{formatDateTime(rfq.created_at)}</strong></div>
            {rfq.expires_at && (
              <div className="rounded-lg p-3" style={{ background: urgencyStyle(deadlineUrgency(rfq.expires_at)).bg, border: `1px solid ${urgencyStyle(deadlineUrgency(rfq.expires_at)).border}` }}>
                <span className="text-gray-500 text-[12px] font-semibold">⏰ {locale === 'en' ? 'Pricing deadline' : 'مهلة التسعير'}</span><br/>
                <strong className="text-sm" style={{ color: urgencyStyle(deadlineUrgency(rfq.expires_at)).fg }}>{formatDateTime(rfq.expires_at)}</strong>
                <span className="text-xs block font-bold" style={{ color: urgencyStyle(deadlineUrgency(rfq.expires_at)).fg }}>{expired ? '' : `(${formatTimeLeft(rfq.expires_at, locale)})`}</span>
              </div>
            )}
          </div>

          {/* ملف المواصفات المرفق */}
          {specFileUrl && (
            <a href={specFileUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 bg-[#F5831F]/5 border border-blue-200 rounded-xl p-3 hover:bg-blue-100 transition-all">
              <span className="text-xl">📎</span>
              <span className="text-sm font-semibold text-[#d96f15] flex-1">{T.attachedFile}</span>
              <span className="text-xs text-[#d96f15]">{T.viewFile} ←</span>
            </a>
          )}
        </div>

        {existingOffer ? (
          <div className={`bg-white rounded-2xl p-6 shadow-sm border text-center ${
            existingOffer.status === 'accepted' ? 'border-emerald-300 bg-emerald-50' :
            existingOffer.status === 'rejected' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
          }`}>
            <div className="text-4xl mb-2">{existingOffer.status === 'accepted' ? '✅' : (existingOffer.status === 'rejected' && rfq.status === 'closed') ? '🔒' : existingOffer.status === 'rejected' ? '❌' : '⏳'}</div>
            <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>
              {existingOffer.status === 'rejected' && rfq.status === 'closed'
                ? (locale === 'en' ? 'Pricing closed — another offer was accepted' : locale === 'ur' ? 'پرائسنگ بند — دوسری پیشکش قبول ہوگئی' : 'انتهى التسعير — تم اعتماد عرض آخر')
                : (T.alreadyTitle[existingOffer.status] || T.alreadyTitle.pending)}
            </h3>
            <p className="text-sm text-gray-600">{existingOffer.total_price?.toLocaleString('en-US')} ر.س{existingOffer.status === 'rejected' && rfq.status === 'closed' ? (locale === 'en' ? ' — thanks for participating' : ' — شكراً لمشاركتك') : ''}</p>

            {existingOffer.status === 'pending' && existingOffer.reduction_deadline && new Date(existingOffer.reduction_deadline) > new Date() && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 text-right">
                <div className="font-bold text-orange-700 mb-1">📉 المقاول يطلب تخفيض السعر</div>
                {existingOffer.reduction_note && <div className="text-xs text-gray-600 mb-1">«{existingOffer.reduction_note}»</div>}
                <div className="text-[11px] text-gray-500 mb-3">المهلة للرد: {new Date(existingOffer.reduction_deadline).toLocaleString('ar-SA')}</div>
                <div className="flex gap-2">
                  <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="input-field flex-1" placeholder={`أقل من ${existingOffer.total_price?.toLocaleString('en-US')} ر.س`} min="0" step="any" />
                  <button type="button" onClick={submitReduction} disabled={reducing} className="px-4 rounded-xl font-semibold text-white text-sm disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>{reducing ? '...' : 'إرسال السعر الجديد'}</button>
                </div>
              </div>
            )}

            {existingOffer.info_request && (
              <div className="mt-4 bg-[#F5831F]/5 border border-blue-200 rounded-xl p-4 text-right">
                <div className="font-bold text-[#d96f15] mb-1">❓ المقاول يطلب معلومات إضافية</div>
                <div className="text-sm text-gray-700 bg-white rounded-lg p-2.5 mb-2">{existingOffer.info_request}</div>
                {existingOffer.info_response ? (
                  <div className="text-sm bg-emerald-50 rounded-lg p-2.5"><span className="text-emerald-600 text-[11px]">ردّك:</span><div>{existingOffer.info_response}</div></div>
                ) : existingOffer.status === 'pending' ? (
                  <div>
                    <textarea value={infoReply} onChange={e => setInfoReply(e.target.value)} rows={2} className="input-field mb-2" placeholder="اكتب ردّك للمقاول عن المنتج..." />
                    <button type="button" onClick={submitInfoResponse} disabled={infoReplying} className="px-4 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#1B2D5B' }}>{infoReplying ? '...' : 'إرسال الرد'}</button>
                  </div>
                ) : null}
              </div>
            )}
            {existingOffer.status === 'accepted' && (
              <a href={`/contractor/orders/${existingOffer.id}`}
                className="inline-block mt-4 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:shadow"
                style={{ background: '#0F6E56' }}>
                📄 أمر الشراء وحماية الصفقة ←
              </a>
            )}
          </div>
        ) : (rfq.status !== 'open' || expired) ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2">{expired ? '⏰' : '🔒'}</div>
            <h3 className="font-bold" style={{ color: '#1B2D5B' }}>{expired ? (locale === 'en' ? 'Pricing window closed' : 'انتهت مهلة التسعير') : T.closed}</h3>
            <p className="text-sm text-gray-500">{expired ? (locale === 'en' ? 'The deadline passed — offers are no longer accepted.' : 'انتهى الوقت المحدد لاستقبال العروض على هذا الطلب.') : T.closedSub}</p>
            {rfq.expires_at && <p className="text-xs text-gray-400 mt-2">📅 {formatDateTime(rfq.expires_at)}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>{T.submitOffer}</h3>

            {/* عدّاد مهلة التسعير */}
            {rfq.expires_at && (() => {
              const u = deadlineUrgency(rfq.expires_at)
              const st = urgencyStyle(u)
              return (
                <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 mb-4 text-sm" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                  <span className="font-semibold" style={{ color: st.fg }}>
                    {u === 'critical' ? '🔴' : u === 'soon' ? '🟠' : '⏰'} {locale === 'en' ? 'Time left to price' : 'الوقت المتبقّي للتسعير'}
                  </span>
                  <span className="font-extrabold" style={{ color: st.fg }}>{formatTimeLeft(rfq.expires_at, locale)}</span>
                </div>
              )
            })()}

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}

            <div className="space-y-4">
              {isMultiItem && myItems.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">🚫</div>
                  <p className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'No materials match your specialties' : 'لا توجد مواد ضمن تخصصك في هذا الطلب'}</p>
                  <p className="text-xs text-gray-400 mt-1">{locale === 'en' ? 'This request has no items in your sectors.' : 'مواد هذا الطلب خارج قطاعاتك — لا يلزمك تسعيرها.'}</p>
                </div>
              ) : isMultiItem ? (
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: '#1B2D5B' }}>
                    {locale === 'en' ? 'Price each material' : locale === 'ur' ? 'ہر مواد کی قیمت' : 'سعّر كل مادة على حدة'} *
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    {locale === 'en' ? 'Tap a material to enter its unit price, specs and its own catalog.' : 'اضغط على كل مادة لإدخال سعرها وخصائصها وكتالوجها الخاص.'}
                  </p>
                  <div className="space-y-2">
                    {myItems.map((it, i) => {
                      const form = itemForms[i] || {}
                      const line = parseFloat(form.line_total) || 0
                      const isOpen = openItem === i
                      const done = !!form.saved && line > 0
                      return (
                        <div key={i} className={`border rounded-xl overflow-hidden transition-all ${isOpen ? 'border-[#F5831F]/60 shadow-sm' : 'border-gray-200'}`}>
                          {/* رأس البطاقة — اضغط للفتح/الإغلاق */}
                          <button type="button" onClick={() => setOpenItem(isOpen ? null : i)}
                            className={`w-full flex items-center justify-between gap-2 p-3.5 text-right transition-colors ${isOpen ? 'bg-[#F5831F]/5' : 'hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${done ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {done ? '✓' : i + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{getProductLabel(it.product_name, locale)}</div>
                                <div className="text-[11px] text-gray-400">
                                  {it.sub_category ? getSubCategoryLabel(it.sector, it.sub_category, locale) + ' · ' : ''}{(it.quantity || 0).toLocaleString('en-US')} {getUnitLabel(it.unit, locale)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {line > 0 && (
                                <span className="text-sm font-extrabold whitespace-nowrap" style={{ color: done ? '#0F6E56' : '#d96f15' }}>
                                  {(+line.toFixed(2)).toLocaleString('en-US')} {locale === 'en' ? 'SAR' : 'ر.س'}{!done && <span className="text-[10px] font-normal"> · {locale === 'en' ? 'unsaved' : 'غير محفوظ'}</span>}
                                </span>
                              )}
                              {!isOpen && line === 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F5831F]/10 text-[#d96f15] whitespace-nowrap">{locale === 'en' ? '+ Price' : '+ سعّر'}</span>}
                              <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                            </div>
                          </button>

                          {/* تفاصيل التسعير — تنزل عند الفتح */}
                          {isOpen && (
                            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100">
                              {/* مواصفات المقاول المطلوبة (للتذكير) */}
                              {it.specification && (
                                <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2">
                                  <span className="font-bold">مواصفات المقاول: </span>{it.specification}
                                </div>
                              )}

                              {/* السعر الإجمالي للمادة هو الأساس — وتفاصيل سعر الوحدة اختيارية */}
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                  💰 {locale === 'en' ? `Total price for this material (for ${(it.quantity || 0).toLocaleString('en-US')} ${getUnitLabel(it.unit, locale)})` : `السعر الإجمالي للمادة (لـ ${(it.quantity || 0).toLocaleString('en-US')} ${it.unit})`} *
                                </label>
                                <input type="number" value={form.line_total || ''} onChange={e => setItemTotal(i, e.target.value)}
                                  className="input-field text-sm font-bold" placeholder={locale === 'en' ? 'e.g. 5200' : 'مثال: 5200'} min="0" step="any" />
                                <button type="button" onClick={() => setItemField(i, 'priceDetails', !form.priceDetails)}
                                  className="mt-2 text-xs font-semibold" style={{ color: '#F5831F' }}>
                                  {form.priceDetails
                                    ? (locale === 'en' ? '− Hide price details' : '− إخفاء تفاصيل السعر')
                                    : (locale === 'en' ? '+ Add price details (unit price)' : '+ إضافة تفاصيل السعر (سعر الوحدة)')}
                                </button>
                                {form.priceDetails && (
                                  <div className="mt-2">
                                    <div className="grid grid-cols-5 gap-2">
                                      {/* وحدة المورد — يقدر يغيّرها لو يبي يسعّر بوحدة خاصة */}
                                      <div className="col-span-2">
                                        <label className="block text-[11px] font-bold text-gray-400 mb-1">{locale === 'en' ? 'Unit' : 'الوحدة'}</label>
                                        <input type="text" value={form.priceUnit ?? it.unit} onChange={e => setItemPriceUnit(i, e.target.value)}
                                          className="input-field text-sm" placeholder={it.unit} list={`units-${i}`} />
                                        <datalist id={`units-${i}`}>
                                          {[it.unit, 'طن', 'سيخ', 'م³', 'م²', 'متر طولي', 'كيس', 'قطعة', 'لتر', 'لفة', 'صندوق'].filter((u, k, a) => u && a.indexOf(u) === k).map(u => <option key={u} value={u} />)}
                                        </datalist>
                                      </div>
                                      {/* سعر الوحدة */}
                                      <div className="col-span-3">
                                        <label className="block text-[11px] font-bold text-gray-400 mb-1">{locale === 'en' ? 'Unit price' : 'سعر الوحدة'}</label>
                                        <input type="number" value={form.unit_price || ''} onChange={e => setItemUnit(i, e.target.value)}
                                          className="input-field text-sm" placeholder={(locale === 'en' ? 'Price / ' : 'السعر / ') + (form.priceUnit || it.unit)} min="0" step="any" />
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1.5">
                                      {sameUnit(form, i)
                                        ? (locale === 'en' ? `Total auto-calculates (unit price × ${(it.quantity || 0).toLocaleString('en-US')} ${getUnitLabel(it.unit, locale)}).` : `الإجمالي يُحسب تلقائياً (سعر الوحدة × ${(it.quantity || 0).toLocaleString('en-US')} ${it.unit}).`)
                                        : (locale === 'en' ? 'Custom unit — enter the material total above manually.' : 'وحدة خاصة — أدخل إجمالي المادة بالأعلى يدوياً.')}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* مواصفات المادة (نص حر) */}
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                  📝 {locale === 'en' ? 'Material specifications' : 'مواصفات المادة'}
                                </label>
                                <textarea value={form.specs || ''} onChange={e => setItemField(i, 'specs', e.target.value)}
                                  rows={2} className="input-field text-sm" placeholder={locale === 'en' ? 'Type, origin, brand, grade…' : 'النوع، المنشأ، العلامة التجارية، الدرجة…'} />
                              </div>

                              {/* رفع ملف المواصفات */}
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                  📎 {locale === 'en' ? 'Upload spec / datasheet file' : 'رفع ملف المواصفات'}
                                </label>
                                {form.file ? (
                                  <div className="flex items-center gap-3 bg-[#1B2D5B]/5 rounded-xl p-2.5 border border-[#1B2D5B]/20">
                                    <span className="text-xl">📄</span>
                                    <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#1B2D5B' }}>{form.file.name}</span>
                                    <button type="button" onClick={() => setItemFile(i, null)} className="text-xs text-red-500 hover:underline">{locale === 'en' ? 'Remove' : 'إزالة'}</button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-[#F5831F]/50 transition-all">
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                                      onChange={e => setItemFile(i, e.target.files?.[0] ?? null)} />
                                    <span className="text-xl">📤</span>
                                    <span className="text-xs text-gray-500">{locale === 'en' ? 'Attach catalog / datasheet' : 'إرفاق كتالوج / بيانات المنتج'}</span>
                                  </label>
                                )}
                              </div>

                              {/* زر حفظ المادة — يقفل البطاقة وينتقل للتالية */}
                              <button type="button" onClick={() => saveItem(i)}
                                className="w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:shadow disabled:opacity-40"
                                disabled={!(parseFloat(form.line_total) > 0)}
                                style={{ background: '#0F6E56' }}>
                                ✓ {locale === 'en' ? 'Save material' : 'حفظ المادة'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.deliveryDays}</label>
                    <input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)}
                      className="input-field" placeholder="3" min="0" />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{locale === 'en' ? 'Goods Price (SAR)' : locale === 'ur' ? 'سامان کی قیمت (ریال)' : 'سعر البضاعة (ر.س)'} *</label>
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
                </>
              )}

              {/* إضافات الفاتورة (توصيل/تركيب/رسوم) */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold mb-1" style={{ color: '#1B2D5B' }}>
                  🧾 {locale === 'en' ? 'Invoice extras (delivery / installation / fees)' : locale === 'ur' ? 'انوائس اضافی (ڈیلیوری/تنصیب/فیس)' : 'إضافات الفاتورة (توصيل / تركيب / رسوم)'}
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  {rfq.delivery_required
                    ? (locale === 'en' ? 'Contractor requested delivery — add the shipping cost here.' : locale === 'ur' ? 'ٹھیکیدار نے ڈیلیوری طلب کی — شپنگ لاگت یہاں شامل کریں۔' : 'المقاول طلب التوصيل — أضف تكلفة الشحن هنا.')
                    : (locale === 'en' ? 'Optional charges added on top of the goods price.' : locale === 'ur' ? 'سامان کی قیمت کے علاوہ اختیاری چارجز۔' : 'رسوم اختيارية تُضاف فوق سعر البضاعة.')}
                </p>
                <div className="space-y-2">
                  {extras.map((ex, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={ex.label} onChange={e => updateExtra(i, 'label', e.target.value)}
                        className="input-field text-sm flex-1" placeholder={locale === 'en' ? 'Item (e.g. Delivery)' : locale === 'ur' ? 'آئٹم (مثلاً ڈیلیوری)' : 'البند (مثال: توصيل)'} />
                      <input type="number" value={ex.amount} onChange={e => updateExtra(i, 'amount', e.target.value)}
                        className="input-field text-sm w-28" placeholder={locale === 'en' ? 'Amount' : locale === 'ur' ? 'رقم' : 'المبلغ'} min="0" step="any" />
                      {extras.length > 1 && (
                        <button type="button" onClick={() => removeExtra(i)}
                          className="px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addExtra} className="mt-2 text-xs font-semibold" style={{ color: '#F5831F' }}>
                  + {locale === 'en' ? 'Add item' : locale === 'ur' ? 'شامل کریں' : 'إضافة بند'}
                </button>
              </div>

              {/* ضريبة القيمة المضافة 15% — خيار: هل السعر يشملها؟ + تفصيل الإجمالي */}
              {(() => {
                const goods = parseFloat(totalPrice) || 0
                const exSum = extras.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
                const entered = goods + exSum
                const net = vatIncluded ? entered / 1.15 : entered
                const vat = net * 0.15
                const gross = net + vat
                const fmt = (n) => (+n.toFixed(2)).toLocaleString('en-US')
                return (
                  <div className="border-t border-gray-100 pt-4">
                    {/* خيار شمول الضريبة */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-bold" style={{ color: '#1B2D5B' }}>🧾 {locale === 'en' ? 'Price includes 15% VAT?' : 'هل السعر يشمل ضريبة القيمة المضافة (15%)؟'}</div>
                        <div className="text-[11px] text-gray-400">{vatIncluded ? (locale === 'en' ? 'Yes — VAT will be extracted from your price.' : 'نعم — تُستخرج الضريبة من سعرك.') : (locale === 'en' ? 'No — VAT is added on top.' : 'لا — تُضاف الضريبة فوق سعرك.')}</div>
                      </div>
                      <button type="button" onClick={() => setVatIncluded(v => !v)}
                        className="w-12 h-7 rounded-full transition-all flex items-center px-1 shrink-0" style={{ background: vatIncluded ? '#0F6E56' : '#d1d5db', justifyContent: vatIncluded ? 'flex-end' : 'flex-start' }}>
                        <span className="w-5 h-5 bg-white rounded-full shadow" />
                      </button>
                    </div>
                    {/* تفصيل الإجمالي */}
                    {entered > 0 && (
                      <div className="bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-xl p-3 text-sm space-y-1.5">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{locale === 'en' ? 'Net (before VAT)' : 'الصافي (قبل الضريبة)'}</span>
                          <span className="font-semibold">{fmt(net)} {locale === 'en' ? 'SAR' : 'ر.س'}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{locale === 'en' ? 'VAT 15%' : 'ضريبة القيمة المضافة 15%'}</span>
                          <span className="font-semibold">+ {fmt(vat)} {locale === 'en' ? 'SAR' : 'ر.س'}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#0F6E56]/20 pt-1.5">
                          <span className="font-bold" style={{ color: '#0F6E56' }}>{locale === 'en' ? 'Grand Total (incl. VAT)' : 'الإجمالي شامل الضريبة'}</span>
                          <span className="text-lg font-extrabold" style={{ color: '#0F6E56' }}>{fmt(gross)} {locale === 'en' ? 'SAR' : 'ر.س'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* خصائص المنتج — للطلب أحادي المادة فقط (متعدد المواد: الخصائص لكل مادة بداخل بطاقتها) */}
              {!isMultiItem && (
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
              )}

              {/* إرفاق ملف (كتالوج) — للطلب أحادي المادة فقط (متعدد المواد: كتالوج لكل مادة) */}
              {!isMultiItem && (
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold mb-1" style={{ color: '#1B2D5B' }}>📎 {T.attachTitle}</label>
                <p className="text-xs text-gray-400 mb-3">{T.attachHint}</p>
                {attachFile ? (
                  <div className="flex items-center gap-3 bg-[#1B2D5B]/5 rounded-xl p-3 border border-[#1B2D5B]/20">
                    <span className="text-2xl">📄</span>
                    <span className="text-sm font-semibold flex-1 truncate" style={{ color: '#1B2D5B' }}>{attachFile.name}</span>
                    <button type="button" onClick={() => setAttachFile(null)}
                      className="text-xs text-red-500 hover:underline">{T.removeAttach}</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#F5831F]/50 transition-all">
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                      onChange={async e => {
                        const f = e.target.files?.[0] ?? null
                        if (!f) { setAttachFile(null); return }
                        const v = await validateUploadFile(f)
                        if (!v.ok) { setError(v.error); e.currentTarget.value = ''; setAttachFile(null); return }
                        setError(''); setAttachFile(f)
                      }} />
                    <span className="text-2xl">📤</span>
                    <span className="text-sm text-gray-500">{T.attachBtn}</span>
                  </label>
                )}
              </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.offerNotes}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field" rows={3} placeholder="..." />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <button type="submit" disabled={submitting || !totalPrice || (isMultiItem && !allItemsPriced)}
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
        </div>{/* main column */}

        {showPanel && (
          <aside className="lg:col-span-1 lg:sticky lg:top-20">
            {(() => {
              const others = (ranking || []).filter((r: any) => !r.is_mine)
              const myT = parseFloat(totalPrice) || 0
              const rank = myT > 0 ? others.filter((o: any) => Number(o.total_price) < myT).length + 1 : null
              const totalCount = others.length + (myT > 0 ? 1 : 0)
              const avgOthers = others.length ? others.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0) / others.length : 0
              const savePct = (myT > 0 && avgOthers > 0 && myT < avgOthers) ? Math.round((avgOthers - myT) / avgOthers * 100) : 0
              const list = others.map((o: any) => ({ total: Number(o.total_price), mine: false }))
              if (myT > 0) list.push({ total: myT, mine: true })
              list.sort((a: any, b: any) => a.total - b.total)
              const isTop = rank === 1
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-extrabold text-base" style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'Your competitive position' : locale === 'ur' ? 'آپ کی پوزیشن' : 'موقعك التنافسي'}</h3>
                  <p className="text-[11px] text-gray-400 mb-4">{locale === 'en' ? 'Live — updates as you change your price' : 'حيّ — يتحدّث مع تغيير سعرك'}</p>

                  <div className="rounded-2xl p-4 text-center mb-4" style={{ background: isTop ? '#ecfdf5' : '#f4f6f9', border: `1px solid ${isTop ? '#a7f3d0' : '#eceff4'}` }}>
                    <div className="text-[11px] text-gray-400">{locale === 'en' ? 'Projected rank' : 'ترتيبك المتوقع'}</div>
                    <div className="text-4xl font-black leading-tight" style={{ color: isTop ? '#0F6E56' : '#1B2D5B' }}>{rank ? `#${rank}` : '—'}</div>
                    <div className="text-[11px] font-semibold" style={{ color: isTop ? '#0F6E56' : '#8089a0' }}>
                      {rank == null ? (totalCount > 0 ? (locale === 'en' ? `${totalCount} offers so far` : `${totalCount} عروض حتى الآن`) : (locale === 'en' ? 'Be the first to price' : 'كن أول من يسعّر'))
                        : isTop ? (locale === 'en' ? `Cheapest of ${totalCount}` : `الأوفر بين ${totalCount} عروض`)
                        : (locale === 'en' ? `Among ${totalCount} offers` : `من بين ${totalCount} عروض`)}
                    </div>
                  </div>

                  {savePct > 0 && <div className="text-center text-xs font-bold mb-3" style={{ color: '#0F6E56' }}>📉 {locale === 'en' ? `${savePct}% below average offer` : `أوفر بـ ${savePct}% من متوسط العروض`}</div>}

                  {list.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold text-gray-400 mb-2">{locale === 'en' ? 'Current offers (anonymous)' : 'العروض الحالية (مجهولة الهوية)'}</div>
                      <div className="space-y-1.5">
                        {list.slice(0, 6).map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={r.mine ? { background: '#F5831F12', border: '1px solid #F5831F55' } : { background: '#f7f8fa' }}>
                            <span className="flex items-center gap-2">
                              <span className="w-5 h-5 grid place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: r.mine ? '#0F6E56' : '#c3c9d4' }}>{i + 1}</span>
                              <span style={r.mine ? { color: '#d96f15', fontWeight: 700 } : { color: '#8089a0' }}>{r.mine ? (locale === 'en' ? 'Your offer' : 'عرضك') : (locale === 'en' ? 'Anonymous' : 'مورد مجهول')}</span>
                            </span>
                            <span className="font-bold" style={{ color: '#1B2D5B' }}>{r.total.toLocaleString('en-US')} {locale === 'en' ? 'SAR' : 'ر.س'}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mt-4 flex items-start gap-2 text-[11px] text-gray-400 bg-gray-50 rounded-xl p-2.5">
                    <span>🛈</span><span>{locale === 'en' ? 'Smart matching shows the request to the right suppliers for its size.' : 'التصنيف الذكي يضمن وصول الطلب للموردين المناسبين لحجمه.'}</span>
                  </div>
                </div>
              )
            })()}
          </aside>
        )}
      </div>
      ); })()}

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
    </AppShell>
  )
}
