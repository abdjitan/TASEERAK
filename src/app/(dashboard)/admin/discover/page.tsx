'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { safeHttpUrl } from '@/lib/safeUrl'
import { SUPPLIER_PACKS } from '@/lib/supplierPacks'
import Glyph from '@/components/shared/Glyph'
import {
  DISCOVERY_CITIES, PACK_QUERIES, packLabel, packIcon, packSector, waLink, inviteText, INVITE_COOLDOWN_DAYS,
} from '@/lib/discovery'

const NAVY = '#0B2438', ORANGE = '#D4A543', GREEN = '#0F6E56'
const PAGE = 50
// Places Text Search with phone/website fields bills as "Enterprise" (~$35 per 1000 pages).
const USD_PER_PAGE = 0.035

type Tab = 'batches' | 'list' | 'stats' | 'import'

const STATUS_FILTERS: [string, string][] = [
  ['not_invited', 'لم يُدعَ'], ['invited', 'دُعي'], ['registered', 'سجّل'], ['opted_out', 'طلب الإيقاف'], ['all', 'الكل'],
]
const RELEVANCE_FILTERS: [string, string][] = [
  ['supplier', 'موردين'], ['review', 'بحاجة مراجعة'], ['contractor', 'مقاولين'], ['excluded', 'مستبعد'],
]

// Excel headers → import fields: old survey exports and scripts/discover-city.mjs output.
const IMPORT_HEADERS: Record<string, string> = {
  'اسم المحل': 'name', 'الاسم': 'name', 'النوع': 'type', 'نوع Google': 'type', 'الجوال': 'phone',
  'الموقع الإلكتروني': 'website', 'العنوان': 'address', 'التقييم': 'rating', 'عدد المراجعات': 'reviews', 'المراجعات': 'reviews',
  'المدينة': 'city', 'الصنف المبحوث': 'query', 'لقيناه بالبحث عن': 'query', 'رابط الخريطة': 'maps_url',
  'الحي': 'district', 'place_id': 'place_id', 'lat': 'lat', 'lng': 'lng',
}

