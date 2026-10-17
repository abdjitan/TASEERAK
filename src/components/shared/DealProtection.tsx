'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { waLink } from '@/lib/wa'
import { fileHref } from '@/lib/fileHref'
import { useTranslation } from '@/i18n'
import Glyph from '@/components/shared/Glyph'

// 🛡 حماية الصفقة — محضر استلام + تأكيد دفع + نزاع (للطرفين).
// مكوّن مشترك يُعرض في صفحة تفاصيل الصفقة لكلٍّ من المشتري والمورد (كلٌّ يرى أزراره).
// الفاتورة الرسمية يصدرها المورد ويرفعها هنا؛ أمر الشراء في المنصة مستند غير رسمي.

type Party = { company_name_ar?: string; company_name_en?: string; phone?: string; contact_phone?: string } | null

export default function DealProtection({
  offer: initialOffer,
  isContractor,
  isSupplier,
  otherParty,
  poNumber,
}: {
  offer: any
  isContractor: boolean
  isSupplier: boolean
  otherParty: Party
  poNumber: string
  myId?: string | null
}) {
  const [offer, setOffer] = useState<any>(initialOffer)
  const [busy, setBusy] = useState('')
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [invErr, setInvErr] = useState('')
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK' : 'ar-SA-u-ca-gregory'

  // المورد يرفع فاتورته الرسمية (من عنده، أو من المحل الذي اشترى منه) فتُرفق بالصفقة للمشتري.
  async function uploadInvoice(file: File | null | undefined) {
    if (!file) return
    setInvErr(''); setBusy('invoice')
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload-attachment', { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) { setInvErr(j?.message || L('Could not upload the file. Please try again.', 'فائل اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر رفع الملف. حاول مرة أخرى.')); setBusy(''); return }
    const { data, error } = await createClient().rpc('attach_supplier_invoice', { p_offer_id: offer.id, p_url: j.url, p_name: j.name || file.name })
    if (error) setInvErr(error.message || L('Could not attach the invoice.', 'انوائس منسلک نہیں ہو سکی۔', 'تعذّر إرفاق الفاتورة.'))
    else if (data) setOffer({ ...offer, ...(data as any) })
    setBusy('')
  }

  // 🔒 كل انتقال في حالة الصفقة يمرّ عبر دالة خادمية موثوقة (RPC) — لا تحديث مباشر.
  // الخادم يتحقق من الدور والحالة الحالية ويختم الوقت بنفسه، فلا يستطيع أي طرف
  // تزوير حالة الصفقة (تسليم/استلام/دفع/نزاع) بالكتابة المباشرة على الجدول.
  async function callRpc(fn: string, params: Record<string, any>, label: string) {
    setBusy(label)
    const supabase = createClient()
    const { data, error } = await supabase.rpc(fn, params)
    if (error) { alert(L('Could not complete the action: ', 'کارروائی مکمل نہیں ہو سکی: ', 'تعذّر إتمام العملية: ') + (error.message || L('Unexpected error', 'غیر متوقع خرابی', 'خطأ غير متوقع'))); setBusy(''); return }
    if (data) setOffer({ ...offer, ...(data as any) })
    setBusy('')
  }

  if (offer.status !== 'accepted' || !(isContractor || isSupplier)) return null

  const w = waLink(otherParty?.contact_phone || otherParty?.phone, L(`Regarding purchase order ${poNumber} on Taseerak`, `تسعیرک پر پرچیز آرڈر ${poNumber} کے بارے میں`, `بخصوص أمر الشراء ${poNumber} في منصة تسعيرك`))

  // تنبيه بصري فوري إذا تأخّرت مرحلة عن موعدها (يكمّل إشعارات الجرس التلقائية كل ساعة)
  const dd = Math.max(Number(offer.delivery_days) || 3, 1)
  const deliverOverdue = !offer.supplier_delivered_at && offer.accepted_at && (new Date(offer.accepted_at).getTime() + dd * 86400000 < Date.now())
  const receiptOverdue = !!offer.supplier_delivered_at && !offer.received_at && (new Date(offer.supplier_delivered_at).getTime() + 48 * 3600000 < Date.now())

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={dir}>
      <h3 className="text-base font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="🛡" /> {L('Deal protection', 'ڈیل کا تحفظ', 'حماية الصفقة')}</h3>
      <p className="text-xs text-gray-400 mb-3">{L('The platform records each stage of the deal as proof that protects both sides — it never holds any money.', 'پلیٹ فارم ڈیل کے ہر مرحلے کو ریکارڈ کرتا ہے تاکہ دونوں فریقوں کا تحفظ ہو — یہ کوئی رقم اپنے پاس نہیں رکھتا۔', 'توثّق المنصة مراحل الصفقة كدليل يحمي الطرفين — ولا تحتفظ بأي مبالغ.')}</p>
      {deliverOverdue && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏰" /> {isSupplier ? L('You are past the agreed delivery date — please confirm delivery or contact the buyer.', 'آپ طے شدہ ڈیلیوری کی تاریخ سے لیٹ ہیں — براہ کرم ڈیلیوری کنفرم کریں یا خریدار سے رابطہ کریں۔', 'تأخّرت عن موعد التوصيل المتّفق عليه — يرجى تأكيد التسليم أو التواصل مع المشتري.') : L('The supplier is past the agreed delivery date — follow up with them or open a dispute below.', 'سپلائر طے شدہ ڈیلیوری کی تاریخ سے لیٹ ہے — اس سے رابطہ کریں یا نیچے شکایت درج کریں۔', 'المورد تأخّر عن موعد التوصيل المتّفق عليه — تابع معه أو أبلغ عن مشكلة أدناه.')}
        </div>
      )}
      {receiptOverdue && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-2 leading-relaxed">
          <Glyph e="⏰" /> {isContractor ? L('More than 48 hours since delivery was confirmed — please confirm receipt or report a problem.', 'ڈیلیوری کنفرم ہوئے 48 گھنٹے سے زیادہ ہو گئے — براہ کرم وصولی کنفرم کریں یا مسئلہ بتائیں۔', 'مضى أكثر من 48 ساعة على تأكيد التوصيل — يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.') : L('Waiting for the buyer to confirm receipt of the goods.', 'خریدار کی طرف سے مال کی وصولی کی تصدیق کا انتظار ہے۔', 'بانتظار تأكيد المشتري لاستلام البضاعة.')}
        </div>
      )}
      {w && (
        <a href={w} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs mb-4 px-3 py-1.5 rounded-full font-semibold text-white" style={{ background: '#25D366' }}>
          <Glyph e="💬" /> {isContractor ? L('Contact the supplier on WhatsApp', 'سپلائر سے واٹس ایپ پر رابطہ کریں', 'تواصل مع المورد عبر واتساب') : L('Contact the buyer on WhatsApp', 'خریدار سے واٹس ایپ پر رابطہ کریں', 'تواصل مع المشتري عبر واتساب')}
        </a>
      )}

      {/* Tracker */}
      <div className="grid grid-cols-4 gap-2 mb-5 text-center text-[11px]">
        {[
          { k: 'accept', label: L('Offer accepted', 'آفر قبول', 'قبول العرض'), done: true, at: offer.accepted_at },
          { k: 'deliver', label: L('Supplier delivery', 'سپلائر کی ڈیلیوری', 'تسليم المورد'), done: !!offer.supplier_delivered_at, at: offer.supplier_delivered_at },
          { k: 'receipt', label: L('Buyer receipt', 'خریدار کی وصولی', 'استلام المشتري'), done: !!offer.received_at, at: offer.received_at },
          { k: 'paid', label: L('Payment', 'ادائیگی', 'الدفع'), done: offer.payment_status === 'paid', at: offer.payment_confirmed_at || offer.paid_marked_at },
        ].map((s: any, i: number) => (
          <div key={s.k} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${s.done ? 'text-white' : 'bg-gray-100 text-gray-400'}`} style={s.done ? { background: '#0F6E56' } : {}}>{s.done ? '✓' : i + 1}</div>
            <div className={`mt-1 ${s.done ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>{s.label}</div>
            {s.at && <div className="text-[9px] text-gray-400">{new Date(s.at).toLocaleDateString(dloc)}</div>}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {/* Delivery */}
        <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
          <div className="text-sm">
            <div className="font-semibold text-gray-700">{L('Delivery of goods', 'مال کی ڈیلیوری', 'تسليم البضاعة')}</div>
            <div className="text-xs text-gray-400">{offer.supplier_delivered_at ? `✓ ${L('Supplier confirmed delivery', 'سپلائر نے ڈیلیوری کنفرم کر دی', 'أكّد المورد التسليم')} — ${new Date(offer.supplier_delivered_at).toLocaleString(dloc)}` : L('Waiting for the supplier to confirm', 'سپلائر کی تصدیق کا انتظار ہے', 'بانتظار تأكيد المورد')}</div>
          </div>
          {!offer.supplier_delivered_at && isSupplier && (
            <button onClick={() => callRpc('confirm_delivery', { p_offer_id: offer.id }, 'deliver')} disabled={busy === 'deliver'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0B2438' }}>✓ {L('I confirm delivery', 'میں نے ڈیلیوری کر دی', 'أكّدت التسليم')}</button>
          )}
        </div>

        {/* Receipt = محضر استلام */}
        <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: offer.received_at ? '#E1F5EE' : '#f9fafb' }}>
          <div className="text-sm">
            <div className="font-semibold text-gray-700">{L('Receipt confirmation', 'وصولی کا ریکارڈ', 'تأكيد الاستلام')}</div>
            <div className="text-xs text-gray-400">{offer.received_at ? `✓ ${L('Recorded — the buyer confirmed receipt', 'ریکارڈ ہو گیا — خریدار نے وصولی کنفرم کر دی', 'موثّق — أكّد المشتري الاستلام')} ${new Date(offer.received_at).toLocaleString(dloc)}` : L('Waiting for the buyer to confirm receipt of the goods', 'خریدار کی طرف سے مال کی وصولی کی تصدیق کا انتظار ہے', 'بانتظار تأكيد المشتري لاستلام البضاعة')}</div>
          </div>
          {!offer.received_at && isContractor && (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { setDisputeReason(L('The goods were not delivered or do not match the order', 'مال ڈیلیور نہیں ہوا یا آرڈر کے مطابق نہیں ہے', 'البضاعة لم تُسلَّم أو لم تتطابق مع المطلوب')); setShowDispute(true) }} className="text-xs px-3 py-2 rounded-xl font-semibold border border-red-300 text-red-600 hover:bg-red-50 whitespace-nowrap">✕ {L('Not received', 'وصول نہیں ہوا', 'لم يتم الاستلام')}</button>
              <button onClick={() => { if (confirm(L('Have you actually received the goods, matching the order?\n\nA dated receipt record will be saved. Note: confirming receipt without actually receiving lowers your rating and makes you accountable.', 'کیا آپ کو واقعی مال مل گیا ہے اور وہ آرڈر کے مطابق ہے؟\n\nتاریخ کے ساتھ وصولی کا ریکارڈ محفوظ ہو جائے گا۔ نوٹ: مال ملے بغیر وصولی کنفرم کرنے سے آپ کی ریٹنگ کم ہو گی اور آپ جواب دہ ہوں گے۔', 'هل استلمت البضاعة فعلياً ومطابقة للمطلوب؟\n\nسيُسجَّل محضر استلام موثّق بالتاريخ. تنبيه: تأكيد الاستلام دون استلام فعلي يُخفّض تقييمك ويُعرّضك للمساءلة.'))) callRpc('confirm_receipt', { p_offer_id: offer.id }, 'receipt') }} disabled={busy === 'receipt'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>✓ {L('I confirm receipt', 'میں وصولی کنفرم کرتا ہوں', 'أؤكّد الاستلام')}</button>
            </div>
          )}
        </div>

        {/* Official invoice: issued by the seller, attached to the deal */}
        <div className="rounded-xl p-3" style={{ background: offer.supplier_invoice_url ? '#E1F5EE' : '#f9fafb' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm min-w-0">
              <div className="font-semibold text-gray-700"><Glyph e="🧾" /> {L('Official invoice', 'باضابطہ انوائس', 'الفاتورة الرسمية')}</div>
              <div className="text-xs text-gray-400">
                {offer.supplier_invoice_url
                  ? `✓ ${L('Attached by the supplier', 'سپلائر نے منسلک کر دی', 'أرفقها المورد')} — ${new Date(offer.supplier_invoice_at).toLocaleString(dloc)}`
                  : isSupplier
                    ? L('Upload your official invoice (or the invoice from the shop you bought from) on delivery.', 'ڈیلیوری پر اپنی باضابطہ انوائس (یا جس دکان سے خریدا اس کی انوائس) اپ لوڈ کریں۔', 'ارفع فاتورتك الرسمية (أو فاتورة المحل الذي اشتريت منه) عند التوصيل.')
                    : L('The supplier attaches it on delivery.', 'سپلائر ڈیلیوری پر اسے منسلک کرے گا۔', 'يُرفقها المورد عند التوصيل.')}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {offer.supplier_invoice_url && (
                <a href={fileHref(offer.supplier_invoice_url)} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-2 rounded-xl font-semibold border border-gray-200 bg-white text-gray-700 whitespace-nowrap"><Glyph e="📄" /> {L('View invoice', 'انوائس دیکھیں', 'عرض الفاتورة')}</a>
              )}
              {isSupplier && (
                <label className={`text-xs px-4 py-2 rounded-xl font-semibold text-white whitespace-nowrap cursor-pointer ${busy === 'invoice' ? 'opacity-50 pointer-events-none' : ''}`} style={{ background: '#0B2438' }}>
                  {busy === 'invoice' ? L('Uploading…', 'اپ لوڈ ہو رہی ہے…', 'جارٍ الرفع…') : offer.supplier_invoice_url ? L('Replace', 'تبدیل کریں', 'استبدال') : `⬆ ${L('Upload invoice', 'انوائس اپ لوڈ کریں', 'رفع الفاتورة')}`}
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e: any) => { uploadInvoice(e.target.files?.[0]); e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>
          {invErr && <p className="text-xs text-red-600 mt-2" role="alert">{invErr}</p>}
        </div>

        {/* Payment */}
        <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
          <div className="text-sm">
            <div className="font-semibold text-gray-700">{L('Payment', 'ادائیگی', 'الدفع')}</div>
            <div className="text-xs text-gray-400">
              {offer.payment_status === 'paid'
                ? (offer.payment_confirmed_at ? `✓ ${L('Supplier confirmed receiving the payment', 'سپلائر نے ادائیگی وصول ہونا کنفرم کر دیا', 'أكّد المورد استلام الدفعة')} — ${new Date(offer.payment_confirmed_at).toLocaleString(dloc)}` : L('Buyer confirmed payment — waiting for the supplier to confirm', 'خریدار نے ادائیگی کنفرم کر دی — سپلائر کی تصدیق کا انتظار ہے', 'أكّد المشتري الدفع — بانتظار تأكيد المورد'))
                : L('Payment not confirmed yet', 'ادائیگی ابھی کنفرم نہیں ہوئی', 'لم تُؤكَّد الدفعة بعد')}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {offer.payment_status !== 'paid' && isContractor && (
              <button onClick={() => callRpc('mark_paid', { p_offer_id: offer.id }, 'paid')} disabled={busy === 'paid'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0B2438' }}>✓ {L('I confirm payment', 'میں نے ادائیگی کر دی', 'أكّدت الدفع')}</button>
            )}
            {offer.payment_status === 'paid' && !offer.payment_confirmed_at && isSupplier && (
              <button onClick={() => callRpc('confirm_payment', { p_offer_id: offer.id }, 'paycfm')} disabled={busy === 'paycfm'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>✓ {L('I confirm payment received', 'ادائیگی وصول ہو گئی', 'أكّدت استلام الدفعة')}</button>
            )}
          </div>
        </div>
      </div>

      {/* Dispute */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        {offer.dispute_status === 'open' ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
            <div className="font-bold text-red-700"><Glyph e="⚠" /> {L('Open dispute', 'شکایت زیرِ کارروائی', 'نزاع مفتوح')}</div>
            <div className="text-xs text-red-600 mt-1">{offer.dispute_reason}</div>
            <div className="text-[11px] text-gray-500 mt-1">{L('The platform team will contact both sides to mediate.', 'پلیٹ فارم کی ٹیم صلح کے لیے دونوں فریقوں سے رابطہ کرے گی۔', 'فريق المنصة سيتواصل مع الطرفين للوساطة.')}</div>
          </div>
        ) : offer.dispute_status === 'resolved' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">✓ {L('Problem resolved', 'شکایت حل ہو گئی', 'تم حل المشكلة')}{offer.dispute_resolution ? `: ${offer.dispute_resolution}` : ''}</div>
        ) : !showDispute ? (
          <button onClick={() => setShowDispute(true)} className="text-xs text-red-600 hover:underline"><Glyph e="⚠" /> {L('Had a problem? Report it', 'کوئی مسئلہ ہوا؟ شکایت درج کریں', 'واجهت مشكلة؟ أبلغ عن مشكلة')}</button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <label className="block text-xs font-bold text-red-700 mb-1.5">{L('Describe the problem', 'مسئلہ بیان کریں', 'صف المشكلة')}</label>
            <textarea value={disputeReason} onChange={(e: any) => setDisputeReason(e.target.value)} className="input-field" rows={2} placeholder={L('e.g. goods not delivered / different from the specs / late payment...', 'مثال: مال ڈیلیور نہیں ہوا / اسپیسیفکیشن سے مختلف ہے / ادائیگی میں تاخیر...', 'مثال: البضاعة لم تُسلّم / مختلفة عن المواصفات / تأخّر الدفع...')} />
            <div className="flex gap-2 mt-2">
              <button onClick={() => { if (!disputeReason) return; callRpc('open_dispute', { p_offer_id: offer.id, p_reason: disputeReason }, 'dispute'); setShowDispute(false) }} disabled={!disputeReason || busy === 'dispute'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white bg-red-500 disabled:opacity-50">{L('Send report', 'شکایت بھیجیں', 'إرسال البلاغ')}</button>
              <button onClick={() => setShowDispute(false)} className="text-xs px-3 py-2 text-gray-500">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
