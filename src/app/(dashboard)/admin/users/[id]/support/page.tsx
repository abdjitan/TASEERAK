'use client'
// «عرض الحساب للدعم (قراءة فقط)» — the account as its owner sees it, for support (admin_user_support_view,
// migration 187). Every open is logged with a reason and (by default) the owner is told. No action here
// changes data: links only lead to the existing request / order pages.

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import Glyph from '@/components/shared/Glyph'
import { getNav } from '@/lib/nav'
import { tierLabel } from '@/lib/sellers'
import { fmt, sar, ago } from '@/components/admin/OverviewCharts'

const RFQ_STATUS: Record<string, string> = { open: 'مفتوح', closed: 'مغلق', awarded: 'تمّ اختيار العرض', cancelled: 'ملغي', expired: 'منتهي', draft: 'مسودة' }
const OFFER_STATUS: Record<string, string> = { pending: 'بانتظار القرار', submitted: 'مُقدَّم', accepted: 'مقبول', rejected: 'مرفوض', withdrawn: 'مسحوب' }
const VERIFY: Record<string, string> = { verified: 'موثّق', pending: 'بانتظار التوثيق', rejected: 'مرفوض', unverified: 'غير موثّق' }
const ROLE_AR: Record<string, string> = { contractor: 'مشترٍ', supplier: 'مورد', admin: 'إدارة' }
const TABS = [
  { key: 'summary', label: 'الملخص' },
  { key: 'requests', label: 'الطلبات' },
  { key: 'offers', label: 'العروض' },
  { key: 'deals', label: 'الصفقات' },
  { key: 'conversations', label: 'المحادثات' },
  { key: 'notifications', label: 'الإشعارات' },
  { key: 'errors', label: 'الأخطاء' },
  { key: 'history', label: 'سجل الإدارة' },
] as const

const dt = (d: any) => d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn') : '—'
const dtt = (d: any) => d ? new Date(d).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const card = 'bg-white rounded-2xl p-5 border border-gray-100 shadow-sm'
const arr = (x: any): any[] => (Array.isArray(x) ? x : [])

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="py-1.5 border-b border-gray-50 last:border-0">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className="text-sm text-gray-800 break-words">{children ?? '—'}</div>
    </div>
  )
}
function Empty({ text }: { text: string }) {
  return <div className={`${card} text-center text-sm text-gray-400`}>{text}</div>
}

/** اختيار → تسليم → استلام → دفع */
function DealSteps({ d }: { d: any }) {
  const steps = [
    { label: 'اختيار', at: d.accepted_at },
    { label: 'تسليم', at: d.supplier_delivered_at },
    { label: 'استلام', at: d.received_at },
    { label: 'دفع', at: d.payment_confirmed_at },
  ]
  return (
    <ol className="flex items-start mt-3">
      {steps.map((s, i) => (
        <li key={s.label} className="flex-1 flex flex-col items-center text-center relative">
          {i > 0 && <span className="absolute top-3 right-1/2 w-full h-0.5" style={{ background: s.at ? '#0F6E56' : '#E5E7EB' }} />}
          <span className="relative z-10 w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold"
            style={s.at ? { background: '#0F6E56', color: '#fff' } : { background: '#fff', border: '2px solid #D1D5DB', color: '#9CA3AF' }}>{i + 1}</span>
          <span className="text-[11px] font-semibold mt-1" style={{ color: s.at ? '#0F6E56' : '#9CA3AF' }}>{s.label}</span>
          <span className="text-[10px] text-gray-400 tabular-nums">{s.at ? dt(s.at) : '—'}</span>
        </li>
      ))}
    </ol>
  )
}

