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
import { offerComparable, sellerInvoiceLabel, invoiceGateText, isIndependentOffer, sarLabel } from '@/lib/vat'

// حماية الصفقة: محضر استلام + تأكيد دفع + نزاع (للطرفين).
// مكوّن مشترك يُعرض في صفحة الصفقة لكلٍّ من المشتري والمورد (كلٌّ يرى أزراره).
// الفاتورة يصدرها البائع ويرفعها هنا؛ مستند الصفقة في المنصة غير رسمي.
// UX audit 2026-11-23: the next step is the one gold button (44px), the rest navy outline; green
// only for what is complete. The seller uploads the invoice BEFORE confirming delivery, so on the
// seller's side the invoice comes first and is a tracker step.

type Party = { company_name_ar?: string; company_name_en?: string; phone?: string; contact_phone?: string; supplier_tier?: string; provider_type?: string } | null

const GOLD = { background: '#D4A543', color: '#071827' }
const BTN = 'min-h-11 w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 whitespace-nowrap inline-flex items-center justify-center gap-1.5'
const PRIMARY = `${BTN} font-extrabold`
const OUTLINE = `${BTN} border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5`

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
}) {
  const [offer, setOffer] = useState<any>(initialOffer)
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
  useEffect(() => { setHome(isContractor && storedBuyerType() === 'individual') }, [isContractor])

  // The VAT/independence helpers read offer.supplier: on the buyer's page that is the seller; on the
  // seller's own page otherParty is the BUYER, so only sellerTier tells who the seller is.
  const vo = offer.supplier ? offer
    : sellerTier ? { ...offer, supplier: { supplier_tier: sellerTier } }
    : isContractor && otherParty ? { ...offer, supplier: otherParty } : offer

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
    else if (data) setOffer({ ...offer, ...(data as any) })
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

  const canAct = !managedByOwner
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
  // «late» accusation, an amber note instead (UX-095).
  const hasDays = Number(offer.delivery_days) > 0
  const deliverOverdue = hasDays && !offer.supplier_delivered_at && !!offer.accepted_at && (new Date(offer.accepted_at).getTime() + Number(offer.delivery_days) * 86400000 < Date.now())
  const receiptOverdue = !!offer.supplier_delivered_at && !offer.received_at && (new Date(offer.supplier_delivered_at).getTime() + 48 * 3600000 < Date.now())
  const paid = offer.payment_status === 'paid'
  const fmtDate = (d: any) => new Date(d).toLocaleString(dloc)
  const SAR = sarLabel(locale)
  const dealAmount = amount != null && amount > 0 ? amount
    : (!Array.isArray(offer.item_prices) || offer.item_prices.length <= 1) ? offerComparable(vo) : null
  const fmtAmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const terms = paymentTermsLabel(offer.payment_terms, locale)
  // UX-055: a home buyer sees the short «فاتورة البائع» (the source shop wording only on a pricing agent's offer)
  const invoiceTitle = home && !isIndependentOffer(vo) ? L('The seller’s invoice', 'بیچنے والے کی انوائس', 'فاتورة البائع') : sellerInvoiceLabel(vo, locale, isSupplier ? 'supplier' : 'buyer')

  // The tracker: the seller's invoice is a step of its own on the seller's side (UX-127).
  const steps: { k: string; label: string; done: boolean; at: any }[] = [
    { k: 'accept', label: L('Offer chosen', 'آفر منتخب', 'اختيار العرض'), done: true, at: offer.accepted_at },
    ...(isSupplier ? [{ k: 'invoice', label: L('Invoice', 'انوائس', 'الفاتورة'), done: !!offer.supplier_invoice_url, at: offer.supplier_invoice_at }] : []),
    { k: 'deliver', label: L('Supplier delivery', 'سپلائر کی ڈیلیوری', 'تسليم المورد'), done: !!offer.supplier_delivered_at, at: offer.supplier_delivered_at },
    { k: 'receipt', label: isContractor ? L('Your receipt', 'آپ کی وصولی', 'استلامك') : L('Buyer receipt', 'خریدار کی وصولی', 'استلام المشتري'), done: !!offer.received_at, at: offer.received_at },
    { k: 'paid', label: L('Payment', 'ادائیگی', 'الدفع'), done: paid && !!offer.payment_confirmed_at, at: offer.payment_confirmed_at || offer.paid_marked_at },
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
            ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {L('Attached by the supplier', 'سپلائر نے منسلک کر دی', 'أرفقها المورد')} · {fmtDate(offer.supplier_invoice_at)}</>
            : isSupplier
              ? invoiceGateText(vo, locale)
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
      {invErr && <p className="text-xs text-red-600 basis-full" role="alert">{invErr}</p>}
    </div>
  )

  const deliverySection = (
    <div key="deliver" className={row} style={{ background: offer.supplier_delivered_at ? '#E1F5EE' : '#f9fafb' }}>
      <div className="text-sm min-w-0">
        <div className="font-semibold text-gray-700">{L('Delivery of goods', 'مال کی ڈیلیوری', 'تسليم البضاعة')}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {offer.supplier_delivered_at
            ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {L('Supplier confirmed delivery', 'سپلائر نے ڈیلیوری کنفرم کر دی', 'أكّد المورد التسليم')} · {fmtDate(offer.supplier_delivered_at)}</>
            : isSupplier
              ? (offer.supplier_invoice_url ? L('Confirm once all the goods are delivered.', 'سارا مال پہنچنے پر تصدیق کریں۔', 'أكّد بعد تسليم كل البضاعة.') : invoiceGateText(vo, locale))
              : L('Waiting for the supplier to deliver and confirm', 'سپلائر کی ڈیلیوری اور تصدیق کا انتظار ہے', 'بانتظار تسليم المورد وتأكيده')}
        </div>
      </div>
      {!offer.supplier_delivered_at && isSupplier && canAct && offer.supplier_invoice_url && (
        <div className={actions}>
          <button type="button" onClick={async () => { if ((await askConfirm(L('Have you delivered all the goods of this order to the buyer?\n\nThis confirmation is recorded with its date and cannot be undone.', 'کیا آپ نے اس آرڈر کا سارا مال خریدار کو پہنچا دیا ہے؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔', 'هل سلّمت جميع بضاعة هذا الطلب إلى المشتري؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.'), { okLabel: L('Yes, delivered', 'ہاں، ڈیلیور کر دیا', 'نعم، سلّمتها'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) callRpc('confirm_delivery', { p_offer_id: offer.id }, 'deliver') }}
            disabled={busy === 'deliver'} className={PRIMARY} style={GOLD}>
            <Check className="w-4 h-4" aria-hidden="true" /> {L('Confirm delivery', 'ڈیلیوری کی تصدیق کریں', 'تأكيد التسليم')}
          </button>
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
            ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {isContractor ? L('Recorded: you confirmed receipt', 'ریکارڈ ہو گیا: آپ نے وصولی کنفرم کر دی', 'موثّق: أكّدتَ الاستلام') : L('Recorded: the buyer confirmed receipt', 'ریکارڈ ہو گیا: خریدار نے وصولی کنفرم کر دی', 'موثّق: أكّد المشتري الاستلام')} · {fmtDate(offer.received_at)}</>
            : isContractor && !offer.supplier_delivered_at && !deliverOverdue
              ? L('Waiting for the supplier to deliver. You confirm receipt once the goods arrive.', 'سپلائر کی ڈیلیوری کا انتظار ہے۔ مال پہنچنے پر وصولی کی تصدیق کریں۔', 'بانتظار تسليم المورد. تؤكّد الاستلام بعد وصول البضاعة.')
              : isContractor
                ? L('Check the goods, then confirm receipt.', 'سامان چیک کریں، پھر وصولی کی تصدیق کریں۔', 'تحقّق من البضاعة، ثم أكّد استلامها.')
                : L('Waiting for the buyer to confirm receipt of the goods', 'خریدار کی طرف سے مال کی وصولی کی تصدیق کا انتظار ہے', 'بانتظار تأكيد المشتري لاستلام البضاعة')}
        </div>
        {!offer.received_at && isContractor && (offer.supplier_delivered_at || deliverOverdue) && (
          <div className="text-xs text-gray-600 mt-0.5">{L('Confirming means the material arrived as you ordered it.', 'تصدیق کا مطلب ہے کہ مال آپ کے آرڈر کے مطابق پہنچ گیا ہے۔', 'تأكيدك يعني أن المادة وصلت كما طلبت.')}</div>
        )}
      </div>
      {!offer.received_at && isContractor && canAct && (offer.supplier_delivered_at || deliverOverdue) && (
        <div className={actions}>
          <button type="button" onClick={async () => {
            if (!(await askConfirm(home ? L('Did the goods reach you complete and as you ordered?\n\nWe will save the date of receipt, and this confirmation cannot be undone.', 'کیا آپ کو سامان پورا اور آرڈر کے مطابق مل گیا؟\n\nہم وصولی کی تاریخ محفوظ کریں گے، اور یہ تصدیق واپس نہیں لی جا سکتی۔', 'هل وصلتك البضاعة كاملة وكما طلبت؟\n\nسنحفظ تاريخ الاستلام، ولا يمكن التراجع عن هذا التأكيد.') : L('Have you actually received the goods, matching the order?\n\nA dated receipt record will be saved. Note: confirming receipt without actually receiving lowers your rating and makes you accountable.', 'کیا آپ کو واقعی مال مل گیا ہے اور وہ آرڈر کے مطابق ہے؟\n\nتاریخ کے ساتھ وصولی کا ریکارڈ محفوظ ہو جائے گا۔ نوٹ: مال ملے بغیر وصولی کنفرم کرنے سے آپ کی ریٹنگ کم ہو گی اور آپ جواب دہ ہوں گے۔', 'هل استلمت البضاعة فعلياً ومطابقة للمطلوب؟\n\nسيُسجَّل محضر استلام موثّق بالتاريخ. تنبيه: تأكيد الاستلام دون استلام فعلي يُخفّض تقييمك ويُعرّضك للمساءلة.'), { okLabel: L('Yes, I received it', 'ہاں، مل گیا', 'نعم، استلمتها'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
            if (await callRpc('confirm_receipt', { p_offer_id: offer.id }, 'receipt')) setJustReceived(true)
          }} disabled={busy === 'receipt'} className={offer.supplier_delivered_at ? PRIMARY : OUTLINE} style={offer.supplier_delivered_at ? GOLD : undefined}>
            <Check className="w-4 h-4" aria-hidden="true" /> {L('I confirm receipt', 'میں وصولی کنفرم کرتا ہوں', 'أؤكّد الاستلام')}
          </button>
          {offer.dispute_status !== 'open' && (
            <button type="button" onClick={() => openDispute(L('The goods were not delivered or do not match the order', 'مال ڈیلیور نہیں ہوا یا آرڈر کے مطابق نہیں ہے', 'البضاعة لم تُسلَّم أو لم تتطابق مع المطلوب'))}
              className={`${BTN} border border-red-300 text-red-700 bg-white hover:bg-red-50`}>
              {L('Not received', 'وصول نہیں ہوا', 'لم يتم الاستلام')}
            </button>
          )}
        </div>
      )}
    </div>
  )
  const rateCta = isContractor && (justReceived) && (
    <a key="rate" href={`/contractor/orders/${offer.id}#rate`} className={`${PRIMARY} w-full`} style={GOLD}>
      <Glyph e="⭐" /> {L('Rate the supplier now', 'ابھی سپلائر کی ریٹنگ دیں', 'قيّم المورد الآن')}
    </a>
  )

  const paymentSection = (
    <div key="paid" className={row} style={{ background: paid && offer.payment_confirmed_at ? '#E1F5EE' : '#f9fafb' }}>
      <div className="text-sm min-w-0">
        <div className="font-semibold text-gray-700">{L('Payment', 'ادائیگی', 'الدفع')}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {paid
            ? (offer.payment_confirmed_at
              ? <><Check className="inline w-3.5 h-3.5 text-[#0F6E56]" aria-hidden="true" /> {L('Supplier confirmed receiving the payment', 'سپلائر نے ادائیگی وصول ہونا کنفرم کر دیا', 'أكّد المورد استلام الدفعة')} · {fmtDate(offer.payment_confirmed_at)}</>
              : (isSupplier ? L('The buyer says they paid: confirm once you receive the amount.', 'خریدار کے مطابق ادائیگی ہو گئی: رقم ملنے پر تصدیق کریں۔', 'يقول المشتري إنه دفع: أكّد بعد استلامك المبلغ.') : L('You confirmed payment; waiting for the supplier to confirm receiving it', 'آپ نے ادائیگی کنفرم کر دی؛ سپلائر کی تصدیق کا انتظار ہے', 'أكّدتَ الدفع، وبانتظار تأكيد المورد استلامه')))
            : <>
                {dealAmount ? <>{L('Amount', 'رقم', 'المبلغ')}: <b className="text-[#0B2438]">{dealAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</b>{terms ? ` · ${terms}` : ''}. </> : terms ? <>{terms}. </> : null}
                {isContractor
                  ? L('Pay the supplier directly; the platform never receives any money.', 'سپلائر کو براہ راست ادائیگی کریں؛ پلیٹ فارم کوئی رقم وصول نہیں کرتا۔', 'ادفع للمورد مباشرةً؛ فالمنصة لا تستلم أي مبالغ.')
                  : L('The buyer pays you directly; the platform never receives any money.', 'خریدار آپ کو براہ راست ادائیگی کرتا ہے؛ پلیٹ فارم کوئی رقم وصول نہیں کرتا۔', 'يدفع لك المشتري مباشرةً؛ فالمنصة لا تستلم أي مبالغ.')}
              </>}
        </div>
      </div>
      <div className={actions}>
        {!paid && isContractor && canAct && (
          <button type="button" onClick={async () => { if ((await askConfirm(dealAmount ? L(`Have you paid the supplier ${fmtAmt(dealAmount)} SAR for this order?\n\nThis confirmation is recorded with its date and cannot be undone.`, `کیا آپ نے اس آرڈر کے لیے سپلائر کو ${fmtAmt(dealAmount)} ریال ادا کر دیے ہیں؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔`, `هل دفعت للمورد مبلغ ${fmtAmt(dealAmount)} ر.س لهذا الطلب؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.`) : L('Have you paid the supplier the amount of this order?\n\nThis confirmation is recorded with its date and cannot be undone.', 'کیا آپ نے اس آرڈر کی رقم سپلائر کو ادا کر دی ہے؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔', 'هل دفعت للمورد مبلغ هذا الطلب؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.'), { okLabel: L('Yes, I paid', 'ہاں، ادا کر دیا', 'نعم، دفعت'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) callRpc('mark_paid', { p_offer_id: offer.id }, 'paid') }}
            disabled={busy === 'paid'} className={offer.received_at ? PRIMARY : OUTLINE} style={offer.received_at ? GOLD : undefined}>
            <Check className="w-4 h-4" aria-hidden="true" /> {L('Confirm payment', 'ادائیگی کی تصدیق کریں', 'تأكيد الدفع')}
          </button>
        )}
        {paid && !offer.payment_confirmed_at && isSupplier && canAct && (
          <button type="button" onClick={async () => { if ((await askConfirm(L('Have you received the full payment for this order from the buyer?\n\nThis confirmation is recorded with its date and cannot be undone.', 'کیا آپ کو خریدار سے اس آرڈر کی پوری رقم مل گئی ہے؟\n\nیہ تصدیق تاریخ کے ساتھ ریکارڈ ہو گی اور واپس نہیں لی جا سکتی۔', 'هل استلمت من المشتري كامل مبلغ هذا الطلب؟\n\nسيُسجَّل هذا التأكيد بتاريخه ولا يمكن التراجع عنه.'), { okLabel: L('Yes, received', 'ہاں، مل گئی', 'نعم، استلمته'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) callRpc('confirm_payment', { p_offer_id: offer.id }, 'paycfm') }}
            disabled={busy === 'paycfm'} className={PRIMARY} style={GOLD}>
            <Check className="w-4 h-4" aria-hidden="true" /> {L('Confirm payment received', 'ادائیگی کی وصولی کی تصدیق کریں', 'تأكيد استلام الدفعة')}
          </button>
        )}
      </div>
    </div>
  )

  const sections = isSupplier
    ? [invoiceSection, deliverySection, receiptSection, paymentSection]
    : [deliverySection, receiptSection, rateCta, invoiceSection, paymentSection]

  return (
    <div id="deal" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 print:hidden scroll-mt-20" dir={dir}>
      <h3 className="text-base font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="🛡" /> {L('Deal steps', 'ڈیل کے مراحل', 'خطوات الصفقة')}</h3>
      <p className="text-xs text-gray-500 mb-3">{L('The platform records each stage of the deal as proof that protects both sides; it never holds any money.', 'پلیٹ فارم ڈیل کے ہر مرحلے کو ریکارڈ کرتا ہے تاکہ دونوں فریقوں کا تحفظ ہو؛ یہ کوئی رقم اپنے پاس نہیں رکھتا۔', 'توثّق المنصة مراحل الصفقة دليلاً يحمي الطرفين، ولا تحتفظ بأي مبالغ.')}</p>
      {managedByOwner && (
        <div className="mb-4 rounded-xl bg-[#0B2438]/5 border border-[#0B2438]/15 text-[#0B2438] text-xs font-semibold px-3 py-2">
          <Glyph e="ℹ" /> {L('The account owner manages this deal.', 'اس ڈیل کا انتظام اکاؤنٹ کا مالک کرتا ہے۔', 'إدارة هذه الصفقة لدى صاحب الحساب.')}
        </div>
      )}
      {deliverOverdue && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏰" /> {isSupplier ? L('You are past the agreed delivery date. Please confirm delivery or contact the buyer.', 'آپ طے شدہ ڈیلیوری کی تاریخ سے لیٹ ہیں۔ براہ کرم ڈیلیوری کنفرم کریں یا خریدار سے رابطہ کریں۔', 'تأخّرت عن موعد التوصيل المتّفق عليه. يُرجى تأكيد التسليم أو التواصل مع المشتري.') : L('The supplier is past the agreed delivery date. Follow up with them, or report a problem below.', 'سپلائر طے شدہ ڈیلیوری کی تاریخ سے لیٹ ہے۔ اس سے رابطہ کریں یا نیچے مسئلہ بتائیں۔', 'تأخّر المورد عن موعد التوصيل المتّفق عليه. تابع معه، أو أبلغ عن مشكلة أدناه.')}
        </div>
      )}
      {!hasDays && !offer.supplier_delivered_at && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏱" /> {isSupplier ? L('Your offer gave no delivery time. Agree on a delivery date with the buyer in messages.', 'آپ کی آفر میں ڈیلیوری کا وقت نہیں تھا۔ پیغامات میں خریدار سے تاریخ طے کریں۔', 'لم تحدّد مدة التوصيل في عرضك. اتفق مع المشتري على موعد التسليم عبر الرسائل.') : L('The supplier gave no delivery time. Agree on a delivery date with them in messages.', 'سپلائر نے ڈیلیوری کا وقت نہیں بتایا۔ پیغامات میں ان سے تاریخ طے کریں۔', 'لم يحدّد المورد مدة التوصيل. اتفق معه على موعد التسليم عبر الرسائل.')}
        </div>
      )}
      {receiptOverdue && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏰" /> {isContractor ? L('More than 48 hours since delivery was confirmed. Please confirm receipt or report a problem.', 'ڈیلیوری کنفرم ہوئے 48 گھنٹے سے زیادہ ہو گئے۔ براہ کرم وصولی کنفرم کریں یا مسئلہ بتائیں۔', 'مضى أكثر من 48 ساعة على تأكيد التسليم. يُرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.') : L('Waiting for the buyer to confirm receipt of the goods.', 'خریدار کی طرف سے مال کی وصولی کی تصدیق کا انتظار ہے۔', 'بانتظار تأكيد المشتري لاستلام البضاعة.')}
        </div>
      )}
      {w && !hideContact && (
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
              {s.at && <div className="text-xs text-gray-500">{new Date(s.at).toLocaleDateString(dloc)}</div>}
            </li>
          )
        })}
      </ol>

      {actErr && <p role="alert" className="mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2">{actErr}</p>}
      {notice && <p role="status" className="mb-3 rounded-xl bg-[#E1F5EE] border border-[#0F6E56]/30 text-[#0F6E56] text-xs font-semibold px-3 py-2">{notice}</p>}

      <div className="space-y-3">{sections}</div>

      {/* Dispute */}
      <div id="deal-dispute" className="mt-4 pt-4 border-t border-gray-100 scroll-mt-24">
        <a href="/deal-protection" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-xs font-bold text-[#8F6820] hover:underline mb-1"><Glyph e="🛡" /> {L('How we protect your deal', 'ہم سودے کی حفاظت کیسے کرتے ہیں', 'كيف نحمي صفقتك؟')}</a>
        {offer.dispute_status === 'open' ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
            <div className="font-bold text-red-700"><Glyph e="⚠" /> {L('Problem reported', 'مسئلہ رپورٹ ہوا', 'بلاغ عن مشكلة قيد المعالجة')}</div>
            <div className="text-xs text-red-700 mt-1">{offer.dispute_reason}</div>
            <div className="text-xs text-gray-600 mt-1">{L('The Taseerak team will contact both sides to mediate.', 'تسعیرک کی ٹیم صلح کے لیے دونوں فریقوں سے رابطہ کرے گی۔', 'سيتواصل فريق تسعيرك مع الطرفين للوساطة.')}</div>
          </div>
        ) : offer.dispute_status === 'resolved' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700"><Check className="inline w-4 h-4" aria-hidden="true" /> {L('Problem resolved', 'شکایت حل ہو گئی', 'تم حل المشكلة')}{offer.dispute_resolution ? `: ${offer.dispute_resolution}` : ''}</div>
        ) : !canAct ? null : !showDispute ? (
          <button type="button" onClick={() => openDispute()} className="text-xs font-semibold text-red-700 hover:underline min-h-11"><Glyph e="⚠" /> {L('Had a problem? Report it', 'کوئی مسئلہ ہوا؟ شکایت درج کریں', 'واجهت مشكلة؟ أبلغ عنها')}</button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <label htmlFor="deal-dispute-reason" className="block text-xs font-bold text-red-700 mb-1.5">{L('Describe the problem', 'مسئلہ بیان کریں', 'صف المشكلة')}</label>
            <textarea id="deal-dispute-reason" value={disputeReason} onChange={(e: any) => setDisputeReason(e.target.value)} className="input-field text-base sm:text-sm" rows={2} placeholder={L('e.g. goods not delivered / different from the specs / late payment...', 'مثال: مال ڈیلیور نہیں ہوا / اسپیسیفکیشن سے مختلف ہے / ادائیگی میں تاخیر...', 'مثال: البضاعة لم تُسلّم / مختلفة عن المواصفات / تأخّر الدفع...')} />
            <p className="text-xs text-gray-600 mt-1.5">{L('The other side and the Taseerak team are told, and the team contacts both of you.', 'دوسرے فریق اور تسعیرک کی ٹیم کو اطلاع دی جاتی ہے، اور ٹیم دونوں سے رابطہ کرتی ہے۔', 'يُبلَّغ الطرف الآخر وفريق تسعيرك، ويتواصل الفريق مع الطرفين.')}</p>
            <div className="grid grid-cols-1 sm:flex gap-2 mt-2">
              <button type="button" onClick={async () => {
                if (!disputeReason.trim()) return
                if (await callRpc('open_dispute', { p_offer_id: offer.id, p_reason: disputeReason.trim() }, 'dispute')) {
                  setShowDispute(false)
                  setNotice(L('Report sent. The Taseerak team will contact both sides.', 'رپورٹ بھیج دی گئی۔ تسعیرک کی ٹیم دونوں فریقوں سے رابطہ کرے گی۔', 'أُرسل البلاغ. سيتواصل فريق تسعيرك مع الطرفين.'))
                }
              }} disabled={!disputeReason.trim() || busy === 'dispute'} className={`${BTN} text-white bg-red-700 hover:bg-red-800`}>{L('Send report', 'شکایت بھیجیں', 'إرسال البلاغ')}</button>
              <button type="button" onClick={() => setShowDispute(false)} className={`${BTN} text-gray-600`}>{L('Close without sending', 'بھیجے بغیر بند کریں', 'إغلاق دون إرسال')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
