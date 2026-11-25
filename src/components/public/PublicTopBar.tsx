'use client'
// One top bar for the trust and legal pages (terms, privacy, deal protection), round-6 UX-116: the logo
// at h-11 (it fits a 375px phone next to the language and the home/account link), the language switcher,
// and «الرئيسية» for a visitor or «العودة إلى حسابي» for a signed-in user.
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import HomeOrAccountLink from './HomeOrAccountLink'

export default function PublicTopBar() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100" dir={dir}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-2">
        <a href="/" className="shrink-0 min-h-[44px] inline-flex items-center" aria-label={L('Taseerak', 'تسعیرک', 'تسعيرك')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt={L('Taseerak', 'تسعیرک', 'تسعيرك')} className="h-11 w-auto" />
        </a>
        <div className="flex items-center gap-1 min-w-0">
          <LanguageSwitcher variant="minimal" />
          <HomeOrAccountLink homeLabel={L('Home', 'ہوم', 'الرئيسية')} />
        </div>
      </div>
    </nav>
  )
}
