'use client'
// «طلباتي» and «صفقاتي» are one place for the buyer (owner, 2026-10-17; same as the mobile app):
// two segments on top of the requests list and the deals list.
import Link from 'next/link'

export default function RequestsTabs({ active, locale }: { active: 'requests' | 'deals'; locale: string }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const tabs: { k: 'requests' | 'deals'; href: string; label: string }[] = [
    { k: 'requests', href: '/contractor/rfqs', label: L('My requests', 'میری درخواستیں', 'طلباتي') },
    { k: 'deals', href: '/contractor/orders', label: L('My deals', 'میری ڈیلز', 'صفقاتي') },
  ]
  return (
    <div role="tablist" className="inline-flex p-1 rounded-xl bg-gray-100 mb-4">
      {tabs.map(t => (
        <Link key={t.k} href={t.href} role="tab" aria-selected={active === t.k}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${active === t.k ? 'bg-white shadow-sm text-[#0B2438]' : 'text-gray-500 hover:text-[#0B2438]'}`}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
