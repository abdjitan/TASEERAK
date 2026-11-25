'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { friendlyError } from '@/lib/friendlyError'
import { createClient } from '@/lib/supabase/client'
import { waLink } from '@/lib/wa'
import { fileHref } from '@/lib/fileHref'
import { useTranslation } from '@/i18n'
import Glyph from '@/components/shared/Glyph'
import { compressImage, DOC_MAX_SIDE } from '@/lib/compressImage'
import { askConfirm } from '@/lib/askConfirm'
import { storedBuyerType } from '@/lib/buyerType'
import { paymentTermsLabel } from '@/lib/paymentTerms'
import { offerComparable, sellerInvoiceLabel, invoiceGateText, isIndependentOffer, sarLabel, buyerBasisTag } from '@/lib/vat'
import { buttonClass } from '@/components/shared/Button'
import { agentCapText } from '@/lib/sellers'
import { payDueAt, payDueSoon, expectedDeliveryDate, deliveryLate, deliveryDueAhead, deliveryDueToday } from '@/lib/dealStage'

// حماية الصفقة: محضر استلام + تأكيد دفع + نزاع (للطرفين).
// مكوّن مشترك يُعرض في صفحة الصفقة لكلٍّ من المشتري والمورد (كلٌّ يرى أزراره).
// الفاتورة يصدرها البائع ويرفعها هنا؛ مستند الصفقة في المنصة غير رسمي.
// UX audit 2026-11-23: the next step is the one gold button (44px), the rest navy outline; green
// only for what is complete. The seller uploads the invoice BEFORE confirming delivery, so on the
// seller's side the invoice comes first and is a tracker step.

type Party = { company_name_ar?: string; company_name_en?: string; full_name?: string; phone?: string; contact_phone?: string; supplier_tier?: string; provider_type?: string; vat_number?: string | null } | null

const GOLD = { background: '#D4A543', color: '#071827' }
// the shared button (round-4 UX-103): gold = the next step, navy outline = the rest, 44px tall
const LAYOUT = 'w-full sm:w-auto px-4 text-sm whitespace-nowrap gap-1.5'
const BTN = 'min-h-11 w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 whitespace-nowrap inline-flex items-center justify-center gap-1.5'
const PRIMARY = buttonClass('primary', `${LAYOUT} font-extrabold`)
const OUTLINE = buttonClass('ghost', `${LAYOUT} border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5`)

