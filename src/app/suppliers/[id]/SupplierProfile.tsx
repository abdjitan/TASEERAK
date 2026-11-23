'use client'
// Public supplier profile body, translated (UX-115). Honest numbers (UX-115): «requests won», not
// «completed deals», and the score is named «درجة الموثوقية» as on the leaderboard.
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Star } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { getRegionLabel } from '@/types'
import { scoreColor, approvalLabel, isNewSupplier } from '@/lib/supplierScore'
import { arCount } from '@/lib/text'
import AutoTr from '@/components/shared/AutoTr'
import { tierLabel, tierIcon } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { getSectorLabel } from '@/types'

// The rating chips, stored in Arabic at the start of the comment («نقاط القوة: …»): shown as chips in
// the reader's language, and only the free text goes to the translation (round-5 UX-035).
// Same list as the deal page; to move into src/lib/reviews.ts (shared with the app).
const REVIEW_TAGS: { key: string; ar: string; en: string; ur: string }[] = [
  { key: 'on_time', ar: 'الالتزام بالموعد', en: 'On time', ur: 'وقت کی پابندی' },
  { key: 'quality', ar: 'جودة المواد', en: 'Material quality', ur: 'سامان کا معیار' },
  { key: 'dealing', ar: 'حسن التعامل', en: 'Good dealing', ur: 'اچھا برتاؤ' },
]
function splitReview(comment: any): { tags: string[]; text: string } {
  const s = String(comment || '')
  const m = s.match(/^نقاط القوة:\s*([^\n]*)\n?/)
  if (!m) return { tags: [], text: s }
  const tags = m[1].split('،').map(x => x.trim()).map(ar => REVIEW_TAGS.find(t => t.ar === ar)?.key).filter(Boolean) as string[]
  return { tags, text: s.slice(m[0].length).trim() }
}
// a same-site path only (the deal page passes ?from=/contractor/orders/<id>), UX-070
function safeFrom(v: string | null): string | null {
  if (!v || v[0] !== '/' || v[1] === '/' || /[\\\s]/.test(v)) return null
  return /^\/(contractor|supplier)\//.test(v) ? v.slice(0, 200) : null
}

// navy text on the gold/grey score circle, white only on green (UX-103)
const scoreText = (s: number) => (s >= 75 ? '#fff' : '#071827')

