'use client'

import { useCallback, useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import AppShell from '@/components/shared/AppShell'
import LoadError from '@/components/shared/LoadError'
import DealProtection from '@/components/shared/DealProtection'
import { getNav } from '@/lib/nav'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileHref } from '@/lib/fileHref'
import { SECTOR_LABELS, getProductLabel, getUnitLabelLong } from '@/types'
import { useTranslation } from '@/i18n'
import { rfqRef, rfqDesc } from '@/lib/rfqName'
import { storedBuyerType, rememberBuyerType } from '@/lib/buyerType'
import AutoTr from '@/components/shared/AutoTr'
import { cleanArName } from '@/lib/displayName'
import Glyph from '@/components/shared/Glyph'
import { paymentTermsLabel } from '@/lib/paymentTerms'
import { showsVatBreakdown, totalLabel, vatTag, offerComparable, isIndependentOffer, sellerInvoiceLabel, sarLabel, priceBasisLabel } from '@/lib/vat'
import { Star, Check } from 'lucide-react'
import { installTotalOf } from '@/lib/installation'
import { daysText } from '@/lib/text'
import { waLink } from '@/lib/wa'
import { SourceShopBadge } from '@/components/rfq/SourceShop'
import { realtimeTopic } from '@/lib/realtimeTopic'
import { dealStage } from '@/lib/dealStage'
import { REVIEW_TAGS, splitReview } from '@/lib/reviews'

const SECTOR_I18N: Record<string, Record<string, string>> = {
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}
// the optional rating chips: stored in one form (Arabic) whatever the reader's language, so every
// review reads the same on the supplier's profile (UX-141)
const STAR_WORDS: Record<string, string[]> = {
  ar: ['ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'],
  en: ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'],
  ur: ['کمزور', 'قابلِ قبول', 'اچھا', 'بہت اچھا', 'بہترین'],
}

