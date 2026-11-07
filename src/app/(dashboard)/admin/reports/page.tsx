'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'

// User reports from conversations (migration 201, Google Play UGC policy). The admin marks each
// report «actioned» (handled, e.g. the account was suspended from /admin/users) or «dismissed».

const REASONS: Record<string, string> = { spam: 'رسائل مزعجة', abuse: 'إساءة أو تحرش', fraud: 'احتيال', inappropriate: 'محتوى غير لائق', other: 'أخرى' }
const STATUS: Record<string, string> = { open: 'جديد', actioned: 'تمت المعالجة', dismissed: 'مرفوض' }

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('open')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const sb = createClient()
    const { data, error } = await sb.from('user_reports').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) { setErr('تعذّر تحميل البلاغات.'); return }
    const list: any[] = data || []
    setRows(list)
    const ids = Array.from(new Set(list.flatMap((r: any) => [r.reporter_id, r.reported_id])))
    if (ids.length) {
      const { data: ps } = await sb.from('profiles').select('id, company_name_ar, full_name').in('id', ids)
      const m: Record<string, string> = {}
      for (const p of (ps || []) as any[]) m[p.id] = p.company_name_ar || p.full_name || p.id.slice(0, 8)
      setNames(m)
    }
  }

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/'; return }
      await load()
      setLoading(false)
    })()
  }, [])

  async function review(id: string, status: string) {
    setBusy(id); setErr('')
    const sb = createClient()
    const { error } = await sb.rpc('admin_review_report', { p_id: id, p_status: status, p_note: notes[id] || null })
    setBusy('')
    if (error) { setErr('تعذّر الحفظ، حاول مرة أخرى.'); return }
    await load()
  }

  if (loading) return <PageLoader />
  const shown = rows.filter((r: any) => filter === 'all' || r.status === filter)
  const count = (s: string) => rows.filter((r: any) => r.status === s).length

  return (
    <AppShell title="البلاغات" nav={getNav('admin', 'ar', '/admin/reports')} dir="rtl">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h1 className="text-xl font-extrabold text-navy">بلاغات المستخدمين</h1>
          <p className="text-sm text-gray-500 mt-1">بلاغات أرسلها المستخدمون من المحادثات. راجع كل بلاغ ثم علّمه «تمت المعالجة» أو «مرفوض». لإيقاف حساب استخدم صفحة المستخدمين.</p>
          <div className="flex gap-2 mt-3 flex-wrap text-xs">
            {['open', 'actioned', 'dismissed', 'all'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg border ${filter === s ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'border-gray-200 text-gray-600'}`}>
                {s === 'all' ? `الكل (${rows.length})` : `${STATUS[s]} (${count(s)})`}
              </button>
            ))}
          </div>
          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-sm text-gray-400">لا توجد بلاغات.</div>
        ) : shown.map((r: any) => (
          <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="font-bold text-navy">{REASONS[r.reason] || r.reason}</div>
              <span className={`text-[11px] px-2 py-0.5 rounded-lg ${r.status === 'open' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{STATUS[r.status]}</span>
            </div>
            <div className="text-gray-600">
              المُبلِّغ: <b>{names[r.reporter_id] || '—'}</b> · المُبلَّغ عنه: <b>{names[r.reported_id] || '—'}</b>
              <span className="text-gray-400"> · {new Date(r.created_at).toLocaleString('ar-SA')}</span>
            </div>
            {r.message_body && <div className="bg-gray-50 rounded-xl p-3 text-gray-700 whitespace-pre-wrap break-words">«{r.message_body}»</div>}
            {r.details && <div className="text-gray-700">تفاصيل: {r.details}</div>}
            {r.admin_note && <div className="text-xs text-gray-500">ملاحظة الإدارة: {r.admin_note}</div>}
            <div className="flex flex-wrap gap-2 items-center pt-1">
              <input value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="ملاحظة (اختياري)" className="input-field text-xs flex-1 min-w-[160px]" />
              {r.status !== 'actioned' && <button disabled={busy === r.id} onClick={() => review(r.id, 'actioned')} className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: '#0F6E56' }}>تمت المعالجة</button>}
              {r.status !== 'dismissed' && <button disabled={busy === r.id} onClick={() => review(r.id, 'dismissed')} className="px-3 py-2 rounded-xl text-xs border border-gray-200 text-gray-600 disabled:opacity-50">رفض</button>}
              {r.status !== 'open' && <button disabled={busy === r.id} onClick={() => review(r.id, 'open')} className="px-3 py-2 rounded-xl text-xs border border-gray-200 text-gray-600 disabled:opacity-50">إعادة فتح</button>}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
