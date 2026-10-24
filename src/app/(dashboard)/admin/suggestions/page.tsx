'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { formatDateTime } from '@/lib/deadline'
import { SUGGESTION_KINDS, SUGGESTION_STATUS } from '@/lib/suggestions'
import { fileHref } from '@/lib/fileHref'

// Admin: users' suggestions (migration 169). Setting a status notifies the author; the note is
// shown to them as «فريق تسعيرك: …».
export default function AdminSuggestionsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [names, setNames] = useState<Record<string, any>>({})
  const [filter, setFilter] = useState<string>('new')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  // «مواد خارج الكتالوج»: hand-written request lines a buyer chose an offer for (migration 174)
  const [tab, setTab] = useState<'suggestions' | 'gaps'>('suggestions')
  const [gaps, setGaps] = useState<any[]>([])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (me?.role !== 'admin') { window.location.href = '/'; return }
    try { if (new URLSearchParams(window.location.search).get('tab') === 'gaps') setTab('gaps') } catch {}
    const { data: g } = await supabase.from('catalog_gaps').select('*, rfq:rfqs(ref_no)').order('created_at', { ascending: false }).limit(300)
    setGaps(g || [])
    const { data } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false }).limit(300)
    const list = data || []
    setRows(list)
    const ids = [...new Set(list.map((r: any) => r.user_id))]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, full_name, company_name_ar, role').in('id', ids)
      const m: Record<string, any> = {}; for (const p of ps || []) m[p.id] = p; setNames(m)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function setStatus(r: any, status: string) {
    setBusy(r.id); setErr('')
    const supabase = createClient()
    const note = (notes[r.id] ?? r.admin_note ?? '').trim() || null
    const { error } = await supabase.from('suggestions').update({ status, admin_note: note }).eq('id', r.id)
    setBusy('')
    if (error) { setErr('تعذّر الحفظ — حاول مرة ثانية.'); return }
    setRows(prev => prev.map(x => x.id === r.id ? { ...x, status, admin_note: note } : x))
  }

  async function setGap(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase.from('catalog_gaps').update({ status }).eq('id', id)
    if (error) { setErr('تعذّر الحفظ — حاول مرة ثانية.'); return }
    setGaps(prev => prev.map(x => x.id === id ? { ...x, status } : x))
  }

  if (loading) return <PageLoader />
  const counts: Record<string, number> = {}; for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1
  const shown = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  return (
    <AppShell title="اقتراحات المستخدمين" nav={getNav('admin', 'ar', '/admin/suggestions')} dir="rtl">
      <div className="max-w-3xl mx-auto space-y-4">
        <div role="tablist" className="inline-flex p-1 rounded-xl bg-gray-100">
          {([['suggestions', 'اقتراحات المستخدمين'], ['gaps', `مواد خارج الكتالوج (${gaps.filter(g => g.status === 'new').length})`]] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === k ? 'bg-white shadow-sm text-[#0B2438]' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>
        {tab === 'gaps' ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">مواد كتبها المشترون بأنفسهم (ليست في الكتالوج) واختاروا لها عرضاً — أضف المناسب منها إلى الكتالوج.</p>
            {gaps.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-6 text-center">لا توجد مواد بعد.</p>}
            {gaps.map(g => (
              <div key={g.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#0B2438]">{g.product_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{g.sector || '—'} · {g.sub_category || 'بلا تخصص'} · {g.quantity ?? '—'} {g.unit || ''} · {g.rfq?.ref_no ? 'RFQ-' + g.rfq.ref_no : ''} · {formatDateTime(g.created_at)}</div>
                  {g.photo_url && <a href={fileHref(g.photo_url)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#9D7425] hover:underline">صورة المادة ←</a>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {g.status === 'new' ? (<>
                    <button type="button" onClick={() => setGap(g.id, 'added')} className="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: '#0F6E56' }}>أُضيفت للكتالوج</button>
                    <button type="button" onClick={() => setGap(g.id, 'ignored')} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600">تجاهل</button>
                  </>) : <span className="text-xs font-bold text-gray-500">{g.status === 'added' ? 'أُضيفت' : 'متجاهلة'}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (<>
        <div className="flex flex-wrap gap-2">
          {[['new', 'جديدة'], ['planned', 'قيد التنفيذ'], ['done', 'تمّت'], ['declined', 'لن تُنفّذ'], ['all', 'الكل']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border ${filter === k ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-gray-600 border-gray-200'}`}>
              {l} ({k === 'all' ? rows.length : counts[k] || 0})
            </button>
          ))}
        </div>
        {err && <p role="alert" className="text-sm text-red-600 font-semibold">{err}</p>}
        {shown.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-6 text-center">لا توجد اقتراحات في هذه القائمة.</p>}
        {shown.map(r => {
          const p = names[r.user_id]
          const k = SUGGESTION_KINDS.find(x => x.k === r.kind) || SUGGESTION_KINDS[3]
          const st = SUGGESTION_STATUS[r.status] || SUGGESTION_STATUS.new
          return (
            <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <span className="font-bold text-gray-600">{k.ar} · {p ? (p.company_name_ar || p.full_name || '—') : '—'} ({p?.role === 'supplier' ? 'مورد' : 'مشترٍ'}) · {formatDateTime(r.created_at)}</span>
                <span className="font-bold px-2 py-0.5 rounded-full" style={{ color: st.tone, background: st.tone + '14' }}>{st.ar}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-line">{r.body}</p>
              <textarea value={notes[r.id] ?? r.admin_note ?? ''} onChange={(e: any) => setNotes(n => ({ ...n, [r.id]: e.target.value }))} rows={2} maxLength={1000}
                className="input-field text-sm" placeholder="رد يظهر لصاحب الاقتراح (اختياري)" />
              <div className="flex flex-wrap gap-2">
                {[['planned', 'قيد التنفيذ'], ['done', 'تمّ التنفيذ'], ['declined', 'لن يُنفّذ']].map(([s, l]) => (
                  <button key={s} type="button" disabled={busy === r.id || r.status === s} onClick={() => setStatus(r, s)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:border-[#0B2438] disabled:opacity-40">{l}</button>
                ))}
              </div>
            </div>
          )
        })}
        </>)}
      </div>
    </AppShell>
  )
}
