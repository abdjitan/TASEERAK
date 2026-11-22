'use client'
// A home project pack (src/lib/homePacks.ts) as a checklist: everything ticked, the buyer unticks what
// they don't need, sets the quantities (measured items show a hint), then adds them all to the request.
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getUnitLabelLong, getDefaultUnit, getProductLabel } from '@/types'
import { productImageUrl } from '@/lib/productImage'
import { homeName, packUnitMismatches, type HomePack } from '@/lib/homePacks'
import type { Sector } from '@/types'

const toLatinNumber = (v: string) => v.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '')

export type PackLine = { name: string; sector: Sector; quantity: string; unit: string }

// development check (UX-005): every measured item's hint must speak about the unit it is ordered in
if (process.env.NODE_ENV !== 'production') {
  const bad = packUnitMismatches()
  if (bad.length) console.warn('[homePacks] hint and unit disagree:', bad)
}

export default function PackSheet({ pack, locale, onAdd, onClose }: {
  pack: HomePack
  locale: string
  onAdd: (lines: PackLine[]) => void
  onClose: () => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const [rows, setRows] = useState(() => pack.items.map(it => ({
    ...it, on: true, quantity: it.qty != null ? String(it.qty) : '', unit: it.unit || getDefaultUnit(it.name, it.sector) || 'حبة',
  })))
  const chosen = rows.filter(r => r.on)
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => setRows(prev => prev.map((r, k) => k === i ? { ...r, ...patch } : r))
  const name = (n: string) => locale === 'ar' ? homeName(n) : getProductLabel(n, locale)
  const boxRef = useRef<HTMLDivElement>(null)

  // a real dialog: Escape closes, the page behind does not scroll, focus starts inside
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    boxRef.current?.focus()
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] bg-[#071827]/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pack-title" onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden outline-none">
        <div className="relative shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pack.photo || productImageUrl(pack.cover)} alt="" className={`w-16 h-16 rounded-xl bg-gray-50 shrink-0 ${pack.photo ? 'object-cover' : 'object-contain'}`} />
          <div className="min-w-0 flex-1">
            <div id="pack-title" className="text-lg font-extrabold text-[#0B2438]">{pick(pack)}</div>
            <div className="text-[13px] text-gray-600">{L('Untick what you don’t need and set the quantities', 'جو نہیں چاہیے اسے ہٹائیں اور مقدار لکھیں', 'أزل ما لا تحتاجه، وحدّد الكميات')}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={L('Close', 'بند', 'إغلاق')}
            className="w-[44px] h-[44px] grid place-items-center rounded-full bg-gray-100 text-[#0B2438] shrink-0 hover:bg-gray-200">
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {rows.map((r, i) => (
            <li key={r.name} className={`flex items-center gap-2 px-3 py-1.5 ${r.on ? '' : 'opacity-60'}`}>
              {/* the whole picture + name toggles the row (not only the small box) */}
              <label className="flex-1 min-w-0 min-h-[52px] flex items-center gap-3 cursor-pointer select-none rounded-xl px-1">
                <input type="checkbox" checked={r.on} onChange={e => set(i, { on: e.target.checked })} className="w-5 h-5 accent-[#D4A543] shrink-0" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productImageUrl(r.name)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-contain bg-gray-50 shrink-0" onError={(e: any) => { e.currentTarget.style.visibility = 'hidden' }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[#0B2438] leading-snug" dir="auto">{name(r.name)}</span>
                  {r.hint && <span className="block text-[12px] text-gray-600 leading-snug">{pick(r.hint)}</span>}
                </span>
              </label>
              <div className="flex flex-col items-center shrink-0 w-[84px]">
                <input type="text" inputMode="decimal" value={r.quantity} disabled={!r.on}
                  onChange={e => set(i, { quantity: toLatinNumber(e.target.value).slice(0, 8) })}
                  className={`w-full input-field text-[16px] sm:text-sm text-center py-1.5 min-h-[44px] ${r.on && !(parseFloat(r.quantity) > 0) ? 'border-[#D4A543] bg-[#D4A543]/5' : ''}`}
                  placeholder={L('Qty', 'مقدار', 'الكمية')} aria-label={L(`Quantity of ${name(r.name)}`, `${name(r.name)} کی مقدار`, `كمية ${name(r.name)}`)} />
                <span className="text-[12px] text-gray-600 w-full text-center truncate mt-0.5">{getUnitLabelLong(r.unit, locale)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-gray-100 shrink-0" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-[12px] text-gray-600 mb-2">{L('Each material goes to the suppliers who sell it. You can still edit everything in your request.', 'ہر چیز اس کے سپلائرز تک جاتی ہے۔ درخواست میں سب بدل سکتے ہیں۔', 'تصل كل مادة إلى الموردين المختصين بها، ويمكنك تعديل كل شيء في طلبك.')}</p>
          <button type="button" disabled={!chosen.length}
            onClick={() => onAdd(chosen.map(r => ({ name: r.name, sector: r.sector, quantity: r.quantity, unit: r.unit })))}
            className="w-full min-h-12 rounded-xl font-extrabold text-sm disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', color: '#071827' }}>
            {L(`Add to my request (${chosen.length})`, `میری درخواست میں شامل کریں (${chosen.length})`, `أضف إلى طلبي (${chosen.length})`)}
          </button>
        </div>
      </div>
    </div>
  )
}
