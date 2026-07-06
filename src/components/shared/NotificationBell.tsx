'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'

function timeAgo(d: any) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} د`
  const h = Math.floor(mins / 60)
  if (h < 24) return `قبل ${h} س`
  return `قبل ${Math.floor(h / 24)} يوم`
}

export default function NotificationBell({ userId }: { userId?: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const ref = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    function onClick(e: any) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-all" aria-label="الإشعارات">
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-sm" style={{ color: '#1B2D5B' }}>الإشعارات</span>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-[#d96f15] hover:underline">تعليم الكل كمقروء</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">لا توجد إشعارات</div>
            ) : notifications.map((n: any) => (
              <button key={n.id}
                onClick={() => { markAsRead(n.id); const url = n.data?.url; setOpen(false); if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) router.push(url) }}
                className={`w-full text-right px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all ${n.is_read ? '' : 'bg-[#F5831F]/10'}`}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-800">{n.title}</div>
                    {n.body && <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
