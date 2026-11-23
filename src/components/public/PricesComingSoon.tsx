'use client'
// One story for the paused price board (round-4 UX-149), on the public /prices page and on /market:
// «أسعار المواد قريباً», how to know a price today, and the request button (a supplier goes home instead).
import Link from 'next/link'
import { useTranslation } from '@/i18n'
import Glyph from '@/components/shared/Glyph'

export default function PricesComingSoon({ role, homeHref }: { role?: string | null; homeHref?: string }) {
  const { locale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const supplier = role === 'supplier'
  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl p-8 border border-gray-100 text-center">
      <div className="text-4xl mb-3 text-[#0B2438]"><Glyph e="📊" /></div>
      <h1 className="text-lg font-bold mb-2 text-[#0B2438]">{L('Material prices coming soon', 'سامان کی قیمتیں جلد', 'أسعار المواد قريباً')}</h1>
      <p className="text-sm text-gray-600">{L('To know today’s price of a material, send a price request and suppliers answer with their current prices.', 'کسی چیز کی آج کی قیمت جاننے کے لیے قیمت کی درخواست بھیجیں، سپلائرز اپنی موجودہ قیمتیں بتائیں گے۔', 'لمعرفة سعر مادة اليوم، أرسل طلب تسعير فيرد الموردون بأسعارهم الحالية.')}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {!supplier && <Link href="/contractor/rfq/quick" className="btn-orange text-sm">{L('Request a price', 'قیمت معلوم کریں', 'اطلب سعراً')}</Link>}
        {homeHref && <Link href={homeHref} className={supplier ? 'btn-navy text-sm' : 'btn-ghost text-sm'}>{L('Back to the home page', 'ہوم پر واپس', 'العودة إلى الرئيسية')}</Link>}
      </div>
    </div>
  )
}
