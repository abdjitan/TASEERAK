'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, X, Minus, Plus } from 'lucide-react'
import { getProductLabel, detectSubCategory, getSubCategoryLabel, getProductSpecs, getUnitLabelLong, type Sector } from '@/types'
import { BROWSE_SECTIONS, getSectionGroups, type BrowseSection, subsOfSection } from '@/lib/browseCategories'
import { bySectionRank, HOME_ORDER } from '@/lib/sectionOrder'
import { homeName } from '@/lib/homePacks'
import { searchProducts, normQuery } from '@/lib/productSearch'
import { createClient } from '@/lib/supabase/client'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import CatIcon from '@/components/shared/CatIcon'
import Glyph from '@/components/shared/Glyph'

// Pick materials from the catalog inside the request page (the 4th way to add a line, next to
// writing, speaking and a photo). Search across everything, or browse the 8 user-facing sections
// (src/lib/browseCategories.ts) by group.
//
// CatalogBrowser is the catalog itself: on desktop the request page shows it inline as its main
// area (the chosen list sits beside it). CatalogPicker wraps it in a sheet for phones.

type Picked = { key: string; name: string; qty?: string; unit?: string }

// Section photos from the approved design (public/images/sections, cut from the category sprite).
// Sections without a photo yet show three of their materials instead.
const SECTION_PHOTO: Partial<Record<BrowseSection, string>> = {
  building: '/images/sections/building.webp', finishing: '/images/sections/finishing.webp',
  furniture: '/images/sections/furniture.webp', electrical: '/images/sections/lighting.webp',
  plumbing: '/images/sections/plumbing.webp', tools: '/images/sections/tools.webp',
  hvac_fire: '/images/sections/hvac_fire.webp', insulation: '/images/sections/insulation.webp', outdoor: '/images/sections/outdoor.webp',
  machinery: '/images/sections/machinery.webp',
}

// Section medallions (owner's approved icon pack, navy + gold, public/images/section-icons).
export const sectionIcon = (key: string) => `/images/section-icons/${key}.webp`

const coverCache: Record<string, { name: string; sector: Sector }[]> = {}
function sectionCovers(key: BrowseSection) {
  if (!coverCache[key]) {
    const gs = getSectionGroups(key).filter(g => g.items.length)
    const out: { name: string; sector: Sector }[] = []
    for (let i = 0; out.length < 3 && i < 9; i++) {
      const g = gs[i % Math.max(gs.length, 1)]
      const it = g?.items[Math.floor(i / Math.max(gs.length, 1))]
      if (it && !out.some(o => o.name === it.name)) out.push(it)
    }
    coverCache[key] = out
  }
  return coverCache[key]
}

