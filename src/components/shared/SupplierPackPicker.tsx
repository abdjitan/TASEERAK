'use client'

import { SUB_CATEGORIES } from '@/types'
import { SUPPLIER_PACKS, packSectors, packSpecialties, isPackSelected, type SupplierPack } from '@/lib/supplierPacks'

// "What do you sell?" — tap one or more cards; each card selects all the sectors and
// specialties of that kind of business. Detailed picking stays available underneath.
export default function SupplierPackPicker({
  sectors, specialties, onChange, locale = 'ar',
}: {
  sectors: string[]
  specialties: string[]
  onChange: (next: { sectors: string[]; specialties: string[] }) => void
  locale?: string
}) {
  const L = (p: SupplierPack) => (locale === 'en' ? p.en : locale === 'ur' ? p.ur : p.ar)
  const H = (p: SupplierPack) => (locale === 'en' ? p.hint.en : locale === 'ur' ? p.hint.ur : p.hint.ar)

  function toggle(p: SupplierPack) {
    const on = isPackSelected(p, specialties)
    if (!on) {
      onChange({
        sectors: Array.from(new Set([...sectors, ...packSectors(p)])),
        specialties: Array.from(new Set([...specialties, ...packSpecialties(p)])),
      })
      return
    }
    // Remove only what no other selected pack still needs.
    const keep = new Set(SUPPLIER_PACKS.filter(o => o.id !== p.id && isPackSelected(o, specialties)).flatMap(packSpecialties))
    const nextSpecs = specialties.filter(k => keep.has(k) || !packSpecialties(p).includes(k))
    // A sector stays if a specialty of it is still selected (from another pack or picked by hand).
    const nextSectors = sectors.filter(sec => !packSectors(p).includes(sec) || nextSpecs.some(k => !!(SUB_CATEGORIES as any)[sec]?.[k]))
    onChange({ sectors: nextSectors, specialties: nextSpecs })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {SUPPLIER_PACKS.map(p => {
        const on = isPackSelected(p, specialties)
        return (
          <button key={p.id} type="button" onClick={() => toggle(p)} aria-pressed={on}
            className={`relative text-start p-3 rounded-xl border-2 transition-all ${on ? 'shadow-sm' : 'bg-white hover:border-gray-300'}`}
            style={on ? { borderColor: '#0F6E56', background: 'rgba(15,110,86,0.07)' } : { borderColor: '#e5e7eb' }}>
            <div className="text-2xl leading-none mb-1.5" aria-hidden="true">{p.icon}</div>
            <div className="font-bold text-sm text-navy leading-snug">{L(p)}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{H(p)}</div>
            {on && <span className="absolute top-2 end-2 w-5 h-5 grid place-items-center rounded-full text-white text-[11px]" style={{ background: '#0F6E56' }}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}
