'use client'
// Buyer home hero from the approved design: «ماذا تحتاج اليوم؟» over the city photo, one search
// that opens the request page already searching, and the shopping categories as photo cards.
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, FileSpreadsheet, Camera, ClipboardList } from 'lucide-react'
import { searchProducts } from '@/lib/productSearch'
import { getProductLabel } from '@/types'
import { BROWSE_SECTIONS } from '@/lib/browseCategories'
import { createClient } from '@/lib/supabase/client'
import { sectionRank, bySectionRank, type DemandRow } from '@/lib/sectionOrder'
import { HOME_PACKS, HOME_ROOM_PACKS, homeName } from '@/lib/homePacks'
import { productImageUrl } from '@/lib/productImage'

// All sections, building first (owner 2026-10-19: show every category photo, building materials first)
type Tri = { ar: string; en: string; ur: string }
const CATS: { key: string; img: string; ar: string; en: string; ur: string; sub: Tri; home?: Tri & { sub: Tri } }[] = [
  { key: 'building', img: 'building', ar: 'مواد البناء', en: 'Building materials', ur: 'تعمیراتی سامان', sub: { ar: 'حديد، أسمنت، عزل', en: 'Steel, cement, insulation', ur: 'سریا، سیمنٹ، انسولیشن' } },
  { key: 'finishing', img: 'finishing', ar: 'الدهانات والتشطيبات', en: 'Paints & finishing', ur: 'پینٹ اور فنشنگ', sub: { ar: 'ألوان وبلاط ورخام', en: 'Colours, tiles, marble', ur: 'رنگ، ٹائلیں، ماربل' } },
  { key: 'electrical', img: 'lighting', ar: 'الكهرباء والإنارة', en: 'Electrical & lighting', ur: 'بجلی اور روشنی', sub: { ar: 'مصابيح وكابلات', en: 'Lamps & cables', ur: 'لیمپ اور کیبل' } },
  { key: 'plumbing', img: 'plumbing', ar: 'الحمّام والسباكة', en: 'Bathroom & plumbing', ur: 'باتھ روم اور پلمبنگ', sub: { ar: 'أدوات وإكسسوارات', en: 'Fixtures & fittings', ur: 'سامان اور فٹنگز' } },
  // round-6 UX-086: a home buyer reads «التكييف والتهوية», no firefighting or sprinklers
  { key: 'hvac_fire', img: 'hvac_fire', ar: 'التكييف والحريق', en: 'AC & firefighting', ur: 'اے سی اور فائر', sub: { ar: 'مكيفات ورشاشات', en: 'AC units, sprinklers', ur: 'اے سی، اسپرنکلر' },
    home: { ar: 'التكييف والتهوية', en: 'AC & ventilation', ur: 'اے سی اور وینٹیلیشن', sub: { ar: 'مكيفات ومراوح وشفاطات', en: 'AC units, fans, extractors', ur: 'اے سی، پنکھے، ایگزاسٹ' } } },
  { key: 'furniture', img: 'furniture', ar: 'الأثاث والديكور', en: 'Furniture & decor', ur: 'فرنیچر', sub: { ar: 'للبيت والمكتب', en: 'Home & office', ur: 'گھر اور دفتر' } },
  { key: 'tools', img: 'tools', ar: 'العدد والمعدات', en: 'Tools & equipment', ur: 'اوزار اور سامان', sub: { ar: 'عدد يدوية وكهربائية', en: 'Hand and power tools', ur: 'ہاتھ اور بجلی کے اوزار' } }, // not «الموقع» (a place), round-4 UX-114
  { key: 'machinery', img: 'machinery', ar: 'الآليات الثقيلة', en: 'Heavy machinery', ur: 'بھاری مشینری', sub: { ar: 'تأجير وشراء', en: 'Rent or buy', ur: 'کرایہ یا خرید' } },
  { key: 'outdoor', img: 'outdoor', ar: 'الحدائق والخارجيات', en: 'Garden & outdoor', ur: 'باغ اور بیرونی', sub: { ar: 'عشب وري وإنترلوك', en: 'Turf, irrigation, interlock', ur: 'گھاس، آبپاشی' } },
]

