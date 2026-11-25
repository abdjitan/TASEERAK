'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { noEmoji, timeAgo } from '@/lib/text'
import { normalizeText } from '@/lib/normalize'
import { useTranslation } from '@/i18n'
import AutoTr from '@/components/shared/AutoTr'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import Glyph from '@/components/shared/Glyph'
import { notifText } from '@/lib/notifText'
import { useFocusTrap } from '@/components/shared/useFocusTrap'

/** The event the notifications page fires after it marks everything read, so the bell clears (UX-056). */
export const NOTIFS_READ_EVENT = 'tsk:notifs-read'

/**
 * A line icon per notification (shared with the notifications page). The specific kind
 * (data.kind) decides first, then a few known titles that reuse a generic type (a re-pricing
 * request is stored as offer_rejected), then the type (UX-123).
 */
export function notifGlyph(type: any, data?: any, title?: any): string {
  const kind = String(data?.kind || '')
  // payment steps: the cash icon (round-6 UX-101)
  if (kind === 'paid' || kind === 'payment_confirmed' || type === 'paid' || type === 'payment_confirmed') return '💵'
  if (kind === 'deal_closed') return 'ℹ'
  if (kind === 'uncovered') return '📋'
  if (kind) {
    if (kind.startsWith('reduction')) return '📉'
    if (kind === 'info_request') return '❓'
    if (kind === 'info_response') return '💬'
    if (kind === 'extras_confirm' || kind === 'delivered') return '🚚'
    if (kind === 'invoice') return '🧾'
    if (kind === 'receipt') return '📥'
    if (kind === 'award') return '🤝'
    if (kind === 'rfq_changed' || kind === 'requote') return '🔁'
    if (kind === 'suggestion') return '💡'
    if (kind === 'catalog_gap') return '📋'
    if (kind === 'purge_warning') return '⚠'
    if (kind === 'broadcast' || kind === 'support_view') return 'ℹ'
  }
  const ti = normalizeText(String(title || ''))
  if (ti && (ti.includes(normalizeText('من جديد')) || ti.includes(normalizeText('عدّل المشتري')))) return '🔁'
  const t = String(type || '')
  // a settled problem is good news: a check, not the warning sign (UX-128)
  if (t === 'dispute_resolved' || kind === 'dispute_resolved') return '✅'
  // deal steps stored without a kind used to show the handshake: read the step from the title (UX-128)
  if (ti && (t === 'offer_accepted' || t.includes('deal'))) {
    if (ti.includes(normalizeText('فاتورة'))) return '🧾'
    if (ti.includes(normalizeText('استلام')) || ti.includes(normalizeText('استلم'))) return '📥'
    if (ti.includes(normalizeText('تسليم')) || ti.includes(normalizeText('سلّم'))) return '🚚'
    if (ti.includes(normalizeText('دفع'))) return '💵'
  }
  if (t === 'rfq_changed') return '🔁'
  if (t.includes('message')) return '💬'
  if (t === 'offer_accepted' || t.includes('award')) return '🤝'
  if (t.includes('rejected')) return '📭'
  if (t === 'rfq_offer' || t.includes('new_offer') || t.includes('reduc') || t.includes('reduced')) return '📨'
  if (t === 'new_rfq') return '📋'
  if (t.includes('expir') || t.includes('deadline') || t.includes('remind')) return '⏰'
  if (t.includes('dispute')) return '⚠'
  if (t.includes('deliver')) return '🚚'
  if (t.includes('receipt') || t.includes('received')) return '📥'
  if (t.includes('pay')) return '💵'
  if (t.includes('invoice')) return '🧾'
  if (t.includes('verif')) return '🛡'
  if (t.includes('review') || t.includes('rating')) return '⭐'
  if (t.includes('admin') || t.includes('support')) return 'ℹ'
  return '🔔'
}

/**
 * A notice's title or body in the reader's language (round-4 UX-021): the template from
 * notifText when there is one, else the stored Arabic text (machine-translated for en/ur readers).
 */
export function NotifField({ n, field, locale }: { n: any; field: 'title' | 'body'; locale: string }) {
  const t = notifText(n, locale)[field]
  if (t) return <span dir="auto">{t}</span>
  return <AutoTr text={noEmoji(n?.[field])} locale={locale} noToggle />
}

/** Only same-site paths are followed from a stored notification. */
export function safeNotifUrl(url: any): string | null {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') ? url : null
}

