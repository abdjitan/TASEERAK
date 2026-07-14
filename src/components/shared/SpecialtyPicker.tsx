'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, sortGroupKeys, hydrateTaxonomy } from '@/types'
import CatIcon from './CatIcon'
import { productImageUrl } from '@/lib/productImage'

// منتقي القطاعات/التخصصات الموحّد — يُستخدم في «أكمل ملفك» وصفحة «تخصصاتي» معاً حتى تكون
// التجربة والأيقونات واحدة. يُرطّب التصنيفات من قاعدة البيانات (get_taxonomy) ويُعيد الرسم،
// فتظهر تعديلات الأدمن (الأسماء/الأيقونات/المجموعات) مباشرةً في كل الشاشات.
const SECTOR_COLORS: Record<string, string> = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#D97706', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }
const SECTOR_TR: Record<string, any> = {
  civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'تعمیراتی' },
  electrical: { en: 'Electrical', ur: 'برقی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
  equipment: { en: 'Machinery', ur: 'مشینری' }, supply_store: { en: 'Supply Store', ur: 'سپلائی اسٹور' },
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
  const [, setReady] = useState(0)
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

  const sl = (s: string) => locale === 'ar' ? (SECTOR_LABELS as any)[s] : (SECTOR_TR[s]?.[locale] || (SECTOR_LABELS as any)[s])
  const rm = removeLabel || (locale === 'en' ? 'Remove' : locale === 'ur' ? 'ہٹائیں' : 'إزالة')

  return (
    <div className="space-y-2">
      {(Object.keys(SECTOR_LABELS) as string[]).map((sector) => {
        const selected = sectors.includes(sector)
        const isOpen = openSector === sector
        const subs = (SUB_CATEGORIES as any)[sector] || {}
        const subKeys = Object.keys(subs)
        const selCount = specialties.filter((s) => subKeys.includes(s)).length
        const color = SECTOR_COLORS[sector]
        const groups: Record<string, string[]> = {}
        Object.entries(subs).forEach(([key, sub]: any) => { (groups[sub.group] = groups[sub.group] || []).push(key) })
        return (
          <div key={sector} className={`rounded-xl border-2 overflow-hidden transition-all ${selected ? 'border-[#F5831F]' : 'border-gray-200'}`}>
            <div onClick={() => { if (!selected) onToggleSector(sector); onOpenSector(isOpen ? null : sector) }}
              className={`w-full flex items-center justify-between p-3.5 cursor-pointer ${selected ? 'bg-[#F5831F]/5' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: selected ? color : '#374151' }}>{sl(sector)}</span>
                {selCount > 0 && <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: color }}>{selCount}</span>}
              </div>
              <div className="flex items-center gap-2">
                {selected && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSector(sector); if (isOpen) onOpenSector(null) }}
                    className="text-[11px] text-red-400 hover:text-red-600">{rm}</button>
                )}
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div className="p-3 border-t border-gray-100 bg-white">
                {sortGroupKeys(Object.keys(groups)).map((groupKey: any) => {
                  const keys = groups[groupKey]
                  const grp = (GROUP_LABELS as any)[groupKey]
                  const grpLabel = grp ? (locale === 'en' ? grp.en : locale === 'ur' ? grp.ur : grp.ar) : groupKey
                  const selInGroup = keys.filter((k: any) => specialties.includes(k)).length
                  return (
                    <div key={groupKey} className="mb-3 bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-[18px] h-[18px] grid place-items-center shrink-0" style={{ color }}><CatIcon k={groupKey} className="w-[18px] h-[18px]" /></span>
                        <span className="text-sm font-bold text-gray-700">{grpLabel}</span>
                        {selInGroup > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{selInGroup}</span>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {keys.map((key: any) => {
                          const sub = subs[key]
                          const active = specialties.includes(key)
                          const subLabel = locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
                          return (
                            <button key={key} type="button" onClick={() => onToggleSpecialty(key)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all bg-white ${active ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                              style={{ textAlign: dir === 'rtl' ? 'right' : 'left', ...(active ? { borderColor: color, background: color + '0d' } : {}) }}>
                              {/* صورة المنتج (نفس صور صفحة إنشاء الطلب)؛ ترجع للإيموجي إن تعذّرت */}
                              <img src={productImageUrl(key)} alt="" loading="lazy"
                                onError={(e: any) => { e.currentTarget.style.display = 'none'; const s = e.currentTarget.nextElementSibling; if (s) s.style.display = 'inline' }}
                                className="w-9 h-9 object-contain rounded bg-white border border-gray-100 shrink-0" />
                              <span className="text-lg" style={{ display: 'none' }}>{sub.icon}</span>
                              <span className="text-xs font-semibold flex-1 leading-tight" style={active ? { color } : { color: '#374151' }}>{subLabel}</span>
                              {active && <span style={{ color }}>✓</span>}
                            </button>
                          )
                        })}
                      </div>
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
