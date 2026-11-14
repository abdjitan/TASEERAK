'use client'
// «تقرير الأداء» — a printable one-page summary of the marketplace for incubators / partners
// (owner 2026-11-14). Real data only by default (test accounts excluded). Arabic, A4-friendly:
// the browser's «Print → Save as PDF» gives the file to send.
import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Funnel, fmt, sar, isNum, NAVY, GOLD, DARK_GOLD, GREEN } from '@/components/admin/OverviewCharts'
import { SECTOR_PRODUCTS } from '@/types'

const PERIODS: { d: number; label: string }[] = [
  { d: 3650, label: 'كل الفترة' }, { d: 90, label: 'آخر 90 يوماً' }, { d: 30, label: 'آخر 30 يوماً' },
]
const CATALOG_SIZE = new Set(Object.values(SECTOR_PRODUCTS).flat() as string[]).size

function Kpi({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white break-inside-avoid">
      <div className="text-[12px] text-gray-500 font-semibold">{label}</div>
      <div className="text-[26px] font-extrabold tabular-nums mt-1" style={{ color: NAVY }}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="text-[15px] font-extrabold mb-3 pb-1.5 border-b-2" style={{ color: NAVY, borderColor: GOLD }}>{title}</h2>
      {children}
    </section>
  )
}
const pct = (v: any) => (isNum(v) ? `${fmt(v)}%` : '—')

