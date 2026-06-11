// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS } from '@/types'

const txt = {
  ar: {
    title: 'مؤشر أسعار السوق', sub: 'متوسط أسعار المواد بناءً على العروض الفعلية في المنصة',
    sector: 'القطاع', material: 'المادة', avgPrice: 'متوسط السعر', minPrice: 'أدنى سعر',
    maxPrice: 'أعلى سعر', offers: 'عدد العروض', unit: 'الوحدة', all: 'الكل',
    noData: 'لا توجد بيانات كافية بعد', noDataSub: 'ستظهر الأسعار بعد تراكم العروض في المنصة',
    back: '← رجوع', logout: 'خروج', sar: 'ر.س',
    trend: 'الاتجاه', updated: 'آخر تحديث',
  },
  en: {
    title: 'Market Price Index', sub: 'Average material prices based on actual platform offers',
    sector: 'Sector', material: 'Material', avgPrice: 'Avg Price', minPrice: 'Min Price',
    maxPrice: 'Max Price', offers: 'Offers', unit: 'Unit', all: 'All',
    noData: 'No data yet', noDataSub: 'Prices will appear as offers accumulate on the platform',
    back: '← Back', logout: 'Logout', sar: 'SAR',
    trend: 'Trend', updated: 'Last updated',
  },
  ur: {
    title: 'مارکیٹ پرائس انڈیکس', sub: 'پلیٹ فارم کی اصل پیشکشوں کی بنیاد پر اوسط قیمتیں',
    sector: 'شعبہ', material: 'مواد', avgPrice: 'اوسط قیمت', minPrice: 'کم قیمت',
    maxPrice: 'زیادہ قیمت', offers: 'پیشکشیں', unit: 'اکائی', all: 'سب',
    noData: 'ابھی ڈیٹا نہیں', noDataSub: 'قیمتیں پیشکشوں کے جمع ہونے پر ظاہر ہوں گی',
    back: '← واپس', logout: 'لاگ آؤٹ', sar: 'ریال',
    trend: 'رجحان', updated: 'آخری اپ ڈیٹ',
  },
}

