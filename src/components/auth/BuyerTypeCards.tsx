'use client'

import { Home, Building2, Check } from 'lucide-react'

// «لمن تشتري؟» asked the same way everywhere (UX-130): sign-up, the home prompt and onboarding.
// value '' = not chosen yet. When a type is already known, show <BuyerTypeSummary/> instead of
// asking again («تشتري لبيتك · تغيير»).
export type BuyerTypeValue = 'individual' | 'business' | ''

export function buyerTypeText(locale: string) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return {
    question: L('Who are you buying for?', 'آپ کس کے لیے خرید رہے ہیں؟', 'لمن تشتري؟'),
    home: L('My home', 'اپنا گھر', 'لبيتي'),
    homeSub: L('A simple, quick request', 'آسان اور تیز درخواست', 'طلب بسيط وسريع'),
    business: L('Contractor or company', 'ٹھیکیدار یا کمپنی', 'مقاول أو شركة'),
    businessSub: L('Specifications, a tax invoice and quantity lists', 'تفصیلات، ٹیکس انوائس اور مقداروں کا جدول', 'مواصفات وفاتورة ضريبية وجدول كميات'),
    changeLater: L('You can change it any time in Settings.', 'آپ اسے کسی بھی وقت ترتیبات میں بدل سکتے ہیں۔', 'يمكنك تغييره في أي وقت من الإعدادات.'),
    buyingHome: L('You are buying for your home', 'آپ اپنے گھر کے لیے خرید رہے ہیں', 'تشتري لبيتك'),
    buyingBusiness: L('You are buying as a contractor or company', 'آپ ٹھیکیدار یا کمپنی کے طور پر خرید رہے ہیں', 'تشتري كمقاول أو شركة'),
    change: L('Change', 'تبدیل کریں', 'تغيير'),
  }
}

export default function BuyerTypeCards({ value, onChange, locale, disabled, showHint = true }: {
  value: BuyerTypeValue; onChange: (v: 'individual' | 'business') => void; locale: string; disabled?: boolean; showHint?: boolean
}) {
  const t = buyerTypeText(locale)
  const options = [
    { v: 'individual' as const, label: t.home, sub: t.homeSub, Icon: Home },
    { v: 'business' as const, label: t.business, sub: t.businessSub, Icon: Building2 },
  ]
  return (
    <div role="radiogroup" aria-label={t.question}>
      <div className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.question}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ v, label, sub, Icon }) => {
          const on = value === v
          return (
            <button key={v} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)} disabled={disabled}
              className={`min-h-[64px] text-start rounded-xl border-2 px-3 py-2.5 transition-colors ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <span className="flex items-center gap-1.5 text-sm font-bold text-navy">
                <Icon className={`w-[18px] h-[18px] shrink-0 ${on ? 'text-[#8F6820]' : 'text-[#0B2438]'}`} strokeWidth={1.9} aria-hidden />
                {label}
                {on && <Check className="w-4 h-4 ms-auto text-[#0B2438]" strokeWidth={3} aria-hidden />}
              </span>
              <span className="block text-[12px] text-ink-2 mt-0.5">{sub}</span>
            </button>
          )
        })}
      </div>
      {showHint && <p className="text-[12px] text-ink-2 mt-1">{t.changeLater}</p>}
    </div>
  )
}

/** The known type in one line with «تغيير» (instead of asking the question a second time). */
export function BuyerTypeSummary({ value, onChange, locale }: { value: 'individual' | 'business'; onChange: () => void; locale: string }) {
  const t = buyerTypeText(locale)
  const Icon = value === 'individual' ? Home : Building2
  return (
    <div className="flex items-center gap-2 text-sm text-[#0B2438]">
      <Icon className="w-4 h-4 text-[#8F6820]" aria-hidden />
      <span className="font-bold">{value === 'individual' ? t.buyingHome : t.buyingBusiness}</span>
      <span aria-hidden>·</span>
      <button type="button" onClick={onChange} className="min-h-[44px] font-bold text-[#8F6820] hover:underline">{t.change}</button>
    </div>
  )
}
