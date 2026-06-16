'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'
import { SECTOR_LABELS } from '@/types'

type Row = {
  sector: string
  sub_key: string
  name_ar: string | null
  grp: string | null
  keywords: string[]
  is_active: boolean
}

export default function AdminTaxonomyPage() {
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({}) // `${sector}|${sub_key}` → نص الكلمات
  const [savingKey, setSavingKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/'; return }
      setOk(true)
      await load(supabase)
      setLoading(false)
    })()
  }, [])

  async function load(supabase?: any) {
    const c = supabase || createClient()
    const { data } = await c.from('taxonomy').select('sector, sub_key, name_ar, grp, keywords, is_active')
      .order('sector').order('grp').order('sub_key')
    const list: Row[] = (data || []).map((r: any) => ({
      sector: r.sector, sub_key: r.sub_key, name_ar: r.name_ar, grp: r.grp,
      keywords: Array.isArray(r.keywords) ? r.keywords : [], is_active: r.is_active !== false,
    }))
    setRows(list)
    const e: Record<string, string> = {}
    for (const r of list) e[`${r.sector}|${r.sub_key}`] = r.keywords.join('، ')
    setEdits(e)
  }

  async function save(r: Row) {
    const key = `${r.sector}|${r.sub_key}`
    const raw = edits[key] ?? ''
    // نقبل الفواصل العربية والإنجليزية وأسطر جديدة كفواصل
    const kws = raw.split(/[،,\n]/).map(s => s.trim()).filter(Boolean)
    setSavingKey(key); setSavedKey('')
    const supabase = createClient()
    const { error } = await supabase.from('taxonomy').update({ keywords: kws }).eq('sector', r.sector).eq('sub_key', r.sub_key)
    setSavingKey('')
    if (error) { alert('تعذّر الحفظ: ' + error.message); return }
    setRows(prev => prev.map(x => (x.sector === r.sector && x.sub_key === r.sub_key) ? { ...x, keywords: kws } : x))
    setSavedKey(key)
    setTimeout(() => setSavedKey(k => k === key ? '' : k), 2500)
  }

  if (loading || !ok) return <PageLoader />

  const sectors = Array.from(new Set(rows.map(r => r.sector)))
  const filtered = rows.filter(r => {
    if (sectorFilter !== 'all' && r.sector !== sectorFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (r.name_ar || '').toLowerCase().includes(q)
      || r.sub_key.toLowerCase().includes(q)
      || (edits[`${r.sector}|${r.sub_key}`] || '').toLowerCase().includes(q)
  })
  // تجميع حسب القطاع
  const bySector: Record<string, Row[]> = {}
  for (const r of filtered) (bySector[r.sector] = bySector[r.sector] || []).push(r)

  return (
    <AppShell title="شجرة التصنيفات" nav={getNav('admin', 'ar', '/admin/taxonomy')} dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>🗂️ شجرة التصنيفات والكلمات المفتاحية</h1>
          <p className="text-sm text-gray-500 mt-1">
            عدّل كلمات كل تخصّص — تُستخدم لتوجيه بنود الـBOQ للمورد الصحيح. التعديل <strong>يسري فوراً</strong> على التصنيف الخادمي دون نشر (خلال 5 دقائق كحدّ أقصى للكاش).
          </p>
        </div>

        {/* فلترة */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSectorFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 ${sectorFilter === 'all' ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              style={sectorFilter === 'all' ? { background: '#1B2D5B' } : {}}>الكل</button>
            {sectors.map(s => (
              <button key={s} onClick={() => setSectorFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 ${sectorFilter === s ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                style={sectorFilter === s ? { background: '#1B2D5B' } : {}}>
                {(SECTOR_LABELS as any)[s] || s}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field sm:max-w-xs text-sm" placeholder="🔍 ابحث في الأسماء أو الكلمات..." />
        </div>

        <div className="space-y-5">
          {Object.entries(bySector).map(([sector, list]) => (
            <div key={sector}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#1B2D5B' }}>
                <span className="badge badge-blue text-[10px]">{(SECTOR_LABELS as any)[sector] || sector}</span>
                <span className="text-gray-400 font-normal">({list.length} تخصّص)</span>
              </h2>
              <div className="space-y-2">
                {list.map(r => {
                  const key = `${r.sector}|${r.sub_key}`
                  return (
                    <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <span className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{r.name_ar || r.sub_key}</span>
                          <span className="text-[11px] text-gray-400 mr-2">· {r.sub_key}{r.grp ? ` · ${r.grp}` : ''}</span>
                        </div>
                        <button onClick={() => save(r)} disabled={savingKey === key}
                          className="text-xs font-bold text-white px-4 py-1.5 rounded-lg disabled:opacity-50 shrink-0"
                          style={{ background: savedKey === key ? '#0F6E56' : '#1B2D5B' }}>
                          {savingKey === key ? '...' : savedKey === key ? '✓ حُفظ' : 'حفظ'}
                        </button>
                      </div>
                      <textarea
                        value={edits[key] ?? ''}
                        onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={2}
                        className="input-field text-sm leading-relaxed"
                        placeholder="كلمات مفتاحية مفصولة بفواصل (مثال: حديد تسليح، rebar، سابك)" />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
