'use client'
// One searchable «المدينة» picker over every city (owner 2026-11-26): the region comes from the chosen city.
// Used wherever the app asks for a place (request page, onboarding, location, branches, BOQ).
import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { getRegionLabel } from '@/types'
import { getPlaceLabel } from '@/lib/displayName'
import { findCityOption, cityOptionLabel, searchCities, type CityOption } from '@/lib/cityList'

export type { CityOption }

export default function CityPicker({ city, region, locale, invalid = false, onPick, id, ariaLabel }: {
  city: string
  region: string
  locale: string
  invalid?: boolean
  onPick: (c: CityOption) => void
  /** id of the input, for an outside <label htmlFor> */
  id?: string
  ariaLabel?: string
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const uid = useId().replace(/:/g, '')
  const listId = `city-list-${uid}`
  const optId = (i: number) => `city-opt-${uid}-${i}`
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const sel = findCityOption(city, region)
  const shown = sel ? cityOptionLabel(sel, locale) : city ? getPlaceLabel(city, null, locale) : ''
  // round-8 UX-122: with a city chosen, the empty search lists it first
  const list = open ? (() => { const all = searchCities(q, locale); return sel && !q.trim() ? [sel, ...all.filter(c => !(c.ar === sel.ar && c.region === sel.region))] : all })() : []
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent | TouchEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', off); document.addEventListener('touchstart', off)
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('touchstart', off) }
  }, [open])
  useEffect(() => { (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' }) }, [active])
  const pick = (c: CityOption) => { onPick(c); setOpen(false); setQ('') }
  return (
    <div ref={boxRef} className="relative">
      <input id={id} type="text" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && list[active] ? optId(active) : undefined}
        aria-invalid={invalid || undefined} aria-label={ariaLabel || L('City', 'شہر', 'المدينة')} autoComplete="off"
        value={open ? q : shown}
        // round-8 UX-017: never the region as a grey «value»; UX-122: the chosen city stays visible while searching
        placeholder={open && shown ? L(`${shown}: type to search`, `${shown}: تلاش کے لیے لکھیں`, `${shown} — اكتب للبحث`) : L('Search for your city', 'اپنا شہر تلاش کریں', 'ابحث عن مدينتك')}
        data-missing={invalid || undefined}
        onFocus={() => { setOpen(true); setQ(''); setActive(0) }}
        onClick={() => { if (!open) { setOpen(true); setQ(''); setActive(0) } }}
        onChange={e => { setQ(e.target.value); setActive(0); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); setActive(a => Math.min(a + 1, Math.max(list.length - 1, 0))) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter') { if (open && list[active]) { e.preventDefault(); pick(list[active]) } }
          else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
        }}
        className={`input-field min-h-[44px] pe-9 text-[16px] sm:text-sm ${invalid ? 'border-2 border-[#D4A543] bg-[#D4A543]/5' : ''}`} />
      <ChevronDown className="w-4 h-4 text-gray-500 absolute top-1/2 -translate-y-1/2 end-3 pointer-events-none" aria-hidden />
      {open && (
        <ul id={listId} ref={listRef} role="listbox" aria-label={L('Cities', 'شہر', 'المدن')}
          className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
          {list.length === 0 && <li className="px-3 py-3 text-[13px] text-gray-500">{L('We found no city by this name. Choose the city nearest to you, and write your town’s name in the «District» box.', 'اس نام کا کوئی شہر نہیں ملا۔ اپنے قریب ترین شہر کو منتخب کریں، اور اپنے قصبے کا نام «محلہ» کے خانے میں لکھیں۔', 'لم نجد مدينة بهذا الاسم. اختر أقرب مدينة إليك، واكتب اسم بلدتك في خانة «الحي».')}</li>}
          {list.map((c, i) => {
            const on = !!sel && sel.ar === c.ar && sel.region === c.region
            return (
              <li key={c.region + '|' + c.ar} id={optId(i)} role="option" aria-selected={on}
                onMouseDown={e => e.preventDefault()} onClick={() => pick(c)} onMouseEnter={() => setActive(i)}
                className={`min-h-[44px] px-3 flex items-center justify-between gap-2 cursor-pointer text-sm ${i === active ? 'bg-[#D4A543]/10' : ''} ${on ? 'font-bold text-[#0B2438]' : 'text-gray-800'}`}>
                <span>{cityOptionLabel(c, locale)}</span>
                <span className="flex items-center gap-1 text-[12px] text-gray-500 shrink-0">{!c.dup && getRegionLabel(c.region, locale)}{on && <Check className="w-4 h-4 text-[#0B2438]" aria-hidden />}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
