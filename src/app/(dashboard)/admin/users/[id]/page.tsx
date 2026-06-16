// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/shared/Logo'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import SupportThread from '@/components/shared/SupportThread'
import PageLoader from '@/components/shared/PageLoader'
import { APPROVAL_LABELS } from '@/lib/supplierScore'

const TIER_LABEL = { manufacturer: '🏭 مصنع / مورد رئيسي', commercial: '🏪 مورد تجاري', local: '🏬 مورد محلي' }
const RFQ_STATUS = { open: '🟢 مفتوح', closed: '🔒 مغلق', awarded: '🏆 تمت الترسية', cancelled: '✕ ملغي', expired: '⏳ منتهي' }
const OFFER_STATUS = { pending: '⏳ بانتظار', submitted: '📨 مُقدّم', accepted: '✓ مقبول', rejected: '✕ مرفوض', withdrawn: '↩ مسحوب' }

export default function AdminUserDetail() {
  const params = useParams()
  const id = params?.id as string

  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [p, setP] = useState<any>(null)
  const [authInfo, setAuthInfo] = useState<any>(null) // { email, phone, last_sign_in_at, ... }
  const [rfqs, setRfqs] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<any[]>([])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/'; return }
      setOk(true)
      await loadAll(supabase)
      setLoading(false)
    })()
  }, [id])

  async function loadAll(supabase?: any) {
    const c = supabase || createClient()
    const { data: prof } = await c.from('profiles').select('*').eq('id', id).single()
    setP(prof)
    // email/auth info via privileged function
    try {
      const { data: ed } = await c.functions.invoke('admin', { body: { action: 'list_emails' } })
      if (ed?.emails?.[id]) setAuthInfo(ed.emails[id])
    } catch {}
    // activity
    if (prof?.role === 'contractor') {
      const [{ data: rf }, { data: pr }] = await Promise.all([
        c.from('rfqs').select('*').eq('contractor_id', id).order('created_at', { ascending: false }),
        c.from('project_rfqs').select('*').eq('contractor_id', id).order('created_at', { ascending: false }),
      ])
      setRfqs(rf || []); setProjects(pr || [])
    } else if (prof?.role === 'supplier') {
      const { data: of } = await c.from('offers').select('*, rfqs(product_name, sector, region)').eq('supplier_id', id).order('created_at', { ascending: false })
      setMyOffers(of || [])
    }
  }

  async function setStatus(status: 'verified' | 'rejected', reason?: string) {
    setBusy(status)
    const c = createClient()
    const upd: any = { verification_status: status }
    if (reason) upd.rejection_reason = reason
    await c.from('profiles').update(upd).eq('id', id)
    setMsg(status === 'verified' ? '✓ تم التوثيق' : '✓ تم الرفض')
    setRejecting(false); setRejectReason('')
    await loadAll(); setBusy(''); clearMsg()
  }
  async function setField(field: string, value: any) {
    setBusy(field)
    const c = createClient()
    await c.from('profiles').update({ [field]: value }).eq('id', id)
    setMsg('✓ تم الحفظ')
    await loadAll(); setBusy(''); clearMsg()
  }
  async function toggleActive() {
    await setField('is_active', !(p?.is_active !== false))
  }
  async function changePassword() {
    setPwMsg('')
    if ((pw || '').length < 8) { setPwMsg('8 أحرف على الأقل'); return }
    if (pw !== pwConfirm) { setPwMsg('غير متطابقتين'); return }
    setBusy('pw')
    try {
      const c = createClient()
      const { data, error } = await c.functions.invoke('admin', { body: { action: 'set_password', userId: id, newPassword: pw } })
      if (data?.ok) { setMsg('✓ تم تغيير كلمة المرور'); setShowPw(false); setPw(''); setPwConfirm(''); clearMsg() }
      else setPwMsg('تعذّر: ' + (data?.error || error?.message || 'حاول مجدداً'))
    } catch (e: any) { setPwMsg('خطأ: ' + (e?.message || '')) }
    setBusy('')
  }
  function clearMsg() { setTimeout(() => setMsg(''), 3500) }

  async function openDoc(val: string, bucket = 'verification') {
    if (!val) return
    if (val.startsWith('http')) { window.open(val, '_blank'); return }
    const c = createClient()
    const { data } = await c.storage.from(bucket).createSignedUrl(val, 3600)
    window.open(data?.signedUrl || val, '_blank')
  }

  const dt = (d: any) => d ? new Date(d).toLocaleDateString('ar-SA') : '—'
  const dtt = (d: any) => d ? new Date(d).toLocaleString('ar-SA') : '—'
  const sar = (n: any) => (n || n === 0) ? Number(n).toLocaleString('en-US') + ' ر.س' : '—'

  if (loading || !ok) return <PageLoader />
  if (!p) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]" dir="rtl">
      <div className="text-center"><div className="text-5xl mb-3">🔍</div><div className="font-bold" style={{ color: '#1B2D5B' }}>الحساب غير موجود</div><Link href="/admin" className="text-sm text-[#d96f15] hover:underline mt-2 inline-block">← رجوع للوحة</Link></div>
    </div>
  )

  const Field = ({ label, children }: any) => (
    <div className="py-1.5 border-b border-gray-50 last:border-0">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className="text-sm text-gray-800 break-words">{children ?? '—'}</div>
    </div>
  )
  const Section = ({ title, icon, children }: any) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5" style={{ color: '#1B2D5B' }}>{icon} {title}</h3>
      <div>{children}</div>
    </div>
  )

  const isVerified = p.verification_status === 'verified'
  const active = p.is_active !== false

  return (
    <AppShell title="تفاصيل المستخدم" nav={getNav('admin', 'ar', '/admin')} dir="rtl">
      <div className="max-w-5xl mx-auto">
        {msg && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3">{msg}</div>}

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                style={{ background: p.role === 'contractor' ? '#1B2D5B' : '#7c3aed' }}>{p.company_name_ar?.[0] || '?'}</div>
              <div>
                <div className="text-xl font-bold" style={{ color: '#1B2D5B' }}>{p.company_name_ar || '—'}</div>
                {p.company_name_en && <div className="text-sm text-gray-400">{p.company_name_en}</div>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`badge text-[10px] ${p.role === 'contractor' ? 'badge-navy' : 'badge-gray'}`}>{p.role === 'contractor' ? '👷 مقاول' : p.role === 'supplier' ? '🏪 مورد' : p.role}</span>
                  <span className={`badge text-[10px] ${isVerified ? 'badge-green' : p.verification_status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                    {isVerified ? '✓ موثق' : p.verification_status === 'rejected' ? '✕ مرفوض' : '⏳ قيد المراجعة'}
                  </span>
                  {!active && <span className="badge text-[10px] bg-red-100 text-red-700">⛔ موقوف</span>}
                  {p.cr_verification_source === 'wathq' && <span className="badge text-[10px] text-white" style={{ background: '#0F6E56' }}>🛡 واثق</span>}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isVerified && <button onClick={() => setStatus('verified')} disabled={busy === 'verified'} className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: '#0F6E56' }}>{busy === 'verified' ? '...' : '✓ موافقة'}</button>}
              {p.verification_status !== 'rejected' && <button onClick={() => setRejecting(!rejecting)} className="text-xs px-4 py-2 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600">✕ رفض</button>}
              <button onClick={() => setShowPw(!showPw)} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">🔑 كلمة المرور</button>
              <button onClick={toggleActive} disabled={busy === 'is_active'} className={`text-xs px-3 py-2 rounded-xl border disabled:opacity-50 ${active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                {active ? '⛔ إيقاف الحساب' : '✓ تفعيل الحساب'}
              </button>
            </div>
          </div>

          {/* Reject reason */}
          {rejecting && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
              <label className="block text-xs font-bold text-red-700 mb-1.5">سبب الرفض (يُرسل للمستخدم)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input-field" rows={2} placeholder="اكتب السبب..." />
              <button onClick={() => setStatus('rejected', rejectReason)} disabled={!rejectReason || busy === 'rejected'} className="mt-2 text-xs px-4 py-2 rounded-xl font-semibold text-white bg-red-500 disabled:opacity-50">تأكيد الرفض</button>
            </div>
          )}

          {/* Password */}
          {showPw && (
            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-xs text-amber-700 mb-2">⚠️ تعيين كلمة مرور جديدة لهذا الحساب — أبلغ صاحبه بها.</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" value={pw} onChange={e => setPw(e.target.value)} className="input-field font-mono" placeholder="كلمة المرور الجديدة" dir="ltr" />
                <input type="text" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} className="input-field font-mono" placeholder="تأكيد" dir="ltr" />
              </div>
              {pwMsg && <div className="text-xs text-red-600 mt-2">{pwMsg}</div>}
              <button onClick={changePassword} disabled={busy === 'pw'} className="mt-2 text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: '#1B2D5B' }}>{busy === 'pw' ? '...' : 'تعيين'}</button>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section title="الهوية والسجل التجاري" icon="🏛">
            <Field label="الاسم (عربي)">{p.company_name_ar}</Field>
            <Field label="الاسم (إنجليزي)">{p.company_name_en}</Field>
            <Field label="رقم السجل التجاري">{p.commercial_registration}</Field>
            <Field label="الاسم الرسمي (واثق)">{p.cr_official_name}</Field>
            <Field label="النشاط (واثق)">{p.cr_activity}</Field>
            <Field label="حالة السجل">{p.cr_status}</Field>
            <Field label="إصدار / انتهاء السجل">{dt(p.cr_issue_date)} — {dt(p.cr_expiry_date)}</Field>
            <Field label="الرقم الضريبي">{p.vat_number}</Field>
          </Section>

          <Section title="التواصل والحساب" icon="✉️">
            <Field label="البريد الإلكتروني">{authInfo?.email ? <span dir="ltr">{authInfo.email}{authInfo.email_confirmed ? ' ✓' : ' (غير مؤكد)'}</span> : '—'}</Field>
            <Field label="رقم الجوال">{p.phone}</Field>
            <Field label="آخر دخول">{dtt(authInfo?.last_sign_in_at)}</Field>
            <Field label="تاريخ التسجيل">{dtt(p.created_at)}</Field>
            <Field label="آخر تحديث">{dtt(p.updated_at)}</Field>
            <Field label="معرّف الحساب (ID)"><span className="font-mono text-[11px]" dir="ltr">{p.id}</span></Field>
          </Section>

          <Section title="الموقع والعنوان الوطني" icon="📍">
            <Field label="المنطقة / المدينة">{[p.region, p.city].filter(Boolean).join(' / ') || '—'}</Field>
            <Field label="الحي">{p.district}</Field>
            <Field label="الشارع / رقم المبنى">{[p.street_name, p.building_number].filter(Boolean).join(' — ') || '—'}</Field>
            <Field label="الرمز البريدي / الرقم الإضافي">{[p.postal_code, p.additional_number].filter(Boolean).join(' — ') || '—'}</Field>
            <Field label="العنوان الوطني المختصر"><span className="font-mono" dir="ltr">{p.national_short_address || '—'}</span></Field>
            {p.latitude && p.longitude && (
              <Field label="الإحداثيات"><a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer" className="text-[#d96f15] hover:underline">🗺 فتح على الخريطة</a></Field>
            )}
          </Section>

          <Section title="التصنيف" icon="🏷">
            <Field label="نوع الحساب">{p.role === 'contractor' ? 'مقاول' : 'مورد'}</Field>
            {p.role === 'supplier' && (
              <div className="py-1.5 border-b border-gray-50">
                <div className="text-[11px] text-gray-400 mb-1">فئة المورد</div>
                <select value={p.supplier_tier || 'local'} onChange={e => setField('supplier_tier', e.target.value)} className="text-xs border border-purple-200 text-purple-700 bg-purple-50 rounded-lg px-2 py-1.5">
                  <option value="manufacturer">🏭 مصنع / رئيسي</option><option value="commercial">🏪 تجاري</option><option value="local">🏬 محلي</option>
                </select>
              </div>
            )}
            {p.role === 'contractor' && (
              <div className="py-1.5 border-b border-gray-50">
                <div className="text-[11px] text-gray-400 mb-1">درجة المقاول</div>
                <select value={p.contractor_grade || ''} onChange={e => setField('contractor_grade', e.target.value || null)} className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-2 py-1.5">
                  <option value="">-- الدرجة --</option><option value="A">أ — فوق 100M</option><option value="B">ب — 30–100M</option><option value="C">ج — 5–30M</option><option value="D">د — أقل من 5M</option>
                </select>
              </div>
            )}
            {p.role === 'supplier' && (
              <div className="py-1.5 border-b border-gray-50">
                <div className="text-[11px] text-gray-400 mb-1.5">🏅 اعتمادات المورد (تظهر للمقاولين كدليل ثقة)</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(APPROVAL_LABELS).map(([key, label]) => {
                    const on = Array.isArray(p.approvals) && p.approvals.includes(key)
                    return (
                      <button key={key} type="button" disabled={busy === 'approvals'}
                        onClick={() => {
                          const cur = Array.isArray(p.approvals) ? p.approvals : []
                          const next = on ? cur.filter((x: string) => x !== key) : [...cur, key]
                          setField('approvals', next)
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all ${on ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}
                        style={on ? { background: '#0F6E56' } : {}}>
                        {on ? '✓ ' : '+ '}{label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {p.role === 'supplier' && <Field label="الحد الأدنى للطلب">{p.min_order_value > 0 ? sar(p.min_order_value) : 'بدون'}</Field>}
            {p.role === 'supplier' && p.auto_classification && (
              <Field label="فحص التصنيف الآلي">
                <span className={p.auto_classification === 'match' ? 'text-emerald-600' : p.auto_classification === 'mismatch' ? 'text-red-600' : 'text-amber-600'}>
                  {p.auto_classification === 'match' ? '🤖 مطابق' : p.auto_classification === 'mismatch' ? '🤖 مشكوك' : '🤖 يحتاج مراجعة'}
                  {p.auto_classification_confidence ? ` (${p.auto_classification_confidence}%)` : ''}{p.auto_classification_source === 'ai' ? ' — ذكاء' : ''}
                </span>
                {p.auto_classification_note && <div className="text-[11px] text-gray-500 mt-0.5">{p.auto_classification_note}</div>}
              </Field>
            )}
          </Section>

          <Section title="التوثيق والمستندات" icon="📄">
            <Field label="حالة التحقق">{isVerified ? 'موثق' : p.verification_status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</Field>
            {p.rejection_reason && <Field label="سبب الرفض"><span className="text-red-600">{p.rejection_reason}</span></Field>}
            <Field label="مصدر التحقق">{p.cr_verification_source || '—'}{p.cr_verified_at ? ` (${dt(p.cr_verified_at)})` : ''}</Field>
            <div className="flex gap-2 mt-2 flex-wrap">
              {p.license_url && <button onClick={() => openDoc(p.license_url)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-[#d96f15] hover:bg-[#F5831F]/5">📄 الرخصة</button>}
              {p.cr_url && <button onClick={() => openDoc(p.cr_url)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-[#d96f15] hover:bg-[#F5831F]/5">📋 السجل</button>}
              {!p.license_url && !p.cr_url && <span className="text-xs text-gray-400">لا توجد مستندات مرفوعة</span>}
            </div>
          </Section>

          <Section title="الاشتراك والتقييم" icon="⭐">
            <Field label="الباقة">{p.subscription_plan || 'free'}{p.subscription_expires_at ? ` · حتى ${dt(p.subscription_expires_at)}` : ''}</Field>
            <Field label="التقييم">{p.rating_count > 0 ? `${Number(p.rating_avg).toFixed(1)} من 5 (${p.rating_count} تقييم)` : 'لا توجد تقييمات'}</Field>
            <Field label="حالة النشاط">{active ? '🟢 نشط' : '🔴 موقوف'}</Field>
          </Section>
        </div>

        {/* Activity */}
        <div className="mt-5">
          {p.role === 'contractor' ? (
            <Section title={`النشاط — طلبات التسعير (${rfqs.length}) والمشاريع (${projects.length})`} icon="📋">
              {rfqs.length === 0 && projects.length === 0 ? <div className="text-sm text-gray-400 py-2">لا يوجد نشاط بعد</div> : (
                <div className="space-y-2">
                  {rfqs.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs bg-[#f4f6f9] rounded-lg p-2.5 flex-wrap">
                      <span className="font-semibold" style={{ color: '#1B2D5B' }}>{r.product_name}</span>
                      <span className="text-gray-500">{r.quantity} {r.unit}</span>
                      <span className="badge text-[10px] badge-gray">{RFQ_STATUS[r.status] || r.status}</span>
                      <span className="text-orange-600">{r.offer_count || 0} عرض</span>
                      <span className="text-gray-400">{dt(r.created_at)}</span>
                    </div>
                  ))}
                  {projects.map(pr => (
                    <div key={pr.id} className="flex items-center justify-between gap-2 text-xs bg-[#F5831F]/5 rounded-lg p-2.5 flex-wrap">
                      <span className="font-semibold" style={{ color: '#1B2D5B' }}>🏗 {pr.title}</span>
                      <span className="badge text-[10px] badge-gray">{RFQ_STATUS[pr.status] || pr.status}</span>
                      <span className="text-gray-400">{dt(pr.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          ) : p.role === 'supplier' ? (
            <Section title={`النشاط — العروض المقدّمة (${myOffers.length})`} icon="📨">
              {myOffers.length === 0 ? <div className="text-sm text-gray-400 py-2">لا توجد عروض بعد</div> : (
                <div className="space-y-2">
                  {myOffers.map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-2 text-xs bg-[#f4f6f9] rounded-lg p-2.5 flex-wrap">
                      <span className="font-semibold" style={{ color: '#1B2D5B' }}>{o.rfqs?.product_name || 'طلب'}</span>
                      <span className="text-emerald-700 font-bold">{sar(o.total_price)}</span>
                      {o.delivery_days != null && <span className="text-gray-500">⏱ {o.delivery_days} يوم</span>}
                      <span className="badge text-[10px] badge-gray">{OFFER_STATUS[o.status] || o.status}</span>
                      <span className="text-gray-400">{dt(o.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          ) : null}
        </div>

        {/* Support / internal messaging with this user */}
        <div className="mt-5">
          <Section title="الرسائل / الدعم" icon="💬">
            <SupportThread userId={id} viewerRole="admin" />
          </Section>
        </div>
      </div>
    </AppShell>
  )
}
