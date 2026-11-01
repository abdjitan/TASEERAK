'use client'

import { districtsFor, districtLabel } from '@/lib/districts'

// District picker — a strict select (like the city field): it lists the
// districts of the chosen city. Cities without a curated list fall back to a
// plain text input. The stored value is always the Arabic name; the displayed
// label follows the UI `locale`. Controlled via value/onChange. The parent is
// expected to only render this once a city is selected.
export default function DistrictField({ city, value, onChange, locale, className = 'input-field' }: any) {
  const list = districtsFor(city)
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  if (list.length === 0) {
    return <input value={value || ''} onChange={e => onChange(e.target.value)} className={className} placeholder={L('District', 'محلہ', 'الحي')} aria-label={L('District', 'محلہ', 'الحي')} />
  }

  return (
    <select value={value || ''} className={className} aria-label={L('District', 'محلہ', 'الحي')} onChange={e => onChange(e.target.value)}>
      <option value="">{L('— Select district —', '— محلہ منتخب کریں —', '— اختر الحي —')}</option>
      {list.map((d: any) => <option key={d.ar} value={d.ar}>{districtLabel(d, locale)}</option>)}
    </select>
  )
}
