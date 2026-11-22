'use client'
// Owner 2026-11-22: existing buyers (no buyer_type yet) choose once, on their first visit after the
// update, between «لبيتي» (simple request and home) and «مقاول أو شركة» (all options). Saved on the
// profile; changeable any time in Settings.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rememberBuyerType, type BuyerType } from '@/lib/buyerType'

export default function BuyerTypePrompt({ userId, locale, onChosen }: { userId: string; locale: string; onChosen: (v: BuyerType) => void }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [busy, setBusy] = useState<BuyerType | null>(null)
  const [error, setError] = useState('')
  async function choose(v: BuyerType) {
    setBusy(v); setError('')
    const { error: e } = await createClient().from('profiles').update({ buyer_type: v }).eq('id', userId)
    if (e) { setBusy(null); setError(L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ. حاول مرة أخرى.')); return }
    rememberBuyerType(v)
    onChosen(v)
  }
  const cards: [BuyerType, string, string][] = [
    ['individual', L('For my home', 'اپنے گھر کے لیے', 'لبيتي'), L('A simple request in three steps, and ready lists to get your home ready', 'تین قدموں میں آسان درخواست', 'طلب بسيط بثلاث خطوات، وقوائم جاهزة لتجهيز البيت')],
    ['business', L('Contractor or company', 'ٹھیکیدار یا کمپنی', 'مقاول أو شركة'), L('All options: specifications, VAT invoice and bills of quantities', 'تمام اختیارات', 'كل الخيارات: المواصفات والفاتورة الضريبية وجداول الكميات')],
  ]
  return (
    <div className="fixed inset-0 z-[80] bg-[#071827]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="bt-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-t-4 border-[#D4A543] p-5">
        <div className="text-[12px] font-bold text-[#9D7425]">{L('New in Taseerak', 'تسعیرک میں نیا', 'جديد في تسعيرك')}</div>
        <h2 id="bt-title" className="text-xl font-extrabold text-[#0B2438] mt-0.5">{L('Who are you buying for?', 'آپ کس کے لیے خرید رہے ہیں؟', 'لمن تشتري؟')}</h2>
        <p className="text-sm text-gray-600 mt-1">{L('We will show you the screens that suit you.', 'ہم آپ کے لیے موزوں اسکرین دکھائیں گے۔', 'سنعرض لك الصفحات التي تناسبك.')}</p>
        <div className="mt-4 space-y-2.5">
          {cards.map(([v, title, sub]) => (
            <button key={v} type="button" disabled={!!busy} onClick={() => choose(v)}
              className="w-full min-h-[56px] text-start rounded-xl border-2 border-gray-200 hover:border-[#D4A543] bg-white px-4 py-3 transition-colors disabled:opacity-60">
              <span className="block text-base font-extrabold text-[#0B2438]">{busy === v ? '…' : title}</span>
              <span className="block text-[13px] text-gray-600 mt-0.5">{sub}</span>
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
        <p className="mt-3 text-[12px] text-gray-600">{L('You can change it any time in Settings.', 'آپ اسے کسی بھی وقت ترتیبات میں بدل سکتے ہیں۔', 'يمكنك تغييره في أي وقت من الإعدادات.')}</p>
      </div>
    </div>
  )
}
