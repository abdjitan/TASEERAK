'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SUB_CATEGORIES, hydrateTaxonomy } from '@/types'
import { BROWSE_SECTIONS, subsOfSection, sectionOfSub, type BrowseSection } from '@/lib/browseCategories'
import { SUPPLIER_PACKS, packSpecialties, type SupplierPack } from '@/lib/supplierPacks'
import { sectionKeys, sectionsOfSpecialties, sectionName, sectorsFor } from '@/lib/sellers'
import { arCount } from '@/lib/text'

// «ماذا تبيع؟» — the one way a seller chooses what he sells (owner 2026-11-27), used by onboarding
// and /supplier/specialties:
//   1. a grid of the 10 browse sections (medallion, name, one-line hint), multi-select;
//   2. optional, folded: each chosen section's sub-categories as chips, all on by default — unticking
//      narrows what reaches the seller. Ready-made packs («محل كهرباء»…) live here, inside their section.
// The value is the list of sub-category keys; the caller saves it with save_supplier_specialties and
// sectorsFor([], keys). Keys outside every section are kept as they are.
const GOLD = '#D4A543'
const NAVY = '#071827'

type Props = {
  specialties: string[]
  onChange: (next: string[]) => void
  locale: string
  /** a pricing agent «prices» materials, he does not «sell» them */
  independent?: boolean
  /** read-only (a company team member) */
  disabled?: boolean
  /** count the open requests that match the choice now (get_supplier_feed) */
  showMatches?: boolean
  /** extra content at the end of the optional part (e.g. «لا تجد ما تبيعه؟») */
  extra?: React.ReactNode
}

// The section where most of a pack's keys sit: the pack is offered inside that section.
function packHome(p: SupplierPack): BrowseSection | null {
  const n: Record<string, number> = {}
  for (const [sector, keys] of Object.entries(p.specialties)) {
    for (const k of keys || []) {
      const sec = sectionOfSub(k, ((SUB_CATEGORIES as any)[sector] || {})[k]?.group || null)
      if (sec) n[sec] = (n[sec] || 0) + 1
    }
  }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0]
  return best ? (best[0] as BrowseSection) : null
}

