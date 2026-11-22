import Link from 'next/link'
import { FEATURES } from '@/lib/features'

// «أسعار المواد» stays out of the header while the price board is off (UX-162); the public suppliers
// directory stays unlinked until real suppliers are listed (UX-003).
const LINKS = [
  { href: '/', key: 'home', label: 'الرئيسية' },
  ...(FEATURES.priceBoard ? [{ href: '/prices', key: 'prices', label: 'أسعار المواد' }] : []),
]

export default function PublicHeader({ active }: { active?: string }) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center shrink-0 min-h-[44px]" aria-label="تسعيرك">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك" className="h-11 w-auto" />
        </Link>

        <nav className="flex items-center gap-1 text-sm font-semibold">
          {/* phones: only the logo, «دخول» and «سجّل» (UX-162) */}
          {LINKS.map(l => (
            <Link key={l.key} href={l.href}
              className={`hidden sm:inline-flex items-center min-h-[44px] px-3 rounded-lg whitespace-nowrap transition-colors ${active === l.key ? 'text-white' : 'text-[#0B2438] hover:bg-gray-100'}`}
              style={active === l.key ? { background: '#0B2438' } : {}}>
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="inline-flex items-center min-h-[44px] px-3 rounded-lg text-[#0B2438] hover:bg-gray-100 whitespace-nowrap">دخول</Link>
          <Link href="/register" className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-[#071827] font-bold whitespace-nowrap" style={{ background: '#D4A543' }}>سجّل</Link>
        </nav>
      </div>
    </header>
  )
}
