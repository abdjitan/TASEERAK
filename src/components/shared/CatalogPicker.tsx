'use client'

import { useMemo, useState } from 'react'
import { getProductLabel, type Sector } from '@/types'
import { BROWSE_SECTIONS, getSectionGroups, type BrowseSection } from '@/lib/browseCategories'
import { searchProducts } from '@/lib/productSearch'
import { productImageUrl } from '@/lib/productImage'

// Pick materials from the catalog inside the request page (the 4th way to add a line, next to
// writing, speaking and a photo). Search across everything, or browse the 8 user-facing sections
// (src/lib/browseCategories.ts) by group. Stays open so several materials can be added.

export default function CatalogPicker({ locale, onPick, onClose }: {
  locale: string
  onPick: (item: { name: string; sector: Sector }) => void
  onClose: () => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [q, setQ] = useState('')
  const [section, setSection] = useState<BrowseSection | null>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [added, setAdded] = useState<string[]>([])

  // Exact/prefix/synonym matches score >= ~10; loose typo matches (بلك → بلدوزر) ~6. Show only
  // the confident ones unless that leaves almost nothing.
  const hits = useMemo(() => {
    if (!q.trim()) return []
    const all = searchProducts(q, { limit: 40 })
    const good = all.filter(h => h.score >= 7)
    return good.length >= 3 ? good.slice(0, 30) : all.slice(0, 8)
  }, [q])
  const groups = useMemo(() => (section ? getSectionGroups(section) : []), [section])
  const pickT = (o: any) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)

  function pick(name: string, s: Sector) {
    onPick({ name, sector: s })
    setAdded(prev => [...prev, `${s}:${name}`])
  }
  const isAdded = (name: string, s: string) => added.includes(`${s}:${name}`)

  const Tile = ({ name, s }: { name: string; s: Sector }) => {
    const on = isAdded(name, s)
    return (
      <button type="button" onClick={() => pick(name, s)}
        className={`relative text-start rounded-xl border p-2 flex flex-col gap-1.5 transition-all ${on ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 bg-white hover:border-[#F5831F]/60 hover:shadow-sm'}`}>
        <span className="aspect-square w-full rounded-lg bg-gray-50 overflow-hidden grid place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImageUrl(name)} alt="" loading="lazy" className="w-full h-full object-contain"
            onError={(e: any) => { e.currentTarget.style.display = 'none' }} />
        </span>
        <span className="text-[12px] font-semibold text-gray-800 leading-snug line-clamp-2" dir="auto">{getProductLabel(name, locale)}</span>
        {on && <span className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full grid place-items-center text-white text-[11px]" style={{ background: '#0F6E56' }}>✓</span>}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={L('Pick from the catalog', 'فہرست سے منتخب کریں', 'اختر من القائمة')}>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-navy">🔍 {L('Pick from the catalog', 'فہرست سے منتخب کریں', 'اختر من القائمة')}</h2>
            <button type="button" onClick={onClose} className="text-sm font-bold px-4 py-1.5 rounded-xl text-white" style={{ background: '#1B2D5B' }}>
              {added.length ? L(`Done (${added.length})`, `مکمل (${added.length})`, `تم (${added.length})`) : L('Close', 'بند کریں', 'إغلاق')}
            </button>
          </div>
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus className="input-field"
            placeholder={L('Search any material… e.g. block, cable, pipe', 'کوئی بھی سامان تلاش کریں…', 'ابحث عن أي مادة… مثل: بلك، سلك، ماسورة')} />
          {!q.trim() && section && (
            <button type="button" onClick={() => { setSection(null); setOpenGroup(null) }} className="text-xs font-bold text-[#d96f15]">
              {L('← All sections', '← تمام حصے', '→ كل الأقسام')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {q.trim() ? (
            hits.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {L('Not in the catalog. Close this and write it as text — suppliers will still price it.',
                  'فہرست میں نہیں۔ اسے لکھ دیں، سپلائرز پھر بھی قیمت دیں گے۔',
                  'غير موجودة في القائمة. أغلق هذه النافذة واكتبها نصاً، وسيسعّرها الموردون.')}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {hits.map(h => <Tile key={`${h.sector}:${h.name}`} name={h.name} s={h.sector} />)}
              </div>
            )
          ) : (
            !section ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BROWSE_SECTIONS.map(b => (
                  <button key={b.key} type="button" onClick={() => { setSection(b.key); setOpenGroup(null) }}
                    className="text-start rounded-2xl border border-gray-200 bg-white p-3 hover:border-[#F5831F]/60 hover:shadow-sm transition-all">
                    <div className="text-2xl">{b.icon}</div>
                    <div className="font-bold text-sm text-navy mt-1 leading-snug">{pickT(b)}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{pickT(b.hint)}</div>
                  </button>
                ))}
              </div>
            ) : (
            <div className="space-y-2">
              <div className="font-extrabold text-navy">{BROWSE_SECTIONS.find(b => b.key === section)?.icon} {pickT(BROWSE_SECTIONS.find(b => b.key === section))}</div>
              {groups.map(g => {
                const open = openGroup === g.group
                return (
                  <div key={g.group} className="rounded-xl border border-gray-100">
                    <button type="button" onClick={() => setOpenGroup(open ? null : g.group)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-navy">
                      <span>{g.icon} {pickT(g)} <span className="text-gray-400 font-normal">({g.items.length})</span></span>
                      <span className="text-gray-400">{open ? '▴' : '▾'}</span>
                    </button>
                    {open && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-2 pt-0">
                        {g.items.map(it => <Tile key={`${it.sector}:${it.name}`} name={it.name} s={it.sector} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
