'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'

function fmtTime(d: any) {
  const dt = new Date(d); const mins = Math.floor((Date.now() - dt.getTime()) / 60000)
  if (mins < 1) return 'الآن'; if (mins < 60) return `قبل ${mins} د`
  const h = Math.floor(mins / 60); if (h < 24) return `قبل ${h} س`
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`
}

function Messages() {
  const { locale, dir } = useTranslation()
  const sp = useSearchParams()
  const [me, setMe] = useState<any>(null)
  const [role, setRole] = useState('contractor')
  const [convos, setConvos] = useState<any[]>([])
  const [activeId, setActiveId] = useState(sp.get('c') || '')
  const [msgs, setMsgs] = useState<any[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [awarded, setAwarded] = useState(true) // افتراضياً نسمح؛ نتحقق عند فتح المحادثة
  const endRef = useRef<any>(null)

  const PREAWARD_MAX = 20
  const remaining = PREAWARD_MAX - msgs.length
  const blocked = !awarded && remaining <= 0

  async function loadConvos() {
    const supabase = createClient()
    const { data } = await supabase
      .from('conversations')
      .select('*, contractor:profiles_public!contractor_id(company_name_ar), supplier:profiles_public!supplier_id(company_name_ar), rfq:rfqs(product_name, title)')
      .order('last_message_at', { ascending: false })
    setConvos(data || [])
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMe(session.user.id)
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setRole(p?.role || 'contractor')
      await loadConvos()
      setLoading(false)
    })()
  }, [])

  // افتح المحادثة المختارة + علّم رسائلها مقروءة + استمع للجديد
  useEffect(() => {
    if (!activeId || !me) return
    const supabase = createClient()
    let cancelled = false
    let ch: any
    ;(async () => {
      // Fetch the conversation directly — do NOT read the possibly-stale `convos` closure,
      // which made an awarded chat wrongly show the "20-message limit" lock (B9).
      const { data: conv } = await supabase.from('conversations').select('rfq_id, supplier_id').eq('id', activeId).single()
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', activeId).order('created_at')
      if (cancelled) return // guard against out-of-order resolution → no cross-conversation bleed
      setMsgs(data || [])
      let aw = false
      if (conv?.rfq_id && conv?.supplier_id) {
        const { data: aws } = await supabase.from('rfq_item_awards').select('id').eq('rfq_id', conv.rfq_id).eq('supplier_id', conv.supplier_id).limit(1)
        if (aws && aws.length) aw = true
        else {
          const { data: ofs } = await supabase.from('offers').select('id').eq('rfq_id', conv.rfq_id).eq('supplier_id', conv.supplier_id).eq('status', 'accepted').limit(1)
          if (ofs && ofs.length) aw = true
        }
      }
      if (cancelled) return
      setAwarded(aw)
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', activeId).neq('sender_id', me).is('read_at', null)
      if (cancelled) return // don't open a channel for a conversation we already switched away from
      ch = supabase.channel(`conv-${activeId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` }, (payload) => {
          setMsgs(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
          if (payload.new.sender_id !== me) supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', payload.new.id)
        })
        .subscribe()
    })()
    return () => { cancelled = true; if (ch) supabase.removeChannel(ch) }
  }, [activeId, me])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send(e: any) {
    e?.preventDefault()
    const text = body.trim(); if (!text || !activeId) return
    setSending(true); setBody('')
    const supabase = createClient()
    const { error } = await supabase.rpc('send_message', { p_conversation_id: activeId, p_body: text })
    setSending(false)
    if (error) { setBody(text); alert((error as any)?.message || 'تعذّر إرسال الرسالة — حاول مرة ثانية.'); return }
    loadConvos()
  }

  const active = convos.find((c: any) => c.id === activeId)
  const counterpart = (c: any) => (c?.contractor_id === me ? c?.supplier : c?.contractor)?.company_name_ar || 'مستخدم'
  const ctx = (c: any) => c?.rfq?.title || c?.rfq?.product_name || ''

  const backHref = role === 'supplier' ? '/supplier/dashboard' : role === 'admin' ? '/admin' : '/contractor'

  if (loading) return <PageLoader />

  return (
    <AppShell title={locale === 'en' ? 'Messages' : 'الرسائل'} nav={getNav(role, locale, '/messages')} dir={dir}>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-4 h-[calc(100vh-130px)]">
        {/* قائمة المحادثات */}
        <aside className={`lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto ${activeId ? 'hidden lg:block' : ''}`}>
          <div className="p-4 border-b border-gray-100 font-bold text-sm flex items-center gap-2" style={{ color: '#1B2D5B' }}>
            <Link href={backHref} title={locale === 'en' ? 'Back' : 'رجوع'} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">{dir === 'rtl' ? '→' : '←'}</Link>
            <span>💬 {locale === 'en' ? 'Conversations' : 'المحادثات'} ({convos.length})</span>
          </div>
          {convos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">{locale === 'en' ? 'No conversations yet' : 'لا توجد محادثات بعد'}</div>
          ) : convos.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-start px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeId === c.id ? 'bg-[#F5831F]/5' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{counterpart(c)}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{fmtTime(c.last_message_at)}</span>
              </div>
              {ctx(c) && <div className="text-[11px] text-[#d96f15] truncate">📦 {ctx(c)}</div>}
              {c.last_message && <div className="text-xs text-gray-500 truncate mt-0.5">{c.last_message}</div>}
            </button>
          ))}
        </aside>

        {/* المحادثة */}
        <section className={`lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col ${activeId ? '' : 'hidden lg:flex'}`}>
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-gray-400">{locale === 'en' ? 'Select a conversation' : 'اختر محادثة'}</div>
          ) : (
            <>
              <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                <button onClick={() => setActiveId('')} className="lg:hidden w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100">{dir === 'rtl' ? '→' : '←'}</button>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{counterpart(active)}</div>
                  {ctx(active) && <div className="text-[11px] text-gray-400 truncate">📦 {ctx(active)}</div>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: '#f7f8fa' }}>
                {msgs.map(m => {
                  const mine = m.sender_id === me
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'text-white' : 'bg-white border border-gray-100 text-gray-800'}`} style={mine ? { background: '#0F6E56' } : {}}>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`text-[9px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
              {!awarded && (
                <div className={`px-3 pt-2 text-[10px] ${blocked ? 'text-red-500' : 'text-gray-400'}`}>
                  {blocked
                    ? '🔒 بلغت الحد الأقصى للرسائل قبل الترسية. يكتمل التواصل بعد إتمام الصفقة.'
                    : `التواصل قبل الترسية محدود — متبقٍّ ${remaining} رسالة`}
                </div>
              )}
              <form onSubmit={send} className="p-3 border-t border-gray-100 flex gap-2">
                <input value={body} onChange={e => setBody(e.target.value)} disabled={blocked} className="input-field flex-1 text-sm disabled:bg-gray-50" placeholder={blocked ? 'انتهى الحد المسموح قبل الترسية' : (locale === 'en' ? 'Type a message…' : 'اكتب رسالة…')} />
                <button type="submit" disabled={sending || blocked || !body.trim()} className="px-5 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: '#F5831F' }}>
                  {locale === 'en' ? 'Send' : 'إرسال'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}

export default function MessagesPage() {
  return <Suspense fallback={<PageLoader />}><Messages /></Suspense>
}
