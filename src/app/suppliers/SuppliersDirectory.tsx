'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { scoreColor, approvalLabel, isNewSupplier } from '@/lib/supplierScore'
import { normalizeText } from '@/lib/normalize'
import { arCount } from '@/lib/text'
import { SECTOR_LABELS, getSectorLabel, getRegionLabel } from '@/types'
import { useTranslation } from '@/i18n'
import { Check, X } from 'lucide-react'
import { TIERS, tierLabel, normTier, tierIcon } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { FEATURES } from '@/lib/features'

// دليل الموردين مع بحث وفلاتر (منطقة/قطاع/نوع/موثّق) — يستقبل القائمة مُرتّبة
// ومحسوبة الدرجة من صفحة الخادم ويُصفّيها في المتصفح (قائمة محدودة).

function rankBadge(i: number) {
  // brand colours (round-7 UX-175)
  if (i === 0) return { e: <Glyph e="🥇" />, c: '#D4A543' }
  if (i === 1) return { e: <Glyph e="🥈" />, c: '#728196' }
  if (i === 2) return { e: <Glyph e="🥉" />, c: '#9D7425' }
  return { e: `${i + 1}`, c: '#0B2438' }
}

const selectCls = 'border border-gray-200 rounded-xl px-2 min-h-[44px] text-sm outline-none focus:border-[#D4A543] bg-white text-gray-700'
// text on the score circle: navy on gold/grey, white only on green (white on gold was ~2:1, UX-103)
const scoreText = (s: number) => (s >= 75 ? '#fff' : '#071827')

