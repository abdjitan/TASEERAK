'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
import AiAssistant from '@/components/shared/AiAssistant'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import NavIcon from '@/components/shared/NavIcon'

// mobile: رتبة العنصر في شريط التنقّل السفلي (١–٤) — العناصر بلا رتبة تبقى في «المزيد»
export type ShellNavItem = { href: string; label: string; icon: ReactNode; active?: boolean; section?: string; badge?: number | string; mobile?: number }

// Shared dashboard shell — navy gradient sidebar (244px) + frosted topbar +
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
  // desktop: the sidebar can be folded away (☰ in the top bar) to give the page more room
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { try { setCollapsed(localStorage.getItem('taseerak_nav_collapsed') === '1') } catch {} }, [])
  function toggleCollapsed() {
    setCollapsed(c => { const v = !c; try { localStorage.setItem('taseerak_nav_collapsed', v ? '1' : '0') } catch {} ; return v })
  }
  async function defaultSignOut() {
    clearAllLocalDrafts()
    try { await createClient().auth.signOut() } catch {}
    window.location.href = '/login'
  }
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
  const deskHidden = dir === 'rtl' ? 'lg:translate-x-full' : 'lg:-translate-x-full'
  const mainPush = collapsed ? '' : dir === 'rtl' ? 'lg:mr-[244px]' : 'lg:ml-[244px]'
  const initial = (company || 'ت').trim().charAt(0)

  return (
    <div className="ts-dashboard min-h-screen" dir={dir}>
      {/* ===== Sidebar ===== */}
      <aside
        className={`ts-dashboard-sidebar fixed inset-y-0 ${sideEdge} z-50 w-[244px] flex flex-col text-white transition-transform duration-300 ${open ? 'translate-x-0' : hidden} ${collapsed ? deskHidden : 'lg:translate-x-0'}`}
        style={{ background: 'linear-gradient(180deg,#071827 0%,#0B2438 54%,#050B12 100%)' }}
      >
        {/* Brand */}
        <div className="ts-dashboard-brand px-5 pt-5 pb-4 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt={locale === 'en' ? 'Taseerak' : 'تسعيرك'} className="dashboard-brand-lockup" />
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
                <Link href={n.href} prefetch onClick={() => setOpen(false)}
                  aria-current={n.active ? 'page' : undefined}
                  className={`ts-sidebar-link group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[14px] font-semibold border transition-colors ${n.active ? 'is-active bg-white/[0.09] text-white border-[#D4A543]/35 shadow-[0_6px_20px_-10px_rgba(212,165,67,.45)]' : 'text-[#C7CED6] border-transparent hover:bg-white/[0.05] hover:text-white'}`}>
                  <span className={`ts-sidebar-icon w-8 h-8 shrink-0 grid place-items-center rounded-xl border transition-colors ${n.active ? 'border-[#D4A543]/45 bg-[#D4A543]/10 text-[#F5C55B]' : 'border-white/[0.14] bg-white/[0.04] text-[#E3C77F] group-hover:border-white/25'}`}>
                    <NavIcon href={n.href} fallback={n.icon} />
                  </span>
                  <span className="truncate">{n.label}</span>
                  {badge != null && badge !== 0 && (
                    <span className="ml-auto min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full text-[11px] font-extrabold" style={{ background: '#D4A543', color: '#050B12' }}>
                      {badge}
                    </span>
                  )}
                </Link>
              </div>
            )
          })}
        </nav>

        {/* User card */}
        {company && (
          <div className="px-3 pb-4">
            <div className="ts-company-card flex items-center gap-3 rounded-2xl p-3 bg-white/[0.06] border border-white/10">
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
      <div className={`${mainPush} flex flex-col min-h-screen transition-[margin] duration-300`}>
        <header className="ts-dashboard-topbar sticky top-0 z-30 backdrop-blur-md border-b">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button className="w-9 h-9 grid place-items-center rounded-lg hover:bg-gray-100 shrink-0"
                onClick={() => (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? toggleCollapsed() : setOpen(true))}
                aria-label={locale === 'en' ? 'Menu' : locale === 'ur' ? 'مینو' : 'القائمة'} aria-expanded={!collapsed}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              </button>
              <div className="min-w-0">
                {title && <h1 className="text-lg font-extrabold leading-tight truncate" style={{ color: '#0B2438' }}>{title}</h1>}
                {subtitle && <p className="text-xs truncate" style={{ color: '#48596E' }}>{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {actions}
              <LanguageSwitcher variant="minimal" />
              {userId && <NotificationBell userId={userId} />}
              {/* Log out is on EVERY dashboard page: pages that don't pass onSignOut get the default. */}
              <button type="button" onClick={onSignOut || defaultSignOut} className="text-xs px-2 py-1 rounded transition-colors hover:text-red-600" style={{ color: '#8089a0' }}>
                {locale === 'en' ? 'Log out' : locale === 'ur' ? 'لاگ آؤٹ' : 'خروج'}
              </button>
            </div>
          </div>
        </header>

        <main className="ts-dashboard-main flex-1 p-4 sm:p-6 lg:p-7 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-7">{children}</main>
      </div>

      {/* ===== Bottom nav (mobile only) — 4 وجهات مُنسّقة (رتبة mobile) + «المزيد» يفتح القائمة الكاملة ===== */}
      <nav className="ts-mobile-nav lg:hidden fixed bottom-0 inset-x-0 z-40 flex backdrop-blur-md border-t"
        style={{ background: 'rgba(255,255,255,.96)', borderColor: 'var(--line)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {(() => {
          // وجهات الشريط: المُرتّبة بـmobile أولاً (منسّقة لكل دور)، وإلا أول ٤ عناصر كاحتياط
          const curated = nav.filter((n) => n.mobile != null).sort((a, b) => (a.mobile! - b.mobile!)).slice(0, 4)
          return curated.length > 0 ? curated : nav.slice(0, 4)
        })().map((n) => {
          const badge = (n.href === '/messages' && unreadMsgs > 0) ? unreadMsgs : n.badge
          return (
            <Link key={n.href} href={n.href} prefetch onClick={() => setOpen(false)}
              className={`ts-mobile-nav-link flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative ${n.active ? 'is-active' : ''}`}
              style={{ color: n.active ? '#0B2438' : '#64748b' }}>
              {n.active && <span className="absolute top-0 inset-x-5 h-0.5 rounded-full" style={{ background: '#D4A543' }} />}
              <NavIcon href={n.href} fallback={n.icon} className="w-[21px] h-[21px]" />
              <span className="text-[10px] font-bold truncate max-w-[68px]">{n.label}</span>
              {badge != null && badge !== 0 && (
                <span className="absolute top-1.5 left-[calc(50%-18px)] min-w-[15px] h-[15px] px-1 grid place-items-center rounded-full text-[8px] font-extrabold" style={{ background: '#D4A543', color: '#050B12' }}>{badge}</span>
              )}
            </Link>
          )
        })}
        {/* «المزيد» يفتح القائمة الجانبية كاملة — يضمن الوصول لكل الوجهات (الإعدادات إلخ) على الجوّال */}
        <button onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
          style={{ color: '#64748b' }} aria-label={locale === 'en' ? 'More' : 'المزيد'}>
          <span className="text-[19px] leading-none">☰</span>
          <span className="text-[10px] font-bold">{locale === 'en' ? 'More' : locale === 'ur' ? 'مزید' : 'المزيد'}</span>
        </button>
      </nav>

      {/* مساعد تسعيرك الذكي — عائم في كل صفحات لوحة التحكم */}
      <AiAssistant />
    </div>
  )
}
