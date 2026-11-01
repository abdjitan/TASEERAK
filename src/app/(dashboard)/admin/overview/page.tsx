'use client'
// «لوحة المالك» — one-screen view of the marketplace for the owner (admin_overview, migration 187).
// Arabic-only like the rest of /admin. Charts are hand-drawn SVG (src/components/admin/OverviewCharts).

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import Glyph from '@/components/shared/Glyph'
import { getNav } from '@/lib/nav'
import { Donut, LineChart, Funnel, RegionBars, fmt, sar, ago, isNum, NAVY, GOLD, DARK_GOLD, GREEN } from '@/components/admin/OverviewCharts'
import BroadcastForm from '@/components/admin/BroadcastForm'

const PERIODS = [7, 30, 90, 365]
const METRICS = [
  { key: 'signups', label: 'التسجيلات' },
  { key: 'requests', label: 'الطلبات' },
  { key: 'offers', label: 'العروض' },
  { key: 'deals', label: 'الصفقات' },
  { key: 'value', label: 'قيمة الصفقات', money: true },
] as const
const ROLE_AR: Record<string, string> = { contractor: 'مشترٍ', supplier: 'مورد', admin: 'إدارة' }

const card = 'bg-white rounded-2xl p-5 border border-gray-100 shadow-sm'

