'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, UNIT_OPTIONS, getProductLabel, getUnitLabel } from '@/types'
import { useTranslation } from '@/i18n'
import { waLink } from '@/lib/wa'
import { offerComparable, lineComparable } from '@/lib/vat'
import { fileHref } from '@/lib/fileHref'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { formatDateTime, formatTimeLeft, deadlineUrgency, urgencyStyle, isExpired } from '@/lib/deadline'
import { supplierScore, scoreColor, approvalLabel } from '@/lib/supplierScore'
import { dealStage } from '@/lib/dealStage'
import { TIERS, tierLabel, normTier, sourceLabel, availabilityLabel, isDirectSource, sourceIcon, availabilityIcon, tierIcon } from '@/lib/sellers'
import { rfqRefLine, rfqDesc } from '@/lib/rfqName'
import SellerIcon from '@/components/shared/SellerIcon'

const SECTOR_I18N: Record<string, Record<string, string>> = {
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}
// dealStage() labels are Arabic; en/ur by stage key (paid_pending = paid but not yet confirmed by the supplier)
const STAGE_I18N: Record<string, { en: string; ur: string }> = {
  disputed: { en: 'Open dispute — being handled', ur: 'شکایت زیرِ کارروائی' },
  paid: { en: 'Deal done — paid and recorded', ur: 'ڈیل مکمل — ادائیگی ہو گئی اور ریکارڈ ہو گئی' },
  paid_pending: { en: 'Paid — waiting for the supplier to confirm receiving payment', ur: 'ادائیگی ہو گئی — سپلائر کی تصدیق کا انتظار ہے' },
  received: { en: 'Received — waiting for payment', ur: 'مال وصول ہو گیا — ادائیگی کا انتظار ہے' },
  delivered: { en: 'Supplier confirmed delivery — waiting for your receipt confirmation', ur: 'سپلائر نے ڈیلیوری کنفرم کر دی — آپ کی وصولی کی تصدیق کا انتظار ہے' },
  accepted: { en: 'Accepted — waiting for supplier delivery', ur: 'قبول ہو گیا — سپلائر کی ڈیلیوری کا انتظار ہے' },
}

// مرجع جغرافي «lat,lng» → [lat,lng] أو null
function parseGeo(s: any) {
  if (!s || typeof s !== 'string') return null
  const m = s.split(',').map((x: any) => parseFloat(x.trim()))
  if (m.length !== 2 || m.some((n: any) => Number.isNaN(n))) return null
  return m
}
// المسافة بالكيلومترات (هافرسين)
function haversineKm(a: any, b: any) {
  if (!a || !b) return null
  const R = 6371, toRad = (d: any) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}
function offerDistanceKm(offer: any, ref: any) {
  if (!ref) return null
  const lat = offer?.supplier?.latitude, lng = offer?.supplier?.longitude
  if (lat == null || lng == null) return null
  return haversineKm(ref, [Number(lat), Number(lng)])
}

