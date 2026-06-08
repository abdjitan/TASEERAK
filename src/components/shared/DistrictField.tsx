// @ts-nocheck
'use client'

import { useState } from 'react'
import { districtsFor } from '@/lib/districts'

// District picker: a strict select for cities we have a list for (plus an
// "أخرى" escape that reveals a text input), and a plain text input for cities
// without a curated list. Controlled via value/onChange.
export default function DistrictField({ city, value, onChange, className = 'input-field' }: any) {
  const list = districtsFor(city)
  const [manual, setManual] = useState(false)

  if (list.length === 0) {
    return <input value={value || ''} onChange={e => onChange(e.target.value)} className={className} placeholder="الحي" />
  }

  const valueIsCustom = value && !list.includes(value)
  if (manual || valueIsCustom) {
    return (
      <div className="flex gap-2">
        <input value={value || ''} onChange={e => onChange(e.target.value)} className={`${className} flex-1`} placeholder="اكتب اسم الحي" />
        <button type="button" onClick={() => { setManual(false); onChange('') }} className="text-xs text-gray-500 whitespace-nowrap px-2">↩ القائمة</button>
      </div>
    )
  }

  return (
    <select value={value || ''} className={className}
      onChange={e => { if (e.target.value === '__other__') { setManual(true); onChange('') } else onChange(e.target.value) }}>
      <option value="">— اختر الحي —</option>
      {list.map((d: string) => <option key={d} value={d}>{d}</option>)}
      <option value="__other__">أخرى (اكتب يدوياً)…</option>
    </select>
  )
}
