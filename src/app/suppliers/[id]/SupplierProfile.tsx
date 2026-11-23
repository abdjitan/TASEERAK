'use client'
// Public supplier profile body, translated (UX-115). Honest numbers (UX-115): «requests won», not
// «completed deals», and the score is named «درجة الموثوقية» as on the leaderboard.
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { getRegionLabel } from '@/types'
import { scoreColor, approvalLabel } from '@/lib/supplierScore'
import { tierLabel, tierIcon } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'

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

  return (
    <main className="max-w-3xl mx-auto px-4 py-8" dir={dir}>
      <Link href="/suppliers" className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-[#0B2438] hover:underline">
        <span aria-hidden className="inline-block ltr:rotate-180">→</span> {L('Supplier leaderboard', 'سپلائرز کی درجہ بندی', 'لوحة شرف الموردين')}
      </Link>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 shrink-0 grid place-items-center rounded-2xl text-2xl text-[#F5C55B]" style={{ background: '#0B2438' }}><Glyph e="🏢" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold" style={{ color: '#0B2438' }}>{name}</h1>
              {s.verification_status === 'verified' && (
                <span className="badge text-[12px] inline-flex items-center gap-0.5" style={{ background: '#0F6E5614', color: '#0F6E56' }}>
                  <Check className="w-3 h-3" aria-hidden />{s.cr_verification_source === 'wathq' ? L('Verified through Wathq', 'واثق کے ذریعے تصدیق شدہ', 'موثّق عبر واثق') : L('Verified', 'تصدیق شدہ', 'موثّق')}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-3 flex-wrap">
              <span><SellerIcon name={s.supplier_tier ? tierIcon(s.supplier_tier) : 'store'} /> {s.supplier_tier ? tierLabel(s.supplier_tier, lc) : L('Supplier', 'سپلائر', 'مورد')}</span>
              {s.region && <span><Glyph e="📍" /> {getRegionLabel(s.region, locale)}{s.city ? ` · ${s.city}` : ''}</span>}
            </div>
          </div>
          <div className="shrink-0 text-center">
            <div className="w-16 h-16 grid place-items-center rounded-full font-bold text-lg" style={{ background: scoreColor(score), color: scoreText(score) }}>{score}<span className="text-[12px] opacity-80">/100</span></div>
            <div className="text-[12px] text-gray-600 mt-1">{L('Reliability score', 'اعتماد کا اسکور', 'درجة الموثوقية')}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { l: L('Rating', 'ریٹنگ', 'التقييم'), v: rating > 0 ? rating.toFixed(1) : '—', sub: s.rating_count ? L(`${s.rating_count} ratings`, `${s.rating_count} ریٹنگز`, `${s.rating_count} تقييم`) : '' },
            { l: L('Offers', 'آفرز', 'العروض'), v: total.toLocaleString('en-US'), sub: L('offers sent', 'بھیجی گئی آفرز', 'عرض مقدَّم') },
            { l: L('Won', 'جیتی گئی', 'الفوز'), v: won.toLocaleString('en-US'), sub: L('requests won', 'جیتی گئی درخواستیں', 'طلب فاز به') },
          ].map((k: any) => (
            <div key={k.l} className="rounded-xl bg-[#f7f8fa] p-3 text-center">
              <div className="text-lg font-extrabold" style={{ color: '#0B2438' }}>{k.v}</div>
              <div className="text-[12px] text-gray-600">{k.l}</div>
              {k.sub && <div className="text-[12px] text-gray-600">{k.sub}</div>}
            </div>
          ))}
        </div>

        {Array.isArray(s.approvals) && s.approvals.length > 0 && (
          <div className="mt-5">
            <div className="text-[13px] font-bold text-gray-700 mb-2"><Glyph e="🏅" /> {L('Approvals from major bodies', 'بڑے اداروں کی منظوریاں', 'اعتمادات جهات كبرى')}</div>
            <div className="flex gap-1.5 flex-wrap">
              {s.approvals.map((a: string) => <span key={a} className="text-[12px] px-2 py-1 rounded-lg" style={{ background: '#0B24380d', color: '#0B2438' }}><Glyph e="🏅" /> {approvalLabel(a)}</span>)}
            </div>
          </div>
        )}

        {Array.isArray(s.recent_reviews) && s.recent_reviews.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="text-[13px] font-bold text-gray-700 mb-3"><Glyph e="💬" /> {L('What buyers say', 'خریداروں کی رائے', 'آراء المشترين')}</div>
            <div className="space-y-3">
              {s.recent_reviews.map((rv: any, i: number) => (
                <div key={i} className="rounded-xl bg-[#f7f8fa] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-sm font-bold text-[#0B2438]" aria-label={L(`${rv.rating} out of 5`, `5 میں سے ${rv.rating}`, `${rv.rating} من 5`)}>
                      <span className="text-[#D4A543]"><Glyph e="⭐" /></span> {rv.rating}/5
                    </div>
                    {rv.created_at && <span className="text-[12px] text-gray-600">{new Date(rv.created_at).toLocaleDateString(dateLocale)}</span>}
                  </div>
                  {rv.comment && <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{rv.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 mb-3">{L(`Send a price request: ${name} and other suppliers compete for it.`, `قیمت کی درخواست بھیجیں: ${name} اور دوسرے سپلائرز اس پر مقابلہ کریں گے۔`, `اطلب تسعيرة ينافس عليها ${name} وغيره من الموردين.`)}</p>
          <Link href="/login" className="btn-orange text-sm">{L('Request a price for free', 'مفت قیمت معلوم کریں', 'اطلب تسعيرة مجاناً')}</Link>
        </div>
      </div>
      {s.member_since && <p className="text-center text-[12px] text-gray-600 mt-6">{L('Member since', 'رکن از', 'عضو منذ')} {new Date(s.member_since).toLocaleDateString(dateLocale)}</p>}
    </main>
  )
}