export default function OwnerReport() {
  const [ok, setOk] = useState(false)
  const [days, setDays] = useState(3650)
  const [includeTest, setIncludeTest] = useState(false)
  const [d, setD] = useState<any>(null)
  const [sv, setSv] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/'; return }
      setOk(true)
    })()
  }, [])

  useEffect(() => {
    if (!ok) return
    (async () => {
      setErr('')
      const supabase = createClient()
      const [a, b] = await Promise.all([
        supabase.rpc('admin_overview', { p_days: days, p_include_test: includeTest }),
        supabase.rpc('admin_savings_summary', { p_include_test: includeTest }),
      ])
      if (a.error) { setErr(a.error.message); return }
      setD(a.data); setSv(b.data || null)
    })()
  }, [ok, days, includeTest])

  if (!ok || !d) return <div className="min-h-screen grid place-items-center text-gray-400">{err || 'جارٍ تحميل التقرير…'}</div>

  const u = d.users || {}, rq = d.requests || {}, of = d.offers || {}, dl = d.deals || {}, fn = d.funnel || {}, h = d.health || {}
  const series: any[] = Array.isArray(d.series) ? d.series : []
  const offersPerRequest = Number(rq.total) > 0 ? (Number(of.total) / Number(rq.total)).toFixed(1) : '—'
  const today = new Date().toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh' })

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F6F9] print:bg-white">
      <style>{`@media print { @page { size: A4; margin: 12mm } .no-print { display: none !important } body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>

      {/* controls (not printed) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <a href="/admin/overview" className="text-sm font-bold text-gray-500 hover:text-gray-800">← لوحة المالك</a>
          <div className="flex-1" />
          {PERIODS.map((p) => (
            <button key={p.d} type="button" onClick={() => setDays(p.d)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${days === p.d ? 'text-white border-transparent' : 'text-gray-600 border-gray-200'}`}
              style={days === p.d ? { background: NAVY } : undefined}>{p.label}</button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-gray-600 mx-2">
            <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
            تضمين الحسابات التجريبية
          </label>
          <button type="button" onClick={() => window.print()} className="text-sm font-bold px-4 py-2 rounded-xl" style={{ background: GOLD, color: '#071827' }}>طباعة / حفظ PDF</button>
        </div>
        {includeTest && <div className="max-w-[900px] mx-auto px-4 pb-2 text-[12px] font-semibold text-amber-700">تنبيه: الأرقام تشمل حسابات تجريبية، فلا تعرضها على جهة خارجية بهذه الصورة.</div>}
      </div>

      <main className="max-w-[900px] mx-auto px-4 py-6 print:py-0">
        {/* header */}
        <header className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="text-[13px] font-bold" style={{ color: DARK_GOLD }}>تسعيرك · Taseerak</div>
            <h1 className="text-[24px] font-extrabold" style={{ color: NAVY }}>تقرير أداء المنصة</h1>
            <div className="text-[12px] text-gray-500 mt-0.5">منصة طلبات تسعير مواد البناء بين المشترين والموردين · الرياض</div>
          </div>
          <div className="text-end text-[12px] text-gray-500">
            <div>{today}</div>
            <div>{PERIODS.find((p) => p.d === days)?.label}</div>
            <div>{includeTest ? 'يشمل الحسابات التجريبية' : 'بيانات حقيقية (دون الحسابات التجريبية)'}</div>
          </div>
        </header>

        <Section title="الأرقام الرئيسية">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="المستخدمون" value={fmt(u.total)} sub={`${fmt(u.buyers)} مشترٍ · ${fmt(u.suppliers)} مورد`} />
            <Kpi label="طلبات التسعير" value={fmt(rq.total)} sub={`${fmt(rq.lines)} مادة مطلوبة`} />
            <Kpi label="عروض الأسعار" value={fmt(of.total)} sub={`${offersPerRequest} عرض لكل طلب`} />
            <Kpi label="الصفقات" value={fmt(dl.count)} sub={`قيمتها ${sar(dl.value)}`} />
            <Kpi label="قيمة الصفقات عبر المنصة" value={sar(dl.value)} sub={`متوسط الصفقة ${sar(dl.avg_value)}`} />
            <Kpi label="توفير المشترين" value={sar(sv?.saved)} sub={isNum(sv?.saved_pct) ? `${fmt(sv.saved_pct, 1)}% مقارنةً بأعلى عرض` : 'مقارنةً بأعلى عرض لكل مادة'} />
            <Kpi label="موردون قدّموا عروضاً" value={fmt(fn.suppliers_quoted)} sub={`${fmt(fn.suppliers_won)} فازوا بصفقات`} />
            <Kpi label="حسابات موثّقة" value={fmt(u.verified)} sub={`${fmt(u.email_confirmed)} بريد مؤكَّد`} />
          </div>
        </Section>

        <Section title="سيولة السوق (هل يجد المشتري عروضاً؟)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="طلبات وصلها عرض واحد على الأقل" value={pct(rq.with_offer_pct)} />
            <Kpi label="طلبات وصلها 3 عروض أو أكثر" value={pct(rq.with_3_offers_pct)} />
            <Kpi label="طلبات رُدّ عليها خلال 24 ساعة" value={pct(rq.answered_24h_pct)} />
            <Kpi label="الوقت حتى أول عرض (الوسيط)" value={isNum(rq.median_first_offer_hours) ? `${fmt(rq.median_first_offer_hours, 1)} ساعة` : '—'} />
          </div>
        </Section>

        <Section title="النمو اليومي">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 p-4 bg-white">
              <div className="text-[12px] font-bold text-gray-600 mb-2">التسجيلات</div>
              <LineChart points={series.map((s: any) => ({ day: String(s.day), v: Number(s.signups) || 0 }))} />
            </div>
            <div className="rounded-2xl border border-gray-200 p-4 bg-white">
              <div className="text-[12px] font-bold text-gray-600 mb-2">طلبات التسعير</div>
              <LineChart points={series.map((s: any) => ({ day: String(s.day), v: Number(s.requests) || 0 }))} />
            </div>
          </div>
        </Section>

        <Section title="رحلة المستخدم">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 p-4 bg-white">
              <div className="text-[12px] font-bold text-gray-600 mb-2">المشترون</div>
              <Funnel color={NAVY} steps={[
                { label: 'سجّلوا', value: fn.buyers }, { label: 'أرسلوا طلباً', value: fn.buyers_requested },
                { label: 'وصلهم عرض', value: fn.buyers_got_offer }, { label: 'اختاروا عرضاً', value: fn.buyers_awarded },
                { label: 'استلموا البضاعة', value: fn.buyers_received },
              ]} />
            </div>
            <div className="rounded-2xl border border-gray-200 p-4 bg-white">
              <div className="text-[12px] font-bold text-gray-600 mb-2">الموردون</div>
              <Funnel color={DARK_GOLD} steps={[
                { label: 'سجّلوا', value: fn.suppliers }, { label: 'حدّدوا تخصصاتهم', value: fn.suppliers_with_specialty },
                { label: 'قدّموا عروضاً', value: fn.suppliers_quoted }, { label: 'فازوا بصفقات', value: fn.suppliers_won },
              ]} />
            </div>
          </div>
        </Section>

        <Section title="الصفقات">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="صفقات مُسلَّمة" value={fmt(dl.delivered)} />
            <Kpi label="استلمها المشتري" value={fmt(dl.received)} sub={sar(dl.received_value)} />
            <Kpi label="مدفوعة" value={fmt(dl.paid)} sub={sar(dl.paid_value)} />
            <Kpi label="نزاعات مفتوحة" value={fmt(dl.disputes_open)} />
          </div>
        </Section>

        <Section title="جانب العرض والكتالوج">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="موردون: شركات" value={fmt(u.supplier_company)} />
            <Kpi label="موردون: محلات" value={fmt(u.supplier_shop)} />
            <Kpi label="موردون: مستقلون" value={fmt(u.supplier_independent)} />
            <Kpi label="مواد في الكتالوج" value={fmt(CATALOG_SIZE)} sub="في 6 قطاعات" />
          </div>
          {isNum(h.no_supplier_specialties) && <p className="text-[12px] text-gray-500 mt-2">تخصصات لم ينضم لها مورد بعد: {fmt(h.no_supplier_specialties)}.</p>}
        </Section>

        <Section title="ما تقدّمه المنصة اليوم">
          <ul className="grid md:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] text-gray-700 list-disc pr-5">
            <li>طلب تسعير متعدد المواد بالكتابة أو الصوت أو الصورة أو من الكتالوج</li>
            <li>توجيه آلي للطلب إلى الموردين المطابقين للتخصص والمنطقة</li>
            <li>مقارنة العروض واختيار الأرخص لكل مادة، مع حساب الضريبة بعدل</li>
            <li>أمر شراء وفاتورة ضريبية ومتابعة التسليم والاستلام والدفع</li>
            <li>رسائل داخلية بين الطرفين، وإشعارات فورية في التطبيق والبريد</li>
            <li>ميزانية اختيارية للمشتري وحساب التوفير على كل طلب</li>
            <li>واجهة بالعربية والإنجليزية والأوردية، وتطبيق جوال (أندرويد)</li>
            <li>حماية خصوصية المشتري، وتوثيق الموردين، وتبليغ وحظر داخل المحادثات</li>
          </ul>
        </Section>

        <footer className="mt-8 pt-3 border-t border-gray-200 text-[11px] text-gray-400 flex justify-between">
          <span>taseerak.com</span>
          <span>{includeTest ? 'يشمل حسابات تجريبية' : 'لا يشمل الحسابات التجريبية'} · قيم الصفقات بالريال السعودي</span>
        </footer>
      </main>
    </div>
  )
}
