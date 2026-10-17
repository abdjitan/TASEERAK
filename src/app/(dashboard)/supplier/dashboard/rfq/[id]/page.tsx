'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileHref } from '@/lib/fileHref'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import DealProtection from '@/components/shared/DealProtection'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { SECTOR_LABELS, getProductLabel, getSubCategoryLabel, getUnitLabel, detectSubCategory } from '@/types'
import { validateUploadFile } from '@/lib/fileSafety'
import { isExpired, formatTimeLeft, formatDateTime, deadlineUrgency, urgencyStyle } from '@/lib/deadline'
import { tierAllowed, SOURCE_TYPES, AVAILABILITY, sellerKindOf, WARRANTY_OPTIONS } from '@/lib/sellers'
import { rfqRefLine, rfqDesc } from '@/lib/rfqName'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { PAYMENT_TERMS } from '@/lib/paymentTerms'

export default function SupplierRFQPage() {
  const { id } = useParams()
  const router = useRouter()
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const SAR = L('SAR', 'SAR', 'ر.س')
  const [user, setUser] = useState<any>(null)
  const [actingId, setActingId] = useState('') // الشركة لعضو الفريق، وإلا المستخدم نفسه
  const [verified, setVerified] = useState(true) // تفاؤلي؛ يُضبط من الملف. القفل الحقيقي على مستوى القاعدة (RLS)
  const [rfq, setRfq] = useState<any>(null)
  const [existingOffer, setExistingOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState('')
  // تقييم المورّد للمشتري (متبادل)
  const [cRating, setCRating] = useState(0)
  const [cComment, setCComment] = useState('')
  const [cBusy, setCBusy] = useState(false)
  const [cDone, setCDone] = useState(false)
  const [cMsg, setCMsg] = useState('')

  const [totalPrice, setTotalPrice] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  // تسعير بند-بند: لكل مادة بطاقة مستقلة (سعر الوحدة + خصائص + ملاحظة + كتالوج خاص)
  const [itemForms, setItemForms] = useState<any[]>([])
  const [openItem, setOpenItem] = useState<number | null>(null) // البطاقة المفتوحة (أكورديون)
  // «لا أوفّر هذه المادة»: skipped lines are cleared and left out of item_prices (same as the app)
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  // after sending: the next open request this supplier has not priced yet (from the home snapshot)
  const [nextRfq, setNextRfq] = useState<string | null>(null)
  // Help understanding the request: per line, what the material is and which details are missing
  // (/api/explain-items: catalog fields checked for free, AI for the rest, cached for every supplier).
  const [itemNotes, setItemNotes] = useState<Record<number, { what_it_is: string; missing: string[] }>>({})
  const [asking, setAsking] = useState<number | null>(null)
  // المواد التي تخصّ هذا المورد فقط (ضمن قطاعاته/تخصصاته) — هي وحدها التي يسعّرها ويراها
  const [myItems, setMyItems] = useState<any[]>([])
  // (H2) أسعار المنافسين لم تعُد تُعرض للمورّد — يبقى فارغاً واللوحة معطّلة
  const [ranking] = useState<any[]>([])
  const [contractorInfo, setContractorInfo] = useState<any>(null)
  const [deliveryDays, setDeliveryDays] = useState('')
  const [notes, setNotes] = useState('')
  const [priceValidity, setPriceValidity] = useState('3') // مدة صلاحية سعر العرض (بالأيام)
  // من أين السعر؟ (مخزوني / مصنع أو مورد / محل / وسيط) والتوفّر — يظهران للمشتري بوضوح
  const [sourceType, setSourceType] = useState('')
  const [availability, setAvailability] = useState('now')
  const [isIndependent, setIsIndependent] = useState(false)
  const [singleWarranty, setSingleWarranty] = useState('') // الضمان لطلب المادة الواحدة (يُحفظ ضمن الخصائص)
  const [validity, setValidity] = useState('')

  // خصائص المنتج (key-value)
  const [attributes, setAttributes] = useState([{ key: '', value: '' }])

  // ملف مرفق (كتالوج/بيانات منتج)
  const [attachFile, setAttachFile] = useState<any>(null)

  // dismiss modal
  const [showDismiss, setShowDismiss] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

  // رد على طلب تخفيض السعر من المشتري
  const [newPrice, setNewPrice] = useState('')
  const [reducing, setReducing] = useState(false)
  async function submitReduction() {
    if (!newPrice || Number(newPrice) <= 0) return
    setReducing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('submit_price_reduction', { p_offer_id: existingOffer.id, p_new_total: Number(newPrice) })
    setReducing(false)
    if (error) { setError(L('Could not send the new price — please try again.', 'نئی قیمت نہیں بھیجی جا سکی — دوبارہ کوشش کریں۔', 'تعذّر إرسال السعر الجديد — حاول مرة ثانية.')); return }
    window.location.reload()
  }

  // إلغاء/إعادة تسعير العرض خلال نافذة الـ١٥ دقيقة
  const [cancelling, setCancelling] = useState(false)
  async function cancelOffer() {
    if (!existingOffer) return
    if (!confirm(L('Your current offer will be cancelled so you can price it again. Continue?', 'آپ کی موجودہ آفر منسوخ ہو جائے گی تاکہ آپ دوبارہ قیمت دے سکیں۔ جاری رکھیں؟', 'سيتم إلغاء عرضك الحالي لتتمكن من إعادة تسعيره من جديد. متابعة؟'))) return
    setCancelling(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('cancel_my_offer', { p_offer_id: existingOffer.id })
    setCancelling(false)
    if (error) { setError(error.message || L('Could not cancel the offer — please try again.', 'آفر منسوخ نہیں ہو سکی — دوبارہ کوشش کریں۔', 'تعذّر إلغاء العرض — حاول مرة ثانية.')); return }
    window.location.reload()
  }

  // رد على طلب معلومات إضافية من المشتري
  const [infoReply, setInfoReply] = useState('')
  const [infoReplying, setInfoReplying] = useState(false)
  async function submitInfoResponse() {
    if (!infoReply.trim()) return
    setInfoReplying(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('respond_offer_info', { p_offer_id: existingOffer.id, p_answer: infoReply.trim() })
    setInfoReplying(false)
    if (error) { setError(L('Could not send the reply — please try again.', 'جواب نہیں بھیجا جا سکا — دوبارہ کوشش کریں۔', 'تعذّر إرسال الرد — حاول مرة ثانية.')); return }
    window.location.reload()
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      // Speed: the database is far from our users (~1 s a request), so requests go out in two
      // parallel rounds instead of ten in a row.
      // Round 1 — who may quote (CR-verified suppliers OR a WhatsApp-verified phone, same rule as the
      // offers INSERT policy, migration 117), who we act for (a team member prices for the company),
      // the request itself (precise delivery location stripped server-side for non-awarded
      // suppliers, H1; null if this supplier may not see it) and the buyer identity (revealed by the
      // server only after acceptance).
      const [{ data: canQuote }, { data: actRaw }, { data: rfqData }, { data: cInfo }] = await Promise.all([
        supabase.rpc('can_submit_quote'),
        supabase.rpc('acting_uid'),
        supabase.rpc('get_rfq_for_viewer', { p_rfq_id: id }),
        supabase.rpc('get_rfq_contractor', { p_rfq_id: id }),
      ])
      setVerified(canQuote === true)
      const actId: string = (actRaw as any) || session.user.id
      setActingId(actId)
      if (!rfqData) { setRfq(null); setLoading(false); return }
      setRfq(rfqData)
      setContractorInfo(Array.isArray(cInfo) ? cInfo[0] : cInfo)
      fetch('/api/explain-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rfq_id: id }) })
        .then(r => r.json()).then(j => {
          if (!j?.ok) return
          const m: Record<number, { what_it_is: string; missing: string[] }> = {}
          for (const x of j.items || []) m[x.index] = { what_it_is: x.what_it_is || '', missing: x.missing || [] }
          setItemNotes(m)
        }).catch(() => {})

      // Round 2 — everything about this supplier and its offer on this request.
      const [{ data: me }, { data: secRows }, { data: specRows }, { data: myPrices }, { data: offerData }] = await Promise.all([
        supabase.from('profiles').select('provider_type, supplier_tier, vat_number').eq('id', actId).single(),
        supabase.from('profile_sectors').select('sector').eq('profile_id', actId),
        supabase.from('profile_specialties').select('specialty').eq('profile_id', actId),
        supabase.from('live_prices').select('product_name, price, unit, region').eq('supplier_id', actId),
        supabase.from('offers').select('*').eq('rfq_id', id).eq('supplier_id', actId).maybeSingle(),
      ])
      // A company quotes from its own stock by default; an independent seller must say where the
      // price comes from.
      const indep = sellerKindOf(me?.provider_type) === 'independent'
      setIsIndependent(indep)
      // An independent seller without a VAT number is not VAT-registered: no VAT question, the price
      // they type is the final price the buyer pays (persona review: «لا تُضاف 15% فوق سعري»).
      // no VAT number: kept on the offer (vat_status) so platform documents show no VAT amount for it
      if (!(me?.vat_number || '').trim()) setNoVat(true)
      if (!indep) setSourceType('own_stock')

      // ✅ المورد يرى/يسعّر فقط المواد ضمن تخصصه — لا تظهر له مواد قطاع لا يخدمه
      if (Array.isArray(rfqData?.items) && rfqData.items.length > 0) {
        const mySectors = (secRows || []).map((r: any) => r.sector)
        const mySpecialties = (specRows || []).map((r: any) => r.specialty)
        const myTier = me?.supplier_tier || 'shop'
        const filtered = (rfqData.items as any[]).map((it: any, i: number) => ({ ...it, item_index: i })).filter((it: any) => {
          if (mySectors.length > 0 && !mySectors.includes(it.sector)) return false
          if (mySpecialties.length > 0 && it.sub_category && !mySpecialties.includes(it.sub_category)) return false
          if (!tierAllowed(it.supplier_tiers, myTier)) return false
          return true
        })
        setMyItems(filtered)
        // تعبئة تلقائية من أسعار المورّد المحفوظة (صفحة «أسعاري»)
        // key on product_name + unit so a per-ton saved price never fills a per-bar field (B5);
        // skip saved prices tied to a different region (region-agnostic saved prices still apply).
        const rfqRegion = rfqData?.region || null
        const priceMap: Record<string, number> = {}
        for (const pr of (myPrices || [])) {
          if (rfqRegion && pr.region && pr.region !== rfqRegion) continue
          const key = `${pr.product_name}__${pr.unit || ''}`
          if (priceMap[key] == null) priceMap[key] = Number(pr.price)
        }
        setItemForms(filtered.map((it: any) => {
          const sp = priceMap[`${it.product_name}__${it.unit || ''}`]
          if (sp > 0) { const q = Number(it.quantity) || 0; return { unit_price: String(sp), line_total: q > 0 ? String(+(sp * q).toFixed(2)) : '', saved: false, specs: '', file: null, priceDetails: false, delivery_days: '', autofilled: true } }
          return { unit_price: '', line_total: '', saved: false, specs: '', file: null, priceDetails: false, delivery_days: '' }
        }))
        setOpenItem(null)
      }

      if (offerData) {
        setExistingOffer(offerData)
        if (offerData.status === 'accepted') {
          const { data: rev } = await supabase.from('reviews').select('id').eq('reviewer_id', offerData.supplier_id).eq('offer_id', offerData.id).limit(1)
          if (rev && rev.length) setCDone(true)
        }
      }

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

  // نافذة تعديل/إلغاء العرض: ١٥ دقيقة من لحظة إرساله، وما دام «قيد المراجعة»
  const offerEditDeadline = existingOffer?.created_at ? new Date(existingOffer.created_at).getTime() + 15 * 60 * 1000 : 0
  const canEditOffer = existingOffer?.status === 'pending' && offerEditDeadline > Date.now()
  const editMinsLeft = canEditOffer ? Math.max(1, Math.ceil((offerEditDeadline - Date.now()) / 60000)) : 0

  // حساب سعر الوحدة تلقائياً
  function handleTotalChange(val: any) {
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
  function recomputeGoods(forms: any) {
    const sum = (myItems || []).reduce((s, it, idx) => s + (parseFloat(forms[idx]?.line_total) || 0), 0)
    setTotalPrice(sum ? String(+sum.toFixed(2)) : '')
  }
  // الوحدة التي يسعّر بها المورد تطابق الوحدة المطلوبة؟ (إن لم يحدّد وحدة خاصة)
  function sameUnit(f: any, i: any) { return !f?.priceUnit || f.priceUnit === (myItems[i]?.unit || '') }
  // أي تعديل على السعر يلغي حالة "محفوظ" حتى يحفظ المورد من جديد.
  // الربط التلقائي (سعر الوحدة × الكمية = الإجمالي) يعمل فقط عند التسعير بالوحدة المطلوبة؛
  // لو اختار المورد وحدة خاصة، يبقى الإجمالي وسعر الوحدة مستقلّين.
  function setItemUnit(i: any, val: any) {
    setItemForms(prev => {
      const next = prev.map((f: any, idx: any) => {
        if (idx !== i) return f
        const q = myItems[i]?.quantity || 0
        const lt = (sameUnit(f, i) && val !== '') ? (q > 0 ? String(+((parseFloat(val) || 0) * q).toFixed(2)) : f.line_total) : f.line_total
        return { ...f, unit_price: val, line_total: lt, saved: false }
      })
      recomputeGoods(next)
      return next
    })
  }
  function setItemPriceUnit(i: any, val: any) {
    setItemForms(prev => prev.map((f: any, idx: any) => idx === i ? { ...f, priceUnit: val, saved: false } : f))
  }
  function setItemTotal(i: any, val: any) {
    setItemForms(prev => {
      const next = prev.map((f: any, idx: any) => {
        if (idx !== i) return f
        const q = myItems[i]?.quantity || 0
        const up = (sameUnit(f, i) && val !== '') ? (q > 0 ? String(+((parseFloat(val) || 0) / q).toFixed(4)) : f.unit_price) : f.unit_price
        return { ...f, line_total: val, unit_price: up, saved: false }
      })
      recomputeGoods(next)
      return next
    })
  }
  function setItemField(i: any, field: any, val: any) {
    setItemForms(prev => prev.map((f: any, idx: any) => idx === i ? { ...f, [field]: val } : f))
  }
  // «اسأل المشتري»: open the conversation on this request with the question already written.
  async function askBuyer(it: any, missing: string[]) {
    const idx = Number(it.item_index ?? 0)
    setAsking(idx)
    const supabase = createClient()
    const { data, error: e } = await supabase.rpc('get_or_create_conversation', { p_rfq_id: id, p_supplier_id: actingId || user?.id })
    setAsking(null)
    if (e || !data) { setError(L('Could not open the conversation', 'گفتگو نہیں کھل سکی', 'تعذّر فتح المحادثة')); return }
    const msg = `مرحباً، بخصوص «${it.product_name}»: هل يمكنك تحديد ${missing.join('، ')}؟`
    router.push(`/messages?c=${data}&msg=${encodeURIComponent(msg)}`)
  }

  async function setItemFile(i: any, f: any) {
    if (!f) { setItemForms(prev => prev.map((x: any, idx: any) => idx === i ? { ...x, file: null } : x)); return }
    const v = await validateUploadFile(f)
    if (!v.ok) { setError(v.error || ''); return }
    setError('')
    setItemForms(prev => prev.map((x: any, idx: any) => idx === i ? { ...x, file: f } : x))
  }
  // لإتاحة الإرسال: يكفي مادة واحدة مسعّرة ومحفوظة — المورد غير ملزم بتسعير كل المواد
  // A priced line counts even if «حفظ المادة» was not pressed: the price is already entered.
  const allItemsPriced = isMultiItem ? (myItems.length > 0 && myItems.some((_: any, i: any) => parseFloat(itemForms[i]?.line_total) > 0)) : true

  function addAttribute() {
    setAttributes(prev => [...prev, { key: '', value: '' }])
  }
  function updateAttribute(i: any, field: any, val: any) {
    setAttributes(prev => prev.map((a: any, idx: any) => idx === i ? { ...a, [field]: val } : a))
  }
  function removeAttribute(i: any) {
    setAttributes(prev => prev.filter((_: any, idx: any) => idx !== i))
  }

  // إضافات الفاتورة (توصيل/تركيب/رسوم) — label + amount
  const [extras, setExtras] = useState([{ label: '', amount: '' }])
  // delivery requested by the buyer: how the supplier charges it (null = not answered)
  const [delivMode, setDelivMode] = useState<'included' | 'free' | 'amount' | null>(null)
  const [payTerms, setPayTerms] = useState<string | null>(null) // offers.payment_terms (optional)
  const [delivAmount, setDelivAmount] = useState('')
  // هل السعر المُدخل يشمل ضريبة القيمة المضافة 15%؟ — اختيار صريح بلا قيمة افتراضية (null = لم يُحدَّد بعد)،
  // كي لا تُضاف 15% فوق سعر شامل دون أن ينتبه المورّد.
  // owner decision 2026-10-17: every price is typed and shown including VAT (no VAT question)
  const [vatIncluded, setVatIncluded] = useState<boolean | null>(true)
  const [noVat, setNoVat] = useState(false) // seller without a VAT number: the price is final
  const [showMore, setShowMore] = useState(false) // «خيارات أخرى (اختياري)»
  // الإجمالي كما سيراه المشتري (صافٍ + ضريبة + إجمالي) — يُستخدم في التفصيل وفي ملخّص ما قبل الإرسال
  function offerTotals() {
    const goods = parseFloat(totalPrice) || 0
    const exSum = extras.reduce((s: any, e: any) => s + (parseFloat(e.amount) || 0), 0) + (delivMode === 'amount' ? (parseFloat(delivAmount) || 0) : 0)
    const entered = goods + exSum
    const net = vatIncluded ? entered / 1.15 : entered
    const vat = net * 0.15
    return { entered, net, vat, gross: net + vat }
  }
  function addExtra() { setExtras(prev => [...prev, { label: '', amount: '' }]) }
  function updateExtra(i: any, field: any, val: any) { setExtras(prev => prev.map((e: any, idx: any) => idx === i ? { ...e, [field]: val } : e)) }
  function removeExtra(i: any) { setExtras(prev => prev.filter((_: any, idx: any) => idx !== i)) }

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!user) return
    if (isExpired(rfq?.expires_at)) {
      setError(L('The pricing deadline for this request has passed — offers can no longer be sent.', 'اس درخواست کی قیمت دینے کی مہلت ختم ہو گئی — اب آفر نہیں بھیجی جا سکتی۔', 'انتهت مهلة التسعير لهذا الطلب — لم يعد بالإمكان إرسال عرض.'))
      return
    }
    if (isMultiItem && !allItemsPriced) {
      setError(L('Enter a price for at least one material before sending the offer.', 'آفر بھیجنے سے پہلے کم از کم ایک مال کی قیمت درج کریں۔', 'أدخل سعر مادة واحدة على الأقل قبل إرسال العرض.'))
      return
    }
    if (rfq?.delivery_required && (!delivMode || (delivMode === 'amount' && !(parseFloat(delivAmount) > 0)))) {
      setError(L('Say how you charge the delivery the buyer requested.', 'خریدار نے ڈیلیوری مانگی ہے — بتائیں اس کی لاگت کیسے ہوگی۔', 'حدّد تكلفة التوصيل الذي طلبه المشتري.'))
      return
    }
    if (vatIncluded === null) {
      setError(L('Choose whether your price includes 15% VAT.', 'منتخب کریں کہ آیا آپ کی قیمت میں 15% ویٹ شامل ہے۔', 'حدّد هل يشمل سعرك ضريبة القيمة المضافة (15%).'))
      return
    }
    setSubmitting(true)
    setError('')

    const validAttrs = attributes.filter((a: any) => a.key && a.value)
    const attrObj = validAttrs.reduce((acc: any, a: any) => { acc[a.key] = a.value; return acc }, {})
    if (!isMultiItem && singleWarranty.trim()) attrObj['الضمان'] = singleWarranty.trim()

    const supabase = createClient()

    // رفع الملف المرفق إن وجد
    let attachUrl = null, attachName = null
    if (attachFile) {
      const safe = await validateUploadFile(attachFile) // fast client pre-check (UX only)
      if (!safe.ok) { setError(safe.error || ''); setSubmitting(false); return }
      // Authoritative server-side validation + upload (the magic-byte check here
      // can't be bypassed from the browser).
      const fd = new FormData(); fd.append('file', attachFile)
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setError(j?.message || L('Could not upload the attachment — try again, or remove it and send the offer without it.', 'منسلک فائل اپ لوڈ نہیں ہو سکی — دوبارہ کوشش کریں، یا فائل ہٹا کر آفر بغیر اس کے بھیجیں۔', 'تعذّر رفع الملف المرفق — حاول مجدداً، أو أزل المرفق وأرسل العرض بدونه.'))
        setSubmitting(false)
        return
      }
      attachUrl = j.url
      attachName = j.name
    }

    // إضافات الفاتورة → total النهائي = سعر البضاعة + الإضافات
    const delivExtra = delivMode === 'amount' && parseFloat(delivAmount) > 0 ? [{ label: 'توصيل', amount: parseFloat(delivAmount) }] : []
    const validExtras0 = extras
      .filter((e: any) => e.label && e.amount)
      .map((e: any) => ({ label: e.label, amount: parseFloat(e.amount) || 0 }))
    const validExtras = [...delivExtra, ...validExtras0]
    const delivNote = delivMode === 'included' ? 'التوصيل مشمول في السعر.' : delivMode === 'free' ? 'التوصيل مجاني.' : ''
    const goods = parseFloat(totalPrice) || 0
    const finalTotal = goods + validExtras.reduce((s: any, e: any) => s + e.amount, 0)

    // تسعير بند-بند: لكل مادة سعرها + خصائصها + كتالوجها الخاص
    let itemPricesPayload = null
    if (isMultiItem) {
      itemPricesPayload = []
      for (let i = 0; i < myItems.length; i++) {
        const it = myItems[i]
        const form = itemForms[i] || {}
        if (!(parseFloat(form.line_total) > 0)) continue // المورد سعّر بعض المواد فقط — نتجاهل غير المسعّرة
        // رفع كتالوج هذه المادة (إن وُجد) — فحص أمني على الخادم
        let upUrl = null, upName = null
        if (form.file) {
          const safe = await validateUploadFile(form.file)
          if (!safe.ok) { setError(`${L('Catalog', 'کیٹلاگ', 'كتالوج')} «${locale === 'ar' ? it.product_name : getProductLabel(it.product_name, locale)}»: ${safe.error}`); setSubmitting(false); return }
          const ifd = new FormData(); ifd.append('file', form.file)
          const ires = await fetch('/api/upload-attachment', { method: 'POST', body: ifd })
          const ij = await ires.json().catch(() => ({}))
          if (!ires.ok || !ij.ok) {
            setError(L(`Could not upload the catalog for «${getProductLabel(it.product_name, locale)}» — remove it or try again.`, `«${getProductLabel(it.product_name, locale)}» کا کیٹلاگ اپ لوڈ نہیں ہو سکا — اسے ہٹائیں یا دوبارہ کوشش کریں۔`, `تعذّر رفع كتالوج «${getProductLabel(it.product_name, locale)}» — أزله أو حاول مجدداً.`))
            setSubmitting(false); return
          }
          upUrl = ij.url; upName = ij.name
        }
        const up = parseFloat(form.unit_price) || 0
        const lineTotal = parseFloat(form.line_total) || (up * (it.quantity || 0))
        itemPricesPayload.push({
          item_index: it.item_index, product_name: it.product_name, sub_category: it.sub_category || null, sector: it.sector,
          unit: (form.priceUnit && form.priceUnit.trim()) || it.unit, quantity: it.quantity,
          unit_price: up || null, total: +lineTotal.toFixed(2),
          delivery_days: parseInt(form.delivery_days) || null,
          warranty: (form.warranty || '').trim() || null,
          specification: (form.specs || '').trim() || null,
          source_type: form.source_type || null,
          attachment_url: upUrl, attachment_name: upName,
        })
      }
    }

    if (!sourceType) {
      setError(L('Choose where this price comes from.', 'قیمت کا ذریعہ منتخب کریں۔', 'حدّد مصدر السعر قبل الإرسال.'))
      setSubmitting(false); return
    }
    const { error: insertError } = await supabase.from('offers').insert({
      rfq_id: id,
      source_type: sourceType,
      availability: availability || null,
      supplier_id: actingId || user.id,
      total_price: finalTotal,
      price_valid_until: new Date(Date.now() + (parseInt(priceValidity) || 3) * 86400000).toISOString(),
      vat_included: vatIncluded === true,
      vat_status: noVat ? 'not_registered' : 'registered',
      item_prices: itemPricesPayload,
      unit_price: isMultiItem ? null : (unitPrice ? parseFloat(unitPrice) : null),
      delivery_days: isMultiItem
        ? (itemPricesPayload && itemPricesPayload.length ? (Math.max(0, ...itemPricesPayload.map((e: any) => e.delivery_days || 0)) || null) : null)
        : (deliveryDays ? parseInt(deliveryDays) : null),
      notes: [delivNote, notes].filter(Boolean).join('\n') || null,
      attributes: Object.keys(attrObj).length > 0 ? attrObj : null,
      extra_charges: validExtras.length > 0 ? validExtras : null,
      payment_terms: payTerms,
      attachment_url: attachUrl,
      attachment_name: attachName,
    })

    if (insertError) {
      setError((insertError.message || '').includes('offer_rate_limited')
        ? (locale === 'en' ? 'Too many offers in the last hour. Verify your account to remove the limit, or try again later.' : locale === 'ur' ? 'ایک گھنٹے میں بہت زیادہ آفرز۔ حد ختم کرنے کے لیے اکاؤنٹ کی تصدیق کریں، یا بعد میں کوشش کریں۔' : 'تجاوزت عدد العروض المسموح في الساعة. وثّق حسابك لإزالة الحد، أو حاول لاحقاً.')
        : L('Could not send the offer — please try again.', 'آفر نہیں بھیجی جا سکی — دوبارہ کوشش کریں۔', 'تعذّر إرسال العرض — حاول مرة ثانية.'))
      console.error('offer insert', insertError)
      setSubmitting(false); return
    }
    try {
      for (let k = 0; k < sessionStorage.length; k++) {
        const key = sessionStorage.key(k)
        if (!key || !key.startsWith('tsk_pc_sup_')) continue
        const snap = JSON.parse(sessionStorage.getItem(key) || '{}').data || {}
        const done = new Set((snap.offers || []).map((o: any) => o.rfq_id)); done.add(id)
        const nx = (snap.openRfqs || []).find((x: any) => !done.has(x.id))
        if (nx) setNextRfq(nx.id)
      }
    } catch {}
    setSuccess(true); setSubmitting(false)
  }

  async function handleDismiss() {
    const supabase = createClient()
    await supabase.from('rfq_dismissals').insert({
      rfq_id: id, supplier_id: actingId || user.id, reason: dismissReason || null,
    })
    setDismissed(true)
    setShowDismiss(false)
  }

  const T = {
    ar: {
      back: '← رجوع', details: 'تفاصيل الطلب', sector: 'القطاع', qty: 'الكمية',
      location: 'الموقع', contractor: 'المشتري', spec: 'المواصفات', notes: 'ملاحظات',
      delivery: 'التوصيل', vat: 'فاتورة ضريبية', required: 'مطلوب', notRequired: 'غير مطلوب',
      submitOffer: 'تقديم عرض سعر', totalPrice: 'السعر الإجمالي (ر.س)', unitPrice: 'سعر الوحدة (ر.س)',
      verifyFirst: 'أكمل ملفك لتقديم العروض', verifyFirstSub: 'حدّد موقعك وتخصصاتك وأكّد بريدك الإلكتروني، ثم عُد لتسعير هذا الطلب. التوثيق اختياري، ويمنح عروضك شارة «موثّق».', verifyFirstCta: 'أكمل ملفك ←',
      deliveryDays: 'مدة التوصيل (أيام)', attributes: 'خصائص المنتج المعروض',
      attrHint: 'أضف خصائص مثل: العلامة التجارية، بلد المنشأ، الضمان...',
      attrKey: 'الخاصية', attrValue: 'القيمة', addAttr: '+ إضافة خاصية',
      attachTitle: 'إرفاق ملف (كتالوج / بيانات منتج)', attachHint: 'PDF، صورة، Excel — يصل للمشتري مع عرضك',
      attachBtn: 'اضغط لرفع كتالوج أو ملف المنتج', removeAttach: 'إزالة',
      offerNotes: 'ملاحظات إضافية', send: 'إرسال العرض ←', sending: 'جارٍ الإرسال...',
      dismiss: 'هذا الطلب لا يناسبني', dismissTitle: 'تجاهل هذا الطلب؟',
      dismissSub: 'لن يظهر هذا الطلب مرة أخرى في قائمتك', dismissReason: 'سبب التجاهل (اختياري)',
      confirmDismiss: 'تأكيد التجاهل', cancel: 'إلغاء',
      attachedFile: 'ملف مواصفات مرفق', viewFile: 'عرض الملف',
      successTitle: 'تم إرسال العرض', successSub: 'سيتم إخطارك عند قبول أو رفض العرض',
      dismissedTitle: 'تم تجاهل الطلب', dismissedSub: 'لن يظهر هذا الطلب في قائمتك',
      backDash: 'رجوع للوحة التحكم',
      alreadyTitle: { accepted: 'تم قبول عرضك!', rejected: 'تم رفض العرض', pending: 'عرضك بانتظار قرار المشتري' },
      closed: 'هذا الطلب مغلق', closedSub: 'لا يقبل عروض جديدة',
    },
    en: {
      back: '← Back', details: 'Request Details', sector: 'Sector', qty: 'Quantity',
      location: 'Location', contractor: 'Buyer', spec: 'Specification', notes: 'Notes',
      delivery: 'Delivery', vat: 'Tax Invoice', required: 'Required', notRequired: 'Not Required',
      submitOffer: 'Submit Price Offer', totalPrice: 'Total Price (SAR)', unitPrice: 'Unit Price (SAR)',
      verifyFirst: 'Complete your profile to submit offers', verifyFirstSub: 'Set your location and specialties and confirm your email, then come back to price this request. Verification is optional and adds a «Verified» badge to your offers.', verifyFirstCta: 'Complete your profile →',
      deliveryDays: 'Delivery Time (days)', attributes: 'Product Attributes',
      attrHint: 'Add attributes like: Brand, Country of origin, Warranty...',
      attrKey: 'Attribute', attrValue: 'Value', addAttr: '+ Add Attribute',
      attachTitle: 'Attach File (catalog / product data)', attachHint: 'PDF, image, Excel — sent to the buyer with your offer',
      attachBtn: 'Click to upload catalog or product file', removeAttach: 'Remove',
      offerNotes: 'Additional Notes', send: 'Send Offer →', sending: 'Sending...',
      dismiss: 'This request is not for me', dismissTitle: 'Dismiss this request?',
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
      location: 'مقام', contractor: 'خریدار', spec: 'تفصیلات', notes: 'نوٹس',
      delivery: 'ڈیلیوری', vat: 'ٹیکس رسید', required: 'ضروری', notRequired: 'غیر ضروری',
      submitOffer: 'قیمت پیش کریں', totalPrice: 'کل قیمت (SAR)', unitPrice: 'فی یونٹ قیمت (SAR)',
      verifyFirst: 'پیشکش دینے کے لیے پروفائل مکمل کریں', verifyFirstSub: 'اپنا مقام اور مہارتیں منتخب کریں اور ای میل کی تصدیق کریں، پھر واپس آ کر قیمت دیں۔ تصدیق اختیاری ہے۔', verifyFirstCta: 'پروفائل مکمل کریں →',
      deliveryDays: 'ڈیلیوری وقت (دن)', attributes: 'پروڈکٹ کی خصوصیات',
      attrHint: 'خصوصیات شامل کریں: برانڈ، ملک، وارنٹی...',
      attrKey: 'خصوصیت', attrValue: 'قیمت', addAttr: '+ خصوصیت شامل کریں',
      attachTitle: 'فائل منسلک کریں (کیٹلاگ)', attachHint: 'PDF، تصویر، Excel',
      attachBtn: 'کیٹلاگ یا فائل اپلوڈ کریں', removeAttach: 'ہٹائیں',
      offerNotes: 'اضافی نوٹس', send: 'پیشکش بھیجیں →', sending: 'بھیجا جا رہا ہے...',
      dismiss: 'یہ درخواست میرے لیے نہیں', dismissTitle: 'یہ درخواست نظر انداز کریں؟',
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

  const sectors = { ar: SECTOR_LABELS, en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' }, ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' } }[locale] || SECTOR_LABELS

  // استخراج رابط الملف من الـ notes
  const specFileMatch = rfq?.notes?.match(/\[مواصفات مرفقة: ([^\]]+)\]/)
  const specFileUrl = specFileMatch ? specFileMatch[1] : null
  const cleanNotes = rfq?.notes?.replace(/\n?\[مواصفات مرفقة:[^\]]+\]/, '').trim()

  if (loading) return <PageLoader />

  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]"><div className="text-gray-500">{L('Request not found', 'درخواست نہیں ملی', 'الطلب غير موجود')}</div></div>

  // Success / Dismissed states
  if (success || dismissed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={dir} style={{ background: '#f4f6f9' }}>
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">{success ? <Glyph e="✅" /> : <Glyph e="🚫" />}</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0B2438' }}>
            {success ? T.successTitle : T.dismissedTitle}
          </h2>
          <p className="text-sm text-gray-500 mb-6">{success ? T.successSub : T.dismissedSub}</p>
          {success && nextRfq && (
            <a href={`/supplier/dashboard/rfq/${nextRfq}`} className="block mb-2.5 py-3 rounded-xl font-extrabold text-[#071827] text-center" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
              {L('Price the next request', 'اگلی درخواست کی قیمت', 'سعّر الطلب التالي')} ←
            </a>
          )}
          <Link href="/supplier/dashboard" className="block py-3 rounded-xl font-semibold text-white text-center" style={{ background: '#0B2438' }}>
            {T.backDash}
          </Link>
        </div>
      </div>
    )
  }

  // pricing is open: no offer yet, request open and within its deadline, and allowed to quote
  const pricingOpen = !existingOffer && rfq?.status === 'open' && !expired && verified
  const pricedCount = (myItems || []).filter((_: any, i: number) => parseFloat(itemForms[i]?.line_total) > 0).length
  // why the send button is disabled (shown under it and on the phone bar)
  function sendBlockReason(): string {
    if (!rfq) return ''
    return (isMultiItem && !allItemsPriced) || !totalPrice
                ? (isMultiItem
                  ? L('Enter a price for at least one material to send.', 'بھیجنے کے لیے کم از کم ایک مال کی قیمت درج کریں۔', 'أدخل سعر مادة واحدة على الأقل لتتمكّن من الإرسال.')
                  : L('Enter the price to send.', 'بھیجنے کے لیے قیمت درج کریں۔', 'أدخل السعر لتتمكّن من الإرسال.'))
                : rfq.delivery_required && (!delivMode || (delivMode === 'amount' && !(parseFloat(delivAmount) > 0)))
                  ? L('Choose the delivery cost to send.', 'بھیجنے کے لیے ڈیلیوری کی لاگت منتخب کریں۔', 'حدّد تكلفة التوصيل لتتمكّن من الإرسال.')
                : vatIncluded === null
                  ? L('Choose whether your price includes VAT to send.', 'بھیجنے کے لیے منتخب کریں کہ قیمت میں ویٹ شامل ہے یا نہیں۔', 'حدّد هل يشمل سعرك الضريبة لتتمكّن من الإرسال.')
                  : !sourceType
                    ? L('Choose where this price comes from to send.', 'بھیجنے کے لیے قیمت کا ذریعہ منتخب کریں۔', 'حدّد مصدر السعر لتتمكّن من الإرسال.')
                    : ''
  }
  return (
    <AppShell title={L('Submit Offer', 'پیشکش', 'تقديم عرض')} nav={getNav('supplier', locale, '/supplier/dashboard')} dir={dir}>
      <div className="max-w-[1500px] mx-auto grid gap-5 items-start lg:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        {/* MAIN: the request and, while pricing is open, a card per material with its price */}
        <div className="min-w-0 space-y-5">
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-2">
            {/* عنوان عام — لا نُظهر للمورد الاسم الذي اختاره المشتري للطلب */}
            <div>
              <div className="text-xs font-bold text-[#9D7425] font-mono" dir="auto">{rfqRefLine(rfq, locale)}</div>
              <h2 className="text-lg font-bold" style={{ color: '#0B2438' }}>
                {rfqDesc({ ...rfq, title: null }, locale, rfqIsMulti ? (myItems.length || undefined) : 1)}
              </h2>
            </div>
            <button type="button" onClick={async () => {
              const supabase = createClient()
              const { data, error } = await supabase.rpc('get_or_create_conversation', { p_rfq_id: id, p_supplier_id: user?.id })
              if (error || !data) { setError(L('Could not open the conversation', 'گفتگو نہیں کھل سکی', 'تعذّر فتح المحادثة')); return }
              router.push(`/messages?c=${data}`)
            }} className="text-xs px-3 py-1.5 rounded-xl font-semibold text-white shrink-0" style={{ background: '#0B2438' }}><Glyph e="💬" /> {L('Message buyer', 'خریدار کو پیغام بھیجیں', 'راسل المشتري')}</button>
          </div>
          {/* the materials table is for the read-only states; while pricing, the cards below show them */}
          {!pricingOpen && (<>
          {rfqIsMulti && myItems.length > 0 && (
            <div className="my-4">
              <h3 className="font-bold text-sm mb-2 text-[#0B2438]"><Glyph e="🧾" /> {L('Materials in your specialty', 'آپ کی مہارت کا مال', 'المواد ضمن تخصصك')} ({myItems.length})</h3>
              <p className="text-[11px] text-gray-400 mb-2">{L('You only see the materials you can supply — price them and send your offer.', 'آپ کو صرف وہ مال دکھایا جاتا ہے جو آپ سپلائی کر سکتے ہیں — قیمت لگائیں اور آفر بھیجیں۔', 'تظهر لك فقط المواد التي تستطيع توريدها — سعّرها وأرسل عرضك.')}</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="text-[13px] text-gray-500 bg-[#f4f6f9] border-b border-gray-100">
                    <th className="text-start py-2.5 px-3 font-bold">#</th>
                    <th className="text-start py-2.5 px-3 font-bold">{L('Material', 'مال', 'المادة')}</th>
                    <th className="text-start py-2.5 px-3 font-bold">{L('Quantity', 'مقدار', 'الكمية')}</th>
                    <th className="text-start py-2.5 px-3 font-bold">{L('Required specs', 'مطلوبہ اسپیسیفکیشن', 'المواصفات المطلوبة')}</th>
                  </tr></thead>
                  <tbody>
                    {myItems.map((it: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 align-top">
                        <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[15px] text-[#0B2438] flex items-center gap-2"><img src={productImageUrl(it.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, it.sub_category || detectSubCategory(it.product_name, it.sector))} className="w-9 h-9 object-contain rounded bg-white border border-gray-100 shrink-0" /><span>{getProductLabel(it.product_name, locale)}</span></div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{(sectors as any)[it.sector] || it.sector}</span>
                            {it.in_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"><Glyph e="⚡" /> {L('In stock now', 'فوری دستیاب', 'توفّر فوري')}</span>}
                            {it.max_days && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">⏱ {it.max_days}{L('d', ' دن', 'ي')}</span>}
                            {it.spec_file_url && it.spec_file_url !== it.photo_url && <a href={fileHref(it.spec_file_url)} target="_blank" rel="noopener noreferrer" className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 hover:underline"><Glyph e="📎" /> {L('File', 'فائل', 'ملف')}</a>}
                          </div>
                          {/* صورة المادة من الطلب السريع: المورد يشوف نفس الشي اللي بدّو ياه الزبون */}
                          {it.photo_url && (
                            <a href={fileHref(it.photo_url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 group" title={L('Material photo from the buyer', 'خریدار کی طرف سے مال کی تصویر', 'صورة المادة من المشتري')}>
                              <img src={fileHref(it.photo_url)} alt={L('Material photo', 'مال کی تصویر', 'صورة المادة')} loading="lazy" className="w-24 h-24 object-cover rounded-lg border border-gray-200 group-hover:border-[#D4A543]" />
                              <span className="text-[11px] font-bold text-[#9D7425]"><Glyph e="📷" /> {L('Photo from the buyer', 'خریدار کی تصویر', 'صورة من المشتري')}<br /><span className="font-normal text-gray-500">{L('Price this exact item', 'بالکل یہی مال کی قیمت لگائیں', 'سعّر المادة نفسها')}</span></span>
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-[15px] text-[#9D7425] whitespace-nowrap">{it.quantity} {getUnitLabel(it.unit, locale)}</td>
                        <td className="py-3 px-3 text-sm text-gray-700 leading-relaxed">{it.specification || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </>)}
        </div>

        {existingOffer ? (
          <div className={`bg-white rounded-2xl p-6 shadow-sm border text-center ${
            existingOffer.status === 'accepted' ? 'border-emerald-300 bg-emerald-50' :
            existingOffer.status === 'rejected' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
          }`}>
            <div className="text-4xl mb-2">{existingOffer.status === 'accepted' ? <Glyph e="✅" /> : (existingOffer.status === 'rejected' && rfq.status === 'closed') ? <Glyph e="🔒" /> : existingOffer.status === 'rejected' ? <Glyph e="❌" /> : <Glyph e="⏳" />}</div>
            <h3 className="font-bold mb-1" style={{ color: '#0B2438' }}>
              {existingOffer.status === 'rejected' && rfq.status === 'closed'
                ? L('Pricing closed — another offer was accepted', 'پرائسنگ بند — دوسری پیشکش قبول ہوگئی', 'انتهى التسعير — تم اعتماد عرض آخر')
                : ((T.alreadyTitle as any)[existingOffer.status] || T.alreadyTitle.pending)}
            </h3>
            <p className="text-sm text-gray-600">{existingOffer.total_price?.toLocaleString('en-US')} {SAR}{existingOffer.status === 'rejected' && rfq.status === 'closed' ? ` — ${L('thanks for participating', 'شرکت کا شکریہ', 'شكراً لمشاركتك')}` : ''}</p>

            {/* المواد التي سعّرتها — كل مادة وسعرها (واضحة للمورد) */}
            {Array.isArray(existingOffer.item_prices) && existingOffer.item_prices.length > 0 && (
              <div className="mt-4 text-right border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 flex justify-between">
                  <span><Glyph e="🧾" /> {L('Items you priced', 'جن چیزوں کی آپ نے قیمت دی', 'المواد التي سعّرتها')} ({existingOffer.item_prices.length})</span>
                  <span>{L('Price', 'قیمت', 'السعر')}</span>
                </div>
                {existingOffer.item_prices.map((it: any, idx: number) => (
                  <div key={idx} className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-800 font-medium truncate">
                      {getProductLabel(it.product_name, locale)}
                      <span className="text-gray-400 text-xs font-normal"> ({(Number(it.quantity) || 0).toLocaleString('en-US')} {getUnitLabel(it.unit, locale)}{it.delivery_days ? ` · ${it.delivery_days}${L('d', ' دن', 'ي')}` : ''})</span>
                    </span>
                    <span className="font-bold text-sm whitespace-nowrap" style={{ color: '#0B2438' }}>{(Number(it.total) || 0).toLocaleString('en-US')} {SAR}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 🛡 حماية الصفقة — إدارة الصفقة وتتبّعها (المورّد) */}
            {existingOffer.status === 'accepted' && (
              <div className="mt-4">
                <DealProtection
                  offer={existingOffer}
                  isContractor={false}
                  isSupplier={true}
                  otherParty={contractorInfo}
                  poNumber={`PO-${existingOffer.id.slice(0, 8).toUpperCase()}`}
                  myId={user?.id}
                />
              </div>
            )}

            {/* تقييم المورّد للمشتري (متبادل) — بعد قبول الصفقة */}
            {existingOffer.status === 'accepted' && (
              <div className="mt-4 border-t border-emerald-200 pt-4 text-right">
                {cDone ? (
                  <div className="text-sm font-bold" style={{ color: '#0F6E56' }}><Glyph e="⭐" /> {L('Thanks for rating the buyer', 'خریدار کی ریٹنگ دینے کا شکریہ', 'شكراً لتقييمك المشتري')}</div>
                ) : (
                  <div>
                    <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>{L('Rate the buyer', 'خریدار کی ریٹنگ دیں', 'قيّم المشتري')} <Glyph e="⭐" /></div>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setCRating(n)} className={`text-2xl leading-none ${n <= cRating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                      ))}
                    </div>
                    <textarea value={cComment} onChange={(e: any) => setCComment(e.target.value)} rows={2} className="input-field text-sm" placeholder={L('Optional comment about the buyer…', 'خریدار کے بارے میں اختیاری تبصرہ…', 'تعليق اختياري عن المشتري…')} />
                    {cMsg && <div className="text-xs text-red-600 mt-1">{cMsg}</div>}
                    <button type="button" disabled={!cRating || cBusy} onClick={async () => {
                      if (!cRating) return
                      setCBusy(true); setCMsg('')
                      const supabase = createClient()
                      const { error: e } = await supabase.rpc('submit_contractor_review', { p_offer_id: existingOffer.id, p_rating: cRating, p_comment: cComment || null })
                      setCBusy(false)
                      if (e) { const dup = (e.message || '').includes('Already'); setCMsg(dup ? L('Already rated', 'آپ پہلے ہی ریٹنگ دے چکے ہیں', 'سبق تقييمك') : L('Error, try again', 'خرابی ہوئی، دوبارہ کوشش کریں', 'حدث خطأ، حاول مجدداً')); if (dup) setCDone(true); return }
                      setCDone(true)
                    }} className="mt-2 px-4 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#0F6E56' }}>{cBusy ? '...' : L('Submit rating', 'ریٹنگ بھیجیں', 'إرسال التقييم')}</button>
                  </div>
                )}
              </div>
            )}

            {/* نافذة الـ١٥ دقيقة: تعديل/إلغاء العرض بعد إرساله */}
            {canEditOffer && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-right">
                <div className="text-xs text-gray-600 mb-2 leading-relaxed">
                  ⏱ <strong>{L(`You have ${editMinsLeft} minutes`, `آپ کے پاس ${editMinsLeft} منٹ ہیں`, `لديك ${editMinsLeft} دقيقة`)}</strong> {L('to edit or cancel your offer. Cancelling deletes the current offer so you can price again (add a material you missed or change prices). After that, the offer stays fixed until the buyer decides.', 'اپنی آفر میں ترمیم یا منسوخی کے لیے۔ منسوخ کرنے سے موجودہ آفر حذف ہو جائے گی اور آپ دوبارہ قیمت دے سکیں گے (بھولا ہوا مال شامل کریں یا قیمتیں بدلیں)۔ وقت ختم ہونے کے بعد آفر خریدار کے فیصلے تک ویسی ہی رہے گی۔', 'لتعديل أو إلغاء عرضك. الإلغاء يحذف العرض الحالي فتستطيع التسعير من جديد (إضافة مادة نسيتها أو تعديل الأسعار). بعد انتهاء المهلة يبقى العرض ثابتاً حتى قرار المشتري.')}
                </div>
                <button type="button" onClick={cancelOffer} disabled={cancelling}
                  className="px-4 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#b91c1c' }}>
                  {cancelling ? '...' : `${L('Cancel and re-price', 'منسوخ کر کے دوبارہ قیمت دیں', 'إلغاء وإعادة التسعير')}`}
                </button>
              </div>
            )}

            {existingOffer.status === 'pending' && existingOffer.reduction_deadline && new Date(existingOffer.reduction_deadline) > new Date() && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 text-right">
                <div className="font-bold text-orange-700 mb-1"><Glyph e="📉" /> {L('The buyer is asking for a lower price', 'خریدار قیمت کم کرنے کی درخواست کر رہا ہے', 'المشتري يطلب تخفيض السعر')}</div>
                {existingOffer.reduction_note && <div className="text-xs text-gray-600 mb-1">«{existingOffer.reduction_note}»</div>}
                <div className="text-[11px] text-gray-500 mb-3">{L('Reply by:', 'جواب کی آخری مہلت:', 'المهلة للرد:')} {new Date(existingOffer.reduction_deadline).toLocaleString(locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK' : 'ar-SA')}</div>
                <div className="flex gap-2">
                  <input type="number" value={newPrice} onChange={(e: any) => setNewPrice(e.target.value)} className="input-field flex-1" placeholder={L(`Less than ${existingOffer.total_price?.toLocaleString('en-US')} SAR`, `${existingOffer.total_price?.toLocaleString('en-US')} SAR سے کم`, `أقل من ${existingOffer.total_price?.toLocaleString('en-US')} ر.س`)} min="0" step="any" />
                  <button type="button" onClick={submitReduction} disabled={reducing} className="px-4 rounded-xl font-semibold text-white text-sm disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>{reducing ? '...' : L('Send new price', 'نئی قیمت بھیجیں', 'إرسال السعر الجديد')}</button>
                </div>
              </div>
            )}

            {existingOffer.info_request && (
              <div className="mt-4 bg-[#D4A543]/5 border border-blue-200 rounded-xl p-4 text-right">
                <div className="font-bold text-[#9D7425] mb-1"><Glyph e="❓" /> {L('The buyer is asking for more information', 'خریدار مزید معلومات مانگ رہا ہے', 'المشتري يطلب معلومات إضافية')}</div>
                <div className="text-sm text-gray-700 bg-white rounded-lg p-2.5 mb-2">{existingOffer.info_request}</div>
                {existingOffer.info_response ? (
                  <div className="text-sm bg-emerald-50 rounded-lg p-2.5"><span className="text-emerald-600 text-[11px]">{L('Your reply:', 'آپ کا جواب:', 'ردّك:')}</span><div>{existingOffer.info_response}</div></div>
                ) : existingOffer.status === 'pending' ? (
                  <div>
                    <textarea value={infoReply} onChange={(e: any) => setInfoReply(e.target.value)} rows={2} className="input-field mb-2" placeholder={L('Write your reply to the buyer about the product...', 'پروڈکٹ کے بارے میں خریدار کو اپنا جواب لکھیں...', 'اكتب ردّك للمشتري عن المنتج...')} />
                    <button type="button" onClick={submitInfoResponse} disabled={infoReplying} className="px-4 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#0B2438' }}>{infoReplying ? '...' : L('Send reply', 'جواب بھیجیں', 'إرسال الرد')}</button>
                  </div>
                ) : null}
              </div>
            )}
            {existingOffer.status === 'accepted' && (
              <Link href={`/contractor/orders/${existingOffer.id}`}
                className="inline-block mt-4 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:shadow"
                style={{ background: '#0F6E56' }}>
                <Glyph e="📄" /> {L('Purchase order / deal statement', 'پرچیز آرڈر / ڈیل کا بیان', 'أمر الشراء / بيان الصفقة')} ←
              </Link>
            )}
          </div>
        ) : (rfq.status !== 'open' || expired) ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2">{expired ? <Glyph e="⏰" /> : <Glyph e="🔒" />}</div>
            <h3 className="font-bold" style={{ color: '#0B2438' }}>{expired ? L('Pricing window closed', 'قیمت دینے کی مہلت ختم', 'انتهت مهلة التسعير') : T.closed}</h3>
            <p className="text-sm text-gray-500">{expired ? L('The deadline passed — offers are no longer accepted.', 'مقررہ وقت ختم ہو گیا — اب آفرز قبول نہیں کی جاتیں۔', 'انتهى الوقت المحدد لاستقبال العروض على هذا الطلب.') : T.closedSub}</p>
            {rfq.expires_at && <p className="text-xs text-gray-400 mt-2"><Glyph e="📅" /> {formatDateTime(rfq.expires_at)}</p>}
          </div>
        ) : !verified ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2"><Glyph e="🛡" /></div>
            <h3 className="font-bold" style={{ color: '#0B2438' }}>{T.verifyFirst}</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{T.verifyFirstSub}</p>
            <Link href="/onboarding" className="inline-block mt-4 px-5 py-2.5 rounded-xl font-bold text-[#071827] text-sm" style={{ background: '#D4A543' }}>{T.verifyFirstCta}</Link>
          </div>
        ) : (
          <form id="offer-form" onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{T.submitOffer}</h3>
            {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}
            <div className="space-y-4">
              {isMultiItem && myItems.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2"><Glyph e="🚫" /></div>
                  <p className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('No materials match your specialties', 'اس درخواست میں آپ کی مہارت کا کوئی مال نہیں', 'لا توجد مواد ضمن تخصصك في هذا الطلب')}</p>
                  <p className="text-xs text-gray-400 mt-1">{L('This request has no items in your sectors.', 'اس درخواست کا مال آپ کے شعبوں سے باہر ہے — آپ کو قیمت دینے کی ضرورت نہیں۔', 'مواد هذا الطلب خارج قطاعاتك — لا يلزمك تسعيرها.')}</p>
                </div>
              ) : isMultiItem ? (
                <div>
                  <div className="flex items-end justify-between gap-2 mb-1">
                    <label className="block text-sm font-bold" style={{ color: '#0B2438' }}>
                      {L('Price the materials you can supply', 'جو مال آپ دے سکتے ہیں اس کی قیمت دیں', 'سعّر المواد التي تستطيع توفيرها')}
                    </label>
                    <span className="text-xs font-bold text-gray-500">{pricedCount}/{myItems.length}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    {L('Enter the price per unit of each material, including VAT — the total is calculated. You do not have to price them all; open «Details» for another unit, delivery time, warranty or a catalog.', 'ہر مال کی فی یونٹ قیمت ٹیکس سمیت درج کریں، کل رقم خود بنے گی۔ سب کی قیمت دینا ضروری نہیں؛ دوسرے یونٹ، ڈیلیوری، وارنٹی یا کیٹلاگ کے لیے «تفصیلات» کھولیں۔', 'أدخل سعر الوحدة لكل مادة شاملاً الضريبة ويُحسب الإجمالي تلقائياً، ولست ملزماً بتسعير الكل. افتح «التفاصيل» لوحدة أخرى أو مدة التوصيل أو الضمان أو الكتالوج.')}
                  </p>
                  <div className="space-y-3">
                    {myItems.map((it: any, i: any) => {
                      const form = itemForms[i] || {}
                      const line = parseFloat(form.line_total) || 0
                      const qty = Number(it.quantity) || 0
                      const more = openItem === i
                      const detailCount = [form.specs, form.delivery_days, (form.warranty || '').trim(), form.file, form.priceUnit && !sameUnit(form, i) ? 'u' : ''].filter(Boolean).length
                      return (
                        <div key={i} className={`rounded-2xl border p-3 sm:p-4 transition-all ${line > 0 ? 'border-[#0F6E56]/40 bg-[#0F6E56]/[0.03]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={productImageUrl(it.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, it.sub_category || detectSubCategory(it.product_name, it.sector))}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-gray-50 border border-gray-100 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-bold text-[15px] leading-snug" style={{ color: '#0B2438' }}>
                                    {line > 0 && <span className="inline-grid place-items-center w-5 h-5 rounded-full text-[11px] text-white me-1.5 align-middle" style={{ background: '#0F6E56' }}>✓</span>}
                                    {getProductLabel(it.product_name, locale)}
                                  </div>
                                  {it.sub_category && <div className="text-xs text-gray-500 mt-0.5">{getSubCategoryLabel(it.sector, it.sub_category, locale)}</div>}
                                </div>
                                <div className="text-end shrink-0">
                                  <div className="text-[11px] text-gray-400">{L('Quantity', 'مقدار', 'الكمية')}</div>
                                  <div className="font-extrabold text-[15px] text-[#9D7425] whitespace-nowrap">{qty.toLocaleString('en-US')} {getUnitLabel(it.unit, locale)}</div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {it.in_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"><Glyph e="⚡" /> {L('In stock now', 'فوری دستیاب', 'توفّر فوري')}</span>}
                                {it.max_days && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">⏱ {it.max_days}{L('d', ' دن', 'ي')}</span>}
                                {it.spec_file_url && it.spec_file_url !== it.photo_url && <a href={fileHref(it.spec_file_url)} target="_blank" rel="noopener noreferrer" className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 hover:underline"><Glyph e="📎" /> {it.spec_file_name || L('Buyer file', 'خریدار کی فائل', 'ملف من المشتري')}</a>}
                              </div>
                            </div>
                          </div>

                          {/* what the buyer asked for: specs and photo, prominent so the price matches */}
                          {it.specification && (
                            <div className="mt-3 rounded-xl p-2.5 border text-sm text-gray-800 leading-relaxed" style={{ background: '#D4A5430a', borderColor: '#D4A54344' }}>
                              <span className="text-xs font-bold me-1" style={{ color: '#9D7425' }}><Glyph e="📋" /> {L('Buyer specs:', 'خریدار کی تفصیل:', 'مواصفات المشتري:')}</span>{it.specification}
                            </div>
                          )}
                          {it.photo_url && (
                            <a href={fileHref(it.photo_url)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 group" title={L('Material photo from the buyer', 'خریدار کی طرف سے مال کی تصویر', 'صورة المادة من المشتري')}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={fileHref(it.photo_url)} alt={L('Material photo', 'مال کی تصویر', 'صورة المادة')} loading="lazy" className="w-20 h-20 object-cover rounded-lg border border-gray-200 group-hover:border-[#D4A543]" />
                              <span className="text-[11px] font-bold text-[#9D7425]"><Glyph e="📷" /> {L('Photo from the buyer', 'خریدار کی تصویر', 'صورة من المشتري')}<br /><span className="font-normal text-gray-500">{L('Price this exact item', 'بالکل یہی مال کی قیمت لگائیں', 'سعّر المادة نفسها')}</span></span>
                            </a>
                          )}

                          {/* understanding the request: what it is, and what the buyer did not say */}
                          {(() => {
                            const nt = itemNotes[Number(it.item_index ?? i)]
                            if (!nt || (!nt.what_it_is && !nt.missing.length)) return null
                            return (
                              <div className="mt-3 space-y-2">
                                {nt.what_it_is && (
                                  <p className="text-xs text-gray-600 leading-relaxed" dir="auto">
                                    <span className="font-bold text-[#0B2438]">ℹ️ {L('What it is:', 'یہ کیا ہے:', 'ما هذه المادة؟')} </span>{nt.what_it_is}
                                  </p>
                                )}
                                {nt.missing.length > 0 && (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-amber-800 flex-1 min-w-[12rem]">
                                      <Glyph e="⚠" /> <b>{L('Not specified by the buyer:', 'خریدار نے نہیں بتایا:', 'لم يحدّد المشتري:')}</b> {nt.missing.join(L(', ', '، ', '، '))}
                                    </span>
                                    <button type="button" onClick={() => askBuyer(it, nt.missing)} disabled={asking === Number(it.item_index ?? i)}
                                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
                                      <Glyph e="💬" /> {L('Ask the buyer', 'خریدار سے پوچھیں', 'اسأل المشتري')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* the price, right away: the unit price (the total follows); a custom unit prices the total */}
                          {skipped.has(i) ? (
                            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-gray-50 border border-dashed border-gray-300 px-3 py-2.5">
                              <span className="text-xs font-bold text-gray-500">{L("You don't carry this item — it won't be in your offer", 'یہ آئٹم آپ کے پاس نہیں — پیشکش میں شامل نہیں', 'لا توفّر هذه المادة — لن تدخل في عرضك')}</span>
                              <button type="button" onClick={() => setSkipped(prev => { const n = new Set(prev); n.delete(i); return n })} className="text-xs font-bold text-[#9D7425] hover:underline">{L('Undo', 'واپس', 'تراجع')}</button>
                            </div>
                          ) : (<>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[11rem]">
                              {sameUnit(form, i) ? (
                                <input type="number" inputMode="decimal" value={form.unit_price || ''} onChange={(e: any) => setItemUnit(i, e.target.value)}
                                  aria-label={L(`Unit price for ${getProductLabel(it.product_name, locale)}`, `${getProductLabel(it.product_name, locale)} فی یونٹ قیمت`, `سعر الوحدة لـ ${getProductLabel(it.product_name, locale)}`)}
                                  className="input-field font-bold pe-20" placeholder={L(`Price per ${getUnitLabel(it.unit, locale)}`, `فی ${getUnitLabel(it.unit, locale)} قیمت`, `سعر ${getUnitLabel(it.unit, locale) || 'الوحدة'} الواحد`)} min="0" step="any" />
                              ) : (
                                <input type="number" inputMode="decimal" value={form.line_total || ''} onChange={(e: any) => setItemTotal(i, e.target.value)}
                                  aria-label={L(`Total price for ${getProductLabel(it.product_name, locale)}`, `${getProductLabel(it.product_name, locale)} کی کل قیمت`, `السعر الإجمالي لـ ${getProductLabel(it.product_name, locale)}`)}
                                  className="input-field font-bold pe-14" placeholder={L(`Total for ${qty.toLocaleString('en-US')} ${getUnitLabel(it.unit, locale)}`, `${qty.toLocaleString('en-US')} ${getUnitLabel(it.unit, locale)} کی کل قیمت`, `إجمالي ${qty.toLocaleString('en-US')} ${it.unit}`)} min="0" step="any" />
                              )}
                              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{sameUnit(form, i) ? `${SAR} / ${getUnitLabel(it.unit, locale)}` : SAR}</span>
                            </div>
                            <button type="button" onClick={() => setOpenItem(more ? null : i)} aria-expanded={more}
                              className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition-all ${more || detailCount ? 'border-[#D4A543]/50 text-[#9D7425] bg-[#D4A543]/5' : 'border-gray-200 text-gray-600 hover:border-[#D4A543]/50'}`}>
                              {more ? '▴' : '▾'} {L('Details', 'تفصیلات', 'التفاصيل')}{detailCount ? ` (${detailCount})` : ''}
                            </button>
                            <button type="button" onClick={() => { setItemUnit(i, ''); setItemTotal(i, ''); setOpenItem(null); setSkipped(prev => new Set(prev).add(i)) }}
                              className="text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600">
                              {L("Don't carry", 'دستیاب نہیں', 'لا أوفّرها')}
                            </button>
                          </div>
                          {line > 0 && qty > 0 && sameUnit(form, i) && (
                            <p className="text-[12px] text-gray-600 mt-1">
                              {L('Total', 'کل', 'الإجمالي')}: <b className="text-[#0B2438]">{line.toLocaleString('en-US')} {SAR}</b> <span className="text-gray-400">({qty.toLocaleString('en-US')} × {(+form.unit_price || 0).toLocaleString('en-US')})</span>
                              {form.autofilled && <span className="text-gray-400"> · {L('from your price list', 'آپ کی قیمتوں کی فہرست سے', 'من قائمة أسعارك')}</span>}
                            </p>
                          )}
                          </>)}

                          {more && (
                            <div className="mt-3 pt-3 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
                              {/* price by another unit: unit + unit price (total auto-calculates when the unit matches) */}
                              <div className="sm:col-span-2 grid grid-cols-5 gap-2">
                                <div className="col-span-2">
                                  <label className="block text-[11px] font-bold text-gray-400 mb-1">{L('Your unit', 'آپ کا یونٹ', 'وحدتك')}</label>
                                  <input type="text" value={form.priceUnit ?? it.unit} onChange={(e: any) => setItemPriceUnit(i, e.target.value)}
                                    className="input-field text-sm" placeholder={it.unit} list={`units-${i}`} />
                                  <datalist id={`units-${i}`}>
                                    {[it.unit, 'طن', 'سيخ', 'م³', 'م²', 'متر طولي', 'كيس', 'قطعة', 'لتر', 'لفة', 'صندوق'].filter((u, k, a) => u && a.indexOf(u) === k).map((u: any) => <option key={u} value={u} />)}
                                  </datalist>
                                </div>
                                <div className="col-span-3">
                                  {sameUnit(form, i) ? (<>
                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">{L('Or the total directly', 'یا کل رقم', 'أو الإجمالي مباشرة')}</label>
                                    <input type="number" value={form.line_total || ''} onChange={(e: any) => setItemTotal(i, e.target.value)}
                                      className="input-field text-sm" placeholder={L('Total', 'کل', 'الإجمالي')} min="0" step="any" />
                                  </>) : (<>
                                    <label className="block text-[11px] font-bold text-gray-400 mb-1">{L('Unit price', 'فی یونٹ قیمت', 'سعر الوحدة')}</label>
                                    <input type="number" value={form.unit_price || ''} onChange={(e: any) => setItemUnit(i, e.target.value)}
                                      className="input-field text-sm" placeholder={L('Price / ', 'قیمت / ', 'السعر / ') + (form.priceUnit || it.unit)} min="0" step="any" />
                                  </>)}
                                </div>
                                <p className="col-span-5 text-[10px] text-gray-400">
                                  {sameUnit(form, i)
                                    ? L('Unit price and total update each other.', 'فی یونٹ قیمت اور کل رقم ایک دوسرے سے بنتی ہیں۔', 'سعر الوحدة والإجمالي يُحسب كلٌّ منهما من الآخر.')
                                    : L('Custom unit: enter the material total above yourself.', 'الگ یونٹ: اوپر کل رقم خود درج کریں۔', 'وحدة خاصة: أدخل إجمالي المادة في الأعلى بنفسك.')}
                                </p>
                              </div>
                              {isIndependent && (
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-bold text-gray-500 mb-1">{L('Where this item\'s price comes from (if different)', 'اس چیز کی قیمت کا ذریعہ (اگر مختلف ہو)', 'مصدر سعر هذه المادة (إن اختلف عن العرض)')}</label>
                                  <select value={form.source_type || ''} onChange={(e: any) => setItemField(i, 'source_type', e.target.value)} className="input-field text-sm">
                                    <option value="">{L('Same as the offer', 'آفر جیسا', 'مثل العرض كله')}</option>
                                    {SOURCE_TYPES.map(o => <option key={o.k} value={o.k}>{locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}</option>)}
                                  </select>
                                </div>
                              )}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1"><Glyph e="📝" /> {L('What you offer (type, origin, brand…)', 'آپ کیا دے رہے ہیں (قسم، برانڈ…)', 'ما تقدّمه (النوع، المنشأ، العلامة…)')}</label>
                                <textarea value={form.specs || ''} onChange={(e: any) => setItemField(i, 'specs', e.target.value)} rows={2} className="input-field text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">⏱ {L('Delivery time (days)', 'ڈیلیوری کا وقت (دن)', 'مدة التوصيل (أيام)')}</label>
                                <input type="number" value={form.delivery_days || ''} onChange={(e: any) => setItemField(i, 'delivery_days', e.target.value)} className="input-field text-sm" placeholder="3" min="0" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1"><Glyph e="🛡" /> {L('Warranty (optional)', 'وارنٹی (اختیاری)', 'الضمان (اختياري)')}</label>
                                <select value={WARRANTY_OPTIONS.some(o => o.v === (form.warranty || '')) ? (form.warranty || '') : '__other'}
                                  onChange={(e: any) => setItemField(i, 'warranty', e.target.value === '__other' ? ' ' : e.target.value)} className="input-field text-sm">
                                  {WARRANTY_OPTIONS.map(o => <option key={o.v} value={o.v}>{locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}</option>)}
                                  <option value="__other">{L('Other…', 'دیگر…', 'أخرى…')}</option>
                                </select>
                                {!WARRANTY_OPTIONS.some(o => o.v === (form.warranty || '')) && (
                                  <input value={(form.warranty || '').trimStart()} onChange={(e: any) => setItemField(i, 'warranty', e.target.value || ' ')}
                                    className="input-field text-sm mt-1.5" maxLength={80} placeholder={L('e.g. 18 months on the motor', 'مثال: موٹر پر 18 مہینے', 'مثال: 18 شهراً على المحرك')} />
                                )}
                              </div>
                              <div className="sm:col-span-2">
                                {form.file ? (
                                  <div className="flex items-center gap-3 bg-[#0B2438]/5 rounded-xl p-2.5 border border-[#0B2438]/20">
                                    <span className="text-xl"><Glyph e="📄" /></span>
                                    <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#0B2438' }}>{form.file.name}</span>
                                    <button type="button" onClick={() => setItemFile(i, null)} className="text-xs text-red-500 hover:underline">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-2.5 cursor-pointer hover:border-[#D4A543]/50 transition-all">
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={(e: any) => setItemFile(i, e.target.files?.[0] ?? null)} />
                                    <span className="text-lg"><Glyph e="📤" /></span>
                                    <span className="text-xs text-gray-500">{L('Attach a catalog / datasheet (optional)', 'کیٹلاگ منسلک کریں (اختیاری)', 'أرفق كتالوجاً أو بيانات المنتج (اختياري)')}</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{L('Goods Price (SAR)', 'سامان کی قیمت (SAR)', 'سعر البضاعة (ر.س)')} *</label>
                    <input type="number" value={totalPrice} onChange={(e: any) => handleTotalChange(e.target.value)}
                      className="input-field" placeholder="0.00" required min="0" step="any" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.unitPrice}</label>
                      <input type="number" value={unitPrice} onChange={(e: any) => setUnitPrice(e.target.value)}
                        className="input-field bg-gray-50" placeholder={L('Auto', 'خودکار', 'تلقائي')} min="0" step="any" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.deliveryDays}</label>
                      <input type="number" value={deliveryDays} onChange={(e: any) => setDeliveryDays(e.target.value)}
                        className="input-field" placeholder="3" min="0" />
                    </div>
                  </div>
                </>
              )}
              {/* خصائص المنتج — للطلب أحادي المادة فقط (متعدد المواد: الخصائص لكل مادة بداخل بطاقتها) */}
              {!isMultiItem && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5"><Glyph e="🛡" /> {L('Warranty (optional)', 'وارنٹی (اختیاری)', 'الضمان (اختياري)')}</label>
                <select value={singleWarranty} onChange={(e: any) => setSingleWarranty(e.target.value)} className="input-field text-sm">
                  {WARRANTY_OPTIONS.map(o => <option key={o.v} value={o.v}>{locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}</option>)}
                </select>
              </div>
              )}
              {!isMultiItem && (
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold mb-1" style={{ color: '#0B2438' }}>{T.attributes}</label>
                <p className="text-xs text-gray-400 mb-3">{T.attrHint}</p>
                <div className="space-y-2">
                  {attributes.map((attr: any, i: any) => (
                    <div key={i} className="flex gap-2">
                      <input value={attr.key} onChange={(e: any) => updateAttribute(i, 'key', e.target.value)}
                        className="input-field text-sm flex-1" placeholder={T.attrKey} />
                      <input value={attr.value} onChange={(e: any) => updateAttribute(i, 'value', e.target.value)}
                        className="input-field text-sm flex-1" placeholder={T.attrValue} />
                      {attributes.length > 1 && (
                        <button type="button" onClick={() => removeAttribute(i)}
                          className="w-10 min-h-[40px] grid place-items-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 shrink-0">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAttribute}
                  className="mt-2 text-xs font-semibold" style={{ color: '#D4A543' }}>{T.addAttr}</button>
              </div>
              )}

              {/* إرفاق ملف (كتالوج) — للطلب أحادي المادة فقط (متعدد المواد: كتالوج لكل مادة) */}
              {!isMultiItem && (
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="📎" /> {T.attachTitle}</label>
                <p className="text-xs text-gray-400 mb-3">{T.attachHint}</p>
                {attachFile ? (
                  <div className="flex items-center gap-3 bg-[#0B2438]/5 rounded-xl p-3 border border-[#0B2438]/20">
                    <span className="text-2xl"><Glyph e="📄" /></span>
                    <span className="text-sm font-semibold flex-1 truncate" style={{ color: '#0B2438' }}>{attachFile.name}</span>
                    <button type="button" onClick={() => setAttachFile(null)}
                      className="text-xs text-red-500 hover:underline">{T.removeAttach}</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#D4A543]/50 transition-all">
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                      onChange={async e => {
                        const f = e.target.files?.[0] ?? null
                        if (!f) { setAttachFile(null); return }
                        const v = await validateUploadFile(f)
                        if (!v.ok) { setError(v.error || ''); e.currentTarget.value = ''; setAttachFile(null); return }
                        setError(''); setAttachFile(f)
                      }} />
                    <span className="text-2xl"><Glyph e="📤" /></span>
                    <span className="text-sm text-gray-500">{T.attachBtn}</span>
                  </label>
                )}
              </div>
              )}
            </div>
          </form>
        )}
        </div>{/* main */}

        {/* SIDE (sticky on desktop): request details, then the offer summary and the send button */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🏗" /> {T.sector}</span><br/><strong>{rfqIsMulti ? [...new Set(myItems.map((it: any) => it.sector))].map((s: string) => (sectors as any)[s] || s).join(' + ') : ((sectors as any)[rfq.sector] || rfq.sector)}</strong></div>
            {(!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="📦" /> {T.qty}</span><br/><strong>{rfq.quantity} {getUnitLabel(rfq.unit, locale)}</strong></div>}
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="📍" /> {T.location}</span><br/><strong>{rfq.city || rfq.region}</strong></div>
            <div className={`rounded-lg p-3 col-span-2 ${rfq.delivery_required ? 'bg-amber-50 border border-amber-200' : 'bg-[#f4f6f9]'}`}>
              <span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🚚" /> {T.delivery}</span><br/>
              {rfq.delivery_required ? (
                <div className="flex items-center justify-between gap-2 flex-wrap mt-0.5">
                  <strong className="text-amber-800">{T.required}{rfq.delivery_location ? ` — ${rfq.delivery_location}` : ''}</strong>
                  {(rfq.delivery_geo || rfq.delivery_location) && (
                    <a href={rfq.delivery_geo ? `https://www.google.com/maps?q=${rfq.delivery_geo}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rfq.delivery_location)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold text-white rounded-lg px-3 py-1.5 hover:opacity-90 whitespace-nowrap shrink-0" style={{ background: '#0B2438' }}>
                      <Glyph e="📍" /> {L('Open in Maps', 'نقشے میں کھولیں', 'افتح في الخرائط')}
                    </a>
                  )}
                </div>
              ) : <strong className="text-gray-500">{T.notRequired}</strong>}
            </div>
            <div className="bg-[#f4f6f9] rounded-lg p-3">
              <span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🏢" /> {T.contractor}</span><br/>
              {contractorInfo?.revealed && contractorInfo?.company_name_ar ? (
                <strong>{locale === 'en' && contractorInfo.company_name_en ? contractorInfo.company_name_en : contractorInfo.company_name_ar}</strong>
              ) : (
                <>
                  <strong className="text-gray-600">{L('Buyer', 'خریدار', 'مشترٍ')} · {rfq.city || rfq.region}</strong>
                  <div className="text-[10px] text-gray-400 mt-0.5"><Glyph e="🔒" /> {L('Buyer identity is revealed once your offer is accepted.', 'آپ کی آفر قبول ہونے پر خریدار کی شناخت ظاہر ہو گی۔', 'تظهر هوية المشتري عند قبول عرضك (إتمام الصفقة).')}</div>
                </>
              )}
            </div>
            {rfq.specification && (!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="⚙" /> {T.spec}</span><br/><strong>{rfq.specification}</strong></div>}
            {cleanNotes && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="📝" /> {T.notes}</span><br/>{cleanNotes}</div>}
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🗓" /> {L('Posted', 'درخواست کی تاریخ', 'تاريخ الطلب')}</span><br/><strong className="text-sm">{formatDateTime(rfq.created_at)}</strong></div>
            {rfq.expires_at && (
              <div className="rounded-lg p-3" style={{ background: urgencyStyle(deadlineUrgency(rfq.expires_at)).bg, border: `1px solid ${urgencyStyle(deadlineUrgency(rfq.expires_at)).border}` }}>
                <span className="text-gray-500 text-[12px] font-semibold"><Glyph e="⏰" /> {L('Pricing deadline', 'قیمت دینے کی آخری تاریخ', 'مهلة التسعير')}</span><br/>
                <strong className="text-sm" style={{ color: urgencyStyle(deadlineUrgency(rfq.expires_at)).fg }}>{formatDateTime(rfq.expires_at)}</strong>
                <span className="text-xs block font-bold" style={{ color: urgencyStyle(deadlineUrgency(rfq.expires_at)).fg }}>{expired ? '' : `(${formatTimeLeft(rfq.expires_at, locale)})`}</span>
              </div>
            )}
          </div>
          {/* ملف المواصفات المرفق */}
          {specFileUrl && (
            <a href={fileHref(specFileUrl)} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 bg-[#D4A543]/5 border border-blue-200 rounded-xl p-3 hover:bg-blue-100 transition-all">
              <span className="text-xl"><Glyph e="📎" /></span>
              <span className="text-sm font-semibold text-[#9D7425] flex-1">{T.attachedFile}</span>
              <span className="text-xs text-[#9D7425]">{T.viewFile} ←</span>
            </a>
          )}
          </div>
          {pricingOpen && (isMultiItem ? myItems.length > 0 : true) && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold" style={{ color: '#0B2438' }}><Glyph e="🧾" /> {L('Your offer', 'آپ کی آفر', 'عرضك')}</h3>
                {isMultiItem && <span className="text-xs font-bold" style={{ color: pricedCount ? '#0F6E56' : '#9aa3b2' }}>{L(`${pricedCount} of ${myItems.length} priced`, `${myItems.length} میں سے ${pricedCount}`, `سعّرت ${pricedCount} من ${myItems.length}`)}</span>}
              </div>
              {rfq.delivery_required && (
              <div className="border-t border-gray-100 pt-4">
                  <div>
                    <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}><Glyph e="🚚" /> {L('Delivery cost', 'ڈیلیوری کی لاگت', 'تكلفة التوصيل')} <span className="text-red-500">*</span></div>
                    <div role="radiogroup" className="flex flex-wrap gap-2">
                      {([['included', L('Included in my price', 'قیمت میں شامل', 'مشمولة في سعري')], ['free', L('Free', 'مفت', 'مجاناً')], ['amount', L('An amount', 'رقم', 'مبلغ')]] as const).map(([k, label]) => (
                        <button key={k} type="button" role="radio" aria-checked={delivMode === k} onClick={() => setDelivMode(k)}
                          className={`px-3 py-2 rounded-xl border-2 text-sm font-bold ${delivMode === k ? 'border-[#0F6E56] bg-[#0F6E56]/5 text-[#0F6E56]' : 'border-gray-200 bg-white text-gray-600'}`}>{label}</button>
                      ))}
                      {delivMode === 'amount' && (
                        <input type="number" value={delivAmount} onChange={(e: any) => setDelivAmount(e.target.value)} min="0" step="any"
                          className="input-field text-sm w-32" placeholder={L('SAR', 'ریال', 'ر.س')} aria-label={L('Delivery amount', 'ڈیلیوری رقم', 'مبلغ التوصيل')} />
                      )}
                    </div>
                  </div>
              </div>
              )}
              {/* ضريبة القيمة المضافة 15% — خيار: هل السعر يشملها؟ + تفصيل الإجمالي */}
              {(() => {
                const { entered, net, vat, gross } = offerTotals()
                const fmt = (n: any) => (+n.toFixed(2)).toLocaleString('en-US')
                return (
                  <div className="border-t border-gray-100 pt-4">
                    {/* خيار شمول الضريبة — إلزامي وصريح، بلا قيمة افتراضية (لا يظهر للبائع المستقل غير المسجّل ضريبياً) */}
                    <p className="mb-3 text-sm font-semibold rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
                      <Glyph e="🧾" /> {L('Enter your prices including 15% VAT. This is what the buyer pays.', 'اپنی قیمتیں 15% ٹیکس سمیت درج کریں۔ یہی رقم خریدار ادا کرے گا۔', 'أدخل أسعارك شاملةً ضريبة القيمة المضافة (15%)، فهذا ما يدفعه المشتري.')}
                    </p>
                    {/* تفصيل الإجمالي */}
                    {entered > 0 && noVat && (
                      <div className="bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-xl p-3 text-sm flex items-center justify-between">
                        <span className="font-bold" style={{ color: '#0F6E56' }}>{L('Total incl. VAT', 'کل رقم ٹیکس سمیت', 'الإجمالي شامل الضريبة')}</span>
                        <span className="text-lg font-extrabold" style={{ color: '#0F6E56' }}>{fmt(entered)} {SAR}</span>
                      </div>
                    )}
                    {entered > 0 && !noVat && vatIncluded !== null && (
                      <div className="bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-xl p-3 text-sm space-y-1.5">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{L('Net (before VAT)', 'خالص (ٹیکس سے پہلے)', 'الصافي (قبل الضريبة)')}</span>
                          <span className="font-semibold">{fmt(net)} {SAR}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{L('VAT 15%', 'ویٹ (VAT) 15%', 'ضريبة القيمة المضافة 15%')}</span>
                          <span className="font-semibold">+ {fmt(vat)} {SAR}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#0F6E56]/20 pt-1.5">
                          <span className="font-bold" style={{ color: '#0F6E56' }}>{L('Grand Total (incl. VAT)', 'کل رقم (ٹیکس سمیت)', 'الإجمالي شامل الضريبة')}</span>
                          <span className="text-lg font-extrabold" style={{ color: '#0F6E56' }}>{fmt(gross)} {SAR}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {isIndependent && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    {L('Where does this price come from?', 'یہ قیمت کہاں سے ہے؟', 'من أين هذا السعر؟')}
                    {isIndependent && <span className="text-red-500"> *</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_TYPES.map(o => (
                      <button type="button" key={o.k} onClick={() => setSourceType(o.k)} aria-pressed={sourceType === o.k}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sourceType === o.k ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-[#0B2438]/40'}`}
                        style={sourceType === o.k ? { background: '#0B2438' } : {}}>
                        <SellerIcon name={o.icon} /> {locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{L('The buyer sees this. A price you collected from someone else is shown as such, never as a direct quote.', 'خریدار یہ دیکھتا ہے۔ جو قیمت آپ کسی اور سے لے کر دیتے ہیں وہ اسی طرح دکھائی جاتی ہے، براہ راست آفر کے طور پر نہیں۔', 'يظهر هذا للمشتري. السعر الذي تنقله من جهة أخرى يُعرض كذلك، ولا يُعرض كعرض مباشر.')}</p>
                </div>
              </div>
              )}
              {/* everything optional folds away (persona review: about 30 controls on one phone screen) */}
              <div className="border-t border-gray-100 pt-3">
                <button type="button" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}
                  className="w-full flex items-center justify-between text-sm font-bold py-2" style={{ color: '#0B2438' }}>
                  <span>{L('More options (optional)', 'مزید اختیارات (اختیاری)', 'خيارات أخرى (اختياري)')}</span>
                  <span className="text-xs font-semibold text-gray-400">{showMore ? '▴' : L('payment, availability, validity, notes ▾', 'ادائیگی، دستیابی، مدت، نوٹس ▾', 'الدفع، التجهيز، مدة السعر، ملاحظات ▾')}</span>
                </button>
                {showMore && (
                <div className="space-y-4 pt-2">
                {/* شروط الدفع (اختياري) — تظهر للمشتري على العرض وأمر الشراء */}
                <div>
                  <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}><Glyph e="💳" /> {L('Payment terms (optional)', 'ادائیگی کی شرائط (اختیاری)', 'شروط الدفع (اختياري)')}</div>
                  <div role="radiogroup" className="flex flex-wrap gap-2">
                    {PAYMENT_TERMS.map(pt => (
                      <button key={pt.key} type="button" role="radio" aria-checked={payTerms === pt.key} onClick={() => setPayTerms(payTerms === pt.key ? null : pt.key)}
                        className={`px-3 py-2 rounded-xl border-2 text-sm font-bold ${payTerms === pt.key ? 'border-[#0F6E56] bg-[#0F6E56]/5 text-[#0F6E56]' : 'border-gray-200 bg-white text-gray-600'}`}>
                        {locale === 'en' ? pt.en : locale === 'ur' ? pt.ur : pt.ar}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>{L('Other charges (installation, fees…)', 'دیگر چارجز (تنصیب، فیس…)', 'مبالغ أخرى (تركيب، رسوم…)')}</div>
                <div className="space-y-2">
                  {extras.map((ex: any, i: any) => (
                    <div key={i} className="flex gap-2">
                      <input value={ex.label} onChange={(e: any) => updateExtra(i, 'label', e.target.value)}
                        className="input-field text-sm flex-1" placeholder={L('Item (e.g. Delivery)', 'آئٹم (مثلاً ڈیلیوری)', 'البند (مثال: توصيل)')} />
                      <input type="number" value={ex.amount} onChange={(e: any) => updateExtra(i, 'amount', e.target.value)}
                        className="input-field text-sm w-24" placeholder={L('Amount', 'رقم', 'المبلغ')} min="0" step="any" />
                      {extras.length > 1 && (
                        <button type="button" onClick={() => removeExtra(i)}
                          className="w-10 min-h-[40px] grid place-items-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 shrink-0">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addExtra} className="mt-2 text-xs font-semibold" style={{ color: '#D4A543' }}>
                  + {L('Add item', 'شامل کریں', 'إضافة بند')}
                </button>
                </div>
                {!isIndependent && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    {L('Where does this price come from?', 'یہ قیمت کہاں سے ہے؟', 'من أين هذا السعر؟')}
                    {isIndependent && <span className="text-red-500"> *</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_TYPES.map(o => (
                      <button type="button" key={o.k} onClick={() => setSourceType(o.k)} aria-pressed={sourceType === o.k}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sourceType === o.k ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-[#0B2438]/40'}`}
                        style={sourceType === o.k ? { background: '#0B2438' } : {}}>
                        <SellerIcon name={o.icon} /> {locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{L('The buyer sees this. A price you collected from someone else is shown as such, never as a direct quote.', 'خریدار یہ دیکھتا ہے۔ جو قیمت آپ کسی اور سے لے کر دیتے ہیں وہ اسی طرح دکھائی جاتی ہے، براہ راست آفر کے طور پر نہیں۔', 'يظهر هذا للمشتري. السعر الذي تنقله من جهة أخرى يُعرض كذلك، ولا يُعرض كعرض مباشر.')}</p>
                </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">{L('Availability', 'دستیابی', 'التوفّر')}</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY.map(o => (
                      <button type="button" key={o.k} onClick={() => setAvailability(o.k)} aria-pressed={availability === o.k}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${availability === o.k ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-[#0F6E56]/40'}`}
                        style={availability === o.k ? { background: '#0F6E56' } : {}}>
                        <SellerIcon name={o.icon} /> {locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}
                      </button>
                    ))}
                  </div>
                </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">⏱ {L('Price valid for', 'قیمت کتنی دیر کے لیے درست ہے', 'مدة صلاحية السعر')}</label>
                <div className="flex flex-wrap gap-2">
                  {[{ v: '1', l: L('24h', '24 گھنٹے', '٢٤ ساعة') }, { v: '3', l: L('3 days', '3 دن', '٣ أيام') }, { v: '7', l: L('1 week', '1 ہفتہ', 'أسبوع') }, { v: '30', l: L('1 month', '1 مہینہ', 'شهر') }].map((o) => (
                    <button type="button" key={o.v} onClick={() => setPriceValidity(o.v)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${priceValidity === o.v ? 'text-[#071827] border-transparent' : 'border-gray-200 text-gray-600 hover:border-[#D4A543]/40'}`}
                      style={priceValidity === o.v ? { background: '#D4A543' } : {}}>{o.l}</button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{L('Your price is guaranteed until it expires — ideal for volatile materials (e.g. steel).', 'آپ کی قیمت مدت ختم ہونے تک پکی رہے گی — ان چیزوں کے لیے اچھا ہے جن کی قیمت بدلتی رہتی ہے (جیسے سریا)۔', 'سعرك مضمون حتى انتهاء المدة — مناسب للمواد المتغيّرة السعر (كالحديد).')}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.offerNotes}</label>
                <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)}
                  className="input-field" rows={3} placeholder="..." />
              </div>
                </div>
                )}
              </div>
            {(() => {
              // سبب تعطيل زر الإرسال يظهر صراحةً، وملخّص ما سيراه المشتري قبل الإرسال
              const blockReason = sendBlockReason()
              const { gross } = offerTotals()
              const fmtG = (+gross.toFixed(2)).toLocaleString('en-US')
              return (
            <div className="mt-5 space-y-3">
              {!blockReason && gross > 0 && (
                <div className="rounded-xl px-3 py-2.5 text-sm font-bold text-center border" style={{ background: '#0F6E560D', borderColor: '#0F6E5633', color: '#0F6E56' }} aria-live="polite">
                  {L(`The buyer will see: ${fmtG} SAR incl. VAT`, `خریدار دیکھے گا: ${fmtG} ریال ٹیکس سمیت`, `سيرى المشتري: ${fmtG} ر.س شاملاً الضريبة`)}
                </div>
              )}
              <button type="submit" form="offer-form" disabled={submitting || !!blockReason} aria-describedby={blockReason ? 'offer-block-reason' : undefined}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg"
                style={{ background: '#0F6E56' }}>
                {submitting ? T.sending : T.send}
              </button>
              {blockReason && !submitting && (
                <p id="offer-block-reason" className="text-xs text-center font-semibold text-amber-700" aria-live="polite"><Glyph e="⚠" /> {blockReason}</p>
              )}
              {error && <p role="alert" className="text-xs text-center font-semibold text-red-600">{error}</p>}
              <p className="text-[12px] text-center text-gray-500">{L('You can edit or cancel the offer within 15 minutes of sending.', 'بھیجنے کے 15 منٹ تک آپ آفر بدل یا منسوخ کر سکتے ہیں۔', 'يمكنك تعديل العرض أو إلغاؤه خلال 15 دقيقة من إرساله.')}</p>
              <button type="button" onClick={() => setShowDismiss(true)}
                className="w-full py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline">
                {T.dismiss}
              </button>
            </div>
              )
            })()}
            </div>
          )}
        </aside>
      </div>

      {/* phone: the send bar stays above the bottom menu (persona review: the button was under every card) */}
      {pricingOpen && !success && (isMultiItem ? myItems.length > 0 : true) && (() => {
        const br = sendBlockReason(); const { gross } = offerTotals()
        return (<>
          <div className="lg:hidden h-20" aria-hidden />
          <div className="lg:hidden fixed inset-x-0 z-30 px-3 pb-2" style={{ bottom: 'calc(3.9rem + env(safe-area-inset-bottom))' }}>
            <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0 text-[12px] leading-tight">
                {isMultiItem && <div className="font-bold" style={{ color: pricedCount ? '#0F6E56' : '#6b7280' }}>{L(`${pricedCount} of ${myItems.length} priced`, `${myItems.length} میں سے ${pricedCount}`, `سعّرت ${pricedCount} من ${myItems.length}`)}</div>}
                {br ? <div className="text-amber-700 font-semibold truncate">{br}</div>
                  : <div className="font-extrabold text-[14px]" style={{ color: '#0B2438' }}>{(+gross.toFixed(2)).toLocaleString('en-US')} {SAR}</div>}
              </div>
              <button type="submit" form="offer-form" disabled={submitting || !!br}
                className="shrink-0 min-h-[44px] px-5 rounded-xl font-bold text-white text-sm disabled:opacity-40" style={{ background: '#0F6E56' }}>
                {submitting ? T.sending : T.send}
              </button>
            </div>
          </div>
        </>)
      })()}

      {/* Dismiss Modal */}
      {showDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={dir}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="text-4xl text-center mb-3"><Glyph e="🚫" /></div>
            <h3 className="text-lg font-bold text-center mb-1" style={{ color: '#0B2438' }}>{T.dismissTitle}</h3>
            <p className="text-sm text-gray-500 text-center mb-4">{T.dismissSub}</p>
            <textarea value={dismissReason} onChange={(e: any) => setDismissReason(e.target.value)}
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
