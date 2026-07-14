'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, SECTOR_PRODUCTS, sortGroupKeys, detectSubCategory, hydrateTaxonomy } from '@/types'
import CatIcon from './CatIcon'
import { productImageUrl, specialtyImageUrl } from '@/lib/productImage'

// منتقي القطاعات/التخصصات الموحّد — يُستخدم في «أكمل ملفك» وصفحة «تخصصاتي» معاً حتى تكون
// التجربة والأيقونات واحدة. يُرطّب التصنيفات من قاعدة البيانات (get_taxonomy) ويُعيد الرسم،
// فتظهر تعديلات الأدمن (الأسماء/الأيقونات/المجموعات) مباشرةً في كل الشاشات.
const SECTOR_COLORS: Record<string, string> = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#D97706', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }
const SECTOR_TR: Record<string, any> = {
  civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'تعمیراتی' },
  electrical: { en: 'Electrical', ur: 'برقی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
  equipment: { en: 'Machinery', ur: 'مشینری' }, supply_store: { en: 'Supply Store', ur: 'سپلائی اسٹور' },
}

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
                        {/* أيقونة المجموعة = صورة مصغّرة لأول تخصص فيها (متناسقة مع البطاقات، بدل SVG القديم) */}
                        <img src={specialtyImageUrl(keys[0])} alt="" loading="lazy"
                          data-fb={productImageUrl(repProduct[sector]?.[keys[0]] || productNameForImage((subs[keys[0]] || {}).ar || ''))}
                          onError={(e: any) => { const el = e.currentTarget; if (!el.dataset.triedFb) { el.dataset.triedFb = '1'; const fb = el.getAttribute('data-fb'); if (fb) { el.src = fb; return } } el.style.display = 'none' }}
                          className="w-7 h-7 object-contain rounded-md bg-white border border-gray-100 shrink-0" />
                        <span className="text-sm font-bold text-gray-700">{grpLabel}</span>
                        {selInGroup > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{selInGroup}</span>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {keys.map((key: any) => {
                          const sub = subs[key]
                          const active = specialties.includes(key)
                          const subLabel = locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
                          // بطاقة عمودية بصورة المنتج بالأعلى (نفس نمط صفحة المقاول)؛ الإيموجي احتياطي.
                          return (
                            <button key={key} type="button" onClick={() => onToggleSpecialty(key)}
                              className={`flex flex-col items-center gap-1.5 text-center px-2 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${active ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-[#F5831F]/50 bg-white'}`}
                              style={active ? { background: color } : {}}>
                              {/* صورة التخصص المخصّصة أولاً، ثم صورة منتج ممثّل، ثم الإيموجي */}
                              <img src={specialtyImageUrl(key)} alt="" loading="lazy"
                                data-fb={productImageUrl(repProduct[sector]?.[key] || productNameForImage(sub.ar))}
                                onError={(e: any) => {
                                  const el = e.currentTarget
                                  if (!el.dataset.triedFb) { el.dataset.triedFb = '1'; const fb = el.getAttribute('data-fb'); if (fb) { el.src = fb; return } }
                                  el.style.display = 'none'; const s = el.nextElementSibling as HTMLElement | null; if (s) s.style.display = 'block'
                                }}
                                className="w-full object-contain rounded-lg bg-white" style={{ height: 54 }} />
                              <span className="text-3xl leading-none" style={{ display: 'none' }}>{sub.icon}</span>
                              <span className="leading-tight flex items-center gap-1 justify-center">{active && <span>✓</span>}{subLabel}</span>
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
