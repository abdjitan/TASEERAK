import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-10">
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="font-extrabold text-sm mb-2" style={{ color: '#0B2438' }}>تسعيرك — Taseerak</div>
        <p className="text-[11px] text-gray-400 mb-4 max-w-md mx-auto leading-relaxed">
          منصة التسعير والتوريد لمواد البناء في السعودية — اطلب تسعيرة واحدة يتنافس عليها أفضل الموردين.
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500 flex-wrap">
          <Link href="/prices" className="hover:text-[#0B2438]">أسعار المواد</Link>
          <span className="text-gray-300">·</span>
          <Link href="/suppliers" className="hover:text-[#0B2438]">الموردون</Link>
          <span className="text-gray-300">·</span>
          <Link href="/privacy" className="hover:text-[#0B2438]">الخصوصية</Link>
          <span className="text-gray-300">·</span>
          <Link href="/terms" className="hover:text-[#0B2438]">الشروط</Link>
        </div>
        <p className="text-[10px] text-gray-300 mt-4">© {new Date().getFullYear()} تسعيرك. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  )
}
