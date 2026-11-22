import Link from 'next/link'
import { FEATURES } from '@/lib/features'

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-10">
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="font-bold text-sm mb-2" style={{ color: '#0B2438' }}>تسعيرك — Taseerak</div>
        <p className="text-[12px] text-gray-600 mb-4 max-w-md mx-auto leading-relaxed">
          منصة التسعير والتوريد لمواد البناء في السعودية: اطلب تسعيرة واحدة ويتنافس عليها الموردون.
        </p>
        <div className="flex items-center justify-center gap-1 text-[13px] text-gray-700 flex-wrap">
          <Link href="/" className="inline-flex items-center min-h-[44px] px-2 font-semibold text-[#0B2438] hover:underline">الرئيسية</Link>
          {FEATURES.priceBoard && (<>
            <span className="text-gray-300" aria-hidden>·</span>
            <Link href="/prices" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">أسعار المواد</Link>
          </>)}
          <span className="text-gray-300" aria-hidden>·</span>
          <Link href="/deal-protection" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">حماية الصفقة</Link>
          <span className="text-gray-300" aria-hidden>·</span>
          <Link href="/privacy" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">الخصوصية</Link>
          <span className="text-gray-300" aria-hidden>·</span>
          <Link href="/terms" className="inline-flex items-center min-h-[44px] px-2 hover:text-[#0B2438]">الشروط</Link>
        </div>
        <p className="text-[12px] text-gray-600 mt-4">© {new Date().getFullYear()} تسعيرك. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  )
}
