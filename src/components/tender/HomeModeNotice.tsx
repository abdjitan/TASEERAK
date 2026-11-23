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
  // round-5 UX-088: no company vocabulary for a home buyer (no «tenders», «bills of quantities», «BOQ»); the gold
  // action keeps him in his mode (a price request), and switching mode is only a text link
  void what
  const title = L('This page is for contractors and companies', 'یہ صفحہ ٹھیکیداروں اور کمپنیوں کے لیے ہے', 'هذه الصفحة مخصّصة للمقاولين والشركات')
  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#D4A543]/40 p-6 sm:p-8 text-center" role="status">
      <div className="text-4xl text-[#8F6820] mb-3"><Glyph e="🏗" /></div>
      <h1 className="text-lg font-bold text-[#0B2438] mb-2">{title}</h1>
      <p className="text-sm text-gray-600 leading-relaxed mb-5">
        {L('You can ask for prices by writing, a photo or your voice from the request page, and nothing you saved before was deleted.',
          'آپ درخواست کے صفحے سے لکھ کر، تصویر یا آواز کے ذریعے قیمتیں مانگ سکتے ہیں، اور آپ نے پہلے جو محفوظ کیا تھا وہ حذف نہیں ہوا۔',
          'يمكنك طلب الأسعار بالكتابة أو التصوير أو الصوت من صفحة الطلب، وما حفظته سابقاً لم يُحذف.')}
      </p>
      <div className="flex flex-col items-center gap-2">
        <Link href="/contractor/rfq/quick" className="inline-flex items-center justify-center min-h-11 px-6 rounded-xl font-bold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
          {L('Ask for your prices', 'اپنی قیمتیں مانگیں', 'اطلب أسعارك')}
        </Link>
        <button type="button" disabled={busy} onClick={backToBusiness} className="inline-flex items-center min-h-11 px-2 text-sm font-bold text-[#0B2438] underline underline-offset-2 disabled:opacity-50">
          {busy ? L('Switching…', 'تبدیل ہو رہا ہے…', 'جارٍ التبديل…') : L('Switch to contractor or company mode', 'ٹھیکیدار یا کمپنی موڈ پر جائیں', 'التبديل إلى وضع مقاول أو شركة')}
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600" role="alert">{err}</p>}
    </div>
  )
}
