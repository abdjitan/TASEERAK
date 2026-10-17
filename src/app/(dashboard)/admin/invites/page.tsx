'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'

// Supplier invitations on WhatsApp (migrations 165-166, edge function whatsapp-invite-bot).
// The owner sends invitations by hand; the bot answers every reply. Read only: nobody replies from
// here. The month's AI cost is shown against the $5 cap the bot enforces.

type Chat = { phone: string; shop_name: string | null; lang: string; stage: string; invited_at: string; last_inbound_at: string | null }
type Msg = { id: number; phone: string; role: string; text: string; created_at: string; ai_input_tokens: number | null; ai_output_tokens: number | null }

// Claude Haiku 5.5, USD per million tokens; same numbers as marketing/supplier-invite/bot/ai.mjs.
const PRICE = { input: 0.10, output: 0.50 }
const CAP_USD = 5

const STAGES: Record<string, string> = { invited: 'مدعوّ', interested: 'مهتم', declined: 'غير مهتم', paused: 'أوقفتَ الرد الآلي' }
const LANGS: Record<string, string> = { ar: 'العربية', en: 'English', ur: 'اردو' }
const ROLES: Record<string, string> = { shop: 'المحل', bot: 'الرد الآلي', owner: 'أنت' }

export default function AdminInvitesPage() {
  const [loading, setLoading] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const [monthCost, setMonthCost] = useState(0)
  const [aiReplies, setAiReplies] = useState(0)
  const [stage, setStage] = useState<string>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [thread, setThread] = useState<Msg[]>([])

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/'; return }
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const [{ data: cs }, { data: ai }] = await Promise.all([
        sb.from('invite_chats').select('phone, shop_name, lang, stage, invited_at, last_inbound_at').order('updated_at', { ascending: false }).limit(1000),
        sb.from('invite_messages').select('ai_input_tokens, ai_output_tokens').not('ai_input_tokens', 'is', null).gte('created_at', monthStart.toISOString()).limit(20000),
      ])
      setChats((cs as Chat[]) || [])
      const rows: any[] = ai || []
      setAiReplies(rows.length)
      setMonthCost(rows.reduce((s, r) => s + ((r.ai_input_tokens || 0) * PRICE.input + (r.ai_output_tokens || 0) * PRICE.output) / 1e6, 0))
      setLoading(false)
    })()
  }, [])

  async function openChat(phone: string) {
    if (open === phone) { setOpen(null); return }
    setOpen(phone); setThread([])
    const { data } = await createClient().from('invite_messages').select('id, phone, role, text, created_at, ai_input_tokens, ai_output_tokens').eq('phone', phone).order('created_at', { ascending: true }).limit(200)
    setThread((data as Msg[]) || [])
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: chats.length, invited: 0, interested: 0, declined: 0, paused: 0 }
    for (const x of chats) c[x.stage] = (c[x.stage] || 0) + 1
    return c
  }, [chats])
  const shown = stage === 'all' ? chats : chats.filter(c => c.stage === stage)
  const replied = chats.filter(c => c.last_inbound_at).length

  if (loading) return <PageLoader />

  return (
    <AppShell title="دعوات الموردين" nav={getNav('admin', 'ar', '/admin/invites')} dir="rtl">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h1 className="text-xl font-extrabold text-navy">دعوات الموردين على واتساب</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            ترسل الدعوة بنفسك من تطبيق واتساب للأعمال، ويتولى الرد الآلي كل الردود بعدها. إذا كتبت أنت في محادثة يتوقف الرد الآلي فيها.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
            {[
              ['محادثات مدعوّة', counts.all], ['ردّت', replied], ['مهتمة', counts.interested || 0],
              [`تكلفة الذكاء الاصطناعي هذا الشهر (من ${CAP_USD}$)`, `$${monthCost.toFixed(2)}`],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-gray-50 p-3"><div className="text-2xl font-extrabold text-navy" dir="ltr">{v as string | number}</div><div className="text-[11px] text-gray-500">{l as string}</div></div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{aiReplies} ردًّا ذكيًّا هذا الشهر. عند بلوغ الحد يرد الآلي بالنصوص الثابتة حتى بداية الشهر التالي.</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'invited', 'interested', 'declined', 'paused'] as const).map(k => (
              <button key={k} type="button" onClick={() => setStage(k)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${stage === k ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'}`}
                style={stage === k ? { background: '#0B2438' } : undefined}>
                {k === 'all' ? 'الكل' : STAGES[k]} ({counts[k] || 0})
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد محادثات بعد. تظهر هنا بعد أن ترسل أول دعوة من رقم واتساب الأعمال المربوط.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {shown.map(c => (
                <li key={c.phone} className="py-3">
                  <button type="button" onClick={() => openChat(c.phone)} className="w-full flex flex-wrap items-center gap-3 text-start">
                    <span className="font-bold text-navy">{c.shop_name || 'محل بلا اسم'}</span>
                    <span className="text-xs text-gray-400" dir="ltr">+{c.phone}</span>
                    <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{STAGES[c.stage] || c.stage}</span>
                    <span className="text-xs text-gray-400">{LANGS[c.lang] || c.lang}</span>
                    <span className="text-xs text-gray-400 ms-auto">{c.last_inbound_at ? `آخر رد: ${new Date(c.last_inbound_at).toLocaleString('ar-SA')}` : 'لم يرد بعد'}</span>
                  </button>
                  {open === c.phone && (
                    <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
                      {thread.length === 0 ? <p className="text-xs text-gray-400">لا رسائل.</p> : thread.map(m => (
                        <div key={m.id} className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'shop' ? 'bg-white border border-gray-200' : 'bg-[#0B2438] text-white'}`}>
                          <div className="text-[10px] opacity-60 mb-1">{ROLES[m.role] || m.role} · {new Date(m.created_at).toLocaleString('ar-SA')}{m.ai_input_tokens != null ? ' · ذكاء اصطناعي' : ''}</div>
                          {m.text || '(وسائط بلا نص)'}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
