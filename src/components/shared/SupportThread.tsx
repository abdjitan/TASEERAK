'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'

/**
 * Internal support chat for ONE user's thread.
 * - viewerRole='admin'  → used in the admin user-detail page (replies as الإدارة)
 * - viewerRole='user'   → used on /support (writes as المستخدم)
 * Reads/writes public.support_messages (RLS restricts users to their own thread).
 * UX-139: live replies (realtime filtered by user_id), a visible error when sending fails, a 3-line box.
 */
export default function SupportThread({ userId, viewerRole, initialText }: { userId: string; viewerRole: 'admin' | 'user'; initialText?: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState(initialText || '')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const endRef = useRef<any>(null)
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  async function load() {
    const c = createClient()
    const { data } = await c.from('support_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
    // Mark the OTHER side's messages as read.
    const incoming = (data || []).filter((m: any) =>
      viewerRole === 'admin' ? (m.sender === 'user' && !m.read_by_admin) : (m.sender === 'admin' && !m.read_by_user)
    )
    if (incoming.length) {
      const field = viewerRole === 'admin' ? 'read_by_admin' : 'read_by_user'
      await c.from('support_messages').update({ [field]: true }).in('id', incoming.map((m: any) => m.id))
    }
  }

  useEffect(() => {
    if (!userId) return
    load()
    // the other side's reply appears without a refresh (per-user filtered channel)
    const c = createClient()
    const ch = c.channel(`support:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${userId}` }, () => { load() })
      .subscribe()
    return () => { c.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e: any) {
    e?.preventDefault?.()
    const content = text.trim()
    if (!content) return
    setSending(true); setSendError('')
    const c = createClient()
    const { error } = await c.from('support_messages').insert({ user_id: userId, sender: viewerRole, content })
    if (error) setSendError(L('Could not send the message. Please try again.', 'پیغام نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔', 'تعذّر إرسال الرسالة، حاول مرة أخرى.'))
    else { setText(''); await load() }
    setSending(false)
  }

  return (
    <div className="flex flex-col" dir={dir}>
      <div className="space-y-2 max-h-80 overflow-y-auto p-1">
        {loading ? (
          <div className="text-sm text-gray-500 text-center py-6">{L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-6">
            {viewerRole === 'user'
              ? L('No messages yet. Write to us if you run into any problem and the support team will reply.', 'ابھی کوئی پیغام نہیں۔ کوئی مسئلہ ہو تو ہمیں لکھیں، انتظامیہ کی ٹیم جواب دے گی۔', 'لا توجد رسائل بعد. اكتب لنا إذا واجهت أي مشكلة وسيردّ فريق تسعيرك.')
              : L('No messages yet.', 'ابھی کوئی پیغام نہیں۔', 'لا توجد رسائل بعد.')}
          </div>
        ) : messages.map((m: any) => {
          const mine = m.sender === viewerRole
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'text-white rounded-ee-sm' : 'bg-gray-100 text-gray-800 rounded-es-sm'}`}
                style={mine ? { background: '#0B2438' } : {}}>
                <div className="text-[12px] opacity-75 mb-0.5">{mine ? L('You', 'آپ', 'أنت') : m.sender === 'admin' ? L('Taseerak team', 'تسعیرک ٹیم', 'فريق تسعيرك') : L('User', 'صارف', 'المستخدم')}</div>
                <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                <div className="text-[12px] opacity-70 mt-1 text-end"><span dir="ltr">{new Date(m.created_at).toLocaleString(locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 pt-3 border-t border-gray-100 space-y-2">
        <label htmlFor="support-msg" className="sr-only">{L('Message', 'پیغام', 'الرسالة')}</label>
        <textarea id="support-msg" value={text} onChange={e => setText(e.target.value)} rows={3}
          className="input-field w-full text-base sm:text-sm leading-relaxed" placeholder={L('Write your message…', 'اپنا پیغام لکھیں…', 'اكتب رسالتك…')} />
        {sendError && <p className="text-sm text-red-600" role="alert">{sendError}</p>}
        <button type="submit" disabled={sending || !text.trim()}
          className="w-full sm:w-auto min-h-11 px-6 rounded-xl font-bold text-[#071827] text-sm disabled:opacity-50 transition-all hover:shadow" style={{ background: '#D4A543' }}>
          {sending ? L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…') : L('Send', 'بھیجیں', 'إرسال')}
        </button>
      </form>
    </div>
  )
}
