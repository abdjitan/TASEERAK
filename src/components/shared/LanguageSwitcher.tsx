'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation, locales, type Locale } from '@/i18n'

const FLAGS: Record<Locale, string> = {
  ar: '🇸🇦',
  en: '🇬🇧',
  ur: '🇵🇰',
}

interface Props {
  variant?: 'nav' | 'minimal' | 'full'
}

export default function LanguageSwitcher({ variant = 'nav' }: Props) {
  const { locale, setLocale, t } = useTranslation()
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
            className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
              locale === l
                ? 'bg-blue-600 text-white'
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
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              locale === l
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <span className="text-2xl">{FLAGS[l]}</span>
            <span className="text-sm font-semibold text-gray-900">{locales[l].name}</span>
            {locale === l && (
              <span className="text-xs text-blue-600 font-medium">✓ محدد</span>
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
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 bg-white transition-all text-sm"
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                locale === l
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{FLAGS[l]}</span>
              <span>{locales[l].name}</span>
              {locale === l && <span className="mr-auto text-blue-500 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
