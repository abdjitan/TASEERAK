// @ts-nocheck
'use client'

import { useState, ReactNode } from 'react'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
import { useTranslation } from '@/i18n'

export type ShellNavItem = { href: string; label: string; icon: ReactNode; active?: boolean }

// Shared dashboard shell — navy gradient sidebar (264px) + frosted topbar +
// off-canvas drawer on mobile. Pages pass their own nav items + header actions.
export default function AppShell({
  title, subtitle, company, userId, nav = [], actions, onSignOut, children, dir = 'rtl',
}: {
  title?: string
  subtitle?: string
  company?: string
  userId?: string
  nav: ShellNavItem[]
  actions?: ReactNode
  onSignOut?: () => void
  children: ReactNode
  dir?: string
}) {
  const { locale } = useTranslation()
  const [open, setOpen] = useState(false)
  const sideEdge = dir === 'rtl' ? 'right-0' : 'left-0'
  const hidden = dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
  const mainPush = dir === 'rtl' ? 'lg:mr-[264px]' : 'lg:ml-[264px]'

  return (
    <div className="min-h-screen" dir={dir} style={{ background: 'var(--bg)' }}>
      {/* ===== Sidebar ===== */}
      <aside
        className={`fixed inset-y-0 ${sideEdge} z-50 w-[264px] flex flex-col text-white transition-transform duration-300 ${open ? 'translate-x-0' : hidden} lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg,#1B2D5B 0%,#0f1d3d 100%)' }}
      >
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <span className="w-10 h-10 rounded-xl bg-white grid place-items-center shadow"><img src="/logo.png" alt="تسعيرك" className="w-7 h-7 object-contain" /></span>
          <span className="text-xl font-extrabold">
            {locale === 'en' ? <>TASEER<span style={{ color: '#F5831F' }}>AK</span></>
              : locale === 'ur' ? <>تسعیر<span style={{ color: '#F5831F' }}>ک</span></>
              : <>تسعير<span style={{ color: '#F5831F' }}>ك</span></>}
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${n.active ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}>
              <span className="w-5 grid place-items-center text-base">{n.icon}</span>{n.label}
            </a>
          ))}
        </nav>
        {company && <div className="p-4 border-t border-white/10 text-xs text-blue-100/60 truncate">{company}</div>}
      </aside>

      {/* backdrop (mobile) */}
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* ===== Main column ===== */}
      <div className={`${mainPush} flex flex-col min-h-screen`}>
        <header className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ background: 'rgba(255,255,255,.85)', borderColor: 'var(--line)' }}>
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button className="lg:hidden w-9 h-9 grid place-items-center rounded-lg hover:bg-gray-100 shrink-0" onClick={() => setOpen(true)} aria-label="القائمة">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              </button>
              <div className="min-w-0">
                {title && <h1 className="text-lg font-extrabold leading-tight truncate" style={{ color: '#1B2D5B' }}>{title}</h1>}
                {subtitle && <p className="text-xs truncate" style={{ color: '#8089a0' }}>{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {actions}
              <LanguageSwitcher variant="minimal" />
              {userId && <NotificationBell userId={userId} />}
              {onSignOut && <button onClick={onSignOut} className="text-xs px-2 py-1 rounded transition-colors" style={{ color: '#8089a0' }}>خروج</button>}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
    </div>
  )
}
