'use client'

// Page loading state. Instead of a full-screen splash (the menu vanished on every page change and a
// navy screen appeared), the page keeps its frame: the sidebar/top bar render at once and only the
// content area shows a light skeleton until the data arrives. The role for the menu comes from the
// URL (/supplier, /contractor, /admin) or, on shared pages (messages, settings…), from the last
// menu this device showed (AppShell remembers it). Unknown role (first visit, onboarding): skeleton only.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { useTranslation } from '@/i18n'

export const ROLE_HINT_KEY = 'tsk_role_hint'

function roleFromPath(p: string): string | null {
  if (p.startsWith('/admin')) return 'admin'
  if (p.startsWith('/supplier')) return 'supplier'
  if (p.startsWith('/contractor')) return 'contractor'
  return null
}

// the role hint read once per page load: shared pages (messages, settings…) no longer flash an empty
// frame before the menu appears on every navigation (round-4 UX-146)
let hintCache: string | null | undefined

function Skeleton({ label }: { label: string }) {
  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">{label}</span>
      <div className="h-24 rounded-2xl bg-white border border-gray-100" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100" />)}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3">
          <div className="h-4 w-1/3 rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
          <div className="h-3 w-1/2 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export default function PageLoader() {
  const { dir, locale } = useTranslation()
  const path = usePathname() || ''
  const [hint, setHint] = useState<string | null>(hintCache ?? null)
  useEffect(() => {
    if (hintCache !== undefined) return
    try { hintCache = localStorage.getItem(ROLE_HINT_KEY) } catch { hintCache = null }
    setHint(hintCache)
  }, [])
  const label = locale === 'en' ? 'Loading…' : locale === 'ur' ? 'لوڈ ہو رہا ہے…' : 'جارٍ التحميل…'
  const role = path.startsWith('/onboarding') || path.startsWith('/welcome') || path.startsWith('/verify') || path.startsWith('/banned') ? null : (roleFromPath(path) || hint)

  if (!role) return <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir={dir}><Skeleton label={label} /></div>
  return <AppShell nav={getNav(role, locale, path)} dir={dir}><Skeleton label={label} /></AppShell>
}
