'use client'
import Link from 'next/link'
import { FEATURES } from '@/lib/features'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { useSignedIn } from './useSignedIn'

// «أسعار المواد» stays out of the header while the price board is off (UX-162); the public suppliers
// directory stays unlinked until real suppliers are listed (UX-003).
// Translated, with the language switcher (UX-115). «دخول» opens /login (phone first, email one tap away,
// round-4 UX-111), «ابدأ الآن» the request page, open to visitors (round-4 UX-056), like every other «start» button.
export default function PublicHeader({ active }: { active?: string }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const signedIn = useSignedIn()
  const links = [
    { href: '/', key: 'home', label: L('Home', 'ہوم', 'الرئيسية') },
    ...(FEATURES.priceBoard ? [{ href: '/prices', key: 'prices', label: L('Material prices', 'سامان کی قیمتیں', 'أسعار المواد') }] : []),
  ]
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30" dir={dir}>
      <div className="max-w-4xl mx-auto px-4 h-[72px] flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center shrink-0 min-h-[44px]" aria-label={L('Taseerak', 'تسعیرک', 'تسعيرك')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt={L('Taseerak', 'تسعیرک', 'تسعيرك')} className="h-14 w-auto" />
        </Link>

        <nav className="flex items-center gap-1 text-sm font-semibold">
          {/* phones: only the logo, the language, «دخول» and «ابدأ الآن» (UX-162) */}
          {links.map(l => (
            <Link key={l.key} href={l.href}
              className={`hidden sm:inline-flex items-center min-h-[44px] px-3 rounded-lg whitespace-nowrap transition-colors ${active === l.key ? 'text-white' : 'text-[#0B2438] hover:bg-gray-100'}`}
              style={active === l.key ? { background: '#0B2438' } : {}}>
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher variant="nav" compact />
          {/* a signed-in visitor sees «حسابي», not «دخول» (UX-143); /login sends them to their home */}
          {signedIn ? (
            <Link href="/login" className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-[#071827] font-bold whitespace-nowrap" style={{ background: '#D4A543' }}>{L('My account', 'میرا اکاؤنٹ', 'حسابي')}</Link>
          ) : (<>
            <Link href="/login" className="inline-flex items-center min-h-[44px] px-3 rounded-lg text-[#0B2438] hover:bg-gray-100 whitespace-nowrap">{L('Sign in', 'سائن اِن', 'دخول')}</Link>
            <Link href="/contractor/rfq/quick" className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-[#071827] font-bold whitespace-nowrap" style={{ background: '#D4A543' }}>{L('Start now', 'ابھی شروع کریں', 'ابدأ الآن')}</Link>
          </>)}
        </nav>
      </div>
    </header>
  )
}
