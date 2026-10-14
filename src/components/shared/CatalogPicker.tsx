'use client'

import { useEffect, useMemo, useState } from 'react'
import { getProductLabel, detectSubCategory, type Sector } from '@/types'
import { BROWSE_SECTIONS, getSectionGroups, type BrowseSection } from '@/lib/browseCategories'
import { searchProducts, normQuery } from '@/lib/productSearch'
import { createClient } from '@/lib/supabase/client'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import CatIcon from '@/components/shared/CatIcon'

// Pick materials from the catalog inside the request page (the 4th way to add a line, next to
// writing, speaking and a photo). Search across everything, or browse the 8 user-facing sections
// (src/lib/browseCategories.ts) by group.
//
// CatalogBrowser is the catalog itself: on desktop the request page shows it inline as its main
// area (the chosen list sits beside it). CatalogPicker wraps it in a sheet for phones.

type Picked = { key: string; name: string }

// Section photos from the approved design (public/images/sections, cut from the category sprite).
// Sections without a photo yet show three of their materials instead.
const SECTION_PHOTO: Partial<Record<BrowseSection, string>> = {
  building: '/images/sections/building.webp', finishing: '/images/sections/finishing.webp',
  furniture: '/images/sections/furniture.webp', electrical: '/images/sections/lighting.webp',
  plumbing: '/images/sections/plumbing.webp', tools: '/images/sections/tools.webp',
  hvac_fire: '/images/sections/hvac_fire.webp', insulation: '/images/sections/insulation.webp', outdoor: '/images/sections/outdoor.webp',
}

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

