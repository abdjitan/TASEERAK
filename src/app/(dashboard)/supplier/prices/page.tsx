// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SECTOR_LABELS, UNIT_OPTIONS, REGIONS } from '@/types'

const txt = {
  ar: {
    title: 'تحديث أسعاري اللحظية', sub: 'حدّث أسعار سلعك المتغيرة — يراها المقاولون مباشرة في بورصة الأسعار',
    back: '← رجوع', addPrice: '+ إضافة سلعة', myPrices: 'أسعاري المنشورة',
    product: 'اسم السلعة', sector: 'القطاع', unit: 'الوحدة', price: 'السعر (ر.س)',
    region: 'المنطقة', selectSector: 'اختر القطاع', selectUnit: 'الوحدة', selectRegion: 'كل المناطق',
    save: 'نشر السعر', saving: 'جارٍ النشر...', update: 'تحديث', updated: '✓ تم التحديث',
    noPrices: 'لم تنشر أي أسعار بعد', noPricesSub: 'انشر أسعار سلعك المتغيرة ليراها المقاولون',
    lastUpdate: 'آخر تحديث', delete: 'حذف', edit: 'تعديل', loading: 'جارٍ التحميل...',
    hint: '💡 السلع المتغيرة (حديد، كابلات، خرسانة) — حدّثها يومياً لتظهر في صدارة البورصة',
    justNow: 'الآن', minsAgo: 'دقيقة', hoursAgo: 'ساعة', daysAgo: 'يوم', ago: 'قبل',
    confirmDelete: 'حذف هذه السلعة؟',
  },
  en: {
    title: 'Update My Live Prices', sub: 'Update your volatile commodity prices — contractors see them instantly',
    back: '← Back', addPrice: '+ Add Item', myPrices: 'My Published Prices',
    product: 'Product Name', sector: 'Sector', unit: 'Unit', price: 'Price (SAR)',
    region: 'Region', selectSector: 'Select sector', selectUnit: 'Unit', selectRegion: 'All regions',
    save: 'Publish Price', saving: 'Publishing...', update: 'Update', updated: '✓ Updated',
    noPrices: 'No prices published yet', noPricesSub: 'Publish your volatile prices for contractors to see',
    lastUpdate: 'Last update', delete: 'Delete', edit: 'Edit', loading: 'Loading...',
    hint: '💡 Volatile items (steel, cables, concrete) — update daily to top the index',
    justNow: 'now', minsAgo: 'min', hoursAgo: 'h', daysAgo: 'd', ago: '',
    confirmDelete: 'Delete this item?',
  },
  ur: {
    title: 'میری لائیو قیمتیں اپ ڈیٹ کریں', sub: 'اپنی قیمتیں اپ ڈیٹ کریں — ٹھیکیدار فوری دیکھتے ہیں',
    back: '← واپس', addPrice: '+ آئٹم شامل کریں', myPrices: 'میری شائع شدہ قیمتیں',
    product: 'پروڈکٹ کا نام', sector: 'شعبہ', unit: 'یونٹ', price: 'قیمت (ریال)',
    region: 'علاقہ', selectSector: 'شعبہ منتخب کریں', selectUnit: 'یونٹ', selectRegion: 'تمام علاقے',
    save: 'قیمت شائع کریں', saving: 'شائع ہو رہا ہے...', update: 'اپ ڈیٹ', updated: '✓ اپ ڈیٹ ہو گیا',
    noPrices: 'ابھی کوئی قیمت نہیں', noPricesSub: 'اپنی قیمتیں شائع کریں',
    lastUpdate: 'آخری اپ ڈیٹ', delete: 'حذف', edit: 'ترمیم', loading: 'لوڈ ہو رہا ہے...',
    hint: '💡 متغیر اشیاء (لوہا، کیبل، کنکریٹ) — روزانہ اپ ڈیٹ کریں',
    justNow: 'ابھی', minsAgo: 'منٹ', hoursAgo: 'گھنٹہ', daysAgo: 'دن', ago: 'پہلے',
    confirmDelete: 'یہ آئٹم حذف کریں؟',
  },
}

function timeAgo(date, T) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return T.justNow
  if (mins < 60) return `${T.ago} ${mins} ${T.minsAgo}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${T.ago} ${hours} ${T.hoursAgo}`
  const days = Math.floor(hours / 24)
  return `${T.ago} ${days} ${T.daysAgo}`
}

