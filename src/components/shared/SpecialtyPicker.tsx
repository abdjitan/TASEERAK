'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, SECTOR_PRODUCTS, sortGroupKeys, detectSubCategory, hydrateTaxonomy } from '@/types'
import CatIcon from './CatIcon'
import Glyph from './Glyph'
import { Check, ChevronDown } from 'lucide-react'
import { productImageUrl, specialtyImageUrl, groupImageUrl } from '@/lib/productImage'
import { sectorName } from '@/lib/sellers'

// منتقي القطاعات/التخصصات الموحّد — يُستخدم في «أكمل ملفك» وصفحة «تخصصاتي» معاً حتى تكون
// التجربة والأيقونات واحدة. يُرطّب التصنيفات من قاعدة البيانات (get_taxonomy) ويُعيد الرسم،
// فتظهر تعديلات الأدمن (الأسماء/الأيقونات/المجموعات) مباشرةً في كل الشاشات.
// Selected = gold border, 10% gold background, navy text and a check (brand; no per-sector colours).
const GOLD = '#D4A543'
const NAVY = '#071827'

// اسم منتج مرشّح لصورة الكتالوج: نجرّد الوصف بين الأقواس ونأخذ أول جزء قبل «/».
// (صور الكتالوج مولّدة على أسماء المنتجات، والتخصص فئة أوسع — لذا هذه أفضل محاولة، وإلا الإيموجي.)
function productNameForImage(arName: string): string {
  return String(arName || '').replace(/\s*\(.*?\)\s*/g, ' ').split('/')[0].trim()
}

