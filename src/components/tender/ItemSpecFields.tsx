'use client'
// The product's spec fields as selects (+ «أخرى…» to write a value), shared by the bill of quantities and the tender
// review (round-5 UX-091). Required ones (materials priced by size/grade) are marked and highlighted until filled.
import { SPEC_UNSURE, specUnsureLabel, specsRequired, getProductSpecs, getOptionLabel, type Sector } from '@/types'

// a spec field's label in the page's language (round-5 UX-156: Urdu readers got the English label);
// Urdu falls back to the Arabic catalog wording until the catalog carries Urdu labels
export const specFieldLabel = (f: { ar: string; en: string; ur?: string }, locale: string) => (locale === 'en' ? f.en : locale === 'ur' ? (f.ur || f.ar) : f.ar)

export default function ItemSpecFields({ name, sector, specs, onChange, locale, disabled }: { name: string; sector: string; specs?: Record<string, string>; onChange: (v: Record<string, string>) => void; locale: string; disabled?: boolean }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const fields = getProductSpecs(name).filter(f => f.key !== 'unit')
  if (!fields.length) return null
  const req = specsRequired(name, sector as Sector)
  return (
    <div className="rounded-xl bg-gray-50 p-2.5">
      <div className="text-xs font-bold text-[#0B2438] mb-1.5">{L('Specifications', 'تفصیلات', 'المواصفات')}{req ? L(' (required)', ' (ضروری)', ' (مطلوبة)') : L(' (optional)', ' (اختیاری)', ' (اختيارية)')}</div>
      <div className="grid sm:grid-cols-2 gap-2">
        {fields.map(f => {
          const v = specs?.[f.key] || ''
          const custom = !!v && !f.options.includes(v) && v !== SPEC_UNSURE
          const setV = (val: string) => onChange({ ...(specs || {}), [f.key]: val })
          return (
            <label key={f.key} className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-0.5">{specFieldLabel(f, locale)}{req ? ' *' : ''}</span>
              <select value={custom ? '__other' : v} disabled={disabled} onChange={(e: any) => setV(e.target.value === '__other' ? ' ' : e.target.value)}
                className={`input-field text-sm ${req && !v.trim() ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}>
                {/* «بلا تحديد» rather than a bare «أي» (round-5 UX-159) */}
                <option value="">{req ? L('Choose', 'منتخب کریں', 'اختر') : L('Not specified', 'کوئی شرط نہیں', 'بلا تحديد')}</option>
                {f.options.map(o => <option key={o} value={o}>{getOptionLabel(o, locale)}</option>)}
                <option value={SPEC_UNSURE}>{specUnsureLabel(locale)}</option>
                <option value="__other">{L('Other…', 'دیگر…', 'أخرى…')}</option>
              </select>
              {custom && <input value={v.trim()} disabled={disabled} onChange={(e: any) => setV(e.target.value || ' ')} className="input-field text-sm mt-1" placeholder={L('Write it', 'لکھیں', 'اكتبها')} />}
            </label>
          )
        })}
      </div>
    </div>
  )
}
