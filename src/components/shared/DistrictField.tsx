// @ts-nocheck
'use client'

import { useState } from 'react'
import { districtsFor, districtLabel } from '@/lib/districts'

// District picker: a strict select for cities we have a list for (plus an
// "أخرى" escape that reveals a text input), and a plain text input for cities
// without a curated list. The stored value is always the Arabic name; the
// displayed label follows the UI `locale`. Controlled via value/onChange.
export default function DistrictField({ city, value, onChange, locale, className = 'input-field' }: any) {
  const list = districtsFor(city)
  const [manual, setManual] = useState(false)

  if (list.length === 0) {
    return <input value={value || ''} onChange={e => onChange(e.target.value)} className={className} placeholder={locale === 'en' ? 'District' : 'الحي'} />
  }

  const valueIsCustom = value && !list.some((d: any) => d.ar === value)
  if (manual || valueIsCustom) {
    return (
      <div className="flex gap-2">
        <input value={value || ''} onChange={e => onChange(e.target.value)} className={`${className} flex-1`} placeholder={locale === 'en' ? 'Type the district' : 'اكتب اسم الحي'} />
        <button type="button" onClick={() => { setManual(false); onChange('') }} className="text-xs text-gray-500 whitespace-nowrap px-2">{locale === 'en' ? '↩ List' : '↩ القائمة'}</button>
      </div>
    )
  }

  return (
    <select value={value || ''} className={className}
      onChange={e => { if (e.target.value === '__other__') { setManual(true); onChange('') } else onChange(e.target.value) }}>
      <option value="">{locale === 'en' ? '— Select district —' : '— اختر الحي —'}</option>
      {list.map((d: any) => <option key={d.ar} value={d.ar}>{districtLabel(d, locale)}</option>)}
      <option value="__other__">{locale === 'en' ? 'Other (type manually)…' : 'أخرى (اكتب يدوياً)…'}</option>
    </select>
  )
}
