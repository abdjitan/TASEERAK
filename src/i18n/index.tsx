'use client'

import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode,
} from 'react'
import ar from './locales/ar.json'
import en from './locales/en.json'
import ur from './locales/ur.json'

// ─── Types ───────────────────────────────────────────────
export type Locale = 'ar' | 'en' | 'ur'

interface LangMeta {
  lang: Locale
  dir: 'rtl' | 'ltr'
  name: string
}

export const LOCALES: Record<Locale, LangMeta> = {
  ar: { lang: 'ar', dir: 'rtl', name: 'العربية' },
  en: { lang: 'en', dir: 'ltr', name: 'English' },
  ur: { lang: 'ur', dir: 'rtl', name: 'اردو' },
}

const TRANSLATIONS: Record<Locale, Record<string, any>> = { ar, en, ur }
const STORAGE_KEY = 'taseerak_locale'
const DEFAULT_LOCALE: Locale = 'ar'

// ─── Helper: deep get by dot-path ────────────────────────
function get(obj: Record<string, any>, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

// ─── Context ─────────────────────────────────────────────
interface I18nContextType {
  locale: Locale
  dir: 'rtl' | 'ltr'
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  dir: 'rtl',
  setLocale: () => {},
  t: (k) => k,
})

// ─── Provider ────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // Load saved locale on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && saved in LOCALES) {
      applyLocale(saved)
    }
  }, [])

  function applyLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    // Update HTML attributes
    document.documentElement.lang = l
    document.documentElement.dir = LOCALES[l].dir
  }

  // Translate function
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const translations = TRANSLATIONS[locale]
      let value = get(translations, key)

      // Fallback to English, then key itself
      if (!value) value = get(TRANSLATIONS['en'], key)
      if (!value) return key

      // Replace {{variable}} placeholders
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          value = value!.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
        })
      }

      return value
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{
      locale,
      dir: LOCALES[locale].dir,
      setLocale: applyLocale,
      t,
    }}>
      {children}
    </I18nContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────
export function useTranslation() {
  return useContext(I18nContext)
}

// ─── Convenience re-export ────────────────────────────────
export { LOCALES as locales }
