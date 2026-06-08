// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { REGIONS, CITIES_BY_REGION } from '@/types'
import DistrictField from '@/components/shared/DistrictField'

export default function SupplierBranchesPage() {
  const { dir } = useTranslation()
  const [user, setUser] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
    const { data } = await supabase.from('branches').select('*').eq('supplier_id', session.user.id).order('created_at', { ascending: false })
    setBranches(data || [])
    setLoading(false)
  }

  function reset() { setName(''); setRegion(''); setCity(''); setDistrict(''); setPhone(''); setAddress(''); setShowForm(false) }

  async function save(e) {
    e.preventDefault()
    if (!name || !region) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('branches').insert({
      supplier_id: user.id, name, region, city: city || null, district: district || null,
      phone: phone || null, address: address || null,
    })
    setSaving(false); reset(); load()
  }

  async function remove(id) {
    if (!confirm('حذف هذا الفرع؟')) return
    const supabase = createClient()
    await supabase.from('branches').delete().eq('id', id)
    load()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse"><img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" /><div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>جارٍ التحميل...</div></div>
    </div>
  )

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/supplier/dashboard" className="text-xs text-gray-400 hover:text-gray-600">← رجوع</a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#1B2D5B' }}>🏢</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>فروع الشركة</h1>
              <p className="text-gray-500 text-xs sm:text-sm">أضف فروعك في المناطق المختلفة — تظهر شركتك لمقاولي كل منطقة فيها فرع.</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-700">
          💡 مثال: لو عندك فروع في الرياض وجدة والدمام، أضف الثلاثة — وراح توصلك طلبات التسعير من المقاولين في كل هذي المناطق.
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full mb-5 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:shadow-lg" style={{ background: '#1B2D5B' }}>
            + إضافة فرع
          </button>
        )}

        {showForm && (
          <form onSubmit={save} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">اسم الفرع *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="فرع الرياض - العليا" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">المنطقة *</label>
                <select value={region} onChange={e => { setRegion(e.target.value); setCity('') }} className="input-field" required>
                  <option value="">-- اختر --</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">المدينة</label>
                <select value={city} onChange={e => setCity(e.target.value)} className="input-field" disabled={!region}>
                  <option value="">{region ? '-- اختر --' : '—'}</option>
                  {(CITIES_BY_REGION[region] || []).map(c => <option key={c.ar} value={c.ar}>{c.ar}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">الحي</label>
                <DistrictField city={city} value={district} onChange={setDistrict} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">جوال الفرع</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="05XXXXXXXX" dir="ltr" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">العنوان (اختياري)</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="input-field" placeholder="الشارع، رقم المبنى..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#F5831F' }}>
                {saving ? 'جارٍ الحفظ...' : 'حفظ الفرع'}
              </button>
              <button type="button" onClick={reset} className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600">✕</button>
            </div>
          </form>
        )}

        {branches.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
            <div className="text-5xl mb-3 animate-float">🏢</div>
            <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>لا توجد فروع مضافة</h3>
            <p className="text-sm text-gray-500">أضف فروعك لتصلك طلبات التسعير من مناطقها.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: '#1B2D5B' }}>الفروع ({branches.length})</h2>
            {branches.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold" style={{ color: '#1B2D5B' }}>{b.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                    <span className="badge badge-blue text-[10px]">📍 {b.region}{b.city ? ' - ' + b.city : ''}</span>
                    {b.district && <span>🏘 {b.district}</span>}
                    {b.phone && <span dir="ltr">📞 {b.phone}</span>}
                  </div>
                  {b.address && <div className="text-[11px] text-gray-400 mt-1">{b.address}</div>}
                </div>
                <button onClick={() => remove(b.id)} className="px-3 py-2 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50 flex-shrink-0">🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
