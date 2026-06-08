// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { REGIONS, CITIES_BY_REGION } from '@/types'
import Logo from '@/components/shared/Logo'

// Common building-material categories to search for. The admin can also type a
// free query. Keep the wedge narrow at launch: 1 city + a few of these.
const CATEGORIES = [
  'محلات مواد بناء',
  'حديد تسليح',
  'أسمنت وخرسانة جاهزة',
  'بلوك وطابوق',
  'بلاط وسيراميك ورخام',
  'دهانات',
  'أدوات صحية وسباكة',
  'مواد كهربائية وإنارة',
  'أخشاب',
  'زجاج وألمنيوم',
  'مواد عزل',
  'أدوات ومعدات بناء',
]

// Normalise a Saudi phone to the wa.me international format (no + or spaces).
function waLink(phone: string, text: string) {
  let d = (phone || '').replace(/[^\d]/g, '')
  if (!d) return ''
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('966')) { /* already international */ }
  else if (d.startsWith('0')) d = '966' + d.slice(1)
  else if (d.startsWith('5') && d.length === 9) d = '966' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

export default function DiscoverSuppliersPage() {
  const [ready, setReady] = useState(false)
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [customQuery, setCustomQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nextToken, setNextToken] = useState(null)
  const [lastQuery, setLastQuery] = useState('')
  const [emailBusy, setEmailBusy] = useState({})
  const [invited, setInvited] = useState({})
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { window.location.href = '/'; return }
      const r0 = REGIONS[0] || ''
      setRegion(r0)
      setCity((CITIES_BY_REGION[r0] || [])[0]?.ar || '')
      setOrigin(window.location.origin)
      setReady(true)
    }
    init()
  }, [])

  function buildQuery() {
    const base = (customQuery.trim() || category).trim()
    return city ? `${base} في ${city}` : base
  }

  async function search(reset = true) {
    setError('')
    const q = reset ? buildQuery() : lastQuery
    if (!q) return
    if (reset) { setResults([]); setNextToken(null) }
    setLoading(true)
    if (reset) setLastQuery(q)
    try {
      const res = await fetch('/api/discover-suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, pageToken: reset ? null : nextToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data?.message || 'تعذّر البحث.'); setLoading(false); return }
      setResults(prev => reset ? (data.places || []) : [...prev, ...(data.places || [])])
      setNextToken(data.nextPageToken || null)
      if (reset && (!data.places || data.places.length === 0)) setError('ما لقينا نتائج. جرّب صنف ثاني أو مدينة ثانية.')
    } catch {
      setError('تعذّر الاتصال. تأكد من اتصالك وحاول مرة ثانية.')
    }
    setLoading(false)
  }

  async function findEmail(row) {
    if (!row.website) return
    setEmailBusy(b => ({ ...b, [row.id]: true }))
    try {
      const res = await fetch('/api/discover-suppliers/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: row.website }),
      })
      const data = await res.json()
      setResults(rs => rs.map(r => r.id === row.id ? { ...r, email: data.email || '—' } : r))
    } catch {
      setResults(rs => rs.map(r => r.id === row.id ? { ...r, email: '—' } : r))
    }
    setEmailBusy(b => ({ ...b, [row.id]: false }))
  }

  function inviteText(row) {
    return `السلام عليكم${row.name ? '، ' + row.name : ''} 👋\n\nندعوكم للانضمام إلى منصة «تسعيرك» — منصة سعودية تجمع موردي مواد البناء بالمقاولين، تتيح لكم استقبال طلبات تسعير من مقاولين جاهزين للشراء في منطقتكم، مجاناً.\n\nالتسجيل من هنا:\n${origin}/register\n\nنتشرف بانضمامكم 🌟`
  }

  function exportCSV() {
    if (results.length === 0) return
    const header = ['الاسم', 'النوع', 'الجوال', 'الإيميل', 'الموقع الإلكتروني', 'العنوان', 'التقييم', 'عدد المراجعات', 'رابط الخريطة']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = results.map(r => [r.name, r.type, r.phone, (r.email && r.email !== '—') ? r.email : '', r.website, r.address, r.rating ?? '', r.reviews ?? '', r.mapsUrl])
    const csv = '﻿' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `موردين-${city || 'بحث'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse"><img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" /><div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>جارٍ التحميل...</div></div>
    </div>
  )

  const cities = CITIES_BY_REGION[region] || []

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#f4f6f9' }}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600">← رجوع للوحة الإدارة</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#1B2D5B' }}>🔎</div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>اكتشاف الموردين</h1>
            <p className="text-gray-500 text-xs sm:text-sm">ابحث عن محلات المواد، صدّرها لإكسل، وادعُهم للمنصة عبر واتساب.</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-4 text-xs text-amber-800 leading-relaxed">
          💡 <b>نصيحة:</b> ابدأ ضيّق — مدينة وحدة + ٢–٣ أصناف أساسية (حديد، أسمنت، بلوك) — واجمع كثافة موردين فيها قبل ما تجيب المقاولين.
          <br />ℹ️ Google ما يعطي إيميلات؛ نجيبها من موقع المحل لو متوفر، وإلا اعتمد على <b>واتساب</b> (الأفضل للسعودية).
        </div>

        {/* Search controls */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">المنطقة</label>
              <select value={region} onChange={e => { setRegion(e.target.value); setCity((CITIES_BY_REGION[e.target.value] || [])[0]?.ar || '') }} className="input-field">
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">المدينة</label>
              <select value={city} onChange={e => setCity(e.target.value)} className="input-field">
                <option value="">— كل المدن —</option>
                {cities.map(c => <option key={c.ar} value={c.ar}>{c.ar}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">نوع المواد</label>
              <select value={category} onChange={e => { setCategory(e.target.value); setCustomQuery('') }} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-bold text-gray-500 mb-1">أو بحث حر (اختياري)</label>
            <input value={customQuery} onChange={e => setCustomQuery(e.target.value)} className="input-field" placeholder="مثال: مصنع بلاط، مورد عوازل، تاجر جملة دهانات…" />
          </div>
          <button onClick={() => search(true)} disabled={loading}
            className="w-full mt-4 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:shadow-lg" style={{ background: '#1B2D5B' }}>
            {loading ? 'جارٍ البحث…' : '🔎 ابحث'}
          </button>
          {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
        </div>

        {/* Results toolbar */}
        {results.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className="text-sm font-bold" style={{ color: '#1B2D5B' }}>النتائج ({results.length})</h2>
            <button onClick={exportCSV} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">⬇ تصدير إكسل (CSV)</button>
          </div>
        )}

        {/* Result cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {results.map(row => {
            const wa = waLink(row.phone, inviteText(row))
            return (
              <div key={row.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${invited[row.id] ? 'border-emerald-300' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate" style={{ color: '#1B2D5B' }}>{row.name || '—'}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-gray-500">
                      {row.type && <span className="badge badge-blue text-[10px]">{row.type}</span>}
                      {row.rating != null && <span>⭐ {row.rating} ({row.reviews || 0})</span>}
                      {row.status && row.status !== 'OPERATIONAL' && <span className="text-red-500">مغلق؟</span>}
                    </div>
                  </div>
                  {invited[row.id] && <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap">✓ تمت الدعوة</span>}
                </div>

                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {row.address && <div className="flex gap-1.5"><span>📍</span><span className="flex-1">{row.address}</span></div>}
                  <div className="flex gap-1.5 items-center" dir="ltr">
                    <span>📞</span>
                    {row.phone ? <a href={`tel:${row.phone}`} className="font-semibold" style={{ color: '#1B2D5B' }}>{row.phone}</a> : <span className="text-gray-400">لا يوجد رقم</span>}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span>✉️</span>
                    {row.email
                      ? <span dir="ltr" className={row.email === '—' ? 'text-gray-400' : 'font-semibold text-emerald-700'}>{row.email === '—' ? 'ما وُجد إيميل' : row.email}</span>
                      : row.website
                        ? <button onClick={() => findEmail(row)} disabled={emailBusy[row.id]} className="text-[11px] underline text-gray-500 disabled:opacity-50">{emailBusy[row.id] ? 'جارٍ البحث…' : 'ابحث عن إيميل من الموقع'}</button>
                        : <span className="text-gray-400 text-[11px]">لا يوجد موقع</span>}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {wa
                    ? <a href={wa} target="_blank" rel="noreferrer" onClick={() => setInvited(s => ({ ...s, [row.id]: true }))}
                        className="flex-1 text-center py-2 rounded-xl font-bold text-white text-xs" style={{ background: '#25D366' }}>💬 دعوة واتساب</a>
                    : <span className="flex-1 text-center py-2 rounded-xl text-xs text-gray-400 border border-gray-200">لا يوجد رقم للدعوة</span>}
                  {row.mapsUrl && <a href={row.mapsUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl text-xs border border-gray-200 text-gray-600">🗺 الخريطة</a>}
                  {row.website && <a href={row.website} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl text-xs border border-gray-200 text-gray-600">🌐 الموقع</a>}
                </div>
              </div>
            )
          })}
        </div>

        {nextToken && (
          <button onClick={() => search(false)} disabled={loading}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 bg-white disabled:opacity-50">
            {loading ? 'جارٍ التحميل…' : '+ تحميل المزيد من النتائج'}
          </button>
        )}
      </div>
    </div>
  )
}
