'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS } from '@/types'
import Glyph from '@/components/shared/Glyph'
import LoadError from '@/components/shared/LoadError'
import { arCount } from '@/lib/text'
import Link from 'next/link'

// أداء المورّد: قمع (عرض → فوز/خسارة/انتظار) + نسبة الفوز حسب القطاع + اتجاه شهري.
// بيانات المورّد نفسه فقط — لا أسعار منافسين (H2). المصدر: get_my_supplier_analytics().
export default function SupplierAnalyticsPage() {
  const { locale, dir } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [a, setA] = useState<any>(null)
  const [failed, setFailed] = useState(false) // UX-083: a failed load is never «no offers yet»

  async function load() {
    setFailed(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data, error } = await supabase.rpc('get_my_supplier_analytics')
      if (error) throw error
      setA(data || {})
    } catch (e) {
      console.error('[supplier/analytics] load failed:', e)
      setFailed(true)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageLoader />
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const nav = getNav('supplier', locale, '/supplier/analytics')

  // UX-017 (migration 269): counted per offer for the company (acting_uid); cancelled / expired requests are
  // «ended without a choice», outside the win rate, which is won / (won + lost) like the home card
  const won = Number(a?.won) || 0
  const lost = Number(a?.lost) || 0
  const pending = Number(a?.pending) || 0
  const endedNoChoice = Number(a?.ended_no_choice ?? ((Number(a?.cancelled) || 0) + (Number(a?.expired) || 0))) || 0
  const totalOffers = Number(a?.total_offers) || 0
  const decided = won + lost
  const winRate: number | null = a?.win_rate != null ? Math.round(Number(a.win_rate)) /* round-5 UX-169: already a percent (migration 269) */ : decided ? Math.round((won / decided) * 100) : null
  const sectors: any[] = Array.isArray(a?.by_sector) ? a.by_sector : []
  const monthly: any[] = Array.isArray(a?.monthly) ? a.monthly : []
  // UX-144: sector names in the reader's language
  const SEC_EN: Record<string, string> = { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'General supplies' }
  const SEC_UR: Record<string, string> = { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'عام سامان' }
  const SEC_AR: Record<string, string> = { ...(SECTOR_LABELS as any), mechanical: 'ميكانيكا', supply_store: 'مستلزمات عامة' }
  const sl = (s: string) => (locale === 'en' ? SEC_EN : locale === 'ur' ? SEC_UR : SEC_AR)[s] || s
  // UX-034: «2026-11» → «نوفمبر 2026» in the reader's language (never ISO)
  const monthLabel = (m: string) => { const [y, mo] = String(m || '').split('-').map(Number); if (!y || !mo) return m; return new Date(y, mo - 1, 1).toLocaleDateString(locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK' : 'ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' }) }

  const cards = [
    { label: L('Offers submitted', 'جمع کرائی گئی آفرز', 'العروض المقدَّمة'), value: totalOffers, color: '#0B2438' },
    { label: L('Chosen', 'منتخب', 'اختيرت'), value: won, color: '#0F6E56' },
    { label: L('Not chosen', 'منتخب نہیں ہوئیں', 'لم تُختر'), value: lost, color: '#5B6B7C' },
    { label: L('Waiting for the buyer', 'خریدار کے فیصلے کی منتظر', 'بانتظار قرار المشتري'), value: pending, color: '#8F6820' },
    { label: L('Ended without a choice', 'کسی انتخاب کے بغیر ختم', 'انتهت دون اختيار'), value: endedNoChoice, color: '#5B6B7C' },
  ]

  return (
    <AppShell title={L('Performance', 'میری کارکردگی', 'أدائي')} nav={nav} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <h1 className="sr-only">{L('Performance', 'میری کارکردگی', 'أدائي')}</h1>
        {failed && <LoadError onRetry={() => { setLoading(true); load() }} className="mb-4" />}
        {failed ? null : totalOffers === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3"><Glyph e="🏆" /></div>
            <p className="font-bold text-gray-700 mb-1">{L('No offers yet', 'ابھی کوئی آفر نہیں', 'لا توجد عروض بعد')}</p>
            <p className="text-sm text-gray-500">{L('Submit offers on requests and your results will appear here.', 'درخواستوں پر آفرز دیں، آپ کے نتائج یہاں نظر آئیں گے۔', 'قدّم عروضاً على الطلبات وستظهر نتائجك هنا.')}</p>
            <Link href="/supplier/dashboard" className="inline-flex items-center justify-center mt-4 min-h-[44px] px-5 rounded-xl font-extrabold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Price the open requests', 'کھلی درخواستوں کی قیمت دیں', 'سعّر الطلبات المفتوحة')}</Link>
          </div>
        ) : (
          <>
            {/* نسبة الفوز — خلفية كحلية (UX-034) */}
            <div className="rounded-2xl p-5 mb-4 text-white flex items-center justify-between" style={{ background: 'linear-gradient(120deg,#071827,#0B2438)' }}>
              <div>
                <div className="text-sm text-white/80">{L('Win rate', 'جیت کی شرح', 'نسبة الفوز')}</div>
                <div className="text-4xl font-extrabold mt-1">{winRate != null ? `${winRate}%` : '—'}</div>
                <div className="text-[13px] text-white/80 mt-1">{decided ? L(`Chosen in ${won} of ${decided} decided offers`, `${decided} فیصلہ شدہ آفرز میں سے ${won} منتخب`, `اختيرت ${won} من ${arCount(decided, 'عرض واحد', 'عرضين', 'عروض', 'عرضاً')} حُسمت`) : L('No decided offers yet', 'ابھی کوئی آفر فیصلہ شدہ نہیں', 'لم يُحسم أي عرض بعد')}</div>
                {endedNoChoice > 0 && <div className="text-[12px] text-white/70 mt-0.5">{L('Requests that ended without a choice are not counted.', 'بغیر انتخاب ختم ہونے والی درخواستیں شمار نہیں ہوتیں۔', 'لا تُحتسب الطلبات التي انتهت دون اختيار.')}</div>}
              </div>
              <div className="text-6xl opacity-30 text-[#D4A543]"><Glyph e="🏆" /></div>
            </div>

            {/* البطاقات */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              {cards.map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <div className="text-2xl font-extrabold" style={{ color: c.color }}>{c.value.toLocaleString('en-US')}</div>
                  <div className="text-[12px] text-gray-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            {/* حسب القطاع — صفوف نصية بدل الأشرطة (UX-034: لا أعمدة للموردين) */}
            {sectors.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                <h2 className="text-sm font-bold mb-3" style={{ color: '#0B2438' }}>{L('By field', 'شعبے کے لحاظ سے', 'حسب المجال')}</h2>
                <ul className="divide-y divide-gray-100">
                  {sectors.map((s: any) => {
                    const t = Number(s.total) || 0, w = Number(s.won) || 0, l = Number(s.lost) || 0
                    const dec = w + l
                    return (
                      <li key={s.sector} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-[#0B2438]">{sl(s.sector)}</span>
                        <span className="text-gray-700">{dec
                          ? L(`Chosen in ${w} of ${dec}`, `${dec} میں سے ${w} منتخب`, `اختيرت ${w} من ${dec}`)
                          : L('Waiting for the buyer', 'خریدار کے فیصلے کی منتظر', 'بانتظار قرار المشتري')}
                          <span className="text-gray-500"> · {L(`${t} offer${t === 1 ? '' : 's'}`, `${t} آفر`, arCount(t, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً'))}</span></span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* آخر ستة أشهر — صفوف نصية */}
            {monthly.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold mb-3" style={{ color: '#0B2438' }}>{L('Last 6 months', 'پچھلے چھ مہینے', 'آخر ستة أشهر')}</h2>
                <ul className="divide-y divide-gray-100">
                  {monthly.map((m: any) => {
                    const offs = Number(m.offers) || 0, w = Number(m.won) || 0
                    return (
                      <li key={m.month} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-[#0B2438]">{monthLabel(m.month)}</span>
                        <span className="text-gray-700">{offs
                          ? L(`${offs} offer${offs === 1 ? '' : 's'}, ${w} chosen`, `${offs} آفر، ${w} منتخب`, `${arCount(offs, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً')}، اختير منها ${w}`)
                          : L('No offers', 'کوئی آفر نہیں', 'لا عروض')}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <p className="text-center text-[13px] text-gray-600 mt-5">{L('Buyers usually choose by price and delivery time; a complete offer with clear specifications helps.', 'خریدار عموماً قیمت اور ڈیلیوری کے وقت سے انتخاب کرتے ہیں؛ واضح تفصیلات والی مکمل آفر مدد دیتی ہے۔', 'يختار المشتري عادةً بحسب السعر ومدة التوصيل، والعرض الكامل بمواصفات واضحة يرفع فرصتك.')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/supplier/dashboard" className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-extrabold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Price the open requests', 'کھلی درخواستوں کی قیمت دیں', 'سعّر الطلبات المفتوحة')}</Link>
              <Link href="/supplier/prices" className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-bold text-sm text-[#0B2438] border border-[#0B2438]/30 bg-white">{L('Update my prices', 'میری قیمتیں اپ ڈیٹ کریں', 'حدّث أسعاري')}</Link>
            </div>
            <p className="text-center text-[12px] text-gray-500 mt-5">{L('Based on your own offers only. Competitor prices are never shown.', 'صرف آپ کی اپنی آفرز کی بنیاد پر۔ حریفوں کی قیمتیں کبھی نہیں دکھائی جاتیں۔', 'محسوبة من عروضك أنت فقط، ولا تُعرض أسعار المنافسين إطلاقاً.')}</p>
          </>
        )}
      </div>
    </AppShell>
  )
}
