'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, SendHorizontal } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/i18n'

// مساعد تسعيرك الذكي — زر عائم + نافذة محادثة تظهر في كل صفحات لوحة التحكم.
// UX-006: the bubble must never sit on a page's fixed action bar (send request / send offer / save):
// a page with such a bar sets document.body.dataset.actionbar = '1' and the bubble hides while it is
// there. It sits under dialogs and sheets (z-45), uses the navy + gold identity, and never prints.
export default function AiAssistant() {
  const { locale, dir } = useTranslation()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionBar, setActionBar] = useState(false)
  const endRef = useRef<any>(null)
  const isSupplier = (usePathname() || '').startsWith('/supplier')
  // hidden while the assistant is switched off on the server (UX-113)
  const [enabled, setEnabled] = useState(true)
  useEffect(() => { fetch('/api/assistant').then(r => r.json()).then((d: any) => { if (d && d.enabled === false) setEnabled(false) }).catch(() => {}) }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading, open])

  // follow body[data-actionbar] (set by pages with a sticky/fixed action bar)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const read = () => setActionBar(!!document.body.dataset.actionbar)
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-actionbar'] })
    return () => mo.disconnect()
  }, [])

  // Escape closes the chat
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const T = locale === 'en'
    ? { title: 'Taseerak Assistant', ph: 'Ask me anything…', hi: isSupplier ? 'Hello! How can I help you price requests today?' : 'Hello! How can I help with your purchases today?', send: 'Send', close: 'Close' }
    : locale === 'ur'
    ? { title: 'تسعیرک اسسٹنٹ', ph: 'کچھ پوچھیں…', hi: isSupplier ? 'سلام! آج درخواستوں کی قیمت لگانے میں کیسے مدد کروں؟' : 'سلام! آج آپ کی خریداری میں کیسے مدد کروں؟', send: 'بھیجیں', close: 'بند کریں' }
    : { title: 'مساعد تسعيرك', ph: 'اسألني أي شيء…', hi: isSupplier ? 'أهلاً! كيف يمكنني مساعدتك في تسعير الطلبات اليوم؟' : 'أهلاً! كيف يمكنني مساعدتك في مشترياتك اليوم؟', send: 'إرسال', close: 'إغلاق' }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, locale }),
      })
      const d: any = await res.json().catch(() => ({}))
      // never a bare «…» bubble: a failure says so (UX-113)
      const failMsg = locale === 'en' ? 'The assistant cannot be reached right now. Please try again shortly.' : locale === 'ur' ? 'اسسٹنٹ سے ابھی رابطہ نہیں ہو سکا، تھوڑی دیر بعد کوشش کریں۔' : 'تعذّر الوصول إلى المساعد حالياً، حاول بعد قليل.'
      const content = typeof d.reply === 'string' && d.reply.trim() ? d.reply : (res.status === 429 && locale === 'en' && typeof d.error_en === 'string' ? d.error_en : res.status === 429 && locale === 'ar' && typeof d.error === 'string' ? d.error : failMsg)
      setMsgs([...next, { role: 'assistant', content }])
      if (d.disabled) setEnabled(false)
    } catch {
      setMsgs([...next, { role: 'assistant', content: locale === 'en' ? 'Could not connect. Please try again.' : locale === 'ur' ? 'رابطہ نہیں ہو سکا، دوبارہ کوشش کریں۔' : 'تعذّر الاتصال، حاول مرة أخرى.' }])
    } finally { setLoading(false) }
  }

  const sideStyle = dir === 'rtl' ? { left: 20 } : { right: 20 }
  // hidden while a page action bar is on screen (unless the chat is already open)
  if ((actionBar || !enabled) && !open) return null

  return (
    <div className="print:hidden">
      {/* الزر العائم */}
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? T.close : T.title} aria-expanded={open}
        className="fixed z-[45] w-14 h-14 rounded-full grid place-items-center text-[#F5C55B] shadow-xl hover:scale-105 transition-transform bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-5 ring-2 ring-[#D4A543]/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4A543]"
        style={{ ...sideStyle, background: '#0B2438' }}>
        {open ? <X className="w-6 h-6" aria-hidden /> : <Sparkles className="w-6 h-6" aria-hidden />}
      </button>

      {/* نافذة المحادثة */}
      {open && (
        <div dir={dir} role="dialog" aria-label={T.title} className="fixed z-[45] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bottom-[calc(150px+env(safe-area-inset-bottom))] lg:bottom-[86px]"
          style={{ ...sideStyle, width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 210px))' }}>
          {/* رأس */}
          <div className="px-4 py-2 text-white flex items-center gap-2 border-b-2 border-[#D4A543]" style={{ background: '#0B2438' }}>
            <Sparkles className="w-5 h-5 text-[#F5C55B]" aria-hidden />
            <span className="font-bold text-sm flex-1">{T.title}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={T.close} className="w-[44px] h-[44px] -me-2 grid place-items-center rounded-lg text-white/80 hover:text-white">
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>

          {/* الرسائل */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50" aria-live="polite">
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm bg-white border border-gray-100 text-gray-700 shadow-sm">{T.hi}</div>
            </div>
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line shadow-sm ${m.role === 'user' ? 'text-white' : 'bg-white border border-gray-100 text-gray-700'}`}
                  style={m.role === 'user' ? { background: '#0B2438' } : {}}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-white border border-gray-100 shadow-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* الإدخال */}
          <div className="p-2.5 border-t border-gray-100 flex items-end gap-2">
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={T.ph} aria-label={T.ph}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-[16px] sm:text-sm focus:outline-none focus:border-[#0B2438] focus:ring-2 focus:ring-[#D4A543]/40 max-h-28" />
            <button type="button" onClick={send} disabled={loading || !input.trim()}
              className="shrink-0 w-[44px] h-[44px] rounded-xl grid place-items-center text-[#071827] disabled:opacity-50"
              style={{ background: '#D4A543' }} aria-label={T.send}>
              <SendHorizontal className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