function Card({ title, icon, children, extra, className = '' }: { title: string; icon?: string; children: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <section className={`${card} ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: NAVY }}>{icon && <Glyph e={icon} />}{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

function Kpi({ label, value, sub, icon, pulse }: { label: string; value: string; sub?: ReactNode; icon: string; pulse?: boolean }) {
  return (
    <div className={`${card} !p-4`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 font-semibold">{label}</span>
        <span className="w-8 h-8 rounded-xl grid place-items-center text-[15px]" style={{ background: '#0B2438', color: '#F5C55B' }}>
          {pulse ? (
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: '#34d399' }} />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full" style={{ background: '#10b981' }} />
            </span>
          ) : <Glyph e={icon} />}
        </span>
      </div>
      <div className="text-2xl font-extrabold mt-2 tabular-nums" style={{ color: NAVY }}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-1 tabular-nums">{sub}</div>}
    </div>
  )
}

const tone = (pct: any) => !isNum(pct) ? { bg: '#F4F6F9', fg: '#6B7A8C' }
  : Number(pct) >= 60 ? { bg: '#E7F4EF', fg: GREEN }
  : Number(pct) >= 30 ? { bg: '#FDF4E2', fg: '#9A6A10' }
  : { bg: '#FDECEC', fg: '#B42318' }

export default function OwnerOverview() {
  const [ok, setOk] = useState(false)
  const [uid, setUid] = useState<string | undefined>()
  const [days, setDays] = useState(30)
  const [includeTest, setIncludeTest] = useState(false)
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [metric, setMetric] = useState<(typeof METRICS)[number]['key']>('signups')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/'; return }
      setUid(session.user.id)
      setOk(true)
    })()
  }, [])

  const load = useCallback(async () => {
    setRefreshing(true)
    const { data, error } = await createClient().rpc('admin_overview', { p_days: days, p_include_test: includeTest })
    setRefreshing(false)
    if (error) { setErr('تعذّر تحميل اللوحة: ' + error.message); return }
    setErr('')
    setD(data)
  }, [days, includeTest])

  useEffect(() => {
    if (!ok) return
    load()
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 60_000)
    return () => clearInterval(t)
  }, [ok, load])

  if (!ok || (!d && !err)) return <PageLoader />

  const u = d?.users || {}, rq = d?.requests || {}, of = d?.offers || {}, dl = d?.deals || {}, fn = d?.funnel || {}, hl = d?.health || {}
  const series: any[] = Array.isArray(d?.series) ? d.series : []
  const m = METRICS.find((x) => x.key === metric)!
  const periodLabel = days === 365 ? 'آخر سنة' : `آخر ${days} يوماً`

  return (
    <AppShell title="لوحة المالك" subtitle="نظرة شاملة على المنصة" userId={uid} nav={getNav('admin', 'ar', '/admin/overview')} dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="الفترة">
            {PERIODS.map((p) => (
              <button key={p} type="button" onClick={() => setDays(p)} aria-pressed={days === p}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border tabular-nums ${days === p ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                style={days === p ? { background: NAVY } : {}}>
                {p === 365 ? 'سنة' : `${p} يوماً`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} className="accent-[#0B2438] w-4 h-4" />
              تضمين الحسابات التجريبية
            </label>
            <button type="button" onClick={load} disabled={refreshing}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50" style={{ color: NAVY }}>
              <Glyph e="🔁" /> {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
            </button>
          </div>
        </div>
        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{err}</div>}
        {d?.generated_at && <p className="text-[11px] text-gray-400 -mt-2">آخر تحديث: {new Date(d.generated_at).toLocaleTimeString('ar-SA-u-ca-gregory-nu-latn')} · يتجدد تلقائياً كل دقيقة · الفترة: {periodLabel}</p>}

        {d && (<>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kpi icon="👥" label="إجمالي المسجّلين" value={fmt(u.total)} sub={<>جديد خلال الفترة: <b>{fmt(u.new_in_period)}</b></>} />
            <Kpi icon="🟢" pulse label="أونلاين الآن" value={fmt(u.online_now)} sub={<>نشطون اليوم {fmt(u.active_24h)} · 7 أيام {fmt(u.active_7d)}</>} />
            <Kpi icon="🤝" label="الصفقات" value={fmt(dl.count)} sub={<>خلال الفترة: <b>{fmt(dl.count_in_period)}</b></>} />
            <Kpi icon="💰" label="قيمة الصفقات" value={sar(dl.value)} sub={<>خلال الفترة: <b>{sar(dl.value_in_period)}</b></>} />
            <Kpi icon="💵" label="المبالغ المستلَمة" value={sar(dl.received_value)} sub={<>المدفوعة: <b>{sar(dl.paid_value)}</b></>} />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Series */}
            <Card title="النشاط اليومي" icon="📈" className="lg:col-span-2"
              extra={
                <div className="flex gap-1 flex-wrap justify-end">
                  {METRICS.map((x) => (
                    <button key={x.key} type="button" onClick={() => setMetric(x.key)} aria-pressed={metric === x.key}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${metric === x.key ? '' : 'text-gray-500 hover:bg-gray-50'}`}
                      style={metric === x.key ? { background: GOLD, color: NAVY } : {}}>{x.label}</button>
                  ))}
                </div>
              }>
              <LineChart money={'money' in m && m.money} points={series.map((s: any) => ({ day: String(s.day), v: Number(s[metric]) || 0 }))} />
              <p className="text-[11px] text-gray-400 mt-2 tabular-nums">
                المجموع خلال الفترة: <b style={{ color: NAVY }}>{('money' in m && m.money) ? sar(series.reduce((a, s: any) => a + (Number(s[metric]) || 0), 0)) : fmt(series.reduce((a, s: any) => a + (Number(s[metric]) || 0), 0))}</b>
              </p>
            </Card>

            {/* Users by type */}
            <Card title="المستخدمون حسب النوع" icon="👥">
              <Donut center={fmt(u.total)} centerLabel="مستخدم" parts={[
                { label: 'مشترون', value: Number(u.buyers) || 0, color: NAVY },
                { label: 'شركات', value: Number(u.supplier_company) || 0, color: GOLD },
                { label: 'محلات', value: Number(u.supplier_shop) || 0, color: GREEN },
                { label: 'بائعون مستقلون', value: Number(u.supplier_independent) || 0, color: '#7A8CA3' },
              ]} />
              <dl className="grid grid-cols-2 gap-2 mt-4 text-xs">
                {[
                  ['موثّقون', u.verified], ['بانتظار التوثيق', u.pending_verification], ['بريد مؤكَّد', u.email_confirmed],
                  ['أعضاء فرق', u.team_members], ['حسابات موقوفة', u.inactive], ['نشطون خلال 30 يوماً', u.active_30d],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
                    <dt className="text-gray-500">{k}</dt><dd className="font-bold tabular-nums" style={{ color: NAVY }}>{fmt(v)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          {/* Liquidity */}
          <Card title="سيولة السوق" icon="⚡" extra={<span className="text-[11px] text-gray-400 tabular-nums">الطلبات: {fmt(rq.total)} · خلال الفترة {fmt(rq.in_period)} · سطور {fmt(rq.lines)}</span>}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'طلبات وصلها عرض واحد على الأقل', v: rq.with_offer_pct, pct: true },
                { label: 'طلبات وصلها 3 عروض', v: rq.with_3_offers_pct, pct: true },
                { label: 'رُدّ عليها خلال 24 ساعة', v: rq.answered_24h_pct, pct: true },
              ].map((x) => {
                const t = tone(x.v)
                return (
                  <div key={x.label} className="rounded-2xl p-4" style={{ background: t.bg }}>
                    <div className="text-2xl font-extrabold tabular-nums" style={{ color: t.fg }}>{isNum(x.v) ? `${fmt(x.v)}%` : '—'}</div>
                    <div className="text-[11px] mt-1 text-gray-600">{x.label}</div>
                  </div>
                )
              })}
              <div className="rounded-2xl p-4 bg-gray-50">
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: NAVY }}>{isNum(rq.median_first_offer_hours) ? `${fmt(rq.median_first_offer_hours, 1)} س` : '—'}</div>
                <div className="text-[11px] mt-1 text-gray-600">الزمن الوسيط لوصول أول عرض</div>
              </div>
              <div className="rounded-2xl p-4 bg-gray-50">
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: NAVY }}>{fmt(rq.open_now)}</div>
                <div className="text-[11px] mt-1 text-gray-600">طلبات مفتوحة الآن</div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 tabular-nums">العروض: {fmt(of.total)} · خلال الفترة {fmt(of.in_period)} · بانتظار القرار {fmt(of.pending)} · موردون قدّموا عروضاً خلال الفترة {fmt(of.suppliers_quoting)}</p>
          </Card>

          {/* Funnels */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card title="مسار الصفقة — المشترون" icon="👷">
              <Funnel color={NAVY} steps={[
                { label: 'مسجّل', value: fn.buyers }, { label: 'أرسل طلباً', value: fn.buyers_requested },
                { label: 'وصله عرض', value: fn.buyers_got_offer }, { label: 'اختار مورداً', value: fn.buyers_awarded },
                { label: 'استلم', value: fn.buyers_received },
              ]} />
            </Card>
            <Card title="مسار الصفقة — الموردون" icon="🏪">
              <Funnel color={DARK_GOLD} steps={[
                { label: 'مسجّل', value: fn.suppliers }, { label: 'حدّد تخصصاته', value: fn.suppliers_with_specialty },
                { label: 'قدّم عرضاً', value: fn.suppliers_quoted }, { label: 'فاز بصفقة', value: fn.suppliers_won },
              ]} />
            </Card>
          </div>

          {/* Deals status + concentration */}
          <div className="grid lg:grid-cols-3 gap-5">
            <Card title="حالة الصفقات" icon="📦" className="lg:col-span-2" extra={<span className="text-[11px] text-gray-400 tabular-nums">متوسط قيمة الصفقة: {sar(dl.avg_value)}</span>}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'قيد التنفيذ', v: dl.in_progress },
                  { label: 'سُلّمت', v: dl.delivered },
                  { label: 'استُلمت', v: dl.received },
                  { label: 'دُفعت', v: dl.paid },
                  { label: 'نزاعات مفتوحة', v: dl.disputes_open, alert: true, href: '/admin?tab=disputes' },
                  { label: 'متأخرة', v: dl.stuck, alert: true, href: '/admin?tab=deals' },
                ].map((x) => {
                  const bad = x.alert && Number(x.v) > 0
                  const inner = (
                    <>
                      <div className="text-2xl font-extrabold tabular-nums" style={{ color: bad ? '#B42318' : NAVY }}>{fmt(x.v)}</div>
                      <div className="text-[11px] mt-1" style={{ color: bad ? '#B42318' : '#6B7A8C' }}>{x.label}{bad && x.href ? ' — اعرضها' : ''}</div>
                    </>
                  )
                  const cls = `block rounded-2xl p-4 ${bad ? 'bg-red-50 border border-red-200 hover:bg-red-100' : 'bg-gray-50'}`
                  return bad && x.href ? <Link key={x.label} href={x.href} className={cls}>{inner}</Link> : <div key={x.label} className={cls}>{inner}</div>
                })}
              </div>
            </Card>
            <Card title="تركّز المبيعات" icon="⚖">
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: Number(dl.top_buyer_share_pct) > 50 ? '#B42318' : NAVY }}>
                {isNum(dl.top_buyer_share_pct) ? `${fmt(dl.top_buyer_share_pct)}%` : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">حصة أكبر مشترٍ من إجمالي قيمة الصفقات.</p>
              {Number(dl.top_buyer_share_pct) > 50 && (
                <p className="mt-3 text-xs rounded-xl p-3 bg-amber-50 border border-amber-200 text-amber-800"><Glyph e="⚠" /> اعتماد كبير على مشترٍ واحد: أكثر من نصف قيمة الصفقات تأتي منه.</p>
              )}
            </Card>
          </div>

          {/* Top suppliers + regions */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="أعلى الموردين" icon="🏆">
              {Array.isArray(dl.top_suppliers) && dl.top_suppliers.length ? (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead><tr className="text-[11px] text-gray-400 text-right"><th className="font-semibold p-1.5">#</th><th className="font-semibold p-1.5">المورد</th><th className="font-semibold p-1.5">الصفقات</th><th className="font-semibold p-1.5">القيمة</th></tr></thead>
                    <tbody>
                      {dl.top_suppliers.map((s: any, i: number) => (
                        <tr key={s.id || i} className="border-t border-gray-50">
                          <td className="p-1.5 text-gray-400 tabular-nums">{i + 1}</td>
                          <td className="p-1.5">{s.id ? <Link href={`/admin/users/${s.id}`} className="font-semibold hover:underline" style={{ color: DARK_GOLD }}>{s.name || '—'}</Link> : (s.name || '—')}</td>
                          <td className="p-1.5 tabular-nums">{fmt(s.deals)}</td>
                          <td className="p-1.5 tabular-nums font-bold" style={{ color: NAVY }}>{sar(s.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-gray-400">لا توجد صفقات بعد.</p>}
            </Card>
            <Card title="المستخدمون حسب المنطقة" icon="🗺">
              <RegionBars rows={Array.isArray(u.by_region) ? u.by_region : []} />
            </Card>
          </div>

          {/* Online + health */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="أونلاين الآن" icon="🟢" extra={<span className="text-[11px] text-gray-400">آخر 15 دقيقة</span>}>
              {Array.isArray(u.online_list) && u.online_list.length ? (
                <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {u.online_list.map((o: any) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <Link href={`/admin/users/${o.id}`} className="font-semibold hover:underline truncate" style={{ color: DARK_GOLD }}>{o.name || '—'}</Link>
                      <span className="flex items-center gap-2 shrink-0 text-[11px] text-gray-500">
                        <span className="badge badge-gray text-[10px]">{ROLE_AR[o.role] || o.role}</span>
                        <span className="tabular-nums">{ago(o.last_seen_at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-400">لا أحد متصل الآن.</p>}
            </Card>
            <Card title="صحة النظام" icon="🛡">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'أخطاء خلال 24 ساعة', v: hl.errors_24h, bad: Number(hl.errors_24h) > 0 },
                  { label: 'مهام مجدولة فشلت (24 س)', v: hl.cron_failed_24h, bad: Number(hl.cron_failed_24h) > 0 },
                  { label: 'رسائل بريد أُرسلت (24 س)', v: hl.emails_24h, bad: false },
                  { label: 'تخصصات بلا مورد', v: hl.no_supplier_specialties, bad: false, warn: Number(hl.no_supplier_specialties) > 0 },
                ].map((x) => (
                  <div key={x.label} className={`rounded-2xl p-3 ${x.bad ? 'bg-red-50' : x.warn ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    <div className="text-xl font-extrabold tabular-nums" style={{ color: x.bad ? '#B42318' : x.warn ? '#9A6A10' : NAVY }}>{fmt(x.v)}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{x.label}</div>
                  </div>
                ))}
              </div>
              {Array.isArray(hl.recent_errors) && hl.recent_errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-gray-500 mb-2">آخر الأخطاء</h3>
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                    {hl.recent_errors.map((e: any, i: number) => (
                      <li key={i} className="text-[11px] rounded-lg bg-gray-50 p-2">
                        <div className="flex justify-between gap-2"><b className="text-gray-700" dir="ltr">{e.context || '—'}</b><span className="text-gray-400 tabular-nums shrink-0">{ago(e.created_at)}</span></div>
                        <div className="text-gray-500 break-words mt-0.5" dir="ltr">{e.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {/* Broadcast */}
          <Card title="إعلان للمستخدمين" icon="🔔" extra={<span className="text-[11px] text-gray-400">يصل كإشعار داخل المنصة فقط</span>}>
            <BroadcastForm counts={{ all: u.total, buyers: u.buyers, suppliers: u.suppliers }} />
          </Card>
        </>)}
      </div>
    </AppShell>
  )
}
