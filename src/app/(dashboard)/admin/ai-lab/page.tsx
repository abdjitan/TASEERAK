'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'
import Glyph from '@/components/shared/Glyph'
import { runGolden, type GoldenResult } from '@/lib/ai/golden'

// «مختبر الذكاء الاصطناعي»: the owner tests the AI readers on real files after a deploy. Every
// test goes through the SAME routes the app uses (photo → /api/quick-request/identify, order text →
// /api/quick-request/parse, BOQ → /api/parse-boq, spec file → /api/match-spec, offer vs spec →
// /api/match-spec/offer) with the «x-ai-lab» header, so an admin also sees the AI calls made, the
// provider and the time. The rule-based golden cases run here in the browser, at no cost.

type Tab = 'photo' | 'text' | 'boq' | 'offer' | 'golden'
const LAB_HEADERS = { 'x-ai-lab': '1' }

const pct = (v: any) => (typeof v === 'number' ? `${Math.round(v * 100)}٪` : '—')
const CONF_AR: Record<string, string> = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }
const FLAG_AR: Record<string, string> = {
  not_in_catalog: 'ليست في القائمة', quantity_missing: 'بلا كمية', quantity_implied: 'كمية ضمنية', unit_default: 'وحدة افتراضية', unit_missing: 'بلا وحدة',
  qty_missing: 'بلا كمية', qty_rate_amount_mismatch: 'الكمية × السعر ≠ الإجمالي', qty_from_amount: 'كمية من الإجمالي ÷ السعر', unit_unrecognized: 'وحدة غير معروفة',
  unit_guessed: 'وحدة من الوصف', from_scan: 'من ملف ممسوح', sector_guessed: 'قطاع تخميني', merged: 'بند مكرر مجموع', no_specialty: 'بلا تخصص', ai_low_confidence: 'ثقة الذكاء منخفضة', unit_from_ai: 'وحدة من الذكاء',
}

function Timing({ clientMs, lab }: { clientMs: number | null; lab: any }) {
  if (clientMs == null) return null
  const calls: any[] = lab?.calls || []
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs space-y-1">
      <div className="font-bold text-[#0B2438]"><Glyph e="⏱" /> الزمن: {clientMs} مللي ثانية في المتصفح{lab?.ms != null ? ` · ${lab.ms} على الخادم` : ''} · استدعاءات الذكاء: {calls.length}{lab?.cached ? ' (من الذاكرة المؤقتة)' : ''}</div>
      {calls.length > 0 && (
        <table className="w-full text-[11px]"><tbody>
          {calls.map((c, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-0.5">{c.kind}</td><td>{c.provider}</td><td>{c.ms} مللي ثانية</td>
              <td className={c.ok ? 'text-emerald-700' : 'text-red-600'}>{c.ok ? 'نجح' : 'فشل'}</td><td className="text-gray-500 truncate max-w-[240px]" dir="ltr">{c.note || ''}</td>
            </tr>
          ))}
        </tbody></table>
      )}
      {lab && Object.entries(lab).filter(([k]) => !['ms', 'calls', 'raw', 'cached'].includes(k)).length > 0 && (
        <div className="text-gray-500">{Object.entries(lab).filter(([k]) => !['ms', 'calls', 'raw', 'cached'].includes(k)).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}</div>
      )}
    </div>
  )
}

function Raw({ data }: { data: any }) {
  if (!data) return null
  return (
    <details className="rounded-xl border border-gray-100 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-gray-600">الاستجابة الكاملة (JSON)</summary>
      <pre className="text-[11px] leading-relaxed p-3 overflow-auto max-h-[420px] bg-gray-50" dir="ltr">{JSON.stringify(data, null, 2)}</pre>
    </details>
  )
}

const Flags = ({ flags }: { flags?: string[] }) => (
  <span className="flex flex-wrap gap-1">{(flags || []).map(f => <span key={f} className="badge text-[10px] bg-[#D4A543]/15 text-[#8F6820]">{FLAG_AR[f] || f}</span>)}</span>
)
const Specs = ({ specs }: { specs?: Record<string, string> }) => (
  <span className="text-[11px] text-gray-600">{specs && Object.keys(specs).length ? Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join('، ') : '—'}</span>
)

