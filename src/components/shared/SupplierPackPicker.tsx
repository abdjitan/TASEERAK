'use client'

import { useState } from 'react'
import { SUB_CATEGORIES } from '@/types'
import { normalizeText } from '@/lib/normalize'
import {
  BrickWall, Zap, ShowerHead, PaintRoller, Wrench, Factory, Building2, Truck, Snowflake, DoorOpen, FireExtinguisher, Cctv,
  Layers, Trees, Sofa, Lightbulb, Sun, CookingPot, Briefcase, Landmark, Waves, Warehouse, Droplets, ArrowUpDown, Package, HardHat, Hammer, Check,
} from 'lucide-react'
import { SUPPLIER_PACKS, packSectors, packSpecialties, isPackSelected, type SupplierPack } from '@/lib/supplierPacks'

// Line icons per pack (design language: no emoji).
const PACK_ICON: Record<string, any> = {
  general_building: BrickWall, electrical_shop: Zap, plumbing_shop: ShowerHead, finishing: PaintRoller, hardware: Wrench,
  concrete_blocks: Factory, steel: Building2, equipment_rental: Truck, hvac: Snowflake, doors_windows: DoorOpen,
  fire_safety: FireExtinguisher, low_current: Cctv, formwork_scaffold: Layers, landscape: Trees, furniture: Sofa,
  lighting_decor: Lightbulb, solar: Sun, kitchens_appliances: CookingPot, office_furniture: Briefcase, facades: Landmark,
  pools_shades: Waves, prefab: Warehouse, water_gas: Droplets, elevators: ArrowUpDown,
  infrastructure: HardHat, site_equipment: Hammer,
}

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
  const T = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const H = (p: SupplierPack) => (locale === 'en' ? p.hint.en : locale === 'ur' ? p.hint.ur : p.hint.ar)

  // UX-041: on a phone 26 cards were ~1500px: the first 8 (plus any selected) show, the rest behind «عرض كل الأنواع»; a search finds a kind
  const FIRST = 8
  const [showAll, setShowAll] = useState(false)
  const [q, setQ] = useState('')
  const nq = normalizeText(q.trim()).toLowerCase()
  const matches = (p: SupplierPack) => !nq || normalizeText([p.ar, p.en, p.ur, p.hint.ar, p.hint.en, p.hint.ur].join(' ')).toLowerCase().includes(nq)
  const visible = SUPPLIER_PACKS.filter((p, i) => (nq ? matches(p) : showAll || i < FIRST || isPackSelected(p, specialties)))

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
    <div>
    <input type="search" value={q} onChange={(e: any) => setQ(e.target.value)} className="input-field mb-2.5"
      placeholder={T('Search for a kind of materials', 'مال کی قسم تلاش کریں', 'ابحث عن نوع المواد')} aria-label={T('Search for a kind of materials', 'مال کی قسم تلاش کریں', 'ابحث عن نوع المواد')} />
    {nq && visible.length === 0 && <p className="text-[13px] text-gray-600 mb-2">{T('No kind matches. Try another word, or pick the materials in detail below.', 'کوئی قسم نہیں ملی۔ کوئی اور لفظ آزمائیں یا نیچے تفصیل سے مال منتخب کریں۔', 'لا يوجد نوع مطابق. جرّب كلمة أخرى، أو اختر المواد بالتفصيل في الأسفل.')}</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {visible.map(p => {
        const on = isPackSelected(p, specialties)
        const all = packSpecialties(p)
        const have = all.filter(k => specialties.includes(k)).length
        const partial = !on && have > 0
        return (
          <button key={p.id} type="button" onClick={() => toggle(p)} aria-pressed={on}
            className={`relative text-start p-3 min-h-11 rounded-xl border-2 transition-all ${on ? 'shadow-sm' : 'bg-white hover:border-gray-300'}`}
            style={on ? { borderColor: '#D4A543', background: 'rgba(212,165,67,0.10)' } : partial ? { borderColor: '#D4A543', borderStyle: 'dashed' } : { borderColor: '#e5e7eb' }}>
            {(() => { const I = PACK_ICON[p.id] || Package; return (
              <span className="grid place-items-center w-9 h-9 rounded-lg mb-2" aria-hidden="true"
                style={on ? { background: '#D4A543', color: '#071827' } : { background: 'rgba(212,165,67,.14)', color: '#8F6820' }}>
                <I className="w-[18px] h-[18px]" strokeWidth={1.9} />
              </span>) })()}
            <div className="font-bold text-sm text-navy leading-snug">{L(p)}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-snug">{H(p)}</div>
            {(on || partial) && (
              <div className="text-xs font-bold mt-1" style={{ color: on ? '#071827' : '#8F6820' }}>
                {T(`${have} of ${all.length}`, `${all.length} میں سے ${have}`, `${have} من ${all.length}`)}
              </div>
            )}
            {on && <span className="absolute top-2 end-2 w-6 h-6 grid place-items-center rounded-full" style={{ background: '#D4A543', color: '#071827' }} aria-hidden="true"><Check className="w-4 h-4" strokeWidth={2.5} /></span>}
          </button>
        )
      })}
    </div>
    {!nq && SUPPLIER_PACKS.length > FIRST && (
      <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}
        className="mt-2.5 w-full min-h-[44px] rounded-xl border border-dashed border-gray-300 text-sm font-bold text-[#8F6820] hover:border-[#D4A543]">
        {showAll ? T('Show less', 'کم دکھائیں', 'عرض أقل') : T(`Show all kinds (${SUPPLIER_PACKS.length})`, `تمام اقسام دکھائیں (${SUPPLIER_PACKS.length})`, `عرض كل الأنواع (${SUPPLIER_PACKS.length})`)}
      </button>
    )}
    </div>
  )
}
