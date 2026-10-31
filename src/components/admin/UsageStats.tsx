'use client'
// Admin: what buyers actually use (admin_usage_stats, migration 179) — owner 2026-10-31.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, getProductLabel } from '@/types'

export default function UsageStats() {
  const [days, setDays] = useState(30)
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    setD(null); setErr('')
    createClient().rpc('admin_usage_stats', { p_days: days }).then(({ data, error }: any) => {
      if (!alive) return
      if (error) setErr('تعذّر تحميل الإحصاءات.'); else setD(data)
    })
    return () => { alive = false }
  }, [days])

  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0)
  const card = 'bg-white rounded-2xl p-5 border border-gray-100 shadow-sm'
  const List = ({ title, rows, render }: { title: string; rows: any[]; render: (r: any, i: number) => any }) => (
    <div className={card}>
      <h3 className="text-sm font-bold mb-3 text-[#0B2438]">{title}</h3>
      {rows?.length ? <ol className="space-y-1.5">{rows.map(render)}</ol> : <p className="text-xs text-gray-400">لا توجد بيانات بعد.</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base font-extrabold text-[#0B2438]">ماذا يستخدم المشترون؟</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-xs font-semibold">
          {[[7, '7 أيام'], [30, '30 يوماً'], [90, '3 أشهر'], [365, 'سنة']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setDays(v as number)}
              className={`px-3 py-1.5 rounded-lg ${days === v ? 'bg-white shadow-sm text-[#0B2438]' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!d ? (!err && <p className="text-sm text-gray-400">جارٍ التحميل…</p>) : (<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['طلبات', d.requests], ['مشترون نشطون', d.buyers],
            ['طلب مادة واحدة', `${d.kinds.single} (${pct(d.kinds.single, d.requests)}%)`],
            ['طلب عدة مواد', `${d.kinds.multi} (${pct(d.kinds.multi, d.requests)}%)`],
            ['مشروع (BOQ)', `${d.kinds.project} (${pct(d.kinds.project, d.requests)}%)`],
            ['طلبات بصورة', `${d.kinds.with_photo} (${pct(d.kinds.with_photo, d.requests)}%)`],
            ['مواد كُتبت يدوياً', `${d.kinds.handwritten_lines} من ${d.kinds.lines}`],
            ['استلام من المورد', `${d.options.pickup} (${pct(d.options.pickup, d.requests)}%)`],
          ].map(([l, v]) => (
            <div key={l as string} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="text-xl font-bold text-[#0B2438]">{v}</div>
              <div className="text-xs text-gray-500 mt-1">{l}</div>
            </div>
          ))}
        </div>
        <div className={card}>
          <h3 className="text-sm font-bold mb-3 text-[#0B2438]">الخيارات التي يختارها المشترون</h3>
          <div className="space-y-2">
            {[['إخفاء الاسم', d.options.hide_identity], ['فاتورة ضريبية', d.options.vat_invoice], ['اختيار نوع المورد', d.options.tier_chosen], ['الموثّقون فقط', d.options.verified_only], ['استلام بنفسه', d.options.pickup]].map(([l, n]) => (
              <div key={l as string} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-gray-600">{l}</span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct(n as number, d.requests)}%`, background: '#D4A543' }} /></div>
                <span className="w-16 text-end font-bold text-[#0B2438]">{pct(n as number, d.requests)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <List title="أكثر المواد طلباً" rows={d.top_requested} render={(r: any, i: number) => (
            <li key={i} className="flex justify-between gap-2 text-sm"><span className="truncate">{i + 1}. {getProductLabel(r.name, 'ar')}</span><span className="font-bold text-[#0B2438] shrink-0">{r.requests} طلب</span></li>)} />
          <List title="أكثر المواد بيعاً (تمّ اختيار عرض)" rows={d.top_awarded} render={(r: any, i: number) => (
            <li key={i} className="flex justify-between gap-2 text-sm"><span className="truncate">{i + 1}. {getProductLabel(r.name, 'ar')}</span><span className="font-bold text-[#0B2438] shrink-0">{r.awards} · {Number(r.total || 0).toLocaleString('en-US')} ر.س</span></li>)} />
          <List title="المواد حسب القطاع" rows={d.top_sections} render={(r: any, i: number) => (
            <li key={i} className="flex justify-between gap-2 text-sm"><span>{(SECTOR_LABELS as any)[r.sector] || r.sector}</span><span className="font-bold text-[#0B2438]">{r.lines} مادة</span></li>)} />
          <List title="بحث لم يجد شيئاً (مواد ناقصة؟)" rows={d.no_result_searches} render={(r: any, i: number) => (
            <li key={i} className="flex justify-between gap-2 text-sm"><span className="truncate" dir="auto">«{r.query}»</span><span className="font-bold text-[#0B2438] shrink-0">{r.times} مرة</span></li>)} />
        </div>
      </>)}
    </div>
  )
}
