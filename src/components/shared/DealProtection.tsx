'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { waLink } from '@/lib/wa'

// 🛡 حماية الصفقة — محضر استلام + تأكيد دفع + نزاع (للطرفين).
// مكوّن مشترك يُعرض في صفحة تفاصيل الصفقة لكلٍّ من المقاول والمورّد (كلٌّ يرى أزراره).
// أمر الشراء (orders/[id]) صار فاتورة ضريبية فقط — إدارة الصفقة تتم من هنا.

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

  // 🔒 كل انتقال في حالة الصفقة يمرّ عبر دالة خادمية موثوقة (RPC) — لا تحديث مباشر.
  // الخادم يتحقق من الدور والحالة الحالية ويختم الوقت بنفسه، فلا يستطيع أي طرف
  // تزوير حالة الصفقة (تسليم/استلام/دفع/نزاع) بالكتابة المباشرة على الجدول.
  async function callRpc(fn: string, params: Record<string, any>, label: string) {
    setBusy(label)
    const supabase = createClient()
    const { data, error } = await supabase.rpc(fn, params)
    if (error) { alert('تعذّر إتمام العملية: ' + (error.message || 'خطأ غير متوقع')); setBusy(''); return }
    if (data) setOffer({ ...offer, ...(data as any) })
    setBusy('')
  }

  if (offer.status !== 'accepted' || !(isContractor || isSupplier)) return null

  const w = waLink(otherParty?.contact_phone || otherParty?.phone, `بخصوص أمر الشراء ${poNumber} في منصة تسعيرك`)

  // تنبيه بصري فوري إذا تأخّرت مرحلة عن موعدها (يكمّل إشعارات الجرس التلقائية كل ساعة)
  const dd = Math.max(Number(offer.delivery_days) || 3, 1)
  const deliverOverdue = !offer.supplier_delivered_at && offer.accepted_at && (new Date(offer.accepted_at).getTime() + dd * 86400000 < Date.now())
  const receiptOverdue = !!offer.supplier_delivered_at && !offer.received_at && (new Date(offer.supplier_delivered_at).getTime() + 48 * 3600000 < Date.now())

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir="rtl">
      <h3 className="text-base font-bold mb-1" style={{ color: '#1B2D5B' }}>🛡 حماية الصفقة</h3>
      <p className="text-xs text-gray-400 mb-3">توثّق المنصة مراحل الصفقة كدليل يحمي الطرفين — ولا تحتفظ بأي مبالغ.</p>
      {deliverOverdue && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 leading-relaxed">
          ⏰ {isSupplier ? 'تأخّرت عن موعد التوصيل المتّفق عليه — يرجى تأكيد التسليم أو التواصل مع المقاول.' : 'المورد تأخّر عن موعد التوصيل المتّفق عليه — تابع معه أو افتح نزاعاً أدناه.'}
        </div>
      )}
      {receiptOverdue && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-2 leading-relaxed">
          ⏰ {isContractor ? 'مضى أكثر من 48 ساعة على تأكيد التوصيل — يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.' : 'بانتظار تأكيد المقاول لاستلام البضاعة.'}
        </div>
      )}
      {w && (
        <a href={w} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs mb-4 px-3 py-1.5 rounded-full font-semibold text-white" style={{ background: '#25D366' }}>
          💬 تواصل مع {isContractor ? 'المورد' : 'المقاول'} عبر واتساب
        </a>
      )}

      {/* Tracker */}
      <div className="grid grid-cols-4 gap-2 mb-5 text-center text-[11px]">
        {[
          { k: 'accept', label: 'قبول العرض', done: true, at: offer.accepted_at },
          { k: 'deliver', label: 'تسليم المورد', done: !!offer.supplier_delivered_at, at: offer.supplier_delivered_at },
          { k: 'receipt', label: 'استلام المقاول', done: !!offer.received_at, at: offer.received_at },
          { k: 'paid', label: 'الدفع', done: offer.payment_status === 'paid', at: offer.payment_confirmed_at || offer.paid_marked_at },
        ].map((s: any, i: number) => (
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
            <button onClick={() => callRpc('confirm_delivery', { p_offer_id: offer.id }, 'deliver')} disabled={busy === 'deliver'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#1B2D5B' }}>✓ أكّدت التسليم</button>
          )}
        </div>

        {/* Receipt = محضر استلام */}
        <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: offer.received_at ? '#E1F5EE' : '#f9fafb' }}>
          <div className="text-sm">
            <div className="font-semibold text-gray-700">محضر الاستلام</div>
            <div className="text-xs text-gray-400">{offer.received_at ? `✓ موثّق — أكّد المقاول الاستلام ${new Date(offer.received_at).toLocaleString('ar-SA')}` : 'بانتظار تأكيد المقاول لاستلام البضاعة'}</div>
          </div>
          {!offer.received_at && isContractor && (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { setDisputeReason('البضاعة لم تُسلَّم أو لم تتطابق مع المطلوب'); setShowDispute(true) }} className="text-xs px-3 py-2 rounded-xl font-semibold border border-red-300 text-red-600 hover:bg-red-50 whitespace-nowrap">✕ لم يتم الاستلام</button>
              <button onClick={() => { if (confirm('⚠ هل استلمت البضاعة فعلياً ومطابقة للمطلوب؟\n\nسيُسجَّل محضر استلام موثّق بالتاريخ. تنبيه: تأكيد الاستلام دون استلام فعلي يُخفّض تقييمك ويُعرّضك للمساءلة.')) callRpc('confirm_receipt', { p_offer_id: offer.id }, 'receipt') }} disabled={busy === 'receipt'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>✓ أؤكّد الاستلام</button>
            </div>
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
              <button onClick={() => callRpc('mark_paid', { p_offer_id: offer.id }, 'paid')} disabled={busy === 'paid'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#1B2D5B' }}>✓ أكّدت الدفع</button>
            )}
            {offer.payment_status === 'paid' && !offer.payment_confirmed_at && isSupplier && (
              <button onClick={() => callRpc('confirm_payment', { p_offer_id: offer.id }, 'paycfm')} disabled={busy === 'paycfm'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>✓ أكّدت استلام الدفعة</button>
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
            <textarea value={disputeReason} onChange={(e: any) => setDisputeReason(e.target.value)} className="input-field" rows={2} placeholder="مثال: البضاعة لم تُسلّم / مختلفة عن المواصفات / تأخّر الدفع..." />
            <div className="flex gap-2 mt-2">
              <button onClick={() => { if (!disputeReason) return; callRpc('open_dispute', { p_offer_id: offer.id, p_reason: disputeReason }, 'dispute'); setShowDispute(false) }} disabled={!disputeReason || busy === 'dispute'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white bg-red-500 disabled:opacity-50">إرسال النزاع</button>
              <button onClick={() => setShowDispute(false)} className="text-xs px-3 py-2 text-gray-500">إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
