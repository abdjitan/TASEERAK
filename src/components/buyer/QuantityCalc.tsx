'use client'
// «لا تعرف الكمية؟ احسبها من مقاس الغرفة» (round-2 UX-006 / UX-036): one calculator shared by the request
// page and the ready-made lists. The buyer chooses the floor or the walls (default by the material): the
// floor is length × width, the walls 2 × (length + width) × height. Tiles and floors get 10% for waste
// (said out loud); paint is counted for two coats (about 15 m² a gallon), wallpaper about 5 m² a roll.
import { useState } from 'react'
import { getUnitLabelLong } from '@/types'
import { arCount } from '@/lib/text'

const toLatinNumber = (v: string) => v.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '')

/** The order units the calculator can work out. */
export const calcSupported = (unit: string) => unit === 'جالون' || unit === 'م²' || unit === 'لفة'

type Mode = 'floor' | 'walls'
// paint and wallpaper go on walls; a material named for walls too; everything else is a floor
function defaultMode(unit: string, name: string, sub?: string | null): Mode {
  if (unit === 'جالون' || unit === 'لفة') return 'walls'
  const s = `${name || ''} ${sub || ''}`
  return /جدار|جدران|حائط|حوائط|wall/i.test(s) ? 'walls' : 'floor'
}

export default function QuantityCalc({ unit, name, sub, locale, onUse, compact }: {
  unit: string
  name: string
  sub?: string | null
  locale: string
  onUse: (qty: string) => void
  compact?: boolean
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [mode, setMode] = useState<Mode>(() => defaultMode(unit, name, sub))
  const [v, setV] = useState({ l: '', w: '', h: '' })
  const lv = parseFloat(v.l), wv = parseFloat(v.w), hv = parseFloat(v.h)
  const walls = mode === 'walls'
  const area = !(lv > 0 && wv > 0) ? 0 : walls ? (hv > 0 ? 2 * (lv + wv) * hv : 0) : lv * wv
  const waste = unit === 'م²'
  const qty = !area ? 0
    : unit === 'جالون' ? Math.max(1, Math.ceil(area / 15))
    : unit === 'لفة' ? Math.max(1, Math.ceil(area / 5))
    : Math.ceil(area * (waste ? 1.1 : 1))
  const areaR = Math.round(area * 10) / 10
  const sqm = (n: number) => locale === 'en' ? `${n} square metres` : locale === 'ur' ? `${n} مربع میٹر`
    : Number.isInteger(n) ? arCount(n, 'متر مربع واحد', 'متران مربعان', 'أمتار مربعة', 'متراً مربعاً') : `${n} متر مربع`
  const qtyText = locale === 'ar' && unit === 'جالون' ? arCount(qty, 'جالون واحد', 'جالونان', 'جالونات', 'جالوناً')
    : `${qty} ${getUnitLabelLong(unit, locale) || unit}`

  const fields: [keyof typeof v, string][] = [['l', L('Length', 'لمبائی', 'الطول')], ['w', L('Width', 'چوڑائی', 'العرض')], ...(walls ? [['h', L('Height', 'اونچائی', 'الارتفاع')] as [keyof typeof v, string]] : [])]
  return (
    <div className={`rounded-xl bg-gray-50 border border-gray-200 ${compact ? 'p-2' : 'p-2.5'} space-y-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-[#0B2438]">{L('Room size in metres', 'کمرے کا سائز میٹر میں', 'مقاس الغرفة بالمتر')}</span>
        <div role="radiogroup" aria-label={L('What to measure', 'کیا ناپیں', 'ماذا تقيس؟')} className="inline-flex rounded-xl border border-gray-200 bg-white p-0.5">
          {([['floor', L('Floor', 'فرش', 'الأرضية')], ['walls', L('Walls', 'دیواریں', 'الجدران')]] as [Mode, string][]).map(([m, lab]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
              className={`min-h-[44px] px-3 rounded-lg text-[13px] font-bold ${mode === m ? 'bg-[#0B2438] text-white' : 'text-[#0B2438]'}`}>{lab}</button>
          ))}
        </div>
      </div>
      <div className={`grid gap-2 ${walls ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {fields.map(([k, lab]) => (
          <label key={k} className="block">
            <span className="block text-[12px] text-gray-600 mb-0.5">{lab}</span>
            <input type="text" inputMode="decimal" value={v[k]} onChange={e => setV(c => ({ ...c, [k]: toLatinNumber(e.target.value).slice(0, 6) }))}
              className="input-field text-[16px] sm:text-sm min-h-[44px]" aria-label={lab} />
          </label>
        ))}
      </div>
      {qty > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] text-[#0B2438]">
            {walls ? L('Wall area: ', 'دیواروں کا رقبہ: ', 'مساحة الجدران: ') : L('Floor area: ', 'فرش کا رقبہ: ', 'مساحة الأرضية: ')}<b>{sqm(areaR)}</b>
            {' '}{locale === 'en' ? '→' : '←'} <b>{qtyText}</b>
            {unit === 'جالون' ? ' ' + L('(two coats)', '(دو کوٹ)', '(وجهان)') : ''}
          </p>
          {waste && <p className="text-[12px] text-[#8F6820] font-bold">{L('We suggest adding 10% for waste and cuts; it is included.', 'کٹائی اور ضیاع کے لیے 10% اضافہ تجویز ہے؛ شامل کر دیا گیا۔', 'نقترح زيادة 10% للهدر والقصّ، وقد أضفناها.')}</p>}
          <button type="button" onClick={() => onUse(String(qty))}
            className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-[#0B2438]">{L('Use this quantity', 'یہ مقدار استعمال کریں', 'استخدم هذه الكمية')}</button>
        </div>
      )}
    </div>
  )
}
