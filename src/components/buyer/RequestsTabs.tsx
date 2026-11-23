'use client'
// «طلباتي» and «صفقاتي» are one place for the buyer (owner, 2026-10-17; same as the mobile app):
// two segments on top of the requests list and the deals list, with «+ طلب جديد» next to them on
// both tabs (round-4 UX-133).
import Link from 'next/link'

export default function RequestsTabs({ active, locale }: { active: 'requests' | 'deals'; locale: string }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const tabs: { k: 'requests' | 'deals'; href: string; label: string }[] = [
    { k: 'requests', href: '/contractor/rfqs', label: L('My requests', 'میری درخواستیں', 'طلباتي') },
    { k: 'deals', href: '/contractor/orders', label: L('My deals', 'میری ڈیلز', 'صفقاتي') },
  ]
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 w-full">
      <div role="tablist" className="inline-flex p-1 rounded-xl bg-gray-100">
        {tabs.map(t => (
          <Link key={t.k} href={t.href} role="tab" aria-selected={active === t.k}
            className={`min-h-[44px] inline-flex items-center px-5 rounded-lg text-sm font-bold transition-all ${active === t.k ? 'bg-white shadow-sm text-[#0B2438]' : 'text-gray-600 hover:text-[#0B2438]'}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <Link href="/contractor/rfq/quick" className="btn-orange inline-flex items-center min-h-[44px] px-4 rounded-xl font-bold text-sm">+ {L('New request', 'نئی درخواست', 'طلب جديد')}</Link>
    </div>
  )
}
