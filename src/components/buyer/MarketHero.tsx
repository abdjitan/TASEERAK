'use client'
// Buyer home hero from the approved design: «ماذا تحتاج اليوم؟» over the city photo, one search
// that opens the request page already searching, and the shopping categories as photo cards.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, FileSpreadsheet } from 'lucide-react'
import { searchProducts } from '@/lib/productSearch'
import { getProductLabel } from '@/types'
import { BROWSE_SECTIONS } from '@/lib/browseCategories'

const CATS: { key: string; img: string; ar: string; en: string; ur: string; sub: { ar: string; en: string; ur: string } }[] = [
  { key: 'electrical', img: 'lighting', ar: 'الإنارة', en: 'Lighting', ur: 'روشنی', sub: { ar: 'مصابيح وثريات', en: 'Lamps & chandeliers', ur: 'لیمپ اور جھومر' } },
  { key: 'furniture', img: 'furniture', ar: 'الأثاث والديكور', en: 'Furniture & decor', ur: 'فرنیچر', sub: { ar: 'للبيت والمكتب', en: 'Home & office', ur: 'گھر اور دفتر' } },
  { key: 'finishing', img: 'finishing', ar: 'الدهانات والتشطيبات', en: 'Paints & finishing', ur: 'پینٹ اور فنشنگ', sub: { ar: 'ألوان وبلاط ورخام', en: 'Colours, tiles, marble', ur: 'رنگ، ٹائلیں، ماربل' } },
  { key: 'plumbing', img: 'plumbing', ar: 'الحمّام والسباكة', en: 'Bathroom & plumbing', ur: 'باتھ روم اور پلمبنگ', sub: { ar: 'أدوات وإكسسوارات', en: 'Fixtures & fittings', ur: 'سامان اور لوازمات' } },
  { key: 'tools', img: 'tools', ar: 'الأدوات والمعدات', en: 'Tools & equipment', ur: 'اوزار اور مشینری', sub: { ar: 'للمنزل والموقع', en: 'Home & site', ur: 'گھر اور سائٹ' } },
  { key: 'building', img: 'building', ar: 'مواد البناء', en: 'Building materials', ur: 'تعمیراتی سامان', sub: { ar: 'كل الكميات', en: 'Any quantity', ur: 'ہر مقدار' } },
]

