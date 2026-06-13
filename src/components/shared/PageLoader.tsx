// @ts-nocheck
'use client'

// Lightweight page loader used while a page's data loads.
// KEY UX choice: it stays INVISIBLE for the first ~350ms. Most data loads
// finish faster than that, so the user sees the content appear instantly with
// NO loader flash (seamless). Only genuinely slow loads reveal a small, calm
// spinner — never a heavy full-screen scene.
import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n'

export default function PageLoader({ label }: any) {
  const { locale, dir } = useTranslation()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 350)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null // seamless: fast loads show nothing at all

  const text = label || (locale === 'en' ? 'Loading…' : locale === 'ur' ? 'لوڈ ہو رہا ہے…' : 'جارٍ التحميل…')
  return (
    <div className="min-h-screen flex items-center justify-center animate-fade-in" dir={dir} style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-[3px] border-gray-200 border-t-[#F5831F] animate-spin" />
        <div className="text-xs text-gray-400">{text}</div>
      </div>
    </div>
  )
}