// round-7 UX-108: belowSearch = what a new buyer needs first (the delivery address card and «how it works»), right under the search
export default function MarketHero({ locale, homeBuyer = false, greeting, belowSearch }: { locale: string; homeBuyer?: boolean; greeting?: string; belowSearch?: React.ReactNode }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const router = useRouter()
  const [q, setQ] = useState('')
  // computers have no camera: the photo button says «ارفع صورة» there, «صوّر أو ارفع» on phones
  const [touch, setTouch] = useState(false)
  useEffect(() => { try { setTouch(window.matchMedia('(pointer: coarse)').matches) } catch {} }, [])
  const [open, setOpen] = useState(false)
  // sections ordered by what buyers request most (homes first for a home buyer); cached for the session
  const [demand, setDemand] = useState<DemandRow[] | null>(null)
  useEffect(() => {
    try { const c = sessionStorage.getItem('ts_section_demand'); if (c) { setDemand(JSON.parse(c)); return } } catch {}
    createClient().rpc('get_section_demand').then(({ data }: any) => {
      if (Array.isArray(data)) { setDemand(data); try { sessionStorage.setItem('ts_section_demand', JSON.stringify(data)) } catch {} }
    }, () => {})
  }, [])
  const rank = useMemo(() => sectionRank(homeBuyer, demand), [homeBuyer, demand])
  // a home buyer: no heavy machinery and no duplicate chips row (UX study 2026-11-22)
  const cats = useMemo(() => bySectionRank(homeBuyer ? CATS.filter(c => c.key !== 'machinery') : CATS, c => c.key, rank), [rank, homeBuyer])
  const chips = useMemo(() => bySectionRank(BROWSE_SECTIONS, b => b.key, rank), [rank])
  const [active, setActive] = useState(-1)
  // Live suggestions while typing («بلو» → بلوك، بلوك عازل…), from the same catalog search the request page uses.
  const hits = useMemo(() => {
    const t = q.trim()
    if (!t) return []
    const seen = new Set<string>()
    // round-6 UX-086: no heavy machinery (concrete mixers…) in a home buyer's suggestions
    return searchProducts(t, { limit: 12 }).filter(h => (!homeBuyer || h.sector !== 'equipment') && !seen.has(h.name) && seen.add(h.name)).slice(0, 7)
  }, [q, homeBuyer])
  const open_ = (term: string) => {
    const t = term.trim()
    router.push(t ? `/contractor/rfq/quick?q=${encodeURIComponent(t.slice(0, 80))}` : '/contractor/rfq/quick')
  }
  // «اطلبه كما تريده» is the last option of the list, reachable with the arrows (round-4 UX-116)
  const requestLine = () => router.push(`/contractor/rfq/quick?line=${encodeURIComponent(q.trim().slice(0, 80))}`)
  const go = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (open && active === hits.length && q.trim()) { requestLine(); return }
    open_(open && active >= 0 && hits[active] ? hits[active].name : q)
  }
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = hits.length + (q.trim() ? 1 : 0)
    if (!total) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % total) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a <= 0 ? total - 1 : a - 1)) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }
  // the list also opens with no match, so «لم تجد طلبك؟» is always there (owner 2026-10-24, as in the app)
  const showList = open && q.trim().length > 0
  const fwd = locale === 'en' ? '→' : '←' // forward arrow in the reading direction
  const label = (n: string) => (homeBuyer ? homeName(n, locale) : getProductLabel(n, locale))

  return (
    <div className="mb-6 animate-fade-in">
      <section className="market-hero relative z-20 rounded-[22px] text-white px-5 py-7 sm:px-8 sm:py-9 shadow-[0_24px_60px_-28px_rgba(5,11,18,.65)]">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[13px] font-bold text-[#F5C55B]">
            <span className="w-2 h-2 rounded-full bg-[#F5C55B] shadow-[0_0_0_4px_rgba(245,197,91,.2)]" />
            {greeting || L('Your market for everything you need', 'ہر ضرورت کا بازار', 'سوقك لكل ما تحتاجه')}
          </div>
          <h2 className="mt-2 text-[28px] sm:text-[38px] font-extrabold leading-tight drop-shadow">{L('What do you need today?', 'آج آپ کو کیا چاہیے؟', 'ماذا تحتاج اليوم؟')}</h2>
          <p className="mt-1.5 text-sm sm:text-[15px] text-white/85">
            {L('From a lamp for your home to furniture and building materials: search for the product and add it to your request, and suppliers send you offers to compare.',
              'گھر کے لیمپ سے فرنیچر اور تعمیراتی سامان تک: چیز تلاش کریں اور درخواست میں شامل کریں، سپلائرز آپ کو آفرز بھیجیں گے تاکہ آپ موازنہ کریں۔',
              'من مصباح لبيتك إلى الأثاث ومواد البناء: ابحث عن المنتج وأضفه إلى طلبك، فتصلك عروض الموردين لتقارن بينها.')}
          </p>
        </div>
        <div className="relative z-20 mt-5">
        <form onSubmit={go} className="flex items-center gap-1.5 rounded-2xl bg-white p-1.5 shadow-lg focus-within:ring-2 focus-within:ring-[#0B2438] focus-within:shadow-[0_0_0_5px_rgba(212,165,67,.45)]" role="search">
          <Search className="w-5 h-5 text-[#8F6820] shrink-0 ms-2" aria-hidden />
          <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); setActive(-1) }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey}
            role="combobox" aria-expanded={showList} aria-controls="hero-suggest" aria-autocomplete="list" autoComplete="off"
            aria-activedescendant={showList && active >= 0 ? `hero-suggest-${active}` : undefined}
            className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[16px] text-[#0B2438] placeholder-[#5B6B7C] outline-none focus-visible:outline-none"
            placeholder={homeBuyer
              ? L('e.g. light, mixer, paint, sofa…', 'مثلاً: لائٹ، مکسر، پینٹ، صوفہ…', 'مثال: مصباح، خلاط، دهان، أريكة…')
              : L('e.g. ceiling light, paint, sofa, rebar…', 'مثلاً: چھت کی لائٹ، پینٹ، صوفہ، سریا…', 'مثال: إنارة سقف، دهان، أريكة، حديد…')} aria-label={L('Search for a product', 'چیز تلاش کریں', 'ابحث عن منتج')} />
          {/* owner 2026-10-24: one main button below; the photo is a camera inside the search (like a lens) */}
          <Link href="/contractor/rfq/quick?start=photo" title={touch ? L('Take or upload a photo of your product', 'تصویر لیں یا اپلوڈ کریں', 'صوّر منتجك أو ارفع صورته') : L('Search by a photo of your product', 'تصویر سے تلاش کریں', 'ابحث بصورة منتجك')}
            aria-label={touch ? L('Take or upload a photo of your product', 'تصویر لیں یا اپلوڈ کریں', 'صوّر منتجك أو ارفع صورته') : L('Search by a photo of your product', 'تصویر سے تلاش کریں', 'ابحث بصورة منتجك')}
            className="shrink-0 grid place-items-center w-11 h-11 rounded-xl text-[#8F6820] hover:bg-[#F7F1E3] transition-colors">
            <Camera className="w-5 h-5" aria-hidden />
          </Link>
          <button type="submit" className="shrink-0 min-h-[44px] rounded-xl px-4 sm:px-6 text-sm font-extrabold text-white" style={{ background: '#0B2438' }}>
            {L('Search', 'تلاش', 'ابحث')}
          </button>
        </form>
        {showList && (
          <ul id="hero-suggest" role="listbox" className="absolute inset-x-0 top-full mt-1.5 overflow-hidden rounded-2xl bg-white text-[#0B2438] shadow-xl ring-1 ring-black/5">
            {hits.map((h, i) => (
              /* the option itself is the tap target, no button inside an option (round-2 UX-133) */
              <li key={h.name} id={`hero-suggest-${i}`} role="option" aria-selected={i === active}
                onMouseDown={e => e.preventDefault()} onClick={() => open_(h.name)} onMouseEnter={() => setActive(i)}
                className={`flex w-full min-h-[44px] cursor-pointer items-center gap-3 px-4 py-2.5 text-start text-[15px] ${i === active ? 'bg-[#F7F1E3]' : 'hover:bg-[#F7F1E3]'}`}>
                <Search className="w-4 h-4 text-[#8F6820] shrink-0" aria-hidden />
                <span className="truncate">{label(h.name)}</span>
              </li>
            ))}
            <li id={`hero-suggest-${hits.length}`} role="option" aria-selected={active === hits.length}
              onMouseDown={e => e.preventDefault()} onClick={requestLine} onMouseEnter={() => setActive(hits.length)}
              className="cursor-pointer">
              <div
                className={`flex w-full min-h-[44px] items-center gap-3 px-4 py-3 text-start text-[14px] font-bold border-t border-gray-100 text-[#0B2438] ${active === hits.length ? 'bg-[#D4A543]/25' : 'bg-[#D4A543]/10 hover:bg-[#D4A543]/20'}`}>
                <Plus className="w-4 h-4 shrink-0 text-[#8F6820]" aria-hidden />
                <span className="min-w-0"><span className="block">{L('Didn’t find what you are looking for? Request it as you want it', 'جو تلاش کر رہے ہیں نہیں ملا؟ جیسا چاہیں منگوائیں', 'لم تجد ما تبحث عنه؟ اطلبه كما تريده')}</span>
                  <span className="block text-[12px] font-semibold text-[#48596E] truncate">{L(`Request «${q.trim()}», you can add a photo`, `«${q.trim()}» منگوائیں، تصویر بھی لگا سکتے ہیں`, `اطلب «${q.trim()}»، ويمكنك إضافة صورة`)}</span></span>
              </div>
            </li>
          </ul>
        )}
        </div>
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/contractor/rfq/quick" className="inline-flex items-center gap-1.5 rounded-xl px-5 py-3 text-sm font-extrabold text-[#071827] shadow-md hover:brightness-105 transition" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            <Plus className="w-4 h-4" aria-hidden />{L('Ask a price for any product', 'کسی بھی چیز کی قیمت پوچھیں', 'اطلب سعر أي منتج')}
          </Link>
          {/* business buyers: the two list tools, with one consistent name each (UX-144) */}
          {!homeBuyer && (<>
            <Link href="/contractor/project/new" className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-white/90 hover:text-[#F5C55B] transition-colors">
              <FileSpreadsheet className="w-4 h-4" aria-hidden />{L('Bill of quantities: upload your materials list', 'مقداروں کا جدول: سامان کی فہرست اپ لوڈ کریں', 'جدول الكميات: ارفع قائمة موادك')}
            </Link>
            <Link href="/contractor/tender" className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-white/90 hover:text-[#F5C55B] transition-colors">
              <ClipboardList className="w-4 h-4" aria-hidden />{L('Tender pricing: price a tender’s items', 'ٹینڈر کی قیمت: ٹینڈر کی اشیاء کی قیمت', 'تسعير مناقصة: سعّر بنود مناقصة')}
            </Link>
          </>)}
        </div>
      </section>

      {belowSearch ? <div className="mt-4">{belowSearch}</div> : null}

      {/* every section as a medallion chip (same row as the mobile app) */}
      <div className={`mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 ${homeBuyer ? 'hidden' : ''}`} aria-label={L('Sections', 'حصے', 'الأقسام')}>
        {chips.map(b => (
          <Link key={b.key} href={`/contractor/rfq/quick?section=${b.key}`}
            className="shrink-0 inline-flex items-center gap-2 ps-1 pe-3.5 py-1 min-h-[44px] rounded-full border border-gray-200 bg-white text-[13px] font-bold text-[#0B2438] hover:border-[#D4A543] transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/section-icons/${b.key}.webp`} alt="" aria-hidden className="w-8 h-8" />
            {locale === 'en' ? b.en : locale === 'ur' ? b.ur : b.ar}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#0B2438]">{L('Start with what you need', 'جو چاہیے وہاں سے شروع کریں', 'ابدأ من الشيء الذي تحتاجه')}</h3>
          <p className="text-[13px] text-[#48596E]">{homeBuyer ? L('What a home usually needs comes first', 'گھر کو عموماً جو چاہیے وہ پہلے', 'ما يحتاجه البيت عادةً يظهر أولاً') : L('For your home, a renovation or a whole project', 'گھر، مرمت یا پورے پراجیکٹ کے لیے', 'للبيت أو التجديد أو مشروع كامل')}</p>
        </div>
        <Link href="/contractor/rfq/quick?browse=1" className="text-sm font-bold text-[#8F6820] hover:underline whitespace-nowrap min-h-[44px] inline-flex items-center">{L('All sections', 'تمام حصے', 'كل الأقسام')} {fwd}</Link>
      </div>
      <div className={`mt-3 grid gap-2 sm:gap-3 ${homeBuyer ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 lg:grid-cols-9'}`}>
        {cats.map(c => (
          homeBuyer ? (
          <Link key={c.key} href={`/contractor/rfq/quick?section=${c.key}`}
            className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white p-2.5 hover:border-[#D4A543] hover:shadow-md transition-all">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/section-icons/${c.key}.webp`} alt="" aria-hidden className="w-12 h-12 shrink-0" />
            <span className="min-w-0">
              <span className="block font-extrabold text-[14px] text-[#0B2438] leading-snug">{pick(c.home || c)}</span>
              <span className="block text-[12px] text-gray-600 leading-snug truncate">{pick(c.home ? c.home.sub : c.sub)}</span>
            </span>
          </Link>
          ) : (
          <Link key={c.key} href={`/contractor/rfq/quick?section=${c.key}`}
            className="group relative overflow-hidden rounded-2xl min-h-[112px] sm:min-h-[140px] bg-[#0B2438] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/sections/${c.img}.webp`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#050B12]/85 via-[#071827]/15 to-transparent" aria-hidden />
            <span className="relative flex flex-col justify-end h-full min-h-[112px] sm:min-h-[140px] p-3">
              <span className="font-bold text-[15px] text-white leading-snug drop-shadow">{pick(c)}</span>
              <span className="text-[12px] text-white/85">{pick(c.sub)}</span>
            </span>
          </Link>
          )
        ))}
      </div>

      {/* ready material lists (owner 2026-11-22): each with its own product photo, under the sections */}
      <div className="mt-7">
        <h3 className="text-lg font-extrabold text-[#0B2438]">{homeBuyer ? L('Get your home ready', 'اپنا گھر تیار کریں', 'جهّز بيتك') : L('Ready material lists', 'سامان کی تیار فہرستیں', 'قوائم مواد جاهزة')}</h3>
        <p className="text-[13px] text-[#48596E]">{L('Pick a list, remove what you don’t need and set the quantities', 'فہرست چنیں، غیر ضروری ہٹائیں اور مقدار لکھیں', 'اختر قائمة، وأزل ما لا تحتاجه، وحدّد الكميات')}</p>
        {/* round-7 UX-110: a grid on wider screens; on phones a horizontal row with a fade that shows there is more */}
        <div className="relative">
        <div className="mt-2 flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible">
          {(homeBuyer ? HOME_ROOM_PACKS : HOME_PACKS).map(p => (
            <Link key={p.id} href={`/contractor/rfq/quick?pack=${p.id}`}
              className="shrink-0 w-36 sm:w-auto rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-[#D4A543] hover:shadow-md transition-all">
              <span className="block aspect-[4/3] bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo || productImageUrl(p.cover)} alt="" loading="lazy" className={p.photo ? 'w-full h-full object-cover' : 'w-full h-full object-contain p-2'} />
              </span>
              <span className="block px-2.5 py-2">
                <span className="block font-extrabold text-[13.5px] text-[#0B2438] leading-snug">{pick(p)}</span>
                <span className="block text-[12px] text-gray-600 leading-snug">{pick(p.sub)}</span>
              </span>
            </Link>
          ))}
        </div>
        <span aria-hidden className="sm:hidden pointer-events-none absolute inset-y-0 end-0 w-10 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-white" />
        </div>
      </div>
    </div>
  )
}
