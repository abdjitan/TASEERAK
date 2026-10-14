'use client'
// Buyer home hero from the approved design: «ماذا تحتاج اليوم؟» over the city photo, one search
// that opens the request page already searching, and the shopping categories as photo cards.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, FileSpreadsheet } from 'lucide-react'

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
  const go = (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = q.trim()
    router.push(t ? `/contractor/rfq/quick?q=${encodeURIComponent(t.slice(0, 80))}` : '/contractor/rfq/quick')
  }

  return (
    <div className="mb-6 animate-fade-in">
      <section className="market-hero relative overflow-hidden rounded-[22px] text-white px-5 py-7 sm:px-8 sm:py-9 shadow-[0_24px_60px_-28px_rgba(5,11,18,.65)]">
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
        <form onSubmit={go} className="relative z-10 mt-5 flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg">
          <Search className="w-5 h-5 text-[#9D7425] shrink-0 ms-3" aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)} className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[15px] text-[#0B2438] placeholder-[#728196] outline-none"
            placeholder={L('e.g. ceiling light, paint, sofa, rebar…', 'مثلاً: چھت کی لائٹ، پینٹ، صوفہ، سریا…', 'مثال: إنارة سقف، دهان، أريكة، حديد…')} aria-label={L('Search', 'تلاش', 'ابحث')} />
          <button type="submit" className="shrink-0 rounded-xl px-4 sm:px-6 py-2.5 text-sm font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            {L('Search', 'تلاش', 'ابحث في السوق')}
          </button>
        </form>
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/contractor/rfq/quick" className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2438]/80 border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-[#0B2438] transition-colors">
            <Plus className="w-4 h-4" aria-hidden />{L('Ask a price for any product', 'کسی بھی چیز کی قیمت پوچھیں', 'اطلب سعر أي منتج')}
          </Link>
          <Link href="/contractor/project/new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-[#F5C55B] transition-colors">
            <FileSpreadsheet className="w-4 h-4" aria-hidden />{L('A big project? Upload your materials list', 'بڑا پراجیکٹ؟ سامان کی فہرست اپ لوڈ کریں', 'تجهّز مشروعًا كبيرًا؟ أضف قائمة المواد')}
          </Link>
        </div>
      </section>

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
