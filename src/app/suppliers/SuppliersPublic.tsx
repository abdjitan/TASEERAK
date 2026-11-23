'use client'
// The public suppliers page body, translated (UX-115). Registered suppliers and the directory of
// businesses that have not joined are counted separately (UX-022), the directory shows no Google
// ratings, and every listed business can register or ask to be removed.
import Link from 'next/link'
import { useTranslation } from '@/i18n'
import { getRegionLabel } from '@/types'
import { OPERATOR } from '@/lib/legal'
import Glyph from '@/components/shared/Glyph'
import SuppliersDirectory from './SuppliersDirectory'

export default function SuppliersPublic({ ranked, listings }: { ranked: any[]; listings: any[] }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const verifiedCount = ranked.filter((r: any) => r.verification_status === 'verified').length
  const removeHref = (name: string) => `mailto:${OPERATOR.email}?subject=${encodeURIComponent(L('Directory removal request', 'ڈائریکٹری سے ہٹانے کی درخواست', 'طلب إزالة من الدليل'))}&body=${encodeURIComponent(name)}`

  return (
    <main className="max-w-4xl mx-auto px-4 py-8" dir={dir}>
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: '#0B2438' }}><span className="text-[#8F6820]"><Glyph e="🏆" /></span> {L('Supplier leaderboard', 'سپلائرز کی درجہ بندی', 'لوحة شرف الموردين')}</h1>
        <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
          {L('Building-materials suppliers on Taseerak, ranked by verification, rating and requests won. Each supplier gets a reliability score out of 100.',
            'تسعیرک پر تعمیراتی سامان کے سپلائرز، تصدیق، ریٹنگ اور جیتی گئی درخواستوں کے لحاظ سے۔ ہر سپلائر کو 100 میں سے اعتماد کا اسکور ملتا ہے۔',
            'موردون لمواد البناء على منصة تسعيرك، مرتّبون حسب التوثيق والتقييم والطلبات التي فازوا بها. لكل مورد «درجة موثوقية» من 100.')}
        </p>
        {ranked.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4 text-[13px] text-gray-600">
            <span><Glyph e="👥" /> {L(`${ranked.length} suppliers on the platform`, `پلیٹ فارم پر ${ranked.length} سپلائرز`, `${ranked.length} مورد على المنصة`)}</span>
            {verifiedCount > 0 && <span><Glyph e="✅" /> {L(`${verifiedCount} verified`, `${verifiedCount} تصدیق شدہ`, `${verifiedCount} موثّق`)}</span>}
          </div>
        )}
      </div>

      {ranked.length === 0 && listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3 text-[#0B2438]"><Glyph e="🏗" /></div>
          <p className="font-bold text-gray-800 mb-1">{L('Coming soon', 'جلد آ رہا ہے', 'قريباً')}</p>
          <p className="text-sm text-gray-600">{L('The top-rated suppliers will appear here once deals start on the platform. You can already send a price request.', 'پلیٹ فارم پر سودے شروع ہوتے ہی یہاں سب سے زیادہ ریٹنگ والے سپلائرز نظر آئیں گے۔ آپ ابھی قیمت کی درخواست بھیج سکتے ہیں۔', 'سيظهر هنا الموردون الأعلى تقييماً بمجرد بدء الصفقات على المنصة. ويمكنك الآن إرسال طلب تسعير.')}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link href="/contractor/rfq/quick" className="btn-orange text-sm">{L('Request a price', 'قیمت معلوم کریں', 'اطلب تسعيرة')}</Link>
            <Link href="/join" className="btn-ghost text-sm">{L('Sign up as a supplier', 'سپلائر کے طور پر رجسٹر کریں', 'سجّل كمورد')}</Link>
          </div>
        </div>
      ) : (
        <>
          {ranked.length > 0 && <SuppliersDirectory suppliers={ranked} />}
          {listings.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-bold mb-1" style={{ color: '#0B2438' }}>{L('Businesses in our directory (not on the platform yet)', 'ہماری ڈائریکٹری میں کاروبار (ابھی پلیٹ فارم پر نہیں)', 'منشآت في دليلنا (لم تنضم إلى المنصة بعد)')}</h2>
              <p className="text-[13px] text-gray-600 mb-3 leading-relaxed">
                {L('Known businesses in the market that have not registered. They are not counted with the suppliers above.', 'مارکیٹ کے معروف کاروبار جو ابھی رجسٹر نہیں ہوئے۔ یہ اوپر والے سپلائرز میں شمار نہیں ہوتے۔', 'منشآت معروفة في السوق لم تسجّل بعد، ولا تُحسب مع الموردين أعلاه.')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listings.map((l: any) => (
                  <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-800 truncate">{l.name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[12px] text-gray-600">
                          {l.category && <span className="badge badge-gray text-[12px]">{l.category}</span>}
                          {l.region && <span><Glyph e="📍" /> {getRegionLabel(l.region, locale)}{l.city ? ` · ${l.city}` : ''}</span>}
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-gray-600 whitespace-nowrap border border-gray-200 rounded-lg px-2 py-1">{L('Not joined yet', 'ابھی شامل نہیں', 'لم ينضم بعد')}</span>
                    </div>
                    <div className="mt-2 text-[13px] text-gray-600 flex flex-wrap items-center gap-x-3">
                      <span>{L('Is this your business?', 'کیا یہ آپ کا کاروبار ہے؟', 'هل هذا نشاطك؟')}</span>
                      <Link href="/join" className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('Register it', 'اسے رجسٹر کریں', 'سجّله')}</Link>
                      <a href={removeHref(l.name || '')} className="inline-flex items-center min-h-[44px] font-bold text-[#0B2438] hover:underline">{L('Ask for removal', 'ہٹانے کی درخواست کریں', 'اطلب إزالته')}</a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="text-center text-[12px] text-gray-600 mt-8 leading-relaxed">
        {L('The score comes from: verification through Wathq, rating, the share of offers won, and activity. It updates automatically.', 'اسکور ان سے بنتا ہے: واثق کے ذریعے تصدیق، ریٹنگ، جیتی گئی آفرز کا تناسب اور سرگرمی۔ یہ خود بخود اپڈیٹ ہوتا ہے۔', 'تُحسب الدرجة من: التوثيق عبر واثق، والتقييم، ونسبة العروض الفائزة، والنشاط. وتتحدّث تلقائياً.')}
      </p>
    </main>
  )
}
