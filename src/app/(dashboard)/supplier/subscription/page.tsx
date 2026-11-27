'use client'

import Link from 'next/link'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import Glyph from '@/components/shared/Glyph'

// Supplier plans. UX-120: no payments before the Saudi company exists. round-8 UX-100: the page only says the
// service is free: no plan cards, no prices, no «we will tell you before anything changes» (it hinted at fees).
export default function SubscriptionPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const FWD = dir === 'rtl' ? '←' : '→'

  // round-7 UX-157: no plans while the subscription is off, so the title says the service is free
  return (
    <AppShell title={L('Free to use', 'استعمال مفت ہے', 'الاستخدام مجاني')} nav={getNav('supplier', locale, '/supplier/subscription')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl p-6 mb-6 bg-white border border-gray-100 shadow-sm text-center">
          <div className="text-4xl mb-2"><Glyph e="🎁" /></div>
          <h2 className="text-lg font-extrabold text-[#0B2438]">{L('Taseerak is completely free for suppliers', 'تسعیرک سپلائرز کے لیے مکمل طور پر مفت ہے', 'تسعيرك مجاني بالكامل للموردين')}</h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{L('Receive requests, send offers and manage your deals with no fees.', 'درخواستیں وصول کریں، آفرز بھیجیں اور اپنے سودے بغیر کسی فیس کے سنبھالیں۔', 'استقبل الطلبات وأرسل العروض وأدِر صفقاتك دون أي رسوم.')}</p>
          <Link href="/supplier/dashboard" className="inline-flex items-center gap-1 mt-4 min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] text-sm" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            {L('Back to requests', 'درخواستوں پر واپس', 'العودة إلى الطلبات')} <span aria-hidden="true">{FWD}</span>
          </Link>
        </div>

      </div>
    </AppShell>
  )
}