export default function SupplierPricesPage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar

  const [user, setUser] = useState(null)
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // form
  const [product, setProduct] = useState('')
  const [sector, setSector] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [region, setRegion] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
    const { data } = await supabase.from('live_prices').select('*')
      .eq('supplier_id', session.user.id).order('updated_at', { ascending: false })
    setPrices(data || [])
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!product || !sector || !unit || !price) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('live_prices').insert({
      supplier_id: user.id, product_name: product, sector, unit,
      price: parseFloat(price), region: region || null,
    })
    setProduct(''); setSector(''); setUnit(''); setPrice(''); setRegion('')
    setShowForm(false); setSaving(false)
    load()
  }

  async function updatePrice(id, oldPrice, newPrice) {
    if (!newPrice || newPrice === oldPrice) return
    const supabase = createClient()
    await supabase.from('live_prices').update({
      price: parseFloat(newPrice), previous_price: oldPrice, updated_at: new Date().toISOString(),
    }).eq('id', id)
    load()
  }

  async function deletePrice(id) {
    if (!confirm(T.confirmDelete)) return
    const supabase = createClient()
    await supabase.from('live_prices').delete().eq('id', id)
    load()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>{T.loading}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/supplier/dashboard" className="text-xs text-gray-400 hover:text-gray-600">{T.back}</a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#F5831F' }}>📈</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>{T.title}</h1>
              <p className="text-gray-500 text-xs sm:text-sm">{T.sub}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-700">{T.hint}</div>

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full mb-5 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:shadow-lg"
            style={{ background: '#1B2D5B' }}>
            {T.addPrice}
          </button>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">{T.product}</label>
                <input value={product} onChange={e => setProduct(e.target.value)}
                  className="input-field" placeholder="حديد تسليح 16مم" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{T.sector}</label>
                <select value={sector} onChange={e => setSector(e.target.value)} className="input-field" required>
                  <option value="">{T.selectSector}</option>
                  {Object.keys(SECTOR_LABELS).map(s => <option key={s} value={s}>{SECTOR_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{T.unit}</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field" required>
                  <option value="">{T.selectUnit}</option>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{T.price}</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                  className="input-field" placeholder="2750" required min="0" step="any" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{T.region}</label>
                <select value={region} onChange={e => setRegion(e.target.value)} className="input-field">
                  <option value="">{T.selectRegion}</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
                style={{ background: '#F5831F' }}>
                {saving ? T.saving : T.save}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600">✕</button>
            </div>
          </form>
        )}

        {/* My prices */}
        {prices.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
            <div className="text-5xl mb-3 animate-float">📈</div>
            <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>{T.noPrices}</h3>
            <p className="text-sm text-gray-500">{T.noPricesSub}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: '#1B2D5B' }}>{T.myPrices} ({prices.length})</h2>
            {prices.map(p => {
              const trend = p.previous_price ? (p.price > p.previous_price ? 'up' : p.price < p.previous_price ? 'down' : 'same') : null
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold" style={{ color: '#1B2D5B' }}>{p.product_name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-400">
                        <span className="badge badge-blue text-[10px]">{SECTOR_LABELS[p.sector] || p.sector}</span>
                        {p.region && <span>📍 {p.region}</span>}
                        <span>🕐 {T.lastUpdate}: {timeAgo(p.updated_at, T)}</span>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {trend === 'up' && <span className="text-red-500 text-xs">▲</span>}
                        {trend === 'down' && <span className="text-emerald-500 text-xs">▼</span>}
                        <span className="text-xl font-bold" style={{ color: '#1B2D5B' }}>{p.price?.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">ر.س / {p.unit}</div>
                    </div>
                  </div>
                  {/* Quick update */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <input type="number" placeholder={p.price} className="input-field text-sm flex-1 !py-2"
                      onKeyDown={e => { if (e.key === 'Enter') { updatePrice(p.id, p.price, e.currentTarget.value); e.currentTarget.value = '' } }}
                      id={`upd-${p.id}`} step="any" min="0" />
                    <button onClick={() => { const v = document.getElementById(`upd-${p.id}`).value; updatePrice(p.id, p.price, v) }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#0F6E56' }}>
                      {T.update}
                    </button>
                    <button onClick={() => deletePrice(p.id)}
                      className="px-3 py-2 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50">🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