export default function MarketHero({ locale }: { locale: string }) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  // Live suggestions while typing («بلو» → بلوك، بلوك عازل…), from the same catalog search the request page uses.
  const hits = useMemo(() => {
    const t = q.trim()
    if (!t) return []
    const seen = new Set<string>()
    return searchProducts(t, { limit: 12 }).filter(h => !seen.has(h.name) && seen.add(h.name)).slice(0, 7)
  }, [q])
  const open_ = (term: string) => {
    const t = term.trim()
    router.push(t ? `/contractor/rfq/quick?q=${encodeURIComponent(t.slice(0, 80))}` : '/contractor/rfq/quick')
  }
  const go = (e?: React.FormEvent) => {
    e?.preventDefault()
    open_(open && active >= 0 && hits[active] ? hits[active].name : q)
  }
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hits.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % hits.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a <= 0 ? hits.length - 1 : a - 1)) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }
  const showList = open && hits.length > 0

  return (
    <div className="mb-6 animate-fade-in">
      <section className="market-hero relative rounded-[22px] text-white px-5 py-7 sm:px-8 sm:py-9 shadow-[0_24px_60px_-28px_rgba(5,11,18,.65)]">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#F5C55B]">
            <span className="w-2 h-2 rounded-full bg-[#F5C55B] shadow-[0_0_0_4px_rgba(245,197,91,.2)]" />
            {L('Your market for everything you need', 'ہر ضرورت کا بازار', 'سوقك لكل ما تحتاجه')}
          </div>
          <h2 className="mt-2 text-[28px] sm:text-[38px] font-extrabold leading-tight drop-shadow">{L('What do you need today?', 'آج آپ کو کیا چاہیے؟', 'ماذا تحتاج اليوم؟')}</h2>
          <p className="mt-1.5 text-sm sm:text-[15px] text-white/85">
            {L('From one lamp for your home to building materials — search, compare prices, or send one request to suppliers.',
              'گھر کے ایک لیمپ سے تعمیراتی سامان تک — تلاش کریں، قیمتیں موازنہ کریں یا ایک درخواست بھیجیں۔',
              'من لمبة للبيت إلى أثاث ومواد البناء — ابحث، قارن الأسعار، أو أرسل طلبًا واحدًا للموردين.')}
          </p>
        </div>
        <div className="relative z-20 mt-5">
        <form onSubmit={go} className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg" role="search">
          <Search className="w-5 h-5 text-[#9D7425] shrink-0 ms-3" aria-hidden />
          <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); setActive(-1) }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey}
            role="combobox" aria-expanded={showList} aria-controls="hero-suggest" aria-autocomplete="list" autoComplete="off"
            aria-activedescendant={showList && active >= 0 ? `hero-suggest-${active}` : undefined}
            className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[15px] text-[#0B2438] placeholder-[#728196] outline-none"
            placeholder={L('e.g. ceiling light, paint, sofa, rebar…', 'مثلاً: چھت کی لائٹ، پینٹ، صوفہ، سریا…', 'مثال: إنارة سقف، دهان، أريكة، حديد…')} aria-label={L('Search', 'تلاش', 'ابحث')} />
          <button type="submit" className="shrink-0 rounded-xl px-4 sm:px-6 py-2.5 text-sm font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            {L('Search', 'تلاش', 'ابحث في السوق')}
          </button>
        </form>
        {showList && (
          <ul id="hero-suggest" role="listbox" className="absolute inset-x-0 top-full mt-1.5 overflow-hidden rounded-2xl bg-white text-[#0B2438] shadow-xl ring-1 ring-black/5">
            {hits.map((h, i) => (
              <li key={h.name} id={`hero-suggest-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => open_(h.name)} onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-[15px] ${i === active ? 'bg-[#F7F1E3]' : 'hover:bg-[#F7F1E3]'}`}>
                  <Search className="w-4 h-4 text-[#9D7425] shrink-0" aria-hidden />
                  <span className="truncate">{getProductLabel(h.name, locale)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        </div>
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/contractor/rfq/quick" className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2438]/80 border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-[#0B2438] transition-colors">
            <Plus className="w-4 h-4" aria-hidden />{L('Ask a price for any product', 'کسی بھی چیز کی قیمت پوچھیں', 'اطلب سعر أي منتج')}
          </Link>
          <Link href="/contractor/project/new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-[#F5C55B] transition-colors">
            <FileSpreadsheet className="w-4 h-4" aria-hidden />{L('A big project? Upload your materials list', 'بڑا پراجیکٹ؟ سامان کی فہرست اپ لوڈ کریں', 'تجهّز مشروعًا كبيرًا؟ أضف قائمة المواد')}
          </Link>
        </div>
      </section>

      {/* every section as a medallion chip (same row as the mobile app) */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label={L('Sections', 'حصے', 'الأقسام')}>
        {BROWSE_SECTIONS.map(b => (
          <Link key={b.key} href={`/contractor/rfq/quick?section=${b.key}`}
            className="shrink-0 inline-flex items-center gap-2 ps-1 pe-3.5 py-1 rounded-full border border-gray-200 bg-white text-[13px] font-bold text-[#0B2438] hover:border-[#D4A543] transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/section-icons/${b.key}.webp`} alt="" aria-hidden className="w-8 h-8" />
            {locale === 'en' ? b.en : locale === 'ur' ? b.ur : b.ar}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#0B2438]">{L('Start with what you need', 'جو چاہیے وہاں سے شروع کریں', 'ابدأ من الشيء الذي تحتاجه')}</h3>
          <p className="text-xs text-[#48596E]">{L('For your home, a renovation or a whole project', 'گھر، مرمت یا پورے پراجیکٹ کے لیے', 'للبيت أو التجديد أو مشروع كامل')}</p>
        </div>
        <Link href="/contractor/rfq/quick" className="text-sm font-bold text-[#9D7425] hover:underline whitespace-nowrap">{L('All categories', 'تمام زمرے', 'كل التصنيفات')} ←</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATS.map(c => (
          <Link key={c.key} href={`/contractor/rfq/quick?section=${c.key}`}
            className="group relative overflow-hidden rounded-2xl min-h-[132px] sm:min-h-[150px] bg-[#0B2438] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/sections/${c.img}.webp`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#050B12]/85 via-[#071827]/15 to-transparent" aria-hidden />
            <span className="relative flex flex-col justify-end h-full min-h-[132px] sm:min-h-[150px] p-3">
              <span className="font-bold text-[15px] text-white leading-snug drop-shadow">{pick(c)}</span>
              <span className="text-[11px] text-white/80">{pick(c.sub)}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
