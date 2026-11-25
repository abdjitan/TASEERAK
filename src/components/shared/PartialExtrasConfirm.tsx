'use client'
// Partial award + extra charges (migration 191, owner 2026-11-01): the buyer chose only some of the
// materials this supplier priced, so the delivery / other charges wait for the supplier to confirm or
// lower them (never raise) for what they won. confirm_partial_extras notifies the buyer.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/friendlyError'
import { toLatinDigits } from '@/lib/phone'
import Glyph from '@/components/shared/Glyph'
import { askConfirm } from '@/lib/askConfirm'
import { arCount } from '@/lib/text'
import { lineComparable } from '@/lib/vat'

export default function PartialExtrasConfirm({ offer, locale, wonCount, onDone }: { offer: any; locale: string; wonCount?: number; onDone: (o: any) => void }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const original: any[] = Array.isArray(offer?.extras_original) ? offer.extras_original : []
  const [rows, setRows] = useState<any[]>(original.map((e: any) => ({ label: String(e.label || ''), amount: String(e.amount ?? '') })))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const num = (v: any) => parseFloat(toLatinDigits(String(v || '')).replace('٫', '.')) || 0
  const max = original.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
  const sum = rows.reduce((s: number, r: any) => s + num(r.amount), 0)
  const buyerSum = lineComparable(sum, offer) // what the buyer pays for these charges (with VAT, or final)
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const SAR = L('SAR', 'ریال', 'ر.س')
  // the basis of the amounts, said everywhere the cap appears (round-4 UX-128); none for a seller outside VAT
  const basis = offer?.vat_status === 'not_registered' ? ''
    : offer?.vat_included ? ' ' + L('(incl. VAT)', '(VAT سمیت)', '(شاملة الضريبة)')
    : ' ' + L('(before VAT)', '(VAT کے بغیر)', '(قبل الضريبة)')

  async function save() {
    setErr('')
    if (sum > max) { setErr(L(`The charges can't be higher than your original offer (${fmt(max)} SAR${basis}).`, `چارجز آپ کی اصل پیشکش (${fmt(max)} ریال${basis}) سے زیادہ نہیں ہو سکتے۔`, `لا يمكن أن تزيد الرسوم على عرضك الأصلي (${fmt(max)} ر.س${basis}).`)); return }
    if (!(await askConfirm(L(`Confirm ${fmt(sum)} SAR${basis} in charges for the materials you won? The buyer will be notified.`, `جیتے گئے سامان کے لیے ${fmt(sum)} ریال${basis} چارجز کنفرم کریں؟ خریدار کو اطلاع دی جائے گی۔`, `تأكيد رسوم بقيمة ${fmt(sum)} ر.س${basis} للمواد التي فزت بها؟ سيُبلَّغ المشتري.`), { okLabel: L('Confirm charges', 'چارجز کنفرم کریں', 'تأكيد الرسوم'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setBusy(true)
    const payload = rows.filter((r: any) => num(r.amount) > 0).map((r: any) => ({ label: r.label.trim() || L('Delivery', 'ڈیلیوری', 'توصيل'), amount: num(r.amount) }))
    const { error } = await createClient().rpc('confirm_partial_extras', { p_offer_id: offer.id, p_extras: payload })
    setBusy(false)
    if (error) { setErr(friendlyError(error.message, L('Could not save — please try again.', 'محفوظ نہیں ہو سکا — دوبارہ کوشش کریں۔', 'تعذّر الحفظ — حاول مرة أخرى.'), locale)); return }
    onDone({ ...offer, extra_charges: payload.length ? payload : null, extras_pending: false, extras_confirmed_at: new Date().toISOString() })
  }

  return (
    <div className="mt-4 rounded-xl border border-warn-border bg-warn-bg p-4 text-start" role="region" aria-label={L('Confirm charges', 'چارجز کی تصدیق', 'تأكيد الرسوم')}>
      <h4 className="font-bold text-warn-text text-sm mb-1"><Glyph e="🚚" /> {L('Confirm the delivery and other charges', 'ڈیلیوری اور دیگر چارجز کی تصدیق کریں', 'أكّد رسوم التوصيل والرسوم الإضافية')}</h4>
      <p className="text-xs text-warn-text leading-relaxed mb-3">
        {wonCount
          ? L(`The buyer chose ${wonCount} of the materials you priced, not all of them. Set the charges for these materials only: keep them or lower them.`, `خریدار نے آپ کی قیمت والے سامان میں سے صرف ${wonCount} چنے ہیں۔ صرف انہی کے چارجز رکھیں یا کم کریں۔`, `اختار المشتري ${arCount(wonCount, 'مادة واحدة', 'مادتين', 'مواد', 'مادة')} مما سعّرته، لا كل المواد. حدّد الرسوم لهذه المواد فقط: أبقِها أو خفّضها.`)
          : L('The buyer chose only some of the materials you priced. Set the charges for these materials only: keep them or lower them.', 'خریدار نے آپ کی قیمت والے سامان میں سے کچھ ہی چنے ہیں۔ صرف انہی کے چارجز رکھیں یا کم کریں۔', 'اختار المشتري بعض المواد التي سعّرتها فقط. حدّد الرسوم لهذه المواد فقط: أبقِها أو خفّضها.')}
      </p>
      <div className="space-y-2">
        {rows.map((r: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">{r.label || L('Delivery', 'ڈیلیوری', 'توصيل')}</span>
            <input type="text" inputMode="decimal" dir="ltr" value={r.amount} aria-label={r.label || L('Amount', 'رقم', 'المبلغ')}
              onChange={(e: any) => setRows(prev => prev.map((x: any, k: number) => k === i ? { ...x, amount: e.target.value } : x))}
              className="input-field w-28 text-end text-base sm:text-sm" />
            <span className="text-xs text-gray-500 w-8">{SAR}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm">
        <span className="text-gray-600">{L('Total charges', 'کل چارجز', 'إجمالي الرسوم')}: <b className={sum > max ? 'text-red-600' : 'text-[#0B2438]'}>{fmt(sum)} {SAR}</b> <span className="text-xs text-gray-600">({L('max', 'زیادہ سے زیادہ', 'الحد الأقصى')} {fmt(max)} {SAR}{basis})</span>
          {/* owner 2026-11-23: the buyer sees every amount with VAT; say what that is when the seller typed net */}
          {buyerSum !== sum && <span className="block text-xs text-gray-600">{L(`The buyer sees ${fmt(buyerSum)} SAR incl. VAT`, `خریدار کو ${fmt(buyerSum)} ریال VAT سمیت نظر آئے گا`, `يراها المشتري ${fmt(buyerSum)} ر.س شاملة الضريبة`)}</span>}</span>
        <button type="button" onClick={save} disabled={busy} className="min-h-11 px-4 py-2 rounded-xl text-sm font-extrabold disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>
          {busy ? '…' : L('Confirm charges', 'چارجز کنفرم کریں', 'تأكيد الرسوم')}
        </button>
      </div>
      {err && <p role="alert" className="text-xs text-red-600 mt-2">{err}</p>}
    </div>
  )
}
