'use client'
// A home project pack (src/lib/homePacks.ts) as a checklist: everything ticked, the buyer unticks what
// they don't need, sets the quantities (measured items show a hint), then adds them all to the request.
import { useEffect, useRef, useState } from 'react'
import { X, Calculator } from 'lucide-react'
import QuantityCalc, { calcSupported } from '@/components/buyer/QuantityCalc'
import { getUnitLabelLong, getDefaultUnit, getProductLabel } from '@/types'
import { productImageUrl } from '@/lib/productImage'
import { homeName, packUnitMismatches, deriveQty, type HomePack } from '@/lib/homePacks'
import { askConfirm } from '@/lib/askConfirm'
import type { Sector } from '@/types'

import { toLatinNumber } from '@/lib/number' // «2,500» = 2500: commas are thousands separators (round-4 UX-002)

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
    ...it, on: true, quantity: it.qty != null ? String(it.qty) : '', unit: it.unit || getDefaultUnit(it.name, it.sector) || 'حبة', edited: false,
  })))
  const [dirty, setDirty] = useState(false) // something changed: closing asks first (round-4 UX-025)
  const chosen = rows.filter(r => r.on)
  // a derived row (tile adhesive) follows its source rows until the buyer edits it (round-4 UX-185)
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => {
    setDirty(true)
    setRows(prev => {
      const next = prev.map((r, k) => k === i ? { ...r, ...patch, ...(patch.quantity !== undefined && r.derive ? { edited: true } : {}) } : r)
      return next.map(r => (r.derive && !r.edited ? { ...r, quantity: deriveQty(r.derive, next) } : r))
    })
  }
  const name = (n: string) => locale === 'ar' ? homeName(n) : getProductLabel(n, locale)
  const boxRef = useRef<HTMLDivElement>(null)
  const [calcFor, setCalcFor] = useState<number | null>(null)
  const ready = chosen.filter(r => parseFloat(r.quantity) > 0).length
  const noQty = chosen.length - ready
  // a new onClose on every parent render must not re-run the effect (focus jumped while typing, round-2 UX-036)
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  const askingRef = useRef(false)
  async function tryClose() {
    if (askingRef.current) return
    if (dirtyRef.current) {
      askingRef.current = true
      const ok = await askConfirm(L('Close the list? The quantities you entered will be lost.', 'فہرست بند کریں؟ آپ کی لکھی ہوئی مقداریں ضائع ہو جائیں گی۔', 'هل تريد إغلاق القائمة؟ ستضيع الكميات التي أدخلتها.'),
        { okLabel: L('Close', 'بند کریں', 'إغلاق'), cancelLabel: L('Keep editing', 'ترمیم جاری رکھیں', 'متابعة التعديل') })
      askingRef.current = false
      if (!ok) return
    }
    onClose()
  }
  const closeRef = useRef(tryClose)
  closeRef.current = tryClose

  // a real dialog: Escape closes, the page behind does not scroll, focus starts inside (once)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(); return }
      // keep Tab inside the dialog (round-3 UX-142)
      if (e.key !== 'Tab' || !boxRef.current) return
      const f = Array.from(boxRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')).filter(el => !(el as any).disabled)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === boxRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    boxRef.current?.focus()
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [])

  return (
    <div className="fixed inset-0 z-[70] bg-[#071827]/60 flex items-end sm:items-center justify-center" onClick={() => tryClose()}>
      <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pack-title" onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden outline-none">
        <div className="relative shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pack.photo || productImageUrl(pack.cover)} alt="" className={`w-16 h-16 rounded-xl bg-gray-50 shrink-0 ${pack.photo ? 'object-cover' : 'object-contain'}`} />
          <div className="min-w-0 flex-1">
            <div id="pack-title" className="text-lg font-extrabold text-[#0B2438]">{pick(pack)}</div>
            <div className="text-[13px] text-gray-600">{L('Untick what you don’t need and set the quantities', 'جو نہیں چاہیے اسے ہٹائیں اور مقدار لکھیں', 'أزل ما لا تحتاجه، وحدّد الكميات')}</div>
          </div>
          <button type="button" onClick={() => tryClose()} aria-label={L('Close', 'بند', 'إغلاق')}
            className="w-[44px] h-[44px] grid place-items-center rounded-full bg-gray-100 text-[#0B2438] shrink-0 hover:bg-gray-200">
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {rows.map((r, i) => (
            <li key={r.name} className={`px-3 py-1.5 ${r.on ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-2">
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
              </div>
              {/* «احسبها من مقاس الغرفة» for measured items (shared calculator) */}
              {/* curtains and blinds have no room calculator: their hint explains the window sizes (UX-061) */}
              {r.on && r.calc !== 'none' && (r.calc || calcSupported(r.unit)) && (calcFor === i ? (
                <div className="mt-1 mb-1"><QuantityCalc compact unit={r.unit} name={r.name} locale={locale} calc={r.calc} cover={r.cover} coats={r.coats}
                  onClose={() => setCalcFor(null)} onUse={q => { set(i, { quantity: q }); setCalcFor(null) }} /></div>
              ) : (
                <button type="button" onClick={() => setCalcFor(i)} className="min-h-[44px] ms-9 text-[13px] font-bold text-[#8F6820] inline-flex items-center gap-1.5 hover:underline">
                  <Calculator className="w-4 h-4" aria-hidden />{r.calc === 'area' ? L('Work it out from the area', 'رقبے سے حساب کریں', 'احسبها من المساحة') : L('Work it out from the room size', 'کمرے کے سائز سے حساب کریں', 'احسبها من مقاس الغرفة')}
                </button>
              ))}
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-gray-100 shrink-0" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          {noQty > 0 && (
            <p className="text-[13px] font-bold text-[#8F6820] mb-1.5" role="status">{L(
              `${noQty} item${noQty === 1 ? '' : 's'} without a quantity; you can complete ${noQty === 1 ? 'it' : 'them'} in your request.`,
              `${noQty} اشیاء بغیر مقدار؛ آپ انہیں درخواست میں مکمل کر سکتے ہیں۔`,
              `${noQty === 1 ? 'مادة واحدة بلا كمية' : noQty === 2 ? 'مادتان بلا كمية' : `${noQty} مواد بلا كمية`}، يمكنك إكمالها في طلبك.`)}</p>
          )}
          <p className="text-[12px] text-gray-600 mb-2">{L('Each material goes to the suppliers who sell it. You can still edit everything in your request.', 'ہر چیز اس کے سپلائرز تک جاتی ہے۔ درخواست میں سب بدل سکتے ہیں۔', 'تصل كل مادة إلى الموردين المختصين بها، ويمكنك تعديل كل شيء في طلبك.')}</p>
          <button type="button" disabled={!chosen.length}
            onClick={() => onAdd(chosen.map(r => ({ name: r.name, sector: r.sector, quantity: r.quantity, unit: r.unit })))}
            className="w-full min-h-12 rounded-xl font-extrabold text-sm disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', color: '#071827' }}>
            {noQty > 0
              ? L(`Add to my request (${ready} ready, ${noQty} without quantity)`, `میری درخواست میں شامل کریں (${ready} تیار، ${noQty} بغیر مقدار)`, `أضف إلى طلبي (${ready} جاهزة، ${noQty} بلا كمية)`)
              : L(`Add to my request (${chosen.length})`, `میری درخواست میں شامل کریں (${chosen.length})`, `أضف إلى طلبي (${chosen.length})`)}
          </button>
        </div>
      </div>
    </div>
  )
}
