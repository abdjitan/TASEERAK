'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, getProductLabel, getUnitLabel, getSectorLabel, getRegionLabel } from '@/types'
import { FEATURES } from '@/lib/features'
import PricesComingSoon from '@/components/public/PricesComingSoon'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { timeAgo } from '@/lib/text'
import PageLoader from '@/components/shared/PageLoader'

const txt = {
  ar: {
    title: 'أسعار المواد', sub: 'متوسط أسعار المواد بناءً على العروض الفعلية في المنصة، شاملة ضريبة القيمة المضافة',
    sector: 'القطاع', material: 'المادة', avgPrice: 'متوسط السعر', minPrice: 'أدنى سعر',
    maxPrice: 'أعلى سعر', offers: 'عدد العروض', unit: 'الوحدة', all: 'الكل',
    noData: 'لا توجد بيانات كافية بعد', noDataSub: 'ستظهر الأسعار بعد تراكم العروض في المنصة',
    back: '→ رجوع', logout: 'خروج', sar: 'ر.س',
    trend: 'الاتجاه', updated: 'آخر تحديث',
  },
  en: {
    title: 'Material prices', sub: 'Average material prices based on actual platform offers, including VAT',
    sector: 'Sector', material: 'Material', avgPrice: 'Avg Price', minPrice: 'Min Price',
    maxPrice: 'Max Price', offers: 'Offers', unit: 'Unit', all: 'All',
    noData: 'No data yet', noDataSub: 'Prices will appear as offers accumulate on the platform',
    back: '← Back', logout: 'Logout', sar: 'SAR',
    trend: 'Trend', updated: 'Last updated',
  },
  ur: {
    title: 'سامان کی قیمتیں', sub: 'پلیٹ فارم کی اصل پیشکشوں کی بنیاد پر اوسط قیمتیں، ویلیو ایڈڈ ٹیکس سمیت',
    sector: 'شعبہ', material: 'مواد', avgPrice: 'اوسط قیمت', minPrice: 'کم قیمت',
    maxPrice: 'زیادہ قیمت', offers: 'پیشکشیں', unit: 'اکائی', all: 'سب',
    noData: 'ابھی ڈیٹا نہیں', noDataSub: 'قیمتیں پیشکشوں کے جمع ہونے پر ظاہر ہوں گی',
    back: '→ واپس', logout: 'لاگ آؤٹ', sar: 'ریال',
    trend: 'رجحان', updated: 'آخری اپ ڈیٹ',
  },
}