export default function SuppliersDirectory({ suppliers }: { suppliers: any[] }) {
  const { locale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const lc = (locale === 'en' || locale === 'ur' ? locale : 'ar') as any
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const [sector, setSector] = useState('')
  const [tier, setTier] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const regions = useMemo(() => Array.from(new Set(suppliers.map((s: any) => s.region).filter(Boolean))).sort() as string[], [suppliers])

  const filtered = useMemo(() => {
    // tolerant search (hamza/alef, ة/ه …), UX-104
    const needle = normalizeText(q.trim())
    return suppliers.filter((s: any) =>
      (needle === '' || normalizeText(s.company_name_ar || '').includes(needle)) &&
      (region === '' || s.region === region) &&
      (sector === '' || (Array.isArray(s.sectors) && s.sectors.includes(sector))) &&
      (tier === '' || (s.supplier_tier && normTier(s.supplier_tier) === tier)) &&
      (!verifiedOnly || s.verification_status === 'verified')
    )
  }, [suppliers, q, region, sector, tier, verifiedOnly])

  // the medals follow the overall ranking, not the position inside a filtered list (UX-104)
  const rankOf = useMemo(() => { const m = new Map<any, number>(); suppliers.forEach((s: any, i: number) => m.set(s.supplier_id, i)); return m }, [suppliers])
  const anyFilter = !!(q || region || sector || tier || verifiedOnly)
  const clear = () => { setQ(''); setRegion(''); setSector(''); setTier(''); setVerifiedOnly(false) }

  // (UX-003) no real company/shop listed yet: a calm «coming soon» instead of empty filters
  if (suppliers.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
      <div className="text-3xl mb-2 text-[#0B2438]"><Glyph e="🏪" /></div>
      <p className="font-bold text-[#0B2438] mb-1">{L('Supplier directory coming soon', 'سپلائر ڈائریکٹری جلد', 'دليل الموردين قريباً')}</p>
      <p className="text-sm text-gray-600">{L('Verified companies and shops appear here as soon as they join. You can already send a price request; it reaches the suppliers of your materials.', 'تصدیق شدہ کمپنیاں اور دکانیں شامل ہوتے ہی یہاں نظر آئیں گی۔ آپ ابھی قیمت کی درخواست بھیج سکتے ہیں۔', 'نعرض هنا الشركات والمحلات الموثّقة فور انضمامها. يمكنك الآن إرسال طلب تسعير، فيصل إلى الموردين المختصين بموادك.')}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <a href="/contractor/rfq/quick" className="btn-orange text-sm">{L('Start now for free', 'ابھی مفت شروع کریں', 'ابدأ الآن مجاناً')}</a>
        <a href="/join" className="btn-ghost text-sm">{L('Sign up as a supplier', 'سپلائر کے طور پر رجسٹر کریں', 'سجّل كمورد')}</a>
      </div>
    </div>
  )

  return (
    <>
      {/* الفلاتر */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder={L('Search by supplier name…', 'سپلائر کے نام سے تلاش کریں…', 'ابحث باسم المورد…')} aria-label={L('Search by supplier name', 'سپلائر کے نام سے تلاش', 'ابحث باسم المورد')}
          className="w-full border border-gray-200 rounded-xl px-3 min-h-[44px] text-sm outline-none focus:border-[#D4A543] mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={region} onChange={(e: any) => setRegion(e.target.value)} className={selectCls} aria-label={L('Region', 'علاقہ', 'المنطقة')}>
            <option value="">{L('All regions', 'تمام علاقے', 'كل المناطق')}</option>
            {regions.map((r) => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
          </select>
          <select value={sector} onChange={(e: any) => setSector(e.target.value)} className={selectCls} aria-label={L('Sector', 'سیکٹر', 'القطاع')}>
            <option value="">{L('All sectors', 'تمام سیکٹر', 'كل القطاعات')}</option>
            {Object.keys(SECTOR_LABELS).map((k) => <option key={k} value={k}>{getSectorLabel(k, locale)}</option>)}
          </select>
          <select value={tier} onChange={(e: any) => setTier(e.target.value)} className={selectCls} aria-label={L('Type', 'قسم', 'النوع')}>
            <option value="">{L('All types', 'تمام اقسام', 'كل الأنواع')}</option>
            {TIERS.map(t => <option key={t} value={t}>{tierLabel(t, lc, false)}</option>)}
          </select>
          <button type="button" onClick={() => setVerifiedOnly((v) => !v)} aria-pressed={verifiedOnly}
            className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 min-h-[44px] text-sm font-semibold border transition-colors ${verifiedOnly ? 'bg-[#D4A543]/15 text-[#071827] border-[#D4A543]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#D4A543]/60'}`}>
            <Check className="w-4 h-4" aria-hidden /> {L('Verified only', 'صرف تصدیق شدہ', 'الموثّقون فقط')}
          </button>
        </div>
        {anyFilter && (
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-gray-600">{L(`${filtered.length} results`, `${filtered.length} نتائج`, arCount(filtered.length, 'نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة'))}</span>
            <button onClick={clear} className="inline-flex items-center gap-1 min-h-[44px] text-[#8F6820] font-bold hover:underline">{L('Clear filters', 'فلٹر صاف کریں', 'مسح الفلاتر')} <X className="w-3.5 h-3.5" aria-hidden /></button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="text-3xl mb-2"><Glyph e="🔍" /></div>
          <p className="font-bold text-gray-700 mb-1">{L('No matching supplier', 'کوئی مماثل سپلائر نہیں', 'لا يوجد مورد مطابق')}</p>
          <p className="text-sm text-gray-600">{L('Try wider filters or clear them.', 'فلٹر وسیع کریں یا صاف کریں۔', 'جرّب توسيع الفلاتر أو مسحها.')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any, i: number) => {
            const fresh = isNewSupplier(r)
            const rb = FEATURES.gamification && !fresh ? rankBadge(rankOf.get(r.supplier_id) ?? i) : null
            const nOffers = Number(r.total_offers) || 0
            const nWon = Number(r.won_deals) || 0
            const rating = Number(r.rating_avg) || 0
            return (
              <Link key={r.supplier_id} href={`/suppliers/${r.supplier_id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-[#D4A543]/40 transition-colors">
                {rb
                  ? <div className="w-10 h-10 shrink-0 grid place-items-center rounded-xl font-extrabold text-lg" style={{ color: rb.c, background: `${rb.c}14` }}>{rb.e}</div>
                  : <div className="w-10 h-10 shrink-0 grid place-items-center rounded-xl text-lg text-[#0B2438] bg-[#0B2438]/5" aria-hidden><SellerIcon name={r.supplier_tier ? tierIcon(r.supplier_tier) : 'store'} /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{r.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</span>
                    {r.verification_status === 'verified' && <span className="badge text-[12px] inline-flex items-center gap-0.5" style={{ background: '#0F6E5614', color: '#0F6E56' }}><Check className="w-3 h-3" aria-hidden />{L('Verified', 'تصدیق شدہ', 'موثّق')}</span>}
                  </div>
                  <div className="text-[12px] text-gray-600 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span><SellerIcon name={r.supplier_tier ? tierIcon(r.supplier_tier) : 'store'} /> {r.supplier_tier ? tierLabel(r.supplier_tier, lc) : L('Supplier', 'سپلائر', 'مورد')}</span>
                    {r.region && <span><Glyph e="📍" /> {getRegionLabel(r.region, locale)}</span>}
                    {rating > 0 && <span><Glyph e="⭐" /> {rating.toFixed(1)}</span>}
                    <span><Glyph e="📦" /> {L(nOffers === 1 ? '1 offer' : `${nOffers} offers`, `${nOffers} آفرز`, arCount(nOffers, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً'))}</span>
                    <span><SellerIcon name="handshake" /> {L(nWon === 0 ? 'No request won yet' : nWon === 1 ? '1 request won' : `${nWon} requests won`, nWon === 0 ? 'ابھی کوئی درخواست نہیں جیتی' : `${nWon} جیتی گئی درخواستیں`, nWon === 0 ? 'لم يفز بطلب بعد' : (nWon <= 2 ? 'فاز ب' : 'فاز بـ') + arCount(nWon, 'طلب واحد', 'طلبين', 'طلبات', 'طلباً'))}</span>
                  </div>
                  {Array.isArray(r.approvals) && r.approvals.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {r.approvals.slice(0, 4).map((a: string) => (
                        <span key={a} className="text-[12px] px-1.5 py-0.5 rounded" style={{ background: '#0B24380d', color: '#0B2438' }}><Glyph e="🏅" /> {approvalLabel(a, locale)}</span>
                      ))}
                    </div>
                  )}
                </div>
                {fresh ? (
                  <div className="shrink-0 text-center">
                    <span className="inline-flex items-center rounded-full px-3 min-h-[32px] text-[12px] font-bold" style={{ background: '#EEF2F6', color: '#0B2438' }}>{L('New on the platform', 'پلیٹ فارم پر نیا', 'جديد على المنصة')}</span>
                  </div>
                ) : FEATURES.gamification ? (
                /* the score out of 100 shows only with the leaderboard (off at launch, round-6 UX-079) */
                <div className="shrink-0 text-center">
                  <div className="w-14 h-14 grid place-items-center rounded-full font-extrabold text-lg" style={{ background: scoreColor(r.score), color: scoreText(r.score) }}>{r.score}</div>
                  <div className="text-[12px] text-gray-600 mt-1">{L('Reliability / 100', 'اعتماد / 100', 'الموثوقية من 100')}</div>
                </div>
                ) : null}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
