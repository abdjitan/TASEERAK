'use client'
// «Not in the materials guide» item → which specialty is it? (owner 2026-10-24: bigger, clearer, and it
// folds once chosen.) Steps: our guess with «نعم / تغيير» → the sections as large cards → that section's
// specialties as large buttons → a one-line summary with «تغيير». «لا أعرف» keeps the old
// behaviour (every supplier of the guessed sector). Same flow as the mobile app.
import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { BROWSE_SECTIONS, sectionOfSub, subsOfSection, type BrowseSection } from '@/lib/browseCategories'
import { SUB_CATEGORIES, detectSubCategory, type Sector } from '@/types'

// sub null = «لا أعرف التخصص» inside a chosen section (owner 2026-10-24: a main section is required)
export type SpecialtyChoice = { sector: string; sub: string | null; section?: string }
/** a choice that routes somewhere: a specialty, or at least a main section */
export const choiceDone = (v?: SpecialtyChoice) => !!v && (!!v.sub || !!v.section)

export default function LineSpecialty({ name, sector, value, onChange, locale, simple = false, fromPhoto = false }: {
  name: string
  sector: string
  /** undefined = not chosen yet (our guess is shown); sub null = «لا أعرف» */
  value?: SpecialtyChoice
  onChange: (v: SpecialtyChoice) => void
  locale: string
  /** a home buyer: no heavy machinery section */
  simple?: boolean
  /** the name came from a photo: «we suggest», not «not found» (round-4 UX-119) */
  fromPhoto?: boolean
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
  const sections = simple ? BROWSE_SECTIONS.filter(b => b.key !== 'machinery') : BROWSE_SECTIONS
  // «إغلاق» only when it leads somewhere: back to a choice or to our guess
  const canClose = choiceDone(value) || !!guessSub

  if (!open) {
    const chosen = choiceDone(value)
    return (
      <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap ${chosen ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-[#D4A543]/60 bg-[#D4A543]/[.07]'}`}>
        <div className="min-w-0 text-sm">
          <span className="text-gray-600">{chosen ? (simple ? L('Sent to suppliers of: ', 'ان سپلائرز کو جائے گا: ', 'يُرسَل إلى موردي: ') : L('Specialty: ', 'شعبہ: ', 'التخصص: ')) : fromPhoto ? L('Which section is this material in? We suggest: ', 'یہ سامان کس شعبے میں ہے؟ ہماری تجویز: ', 'في أي قسم تقع هذه المادة؟ نقترح: ') : L('Not found in the materials guide. Is it from: ', 'مواد کی فہرست میں نہیں ملا۔ کیا یہ اس میں سے ہے: ', 'لم نجدها في دليل المواد. هل هي من: ')}</span>
          <b className="text-[#0B2438]">{curLabel || (chosen ? L(`${sectionName(value?.section)} (all its suppliers)`, `${sectionName(value?.section)} (سب سپلائرز)`, `${sectionName(value?.section)} (كل موردي القسم)`) : '')}</b>
          {!chosen && curLabel && <span className="text-gray-600">{L('?', '؟', '؟')}</span>}
        </div>
        <div className="flex gap-2 shrink-0">
          {!chosen && curLabel && (
            <button type="button" onClick={() => choose({ sector: current.sector, sub: current.sub })}
              className="min-h-[44px] px-4 rounded-xl text-sm font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>{L('Yes', 'ہاں', 'نعم')}</button>
          )}
          <button type="button" onClick={startChange}
            className="min-h-[44px] px-4 rounded-xl text-sm font-bold border border-gray-300 bg-white text-[#0B2438] hover:border-[#D4A543]">
            {chosen || curLabel ? L('Change', 'تبدیل', 'تغيير') : simple ? L('Choose its kind', 'اس کی قسم چنیں', 'اختر نوعها') : L('Choose its specialty', 'شعبہ چنیں', 'اختر تخصصها')}
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
            ? (simple ? L('Choose its kind', 'اس کی قسم چنیں', 'اختر نوعها') : L('Which specialty?', 'کون سا شعبہ؟', 'اختر التخصص'))
            : L('Which section is it from? (so it reaches the right suppliers)', 'کس شعبے کا ہے؟ (تاکہ صحیح سپلائرز تک پہنچے)', 'من أي قسم هذه المادة؟ (لتصل إلى الموردين المختصين)')}
        </p>
        {(section || canClose) && (
          <button type="button" onClick={() => (section ? setSection(null) : setOpen(false))} className="min-h-[44px] px-2 text-sm font-bold text-[#8F6820] hover:underline shrink-0">
            {section ? L('← Sections', '→ شعبے', '→ الأقسام') : L('Close', 'بند', 'إغلاق')}
          </button>
        )}
      </div>
      {!section ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sections.map(b => (
            <button key={b.key} type="button" onClick={() => setSection(b.key)}
              className="flex items-center gap-2 min-h-[52px] p-2.5 rounded-xl border border-gray-200 bg-white text-start hover:border-[#D4A543] hover:bg-[#D4A543]/5 transition-colors">
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
                className={`min-h-[44px] px-3 py-2.5 rounded-xl border-2 text-sm font-bold text-start text-[#0B2438] transition-colors inline-flex items-center gap-1.5 ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'bg-white border-gray-200 hover:border-[#D4A543] hover:bg-[#D4A543]/5'}`}>
                {on && <Check className="w-4 h-4 shrink-0" aria-hidden />}{pick(s)}
              </button>
            )
          })}
        </div>
      )}
      {section && (
        <button type="button" onClick={() => choose({ sector: subs[0]?.sector || current.sector, sub: null, section })}
          className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">
          {L(`I don't know the specialty: send it to all suppliers of «${sectionName(section)}»`, `شعبہ معلوم نہیں: «${sectionName(section)}» کے سب سپلائرز کو بھیجیں`, `لا أعرف التخصص: أرسلها إلى كل موردي «${sectionName(section)}»`)}
        </button>
      )}
    </div>
  )
}
