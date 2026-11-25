'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
import AiAssistant from '@/components/shared/AiAssistant'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import NavIcon from '@/components/shared/NavIcon'
import Glyph from '@/components/shared/Glyph'
import { storedSellerKind } from '@/lib/sellers'
import { claimPendingRef } from '@/lib/referral'
import { realtimeTopic } from '@/lib/realtimeTopic'
import PhoneVerifyBanner from '@/components/shared/PhoneVerifyBanner'
import { storedBuyerType, rememberBuyerType } from '@/lib/buyerType'
import { askConfirm } from '@/lib/askConfirm'
import { LogOut, ShieldCheck, Plus, WifiOff } from 'lucide-react'
import { fetchNavBadges, cachedNavBadges, type NavBadges } from '@/components/shared/navBadges'

// A request draft (text or photos) saved on this device: signing out deletes it, so ask first (UX-036).
function hasLocalDraft(): boolean {
  try {
    const ls = window.localStorage
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith('taseerak_draft:')) return true }
  } catch {}
  return false
}

// Unread-messages badge cache shared by every AppShell mount (see the effect below).
const unreadCache = { uid: '', n: 0, at: 0 }
// Last touch_last_seen call (heartbeat below), so page changes do not re-send it every time.
const lastSeenTouch = { at: 0 }
// Shell state read from this device (folded sidebar, seller kind, buyer type), kept for the whole visit
// so a page change does not make the sidebar jump or the menu items flash (UX-098). ready = read once.
const shellCache: { ready: boolean; collapsed: boolean; kind: string | null; buyerType: string | null; typeSynced?: boolean; card?: ShellCard | null } = { ready: false, collapsed: false, kind: null, buyerType: null }
// The user card (name, meta line, verified) is remembered across pages: most pages do not pass it,
// and the card used to vanish on them (round-4 UX-146). Kept per device for the next visit too.
type ShellCard = { company: string; meta?: string; verified?: boolean }
const CARD_KEY = 'tsk_shell_card'
/** Forget the remembered user card (on sign-out, so the next account on this device never sees it). */
export function clearShellCard() { shellCache.card = null; try { localStorage.removeItem(CARD_KEY) } catch {} }

// mobile: رتبة العنصر في شريط التنقّل السفلي (١–٤) — العناصر بلا رتبة تبقى في «المزيد»
// only: 'company' = hidden for an independent seller; 'business' = hidden for a home buyer («لبيتي»).
export type ShellNavItem = { href: string; label: string; icon: ReactNode; active?: boolean; section?: string; badge?: number | string; mobile?: number; mobileLabel?: string; only?: 'company' | 'business' }

