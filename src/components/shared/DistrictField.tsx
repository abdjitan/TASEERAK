'use client'

import { districtsFor, districtLabel } from '@/lib/districts'

// District picker — a strict select (like the city field): it lists the
// districts of the chosen city. Cities without a curated list fall back to a
// plain text input. The stored value is always the Arabic name; the displayed
// label follows the UI `locale`. Controlled via value/onChange. The parent is
// expected to only render this once a city is selected.
export default function DistrictField({ city, value, onChange, locale, className = 'input-field' }: any) {
  const list = districtsFor(city)

  if (list.length === 0) {
    return <input value={value || ''} onChange={e => onChange(e.target.value)} className={className} placeholder={locale === 'en' ? 'District' : 'الحي'} />
  }

  return (
    <select value={value || ''} className={className} onChange={e => onChange(e.target.value)}>
      <option value="">{locale === 'en' ? '— Select district —' : '— اختر الحي —'}</option>
      {list.map((d: any) => <option key={d.ar} value={d.ar}>{districtLabel(d, locale)}</option>)}
    </select>
  )
}