export default function DiscoverSuppliersPage() {
  const supabase = createClient()
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('batches')
  const [city, setCity] = useState('الرياض')
  const [origin, setOrigin] = useState('')

  // batches
  const [runs, setRuns] = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [batchLog, setBatchLog] = useState<string[]>([])
  const [redo, setRedo] = useState(false)
  const stopRef = useRef(false)

  // list
  const [status, setStatus] = useState('not_invited')
  const [relevance, setRelevance] = useState('supplier')
  const [packF, setPackF] = useState('')
  const [districtF, setDistrictF] = useState('')
  const [mobileOnly, setMobileOnly] = useState(true)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [listBusy, setListBusy] = useState(false)
  const [rowMsg, setRowMsg] = useState<any>({})

  // stats + import
  const [stats, setStats] = useState<any>(null)
  const [importMsg, setImportMsg] = useState('')
  const [importBusy, setImportBusy] = useState(false)

  const cfg = DISCOVERY_CITIES[city]

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { window.location.href = '/'; return }
      setOrigin(window.location.origin)
      setReady(true)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRuns = useCallback(async () => {
    const all: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase.from('discovery_runs').select('zone,pack,query,pages,inserted,ran_at').eq('city', city).range(from, from + 999)
      all.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    setRuns(all)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

  const loadStats = useCallback(async () => {
    const { data } = await supabase.rpc('discovery_stats', { p_city: city })
    setStats(data || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

  function applyFilters(query: any) {
    query = query.eq('city', city)
    query = query.eq('relevance', relevance)
    if (status === 'not_invited') query = query.eq('invited', false).is('claimed_by', null).eq('opted_out', false)
    if (status === 'invited') query = query.eq('invited', true).is('claimed_by', null)
    if (status === 'registered') query = query.not('claimed_by', 'is', null)
    if (status === 'opted_out') query = query.eq('opted_out', true)
    if (packF) query = packF === '_none' ? query.is('pack', null) : query.eq('pack', packF)
    if (districtF) query = districtF === '_none' ? query.is('district', null) : query.eq('district', districtF)
    if (mobileOnly) query = query.eq('is_mobile', true)
    const term = q.trim().replace(/[%,()]/g, ' ')
    if (term) query = query.or(`name.ilike.%${term}%,address.ilike.%${term}%,phone.ilike.%${term}%`)
    return query
  }

  const loadList = useCallback(async (p = 0) => {
    setListBusy(true)
    const { data, count: c } = await applyFilters(
      supabase.from('discovered_suppliers').select('*', { count: 'exact' }),
    ).order('google_reviews', { ascending: false, nullsFirst: false }).range(p * PAGE, p * PAGE + PAGE - 1)
    setRows(data || []); setCount(c || 0); setPage(p); setListBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, status, relevance, packF, districtF, mobileOnly, q])

  useEffect(() => { if (ready) { loadRuns(); loadStats() } }, [ready, loadRuns, loadStats])
  useEffect(() => { if (ready && tab === 'list') loadList(0) }, [ready, tab, loadList])

  // ── Batches ────────────────────────────────────────────────────────────────
  const doneKey = (zone: string, query: string) => `${zone}|${query}`
  const done = new Set(runs.map((r: any) => doneKey(r.zone, r.query)))
  const pagesSent = runs.reduce((s: number, r: any) => s + (r.pages || 0), 0)

  function cellStat(zone: string, pack: string) {
    const kws = PACK_QUERIES[pack] || []
    const ran = kws.filter(k => done.has(doneKey(zone, k))).length
    const found = runs.filter((r: any) => r.zone === zone && r.pack === pack).reduce((s: number, r: any) => s + (r.inserted || 0), 0)
    return { ran, total: kws.length, found }
  }

  async function runJobs(jobs: { zone: string; pack: string; query: string }[]) {
    const todo = redo ? jobs : jobs.filter(j => !done.has(doneKey(j.zone, j.query)))
    if (todo.length === 0) { setBatchLog(l => ['✓ كل هالدفعة اتشغّلت قبل. فعّل «إعادة» إذا بدك تعيدها.', ...l]); return }
    const est = (todo.length * 2 * USD_PER_PAGE).toFixed(2)
    if (!window.confirm(`رح نشغّل ${todo.length} بحث على Google (تقريباً ${todo.length * 2} صفحة ≈ $${est}). نكمل؟`)) return
    stopRef.current = false
    setRunning(true)
    let ins = 0
    for (let i = 0; i < todo.length; i++) {
      if (stopRef.current) { setBatchLog(l => ['⏸ توقّف بطلبك.', ...l]); break }
      const j = todo[i]
      setProgress({ i: i + 1, n: todo.length, label: `${j.zone} · ${j.query}` })
      try {
        const res = await fetch('/api/discover-suppliers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, zone: j.zone, pack: j.pack, query: j.query }),
        })
        const d = await res.json()
        if (!res.ok) {
          setBatchLog(l => [`✗ ${j.zone} · ${j.query}: ${d?.message || 'خطأ'}`, ...l])
          if (res.status === 503 || res.status === 401 || res.status === 403) break
          continue
        }
        ins += d.inserted || 0
        setBatchLog(l => [`✓ ${j.zone} · ${j.query}: ${d.results} نتيجة · جديد ${d.inserted} · مكرر جوال ${d.dupPhone} · مستبعد ${d.skipped}`, ...l].slice(0, 200))
        setRuns(rs => [...rs, { zone: j.zone, pack: j.pack, query: j.query, pages: d.pages, inserted: d.inserted }])
      } catch {
        setBatchLog(l => [`✗ ${j.zone} · ${j.query}: انقطع الاتصال`, ...l])
      }
    }
    setBatchLog(l => [`■ خلصت الدفعة — ${ins} محل جديد.`, ...l])
    setRunning(false); setProgress(null)
    loadStats()
  }

  const jobsFor = (zones: string[], packs: string[]) =>
    zones.flatMap(zone => packs.flatMap(pack => (PACK_QUERIES[pack] || []).map(query => ({ zone, pack, query }))))

  // ── Invitations ─────────────────────────────────────────────────────────────
  function setMsg(id: string, m: string) { setRowMsg((s: any) => ({ ...s, [id]: m })) }

  async function markInvited(row: any) {
    const { data, error } = await supabase.rpc('mark_discovered_invited', { p_id: row.id, p_cooldown_days: INVITE_COOLDOWN_DAYS })
    if (error) { setMsg(row.id, 'تعذّر التسجيل'); return false }
    if (!data?.ok) {
      const why: Record<string, string> = { cooldown: `انبعتله خلال آخر ${INVITE_COOLDOWN_DAYS} يوم`, opted_out: 'طلب الإيقاف', registered: 'مسجّل أصلاً', not_found: 'غير موجود' }
      setMsg(row.id, why[data?.reason] || 'مرفوض'); return false
    }
    setRows(rs => rs.map((r: any) => r.id === row.id ? { ...r, invited: true, invited_at: new Date().toISOString(), invite_count: (r.invite_count || 0) + 1 } : r))
    setMsg(row.id, '✓ انسجّلت الدعوة')
    return true
  }

  async function inviteWhatsApp(row: any) {
    const link = waLink(row.phone_norm, inviteText(row.city, row.pack, origin))
    if (!link) return
    // Open first (popup blockers need the user gesture), then record.
    window.open(link, '_blank', 'noopener')
    await markInvited(row)
  }

  async function updateRow(row: any, patch: any, msg: string) {
    const { error } = await supabase.from('discovered_suppliers').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', row.id)
    if (error) { setMsg(row.id, 'تعذّر الحفظ'); return }
    setRows(rs => rs.map((r: any) => r.id === row.id ? { ...r, ...patch } : r))
    setMsg(row.id, msg)
  }

  async function exportCSV() {
    const all: any[] = []
    for (let from = 0; from < 20000; from += 1000) {
      const { data } = await applyFilters(supabase.from('discovered_suppliers').select('*'))
        .order('google_reviews', { ascending: false, nullsFirst: false }).range(from, from + 999)
      all.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    if (all.length === 0) return
    const header = ['الاسم', 'الباقة', 'القطاع', 'الحي', 'المدينة', 'الجوال', 'جوال؟', 'الموقع الإلكتروني', 'العنوان', 'التقييم', 'المراجعات', 'نوع Google', 'دُعي', 'تاريخ الدعوة', 'سجّل', 'أوقف', 'رابط الخريطة']
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = all.map((r: any) => [
      r.name, packLabel(r.pack), r.sector, r.district, r.city, r.phone_norm ? '0' + r.phone_norm : '', r.is_mobile ? 'نعم' : '',
      r.website, r.address, r.google_rating, r.google_reviews, r.google_type, r.invited ? 'نعم' : '',
      r.invited_at ? r.invited_at.slice(0, 10) : '', r.claimed_by ? 'نعم' : '', r.opted_out ? 'نعم' : '', r.maps_url,
    ])
    const csv = '﻿' + [header, ...lines].map(l => l.map(esc).join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `موردين-${city}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  // ── Import old survey files ─────────────────────────────────────────────────
  async function importFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setImportBusy(true); setImportMsg('')
    const XLSX: any = await import('xlsx')
    const tot = { received: 0, inserted: 0, updated: 0, dupPhone: 0, dropped: {} as Record<string, number> }
    for (const file of Array.from(files)) {
      const wb = XLSX.read(await file.arrayBuffer())
      const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const mapped = raw.map((r: any) => {
        const o: any = {}
        for (const [h, k] of Object.entries(IMPORT_HEADERS)) if (r[h] !== undefined && !o[k]) o[k] = String(r[h] ?? '').trim()
        return o
      }).filter((o: any) => o.name)
      for (let i = 0; i < mapped.length; i += 500) {
        setImportMsg(`${file.name}: ${Math.min(i + 500, mapped.length)} / ${mapped.length}…`)
        const res = await fetch('/api/discover-suppliers/save', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: mapped.slice(i, i + 500), source: 'excel_import' }),
        })
        const d = await res.json()
        if (!res.ok) { setImportMsg(`✗ ${file.name}: ${d?.message || 'خطأ'}`); setImportBusy(false); return }
        tot.received += d.received; tot.inserted += d.inserted; tot.updated += d.updated; tot.dupPhone += d.dupPhone
        for (const [k, v] of Object.entries(d.dropped || {})) tot.dropped[k] = (tot.dropped[k] || 0) + (v as number)
      }
    }
    const dr = tot.dropped
    setImportMsg(`✓ ${tot.received} صف: جديد ${tot.inserted} · مكرر (نفس المحل) ${tot.updated + (dr.dup_in_file || 0)} · مكرر بنفس الجوال ${tot.dupPhone} · مستبعد (مش مورد) ${dr.irrelevant || 0} · خارج السعودية ${dr.foreign || 0}`)
    setImportBusy(false)
    loadStats()
  }

  if (!ready) return <PageLoader />

  const zones = cfg?.zones || []
  const priorityZones = zones.filter(z => z.priority).map(z => z.name)
  const packIds = SUPPLIER_PACKS.map(p => p.id)
  const districts: any[] = stats?.by_district || []

  return (
    <AppShell title="اكتشاف الموردين" nav={getNav('admin', 'ar', '/admin/discover')} dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: NAVY }}><Glyph e="🔎" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: NAVY }}>اكتشاف الموردين ودعوتهم</h1>
            <p className="text-gray-500 text-xs sm:text-sm">اجمع محلات المدينة منطقة منطقة ونوع نوع، بدون تكرار، وادعُهم واحد واحد.</p>
          </div>
          <select value={city} onChange={(e: any) => setCity(e.target.value)} className="input-field !w-auto text-sm">
            {Object.keys(DISCOVERY_CITIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-4">
            {[
              ['المحلات', stats.total, NAVY], ['عندهم جوال', stats.mobile, GREEN], ['انبعتلهم', stats.invited, ORANGE],
              ['سجّلوا', stats.registered, GREEN], ['بحاجة مراجعة', stats.review, '#6b7280'], ['صفحات Google', pagesSent, '#6b7280'],
            ].map(([l, v, c]: any) => (
              <div key={l} className="bg-white rounded-xl border border-gray-100 p-2.5 text-center">
                <div className="text-lg font-bold" style={{ color: c }}>{(v ?? 0).toLocaleString('en')}</div>
                <div className="text-[11px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
          {([['batches', 'الدفعات'], ['list', 'القائمة والدعوات'], ['stats', 'الإحصاء'], ['import', 'استيراد مسح سابق']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${tab === k ? '' : 'border-transparent text-gray-500'}`}
              style={tab === k ? { borderColor: ORANGE, color: NAVY } : {}}>{l}</button>
          ))}
        </div>

        {/* ── Batches ── */}
        {tab === 'batches' && (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-800 leading-relaxed">
              كل خانة = نوع محلات بمنطقة. الرقم <b>x/y</b> = كلمات البحث اللي اشتغلت، و<b>+n</b> = محلات جديدة انضافت.
              البحث عبر Google Places API الرسمي فقط؛ كل صفحة نتائج ≈ ${USD_PER_PAGE}. المكرر (نفس المحل أو نفس الجوال) ما بينضاف مرتين.
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button disabled={running} onClick={() => runJobs(jobsFor(priorityZones, packIds))}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: NAVY }}>▶ شغّل مناطق الأولوية (كل الأنواع)</button>
              <button disabled={running} onClick={() => runJobs(jobsFor(zones.map(z => z.name), packIds))}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 disabled:opacity-50">▶ شغّل كل المدينة</button>
              {running && <button onClick={() => { stopRef.current = true }} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-500">■ أوقف</button>}
              <label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={redo} onChange={(e: any) => setRedo(e.target.checked)} /> إعادة البحث اللي اشتغل قبل</label>
              {progress && <span className="text-xs font-semibold" style={{ color: ORANGE }}>{progress.i}/{progress.n} — {progress.label}</span>}
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
              <table className="text-[11px] border-collapse min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-right sticky right-0 bg-gray-50 z-10">المنطقة</th>
                    {SUPPLIER_PACKS.map(p => (
                      <th key={p.id} className="p-1.5 text-center font-semibold whitespace-nowrap">
                        <button disabled={running} title={`شغّل «${p.ar}» بكل المناطق`} onClick={() => runJobs(jobsFor(zones.map(z => z.name), [p.id]))} className="hover:underline disabled:opacity-50">
                          <div className="text-base">{p.icon}</div><div className="max-w-[70px] truncate">{p.ar}</div>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map(z => (
                    <tr key={z.name} className="border-t border-gray-100">
                      <td className="p-2 font-bold whitespace-nowrap sticky right-0 bg-white z-10">
                        <button disabled={running} onClick={() => runJobs(jobsFor([z.name], packIds))} className="hover:underline disabled:opacity-50" style={{ color: NAVY }} title="شغّل كل الأنواع بهالمنطقة">
                          {z.priority && <span style={{ color: ORANGE }}>★ </span>}{z.name}
                        </button>
                      </td>
                      {packIds.map(pid => {
                        const s = cellStat(z.name, pid)
                        const full = s.ran === s.total
                        return (
                          <td key={pid} className="p-1 text-center">
                            <button disabled={running} onClick={() => runJobs(jobsFor([z.name], [pid]))}
                              className={`w-full rounded-lg py-1 disabled:cursor-not-allowed ${full ? 'bg-emerald-50 text-emerald-700' : s.ran ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                              <div className="font-bold">{s.ran}/{s.total}</div>
                              {s.ran > 0 && <div>+{s.found}</div>}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {batchLog.length > 0 && (
              <div className="mt-3 bg-gray-900 text-gray-100 rounded-xl p-3 text-[11px] font-mono max-h-64 overflow-y-auto leading-relaxed">
                {batchLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        )}

        {/* ── List & invitations ── */}
        {tab === 'list' && (
          <div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm mb-3 grid grid-cols-2 sm:grid-cols-6 gap-2">
              <select value={status} onChange={(e: any) => setStatus(e.target.value)} className="input-field text-sm">
                {STATUS_FILTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <select value={relevance} onChange={(e: any) => setRelevance(e.target.value)} className="input-field text-sm">
                {RELEVANCE_FILTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <select value={packF} onChange={(e: any) => setPackF(e.target.value)} className="input-field text-sm">
                <option value="">كل الأنواع</option>
                {SUPPLIER_PACKS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.ar}</option>)}
                <option value="_none">غير مصنّف</option>
              </select>
              <select value={districtF} onChange={(e: any) => setDistrictF(e.target.value)} className="input-field text-sm">
                <option value="">كل الأحياء</option>
                {districts.map((d: any) => <option key={d.district} value={d.district}>{d.district === '_none' ? 'بدون حي' : d.district} ({d.total})</option>)}
              </select>
              <input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="اسم، عنوان أو رقم…" className="input-field text-sm" />
              <label className="flex items-center gap-1.5 text-xs text-gray-600 px-1"><input type="checkbox" checked={mobileOnly} onChange={(e: any) => setMobileOnly(e.target.checked)} /> جوال فقط (واتساب)</label>
            </div>

            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="text-sm font-bold" style={{ color: NAVY }}>{listBusy ? 'جارٍ التحميل…' : `${count.toLocaleString('en')} محل`}</h2>
              <button onClick={exportCSV} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">⬇ تصدير القائمة (CSV)</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {rows.map((row: any) => {
                const wa = waLink(row.phone_norm, '')
                const recent = row.invited_at && (Date.now() - new Date(row.invited_at).getTime()) < INVITE_COOLDOWN_DAYS * 86400000
                return (
                  <div key={row.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${row.claimed_by ? 'border-emerald-300' : row.invited ? 'border-amber-200' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold truncate" style={{ color: NAVY }}>{row.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-gray-500">
                          <span>{packIcon(row.pack)} {packLabel(row.pack)}</span>
                          {row.district && <span>· {row.district}</span>}
                          {row.google_type && <span className="text-gray-400">· {row.google_type}</span>}
                          {row.google_rating != null && <span>· <Glyph e="⭐" /> {row.google_rating} ({row.google_reviews || 0})</span>}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold whitespace-nowrap text-left">
                        {row.claimed_by && <div className="text-emerald-600">✓ سجّل</div>}
                        {row.invited && !row.claimed_by && <div className="text-amber-600">دُعي {row.invite_count > 1 ? `×${row.invite_count}` : ''} · {String(row.invited_at || '').slice(0, 10)}</div>}
                        {row.opted_out && <div className="text-red-500">أوقف</div>}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      {row.address && <div className="flex gap-1.5"><span><Glyph e="📍" /></span><span className="flex-1">{row.address}</span></div>}
                      <div dir="ltr" className="text-right"><Glyph e="📞" /> {row.phone_norm ? <a href={`tel:0${row.phone_norm}`} className="font-semibold" style={{ color: NAVY }}>0{row.phone_norm}</a> : <span className="text-gray-400">لا يوجد رقم</span>}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {wa && !row.claimed_by && !row.opted_out
                        ? <button onClick={() => inviteWhatsApp(row)} disabled={!!recent}
                            className="flex-1 text-center py-2 rounded-xl font-bold text-white text-xs disabled:opacity-40" style={{ background: '#25D366' }}
                            title={recent ? `انبعتله خلال آخر ${INVITE_COOLDOWN_DAYS} يوم` : ''}><Glyph e="💬" /> دعوة واتساب</button>
                        : <span className="flex-1 text-center py-2 rounded-xl text-xs text-gray-400 border border-gray-200">{row.claimed_by ? 'مسجّل' : row.opted_out ? 'طلب الإيقاف' : 'لا يوجد جوال'}</span>}
                      {!row.claimed_by && !row.opted_out && !recent &&
                        <button onClick={() => markInvited(row)} className="px-2.5 py-2 rounded-xl text-xs border border-gray-200 text-gray-600" title="زيارة ميدانية أو اتصال"><Glyph e="🚶" /> دُعي يدوياً</button>}
                      {safeHttpUrl(row.maps_url) && <a href={safeHttpUrl(row.maps_url)} target="_blank" rel="noreferrer" className="px-2.5 py-2 rounded-xl text-xs border border-gray-200 text-gray-600"><Glyph e="🗺" /></a>}
                      {safeHttpUrl(row.website) && <a href={safeHttpUrl(row.website)} target="_blank" rel="noreferrer" className="px-2.5 py-2 rounded-xl text-xs border border-gray-200 text-gray-600"><Glyph e="🌐" /></a>}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                      <select value={row.pack || ''} onChange={(e: any) => updateRow(row, { pack: e.target.value || null, sector: packSector(e.target.value) }, '✓ تعدّل النوع')}
                        className="border border-gray-200 rounded-lg px-1.5 py-1 text-[11px]">
                        <option value="">غير مصنّف</option>
                        {SUPPLIER_PACKS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.ar}</option>)}
                      </select>
                      {row.relevance !== 'supplier' && row.relevance != null &&
                        <button onClick={() => updateRow(row, { relevance: 'supplier', is_listed: true }, '✓ صار مورد')} className="underline text-emerald-700">✓ مورد</button>}
                      {row.relevance !== 'excluded' &&
                        <button onClick={() => updateRow(row, { relevance: 'excluded', is_listed: false }, 'استُبعد')} className="underline text-gray-500">✗ مش مورد</button>}
                      {!row.opted_out
                        ? <button onClick={() => updateRow(row, { opted_out: true }, 'ما رح نراسله')} className="underline text-red-500">رد «إيقاف»</button>
                        : <button onClick={() => updateRow(row, { opted_out: false }, 'رجع للقائمة')} className="underline text-gray-500">إلغاء الإيقاف</button>}
                      {rowMsg[row.id] && <span className="font-semibold text-emerald-700">{rowMsg[row.id]}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {count > PAGE && (
              <div className="flex items-center justify-center gap-3 mt-4 text-sm">
                <button disabled={page === 0 || listBusy} onClick={() => loadList(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40">السابق</button>
                <span className="text-gray-500">{page + 1} / {Math.ceil(count / PAGE)}</span>
                <button disabled={(page + 1) * PAGE >= count || listBusy} onClick={() => loadList(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40">التالي</button>
              </div>
            )}
          </div>
        )}

        {/* ── Stats ── */}
        {tab === 'stats' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold mb-2 text-sm" style={{ color: NAVY }}>حسب النوع</h3>
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500"><th className="text-right p-1">النوع</th><th className="p-1">محلات</th><th className="p-1">جوال</th><th className="p-1">دُعي</th><th className="p-1">سجّل</th></tr></thead>
                <tbody>
                  {(stats.by_pack || []).slice().sort((a: any, b: any) => b.total - a.total).map((r: any) => (
                    <tr key={r.pack} className="border-t border-gray-100 text-center">
                      <td className="text-right p-1">{r.pack === '_none' ? '❔ غير مصنّف' : `${packIcon(r.pack)} ${packLabel(r.pack)}`}</td>
                      <td className="p-1 font-bold">{r.total}</td><td className="p-1">{r.mobile}</td><td className="p-1">{r.invited}</td><td className="p-1">{r.registered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold mb-2 text-sm" style={{ color: NAVY }}>حسب الحي</h3>
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500"><th className="text-right p-1">الحي</th><th className="p-1">محلات</th><th className="p-1">جوال</th><th className="p-1">دُعي</th></tr></thead>
                  <tbody>
                    {districts.map((r: any) => (
                      <tr key={r.district} className="border-t border-gray-100 text-center">
                        <td className="text-right p-1">{r.district === '_none' ? 'بدون حي' : r.district}</td>
                        <td className="p-1 font-bold">{r.total}</td><td className="p-1">{r.mobile}</td><td className="p-1">{r.invited}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Import ── */}
        {tab === 'import' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-2xl">
            <h3 className="font-bold mb-1" style={{ color: NAVY }}>استيراد ملف مسح سابق (Excel / CSV)</h3>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              الأعمدة المتوقعة: {Object.keys(IMPORT_HEADERS).join('، ')}. كل صف بيمرّ على نفس التصنيف ومنع التكرار
              (رابط الخريطة ← رقم الجوال)، والمحلات اللي مش موردين أو خارج السعودية بتنشال تلقائياً. فيك تستورد نفس الملف أكتر من مرة بأمان.
            </p>
            <input type="file" accept=".xlsx,.xls,.csv" multiple disabled={importBusy} onChange={(e: any) => importFiles(e.target.files)} className="text-sm" />
            {importMsg && <div className="mt-3 text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5">{importMsg}</div>}
          </div>
        )}
      </div>
    </AppShell>
  )
}