// Shared dashboard shell — navy gradient sidebar (244px) + frosted topbar +
// off-canvas drawer on mobile. Pages pass their own nav items + header actions.
export default function AppShell({
  title, subtitle, company, companyMeta, companyVerified, userId, nav: navIn = [], actions, onSignOut, children, dir = 'rtl', hideAssistant = false,
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
  /** a page with a fixed bottom action bar hides the floating assistant so it never covers the main button (UX-006) */
  hideAssistant?: boolean
}) {
  const { locale } = useTranslation()
  // a menu badge stops at «9+», with «unread» for screen readers (round-6 UX-120)
  const badgeText = (b: any) => (typeof b === 'number' && b > 9 ? '9+' : b)
  const unreadWord = locale === 'en' ? 'unread' : locale === 'ur' ? 'نئے' : 'غير مقروءة'
  const [card, setCard] = useState<ShellCard | null>(company ? { company, meta: companyMeta ?? shellCache.card?.meta, verified: companyVerified ?? shellCache.card?.verified } : shellCache.card || null)
  useEffect(() => {
    if (company) {
      // a page that passes only the name keeps the meta line and the badge remembered before (round-7 UX-225)
      const prev = shellCache.card
      const c: ShellCard = { company, meta: companyMeta ?? prev?.meta, verified: companyVerified ?? prev?.verified }
      shellCache.card = c; setCard(c)
      try { localStorage.setItem(CARD_KEY, JSON.stringify(c)) } catch {}
    } else if (!shellCache.card) {
      try { const c = JSON.parse(localStorage.getItem(CARD_KEY) || 'null'); if (c && typeof c.company === 'string') { shellCache.card = c; setCard(c) } } catch {}
    }
  }, [company, companyMeta, companyVerified])
  // An independent seller has no branches or team: company-only items leave the menu.
  const [kind, setKind] = useState<string | null>(shellCache.kind)
  // The buyer type is read after mount (not during render), so the server and first client render
  // agree and a home buyer never sees the business tools flash in (UX-144). Later pages start from
  // the module cache, and restricted items stay hidden until the type is known (UX-098).
  const [buyerType, setBuyerType] = useState<string | null>(shellCache.buyerType)
  const [typeReady, setTypeReady] = useState(shellCache.ready)
  useEffect(() => {
    const read = () => {
      const k = storedSellerKind(); const b = storedBuyerType()
      Object.assign(shellCache, { kind: k, buyerType: b })
      setKind(k); setBuyerType(b)
    }
    read()
    if (!shellCache.ready) { try { shellCache.collapsed = localStorage.getItem('taseerak_nav_collapsed') === '1' } catch {} }
    shellCache.ready = true
    setCollapsed(shellCache.collapsed); setTypeReady(true)
    // switching the buyer type (settings, the home prompt) updates the menu at once
    const onType = () => read()
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === 'taseerak_buyer_type' || e.key.startsWith('taseerak_seller')) read() }
    window.addEventListener('tsk:buyer-type', onType)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('tsk:buyer-type', onType); window.removeEventListener('storage', onStorage) }
  }, [])
  // where this session connects from (approximate, from the connection; migration 229), once per session
  useEffect(() => {
    try { if (sessionStorage.getItem('tsk_loc') === '1') return; sessionStorage.setItem('tsk_loc', '1') } catch { return }
    fetch('/api/track-location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client: 'web' }) }).catch(() => {})
  }, [])
  // Opening the page a notification points to counts as reading it, so its delayed WhatsApp
  // is not sent (owner 2026-11-14, migration 206).
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname) return
    const full = pathname + (typeof window !== 'undefined' ? window.location.search : '')
    createClient().rpc('mark_notifications_read_for_url', { p_path: pathname, p_full: full }).then(() => {}, () => {})
  }, [pathname])
  const nav = navIn.filter(n => !(n.only && !typeReady) && !(n.only === 'company' && kind === 'independent') && !(n.only === 'business' && buyerType === 'individual'))
  // Remember which menu this device shows, so PageLoader can draw the same frame on shared pages
  // (messages, settings…) while their data loads. Key = ROLE_HINT_KEY in PageLoader.
  const roleHint = navIn.some(n => n.href.startsWith('/admin')) ? 'admin'
    : navIn.some(n => n.href.startsWith('/supplier')) ? 'supplier'
    : navIn.some(n => n.href.startsWith('/contractor')) ? 'contractor' : null
  useEffect(() => { if (roleHint) try { localStorage.setItem('tsk_role_hint', roleHint) } catch {} }, [roleHint])
  const [open, setOpen] = useState(false)
  // desktop: the sidebar can be folded away (☰ in the top bar) to give the page more room
  const [collapsed, setCollapsed] = useState(shellCache.collapsed)
  function toggleCollapsed() {
    setCollapsed(c => { const v = !c; shellCache.collapsed = v; try { localStorage.setItem('taseerak_nav_collapsed', v ? '1' : '0') } catch {} ; return v })
  }
  async function defaultSignOut() {
    clearAllLocalDrafts()
    clearShellCard()
    try { await createClient().auth.signOut() } catch {}
    window.location.href = '/login'
  }
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  // Sign-out deletes the unsent request saved on this device (with its photos): confirm first.
  async function signOut() {
    if (hasLocalDraft()) {
      const ok = await askConfirm(L(
        'Log out? The unsent request saved on this device will be deleted with its photos.',
        'لاگ آؤٹ کریں؟ اس ڈیوائس پر محفوظ نہ بھیجی گئی درخواست اپنی تصاویر سمیت حذف ہو جائے گی۔',
        'تسجيل الخروج؟ سيُحذف الطلب غير المرسل المحفوظ على هذا الجهاز مع صوره.'),
        { danger: true, okLabel: L('Log out', 'لاگ آؤٹ', 'تسجيل الخروج') })
      if (!ok) return
    }
    setOpen(false)
    await (onSignOut || defaultSignOut)()
  }
  // The signed-in user's id, so the bell shows on every page even when the page does not pass userId (UX-100).
  const [sessionUid, setSessionUid] = useState<string | undefined>(userId)
  useEffect(() => {
    if (userId) { setSessionUid(userId); return }
    let gone = false
    createClient().auth.getSession().then(({ data: { session } }) => { if (!gone) setSessionUid(session?.user?.id) }, () => {})
    return () => { gone = true }
  }, [userId])
  // The home/business mode lived only in this device's storage: a deal link opened on a new device
  // showed «RFQ-1045» and business warnings to a home buyer. Read buyer_type from the profile once per
  // session on buyer pages and remember it (UX-068).
  useEffect(() => {
    if (!sessionUid || roleHint !== 'contractor' || shellCache.typeSynced) return
    shellCache.typeSynced = true
    createClient().from('profiles').select('buyer_type').eq('id', sessionUid).maybeSingle().then(({ data }: any) => {
      const bt = data?.buyer_type || null
      if (bt && bt !== storedBuyerType()) { rememberBuyerType(bt); window.dispatchEvent(new Event('tsk:buyer-type')) }
    }, () => { shellCache.typeSynced = false })
  }, [sessionUid, roleHint])
  // One h1 per page (UX-110): when the page itself has none, the bar title becomes the h1.
  const mainRef = useRef<HTMLElement | null>(null)
  const [pageHasH1, setPageHasH1] = useState(true)
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const check = () => setPageHasH1(!!el.querySelector('h1'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(el, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])
  // Mobile drawer: Escape closes it, the page behind does not scroll, Tab stays inside the menu, and
  // focus returns to the button that opened it when it closes (UX-156, UX-106).
  const drawerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])
    const t = setTimeout(() => { focusables()[0]?.focus() }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key !== 'Tab') return
      const f = focusables(); if (f.length === 0) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      else if (!drawerRef.current?.contains(document.activeElement)) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey); document.body.style.overflow = prev
      try { opener?.focus?.() } catch {}
    }
  }, [open])
  // The closed drawer on a phone is off-screen: keep it out of the tab order (inert) until opened.
  const [isDesk, setIsDesk] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setIsDesk(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  const drawerInert = isDesk ? collapsed : !open
  // عدد الرسائل غير المقروءة — شارة على «الرسائل» في القائمة
  // Every page renders its own AppShell, so the count is kept in a module cache: a page change
  // shows the last count at once and only re-asks the database when it is over a minute old
  // (realtime keeps it fresh in between).
  const [unreadMsgs, setUnreadMsgs] = useState(unreadCache.n)
  useEffect(() => {
    const supabase = createClient()
    let ch: any
    let cancelled = false
    let onRead: (() => void) | null = null
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = userId || session?.user?.id
      if (!uid || cancelled) return
      claimPendingRef(supabase) // a new account opened from an invite link: link it to the inviter once
      const refresh = async () => {
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).is('read_at', null).neq('sender_id', uid)
        Object.assign(unreadCache, { uid, n: count || 0, at: Date.now() })
        setUnreadMsgs(count || 0)
      }
      if (unreadCache.uid === uid && Date.now() - unreadCache.at < 60_000) setUnreadMsgs(unreadCache.n)
      else await refresh()
      if (cancelled) return
      // Only this person's conversations (send_message bumps last_message_at) — the old listener
      // heard every message on the platform and recounted for each (perf audit 2026-11-01).
      // Reading messages is announced by the messages page with a 'tsk:msgs-read' event.
      ch = supabase.channel(realtimeTopic(`appshell-msgs-${uid}`))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `contractor_id=eq.${uid}` }, () => { refresh() })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `supplier_id=eq.${uid}` }, () => { refresh() })
        .subscribe()
      onRead = () => { refresh() }
      window.addEventListener('tsk:msgs-read', onRead)
    })()
    return () => {
      cancelled = true
      if (ch) supabase.removeChannel(ch)
      if (onRead) window.removeEventListener('tsk:msgs-read', onRead)
    }
  }, [userId])
  // The other menu badges, as on the app's tabs (round-7 UX-099, UX-244): cached 60 s across pages.
  const [badges, setBadges] = useState<NavBadges>(() => cachedNavBadges(userId, roleHint) || {})
  useEffect(() => {
    if (!sessionUid || !roleHint || roleHint === 'admin') return
    let gone = false
    const supabase = createClient()
    const load = (force = false) => fetchNavBadges(supabase, sessionUid, roleHint, force).then((b) => { if (!gone) setBadges(b) }, () => {})
    load()
    const onSupportRead = () => load(true)
    window.addEventListener('tsk:support-read', onSupportRead)
    return () => { gone = true; window.removeEventListener('tsk:support-read', onSupportRead) }
  }, [sessionUid, roleHint, pathname])
  const badgeFor = (n: ShellNavItem) => (n.href === '/messages' && unreadMsgs > 0) ? unreadMsgs : (badges[n.href] || n.badge)
  // No connection: one bar says so, instead of pages that seem to hang (round-7 UX-226)
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine)
    on()
    window.addEventListener('online', on); window.addEventListener('offline', on)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on) }
  }, [])
  // «Online» heartbeat for the owner dashboard: touch_last_seen now and every 2 minutes while the
  // tab is visible (paused when hidden). Throttled across page changes by the module cache.
  useEffect(() => {
    const supabase = createClient()
    let timer: any
    let stopped = false
    const touch = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastSeenTouch.at < 60_000) return
      lastSeenTouch.at = Date.now()
      supabase.rpc('touch_last_seen').then(() => {}, () => {})
    }
    const start = () => { clearInterval(timer); touch(); timer = setInterval(touch, 120_000) }
    const onVis = () => { if (document.visibilityState === 'hidden') clearInterval(timer); else start() }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (stopped || !session) return
      start()
      document.addEventListener('visibilitychange', onVis)
    }, () => {})
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  // Warm every menu page in the background once the shell is idle, so even the first visit to a
  // page doesn't wait for its code and server payload (the mobile drawer links are off-screen, so
  // <Link prefetch> alone would not fetch them).
  const router = useRouter()
  const navKey = nav.map(n => n.href).join('|')
  useEffect(() => {
    const hrefs = navKey.split('|').filter(h => h.startsWith('/'))
    const run = () => hrefs.forEach(h => { try { router.prefetch(h) } catch {} })
    const w = window as any
    const id = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 2500 }) : setTimeout(run, 1200)
    return () => { w.cancelIdleCallback ? w.cancelIdleCallback(id) : clearTimeout(id) }
  }, [navKey, router])
  const sideEdge = dir === 'rtl' ? 'right-0' : 'left-0'
  const accentEdge = dir === 'rtl' ? 'right-0' : 'left-0'
  const hidden = dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
  const deskHidden = dir === 'rtl' ? 'lg:translate-x-full' : 'lg:-translate-x-full'
  const mainPush = collapsed ? '' : dir === 'rtl' ? 'lg:mr-[244px]' : 'lg:ml-[244px]'
  // --side-w (master-brand.css): the width the sidebar takes on desktop, so a fixed bar (the request
  // send bar) can start beside it instead of under it (UX-074). 0 on phones and when folded.
  const initial = (card?.company || 'ت').trim().charAt(0)

  return (
    <div className={`ts-dashboard min-h-screen ${collapsed ? 'is-nav-collapsed' : ''}`} dir={dir}>
      {/* ===== Sidebar ===== */}
      <aside
        id="ts-drawer"
        ref={drawerRef}
        aria-label={L('Main menu', 'مرکزی مینو', 'القائمة الرئيسية')}
        {...(drawerInert ? { inert: true as any, 'aria-hidden': true } : {})}
        {...(!isDesk && open ? { role: 'dialog', 'aria-modal': true } : {})}
        className={`ts-dashboard-sidebar print:hidden fixed inset-y-0 ${sideEdge} z-50 w-[244px] flex flex-col text-white transition-transform duration-300 ${open ? 'translate-x-0' : hidden} ${collapsed ? deskHidden : 'lg:translate-x-0'}`}
        style={{ background: 'linear-gradient(180deg,#071827 0%,#0B2438 54%,#050B12 100%)' }}
      >
        {/* Brand */}
        <div className="ts-dashboard-brand px-5 pt-5 pb-4 flex items-center justify-center relative">
          {/* close (phone drawer) */}
          <button type="button" onClick={() => setOpen(false)} className="lg:hidden absolute top-3 end-3 w-11 h-11 grid place-items-center rounded-xl text-[#C7CED6] hover:bg-white/10"
            aria-label={L('Close menu', 'مینو بند کریں', 'إغلاق القائمة')}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt={locale === 'en' ? 'Taseerak' : 'تسعيرك'} className="dashboard-brand-lockup" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {nav.map((n, i) => {
            const showSection = n.section && n.section !== nav[i - 1]?.section
            const badge = badgeFor(n)
            return (
              <div key={n.href}>
                {showSection && (
                  <div className={`px-3 pt-5 pb-1.5 text-[12px] font-bold text-[#AEB9C6] ${locale === 'en' ? 'uppercase tracking-[0.08em]' : ''}`}>{n.section}</div>
                )}
                <Link href={n.href} prefetch onClick={() => setOpen(false)}
                  aria-current={n.active ? 'page' : undefined}
                  className={`ts-sidebar-link group relative flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-xl text-[14px] font-semibold border transition-colors ${n.active ? 'is-active bg-white/[0.09] text-white border-[#D4A543]/35 shadow-[0_6px_20px_-10px_rgba(212,165,67,.45)]' : 'text-[#C7CED6] border-transparent hover:bg-white/[0.05] hover:text-white'}`}>
                  <span className={`ts-sidebar-icon w-8 h-8 shrink-0 grid place-items-center rounded-xl border transition-colors ${n.active ? 'border-[#D4A543]/45 bg-[#D4A543]/10 text-[#F5C55B]' : 'border-white/[0.14] bg-white/[0.04] text-[#E3C77F] group-hover:border-white/25'}`}>
                    <NavIcon href={n.href} fallback={n.icon} />
                  </span>
                  <span className="truncate">{n.label}</span>
                  {badge != null && badge !== 0 && (
                    <span className="ms-auto min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full text-[12px] font-bold" style={{ background: '#D4A543', color: '#050B12' }}>
                      {badgeText(badge)}<span className="sr-only"> {unreadWord}</span>
                    </span>
                  )}
                </Link>
              </div>
            )
          })}
        </nav>

        {/* Log out lives in the menu (on phones the top bar has no room for it, UX-036) */}
        <div className="px-3 pb-2">
          <button type="button" onClick={signOut}
            className="w-full min-h-[44px] flex items-center gap-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-[#C7CED6] border border-transparent hover:bg-white/[0.05] hover:text-white">
            <span className="w-8 h-8 shrink-0 grid place-items-center rounded-xl border border-white/[0.14] bg-white/[0.04] text-[#E3C77F]"><LogOut className="w-[18px] h-[18px]" strokeWidth={1.9} aria-hidden /></span>
            {L('Log out', 'لاگ آؤٹ', 'تسجيل الخروج')}
          </button>
        </div>

        {/* User card */}
        {card?.company && (
          <div className="px-3 pb-4">
            <div className="ts-company-card flex items-center gap-3 rounded-2xl p-3 bg-white/[0.06] border border-white/10">
              <span className="w-10 h-10 rounded-xl grid place-items-center font-bold shrink-0 shadow" style={{ background: '#D4A543', color: '#071827' }}>{initial}</span>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{card.company}</div>
                {(card.meta || card.verified) && (
                  <div className="text-[12px] text-[#AEB9C6] truncate flex items-center gap-1">
                    {card.meta}
                    {card.verified && <span className="inline-flex items-center gap-0.5 text-[#F5C55B]"><ShieldCheck className="w-3.5 h-3.5" aria-hidden />{L('Verified', 'تصدیق شدہ', 'موثّق')}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* backdrop (mobile) */}
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      {/* ===== Main column ===== */}
      <div className={`${mainPush} flex flex-col min-h-screen transition-[margin] duration-300`} {...(!isDesk && open ? { inert: true as any } : {})}>
        {/* keyboard users jump past the menu and the top bar (UX-110) */}
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[80] focus:inline-flex focus:items-center focus:min-h-[44px] focus:px-4 focus:rounded-xl focus:font-bold focus:shadow-lg" style={{ background: '#D4A543', color: '#071827' }}>{L('Skip to content', 'مواد پر جائیں', 'انتقل إلى المحتوى')}</a>
        <header className="ts-dashboard-topbar print:hidden sticky top-0 z-30 backdrop-blur-md border-b">
          <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button type="button" className="w-11 h-11 grid place-items-center rounded-lg hover:bg-gray-100 shrink-0" aria-controls="ts-drawer"
                onClick={() => (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? toggleCollapsed() : setOpen(true))}
                aria-label={L('Menu', 'مینو', 'القائمة')} aria-expanded={isDesk ? !collapsed : open}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              </button>
              <div className="min-w-0">
                {/* the page has its own h1; the bar title is a plain line so there is one h1 per page (UX-159) */}
                {title && (pageHasH1
                  ? <p className="ts-topbar-title text-base sm:text-lg font-bold leading-tight truncate" style={{ color: '#0B2438' }}>{title}</p>
                  : <h1 className="ts-topbar-title text-base sm:text-lg font-bold leading-tight truncate" style={{ color: '#0B2438' }}>{title}</h1>)}
                {subtitle && <p className="text-xs truncate" style={{ color: '#48596E' }}>{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {actions}
              {/* phones: one compact language button; wider screens: the three codes */}
              <span className="sm:hidden"><LanguageSwitcher variant="nav" compact /></span>
              <span className="hidden sm:flex"><LanguageSwitcher variant="minimal" /></span>
              {sessionUid && <NotificationBell userId={sessionUid} />}
              {/* Log out is on EVERY dashboard page (pages that don't pass onSignOut get the default);
                  on phones it sits in the menu instead, the top bar has no room for it. */}
              <button type="button" onClick={signOut} className={`hidden sm:inline-flex ${collapsed ? "" : "lg:hidden"} items-center gap-1 text-sm min-h-[44px] px-2 rounded-lg transition-colors hover:text-red-700 hover:bg-gray-50`} style={{ color: '#5B6B7C' }}>
                <LogOut className="w-4 h-4" aria-hidden />{L('Log out', 'لاگ آؤٹ', 'تسجيل الخروج')}
              </button>
            </div>
          </div>
        </header>

        {offline && (
          <div role="status" className="print:hidden sticky top-[61px] sm:top-[69px] z-30 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-warn-bg text-warn-text border-b border-warn-border">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
            {L('No internet connection. Check the network, then try again.', 'انٹرنیٹ کنکشن نہیں ہے۔ نیٹ ورک چیک کریں، پھر دوبارہ کوشش کریں۔', 'لا يوجد اتصال بالإنترنت، تحقّق من الشبكة ثم أعد المحاولة.')}
          </div>
        )}
        <main id="main" tabIndex={-1} ref={mainRef} className="ts-dashboard-main flex-1 p-4 sm:p-6 lg:p-7 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-7 focus:outline-none"><PhoneVerifyBanner />{children}</main>
      </div>

      {/* ===== Bottom nav (mobile only) — 4 وجهات مُنسّقة (رتبة mobile) + «المزيد» يفتح القائمة الكاملة ===== */}
      <nav aria-label={L('Quick links', 'فوری لنکس', 'روابط سريعة')} className="ts-mobile-nav lg:hidden print:hidden fixed bottom-0 inset-x-0 z-40 flex backdrop-blur-md border-t"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {(() => {
          // وجهات الشريط: المُرتّبة بـmobile أولاً (منسّقة لكل دور)، وإلا أول ٤ عناصر كاحتياط
          const curated = nav.filter((n) => n.mobile != null).sort((a, b) => (a.mobile! - b.mobile!)).slice(0, 4)
          return curated.length > 0 ? curated : nav.slice(0, 4)
        })().map((n) => {
          const badge = badgeFor(n)
          const label = n.mobileLabel || n.label
          // The buyer's main action (new price request) is a raised gold circle, not one more tab (UX-196).
          // Its label is light on the navy bar (gold when open), the ring matches the bar (UX-019).
          if (n.href === '/contractor/rfq/quick') return (
            <Link key={n.href} href={n.href} prefetch onClick={() => setOpen(false)} aria-current={n.active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-end gap-0.5 pb-1.5 relative min-h-[56px]" style={{ color: n.active ? '#F5C55B' : '#E8EDF2' }}>
              <span className="-mt-5 w-[52px] h-[52px] rounded-full grid place-items-center shadow-[0_8px_20px_-8px_rgba(157,116,37,.7)] ring-4 ring-[#071827]"
                style={{ background: 'linear-gradient(180deg,#F5C55B,#D4A543)', color: '#071827' }}>
                <Plus className="w-6 h-6" strokeWidth={2.4} aria-hidden />
              </span>
              <span className="text-[12px] font-bold truncate max-w-[84px]">{label}</span>
            </Link>
          )
          return (
            <Link key={n.href} href={n.href} prefetch onClick={() => setOpen(false)} aria-current={n.active ? 'page' : undefined}
              className={`ts-mobile-nav-link flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] relative ${n.active ? 'is-active' : ''}`}>
              <NavIcon href={n.href} fallback={n.icon} className="w-[21px] h-[21px]" />
              <span className="text-[12px] font-bold truncate max-w-[84px]">{label}</span>
              {badge != null && badge !== 0 && (
                <span className="absolute top-0.5 end-[calc(50%-24px)] min-w-[20px] h-[20px] px-1 grid place-items-center rounded-full text-[12px] font-bold" style={{ background: '#D4A543', color: '#050B12' }}>{badgeText(badge)}<span className="sr-only"> {unreadWord}</span></span>
              )}
            </Link>
          )
        })}
        {/* «المزيد» يفتح القائمة الجانبية كاملة — يضمن الوصول لكل الوجهات (الإعدادات إلخ) على الجوّال */}
        <button type="button" onClick={() => setOpen(true)} aria-controls="ts-drawer" aria-expanded={open}
          className="ts-mobile-nav-link flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]">
          <span className="text-[19px] leading-none"><Glyph e="☰" /></span>
          <span className="text-[12px] font-bold">{L('More', 'مزید', 'المزيد')}</span>
        </button>
      </nav>

      {/* مساعد تسعيرك الذكي — عائم في كل صفحات لوحة التحكم */}
      {!hideAssistant && <div className="print:hidden"><AiAssistant /></div>}
    </div>
  )
}
