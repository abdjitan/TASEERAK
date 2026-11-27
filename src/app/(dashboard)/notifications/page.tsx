'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { timeAgo, dayBucket, dayBucketLabel, dateLocale, type DayBucket } from '@/lib/text'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { getNav } from '@/lib/nav'
import Glyph from '@/components/shared/Glyph'
import { notifGlyph, safeNotifUrl, NOTIFS_READ_EVENT, NotifField } from '@/components/shared/NotificationBell'
import { realtimeTopic } from '@/lib/realtimeTopic'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { askConfirm, notify } from '@/lib/askConfirm'
import { Trash2 } from 'lucide-react'

// صفحة الإشعارات الكاملة — كانت متاحة فقط عبر قائمة الجرس المنسدلة.
// Grouped «اليوم / أمس / سابقاً», a relative time and a line icon per kind (UX-176).
export default function NotificationsPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const router = useRouter()
  const [role, setRole] = useState('contractor')
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [uid, setUid] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadFailed(false)
    let shown = false
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUid(session.user.id)
      const ck = 'notifs_' + session.user.id // last list at once (page cache), refreshed below
      const snap = readPageCache(ck)
      if (snap) { setRole(snap.role); setNotifs(snap.list || []); setLoading(false); shown = true } else setLoading(true)
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setRole(p?.role || 'contractor')
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      setNotifs(data || [])
      writePageCache(ck, { role: p?.role || 'contractor', list: data || [] })
      const { error: readErr } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false)
      // the bell's badge clears as well (UX-056)
      if (!readErr) window.dispatchEvent(new Event(NOTIFS_READ_EVENT))
    } catch (e) {
      console.error('[notifications] load failed:', e)
      if (!shown) setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  // new notifications appear here at once (per-user filtered subscription, UX-056); they stay
  // highlighted as unread on screen and are marked read in the database, like the rest of the page
  useEffect(() => {
    if (!uid) return
    const supabase = createClient()
    const channel = supabase
      .channel(realtimeTopic(`notifs-page-${uid}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, (payload: any) => {
        const n = payload.new
        if (!n?.id) return
        setNotifs(prev => (prev.some(x => x.id === n.id) ? prev : [n, ...prev]))
        supabase.from('notifications').update({ is_read: true }).eq('id', n.id).then(({ error }) => {
          if (!error) window.dispatchEvent(new Event(NOTIFS_READ_EVENT))
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [uid])

  // delete one notice or all of them, as in the app (round-6 UX-124; RLS «Users delete own notifications»)
  // one tap hides it at once with «تراجع» for 5 seconds; the row is deleted only after that (round-8 UX-133)
  const [undo, setUndo] = useState<{ n: any; index: number } | null>(null)
  const undoTimer = useRef<any>(null)
  const pendingDel = useRef<string | null>(null)
  async function commitDelete(id: string) {
    pendingDel.current = null
    const { error } = await createClient().from('notifications').delete().eq('id', id)
    if (error) { notify(L('Could not delete the notification. Try again.', 'اطلاع حذف نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر حذف الإشعار. حاول مرة أخرى.'), { tone: 'error' }); load(); return }
    if (uid) setNotifs(list => { writePageCache('notifs_' + uid, { role, list }); return list })
  }
  function removeOne(id: string) {
    // a previous delete still waiting is done now
    if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null }
    if (pendingDel.current) commitDelete(pendingDel.current)
    const index = notifs.findIndex(x => x.id === id)
    if (index < 0) return
    setUndo({ n: notifs[index], index })
    setNotifs(list => list.filter(x => x.id !== id))
    pendingDel.current = id
    undoTimer.current = setTimeout(() => { undoTimer.current = null; setUndo(null); commitDelete(id) }, 5000)
  }
  function undoRemove() {
    if (!undo) return
    if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null }
    pendingDel.current = null
    const { n, index } = undo
    setNotifs(list => { const next = list.slice(); next.splice(Math.min(index, next.length), 0, n); return next })
    setUndo(null)
  }
  // leaving the page within the 5 seconds still deletes it
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); if (pendingDel.current) createClient().from('notifications').delete().eq('id', pendingDel.current).then(() => {}, () => {}) }, [])
  async function removeAll() {
    if (!uid) return
    if (!(await askConfirm(L('Delete all notifications? This cannot be undone.', 'تمام اطلاعات حذف کریں؟ یہ واپس نہیں ہو سکتا۔', 'حذف كل الإشعارات؟ لا يمكن التراجع عن ذلك.'), { danger: true, okLabel: L('Delete all', 'سب حذف کریں', 'حذف الكل') }))) return
    const prev = notifs
    setNotifs([])
    const { error } = await createClient().from('notifications').delete().eq('user_id', uid)
    if (error) { setNotifs(prev); notify(L('Could not delete the notifications. Try again.', 'اطلاعات حذف نہیں ہو سکیں۔ دوبارہ کوشش کریں۔', 'تعذّر حذف الإشعارات. حاول مرة أخرى.'), { tone: 'error' }); return }
    writePageCache('notifs_' + uid, { role, list: [] })
  }

  if (loading) return <PageLoader />

  const go = (n: any) => {
    const url = safeNotifUrl(n.data?.url)
    if (url) router.push(url)
  }

  const groups: { b: DayBucket; list: any[] }[] = []
  for (const n of notifs) {
    const b = dayBucket(n.created_at)
    const g = groups.find(x => x.b === b)
    if (g) g.list.push(n); else groups.push({ b, list: [n] })
  }
  const homeHref = role === 'supplier' ? '/supplier/dashboard' : role === 'admin' ? '/admin' : '/contractor/rfqs'

  return (
    <AppShell title={L('Notifications', 'اطلاعات', 'الإشعارات')} nav={getNav(role, locale, '/notifications')} dir={dir}>
      <div className="max-w-2xl mx-auto">
        {loadFailed ? (
          <LoadError onRetry={load} />
        ) : notifs.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3 text-[#0B2438]"><Glyph e="🔔" /></div>
            <p className="text-gray-600">{role === 'supplier'
              // a supplier receives requests, not offers (UX-152)
              ? L('No notifications yet. New requests that match your specialties, messages and your deals will appear here.', 'ابھی کوئی اطلاع نہیں۔ آپ کے تخصصات کے مطابق نئی درخواستیں، پیغامات اور آپ کی ڈیلز کی اطلاع یہاں ملے گی۔', 'لا توجد إشعارات بعد. ستصلك هنا تنبيهات الطلبات الجديدة المطابقة لتخصصاتك، والرسائل، وصفقاتك.')
              : L('No notifications yet. We will notify you here about new offers, messages and your deals.', 'ابھی کوئی اطلاع نہیں۔ نئی آفرز، پیغامات اور آپ کی ڈیلز کی اطلاع یہاں ملے گی۔', 'لا توجد إشعارات بعد. ستصلك هنا تنبيهات العروض الجديدة والرسائل وصفقاتك.')}</p>
            <Link href={homeHref} className="inline-flex items-center justify-center mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>
              {role === 'supplier' ? L('New requests', 'نئی درخواستیں', 'الطلبات الجديدة') : role === 'admin' ? L('Admin', 'ایڈمن', 'لوحة الإدارة') : L('My requests', 'میری درخواستیں', 'طلباتي')}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <button type="button" onClick={removeAll} className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-[#B42318] hover:bg-red-50">
                <Trash2 className="w-4 h-4" aria-hidden />{L('Delete all', 'سب حذف کریں', 'حذف الكل')}
              </button>
            </div>
            {groups.map(g => (
              <section key={g.b}>
                <h2 className="text-xs font-bold text-gray-500 mb-2 px-1">{dayBucketLabel(g.b, locale)}</h2>
                <div className="space-y-2">
                  {g.list.map((n: any) => {
                    const linked = !!safeNotifUrl(n.data?.url)
                    const cls = `block w-full text-start rounded-2xl p-4 min-h-[56px] border transition-colors ${linked ? 'hover:border-[#D4A543]/40 cursor-pointer' : ''} ${n.is_read ? 'bg-white border-gray-100' : 'bg-[#D4A543]/5 border-[#D4A543]/30'}`
                    const inner = (
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-[#0B2438]/5 text-[#0B2438]"><Glyph e={notifGlyph(n.type, n.data, n.title)} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm" style={{ color: '#0B2438' }}><NotifField n={n} field="title" locale={locale} /></div>
                          {n.body && <div className="text-sm text-gray-600 mt-0.5"><NotifField n={n} field="body" locale={locale} /></div>}
                          <div className="text-xs text-gray-500 mt-1" title={new Date(n.created_at).toLocaleString(dateLocale(locale), { timeZone: 'Asia/Riyadh' })}>
                            {g.b === 'earlier' ? new Date(n.created_at).toLocaleDateString(dateLocale(locale), { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'long' }) : timeAgo(n.created_at, locale)}
                          </div>
                        </div>
                        {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-[#D4A543] mt-1.5 shrink-0" role="img" aria-label={L('Unread', 'نئی', 'غير مقروء')} />}
                      </div>
                    )
                    // a notice without a link is plain text, not a button that does nothing (UX-133)
                    return (
                      <div key={n.id} className="relative">
                        {linked
                          ? <button type="button" onClick={() => go(n)} className={cls + ' pe-14'}>{inner}</button>
                          : <div className={cls + ' pe-14'}>{inner}</div>}
                        <button type="button" onClick={() => removeOne(n.id)} aria-label={L('Delete notification', 'اطلاع حذف کریں', 'حذف الإشعار')}
                          className="absolute top-2 end-2 w-11 h-11 grid place-items-center rounded-xl text-gray-500 hover:text-[#B42318] hover:bg-red-50">
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
        {undo && (
          <div role="status" className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] inset-x-4 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 rtl:sm:translate-x-1/2 z-50 flex items-center justify-between gap-4 rounded-2xl bg-[#071827] text-white px-4 py-2 shadow-xl max-w-md">
            <span className="text-sm">{L('Notification deleted', 'اطلاع حذف ہو گئی', 'حُذف الإشعار')}</span>
            <button type="button" onClick={undoRemove} className="min-h-[44px] px-3 rounded-xl text-sm font-bold text-[#F5C55B] hover:bg-white/10">{L('Undo', 'واپس لیں', 'تراجع')}</button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
