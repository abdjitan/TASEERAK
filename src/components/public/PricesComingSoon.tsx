'use client'
// One story for the paused price board (round-4 UX-149), on the public /prices page and on /market:
// «أسعار المواد قريباً», how to know a price today, and the request button (a supplier goes home instead).
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Glyph from '@/components/shared/Glyph'

export default function PricesComingSoon({ role, homeHref }: { role?: string | null; homeHref?: string }) {
  const { locale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  // the public /prices page passes no role: a signed-in supplier is detected here, so he is never
  // offered «request a price» (round-7 UX-234)
  const [seenRole, setSeenRole] = useState<string | null>(null)
  useEffect(() => {
    if (role !== undefined) return
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }: any) => {
      const uid = data?.session?.user?.id
      if (!uid) return
      const { data: p } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle()
      setSeenRole(p?.role || null)
    }, () => {})
  }, [role])
  const supplier = (role ?? seenRole) === 'supplier'
  const home = homeHref || (supplier ? '/supplier/dashboard' : undefined)
  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl p-8 border border-gray-100 text-center">
      <div className="text-4xl mb-3 text-[#0B2438]"><Glyph e="📊" /></div>
      <h1 className="text-lg font-bold mb-2 text-[#0B2438]">{L('Material prices coming soon', 'سامان کی قیمتیں جلد', 'أسعار المواد قريباً')}</h1>
      {/* a supplier does not send price requests: tell him where the work arrives (round-6 UX-138) */}
      <p className="text-sm text-gray-600">{supplier
        ? L('Requests that match your specialty reach you on your home page.', 'آپ کے شعبے سے مطابقت رکھنے والی درخواستیں آپ کے ہوم پیج پر آتی ہیں۔', 'تصلك الطلبات المطابقة لتخصصك في صفحتك الرئيسية.')
        : L('To know today’s price of a material, send a price request and suppliers answer with their current prices, including VAT.', 'کسی چیز کی آج کی قیمت جاننے کے لیے قیمت کی درخواست بھیجیں، سپلائرز ٹیکس سمیت اپنی موجودہ قیمتیں بتائیں گے۔', 'لمعرفة سعر مادة اليوم، أرسل طلب تسعير فيرد الموردون بأسعارهم الحالية شاملة الضريبة.')}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {!supplier && <Link href="/contractor/rfq/quick" className="btn-orange text-sm">{L('Request a price', 'قیمت معلوم کریں', 'اطلب سعراً')}</Link>}
        {home && <Link href={home} className={supplier ? 'btn-navy text-sm' : 'btn-ghost text-sm'}>{L('Back to the home page', 'ہوم پر واپس', 'العودة إلى الرئيسية')}</Link>}
      </div>
    </div>
  )
}
