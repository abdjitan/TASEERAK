'use client'
// Owner 2026-11-22: existing buyers (no buyer_type yet) choose once, on their first visit after the
// update, between «لبيتي» (simple request and home) and «مقاول أو شركة» (all options). Saved on the
// profile; changeable any time in Settings.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rememberBuyerType, type BuyerType } from '@/lib/buyerType'
import BuyerTypeCards, { buyerTypeText } from '@/components/auth/BuyerTypeCards'

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
  // the same cards, names, descriptions and icons as at sign-up and in onboarding (UX-131)
  const t = buyerTypeText(locale)
  return (
    <div className="fixed inset-0 z-[80] bg-[#071827]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="bt-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-t-4 border-[#D4A543] p-5">
        {/* the question itself is the cards' own label (one wording everywhere), so it is not repeated here */}
        <h2 id="bt-title" className="text-xl font-extrabold text-[#0B2438]">{L('New in Taseerak', 'تسعیرک میں نیا', 'جديد في تسعيرك')}</h2>
        <p className="text-sm text-gray-600 mt-1">{L('We will show you the screens that suit you.', 'ہم آپ کے لیے موزوں اسکرین دکھائیں گے۔', 'سنعرض لك الصفحات التي تناسبك.')}</p>
        <div className="mt-4" aria-busy={!!busy}>
          <BuyerTypeCards value={busy || ''} onChange={choose} locale={locale} disabled={!!busy} showHint={false} />
          {busy && <p className="mt-1.5 text-[13px] font-semibold text-[#0B2438]" role="status">{L('Saving…', 'محفوظ کیا جا رہا ہے…', 'جارٍ الحفظ…')}</p>}
        </div>
        {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
        <p className="mt-3 text-[12px] text-gray-600">{t.changeLater}</p>
      </div>
    </div>
  )
}
