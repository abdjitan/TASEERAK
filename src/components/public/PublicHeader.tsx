import Link from 'next/link'

const LINKS = [
  { href: '/', key: 'home', label: 'الرئيسية' },
  { href: '/prices', key: 'prices', label: 'أسعار المواد' },
  { href: '/suppliers', key: 'suppliers', label: 'الموردون' },
]

export default function PublicHeader({ active }: { active?: string }) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="تسعيرك" className="h-8 w-auto" />
          <span className="font-extrabold text-sm hidden sm:inline" style={{ color: '#1B2D5B' }}>تسعيرك</span>
        </Link>

        <nav className="flex items-center gap-1 text-xs font-semibold overflow-x-auto">
          {LINKS.map(l => (
            <Link key={l.key} href={l.href}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${active === l.key ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              style={active === l.key ? { background: '#1B2D5B' } : {}}>
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 whitespace-nowrap">دخول</Link>
          <Link href="/register" className="px-3 py-1.5 rounded-lg text-white font-bold whitespace-nowrap" style={{ background: '#F5831F' }}>سجّل</Link>
        </nav>
      </div>
    </header>
  )
}
