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
          className="mt-0.5 w-5 h-5 shrink-0 accent-[#0B2438]" aria-describedby={id + '-note'} />
        <span className="font-bold">{L('I need a tax invoice', 'مجھے ٹیکس انوائس چاہیے', 'أحتاج فاتورة ضريبية')}</span>
      </label>
      {/* what each state does (round-8 UX-128): on = grouped and folded, never blocked; off = no separation */}
      {checked && (
        <p id={id + '-note'} className="mt-1 text-[12px] leading-relaxed text-gray-600">{L(
          'Offers from sellers who do not issue a tax invoice are grouped in a separate, folded section.',
          'جو فروخت کنندگان ٹیکس انوائس جاری نہیں کرتے ان کی آفرز ایک الگ، بند حصے میں جمع کی جاتی ہیں۔',
          'تُجمع عروض من لا يُصدر فاتورة ضريبية في قسم منفصل مطويّ.')}</p>
      )}
      {!checked && (
        <p id={id + '-note'} role="note" className="mt-1.5 flex items-start gap-2 rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-3 py-2 text-[13px] leading-relaxed text-[#6C531F]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <span>{L(
            'Offers from sellers who do not issue a tax invoice will appear with the other offers, not separated.',
            'جو فروخت کنندگان ٹیکس انوائس جاری نہیں کرتے ان کی آفرز باقی آفرز کے ساتھ، الگ کیے بغیر دکھائی دیں گی۔',
            'ستظهر عروض من لا يُصدر فاتورة ضريبية مع بقية العروض دون فصل.')}</span>
        </p>
      )}
    </div>
  )
}
