'use client'

import Link from 'next/link'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { FEATURES } from '@/lib/features'
import { PLANS } from '@/lib/plans'
import Glyph from '@/components/shared/Glyph'
import { Check } from 'lucide-react'

// Supplier plans. UX-120: no payments before the Saudi company exists — while FEATURES.subscription
// is off (launch) the page only says the service is free; no plan request, no bank-transfer text.
// When the feature is turned on later, the plans are shown for information only (no «اشترك» button
// until a payment gateway is approved).
export default function SubscriptionPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const FWD = dir === 'rtl' ? '←' : '→'

  return (
    <AppShell title={L('Plans', 'پلان', 'الباقات')} nav={getNav('supplier', locale, '/supplier/subscription')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl p-6 mb-6 bg-white border border-gray-100 shadow-sm text-center">
          <div className="text-4xl mb-2"><Glyph e="🎁" /></div>
          <h2 className="text-lg font-extrabold text-[#0B2438]">{L('Taseerak is completely free for suppliers', 'تسعیرک سپلائرز کے لیے مکمل طور پر مفت ہے', 'تسعيرك مجاني بالكامل للموردين')}</h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{L('Receive requests, send offers and manage your deals with no fees. We will tell you well in advance before anything changes.', 'درخواستیں وصول کریں، آفرز بھیجیں اور اپنے سودے بغیر کسی فیس کے سنبھالیں۔ کسی بھی تبدیلی سے پہلے ہم آپ کو پہلے سے بتائیں گے۔', 'استقبل الطلبات وأرسل العروض وأدِر صفقاتك دون أي رسوم، وسنُعلمك مسبقاً قبل أي تغيير.')}</p>
          <Link href="/supplier/dashboard" className="inline-flex items-center gap-1 mt-4 min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] text-sm" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            {L('Back to requests', 'درخواستوں پر واپس', 'العودة إلى الطلبات')} <span aria-hidden="true">{FWD}</span>
          </Link>
        </div>

        {FEATURES.subscription && (
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((p) => (
              <div key={p.key} className={`rounded-2xl border p-5 flex flex-col bg-white ${p.featured ? 'border-[#D4A543] shadow-lg' : 'border-gray-100 shadow-sm'}`}>
                <div className="text-[13px] text-gray-500">{p.tagline}</div>
                <div className="text-lg font-extrabold mt-0.5" style={{ color: '#0B2438' }}>{p.name}</div>
                <ul className="space-y-1.5 text-sm text-gray-700 flex-1 mt-2">
                  {p.benefits.map((b) => <li key={b} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 text-[#0B2438] shrink-0" aria-hidden /><span>{b}</span></li>)}
                </ul>
                <div className="mt-4 text-center text-sm font-bold text-[#0F6E56] py-2.5">{L('Free now', 'ابھی مفت', 'مجاني الآن')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
