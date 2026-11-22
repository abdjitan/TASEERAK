'use client'
// Simple top bar for the gate screens (/verify, /banned, and /support while the account is held at a
// gate): the logo, the language switcher and «تسجيل الخروج», so these screens are never a dead end
// (UX-047). No menu: the rest of the app is not reachable from a gate yet.
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import { useTranslation } from '@/i18n'

export async function gateSignOut() {
  clearAllLocalDrafts()
  try { await createClient().auth.signOut() } catch {}
  window.location.href = '/login'
}

export default function GateHeader({ back }: { back?: { href: string; label: string } }) {
  const { locale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <header className="sticky top-0 z-30 border-b border-[#D4A543]/25 text-white" style={{ background: 'linear-gradient(180deg,#071827,#0B2438)' }}>
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-6 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt={locale === 'en' ? 'Taseerak' : 'تسعيرك'} className="h-11 w-auto" />
          {back && (
            <Link href={back.href} className="min-h-[44px] inline-flex items-center px-3 rounded-lg text-sm font-bold text-[#F5C55B] hover:bg-white/10">{back.label}</Link>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="ts-gate-lang"><LanguageSwitcher variant="nav" compact /></div>
          <button type="button" onClick={gateSignOut} className="min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-lg text-sm font-bold text-[#E8EDF2] hover:bg-white/10">
            <LogOut className="w-4 h-4" aria-hidden />{L('Log out', 'لاگ آؤٹ', 'تسجيل الخروج')}
          </button>
        </div>
      </div>
    </header>
  )
}
