'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'
import { rfqDisplayName } from '@/lib/rfqName'

function fmtTime(d: any, locale: string = 'ar') {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const dt = new Date(d); const mins = Math.floor((Date.now() - dt.getTime()) / 60000)
  if (mins < 1) return L('now', 'ابھی', 'الآن'); if (mins < 60) return L(`${mins}m ago`, `${mins} منٹ پہلے`, `قبل ${mins} د`)
  const h = Math.floor(mins / 60); if (h < 24) return L(`${h}h ago`, `${h} گھنٹے پہلے`, `قبل ${h} س`)
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`
}

function Messages() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const sp = useSearchParams()
  const [me, setMe] = useState<any>(null)
  const [role, setRole] = useState('contractor')
  const [convos, setConvos] = useState<any[]>([])
  const [activeId, setActiveId] = useState(sp.get('c') || '')
  const [msgs, setMsgs] = useState<any[]>([])
  const [body, setBody] = useState(sp.get('msg')?.slice(0, 500) || '') // ?msg= pre-fills a question (e.g. «ask the buyer» on a request)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [awarded, setAwarded] = useState(true) // افتراضياً نسمح؛ نتحقق عند فتح المحادثة
  const endRef = useRef<any>(null)

  const PREAWARD_MAX = 20
  // الرسائل الفاشلة لا تُحتسب ضمن الحد (لم تُرسَل فعلاً)
  const remaining = PREAWARD_MAX - msgs.filter((m: any) => m._status !== 'failed').length
  const blocked = !awarded && remaining <= 0

  async function loadConvos() {
    const supabase = createClient()
    const { data } = await supabase
      .from('conversations')
      .select('*, contractor:profiles_public!contractor_id(company_name_ar), supplier:profiles_public!supplier_id(company_name_ar), rfq:rfqs(product_name, title, ref_no, items)')
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
          setMsgs(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            // استبدل الرسالة المتفائلة المؤقتة بنفس المحتوى بالصف الحقيقي (منع التكرار)
            if (payload.new.sender_id === me) {
              const i = prev.findIndex((m: any) => typeof m.id === 'string' && m.id.startsWith('temp-') && m.body === payload.new.body && m._status !== 'failed')
              if (i !== -1) { const c = [...prev]; c[i] = payload.new; return c }
            }
            return [...prev, payload.new]
          })
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
    setBody('')
    await deliver(text)
  }

  // إرسال متفائل: تظهر الرسالة فوراً (⏳ pending)، ثم تُثبَّت عند النجاح، أو تصير (⚠ failed)
  // مع زر إعادة إرسال — بلا فقدان للنص ولا نافذة alert.
  async function deliver(text: string, tempId?: string) {
    const id = tempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const convoId = activeId
    setMsgs(prev => tempId
      ? prev.map((m: any) => m.id === id ? { ...m, _status: 'pending' } : m)
      : [...prev, { id, conversation_id: convoId, sender_id: me, body: text, created_at: new Date().toISOString(), _status: 'pending' }])
    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('send_message', { p_conversation_id: convoId, p_body: text })
    setSending(false)
    if (error) {
      setMsgs(prev => prev.map((m: any) => m.id === id ? { ...m, _status: 'failed' } : m))
      return
    }
    setMsgs(prev => prev.map((m: any) => m.id === id ? { ...m, _status: 'sent' } : m))
    loadConvos()
  }

  function retry(m: any) { deliver(m.body, m.id) }

  const active = convos.find((c: any) => c.id === activeId)
  // The contractor's name is masked (profiles_public) for suppliers, so say "مشترٍ" rather than a blank.
  const counterpart = (c: any) => c?.contractor_id === me ? (c?.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد')) : (c?.contractor?.company_name_ar || L('Buyer', 'خریدار', 'مشترٍ'))
  const ctx = (c: any) => (c?.rfq ? rfqDisplayName(c.rfq, locale) : '')

  const backHref = role === 'supplier' ? '/supplier/dashboard' : role === 'admin' ? '/admin' : '/contractor'

  if (loading) return <PageLoader />

  return (
    <AppShell title={L('Messages', 'پیغامات', 'الرسائل')} nav={getNav(role, locale, '/messages')} dir={dir}>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-4 h-[calc(100vh-130px)]">
        {/* قائمة المحادثات */}
        <aside className={`lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto ${activeId ? 'hidden lg:block' : ''}`}>
          <div className="p-4 border-b border-gray-100 font-bold text-sm flex items-center gap-2" style={{ color: '#0B2438' }}>
            <Link href={backHref} title={L('Back', 'واپس', 'رجوع')} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">{dir === 'rtl' ? '→' : '←'}</Link>
            <span>💬 {L('Conversations', 'گفتگو', 'المحادثات')} ({convos.length})</span>
          </div>
          {convos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">{L('No conversations yet', 'ابھی کوئی گفتگو نہیں', 'لا توجد محادثات بعد')}</div>
          ) : convos.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-start px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeId === c.id ? 'bg-[#D4A543]/5' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{counterpart(c)}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{fmtTime(c.last_message_at, locale)}</span>
              </div>
              {ctx(c) && <div className="text-[11px] text-[#9D7425] truncate">📦 {ctx(c)}</div>}
              {c.last_message && <div className="text-xs text-gray-500 truncate mt-0.5">{c.last_message}</div>}
            </button>
          ))}
        </aside>

        {/* المحادثة */}
        <section className={`lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col ${activeId ? '' : 'hidden lg:flex'}`}>
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-gray-400">{L('Select a conversation', 'کوئی گفتگو منتخب کریں', 'اختر محادثة')}</div>
          ) : (
            <>
              <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                <button onClick={() => setActiveId('')} className="lg:hidden w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100">{dir === 'rtl' ? '→' : '←'}</button>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{counterpart(active)}</div>
                  {ctx(active) && <div className="text-[11px] text-gray-400 truncate">📦 {ctx(active)}</div>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: '#f7f8fa' }}>
                {msgs.map(m => {
                  const mine = m.sender_id === me
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'text-white' : 'bg-white border border-gray-100 text-gray-800'}`} style={mine ? { background: m._status === 'failed' ? '#b91c1c' : '#0F6E56' } : {}}>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`text-[9px] mt-1 ${mine ? 'text-white/80' : 'text-gray-400'}`}>
                          {m._status === 'pending' ? `⏳ ${L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…')}`
                            : m._status === 'failed'
                              ? <button type="button" onClick={() => retry(m)} className="underline font-semibold text-white">⚠ {L('Failed to send — retry', 'نہیں بھیجا جا سکا — دوبارہ کوشش کریں', 'فشل الإرسال — إعادة المحاولة')} ↻</button>
                              : <>{fmtTime(m.created_at, locale)}{mine ? ' ✓' : ''}</>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
              {!awarded && (
                <div className={`px-3 pt-2 text-[10px] ${blocked ? 'text-red-500' : 'text-gray-400'}`}>
                  {blocked
                    ? `🔒 ${L('You have reached the message limit before award. Full contact opens once the deal is done.', 'ایوارڈ سے پہلے پیغامات کی حد پوری ہو گئی۔ ڈیل مکمل ہونے کے بعد مکمل رابطہ کھل جائے گا۔', 'بلغت الحد الأقصى للرسائل قبل الترسية. يكتمل التواصل بعد إتمام الصفقة.')}`
                    : L(`Messaging before award is limited — ${remaining} messages left`, `ایوارڈ سے پہلے پیغامات محدود ہیں — ${remaining} پیغامات باقی`, `التواصل قبل الترسية محدود — متبقٍّ ${remaining} رسالة`)}
                </div>
              )}
              <form onSubmit={send} className="p-3 border-t border-gray-100 flex gap-2">
                <input value={body} onChange={e => setBody(e.target.value)} disabled={blocked} className="input-field flex-1 text-sm disabled:bg-gray-50" placeholder={blocked ? L('Limit reached before award', 'ایوارڈ سے پہلے کی حد پوری ہو گئی', 'انتهى الحد المسموح قبل الترسية') : L('Type a message…', 'پیغام لکھیں…', 'اكتب رسالة…')} />
                <button type="submit" disabled={sending || blocked || !body.trim()} className="px-5 rounded-xl font-bold text-[#071827] text-sm disabled:opacity-50" style={{ background: '#D4A543' }}>
                  {L('Send', 'بھیجیں', 'إرسال')}
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
