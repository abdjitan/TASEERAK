'use client'
// «أحتاج فاتورة ضريبية» (round-7 UX-018): one checkbox for the request page, the bill of quantities and
// the review step. Business requests default to ticked (owner 2026-11-25); when it is unticked a gold
// note says what that means, so turning it off is never silent.
import { AlertTriangle } from 'lucide-react'

export default function VatInvoiceToggle({ checked, onChange, locale, id = 'need-tax-invoice' }: {
  checked: boolean
  onChange: (v: boolean) => void
  locale: string
  id?: string
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2.5 min-h-[44px] cursor-pointer text-sm text-[#071827]">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 shrink-0 accent-[#0B2438]" aria-describedby={checked ? undefined : id + '-note'} />
        <span className="font-bold">{L('I need a tax invoice', 'مجھے ٹیکس انوائس چاہیے', 'أحتاج فاتورة ضريبية')}</span>
      </label>
      {!checked && (
        <p id={id + '-note'} role="note" className="mt-1.5 flex items-start gap-2 rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-3 py-2 text-[13px] leading-relaxed text-[#6C531F]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <span>{L(
            'You may receive offers from suppliers who have no VAT number, so they do not issue a tax invoice.',
            'آپ کو ایسے سپلائرز کی آفرز بھی مل سکتی ہیں جن کے پاس ٹیکس نمبر نہیں، اس لیے وہ ٹیکس انوائس جاری نہیں کرتے۔',
            'قد تصلك عروض من موردين ليس لديهم رقم ضريبي، فلا يُصدرون فاتورة ضريبية.')}</span>
        </p>
      )}
    </div>
  )
}