export default function DealProtection({
  offer: initialOffer,
  isContractor,
  isSupplier,
  otherParty,
  poNumber,
  amount,
  rfqRefNo,
  sellerTier,
  managedByOwner,
  hideContact,
  isHome,
  pickup,
  pickupPlace,
  onChange,
}: {
  offer: any
  isContractor: boolean
  isSupplier: boolean
  otherParty: Party
  poNumber: string
  myId?: string | null
  /** What the buyer pays on this deal (award-scoped, VAT-aware). Falls back to the offer total for a one-item offer. */
  amount?: number | null
  /** The request number (rfqs.ref_no), for the plain WhatsApp text of a home buyer. */
  rfqRefNo?: string | number | null
  /** The seller's tier when the offer row carries no supplier join (the seller's own page). */
  sellerTier?: string | null
  /** A company team member: sees the progress, the owner manages the deal (UX-126). */
  managedByOwner?: boolean
  /** The page already shows its own WhatsApp / contact button: do not repeat it here (UX-054). */
  hideContact?: boolean
  /** The buyer is a home buyer (profiles.buyer_type), from the page's profile: wins over the device copy (UX-068). */
  isHome?: boolean
  /** The buyer collects the goods from the supplier's shop (rfqs.delivery_required = false) (round-4 UX-035). */
  pickup?: boolean
  /** Where the goods are collected (the supplier's city), shown on a pickup deal. */
  pickupPlace?: string | null
  /** Called with the updated offer after every deal step, so the page's copy never goes stale (UX-069). */
  onChange?: (offer: any) => void
}) {
  const [offer, setOffer] = useState<any>(initialOffer)
  // a fresh copy from the page (realtime, tab focus) replaces ours (round-4 UX-004)
  useEffect(() => { setOffer(initialOffer) }, [initialOffer])
  const [busy, setBusy] = useState('')
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [invErr, setInvErr] = useState('')
  const [actErr, setActErr] = useState('')
  const [notice, setNotice] = useState('')
  const [justReceived, setJustReceived] = useState(false)
  const [home, setHome] = useState(false)
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'
  useEffect(() => { setHome(isContractor && (isHome ?? storedBuyerType() === 'individual')) }, [isContractor, isHome])
  // tell the page about every change of the deal (rating card, stage chips) (UX-069)
  useEffect(() => { if (offer !== initialOffer) onChange?.(offer) }, [offer]) // eslint-disable-line react-hooks/exhaustive-deps

  // The VAT/independence helpers read offer.supplier: on the buyer's page that is the seller; on the
  // seller's own page otherParty is the BUYER, so only sellerTier tells who the seller is.
  const vo = offer.supplier ? offer
    : sellerTier ? { ...offer, supplier: { supplier_tier: sellerTier } }
    : isContractor && otherParty ? { ...offer, supplier: otherParty } : offer

  // round-6 UX-145: a pricing agent's successful deal (receipt confirmed, no open problem) shows its
  // progress towards a higher deal cap (migration 214, my_agent_deal_cap)
  const agentSuccess = isSupplier && !managedByOwner && !offer.deal_closed_at && isIndependentOffer(vo) && !!offer.received_at && offer.dispute_status !== 'open'
  const [agentCap, setAgentCap] = useState<any>(null)
  useEffect(() => {
    if (!agentSuccess) return
    createClient().rpc('my_agent_deal_cap').then(({ data }: any) => setAgentCap(data || null))
  }, [agentSuccess])

  // The seller uploads its invoice (its own, or the source shop's for a pricing agent); it is attached to the deal.
  async function uploadInvoice(file: File | null | undefined) {
    if (!file) return
    setInvErr(''); setBusy('invoice')
    const fd = new FormData(); fd.append('file', await compressImage(file, { maxSide: DOC_MAX_SIDE })) // invoice: keep text legible
    const res = await fetch('/api/upload-attachment', { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) { setInvErr(j?.message || L('Could not upload the file. Make sure it is a PDF or an image, and try again.', 'فائل اپ لوڈ نہیں ہو سکی۔ یقینی بنائیں کہ فائل PDF یا تصویر ہے، اور دوبارہ کوشش کریں۔', 'تعذّر رفع الملف. تأكّد أن الملف PDF أو صورة، وحاول مرة أخرى.')); setBusy(''); return }
    const { data, error } = await createClient().rpc('attach_supplier_invoice', { p_offer_id: offer.id, p_url: j.url, p_name: j.name || file.name })
    if (error) setInvErr(friendlyError(error.message, L('Could not attach the invoice. Make sure it is a PDF or an image, and try again.', 'انوائس منسلک نہیں ہو سکی۔ یقینی بنائیں کہ فائل PDF یا تصویر ہے، اور دوبارہ کوشش کریں۔', 'تعذّر إرفاق الفاتورة. تأكّد أن الملف PDF أو صورة، وحاول مرة أخرى.'), locale))
    else if (data) setOffer((prev: any) => ({ ...prev, ...(data as any) }))
    setBusy('')
  }

  // Every deal transition goes through a trusted server function (RPC), never a direct update: the
  // server checks the role and the current state and stamps the time itself.
  async function callRpc(fn: string, params: Record<string, any>, label: string): Promise<boolean> {
    setBusy(label); setActErr(''); setNotice('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc(fn, params)
    if (error) {
      setActErr(L('Could not complete the action: ', 'کارروائی مکمل نہیں ہو سکی: ', 'تعذّر إتمام العملية: ') + friendlyError(error.message, L('Refresh the page and try again.', 'صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'حدّث الصفحة وحاول مرة أخرى.'), locale))
      setBusy(''); return false
    }
    if (data) setOffer((prev: any) => ({ ...prev, ...(data as any) }))
    setBusy('')
    return true
  }

  if (offer.status !== 'accepted' || !(isContractor || isSupplier)) return null

  // a deal the admins closed (a dispute resolved by cancelling it): no buttons, no delay alerts (round-4 UX-088)
  const closed = !!offer.deal_closed_at
  // a company team member follows the deal; the owner acts on it (round-4 UX-079)
  const observer = !!managedByOwner
  const canAct = !observer && !closed
  const ref = rfqRefNo != null && rfqRefNo !== '' ? String(rfqRefNo) : ''
  const waText = isContractor
    ? L(`Regarding my deal${ref ? ` on request no. ${ref}` : ` ${poNumber}`} on Taseerak`,
        `تسعیرک پر میری ڈیل${ref ? ` (درخواست نمبر ${ref})` : ` ${poNumber}`} کے بارے میں`,
        home ? (ref ? `بخصوص صفقتي على الطلب رقم ${ref} في منصة تسعيرك` : 'بخصوص صفقتي في منصة تسعيرك') : `بخصوص أمر الشراء ${poNumber} في منصة تسعيرك`)
    : L(`Regarding your deal${ref ? ` on request no. ${ref}` : ` ${poNumber}`} on Taseerak`,
        `تسعیرک پر آپ کی ڈیل${ref ? ` (درخواست نمبر ${ref})` : ` ${poNumber}`} کے بارے میں`,
        ref ? `بخصوص طلبك رقم ${ref} في منصة تسعيرك` : `بخصوص الصفقة ${poNumber} في منصة تسعيرك`)
  const w = waLink(otherParty?.contact_phone || otherParty?.phone, waText)

  // Late stages: a visual alert on top of the hourly bell reminders. No agreed delivery time → no
  // «late» accusation, a dark-gold note instead (UX-095).
  const hasDays = Number(offer.delivery_days) > 0
  // round-6 UX-001: one rule for the date and the «late» check (working days in Riyadh, Fridays skipped)
  const deliverOverdue = !closed && deliveryLate(offer)
  // the expected delivery day, shown until delivery/receipt/cancellation or until the day has passed (UX-145)
  const dueAt = expectedDeliveryDate(offer)
  const dueToday = deliveryDueToday(offer)
  const dueText = dueAt ? dueAt.toLocaleDateString(dloc, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' }) : ''
  const showDue = !closed && !!dueAt && deliveryDueAhead(offer) && !offer.supplier_delivered_at && !offer.received_at
  const noFridays = L('(Fridays not counted)', '(جمعہ شامل نہیں)', '(دون احتساب أيام الجمعة)')
  // «أضف إلى التقويم»: an all-day event on the expected day, UTF-8 with a BOM so Arabic titles open right (UX-099)
  function downloadIcs() {
    if (!dueAt) return
    const ymd = dueAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }).replace(/-/g, '')
    const next = new Date(dueAt.getTime() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }).replace(/-/g, '')
    const title = isSupplier
      ? (pickup ? L('Have the order ready (Taseerak)', 'آرڈر تیار رکھیں (تسعیرک)', 'تجهيز الطلب (تسعيرك)') : L('Deliver the order (Taseerak)', 'آرڈر پہنچائیں (تسعیرک)', 'توصيل الطلب (تسعيرك)'))
      : (pickup ? L('Pick up my order (Taseerak)', 'میرا آرڈر وصول کریں (تسعیرک)', 'استلام طلبي (تسعيرك)') : L('My order arrives (Taseerak)', 'میرا آرڈر پہنچے گا (تسعیرک)', 'وصول طلبي (تسعيرك)'))
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taseerak//Deal//AR', 'BEGIN:VEVENT', `UID:${offer.id}@taseerak`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${title}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'taseerak-delivery.ics'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const receiptOverdue = !closed && !!offer.supplier_delivered_at && !offer.received_at && (new Date(offer.supplier_delivered_at).getTime() + 48 * 3600000 < Date.now())
  const paid = offer.payment_status === 'paid'
  // payment terms (round-4 UX-034): «دفع مقدّم» is paid before delivery; «آجل» is due 30/60 days after receipt
  const advance = offer.payment_terms === 'advance'
  const advanceDue = advance && !paid && !offer.supplier_delivered_at && !offer.received_at
  const dueAtPay = payDueAt(offer)
  const dueSoon = payDueSoon(offer)
  const dueTextPay = dueAtPay ? dueAtPay.toLocaleDateString(dloc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' }) : ''
  // the buyer's payment button is gold when paying is the next step
  const payIsNext = !paid && (advanceDue || (!!offer.received_at && (!dueAtPay || dueSoon)))
  // one date format on the deal (round-5 UX-149): day, month name, hour:minute, Riyadh time, no seconds
  const fmtDate = (d: any) => new Date(d).toLocaleString(dloc, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })
  const dueLate = !closed && !paid && !!dueAtPay && Date.now() > dueAtPay.getTime()
  // a step still open on a deal the admins cancelled (round-5 UX-052)
  const notDone = L('This step was not completed before the cancellation', 'یہ مرحلہ منسوخی سے پہلے مکمل نہیں ہوا', 'لم تكتمل هذه الخطوة قبل الإلغاء')
  const SAR = sarLabel(locale)
  const dealAmount = amount != null && amount > 0 ? amount
    : (!Array.isArray(offer.item_prices) || offer.item_prices.length <= 1) ? offerComparable(vo) : null
  const fmtAmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const terms = paymentTermsLabel(offer.payment_terms, locale)
  // delivery/other charges the supplier still has to confirm are not in the amount yet (UX-072)
  const extrasPending = !!offer.extras_pending && Array.isArray(offer.extra_charges) && offer.extra_charges.length > 0
  // UX-055: a home buyer sees the short «فاتورة البائع» (the source shop wording only on a pricing agent's offer)
  const invoiceTitle = home && !isIndependentOffer(vo) ? L('The supplier’s invoice', 'سپلائر کی انوائس', 'فاتورة المورد') : sellerInvoiceLabel(vo, locale, isSupplier ? 'supplier' : 'buyer')
  // who reported the open problem: the supplier side or the buyer (UX-045)
  // the buyer's name for the seller's invoice (round-5 UX-050; the page passes the buyer's profile after the award)
  const buyerName = isSupplier ? (otherParty?.company_name_ar || otherParty?.company_name_en || otherParty?.full_name || '') : ''
  const reportedBySupplier = !!offer.dispute_by && offer.dispute_by === offer.supplier_id
  async function messageOtherSide() {
    const { data, error } = await createClient().rpc('get_or_create_conversation', { p_rfq_id: offer.rfq_id, p_supplier_id: offer.supplier_id })
    if (error || !data) { setActErr(L('Could not open the conversation. Try again.', 'گفتگو نہیں کھل سکی۔ دوبارہ کوشش کریں۔', 'تعذّر فتح المحادثة. حاول مرة أخرى.')); return }
    window.location.href = `/messages?c=${data}`
  }

  // The tracker: the seller's invoice is a step of its own on the seller's side (UX-127).
  const paidStep = { k: 'paid', label: advance ? L('Advance payment', 'پیشگی ادائیگی', 'الدفعة المقدّمة') : L('Payment', 'ادائیگی', 'الدفع'), done: paid && !!offer.payment_confirmed_at, at: offer.payment_confirmed_at || offer.paid_marked_at }
  const steps: { k: string; label: string; done: boolean; at: any }[] = [
    { k: 'accept', label: L('Offer chosen', 'آفر منتخب', 'اختيار العرض'), done: true, at: offer.accepted_at },
    ...(advance ? [paidStep] : []),
    ...(isSupplier ? [{ k: 'invoice', label: L('Invoice', 'انوائس', 'الفاتورة'), done: !!offer.supplier_invoice_url, at: offer.supplier_invoice_at }] : []),
    { k: 'deliver', label: pickup ? L('Ready for pickup', 'وصولی کے لیے تیار', 'تجهيز الطلب') : L('Delivery', 'ڈیلیوری', 'التسليم'), done: !!offer.supplier_delivered_at, at: offer.supplier_delivered_at },
    { k: 'receipt', label: isContractor ? L('Your receipt', 'آپ کی وصولی', 'استلامك') : L('Buyer receipt', 'خریدار کی وصولی', 'استلام المشتري'), done: !!offer.received_at, at: offer.received_at },
    ...(advance ? [] : [paidStep]),
  ]
  const current = steps.findIndex(s => !s.done)

  const openDispute = (reason = '') => {
    setDisputeReason(reason); setShowDispute(true)
    setTimeout(() => document.getElementById('deal-dispute')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const row = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl p-3'
  const actions = 'grid grid-cols-1 sm:flex sm:items-center gap-2 sm:shrink-0'

  // ── sections ──
  const invoiceSection = (
    <div key="invoice" className={row} style={{ background: offer.supplier_invoice_url ? '#E1F5EE' : '#f9fafb' }}>
      <div className="text-sm min-w-0">
        <div className="font-semibold text-gray-700"><Glyph e="🧾" /> {invoiceTitle}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {offer.supplier_invoice_url
            ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {isSupplier ? (observer ? L('The account owner attached it', 'اکاؤنٹ کے مالک نے منسلک کر دی', 'أرفقها صاحب الحساب') : L('You attached it', 'آپ نے منسلک کر دی', 'أرفقتَها')) : L('Attached by the supplier', 'سپلائر نے منسلک کر دی', 'أرفقها المورد')} · {fmtDate(offer.supplier_invoice_at)}</>
            : closed ? notDone
            : isSupplier
              ? (observer ? L('Waiting for the account owner to upload the invoice', 'اکاؤنٹ کے مالک کی طرف سے انوائس اپ لوڈ کا انتظار', 'بانتظار رفع صاحب الحساب للفاتورة') : invoiceGateText(vo, locale))
              : L('The supplier attaches it before confirming delivery, and it will show here.', 'سپلائر ڈیلیوری کی تصدیق سے پہلے اسے منسلک کرے گا، اور یہ یہاں نظر آئے گی۔', 'يرفقها المورد قبل تأكيد التسليم، وستظهر هنا.')}
        </div>
      </div>
      <div className={actions}>
        {offer.supplier_invoice_url && (
          <a href={fileHref(offer.supplier_invoice_url)} target="_blank" rel="noopener noreferrer" className={OUTLINE}><Glyph e="📄" /> {L('View invoice', 'انوائس دیکھیں', 'عرض الفاتورة')}</a>
        )}
        {isSupplier && canAct && (
          <label className={`${offer.supplier_invoice_url ? OUTLINE : PRIMARY} cursor-pointer ${busy === 'invoice' ? 'opacity-50 pointer-events-none' : ''}`} style={offer.supplier_invoice_url ? undefined : GOLD}>
            {busy === 'invoice' ? L('Uploading…', 'اپ لوڈ ہو رہی ہے…', 'جارٍ الرفع…') : offer.supplier_invoice_url ? L('Replace', 'تبدیل کریں', 'استبدال') : <><Glyph e="⬆" /> {L('Upload invoice', 'انوائس اپ لوڈ کریں', 'رفع الفاتورة')}</>}
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e: any) => { uploadInvoice(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        )}
      </div>
      {isSupplier && !closed && !offer.supplier_invoice_url && buyerName && (
        <div className="basis-full text-xs text-[#0B2438] leading-relaxed">
          {L('Invoice in the name of: ', 'انوائس اس نام پر: ', 'تصدر الفاتورة باسم: ')}<b dir="auto">{buyerName}</b>
          {otherParty?.vat_number ? <> · {L('VAT number: ', 'VAT نمبر: ', 'الرقم الضريبي: ')}<b dir="ltr">{otherParty.vat_number}</b></> : null}
        </div>
      )}
      {invErr && <p className="text-xs text-[#B42318] basis-full" role="alert">{invErr}</p>}
    </div>
  )

  const deliverySection = (
    <div key="deliver" className={row} style={{ background: offer.supplier_delivered_at ? '#E1F5EE' : '#f9fafb' }}>
      <div className="text-sm min-w-0">
        <div className="font-semibold text-gray-700">{pickup ? L('Preparing the order for pickup', 'آرڈر کی وصولی کے لیے تیاری', 'تجهيز الطلب للاستلام') : L('Delivery of goods', 'مال کی ڈیلیوری', 'تسليم البضاعة')}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {offer.supplier_delivered_at
            ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {isSupplier ? (observer ? L('The account owner confirmed delivery', 'اکاؤنٹ کے مالک نے ڈیلیوری کنفرم کر دی', 'أكّد صاحب الحساب التسليم') : L('You confirmed delivery', 'آپ نے ڈیلیوری کنفرم کر دی', 'أكّدتَ التسليم')) : L('Delivery confirmed', 'ڈیلیوری کی تصدیق ہو گئی', 'تمّ تأكيد التسليم')} — {fmtDate(offer.supplier_delivered_at)}</>
            : closed ? notDone
            : isSupplier
              ? (observer ? L('Waiting for the account owner to confirm delivery', 'اکاؤنٹ کے مالک کی طرف سے ڈیلیوری کی تصدیق کا انتظار', 'بانتظار تأكيد صاحب الحساب للتسليم')
                : advanceDue ? L('Waiting for the buyer’s advance payment; then deliver the goods.', 'خریدار کی پیشگی ادائیگی کا انتظار؛ پھر سامان پہنچائیں۔', 'بانتظار دفعة المشتري المقدّمة، ثم تسلّم البضاعة.')
                : offer.supplier_invoice_url ? L('Confirm once all the goods are delivered.', 'سارا مال پہنچنے پر تصدیق کریں۔', 'أكّد بعد تسليم كل البضاعة.') : invoiceGateText(vo, locale))
              : pickup ? L('Waiting for the supplier to prepare the order', 'سپلائر کی طرف سے آرڈر کی تیاری کا انتظار', 'بانتظار تجهيز المورد للطلب')
              : L('Waiting for the supplier to deliver and confirm', 'سپلائر کی ڈیلیوری اور تصدیق کا انتظار ہے', 'بانتظار تسليم المورد وتأكيده')}
        </div>
      </div>
      {!offer.supplier_delivered_at && isSupplier && canAct && offer.supplier_invoice_url && (
        <div className={actions}>
          <button type="button" onClick={async () => { if ((await askConfirm(L('Have you delivered all the goods of this order to the buyer?\n\nThis confirmation is recorded with its date and cannot be undone.', 'کیا آپ نے اس آرڈر کا سارا مال خریدار کو پہنچا دیا ہے؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔', 'هل سلّمت جميع بضاعة هذا الطلب إلى المشتري؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.'), { okLabel: L('Yes, delivered', 'ہاں، ڈیلیور کر دیا', 'نعم، سلّمتها'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) callRpc('confirm_delivery', { p_offer_id: offer.id }, 'deliver') }}
            disabled={busy === 'deliver'} className={advanceDue ? OUTLINE : PRIMARY} style={advanceDue ? undefined : GOLD}>
            <Check className="w-4 h-4" aria-hidden="true" /> {L('Confirm delivery', 'ڈیلیوری کی تصدیق کریں', 'تأكيد التسليم')}
          </button>
          {advanceDue && <span className="text-xs text-gray-600">{L('Better to deliver after the buyer’s advance payment.', 'بہتر ہے کہ خریدار کی پیشگی ادائیگی کے بعد سامان دیں۔', 'يُفضَّل التسليم بعد دفعة المشتري المقدّمة.')}</span>}
        </div>
      )}
    </div>
  )

  const receiptSection = (
    <div key="receipt" className={row} style={{ background: offer.received_at ? '#E1F5EE' : '#f9fafb' }}>
      <div className="text-sm min-w-0">
        <div className="font-semibold text-gray-700">{L('Receipt confirmation', 'وصولی کی تصدیق', 'تأكيد الاستلام')}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {offer.received_at
            ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {isContractor ? L('Recorded: you confirmed receipt', 'ریکارڈ ہو گیا: آپ نے وصولی کنفرم کر دی', 'سُجّل: أكّدتَ الاستلام') : L('Recorded: the buyer confirmed receipt', 'ریکارڈ ہو گیا: خریدار نے وصولی کنفرم کر دی', 'سُجّل: أكّد المشتري الاستلام')} · {fmtDate(offer.received_at)}</>
            : closed ? notDone
            : isContractor && !offer.supplier_delivered_at && !deliverOverdue
              // the buyer can confirm before the supplier does: the goods may already be there (round-4 UX-003)
              ? (pickup
                ? L('Waiting for the supplier to prepare the order. Confirm receipt after you collect the goods from the shop.', 'سپلائر کی طرف سے آرڈر کی تیاری کا انتظار ہے۔ دکان سے سامان لینے کے بعد وصولی کی تصدیق کریں۔', 'بانتظار تجهيز المورد للطلب. أكّد الاستلام بعد استلامك البضاعة من المحل.')
                : L('Waiting for the supplier to deliver. If the goods have reached you, confirm receipt here.', 'سپلائر کی ڈیلیوری کا انتظار ہے۔ اگر سامان آپ تک پہنچ گیا ہے تو یہاں وصولی کی تصدیق کریں۔', 'بانتظار تسليم المورد. إذا وصلتك البضاعة، أكّد استلامها هنا.'))
              : isContractor
                ? L('Check the goods, then confirm receipt.', 'سامان چیک کریں، پھر وصولی کی تصدیق کریں۔', 'تحقّق من البضاعة، ثم أكّد استلامها.')
                : L('Waiting for the buyer to confirm receipt of the goods', 'خریدار کی طرف سے مال کی وصولی کی تصدیق کا انتظار ہے', 'بانتظار تأكيد المشتري لاستلام البضاعة')}
        </div>
        {!offer.received_at && isContractor && (offer.supplier_delivered_at || deliverOverdue) && (
          <div className="text-xs text-gray-600 mt-0.5">{L('Confirming means the material arrived as you ordered it.', 'تصدیق کا مطلب ہے کہ مال آپ کے آرڈر کے مطابق پہنچ گیا ہے۔', 'تأكيدك يعني أن المادة وصلت كما طلبت.')}</div>
        )}
      </div>
      {!offer.received_at && isContractor && canAct && (
        <div className={actions}>
          <button type="button" onClick={async () => {
            if (!(await askConfirm(home ? L('Did the goods reach you complete and as you ordered?\n\nWe will save the date of receipt, and this confirmation cannot be undone.', 'کیا آپ کو سامان پورا اور آرڈر کے مطابق مل گیا؟\n\nہم وصولی کی تاریخ محفوظ کریں گے، اور یہ تصدیق واپس نہیں لی جا سکتی۔', 'هل وصلتك البضاعة كاملة وكما طلبت؟\n\nسنحفظ تاريخ الاستلام، ولا يمكن التراجع عن هذا التأكيد.') : L('Have you actually received the goods, matching the order?\n\nA dated receipt record will be saved. Note: confirming receipt without actually receiving lowers your rating and makes you accountable.', 'کیا آپ کو واقعی مال مل گیا ہے اور وہ آرڈر کے مطابق ہے؟\n\nتاریخ کے ساتھ وصولی کا ریکارڈ محفوظ ہو جائے گا۔ نوٹ: مال ملے بغیر وصولی کنفرم کرنے سے آپ کی ریٹنگ کم ہو گی اور آپ جواب دہ ہوں گے۔', 'هل استلمت البضاعة فعلياً ومطابقة للمطلوب؟\n\nسيُسجَّل محضر استلام موثّق بالتاريخ. تنبيه: تأكيد الاستلام دون استلام فعلي يُخفّض تقييمك ويُعرّضك للمساءلة.'), { okLabel: L('Yes, I received it', 'ہاں، مل گیا', 'نعم، استلمتها'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
            if (await callRpc('confirm_receipt', { p_offer_id: offer.id }, 'receipt')) setJustReceived(true)
          }} disabled={busy === 'receipt'} className={offer.supplier_delivered_at && !payIsNext ? PRIMARY : OUTLINE} style={offer.supplier_delivered_at && !payIsNext ? GOLD : undefined}>
            <Check className="w-4 h-4" aria-hidden="true" /> {pickup ? L('I collected the goods from the shop', 'میں نے دکان سے سامان لے لیا', 'استلمتُ البضاعة من المحل') : L('I received the goods', 'مجھے سامان مل گیا', 'استلمتُ البضاعة')}
          </button>
          {offer.dispute_status !== 'open' && (offer.supplier_delivered_at || deliverOverdue) && (
            <button type="button" onClick={() => openDispute(L('The goods were not delivered or do not match the order', 'مال ڈیلیور نہیں ہوا یا آرڈر کے مطابق نہیں ہے', 'البضاعة لم تُسلَّم أو لم تتطابق مع المطلوب'))}
              className={`${BTN} border border-red-300 text-[#B42318] bg-white hover:bg-red-50`}>
              {L('Not received', 'وصول نہیں ہوا', 'لم يتم الاستلام')}
            </button>
          )}
        </div>
      )}
    </div>
  )
  const rateCta = isContractor && justReceived && !closed && (
    <a key="rate" href={`/contractor/orders/${offer.id}#rate`} className={`${PRIMARY} w-full`} style={GOLD}>
      <Glyph e="⭐" /> {L('Rate the supplier now', 'ابھی سپلائر کی ریٹنگ دیں', 'قيّم المورد الآن')}
    </a>
  )

  const paymentSection = (
    <div key="paid" className={row} style={{ background: paid && offer.payment_confirmed_at ? '#E1F5EE' : '#f9fafb' }}>
      <div className="text-sm min-w-0">
        <div className="font-semibold text-gray-700">{L('Payment', 'ادائیگی', 'الدفع')}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {!paid && closed ? notDone
            : paid
            ? (offer.payment_confirmed_at
              ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {isSupplier ? (observer ? L('The account owner confirmed receiving the payment', 'اکاؤنٹ کے مالک نے ادائیگی وصول ہونا کنفرم کر دیا', 'أكّد صاحب الحساب استلام الدفعة') : L('You confirmed receiving the payment', 'آپ نے ادائیگی وصول ہونا کنفرم کر دیا', 'أكّدتَ استلام الدفعة')) : L('Supplier confirmed receiving the payment', 'سپلائر نے ادائیگی وصول ہونا کنفرم کر دیا', 'أكّد المورد استلام الدفعة')} — {fmtDate(offer.payment_confirmed_at)}</>
              : (isSupplier
                ? (observer ? L('The buyer paid; waiting for the account owner to confirm receiving the amount.', 'خریدار نے ادائیگی کر دی؛ اکاؤنٹ کے مالک کی طرف سے رقم ملنے کی تصدیق کا انتظار ہے۔', 'دفع المشتري، وبانتظار تأكيد صاحب الحساب لاستلام المبلغ.') : L('The buyer says they paid: confirm once you receive the amount.', 'خریدار کے مطابق ادائیگی ہو گئی: رقم ملنے پر تصدیق کریں۔', 'يقول المشتري إنه دفع: أكّد بعد استلامك المبلغ.'))
                : L('You confirmed payment; waiting for the supplier to confirm receiving it', 'آپ نے ادائیگی کنفرم کر دی؛ سپلائر کی تصدیق کا انتظار ہے', 'أكّدتَ الدفع، وبانتظار تأكيد المورد استلامه')))
            : <>
                {dealAmount ? <>{L('Amount', 'رقم', 'المبلغ')}: <b className="text-[#0B2438]">{dealAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</b> <span className="text-gray-600">({buyerBasisTag(vo, locale)})</span>{extrasPending ? <span className="font-semibold text-[#8F6820]"> {isSupplier ? L('+ delivery charges once you confirm them', '+ آپ کی تصدیق کے بعد ڈیلیوری چارجز', '+ رسوم التوصيل بعد تأكيدك لها') : L('+ delivery charges once the supplier confirms them', '+ سپلائر کی تصدیق کے بعد ڈیلیوری چارجز', '+ رسوم التوصيل بعد تأكيد المورد')}</span> : null}{terms ? ` · ${terms}` : ''}. </> : terms ? <>{terms}. </> : null}
                {/* «آجل»: the due date; «مقدّم»: paid before delivery (round-4 UX-034) */}
                {dueAtPay && !dueLate && <span className="block mt-1 font-bold text-[#0B2438]">{L(`Payment is due on ${dueTextPay}.`, `ادائیگی کی آخری تاریخ: ${dueTextPay}۔`, `الدفع مستحق في ${dueTextPay}.`)}</span>}
                {dueLate && <span className="block mt-1 font-bold text-[#6C531F]">{isSupplier
                  ? L(`The agreed payment date has passed (${dueTextPay}). Contact the buyer, or report a problem.`, `ادائیگی کی طے شدہ تاریخ گزر گئی (${dueTextPay})۔ خریدار سے رابطہ کریں، یا مسئلہ بتائیں۔`, `تجاوز موعد الدفع المتّفق عليه (${dueTextPay}). تواصل مع المشتري، أو أبلغ عن مشكلة.`)
                  : L(`The agreed payment date has passed (${dueTextPay}). Pay the supplier and record it here.`, `ادائیگی کی طے شدہ تاریخ گزر گئی (${dueTextPay})۔ سپلائر کو ادائیگی کریں اور یہاں درج کریں۔`, `تجاوز موعد الدفع المتّفق عليه (${dueTextPay}). ادفع للمورد وسجّل الدفع هنا.`)}</span>}
                {advanceDue && (isContractor
                  ? <span className="block mt-1 font-bold text-[#0B2438]">{L('Waiting for your advance payment; then the supplier delivers. Do not pay before agreeing on the delivery date in messages.', 'آپ کی پیشگی ادائیگی کا انتظار ہے؛ پھر سپلائر سامان پہنچائے گا۔ پیغامات میں ڈیلیوری کی تاریخ طے کیے بغیر ادائیگی نہ کریں۔', 'بانتظار دفعتك المقدّمة، ثم يسلّم المورد. لا تدفع قبل الاتفاق على موعد التسليم عبر الرسائل.')}</span>
                  : <span className="block mt-1 font-bold text-[#0B2438]">{L('This offer asks for payment in advance: waiting for the buyer’s payment.', 'اس آفر میں پیشگی ادائیگی ہے: خریدار کی ادائیگی کا انتظار ہے۔', 'يطلب هذا العرض الدفع مقدّماً: بانتظار دفعة المشتري.')}</span>)}
                {isContractor
                  ? L('Pay the supplier directly; the platform never receives any money.', 'سپلائر کو براہ راست ادائیگی کریں؛ پلیٹ فارم کوئی رقم وصول نہیں کرتا۔', 'ادفع للمورد مباشرةً؛ فالمنصة لا تستلم أي مبالغ.')
                  : L('The buyer pays you directly; the platform never receives any money.', 'خریدار آپ کو براہ راست ادائیگی کرتا ہے؛ پلیٹ فارم کوئی رقم وصول نہیں کرتا۔', 'يدفع لك المشتري مباشرةً؛ فالمنصة لا تستلم أي مبالغ.')}
                {isContractor && <span className="block mt-1">{L('Agree with the supplier on how to pay (bank transfer or cash on delivery) and ask for the account details in messages.', 'سپلائر سے ادائیگی کا طریقہ طے کریں (بینک ٹرانسفر یا ڈیلیوری پر نقد) اور اکاؤنٹ کی تفصیلات پیغامات میں مانگیں۔', 'اتفق مع المورد على طريقة الدفع (تحويل بنكي أو نقداً عند الاستلام) واطلب بيانات الحساب عبر الرسائل.')}</span>}
              </>}
        </div>
      </div>
      <div className={actions}>
        {!paid && isContractor && canAct && (
          <button type="button" onClick={async () => { if ((await askConfirm(dealAmount ? L(`Have you paid the supplier ${fmtAmt(dealAmount)} SAR for this order?${extrasPending ? '\n\nDelivery charges may still be added once the supplier confirms them, so it is better to pay after that.' : ''}\n\nThis confirmation is recorded with its date and cannot be undone.`, `کیا آپ نے اس آرڈر کے لیے سپلائر کو ${fmtAmt(dealAmount)} ریال ادا کر دیے ہیں؟${extrasPending ? '\n\nسپلائر کی تصدیق کے بعد ڈیلیوری چارجز شامل ہو سکتے ہیں، اس لیے بہتر ہے کہ اس کے بعد ادائیگی کریں۔' : ''}\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔`, `هل دفعت للمورد مبلغ ${fmtAmt(dealAmount)} ر.س لهذا الطلب؟${extrasPending ? '\n\nقد تُضاف رسوم التوصيل بعد تأكيد المورد لها، فيُفضّل الدفع بعد تأكيدها.' : ''}\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.`) : L('Have you paid the supplier the amount of this order?\n\nThis confirmation is recorded with its date and cannot be undone.', 'کیا آپ نے اس آرڈر کی رقم سپلائر کو ادا کر دی ہے؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔', 'هل دفعت للمورد مبلغ هذا الطلب؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.'), { okLabel: L('Yes, I paid', 'ہاں، ادا کر دیا', 'نعم، دفعت'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) callRpc('mark_paid', { p_offer_id: offer.id }, 'paid') }}
            disabled={busy === 'paid'} className={payIsNext ? PRIMARY : OUTLINE} style={payIsNext ? GOLD : undefined}>
            <Check className="w-4 h-4" aria-hidden="true" /> {advanceDue ? L('Record the advance payment', 'پیشگی ادائیگی درج کریں', 'سجّل الدفع') : L('Confirm payment', 'ادائیگی کی تصدیق کریں', 'تأكيد الدفع')}
          </button>
        )}
        {/* round-5 UX-008: cash at the door is common and a home buyer rarely comes back to record it, so the
            supplier records receiving the full amount itself (the deal becomes paid and confirmed; the buyer is told) */}
        {!paid && isSupplier && canAct && (
          <button type="button" onClick={async () => {
            const amt = dealAmount ? `${fmtAmt(dealAmount)} ` : ''
            if (!(await askConfirm(
              L(`Have you received from the buyer the full amount of this order${amt ? ` (${amt}SAR)` : ''}? The payment will be recorded and the buyer told.`,
                `کیا آپ کو خریدار سے اس آرڈر کی پوری رقم${amt ? ` (${amt}ریال)` : ''} مل گئی ہے؟ ادائیگی درج ہو جائے گی اور خریدار کو اطلاع دی جائے گی۔`,
                `هل استلمت من المشتري كامل مبلغ هذا الطلب${amt ? ` (${amt}ر.س)` : ''}؟ سيُسجَّل الدفع ويُبلَّغ المشتري.`),
              { okLabel: L('Yes, received', 'ہاں، مل گئی', 'نعم، استلمته'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
            if (await callRpc('supplier_confirm_cash_payment', { p_offer_id: offer.id }, 'cash'))
              setNotice(L('Payment recorded, and the buyer was told.', 'ادائیگی درج ہو گئی، اور خریدار کو اطلاع دے دی گئی۔', 'سُجّل الدفع، وأُبلغ المشتري.'))
          }} disabled={busy === 'cash'} className={OUTLINE}>
            <Check className="w-4 h-4" aria-hidden="true" /> {L('I received the amount', 'مجھے رقم مل گئی', 'استلمتُ المبلغ')}
          </button>
        )}
        {paid && !offer.payment_confirmed_at && isSupplier && canAct && (
          <button type="button" onClick={async () => { if ((await askConfirm(dealAmount ? L(`Have you received the full payment of ${fmtAmt(dealAmount)} SAR for this order from the buyer?\n\nThis confirmation is recorded with its date and cannot be undone.`, `کیا آپ کو خریدار سے اس آرڈر کی پوری رقم ${fmtAmt(dealAmount)} ریال مل گئی ہے؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔`, `هل استلمت من المشتري كامل مبلغ هذا الطلب (${fmtAmt(dealAmount)} ر.س)؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.`) : L('Have you received the full payment for this order from the buyer?\n\nThis confirmation is recorded with its date and cannot be undone.', 'کیا آپ کو خریدار سے اس آرڈر کی پوری رقم مل گئی ہے؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔', 'هل استلمت من المشتري كامل مبلغ هذا الطلب؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.'), { okLabel: L('Yes, received', 'ہاں، مل گئی', 'نعم، استلمته'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) callRpc('confirm_payment', { p_offer_id: offer.id }, 'paycfm') }}
            disabled={busy === 'paycfm'} className={PRIMARY} style={GOLD}>
            <Check className="w-4 h-4" aria-hidden="true" /> {L('Confirm payment received', 'ادائیگی کی وصولی کی تصدیق کریں', 'تأكيد استلام الدفعة')}
          </button>
        )}
      </div>
    </div>
  )

  const sections = isSupplier
    ? (advanceDue ? [paymentSection, invoiceSection, deliverySection, receiptSection] : [invoiceSection, deliverySection, receiptSection, paymentSection])
    : (advanceDue ? [paymentSection, deliverySection, invoiceSection, receiptSection, rateCta] : [deliverySection, invoiceSection, receiptSection, rateCta, paymentSection])

  return (
    <div id="deal" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 print:hidden scroll-mt-20" dir={dir}>
      <h3 className="text-base font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="🛡" /> {L('Deal steps', 'ڈیل کے مراحل', 'خطوات الصفقة')}</h3>
      <p className="text-xs text-gray-500 mb-3">{L('The platform records each stage of the deal as proof that protects both sides; it never holds any money.', 'پلیٹ فارم ڈیل کے ہر مرحلے کو ریکارڈ کرتا ہے تاکہ دونوں فریقوں کا تحفظ ہو؛ یہ کوئی رقم اپنے پاس نہیں رکھتا۔', 'توثّق المنصة مراحل الصفقة دليلاً يحمي الطرفين، ولا تحتفظ بأي مبالغ.')}</p>
      {closed && (
        <div role="status" className="mb-4 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 text-sm font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="ℹ" /> {L('This deal was cancelled by a decision of the Taseerak team', 'یہ ڈیل تسعیرک کی ٹیم کے فیصلے سے منسوخ کر دی گئی', 'أُلغيت هذه الصفقة بقرار فريق تسعيرك')}{offer.deal_closed_reason ? <>: <span dir="auto">{offer.deal_closed_reason}</span></> : '.'}
        </div>
      )}
      {/* a team member: the supplier page shows the one «يدير صاحب الحساب» note (round-4 UX-079) */}
      {pickup && (
        <div className="mb-4 rounded-xl bg-[#0B2438]/5 border border-[#0B2438]/15 text-[#0B2438] text-xs font-semibold px-3 py-2 leading-relaxed">
          {/* round-7 UX-032: a pricing agent's own address is private (migration 285): he sets the pickup place */}
          <Glyph e="📍" /> {isContractor && isIndependentOffer(vo)
            ? L('The pricing agent sets the pickup place; message him to confirm the place and time.', 'وصولی کی جگہ پرائس ایجنٹ طے کرتا ہے؛ جگہ اور وقت کی تصدیق کے لیے اسے پیغام بھیجیں۔', 'مكان الاستلام يحدّده وسيط التسعير؛ راسله لتأكيد المكان والموعد.')
            : pickupPlace
            ? L(`Pickup place: ${pickupPlace}`, `وصولی کی جگہ: ${pickupPlace}`, `مكان الاستلام: ${pickupPlace}`)
            : L('The buyer collects the goods from the supplier’s shop.', 'خریدار سامان سپلائر کی دکان سے لے گا۔', 'يستلم المشتري البضاعة من محل المورد.')}
        </div>
      )}
      {/* round-6 UX-001: the expected day shows once, here, with «أضف إلى التقويم»; the terms card keeps only the duration */}
      {showDue && (
        <div className="mb-4 rounded-xl bg-[#0B2438]/5 border border-[#0B2438]/15 text-[#0B2438] text-xs font-semibold px-3 py-2 leading-relaxed">
          <div>
            <Glyph e="📅" /> {isSupplier
              ? (observer ? L(`The committed delivery date: ${dueText}`, `طے شدہ ڈیلیوری کی تاریخ: ${dueText}`, `موعد التوصيل الملتزَم به: ${dueText}`) : pickup ? L(`The date you committed to have the order ready: ${dueText}`, `آرڈر تیار کرنے کی طے کردہ تاریخ: ${dueText}`, `موعد تجهيز الطلب الذي التزمتَ به: ${dueText}`) : L(`The delivery date you committed to: ${dueText}`, `آپ کی طے کردہ ڈیلیوری کی تاریخ: ${dueText}`, `موعد التوصيل الذي التزمتَ به: ${dueText}`))
              : pickup
                ? L(`The order is expected to be ready: ${dueText}`, `آرڈر کی تیاری کی متوقع تاریخ: ${dueText}`, `موعد تجهيز الطلب المتوقَّع: ${dueText}`)
                : dueToday
                  ? L('Your order is expected to arrive today, by the supplier’s date.', 'سپلائر کی تاریخ کے مطابق آپ کا آرڈر آج پہنچنے کی توقع ہے۔', 'يُتوقَّع وصول طلبك اليوم بحسب موعد المورد.')
                  : L(`Expected delivery date: ${dueText}`, `متوقع ڈیلیوری کی تاریخ: ${dueText}`, `موعد التوصيل المتوقَّع: ${dueText}`)}
            {' '}<span className="font-normal text-gray-600">{noFridays}</span>
          </div>
          {!observer && (
            <button type="button" onClick={downloadIcs} className="mt-1 inline-flex items-center gap-1 min-h-11 text-sm font-bold text-[#8F6820] hover:underline">
              <Glyph e="📅" /> {L('Add to calendar', 'کیلنڈر میں شامل کریں', 'أضف إلى التقويم')}
            </button>
          )}
        </div>
      )}
      {deliverOverdue && !pickup && (
        <div className="mb-4 rounded-xl bg-warn-bg border border-warn-border text-warn-text text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏰" /> {isSupplier
            ? (observer ? L('The agreed delivery date has passed; the account owner follows it up.', 'طے شدہ ڈیلیوری کی تاریخ گزر گئی؛ اکاؤنٹ کا مالک اسے دیکھ رہا ہے۔', 'تجاوز موعد التوصيل المتّفق عليه، ويتابعه صاحب الحساب.') : L('You are past the agreed delivery date. Please confirm delivery or contact the buyer.', 'آپ طے شدہ ڈیلیوری کی تاریخ سے لیٹ ہیں۔ براہ کرم ڈیلیوری کنفرم کریں یا خریدار سے رابطہ کریں۔', 'تأخّرت عن موعد التوصيل المتّفق عليه. يُرجى تأكيد التسليم أو التواصل مع المشتري.'))
            : L('The supplier is past the agreed delivery date. Follow up with them, or report a problem below.', 'سپلائر طے شدہ ڈیلیوری کی تاریخ سے لیٹ ہے۔ اس سے رابطہ کریں یا نیچے مسئلہ بتائیں۔', 'تأخّر المورد عن موعد التوصيل المتّفق عليه. تابع معه، أو أبلغ عن مشكلة أدناه.')}
        </div>
      )}
      {!closed && !hasDays && !offer.supplier_delivered_at && !offer.received_at && !pickup && (
        <div className="mb-4 rounded-xl bg-warn-bg border border-warn-border text-warn-text text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏱" /> {isSupplier
            ? (observer ? L('The offer gave no delivery time; the account owner agrees on a date with the buyer.', 'آفر میں ڈیلیوری کا وقت نہیں تھا؛ اکاؤنٹ کا مالک خریدار سے تاریخ طے کرے گا۔', 'لم يحدّد العرض مدة التوصيل، ويتفق صاحب الحساب مع المشتري على الموعد.') : L('Your offer gave no delivery time. Agree on a delivery date with the buyer in messages.', 'آپ کی آفر میں ڈیلیوری کا وقت نہیں تھا۔ پیغامات میں خریدار سے تاریخ طے کریں۔', 'لم تحدّد مدة التوصيل في عرضك. اتفق مع المشتري على موعد التسليم عبر الرسائل.'))
            : L('The supplier gave no delivery time. Agree on a delivery date with them in messages.', 'سپلائر نے ڈیلیوری کا وقت نہیں بتایا۔ پیغامات میں ان سے تاریخ طے کریں۔', 'لم يحدّد المورد مدة التوصيل. اتفق معه على موعد التسليم عبر الرسائل.')}
        </div>
      )}
      {receiptOverdue && (
        <div className="mb-4 rounded-xl bg-warn-bg border border-warn-border text-warn-text text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏰" /> {isContractor ? L('More than 48 hours since delivery was confirmed. Please confirm receipt or report a problem.', 'ڈیلیوری کنفرم ہوئے 48 گھنٹے سے زیادہ ہو گئے۔ براہ کرم وصولی کنفرم کریں یا مسئلہ بتائیں۔', 'مضى أكثر من 48 ساعة على تأكيد التسليم. يُرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.') : (observer ? L('Waiting for the buyer to confirm receipt of the goods.', 'خریدار کی طرف سے مال کی وصولی کی تصدیق کا انتظار ہے۔', 'بانتظار تأكيد المشتري لاستلام البضاعة.')
            : <>{L('More than 48 hours since you delivered. Remind the buyer to confirm receipt.', 'آپ کی ڈیلیوری کو 48 گھنٹے سے زیادہ ہو گئے۔ خریدار کو وصولی کی تصدیق یاد دلائیں۔', 'مضى أكثر من 48 ساعة على تسليمك. ذكّر المشتري بتأكيد الاستلام.')}
              <button type="button" onClick={messageOtherSide} className={`${OUTLINE} mt-2 flex`}><Glyph e="💬" /> {L('Message the buyer', 'خریدار کو پیغام بھیجیں', 'راسل المشتري')}</button></>)}
        </div>
      )}
      {w && !hideContact && !observer && !closed && (
        <a href={w} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm mb-4 px-4 min-h-11 rounded-xl font-semibold border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5">
          <Glyph e="💬" /> {isContractor ? L('Contact the supplier on WhatsApp', 'سپلائر سے واٹس ایپ پر رابطہ کریں', 'تواصل مع المورد عبر واتساب') : L('Contact the buyer on WhatsApp', 'خریدار سے واٹس ایپ پر رابطہ کریں', 'تواصل مع المشتري عبر واتساب')}
        </a>
      )}

      {/* Tracker: done = green, the current step = gold, the rest grey */}
      <ol className={`grid ${steps.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5 sm:gap-2 mb-5 text-center text-xs`}>
        {steps.map((s, i) => {
          const isCur = i === current
          return (
            <li key={s.k} className="flex flex-col items-center" aria-current={isCur ? 'step' : undefined}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={s.done ? { background: '#0F6E56', color: '#fff' } : isCur ? { background: '#F5E6C4', color: '#071827', boxShadow: '0 0 0 2px #D4A543' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {s.done ? <Check className="w-4 h-4" aria-hidden="true" /> : i + 1}
              </div>
              <div className={`mt-1 leading-tight ${s.done || isCur ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>{s.label}</div>
              {s.at && <div className="text-xs text-gray-500">{new Date(s.at).toLocaleDateString(dloc, { day: 'numeric', month: 'short', timeZone: 'Asia/Riyadh' })}</div>}
            </li>
          )
        })}
      </ol>

      {actErr && <p role="alert" className="mb-3 rounded-xl bg-red-50 border border-red-200 text-[#B42318] text-xs font-semibold px-3 py-2">{actErr}</p>}
      {notice && <p role="status" className="mb-3 rounded-xl bg-[#E1F5EE] border border-[#0F6E56]/30 text-[#0F6E56] text-xs font-semibold px-3 py-2">{notice}</p>}

      {agentSuccess && agentCap && (
        <p role="status" className="mb-3 rounded-xl bg-[#E1F5EE] border border-[#0F6E56]/30 text-[#0B2438] text-xs font-semibold px-3 py-2 leading-relaxed">
          <b className="text-[#0F6E56]">{L('A successful deal.', 'کامیاب سودا۔', 'صفقة ناجحة.')}</b> {agentCapText(agentCap, locale as any, sarLabel(locale))}
        </p>
      )}

      <div className="space-y-3">{sections}</div>

      {/* Dispute */}
      <div id="deal-dispute" className="mt-4 pt-4 border-t border-gray-100 scroll-mt-24">
        <a href="/deal-protection" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-xs font-bold text-[#8F6820] hover:underline mb-1"><Glyph e="🛡" /> {L('How we protect your deal', 'ہم سودے کی حفاظت کیسے کرتے ہیں', 'كيف نحمي صفقتك؟')}</a>
        {/* round-6 UX-003: a deal the admins cancelled shows only the grey note above, never «تم حل المشكلة» */}
        {closed ? null : offer.dispute_status === 'open' ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
            <div className="font-bold text-[#B42318]"><Glyph e="⚠" /> {L('Problem reported', 'مسئلہ رپورٹ ہوا', 'بلاغ عن مشكلة قيد المعالجة')}</div>
            {isSupplier && !reportedBySupplier ? (<>
              <div className="text-xs text-gray-800 mt-1 leading-relaxed">
                {L('The buyer reported a problem with this deal: ', 'خریدار نے اس ڈیل میں ایک مسئلہ رپورٹ کیا: ', 'أبلغ المشتري عن مشكلة في هذه الصفقة: ')}<b className="text-[#B42318]" dir="auto">{offer.dispute_reason}</b>
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">{observer
                ? L('The Taseerak team will contact the account owner.', 'تسعیرک کی ٹیم اکاؤنٹ کے مالک سے رابطہ کرے گی۔', 'سيتواصل فريق تسعيرك مع صاحب الحساب.')
                // round-6 UX-030: messages take no photos, so no «send the delivery photo there»
                : L('The Taseerak team will contact you. You can explain your side to the buyer in messages, and attach the invoice in the invoice step above.', 'تسعیرک کی ٹیم آپ سے رابطہ کرے گی۔ آپ پیغامات میں خریدار کو اپنا موقف سمجھا سکتے ہیں، اور انوائس اوپر انوائس کے مرحلے میں منسلک کریں۔', 'سيتواصل معك فريق تسعيرك. يمكنك توضيح موقفك للمشتري في الرسائل، وإرفاق الفاتورة في خطوة الفاتورة أعلاه.')}</div>
              {canAct && (
                <button type="button" onClick={messageOtherSide} className={`${OUTLINE} mt-2`}><Glyph e="💬" /> {L('Message the buyer', 'خریدار کو پیغام بھیجیں', 'راسل المشتري')}</button>
              )}
            </>) : (<>
              <div className="text-xs text-[#B42318] mt-1" dir="auto">
                {isContractor && reportedBySupplier ? L('The supplier reported: ', 'سپلائر نے رپورٹ کیا: ', 'أبلغ المورد: ') : isSupplier ? (observer ? L('The account owner reported: ', 'اکاؤنٹ کے مالک نے رپورٹ کیا: ', 'أبلغ صاحب الحساب: ') : L('You reported: ', 'آپ نے رپورٹ کیا: ', 'أبلغتَ: ')) : L('You reported: ', 'آپ نے رپورٹ کیا: ', 'أبلغتَ: ')}{offer.dispute_reason}
              </div>
              <div className="text-xs text-gray-600 mt-1">{L('The Taseerak team will contact both sides to mediate.', 'تسعیرک کی ٹیم صلح کے لیے دونوں فریقوں سے رابطہ کرے گی۔', 'سيتواصل فريق تسعيرك مع الطرفين للوساطة.')}</div>
            </>)}
          </div>
        ) : offer.dispute_status === 'resolved' ? (
          <div className="bg-[#E1F5EE] border border-[#0F6E56]/30 rounded-xl p-3 text-sm text-[#0F6E56]"><Check className="inline w-4 h-4" aria-hidden="true" /> {L('Problem resolved', 'شکایت حل ہو گئی', 'تم حل المشكلة')}{offer.dispute_resolution ? `: ${offer.dispute_resolution}` : ''}</div>
        ) : !canAct ? null : !showDispute ? (
          <button type="button" onClick={() => openDispute()} className="text-xs font-semibold text-[#B42318] hover:underline min-h-11"><Glyph e="⚠" /> {L('Had a problem? Report it', 'کوئی مسئلہ ہوا؟ شکایت درج کریں', 'واجهت مشكلة؟ أبلغ عنها')}</button>
        ) : (
          // round-7 UX-131: reporting is not destructive: a light navy panel and the gold action
          <div className="bg-[#0B2438]/5 border border-[#0B2438]/15 rounded-xl p-3">
            <label htmlFor="deal-dispute-reason" className="block text-xs font-bold text-[#0B2438] mb-1.5">{L('Describe the problem', 'مسئلہ بیان کریں', 'صف المشكلة')}</label>
            <textarea id="deal-dispute-reason" value={disputeReason} onChange={(e: any) => setDisputeReason(e.target.value)} className="input-field text-base sm:text-sm" rows={2} placeholder={isSupplier
              ? L('e.g. late payment / the buyer does not reply…', 'مثال: ادائیگی میں تاخیر / خریدار جواب نہیں دیتا…', 'مثال: تأخّر الدفع / المشتري لا يردّ…')
              : L('e.g. goods not delivered / different from the specs / late delivery…', 'مثال: مال ڈیلیور نہیں ہوا / اسپیسیفکیشن سے مختلف ہے / ڈیلیوری میں تاخیر…', 'مثال: البضاعة لم تُسلّم / مختلفة عن المواصفات / تأخّر التوصيل…')} />
            <p className="text-xs text-gray-600 mt-1.5">{L('The other side and the Taseerak team are told, and the team contacts both of you.', 'دوسرے فریق اور تسعیرک کی ٹیم کو اطلاع دی جاتی ہے، اور ٹیم دونوں سے رابطہ کرتی ہے۔', 'يُبلَّغ الطرف الآخر وفريق تسعيرك، ويتواصل الفريق مع الطرفين.')}</p>
            <div className="grid grid-cols-1 sm:flex gap-2 mt-2">
              <button type="button" onClick={async () => {
                if (!disputeReason.trim()) return
                if (await callRpc('open_dispute', { p_offer_id: offer.id, p_reason: disputeReason.trim() }, 'dispute')) {
                  setShowDispute(false)
                  setNotice(L('Report sent. The Taseerak team will contact both sides.', 'رپورٹ بھیج دی گئی۔ تسعیرک کی ٹیم دونوں فریقوں سے رابطہ کرے گی۔', 'أُرسل البلاغ. سيتواصل فريق تسعيرك مع الطرفين.'))
                }
              }} disabled={!disputeReason.trim() || busy === 'dispute'} className={`${BTN} bg-[#D4A543] text-[#071827] hover:bg-[#F5C55B] disabled:opacity-50`}>{L('Send report', 'شکایت بھیجیں', 'إرسال البلاغ')}</button>
              <button type="button" onClick={() => setShowDispute(false)} className={`${BTN} text-gray-600`}>{L('Close without sending', 'بھیجے بغیر بند کریں', 'إغلاق دون إرسال')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