// The deal page (one page for the deal, UX-017): the deal steps on top for the buyer (DealProtection),
// then the deal document (purchase order for a business buyer, «تفاصيل الصفقة» for a home buyer) and
// Taseerak's quotation with the seller's invoice. The supplier sees the same documents in its own
// words and a link to manage the deal on its request page (UX-026).
export default function OrderDetailPage() {
  const { id } = useParams() // offer id
  const router = useRouter()
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'
  const SAR = sarLabel(locale) // one currency name per language (UX-140)
  const [offer, setOffer] = useState<any>(null)
  const [rfq, setRfq] = useState<any>(null)
  const [supplier, setSupplier] = useState<any>(null)
  const [contractor, setContractor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [myId, setMyId] = useState<any>(null)
  const [existingReview, setExistingReview] = useState<any>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewTags, setReviewTags] = useState<string[]>([])
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [awards, setAwards] = useState<any[]>([]) // ترسية بند-بند: مواد هذا المورد فقط (إن وُجدت)
  const [isNew, setIsNew] = useState(false) // arrived right after choosing the offer (?new=1)
  const [maxOther, setMaxOther] = useState(0) // the highest offer on the request (for «وفّرت»)
  const [home, setHome] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [chatErr, setChatErr] = useState('')
  const [justRated, setJustRated] = useState(false) // the rating card stays on top right after rating (UX-069)
  const [editingReview, setEditingReview] = useState(false) // «عدّل تقييمك» within 24 hours (round-4 UX-132)
  const [roleHint, setRoleHint] = useState('')

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: offerData, error: offerErr } = await supabase
        .from('offers').select('*').eq('id', id).maybeSingle()
      if (offerErr) throw offerErr
      if (!offerData) { setOffer(null); setLoading(false); return }
      setOffer(offerData)

      // one round for everything that only needs the offer (was 6 sequential requests, ~1 s each on mobile)
      setMyId(session.user.id)
      const [{ data: rfqData, error: rfqErr }, { data: supplierData }, { data: awardRows }, { data: rev }] = await Promise.all([
        supabase.from('rfqs').select('*').eq('id', offerData.rfq_id).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', offerData.supplier_id).maybeSingle(),
        // ترسية بند-بند: المواد المُرساة على هذا المورد في هذا الطلب
        supabase.from('rfq_item_awards').select('*')
          .eq('rfq_id', offerData.rfq_id).eq('supplier_id', offerData.supplier_id).order('item_index'),
        supabase.from('reviews').select('*').eq('offer_id', id).eq('reviewer_id', session.user.id).maybeSingle(),
      ])
      if (rfqErr) throw rfqErr
      setRfq(rfqData); setSupplier(supplierData); if (supplierData) setOffer({ ...offerData, supplier: supplierData }); setAwards(awardRows || [])
      if (rev) setExistingReview(rev)
      if (rfqData) {
        const buyer = rfqData.contractor_id === session.user.id
        const [{ data: contractorData }, { data: others }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', rfqData.contractor_id).maybeSingle(),
          buyer ? supabase.from('offers').select('id, total_price, vat_included, vat_status, status, item_prices').eq('rfq_id', rfqData.id) : Promise.resolve({ data: [] as any[] }),
        ])
        // round-6 UX-061: a team member cannot read the buyer's profile; the reveal RPC gives the name after the award
        let buyerRow: any = contractorData
        if (!buyer && !contractorData?.company_name_ar && !contractorData?.full_name) {
          try {
            const { data: c } = await supabase.rpc('get_rfq_contractor', { p_rfq_id: rfqData.id })
            const row: any = Array.isArray(c) ? c[0] : c
            if (row?.revealed) buyerRow = { ...(contractorData || {}), ...row }
          } catch {}
        }
        setContractor(buyerRow)
        // the profile is the source of truth (a deal link opened on a new device, UX-068)
        if (buyer && contractorData?.buyer_type) rememberBuyerType(contractorData.buyer_type)
        setHome(buyer && (contractorData?.buyer_type ? contractorData.buyer_type === 'individual' : storedBuyerType() === 'individual'))
        // «وفّرت»: only live offers that priced the same materials (round-4 UX-036), at least two of them
        const itemsOf = (o: any) => (Array.isArray(o?.item_prices) ? o.item_prices : []).filter((e: any) => Number(e?.total) > 0).map((e: any) => Number(e.item_index)).sort((a: number, b: number) => a - b).join(',')
        const mine = itemsOf(offerData)
        const cmp = ((others as any[]) || [])
          .filter((o: any) => !['withdrawn', 'cancelled', 'rejected'].includes(o.status) || o.id === offerData.id)
          .filter((o: any) => itemsOf(o) === mine)
          .map((o: any) => offerComparable(o))
        setMaxOther(cmp.length > 1 ? Math.max(...cmp) : 0)
      }
    } catch (e) {
      console.error('[orders/id] load failed:', e)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    try {
      const nw = new URLSearchParams(window.location.search).get('new') === '1'
      setIsNew(nw)
      // the success note shows once: a reload does not bring it back (round-4 UX-129)
      if (nw) { const u = new URL(window.location.href); u.searchParams.delete('new'); window.history.replaceState(null, '', u.pathname + u.search + u.hash) }
    } catch {}
    try { setRoleHint(localStorage.getItem('tsk_role_hint') || '') } catch {}
  }, [])

  // a live deal page (round-4 UX-004): the offer row updates in place, and coming back to the tab re-reads it
  const refreshDeal = useCallback(async () => {
    if (!id) return
    const { data } = await createClient().from('offers').select('*').eq('id', id).maybeSingle()
    if (data) setOffer((o: any) => (o ? { ...o, ...data } : o))
  }, [id])
  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    const ch = supabase.channel(realtimeTopic(`deal-${id}`))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers', filter: `id=eq.${id}` }, (payload: any) => {
        if (payload?.new) setOffer((o: any) => (o ? { ...o, ...payload.new } : o))
      })
      .subscribe()
    const onVis = () => { if (document.visibilityState === 'visible') refreshDeal() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => { supabase.removeChannel(ch); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [id, refreshDeal])

  // a link that ends in #deal or #rate opens at that part once the page has loaded (UX-059)
  useEffect(() => {
    if (loading || !offer) return
    const h = typeof window !== 'undefined' ? window.location.hash : ''
    if (h !== '#deal' && h !== '#rate') return
    const t = setTimeout(() => document.getElementById(h.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [loading, !!offer]) // eslint-disable-line react-hooks/exhaustive-deps

  // DealProtection's «قيّم المورد الآن» (after confirming receipt) jumps to #rate on this page: refresh
  // the receipt time so the rating form opens without a reload (UX-021).
  useEffect(() => {
    async function onHash() {
      if (window.location.hash !== '#rate' || !id) return
      const { data } = await createClient().from('offers').select('received_at, supplier_delivered_at, payment_status').eq('id', id).maybeSingle()
      if (data) setOffer((o: any) => (o ? { ...o, ...data } : o))
      setTimeout(() => document.getElementById('rate')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [id])

  async function submitReview() {
    if (!rating || !myId || !supplier) return
    setReviewSubmitting(true); setReviewMsg('')
    const supabase = createClient()
    // the optional chips are kept with the comment (no separate column)
    const tagsLine = reviewTags.length ? `نقاط القوة: ${REVIEW_TAGS.filter(t => reviewTags.includes(t.key)).map(t => t.ar).join('، ')}` : ''
    const comment = [tagsLine, reviewComment.trim()].filter(Boolean).join('\n') || null
    const saveErr = L('Could not save the rating. Check your connection and try again.', 'ریٹنگ محفوظ نہیں ہو سکی۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر حفظ التقييم. تحقّق من اتصالك وحاول مرة أخرى.')
    // «عدّل تقييمك» (round-4 UX-132): an update of the buyer's own review within 24 hours
    if (editingReview && existingReview?.id) {
      const { data: upd, error: uErr } = await supabase.from('reviews').update({ rating, comment }).eq('id', existingReview.id).eq('reviewer_id', myId).select('id')
      setReviewSubmitting(false)
      if (uErr || !upd?.length) { setReviewMsg(saveErr); return }
      setExistingReview({ ...existingReview, rating, comment }); setEditingReview(false); setJustRated(true)
      return
    }
    const { data: ins, error } = await supabase.from('reviews').insert({
      reviewer_id: myId,
      reviewed_id: supplier.id,
      offer_id: offer.id,
      rating,
      comment,
    }).select('*').maybeSingle()
    setReviewSubmitting(false)
    if (error) {
      setReviewMsg((error as any).code === '23505'
        ? L('You have already rated this deal.', 'آپ اس ڈیل کی ریٹنگ پہلے دے چکے ہیں۔', 'سبق أن قيّمت هذه الصفقة.')
        : saveErr)
      return
    }
    setExistingReview(ins || { rating, comment, created_at: new Date().toISOString() })
    setJustRated(true)
  }
  function startEditReview() {
    const sp = splitReview(existingReview?.comment)
    setRating(Number(existingReview?.rating) || 0); setReviewTags(sp.tags); setReviewComment(sp.text); setReviewMsg(''); setEditingReview(true)
  }

  // open (or create) the conversation with the other side of the deal
  async function openChat() {
    if (!offer?.rfq_id) return
    setChatBusy(true); setChatErr('')
    const { data, error } = await createClient().rpc('get_or_create_conversation', { p_rfq_id: offer.rfq_id, p_supplier_id: offer.supplier_id })
    setChatBusy(false)
    if (!error && data) router.push(`/messages?c=${data}`)
    // say it failed instead of opening an empty inbox (UX-135)
    else setChatErr(L('Could not open the conversation. Check your connection and try again.', 'گفتگو نہیں کھل سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر فتح المحادثة. تحقّق من الاتصال وحاول مرة أخرى.'))
  }

  if (loading) return <PageLoader />

  // round-6 UX-061: a supplier whose load failed keeps the supplier menu
  if (loadFailed) return (
    <AppShell title={L('Deal', 'ڈیل', 'الصفقة')} nav={roleHint === 'supplier' ? getNav('supplier', locale, '/supplier/deals') : getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-xl mx-auto mt-6"><LoadError onRetry={() => { setLoading(true); load() }} /></div>
    </AppShell>
  )

  // a supplier who opens a deal it cannot see gets the supplier menu and its own deals (round-4 UX-086)
  const sellerSide = roleHint === 'supplier'
  if (!offer || !rfq) return (
    <AppShell title={L('Deal', 'ڈیل', 'الصفقة')} nav={sellerSide ? getNav('supplier', locale, '/supplier/deals') : getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
        <div className="text-4xl mb-2 text-[#0B2438]"><Glyph e="🔎" /></div>
        <p className="text-gray-700 font-semibold mb-4">{L('This deal was not found, or you do not have access to it.', 'یہ ڈیل نہیں ملی، یا آپ کو اس تک رسائی نہیں ہے۔', 'لم نجد هذه الصفقة، أو لا تملك صلاحية الاطلاع عليها.')}</p>
        <Link href={sellerSide ? '/supplier/deals' : '/contractor/orders'} className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('My deals', 'میری ڈیلز', 'صفقاتي')}</Link>
      </div>
    </AppShell>
  )

  const FWD = dir === 'rtl' ? '←' : '→', BACK = dir === 'rtl' ? '→' : '←'
  const isBuyer = rfq.contractor_id === myId

  // the offer is no longer a deal (cancelled, withdrawn or never chosen): no document to print (UX-059)
  if (offer.status !== 'accepted') return (
    <AppShell title={L('Deal', 'ڈیل', 'الصفقة')} nav={isBuyer ? getNav('contractor', locale, '/contractor/rfqs') : getNav('supplier', locale, '/supplier/deals')} dir={dir}>
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl p-8 sm:p-10 text-center border border-gray-100 shadow-sm">
        <div className="text-4xl mb-2 text-[#0B2438]"><Glyph e="📄" /></div>
        <p className="text-gray-800 font-bold mb-1">{L('This deal is no longer active.', 'یہ ڈیل اب فعال نہیں ہے۔', 'لم تعد هذه الصفقة سارية.')}</p>
        <p className="text-sm text-gray-600 mb-4">{isBuyer
          ? L('The offer was cancelled or is no longer chosen. You can review the request and its offers.', 'آفر منسوخ ہو گئی یا اب منتخب نہیں ہے۔ آپ درخواست اور اس کی آفرز دیکھ سکتے ہیں۔', 'أُلغي العرض أو لم يعد مختاراً. يمكنك مراجعة الطلب وعروضه.')
          // round-6 UX-061: the supplier's own words
          : L('The offer was cancelled or is no longer chosen. You can review the request and your offer.', 'آفر منسوخ ہو گئی یا اب منتخب نہیں ہے۔ آپ درخواست اور اپنی آفر دیکھ سکتے ہیں۔', 'أُلغي العرض أو لم يعد مختاراً. يمكنك مراجعة الطلب وعرضك.')}</p>
        <Link href={isBuyer ? `/contractor/rfq/${rfq.id}` : `/supplier/dashboard/rfq/${rfq.id}`} className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>
          {L('Open the request', 'درخواست کھولیں', 'افتح الطلب')}
        </Link>
      </div>
    </AppShell>
  )
  const isSupplierView = !isBuyer
  const backHref = isBuyer ? '/contractor/orders' : '/supplier/deals'
  const manageHref = `/supplier/dashboard/rfq/${offer.rfq_id}#deal`
  // a home buyer reads plain words (UX-008): cleaned Arabic names, full unit names
  const pname = (n: any) => (home && locale === 'ar' ? cleanArName(String(n || '')) : getProductLabel(n, locale))
  // round-6 UX-061: the buyer's name, never «—»
  const buyerName = contractor?.company_name_ar || contractor?.full_name || L('The buyer', 'خریدار', 'المشتري')

  const poNumber = `PO-${offer.id.slice(0, 8).toUpperCase()}`
  const ref = rfqRef(rfq, locale)
  // the deal's number: a home buyer sees the request number, never «PO-…» (UX-010)
  const dealNo = home && ref ? ref : poNumber
  const docTitle = home ? L('Deal details', 'ڈیل کی تفصیل', 'تفاصيل الصفقة') : L('Purchase order', 'پرچیز آرڈر', 'أمر شراء')
  // Gregorian calendar pinned to KSA time so the printed date matches the QR (B3)
  const date = new Date(offer.accepted_at || offer.created_at).toLocaleDateString(dloc, { timeZone: 'Asia/Riyadh' })
  // المواد المسعّرة بند-بند. عند الترسية بند-بند نعرض فقط مواد هذا المورد المُرساة عليه،
  // وإلا كل بنود العرض (طلب متعدّد المواد) — تُعرض كأسطر في أمر الشراء والفاتورة.
  const hasAwards = Array.isArray(awards) && awards.length > 0
  const ipRaw = hasAwards
    ? awards.map((a: any) => ({ product_name: a.item_key, sector: rfq?.items?.[a.item_index]?.sector, quantity: a.quantity, unit: a.unit, unit_price: a.unit_price, total: a.total, specification: rfq?.items?.[a.item_index]?.specification, warranty: (Array.isArray(offer.item_prices) ? offer.item_prices : []).find((e: any) => e.item_index === a.item_index)?.warranty, install: installTotalOf((Array.isArray(offer.item_prices) ? offer.item_prices : []).find((e: any) => e.item_index === a.item_index)) }))
    : (Array.isArray(offer.item_prices) ? offer.item_prices : [])
  // a partial award's delivery/other charges wait for the supplier's confirmation (191): not billed yet
  const extrasPending = !!offer.extras_pending
  const allExtras = Array.isArray(offer.extra_charges) ? offer.extra_charges : []
  const _ex = !extrasPending ? allExtras : []
  const vatIncl = !!offer.vat_included
  // a seller without a VAT number (offers.vat_status): amounts are final, no VAT is split out or added
  const vatBreak = showsVatBreakdown(offer)
  const toNet = (n: any) => (vatBreak && vatIncl ? (Number(n) || 0) / 1.15 : (Number(n) || 0))
  // Owner 2026-11-23 (round-5 UX-020): EVERY buyer reads each line as what they pay, VAT included, so the lines add
  // up to the total; the seller's own view keeps the net (pre-VAT) breakdown.
  const shown = (n: any) => (isBuyer && vatBreak ? (Number(n) || 0) * 1.15 : Number(n) || 0)
  // ZATCA: every displayed line is ex-VAT so the amount column sums to the pre-VAT subtotal, and
  // extra charges (delivery/installation/fees) show as their own line items — not hidden in the total (B1).
  // «مع التركيب»: a line whose price includes installation shows the material and the installation
  // as two rows (installation = install_total; material = the line's total minus it). Sum unchanged.
  // A one-line offer without item_prices: total_price already holds the extra charges, so they are taken
  // out of the material line (they were counted twice, UX-018).
  const extrasSum = allExtras.reduce((s: number, e: any) => s + (Number(e?.amount) || 0), 0)
  const rows: any[] = (ipRaw.length > 0
    ? ipRaw.flatMap((it: any) => {
        const inst = Math.min(Number(it.total) || 0, it.install != null ? Number(it.install) || 0 : installTotalOf(it))
        const row = { product_name: it.product_name, warranty: it.warranty || null, sector: it.sector, specification: it.specification, notes: it.notes, attachment_url: it.attachment_url, attachment_name: it.attachment_name, quantity: it.quantity, unit: it.unit, unitNet: Number(it.unit_price) > 0 ? toNet(it.unit_price) : null, net: toNet((Number(it.total) || 0) - inst) }
        return inst > 0 ? [row, { product_name: it.product_name, installOf: it.product_name, sector: it.sector, quantity: '', unit: '', unitNet: null, net: toNet(inst) }] : [row]
      })
    : [{ product_name: rfq.product_name, sector: rfq.sector, specification: rfq.specification, quantity: rfq.quantity, unit: rfq.unit, unitNet: offer.unit_price ? toNet(offer.unit_price) : null, net: toNet(Math.max(0, (Number(offer.total_price) || 0) - extrasSum)) }])
  for (const e of _ex) rows.push({ product_name: e.label || L('Extra charges', 'اضافی چارجز', 'رسوم إضافية'), sector: null, quantity: '', unit: '', unitNet: null, net: toNet(e.amount), isExtra: true })
  const dealNet = rows.reduce((s: number, r: any) => s + (Number(r.net) || 0), 0)
  const dealVat = vatBreak ? dealNet * 0.15 : 0
  const dealGross = dealNet + dealVat
  const money = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${SAR}`
  const grandLabel = home ? L('The amount you pay', 'آپ کی ادا کردہ رقم', 'المبلغ الذي تدفعه') : totalLabel(offer, locale)
  const showSector = !home
  const saved = isNew && !hasAwards && maxOther > 0 ? maxOther - offerComparable(offer) : 0
  // the supplier side: the deal's current stage, and whether this viewer is a team member (round-4 UX-086)
  const supStage = dealStage(offer, 'supplier', locale)
  const teamMember = !isBuyer && !!myId && myId !== offer.supplier_id
  // «اطلب مرة أخرى» from a partly awarded deal: only this supplier's materials (round-4 UX-131)
  const againHref = `/contractor/rfq/quick?from=${offer.rfq_id}${hasAwards ? `&items=${awards.map((a: any) => a.item_index).join(',')}` : ''}`
  const pickupDeal = rfq.delivery_required === false
  // round-6 UX-001: the expected delivery day and «أضف إلى التقويم» live once, in the deal steps
  // (DealProtection, via dealStage.expectedDeliveryDate); the terms card keeps only «مدة التوصيل».
  // round-6 UX-029: a deal the admins cancelled
  const dealClosed = !!offer.deal_closed_at
  const closedOn = dealClosed ? new Date(offer.deal_closed_at).toLocaleDateString(dloc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' }) : ''
  // round-5 UX-014/UX-070: the public page exists only for a company or shop seller that is not banned
  const supplierPublic = !!supplier?.id && !isIndependentOffer(offer) && !supplier?.is_banned && !supplier?.banned_at
  const supplierHref = supplier?.id ? `/suppliers/${supplier.id}?from=${encodeURIComponent(`/contractor/orders/${offer.id}`)}` : ''
  const supplierPlace = supplier?.city || supplier?.region || ''
  const reviewParts = splitReview(existingReview?.comment)
  const canEditReview = !!existingReview?.id && !!existingReview?.created_at && Date.now() - new Date(existingReview.created_at).getTime() < 24 * 3600000
  // the stars move with the arrow keys (roving tabindex, round-4 UX-116)
  const onStarKey = (e: any, n: number) => {
    const fwd = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight', back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    let v = 0
    if (e.key === fwd || e.key === 'ArrowUp') v = Math.min(5, n + 1)
    else if (e.key === back || e.key === 'ArrowDown') v = Math.max(1, n - 1)
    if (!v) return
    e.preventDefault(); setRating(v)
    setTimeout(() => (document.getElementById(`star-${v}`) as HTMLButtonElement | null)?.focus(), 0)
  }
  const rowName = (it: any) => it.installOf ? `${L('Installation', 'تنصیب', 'تركيب')}: ${pname(it.installOf)}` : it.isExtra ? it.product_name : pname(it.product_name)
  // round-6 UX-099: quantities with thousands separators
  const qtyText = (it: any) => it.quantity === '' || it.quantity == null ? '—' : `${Number.isFinite(Number(it.quantity)) ? Number(it.quantity).toLocaleString('en-US', { maximumFractionDigits: 3 }) : it.quantity} ${getUnitLabelLong(it.unit, locale)}`

  // the seller's invoice, named by who the seller is (UX-025)
  const independent = isIndependentOffer(offer)
  // round-6 UX-099: one name, the same as the deal steps («فاتورة المورد» for a home buyer)
  const invLabel = home && !independent ? L('The supplier’s invoice', 'سپلائر کی انوائس', 'فاتورة المورد') : sellerInvoiceLabel(offer, locale, isBuyer ? 'buyer' : 'supplier')
  const disclosure = independent
    ? (isBuyer
      // the source shop may not be VAT-registered: never promise a «tax» invoice from it (round-4 UX-069)
      ? L('Taseerak’s deal statement of the agreed amount, not a tax invoice. The invoice is issued by the source shop in your name and attached below.', 'تسعیرک کا ڈیل بیان جو طے شدہ رقم دکھاتا ہے، ٹیکس انوائس نہیں۔ انوائس ماخذ دکان آپ کے نام جاری کرتی ہے اور نیچے منسلک ہوتی ہے۔', 'بيان من تسعيرك بالمبلغ المتفق عليه، وليس فاتورة ضريبية. الفاتورة يصدرها المحل المصدر باسمك، وتُرفق أدناه.')
      : L('Taseerak’s deal statement of the agreed amount, not a tax invoice. The invoice is issued by the source shop in the buyer’s name; you attach it in the deal steps.', 'تسعیرک کا ڈیل بیان، ٹیکس انوائس نہیں۔ انوائس ماخذ دکان خریدار کے نام جاری کرتی ہے؛ آپ اسے ڈیل کے مراحل میں منسلک کرتے ہیں۔', 'بيان من تسعيرك بالمبلغ المتفق عليه، وليس فاتورة ضريبية. الفاتورة يصدرها المحل المصدر باسم المشتري، وترفقها أنت من خطوات الصفقة.'))
    : vatBreak
      ? L('Taseerak’s deal statement of the agreed amount, not a tax invoice. The tax invoice is issued by the supplier and attached below.', 'تسعیرک کا ڈیل بیان جو طے شدہ رقم دکھاتا ہے، ٹیکس انوائس نہیں۔ ٹیکس انوائس سپلائر جاری کرتا ہے اور نیچے منسلک ہوتی ہے۔', 'بيان من تسعيرك بالمبلغ المتفق عليه، وليس فاتورة ضريبية. الفاتورة الضريبية يصدرها المورد، وتُرفق أدناه.')
      : L('Taseerak’s deal statement of the agreed amount. The supplier is not VAT-registered, so the price is final and the supplier attaches a sales invoice (not a tax invoice) below.', 'تسعیرک کا ڈیل بیان۔ سپلائر VAT میں رجسٹرڈ نہیں، اس لیے قیمت حتمی ہے اور وہ نیچے سیلز انوائس (ٹیکس انوائس نہیں) منسلک کرتا ہے۔', 'بيان من تسعيرك بالمبلغ المتفق عليه. المورد غير مسجّل في ضريبة القيمة المضافة، فالسعر نهائي، ويرفق فاتورة بيع (ليست فاتورة ضريبية) أدناه.')

  // the other side's phone (after the choice) and a WhatsApp text in plain words for a home buyer
  const otherPhone = isBuyer ? (supplier?.contact_phone || supplier?.phone) : (contractor?.contact_phone || contractor?.phone)
  const waText = isBuyer
    ? (home && rfq.ref_no
      ? L(`About my deal on request no. ${rfq.ref_no} on Taseerak`, `تسعیرک پر درخواست نمبر ${rfq.ref_no} کی میری ڈیل کے بارے میں`, `بخصوص صفقتي على الطلب رقم ${rfq.ref_no} في منصة تسعيرك`)
      : L(`Regarding purchase order ${poNumber} on Taseerak`, `تسعیرک پر پرچیز آرڈر ${poNumber} کے بارے میں`, `بخصوص أمر الشراء ${poNumber} في منصة تسعيرك`))
    : (rfq.ref_no
      ? L(`Regarding your request no. ${rfq.ref_no} on Taseerak`, `تسعیرک پر آپ کی درخواست نمبر ${rfq.ref_no} کے بارے میں`, `بخصوص طلبك رقم ${rfq.ref_no} في منصة تسعيرك`)
      : L(`Regarding your request on Taseerak`, `تسعیرک پر آپ کی درخواست کے بارے میں`, `بخصوص طلبك في منصة تسعيرك`))
  const wa = waLink(otherPhone, waText)

  function handlePrint() {
    // the saved PDF's name: «تفاصيل الصفقة …» for a home buyer, «أمر شراء PO-…» otherwise (one name, UX-055)
    const prev = document.title
    document.title = `${docTitle} ${dealNo}`
    window.print()
    setTimeout(() => { document.title = prev }, 500)
  }

  const phoneLine = (p: any) => !p ? null : (
    <div className="text-sm text-gray-600">{L('Mobile:', 'موبائل:', 'جوال:')} <a href={`tel:${String(p).replace(/[^0-9+]/g, '')}`} dir="ltr" className="font-semibold text-[#0B2438] hover:underline">{p}</a></div>
  )
  const disputeOpen = offer.dispute_status === 'open'
  const needsRating = isBuyer && offer.status === 'accepted' && !!offer.received_at && !existingReview && !disputeOpen && !dealClosed


  return (
    <AppShell title={L('Deal', 'ڈیل', 'الصفقة')} nav={isBuyer ? getNav('contractor', locale, '/contractor/rfqs') : getNav('supplier', locale, '/supplier/deals')} dir={dir}>
    <div className="print:bg-white print:p-0" dir={dir}>
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        {/* Actions - hidden in print */}
        <div className="flex items-center justify-between gap-2 flex-wrap mt-4 print:hidden">
          <Link href={backHref} className="inline-flex items-center min-h-[44px] text-sm font-semibold text-gray-600 hover:text-gray-800"><span aria-hidden="true">{BACK}</span>&nbsp;{L('My deals', 'میری ڈیلز', 'صفقاتي')}</Link>
          <div className="flex items-center gap-2 flex-wrap">
            {isBuyer && offer?.rfq_id && (
              <Link href={againHref}
                className="inline-flex items-center gap-1.5 min-h-[44px] border border-[#0B2438] text-[#0B2438] px-4 rounded-xl text-sm font-semibold hover:bg-[#0B2438]/5 transition-colors">
                <Glyph e="🔁" /> {L('Request again', 'دوبارہ منگوائیں', 'اطلب مرة أخرى')}
              </Link>
            )}
            {/* round-6 UX-099: printing is a secondary action, outline only; UX-029: a cancelled deal prints as such */}
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 min-h-[44px] border border-[#0B2438] text-[#0B2438] bg-white px-4 rounded-xl text-sm font-semibold hover:bg-[#0B2438]/5 transition-colors">
              <Glyph e="🖨" /> {dealClosed ? L('Print a cancelled copy', 'منسوخ نقل پرنٹ کریں', 'طباعة نسخة ملغاة') : home ? L('Print deal details', 'ڈیل کی تفصیل پرنٹ کریں', 'طباعة تفاصيل الصفقة') : L('Print purchase order', 'پرچیز آرڈر پرنٹ کریں', 'طباعة أمر الشراء')}
            </button>
          </div>
        </div>

        {/* round-6 UX-029: a grey bar that also prints, and a «ملغاة» watermark on the printed copy */}
        {dealClosed && (
          <div role="status" className="rounded-xl bg-gray-100 border border-gray-300 text-gray-800 text-sm font-semibold px-4 py-3 leading-relaxed print:border-gray-500">
            <Glyph e="ℹ" /> {L(`This deal was cancelled by an admin decision on ${closedOn}.`, `یہ ڈیل ${closedOn} کو انتظامیہ کے فیصلے سے منسوخ کر دی گئی۔`, `أُلغيت هذه الصفقة بقرار الإدارة بتاريخ ${closedOn}.`)}
            {offer.deal_closed_reason ? <> <span dir="auto">{L('Reason: ', 'وجہ: ', 'السبب: ')}{offer.deal_closed_reason}</span></> : null}
          </div>
        )}
        {dealClosed && (
          <div aria-hidden="true" className="hidden print:flex fixed inset-0 items-center justify-center pointer-events-none z-50">
            <span className="text-[120px] font-extrabold text-gray-400/40" style={{ transform: 'rotate(-30deg)' }}>{L('CANCELLED', 'منسوخ', 'ملغاة')}</span>
          </div>
        )}

        {/* right after the choice: what happens next (UX-017) */}
        {isNew && isBuyer && (
          <div className="print:hidden rounded-2xl border border-[#0F6E56]/30 bg-[#0F6E56]/5 p-4 sm:p-5" role="status">
            <div className="font-bold text-[#0F6E56] flex items-center gap-2"><Glyph e="✅" /> {L(`You chose ${supplier?.company_name_ar || 'the supplier'}’s offer.`, `آپ نے ${supplier?.company_name_ar || 'سپلائر'} کی آفر منتخب کر لی۔`, `تمّ اختيار عرض ${supplier?.company_name_ar || 'المورد'}.`)}</div>
            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{offer.payment_terms === 'advance'
              ? L('Next step: pay the supplier the advance payment as you agreed, then record it here; after that the supplier prepares your order.', 'اگلا مرحلہ: طے شدہ پیشگی ادائیگی سپلائر کو کریں، پھر یہاں درج کریں؛ اس کے بعد سپلائر آپ کا آرڈر تیار کرے گا۔', 'الخطوة التالية: ادفع الدفعة المقدّمة للمورد كما اتفقتما، ثم سجّلها هنا، وبعدها يجهّز المورد طلبك.')
              : pickupDeal
                ? L('The supplier prepares your order for pickup from their shop; you will be notified when it is ready.', 'سپلائر آپ کا آرڈر اپنی دکان سے وصولی کے لیے تیار کرے گا؛ تیار ہونے پر آپ کو اطلاع ملے گی۔', 'يجهّز المورد طلبك للاستلام من محله، وسيصلك إشعار عندما يكون جاهزاً.')
                : L('Next step: the supplier prepares your order and confirms delivery; you will get a message then.', 'اگلا مرحلہ: سپلائر آپ کا آرڈر تیار کر کے ڈیلیوری کی تصدیق کرے گا، اور تب آپ کو پیغام ملے گا۔', 'الخطوة التالية: يجهّز المورد طلبك ويؤكّد التوصيل، وستصلك رسالة عند ذلك.')}</p>
            {saved >= 1 && <p className="text-sm font-bold text-[#8F6820] mt-1.5">{L(`You saved ${money(saved)} compared with the highest offer on the same materials.`, `انہی اشیاء پر سب سے زیادہ آفر کے مقابلے میں آپ نے ${money(saved)} بچائے۔`, `وفّرت ${money(saved)} مقارنة بأعلى عرض على المواد نفسها.`)}</p>}
          </div>
        )}

        {extrasPending && (
          <div className="print:hidden rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            <Glyph e="🚚" /> {isBuyer
              ? L('You chose only some of this supplier’s materials, so they are confirming the delivery and other charges for them. The deal total will include them once confirmed; you will be notified.', 'آپ نے اس سپلائر کا کچھ سامان ہی چنا ہے، اس لیے وہ ان کے ڈیلیوری اور دیگر چارجز کی تصدیق کر رہا ہے۔ تصدیق کے بعد یہ ڈیل کی کل رقم میں شامل ہوں گے اور آپ کو اطلاع ملے گی۔', 'اخترت بعض مواد هذا المورد فقط، لذا يؤكّد رسوم التوصيل والرسوم الإضافية لها. ستُضاف إلى إجمالي الصفقة بعد تأكيده، وستصلك رسالة بذلك.')
              : <>{L('The buyer chose only some of your materials. The delivery and other charges do not show in this document until you confirm them.', 'خریدار نے آپ کا کچھ سامان ہی چنا ہے۔ ڈیلیوری اور دیگر چارجز اس دستاویز میں تب تک نظر نہیں آئیں گے جب تک آپ ان کی تصدیق نہ کریں۔', 'اختار المشتري بعض موادك فقط. رسوم التوصيل والرسوم الإضافية لا تظهر في هذا المستند حتى تؤكّدها.')} <Link href={manageHref} className="font-bold underline">{L('Confirm them', 'تصدیق کریں', 'أكّدها الآن')}</Link></>}
          </div>
        )}

        {/* the supplier manages the deal on its request page (UX-026) */}
        {/* the subtitle is the deal's current stage; a finished deal or a team member gets a navy link (round-4 UX-086) */}
        {isSupplierView && offer.status === 'accepted' && (supStage.done || teamMember ? (
          <Link href={manageHref} className="print:hidden flex items-center justify-between gap-3 rounded-2xl px-5 py-4 min-h-[44px] border border-[#0B2438] bg-white text-[#0B2438] hover:bg-[#0B2438]/5">
            <span className="min-w-0">
              <span className="block font-bold">{teamMember ? L('Follow the deal', 'ڈیل دیکھیں', 'تابع الصفقة') : L('View the deal steps', 'ڈیل کے مراحل دیکھیں', 'عرض خطوات الصفقة')}</span>
              <span className="block text-sm font-semibold text-gray-600">{teamMember ? L('The account owner handles the invoice and delivery', 'انوائس اور ڈیلیوری اکاؤنٹ کا مالک سنبھالتا ہے', 'يدير صاحب الحساب الفاتورة والتسليم') : supStage.label}</span>
            </span>
            <span aria-hidden="true" className="text-xl font-bold">{FWD}</span>
          </Link>
        ) : (
          <Link href={manageHref} className="print:hidden flex items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-all hover:shadow" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', color: '#071827' }}>
            <span className="min-w-0">
              <span className="block font-bold">{L('Manage the deal', 'ڈیل سنبھالیں', 'إدارة الصفقة')}</span>
              <span className="block text-sm font-semibold opacity-80">{supStage.label}</span>
            </span>
            <span aria-hidden="true" className="text-xl font-bold">{FWD}</span>
          </Link>
        ))}

        {/* the deal steps (delivery, receipt, payment, «أبلغ عن مشكلة») on top of the deal page (UX-017) */}
        {isBuyer && offer.status === 'accepted' && (
          <div className="print:hidden">
            <DealProtection
              offer={offer}
              isContractor={true}
              isSupplier={false}
              otherParty={supplier}
              poNumber={dealNo}
              myId={myId}
              amount={dealGross}
              rfqRefNo={rfq.ref_no}
              isHome={home}
              hideContact
              pickup={pickupDeal}
              pickupPlace={supplierPlace}
              onChange={(o: any) => setOffer((prev: any) => (prev ? { ...prev, ...o } : prev))}
            />
          </div>
        )}

        {/* the other side: WhatsApp or message (UX-104). The buyer's WhatsApp button is in the deal
            steps above, so it shows once (UX-054). */}
        {/* round-6 UX-061: a company team member does not message the buyer; the owner does */}
        {offer.status === 'accepted' && teamMember && (
          <p className="print:hidden text-sm text-gray-600">{L('The account owner contacts the buyer on this deal.', 'اس ڈیل میں اکاؤنٹ کا مالک خریدار سے رابطہ کرتا ہے۔', 'يتواصل صاحب الحساب مع المشتري في هذه الصفقة.')}</p>
        )}
        {/* round-6 UX-099: WhatsApp and «راسل المورد» side by side (the deal steps no longer repeat WhatsApp) */}
        {offer.status === 'accepted' && !teamMember && (
          <div className="print:hidden flex flex-wrap gap-2">
            {wa && !dealClosed && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5">
                <Glyph e="💬" /> {isBuyer ? L('WhatsApp the supplier', 'سپلائر کو واٹس ایپ', 'واتساب المورد') : L('WhatsApp', 'واٹس ایپ', 'واتساب')}
              </a>
            )}
            <button type="button" onClick={openChat} disabled={chatBusy}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5 disabled:opacity-50">
              <Glyph e="✉" /> {isBuyer ? L('Message the supplier', 'سپلائر کو پیغام', 'راسل المورد') : L('Message the buyer', 'خریدار کو پیغام', 'راسل المشتري')}
            </button>
            {chatErr && <p role="alert" className="basis-full text-sm text-red-700">{chatErr}</p>}
          </div>
        )}

        {/* Purchase Order Document */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-2 print:shadow-none print:border-none print:rounded-none">

          {/* Header — printable: browsers drop the background, so the print colours are navy/dark gold on white (UX-056) */}
          <div className="bg-gradient-to-l from-[#071827] via-[#0B2438] to-[#123B53] text-white p-4 sm:p-8 border-b-2 border-[#D4A543] print:bg-none print:bg-white print:text-[#071827] print:px-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{docTitle}</h1>
                {!home && locale !== 'en' && <p className="text-[#F5C55B] print:text-[#9D7425] text-sm mt-1">Purchase Order</p>}
                <p className="text-[#F5C55B] print:text-[#9D7425] text-sm mt-1" dir="auto">{rfqDesc(rfq, locale, hasAwards ? awards.length : undefined)}</p>
              </div>
              <div className="text-end">
                {/* round-6 UX-099: a home buyer's number is the request number, named once */}
                <div className="text-sm text-[#F5C55B] print:text-[#9D7425]">{home && rfq.ref_no ? L('Request no.', 'درخواست نمبر', 'رقم الطلب') : home ? L('Deal no.', 'ڈیل نمبر', 'رقم الصفقة') : L('Order no.', 'آرڈر نمبر', 'رقم الأمر')}</div>
                <div className="text-xl font-bold" dir="auto">{home && rfq.ref_no ? String(rfq.ref_no) : dealNo}</div>
                <div className="text-sm text-[#F5C55B] print:hidden mt-1">{L('Date:', 'تاریخ:', 'التاريخ:')} {date}</div>
                {/* the printed copy names what the date is; the on-screen badge is hidden in print (round-4 UX-129) */}
                <div className="hidden print:block text-sm text-[#9D7425] mt-1">{home ? L('Chosen on:', 'انتخاب کی تاریخ:', 'تاريخ الاختيار:') : L('Approved on:', 'منظوری کی تاریخ:', 'تاريخ الاعتماد:')} {date}</div>
                {!home && ref && <div className="text-sm text-[#F5C55B] print:text-[#9D7425] mt-1">{ref.startsWith('RFQ-') ? <>{L('Request:', 'درخواست:', 'الطلب:')} <span dir="ltr">{ref}</span></> : ref}</div>}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-8 border-b border-gray-100">
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">{L('Buyer', 'خریدار', 'المشتري')}</div>
              <div className="font-bold text-gray-900">{buyerName}</div>
              {contractor?.commercial_registration && (
                <div className="text-sm text-gray-600 mt-1">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {contractor.commercial_registration}</div>
              )}
              {phoneLine(contractor?.contact_phone || contractor?.phone)}
              {(contractor?.city || contractor?.region) && <div className="text-sm text-gray-600">{contractor.city || contractor.region}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">{L('Supplier', 'سپلائر', 'المورد')}</div>
              {/* the supplier's public page (round-4 UX-189) */}
              {supplierPublic && isBuyer
                ? <Link href={supplierHref} className="font-bold text-gray-900 hover:underline print:no-underline">{supplier?.company_name_ar || '—'}</Link>
                : <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>}
              {supplier?.commercial_registration && (
                <div className="text-sm text-gray-600 mt-1">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {supplier.commercial_registration}</div>
              )}
              {phoneLine(supplier?.contact_phone || supplier?.phone)}
              {offer?.id && <SourceShopBadge offerId={offer.id} locale={locale} />}
              {(supplier?.city || supplier?.region) && <div className="text-sm text-gray-600">{supplier.city || supplier.region}</div>}
              {supplier?.national_short_address && (
                <div className="text-sm text-gray-600">{L('Short national address:', 'مختصر قومی پتہ:', 'العنوان الوطني المختصر:')} <span className="font-mono" dir="ltr">{supplier.national_short_address}</span></div>
              )}
              {supplier?.building_number && supplier?.street_name && (
                <div className="text-xs text-gray-500">
                  {supplier.building_number}, {supplier.street_name}{supplier.district ? `, ${supplier.district}` : ''}{supplier.postal_code ? `, ${supplier.postal_code}` : ''}
                </div>
              )}
              {supplier?.latitude && supplier?.longitude && (
                <a href={`https://www.google.com/maps?q=${supplier.latitude},${supplier.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center min-h-[44px] text-sm text-[#8F6820] hover:underline print:hidden">
                  <Glyph e="🗺" />&nbsp;{L('View location on map', 'نقشے پر مقام دیکھیں', 'عرض الموقع على الخريطة')} <span aria-hidden="true">&nbsp;{FWD}</span>
                </a>
              )}
            </div>
          </div>

          {/* خصائص المنتج المعروض + الملف المرفق */}
          {(offer?.attributes || offer?.attachment_url) && (
            <div className="px-4 sm:px-8 py-4 border-b border-gray-100">
              {offer?.attributes && Object.keys(offer.attributes).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-gray-500 mb-2">{L('Product attributes', 'پروڈکٹ کی خصوصیات', 'خصائص المنتج')}</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(offer.attributes).map(([k, v]: any) => (
                      <span key={k} className="text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <strong className="text-gray-700">{k}:</strong> <span className="text-gray-600">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {offer?.attachment_url && (
                <a href={fileHref(offer.attachment_url)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-[#8F6820] hover:underline print:hidden">
                  <Glyph e="📎" /> {offer.attachment_name || L('Product catalog', 'پروڈکٹ کیٹلاگ', 'كتالوج المنتج')} <span aria-hidden="true">{FWD}</span>
                </a>
              )}
            </div>
          )}

          {/* Items — a table on wide screens and in print, a list of cards on phones (UX-104) */}
          <div className="p-4 sm:p-8 border-b border-gray-100">
            <table className="w-full hidden sm:table print:table">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-start text-xs font-bold text-gray-600 pb-3 w-8">#</th>
                  <th className="text-start text-xs font-bold text-gray-600 pb-3">{L('Item', 'آئٹم', 'الصنف')}</th>
                  {showSector && <th className="text-start text-xs font-bold text-gray-600 pb-3">{L('Sector', 'شعبہ', 'القطاع')}</th>}
                  <th className="text-start text-xs font-bold text-gray-600 pb-3">{L('Quantity', 'مقدار', 'الكمية')}</th>
                  <th className="text-start text-xs font-bold text-gray-600 pb-3">{L('Unit price', 'فی یونٹ قیمت', 'سعر الوحدة')}{isBuyer ? <span className="block font-semibold text-gray-500">{priceBasisLabel(offer, locale)}</span> : vatBreak ? <span className="block font-semibold text-gray-500">{L('before VAT', 'VAT سے پہلے', 'قبل الضريبة')}</span> : null}</th>
                  <th className="text-start text-xs font-bold text-gray-600 pb-3">{vatBreak && !isBuyer ? L('Total (before VAT)', 'کل (VAT سے پہلے)', 'الإجمالي (قبل الضريبة)') : L('Total', 'کل', 'الإجمالي')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it: any, idx: any) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-gray-500">{idx + 1}</td>
                    <td className="py-4">
                      <div className="font-semibold text-gray-900" dir="auto">{rowName(it)}</div>
                      {(it.specification || it.notes) && <div className="text-xs text-gray-500 mt-0.5">{it.specification || it.notes}</div>}
                      {it.warranty && <div className="text-xs text-gray-600 mt-0.5"><Glyph e="🛡" /> {L('Warranty:', 'وارنٹی:', 'الضمان:')} {it.warranty}</div>}
                      {it.attachment_url && (
                        <a href={fileHref(it.attachment_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] text-xs text-[#8F6820] hover:underline print:hidden"><Glyph e="📎" /> {it.attachment_name || L('Specs file', 'اسپیسیفکیشن فائل', 'ملف المواصفات')}</a>
                      )}
                    </td>
                    {showSector && <td className="py-4 text-sm text-gray-600">{it.sector ? ((locale !== 'ar' && SECTOR_I18N[locale]?.[it.sector]) || (SECTOR_LABELS as any)[it.sector] || it.sector) : '—'}</td>}
                    <td className="py-4 text-sm text-gray-600">{qtyText(it)}</td>
                    <td className="py-4 text-sm text-gray-600">{Number(it.unitNet) > 0 ? money(shown(it.unitNet)) : '—'}</td>
                    <td className="py-4 font-bold text-gray-900">{money(shown(it.net))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="sm:hidden print:hidden divide-y divide-gray-100">
              {rows.map((it: any, idx: any) => (
                <li key={idx} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900" dir="auto">{rowName(it)}</div>
                      {(it.specification || it.notes) && <div className="text-xs text-gray-500 mt-0.5">{it.specification || it.notes}</div>}
                      {it.warranty && <div className="text-xs text-gray-600 mt-0.5"><Glyph e="🛡" /> {L('Warranty:', 'وارنٹی:', 'الضمان:')} {it.warranty}</div>}
                      <div className="text-sm text-gray-600 mt-0.5">
                        {qtyText(it)}{Number(it.unitNet) > 0 ? ` × ${money(shown(it.unitNet))}` : ''}
                      </div>
                      {it.attachment_url && (
                        <a href={fileHref(it.attachment_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] text-xs text-[#8F6820] hover:underline"><Glyph e="📎" /> {it.attachment_name || L('Specs file', 'اسپیسیفکیشن فائل', 'ملف المواصفات')}</a>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 shrink-0 text-sm">{money(shown(it.net))}</div>
                  </div>
                </li>
              ))}
            </ul>
            {vatBreak && !isBuyer && <p className="sm:hidden print:hidden text-xs text-gray-500 mt-1">{L('Line amounts are before VAT.', 'لائن کی رقمیں VAT سے پہلے ہیں۔', 'مبالغ البنود قبل الضريبة.')}</p>}
            {isBuyer && <p className="text-xs text-gray-500 mt-1">{vatBreak ? L('Prices include VAT.', 'قیمتیں VAT سمیت ہیں۔', 'الأسعار شاملة الضريبة.') : L('Final prices, no VAT added.', 'حتمی قیمتیں، VAT شامل نہیں کیا جاتا۔', 'أسعار نهائية، لا تُضاف إليها ضريبة القيمة المضافة.')}</p>}
          </div>

          {/* Totals */}
          <div className="p-4 sm:p-8 border-b border-gray-100">
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2">
                {vatBreak && !isBuyer && (<>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">{L('Subtotal (before VAT)', 'ذیلی کل (VAT سے پہلے)', 'المجموع الفرعي (قبل الضريبة)')}</span>
                  <span className="text-gray-900">{money(dealNet)}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">{L('VAT (15%)', 'VAT (15%)', 'ضريبة القيمة المضافة (15%)')}</span>
                  <span className="text-gray-900">{money(dealVat)}</span>
                </div>
                </>)}
                <div className="border-t border-gray-200 pt-2 flex justify-between gap-3">
                  <span className="font-bold text-gray-900">{grandLabel}</span>
                  <span className="font-bold text-[#8F6820] text-lg whitespace-nowrap">{money(dealGross)}</span>
                </div>
                {/* the buyer's footer (owner 2026-11-23): the VAT inside the total; the seller issues the tax invoice */}
                {isBuyer && vatBreak && <div className="text-xs text-gray-600 text-end">{L(`Of which 15% VAT: ${money(dealVat)}`, `اس میں 15% VAT: ${money(dealVat)}`, `منها ضريبة القيمة المضافة 15%: ${money(dealVat)}`)}</div>}
                {isBuyer && !vatBreak && <div className="text-xs text-gray-500 text-end">{vatTag(offer, locale)}</div>}
                {extrasPending && allExtras.length > 0 && (
                  <div className="text-xs font-semibold text-[#8F6820] text-end print:hidden">
                    {isBuyer
                      ? L('+ delivery charges, waiting for the supplier’s confirmation', '+ ڈیلیوری چارجز، سپلائر کی تصدیق کا انتظار', '+ رسوم التوصيل بانتظار تأكيد المورد')
                      : L('+ delivery charges, waiting for your confirmation', '+ ڈیلیوری چارجز، آپ کی تصدیق کا انتظار', '+ رسوم التوصيل بانتظار تأكيدك')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="p-4 sm:p-8 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3">{home ? L('Delivery and how to pay', 'ڈیلیوری اور ادائیگی کا طریقہ', 'التسليم وطريقة الدفع') : L('Delivery and payment', 'ڈیلیوری اور ادائیگی', 'التسليم والدفع')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-[#0B2438]">{rfq.delivery_required ? <Glyph e="🚚" /> : <Glyph e="🏪" />}</span>
                <span>{rfq.delivery_required
                  ? (isBuyer ? L('Delivery to your site', 'آپ کی جگہ پر ڈیلیوری', 'التوصيل إلى موقعك') : L('Delivery to the buyer’s site', 'خریدار کی جگہ پر ڈیلیوری', 'التوصيل إلى موقع المشتري'))
                  : L('Pickup from the supplier’s shop', 'سپلائر کی دکان سے وصولی', 'الاستلام من محل المورد')}</span>
              </div>
              {rfq.delivery_required && (rfq.city || rfq.region) && (
                <div className="flex items-center gap-2">
                  <span className="text-[#0B2438]"><Glyph e="📍" /></span>
                  <span>{L('Delivery location:', 'ڈیلیوری کی جگہ:', 'موقع التسليم:')} {rfq.city || rfq.region}</span>
                </div>
              )}
              {pickupDeal && supplierPlace && (
                <div className="flex items-center gap-2">
                  <span className="text-[#0B2438]"><Glyph e="📍" /></span>
                  <span>{L('Pickup place:', 'وصولی کی جگہ:', 'مكان الاستلام:')} {supplierPlace}</span>
                </div>
              )}
              {!home && (
                <div className="flex items-center gap-2">
                  <span className="text-[#0B2438]"><Glyph e="🧾" /></span>
                  <span>{rfq.vat_invoice_required ? L('Tax invoice required', 'ٹیکس انوائس درکار ہے', 'فاتورة ضريبية مطلوبة') : L('Tax invoice not required', 'ٹیکس انوائس درکار نہیں', 'فاتورة ضريبية غير مطلوبة')}</span>
                </div>
              )}
              {offer.payment_terms && (
                <div className="flex items-center gap-2">
                  <span className="text-[#0B2438]"><Glyph e="💳" /></span>
                  <span>{home ? L('How to pay:', 'ادائیگی کا طریقہ:', 'طريقة الدفع:') : L('Payment terms:', 'ادائیگی کی شرائط:', 'شروط الدفع:')} <b>{paymentTermsLabel(offer.payment_terms, locale)}</b></span>
                </div>
              )}
              {offer.delivery_days && (
                <div className="flex items-center gap-2">
                  <span className="text-[#0B2438]"><Glyph e="📦" /></span>
                  <span>{rfq.delivery_required ? L('Delivery time:', 'ڈیلیوری کا وقت:', 'مدة التوصيل:') : L('Ready for pickup within:', 'وصولی کے لیے تیار:', 'جاهز للاستلام خلال:')} {daysText(offer.delivery_days, locale)}</span>
                </div>
              )}
            </div>
            {offer.notes && (
              <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                <strong>{L('Supplier notes:', 'سپلائر کے نوٹس:', 'ملاحظات المورد:')}</strong> <AutoTr text={offer.notes} locale={locale} />
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="p-4 sm:p-8 text-center print:hidden">
            {dealClosed ? (
              <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-300 text-gray-800 px-6 py-3 rounded-xl">
                <span className="text-xl"><Glyph e="ℹ" /></span>
                <div>
                  <div className="font-bold">{L('Deal cancelled', 'ڈیل منسوخ', 'أُلغيت الصفقة')}</div>
                  <div className="text-xs text-gray-600">{L('on', 'بتاریخ', 'بتاريخ')} {closedOn}</div>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-[#E1F5EE] border border-[#0F6E56]/30 text-[#0F6E56] px-6 py-3 rounded-xl">
                <span className="text-xl"><Glyph e="✅" /></span>
                <div>
                  <div className="font-bold">{isBuyer ? L('You chose this offer', 'آپ نے یہ آفر منتخب کی', 'اخترت هذا العرض') : L('The buyer chose your offer', 'خریدار نے آپ کی آفر منتخب کی', 'اختار المشتري عرضك')}</div>
                  <div className="text-xs">{L('on', 'بتاریخ', 'بتاريخ')} {date}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🧾 بيان الصفقة: مستند صوري غير رسمي لمبلغ الصفقة. الفاتورة الرسمية يصدرها البائع
            (من عنده، أو من المحل الذي اشترى منه) ويرفعها في صفحة الصفقة، وتظهر هنا للمشتري. */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-3 ${home ? 'print:hidden' : 'print:break-before-page'}`}>
          {home ? (
            <div className="p-4 sm:p-6 pb-3">
              <h2 className="text-base font-bold" style={{ color: '#0B2438' }}>{invLabel}</h2>
            </div>
          ) : (<>
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold" style={{ color: '#0B2438' }}>{L('Deal statement — not a tax invoice', 'ڈیل بیان — ٹیکس انوائس نہیں', 'بيان الصفقة — ليس فاتورة ضريبية')}</h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{disclosure}</p>
            <div className="text-xs text-gray-600 mt-2">{L('Statement no.:', 'بیان نمبر:', 'رقم البيان:')} <span className="font-mono" dir="ltr">{(offer.invoice_number || '').replace(/^INV-/, 'ST-') || `ST-${offer.id.slice(0, 8).toUpperCase()}`}</span></div>
            <div className="text-xs text-gray-600">{L('Date:', 'تاریخ:', 'التاريخ:')} {new Date(offer.accepted_at || offer.created_at).toLocaleString(dloc, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-6 border-b border-gray-100 text-sm">
            <div>
              <div className="text-xs font-bold text-gray-500 mb-1">{L('Supplier', 'سپلائر', 'المورد')}</div>
              <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>
              {supplier?.vat_number && <div className="text-gray-600">{L('VAT no.:', 'ٹیکس نمبر:', 'الرقم الضريبي:')} {supplier.vat_number}</div>}
              {supplier?.commercial_registration && <div className="text-gray-600">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {supplier.commercial_registration}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-1">{L('Buyer', 'خریدار', 'المشتري')}</div>
              <div className="font-bold text-gray-900">{buyerName}</div>
              {contractor?.vat_number && <div className="text-gray-600">{L('VAT no.:', 'ٹیکس نمبر:', 'الرقم الضريبي:')} {contractor.vat_number}</div>}
              {contractor?.commercial_registration && <div className="text-gray-600">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {contractor.commercial_registration}</div>}
            </div>
          </div>
          {/* the lines are the same as the document above: only the totals are repeated here, in one colour */}
          <div className="p-4 sm:p-6">
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-1 text-sm">
                {vatBreak && !isBuyer && (<>
                <div className="flex justify-between gap-3"><span className="text-gray-600">{L('Total (excl. VAT)', 'کل (VAT سے پہلے)', 'المجموع (قبل ضريبة القيمة المضافة)')}</span><span>{money(dealNet)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-600">{L('VAT 15%', 'VAT 15%', 'ضريبة القيمة المضافة 15%')}</span><span>{money(dealVat)}</span></div>
                </>)}
                <div className="flex justify-between gap-3 font-bold border-t border-gray-200 pt-1"><span>{grandLabel}</span><span className="text-[#8F6820] whitespace-nowrap">{money(dealGross)}</span></div>
                {isBuyer && vatBreak && <div className="text-xs text-gray-600 text-end">{L(`Of which 15% VAT: ${money(dealVat)}`, `اس میں 15% VAT: ${money(dealVat)}`, `منها ضريبة القيمة المضافة 15%: ${money(dealVat)}`)}</div>}
              </div>
            </div>
          </div>
          </>)}
          {/* the seller's invoice */}
          <div className="px-4 sm:px-6 pb-6">
            {offer.supplier_invoice_url ? (
              <a href={fileHref(offer.supplier_invoice_url)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 min-h-[44px] text-sm hover:shadow-sm">
                <span className="font-bold text-emerald-800"><Glyph e="📄" /> {invLabel}</span>
                <span className="text-xs text-emerald-800">{offer.supplier_invoice_at ? new Date(offer.supplier_invoice_at).toLocaleDateString(dloc, { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' }) + ' · ' : ''}{L('Download', 'ڈاؤن لوڈ', 'تنزيل')} <span aria-hidden="true">{FWD}</span></span>
              </a>
            ) : isBuyer ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 leading-relaxed print:hidden">
                <Glyph e="🧾" /> {L(`The supplier has not attached it yet («${invLabel}»). They attach it before confirming delivery, and it will show here.`, `سپلائر نے ابھی منسلک نہیں کی («${invLabel}»)۔ وہ ڈیلیوری کی تصدیق سے پہلے منسلک کرتا ہے، اور یہ یہاں نظر آئے گی۔`, `لم يرفق المورد «${invLabel}» بعد. يرفقها قبل تأكيد التسليم، وستظهر هنا.`)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#D4A543]/60 bg-[#D4A543]/5 p-3 text-sm text-gray-700 leading-relaxed print:hidden">
                <Glyph e="🧾" /> {L(`You have not uploaded the invoice yet («${invLabel}»); upload it from the deal steps before confirming delivery.`, `آپ نے ابھی انوائس اپ لوڈ نہیں کی («${invLabel}»)؛ ڈیلیوری کی تصدیق سے پہلے ڈیل کے مراحل سے اپ لوڈ کریں۔`, `لم ترفع الفاتورة بعد («${invLabel}»)؛ ارفعها من خطوات الصفقة قبل تأكيد التسليم.`)}{' '}
                <Link href={manageHref} className="font-bold text-[#8F6820] underline">{L('Upload the invoice', 'انوائس اپ لوڈ کریں', 'ارفع الفاتورة')}</Link>
              </div>
            )}
          </div>
        </div>

        {/* تقييم المورد — للمشتري فقط بعد تأكيد الاستلام (لا يكفي القبول). Moves up once it is due (UX-021). */}
        {offer.status === 'accepted' && myId && isBuyer && (
          <div id="rate" className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-6 print:hidden scroll-mt-20 ${needsRating ? 'order-1 border-[#D4A543]/60' : justRated ? 'order-1 border-[#0F6E56]/40' : 'order-4 border-gray-200'}`} dir={dir}>
            {existingReview && !editingReview ? (
              <div className="text-center">
                <div className="text-sm font-bold text-gray-900 mb-2">{L('Thanks for your rating', 'ریٹنگ کا شکریہ', 'شكراً لتقييمك')}</div>
                <div className="flex items-center justify-center gap-0.5 text-2xl" aria-label={L(`${existingReview.rating} of 5 stars`, `5 میں سے ${existingReview.rating} ستارے`, `${existingReview.rating} من 5 نجوم`)}>
                  {[1, 2, 3, 4, 5].map((n: any) => (
                    <Star key={n} aria-hidden="true" className="w-6 h-6" style={{ color: n <= existingReview.rating ? '#D4A543' : '#E5E7EB' }} fill="currentColor" strokeWidth={1.5} />
                  ))}
                </div>
                {reviewParts.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {REVIEW_TAGS.filter(t => reviewParts.tags.includes(t.key)).map(t => (
                      <span key={t.key} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-semibold border border-[#D4A543] bg-[#D4A543]/10 text-[#071827]"><Check aria-hidden="true" className="w-3.5 h-3.5" />{L(t.en, t.ur, t.ar)}</span>
                    ))}
                  </div>
                )}
                {reviewParts.text && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line" dir="auto">{reviewParts.text}</p>}
                {justRated && <p className="text-sm font-semibold text-[#0F6E56] mt-2" role="status">{supplierPublic
                  ? L('Your rating will show on the supplier’s page.', 'آپ کی ریٹنگ سپلائر کے صفحے پر نظر آئے گی۔', 'سيظهر تقييمك في صفحة المورد.')
                  : L('Thank you, your rating counts in the supplier’s record.', 'شکریہ، آپ کی ریٹنگ سپلائر کے ریکارڈ میں شمار ہوتی ہے۔', 'شكراً لك، يُحتسب تقييمك في سجلّ المورد.')}</p>}
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {canEditReview && (
                    <button type="button" onClick={startEditReview} className="min-h-[44px] px-4 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5">{L('Edit your rating', 'اپنی ریٹنگ میں ترمیم کریں', 'عدّل تقييمك')}</button>
                  )}
                  {supplierPublic && (
                    <Link href={supplierHref} className="min-h-[44px] px-4 inline-flex items-center rounded-xl text-sm font-bold text-[#8F6820] hover:underline">{L('View the supplier’s page', 'سپلائر کا صفحہ دیکھیں', 'عرض صفحة المورد')}</Link>
                  )}
                </div>
              </div>
            ) : offer.received_at && disputeOpen && !editingReview ? (
              <div className="text-center py-2">
                <div className="text-2xl mb-1 text-[#0B2438]"><Glyph e="⭐" /></div>
                <p className="text-sm text-gray-700">{L('You can rate the supplier once the report is handled.', 'رپورٹ نمٹنے کے بعد آپ سپلائر کی ریٹنگ دے سکتے ہیں۔', 'يمكنك تقييم المورد بعد معالجة البلاغ.')}</p>
              </div>
            ) : offer.received_at ? (
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{L('Rate your experience with', 'اپنے تجربے کی ریٹنگ دیں:', 'قيّم تعاملك مع')} {supplier?.company_name_ar || L('the supplier', 'سپلائر', 'المورد')}</h3>
                <p className="text-sm text-gray-600 mb-3">{L('Your rating helps other buyers choose suppliers', 'آپ کی ریٹنگ دوسرے خریداروں کو سپلائر چننے میں مدد دیتی ہے', 'تقييمك يساعد بقية المشترين على اختيار الموردين')}</p>
                <div className="flex items-center gap-1" role="radiogroup" aria-label={L('Rating', 'ریٹنگ', 'التقييم')}>
                  {[1, 2, 3, 4, 5].map((n: any) => (
                    <button key={n} id={`star-${n}`} type="button" role="radio" aria-checked={rating === n}
                      tabIndex={(rating || 1) === n ? 0 : -1} onKeyDown={(e: any) => onStarKey(e, n)}
                      aria-label={`${n} / 5 · ${(STAR_WORDS[locale] || STAR_WORDS.ar)[n - 1]}`}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="w-11 h-11 grid place-items-center text-[34px] leading-none transition-transform hover:scale-110">
                      <Star aria-hidden="true" className="w-8 h-8" style={{ color: n <= (hoverRating || rating) ? '#D4A543' : '#E5E7EB' }} fill="currentColor" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
                <div className="text-sm font-bold text-[#8F6820] min-h-[20px] mb-3">{(hoverRating || rating) ? (STAR_WORDS[locale] || STAR_WORDS.ar)[(hoverRating || rating) - 1] : ''}</div>
                {/* round-6 UX-099: the chips get a visible heading */}
                <div id="rate-tags-h" className="text-sm font-bold text-gray-800 mb-1.5">{L('What did you like? (optional)', 'آپ کو کیا اچھا لگا؟ (اختیاری)', 'ما الذي أعجبك؟ (اختياري)')}</div>
                <div className="flex flex-wrap gap-2 mb-3" role="group" aria-labelledby="rate-tags-h">
                  {REVIEW_TAGS.map(t => {
                    const on = reviewTags.includes(t.key)
                    return (
                      <button key={t.key} type="button" aria-pressed={on} onClick={() => setReviewTags(p => on ? p.filter(x => x !== t.key) : [...p, t.key])}
                        className={`inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-full text-sm font-semibold border transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/15 text-[#071827]' : 'border-gray-200 bg-white text-gray-600'}`}>
                        {on && <Check aria-hidden="true" className="w-4 h-4" />}{L(t.en, t.ur, t.ar)}
                      </button>
                    )
                  })}
                </div>
                <textarea value={reviewComment} onChange={(e: any) => setReviewComment(e.target.value)} aria-label={L('Comment (optional)', 'تبصرہ (اختیاری)', 'تعليق (اختياري)')}
                  className="w-full border border-gray-200 rounded-xl p-3 text-base sm:text-sm mb-3 focus:border-[#D4A543] outline-none" rows={2}
                  placeholder={L('Optional comment on product quality and service...', 'پروڈکٹ کی کوالٹی اور معاملے کے بارے میں اختیاری تبصرہ...', 'تعليق اختياري عن جودة المنتج والتعامل...')} />
                {reviewMsg && <p className="text-sm text-red-700 mb-2" role="alert">{reviewMsg}</p>}
                <button onClick={submitReview} disabled={!rating || reviewSubmitting}
                  className="min-h-[44px] px-6 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:shadow"
                  style={{ background: '#D4A543', color: '#071827' }}>
                  {reviewSubmitting ? L('Sending...', 'بھیجا جا رہا ہے...', 'جارٍ الإرسال...') : editingReview ? L('Save the change', 'تبدیلی محفوظ کریں', 'حفظ التعديل') : L('Submit rating', 'ریٹنگ بھیجیں', 'إرسال التقييم')}
                </button>
                {editingReview && (
                  <button type="button" onClick={() => { setEditingReview(false); setReviewMsg('') }} className="ms-2 min-h-[44px] px-4 rounded-xl text-sm font-bold text-gray-600">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="text-2xl mb-1 text-[#0B2438]"><Glyph e="⭐" /></div>
                <div className="text-sm font-bold text-gray-800 mb-1">{L('Rate the supplier after receipt', 'وصولی کے بعد سپلائر کی ریٹنگ دیں', 'قيّم المورد بعد الاستلام')}</div>
                <p className="text-sm text-gray-600">{L('Rating opens once you confirm receipt of the goods, so it reflects the actual delivery.', 'مال کی وصولی کی تصدیق کرتے ہی ریٹنگ کھل جائے گی، تاکہ ریٹنگ اصل ڈیلیوری کے مطابق ہو۔', 'يفتح التقييم بعد تأكيد استلام البضاعة، ليعكس التسليم الفعلي.')}{' '}
                  <a href="#deal" className="font-bold text-[#8F6820] underline">{L('Confirm receipt in the deal steps', 'ڈیل کے مراحل میں وصولی کی تصدیق کریں', 'أكّد الاستلام من خطوات الصفقة')}</a>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </AppShell>
  )
}