export function CatalogBrowser({ locale, onPick, onRemove, onQty, picked = [], inline = false, initialQuery = '', initialSection = null, simple = false }: {
  locale: string
  onQty?: (key: string, qty: string) => void // a home buyer's «− 1 +» on a picked tile (UX-189)
  simple?: boolean   // a home buyer: home-first section order, no heavy machinery, Arabic names without English
  initialQuery?: string
  initialSection?: BrowseSection | null
  onPick: (item: { name: string; sector: Sector; section?: BrowseSection; sub?: string }) => void
  onRemove?: (key: string) => void   // «أزلها من الطلب» from the «already added» question
  picked?: Picked[]
  inline?: boolean
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [q, setQ] = useState(initialQuery)
  const [section, setSection] = useState<BrowseSection | null>(initialSection)
  const SECTIONS = simple ? bySectionRank(BROWSE_SECTIONS.filter(b => b.key !== 'machinery'), b => b.key, HOME_ORDER) : BROWSE_SECTIONS
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [own, setOwn] = useState('')   // «طلبك غير موجود؟» inside a section
  // the same inside an open group (owner 2026-10-31: «طلبك غير موجود» in «الخرسانة والإسمنت» → only those suppliers)
  const [ownG, setOwnG] = useState('')
  const [ownSub, setOwnSub] = useState('')
  // a home buyer tapped a material already in the request: ask (another size, or remove it)
  const [dupe, setDupe] = useState<{ name: string; sector: Sector; section?: BrowseSection; sub?: string } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (inline || initialSection) return
    let touch = false
    try { touch = window.matchMedia('(pointer: coarse)').matches } catch {}
    if (!touch) searchRef.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const nameOf = (n: string) => (simple && locale === 'ar' ? homeName(n) : getProductLabel(n, locale))

  // Exact/prefix/synonym matches score >= ~10; loose typo matches (بلك → بلدوزر) ~6. Show only
  // the confident ones unless that leaves almost nothing.
  const { hits, confident } = useMemo(() => {
    if (!q.trim()) return { hits: [], confident: 0 }
    const all = searchProducts(q, { limit: 40 })
    const good = all.filter(h => h.score >= 7)
    return { hits: good.length >= 3 ? good.slice(0, 30) : all.slice(0, 8), confident: good.length }
  }, [q])

  // Not understood by the catalog or the dictionary → ask the AI, which may search the web
  // (/api/understand; answers are remembered, so a repeat costs nothing).
  const [web, setWeb] = useState<{ q: string; loading: boolean; result?: any; matches?: { name: string; sector: Sector }[]; sources?: any[]; error?: string } | null>(null)
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2 || confident > 0) { setWeb(null); return }
    let alive = true
    setWeb({ q: query, loading: true })
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/understand', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: query }) })
        const j = await r.json().catch(() => ({}))
        if (!alive) return
        setWeb(r.ok && j.ok ? { q: query, loading: false, result: j.result, matches: j.matches || [], sources: j.sources || [] } : { q: query, loading: false, error: j.error || 'failed' })
      } catch { if (alive) setWeb({ q: query, loading: false, error: 'failed' }) }
    }, 1100)
    return () => { alive = false; clearTimeout(t) }
  }, [q, confident])
  const groups = useMemo(() => (section ? getSectionGroups(section) : []), [section])
  // A search that still finds nothing after a pause is recorded, so the admin sees what is missing.
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2 || hits.length) return
    const t = setTimeout(() => {
      try { createClient().rpc('log_search_event', { p_query: query, p_query_norm: normQuery(query), p_action: 'no_result', p_source: 'catalog' }).then(() => {}, () => {}) } catch {}
    }, 1800)
    return () => clearTimeout(t)
  }, [q, hits.length])
  const pickT = (o: any) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const countOf = (name: string) => picked.filter(p => p.name === name).length
  const isAdded = (name: string) => countOf(name) > 0
  // Teach the search: what the person typed → the product they chose (fire and forget).
  // UX-063: a second tap never deletes a line (it may carry a quantity, specs and files): it adds
  // another line (rebar 12 and 16 mm from the guide); a home buyer is asked first.
  function choose(item: { name: string; sector: Sector; section?: BrowseSection; sub?: string }, force = false) {
    if (!force && simple && isAdded(item.name)) { setDupe(item); return }
    setDupe(null)
    const query = q.trim()
    if (query) {
      try { createClient().rpc('log_search_event', { p_query: query, p_query_norm: normQuery(query), p_action: 'picked', p_picked: item.name, p_sector: item.sector, p_source: 'catalog' }).then(() => {}, () => {}) } catch {}
    }
    onPick(item)
  }
  const tileGrid = inline ? 'grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2' : 'grid grid-cols-3 sm:grid-cols-5 gap-2'

  const tile = (name: string, s: Sector, k: string) => {
    const n = countOf(name)
    const on = n > 0
    const last = on ? [...picked].reverse().find(p => p.name === name) : undefined
    const qn = last ? Math.max(0, parseFloat(last.qty || '') || 0) : 0
    return (
      <div key={k} className={`relative rounded-xl border-2 p-2 flex flex-col gap-1.5 transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 bg-white hover:border-[#D4A543]/60 hover:shadow-sm'}`}>
      <button type="button" onClick={() => choose({ name, sector: s })} aria-pressed={on}
        aria-label={on ? L(`${nameOf(name)}, added`, `${nameOf(name)}، شامل`, `${nameOf(name)}، مضافة إلى طلبك`) : nameOf(name)}
        className="text-start flex flex-col gap-1.5">
        <span className="aspect-square w-full rounded-lg bg-gray-50 overflow-hidden grid place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImageUrl(name)} alt="" loading="lazy" className="w-full h-full object-contain"
            onError={(e: any) => imgFallback(e, detectSubCategory(name, s))} />
        </span>
        <span className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2" dir="auto">{nameOf(name)}</span>
      </button>
      {on && (n > 1
        ? <span className="absolute top-1.5 end-1.5 min-w-6 h-6 px-1.5 rounded-full grid place-items-center text-[12px] font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>×{n}</span>
        : <span className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full grid place-items-center text-[#071827]" style={{ background: '#D4A543' }}><Check className="w-4 h-4" aria-hidden /></span>)}
      {/* a home buyer sets the quantity right here: «− 1 +» (UX-189) */}
      {on && simple && onQty && last && (qn > 0 ? (
        // the quantity on its own centred line, the − and + under it (w-9, 44px touch area): fits a 78px tile (round-4 UX-026)
        <div className="rounded-lg bg-white border border-[#D4A543]/50 px-0.5 pt-1">
          <span className="block text-[13px] font-extrabold text-[#0B2438] text-center leading-tight" aria-live="polite">{qn}{last.unit ? <span className="block text-[12px] font-semibold text-gray-600 truncate">{getUnitLabelLong(last.unit, locale)}</span> : null}</span>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => onQty(last.key, String(Math.max(1, qn - 1)))} disabled={qn <= 1}
              className="relative w-9 h-9 grid place-items-center text-[#0B2438] disabled:opacity-30 before:absolute before:-inset-1 before:content-['']" aria-label={L('Less', 'کم', 'إنقاص')}><Minus className="w-4 h-4" aria-hidden /></button>
            <button type="button" onClick={() => onQty(last.key, String(qn + 1))}
              className="relative w-9 h-9 grid place-items-center text-[#0B2438] before:absolute before:-inset-1 before:content-['']" aria-label={L('More', 'زیادہ', 'زيادة')}><Plus className="w-4 h-4" aria-hidden /></button>
          </div>
        </div>
      ) : (
        <span className="text-[12px] font-bold text-[#8F6820] text-center">{L('Set the quantity in your request', 'درخواست میں مقدار لکھیں', 'حدّد الكمية في طلبك')}</span>
      ))}
      </div>
    )
  }

  const current = section ? BROWSE_SECTIONS.find(b => b.key === section) : null

  return (
    <div className="space-y-3">
      <input ref={searchRef} type="search" value={q} onChange={e => setQ(e.target.value)} className="input-field text-[16px] sm:text-sm"
        aria-label={L('Search the materials guide', 'مواد کی فہرست میں تلاش کریں', 'ابحث في دليل المواد')}
        placeholder={simple
          ? L('Search… e.g. light, mixer, paint, sofa', 'تلاش کریں… مثلاً لائٹ، مکسر، پینٹ، صوفہ', 'ابحث… مثل: مصباح، خلاط، دهان، أريكة')
          : L('Search any material… e.g. block, cable, pipe', 'کوئی بھی سامان تلاش کریں…', 'ابحث عن أي مادة… مثل: بلك، سلك، ماسورة')} />

      {dupe && (
        <div role="alertdialog" aria-label={L('Already added', 'پہلے سے شامل', 'أضفت هذه المادة من قبل')} className="sticky top-2 lg:top-20 z-10 rounded-2xl border-2 border-[#D4A543] bg-[#FFFBF2] p-3 space-y-2 shadow-lg">
          <div className="text-sm font-bold text-[#0B2438]">{L(`You already added «${nameOf(dupe.name)}»`, `آپ «${nameOf(dupe.name)}» پہلے شامل کر چکے ہیں`, `أضفت «${nameOf(dupe.name)}» إلى طلبك من قبل`)}</div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const last = [...picked].reverse().find(p => p.name === dupe.name)
              const qn = last ? parseFloat(last.qty || '') || 0 : 0
              return last && onQty && qn > 0 ? (
                <button type="button" onClick={() => { onQty(last.key, String(qn + 1)); setDupe(null) }} className="min-h-[44px] px-4 rounded-xl text-sm font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>
                  {L('Add one more (+1)', 'ایک اور (+1)', 'زِد الكمية (+1)')}
                </button>
              ) : null
            })()}
            {getProductSpecs(dupe.name).some(f => f.key !== 'unit') && (
              <button type="button" onClick={() => choose(dupe, true)} className="min-h-[44px] px-4 rounded-xl text-sm font-bold border-2 border-[#0B2438]/30 bg-white text-[#0B2438]">
                {L('Add another type or size', 'دوسری قسم یا سائز شامل کریں', 'أضف نوعاً أو مقاساً آخر')}
              </button>
            )}
            {onRemove && (
              <button type="button" onClick={() => { const last = [...picked].reverse().find(p => p.name === dupe.name); if (last) onRemove(last.key); setDupe(null) }}
                className="min-h-[44px] px-4 rounded-xl text-sm font-bold border border-gray-300 bg-white text-[#0B2438]">
                {L('Remove it from the request', 'درخواست سے ہٹائیں', 'أزلها من الطلب')}
              </button>
            )}
            <button type="button" onClick={() => setDupe(null)} className="min-h-[44px] px-3 rounded-xl text-sm font-bold text-gray-600">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
          </div>
        </div>
      )}

      {/* sections as chips once one is open, so switching is one tap */}
      {!q.trim() && section && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button type="button" onClick={() => { setSection(null); setOpenGroup(null) }}
            className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-bold ps-1 pe-3 py-1 rounded-full border-2 border-gray-200 bg-white text-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sectionIcon('all')} alt="" aria-hidden className="w-7 h-7" />
            {L('All sections', 'تمام حصے', 'كل الأقسام')}
          </button>
          {SECTIONS.map(b => (
            <button key={b.key} type="button" onClick={() => { setSection(b.key); setOpenGroup(null) }}
              aria-pressed={b.key === section}
              className={`shrink-0 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-bold ps-1 pe-3 py-1 rounded-full border-2 text-[#0B2438] ${b.key === section ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 bg-white'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sectionIcon(b.key)} alt="" aria-hidden className="w-7 h-7" />{pickT(b)}
            </button>
          ))}
        </div>
      )}

      {q.trim() && web && web.q === q.trim() && (
        <div className="rounded-2xl border border-[#0B2438]/15 bg-[#0B2438]/[0.03] p-3 space-y-2" aria-live="polite">
          {web.loading ? (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full border-2 border-[#0B2438]/30 border-t-[#0B2438] animate-spin" />
              {L(`Looking up «${web.q}» on the internet…`, `«${web.q}» انٹرنیٹ پر تلاش ہو رہا ہے…`, `نبحث عن «${web.q}» في الإنترنت…`)}
            </p>
          ) : web.result?.understood ? (
            <>
              <div className="text-sm">
                <span className="text-[12px] font-bold text-[#0B2438]"><Glyph e="🌐" /> {L('We found what you mean', 'ہم سمجھ گئے', 'فهمنا ما تقصد')}</span>
                <div className="font-extrabold text-navy mt-0.5" dir="auto">{web.result.name_ar}{web.result.name_en && !simple ? <span className="text-[12px] font-normal text-gray-500"> · {web.result.name_en}</span> : null}</div>
                {web.result.what_it_is && <div className="text-[12px] text-gray-600 mt-0.5" dir="auto">{web.result.what_it_is}</div>}
              </div>
              {!!web.matches?.length && (
                <>
                  <div className="text-[12px] font-bold text-gray-600">{L('Closest in the materials guide', 'مواد کی فہرست میں قریب ترین', 'الأقرب في دليل المواد')}</div>
                  <div className={tileGrid}>{web.matches.map(m => tile(m.name, m.sector, `w:${m.sector}:${m.name}`))}</div>
                </>
              )}
              <button type="button" onClick={() => choose({ name: web.result.name_ar, sector: web.result.sector })}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>
                + {L(`Add «${web.result.name_ar}» to your request`, `«${web.result.name_ar}» درخواست میں شامل کریں`, `أضف «${web.result.name_ar}» إلى طلبك`)}
              </button>
              {!!web.sources?.length && (
                <div className="text-[12px] text-gray-500 truncate" dir="ltr">{L('Sources', 'ذرائع', 'المصادر')}: {web.sources.map((s: any) => s.title || s.uri).join(' · ')}</div>
              )}
            </>
          ) : (<>
            <p className="text-sm text-gray-600">
              {web.error === 'daily_limit' || web.error === 'rate_limited'
                ? L('Internet lookups are busy right now. You can still add it as you wrote it.', 'ابھی انٹرنیٹ تلاش مصروف ہے۔ جیسا لکھا ہے ویسا شامل کریں۔', 'البحث في الإنترنت مشغول الآن. يمكنك إضافتها كما كتبتها.')
                : L('We could not identify it. Add it as you wrote it, and suppliers will price it.', 'ہم پہچان نہیں سکے۔ جیسا لکھا ہے ویسا شامل کریں۔', 'لم نتعرّف عليها. أضفها كما كتبتها، وسيسعّرها الموردون.')}
            </p>
            <button type="button" onClick={() => choose({ name: q.trim().slice(0, 120), sector: 'supply_store' as Sector })}
              className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl text-sm font-bold border-2 border-[#D4A543] text-[#8F6820]">
              + {L(`Add «${q.trim()}» to your request as written`, `«${q.trim()}» جیسا لکھا درخواست میں شامل کریں`, `أضف «${q.trim()}» إلى طلبك كما كتبتها`)}
            </button>
          </>)}
        </div>
      )}

      {q.trim() ? (
        hits.length === 0 ? (web ? null :
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-gray-500">
              {L('We did not find it in the materials guide. You can add it as you wrote it, and suppliers will price it.',
                'یہ مواد کی فہرست میں نہیں ملا۔ جیسا لکھا ہے ویسا شامل کریں، سپلائرز قیمت دیں گے۔',
                'لم نجدها في دليل المواد. يمكنك إضافتها كما كتبتها، وسيسعّرها الموردون.')}
            </p>
            <button type="button" onClick={() => choose({ name: q.trim().slice(0, 120), sector: 'supply_store' as Sector })}
              className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>
              + {L(`Add «${q.trim()}» to your request`, `«${q.trim()}» درخواست میں شامل کریں`, `أضف «${q.trim()}» إلى طلبك`)}
            </button>
          </div>
        ) : (
          <div className={tileGrid}>
            {hits.map(h => tile(h.name, h.sector, `${h.sector}:${h.name}`))}
          </div>
        )
      ) : !current ? (
        <div className={inline ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'grid grid-cols-2 sm:grid-cols-4 gap-2.5'}>
          {SECTIONS.map(b => (
            <button key={b.key} type="button" onClick={() => { setSection(b.key); setOpenGroup(null) }}
              className="group relative text-start rounded-2xl overflow-hidden border border-[#0B2438]/10 bg-[#0B2438] min-h-[150px] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
              {SECTION_PHOTO[b.key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={SECTION_PHOTO[b.key]} alt="" loading="lazy" aria-hidden className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 grid grid-cols-3 gap-1 p-2 pb-16 bg-[#F5F7FA]" aria-hidden>
                  {sectionCovers(b.key).map(it => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={it.name} src={productImageUrl(it.name)} alt="" loading="lazy" className="w-full h-full object-contain rounded-lg bg-white"
                      onError={(e: any) => imgFallback(e, detectSubCategory(it.name, it.sector))} />
                  ))}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050B12]/85 via-[#071827]/15 to-transparent" aria-hidden />
              <div className="relative flex flex-col justify-end h-full min-h-[150px] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sectionIcon(b.key)} alt="" aria-hidden className="w-12 h-12 mb-auto drop-shadow-[0_4px_10px_rgba(0,0,0,.45)]" />
                <div className="font-bold text-[15px] text-white leading-snug drop-shadow">{pickT(b)}</div>
                <div className="text-[12px] text-white/85 mt-0.5 leading-relaxed line-clamp-2">{pickT(b.hint)}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(g => {
            const open = openGroup === g.group
            return (
              <div key={g.group} className="rounded-xl border border-gray-100 bg-white">
                <button type="button" onClick={() => setOpenGroup(open ? null : g.group)} aria-expanded={open}
                  className="w-full min-h-[52px] flex items-center justify-between px-3 py-2 text-sm font-bold text-navy">
                  <span className="flex items-center gap-2">{g.items[0] ? <img src={productImageUrl(g.items[0].name)} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                    onError={(e: any) => imgFallback(e, detectSubCategory(g.items[0].name, g.items[0].sector))} />
                    : <span className="w-10 h-10 rounded-lg grid place-items-center text-[#0B2438] shrink-0" style={{ background: '#0B24380d' }}><CatIcon k={g.group} className="w-5 h-5" /></span>}{pickT(g)} <span className="text-gray-500 font-normal">({g.items.length})</span></span>
                  <span className="text-gray-500">{open ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}</span>
                </button>
                {open && (
                  <div className="p-2 pt-0 space-y-2">
                  <div className={tileGrid}>
                    {g.items.map(it => tile(it.name, it.sector, `${it.sector}:${it.name}`))}
                  </div>
                  {(() => {
                    // the group's specialties (most items first): the line goes to that specialty's suppliers
                    const cnt: Record<string, { sector: Sector; sub: string; n: number }> = {}
                    for (const it of g.items) { const sb = detectSubCategory(it.name, it.sector); if (!sb) continue; const k = it.sector + ':' + sb; cnt[k] = cnt[k] || { sector: it.sector, sub: sb, n: 0 }; cnt[k].n++ }
                    const subs = Object.values(cnt).sort((a, b) => b.n - a.n)
                    if (!subs.length) return null
                    const chosen = subs.find(x => x.sector + ':' + x.sub === ownSub) || subs[0]
                    const add = () => { if (!ownG.trim()) return; choose({ name: ownG.trim().slice(0, 120), sector: chosen.sector, sub: chosen.sub }); setOwnG('') }
                    return (
                      <div className="rounded-xl border border-dashed border-[#D4A543]/70 bg-[#D4A543]/[.06] p-2.5 space-y-2">
                        <div className="text-[13px] font-bold text-[#0B2438]">{L(`Didn't find the material in «${pickT(g)}»? Write its name`, `«${pickT(g)}» میں مطلوبہ چیز نہیں ملی؟ اس کا نام لکھیں`, `لم تجد المادة في «${pickT(g)}»؟ اكتب اسمها`)}</div>
                        <div className="flex flex-wrap gap-2">
                          <input value={ownG} onChange={e => setOwnG(e.target.value)} className="input-field text-[16px] sm:text-sm flex-1 min-w-[10rem]" aria-label={L('Material name', 'سامان کا نام', 'اسم المادة')}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder={L('Material name', 'سامان کا نام', 'اسم المادة')} />
                          {subs.length > 1 && (
                            <select value={chosen.sector + ':' + chosen.sub} onChange={e => setOwnSub(e.target.value)} className="input-field w-auto max-w-full text-[16px] sm:text-sm"
                              aria-label={L('Specialty', 'شعبہ', 'التخصص')}>
                              {subs.map(x => <option key={x.sector + ':' + x.sub} value={x.sector + ':' + x.sub}>{getSubCategoryLabel(x.sector, x.sub, locale)}</option>)}
                            </select>
                          )}
                          <button type="button" disabled={!ownG.trim()} onClick={add}
                            className="shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40" style={{ background: '#D4A543' }}>+ {L('Add', 'شامل کریں', 'أضف')}</button>
                        </div>
                      </div>
                    )
                  })()}
                  </div>
                )}
              </div>
            )
          })}
          {/* owner 2026-10-31: in every section — the material isn't listed? write it, and the request
              goes to all of this section's suppliers */}
          <div className="rounded-xl border border-dashed border-[#D4A543]/70 bg-[#D4A543]/[.06] p-3 space-y-2">
            <div className="text-sm font-bold text-[#0B2438]">{L(`Didn't find the material? Write its name and we send it to all «${pickT(current)}» suppliers`, `مطلوبہ چیز نہیں ملی؟ نام لکھیں، «${pickT(current)}» کے سب سپلائرز کو جائے گا`, `لم تجد المادة؟ اكتب اسمها، ونرسلها إلى كل موردي «${pickT(current)}»`)}</div>
            <div className="flex gap-2">
              <input value={own} onChange={e => setOwn(e.target.value)} className="input-field text-[16px] sm:text-sm flex-1 min-w-0" aria-label={L('Material name', 'سامان کا نام', 'اسم المادة')}
                onKeyDown={e => { if (e.key === 'Enter' && own.trim()) { e.preventDefault(); choose({ name: own.trim().slice(0, 120), sector: sectionSector(section!), section: section! }); setOwn('') } }}
                placeholder={L('Material name', 'سامان کا نام', 'اسم المادة')} />
              <button type="button" disabled={!own.trim()} onClick={() => { choose({ name: own.trim().slice(0, 120), sector: sectionSector(section!), section: section! }); setOwn('') }}
                className="shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40" style={{ background: '#D4A543' }}>
                + {L('Add', 'شامل کریں', 'أضف')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// the sector most of a section's specialties belong to (routing for «اكتب اسم المادة» in that section)
function sectionSector(section: BrowseSection): Sector {
  const n: Record<string, number> = {}
  for (const s of subsOfSection(section)) n[s.sector] = (n[s.sector] || 0) + 1
  return (Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || 'supply_store') as Sector
}

export default function CatalogPicker({ locale, onPick, onClose, picked = [], onRemove, onQty, initialQuery = '', initialSection = null, simple = false }: {
  locale: string
  onQty?: (key: string, qty: string) => void
  simple?: boolean
  initialQuery?: string
  initialSection?: BrowseSection | null
  onPick: (item: { name: string; sector: Sector }) => void
  onClose: () => void
  picked?: Picked[]   // the request's current lines, shown under the catalog
  onRemove?: (key: string) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [showPicked, setShowPicked] = useState(false)
  const nameOf = (n: string) => (simple && locale === 'ar' ? homeName(n) : getProductLabel(n, locale))
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // a real sheet: Escape closes, the page behind does not scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="catalog-sheet-title">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-gray-100">
          <h2 id="catalog-sheet-title" className="font-extrabold text-navy"><Glyph e="🔍" /> {L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}</h2>
          {picked.length
            ? <button type="button" onClick={onClose} className="min-h-[44px] text-sm font-extrabold px-4 rounded-xl text-[#071827]" style={{ background: '#D4A543' }}>
                {L(`Done (${picked.length})`, `مکمل (${picked.length})`, `تم (${picked.length})`)}
              </button>
            : <button type="button" onClick={onClose} aria-label={L('Close', 'بند کریں', 'إغلاق')} className="w-[44px] h-[44px] grid place-items-center rounded-full bg-gray-100 text-[#0B2438] hover:bg-gray-200">
                <X className="w-5 h-5" aria-hidden />
              </button>}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <CatalogBrowser locale={locale} onPick={onPick} onRemove={onRemove} onQty={onQty} picked={picked} initialQuery={initialQuery} initialSection={initialSection} simple={simple} />
        </div>
        {picked.length > 0 && (
          // clear of the iPhone gesture bar (round-4 UX-121)
          <div className="border-t border-gray-100 bg-gray-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button type="button" onClick={() => setShowPicked(v => !v)} aria-expanded={showPicked} className="w-full min-h-[44px] px-4 py-2 text-[13px] font-bold text-navy flex items-center justify-between">
              <span><Glyph e="🧾" /> {L('Your request', 'آپ کی درخواست', 'طلبك')} ({picked.length})</span>{showPicked ? <ChevronDown className="w-4 h-4" aria-hidden /> : <ChevronUp className="w-4 h-4" aria-hidden />}
            </button>
            {showPicked && (
              <div className="max-h-48 overflow-y-auto px-3 pb-3 space-y-1">
                {picked.map(p => (
                  <div key={p.key} className="flex items-center gap-2 text-[13px] bg-white rounded-lg ps-2 py-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={productImageUrl(p.name)} alt="" className="w-7 h-7 rounded object-contain bg-gray-50 shrink-0" onError={(e: any) => { e.currentTarget.style.visibility = 'hidden' }} />
                    <span className="flex-1 truncate" dir="auto">{p.name ? nameOf(p.name) : '…'}{parseFloat(p.qty || '') > 0
                      ? <span className="text-gray-600"> · {p.qty}{p.unit ? ' ' + getUnitLabelLong(p.unit, locale) : ''}</span>
                      : <span className="text-[#8F6820] font-bold"> · {L('enter the quantity', 'مقدار لکھیں', 'أدخل الكمية')}</span>}</span>
                    {onRemove && <button type="button" onClick={() => onRemove(p.key)} className="w-[44px] h-[44px] grid place-items-center text-gray-500 hover:text-red-600" aria-label={L(`Remove ${nameOf(p.name)}`, `${nameOf(p.name)} ہٹائیں`, `احذف ${nameOf(p.name)}`)}><X className="w-4 h-4" aria-hidden /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
