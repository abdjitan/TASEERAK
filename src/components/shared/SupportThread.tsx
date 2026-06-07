// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Internal support chat for ONE user's thread.
 * - viewerRole='admin'  → used in the admin user-detail page (replies as الإدارة)
 * - viewerRole='user'   → used in the user's settings (writes as المستخدم)
 * Reads/writes public.support_messages (RLS restricts users to their own thread).
 */
export default function SupportThread({ userId, viewerRole }: { userId: string; viewerRole: 'admin' | 'user' }) {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef<any>(null)

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

  useEffect(() => { if (userId) load() }, [userId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e: any) {
    e?.preventDefault?.()
    const content = text.trim()
    if (!content) return
    setSending(true)
    const c = createClient()
    const { error } = await c.from('support_messages').insert({ user_id: userId, sender: viewerRole, content })
    if (!error) { setText(''); await load() }
    setSending(false)
  }

  return (
    <div className="flex flex-col" dir="rtl">
      <div className="space-y-2 max-h-80 overflow-y-auto p-1">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-6">جارٍ التحميل...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">
            {viewerRole === 'user' ? 'لا توجد رسائل — اكتب لنا إذا واجهت أي مشكلة وسيرد فريق الإدارة.' : 'لا توجد رسائل بعد.'}
          </div>
        ) : messages.map((m: any) => {
          const mine = m.sender === viewerRole
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
                style={mine ? { background: '#1B2D5B' } : {}}>
                <div className="text-[10px] opacity-60 mb-0.5">{m.sender === 'admin' ? '🛠 الإدارة' : '👤 المستخدم'}</div>
                <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                <div className="text-[9px] opacity-50 mt-1 text-left" dir="ltr">{new Date(m.created_at).toLocaleString('ar-SA')}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <input value={text} onChange={e => setText(e.target.value)} className="input-field flex-1" placeholder="اكتب رسالتك..." />
        <button type="submit" disabled={sending || !text.trim()}
          className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow" style={{ background: '#F5831F' }}>
          {sending ? '...' : 'إرسال'}
        </button>
      </form>
    </div>
  )
}
