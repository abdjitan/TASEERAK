// @ts-nocheck
'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/i18n'

// مساعد تسعيرك الذكي — زر عائم + نافذة محادثة تظهر في كل صفحات لوحة التحكم.
export default function AiAssistant() {
  const { locale, dir } = useTranslation()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([]) // {role:'user'|'assistant', content}
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading, open])

  const T = locale === 'en'
    ? { title: 'Taseerak Assistant', ph: 'Ask me anything…', hi: 'Hi! How can I help with your procurement today?', send: 'Send' }
    : locale === 'ur'
    ? { title: 'تسعیرک اسسٹنٹ', ph: 'کچھ پوچھیں…', hi: 'سلام! آج آپ کی خریداری میں کیسے مدد کروں؟', send: 'بھیجیں' }
    : { title: 'مساعد تسعيرك', ph: 'اسألني أي شيء…', hi: 'أهلاً! كيف أقدر أساعدك في مشترياتك اليوم؟', send: 'إرسال' }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const d = await res.json()
      setMsgs([...next, { role: 'assistant', content: d.reply || '…' }])
    } catch {
      setMsgs([...next, { role: 'assistant', content: 'تعذّر الاتصال، حاول مجدداً.' }])
    } finally { setLoading(false) }
  }

  const sideStyle = dir === 'rtl' ? { left: 20 } : { right: 20 }

  return (
    <>
      {/* الزر العائم */}
      <button onClick={() => setOpen(o => !o)} aria-label={T.title}
        className="fixed z-[60] w-14 h-14 rounded-full grid place-items-center text-white shadow-xl hover:scale-105 transition-transform"
        style={{ bottom: 20, ...sideStyle, background: 'linear-gradient(135deg,#7C3AED,#1B2D5B)' }}>
        <span className="text-2xl">{open ? '✕' : '✨'}</span>
      </button>

      {/* نافذة المحادثة */}
      {open && (
        <div dir={dir} className="fixed z-[60] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{ bottom: 86, ...sideStyle, width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 130px))' }}>
          {/* رأس */}
          <div className="px-4 py-3 text-white flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#7C3AED,#1B2D5B)' }}>
            <span className="text-lg">✨</span>
            <span className="font-bold text-sm flex-1">{T.title}</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
          </div>

          {/* الرسائل */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm bg-white border border-gray-100 text-gray-700 shadow-sm">{T.hi}</div>
            </div>
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line shadow-sm ${m.role === 'user' ? 'text-white' : 'bg-white border border-gray-100 text-gray-700'}`}
                  style={m.role === 'user' ? { background: '#1B2D5B' } : {}}>{m.content}</div>
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
              placeholder={T.ph}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] max-h-28" />
            <button onClick={send} disabled={loading || !input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-white disabled:opacity-50"
              style={{ background: '#F5831F' }} aria-label={T.send}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