export default function RFQDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK' : 'ar-SA-u-ca-gregory'
  const SAR = L('SAR', 'SAR', 'ر.س')
  const secLabel = (k: string) => (locale !== 'ar' && SECTOR_I18N[locale]?.[k]) || (SECTOR_LABELS as any)[k] || k
  const [rfq, setRfq] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [sortBy, setSortBy] = useState('price_asc') // price_asc | price_desc | delivery | rating
  const [aiCmp, setAiCmp] = useState<any>(null) // نتيجة تحليل العروض بالذكاء الاصطناعي
  const [cmpLoading, setCmpLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [awardSort, setAwardSort] = useState('cheapest') // cheapest | fastest — ترتيب عروض كل مادة
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [tierFilter, setTierFilter] = useState('') // '' | company | shop | independent
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)            // bumped when a new offer arrives (live)
  const [liveNote, setLiveNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [marketAvg, setMarketAvg] = useState<any>(null) // متوسط السوق
  const [supplierStats, setSupplierStats] = useState<any>({}) // سجل أداء كل مورد
  const [awards, setAwards] = useState<any>({}) // ترسية بند-بند: item_index → صف الترسية
  const [awardedContacts, setAwardedContacts] = useState<any>({}) // supplier_id → رقم تواصل (يُكشف بعد الترسية فقط)

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
    } catch { setAiCmp({ ok: false, message: L('Analysis failed, please try again', 'تجزیہ نہیں ہو سکا، دوبارہ کوشش کریں', 'تعذّر التحليل، حاول مرة أخرى') }) }
    finally { setCmpLoading(false) }
  }

  async function deleteRfq() {
    if (!confirm(L('Delete this request permanently? Its offers will be deleted too.', 'یہ درخواست ہمیشہ کے لیے حذف کریں؟ اس سے جڑی آفرز بھی حذف ہو جائیں گی۔', 'حذف هذا الطلب نهائياً؟ ستُحذف العروض المرتبطة به أيضاً.'))) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('delete_rfq', { p_rfq_id: id })
    if (error) { alert(error.message); setDeleting(false); return }
    router.push('/contractor')
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
    if (error) { alert(error.message || L('Could not extend the deadline — please try again.', 'مہلت نہیں بڑھائی جا سکی — دوبارہ کوشش کریں۔', 'تعذّر تمديد المهلة — حاول مرة ثانية.')); return }
    // تحديث فوري بدون إعادة تحميل الصفحة
    setRfq((prev: any) => ({ ...prev, expires_at: next.toISOString() }))
    setShowExtend(false)
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      // Speed: the database is far from our users (~1 s a request): the request, its offers, the
      // per-item awards and the market sample load together, the page shows, then the supplier
      // contacts and track records fill in (was up to six requests in a row).
      const [{ data: rfqRow }, { data: offersData }, { data: awardRows }, { data: similarOffers }, { data: priv }] = await Promise.all([
        supabase.from('rfqs').select('*').eq('id', id).single(),
        supabase.from('offers').select('*, supplier:profiles_public(company_name_ar, rating_avg, city, region, supplier_tier, latitude, longitude, national_short_address, district, verification_status, cr_verification_source, approvals)')
          .eq('rfq_id', id).order('total_price', { ascending: true }),
        // ترسية بند-بند (إن وُجدت)
        supabase.from('rfq_item_awards').select('*').eq('rfq_id', id),
        // متوسط السوق من عروض مشابهة — recent offers only, filtered by product below
        supabase.from('offers').select('unit_price, rfq:rfqs(product_name, sector)')
          .not('unit_price', 'is', null).not('status', 'eq', 'rejected')
          .order('created_at', { ascending: false }).limit(500),
        // the precise delivery location lives in rfq_private (owner / admin / winning supplier only, H2)
        supabase.from('rfq_private').select('delivery_location, delivery_geo').eq('rfq_id', id).maybeSingle(),
      ])
      const rfqData = rfqRow ? { ...rfqRow, ...(priv || {}) } : rfqRow
      setRfq(rfqData)
      setEditNotes(rfqData?.notes || '')
      setEditSpec(rfqData?.specification || '')
      setEditName(rfqData?.product_name || '')
      setEditQty(rfqData?.quantity ?? '')
      setEditUnit(rfqData?.unit || '')
      setOffers(offersData || [])
      const am: any = {}; (awardRows || []).forEach((a: any) => { am[a.item_index] = a }); setAwards(am)
      if (rfqData) {
        const similar = (similarOffers || []).filter((o: any) => o.rfq?.product_name === rfqData.product_name)
        if (similar.length >= 2) {
          const avg = similar.reduce((s: any, o: any) => s + o.unit_price, 0) / similar.length
          setMarketAvg(Math.round(avg))
        }
      }
      setLoading(false)

      // أرقام تواصل الموردين المُرسى عليهم (RLS يسمح بقراءة الملف الكامل بعد الترسية فقط)
      // + سجل أداء الموردين (سرعة الرد، نسبة الترسية، عدد العروض السابقة)
      const awardedIds = [...new Set((awardRows || []).map((a: any) => a.supplier_id).filter(Boolean))]
      const supplierIds = [...new Set((offersData || []).map((o: any) => o.supplier_id).filter(Boolean))]
      const [{ data: contacts }, { data: stats }] = await Promise.all([
        awardedIds.length ? supabase.from('profiles').select('id, phone, contact_phone').in('id', awardedIds) : Promise.resolve({ data: null } as any),
        supplierIds.length ? supabase.rpc('get_supplier_stats', { ids: supplierIds }) : Promise.resolve({ data: null } as any),
      ])
      if (contacts) { const cm: any = {}; contacts.forEach((c: any) => { cm[c.id] = c.contact_phone || c.phone }); setAwardedContacts(cm) }
      if (stats) { const m: any = {}; stats.forEach((st: any) => { m[st.supplier_id] = st }); setSupplierStats(m) }
    }
    load()
  }, [id, refresh])

  // Live: a new offer (or any change) on this request notifies the buyer; reload the offers in
  // place instead of asking them to refresh. Per-user filtered subscription (reliable pattern).
  useEffect(() => {
    const supabase = createClient()
    let ch: any
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      ch = supabase.channel(`rfq-live-${id}-${session.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload: any) => {
          const n = payload.new
          if (!n || !JSON.stringify(n.data || {}).includes(String(id))) return
          setLiveNote(n.title || L('Your request was updated', 'آپ کی درخواست اپ ڈیٹ ہوئی', 'تم تحديث طلبك'))
          setRefresh(r => r + 1)
        })
        .subscribe()
    })
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function acceptOffer(offerId: any) {
    const o = offers.find((x: any) => x.id === offerId)
    const who = o?.supplier?.company_name_ar || L('this supplier', 'اس سپلائر', 'هذا المورد')
    const total = o ? offerComparable(o).toLocaleString('en-US', { maximumFractionDigits: 0 }) : ''
    if (!confirm(L(
      `Accept the offer from ${who} for ${total} SAR incl. VAT?\nThe other offers will be declined and a purchase order is created.`,
      `${who} کی آفر ${total} ریال (VAT سمیت) میں قبول کریں؟\nباقی آفرز رد ہو جائیں گی اور پرچیز آرڈر بنے گا۔`,
      `قبول عرض ${who} بمبلغ ${total} ر.س شاملاً الضريبة؟\nستُرفض العروض الأخرى ويُنشأ أمر شراء.`))) return
    const supabase = createClient()
    // Atomic: accept + reject others + close RFQ in one transaction (prevents double-accept).
    const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
    if (error) { alert(L('Could not accept the offer — it may already be accepted. Refresh the page and try again.', 'آفر قبول نہیں ہو سکی — شاید پہلے ہی قبول ہو چکی ہے۔ صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'تعذّر قبول العرض — قد يكون تم قبوله مسبقاً. حدّث الصفحة وحاول مرة ثانية.')); return }
    router.push(`/contractor/orders/${offerId}`)
  }

  async function rejectOffer(offerId: any) {
    const o = offers.find((x: any) => x.id === offerId)
    const who = o?.supplier?.company_name_ar || L('this supplier', 'اس سپلائر', 'هذا المورد')
    if (!confirm(L(`Decline the offer from ${who}? This cannot be undone.`, `${who} کی آفر رد کریں؟ یہ واپس نہیں ہو سکتا۔`, `رفض عرض ${who}؟ لا يمكن التراجع عن ذلك.`))) return
    const supabase = createClient()
    const { error } = await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    if (error) { alert(L('Could not decline the offer — please try again.', 'آفر رد نہیں ہو سکی — دوبارہ کوشش کریں۔', 'تعذّر رفض العرض — حاول مرة أخرى.')); return }
    setOffers((prev: any[]) => prev.map((x: any) => x.id === offerId ? { ...x, status: 'rejected' } : x))
  }

  // ترسية بند-بند: ترسية مادة على مورد مُحدّد (أرخص أو من اختيار المشتري)
  const [awarding, setAwarding] = useState<any>(null)
  async function awardItem(itemIndex: any, offerId: any) {
    setAwarding(`${itemIndex}:${offerId}`)
    const supabase = createClient()
    const { error } = await supabase.rpc('award_rfq_item', { p_rfq_id: id, p_item_index: itemIndex, p_offer_id: offerId })
    setAwarding(null)
    if (error) { alert(L('Could not award — refresh the page and try again.', 'ایوارڈ نہیں ہو سکا — صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'تعذّرت الترسية — حدّث الصفحة وحاول مجدداً.')); return }
    await reloadAwards()
  }
  async function unawardItem(itemIndex: any) {
    setAwarding(`${itemIndex}:x`)
    const supabase = createClient()
    await supabase.rpc('unaward_rfq_item', { p_rfq_id: id, p_item_index: itemIndex })
    setAwarding(null)
    await reloadAwards()
  }
  // تأكيد الترسية: قبول الموردين الفائزين + إصدار أوامر الشراء + إغلاق الطلب
  const [finalizing, setFinalizing] = useState(false)
  async function finalizeAwards() {
    if (!confirm(L('Confirm the award? The winning suppliers will be accepted, a purchase order issued for each, and the request closed.', 'ایوارڈ کنفرم کریں؟ جیتنے والے سپلائرز قبول ہوں گے، ہر سپلائر کا پرچیز آرڈر بنے گا، اور درخواست بند ہو جائے گی۔', 'تأكيد الترسية؟ سيتم قبول الموردين الفائزين، إصدار أمر شراء لكل مورد، وإغلاق الطلب.'))) return
    setFinalizing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('finalize_rfq_awards', { p_rfq_id: id })
    setFinalizing(false)
    if (error) { alert(L('Could not confirm the award — refresh the page and try again.', 'ایوارڈ کنفرم نہیں ہو سکا — صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'تعذّر تأكيد الترسية — حدّث الصفحة وحاول مجدداً.')); return }
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
    const patch: any = {
      notes: editNotes,
      specification: editSpec,
      product_name: (editName || '').trim() || rfq.product_name,
      quantity: parseFloat(String(editQty)) || rfq.quantity,
      unit: editUnit || rfq.unit,
    }
    // 1. Delete the existing offers first (السعر القديم لم يعد صالحاً بعد تغيير التفاصيل):
    //    the database refuses material changes while offers exist.
    if (offers.length > 0) {
      const { error: delErr } = await supabase.from('offers').delete().eq('rfq_id', id)
      if (delErr) { alert(delErr.message); return }
    }
    // 2. Update the request
    const { error } = await supabase.from('rfqs').update(patch).eq('id', id)
    if (error) { alert(error.message); return }

    setRfq({ ...rfq, ...patch, offer_count: 0 })
    setOffers([])
    setEditing(false)
    setShowEditWarning(false)
  }

  async function cancelRfq() {
    if (!confirm(L('Are you sure you want to cancel this request?', 'کیا آپ واقعی یہ درخواست منسوخ کرنا چاہتے ہیں؟', 'هل أنت متأكد من إلغاء هذا الطلب؟'))) return
    const supabase = createClient()
    await supabase.from('rfqs').update({ status: 'cancelled' }).eq('id', id)
    router.push('/contractor')
  }

  if (loading) return <PageLoader />
  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">{L('Request not found', 'درخواست نہیں ملی', 'الطلب غير موجود')}</div></div>

  const acceptedOffer = offers.find((o: any) => o.status === 'accepted')
  // طلب متعدّد المواد → الترسية تتم بند-بند (أفضل مورد لكل مادة)
  const isMulti = Array.isArray(rfq.items) && rfq.items.length > 1
  const activeOffers = offers.filter((o: any) => o.status !== 'rejected')
  // مرجع التوصيل لحساب «الأقرب مورد» (إن وُجدت إحداثيات للطلب)
  const refGeo = parseGeo(rfq?.delivery_geo)
  // هل يتوفّر مورد واحد على الأقل بإحداثيات؟ نُظهر زر «الأقرب» فقط حينها
  const canSortNearest = !!refGeo && activeOffers.some((o: any) => o.supplier?.latitude != null && o.supplier?.longitude != null)

  // Filtered + sorted offers for display (contractor may receive many).
  const displayedOffers = [...offers]
    .filter((o: any) => !onlyVerified || o.supplier?.verification_status === 'verified')
    .filter((o: any) => !tierFilter || normTier(o.supplier?.supplier_tier) === tierFilter)
    .sort((a: any, b: any) => {
      if (sortBy === 'price_desc') return offerComparable(b) - offerComparable(a)
      if (sortBy === 'delivery') return (a.delivery_days || 99999) - (b.delivery_days || 99999)
      if (sortBy === 'rating') return (b.supplier?.rating_avg || 0) - (a.supplier?.rating_avg || 0)
      return offerComparable(a) - offerComparable(b) // price_asc (default) — VAT-inclusive basis (B4)
    })

  return (
    <AppShell title={L('Quote request details', 'قیمت کی درخواست کی تفصیل', 'تفاصيل طلب التسعير')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-3xl mx-auto">
        {liveNote && (
          <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
            <span>🔔 {liveNote}</span>
            <button type="button" onClick={() => setLiveNote('')} className="text-emerald-600 text-lg leading-none" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <Link href="/contractor/rfqs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">← {L('Back to my requests', 'میری درخواستوں پر واپس', 'العودة إلى طلباتي')}</Link>
          <Link href={`/contractor/rfq/quick?from=${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#9D7425] hover:underline">🔁 {L('Reorder', 'دوبارہ آرڈر کریں', 'أعد الطلب')}</Link>
        </div>

        {/* RFQ Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-[#9D7425] font-mono" dir="auto">{rfqRefLine(rfq, locale)}</div>
              <h2 className="text-xl font-bold text-gray-900">{rfqDesc(rfq, locale)}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-100 text-[#9D7425] text-xs px-2 py-0.5 rounded-full font-semibold">
                  {Array.isArray(rfq.sectors) && rfq.sectors.length > 1
                    ? rfq.sectors.map((s: string) => secLabel(s)).join(' + ')
                    : secLabel(rfq.sector)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  rfq.status === 'open' ? 'bg-green-100 text-green-700' :
                  rfq.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  rfq.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  ● {rfq.status === 'open' ? L('Open', 'کھلی', 'مفتوح') : rfq.status === 'closed' ? L('Closed', 'بند', 'مغلق') : rfq.status === 'cancelled' ? L('Cancelled', 'منسوخ', 'ملغي') : L('Expired', 'ختم', 'منتهي')}
                </span>
                {rfq.status === 'open' && rfq.expires_at && (() => {
                  const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                  return (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.fg }}>
                      {isExpired(rfq.expires_at) ? `⏰ ${L('Deadline passed', 'مہلت ختم', 'انتهت المهلة')}` : `⏰ ${formatTimeLeft(rfq.expires_at, locale)}`}
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
                      className="text-[11px] font-semibold text-[#0B2438] border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                      ⏱ {L('Extend pricing deadline', 'قیمت دینے کی مہلت بڑھائیں', 'تمديد مهلة التسعير')}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 flex-wrap bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <span className="text-[11px] text-gray-600 font-semibold">{L('Extend by:', 'مہلت بڑھائیں:', 'مدّد المهلة:')}</span>
                      {[1, 3, 7].map((d: any) => (
                        <button key={d} onClick={() => extendDeadline(d)} disabled={extending}
                          className="text-[11px] font-bold text-white px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: '#0B2438' }}>
                          {extending ? '…' : `+${d} ${d === 1 ? L('day', 'دن', 'يوم') : L('days', 'دن', 'أيام')}`}
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
                <button onClick={() => {
                    if (!editing) {
                      setEditName(rfq.product_name || ''); setEditQty(rfq.quantity ?? ''); setEditUnit(rfq.unit || '')
                      setEditSpec(rfq.specification || ''); setEditNotes(rfq.notes || '')
                    }
                    setEditing(!editing)
                  }}
                  className="text-xs text-[#9D7425] border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-[#D4A543]/5 transition-colors">
                  ✏️ {L('Edit', 'ترمیم', 'تعديل')}
                </button>
                <button onClick={cancelRfq}
                  className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  {L('Cancel', 'منسوخ', 'إلغاء')}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 bg-[#D4A543]/5 rounded-xl p-4">
              {(!Array.isArray(rfq.items) || rfq.items.length <= 1) && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{L('Material name', 'مال کا نام', 'اسم المادة')}</label>
                    <input value={editName} onChange={(e: any) => setEditName(e.target.value)} className="input-field" placeholder={L('Material name', 'مال کا نام', 'اسم المادة')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{L('Quantity', 'مقدار (تعداد)', 'الكمية (العدد)')}</label>
                      <input type="number" min="0" step="any" value={editQty} onChange={(e: any) => setEditQty(e.target.value)} className="input-field" placeholder={L('Quantity', 'مقدار', 'الكمية')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{L('Unit', 'یونٹ', 'الوحدة')}</label>
                      <select value={editUnit} onChange={(e: any) => setEditUnit(e.target.value)} className="input-field">
                        {!UNIT_OPTIONS.includes(editUnit) && editUnit && <option value={editUnit}>{getUnitLabel(editUnit, locale)}</option>}
                        {UNIT_OPTIONS.map((u: any) => <option key={u} value={u}>{getUnitLabel(u, locale)}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{L('Specifications', 'اسپیسیفکیشن', 'المواصفات')}</label>
                <input value={editSpec} onChange={(e: any) => setEditSpec(e.target.value)} className="input-field" placeholder={L('Specifications', 'اسپیسیفکیشن', 'المواصفات')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{L('Notes', 'نوٹس', 'ملاحظات')}</label>
                <textarea value={editNotes} onChange={(e: any) => setEditNotes(e.target.value)} className="input-field" rows={3} placeholder={L('Notes', 'نوٹس', 'ملاحظات')} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleEditSave} className="bg-[#0B2438] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#071827]">{L('Save changes', 'تبدیلیاں محفوظ کریں', 'حفظ التعديل')}</button>
                <button onClick={() => { setEditing(false); setShowEditWarning(false) }} className="text-sm text-gray-500">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
              </div>

              {showEditWarning && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-amber-800 text-sm">{L('Warning: all current offers will be cancelled', 'انتباہ: تمام موجودہ آفرز منسوخ ہو جائیں گی', 'تنبيه: سيتم إلغاء جميع العروض الحالية')}</h4>
                      <p className="text-xs text-amber-700 mt-1">{L(`If you edit the specs or notes, the old offers (${offers.length}) will be cancelled and the request re-sent to suppliers with the new requirements for fresh offers.`, `اسپیسیفکیشن یا نوٹس میں ترمیم کرنے پر پرانی آفرز (${offers.length}) منسوخ ہو جائیں گی اور درخواست نئی ضروریات کے ساتھ سپلائرز کو دوبارہ بھیجی جائے گی تاکہ وہ نئی آفرز دیں۔`, `عند تعديل المواصفات أو الملاحظات، سيتم إلغاء العروض القديمة (${offers.length} عرض) وإرسال الطلب مرة أخرى للموردين بالمتطلبات الجديدة لتقديم عروض جديدة.`)}</p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={doSaveEdit}
                          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors">
                          {L('Yes, edit and re-send', 'ہاں، ترمیم کر کے دوبارہ بھیجیں', 'نعم، عدّل وأعد الإرسال')}
                        </button>
                        <button onClick={() => setShowEditWarning(false)}
                          className="text-xs text-gray-500 px-3 py-2">
                          {L('Go back', 'واپس', 'تراجع')}
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
                <h3 className="font-bold text-sm mb-2 text-[#0B2438]">🧾 {L('Requested materials', 'مطلوبہ مال', 'المواد المطلوبة')} ({rfq.items.length})</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                      <th className="text-start py-2 px-3 font-bold">#</th>
                      <th className="text-start py-2 px-3 font-bold">{L('Material', 'مال', 'المادة')}</th>
                      <th className="text-start py-2 px-3 font-bold">{L('Quantity', 'مقدار', 'الكمية')}</th>
                      <th className="text-start py-2 px-3 font-bold">{L('Specifications', 'اسپیسیفکیشن', 'المواصفات')}</th>
                    </tr></thead>
                    <tbody>
                      {rfq.items.map((it: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 align-top">
                          <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#0B2438]">{getProductLabel(it.product_name, locale)}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{secLabel(it.sector)}</span>
                              {(it.supplier_tiers || []).map((tr: string) => <span key={tr} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700"><><SellerIcon name={tierIcon(tr)} /> {tierLabel(tr, locale)}</></span>)}
                              {it.in_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">⚡ {L('In stock now', 'فوری دستیاب', 'توفّر فوري')}</span>}
                              {it.max_days && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">⏱ {it.max_days}{L('d', ' دن', 'ي')}</span>}
                              {it.spec_file_url && <a href={fileHref(it.spec_file_url)} target="_blank" rel="noopener noreferrer" className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 hover:underline">📎 {L('File', 'فائل', 'ملف')}</a>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#9D7425] whitespace-nowrap">{it.quantity} {getUnitLabel(it.unit, locale)}</td>
                          <td className="py-2.5 px-3 text-xs text-gray-500">{it.specification || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              {(!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📦 {L('Quantity', 'مقدار', 'الكمية')}</span><br/><strong>{rfq.quantity} {getUnitLabel(rfq.unit, locale)}</strong></div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📍 {L('Location', 'مقام', 'الموقع')}</span><br/><strong>{rfq.city || rfq.region}</strong></div>
              {rfq.specification && (!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">⚙️ {L('Specifications', 'اسپیسیفکیشن', 'المواصفات')}</span><br/><strong>{rfq.specification}</strong></div>}
              {rfq.notes && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">📝 {L('Notes', 'نوٹس', 'ملاحظات')}</span><br/>{rfq.notes}</div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🚚 {L('Delivery', 'ڈیلیوری', 'التوصيل')}</span><br/><strong>{rfq.delivery_required ? L('Required', 'درکار ہے', 'مطلوب') : L('Not required', 'درکار نہیں', 'غير مطلوب')}</strong></div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🧾 {L('Tax invoice', 'ٹیکس انوائس', 'فاتورة ضريبية')}</span><br/><strong>{rfq.vat_invoice_required ? L('Required', 'درکار ہے', 'مطلوبة') : L('Not required', 'درکار نہیں', 'غير مطلوبة')}</strong></div>
            </div>
            </>
          )}
        </div>

        {/* Accepted Offer → PO Link */}
        {acceptedOffer && (
          <Link href={`/contractor/orders/${acceptedOffer.id}`}
            className="block bg-green-50 rounded-2xl p-6 border border-green-200 mb-6 hover:shadow transition-shadow text-center">
            <div className="text-3xl mb-2">📄</div>
            <h3 className="font-bold text-green-800 mb-1">{L('Offer accepted from', 'آفر قبول ہوئی:', 'تم قبول عرض من')} {acceptedOffer.supplier?.company_name_ar}</h3>
            <p className="text-sm text-green-600">{L('Price:', 'قیمت:', 'السعر:')} {acceptedOffer.total_price?.toLocaleString('en-US')} {SAR} — {L('tap to view the purchase order', 'پرچیز آرڈر دیکھنے کے لیے دبائیں', 'اضغط لعرض أمر الشراء')}</p>
          </Link>
        )}

        {/* ═══ ترسية بند-بند: أفضل مورد لكل مادة (طلب متعدّد المواد) ═══ */}
        {isMulti && (
          <div className="mb-6">
            <div className="mb-3 flex items-end justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-gray-900">🧱 {L('Award per item', 'ہر آئٹم کا الگ ایوارڈ', 'اختيار المورد لكل مادة')}</h3>
                <p className="text-xs text-gray-400">{L('Pick the best supplier for each material — one request can be split across several suppliers.', 'ہر مال کے لیے بہترین سپلائر چنیں — ایک درخواست کئی سپلائرز میں تقسیم ہو سکتی ہے۔', 'اختر أفضل مورد لكل مادة — يمكن توزيع الطلب الواحد على أكثر من مورد.')}</p>
              </div>
              {activeOffers.length > 0 && (
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 text-xs font-semibold">
                  {[{ k: 'cheapest', l: `💰 ${L('Cheapest', 'سب سے سستا', 'الأرخص')}` }, { k: 'fastest', l: `⚡ ${L('Fastest', 'سب سے تیز', 'الأسرع')}` }, ...(canSortNearest ? [{ k: 'nearest', l: `📍 ${L('Nearest', 'سب سے قریب', 'الأقرب')}` }] : [])].map((o: any) => (
                    <button key={o.k} type="button" onClick={() => setAwardSort(o.k)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${awardSort === o.k ? 'bg-white shadow-sm text-[#0B2438]' : 'text-gray-500'}`}>{o.l}</button>
                  ))}
                </div>
              )}
            </div>
            {activeOffers.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <h4 className="font-bold text-gray-900 mb-1">{L('No offers yet', 'ابھی کوئی آفر نہیں آئی', 'لم تصل عروض بعد')}</h4>
                <p className="text-sm text-gray-500">{L('You will be notified as soon as an offer arrives', 'کوئی بھی آفر آتے ہی آپ کو اطلاع دی جائے گی', 'سيتم إخطارك فور وصول أي عرض')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rfq.items.map((it: any, idx: any) => {
                  const bids = activeOffers.map((o: any) => {
                    const list = Array.isArray(o.item_prices) ? o.item_prices : []
                    const entry = list.find((ip: any) => ip.item_index === idx) || list.find((ip: any) => ip.product_name === it.product_name && (!it.sub_category || (ip.sub_category || null) === (it.sub_category || null)))
                    return entry ? { offer: o, entry } : null
                  }).filter(Boolean).sort((a: any, b: any) => {
                    if (awardSort === 'fastest') {
                      const ad = (a.entry.delivery_days ?? a.offer.delivery_days ?? 99999)
                      const bd = (b.entry.delivery_days ?? b.offer.delivery_days ?? 99999)
                      if (ad !== bd) return ad - bd
                    } else if (awardSort === 'nearest') {
                      const ad = offerDistanceKm(a.offer, refGeo) ?? 9e9
                      const bd = offerDistanceKm(b.offer, refGeo) ?? 9e9
                      if (ad !== bd) return ad - bd
                    }
                    return lineComparable(a.entry.total, a.offer) - lineComparable(b.entry.total, b.offer)
                  })
                  const award = awards[idx]
                  return (
                    <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-sm" style={{ color: '#0B2438' }}>{getProductLabel(it.product_name, locale)}</span>
                          <span className="text-xs text-gray-400"> · {Number(it.quantity).toLocaleString('en-US')} {getUnitLabel(it.unit, locale)}</span>
                        </div>
                        {award ? <span className="badge badge-green text-[10px] whitespace-nowrap">✓ {L('Selected', 'منتخب', 'تم الاختيار')}</span> : <span className="text-[11px] text-gray-400 whitespace-nowrap">{bids.length} {L('offers', 'آفرز', 'عرض')}</span>}
                      </div>
                      {bids.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">{L('No supplier has priced this material yet', 'ابھی کسی سپلائر نے اس مال کی قیمت نہیں دی', 'لا يوجد مورد سعّر هذه المادة بعد')}</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {bids.map((b: any, r: any) => {
                            const isAwarded = award && award.offer_id === b.offer.id
                            return (
                              <div key={b.offer.id} className={`px-4 py-2.5 flex items-center justify-between gap-2 ${isAwarded ? 'bg-emerald-50' : ''}`}>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {r === 0 && <span title={awardSort === 'fastest' ? L('Fastest', 'سب سے تیز', 'الأسرع') : awardSort === 'nearest' ? L('Nearest', 'سب سے قریب', 'الأقرب') : L('Cheapest', 'سب سے سستا', 'الأرخص')}>🥇</span>}
                                    <span className="font-semibold text-sm text-gray-800 truncate">{b.offer.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</span>
                                    {b.offer.supplier?.verification_status === 'verified' && <span title={L('Verified', 'تصدیق شدہ', 'موثّق')} style={{ color: '#0F6E56' }}>{b.offer.supplier?.cr_verification_source === 'wathq' ? '🛡' : '✓'}</span>}
                                    {b.offer.supplier?.rating_avg > 0 && <span className="text-[10px] text-gray-400">⭐ {b.offer.supplier.rating_avg}</span>}
                                    {(() => { const sc = supplierScore(b.offer.supplier, supplierStats[b.offer.supplier_id]); return <span title={L('Supplier performance score (0-100): verification + rating + response speed + win rate + experience', 'سپلائر کی کارکردگی کا اسکور (0-100): تصدیق + ریٹنگ + جواب کی رفتار + جیتنے کی شرح + تجربہ', 'تقييم أداء المورد (0-100): تحقّق + تقييم + سرعة رد + نسبة فوز + خبرة')} className="text-[10px] font-bold px-1.5 rounded" style={{ color: scoreColor(sc), background: scoreColor(sc) + '1a' }}>⚡{sc}</span> })()}
                                    {Array.isArray(b.offer.supplier?.approvals) && b.offer.supplier.approvals.slice(0, 2).map((a: string) => (
                                      <span key={a} title={L('Approval', 'منظوری', 'اعتماد')} className="text-[9px] font-bold px-1.5 rounded-full" style={{ color: '#0F6E56', background: '#0F6E5614' }}>🏅 {approvalLabel(a)}</span>
                                    ))}
                                  </div>
                                  {/* who is selling and where the price comes from — a sourced price is never shown as direct */}
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    {b.offer.supplier?.supplier_tier && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600"><><SellerIcon name={tierIcon(b.offer.supplier.supplier_tier)} /> {tierLabel(b.offer.supplier.supplier_tier, locale)}</></span>}
                                    {b.offer.supplier && b.offer.supplier.verification_status !== 'verified' && b.offer.supplier.cr_verification_source !== 'wathq' && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{L('Not verified yet', 'ابھی تصدیق نہیں ہوئی', 'غير موثّق بعد')}</span>
                                    )}
                                    {b.offer.source_type && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDirectSource(b.offer.source_type) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {isDirectSource(b.offer.source_type) ? <><SellerIcon name="check" /> {L('Direct from seller', 'بیچنے والے سے براہ راست', 'مباشر من البائع')}</> : <><SellerIcon name={sourceIcon(b.offer.source_type)} /> {sourceLabel(b.offer.source_type, locale)}</>}
                                      </span>
                                    )}
                                    {b.offer.availability && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-600"><><SellerIcon name={availabilityIcon(b.offer.availability)} /> {availabilityLabel(b.offer.availability, locale)}</></span>}
                                  </div>
                                  <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    {Number(b.entry.unit_price) > 0 && <span>{Number(b.entry.unit_price).toLocaleString('en-US')} / {getUnitLabel(b.entry.unit || it.unit, locale)}</span>}
                                    {(b.entry.delivery_days ?? b.offer.delivery_days) ? <span>📦 {b.entry.delivery_days ?? b.offer.delivery_days} {L('days', 'دن', 'يوم')}</span> : null}
                                    {b.offer.supplier?.city && <span>📍 {b.offer.supplier.city}</span>}
                                    {(() => { const km = offerDistanceKm(b.offer, refGeo); return km != null ? <span title={L('Distance from the delivery location', 'ڈیلیوری کی جگہ سے فاصلہ', 'المسافة من موقع التوصيل')}>📏 {km < 1 ? '<1' : Math.round(km)} {L('km', 'کلومیٹر', 'كم')}</span> : null })()}
                                    {b.entry.specification && <span title={b.entry.specification} className="truncate max-w-[150px]">⚙️ {b.entry.specification}</span>}
                                    {b.entry.warranty && <span className="text-[#0F6E56] font-semibold">🛡 {b.entry.warranty}</span>}
                                    {b.entry.attachment_url && <a href={fileHref(b.entry.attachment_url)} target="_blank" rel="noopener noreferrer" onClick={(e: any) => e.stopPropagation()} className="text-purple-500 hover:underline">📎 {L('Catalog', 'کیٹلاگ', 'كتالوج')}</a>}
                                    <Link href={`/contractor/rfq/${id}/offer/${b.offer.id}`} title={L('View all details', 'تمام تفصیل دیکھیں', 'عرض كل التفاصيل')} className="inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 rounded-full transition-all hover:shadow-sm" style={{ color: '#fff', background: '#D4A543' }}>👁 {L('Details', 'تفصیل', 'التفاصيل')}</Link>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-end leading-tight">
                                    <div className="font-bold text-sm" style={{ color: '#0B2438' }}>{(b.offer.vat_included ? Number(b.entry.total) : Number(b.entry.total) * 1.15).toLocaleString('en-US', { maximumFractionDigits: 0 })} {SAR}</div>
                                    <div className="text-[9px] text-gray-400">{L('incl. VAT', 'ٹیکس سمیت', 'شامل الضريبة')}</div>
                                  </div>
                                  {isAwarded ? (
                                    <span className="badge badge-green text-[10px] whitespace-nowrap">{L('Selected', 'منتخب', 'تم الاختيار')} ✓</span>
                                  ) : rfq.status === 'open' ? (
                                    <button onClick={() => awardItem(idx, b.offer.id)} disabled={awarding === `${idx}:${b.offer.id}`}
                                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0F6E56' }}>
                                      {awarding === `${idx}:${b.offer.id}` ? '...' : L('Award', 'ایوارڈ کریں', 'ترسية')}
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
                          <button onClick={() => unawardItem(idx)} disabled={awarding === `${idx}:x`} className="text-[11px] text-red-500 hover:underline disabled:opacity-50">✕ {L('Cancel award for this material', 'اس مال کا ایوارڈ منسوخ کریں', 'إلغاء ترسية هذه المادة')}</button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* ملخص الترسية حسب المورد */}
                {Object.keys(awards).length > 0 && (() => {
                  const bySupplier: Record<string, any> = {}
                  Object.values(awards).forEach((a: any) => {
                    if (!bySupplier[a.supplier_id]) {
                      const off = offers.find((o: any) => o.id === a.offer_id)
                      bySupplier[a.supplier_id] = { name: off?.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد'), phone: awardedContacts[a.supplier_id], offerId: a.offer_id, vatIncluded: !!off?.vat_included, net: 0, gross: 0, count: 0 }
                    }
                    // Same basis as the cards above: amounts shown VAT-inclusive (15%).
                    const line = Number(a.total) || 0
                    const v = bySupplier[a.supplier_id]
                    v.net += v.vatIncluded ? line / 1.15 : line
                    v.gross += v.vatIncluded ? line : line * 1.15
                    v.count += 1
                  })
                  const list: any[] = Object.values(bySupplier)
                  const grand = list.reduce((s: any, v: any) => s + v.gross, 0)
                  const grandNet = list.reduce((s: any, v: any) => s + v.net, 0)
                  const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  const awardedCount = Object.keys(awards).length
                  const finalized = rfq.status !== 'open'
                  return (
                    <div className="rounded-xl p-4 text-white mt-2" style={{ background: '#0B2438' }}>
                      <h4 className="font-bold text-sm mb-2">📦 {L('Award summary', 'ایوارڈ کا خلاصہ', 'ملخص الترسية')} ({awardedCount}/{rfq.items.length} {L('materials', 'مال', 'مادة')} · {list.length} {L('suppliers', 'سپلائرز', 'مورد')})</h4>
                      {list.map((v: any, i: any) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/10 gap-2">
                          <span className="flex items-center gap-2 flex-wrap">{v.name} <span className="text-blue-200 text-xs">({v.count} {L('materials', 'مال', 'مادة')})</span>
                            {finalized
                              ? <Link href={`/contractor/orders/${v.offerId}`} className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#0F6E56' }}>📄 {L('Purchase order', 'پرچیز آرڈر', 'أمر الشراء')} ←</Link>
                              : v.phone && <a href={waLink(v.phone, L('Regarding a materials award on Taseerak', 'تسعیرک پر مال کے ایوارڈ کے بارے میں', 'بخصوص ترسية مواد من منصة تسعيرك')) || undefined} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#25D366' }}>💬 {L('Contact', 'رابطہ', 'تواصل')}</a>}
                          </span>
                          <span className="font-bold whitespace-nowrap">{money(v.gross)} {SAR}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between font-extrabold mt-2 pt-1">
                        <span>{L('Total incl. VAT', 'کل رقم ٹیکس سمیت', 'الإجمالي شامل الضريبة')}</span><span style={{ color: '#D4A543' }}>{money(grand)} {SAR}</span>
                      </div>
                      <div className="text-[11px] text-blue-200 text-end">{L('Before VAT', 'ٹیکس سے پہلے', 'قبل الضريبة')} {money(grandNet)} {SAR} · {L('VAT 15%', 'ٹیکس 15%', 'الضريبة 15%')} {money(grand - grandNet)} {SAR}</div>
                      {finalized ? (
                        <p className="text-[11px] text-emerald-300 mt-3">✓ {L('Awarded — open each supplier purchase order to follow delivery, payment and deal protection.', 'ایوارڈ ہو گیا — ڈیلیوری، ادائیگی اور ڈیل کے تحفظ کے لیے ہر سپلائر کا پرچیز آرڈر کھولیں۔', 'تمت الترسية — افتح أمر الشراء لكل مورد لمتابعة التسليم والدفع وحماية الصفقة.')}</p>
                      ) : (
                        <button type="button" onClick={finalizeAwards} disabled={finalizing}
                          className="w-full mt-3 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:shadow" style={{ background: '#0F6E56' }}>
                          {finalizing ? '...' : `✓ ${L('Confirm award and issue purchase orders', 'ایوارڈ کنفرم کریں اور پرچیز آرڈر جاری کریں', 'تأكيد الترسية وإصدار أوامر الشراء')}`}
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
          <h3 className="text-sm font-bold text-gray-900">{L('Offers', 'آفرز', 'العروض')} ({offers.length})</h3>
          {marketAvg && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-600">📊 {L('Market average:', 'مارکیٹ اوسط:', 'متوسط السوق:')}</span>
              <span className="text-sm font-bold text-amber-700">{marketAvg?.toLocaleString('en-US')} {SAR}/{L('unit', 'یونٹ', 'وحدة')}</span>
            </div>
          )}
        </div>
        {offers.length > 1 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white font-semibold text-gray-700">
              <option value="price_asc">💰 {L('Price: low to high', 'قیمت: کم سے زیادہ', 'السعر: الأقل أولاً')}</option>
              <option value="price_desc">💰 {L('Price: high to low', 'قیمت: زیادہ سے کم', 'السعر: الأعلى أولاً')}</option>
              <option value="delivery">📦 {L('Delivery: fastest', 'ڈیلیوری: سب سے تیز', 'التوصيل: الأسرع')}</option>
              <option value="rating">⭐ {L('Rating: highest', 'ریٹنگ: سب سے زیادہ', 'التقييم: الأعلى')}</option>
            </select>
            <select value={tierFilter} onChange={(e: any) => setTierFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="">{L('All suppliers', 'تمام سپلائرز', 'كل الموردين')}</option>
              {TIERS.map(tr => <option key={tr} value={tr}>{tierLabel(tr, locale)}</option>)}
            </select>
            <button type="button" onClick={() => setOnlyVerified(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${onlyVerified ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
              style={onlyVerified ? { background: '#0F6E56' } : {}}>✓ {L('Verified only', 'صرف تصدیق شدہ', 'موثّق فقط')}</button>
            {(onlyVerified || tierFilter) && <span className="text-[11px] text-gray-400">({displayedOffers.length} {L('of', 'میں سے', 'من')} {offers.length})</span>}
          </div>
        )}

        {/* مستشار الذكاء الاصطناعي لمقارنة العروض */}
        {offers.length > 1 && (
          <div className="mb-3">
            {!aiCmp ? (
              <button type="button" onClick={runCompare} disabled={cmpLoading}
                className="w-full py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 transition-all hover:shadow"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#0B2438)' }}>
                {cmpLoading ? `⏳ ${L('Analyzing offers...', 'آفرز کا تجزیہ ہو رہا ہے...', 'جارٍ تحليل العروض...')}` : `✨ ${L('Analyze the offers and recommend the best (AI)', 'آفرز کا تجزیہ کر کے بہترین بتائیں (AI)', 'حلّل العروض ووصِّ لي بالأفضل (ذكاء اصطناعي)')}`}
              </button>
            ) : aiCmp.ai ? (
              <div className="rounded-xl p-4 border" style={{ background: '#7C3AED0a', borderColor: '#7C3AED33' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color: '#7C3AED' }}>✨ {L('AI recommendation', 'AI کی سفارش', 'توصية الذكاء الاصطناعي')}</span>
                  <button onClick={() => setAiCmp(null)} className="text-[11px] text-gray-400 hover:text-gray-600">{L('Hide', 'چھپائیں', 'إخفاء')}</button>
                </div>
                {aiCmp.best_supplier && <div className="text-sm mb-1.5 font-bold text-emerald-700">🏆 {L('Best value:', 'بہترین قیمت:', 'الأفضل قيمةً:')} {aiCmp.best_supplier}</div>}
                <p className="text-xs text-gray-700 leading-relaxed mb-2 whitespace-pre-line">{aiCmp.summary}</p>
                {aiCmp.advice && <p className="text-xs font-semibold rounded-lg p-2 bg-white" style={{ color: '#0B2438' }}>💡 {aiCmp.advice}</p>}
                <p className="text-[10px] text-gray-400 mt-2">{L('Guidance only — the final decision is yours.', 'صرف رہنمائی ہے — آخری فیصلہ آپ کا ہے۔', 'توصية إرشادية — القرار النهائي لك.')}</p>
              </div>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                <span>{aiCmp.message || L('Analysis is not available right now', 'تجزیہ ابھی دستیاب نہیں', 'التحليل غير متاح حالياً')}</span>
                <button onClick={() => setAiCmp(null)} className="text-gray-400 shrink-0">✕</button>
              </div>
            )}
          </div>
        )}

        {offers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h4 className="font-bold text-gray-900 mb-1">{L('No offers yet', 'ابھی کوئی آفر نہیں آئی', 'لم تصل عروض بعد')}</h4>
            <p className="text-sm text-gray-500">{L('You will be notified as soon as an offer arrives', 'کوئی بھی آفر آتے ہی آپ کو اطلاع دی جائے گی', 'سيتم إخطارك فور وصول أي عرض')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedOffers.map((offer: any, i: any) => (
              <div key={offer.id} className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${
                offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100 hover:border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-[#9D7425]">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{offer.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</span>
                        {offer.supplier?.supplier_tier && (
                          <span className={`badge text-[10px] ${
                            normTier(offer.supplier.supplier_tier) === 'company' ? 'bg-purple-100 text-purple-700' :
                            normTier(offer.supplier.supplier_tier) === 'shop' ? 'bg-blue-100 text-[#9D7425]' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <><SellerIcon name={tierIcon(offer.supplier.supplier_tier)} /> {tierLabel(offer.supplier.supplier_tier, locale)}</>
                          </span>
                        )}
                        {/* Where the price comes from: a sourced quote is never shown as a direct one */}
                        {offer.source_type && (
                          <span className={`badge text-[10px] ${isDirectSource(offer.source_type) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                            title={isDirectSource(offer.source_type) ? L('Direct price from the seller', 'بیچنے والے سے براہ راست قیمت', 'سعر مباشر من البائع') : L('Price sourced elsewhere, not from the seller stock', 'یہ قیمت کسی دوسرے ذریعے سے ہے، بیچنے والے کے اسٹاک سے نہیں', 'سعر منقول من مصدر آخر وليس من مخزون البائع')}>
                            {isDirectSource(offer.source_type) ? <><SellerIcon name="check" /> {L('Direct from seller', 'بیچنے والے سے براہ راست', 'مباشر من البائع')}</> : <><SellerIcon name={sourceIcon(offer.source_type)} /> {sourceLabel(offer.source_type, locale)}</>}
                          </span>
                        )}
                        {offer.availability && <span className="badge text-[10px] bg-gray-50 text-gray-600"><><SellerIcon name={availabilityIcon(offer.availability)} /> {availabilityLabel(offer.availability, locale)}</></span>}
                        {offer.supplier?.verification_status === 'verified' && (
                          <span className="badge text-[10px] inline-flex items-center gap-0.5"
                            style={offer.supplier?.cr_verification_source === 'wathq'
                              ? { background: '#0F6E56', color: '#fff' }
                              : { background: '#E1F5EE', color: '#0F6E56' }}>
                            {offer.supplier?.cr_verification_source === 'wathq' ? `🛡 ${L('Verified via Wathq', 'واثق کے ذریعے تصدیق شدہ', 'موثّق عبر واثق')}` : `✓ ${L('Verified', 'تصدیق شدہ', 'موثّق')}`}
                          </span>
                        )}
                        {offer.supplier && offer.supplier.verification_status !== 'verified' && offer.supplier.cr_verification_source !== 'wathq' && (
                          <span className="badge text-[10px] bg-gray-100 text-gray-500" title={L('The seller has not verified their CR yet; rely on their ratings and the price source', 'بیچنے والے نے ابھی کمرشل رجسٹریشن کی تصدیق نہیں کی؛ اس کی ریٹنگ اور قیمت کے ذریعے پر بھروسہ کریں', 'لم يوثّق البائع سجله التجاري بعد؛ اعتمد على تقييماته ومصدر السعر')}>{L('Not verified yet', 'ابھی تصدیق نہیں ہوئی', 'غير موثّق بعد')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {offer.supplier?.rating_avg > 0 && <span>⭐ {offer.supplier.rating_avg}</span>}
                        {offer.supplier?.region && <span>📍 {offer.supplier.region}</span>}
                        {offer.price_valid_until && (new Date(offer.price_valid_until) < new Date()
                          ? <span className="text-red-500 font-semibold">⏱ {L('Price expired — confirm with the supplier', 'قیمت کی مدت ختم — سپلائر سے کنفرم کریں', 'انتهت صلاحية السعر — أكّد مع المورّد')}</span>
                          : <span className="text-emerald-600">⏱ {L('Price valid until', 'قیمت اس تاریخ تک درست ہے:', 'السعر صالح حتى')} {new Date(offer.price_valid_until).toLocaleDateString(dloc)}</span>)}
                      </div>
                      {/* بطاقة أداء المورد — سرعة الرد، نسبة الترسية، الخبرة */}
                      {(() => {
                        const st = supplierStats[offer.supplier_id]
                        if (!st) return null
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {st.avg_response_hours != null && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">⚡ {L(`Replies within ~${st.avg_response_hours}h`, `تقریباً ${st.avg_response_hours} گھنٹے میں جواب دیتا ہے`, `يردّ خلال ~${st.avg_response_hours} س`)}</span>
                            )}
                            {st.won_rate != null && (
                              <span className="text-[10px] bg-[#D4A543]/5 text-[#9D7425] px-2 py-0.5 rounded-full font-semibold">🤝 {L('Win rate', 'ایوارڈ کی شرح', 'نسبة الترسية')} {st.won_rate}%</span>
                            )}
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">📨 {st.total_offers} {L('past offers', 'پچھلی آفرز', 'عرض سابق')}</span>
                          </div>
                        )
                      })()}
                      {/* 🔒 رقم التواصل/واتساب لا يظهر قبل الترسية — التواصل والتفاوض قبلها
                          عبر الدردشة الداخلية وطلب التخفيض داخل المنصة (منع الالتفاف). */}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold" style={{ color: '#0B2438' }}>{offerComparable(offer).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-gray-400">{SAR} · {L('incl. VAT', 'VAT سمیت', 'شامل الضريبة')}</div>
                    {!offer.vat_included && <div className="text-[11px] text-gray-400">{L('before VAT', 'VAT سے پہلے', 'قبل الضريبة')} {Number(offer.total_price || 0).toLocaleString('en-US')}</div>}
                    {marketAvg && offer.unit_price && (() => {
                      const diff = Math.abs(((offer.unit_price - marketAvg) / marketAvg * 100)).toFixed(0)
                      const isLow = offer.unit_price < marketAvg
                      return (
                        <div className={`text-[10px] font-bold mt-0.5 ${isLow ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isLow ? `📉 ${diff}% ${L('below market', 'مارکیٹ سے کم', 'دون السوق')}` : `📈 ${diff}% ${L('above market', 'مارکیٹ سے زیادہ', 'فوق السوق')}`}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {offer.unit_price && <span>{L('Unit price:', 'فی یونٹ قیمت:', 'سعر الوحدة:')} {offer.unit_price} {SAR}</span>}
                  {offer.delivery_days && <span>📦 {L('Delivery:', 'ڈیلیوری:', 'التوصيل:')} {offer.delivery_days} {L('days', 'دن', 'يوم')}</span>}
                </div>

                {/* تسعير بند-بند: سعر كل مادة */}
                {Array.isArray(offer.item_prices) && offer.item_prices.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                    <div className="bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 flex justify-between">
                      <span>🧾 {L('Item pricing', 'آئٹمز کی قیمتیں', 'تسعير المواد')} ({offer.item_prices.length})</span><span>{L('Price', 'قیمت', 'السعر')}</span>
                    </div>
                    {offer.item_prices.map((it: any, idx: any) => (
                      <div key={idx} className="px-2.5 py-1.5 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-700 truncate">
                          {it.attachment_url && <span title={L('Has a catalog', 'کیٹلاگ موجود ہے', 'يوجد كتالوج')}>📎 </span>}
                          {getProductLabel(it.product_name, locale)} <span className="text-gray-400">({Number(it.unit_price) > 0 ? `${Number(it.unit_price).toLocaleString('en-US')} × ` : ''}{(Number(it.quantity) || 0).toLocaleString('en-US')} {getUnitLabel(it.unit, locale)})</span>
                        </span>
                        <span className="font-bold text-gray-900 whitespace-nowrap">{(Number(it.total) || 0).toLocaleString('en-US')} {SAR}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* تفصيل الفاتورة: البضاعة + الإضافات */}
                {offer.extra_charges && offer.extra_charges.length > 0 && (() => {
                  const exSum = offer.extra_charges.reduce((s: any, e: any) => s + (Number(e.amount) || 0), 0)
                  const goods = (Number(offer.total_price) || 0) - exSum
                  return (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-2 text-xs">
                      <div className="flex justify-between text-gray-600"><span>{L('Goods', 'مال', 'البضاعة')}</span><span>{goods.toLocaleString('en-US')} {SAR}</span></div>
                      {offer.extra_charges.map((e: any, idx: any) => (
                        <div key={idx} className="flex justify-between text-amber-700"><span>+ {e.label}</span><span>{Number(e.amount).toLocaleString('en-US')} {SAR}</span></div>
                      ))}
                      <div className="flex justify-between font-bold text-gray-900 border-t border-amber-200 mt-1 pt-1"><span>{L('Total', 'کل', 'الإجمالي')}</span><span>{Number(offer.total_price).toLocaleString('en-US')} {SAR}</span></div>
                    </div>
                  )
                })()}

                {offer.notes && <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg mb-2">{offer.notes}</p>}

                {/* خصائص المنتج */}
                {offer.attributes && Object.keys(offer.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Object.entries(offer.attributes).map(([k, v]: any) => (
                      <span key={k} className="text-[10px] bg-[#D4A543]/5 text-[#9D7425] px-2 py-1 rounded-lg">
                        <strong>{k}:</strong> {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* الملف المرفق + الموقع */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {offer.attachment_url && (
                    <a href={fileHref(offer.attachment_url)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-[#0B2438]/10 text-[#0B2438] px-2 py-1 rounded-lg font-semibold hover:bg-[#0B2438]/20 transition-all">
                      📎 {offer.attachment_name || L('Catalog', 'کیٹلاگ', 'كتالوج')}
                    </a>
                  )}
                  {offer.supplier?.latitude && offer.supplier?.longitude && (
                    <a href={`https://www.google.com/maps?q=${offer.supplier.latitude},${offer.supplier.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold hover:bg-emerald-100 transition-all">
                      🗺 {L('Supplier location', 'سپلائر کا مقام', 'موقع المورد')}
                    </a>
                  )}
                  {offer.supplier?.national_short_address && (
                    <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-lg font-mono" dir="ltr">
                      🏛 {offer.supplier.national_short_address}
                    </span>
                  )}
                </div>

                <Link href={`/contractor/rfq/${id}/offer/${offer.id}`}
                  className="block text-center text-xs font-semibold py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:border-[#0B2438] hover:text-[#0B2438] transition-all mb-2">
                  📄 {L('View all details', 'تمام تفصیل دیکھیں', 'عرض كل التفاصيل')} ←
                </Link>

                {offer.status === 'pending' && rfq.status === 'open' && (
                  <div className="flex gap-2">
                    <button onClick={() => acceptOffer(offer.id)}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                      ✓ {L('Accept offer', 'آفر قبول کریں', 'قبول العرض')}
                    </button>
                    <button onClick={() => rejectOffer(offer.id)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                      ✕ {L('Reject', 'رد کریں', 'رفض')}
                    </button>
                  </div>
                )}

                {/* مؤشّر مرحلة الصفقة — وين صارت الطلبية (قبول → تسليم → استلام → دفع) */}
                {offer.status === 'accepted' && (() => {
                  const st = dealStage(offer)
                  return (
                    <div className="rounded-xl border p-2.5 mb-2" style={{ borderColor: `${st.tone}33`, background: `${st.tone}0d` }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm">{st.emoji}</span>
                        <span className="text-[11px] font-bold leading-tight" style={{ color: st.tone }}>{locale === 'ar' ? st.label : ((STAGE_I18N as any)[st.key === 'paid' && !st.done ? 'paid_pending' : st.key]?.[locale] || st.label)}</span>
                      </div>
                      {st.key !== 'disputed' && (
                        <div className="flex items-end gap-1">
                          {[L('Accepted', 'قبول', 'قبول'), L('Delivered', 'ڈیلیوری', 'تسليم'), L('Received', 'وصولی', 'استلام'), L('Paid', 'ادائیگی', 'دفع')].map((lbl: string, i: number) => (
                            <div key={lbl} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full h-1.5 rounded-full transition-all" style={{ background: i < st.step ? st.tone : '#e5e7eb' }} />
                              <span className="text-[9px]" style={{ color: i < st.step ? st.tone : '#9ca3af' }}>{lbl}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {offer.status === 'accepted' && (
                  <Link href={`/contractor/orders/${offer.id}`}
                    className="block text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    📄 {L('View purchase order', 'پرچیز آرڈر دیکھیں', 'عرض أمر الشراء')}
                  </Link>
                )}

                {offer.status === 'rejected' && (
                  <div className="text-center text-xs font-semibold py-1 text-red-500">✕ {L('Rejected', 'رد شدہ', 'مرفوض')}</div>
                )}
              </div>
            ))}
          </div>
        )}
        </>)}

        {/* حذف الطلب — متاح للمشتري دائماً (انتهت المهلة أو لقي المواد) */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-400">{L('No longer need this request?', 'اب یہ درخواست نہیں چاہیے؟', 'ألم تعد بحاجة إلى هذا الطلب؟')}</span>
          <button type="button" onClick={deleteRfq} disabled={deleting}
            className="text-xs font-bold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50">
            {deleting ? '⏳…' : `🗑 ${L('Delete request', 'درخواست حذف کریں', 'حذف الطلب')}`}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