export default function AdminAiLabPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('photo')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ms, setMs] = useState<number | null>(null)
  const [res, setRes] = useState<any>(null)
  const [spec, setSpec] = useState<any>(null)
  const [specMs, setSpecMs] = useState<number | null>(null)
  // inputs
  const [photos, setPhotos] = useState<File[]>([])
  const [text, setText] = useState('كيس اسمنت ٥٠ عدد\nطن حديد ١٢ ملم سابك\nبلك ٢٠ ٥٠٠ حبة\n٢ نقلة رمل\nدينمو ماء حصان ونص')
  const [boq, setBoq] = useState<File | null>(null)
  const [specFile, setSpecFile] = useState<File | null>(null)
  const [required, setRequired] = useState('Ready mixed concrete C35/45 to ASTM C94, sulphate resisting cement (SRC)')
  const [offered, setOffered] = useState('خرسانة جاهزة C30 أسمنت عادي OPC')
  const [golden, setGolden] = useState<GoldenResult[] | null>(null)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/'; return }
      setLoading(false)
    })()
  }, [])

  function reset(t: Tab) { setTab(t); setRes(null); setSpec(null); setErr(''); setMs(null); setSpecMs(null) }

  async function call(url: string, init: RequestInit): Promise<{ data: any; ms: number }> {
    const t0 = performance.now()
    const r = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...LAB_HEADERS } })
    const data = await r.json().catch(() => ({ error: 'استجابة غير صالحة' }))
    const took = Math.round(performance.now() - t0)
    if (!r.ok) throw Object.assign(new Error(data?.error || data?.message || `HTTP ${r.status}`), { data, took })
    return { data, ms: took }
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr('')
    try { await fn() } catch (e: any) { setErr(e?.message || 'تعذّر التنفيذ'); if (e?.data) setRes(e.data); if (e?.took) setMs(e.took) } finally { setBusy(false) }
  }

  const runPhoto = () => run(async () => {
    if (!photos.length) throw new Error('اختر صورة أولاً')
    const fd = new FormData()
    for (const p of photos.slice(0, 3)) fd.append('image', p)
    fd.append('locale', 'ar')
    const { data, ms } = await call('/api/quick-request/identify', { method: 'POST', body: fd })
    setRes(data); setMs(ms)
  })
  const runText = () => run(async () => {
    const { data, ms } = await call('/api/quick-request/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
    setRes(data); setMs(ms)
  })
  const runBoq = () => run(async () => {
    if (!boq) throw new Error('اختر ملف جدول الكميات أولاً')
    const fd = new FormData(); fd.append('file', boq)
    const { data, ms } = await call('/api/parse-boq', { method: 'POST', body: fd })
    setRes(data); setMs(ms); setSpec(null)
    if (specFile && data?.items?.length) {
      const sd = new FormData()
      sd.append('file', specFile)
      sd.append('items', JSON.stringify(data.items.slice(0, 120).map((it: any, i: number) => ({ ref: `i${i}`, code: it.ref || '', product_name: it.product_name, specification: it.description || it.specification || '', sector: it.sector }))))
      try {
        const s = await call('/api/match-spec', { method: 'POST', body: sd })
        setSpec(s.data); setSpecMs(s.ms)
      } catch (e: any) { setSpec(e?.data || { ok: false, message: e?.message }); setSpecMs(e?.took ?? null) }
    }
  })
  const runOffer = () => run(async () => {
    const { data, ms } = await call('/api/match-spec/offer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [{ required, offered }] }) })
    setRes(data); setMs(ms)
  })

  const goldenSummary = useMemo(() => golden ? { pass: golden.filter(g => g.ok).length, all: golden.length } : null, [golden])

  if (loading) return <PageLoader />

  const TabBtn = ({ k, icon, label }: { k: Tab; icon: string; label: string }) => (
    <button type="button" onClick={() => reset(k)} className={`min-h-10 px-3 rounded-xl text-sm font-bold border ${tab === k ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-[#0B2438] border-gray-200 hover:bg-gray-50'}`}>
      <Glyph e={icon} /> {label}
    </button>
  )
  const RunBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button type="button" onClick={onClick} disabled={busy} className="min-h-10 px-5 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-50" style={{ background: '#D4A543' }}>
      {busy ? 'جارٍ التنفيذ…' : label}
    </button>
  )

  return (
    <AppShell title="مختبر الذكاء الاصطناعي" nav={getNav('admin', 'ar', '/admin/ai-lab')} dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
          <h1 className="text-lg font-bold text-[#0B2438]">مختبر الذكاء الاصطناعي</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            جرّب قراءة الصور ونصوص الطلبات وجداول الكميات والمواصفات على ملفات حقيقية. كل تجربة تمرّ بنفس المسارات التي يستخدمها التطبيق، وتُحتسب ضمن حدود الاستخدام نفسها، وتظهر هنا عدد استدعاءات الذكاء الاصطناعي ومزوّدها وزمنها.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <TabBtn k="photo" icon="📷" label="صورة مادة" />
            <TabBtn k="text" icon="📝" label="نص طلب" />
            <TabBtn k="boq" icon="📊" label="جدول كميات ومواصفات" />
            <TabBtn k="offer" icon="⚖" label="عرض مقابل مواصفة" />
            <TabBtn k="golden" icon="✅" label="الاختبارات الثابتة" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          {tab === 'photo' && (
            <>
              <label className="block text-sm font-bold text-[#0B2438]">صورة واحدة أو حتى ٣ صور لنفس المادة (المادة كاملة + الملصق)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setPhotos(Array.from(e.target.files || []).slice(0, 3))} className="block text-sm" />
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {photos.map((p, i) => <img key={i} src={URL.createObjectURL(p)} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-100" />)}
                </div>
              )}
              <RunBtn onClick={runPhoto} label="تعرّف على المادة" />
            </>
          )}
          {tab === 'text' && (
            <>
              <label className="block text-sm font-bold text-[#0B2438]">نص الطلب كما يكتبه المشتري (عربي، إنجليزي، أوردو)</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={7} className="input-field text-sm" dir="auto" />
              <RunBtn onClick={runText} label="اقرأ الطلب" />
            </>
          )}
          {tab === 'boq' && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-bold text-[#0B2438] mb-1">جدول الكميات (Excel أو CSV أو PDF أو صورة)</span>
                  <input type="file" accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp" onChange={e => setBoq(e.target.files?.[0] || null)} className="block text-sm" />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-[#0B2438] mb-1">ملف المواصفات (اختياري: PDF أو Excel أو نص أو صورة)</span>
                  <input type="file" accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp" onChange={e => setSpecFile(e.target.files?.[0] || null)} className="block text-sm" />
                </label>
              </div>
              <RunBtn onClick={runBoq} label={specFile ? 'حلّل الجدول وطابق المواصفات' : 'حلّل الجدول'} />
            </>
          )}
          {tab === 'offer' && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-bold text-[#0B2438] mb-1">المطلوب (من المواصفات أو سطر الطلب)</span>
                  <textarea value={required} onChange={e => setRequired(e.target.value)} rows={4} className="input-field text-sm" dir="auto" />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-[#0B2438] mb-1">المعروض (من عرض المورد)</span>
                  <textarea value={offered} onChange={e => setOffered(e.target.value)} rows={4} className="input-field text-sm" dir="auto" />
                </label>
              </div>
              <RunBtn onClick={runOffer} label="قارن" />
            </>
          )}
          {tab === 'golden' && (
            <>
              <p className="text-sm text-gray-600">حالات معروفة النتيجة لقراءة نص الطلب والوحدات ومقارنة المواصفات بالقواعد (بلا ذكاء اصطناعي وبلا تكلفة). تُشغَّل بعد كل تعديل للتأكد أن شيئاً لم ينكسر.</p>
              <RunBtn onClick={() => setGolden(runGolden())} label="شغّل الاختبارات" />
            </>
          )}
          {err && <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm p-3"><Glyph e="⚠" /> {err}</div>}
        </div>

        {/* ── results ── */}
        {tab !== 'golden' && (res || ms != null) && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <Timing clientMs={ms} lab={res?.lab} />

            {tab === 'photo' && res?.suggestion && (() => {
              const s = res.suggestion
              return (
                <div className="space-y-3 text-sm">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    <div><span className="text-gray-500">المادة: </span><b>{s.product_name}</b> {s.in_catalog ? <span className="badge text-[10px] bg-emerald-50 text-emerald-700">من القائمة</span> : <span className="badge text-[10px] bg-gray-100 text-gray-600">نص حر</span>}</div>
                    <div><span className="text-gray-500">الثقة: </span><b>{CONF_AR[s.confidence] || s.confidence}</b>{res.lab?.model_confidence ? <span className="text-gray-500"> (تقدير النموذج: {CONF_AR[res.lab.model_confidence]})</span> : null}</div>
                    <div><span className="text-gray-500">القطاع: </span>{s.sector}</div>
                    <div><span className="text-gray-500">الوحدة: </span>{s.unit || '—'}{s.quantity_hint ? ` · عدد ظاهر: ${s.quantity_hint}` : ''}</div>
                    <div className="sm:col-span-2"><span className="text-gray-500">النص المقروء من الملصق: </span><span dir="auto">{s.label_text || '—'}</span></div>
                    <div><span className="text-gray-500">الماركة: </span>{s.brand || '—'}</div>
                    <div><span className="text-gray-500">التفاصيل: </span>{s.details || '—'}</div>
                    <div className="sm:col-span-2"><span className="text-gray-500">حقول المواصفات المعبّأة: </span><Specs specs={s.specs} /></div>
                    {s.question && <div className="sm:col-span-2 text-[#8F6820] font-semibold"><Glyph e="❓" /> {s.question}</div>}
                    {s.web && <div className="sm:col-span-2 text-gray-500">استُعين بالبحث في الإنترنت: {(res.sources || []).map((x: any) => x.title).join('، ')}</div>}
                  </div>
                  {Array.isArray(s.candidates) && s.candidates.length > 0 && (
                    <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 text-gray-500"><tr><th className="text-right p-2">مرشحو القائمة</th><th className="text-right p-2">القطاع</th><th className="text-right p-2">الدرجة</th></tr></thead>
                      <tbody>{s.candidates.map((c: any) => <tr key={c.sector + c.name} className="border-t border-gray-100"><td className="p-2">{c.name}</td><td className="p-2">{c.sector}</td><td className="p-2">{pct(c.score)}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
              )
            })()}
            {tab === 'photo' && res && !res.suggestion && !err && <div className="text-sm text-gray-600">لم يتعرّف النموذج على مادة{res.ai === false ? ' (الذكاء الاصطناعي غير مفعّل)' : ''}.</div>}

            {tab === 'text' && Array.isArray(res?.items) && (
              <div className="overflow-x-auto">
                <div className="text-xs text-gray-500 mb-2">{res.items.length} سطر · {res.ai ? 'استُخدم الذكاء الاصطناعي لبعض الأسطر' : 'قُرئ بالقواعد فقط (بلا تكلفة)'}</div>
                <table className="w-full text-xs min-w-[860px]">
                  <thead className="bg-gray-50 text-gray-500"><tr>
                    <th className="text-right p-2">ما كتبه المشتري</th><th className="text-right p-2">المادة</th><th className="text-right p-2">الكمية</th><th className="text-right p-2">الوحدة</th>
                    <th className="text-right p-2">التفاصيل</th><th className="text-right p-2">حقول المواصفات</th><th className="text-right p-2">الثقة</th><th className="text-right p-2">المصدر</th><th className="text-right p-2">ملاحظات</th>
                  </tr></thead>
                  <tbody>{res.items.map((it: any, i: number) => (
                    <tr key={i} className={`border-t border-gray-100 ${it.needs_review ? 'bg-[#D4A543]/5' : ''}`}>
                      <td className="p-2" dir="auto">{it.input_name}</td>
                      <td className="p-2 font-semibold">{it.product_name}{it.in_catalog ? '' : it.suggestion ? <span className="block text-gray-500 font-normal">هل تقصد: {it.suggestion.name}؟</span> : null}</td>
                      <td className="p-2">{it.quantity ?? '—'}</td>
                      <td className="p-2">{it.unit || '—'}{it.unit_is_default ? <span className="text-gray-400"> (افتراضية)</span> : null}</td>
                      <td className="p-2">{it.details || '—'}</td>
                      <td className="p-2"><Specs specs={it.specs} /></td>
                      <td className="p-2">{pct(it.confidence)}</td>
                      <td className="p-2">{it.source === 'ai' ? 'الذكاء' : 'القواعد'}</td>
                      <td className="p-2"><Flags flags={it.flags} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {tab === 'boq' && Array.isArray(res?.items) && (
              <div className="space-y-3">
                <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>البنود: <b>{res.total}</b></span>
                  <span>تحتاج مراجعة: <b>{res.review_count ?? '—'}</b></span>
                  {res.stats && <>
                    <span>صُنّفت بالقواعد: <b>{res.stats.rule_classified}</b></span>
                    <span>أُرسلت للذكاء: <b>{res.stats.ai_asked}</b></span>
                    <span>من الذاكرة المؤقتة: <b>{res.stats.ai_cached}</b></span>
                    <span>صفوف مجموع تُجوهلت: <b>{res.stats.skipped_totals}</b></span>
                    <span>أقسام: <b>{res.stats.sections}</b></span>
                    <span>بنود مكررة جُمعت: <b>{res.stats.merged}</b></span>
                    {res.stats.pages ? <span>صفحات: <b>{res.stats.pages}</b>{res.stats.pages_truncated ? ' (قُرئ جزء منها فقط)' : ''}</span> : null}
                  </>}
                  {res.cached && <span className="text-emerald-700 font-bold">من الذاكرة المؤقتة (بلا تكلفة)</span>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[980px]">
                    <thead className="bg-gray-50 text-gray-500"><tr>
                      <th className="text-right p-2">الرقم</th><th className="text-right p-2">المادة</th><th className="text-right p-2">الكمية</th><th className="text-right p-2">القطاع / التخصص</th>
                      <th className="text-right p-2">المواصفة</th><th className="text-right p-2">القسم</th><th className="text-right p-2">الثقة</th><th className="text-right p-2">ملاحظات</th>
                      {spec?.details && <th className="text-right p-2">المواصفات</th>}
                    </tr></thead>
                    <tbody>{res.items.map((it: any, i: number) => {
                      const d = spec?.details?.[`i${i}`]
                      return (
                        <tr key={i} className={`border-t border-gray-100 align-top ${it.needs_review ? 'bg-[#D4A543]/5' : ''}`}>
                          <td className="p-2" dir="ltr">{it.ref || '—'}</td>
                          <td className="p-2"><b>{it.product_name}</b>{it.in_catalog ? <span className="badge text-[10px] bg-emerald-50 text-emerald-700 ms-1">من القائمة</span> : null}<div className="text-gray-500 line-clamp-2" dir="auto">{it.description}</div></td>
                          <td className="p-2 whitespace-nowrap">{it.quantity ?? '—'} {it.unit}</td>
                          <td className="p-2">{it.sector}<div className="text-gray-500">{it.sub_category || 'بلا تخصص'}</div></td>
                          <td className="p-2"><span dir="auto">{it.specification || '—'}</span><div><Specs specs={it.specs} /></div></td>
                          <td className="p-2 text-gray-500">{it.section || '—'}</td>
                          <td className="p-2">{pct(it.confidence)}</td>
                          <td className="p-2"><Flags flags={it.flags} /></td>
                          {spec?.details && <td className="p-2 min-w-[220px]">
                            {d ? <>
                              <div className="text-gray-500">{d.section || '—'} · {CONF_AR[d.confidence] || d.confidence}{d.quote_verified === false ? ' · الاقتباس غير موجود في النص' : ''}</div>
                              {(d.required_summary || []).length > 0 && <div>{d.required_summary.join('، ')}</div>}
                              {(d.conflicts || []).map((c: string, k: number) => <div key={k} className="text-red-700">{c}</div>)}
                              {(d.missing_in_boq || []).map((c: string, k: number) => <div key={k} className="text-[#8F6820]">{c}</div>)}
                            </> : <span className="text-gray-400">لا مطابقة</span>}
                          </td>}
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
                {spec && (
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-[#0B2438]"><Glyph e="📑" /> مطابقة المواصفات: {spec.ok ? `طوبق ${spec.matched} من ${spec.total} · تعارضات: ${spec.with_conflicts || 0}${spec.truncated ? ' · المواصفات كبيرة واقتُطع جزء منها' : ''}${spec.cached ? ' · من الذاكرة المؤقتة' : ''}` : (spec.message || 'تعذّرت المطابقة')}</div>
                    <Timing clientMs={specMs} lab={spec.lab} />
                    <Raw data={spec} />
                  </div>
                )}
              </div>
            )}

            {tab === 'offer' && Array.isArray(res?.lines) && res.lines.map((l: any) => (
              <div key={l.id} className="space-y-2 text-sm">
                <div className="font-bold">النتيجة: {l.verdict === 'ok' ? 'مطابق' : l.verdict === 'mismatch' ? 'يختلف عن المطلوب' : l.verdict === 'partial' ? 'لا تعارض، لكن تفاصيل غير مذكورة أو تحتاج تحقّقاً' : 'لا توجد متطلبات قابلة للفحص'}</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500"><tr><th className="text-right p-2">البند</th><th className="text-right p-2">المطلوب</th><th className="text-right p-2">المعروض</th><th className="text-right p-2">الحالة</th></tr></thead>
                  <tbody>{l.checks.map((c: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="p-2">{c.label}</td><td className="p-2" dir="auto">{c.required}</td><td className="p-2" dir="auto">{c.offered}</td>
                      <td className={`p-2 font-bold ${c.status === 'ok' ? 'text-emerald-700' : c.status === 'mismatch' ? 'text-red-700' : 'text-[#8F6820]'}`}>{c.status === 'ok' ? 'مطابق' : c.status === 'mismatch' ? 'مخالف' : c.status === 'missing' ? 'غير مذكور' : 'يحتاج تحقّقاً'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ))}

            <Raw data={res} />
          </div>
        )}

        {tab === 'golden' && golden && goldenSummary && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className={`text-sm font-bold ${goldenSummary.pass === goldenSummary.all ? 'text-emerald-700' : 'text-red-700'}`}>نجح {goldenSummary.pass} من {goldenSummary.all}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead className="bg-gray-50 text-gray-500"><tr><th className="text-right p-2">المجموعة</th><th className="text-right p-2">المدخل</th><th className="text-right p-2">النتيجة</th><th className="text-right p-2">المتوقع</th><th className="text-right p-2">الحاصل</th></tr></thead>
                <tbody>{golden.map((g, i) => (
                  <tr key={i} className={`border-t border-gray-100 align-top ${g.ok ? '' : 'bg-red-50'}`}>
                    <td className="p-2">{g.group}</td><td className="p-2" dir="auto">{g.input}</td>
                    <td className={`p-2 font-bold ${g.ok ? 'text-emerald-700' : 'text-red-700'}`}>{g.ok ? 'نجح' : 'فشل'}</td>
                    <td className="p-2 text-gray-500 break-all" dir="auto">{g.expected}</td><td className="p-2 text-gray-500 break-all" dir="auto">{g.got}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
