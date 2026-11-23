'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation, locales, type Locale } from '@/i18n'
import { Check, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// The switcher also saves the language on the profile when signed in, so notifications (written in
// preferred_language) follow the language the user reads (round-5 UX-076). Fire and forget.
function savePreferredLanguage(l: Locale) {
  try {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => {
      const uid = data?.session?.user?.id
      if (uid) sb.from('profiles').update({ preferred_language: l }).eq('id', uid).then(() => {}, () => {})
    }, () => {})
  } catch {}
}

// Short, readable codes in each language's own script (UX-162): «ع / EN / اردو»
const FLAGS: Record<Locale, string> = {
  ar: 'ع',
  en: 'EN',
  ur: 'اردو',
}

interface Props {
  variant?: 'nav' | 'minimal' | 'full'
  /** nav variant only: just the code in a 44px button (phone top bar, UX-036) */
  compact?: boolean
}

export default function LanguageSwitcher({ variant = 'nav', compact = false }: Props) {
  const { locale, setLocale, t } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const langAria = (l: Locale) => `${L('Language', 'زبان', 'اللغة')}: ${locales[l].name}`
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const pick = (l: Locale) => { setLocale(l); if (l !== locale) savePreferredLanguage(l) }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  // Escape closes the menu and returns the focus to its button (round-5 UX-196)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (variant === 'minimal') {
    return (
      <div className="flex gap-1">
        {(Object.keys(locales) as Locale[]).map(l => (
          <button
            key={l}
            onClick={() => pick(l)}
            title={locales[l].name}
            aria-label={langAria(l)}
            aria-pressed={locale === l}
            lang={locales[l].lang}
            className={`min-w-[44px] h-11 px-1.5 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${
              locale === l
                ? 'bg-[#D4A543] text-[#071827] ring-1 ring-[#9D7425]/40'
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
            onClick={() => pick(l)}
            aria-label={langAria(l)}
            aria-pressed={locale === l}
            lang={locales[l].lang}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              locale === l
                ? 'border-[#D4A543] bg-[#D4A543]/5'
                : 'border-gray-200 hover:border-[#D4A543]/40'
            }`}
          >
            <span className="text-xl font-bold text-[#0B2438]">{FLAGS[l]}</span>
            <span className="text-sm font-semibold text-gray-900">{locales[l].name}</span>
            {locale === l && (
              <span className="text-xs text-[#8F6820] font-medium inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden /> {L('Selected', 'منتخب', 'محدَّدة')}</span>
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
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={langAria(locale)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border border-gray-200 hover:border-[#D4A543]/50 bg-white transition-all text-sm ${compact ? 'min-w-[44px] h-11 px-2 justify-center' : 'px-3 py-2'}`}
      >
        {compact && <Globe className="w-4 h-4 opacity-80" aria-hidden />}
        <span className={`font-bold ${compact ? "" : "text-[#0B2438]"}`}>{FLAGS[locale]}</span>
        {!compact && <span className="font-medium text-gray-700">{locales[locale].name}</span>}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="ts-lang-menu absolute top-full mt-1 end-0 min-w-[150px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          {(Object.keys(locales) as Locale[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => { pick(l); setOpen(false); btnRef.current?.focus() }}
              aria-pressed={locale === l}
              lang={locales[l].lang}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0B2438] ${
                locale === l
                  ? 'bg-[#D4A543]/5 text-[#8F6820] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{FLAGS[l]}</span>
              <span>{locales[l].name}</span>
              {locale === l && <Check className="ms-auto w-4 h-4 text-[#0B2438]" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
