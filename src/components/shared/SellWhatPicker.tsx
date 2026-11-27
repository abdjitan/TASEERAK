'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SUB_CATEGORIES, hydrateTaxonomy, getProductLabel, taxonomyVersion } from '@/types'
import { BROWSE_SECTIONS, subsOfSection, sectionOfSub, productsOfSub, type BrowseSection } from '@/lib/browseCategories'
import { SUPPLIER_PACKS, packSpecialties, type SupplierPack } from '@/lib/supplierPacks'
import { sectionKeys, sectionName, sectorsFor } from '@/lib/sellers'
import { arCount, arMaterials } from '@/lib/text'

// «ماذا تبيع؟» — the one way a seller chooses what he sells (owner 2026-11-27, second version), used by
// onboarding and /supplier/specialties. Nothing is chosen for him:
//   1. the 10 browse sections as cards; tapping one opens it (a panel under the grid, a sheet on phones);
//   2. inside, the section's lists (sub-categories) with a checkbox each, all unticked;
//   3. ticking a list (or tapping its row) opens its materials, all ticked and shown at once; he unticks
//      what he does not sell and presses «تم». Unticking every material unticks the list.
// Values: `specialties` = the chosen sub-category keys (saved with save_supplier_specialties and
// sectorsFor([], keys)); `excluded` = the Arabic names of the materials he unticked inside the chosen
// lists (saved with save_supplier_excluded_products). Keys outside every section are kept as they are.
const GOLD = '#D4A543'
const NAVY = '#071827'

