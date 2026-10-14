'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'
import Glyph from '@/components/shared/Glyph'

// What the search learned from people (migration 142). Pairs reach "approved" by themselves once
// 3 different people searched the same word and chose the same product; the rest wait here.
// The last searches that found nothing show which words or materials are still missing.

type Learned = { id: number; term_norm: string; product_name: string; users: number; hits: number; status: string; source: string; updated_at: string }

export default function AdminLearningPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Learned[]>([])
  const [misses, setMisses] = useState<any[]>([])
  const [stats, setStats] = useState({ events: 0, week: 0 })
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const sb = createClient()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const [{ data: ls }, { data: ms }, { count: all }, { count: week }] = await Promise.all([
      sb.from('learned_synonyms').select('id, term_norm, product_name, users, hits, status, source, updated_at').order('users', { ascending: false }).order('hits', { ascending: false }).limit(2000),
      sb.from('search_events').select('query, created_at, source').eq('action', 'no_result').order('created_at', { ascending: false }).limit(60),
      sb.from('search_events').select('id', { count: 'exact', head: true }),
      sb.from('search_events').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    ])
    setRows(ls || [])
    setMisses(ms || [])
    setStats({ events: all || 0, week: week || 0 })
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

  async function review(id: number, status: string) {
    const { error } = await createClient().rpc('review_learned_synonym', { p_id: id, p_status: status })
    if (error) { setMsg('تعذّر الحفظ: ' + error.message); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  async function refresh() {
    setBusy(true); setMsg('')
    const { data, error } = await createClient().rpc('refresh_learned_synonyms')
    setBusy(false)
    if (error) { setMsg('تعذّر التحديث: ' + error.message); return }
    setMsg(`تم تحديث ${data ?? 0} كلمة من عمليات البحث.`)
    await load()
  }

  const counts = useMemo(() => ({
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
    fromPeople: rows.filter(r => r.source !== 'seed').length,
  }), [rows])
  const shown = rows.filter(r => r.status === tab && (!q.trim() || r.term_norm.includes(q.trim()) || r.product_name.includes(q.trim())))

  if (loading) return <PageLoader />

  return (
    <AppShell title="تعلّم البحث" nav={getNav('admin', 'ar', '/admin/learning')} dir="rtl">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h1 className="text-xl font-extrabold text-navy"><Glyph e="🧠" /> ما تعلّمه البحث من المستخدمين</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            كل بحث ينتهي باختيار مادة يُسجَّل. عندما يبحث 3 أشخاص مختلفين بالكلمة نفسها ويختارون المادة نفسها، تُعتمد الكلمة تلقائياً فتظهر تلك المادة أولاً للجميع. يمكنك اعتماد الكلمات المعلّقة أو رفضها هنا.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
            {[
              ['عمليات بحث مسجّلة', stats.events], ['هذا الأسبوع', stats.week],
              ['كلمات معتمدة', counts.approved], ['تعلّمها من الناس', counts.fromPeople],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-gray-50 p-3"><div className="text-2xl font-extrabold text-navy">{v as number}</div><div className="text-[11px] text-gray-500">{l as string}</div></div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button type="button" onClick={refresh} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
              {busy ? 'جارٍ التحديث…' : '↻ تعلّم من عمليات البحث الآن'}
            </button>
            <span className="text-xs text-gray-400">يعمل تلقائياً كل يوم الساعة 2:30 فجراً.</span>
            {msg && <span className="text-xs font-bold text-[#0F6E56]">{msg}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['pending', 'approved', 'rejected'] as const).map(k => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${tab === k ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'}`}
                style={tab === k ? { background: '#0B2438' } : undefined}>
                {k === 'pending' ? `بانتظار المراجعة (${counts.pending})` : k === 'approved' ? `معتمدة (${counts.approved})` : `مرفوضة (${counts.rejected})`}
              </button>
            ))}
            <input value={q} onChange={e => setQ(e.target.value)} className="input-field max-w-xs ms-auto" placeholder="ابحث في الكلمات أو المواد…" />
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{tab === 'pending' ? 'لا توجد كلمات بانتظار المراجعة. ستظهر هنا عندما يبحث الناس بكلمات جديدة.' : 'لا شيء هنا.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-start py-2 px-2">ما كتبه الناس</th><th className="text-start py-2 px-2">المادة التي اختاروها</th>
                  <th className="py-2 px-2">أشخاص</th><th className="py-2 px-2">مرات</th><th className="py-2 px-2">المصدر</th><th className="py-2 px-2"></th>
                </tr></thead>
                <tbody>
                  {shown.slice(0, 400).map(r => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="py-2 px-2 font-bold text-navy" dir="auto">{r.term_norm}</td>
                      <td className="py-2 px-2" dir="auto">{r.product_name}</td>
                      <td className="py-2 px-2 text-center">{r.users}</td>
                      <td className="py-2 px-2 text-center">{r.hits}</td>
                      <td className="py-2 px-2 text-center text-[11px] text-gray-500">{r.source === 'seed' ? 'القاموس' : r.source === 'admin' ? 'الإدارة' : 'الناس'}</td>
                      <td className="py-2 px-2 text-end whitespace-nowrap">
                        {r.status !== 'approved' && <button type="button" onClick={() => review(r.id, 'approved')} className="text-xs font-bold px-2.5 py-1 rounded-lg text-white me-1" style={{ background: '#0F6E56' }}>اعتماد</button>}
                        {r.status !== 'rejected' && <button type="button" onClick={() => review(r.id, 'rejected')} className="text-xs font-bold px-2.5 py-1 rounded-lg border border-red-200 text-red-600">رفض</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-navy"><Glyph e="🔎" /> عمليات بحث لم تجد شيئاً</h2>
          <p className="text-xs text-gray-500 mt-1">كلمات أو مواد ما زالت ناقصة: أضفها إلى القائمة أو إلى قاموس البحث.</p>
          {misses.length === 0 ? <p className="text-sm text-gray-400 mt-3">لا شيء بعد.</p> : (
            <div className="flex flex-wrap gap-2 mt-3">
              {misses.map((m, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100" dir="auto" title={new Date(m.created_at).toLocaleString('ar-SA')}>{m.query}</span>)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
