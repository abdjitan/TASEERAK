// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import { waLink } from '@/lib/wa'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { formatDateTime, formatTimeLeft, deadlineUrgency, urgencyStyle, isExpired } from '@/lib/deadline'

export default function RFQDetailPage() {
  const { id } = useParams()
  const [rfq, setRfq] = useState(null)
  const [offers, setOffers] = useState([])
  const [sortBy, setSortBy] = useState('price_asc') // price_asc | price_desc | delivery | rating
  const [aiCmp, setAiCmp] = useState(null) // نتيجة تحليل العروض بالذكاء الاصطناعي
  const [cmpLoading, setCmpLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [awardSort, setAwardSort] = useState('cheapest') // cheapest | fastest — ترتيب عروض كل مادة
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [tierFilter, setTierFilter] = useState('') // '' | manufacturer | commercial | local
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [marketAvg, setMarketAvg] = useState(null) // متوسط السوق
  const [supplierStats, setSupplierStats] = useState({}) // سجل أداء كل مورد
  const [awards, setAwards] = useState({}) // ترسية بند-بند: item_index → صف الترسية

  async function reloadAwards() {
    const supabase = createClient()
    const { data } = await supabase.from('rfq_item_awards').select('*').eq('rfq_id', id)
    const am: any = {}; (data || []).forEach((a: any) => { am[a.item_index] = a }); setAwards(am)
  }

  async function runCompare() {
    setCmpLoading(true); setAiCmp(null)
    try {
      const res = await fetch('/api/compare-offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rfqId: id }) })
      setAiCmp(await res.json())
    } catch { setAiCmp({ ok: false, message: 'تعذّر التحليل، حاول مرة أخرى' }) }
    finally { setCmpLoading(false) }
  }

  async function deleteRfq() {
    if (!confirm('حذف هذا الطلب نهائياً؟ ستُحذف العروض المرتبطة به أيضاً.')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('delete_rfq', { p_rfq_id: id })
    if (error) { alert(error.message); setDeleting(false); return }
    window.location.href = '/contractor'
  }

  // تمديد مهلة التسعير — نضيف الأيام على الأبعد بين (المهلة الحالية، الآن)
  const [extending, setExtending] = useState(false)
  const [showExtend, setShowExtend] = useState(false)
  async function extendDeadline(days: number) {
    const base = rfq?.expires_at && new Date(rfq.expires_at) > new Date() ? new Date(rfq.expires_at) : new Date()
    const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
    setExtending(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('extend_rfq_deadline', { p_rfq_id: id, p_new_expires: next.toISOString() })
    setExtending(false)
    if (error) { alert(error.message || 'تعذّر تمديد المهلة — حاول مرة ثانية.'); return }
    window.location.reload()
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: rfqData } = await supabase.from('rfqs').select('*').eq('id', id).single()
      setRfq(rfqData)
      setEditNotes(rfqData?.notes || '')
      setEditSpec(rfqData?.specification || '')

      const { data: offersData } = await supabase
        .from('offers').select('*, supplier:profiles(company_name_ar, phone, rating_avg, city, region, supplier_tier, latitude, longitude, national_short_address, district, verification_status, cr_verification_source)')
        .eq('rfq_id', id).order('total_price', { ascending: true })
      setOffers(offersData || [])

      // ترسية بند-بند (إن وُجدت)
      const { data: awardRows } = await supabase.from('rfq_item_awards').select('*').eq('rfq_id', id)
      const am: any = {}; (awardRows || []).forEach((a: any) => { am[a.item_index] = a }); setAwards(am)

      // سجل أداء الموردين (سرعة الرد، نسبة الترسية، عدد العروض السابقة)
      const supplierIds = [...new Set((offersData || []).map(o => o.supplier_id).filter(Boolean))]
      if (supplierIds.length) {
        const { data: stats } = await supabase.rpc('get_supplier_stats', { ids: supplierIds })
        const m: any = {}; (stats || []).forEach((s: any) => { m[s.supplier_id] = s })
        setSupplierStats(m)
      }

      // متوسط السوق من عروض مشابهة
      if (rfqData) {
        const { data: similarOffers } = await supabase
          .from('offers')
          .select('unit_price, rfq:rfqs(product_name, sector)')
          .not('unit_price', 'is', null)
          .not('status', 'eq', 'rejected')
        const similar = (similarOffers || []).filter(o =>
          o.rfq?.product_name === rfqData.product_name
        )
        if (similar.length >= 2) {
          const avg = similar.reduce((s, o) => s + o.unit_price, 0) / similar.length
          setMarketAvg(Math.round(avg))
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function acceptOffer(offerId) {
    const supabase = createClient()
    // Atomic: accept + reject others + close RFQ in one transaction (prevents double-accept).
    const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
    if (error) { alert('تعذّر قبول العرض — قد يكون تم قبوله مسبقاً. حدّث الصفحة وحاول مرة ثانية.'); return }
    window.location.href = `/contractor/orders/${offerId}`
  }

  async function rejectOffer(offerId) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    window.location.reload()
  }

  // ترسية بند-بند: ترسية مادة على مورد مُحدّد (أرخص أو من اختيار المقاول)
  const [awarding, setAwarding] = useState(null)
  async function awardItem(itemIndex, offerId) {
    setAwarding(`${itemIndex}:${offerId}`)
    const supabase = createClient()
    const { error } = await supabase.rpc('award_rfq_item', { p_rfq_id: id, p_item_index: itemIndex, p_offer_id: offerId })
    setAwarding(null)
    if (error) { alert('تعذّرت الترسية — حدّث الصفحة وحاول مجدداً.'); return }
    await reloadAwards()
  }
  async function unawardItem(itemIndex) {
    setAwarding(`${itemIndex}:x`)
    const supabase = createClient()
    await supabase.rpc('unaward_rfq_item', { p_rfq_id: id, p_item_index: itemIndex })
    setAwarding(null)
    await reloadAwards()
  }
  // تأكيد الترسية: قبول الموردين الفائزين + إصدار أوامر الشراء + إغلاق الطلب
  const [finalizing, setFinalizing] = useState(false)
  async function finalizeAwards() {
    if (!confirm('تأكيد الترسية؟ سيتم قبول الموردين الفائزين، إصدار أمر شراء لكل مورد، وإغلاق الطلب.')) return
    setFinalizing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('finalize_rfq_awards', { p_rfq_id: id })
    setFinalizing(false)
    if (error) { alert('تعذّر تأكيد الترسية — حدّث الصفحة وحاول مجدداً.'); return }
    window.location.reload()
  }

  const [showEditWarning, setShowEditWarning] = useState(false)

  function handleEditSave() {
    if (offers.length > 0) {
      setShowEditWarning(true)
    } else {
      doSaveEdit()
    }
  }

  async function doSaveEdit() {
    const supabase = createClient()
    // 1. Update RFQ
    await supabase.from('rfqs').update({
      notes: editNotes,
      specification: editSpec,
      offer_count: 0,
    }).eq('id', id)

    // 2. Delete all existing offers for this RFQ
    if (offers.length > 0) {
      await supabase.from('offers').delete().eq('rfq_id', id)
    }

    setRfq({ ...rfq, notes: editNotes, specification: editSpec, offer_count: 0 })
    setOffers([])
    setEditing(false)
    setShowEditWarning(false)
  }

  async function cancelRfq() {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return
    const supabase = createClient()
    await supabase.from('rfqs').update({ status: 'cancelled' }).eq('id', id)
    window.location.href = '/contractor'
  }

  if (loading) return <PageLoader />
  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">الطلب غير موجود</div></div>

  const acceptedOffer = offers.find(o => o.status === 'accepted')
  // طلب متعدّد المواد → الترسية تتم بند-بند (أفضل مورد لكل مادة)
  const isMulti = Array.isArray(rfq.items) && rfq.items.length > 1
  const activeOffers = offers.filter(o => o.status !== 'rejected')

  // Filtered + sorted offers for display (contractor may receive many).
  const displayedOffers = [...offers]
    .filter(o => !onlyVerified || o.supplier?.verification_status === 'verified')
    .filter(o => !tierFilter || o.supplier?.supplier_tier === tierFilter)
    .sort((a: any, b: any) => {
      if (sortBy === 'price_desc') return (b.total_price || 0) - (a.total_price || 0)
      if (sortBy === 'delivery') return (a.delivery_days || 99999) - (b.delivery_days || 99999)
      if (sortBy === 'rating') return (b.supplier?.rating_avg || 0) - (a.supplier?.rating_avg || 0)
      return (a.total_price || 0) - (b.total_price || 0) // price_asc (default)
    })

  return (
    <AppShell title="تفاصيل طلب التسعير" nav={getNav('contractor', 'ar', '/contractor')} dir="rtl">
      <div className="max-w-3xl mx-auto">

        {/* RFQ Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{rfq.title || rfq.product_name}</h2>
              {rfq.title && <div className="text-xs text-gray-400">{rfq.product_name}</div>}
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-100 text-[#d96f15] text-xs px-2 py-0.5 rounded-full font-semibold">
                  {Array.isArray(rfq.sectors) && rfq.sectors.length > 1
                    ? rfq.sectors.map((s: string) => SECTOR_LABELS[s] || s).join(' + ')
                    : (SECTOR_LABELS[rfq.sector] || rfq.sector)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  rfq.status === 'open' ? 'bg-green-100 text-green-700' :
                  rfq.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  rfq.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {rfq.status === 'open' ? '● مفتوح' : rfq.status === 'closed' ? '● مغلق' : rfq.status === 'cancelled' ? '● ملغي' : '● منتهي'}
                </span>
                {rfq.status === 'open' && rfq.expires_at && (() => {
                  const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                  return (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.fg }}>
                      {isExpired(rfq.expires_at) ? '⏰ انتهت المهلة' : `⏰ ${formatTimeLeft(rfq.expires_at, 'ar')}`}
                    </span>
                  )
                })()}
              </div>
              <div className="text-[11px] text-gray-400 mt-1.5">
                🗓 {formatDateTime(rfq.created_at)}{rfq.expires_at ? ` · ⏰ ${formatDateTime(rfq.expires_at)}` : ''}
              </div>
              {rfq.status === 'open' && (
                <div className="mt-2">
                  {!showExtend ? (
                    <button onClick={() => setShowExtend(true)}
                      className="text-[11px] font-semibold text-[#1B2D5B] border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                      ⏱ تمديد مهلة التسعير
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 flex-wrap bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <span className="text-[11px] text-gray-600 font-semibold">مدّد المهلة:</span>
                      {[1, 3, 7].map(d => (
                        <button key={d} onClick={() => extendDeadline(d)} disabled={extending}
                          className="text-[11px] font-bold text-white px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: '#1B2D5B' }}>
                          {extending ? '…' : `+${d} ${d === 1 ? 'يوم' : 'أيام'}`}
                        </button>
                      ))}
                      <button onClick={() => setShowExtend(false)} className="text-[11px] text-gray-400 px-1">✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {rfq.status === 'open' && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(!editing)}
                  className="text-xs text-[#d96f15] border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-[#F5831F]/5 transition-colors">
                  ✏️ تعديل
                </button>
                <button onClick={cancelRfq}
                  className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  إلغاء
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 bg-[#F5831F]/5 rounded-xl p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">المواصفات</label>
                <input value={editSpec} onChange={e => setEditSpec(e.target.value)} className="input-field" placeholder="المواصفات" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ملاحظات</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="input-field" rows={3} placeholder="ملاحظات" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleEditSave} className="bg-[#1B2D5B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0f1d3d]">حفظ التعديل</button>
                <button onClick={() => { setEditing(false); setShowEditWarning(false) }} className="text-sm text-gray-500">إلغاء</button>
              </div>

              {showEditWarning && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-amber-800 text-sm">تنبيه: سيتم إلغاء جميع العروض الحالية</h4>
                      <p className="text-xs text-amber-700 mt-1">عند تعديل المواصفات أو الملاحظات، سيتم إلغاء العروض القديمة ({offers.length} عرض) وإرسال الطلب مرة أخرى للموردين بالمتطلبات الجديدة لتقديم عروض جديدة.</p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={doSaveEdit}
                          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors">
                          نعم، عدّل وأعد الإرسال
                        </button>
                        <button onClick={() => setShowEditWarning(false)}
                          className="text-xs text-gray-500 px-3 py-2">
                          تراجع
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
            {Array.isArray(rfq.items) && rfq.items.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2 text-[#1B2D5B]">🧾 المواد المطلوبة ({rfq.items.length})</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                      <th className="text-start py-2 px-3 font-bold">#</th>
                      <th className="text-start py-2 px-3 font-bold">المادة</th>
                      <th className="text-start py-2 px-3 font-bold">الكمية</th>
                      <th className="text-start py-2 px-3 font-bold">المواصفات</th>
                    </tr></thead>
                    <tbody>
                      {rfq.items.map((it: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 align-top">
                          <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#1B2D5B]">{it.product_name}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{SECTOR_LABELS[it.sector] || it.sector}</span>
                              {(it.supplier_tiers || []).map((tr: string) => <span key={tr} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{tr === 'manufacturer' ? '🏭' : tr === 'commercial' ? '🏪' : '🏬'}</span>)}
                              {it.in_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">⚡ توفّر فوري</span>}
                              {it.max_days && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">⏱ {it.max_days}ي</span>}
                              {it.spec_file_url && <a href={it.spec_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 hover:underline">📎 ملف</a>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#d96f15] whitespace-nowrap">{it.quantity} {it.unit}</td>
                          <td className="py-2.5 px-3 text-xs text-gray-500">{it.specification || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              {(!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📦 الكمية</span><br/><strong>{rfq.quantity} {rfq.unit}</strong></div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📍 الموقع</span><br/><strong>{rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</strong></div>
              {rfq.specification && (!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">⚙️ المواصفات</span><br/><strong>{rfq.specification}</strong></div>}
              {rfq.notes && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">📝 ملاحظات</span><br/>{rfq.notes}</div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🚚 التوصيل</span><br/><strong>{rfq.delivery_required ? 'مطلوب' : 'غير مطلوب'}</strong></div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🧾 فاتورة ضريبية</span><br/><strong>{rfq.vat_invoice_required ? 'مطلوبة' : 'غير مطلوبة'}</strong></div>
            </div>
            </>
          )}
        </div>

        {/* Accepted Offer → PO Link */}
        {acceptedOffer && (
          <a href={`/contractor/orders/${acceptedOffer.id}`}
            className="block bg-green-50 rounded-2xl p-6 border border-green-200 mb-6 hover:shadow transition-shadow text-center">
            <div className="text-3xl mb-2">📄</div>
            <h3 className="font-bold text-green-800 mb-1">تم قبول عرض من {acceptedOffer.supplier?.company_name_ar}</h3>
            <p className="text-sm text-green-600">السعر: {acceptedOffer.total_price?.toLocaleString('en-US')} ر.س — اضغط لعرض أمر الشراء</p>
          </a>
        )}

        {/* ═══ ترسية بند-بند: أفضل مورد لكل مادة (طلب متعدّد المواد) ═══ */}
        {isMulti && (
          <div className="mb-6">
            <div className="mb-3 flex items-end justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-gray-900">🧱 ترسية بند-بند</h3>
                <p className="text-xs text-gray-400">اختر أفضل مورد لكل مادة — الطلب الواحد يقدر ينقسم على أكثر من مورد.</p>
              </div>
              {activeOffers.length > 0 && (
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 text-xs font-semibold">
                  {[{ k: 'cheapest', l: '💰 الأرخص' }, { k: 'fastest', l: '⚡ الأسرع' }].map(o => (
                    <button key={o.k} type="button" onClick={() => setAwardSort(o.k)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${awardSort === o.k ? 'bg-white shadow-sm text-[#1B2D5B]' : 'text-gray-500'}`}>{o.l}</button>
                  ))}
                </div>
              )}
            </div>
            {activeOffers.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <h4 className="font-bold text-gray-900 mb-1">لم تصل عروض بعد</h4>
                <p className="text-sm text-gray-500">سيتم إخطارك فور وصول أي عرض</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rfq.items.map((it, idx) => {
                  const bids = activeOffers.map(o => {
                    const list = Array.isArray(o.item_prices) ? o.item_prices : []
                    const entry = list.find(ip => ip.product_name === it.product_name && (!it.sub_category || (ip.sub_category || null) === (it.sub_category || null)))
                    return entry ? { offer: o, entry } : null
                  }).filter(Boolean).sort((a, b) => {
                    if (awardSort === 'fastest') {
                      const ad = (a.entry.delivery_days ?? a.offer.delivery_days ?? 99999)
                      const bd = (b.entry.delivery_days ?? b.offer.delivery_days ?? 99999)
                      if (ad !== bd) return ad - bd
                    }
                    return (Number(a.entry.total) || 0) - (Number(b.entry.total) || 0)
                  })
                  const award = awards[idx]
                  return (
                    <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{it.product_name}</span>
                          <span className="text-xs text-gray-400"> · {Number(it.quantity).toLocaleString('en-US')} {it.unit}</span>
                        </div>
                        {award ? <span className="badge badge-green text-[10px] whitespace-nowrap">✓ مُرسى</span> : <span className="text-[11px] text-gray-400 whitespace-nowrap">{bids.length} عرض</span>}
                      </div>
                      {bids.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">لا يوجد مورد سعّر هذه المادة بعد</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {bids.map((b, r) => {
                            const isAwarded = award && award.offer_id === b.offer.id
                            return (
                              <div key={b.offer.id} className={`px-4 py-2.5 flex items-center justify-between gap-2 ${isAwarded ? 'bg-emerald-50' : ''}`}>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {r === 0 && <span title={awardSort === 'fastest' ? 'الأسرع' : 'الأرخص'}>🥇</span>}
                                    <span className="font-semibold text-sm text-gray-800 truncate">{b.offer.supplier?.company_name_ar || 'مورد'}</span>
                                    {b.offer.supplier?.verification_status === 'verified' && <span title="موثّق" style={{ color: '#0F6E56' }}>{b.offer.supplier?.cr_verification_source === 'wathq' ? '🛡' : '✓'}</span>}
                                    {b.offer.supplier?.rating_avg > 0 && <span className="text-[10px] text-gray-400">⭐ {b.offer.supplier.rating_avg}</span>}
                                  </div>
                                  <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    {Number(b.entry.unit_price) > 0 && <span>{Number(b.entry.unit_price).toLocaleString('en-US')} / {b.entry.unit || it.unit}</span>}
                                    {(b.entry.delivery_days ?? b.offer.delivery_days) ? <span>📦 {b.entry.delivery_days ?? b.offer.delivery_days} يوم</span> : null}
                                    {b.offer.supplier?.city && <span>📍 {b.offer.supplier.city}</span>}
                                    {b.entry.specification && <span title={b.entry.specification} className="truncate max-w-[150px]">⚙️ {b.entry.specification}</span>}
                                    {b.entry.attachment_url && <a href={b.entry.attachment_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-purple-500 hover:underline">📎 كتالوج</a>}
                                    <a href={`/contractor/rfq/${id}/offer/${b.offer.id}`} className="font-semibold hover:underline" style={{ color: '#F5831F' }}>تفاصيل ←</a>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{Number(b.entry.total).toLocaleString('en-US')} ر.س</span>
                                  {isAwarded ? (
                                    <span className="badge badge-green text-[10px] whitespace-nowrap">مُرسى ✓</span>
                                  ) : rfq.status === 'open' ? (
                                    <button onClick={() => awardItem(idx, b.offer.id)} disabled={awarding === `${idx}:${b.offer.id}`}
                                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>
                                      {awarding === `${idx}:${b.offer.id}` ? '...' : 'ترسية'}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {award && rfq.status === 'open' && (
                        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                          <button onClick={() => unawardItem(idx)} disabled={awarding === `${idx}:x`} className="text-[11px] text-red-500 hover:underline disabled:opacity-50">✕ إلغاء ترسية هذه المادة</button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* ملخص الترسية حسب المورد */}
                {Object.keys(awards).length > 0 && (() => {
                  const bySupplier = {}
                  Object.values(awards).forEach((a: any) => {
                    if (!bySupplier[a.supplier_id]) {
                      const off = offers.find(o => o.id === a.offer_id)
                      bySupplier[a.supplier_id] = { name: off?.supplier?.company_name_ar || 'مورد', phone: off?.supplier?.phone, offerId: a.offer_id, total: 0, count: 0 }
                    }
                    bySupplier[a.supplier_id].total += Number(a.total) || 0
                    bySupplier[a.supplier_id].count += 1
                  })
                  const list: any[] = Object.values(bySupplier)
                  const grand = list.reduce((s, v) => s + v.total, 0)
                  const awardedCount = Object.keys(awards).length
                  const finalized = rfq.status !== 'open'
                  return (
                    <div className="rounded-xl p-4 text-white mt-2" style={{ background: '#1B2D5B' }}>
                      <h4 className="font-bold text-sm mb-2">📦 ملخص الترسية ({awardedCount}/{rfq.items.length} مادة · {list.length} مورد)</h4>
                      {list.map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/10 gap-2">
                          <span className="flex items-center gap-2 flex-wrap">{v.name} <span className="text-blue-200 text-xs">({v.count} مادة)</span>
                            {finalized
                              ? <a href={`/contractor/orders/${v.offerId}`} className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#0F6E56' }}>📄 أمر الشراء ←</a>
                              : v.phone && <a href={waLink(v.phone, `بخصوص ترسية مواد من منصة تسعيرك`)} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#25D366' }}>💬 تواصل</a>}
                          </span>
                          <span className="font-bold whitespace-nowrap">{v.total.toLocaleString('en-US')} ر.س</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between font-extrabold mt-2 pt-1">
                        <span>الإجمالي</span><span style={{ color: '#F5831F' }}>{grand.toLocaleString('en-US')} ر.س</span>
                      </div>
                      {finalized ? (
                        <p className="text-[11px] text-emerald-300 mt-3">✓ تمت الترسية — افتح أمر الشراء لكل مورد لمتابعة التسليم والدفع وحماية الصفقة.</p>
                      ) : (
                        <button type="button" onClick={finalizeAwards} disabled={finalizing}
                          className="w-full mt-3 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:shadow" style={{ background: '#0F6E56' }}>
                          {finalizing ? '...' : '✓ تأكيد الترسية وإصدار أوامر الشراء'}
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Offers List — للطلب أحادي المادة فقط (متعدّد المواد يستخدم الترسية بند-بند بالأعلى) */}
        {!isMulti && (<>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">العروض ({offers.length})</h3>
          {marketAvg && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-600">📊 متوسط السوق:</span>
              <span className="text-sm font-bold text-amber-700">{marketAvg?.toLocaleString('en-US')} ر.س/وحدة</span>
            </div>
          )}
        </div>
        {offers.length > 1 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white font-semibold text-gray-700">
              <option value="price_asc">💰 السعر: الأقل أولاً</option>
              <option value="price_desc">💰 السعر: الأعلى أولاً</option>
              <option value="delivery">📦 التوصيل: الأسرع</option>
              <option value="rating">⭐ التقييم: الأعلى</option>
            </select>
            <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="">كل الموردين</option>
              <option value="manufacturer">🏭 مصنع</option>
              <option value="commercial">🏪 تجاري</option>
              <option value="local">🏬 محلي</option>
            </select>
            <button type="button" onClick={() => setOnlyVerified(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${onlyVerified ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
              style={onlyVerified ? { background: '#0F6E56' } : {}}>✓ موثّق فقط</button>
            {(onlyVerified || tierFilter) && <span className="text-[11px] text-gray-400">({displayedOffers.length} من {offers.length})</span>}
          </div>
        )}

        {/* مستشار الذكاء الاصطناعي لمقارنة العروض */}
        {offers.length > 1 && (
          <div className="mb-3">
            {!aiCmp ? (
              <button type="button" onClick={runCompare} disabled={cmpLoading}
                className="w-full py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 transition-all hover:shadow"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#1B2D5B)' }}>
                {cmpLoading ? '⏳ جارٍ تحليل العروض...' : '✨ حلّل العروض ووصِّ لي بالأفضل (ذكاء اصطناعي)'}
              </button>
            ) : aiCmp.ai ? (
              <div className="rounded-xl p-4 border" style={{ background: '#7C3AED0a', borderColor: '#7C3AED33' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color: '#7C3AED' }}>✨ توصية الذكاء الاصطناعي</span>
                  <button onClick={() => setAiCmp(null)} className="text-[11px] text-gray-400 hover:text-gray-600">إخفاء</button>
                </div>
                {aiCmp.best_supplier && <div className="text-sm mb-1.5 font-bold text-emerald-700">🏆 الأفضل قيمةً: {aiCmp.best_supplier}</div>}
                <p className="text-xs text-gray-700 leading-relaxed mb-2 whitespace-pre-line">{aiCmp.summary}</p>
                {aiCmp.advice && <p className="text-xs font-semibold rounded-lg p-2 bg-white" style={{ color: '#1B2D5B' }}>💡 {aiCmp.advice}</p>}
                <p className="text-[10px] text-gray-400 mt-2">توصية إرشادية — القرار النهائي لك.</p>
              </div>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                <span>{aiCmp.message || 'التحليل غير متاح حالياً'}</span>
                <button onClick={() => setAiCmp(null)} className="text-gray-400 shrink-0">✕</button>
              </div>
            )}
          </div>
        )}

        {offers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h4 className="font-bold text-gray-900 mb-1">لم تصل عروض بعد</h4>
            <p className="text-sm text-gray-500">سيتم إخطارك فور وصول أي عرض</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedOffers.map((offer, i) => (
              <div key={offer.id} className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${
                offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100 hover:border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-[#d96f15]">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{offer.supplier?.company_name_ar || 'مورد'}</span>
                        {offer.supplier?.supplier_tier && (
                          <span className={`badge text-[10px] ${
                            offer.supplier.supplier_tier === 'manufacturer' ? 'bg-purple-100 text-purple-700' :
                            offer.supplier.supplier_tier === 'commercial' ? 'bg-blue-100 text-[#d96f15]' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {offer.supplier.supplier_tier === 'manufacturer' ? '🏭 مصنع' :
                             offer.supplier.supplier_tier === 'commercial' ? '🏪 تجاري' : '🏬 محلي'}
                          </span>
                        )}
                        {offer.supplier?.verification_status === 'verified' && (
                          <span className="badge text-[10px] inline-flex items-center gap-0.5"
                            style={offer.supplier?.cr_verification_source === 'wathq'
                              ? { background: '#0F6E56', color: '#fff' }
                              : { background: '#E1F5EE', color: '#0F6E56' }}>
                            {offer.supplier?.cr_verification_source === 'wathq' ? '🛡 موثّق عبر واثق' : '✓ موثّق'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {offer.supplier?.rating_avg > 0 && <span>⭐ {offer.supplier.rating_avg}</span>}
                        {offer.supplier?.region && <span>📍 {offer.supplier.region}</span>}
                        {offer.supplier?.phone && <span>📞 {offer.supplier.phone}</span>}
                      </div>
                      {/* بطاقة أداء المورد — سرعة الرد، نسبة الترسية، الخبرة */}
                      {(() => {
                        const st = supplierStats[offer.supplier_id]
                        if (!st) return null
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {st.avg_response_hours != null && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">⚡ يردّ خلال ~{st.avg_response_hours} س</span>
                            )}
                            {st.won_rate != null && (
                              <span className="text-[10px] bg-[#F5831F]/5 text-[#d96f15] px-2 py-0.5 rounded-full font-semibold">🤝 نسبة الترسية {st.won_rate}%</span>
                            )}
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">📨 {st.total_offers} عرض سابق</span>
                          </div>
                        )
                      })()}
                      {offer.supplier?.phone && (() => {
                        const w = waLink(offer.supplier.phone, `السلام عليكم، بخصوص عرضكم في منصة تسعيرك على «${rfq.product_name}»`)
                        return w ? (
                          <a href={w} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] mt-1.5 px-2.5 py-1 rounded-full font-semibold text-white" style={{ background: '#25D366' }}>
                            💬 تواصل واتساب
                          </a>
                        ) : null
                      })()}
                      {offer.supplier?.phone && offer.status === 'pending' && (() => {
                        const w = waLink(offer.supplier.phone, `السلام عليكم، بخصوص عرضكم على «${rfq.product_name}» بسعر ${offer.total_price?.toLocaleString('en-US')} ر.س في منصة تسعيرك — هل بالإمكان تخفيض السعر؟ نقدّر تعاونكم 🌟`)
                        return w ? (
                          <a href={w} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] mt-1.5 mr-1.5 px-2.5 py-1 rounded-full font-semibold border" style={{ borderColor: '#F5831F', color: '#F5831F' }}>
                            📉 اطلب تخفيض السعر
                          </a>
                        ) : null
                      })()}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold" style={{ color: '#1B2D5B' }}>{offer.total_price?.toLocaleString('en-US')}</div>
                    <div className="text-xs text-gray-400">ر.س</div>
                    {marketAvg && offer.unit_price && (() => {
                      const diff = Math.abs(((offer.unit_price - marketAvg) / marketAvg * 100)).toFixed(0)
                      const isLow = offer.unit_price < marketAvg
                      return (
                        <div className={`text-[10px] font-bold mt-0.5 ${isLow ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isLow ? `📉 ${diff}% دون السوق` : `📈 ${diff}% فوق السوق`}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {offer.unit_price && <span>سعر الوحدة: {offer.unit_price} ر.س</span>}
                  {offer.delivery_days && <span>📦 التوصيل: {offer.delivery_days} يوم</span>}
                </div>

                {/* تسعير بند-بند: سعر كل مادة */}
                {Array.isArray(offer.item_prices) && offer.item_prices.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                    <div className="bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 flex justify-between">
                      <span>🧾 تسعير المواد ({offer.item_prices.length})</span><span>السعر</span>
                    </div>
                    {offer.item_prices.map((it, idx) => (
                      <div key={idx} className="px-2.5 py-1.5 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-700 truncate">
                          {it.attachment_url && <span title="يوجد كتالوج">📎 </span>}
                          {it.product_name} <span className="text-gray-400">({Number(it.unit_price) > 0 ? `${Number(it.unit_price).toLocaleString('en-US')} × ` : ''}{(Number(it.quantity) || 0).toLocaleString('en-US')} {it.unit || ''})</span>
                        </span>
                        <span className="font-bold text-gray-900 whitespace-nowrap">{(Number(it.total) || 0).toLocaleString('en-US')} ر.س</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* تفصيل الفاتورة: البضاعة + الإضافات */}
                {offer.extra_charges && offer.extra_charges.length > 0 && (() => {
                  const exSum = offer.extra_charges.reduce((s, e) => s + (Number(e.amount) || 0), 0)
                  const goods = (Number(offer.total_price) || 0) - exSum
                  return (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-2 text-xs">
                      <div className="flex justify-between text-gray-600"><span>البضاعة</span><span>{goods.toLocaleString('en-US')} ر.س</span></div>
                      {offer.extra_charges.map((e, idx) => (
                        <div key={idx} className="flex justify-between text-amber-700"><span>+ {e.label}</span><span>{Number(e.amount).toLocaleString('en-US')} ر.س</span></div>
                      ))}
                      <div className="flex justify-between font-bold text-gray-900 border-t border-amber-200 mt-1 pt-1"><span>الإجمالي</span><span>{Number(offer.total_price).toLocaleString('en-US')} ر.س</span></div>
                    </div>
                  )
                })()}

                {offer.notes && <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg mb-2">{offer.notes}</p>}

                {/* خصائص المنتج */}
                {offer.attributes && Object.keys(offer.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Object.entries(offer.attributes).map(([k, v]) => (
                      <span key={k} className="text-[10px] bg-[#F5831F]/5 text-[#d96f15] px-2 py-1 rounded-lg">
                        <strong>{k}:</strong> {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* الملف المرفق + الموقع */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {offer.attachment_url && (
                    <a href={offer.attachment_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-[#1B2D5B]/10 text-[#1B2D5B] px-2 py-1 rounded-lg font-semibold hover:bg-[#1B2D5B]/20 transition-all">
                      📎 {offer.attachment_name || 'كتالوج'}
                    </a>
                  )}
                  {offer.supplier?.latitude && offer.supplier?.longitude && (
                    <a href={`https://www.google.com/maps?q=${offer.supplier.latitude},${offer.supplier.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold hover:bg-emerald-100 transition-all">
                      🗺 موقع المورد
                    </a>
                  )}
                  {offer.supplier?.national_short_address && (
                    <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-lg font-mono" dir="ltr">
                      🏛 {offer.supplier.national_short_address}
                    </span>
                  )}
                </div>

                <a href={`/contractor/rfq/${id}/offer/${offer.id}`}
                  className="block text-center text-xs font-semibold py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:border-[#1B2D5B] hover:text-[#1B2D5B] transition-all mb-2">
                  📄 عرض كل التفاصيل ←
                </a>

                {offer.status === 'pending' && rfq.status === 'open' && (
                  <div className="flex gap-2">
                    <button onClick={() => acceptOffer(offer.id)}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                      ✓ قبول العرض
                    </button>
                    <button onClick={() => rejectOffer(offer.id)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                      ✕ رفض
                    </button>
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <a href={`/contractor/orders/${offer.id}`}
                    className="block text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    📄 عرض أمر الشراء
                  </a>
                )}

                {offer.status !== 'pending' && (
                  <div className={`text-center text-xs font-semibold py-1 ${
                    offer.status === 'accepted' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {offer.status === 'accepted' ? '✓ تم القبول' : '✕ مرفوض'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </>)}

        {/* حذف الطلب — متاح للمقاول دائماً (انتهت المهلة أو لقي المواد) */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-400">ما عدت تحتاج هذا الطلب؟</span>
          <button type="button" onClick={deleteRfq} disabled={deleting}
            className="text-xs font-bold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50">
            {deleting ? '⏳…' : '🗑 حذف الطلب'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