export default function NotificationBell({ userId }: { userId?: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId)
  const markAllRef = useRef(markAllAsRead)
  markAllRef.current = markAllAsRead
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number; width: number } | null>(null)
  const ref = useRef<any>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  // keyboard users land inside the panel (it lives in a portal at the end of <body>) and Tab stays there (UX-116)
  useFocusTrap(panelRef, open && !!pos)
  // in the reader's language (review 2026-10-28: the bell was Arabic only); notification texts are
  // written in Arabic by the database and shown translated for English/Urdu readers
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  // the full notifications page marks everything read: clear the badge too (UX-056)
  useEffect(() => {
    // a short delay: a new notification read on that page may reach this bell's own subscription
    // just after the event
    let t: any
    const onRead = () => { clearTimeout(t); t = setTimeout(() => markAllRef.current(), 800) }
    window.addEventListener(NOTIFS_READ_EVENT, onRead)
    return () => { clearTimeout(t); window.removeEventListener(NOTIFS_READ_EVENT, onRead) }
  }, [])

  // The panel opens in a portal on <body> (UX-018): inside the dark top bar the bar's own
  // colour rules made it transparent with near-white text, and the bar's backdrop blur traps
  // fixed children. Phones get a full-width sheet under the bar; wider screens align to the bell.
  const place = () => {
    const b = btnRef.current?.getBoundingClientRect()
    if (!b) return
    const vw = window.innerWidth
    const top = Math.round(b.bottom + 8)
    if (vw < 640) { setPos({ top, left: 8, right: 8, width: vw - 16 }); return }
    const width = 380
    if (dir === 'rtl') setPos({ top, left: Math.max(8, Math.round(b.left)), width })
    else setPos({ top, right: Math.max(8, Math.round(vw - b.right)), width })
  }
  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, dir])

  useEffect(() => {
    function onClick(e: any) {
      if (ref.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const openItem = (n: any) => {
    if (!n.is_read) markAsRead(n.id) // a read one must not lower the badge again (UX-056)
    setOpen(false)
    const url = safeNotifUrl(n.data?.url)
    if (url) router.push(url)
  }

  const panel = open && pos && typeof document !== 'undefined' ? createPortal(
    <div ref={panelRef} dir={dir} role="dialog" aria-label={L('Notifications', 'اطلاعات', 'الإشعارات')}
      className="ts-notif-panel fixed z-[70] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{
        top: pos.top, left: pos.left, right: pos.right, width: pos.left !== undefined && pos.right !== undefined ? undefined : pos.width,
        maxHeight: `calc(100dvh - ${pos.top + 12}px)`, background: '#FFFFFF', border: '1px solid #D9E0E8', color: '#0B2438',
      }}>
      <div className="flex items-center justify-between gap-2 px-4 py-2 shrink-0" style={{ borderBottom: '1px solid #E8EDF2' }}>
        <span className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('Notifications', 'اطلاعات', 'الإشعارات')}</span>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllAsRead} className="text-xs font-semibold hover:underline min-h-[44px] px-2" style={{ color: '#8F6820' }}>
            {L('Mark all as read', 'سب کو پڑھا ہوا کریں', 'تعليم الكل كمقروء')}
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#526579' }}>{L('No notifications', 'کوئی اطلاع نہیں', 'لا توجد إشعارات')}</div>
        ) : notifications.map((n: any) => { const hasUrl = !!safeNotifUrl(n.data?.url); const Row: any = hasUrl ? 'button' : 'div'; return (
          // a notice with no page to open is plain text, not a button that does nothing (round-6 UX-101)
          <Row {...(hasUrl ? { type: 'button' } : {})} key={n.id} onClick={() => (hasUrl ? openItem(n) : !n.is_read && markAsRead(n.id))}
            className={`w-full text-start px-4 py-3 min-h-[56px] transition-colors ${hasUrl ? 'hover:bg-[#F5F7FA]' : ''}`}
            style={{ borderBottom: '1px solid #F0F3F6', background: n.is_read ? '#FFFFFF' : 'rgba(212,165,67,.10)' }}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="w-9 h-9 shrink-0 rounded-full grid place-items-center" style={{ background: 'rgba(11,36,56,.06)', color: '#0B2438' }}>
                <Glyph e={notifGlyph(n.type, n.data, n.title)} />
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm line-clamp-2 ${n.is_read ? 'font-semibold' : 'font-bold'}`} style={{ color: '#0B2438' }}><NotifField n={n} field="title" locale={locale} /></div>
                {n.body && <div className="text-xs mt-0.5 line-clamp-2" style={{ color: '#526579' }}><NotifField n={n} field="body" locale={locale} /></div>}
                <div className="text-xs mt-1" style={{ color: '#526579' }}>{timeAgo(n.created_at, locale)}</div>
              </div>
              {!n.is_read && <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: '#D4A543' }} role="img" aria-label={L('Unread', 'نئی', 'غير مقروء')} />}
            </div>
          </Row>
        ) })}
      </div>
      <button type="button" onClick={() => { setOpen(false); router.push('/notifications') }}
        className="w-full text-center text-sm font-bold min-h-[48px] hover:bg-[#F5F7FA] shrink-0" style={{ color: '#8F6820', borderTop: '1px solid #E8EDF2' }}>
        {L('See all notifications', 'تمام اطلاعات دیکھیں', 'عرض كل الإشعارات')} <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
      </button>
    </div>,
    document.body,
  ) : null

  return (
    <div className="relative" ref={ref}>
      <button ref={btnRef} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog"
        className="relative min-w-[44px] min-h-[44px] grid place-items-center rounded-lg hover:bg-gray-100 transition-all"
        aria-label={unreadCount > 0 ? L(`Notifications, ${unreadCount} unread`, `اطلاعات، ${unreadCount} نئی`, `الإشعارات، ${unreadCount} غير مقروءة`) : L('Notifications', 'اطلاعات', 'الإشعارات')}>
        <span className="text-lg"><Glyph e="🔔" /></span>
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute top-0.5 end-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#D4A543] text-[#071827] text-[12px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </div>
  )
}
