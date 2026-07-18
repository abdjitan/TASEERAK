import type { Metadata } from 'next'
import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/server'
import { SECTOR_LABELS } from '@/types'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'

export const dynamic = 'force-dynamic' // عرض وقت الطلب — يتفادى إنشاء عميل Supabase وقت البناء (build-safe)

export const metadata: Metadata = {
  title: 'أسعار مواد البناء في السعودية اليوم | تسعيرك',
  description: 'مؤشّر أسعار مواد البناء في السعودية — متوسّط أسعار الحديد والأسمنت والخرسانة والبلاط والمواد الكهربائية والميكانيكية، محسوبة من صفقات حقيقية على منصة تسعيرك.',
  alternates: { canonical: '/prices' },
}

function fmt(n: any) {
  const v = Number(n) || 0
  return v.toLocaleString('en-US', { maximumFractionDigits: v < 100 ? 1 : 0 })
}
function fmtDate(d: any) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`
}

export default async function PricesPage() {
  // جلب غير قاتل: إذا تعذّر الاتصال وقت البناء نعرض حالة فارغة بدل كسر البناء
  let rows: any[] = []
  try {
    const supabase = createPublicClient()
    const { data } = await supabase.rpc('get_public_price_index')
    rows = Array.isArray(data) ? data : []
  } catch { rows = [] }

  // جمّع حسب القطاع
  const bySector: Record<string, any[]> = {}
  for (const r of rows) {
    const s = r.sector || 'other'
    if (!bySector[s]) bySector[s] = []
    bySector[s].push(r)
  }
  const sectors = Object.keys(bySector)

  return (
    <div className="min-h-screen bg-[#f7f8fa]" dir="rtl">
      <PublicHeader active="prices" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: '#1B2D5B' }}>💰 مؤشّر أسعار مواد البناء</h1>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed">
            متوسّط أسعار مواد البناء في السعودية، محسوبة من أسعار ترسية حقيقية على منصة تسعيرك — <span className="whitespace-nowrap">غير شاملة ضريبة القيمة المضافة</span> وبعد استبعاد القيم الشاذّة. أسعار استرشادية تتحدّث تلقائياً.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-bold text-gray-700 mb-1">قريباً</p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">سيظهر هنا مؤشّر أسعار مواد البناء بمجرد إتمام صفقات على المنصّة. كل صفقة تُغذّي المؤشّر تلقائياً.</p>
            <Link href="/register" className="inline-block mt-5 px-6 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: '#F5831F' }}>ابدأ الآن مجاناً</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sectors.map(sec => (
              <section key={sec} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <h2 className="px-4 py-3 font-bold text-sm border-b border-gray-100" style={{ color: '#1B2D5B' }}>
                  {(SECTOR_LABELS as any)[sec] || 'مواد أخرى'}
                </h2>
                <div className="divide-y divide-gray-50">
                  {bySector[sec].map((r: any) => (
                    <div key={r.product_name} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-800 truncate">{r.product_name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          النطاق: {fmt(r.min_price)} – {fmt(r.max_price)} ر.س · {r.samples} صفقة · آخر تحديث {fmtDate(r.last_awarded)}
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="font-extrabold text-base" style={{ color: '#0F6E56' }}>{fmt(r.avg_price)} <span className="text-[11px] font-normal text-gray-400">ر.س</span></div>
                        <div className="text-[10px] text-gray-400">/ {r.unit || 'وحدة'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* قسم SEO نصّي */}
        <div className="mt-10 bg-white rounded-2xl border border-gray-100 p-5 text-sm text-gray-600 leading-relaxed">
          <h2 className="font-bold mb-2" style={{ color: '#1B2D5B' }}>عن مؤشّر أسعار مواد البناء</h2>
          <p className="mb-2">
            يوفّر مؤشّر تسعيرك متوسّط أسعار أهم مواد البناء في السوق السعودي — مثل حديد التسليح، والأسمنت، والخرسانة الجاهزة، والبلوك، والبلاط والسيراميك، والمواد الكهربائية والميكانيكية — اعتماداً على أسعار فعلية من صفقات بين مقاولين وموردين موثّقين.
          </p>
          <p>
            للحصول على سعر دقيق لمشروعك، <Link href="/register" className="font-semibold underline" style={{ color: '#F5831F' }}>أنشئ طلب تسعير</Link> مجاناً، وسيتنافس عليه الموردون في منطقتك.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
