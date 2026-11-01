'use client'
// Owner dashboard: send an in-app announcement to everyone / buyers / suppliers (admin_broadcast,
// migration 187). Notifications only — never emailed.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Glyph from '@/components/shared/Glyph'
import { fmt } from '@/components/admin/OverviewCharts'

const AUDIENCES = [
  { key: 'all', label: 'الجميع' },
  { key: 'buyers', label: 'المشترون' },
  { key: 'suppliers', label: 'الموردون' },
] as const

export default function BroadcastForm({ counts }: { counts: { all: any; buyers: any; suppliers: any } }) {
  const [audience, setAudience] = useState<'all' | 'buyers' | 'suppliers'>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function send() {
    setMsg(null)
    const t = title.trim()
    const u = url.trim()
    if (t.length < 3) { setMsg({ ok: false, text: 'اكتب عنواناً للإعلان (3 أحرف على الأقل).' }); return }
    if (u && (!u.startsWith('/') || u.startsWith('//'))) { setMsg({ ok: false, text: 'الرابط يجب أن يكون مساراً داخل الموقع يبدأ بـ / مثل /settings' }); return }
    const label = AUDIENCES.find((a) => a.key === audience)?.label
    if (!window.confirm(`سيصل الإعلان إلى ${label} (نحو ${fmt(counts[audience])} مستخدم) كإشعار داخل المنصة.\n\n«${t}»\n\nهل تريد الإرسال؟`)) return
    setBusy(true)
    const { data, error } = await createClient().rpc('admin_broadcast', { p_audience: audience, p_title: t, p_body: body.trim(), p_url: u || null })
    setBusy(false)
    if (error) { setMsg({ ok: false, text: 'تعذّر الإرسال: ' + error.message }); return }
    setMsg({ ok: true, text: `أُرسل إلى ${fmt(data)} مستخدم.` })
    setTitle(''); setBody(''); setUrl('')
  }

  const input = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A543]/40'
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="الجمهور">
        {AUDIENCES.map((a) => (
          <button key={a.key} type="button" role="radio" aria-checked={audience === a.key} onClick={() => setAudience(a.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${audience === a.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
            style={audience === a.key ? { background: '#0B2438' } : {}}>
            {a.label} <span className="tabular-nums opacity-70">({fmt(counts[a.key])})</span>
          </button>
        ))}
      </div>
      <input className={input} placeholder="عنوان الإعلان" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={input} rows={3} placeholder="نص الإعلان (اختياري)" maxLength={600} value={body} onChange={(e) => setBody(e.target.value)} />
      <input className={input} dir="ltr" placeholder="/contractor/rfq/quick" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="رابط داخلي (اختياري)" />
      <p className="text-[11px] text-gray-400">الرابط اختياري: مسار داخل الموقع يُفتح عند الضغط على الإشعار.</p>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={send} disabled={busy}
          className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: '#D4A543', color: '#0B2438' }}>
          <Glyph e="🔔" /> {busy ? 'جارٍ الإرسال…' : 'إرسال الإعلان'}
        </button>
        {msg && <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  )
}
