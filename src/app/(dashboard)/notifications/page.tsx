'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'

// صفحة الإشعارات الكاملة — كانت متاحة فقط عبر قائمة الجرس المنسدلة.
export default function NotificationsPage() {
  const { locale, dir } = useTranslation()
  const router = useRouter()
  const [role, setRole] = useState('contractor')
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setRole(p?.role || 'contractor')
      const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(200)
      setNotifs(data || [])
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const go = (n: any) => {
    const url = n.data?.url
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) router.push(url)
  }

  return (
    <AppShell title={locale === 'en' ? 'Notifications' : 'الإشعارات'} nav={getNav(role, locale, '/notifications')} dir={dir}>
      <div className="max-w-2xl mx-auto">
        {notifs.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-gray-500">{locale === 'en' ? 'No notifications yet.' : 'لا إشعارات بعد.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((n: any) => (
              <button key={n.id} onClick={() => go(n)}
                className={`w-full text-start rounded-2xl p-4 border transition-colors ${n.data?.url ? 'hover:border-[#F5831F]/40 cursor-pointer' : 'cursor-default'} ${n.is_read ? 'bg-white border-gray-100' : 'bg-[#F5831F]/5 border-[#F5831F]/30'}`}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#F5831F] mt-1.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{n.title}</div>
                    {n.body && <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('ar-SA-u-ca-gregory')}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