export default function MarketPricePage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  const [priceData, setPriceData] = useState<any[]>([])
  const [livePrices, setLivePrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSector, setSelectedSector] = useState('all')
  const [search, setSearch] = useState('')
  const [userRole, setUserRole] = useState('')
  // a failed load is an error, not «no data yet» (UX-119)
  const [loadErr, setLoadErr] = useState(false)

  useEffect(() => {
    async function load() {
      try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setUserRole(profile?.role || 'contractor')
      // the board is switched off for launch: say so instead of loading old prices (UX-119)
      if (!FEATURES.priceBoard) { setLoading(false); return }

      // الأسعار اللحظية المباشرة من المصانع/الموردين
      const { data: live, error: liveErr } = await supabase
        .from('live_prices')
        .select('*, supplier:profiles_public(company_name_ar, supplier_tier)')
        .order('updated_at', { ascending: false })
        .limit(500) // bound the live-price board (aggregate averages come from get_market_prices)
      if (liveErr) throw liveErr
      setLivePrices(live || [])

      // متوسط الأسعار عبر دالة آمنة (SECURITY DEFINER) ترجّع المتوسطات فقط
      // بدون كشف أي عرض فردي أو هوية مورد — لذلك جدول العروض يبقى مقفلاً.
      const { data: rows, error: rowsErr } = await supabase.rpc('get_market_prices')
      if (rowsErr) throw rowsErr

      if (!rows || rows.length === 0) { setLoading(false); return }

      // what buyers pay: VAT-inclusive (final price for unregistered sellers), migration 284 (round-6 UX-138).
      // min/max come before VAT from the server, so they show only once it returns buyer-side values.
      const n = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v))
      const result = rows
        .map((r: any) => ({
          name: r.product_name,
          sector: r.sector,
          unit: r.unit || '',
          avg: Math.round(Number(r.avg_buyer_price ?? r.avg_price)),
          min: n(r.min_buyer_price),
          max: n(r.max_buyer_price),
          count: Number(r.offer_count),
        }))
        .sort((a: any, b: any) => b.count - a.count)

      setPriceData(result)
      setLoading(false)
      } catch { setLoadErr(true); setLoading(false) }
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

  // no flash of the old board while the role and the switch are read (round-6 UX-138)
  if (loading && !loadErr) return <PageLoader />

  if (!FEATURES.priceBoard && !loading) return (
    <AppShell title={T.title} nav={getNav(userRole, locale, '/market')} dir={dir}>
      {/* the same text as the public /prices page (round-4 UX-149) */}
      <PricesComingSoon role={userRole} homeHref={backHref} />
    </AppShell>
  )

  return (
    <AppShell title={T.title} nav={getNav(userRole, locale, '/market')} dir={dir}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#0B2438' }}><Glyph e="📊" /></div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{T.title}</h1>
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
              <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>
                {L('Latest supplier prices', 'سپلائرز کی تازہ قیمتیں', 'أحدث أسعار الموردين')}
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
                          <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{getProductLabel(p.product_name || '', locale)}</div>
                          <span className="badge badge-blue text-[12px] mt-1">{getSectorLabel(p.sector, locale)}</span>
                        </div>
                        {p.supplier?.supplier_tier === 'manufacturer' && <span className="text-[#0B2438]" title={L('Factory', 'فیکٹری', 'مصنع')}><SellerIcon name="factory" /></span>}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-center gap-1">
                            {trend === 'up' && <span className="text-[#0B2438] text-sm" aria-hidden>▲</span>}
                            {trend === 'down' && <span className="text-[#0B2438] text-sm" aria-hidden>▼</span>}
                            <span className="text-2xl font-bold" style={{ color: '#0B2438' }}>
                              {p.price?.toLocaleString('en-US')}
                            </span>
                          </div>
                          <div className="text-[12px] text-gray-400">{T.sar} / {getUnitLabel(p.unit, locale)}{pct ? ` · ${trend === 'up' ? '+' : '-'}${pct}%` : ''}</div>
                        </div>
                        <div className="text-end">
                          <div className="text-[12px] text-gray-400"><Glyph e="🕐" /> {timeAgo(p.updated_at, locale)}</div>
                          {p.region && <div className="text-[12px] text-gray-500"><Glyph e="📍" /> {getRegionLabel(p.region, locale)}</div>}
                        </div>
                      </div>
                      <div className="text-[12px] text-gray-400 mt-2 pt-2 border-t border-gray-50 truncate">
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
              { label: L('Materials tracked', 'زیرِ نگرانی اشیاء', 'المواد المرصودة'), value: priceData.length, icon: <Glyph e="📦" />, bg: '#0B2438', fg: '#fff' },
              { label: L('Total offers', 'کل آفرز', 'إجمالي العروض'), value: priceData.reduce((s, p) => s + p.count, 0), icon: <Glyph e="💬" />, bg: '#D4A543', fg: '#071827' },
              { label: L('Sectors', 'شعبے', 'القطاعات'), value: Object.keys(SECTOR_LABELS).length, icon: <Glyph e="🏗" />, bg: '#102E45', fg: '#fff' },
            ].map(({ label, value, icon, bg, fg }) => (
              <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mx-auto mb-2" style={{ background: bg, color: fg }}>{icon}</div>
                <div className="text-2xl font-bold" style={{ color: '#0B2438' }}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {sectors.map(s => (
              <button key={s} onClick={() => setSelectedSector(s)} aria-pressed={selectedSector === s}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedSector === s ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`} style={selectedSector === s ? { background: '#0B2438' } : {}}>
                {s === 'all' ? T.all : getSectorLabel(s, locale)}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field sm:max-w-xs text-sm" type="search" placeholder={L('Search material…', 'مواد تلاش کریں…', 'ابحث عن مادة…')} aria-label={L('Search material', 'مواد تلاش کریں', 'ابحث عن مادة')} />
        </div>

        {/* Price Table */}
        {loadErr ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center" role="alert">
            <div className="font-bold text-red-800">{L('We could not load the prices.', 'قیمتیں لوڈ نہیں ہو سکیں۔', 'تعذّر تحميل الأسعار.')}</div>
            <button type="button" onClick={() => window.location.reload()} className="btn-navy text-sm mt-3">{L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}</button>
          </div>
        ) : loading ? (
          <div className="text-center py-20 animate-pulse text-gray-500">{L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center animate-fade-in">
            <div className="text-6xl mb-4 animate-float"><Glyph e="📊" /></div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{T.noData}</h3>
            <p className="text-sm text-gray-500">{T.noDataSub}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: '#0B2438' }}>
                    {[T.material, T.sector, T.unit, T.minPrice, T.avgPrice, T.maxPrice, T.offers].map(h => (
                      <th key={h} className="text-start px-4 py-3 text-xs font-bold text-white">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-[#0B2438]/2 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-semibold text-sm" style={{ color: '#0B2438' }}>{getProductLabel(p.name, locale)}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-blue text-[12px]">{getSectorLabel(p.sector, locale)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{getUnitLabel(p.unit, locale)}</td>
                      <td className="px-4 py-3 text-sm text-[#0B2438] font-semibold">{p.min !== null ? <>{p.min.toLocaleString('en-US')} {T.sar}</> : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-base font-bold" style={{ color: '#8F6820' }}>{p.avg?.toLocaleString('en-US')} {T.sar}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0B2438] font-semibold">{p.max !== null ? <>{p.max.toLocaleString('en-US')} {T.sar}</> : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-bold">{p.count}</span>
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
                      <div className="font-bold text-sm" style={{ color: '#0B2438' }}>{getProductLabel(p.name, locale)}</div>
                      <span className="badge badge-blue text-[12px] mt-1">{getSectorLabel(p.sector, locale)}</span>
                    </div>
                    <div className="text-end">
                      <div className="text-lg font-bold" style={{ color: '#8F6820' }}>{p.avg?.toLocaleString('en-US')}</div>
                      <div className="text-[12px] text-gray-500">{T.sar} / {getUnitLabel(p.unit, locale)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#F5F7FA] rounded-lg p-2">
                      <div className="text-[#0B2438] font-semibold">{p.min !== null ? p.min.toLocaleString('en-US') : '—'}</div>
                      <div className="text-gray-400 text-[12px]">{T.minPrice}</div>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: '#D4A54315' }}>
                      <div className="font-bold" style={{ color: '#8F6820' }}>{p.avg?.toLocaleString('en-US')}</div>
                      <div className="text-gray-400 text-[12px]">{T.avgPrice}</div>
                    </div>
                    <div className="bg-[#F5F7FA] rounded-lg p-2">
                      <div className="text-[#0B2438] font-semibold">{p.max !== null ? p.max.toLocaleString('en-US') : '—'}</div>
                      <div className="text-gray-400 text-[12px]">{T.maxPrice}</div>
                    </div>
                  </div>
                  <div className="text-[12px] text-gray-400 mt-2 text-center">{p.count} {T.offers}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
