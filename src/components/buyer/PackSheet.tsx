'use client'
// A home project pack (src/lib/homePacks.ts) as a checklist: everything ticked, the buyer unticks what
// they don't need, sets the quantities (measured items show a hint), then adds them all to the request.
import { useState } from 'react'
import { getUnitLabelLong, getDefaultUnit, getProductLabel } from '@/types'
import { productImageUrl } from '@/lib/productImage'
import { cleanArName } from '@/lib/displayName'
import type { HomePack } from '@/lib/homePacks'
import type { Sector } from '@/types'

const toLatinNumber = (v: string) => v.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '')

export type PackLine = { name: string; sector: Sector; quantity: string; unit: string }

export default function PackSheet({ pack, locale, onAdd, onClose }: {
  pack: HomePack
  locale: string
  onAdd: (lines: PackLine[]) => void
  onClose: () => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const [rows, setRows] = useState(() => pack.items.map(it => ({
    ...it, on: true, quantity: it.qty != null ? String(it.qty) : '', unit: getDefaultUnit(it.name, it.sector) || 'حبة',
  })))
  const chosen = rows.filter(r => r.on)
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => setRows(prev => prev.map((r, k) => k === i ? { ...r, ...patch } : r))
  const name = (n: string) => locale === 'ar' ? cleanArName(n) : getProductLabel(n, locale)

  return (
    <div className="fixed inset-0 z-[70] bg-[#071827]/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={pick(pack)} onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
        <div className="relative shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImageUrl(pack.cover)} alt="" className="w-16 h-16 rounded-xl object-contain bg-gray-50 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-[#0B2438]">{pick(pack)}</div>
            <div className="text-[12px] text-gray-500">{L('Untick what you don’t need and set the quantities', 'جو نہیں چاہیے اسے ہٹائیں اور مقدار لکھیں', 'أزل ما لا تحتاجه، وحدّد الكميات')}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={L('Close', 'بند', 'إغلاق')} className="w-9 h-9 rounded-full bg-gray-100 text-[#0B2438] text-lg shrink-0">×</button>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {rows.map((r, i) => (
            <li key={r.name} className={`flex items-center gap-3 px-4 py-2.5 ${r.on ? '' : 'opacity-50'}`}>
              <input type="checkbox" checked={r.on} onChange={e => set(i, { on: e.target.checked })} className="w-5 h-5 accent-[#D4A543] shrink-0" aria-label={name(r.name)} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImageUrl(r.name)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-contain bg-gray-50 shrink-0" onError={(e: any) => { e.currentTarget.style.visibility = 'hidden' }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#0B2438] leading-snug" dir="auto">{name(r.name)}</div>
                {r.hint && <div className="text-[11px] text-gray-500">{pick(r.hint)}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input type="text" inputMode="decimal" value={r.quantity} disabled={!r.on}
                  onChange={e => set(i, { quantity: toLatinNumber(e.target.value).slice(0, 8) })}
                  className={`w-16 input-field text-sm text-center py-1.5 ${r.on && !(parseFloat(r.quantity) > 0) ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
                  placeholder={L('Qty', 'مقدار', 'الكمية')} aria-label={L('Quantity', 'مقدار', 'الكمية')} />
                <span className="text-[11px] text-gray-500 w-16 truncate">{getUnitLabelLong(r.unit, locale)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-gray-100 shrink-0">
          <p className="text-[11px] text-gray-500 mb-2">{L('Each material goes to the suppliers who sell it. You can still edit everything in your list.', 'ہر چیز اس کے سپلائرز تک جاتی ہے۔ فہرست میں سب بدل سکتے ہیں۔', 'تصل كل مادة إلى الموردين المختصين بها، ويمكنك تعديل كل شيء في قائمتك.')}</p>
          <button type="button" disabled={!chosen.length}
            onClick={() => onAdd(chosen.map(r => ({ name: r.name, sector: r.sector, quantity: r.quantity, unit: r.unit })))}
            className="w-full min-h-12 rounded-xl font-extrabold text-sm disabled:opacity-40" style={{ background: '#D4A543', color: '#071827' }}>
            {L(`Add to my request (${chosen.length})`, `میری درخواست میں شامل کریں (${chosen.length})`, `أضف إلى طلبي (${chosen.length})`)}
          </button>
        </div>
      </div>
    </div>
  )
}
