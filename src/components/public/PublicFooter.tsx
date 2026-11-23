'use client'
import Link from 'next/link'
import { FEATURES } from '@/lib/features'
import { useTranslation } from '@/i18n'

// Translated like the header (UX-115).
export default function PublicFooter() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <footer className="border-t border-gray-100 bg-white mt-10" dir={dir}>
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="font-bold text-sm mb-2" style={{ color: '#0B2438' }}>تسعيرك — Taseerak</div>
        <p className="text-[12px] text-gray-600 mb-4 max-w-md mx-auto leading-relaxed">
          {L('The pricing and supply platform for building materials in Saudi Arabia: send one price request and suppliers compete for it.',
            'سعودی عرب میں تعمیراتی سامان کی قیمت اور سپلائی کا پلیٹ فارم: ایک درخواست بھیجیں اور سپلائرز اس پر مقابلہ کریں۔',
            'منصة التسعير والتوريد لمواد البناء في السعودية: أرسل طلب سعر واحداً ويتنافس عليه الموردون.')}
        </p>
        <div className="flex items-center justify-center gap-1 text-[13px] text-gray-700 flex-wrap">
          <Link href="/" className="inline-flex items-center min-h-[44px] px-2 font-semibold text-[#0B2438] hover:underline">{L('Home', 'ہوم', 'الرئيسية')}</Link>
          {FEATURES.priceBoard && (<>
            <span className="text-gray-300" aria-hidden>·</span>
            <Link href="/prices" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">{L('Material prices', 'سامان کی قیمتیں', 'أسعار المواد')}</Link>
          </>)}
          <span className="text-gray-300" aria-hidden>·</span>
          <Link href="/deal-protection" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">{L('Deal protection', 'سودے کا تحفظ', 'حماية الصفقة')}</Link>
          <span className="text-gray-300" aria-hidden>·</span>
          <Link href="/privacy" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">{L('Privacy', 'رازداری', 'الخصوصية')}</Link>
          <span className="text-gray-300" aria-hidden>·</span>
          <Link href="/terms" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">{L('Terms', 'شرائط', 'الشروط')}</Link>
        </div>
        <p className="text-[12px] text-gray-600 mt-4">© {new Date().getFullYear()} {L('Taseerak. All rights reserved.', 'تسعیرک۔ جملہ حقوق محفوظ ہیں۔', 'تسعيرك. جميع الحقوق محفوظة.')}</p>
      </div>
    </footer>
  )
}