export default function SellWhatPicker({ specialties, onChange, locale, independent = false, disabled = false, showMatches = false, extra }: Props) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const [ver, setVer] = useState(0)
  const [fine, setFine] = useState(false)
  // a section narrowed down to nothing stays open in step 2 until its card is tapped again
  const [kept, setKept] = useState<BrowseSection[]>([])
  const [feed, setFeed] = useState<any[] | null>(null)

  // fresh taxonomy (admin-added sub-categories show here without a redeploy)
  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const { data } = await createClient().rpc('get_taxonomy')
        if (!off && Array.isArray(data) && data.length) { hydrateTaxonomy(data); setVer(v => v + 1) }
      } catch { /* bundled taxonomy */ }
    })()
    return () => { off = true }
  }, [])

  // open requests now (same feed as the dashboard); the count below is worked out from the choice
  useEffect(() => {
    if (!showMatches) return
    let off = false
    Promise.resolve(createClient().rpc('get_supplier_feed', { p_sectors: null, p_min_value: 0, p_limit: 150 }))
      .then(({ data, error }: any) => { if (!off && !error && Array.isArray(data)) setFeed(data) }, () => {})
    return () => { off = true }
  }, [showMatches])

  const keysBySection = useMemo(() => {
    const m = {} as Record<BrowseSection, string[]>
    for (const s of BROWSE_SECTIONS) m[s.key] = sectionKeys(s.key)
    return m
  }, [ver]) // eslint-disable-line react-hooks/exhaustive-deps

  const subLabel = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of BROWSE_SECTIONS) for (const x of subsOfSection(s.key)) if (!m[x.key]) m[x.key] = pick(x)
    return m
  }, [ver, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  const packsBySection = useMemo(() => {
    const m: Partial<Record<BrowseSection, { p: SupplierPack; keys: string[] }[]>> = {}
    for (const p of SUPPLIER_PACKS) {
      const home = packHome(p)
      if (!home) continue
      const inSec = new Set(keysBySection[home] || [])
      const keys = packSpecialties(p).filter(k => inSec.has(k))
      // a pack that is the whole section adds nothing to «all of the section»
      if (keys.length < 2 || keys.length >= inSec.size) continue
      ;(m[home] = m[home] || []).push({ p, keys })
    }
    return m
  }, [keysBySection])

  const sel = new Set(specialties)
  const chosen = sectionsOfSpecialties(specialties)

  function toggleSection(sec: BrowseSection) {
    const keys = keysBySection[sec] || []
    const on = keys.some(k => sel.has(k))
    setKept(prev => prev.filter(x => x !== sec))
    if (on) onChange(specialties.filter(k => !keys.includes(k)))
    else onChange(Array.from(new Set([...specialties, ...keys])))
  }
  function toggleKey(sec: BrowseSection, k: string) {
    setKept(prev => (prev.includes(sec) ? prev : [...prev, sec]))
    onChange(sel.has(k) ? specialties.filter(x => x !== k) : [...specialties, k])
  }
  // set one section's choice to exactly these keys (all / a ready-made pack)
  function setSection(sec: BrowseSection, keys: string[]) {
    const all = keysBySection[sec] || []
    onChange(Array.from(new Set([...specialties.filter(k => !all.includes(k)), ...keys])))
  }

  // live match count (same rule as the dashboard feed)
  let matches: number | null = null
  if (feed && specialties.length) {
    const secs = sectorsFor([], specialties)
    const now = Date.now()
    matches = feed.filter((r: any) => {
      if (r.expires_at && new Date(r.expires_at).getTime() < now) return false
      const its = Array.isArray(r.items) && r.items.length ? r.items : [{ sector: r.sector, sub_category: r.sub_category }]
      return its.some((it: any) => secs.includes(it.sector) && (!it.sub_category || sel.has(it.sub_category)))
    }).length
  }

  const shown = BROWSE_SECTIONS.map(s => s.key).filter(k => chosen.includes(k) || kept.includes(k))
  const names = chosen.map(s => sectionName(s, locale))
  const sep = locale === 'ar' || locale === 'ur' ? '، ' : ', '

  return (
    <div>
      {/* Step 1: the sections */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5" role="group"
        aria-label={independent ? L('What do you price?', 'آپ کس چیز کی قیمت دیتے ہیں؟', 'ما الذي تسعّره؟') : L('What do you sell?', 'آپ کیا بیچتے ہیں؟', 'ماذا تبيع؟')}>
        {BROWSE_SECTIONS.map(s => {
          const all = keysBySection[s.key] || []
          const have = all.filter(k => sel.has(k)).length
          const on = have > 0
          const partial = on && have < all.length
          return (
            <button key={s.key} type="button" disabled={disabled} onClick={() => toggleSection(s.key)} aria-pressed={on}
              className={`relative flex flex-col items-center text-center gap-1 p-3 pt-3.5 min-h-[128px] rounded-2xl border-2 transition-all disabled:cursor-default ${on ? 'shadow-sm' : 'bg-white border-gray-200 hover:border-[#D4A543]/60'}`}
              style={on ? { borderColor: GOLD, background: 'rgba(212,165,67,0.09)' } : {}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/section-icons/${s.key}.webp`} alt="" aria-hidden="true" loading="lazy" className="w-14 h-14 object-contain" />
              <span className="font-bold text-[13.5px] leading-snug" style={{ color: NAVY }}>{pick(s)}</span>
              <span className="text-[12px] text-gray-500 leading-snug line-clamp-2">{pick(s.hint)}</span>
              {partial && <span className="text-[12px] font-bold text-[#8F6820]">{L(`${have} of ${all.length}`, `${all.length} میں سے ${have}`, `${have} من ${all.length}`)}</span>}
              {on && (
                <span className="absolute top-2 end-2 w-6 h-6 grid place-items-center rounded-full" style={{ background: GOLD, color: NAVY }} aria-hidden="true">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* the live line */}
      <div role="status" aria-live="polite" className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed border ${chosen.length ? 'bg-[#0B2438]/5 border-[#0B2438]/10 text-[#0B2438]' : 'bg-warn-bg border-warn-border text-warn-text font-semibold'}`}>
        {chosen.length ? (<>
          <b>{L('You will receive requests for: ', 'آپ کو ان کی درخواستیں ملیں گی: ', 'ستصلك طلبات: ')}</b>{names.join(sep)}
          {matches != null && matches > 0 && (
            <span className="block mt-0.5 font-semibold text-[#8F6820]">
              {L(`${matches} open request${matches === 1 ? '' : 's'} match your choice now.`, `ابھی ${matches} کھلی درخواستیں آپ کے انتخاب سے ملتی ہیں۔`, `يطابق اختيارك الآن ${arCount(matches, 'طلبٌ مفتوح واحد', 'طلبان مفتوحان', 'طلبات مفتوحة', 'طلباً مفتوحاً')}.`)}
            </span>
          )}
        </>) : (independent
          ? L('Choose at least one section you price; no requests reach you until you do.', 'کم از کم ایک سیکشن منتخب کریں جس کی آپ قیمت دیتے ہیں؛ اس کے بغیر کوئی درخواست نہیں آئے گی۔', 'اختر قسماً واحداً على الأقل مما تسعّره، فلن تصلك طلبات قبل ذلك.')
          : L('Choose at least one section you sell from; no requests reach you until you do.', 'کم از کم ایک سیکشن منتخب کریں جس سے آپ بیچتے ہیں؛ اس کے بغیر کوئی درخواست نہیں آئے گی۔', 'اختر قسماً واحداً على الأقل مما تبيعه، فلن تصلك طلبات قبل ذلك.'))}
      </div>

      {/* Step 2 (optional): narrow each chosen section */}
      {(shown.length > 0 || extra) && (
        <div className="mt-3">
          <button type="button" onClick={() => setFine(v => !v)} aria-expanded={fine}
            className="w-full min-h-[44px] flex items-center justify-between gap-2 px-3.5 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-[#8F6820] hover:border-[#D4A543]">
            <span>{L('Pick the exact materials (optional)', 'درست مال منتخب کریں (اختیاری)', 'تحديد المواد بدقّة (اختياري)')}</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${fine ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {fine && (
            <div className="mt-3 space-y-3">
              {shown.length > 0 && (
                <p className="text-[13px] text-gray-600">{L('We chose every material in the section; remove what you do not sell.', 'ہم نے سیکشن کا سارا مال منتخب کیا ہے؛ جو آپ نہیں بیچتے اسے ہٹا دیں۔', 'اخترنا كل مواد القسم، أزل ما لا تبيعه.')}</p>
              )}
              {shown.map(sec => {
                const all = keysBySection[sec] || []
                const have = all.filter(k => sel.has(k)).length
                const packs = packsBySection[sec] || []
                return (
                  <div key={sec} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/images/section-icons/${sec}.webp`} alt="" aria-hidden="true" loading="lazy" className="w-8 h-8 shrink-0 object-contain" />
                        <span className="font-bold text-sm truncate" style={{ color: NAVY }}>{sectionName(sec, locale)}</span>
                        <span className="text-[12px] font-bold rounded-full px-2 py-0.5 shrink-0" style={{ background: GOLD, color: NAVY }}>{have}/{all.length}</span>
                      </span>
                      {have < all.length && (
                        <button type="button" disabled={disabled} onClick={() => setSection(sec, all)} className="min-h-[44px] px-2 text-[13px] font-bold text-[#8F6820] underline shrink-0">
                          {L('Select all', 'سب منتخب کریں', 'اختر الكل')}
                        </button>
                      )}
                    </div>
                    {packs.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="text-[12px] font-bold text-gray-600">{L('Ready-made:', 'تیار انتخاب:', 'اختيار جاهز:')}</span>
                        {packs.map(({ p, keys }) => {
                          const exact = have === keys.length && keys.every(k => sel.has(k))
                          return (
                            <button key={p.id} type="button" disabled={disabled} onClick={() => setSection(sec, keys)} aria-pressed={exact}
                              className={`min-h-[44px] px-3 rounded-full text-[13px] font-semibold border transition-all ${exact ? 'border-2 text-[#071827]' : 'bg-white border-gray-300 text-gray-700 hover:border-[#D4A543]'}`}
                              style={exact ? { borderColor: GOLD, background: 'rgba(212,165,67,0.12)' } : {}}>
                              {pick(p)}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {all.map(k => {
                        const on = sel.has(k)
                        return (
                          <button key={k} type="button" disabled={disabled} onClick={() => toggleKey(sec, k)} aria-pressed={on}
                            className={`inline-flex items-center gap-1 min-h-[44px] px-3 rounded-full text-[13px] font-medium border-2 transition-all ${on ? 'text-[#071827]' : 'bg-white border-gray-200 text-gray-500 line-through decoration-gray-300 hover:border-gray-300'}`}
                            style={on ? { borderColor: GOLD, background: 'rgba(212,165,67,0.10)' } : {}}>
                            {on && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
                            {subLabel[k] || k}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {extra}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
