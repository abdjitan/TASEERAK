'use client'
import { useEffect, useState } from 'react'
// The public suppliers page body, translated (UX-115). Registered suppliers and the directory of
// businesses that have not joined are counted separately (UX-022), the directory shows no Google
// ratings, and every listed business can register or ask to be removed.
import Link from 'next/link'
import { useTranslation } from '@/i18n'
import { getRegionLabel } from '@/types'
import { OPERATOR } from '@/lib/legal'
import Glyph from '@/components/shared/Glyph'
import SuppliersDirectory from './SuppliersDirectory'
import { FEATURES } from '@/lib/features'
import { arCount } from '@/lib/text'

export default function SuppliersPublic({ ranked, listings }: { ranked: any[]; listings: any[] }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const verifiedCount = ranked.filter((r: any) => r.verification_status === 'verified').length
  // nothing to list yet: the page says «coming soon» once, at the top, instead of promising first (round-6 UX-138)
  const empty = ranked.length === 0 && listings.length === 0
  // a signed-in seller is not invited to sign up again (round-8 UX-125): the role this device last showed
  const [roleHint, setRoleHint] = useState<string | null>(null)
  useEffect(() => { try { setRoleHint(localStorage.getItem('tsk_role_hint')) } catch {} }, [])
  const removeHref = (name: string) => `mailto:${OPERATOR.email}?subject=${encodeURIComponent(L('Directory removal request', 'ڈائریکٹری سے ہٹانے کی درخواست', 'طلب إزالة من الدليل'))}&body=${encodeURIComponent(name)}`

  return (
    <main className="max-w-4xl mx-auto px-4 py-8" dir={dir}>
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: '#0B2438' }}>{FEATURES.gamification
          ? <><span className="text-[#8F6820]"><Glyph e="🏆" /></span> {L('Supplier leaderboard', 'سپلائرز کی درجہ بندی', 'لوحة شرف الموردين')}</>
          : <><span className="text-[#8F6820]"><Glyph e="🏪" /></span> {empty ? L('Supplier directory coming soon', 'سپلائر ڈائریکٹری جلد', 'دليل الموردين قريباً') : L('Supplier directory', 'سپلائر ڈائریکٹری', 'دليل الموردين')}</>}</h1>
        {!empty && <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
          {!FEATURES.gamification ? L('Building-materials suppliers on Taseerak, with their verification status, rating and activity.', 'تسعیرک پر تعمیراتی سامان کے سپلائرز، ان کی تصدیق کی حالت، ریٹنگ اور سرگرمی کے ساتھ۔', 'موردو مواد البناء على منصة تسعيرك، مع حالة توثيقهم وتقييمهم ونشاطهم.') : L('Building-materials suppliers on Taseerak, ranked by verification, rating and requests won. Each supplier gets a reliability score out of 100.',
            'تسعیرک پر تعمیراتی سامان کے سپلائرز، تصدیق، ریٹنگ اور جیتی گئی درخواستوں کے لحاظ سے۔ ہر سپلائر کو 100 میں سے اعتماد کا اسکور ملتا ہے۔',
            'موردون لمواد البناء على منصة تسعيرك، مرتّبون حسب التوثيق والتقييم والطلبات التي فازوا بها. لكل مورد «درجة موثوقية» من 100.')}
        </p>}
        {ranked.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4 text-[13px] text-gray-600">
            <span><Glyph e="👥" /> {L(ranked.length === 1 ? '1 supplier on the platform' : `${ranked.length} suppliers on the platform`, `پلیٹ فارم پر ${ranked.length} سپلائرز`, `${arCount(ranked.length, 'مورد واحد', 'موردان', 'موردين', 'مورداً')} على المنصة`)}</span>
            {verifiedCount > 0 && <span><Glyph e="✅" /> {L(`${verifiedCount} verified`, `${verifiedCount} تصدیق شدہ`, arCount(verifiedCount, 'موثّق واحد', 'موثّقان', 'موثّقين', 'موثّقاً'))}</span>}
          </div>
        )}
      </div>

      {empty ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3 text-[#0B2438]"><Glyph e="🏗" /></div>
          <p className="text-sm text-gray-600">{L('You can already send a price request: it reaches the suppliers who specialise in your materials.', 'آپ ابھی قیمت کی درخواست بھیج سکتے ہیں: یہ آپ کے سامان کے ماہر سپلائرز تک پہنچتی ہے۔', 'يمكنك الآن إرسال طلب تسعير، فيصل إلى الموردين المختصين بموادك.')}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {roleHint === 'supplier'
              ? <Link href="/supplier/dashboard" className="btn-orange text-sm">{L('Open new requests', 'نئی درخواستیں کھولیں', 'افتح الطلبات الجديدة')}</Link>
              : <>
                <Link href="/contractor/rfq/quick" className="btn-orange text-sm">{L('Start now for free', 'ابھی مفت شروع کریں', 'ابدأ الآن مجاناً')}</Link>
                {roleHint !== 'contractor' && roleHint !== 'admin' && <Link href="/join" className="btn-ghost text-sm">{L('Sign up as a supplier', 'سپلائر کے طور پر رجسٹر کریں', 'سجّل كمورد')}</Link>}
              </>}
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

      {FEATURES.gamification && <p className="text-center text-[12px] text-gray-600 mt-8 leading-relaxed">
        {L('The score comes from: verification through Wathq, rating, the share of offers won, and activity. It updates automatically.', 'اسکور ان سے بنتا ہے: واثق کے ذریعے تصدیق، ریٹنگ، جیتی گئی آفرز کا تناسب اور سرگرمی۔ یہ خود بخود اپڈیٹ ہوتا ہے۔', 'تُحسب الدرجة من: التوثيق عبر واثق، والتقييم، ونسبة العروض الفائزة، والنشاط. وتتحدّث تلقائياً.')}
      </p>}
    </main>
  )
}