export default function MarketPricePage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar

  const [priceData, setPriceData] = useState([])
  const [livePrices, setLivePrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSector, setSelectedSector] = useState('all')
  const [search, setSearch] = useState('')
  const [userRole, setUserRole] = useState('')

  function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const ar = locale === 'ar'
    if (mins < 1) return ar ? 'الآن' : 'now'
    if (mins < 60) return ar ? `قبل ${mins} دقيقة` : `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return ar ? `قبل ${hours} ساعة` : `${hours}h ago`
    const days = Math.floor(hours / 24)
    return ar ? `قبل ${days} يوم` : `${days}d ago`
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setUserRole(profile?.role || 'contractor')

      // الأسعار اللحظية المباشرة من المصانع/الموردين
      const { data: live } = await supabase
        .from('live_prices')
        .select('*, supplier:profiles_public(company_name_ar, supplier_tier)')
        .order('updated_at', { ascending: false })
      setLivePrices(live || [])

      // متوسط الأسعار عبر دالة آمنة (SECURITY DEFINER) ترجّع المتوسطات فقط
      // بدون كشف أي عرض فردي أو هوية مورد — لذلك جدول العروض يبقى مقفلاً.
      const { data: rows } = await supabase.rpc('get_market_prices')

      if (!rows || rows.length === 0) { setLoading(false); return }

      const result = rows
        .map((r: any) => ({
          name: r.product_name,
          sector: r.sector,
          unit: r.unit || '',
          avg: Math.round(Number(r.avg_price)),
          min: Number(r.min_price),
          max: Number(r.max_price),
          count: Number(r.offer_count),
        }))
        .sort((a, b) => b.count - a.count)

      setPriceData(result)
      setLoading(false)
    }
    load()
  }, [])

  const backHref = userRole === 'supplier' ? '/supplier/dashboard' : '/contractor'

  const filtered = priceData.filter(p => {
    const matchSector = selectedSector === 'all' || p.sector === selectedSector
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchSector && matchSearch
  })

  const sectors = ['all', ...Object.keys(SECTOR_LABELS)]

  return (
    <AppShell title={T.title} nav={getNav(userRole, locale, '/market')} dir={dir}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#1B2D5B' }}>📊</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>{T.title}</h1>
              <p className="text-gray-500 text-xs sm:text-sm">{T.sub}</p>
            </div>
          </div>
        </div>

        {/* ═══ الأسعار اللحظية المباشرة من المصانع ═══ */}
        {livePrices.filter(p => selectedSector === 'all' || p.sector === selectedSector)
          .filter(p => !search || p.product_name?.toLowerCase().includes(search.toLowerCase())).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="text-sm font-bold" style={{ color: '#1B2D5B' }}>
                {locale === 'en' ? '🔴 LIVE Prices from Factories' : locale === 'ur' ? '🔴 لائیو قیمتیں' : '🔴 أسعار مباشرة من المصانع'}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
              {livePrices
                .filter(p => selectedSector === 'all' || p.sector === selectedSector)
                .filter(p => !search || p.product_name?.toLowerCase().includes(search.toLowerCase()))
                .map(p => {
                  const trend = p.previous_price ? (p.price > p.previous_price ? 'up' : p.price < p.previous_price ? 'down' : 'same') : null
                  const pct = p.previous_price ? Math.abs(((p.price - p.previous_price) / p.previous_price * 100)).toFixed(1) : null
                  return (
                    <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{p.product_name}</div>
                          <span className="badge badge-blue text-[10px] mt-1">{SECTOR_LABELS[p.sector] || p.sector}</span>
                        </div>
                        {p.supplier?.supplier_tier === 'manufacturer' && <span className="text-base">🏭</span>}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-center gap-1">
                            {trend === 'up' && <span className="text-red-500 text-sm">▲</span>}
                            {trend === 'down' && <span className="text-emerald-500 text-sm">▼</span>}
                            <span className="text-2xl font-bold" style={{ color: trend === 'up' ? '#ef4444' : trend === 'down' ? '#0F6E56' : '#1B2D5B' }}>
                              {p.price?.toLocaleString('en-US')}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">ر.س / {p.unit}{pct ? ` · ${trend === 'up' ? '+' : '-'}${pct}%` : ''}</div>
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] text-gray-400">🕐 {timeAgo(p.updated_at)}</div>
                          {p.region && <div className="text-[10px] text-gray-400">📍 {p.region}</div>}
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-50 truncate">
                        {p.supplier?.company_name_ar}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Stats summary */}
        {priceData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6 stagger">
            {[
              { label: locale === 'en' ? 'Materials Tracked' : 'مادة مرصودة', value: priceData.length, icon: '📦', bg: '#1B2D5B' },
              { label: locale === 'en' ? 'Total Offers' : 'إجمالي العروض', value: priceData.reduce((s, p) => s + p.count, 0), icon: '💬', bg: '#F5831F' },
              { label: locale === 'en' ? 'Sectors' : 'قطاعات', value: Object.keys(SECTOR_LABELS).length, icon: '🏗', bg: '#0F6E56' },
            ].map(({ label, value, icon, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white mx-auto mb-2" style={{ background: bg }}>{icon}</div>
                <div className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {sectors.map(s => (
              <button key={s} onClick={() => setSelectedSector(s)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedSector === s ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`} style={selectedSector === s ? { background: '#1B2D5B' } : {}}>
                {s === 'all' ? T.all : SECTOR_LABELS[s]}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field sm:max-w-xs text-sm" placeholder={`🔍 ${locale === 'en' ? 'Search material...' : 'ابحث عن مادة...'}`} />
        </div>

        {/* Price Table */}
        {loading ? (
          <div className="text-center py-20 animate-pulse text-gray-500">{locale === 'en' ? 'Loading...' : 'جارٍ التحميل...'}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center animate-fade-in">
            <div className="text-6xl mb-4 animate-float">📊</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>{T.noData}</h3>
            <p className="text-sm text-gray-500">{T.noDataSub}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: '#1B2D5B' }}>
                    {[T.material, T.sector, T.unit, T.minPrice, T.avgPrice, T.maxPrice, T.offers].map(h => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-bold text-white">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-[#1B2D5B]/2 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-semibold text-sm" style={{ color: '#1B2D5B' }}>{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-blue text-[10px]">{SECTOR_LABELS[p.sector] || p.sector}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.unit}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{p.min?.toLocaleString('en-US')} {T.sar}</td>
                      <td className="px-4 py-3">
                        <div className="text-base font-bold" style={{ color: '#F5831F' }}>{p.avg?.toLocaleString('en-US')} {T.sar}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-red-500 font-semibold">{p.max?.toLocaleString('en-US')} {T.sar}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold">{p.count}</span>
                          {T.offers}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3 stagger">
              {filtered.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{p.name}</div>
                      <span className="badge badge-blue text-[10px] mt-1">{SECTOR_LABELS[p.sector] || p.sector}</span>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold" style={{ color: '#F5831F' }}>{p.avg?.toLocaleString('en-US')}</div>
                      <div className="text-[10px] text-gray-400">{T.sar} / {p.unit}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <div className="text-emerald-600 font-semibold">{p.min?.toLocaleString('en-US')}</div>
                      <div className="text-gray-400 text-[10px]">{T.minPrice}</div>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: '#F5831F15' }}>
                      <div className="font-bold" style={{ color: '#F5831F' }}>{p.avg?.toLocaleString('en-US')}</div>
                      <div className="text-gray-400 text-[10px]">{T.avgPrice}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <div className="text-red-500 font-semibold">{p.max?.toLocaleString('en-US')}</div>
                      <div className="text-gray-400 text-[10px]">{T.maxPrice}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2 text-center">{p.count} {T.offers}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