function hintsOf(v: any): { level: 'red' | 'amber'; text: string }[] {
  const p = v?.profile || {}, a = v?.auth || {}
  const out: { level: 'red' | 'amber'; text: string }[] = []
  const now = Date.now()
  if (p.is_active === false) out.push({ level: 'red', text: 'الحساب موقوف (is_active = false).' })
  if (a.banned_until && new Date(a.banned_until).getTime() > now) out.push({ level: 'red', text: `تسجيل الدخول محظور حتى ${dtt(a.banned_until)}.` })
  if (a.email && !a.email_confirmed_at) out.push({ level: 'amber', text: 'البريد الإلكتروني غير مؤكَّد — قد لا يستطيع تسجيل الدخول أو لا تصله الرسائل.' })
  if (!a.last_sign_in_at) out.push({ level: 'amber', text: 'لم يسجّل الدخول قط.' })
  else if (now - new Date(a.last_sign_in_at).getTime() > 30 * 86400_000) out.push({ level: 'amber', text: `آخر تسجيل دخول قبل أكثر من 30 يوماً (${dt(a.last_sign_in_at)}).` })
  if (p.role === 'supplier' && arr(v?.specialties).length === 0 && !v?.company) out.push({ level: 'red', text: 'مورد بلا تخصصات — لن تصله أي طلبات تسعير.' })
  if (!p.region) out.push({ level: 'amber', text: 'لم تُحدَّد المنطقة — قد يؤثر ذلك على توجيه الطلبات.' })
  if (p.verification_status === 'pending') out.push({ level: 'amber', text: 'الحساب بانتظار التوثيق.' })
  if (p.verification_status === 'rejected') out.push({ level: 'red', text: 'طلب التوثيق مرفوض.' })
  if (v?.company && v.company.status && v.company.status !== 'active') out.push({ level: 'amber', text: `عضوية الفريق في «${v.company.company_name || '—'}» حالتها: ${v.company.status}.` })
  const recentErr = arr(v?.errors).filter((e) => now - new Date(e.created_at).getTime() < 7 * 86400_000).length
  if (recentErr) out.push({ level: 'red', text: `${fmt(recentErr)} خطأ مسجَّل خلال آخر 7 أيام — راجع تبويب «الأخطاء».` })
  const disputes = arr(v?.deals).filter((d) => d.dispute_status === 'open').length
  if (disputes) out.push({ level: 'red', text: `${fmt(disputes)} نزاع مفتوح.` })
  const stuck = arr(v?.deals).filter((d) => !d.received_at && d.dispute_status !== 'open' && d.accepted_at && now - new Date(d.accepted_at).getTime() > 7 * 86400_000).length
  if (stuck) out.push({ level: 'amber', text: `${fmt(stuck)} صفقة لم يُؤكَّد استلامها بعد أكثر من 7 أيام من الاختيار.` })
  const unpaid = arr(v?.deals).filter((d) => d.received_at && !d.payment_confirmed_at).length
  if (unpaid) out.push({ level: 'amber', text: `${fmt(unpaid)} صفقة مستلَمة لم يُؤكَّد دفعها.` })
  if (p.role === 'contractor' && arr(v?.requests).some((r) => r.status === 'open' && !Number(r.offers) && now - new Date(r.created_at).getTime() > 86400_000))
    out.push({ level: 'amber', text: 'لديه طلب مفتوح منذ أكثر من يوم ولم يصله أي عرض.' })
  return out
}

