'use client'
// «Not in the list» item → which specialty is it? The buyer confirms (or changes) our guess with
// one tap: section medallion, then specialty. «لا أعرف» keeps the old behaviour (every supplier of
// the guessed sector). Same flow as the mobile app (commit 329eb30).
import { useMemo, useState } from 'react'
import { BROWSE_SECTIONS, sectionOfSub, subsOfSection, type BrowseSection } from '@/lib/browseCategories'
import { SUB_CATEGORIES, detectSubCategory, type Sector } from '@/types'

export type SpecialtyChoice = { sector: string; sub: string | null }

export default function LineSpecialty({ name, sector, value, onChange, locale }: {
  name: string
  sector: string
  /** undefined = not chosen yet (our guess is shown); sub null = «لا أعرف» */
  value?: SpecialtyChoice
  onChange: (v: SpecialtyChoice) => void
  locale: string
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const guessSub = useMemo(() => detectSubCategory(name, sector as Sector) || null, [name, sector])
  const current = value ?? { sector, sub: guessSub }
  const subGroup = (sec: string, key: string | null) => (key ? (SUB_CATEGORIES as any)[sec]?.[key]?.group : null)
  const [section, setSection] = useState<BrowseSection | null>(() => sectionOfSub(current.sub, subGroup(current.sector, current.sub)))
  const subs = section ? subsOfSection(section) : []

  const chip = (on: boolean) => `shrink-0 text-xs font-bold rounded-full border transition-colors ${on ? 'text-white border-[#D4A543]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#D4A543]'}`

  return (
    <div className="rounded-xl border border-dashed border-[#D4A543]/50 bg-[#D4A543]/[.05] p-2.5 space-y-2">
      <p className="text-[11px] font-bold text-[#0B2438]">
        {L('Not in our list — which specialty is it? (so it reaches the right suppliers)', 'فہرست میں نہیں — کس شعبے کا ہے؟', 'غير موجودة في القائمة — لأي تخصص تتبع؟ (ليصل طلبك للمورد المختص)')}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {BROWSE_SECTIONS.map(b => (
          <button key={b.key} type="button" onClick={() => setSection(b.key)} aria-pressed={section === b.key}
            className={`${chip(section === b.key)} inline-flex items-center gap-1 ps-0.5 pe-2.5 py-0.5`} style={section === b.key ? { background: '#0B2438' } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/section-icons/${b.key}.webp`} alt="" aria-hidden className="w-6 h-6" />{pick(b)}
          </button>
        ))}
      </div>
      {section && (
        <div className="flex flex-wrap gap-1.5">
          {subs.map(s => {
            const on = current.sub === s.key && current.sector === s.sector
            return (
              <button key={s.sector + s.key} type="button" onClick={() => onChange({ sector: s.sector, sub: s.key })} aria-pressed={on}
                className={`${chip(on)} px-2.5 py-1`} style={on ? { background: '#0F6E56', borderColor: '#0F6E56' } : undefined}>
                {on ? '✓ ' : ''}{pick(s)}
              </button>
            )
          })}
          <button type="button" onClick={() => onChange({ sector: current.sector, sub: null })} aria-pressed={current.sub === null}
            className={`${chip(current.sub === null)} px-2.5 py-1`} style={current.sub === null ? { background: '#728196', borderColor: '#728196' } : undefined}>
            {L("I don't know", 'معلوم نہیں', 'لا أعرف')}
          </button>
        </div>
      )}
    </div>
  )
}
