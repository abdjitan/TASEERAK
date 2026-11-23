'use client'
// «لبيتي» mode hides the company tools (bill of quantities, tenders) but never deletes them (UX-098). A link to one
// of them, opened in that mode, says so and offers the way back instead of a silent redirect to the quick request.
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rememberBuyerType } from '@/lib/buyerType'
import Glyph from '@/components/shared/Glyph'

export default function HomeModeNotice({ locale, what }: { locale: string; what: 'tender' | 'boq' }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function backToBusiness() {
    setBusy(true); setErr('')
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user?.id
      if (!uid) { window.location.href = '/login'; return }
      const { error } = await supabase.from('profiles').update({ buyer_type: 'business' }).eq('id', uid)
      if (error) throw error
      rememberBuyerType('business')
      window.location.reload()
    } catch {
      setBusy(false)
      setErr(L('Could not switch. Check your connection and try again.', 'تبدیل نہیں ہو سکا۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر التبديل. تحقّق من الاتصال وحاول مرة أخرى.'))
    }
  }
  const title = what === 'tender'
    ? L('Tenders are hidden in «My home» mode', '«اپنا گھر» موڈ میں ٹینڈرز چھپے ہوئے ہیں', 'المناقصات مخفية في وضع «لبيتي»')
    : L('Bills of quantities are hidden in «My home» mode', '«اپنا گھر» موڈ میں مقداروں کے جدول چھپے ہوئے ہیں', 'جداول الكميات مخفية في وضع «لبيتي»')
  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#D4A543]/40 p-6 sm:p-8 text-center" role="status">
      <div className="text-4xl text-[#8F6820] mb-3"><Glyph e="🏗" /></div>
      <h1 className="text-lg font-bold text-[#0B2438] mb-2">{title}</h1>
      <p className="text-sm text-gray-600 leading-relaxed mb-5">
        {L('Nothing was deleted: your bills of quantities and tenders are kept. Return to «Contractor or company» mode to see them and continue.',
          'کچھ حذف نہیں ہوا: آپ کے مقداروں کے جدول اور ٹینڈرز محفوظ ہیں۔ انہیں دیکھنے اور جاری رکھنے کے لیے «ٹھیکیدار یا کمپنی» موڈ پر واپس جائیں۔',
          'لم يُحذف شيء، فجداول الكميات والمناقصات محفوظة. عُد إلى وضع «مقاول أو شركة» لتراها وتتابع العمل عليها.')}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={busy} onClick={backToBusiness} className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm text-[#071827] disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
          {busy ? L('Switching…', 'تبدیل ہو رہا ہے…', 'جارٍ التبديل…') : L('Return to «Contractor or company» mode', '«ٹھیکیدار یا کمپنی» موڈ پر واپس جائیں', 'العودة إلى وضع «مقاول أو شركة»')}
        </button>
        <Link href="/contractor/rfq/quick" className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm border border-[#0B2438]/30 text-[#0B2438] bg-white">
          {L('Make a simple request', 'آسان درخواست بنائیں', 'إنشاء طلب بسيط')}
        </Link>
      </div>
      {err && <p className="mt-3 text-sm text-red-600" role="alert">{err}</p>}
    </div>
  )
}
