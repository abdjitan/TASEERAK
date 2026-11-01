'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS } from '@/types'
import Glyph from '@/components/shared/Glyph'

// أداء المورّد: قمع (عرض → فوز/خسارة/انتظار) + نسبة الفوز حسب القطاع + اتجاه شهري.
// بيانات المورّد نفسه فقط — لا أسعار منافسين (H2). المصدر: get_my_supplier_analytics().
export default function SupplierAnalyticsPage() {
  const { locale, dir } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [a, setA] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data } = await supabase.rpc('get_my_supplier_analytics')
      setA(data || {})
      setLoading(false)
    })()
  }, [])

  if (loading) return <PageLoader />
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const nav = getNav('supplier', locale, '/supplier/analytics')

  const won = Number(a?.won) || 0
  const lost = Number(a?.lost) || 0
  const pending = Number(a?.pending) || 0
  const totalOffers = Number(a?.total_offers) || 0
  const participated = Number(a?.participated) || 0
  const decided = won + lost
  const winRate = decided ? Math.round((won / decided) * 100) : 0
  const sectors: any[] = Array.isArray(a?.by_sector) ? a.by_sector : []
  const monthly: any[] = Array.isArray(a?.monthly) ? a.monthly : []
  const maxMonthOffers = Math.max(1, ...monthly.map((m: any) => Number(m.offers) || 0))
  const sl = (s: string) => (SECTOR_LABELS as any)[s] || s

  const cards = [
    { label: L('Offers submitted', 'جمع کرائی گئی آفرز', 'العروض المقدَّمة'), value: totalOffers, color: '#0B2438' },
    { label: L('Won', 'جیتی گئیں', 'مكسوبة'), value: won, color: '#0F6E56' },
    { label: L('Lost', 'ہاری گئیں', 'خاسرة'), value: lost, color: '#b91c1c' },
    { label: L('Pending', 'زیرِ التوا', 'قيد الانتظار'), value: pending, color: '#8F6820' },
  ]

  return (
    <AppShell title={L('Performance', 'میری کارکردگی', 'أدائي')} nav={nav} dir={dir}>
      <div className="max-w-4xl mx-auto">
        {totalOffers === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3"><Glyph e="🏆" /></div>
            <p className="font-bold text-gray-700 mb-1">{L('No offers yet', 'ابھی کوئی آفر نہیں', 'لا توجد عروض بعد')}</p>
            <p className="text-sm text-gray-400">{L('Submit offers on requests and your win/loss stats will appear here.', 'درخواستوں پر آفرز دیں، آپ کی جیت اور ہار کے اعداد و شمار یہاں نظر آئیں گے۔', 'قدّم عروضاً على الطلبات وستظهر إحصاءات الفوز والخسارة هنا.')}</p>
          </div>
        ) : (
          <>
            {/* نسبة الفوز */}
            <div className="rounded-2xl p-5 mb-4 text-white flex items-center justify-between" style={{ background: 'linear-gradient(120deg,#0B2438,#0F6E56)' }}>
              <div>
                <div className="text-sm text-blue-50">{L('Win rate', 'جیت کی شرح', 'نسبة الفوز')}</div>
                <div className="text-4xl font-extrabold mt-1">{winRate}%</div>
                <div className="text-[12px] text-blue-100 mt-1">{L(`${won} won of ${decided} decided`, `${decided} طے شدہ میں سے ${won} جیتیں`, `${won} من ${decided} محسومة`)}</div>
              </div>
              <div className="text-6xl opacity-30"><Glyph e="🏆" /></div>
            </div>

            {/* بطاقات القمع */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {cards.map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <div className="text-2xl font-extrabold" style={{ color: c.color }}>{c.value.toLocaleString('en-US')}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            {/* حسب القطاع */}
            {sectors.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                <div className="text-sm font-bold mb-3" style={{ color: '#0B2438' }}><Glyph e="📊" /> {L('Win rate by sector', 'شعبے کے لحاظ سے جیت کی شرح', 'نسبة الفوز حسب القطاع')}</div>
                <div className="space-y-3">
                  {sectors.map((s: any) => {
                    const t = Number(s.total) || 0, w = Number(s.won) || 0, l = Number(s.lost) || 0
                    const dec = w + l
                    const rate = dec ? Math.round((w / dec) * 100) : 0
                    const pct = (n: number) => t ? `${(n / t) * 100}%` : '0%'
                    return (
                      <div key={s.sector}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-700">{sl(s.sector)}</span>
                          <span className="text-gray-400">{dec ? `${rate}% ${L('win', 'جیت', 'فوز')}` : L('undecided', 'غیر طے شدہ', 'قيد الحسم')} · {L(`${t} total`, `کل ${t}`, `الإجمالي ${t}`)}</span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden bg-gray-100 flex">
                          <div style={{ width: pct(w), background: '#0F6E56' }} title={L('Won', 'جیتی گئیں', 'مكسوبة')} />
                          <div style={{ width: pct(l), background: '#b91c1c' }} title={L('Lost', 'ہاری گئیں', 'خاسرة')} />
                          <div style={{ width: pct(t - w - l), background: '#e5e7eb' }} title={L('Pending', 'زیرِ التوا', 'قيد الانتظار')} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#0F6E56' }} />{L('Won', 'جیتی گئیں', 'مكسوبة')}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#b91c1c' }} />{L('Lost', 'ہاری گئیں', 'خاسرة')}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#e5e7eb' }} />{L('Pending', 'زیرِ التوا', 'قيد الانتظار')}</span>
                </div>
              </div>
            )}

            {/* الاتجاه الشهري */}
            {monthly.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="text-sm font-bold mb-4" style={{ color: '#0B2438' }}><Glyph e="📈" /> {L('Last 6 months', 'پچھلے چھ مہینے', 'آخر ستة أشهر')}</div>
                <div className="flex items-end justify-around gap-2 h-36">
                  {monthly.map((m: any) => {
                    const offs = Number(m.offers) || 0, w = Number(m.won) || 0
                    const h = Math.round((offs / maxMonthOffers) * 100)
                    const wh = offs ? Math.round((w / offs) * h) : 0
                    return (
                      <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                        <div className="text-[10px] font-bold text-gray-500">{offs}</div>
                        <div className="w-full max-w-[42px] rounded-t-md relative flex flex-col justify-end" style={{ height: '100px' }}>
                          <div className="w-full rounded-t-md bg-[#0B2438]/15 relative" style={{ height: `${h}%` }}>
                            <div className="absolute bottom-0 left-0 right-0 rounded-t-md" style={{ height: `${wh}%`, background: '#0F6E56' }} title={`${w} ${L('won', 'جیتیں', 'فوز')}`} />
                          </div>
                        </div>
                        <div className="text-[9px] text-gray-400" dir="ltr">{m.month}</div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400 justify-center">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#0B243826' }} />{L('Offers', 'آفرز', 'العروض')}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#0F6E56' }} />{L('Won', 'جیتی گئیں', 'مكسوبة')}</span>
                </div>
              </div>
            )}

            <p className="text-center text-[11px] text-gray-400 mt-5">{L('Based on your own offers only. Competitor prices are never shown.', 'صرف آپ کی اپنی آفرز کی بنیاد پر۔ حریفوں کی قیمتیں کبھی نہیں دکھائی جاتیں۔', 'محسوبة من عروضك أنت فقط، ولا تُعرض أسعار المنافسين إطلاقاً.')}</p>
          </>
        )}
      </div>
    </AppShell>
  )
}
