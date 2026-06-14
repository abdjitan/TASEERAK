// @ts-nocheck
'use client'

import { useState, useEffect, ReactNode } from 'react'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
import AiAssistant from '@/components/shared/AiAssistant'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'

export type ShellNavItem = { href: string; label: string; icon: ReactNode; active?: boolean; section?: string; badge?: number | string }

// Shared dashboard shell — navy gradient sidebar (272px) + frosted topbar +
// off-canvas drawer on mobile. Pages pass their own nav items + header actions.
export default function AppShell({
  title, subtitle, company, companyMeta, companyVerified, userId, nav = [], actions, onSignOut, children, dir = 'rtl',
}: {
  title?: string
  subtitle?: string
  company?: string
  companyMeta?: string
  companyVerified?: boolean
  userId?: string
  nav: ShellNavItem[]
  actions?: ReactNode
  onSignOut?: () => void
  children: ReactNode
  dir?: string
}) {
  const { locale } = useTranslation()
  const [open, setOpen] = useState(false)
  // عدد الرسائل غير المقروءة — شارة على «الرسائل» في القائمة
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    let ch: any
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = userId || session?.user?.id
      if (!uid) return
      const refresh = async () => {
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).is('read_at', null).neq('sender_id', uid)
        setUnreadMsgs(count || 0)
      }
      await refresh()
      ch = supabase.channel(`appshell-msgs-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { refresh() })
        .subscribe()
    })()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [userId])
  const sideEdge = dir === 'rtl' ? 'right-0' : 'left-0'
  const accentEdge = dir === 'rtl' ? 'right-0' : 'left-0'
  const hidden = dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
  const mainPush = dir === 'rtl' ? 'lg:mr-[272px]' : 'lg:ml-[272px]'
  const initial = (company || 'ت').trim().charAt(0)

  return (
    <div className="min-h-screen" dir={dir} style={{ background: 'var(--bg)' }}>
      {/* ===== Sidebar ===== */}
      <aside
        className={`fixed inset-y-0 ${sideEdge} z-50 w-[272px] flex flex-col text-white transition-transform duration-300 ${open ? 'translate-x-0' : hidden} lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg,#1B2D5B 0%,#10203f 60%,#0c1730 100%)' }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-white grid place-items-center shadow-lg shadow-black/20">
            <img src="/logo.png" alt="تسعيرك" className="w-7 h-7 object-contain" />
          </span>
          <span className="text-2xl font-black tracking-tight">
            {locale === 'en' ? <>TASEER<span style={{ color: '#F5831F' }}>AK</span></>
              : locale === 'ur' ? <>تسعیر<span style={{ color: '#F5831F' }}>ک</span></>
              : <>تسعير<span style={{ color: '#F5831F' }}>ك</span></>}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {nav.map((n, i) => {
            const showSection = n.section && n.section !== nav[i - 1]?.section
            const badge = (n.href === '/messages' && unreadMsgs > 0) ? unreadMsgs : n.badge
            return (
              <div key={n.href}>
                {showSection && (
                  <div className="px-3 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-200/45">{n.section}</div>
                )}
                <a href={n.href} onClick={() => setOpen(false)}
                  className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-semibold transition-colors ${n.active ? 'bg-white/[0.13] text-white' : 'text-blue-100/70 hover:bg-white/[0.07] hover:text-white'}`}>
                  {n.active && <span className={`absolute ${accentEdge} top-2.5 bottom-2.5 w-1 rounded-full`} style={{ background: '#F5831F' }} />}
                  <span className="w-6 grid place-items-center text-[18px]">{n.icon}</span>
                  <span className="truncate">{n.label}</span>
                  {badge != null && badge !== 0 && (
                    <span className="ml-auto min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full text-[11px] font-extrabold text-white" style={{ background: '#F5831F' }}>
                      {badge}
                    </span>
                  )}
                </a>
              </div>
            )
          })}
        </nav>

        {/* User card */}
        {company && (
          <div className="px-3 pb-4">
            <div className="flex items-center gap-3 rounded-2xl p-3 bg-white/[0.06] border border-white/10">
              <span className="w-10 h-10 rounded-xl grid place-items-center font-black text-white shrink-0 shadow" style={{ background: '#0F6E56' }}>{initial}</span>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{company}</div>
                {(companyMeta || companyVerified) && (
                  <div className="text-[11px] text-blue-200/60 truncate flex items-center gap-1">
                    {companyMeta}
                    {companyVerified && <span style={{ color: '#34d399' }}>· موثّق ✓</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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

      {/* مساعد تسعيرك الذكي — عائم في كل صفحات لوحة التحكم */}
      <AiAssistant />
    </div>
  )
}
