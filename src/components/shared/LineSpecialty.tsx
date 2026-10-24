'use client'
// «Not in the list» item → which specialty is it? (owner 2026-10-24: bigger, clearer, and it folds
// once chosen.) Steps: our guess with «نعم / تغيير» → the sections as large cards → that section's
// specialties as large buttons → a one-line summary with «تغيير». «لا أعرف» keeps the old
// behaviour (every supplier of the guessed sector). Same flow as the mobile app.
import { useMemo, useState } from 'react'
import { BROWSE_SECTIONS, sectionOfSub, subsOfSection, type BrowseSection } from '@/lib/browseCategories'
import { SUB_CATEGORIES, detectSubCategory, type Sector } from '@/types'

// sub null = «لا أعرف التخصص» inside a chosen section (owner 2026-10-24: a main section is required)
export type SpecialtyChoice = { sector: string; sub: string | null; section?: string }
/** a choice that routes somewhere: a specialty, or at least a main section */
export const choiceDone = (v?: SpecialtyChoice) => !!v && (!!v.sub || !!v.section)

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
  const subInfo = (sec: string, key: string | null) => (key ? (SUB_CATEGORIES as any)[sec]?.[key] : null)
  const [section, setSection] = useState<BrowseSection | null>(null)
  // open = choosing; closed = a one-line summary (after a choice, or our guess waiting for «نعم»).
  // Nothing chosen and no guess → open straight on the sections.
  const [open, setOpen] = useState(() => !choiceDone(value) && !guessSub)
  const choose = (v: SpecialtyChoice) => { onChange(v); setOpen(false); setSection(null) }
  const startChange = () => { setSection(sectionOfSub(current.sub, subInfo(current.sector, current.sub)?.group) || ((value?.section as BrowseSection) || null)); setOpen(true) }
  const sectionName = (k?: string | null) => { const b = BROWSE_SECTIONS.find(x => x.key === k); return b ? pick(b) : '' }
  const curLabel = subInfo(current.sector, current.sub) ? pick(subInfo(current.sector, current.sub)) : null

  if (!open) {
    const chosen = choiceDone(value)
    return (
      <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap ${chosen ? 'border-[#0F6E56]/30 bg-[#0F6E56]/[.05]' : 'border-[#D4A543]/60 bg-[#D4A543]/[.07]'}`}>
        <div className="min-w-0 text-sm">
          <span className="text-gray-500">{chosen ? L('Specialty: ', 'شعبہ: ', 'التخصص: ') : L('Not in our list. Is it: ', 'فہرست میں نہیں۔ کیا یہ ہے: ', 'غير موجودة في القائمة. هل تتبع: ')}</span>
          <b className="text-[#0B2438]">{curLabel || (chosen ? L(`${sectionName(value?.section)} (all its suppliers)`, `${sectionName(value?.section)} (سب سپلائرز)`, `${sectionName(value?.section)} (كل موردي القسم)`) : '')}</b>
          {!chosen && curLabel && <span className="text-gray-500">؟</span>}
        </div>
        <div className="flex gap-2 shrink-0">
          {!chosen && curLabel && (
            <button type="button" onClick={() => choose({ sector: current.sector, sub: current.sub })}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0F6E56' }}>{L('Yes', 'ہاں', 'نعم')}</button>
          )}
          <button type="button" onClick={startChange}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-300 bg-white text-[#0B2438] hover:border-[#D4A543]">
            {chosen || curLabel ? L('Change', 'تبدیل', 'تغيير') : L('Choose its specialty', 'شعبہ چنیں', 'اختر تخصصها')}
          </button>
        </div>
      </div>
    )
  }

  const subs = section ? subsOfSection(section) : []
  return (
    <div className="rounded-xl border border-[#D4A543]/60 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#0B2438]">
          {section
            ? L('Which specialty?', 'کون سا شعبہ؟', 'اختر التخصص')
            : L('Which section is it from? (so it reaches the right suppliers)', 'کس شعبے کا ہے؟', 'من أي قسم هذه المادة؟ (ليصل طلبك للمورد المختص)')}
        </p>
        <button type="button" onClick={() => (section ? setSection(null) : (choiceDone(value) || guessSub) ? setOpen(false) : undefined)} className="text-sm font-bold text-[#9D7425] hover:underline shrink-0">
          {section ? L('← Sections', '← شعبے', 'الأقسام ←') : L('Close', 'بند', 'إغلاق')}
        </button>
      </div>
      {!section ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BROWSE_SECTIONS.map(b => (
            <button key={b.key} type="button" onClick={() => setSection(b.key)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white text-start hover:border-[#D4A543] hover:bg-[#D4A543]/5 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/section-icons/${b.key}.webp`} alt="" aria-hidden className="w-9 h-9 shrink-0" />
              <span className="text-sm font-bold text-[#0B2438] leading-snug">{pick(b)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {subs.map(s => {
            const on = current.sub === s.key && current.sector === s.sector
            return (
              <button key={s.sector + s.key} type="button" onClick={() => choose({ sector: s.sector, sub: s.key })} aria-pressed={on}
                className={`px-3 py-2.5 rounded-xl border text-sm font-bold text-start transition-colors ${on ? 'text-white border-[#0F6E56]' : 'bg-white text-[#0B2438] border-gray-200 hover:border-[#D4A543] hover:bg-[#D4A543]/5'}`}
                style={on ? { background: '#0F6E56' } : undefined}>
                {pick(s)}
              </button>
            )
          })}
        </div>
      )}
      {section && (
        <button type="button" onClick={() => choose({ sector: subs[0]?.sector || current.sector, sub: null, section })}
          className="w-full px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50">
          {L(`I don't know the specialty — send it to all suppliers of «${sectionName(section)}»`, `شعبہ معلوم نہیں — «${sectionName(section)}» کے سب سپلائرز`, `لا أعرف التخصص — أرسله لكل موردي «${sectionName(section)}»`)}
        </button>
      )}
    </div>
  )
}
