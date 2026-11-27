'use client'

import { useEffect, useState } from 'react'
import { districtsFor, districtLabel } from '@/lib/districts'

const OTHER = '__other__'

// District picker: the districts of the chosen city, plus a last «حيّ آخر (اكتبه)» option that opens a
// text box (the lists are partial: Riyadh has 34 of about 170 districts), with «اختر من القائمة» to go
// back. A saved district that is not in the list opens in the text box, never as «— اختر الحي —»
// (round-8 UX-009). Cities without a curated list use the text box only. The stored value is always the
// Arabic name; the displayed label follows the UI `locale`. Controlled via value/onChange.
export default function DistrictField({ city, value, onChange, locale, className = 'input-field', id, invalid }: {
  city?: string; value?: string; onChange: (v: string) => void; locale: string; className?: string; id?: string
  /** marks the field as missing (gold, data-missing) */
  invalid?: boolean
}) {
  const list = districtsFor(city)
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const inList = (v?: string) => !!v && list.some(d => d.ar === v)
  const [typing, setTyping] = useState<boolean>(!!value && !inList(value))
  // a new city (or a value loaded later) decides the mode again
  useEffect(() => { setTyping(!!value && !inList(value)) }, [city]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (value && !inList(value)) setTyping(true) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const label = L('District', 'محلہ', 'الحي')
  const missing = invalid ? { 'data-missing': 'true' } : {}

  if (list.length === 0 || typing) {
    return (
      <div>
        <input id={id} value={value || ''} onChange={e => onChange(e.target.value)} className={className} {...missing}
          placeholder={L('Type the district name', 'محلے کا نام لکھیں', 'اكتب اسم الحي')} aria-label={label} autoComplete="address-level3" />
        {list.length > 0 && (
          <button type="button" onClick={() => { setTyping(false); if (!inList(value)) onChange('') }}
            className="mt-1 inline-flex items-center min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">
            {L('Choose from the list', 'فہرست سے منتخب کریں', 'اختر من القائمة')}
          </button>
        )}
      </div>
    )
  }

  return (
    <select id={id} value={inList(value) ? value : ''} className={className} aria-label={label} {...missing}
      onChange={e => { if (e.target.value === OTHER) { setTyping(true); onChange('') } else onChange(e.target.value) }}>
      <option value="">{L('— Select district —', '— محلہ منتخب کریں —', '— اختر الحي —')}</option>
      {list.map((d: any) => <option key={d.ar} value={d.ar}>{districtLabel(d, locale)}</option>)}
      <option value={OTHER}>{L('Another district (type it)', 'کوئی اور محلہ (لکھیں)', 'حيّ آخر (اكتبه)')}</option>
    </select>
  )
}