export default function SupplierProfile({ s, score }: { s: any; score: number }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const lc = (locale === 'en' || locale === 'ur' ? locale : 'ar') as any
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'
  const total = Number(s.total_offers) || 0
  const won = Number(s.won_deals) || 0
  const rating = Number(s.rating_avg) || 0
  const name = s.company_name_ar || L('Supplier', 'سپلائر', 'مورد')
  const fresh = isNewSupplier(s)
  const ratingCount = Number(s.rating_count) || 0
  const router = useRouter()
  const [from, setFrom] = useState<string | null>(null)
  useEffect(() => { try { setFrom(safeFrom(new URLSearchParams(window.location.search).get('from'))) } catch {} }, [])
  const sectors: string[] = Array.isArray(s.sectors) ? s.sectors.filter(Boolean) : []

  return (
    <main className="max-w-3xl mx-auto px-4 py-8" dir={dir}>
      {/* back to the deal it was opened from; never to the directory, which is off (round-5 UX-070) */}
      {from ? (
        <Link href={from} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-[#0B2438] hover:underline">
          <span aria-hidden className="inline-block ltr:rotate-180">→</span> {L('Back to the deal', 'سودے پر واپس', 'العودة إلى الصفقة')}
        </Link>
      ) : (
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-[#0B2438] hover:underline">
          <span aria-hidden className="inline-block ltr:rotate-180">→</span> {L('Back', 'واپس', 'رجوع')}
        </button>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 shrink-0 grid place-items-center rounded-2xl text-2xl text-[#F5C55B]" style={{ background: '#0B2438' }}><SellerIcon name={s.supplier_tier ? tierIcon(s.supplier_tier) : 'store'} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold" style={{ color: '#0B2438' }}>{name}</h1>
              {s.verification_status === 'verified' && (
                <span className="badge text-[12px] inline-flex items-center gap-0.5" style={{ background: '#0F6E5614', color: '#0F6E56' }}>
                  <Check className="w-3 h-3" aria-hidden />{L('Commercial registration verified', 'تجارتی رجسٹریشن تصدیق شدہ', 'سجلّه التجاري موثّق')}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-3 flex-wrap">
              <span><SellerIcon name={s.supplier_tier ? tierIcon(s.supplier_tier) : 'store'} /> {s.supplier_tier ? tierLabel(s.supplier_tier, lc) : L('Supplier', 'سپلائر', 'مورد')}</span>
              {s.region && <span><Glyph e="📍" /> {getRegionLabel(s.region, locale)}{s.city ? ` · ${s.city}` : ''}</span>}
            </div>
          </div>
          {/* a supplier with almost no history: «new», not a low grey score (UX-104) */}
          {fresh ? (
            <div className="shrink-0 text-center">
              <span className="inline-flex items-center rounded-full px-3 min-h-[32px] text-[12px] font-bold" style={{ background: '#EEF2F6', color: '#0B2438' }}>{L('New on the platform', 'پلیٹ فارم پر نیا', 'جديد على المنصة')}</span>
            </div>
          ) : (
          <div className="shrink-0 text-center">
            <div className="w-16 h-16 grid place-items-center rounded-full font-bold text-lg" style={{ background: scoreColor(score), color: scoreText(score) }}>{score}<span className="text-[12px] opacity-80">/100</span></div>
            <div className="text-[12px] text-gray-600 mt-1">{L('Reliability score', 'اعتماد کا اسکور', 'درجة الموثوقية')}</div>
          </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { l: L('Rating', 'ریٹنگ', 'التقييم'), v: rating > 0 ? rating.toFixed(1) : '—', sub: ratingCount ? L(ratingCount === 1 ? '1 rating' : `${ratingCount} ratings`, `${ratingCount} ریٹنگز`, arCount(ratingCount, 'تقييم واحد', 'تقييمان', 'تقييمات', 'تقييماً')) : '' },
            { l: L('Offers sent', 'بھیجی گئی آفرز', 'العروض المقدَّمة'), v: total.toLocaleString('en-US'), sub: '' },
            { l: L('Requests won', 'جیتی گئی درخواستیں', 'طلبات فاز بها'), v: won.toLocaleString('en-US'), sub: '' },
          ].map((k: any) => (
            <div key={k.l} className="rounded-xl bg-[#f7f8fa] p-3 text-center">
              <div className="text-lg font-extrabold" style={{ color: '#0B2438' }}>{k.v}</div>
              <div className="text-[12px] text-gray-600">{k.l}</div>
              {k.sub && <div className="text-[12px] text-gray-600">{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* what the supplier supplies (round-5 UX-071; needs sectors in get_supplier_public) */}
        {sectors.length > 0 && (
          <div className="mt-5">
            <div className="text-[13px] font-bold text-gray-700 mb-2">{L('What they supply', 'کیا سپلائی کرتے ہیں', 'ما يورّده')}</div>
            <div className="flex gap-1.5 flex-wrap">
              {sectors.map((sc: string) => <span key={sc} className="text-[13px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#0B24380d', color: '#0B2438' }}>{getSectorLabel(sc as any, lc)}</span>)}
            </div>
          </div>
        )}

        {Array.isArray(s.approvals) && s.approvals.length > 0 && (
          <div className="mt-5">
            <div className="text-[13px] font-bold text-gray-700 mb-2"><Glyph e="🏅" /> {L('Approvals from major bodies', 'بڑے اداروں کی منظوریاں', 'اعتمادات جهات كبرى')}</div>
            <div className="flex gap-1.5 flex-wrap">
              {s.approvals.map((a: string) => <span key={a} className="text-[12px] px-2 py-1 rounded-lg" style={{ background: '#0B24380d', color: '#0B2438' }}><Glyph e="🏅" /> {approvalLabel(a, locale)}</span>)}
            </div>
          </div>
        )}

        {Array.isArray(s.recent_reviews) && s.recent_reviews.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="text-[13px] font-bold text-gray-700 mb-3"><Glyph e="💬" /> {L('What buyers say', 'خریداروں کی رائے', 'آراء المشترين')}</div>
            <div className="space-y-3">
              {s.recent_reviews.map((rv: any, i: number) => { const rvs = splitReview(rv.comment); return (
                <div key={i} className="rounded-xl bg-[#f7f8fa] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-sm font-bold text-[#0B2438]" aria-label={L(`${rv.rating} out of 5`, `5 میں سے ${rv.rating}`, `${rv.rating} من 5`)}>
                      <Star className="w-4 h-4" fill="#9D7425" stroke="#9D7425" aria-hidden /> {rv.rating}/5
                    </div>
                    {rv.created_at && <span className="text-[12px] text-gray-600">{new Date(rv.created_at).toLocaleDateString(dateLocale)}</span>}
                  </div>
                  {rvs.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      {rvs.tags.map(k => { const tg = REVIEW_TAGS.find(x => x.key === k)!; return <span key={k} className="text-[12px] px-2 py-0.5 rounded-full font-semibold bg-white border border-gray-200 text-[#0B2438]">{L(tg.en, tg.ur, tg.ar)}</span> })}
                    </div>
                  )}
                  {rvs.text && <p className="text-sm text-gray-700 mt-1.5 leading-relaxed"><AutoTr text={rvs.text} locale={locale} /></p>}
                </div>
              ) })}
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 mb-3">{L('Your request reaches this supplier if your materials are in their specialty and region. It reaches all the specialised suppliers.', 'آپ کی درخواست اس سپلائر تک پہنچتی ہے اگر آپ کا سامان اس کے شعبے اور علاقے میں ہو۔ یہ تمام ماہر سپلائرز تک پہنچتی ہے۔', 'يصل طلبك إلى هذا المورد إذا كانت موادك ضمن تخصصه وفي منطقته، ويصل إلى كل الموردين المختصين.')}</p>
          <Link href="/contractor/rfq/quick" className="btn-orange text-sm">{L('Request new prices', 'نئی قیمتیں منگوائیں', 'اطلب تسعيراً جديداً')}</Link>
        </div>
      </div>
      {s.member_since && <p className="text-center text-[12px] text-gray-600 mt-6">{L('Member since', 'رکن از', 'عضو منذ')} {new Date(s.member_since).toLocaleDateString(dateLocale)}</p>}
    </main>
  )
}
