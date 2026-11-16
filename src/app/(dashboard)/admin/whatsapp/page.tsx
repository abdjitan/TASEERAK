'use client'
// «واتساب الدعم» (owner 2026-11-16): messages people send to the Taseerak WhatsApp number
// (wa_inbound_messages / wa_inbound_contacts, admin-read RLS) and the admin's replies.
// Free-form replies are allowed only within 24 h of the customer's last message (Meta rule).
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DAY = 24 * 3600 * 1000

export default function AdminWhatsAppPage() {
  return <Suspense fallback={null}><Inbox /></Suspense>
}

function Inbox() {
  const supabase = createClient()
  const search = useSearchParams()
  const [contacts, setContacts] = useState<any[]>([])
  const [phone, setPhone] = useState<string>(search.get('phone') || '')
  const [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  async function loadContacts() {
    const { data } = await supabase.from('wa_inbound_contacts').select('*').order('last_message_at', { ascending: false }).limit(200)
    setContacts(data || [])
  }
  async function loadThread(p: string) {
    if (!p) return
    const { data } = await supabase.from('wa_inbound_messages').select('*').eq('phone', p).order('received_at', { ascending: true }).limit(500)
    setMsgs(data || [])
    setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 50)
  }
  useEffect(() => { loadContacts(); const t = setInterval(loadContacts, 30000); return () => clearInterval(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadThread(phone); const t = setInterval(() => loadThread(phone), 15000); return () => clearInterval(t) }, [phone]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastIn = [...msgs].reverse().find((m) => (m.direction || 'in') === 'in')
  const open = !!lastIn && Date.now() - new Date(lastIn.received_at).getTime() < DAY

  async function send() {
    if (!text.trim() || !phone) return
    setBusy(true); setErr('')
    const r = await fetch('/api/admin/wa-reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, text }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) {
      setErr(j?.error === 'window' ? 'انتهت مهلة الـ24 ساعة منذ آخر رسالة من العميل؛ لا يسمح واتساب بالرد الحر الآن. سيُفتح الرد عندما يراسلنا مجدداً.' : 'تعذّر الإرسال. حاول مرة أخرى.')
      return
    }
    setText(''); loadThread(phone); loadContacts()
  }

  const current = contacts.find((c) => c.phone === phone)
  return (
    <div dir="rtl" className="p-4 sm:p-6">
      <h1 className="text-2xl font-extrabold text-[#071827] mb-1">واتساب الدعم</h1>
      <p className="text-sm text-gray-500 mb-4">الرسائل الواصلة إلى رقم تسعيرك (+1 213 561 4366). يمكن الرد الحر خلال 24 ساعة من آخر رسالة للعميل.</p>
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-h-[70vh] overflow-y-auto">
          {contacts.length === 0 && <p className="p-4 text-sm text-gray-500">لا توجد رسائل بعد.</p>}
          {contacts.map((c) => (
            <button key={c.phone} onClick={() => setPhone(c.phone)}
              className={`w-full text-start px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${phone === c.phone ? 'bg-[#D4A543]/10' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-[#0B2438] truncate">{c.name || c.phone}</span>
                {c.unread > 0 && <span className="text-[10px] font-bold rounded-full bg-[#D4A543] text-[#071827] px-1.5">{c.unread}</span>}
              </div>
              <div className="text-[11px] text-gray-500" dir="ltr">+{c.phone}</div>
              {c.last_message_at && <div className="text-[10px] text-gray-400">{new Date(c.last_message_at).toLocaleString('ar-SA-u-ca-gregory-nu-latn')}</div>}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[60vh]">
          {!phone ? (
            <p className="p-6 text-sm text-gray-500">اختر محادثة.</p>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="font-bold text-[#0B2438]">{current?.name || '—'}</div>
                <a className="text-xs text-gray-500" dir="ltr" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">+{phone}</a>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[55vh]">
                {msgs.map((m) => {
                  const out = m.direction === 'out'
                  return (
                    <div key={m.id} className={`flex ${out ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${out ? 'bg-[#0B2438] text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {m.text || <span className="italic opacity-70">({m.type || 'مرفق'})</span>}
                        <div className={`text-[10px] mt-1 ${out ? 'text-white/60' : 'text-gray-400'}`}>{new Date(m.received_at).toLocaleString('ar-SA-u-ca-gregory-nu-latn')}{out ? ' · الإدارة' : ''}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
              <div className="border-t border-gray-100 p-3">
                {!open && <p className="text-xs text-amber-700 mb-2">انتهت مهلة الـ24 ساعة منذ آخر رسالة من العميل؛ لا يمكن الرد الحر حتى يراسلنا مجدداً.</p>}
                <div className="flex gap-2">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} disabled={!open || busy}
                    className="flex-1 input-field text-sm" placeholder={open ? 'اكتب ردّك…' : 'الرد مغلق'} />
                  <button onClick={send} disabled={!open || busy || !text.trim()} className="px-4 rounded-xl bg-[#D4A543] text-[#071827] font-bold disabled:opacity-50">
                    {busy ? '…' : 'إرسال'}
                  </button>
                </div>
                {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
