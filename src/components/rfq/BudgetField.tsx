'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

// R23 (owner 2026-11-12): optional buyer budget per unit. Hidden from suppliers
// unless the buyer ticks «أظهرها للموردين» — with a warning that a shown cap invites
// suppliers to price at it instead of their lowest price.
// Owner 2026-11-23: every buyer (home or business) types the most he pays per unit, VAT-inclusive;
// the caller stores it before VAT (budgetToStored) and shows it back with budgetShown.
// `home` is kept for older callers and no longer changes the wording.
export default function BudgetField({ value, visible, unit, locale, onChange }: {
  value: string
  visible: boolean
  unit?: string
  locale: string
  onChange: (budget: string, visible: boolean) => void
  home?: boolean
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [open, setOpen] = useState(!!value)
  const label = L('Most you pay per unit, incl. VAT (optional)', 'فی یونٹ زیادہ سے زیادہ رقم، VAT سمیت (اختیاری)', 'أقصى مبلغ للوحدة شامل الضريبة (اختياري)')

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="min-h-11 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-700 hover:bg-gray-50">
        + {label}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 space-y-2">
      <label className="block">
        <span className="block text-[12px] font-semibold text-gray-700 mb-1">{label}</span>
        <div className="flex items-center gap-2">
          <input type="text" inputMode="decimal" value={value}
            onChange={e => onChange(e.target.value.replace(/[^\d.,٠-٩۰-۹٫،]/g, '') /* Urdu (Persian) digits too (round-5 UX-135) */.slice(0, 12), visible)}
            className="input-field text-base sm:text-sm flex-1" placeholder={L('e.g. 150', 'مثلاً 150', 'مثلاً 150')}
            aria-label={label} />
          <span className="text-[12px] text-gray-600 whitespace-nowrap">{L('SAR', 'ریال', 'ر.س')}{unit ? ` / ${unit}` : ''}</span>
          <button type="button" onClick={() => { onChange('', false); setOpen(false) }}
            className="min-w-11 min-h-11 grid place-items-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
            aria-label={L('Remove budget', 'بجٹ ہٹائیں', 'احذف الميزانية')}><X className="w-5 h-5" aria-hidden /></button>
        </div>
      </label>
      <p className="text-[12px] text-gray-600 leading-relaxed">
        {visible
          ? L('Suppliers will see this budget.', 'سپلائرز یہ بجٹ دیکھیں گے۔', 'سيرى الموردون هذه الميزانية.')
          : L('Only you see it: offers will be marked within or above your budget.', 'صرف آپ دیکھیں گے: آفرز پر بجٹ کے اندر یا اوپر لکھا ہوگا۔', 'تراها أنت فقط، وستُعلَّم العروض بأنها ضمن ميزانيتك أو أعلى منها.')}
      </p>
      <label className="flex items-center gap-2 min-h-11 text-[13px] text-gray-700 cursor-pointer">
        <input type="checkbox" checked={visible} onChange={e => onChange(value, e.target.checked)} className="w-5 h-5 accent-[#0B2438]" />
        <span>{L('Show it to suppliers', 'سپلائرز کو دکھائیں', 'أظهرها للموردين')}</span>
      </label>
      {visible && (
        <p className="text-[12px] leading-relaxed rounded-lg px-2.5 py-1.5" style={{ background: '#FFF8E8', color: '#8F6820' }}>
          {L('Showing your maximum may lead suppliers to price at it instead of their lowest price.',
            'زیادہ سے زیادہ قیمت دکھانے سے سپلائرز اپنی کم ترین قیمت کے بجائے اسی پر قیمت لگا سکتے ہیں۔',
            'إظهار الحدّ الأعلى قد يدفع الموردين إلى التسعير عنده بدل أقل سعر لديهم.')}
        </p>
      )}
    </div>
  )
}