export default function SpecialtyPicker({
  sectors, specialties, openSector, onOpenSector, onToggleSector, onToggleSpecialty,
  locale, dir, renderSectorExtra, removeLabel,
}: {
  sectors: string[]
  specialties: string[]
  openSector: string | null
  onOpenSector: (s: string | null) => void
  onToggleSector: (s: string) => void
  onToggleSpecialty: (k: string) => void
  locale: string
  dir: string
  renderSectorExtra?: (sector: string) => React.ReactNode
  removeLabel?: string
}) {
  const [ver, setReady] = useState(0)
  // طيّ الفئات داخل القطاع: تفتح مغلقة، والمستخدم يفتح الفئة التي يريدها فقط.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (id: string) => setOpenGroups(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await createClient().rpc('get_taxonomy')
        if (!cancelled && Array.isArray(data) && data.length) { hydrateTaxonomy(data); setReady((n) => n + 1) }
      } catch { /* fall back to bundled taxonomy */ }
    })()
    return () => { cancelled = true }
  }, [])

  // صورة لكل تخصص: أول منتج حقيقي (له صورة كتالوج) يُصنّف لهذا التخصص — ربط تلقائي بلا جدول يدوي.
  const repProduct = useMemo(() => {
    const m: Record<string, Record<string, string>> = {}
    for (const sector of Object.keys(SECTOR_LABELS)) {
      m[sector] = {}
      for (const p of ((SECTOR_PRODUCTS as any)[sector] || [])) {
        const sk = detectSubCategory(p, sector as any)
        if (sk && !m[sector][sk]) m[sector][sk] = p
      }
    }
    return m
  }, [ver])

  const sl = (s: string) => sectorName(s, locale) || s // round-6 UX-106: one sector name everywhere
  const rm = removeLabel || (locale === 'en' ? 'Remove' : locale === 'ur' ? 'ہٹائیں' : 'إزالة')

  return (
    <div className="space-y-2">
      {(Object.keys(SECTOR_LABELS) as string[]).map((sector) => {
        const selected = sectors.includes(sector)
        const isOpen = openSector === sector
        const subs = (SUB_CATEGORIES as any)[sector] || {}
        const subKeys = Object.keys(subs)
        const selCount = specialties.filter((s) => subKeys.includes(s)).length
        const groups: Record<string, string[]> = {}
        Object.entries(subs).forEach(([key, sub]: any) => { (groups[sub.group] = groups[sub.group] || []).push(key) })
        return (
          <div key={sector}
            className={`rounded-xl border-2 overflow-hidden transition-all bg-white ${selected ? 'shadow-md2' : 'border-gray-200 hover:border-[#cfd7e6]'}`}
            style={selected ? { borderColor: GOLD } : {}}>
            <div className="flex items-stretch" style={selected ? { background: 'rgba(212,165,67,0.10)' } : {}}>
              {/* selecting is a separate 44px checkbox; the header itself only opens or closes the list */}
              <button type="button" role="checkbox" aria-checked={selected}
                aria-label={selected ? `${rm}: ${sl(sector)}` : sl(sector)}
                onClick={() => { onToggleSector(sector); if (selected) { if (isOpen) onOpenSector(null) } else if (!isOpen) onOpenSector(sector) }}
                className="w-11 min-h-11 shrink-0 grid place-items-center">
                <span className="w-6 h-6 grid place-items-center rounded-md border-2"
                  style={selected ? { background: GOLD, borderColor: GOLD, color: NAVY } : { borderColor: '#9ca3af', background: '#fff' }}>
                  {selected && <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
                </span>
              </button>
              <button type="button" aria-expanded={isOpen} onClick={() => onOpenSector(isOpen ? null : sector)}
                className={`flex-1 min-w-0 flex items-center justify-between gap-2 py-3 pe-3.5 min-h-[48px] text-start transition-colors ${selected ? '' : 'hover:bg-gray-50'}`}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm truncate" style={{ color: selected ? NAVY : '#374151' }}>{sl(sector)}</span>
                  {selCount > 0 && <span className="text-xs font-bold rounded-full px-2 py-0.5 shrink-0" style={{ background: GOLD, color: NAVY }}>{selCount}</span>}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </div>
            {isOpen && (
              <div className="p-3 border-t border-gray-100 bg-white space-y-2">
                {sortGroupKeys(Object.keys(groups)).map((groupKey: any) => {
                  const keys = groups[groupKey]
                  const grp = (GROUP_LABELS as any)[groupKey]
                  const grpLabel = grp ? (locale === 'en' ? grp.en : locale === 'ur' ? grp.ur : grp.ar) : groupKey
                  const selInGroup = keys.filter((k: any) => specialties.includes(k)).length
                  const gid = `${sector}:${groupKey}`
                  const gOpen = openGroups.has(gid)
                  return (
                    <div key={groupKey} className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50/40">
                      {/* ترويسة الفئة قابلة للطي — لا تُفتح كل الفئات دفعةً واحدة */}
                      <button type="button" onClick={() => toggleGroup(gid)}
                        className={`w-full flex items-center justify-between gap-2 p-2.5 min-h-[44px] transition-colors ${gOpen ? 'bg-white' : 'hover:bg-white/70'}`}>
                        <span className="flex items-center gap-2 min-w-0">
                          <img src={groupImageUrl(groupKey)} alt="" loading="lazy"
                            onError={(e: any) => { e.currentTarget.style.display = 'none' }}
                            className="w-7 h-7 object-contain rounded-md bg-white border border-gray-100 shrink-0" />
                          <span className="text-sm font-bold text-gray-700 truncate">{grpLabel}</span>
                          {selInGroup > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: GOLD, color: NAVY }}>{selInGroup}</span>}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${gOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {gOpen && (
                        <div className="p-2.5 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {keys.map((key: any) => {
                            const sub = subs[key]
                            const active = specialties.includes(key)
                            const subLabel = locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
                            // بطاقة عمودية بصورة المنتج بالأعلى (نفس نمط صفحة المقاول)؛ الإيموجي احتياطي.
                            return (
                              <button key={key} type="button" onClick={() => onToggleSpecialty(key)} aria-pressed={active}
                                className={`flex flex-col items-center gap-1.5 text-center px-2 py-2 min-h-11 rounded-xl text-xs font-semibold border-2 transition-all ${active ? 'text-navy' : 'border-gray-200 text-gray-700 hover:border-[#D4A543]/50 bg-white'}`}
                                style={active ? { borderColor: GOLD, background: 'rgba(212,165,67,0.10)', color: NAVY } : {}}>
                                {/* صورة التخصص المخصّصة أولاً، ثم صورة منتج ممثّل، ثم الإيموجي */}
                                <img src={specialtyImageUrl(key)} alt="" loading="lazy"
                                  data-fb={productImageUrl(repProduct[sector]?.[key] || productNameForImage(sub.ar))}
                                  onError={(e: any) => {
                                    const el = e.currentTarget
                                    if (!el.dataset.triedFb) { el.dataset.triedFb = '1'; const fb = el.getAttribute('data-fb'); if (fb) { el.src = fb; return } }
                                    el.style.display = 'none'; const s = el.nextElementSibling as HTMLElement | null; if (s) s.style.display = 'block'
                                  }}
                                  className="w-full object-contain rounded-lg bg-white" style={{ height: 54 }} />
                                <span className="text-3xl leading-none text-[#8F6820]" style={{ display: 'none' }}><Glyph e={sub.icon} /></span>
                                <span className="leading-tight flex items-center gap-1 justify-center">{active && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />}{subLabel}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                {renderSectorExtra && renderSectorExtra(sector)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