export function CatalogBrowser({ locale, onPick, onRemove, picked = [], inline = false, initialQuery = '', initialSection = null }: {
  locale: string
  initialQuery?: string
  initialSection?: BrowseSection | null
  onPick: (item: { name: string; sector: Sector }) => void
  onRemove?: (key: string) => void   // a second tap on a picked material takes it off the list
  picked?: Picked[]
  inline?: boolean
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [q, setQ] = useState(initialQuery)
  const [section, setSection] = useState<BrowseSection | null>(initialSection)
  const [openGroup, setOpenGroup] = useState<string | null>(null)

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
    const t = setTimeout(async () => {
      setWeb({ q: query, loading: true })
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
  const isAdded = (name: string) => picked.some(p => p.name === name)
  // Teach the search: what the person typed → the product they chose (fire and forget).
  function choose(item: { name: string; sector: Sector }) {
    // already in the list → a tap removes it (the ✓ goes, the line leaves the list)
    const already = [...picked].reverse().find(p => p.name === item.name)
    if (already && onRemove) { onRemove(already.key); return }
    const query = q.trim()
    if (query) {
      try { createClient().rpc('log_search_event', { p_query: query, p_query_norm: normQuery(query), p_action: 'picked', p_picked: item.name, p_sector: item.sector, p_source: 'catalog' }).then(() => {}, () => {}) } catch {}
    }
    onPick(item)
  }
  const tileGrid = inline ? 'grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2' : 'grid grid-cols-3 sm:grid-cols-5 gap-2'

  const Tile = ({ name, s }: { name: string; s: Sector }) => {
    const on = isAdded(name)
    return (
      <button type="button" onClick={() => choose({ name, sector: s })}
        className={`relative text-start rounded-xl border p-2 flex flex-col gap-1.5 transition-all ${on ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 bg-white hover:border-[#D4A543]/60 hover:shadow-sm'}`}>
        <span className="aspect-square w-full rounded-lg bg-gray-50 overflow-hidden grid place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImageUrl(name)} alt="" loading="lazy" className="w-full h-full object-contain"
            onError={(e: any) => { e.currentTarget.style.display = 'none' }} />
        </span>
        <span className="text-[12px] font-semibold text-gray-800 leading-snug line-clamp-2" dir="auto">{getProductLabel(name, locale)}</span>
        {on && <span className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full grid place-items-center text-white text-[11px]" style={{ background: '#0F6E56' }}>✓</span>}
      </button>
    )
  }

  const current = section ? BROWSE_SECTIONS.find(b => b.key === section) : null

  return (
    <div className="space-y-3">
      <input value={q} onChange={e => setQ(e.target.value)} autoFocus={!inline} className="input-field"
        aria-label={L('Search the catalog', 'فہرست میں تلاش کریں', 'ابحث في القائمة')}
        placeholder={L('Search any material… e.g. block, cable, pipe', 'کوئی بھی سامان تلاش کریں…', 'ابحث عن أي مادة… مثل: بلك، سلك، ماسورة')} />

      {/* sections as chips once one is open, so switching is one tap */}
      {!q.trim() && section && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button type="button" onClick={() => { setSection(null); setOpenGroup(null) }}
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600">
            {L('All sections', 'تمام حصے', 'كل الأقسام')}
          </button>
          {BROWSE_SECTIONS.map(b => (
            <button key={b.key} type="button" onClick={() => { setSection(b.key); setOpenGroup(null) }}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${b.key === section ? 'text-white border-transparent' : 'border-gray-200 bg-white text-gray-600'}`}
              style={b.key === section ? { background: '#0B2438' } : undefined}>
              <CatIcon k={b.cat || b.key} className="w-4 h-4 inline-block align-[-0.2em] me-1" />{pickT(b)}
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
                <span className="text-xs font-bold text-[#0F6E56]">🌐 {L('We found what you mean', 'ہم سمجھ گئے', 'فهمنا ما تقصد')}</span>
                <div className="font-extrabold text-navy mt-0.5" dir="auto">{web.result.name_ar}{web.result.name_en ? <span className="text-xs font-normal text-gray-400"> · {web.result.name_en}</span> : null}</div>
                {web.result.what_it_is && <div className="text-xs text-gray-600 mt-0.5" dir="auto">{web.result.what_it_is}</div>}
              </div>
              {!!web.matches?.length && (
                <>
                  <div className="text-[11px] font-bold text-gray-500">{L('Closest in our list', 'ہماری فہرست میں قریب ترین', 'الأقرب في قائمتنا')}</div>
                  <div className={tileGrid}>{web.matches.map(m => <Tile key={`w:${m.sector}:${m.name}`} name={m.name} s={m.sector} />)}</div>
                </>
              )}
              <button type="button" onClick={() => choose({ name: web.result.name_ar, sector: web.result.sector })}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>
                + {L(`Add «${web.result.name_ar}» to my list`, `«${web.result.name_ar}» فہرست میں شامل کریں`, `أضف «${web.result.name_ar}» إلى قائمتي`)}
              </button>
              {!!web.sources?.length && (
                <div className="text-[10px] text-gray-400 truncate" dir="ltr">{L('Sources', 'ذرائع', 'المصادر')}: {web.sources.map((s: any) => s.title || s.uri).join(' · ')}</div>
              )}
            </>
          ) : (<>
            <p className="text-sm text-gray-600">
              {web.error === 'daily_limit' || web.error === 'rate_limited'
                ? L('Internet lookups are busy right now. You can still add it as you wrote it.', 'ابھی انٹرنیٹ تلاش مصروف ہے۔ جیسا لکھا ہے ویسا شامل کریں۔', 'البحث في الإنترنت مشغول الآن. يمكنك إضافتها كما كتبتها.')
                : L('We could not identify it. Add it as you wrote it, and suppliers will price it.', 'ہم پہچان نہیں سکے۔ جیسا لکھا ہے ویسا شامل کریں۔', 'لم نتعرّف عليها. أضفها كما كتبتها، وسيسعّرها الموردون.')}
            </p>
            <button type="button" onClick={() => choose({ name: q.trim().slice(0, 120), sector: 'supply_store' as Sector })}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border-2 border-[#D4A543] text-[#9D7425]">
              + {L(`Add «${q.trim()}» as written`, `«${q.trim()}» جیسا لکھا شامل کریں`, `أضف «${q.trim()}» كما كتبتها`)}
            </button>
          </>)}
        </div>
      )}

      {q.trim() ? (
        hits.length === 0 ? (web ? null :
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-gray-500">
              {L('Not in the materials guide — you can still add it as you wrote it, and suppliers will price it.',
                'گائیڈ میں نہیں — جیسا لکھا ہے ویسا شامل کریں، سپلائرز قیمت دیں گے۔',
                'غير موجودة في دليل المواد — يمكنك إضافتها كما كتبتها، وسيسعّرها الموردون.')}
            </p>
            <button type="button" onClick={() => choose({ name: q.trim().slice(0, 120), sector: 'supply_store' as Sector })}
              className="px-4 py-2 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>
              + {L(`Add «${q.trim()}» to my request`, `«${q.trim()}» شامل کریں`, `أضف «${q.trim()}» إلى طلبي`)}
            </button>
          </div>
        ) : (
          <div className={tileGrid}>
            {hits.map(h => <Tile key={`${h.sector}:${h.name}`} name={h.name} s={h.sector} />)}
          </div>
        )
      ) : !current ? (
        <div className={inline ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'grid grid-cols-2 sm:grid-cols-4 gap-2.5'}>
          {BROWSE_SECTIONS.map(b => (
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#050B12]/90 via-[#071827]/35 to-transparent" aria-hidden />
              <div className="relative flex flex-col justify-end h-full min-h-[150px] p-3">
                <span className="w-9 h-9 rounded-xl grid place-items-center mb-auto bg-white/15 backdrop-blur border border-white/20 text-white"><CatIcon k={b.cat || b.key} className="w-5 h-5" /></span>
                <div className="font-bold text-[15px] text-white leading-snug drop-shadow">{pickT(b)}</div>
                <div className="text-[11px] text-white/80 mt-0.5 leading-relaxed line-clamp-2">{pickT(b.hint)}</div>
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
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-navy">
                  <span className="flex items-center gap-2">{g.items[0] ? <img src={productImageUrl(g.items[0].name)} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                    onError={(e: any) => imgFallback(e, detectSubCategory(g.items[0].name, g.items[0].sector))} />
                    : <span className="w-10 h-10 rounded-lg grid place-items-center text-[#0B2438] shrink-0" style={{ background: '#0B24380d' }}><CatIcon k={g.group} className="w-5 h-5" /></span>}{pickT(g)} <span className="text-gray-400 font-normal">({g.items.length})</span></span>
                  <span className="text-gray-400">{open ? '▴' : '▾'}</span>
                </button>
                {open && (
                  <div className={`${tileGrid} p-2 pt-0`}>
                    {g.items.map(it => <Tile key={`${it.sector}:${it.name}`} name={it.name} s={it.sector} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CatalogPicker({ locale, onPick, onClose, picked = [], onRemove, initialQuery = '', initialSection = null }: {
  locale: string
  initialQuery?: string
  initialSection?: BrowseSection | null
  onPick: (item: { name: string; sector: Sector }) => void
  onClose: () => void
  picked?: Picked[]   // the request's current lines, shown under the catalog
  onRemove?: (key: string) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [showPicked, setShowPicked] = useState(false)

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-100">
          <h2 className="font-extrabold text-navy">🔍 {L('Browse the materials guide', 'مواد کی فہرست دیکھیں', 'تصفّح دليل المواد')}</h2>
          <button type="button" onClick={onClose} className="text-sm font-bold px-4 py-1.5 rounded-xl text-white" style={{ background: '#0B2438' }}>
            {picked.length ? L(`Done (${picked.length})`, `مکمل (${picked.length})`, `تم (${picked.length})`) : L('Close', 'بند کریں', 'إغلاق')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <CatalogBrowser locale={locale} onPick={onPick} onRemove={onRemove} picked={picked} initialQuery={initialQuery} initialSection={initialSection} />
        </div>
        {picked.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={() => setShowPicked(v => !v)} className="w-full px-4 py-2.5 text-xs font-bold text-navy flex justify-between">
              <span>🧾 {L('Your list', 'آپ کی فہرست', 'قائمتك')} ({picked.length})</span><span>{showPicked ? '▾' : '▴'}</span>
            </button>
            {showPicked && (
              <div className="max-h-40 overflow-y-auto px-3 pb-3 space-y-1">
                {picked.map(p => (
                  <div key={p.key} className="flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={productImageUrl(p.name)} alt="" className="w-7 h-7 rounded object-contain bg-gray-50 shrink-0" onError={(e: any) => { e.currentTarget.style.visibility = 'hidden' }} />
                    <span className="flex-1 truncate" dir="auto">{p.name ? getProductLabel(p.name, locale) : '…'}</span>
                    {onRemove && <button type="button" onClick={() => onRemove(p.key)} className="text-gray-400 hover:text-red-500 px-1" aria-label={L('Remove', 'ہٹائیں', 'احذف')}>×</button>}
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
