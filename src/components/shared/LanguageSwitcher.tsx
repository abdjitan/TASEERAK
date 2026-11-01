'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation, locales, type Locale } from '@/i18n'

const FLAGS: Record<Locale, string> = {
  ar: 'AR',
  en: 'EN',
  ur: 'UR',
}

interface Props {
  variant?: 'nav' | 'minimal' | 'full'
}

export default function LanguageSwitcher({ variant = 'nav' }: Props) {
  const { locale, setLocale, t } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const langAria = (l: Locale) => `${L('Language', 'زبان', 'اللغة')}: ${locales[l].name}`
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (variant === 'minimal') {
    return (
      <div className="flex gap-1">
        {(Object.keys(locales) as Locale[]).map(l => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            title={locales[l].name}
            aria-label={langAria(l)}
            aria-pressed={locale === l}
            lang={locales[l].lang}
            className={`w-10 h-10 rounded-lg text-sm flex items-center justify-center transition-all ${
              locale === l
                ? 'bg-[#0B2438] text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {FLAGS[l]}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(locales) as Locale[]).map(l => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            aria-label={langAria(l)}
            aria-pressed={locale === l}
            lang={locales[l].lang}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              locale === l
                ? 'border-[#D4A543] bg-[#D4A543]/5'
                : 'border-gray-200 hover:border-[#D4A543]/40'
            }`}
          >
            <span className="text-2xl">{FLAGS[l]}</span>
            <span className="text-sm font-semibold text-gray-900">{locales[l].name}</span>
            {locale === l && (
              <span className="text-xs text-[#8F6820] font-medium">✓ {L('Selected', 'منتخب', 'محدَّدة')}</span>
            )}
          </button>
        ))}
      </div>
    )
  }

  // Default: nav dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={langAria(locale)}
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-[#D4A543]/50 bg-white transition-all text-sm"
      >
        <span>{FLAGS[locale]}</span>
        <span className="font-medium text-gray-700">{locales[locale].name}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 min-w-[140px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          {(Object.keys(locales) as Locale[]).map(l => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false) }}
              aria-pressed={locale === l}
              lang={locales[l].lang}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-start ${
                locale === l
                  ? 'bg-[#D4A543]/5 text-[#8F6820] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{FLAGS[l]}</span>
              <span>{locales[l].name}</span>
              {locale === l && <span className="ms-auto text-blue-500 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
