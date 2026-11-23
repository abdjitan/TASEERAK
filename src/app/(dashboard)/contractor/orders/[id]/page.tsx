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
import { showsVatBreakdown, totalLabel, vatTag, offerComparable, isIndependentOffer, sellerInvoiceLabel, sarLabel } from '@/lib/vat'
import { Star, Check } from 'lucide-react'
import { installTotalOf } from '@/lib/installation'
import { daysText } from '@/lib/text'
import { waLink } from '@/lib/wa'
import { SourceShopBadge } from '@/components/rfq/SourceShop'

const SECTOR_I18N: Record<string, Record<string, string>> = {
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}
// the optional rating chips: stored in one form (Arabic) whatever the reader's language, so every
// review reads the same on the supplier's profile (UX-141)
const REVIEW_TAGS: { key: string; ar: string; en: string; ur: string }[] = [
  { key: 'on_time', ar: 'الالتزام بالموعد', en: 'On time', ur: 'وقت کی پابندی' },
  { key: 'quality', ar: 'جودة المواد', en: 'Material quality', ur: 'سامان کا معیار' },
  { key: 'dealing', ar: 'حسن التعامل', en: 'Good dealing', ur: 'اچھا برتاؤ' },
]
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
          buyer ? supabase.from('offers').select('id, total_price, vat_included, vat_status, status').eq('rfq_id', rfqData.id) : Promise.resolve({ data: [] as any[] }),
        ])
        setContractor(contractorData)
        // the profile is the source of truth (a deal link opened on a new device, UX-068)
        if (buyer && contractorData?.buyer_type) rememberBuyerType(contractorData.buyer_type)
        setHome(buyer && (contractorData?.buyer_type ? contractorData.buyer_type === 'individual' : storedBuyerType() === 'individual'))
        const cmp = ((others as any[]) || []).filter((o: any) => o.status !== 'withdrawn').map((o: any) => offerComparable(o))
        if (cmp.length > 1) setMaxOther(Math.max(...cmp))
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
    try { setIsNew(new URLSearchParams(window.location.search).get('new') === '1') } catch {}
  }, [])

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
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: myId,
      reviewed_id: supplier.id,
      offer_id: offer.id,
      rating,
      comment,
    })
    setReviewSubmitting(false)
    if (error) {
      setReviewMsg((error as any).code === '23505'
        ? L('You have already rated this deal.', 'آپ اس ڈیل کی ریٹنگ پہلے دے چکے ہیں۔', 'سبق أن قيّمت هذه الصفقة.')
        : L('Something went wrong, please try again.', 'کوئی خرابی ہوئی، دوبارہ کوشش کریں۔', 'حدث خطأ، حاول مرة أخرى.'))
      return
    }
    setExistingReview({ rating, comment })
    setJustRated(true)
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

  if (loadFailed) return (
    <AppShell title={L('Deal', 'ڈیل', 'الصفقة')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-xl mx-auto mt-6"><LoadError onRetry={() => { setLoading(true); load() }} /></div>
    </AppShell>
  )

  if (!offer || !rfq) return (
    <AppShell title={L('Deal', 'ڈیل', 'الصفقة')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
        <div className="text-4xl mb-2 text-[#0B2438]"><Glyph e="🔎" /></div>
        <p className="text-gray-700 font-semibold mb-4">{L('This deal was not found, or you do not have access to it.', 'یہ ڈیل نہیں ملی، یا آپ کو اس تک رسائی نہیں ہے۔', 'لم نجد هذه الصفقة، أو لا تملك صلاحية الاطلاع عليها.')}</p>
        <Link href="/contractor/orders" className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('My deals', 'میری ڈیلز', 'صفقاتي')}</Link>
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
        <p className="text-sm text-gray-600 mb-4">{L('The offer was cancelled or is no longer chosen. You can review the request and its offers.', 'آفر منسوخ ہو گئی یا اب منتخب نہیں ہے۔ آپ درخواست اور اس کی آفرز دیکھ سکتے ہیں۔', 'أُلغي العرض أو لم يعد مختاراً. يمكنك مراجعة الطلب وعروضه.')}</p>
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
  const grandLabel = home ? L('Deal total', 'ڈیل کی کل رقم', 'إجمالي الصفقة') : totalLabel(offer, locale)
  const showSector = !home
  const saved = isNew && !hasAwards && maxOther > 0 ? maxOther - offerComparable(offer) : 0
  const rowName = (it: any) => it.installOf ? `${L('Installation', 'تنصیب', 'تركيب')}: ${pname(it.installOf)}` : it.isExtra ? it.product_name : pname(it.product_name)
  const qtyText = (it: any) => it.quantity === '' || it.quantity == null ? '—' : `${it.quantity} ${getUnitLabelLong(it.unit, locale)}`

  // the seller's invoice, named by who the seller is (UX-025)
  const invLabel = sellerInvoiceLabel(offer, locale, isBuyer ? 'buyer' : 'supplier')
  const independent = isIndependentOffer(offer)
  const disclosure = independent
    ? (isBuyer
      ? L('Taseerak’s deal statement of the agreed amount, not a tax invoice. The tax invoice is issued by the source shop in your name and attached below.', 'تسعیرک کا ڈیل بیان جو طے شدہ رقم دکھاتا ہے، ٹیکس انوائس نہیں۔ ٹیکس انوائس ماخذ دکان آپ کے نام جاری کرتی ہے اور نیچے منسلک ہوتی ہے۔', 'بيان من تسعيرك بالمبلغ المتفق عليه، وليس فاتورة ضريبية. الفاتورة الضريبية يصدرها المحل المصدر باسمك، وتُرفق أدناه.')
      : L('Taseerak’s deal statement of the agreed amount, not a tax invoice. The tax invoice is issued by the source shop in the buyer’s name; you attach it on the deal page.', 'تسعیرک کا ڈیل بیان، ٹیکس انوائس نہیں۔ ٹیکس انوائس ماخذ دکان خریدار کے نام جاری کرتی ہے؛ آپ اسے ڈیل کے صفحے پر منسلک کرتے ہیں۔', 'بيان من تسعيرك بالمبلغ المتفق عليه، وليس فاتورة ضريبية. الفاتورة الضريبية يصدرها المحل المصدر باسم المشتري، وترفقها أنت من صفحة إدارة الصفقة.'))
    : vatBreak
      ? L('Taseerak’s deal statement of the agreed amount, not a tax invoice. The tax invoice is issued by the seller and attached below.', 'تسعیرک کا ڈیل بیان جو طے شدہ رقم دکھاتا ہے، ٹیکس انوائس نہیں۔ ٹیکس انوائس فروخت کنندہ جاری کرتا ہے اور نیچے منسلک ہوتی ہے۔', 'بيان من تسعيرك بالمبلغ المتفق عليه، وليس فاتورة ضريبية. الفاتورة الضريبية يصدرها البائع، وتُرفق أدناه.')
      : L('Taseerak’s deal statement of the agreed amount. The seller is not VAT-registered, so the price is final and the seller attaches a sales invoice (not a tax invoice) below.', 'تسعیرک کا ڈیل بیان۔ فروخت کنندہ VAT میں رجسٹرڈ نہیں، اس لیے قیمت حتمی ہے اور وہ نیچے سیلز انوائس (ٹیکس انوائس نہیں) منسلک کرتا ہے۔', 'بيان من تسعيرك بالمبلغ المتفق عليه. البائع غير مسجّل في ضريبة القيمة المضافة، فالسعر نهائي، ويرفق فاتورة بيع (ليست فاتورة ضريبية) أدناه.')

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
  const needsRating = isBuyer && offer.status === 'accepted' && !!offer.received_at && !existingReview && !disputeOpen


  return (
    <AppShell title={L('Deal', 'ڈیل', 'الصفقة')} nav={isBuyer ? getNav('contractor', locale, '/contractor/rfqs') : getNav('supplier', locale, '/supplier/deals')} dir={dir}>
    <div className="print:bg-white print:p-0" dir={dir}>
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        {/* Actions - hidden in print */}
        <div className="flex items-center justify-between gap-2 flex-wrap mt-4 print:hidden">
          <Link href={backHref} className="inline-flex items-center min-h-[44px] text-sm font-semibold text-gray-600 hover:text-gray-800"><span aria-hidden="true">{BACK}</span>&nbsp;{L('My deals', 'میری ڈیلز', 'صفقاتي')}</Link>
          <div className="flex items-center gap-2 flex-wrap">
            {isBuyer && offer?.rfq_id && (
              <Link href={`/contractor/rfq/quick?from=${offer.rfq_id}`}
                className="inline-flex items-center gap-1.5 min-h-[44px] border border-[#0B2438] text-[#0B2438] px-4 rounded-xl text-sm font-semibold hover:bg-[#0B2438]/5 transition-colors">
                <Glyph e="🔁" /> {L('Request again', 'دوبارہ منگوائیں', 'اطلب مرة أخرى')}
              </Link>
            )}
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 min-h-[44px] bg-[#0B2438] text-white px-4 rounded-xl text-sm font-semibold hover:bg-[#071827] transition-colors">
              <Glyph e="🖨" /> {home ? L('Print deal details', 'ڈیل کی تفصیل پرنٹ کریں', 'طباعة تفاصيل الصفقة') : L('Print purchase order', 'پرچیز آرڈر پرنٹ کریں', 'طباعة أمر الشراء')}
            </button>
          </div>
        </div>

        {/* right after the choice: what happens next (UX-017) */}
        {isNew && isBuyer && (
          <div className="print:hidden rounded-2xl border border-[#0F6E56]/30 bg-[#0F6E56]/5 p-4 sm:p-5" role="status">
            <div className="font-bold text-[#0F6E56] flex items-center gap-2"><Glyph e="✅" /> {L(`You chose ${supplier?.company_name_ar || 'the supplier'}’s offer.`, `آپ نے ${supplier?.company_name_ar || 'سپلائر'} کی آفر منتخب کر لی۔`, `تمّ اختيار عرض ${supplier?.company_name_ar || 'المورد'}.`)}</div>
            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{L('Next step: the supplier prepares your order and confirms delivery; you will get a message then.', 'اگلا مرحلہ: سپلائر آپ کا آرڈر تیار کر کے ڈیلیوری کی تصدیق کرے گا، اور تب آپ کو پیغام ملے گا۔', 'الخطوة التالية: يجهّز المورد طلبك ويؤكّد التوصيل، وستصلك رسالة عند ذلك.')}</p>
            {saved >= 1 && <p className="text-sm font-bold text-[#8F6820] mt-1.5">{L(`You saved ${money(saved)} compared with the highest offer.`, `سب سے زیادہ آفر کے مقابلے میں آپ نے ${money(saved)} بچائے۔`, `وفّرت ${money(saved)} مقارنة بأعلى عرض.`)}</p>}
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
        {isSupplierView && offer.status === 'accepted' && (
          <Link href={manageHref} className="print:hidden flex items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-all hover:shadow" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', color: '#071827' }}>
            <span className="min-w-0">
              <span className="block font-bold">{L('Manage the deal', 'ڈیل سنبھالیں', 'إدارة الصفقة')}</span>
              <span className="block text-sm font-semibold opacity-80">{L('Upload the invoice, then confirm delivery', 'انوائس اپ لوڈ کریں، پھر ڈیلیوری کی تصدیق کریں', 'ارفع الفاتورة ثم أكّد التسليم')}</span>
            </span>
            <span aria-hidden="true" className="text-xl font-bold">{FWD}</span>
          </Link>
        )}

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
              onChange={(o: any) => setOffer((prev: any) => (prev ? { ...prev, ...o } : prev))}
            />
          </div>
        )}

        {/* the other side: WhatsApp or message (UX-104). The buyer's WhatsApp button is in the deal
            steps above, so it shows once (UX-054). */}
        {offer.status === 'accepted' && (
          <div className="print:hidden flex flex-wrap gap-2">
            {wa && !isBuyer && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5">
                <Glyph e="💬" /> {L('WhatsApp', 'واٹس ایپ', 'واتساب')}
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
                <div className="text-sm text-[#F5C55B] print:text-[#9D7425]">{home ? L('Deal no.', 'ڈیل نمبر', 'رقم الصفقة') : L('Order no.', 'آرڈر نمبر', 'رقم الأمر')}</div>
                <div className="text-xl font-bold" dir="auto">{dealNo}</div>
                <div className="text-sm text-[#F5C55B] print:text-[#9D7425] mt-1">{L('Date:', 'تاریخ:', 'التاريخ:')} {date}</div>
                {!home && ref && <div className="text-sm text-[#F5C55B] print:text-[#9D7425] mt-1">{L('Request:', 'درخواست:', 'الطلب:')} <span dir="ltr">{rfqRef(rfq)}</span></div>}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-8 border-b border-gray-100">
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">{L('Buyer', 'خریدار', 'المشتري')}</div>
              <div className="font-bold text-gray-900">{contractor?.company_name_ar || '—'}</div>
              {contractor?.commercial_registration && (
                <div className="text-sm text-gray-600 mt-1">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {contractor.commercial_registration}</div>
              )}
              {phoneLine(contractor?.contact_phone || contractor?.phone)}
              {(contractor?.city || contractor?.region) && <div className="text-sm text-gray-600">{contractor.city || contractor.region}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">{L('Seller (supplier)', 'بیچنے والا (سپلائر)', 'البائع (المورد)')}</div>
              <div className="font-bold text-gray-900">{supplier?.company_name_ar || '—'}</div>
              {supplier?.commercial_registration && (
                <div className="text-sm text-gray-600 mt-1">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {supplier.commercial_registration}</div>
              )}
              {phoneLine(supplier?.contact_phone || supplier?.phone)}
              {offer?.id && <SourceShopBadge offerId={offer.id} locale={locale} />}
              {(supplier?.city || supplier?.region) && <div className="text-sm text-gray-600">{supplier.city || supplier.region}</div>}
              {supplier?.national_short_address && (
                <div className="text-sm text-gray-600 font-mono" dir="ltr"><Glyph e="🏛" /> {supplier.national_short_address}</div>
              )}
              {supplier?.building_number && supplier?.street_name && (
                <div className="text-xs text-gray-500">
                  {supplier.building_number}, {supplier.street_name}{supplier.district ? `, ${supplier.district}` : ''}{supplier.postal_code ? `, ${supplier.postal_code}` : ''}
                </div>
              )}
              {supplier?.latitude && supplier?.longitude && (
                <a href={`https://www.google.com/maps?q=${supplier.latitude},${supplier.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center min-h-[36px] text-sm text-[#8F6820] hover:underline print:hidden">
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
                  className="inline-flex items-center gap-2 min-h-[36px] text-sm font-semibold text-[#8F6820] hover:underline print:hidden">
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
                  <th className="text-start text-xs font-bold text-gray-600 pb-3">{L('Unit price', 'فی یونٹ قیمت', 'سعر الوحدة')}</th>
                  <th className="text-start text-xs font-bold text-gray-600 pb-3">{vatBreak ? L('Total (before VAT)', 'کل (ٹیکس سے پہلے)', 'الإجمالي (قبل الضريبة)') : L('Total', 'کل', 'الإجمالي')}</th>
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
                        <a href={fileHref(it.attachment_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8F6820] hover:underline print:hidden"><Glyph e="📎" /> {it.attachment_name || L('Specs file', 'اسپیسیفکیشن فائل', 'ملف المواصفات')}</a>
                      )}
                    </td>
                    {showSector && <td className="py-4 text-sm text-gray-600">{it.sector ? ((locale !== 'ar' && SECTOR_I18N[locale]?.[it.sector]) || (SECTOR_LABELS as any)[it.sector] || it.sector) : '—'}</td>}
                    <td className="py-4 text-sm text-gray-600">{qtyText(it)}</td>
                    <td className="py-4 text-sm text-gray-600">{Number(it.unitNet) > 0 ? money(Number(it.unitNet)) : '—'}</td>
                    <td className="py-4 font-bold text-gray-900">{money(Number(it.net))}</td>
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
                        {qtyText(it)}{Number(it.unitNet) > 0 ? ` × ${money(Number(it.unitNet))}` : ''}
                      </div>
                      {it.attachment_url && (
                        <a href={fileHref(it.attachment_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8F6820] hover:underline"><Glyph e="📎" /> {it.attachment_name || L('Specs file', 'اسپیسیفکیشن فائل', 'ملف المواصفات')}</a>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 shrink-0 text-sm">{money(Number(it.net))}</div>
                  </div>
                </li>
              ))}
            </ul>
            {vatBreak && <p className="sm:hidden print:hidden text-xs text-gray-500 mt-1">{L('Line amounts are before VAT.', 'لائن کی رقمیں VAT سے پہلے ہیں۔', 'مبالغ البنود قبل الضريبة.')}</p>}
          </div>

          {/* Totals */}
          <div className="p-4 sm:p-8 border-b border-gray-100">
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2">
                {vatBreak && (<>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">{L('Subtotal (before VAT)', 'ذیلی کل (ٹیکس سے پہلے)', 'المجموع الفرعي (قبل الضريبة)')}</span>
                  <span className="text-gray-900">{money(dealNet)}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">{L('VAT (15%)', 'ویٹ (VAT) (15%)', 'ضريبة القيمة المضافة (15%)')}</span>
                  <span className="text-gray-900">{money(dealVat)}</span>
                </div>
                </>)}
                <div className="border-t border-gray-200 pt-2 flex justify-between gap-3">
                  <span className="font-bold text-gray-900">{grandLabel}</span>
                  <span className="font-bold text-[#8F6820] text-lg whitespace-nowrap">{money(dealGross)}</span>
                </div>
                {home && <div className="text-xs text-gray-500 text-end">{vatTag(offer, locale)}</div>}
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
            <h3 className="text-sm font-bold text-gray-900 mb-3">{L('Delivery and payment', 'ڈیلیوری اور ادائیگی', 'التسليم والدفع')}</h3>
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
              {!home && (
                <div className="flex items-center gap-2">
                  <span className="text-[#0B2438]"><Glyph e="🧾" /></span>
                  <span>{rfq.vat_invoice_required ? L('Tax invoice required', 'ٹیکس انوائس درکار ہے', 'فاتورة ضريبية مطلوبة') : L('Tax invoice not required', 'ٹیکس انوائس درکار نہیں', 'فاتورة ضريبية غير مطلوبة')}</span>
                </div>
              )}
              {offer.payment_terms && (
                <div className="flex items-center gap-2">
                  <span className="text-[#0B2438]"><Glyph e="💳" /></span>
                  <span>{L('Payment terms:', 'ادائیگی کی شرائط:', 'شروط الدفع:')} <b>{paymentTermsLabel(offer.payment_terms, locale)}</b></span>
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
          <div className="p-4 sm:p-8 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-6 py-3 rounded-xl">
              <span className="text-xl"><Glyph e="✅" /></span>
              <div>
                <div className="font-bold">{isBuyer ? L('You chose this offer', 'آپ نے یہ آفر منتخب کی', 'اخترت هذا العرض') : L('The buyer chose your offer', 'خریدار نے آپ کی آفر منتخب کی', 'اختار المشتري عرضك')}</div>
                <div className="text-xs text-green-700">{L('on', 'بتاریخ', 'بتاريخ')} {date}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 🧾 بيان الصفقة: مستند صوري غير رسمي لمبلغ الصفقة. الفاتورة الرسمية يصدرها البائع
            (من عنده، أو من المحل الذي اشترى منه) ويرفعها في صفحة الصفقة، وتظهر هنا للمشتري. */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-3">
          {home ? (
            <div className="p-4 sm:p-6 pb-3">
              <h2 className="text-base font-bold" style={{ color: '#0B2438' }}>{invLabel}</h2>
            </div>
          ) : (<>
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold" style={{ color: '#0B2438' }}>{L('Deal statement — not a tax invoice', 'ڈیل بیان — ٹیکس انوائس نہیں', 'بيان الصفقة — ليس فاتورة ضريبية')}</h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{disclosure}</p>
            <div className="text-xs text-gray-600 mt-2">{L('Statement no.:', 'بیان نمبر:', 'رقم البيان:')} <span className="font-mono" dir="ltr">{(offer.invoice_number || '').replace(/^INV-/, 'ST-') || `ST-${offer.id.slice(0, 8).toUpperCase()}`}</span></div>
            <div className="text-xs text-gray-600">{L('Date:', 'تاریخ:', 'التاريخ:')} {new Date(offer.accepted_at || offer.created_at).toLocaleString(dloc, { timeZone: 'Asia/Riyadh' })}</div>
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
              <div className="font-bold text-gray-900">{contractor?.company_name_ar || '—'}</div>
              {contractor?.vat_number && <div className="text-gray-600">{L('VAT no.:', 'ٹیکس نمبر:', 'الرقم الضريبي:')} {contractor.vat_number}</div>}
              {contractor?.commercial_registration && <div className="text-gray-600">{L('CR:', 'کمرشل رجسٹریشن:', 'سجل تجاري:')} {contractor.commercial_registration}</div>}
            </div>
          </div>
          {/* the lines are the same as the document above: only the totals are repeated here, in one colour */}
          <div className="p-4 sm:p-6">
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-1 text-sm">
                {vatBreak && (<>
                <div className="flex justify-between gap-3"><span className="text-gray-600">{L('Total (excl. VAT)', 'کل (ٹیکس کے بغیر)', 'المجموع (قبل ضريبة القيمة المضافة)')}</span><span>{money(dealNet)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-600">{L('VAT 15%', 'ویٹ (VAT) 15%', 'ضريبة القيمة المضافة 15%')}</span><span>{money(dealVat)}</span></div>
                </>)}
                <div className="flex justify-between gap-3 font-bold border-t border-gray-200 pt-1"><span>{grandLabel}</span><span className="text-[#8F6820] whitespace-nowrap">{money(dealGross)}</span></div>
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
                <span className="text-xs text-emerald-800">{offer.supplier_invoice_at ? new Date(offer.supplier_invoice_at).toLocaleDateString(dloc) + ' · ' : ''}{L('Download', 'ڈاؤن لوڈ', 'تنزيل')} <span aria-hidden="true">{FWD}</span></span>
              </a>
            ) : isBuyer ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 leading-relaxed">
                <Glyph e="🧾" /> {L(`The supplier has not attached it yet («${invLabel}»). They attach it before confirming delivery, and it will show here.`, `سپلائر نے ابھی منسلک نہیں کی («${invLabel}»)۔ وہ ڈیلیوری کی تصدیق سے پہلے منسلک کرتا ہے، اور یہ یہاں نظر آئے گی۔`, `لم يرفق المورد «${invLabel}» بعد. يرفقها قبل تأكيد التسليم، وستظهر هنا.`)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#D4A543]/60 bg-[#D4A543]/5 p-3 text-sm text-gray-700 leading-relaxed print:hidden">
                <Glyph e="🧾" /> {L(`You have not attached your invoice yet («${invLabel}»). Upload it on the deal page before you confirm delivery.`, `آپ نے ابھی اپنی انوائس منسلک نہیں کی («${invLabel}»)۔ ڈیلیوری کی تصدیق سے پہلے ڈیل کے صفحے پر اپ لوڈ کریں۔`, `لم ترفق فاتورتك بعد («${invLabel}»). ارفعها من صفحة إدارة الصفقة قبل تأكيد التسليم.`)}{' '}
                <Link href={manageHref} className="font-bold text-[#8F6820] underline">{L('Upload the invoice', 'انوائس اپ لوڈ کریں', 'ارفع الفاتورة')}</Link>
              </div>
            )}
          </div>
        </div>

        {/* تقييم المورد — للمشتري فقط بعد تأكيد الاستلام (لا يكفي القبول). Moves up once it is due (UX-021). */}
        {offer.status === 'accepted' && myId && isBuyer && (
          <div id="rate" className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-6 print:hidden scroll-mt-20 ${needsRating ? 'order-1 border-[#D4A543]/60' : justRated ? 'order-1 border-[#0F6E56]/40' : 'order-4 border-gray-200'}`} dir={dir}>
            {existingReview ? (
              <div className="text-center">
                <div className="text-sm font-bold text-gray-900 mb-2">{L('Thanks for your rating', 'ریٹنگ کا شکریہ', 'شكراً لتقييمك')}</div>
                <div className="flex items-center justify-center gap-0.5 text-2xl" aria-label={L(`${existingReview.rating} of 5 stars`, `5 میں سے ${existingReview.rating} ستارے`, `${existingReview.rating} من 5 نجوم`)}>
                  {[1, 2, 3, 4, 5].map((n: any) => (
                    <Star key={n} aria-hidden="true" className="w-6 h-6" style={{ color: n <= existingReview.rating ? '#D4A543' : '#E5E7EB' }} fill="currentColor" strokeWidth={1.5} />
                  ))}
                </div>
                {existingReview.comment && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{existingReview.comment}</p>}
                {justRated && <p className="text-sm font-semibold text-[#0F6E56] mt-2" role="status">{L('Your rating will show on the supplier’s page.', 'آپ کی ریٹنگ سپلائر کے صفحے پر نظر آئے گی۔', 'سيظهر تقييمك في صفحة المورد.')}</p>}
              </div>
            ) : offer.received_at && disputeOpen ? (
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
                    <button key={n} type="button" role="radio" aria-checked={rating === n}
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
                <div className="flex flex-wrap gap-2 mb-3" aria-label={L('What went well (optional)', 'کیا اچھا رہا (اختیاری)', 'ما الذي أعجبك (اختياري)')}>
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
                  {reviewSubmitting ? L('Sending...', 'بھیجا جا رہا ہے...', 'جارٍ الإرسال...') : L('Submit rating', 'ریٹنگ بھیجیں', 'إرسال التقييم')}
                </button>
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
