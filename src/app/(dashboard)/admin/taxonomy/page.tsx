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
  const [edits, setEdits] = useState<Record<string, string>>({})      // كلمات
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({}) // اسم عربي
  const [savingKey, setSavingKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')

  // إضافة تخصص جديد
  const [showAdd, setShowAdd] = useState(false)
  const [naSector, setNaSector] = useState('civil')
  const [naKey, setNaKey] = useState('')
  const [naName, setNaName] = useState('')
  const [naGroup, setNaGroup] = useState('')
  const [naKw, setNaKw] = useState('')
  const [naMsg, setNaMsg] = useState('')
  const [naBusy, setNaBusy] = useState(false)

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
    const ne: Record<string, string> = {}
    for (const r of list) {
      const k = `${r.sector}|${r.sub_key}`
      e[k] = r.keywords.join('، ')
      ne[k] = r.name_ar || ''
    }
    setEdits(e); setNameEdits(ne)
  }

  function parseKw(raw: string): string[] {
    return (raw || '').split(/[،,\n]/).map(s => s.trim()).filter(Boolean)
  }

  async function save(r: Row) {
    const key = `${r.sector}|${r.sub_key}`
    const kws = parseKw(edits[key] ?? '')
    const nm = (nameEdits[key] ?? r.name_ar ?? '').trim() || null
    setSavingKey(key); setSavedKey('')
    const supabase = createClient()
    const { error } = await supabase.from('taxonomy').update({ keywords: kws, name_ar: nm })
      .eq('sector', r.sector).eq('sub_key', r.sub_key)
    setSavingKey('')
    if (error) { alert('تعذّر الحفظ: ' + error.message); return }
    setRows(prev => prev.map(x => (x.sector === r.sector && x.sub_key === r.sub_key) ? { ...x, keywords: kws, name_ar: nm } : x))
    setSavedKey(key)
    setTimeout(() => setSavedKey(k => k === key ? '' : k), 2500)
  }

  async function addNew() {
    const key = naKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!key || !naName.trim()) { setNaMsg('املأ المفتاح والاسم'); return }
    if (rows.some(r => r.sector === naSector && r.sub_key === key)) { setNaMsg('هذا المفتاح موجود مسبقاً في القطاع'); return }
    setNaBusy(true); setNaMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('taxonomy').insert({
      sector: naSector, sub_key: key, name_ar: naName.trim(),
      grp: naGroup.trim() || '_other', keywords: parseKw(naKw), is_active: true,
    })
    setNaBusy(false)
    if (error) { setNaMsg('تعذّرت الإضافة: ' + error.message); return }
    setNaKey(''); setNaName(''); setNaGroup(''); setNaKw(''); setShowAdd(false)
    await load()
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
  const bySector: Record<string, Row[]> = {}
  for (const r of filtered) (bySector[r.sector] = bySector[r.sector] || []).push(r)

  return (
    <AppShell title="شجرة التصنيفات" nav={getNav('admin', 'ar', '/admin/taxonomy')} dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>🗂️ شجرة التصنيفات والكلمات المفتاحية</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              عدّل الاسم والكلمات لكل تخصّص أو أضِف تخصصاً جديداً. الكلمات توجّه بنود الـBOQ للمورد الصحيح، والاسم يظهر في القوائم. التعديل <strong>يسري دون نشر</strong> (الواجهات تتحدّث عند أول تنقّل/تحديث، والتصنيف الخادمي خلال 5 دقائق).
            </p>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="text-sm font-bold text-white px-4 py-2 rounded-xl shrink-0" style={{ background: '#0F6E56' }}>
            {showAdd ? '✕ إغلاق' : '➕ إضافة تخصص'}
          </button>
        </div>

        {/* إضافة تخصص جديد */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 mb-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: '#0F6E56' }}>➕ تخصص جديد</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">القطاع</label>
                <select value={naSector} onChange={e => setNaSector(e.target.value)} className="input-field text-sm">
                  {Object.keys(SECTOR_LABELS).map(s => <option key={s} value={s}>{(SECTOR_LABELS as any)[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">المفتاح (إنجليزي، بدون مسافات)</label>
                <input value={naKey} onChange={e => setNaKey(e.target.value)} className="input-field text-sm" placeholder="مثال: polyurea_insulation" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">الاسم بالعربية</label>
                <input value={naName} onChange={e => setNaName(e.target.value)} className="input-field text-sm" placeholder="مثال: عزل بولي يوريا" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">المجموعة (اختياري)</label>
                <input value={naGroup} onChange={e => setNaGroup(e.target.value)} className="input-field text-sm" placeholder="مفتاح المجموعة أو اتركه فارغاً" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-500 mb-1">الكلمات المفتاحية (مفصولة بفواصل)</label>
                <textarea value={naKw} onChange={e => setNaKw(e.target.value)} rows={2} className="input-field text-sm" placeholder="بولي يوريا، polyurea، عزل رش" />
              </div>
            </div>
            {naMsg && <div className="text-xs text-amber-600 mt-2">{naMsg}</div>}
            <button onClick={addNew} disabled={naBusy} className="mt-3 text-sm font-bold text-white px-5 py-2 rounded-xl disabled:opacity-50" style={{ background: '#0F6E56' }}>
              {naBusy ? '...' : 'إضافة'}
            </button>
          </div>
        )}

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
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            value={nameEdits[key] ?? ''}
                            onChange={e => setNameEdits(prev => ({ ...prev, [key]: e.target.value }))}
                            className="input-field text-sm font-bold py-1.5 max-w-[260px]" style={{ color: '#1B2D5B' }} />
                          <span className="text-[11px] text-gray-400 shrink-0">{r.sub_key}{r.grp ? ` · ${r.grp}` : ''}</span>
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