export default function SupportView() {
  const params = useParams()
  const id = params?.id as string
  const [ok, setOk] = useState(false)
  const [uid, setUid] = useState<string | undefined>()
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [v, setV] = useState<any>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('summary')
  const [openConv, setOpenConv] = useState<string | null>(null)

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

  async function open() {
    setErr('')
    if (reason.trim().length < 5) { setErr('اكتب سبب الاطلاع (5 أحرف على الأقل).'); return }
    setBusy(true)
    const { data, error } = await createClient().rpc('admin_user_support_view', { p_user_id: id, p_reason: reason.trim(), p_notify: notify })
    setBusy(false)
    if (error) { setErr('تعذّر فتح الحساب: ' + error.message); return }
    if (!data?.profile) { setErr('الحساب غير موجود.'); return }
    setV(data)
  }

  if (!ok) return <PageLoader />

  const p = v?.profile || {}, a = v?.auth || {}
  const name = p.company_name_ar || p.full_name || '—'
  const hints = v ? hintsOf(v) : []
  const counts: Record<string, number> = {
    requests: arr(v?.requests).length, offers: arr(v?.offers).length, deals: arr(v?.deals).length,
    conversations: arr(v?.conversations).length, notifications: arr(v?.notifications).length,
    errors: arr(v?.errors).length, history: arr(v?.admin_history).length,
  }

  return (
    <AppShell title="عرض الحساب للدعم" subtitle="قراءة فقط" userId={uid} nav={getNav('admin', 'ar', '/admin')} dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="sticky top-[60px] z-20 mb-4 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 shadow-sm"
          style={{ background: '#FDF4E2', border: '1px solid #E9C979', color: '#7A5410' }}>
          <Glyph e="👁" /> وضع الدعم — قراءة فقط · كل اطلاع مسجَّل
        </div>
        <Link href={`/admin/users/${id}`} className="text-sm hover:underline inline-block mb-4" style={{ color: '#8F6820' }}>← رجوع لصفحة المستخدم</Link>

        {!v ? (
          <div className={`${card} max-w-xl`}>
            <h1 className="text-lg font-extrabold mb-2" style={{ color: '#0B2438' }}>عرض الحساب للدعم (قراءة فقط)</h1>
            <p className="text-sm text-gray-600 leading-7">
              ستطّلع على الحساب كما يراه صاحبه: بياناته، وطلباته، وعروضه، وصفقاته، ومحادثاته، وإشعاراته، والأخطاء التي واجهها.
              لا يمكن تغيير أي شيء من هذه الشاشة. يُسجَّل كل اطلاع مع السبب واسم المشرف.
            </p>
            <label className="block text-sm font-semibold mt-4 mb-1.5" style={{ color: '#0B2438' }} htmlFor="sv-reason">سبب الاطلاع</label>
            <textarea id="sv-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
              placeholder="مثال: المستخدم أبلغ أن العروض لا تظهر له"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A543]/40" />
            <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#0B2438] w-4 h-4" />
              إبلاغ صاحب الحساب
            </label>
            {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
            <button type="button" onClick={open} disabled={busy || reason.trim().length < 5}
              className="mt-4 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: '#D4A543', color: '#0B2438' }}>
              {busy ? 'جارٍ الفتح…' : 'فتح الحساب للاطلاع'}
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`${card} mb-4 flex items-center gap-4 flex-wrap`}>
              <div className="w-14 h-14 rounded-2xl grid place-items-center text-xl font-bold text-white shrink-0" style={{ background: '#0B2438' }}>{name[0] || '?'}</div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-extrabold truncate" style={{ color: '#0B2438' }}>{name}</div>
                <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px]">
                  <span className="badge badge-navy">{ROLE_AR[p.role] || p.role || '—'}</span>
                  {p.role === 'supplier' && p.supplier_tier && <span className="badge badge-gray">{tierLabel(p.supplier_tier, 'ar')}</span>}
                  <span className={`badge ${p.verification_status === 'verified' ? 'badge-green' : p.verification_status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>{VERIFY[p.verification_status] || p.verification_status || '—'}</span>
                  {p.is_active === false && <span className="badge bg-red-100 text-red-700">موقوف</span>}
                  {p.is_test && <span className="badge badge-gray">تجريبي</span>}
                  <span className="text-gray-400">آخر ظهور: {ago(p.last_seen_at)}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
              {TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border ${tab === t.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={tab === t.key ? { background: '#0B2438' } : {}}>
                  {t.label}{counts[t.key] ? <span className="tabular-nums opacity-70"> ({counts[t.key]})</span> : null}
                </button>
              ))}
            </div>

            {tab === 'summary' && (
              <div className="space-y-4">
                <div className={card}>
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#0B2438' }}><Glyph e="💡" /> ما الذي قد يكون خطأً</h2>
                  {hints.length ? (
                    <ul className="space-y-2">
                      {hints.map((h, i) => (
                        <li key={i} className={`text-sm rounded-xl px-3 py-2 border ${h.level === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                          <Glyph e={h.level === 'red' ? '🚩' : '⚠'} /> {h.text}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-emerald-700"><Glyph e="✅" /> لا توجد مؤشرات مشكلة واضحة.</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className={card}>
                    <h2 className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>بيانات الحساب</h2>
                    <Field label="الاسم التجاري">{p.company_name_ar}</Field>
                    <Field label="الاسم">{p.full_name}</Field>
                    <Field label="النوع">{ROLE_AR[p.role] || p.role}{p.provider_type ? ` · ${p.provider_type}` : ''}</Field>
                    <Field label="المنطقة / المدينة">{[p.region, p.city].filter(Boolean).join(' / ') || '—'}</Field>
                    <Field label="الجوال (الملف)"><span dir="ltr">{p.phone || '—'}</span></Field>
                    <Field label="رقم السجل التجاري"><span dir="ltr">{p.cr_number || '—'}</span></Field>
                    <Field label="تاريخ الإنشاء">{dtt(p.created_at)}</Field>
                    {p.role === 'supplier' && <Field label="التخصصات">{arr(v.specialties).length ? `${arr(v.specialties).length} تخصص: ${arr(v.specialties).join('، ')}` : 'لا توجد'}</Field>}
                    {p.role === 'supplier' && <Field label="الفروع">{fmt(arr(v.branches).length)}</Field>}
                  </div>
                  <div className={card}>
                    <h2 className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>تسجيل الدخول</h2>
                    <Field label="البريد"><span dir="ltr">{a.email || '—'}</span></Field>
                    <Field label="تأكيد البريد">{a.email_confirmed_at ? `مؤكَّد · ${dt(a.email_confirmed_at)}` : 'غير مؤكَّد'}</Field>
                    <Field label="جوال الدخول"><span dir="ltr">{a.phone || '—'}</span></Field>
                    <Field label="آخر تسجيل دخول">{a.last_sign_in_at ? `${dtt(a.last_sign_in_at)} (${ago(a.last_sign_in_at)})` : 'لم يسجّل الدخول'}</Field>
                    <Field label="آخر ظهور في المنصة">{p.last_seen_at ? `${dtt(p.last_seen_at)} (${ago(p.last_seen_at)})` : '—'}</Field>
                    <Field label="إنشاء حساب الدخول">{dtt(a.created_at)}</Field>
                    <Field label="الحظر">{a.banned_until && new Date(a.banned_until).getTime() > Date.now() ? `محظور حتى ${dtt(a.banned_until)}` : 'غير محظور'}</Field>
                  </div>
                </div>
                {(v.company || arr(v.team).length > 0) && (
                  <div className={card}>
                    <h2 className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>الفريق</h2>
                    {v.company && <p className="text-sm text-gray-700 mb-2">عضو في «{v.company.company_name || '—'}» · الدور: {v.company.role || '—'} · الحالة: {v.company.status || '—'}</p>}
                    {arr(v.team).length > 0 && (
                      <ul className="divide-y divide-gray-50 text-sm">
                        {arr(v.team).map((m: any) => (
                          <li key={m.user_id} className="py-1.5 flex justify-between gap-2">
                            <Link href={`/admin/users/${m.user_id}`} className="hover:underline" style={{ color: '#8F6820' }}>{m.name || '—'}</Link>
                            <span className="text-xs text-gray-500">{m.role} · {m.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {arr(v.reviews).length > 0 && (
                  <div className={card}>
                    <h2 className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>التقييمات</h2>
                    <ul className="space-y-2 text-sm">
                      {arr(v.reviews).map((r: any, i: number) => (
                        <li key={i} className="rounded-xl bg-gray-50 p-2.5">
                          <div className="flex justify-between text-xs text-gray-500"><span>{r.about_me ? 'تقييم عنه' : 'تقييم كتبه'} · <b className="tabular-nums" style={{ color: '#8F6820' }}>{fmt(r.rating)}/5</b></span><span>{dt(r.created_at)}</span></div>
                          {r.comment && <p className="text-gray-700 mt-1">{r.comment}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === 'requests' && (arr(v.requests).length ? (
              <div className="space-y-2">
                {arr(v.requests).map((r: any) => (
                  <Link key={r.id} href={`/contractor/rfq/${r.id}`} className={`${card} !p-4 block hover:shadow-md transition-shadow`}>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: '#0B2438' }}>{r.product_name || '—'} {r.ref_no && <span className="text-[11px] text-gray-400 tabular-nums">#{r.ref_no}</span>}</span>
                      <span className="badge badge-gray text-[10px]">{RFQ_STATUS[r.status] || r.status}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1.5 tabular-nums flex gap-3 flex-wrap">
                      <span>{fmt(r.items)} مادة</span><span>{fmt(r.offers)} عرض</span><span>{fmt(r.awards)} اختيار</span>
                      <span>{[r.region, r.city].filter(Boolean).join(' / ')}</span>
                      <span>أُنشئ {dt(r.created_at)}</span>{r.expires_at && <span>ينتهي {dtt(r.expires_at)}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : <Empty text="لا توجد طلبات." />)}

            {tab === 'offers' && (arr(v.offers).length ? (
              <div className="space-y-2">
                {arr(v.offers).map((o: any) => (
                  <Link key={o.id} href={`/contractor/rfq/${o.rfq_id}`} className={`${card} !p-4 block hover:shadow-md transition-shadow`}>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: '#0B2438' }}>{o.product_name || '—'} {o.ref_no && <span className="text-[11px] text-gray-400 tabular-nums">#{o.ref_no}</span>}</span>
                      <span className="badge badge-gray text-[10px]">{OFFER_STATUS[o.status] || o.status}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1.5 tabular-nums flex gap-3 flex-wrap">
                      <span className="font-bold" style={{ color: '#0B2438' }}>{sar(o.total_price)}</span>
                      {o.vat_status && <span>الضريبة: {o.vat_status}</span>}
                      <span>{dtt(o.created_at)}</span>
                      {o.submitted_by && o.submitted_by !== id && <span>قدّمه عضو فريق</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : <Empty text="لا توجد عروض." />)}

            {tab === 'deals' && (arr(v.deals).length ? (
              <div className="space-y-3">
                {arr(v.deals).map((d: any) => (
                  <Link key={d.offer_id} href={`/contractor/orders/${d.offer_id}`} className={`${card} !p-4 block hover:shadow-md transition-shadow ${d.dispute_status === 'open' ? '!border-red-200' : ''}`}>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: '#0B2438' }}>{d.product_name || '—'} {d.ref_no && <span className="text-[11px] text-gray-400 tabular-nums">#{d.ref_no}</span>}</span>
                      <span className="font-bold text-sm tabular-nums" style={{ color: '#0B2438' }}>{sar(d.value)}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex gap-3 flex-wrap">
                      <span>{d.side === 'supplier' ? 'بائع' : 'مشترٍ'} · الطرف الآخر: {d.other_party || '—'}</span>
                      {d.invoice_number && <span className="tabular-nums">فاتورة {d.invoice_number}</span>}
                      {d.payment_status && <span>الدفع: {d.payment_status}</span>}
                    </div>
                    {d.dispute_status && (
                      <div className={`mt-2 text-xs rounded-lg px-2.5 py-1.5 ${d.dispute_status === 'open' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                        نزاع ({d.dispute_status === 'open' ? 'مفتوح' : d.dispute_status}){d.dispute_reason ? `: ${d.dispute_reason}` : ''}
                      </div>
                    )}
                    <DealSteps d={d} />
                  </Link>
                ))}
              </div>
            ) : <Empty text="لا توجد صفقات." />)}

            {tab === 'conversations' && (arr(v.conversations).length ? (
              <div className="space-y-2">
                {arr(v.conversations).map((c: any) => {
                  const msgs = arr(c.messages)
                  const isOpen = openConv === c.id
                  return (
                    <div key={c.id} className={`${card} !p-0 overflow-hidden`}>
                      <button type="button" onClick={() => setOpenConv(isOpen ? null : c.id)} aria-expanded={isOpen}
                        className="w-full flex items-center justify-between gap-2 p-4 text-right hover:bg-gray-50">
                        <span className="font-bold text-sm" style={{ color: '#0B2438' }}><Glyph e="💬" /> {c.other_party || '—'}</span>
                        <span className="text-[11px] text-gray-500 tabular-nums">{fmt(msgs.length)} رسالة · {ago(c.last_message_at)}</span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 bg-[#f7f8fa] p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                          {c.rfq_id && <Link href={`/contractor/rfq/${c.rfq_id}`} className="text-[11px] hover:underline" style={{ color: '#8F6820' }}>الطلب المرتبط بالمحادثة</Link>}
                          {msgs.length ? msgs.map((m: any, i: number) => (
                            <div key={i} className={`flex ${m.mine ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'text-white' : 'bg-white border border-gray-200 text-gray-800'}`} style={m.mine ? { background: '#0B2438' } : {}}>
                                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                                <div className={`text-[10px] mt-1 tabular-nums ${m.mine ? 'text-blue-100/70' : 'text-gray-400'}`}>
                                  {m.mine ? 'صاحب الحساب' : c.other_party} · {dtt(m.created_at)}{m.read_at ? ' · مقروءة' : ' · غير مقروءة'}
                                </div>
                              </div>
                            </div>
                          )) : <p className="text-xs text-gray-400 text-center">لا توجد رسائل.</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : <Empty text="لا توجد محادثات." />)}

            {tab === 'notifications' && (arr(v.notifications).length ? (
              <ul className={`${card} !p-0 divide-y divide-gray-50`}>
                {arr(v.notifications).map((n: any, i: number) => (
                  <li key={i} className={`p-3 text-sm ${n.is_read ? '' : 'bg-amber-50/40'}`}>
                    <div className="flex justify-between gap-2"><b style={{ color: '#0B2438' }}>{n.title || n.type}</b><span className="text-[11px] text-gray-400 shrink-0">{dtt(n.created_at)}</span></div>
                    {n.body && <p className="text-gray-600 text-xs mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5"><span dir="ltr">{n.type}</span> · {n.is_read ? 'مقروء' : 'غير مقروء'}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty text="لا توجد إشعارات." />)}

            {tab === 'errors' && (arr(v.errors).length ? (
              <ul className="space-y-2">
                {arr(v.errors).map((e: any, i: number) => (
                  <li key={i} className={`${card} !p-3 text-xs`}>
                    <div className="flex justify-between gap-2"><b dir="ltr" className="text-gray-700">{e.context || '—'}</b><span className="text-gray-400 shrink-0">{dtt(e.created_at)}</span></div>
                    <p dir="ltr" className="text-gray-600 mt-1 break-words text-left">{e.message}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty text="لا توجد أخطاء مسجَّلة لهذا الحساب." />)}

            {tab === 'history' && (arr(v.admin_history).length ? (
              <ul className={`${card} !p-0 divide-y divide-gray-50`}>
                {arr(v.admin_history).map((h: any, i: number) => (
                  <li key={i} className="p-3 text-sm">
                    <div className="flex justify-between gap-2"><b dir="ltr" style={{ color: '#0B2438' }}>{h.action}</b><span className="text-[11px] text-gray-400 shrink-0">{dtt(h.created_at)}</span></div>
                    <p className="text-[11px] text-gray-500 mt-0.5">بواسطة: {h.actor || '—'}</p>
                    {h.detail && <pre dir="ltr" className="text-[11px] text-gray-600 mt-1 bg-gray-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words">{typeof h.detail === 'string' ? h.detail : JSON.stringify(h.detail, null, 1)}</pre>}
                  </li>
                ))}
              </ul>
            ) : <Empty text="لا يوجد سجل إداري." />)}
          </>
        )}
      </div>
    </AppShell>
  )
}