type Props = {
  specialties: string[]
  onChange: (next: string[]) => void
  /** the Arabic product names unticked inside the chosen lists */
  excluded?: string[]
  onExcludedChange?: (next: string[]) => void
  locale: string
  /** a pricing agent «prices» materials, he does not «sell» them */
  independent?: boolean
  /** read-only (a company team member) */
  disabled?: boolean
  /** count the open requests that match the choice now (get_supplier_feed) */
  showMatches?: boolean
  /** extra content under the picker (e.g. «لا تجد ما تبيعه؟») */
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

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function SellWhatPicker({ specialties, onChange, excluded = [], onExcludedChange, locale, independent = false, disabled = false, showMatches = false, extra }: Props) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const [ver, setVer] = useState(0)
  const [openSec, setOpenSec] = useState<BrowseSection | null>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [isPhone, setIsPhone] = useState(false)
  const [feed, setFeed] = useState<any[] | null>(null)
  const cardRefs = useRef<Partial<Record<BrowseSection, HTMLButtonElement | null>>>({})
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

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

  // phones get a sheet, wider screens a panel under the grid
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 639px)')
    const on = () => setIsPhone(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  // open requests now (same feed as the dashboard); the count below is worked out from the choice
  useEffect(() => {
    if (!showMatches) return
    let off = false
    Promise.resolve(createClient().rpc('get_supplier_feed', { p_sectors: null, p_min_value: 0, p_limit: 150 }))
      .then(({ data, error }: any) => { if (!off && !error && Array.isArray(data)) setFeed(data) }, () => {})
    return () => { off = true }
  }, [showMatches])

  const tv = taxonomyVersion()
  const keysBySection = useMemo(() => {
    const m = {} as Record<BrowseSection, string[]>
    for (const s of BROWSE_SECTIONS) m[s.key] = sectionKeys(s.key)
    return m
  }, [ver, tv]) // eslint-disable-line react-hooks/exhaustive-deps

  const subLabel = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of BROWSE_SECTIONS) for (const x of subsOfSection(s.key)) if (!m[x.key]) m[x.key] = pick(x)
    return m
  }, [ver, tv, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  const packsBySection = useMemo(() => {
    const m: Partial<Record<BrowseSection, { p: SupplierPack; keys: string[] }[]>> = {}
    for (const p of SUPPLIER_PACKS) {
      const home = packHome(p)
      if (!home) continue
      const inSec = new Set(keysBySection[home] || [])
      const keys = packSpecialties(p).filter(k => inSec.has(k))
      // a pack that is the whole section adds nothing to ticking every list
      if (keys.length < 2 || keys.length >= inSec.size) continue
      ;(m[home] = m[home] || []).push({ p, keys })
    }
    return m
  }, [keysBySection])

  const sel = new Set(specialties)
  const excl = new Set(excluded)

  // ── changes ──
  function setExcluded(next: Set<string>) { onExcludedChange?.(Array.from(next)) }
  // tick / untick whole lists: their materials all come back ticked
  function setGroups(keys: string[], on: boolean) {
    if (on) onChange(Array.from(new Set([...specialties, ...keys])))
    else onChange(specialties.filter(k => !keys.includes(k)))
    const drop = new Set(keys.flatMap(k => productsOfSub(k)))
    if (excluded.some(n => drop.has(n))) setExcluded(new Set(excluded.filter(n => !drop.has(n))))
  }
  function toggleProduct(k: string, name: string) {
    const all = productsOfSub(k)
    if (!sel.has(k)) {
      // the list was unticked: this material alone is chosen
      onChange([...specialties, k])
      const next = new Set(excluded.filter(n => !all.includes(n)))
      for (const n of all) if (n !== name) next.add(n)
      setExcluded(next)
      return
    }
    const next = new Set(excl)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    if (all.length && all.every(n => next.has(n))) { setGroups([k], false); return } // nothing left: the list is unticked
    setExcluded(next)
  }

  function openSection(sec: BrowseSection) {
    if (openSec === sec) { closeSection(); return }
    setOpenSec(sec); setOpenGroup(null)
  }
  function closeSection() {
    const sec = openSec
    setOpenSec(null); setOpenGroup(null)
    if (sec) setTimeout(() => cardRefs.current[sec]?.focus(), 0)
  }
  // a row: unticked → tick and open its materials; ticked → open / close its materials
  function tapRow(k: string) {
    if (!sel.has(k)) { setGroups([k], true); setOpenGroup(k); return }
    setOpenGroup(g => (g === k ? null : k))
  }
  function tapBox(k: string) {
    if (sel.has(k)) { setGroups([k], false); if (openGroup === k) setOpenGroup(null) }
    else { setGroups([k], true); setOpenGroup(k) }
  }

  // the sheet: focus inside, Tab stays inside, Escape closes, the page does not scroll behind it
  useEffect(() => {
    if (!openSec || !isPhone) return
    const el = sheetRef.current
    const first = el?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (!sheetRef.current) return
      if (e.key === 'Escape') { e.preventDefault(); escape(); return }
      if (e.key !== 'Tab') return
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) return
      const a = items[0], z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      else if (!sheetRef.current.contains(document.activeElement)) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [openSec, isPhone]) // eslint-disable-line react-hooks/exhaustive-deps

  // the panel (wider screens): bring it into view when a section opens
  useEffect(() => {
    if (openSec && !isPhone) panelRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [openSec, isPhone])

  // Escape closes the innermost open part: a list's materials first, then the section
  const openGroupRef = useRef(openGroup)
  openGroupRef.current = openGroup
  function escape() {
    if (openGroupRef.current) setOpenGroup(null)
    else closeSection()
  }

  // ── what reaches him ──
  const chosenOrdered: string[] = []
  for (const s of BROWSE_SECTIONS) for (const k of keysBySection[s.key] || []) if (sel.has(k) && !chosenOrdered.includes(k)) chosenOrdered.push(k)

  // live match count (same rule as the dashboard feed, without the materials he unticked)
  let matches: number | null = null
  if (feed && specialties.length) {
    const secs = sectorsFor([], specialties)
    const now = Date.now()
    matches = feed.filter((r: any) => {
      if (r.expires_at && new Date(r.expires_at).getTime() < now) return false
      const its = Array.isArray(r.items) && r.items.length ? r.items : [{ sector: r.sector, sub_category: r.sub_category, product_name: r.product_name }]
      return its.some((it: any) => secs.includes(it.sector) && (!it.sub_category || sel.has(it.sub_category)) && !(it.product_name && excl.has(String(it.product_name))))
    }).length
  }

  const sep = locale === 'ar' || locale === 'ur' ? '، ' : ', '
  const MAX_NAMES = 8
  const shownNames = chosenOrdered.slice(0, MAX_NAMES).map(k => subLabel[k] || k)
  const moreNames = chosenOrdered.length - shownNames.length
  const listsLabel = (n: number) => L(`${n} list${n === 1 ? '' : 's'}`, `${n} فہرستیں`, arCount(n, 'قائمة واحدة', 'قائمتان', 'قوائم', 'قائمة'))
  const itemsLabel = (n: number) => L(`${n} item${n === 1 ? '' : 's'}`, `${n} اشیاء`, arMaterials(n))
  const question = independent ? L('What do you price?', 'آپ کس چیز کی قیمت دیتے ہیں؟', 'ما الذي تسعّره؟') : L('What do you sell?', 'آپ کیا بیچتے ہیں؟', 'ماذا تبيع؟')

  // ── one open section (shared by the panel and the sheet) ──
  function sectionBody(sec: BrowseSection) {
    const seen = new Set<string>()
    const rows = subsOfSection(sec).filter(x => (seen.has(x.key) ? false : (seen.add(x.key), true)))
    const packs = packsBySection[sec] || []
    const have = (keysBySection[sec] || []).filter(k => sel.has(k)).length
    return (
      <>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/section-icons/${sec}.webp`} alt="" aria-hidden="true" loading="lazy" className="w-10 h-10 shrink-0 object-contain" />
            <span id={`swp-title-${sec}`} className="font-bold text-[15px] leading-snug" style={{ color: NAVY }}>{sectionName(sec, locale)}</span>
            {have > 0 && <span className="text-[12px] font-bold rounded-full px-2 py-0.5 shrink-0" style={{ background: GOLD, color: NAVY }}>{listsLabel(have)}</span>}
          </span>
          <button type="button" onClick={closeSection} aria-label={L('Close the section', 'سیکشن بند کریں', 'إغلاق القسم')}
            className="w-11 h-11 shrink-0 grid place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-[#071827]">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[13px] text-gray-600 mb-2.5">
          {independent
            ? L('Tick the lists you price, then untick in each list what you do not price.', 'جن فہرستوں کی آپ قیمت دیتے ہیں انہیں منتخب کریں، پھر ہر فہرست سے وہ ہٹا دیں جس کی قیمت نہیں دیتے۔', 'علِّم القوائم التي تسعّرها، ثم أزل من كل قائمة ما لا تسعّره.')
            : L('Tick the lists you sell, then untick in each list what you do not sell.', 'جو فہرستیں آپ بیچتے ہیں انہیں منتخب کریں، پھر ہر فہرست سے وہ ہٹا دیں جو نہیں بیچتے۔', 'علِّم القوائم التي تبيعها، ثم أزل من كل قائمة ما لا تبيعه.')}
        </p>
        {packs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-[12px] font-bold text-gray-600">{L('Ready-made:', 'تیار انتخاب:', 'اختيار جاهز:')}</span>
            {packs.map(({ p, keys }) => {
              const on = keys.every(k => sel.has(k))
              return (
                <button key={p.id} type="button" disabled={disabled} onClick={() => setGroups(keys, true)} aria-pressed={on}
                  className={`min-h-[44px] px-3 rounded-full text-[13px] font-semibold border transition-all ${on ? 'border-2 text-[#071827]' : 'bg-white border-gray-300 text-gray-700 hover:border-[#D4A543]'}`}
                  style={on ? { borderColor: GOLD, background: 'rgba(212,165,67,0.12)' } : {}}>
                  {pick(p)}
                </button>
              )
            })}
          </div>
        )}
        <ul className="space-y-1.5" aria-labelledby={`swp-title-${sec}`}>
          {rows.map(x => {
            const k = x.key
            const on = sel.has(k)
            const open = openGroup === k
            const all = productsOfSub(k)
            const kept = on ? all.filter(n => !excl.has(n)).length : 0
            const label = subLabel[k] || pick(x)
            const status = on
              ? (all.length ? L(`${kept} of ${all.length}`, `${all.length} میں سے ${kept}`, `${kept} من ${all.length}`) : L('chosen', 'منتخب', 'مختارة'))
              : (all.length ? itemsLabel(all.length) : '')
            return (
              <li key={k} className={`rounded-xl border-2 transition-colors ${on ? '' : 'border-gray-200 bg-white'}`}
                style={on ? { borderColor: GOLD, background: 'rgba(212,165,67,0.07)' } : {}}>
                <div className="flex items-stretch">
                  <button type="button" role="checkbox" aria-checked={on} disabled={disabled} onClick={() => tapBox(k)} aria-label={label}
                    className="w-12 min-h-[48px] shrink-0 grid place-items-center">
                    <span className="w-[22px] h-[22px] rounded-md border-2 grid place-items-center"
                      style={on ? { background: GOLD, borderColor: GOLD, color: NAVY } : { borderColor: '#9CA3AF', background: '#fff' }} aria-hidden="true">
                      {on && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                  </button>
                  <button type="button" disabled={disabled} onClick={() => tapRow(k)} aria-expanded={open} aria-controls={`swp-list-${k}`}
                    className="flex-1 min-w-0 min-h-[48px] flex items-center justify-between gap-2 pe-3 text-start">
                    <span className="min-w-0 text-[14px] leading-snug">
                      <span className="font-bold" style={{ color: NAVY }}>{label}</span>
                      {status && <span className={`text-[12.5px] font-semibold ${on ? 'text-[#8F6820]' : 'text-gray-500'}`}> · {status}</span>}
                    </span>
                    {all.length > 0 && <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
                  </button>
                </div>
                {open && (
                  <div id={`swp-list-${k}`} role="group" aria-label={label} className="px-3 pb-3">
                    {all.length > 0 ? (<>
                      <div className="flex items-center justify-between gap-2 border-t border-[#D4A543]/30 pt-1">
                        <span className="text-[12.5px] text-gray-600">{independent ? L('Untick what you do not price.', 'جس کی قیمت نہیں دیتے اسے ہٹا دیں۔', 'أزل ما لا تسعّره.') : L('Untick what you do not sell.', 'جو نہیں بیچتے اسے ہٹا دیں۔', 'أزل ما لا تبيعه.')}</span>
                        {on && kept === all.length
                          ? <button type="button" disabled={disabled} onClick={() => setGroups([k], false)} className="min-h-[44px] px-2 text-[13px] font-bold text-[#8F6820] underline shrink-0">{L('Clear all', 'سب ہٹائیں', 'إلغاء الكل')}</button>
                          : <button type="button" disabled={disabled} onClick={() => setGroups([k], true)} className="min-h-[44px] px-2 text-[13px] font-bold text-[#8F6820] underline shrink-0">{L('Select all', 'سب منتخب کریں', 'اختر الكل')}</button>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {all.map(n => {
                          const checked = on && !excl.has(n)
                          return (
                            <button key={n} type="button" role="checkbox" aria-checked={checked} disabled={disabled} onClick={() => toggleProduct(k, n)}
                              className={`flex items-center gap-2.5 min-h-[44px] px-2 rounded-lg text-start text-[13.5px] leading-snug hover:bg-white ${checked ? 'text-[#071827]' : 'text-gray-500'}`}>
                              <span className="w-5 h-5 shrink-0 rounded border-2 grid place-items-center"
                                style={checked ? { background: GOLD, borderColor: GOLD, color: NAVY } : { borderColor: '#9CA3AF', background: '#fff' }} aria-hidden="true">
                                {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                              </span>
                              <span className="min-w-0">{getProductLabel(n, locale)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>) : null}
                    <div className="flex justify-end mt-2">
                      <button type="button" onClick={() => setOpenGroup(null)}
                        className="min-h-[44px] min-w-[96px] px-5 rounded-xl text-[14px] font-bold shadow-sm" style={{ background: GOLD, color: NAVY }}>
                        {L('Done', 'ہو گیا', 'تم')}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </>
    )
  }

  return (
    <div>
      {/* Level 1: the sections */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5" role="group" aria-label={question}>
        {BROWSE_SECTIONS.map(s => {
          const have = (keysBySection[s.key] || []).filter(k => sel.has(k)).length
          const on = have > 0
          const open = openSec === s.key
          return (
            <button key={s.key} ref={el => { cardRefs.current[s.key] = el }} type="button" disabled={disabled} onClick={() => openSection(s.key)}
              aria-expanded={open} aria-controls={open ? 'swp-section' : undefined}
              aria-label={`${pick(s)}${on ? ` (${listsLabel(have)})` : ''}`}
              className={`relative flex flex-col items-center text-center gap-1 p-3 pt-3.5 min-h-[128px] rounded-2xl border-2 transition-all disabled:cursor-default ${on || open ? 'shadow-sm' : 'bg-white border-gray-200 hover:border-[#D4A543]/60'}`}
              style={on ? { borderColor: GOLD, background: 'rgba(212,165,67,0.09)' } : open ? { borderColor: '#0B2438', background: '#fff' } : {}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/section-icons/${s.key}.webp`} alt="" aria-hidden="true" loading="lazy" className="w-14 h-14 object-contain" />
              <span className="font-bold text-[13.5px] leading-snug" style={{ color: NAVY }}>{pick(s)}</span>
              {on
                ? <span className="text-[12px] font-bold text-[#8F6820]">{listsLabel(have)}</span>
                : <span className="text-[12px] text-gray-500 leading-snug line-clamp-2">{pick(s.hint)}</span>}
              {on && (
                <span className="absolute top-2 end-2 w-6 h-6 grid place-items-center rounded-full" style={{ background: GOLD, color: NAVY }} aria-hidden="true">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Levels 2 and 3: the open section — a panel under the grid, a sheet on phones */}
      {openSec && !isPhone && (
        <div ref={panelRef} id="swp-section" role="region" aria-labelledby={`swp-title-${openSec}`}
          onKeyDown={(e: any) => { if (e.key === 'Escape') { e.stopPropagation(); escape() } }}
          className="mt-3 rounded-2xl border-2 p-3.5 bg-white" style={{ borderColor: 'rgba(212,165,67,0.55)' }}>
          {sectionBody(openSec)}
        </div>
      )}
      {openSec && isPhone && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45" onClick={(e: any) => { if (e.target === e.currentTarget) closeSection() }}>
          <div ref={sheetRef} id="swp-section" role="dialog" aria-modal="true" aria-labelledby={`swp-title-${openSec}`}
            className="w-full max-h-[88vh] flex flex-col rounded-t-2xl bg-white shadow-xl">
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-2">{sectionBody(openSec)}</div>
            <div className="p-3 border-t border-gray-100" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <button type="button" onClick={closeSection} className="w-full min-h-[48px] rounded-xl text-[15px] font-bold" style={{ background: GOLD, color: NAVY }}>
                {L('Done', 'ہو گیا', 'تم')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* the live line */}
      <div role="status" aria-live="polite" className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed border ${chosenOrdered.length ? 'bg-[#0B2438]/5 border-[#0B2438]/10 text-[#0B2438]' : 'bg-warn-bg border-warn-border text-warn-text font-semibold'}`}>
        {chosenOrdered.length ? (<>
          <b>{L('You will receive requests for: ', 'آپ کو ان کی درخواستیں ملیں گی: ', 'ستصلك طلبات: ')}</b>{shownNames.join(sep)}
          {moreNames > 0 && L(` and ${moreNames} more`, ` اور ${moreNames} مزید`, ` و${listsLabel(moreNames)} أخرى`)}
          {matches != null && matches > 0 && (
            <span className="block mt-0.5 font-semibold text-[#8F6820]">
              {L(`${matches} open request${matches === 1 ? '' : 's'} match your choice now.`, `ابھی ${matches} کھلی درخواستیں آپ کے انتخاب سے ملتی ہیں۔`, `يطابق اختيارك الآن ${arCount(matches, 'طلبٌ مفتوح واحد', 'طلبان مفتوحان', 'طلبات مفتوحة', 'طلباً مفتوحاً')}.`)}
            </span>
          )}
        </>) : (independent
          ? L('Open a section and tick at least one list you price; no requests reach you until you do.', 'کوئی سیکشن کھولیں اور کم از کم ایک فہرست منتخب کریں جس کی آپ قیمت دیتے ہیں؛ اس کے بغیر کوئی درخواست نہیں آئے گی۔', 'افتح قسماً وعلِّم قائمة واحدة على الأقل مما تسعّره، فلن تصلك طلبات قبل ذلك.')
          : L('Open a section and tick at least one list you sell; no requests reach you until you do.', 'کوئی سیکشن کھولیں اور کم از کم ایک فہرست منتخب کریں جو آپ بیچتے ہیں؛ اس کے بغیر کوئی درخواست نہیں آئے گی۔', 'افتح قسماً وعلِّم قائمة واحدة على الأقل مما تبيعه، فلن تصلك طلبات قبل ذلك.'))}
      </div>

      {extra && <div className="mt-3">{extra}</div>}
    </div>
  )
}
