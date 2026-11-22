'use client'

import { useState, useRef, useEffect } from 'react'
import { noEmoji, timeAgo } from '@/lib/text'
import { useTranslation } from '@/i18n'
import AutoTr from '@/components/shared/AutoTr'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import Glyph from '@/components/shared/Glyph'

/** A line icon per notification kind (shared with the notifications page). */
export function notifGlyph(type: any): string {
  const t = String(type || '')
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

export default function NotificationBell({ userId }: { userId?: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const ref = useRef<any>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  // in the reader's language (review 2026-10-28: the bell was Arabic only); notification texts are
  // written in Arabic by the database and shown translated for English/Urdu readers
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  useEffect(() => {
    function onClick(e: any) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open) { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button ref={btnRef} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true"
        className="relative min-w-[44px] min-h-[44px] grid place-items-center rounded-lg hover:bg-gray-100 transition-all"
        aria-label={unreadCount > 0 ? L(`Notifications, ${unreadCount} unread`, `اطلاعات، ${unreadCount} نئی`, `الإشعارات، ${unreadCount} غير مقروءة`) : L('Notifications', 'اطلاعات', 'الإشعارات')}>
        <span className="text-lg"><Glyph e="🔔" /></span>
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4A543] text-[#071827] text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden" dir={dir} role="dialog" aria-label={L('Notifications', 'اطلاعات', 'الإشعارات')}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('Notifications', 'اطلاعات', 'الإشعارات')}</span>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs font-semibold text-[#8F6820] hover:underline min-h-[36px]">{L('Mark all as read', 'سب کو پڑھا ہوا کریں', 'تعليم الكل كمقروء')}</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{L('No notifications', 'کوئی اطلاع نہیں', 'لا توجد إشعارات')}</div>
            ) : notifications.map((n: any) => (
              <button key={n.id}
                onClick={() => { markAsRead(n.id); const url = n.data?.url; setOpen(false); if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) router.push(url) }}
                className={`w-full text-start px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all ${n.is_read ? '' : 'bg-[#D4A543]/10'}`}>
                <div className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="w-8 h-8 shrink-0 rounded-full grid place-items-center bg-[#0B2438]/5 text-[#0B2438]"><Glyph e={notifGlyph(n.type)} /></span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm text-gray-800 ${n.is_read ? 'font-semibold' : 'font-bold'}`}><AutoTr text={noEmoji(n.title)} locale={locale} /></div>
                    {n.body && <div className="text-xs text-gray-500 mt-0.5"><AutoTr text={noEmoji(n.body)} locale={locale} /></div>}
                    <div className="text-xs text-gray-500 mt-1">{timeAgo(n.created_at, locale)}</div>
                  </div>
                  {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-[#D4A543] mt-1.5 flex-shrink-0" aria-label={L('Unread', 'نئی', 'غير مقروء')} />}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => { setOpen(false); router.push('/notifications') }}
            className="w-full text-center text-sm font-bold text-[#8F6820] min-h-[44px] border-t border-gray-100 hover:bg-gray-50">
            {L('See all notifications', 'تمام اطلاعات دیکھیں', 'عرض كل الإشعارات')} <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
          </button>
        </div>
      )}
    </div>
  )
}
