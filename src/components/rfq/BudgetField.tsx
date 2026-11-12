'use client'

import { useState } from 'react'

// R23 (owner 2026-11-12): optional buyer budget per unit, before VAT. Hidden from suppliers
// unless the buyer ticks «أظهرها للموردين» — with a warning that a shown cap invites
// suppliers to price at it instead of their lowest price.
export default function BudgetField({ value, visible, unit, locale, onChange }: {
  value: string
  visible: boolean
  unit?: string
  locale: string
  onChange: (budget: string, visible: boolean) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [open, setOpen] = useState(!!value)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50">
        + {L('My budget per unit (optional)', 'فی یونٹ میرا بجٹ (اختیاری)', 'ميزانيتي للوحدة (اختياري)')}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 space-y-2">
      <label className="block">
        <span className="block text-[11px] font-semibold text-gray-600 mb-1">
          {L('My budget per unit, before VAT (optional)', 'فی یونٹ میرا بجٹ، VAT سے پہلے (اختیاری)', 'ميزانيتي للوحدة قبل الضريبة (اختياري)')}
        </span>
        <div className="flex items-center gap-2">
          <input type="text" inputMode="decimal" value={value}
            onChange={e => onChange(e.target.value.replace(/[^\d.,٠-٩٫]/g, '').slice(0, 12), visible)}
            className="input-field text-sm flex-1" placeholder={L('e.g. 150', 'مثلاً 150', 'مثلاً 150')}
            aria-label={L('Budget per unit before VAT', 'فی یونٹ بجٹ', 'الميزانية للوحدة قبل الضريبة')} />
          <span className="text-[12px] text-gray-500 whitespace-nowrap">{L('SAR', 'ریال', 'ر.س')}{unit ? ` / ${unit}` : ''}</span>
          <button type="button" onClick={() => { onChange('', false); setOpen(false) }}
            className="min-w-10 min-h-10 grid place-items-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 text-lg"
            aria-label={L('Remove budget', 'بجٹ ہٹائیں', 'احذف الميزانية')}>×</button>
        </div>
      </label>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        {visible
          ? L('Suppliers will see this budget.', 'سپلائرز یہ بجٹ دیکھیں گے۔', 'سيرى الموردون هذه الميزانية.')
          : L('Only you see it: offers will be marked within or above your budget.', 'صرف آپ دیکھیں گے: پیشکشوں پر بجٹ کے اندر یا اوپر لکھا ہوگا۔', 'تراها أنت فقط، وستُعلَّم العروض بأنها ضمن ميزانيتك أو أعلى منها.')}
      </p>
      <label className="flex items-start gap-2 text-[12px] text-gray-700 cursor-pointer">
        <input type="checkbox" checked={visible} onChange={e => onChange(value, e.target.checked)} className="mt-0.5 accent-[#0B2438]" />
        <span>{L('Show it to suppliers', 'سپلائرز کو دکھائیں', 'أظهرها للموردين')}</span>
      </label>
      {visible && (
        <p className="text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5" style={{ background: '#FFF8E8', color: '#8F6820' }}>
          {L('Showing your maximum may lead suppliers to price at it instead of their lowest price.',
            'زیادہ سے زیادہ قیمت دکھانے سے سپلائرز اپنی کم ترین قیمت کے بجائے اسی پر قیمت لگا سکتے ہیں۔',
            'إظهار الحدّ الأعلى قد يدفع الموردين إلى التسعير عنده بدل أقل سعر لديهم.')}
        </p>
      )}
    </div>
  )
}
