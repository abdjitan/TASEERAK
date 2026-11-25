'use client'

import { useEffect, useRef, useState } from 'react'
import AutoTr from '@/components/shared/AutoTr'
import PageLoader from '@/components/shared/PageLoader'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileHref } from '@/lib/fileHref'
import { SECTOR_LABELS, getProductLabel, getUnitLabelLong } from '@/types'
import { useTranslation } from '@/i18n'
import { waLink } from '@/lib/wa'
import { approvalLabel } from '@/lib/supplierScore'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { tierLabel, sourceLabel, availabilityLabel, isDirectSource, sourceIcon, availabilityIcon, tierIcon } from '@/lib/sellers'
import { rfqRefLine, rfqDesc } from '@/lib/rfqName'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { vatStatusOf, totalLabel, offerComparable, vatTag, priceBasisLabel, sarLabel, buyerLinePrice, lineComparable, issuesTaxInvoice } from '@/lib/vat'
import { installTotalOf, materialTotalOf } from '@/lib/installation'
import { SourceShopBadge } from '@/components/rfq/SourceShop'
import { dbMessage } from '@/lib/dbMessage'
import { useEnsureVerified } from '@/components/shared/VerifyGate'
import { askConfirm } from '@/lib/askConfirm'
import { useHomeBuyer } from '@/components/buyer/useHomeBuyer'
import { cleanArName, getPlaceLabel } from '@/lib/displayName'
import { daysText, arCount, arMaterials } from '@/lib/text'
import { useFocusTrap } from '@/components/shared/useFocusTrap'
import { isExpired } from '@/lib/deadline'
import { dealStage } from '@/lib/dealStage'

const SECTOR_I18N: Record<string, Record<string, string>> = {
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}

export default function OfferDetailPage() {
  const { id, offerId } = useParams()
  const router = useRouter()
  const { locale, dir } = useTranslation()
  const ensureVerified = useEnsureVerified()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'
  const SAR = sarLabel(locale) // UX-140
  const FWD = dir === 'rtl' ? '←' : '→', BACK = dir === 'rtl' ? '→' : '←'
  const [rfq, setRfq] = useState<any>(null)
  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<any>(null)
  const [acting, setActing] = useState(false)
  const [reqOpen, setReqOpen] = useState(false)
  const [reqHours, setReqHours] = useState(24)
  const [reqNote, setReqNote] = useState('')
  const [reqBusy, setReqBusy] = useState(false)
  const [reqDone, setReqDone] = useState(false)
  const [err, setErr] = useState('') // inline error instead of the browser alert (UX-149)
  const home = useHomeBuyer() // a home buyer («لبيتي»): plain words, no sector, no procurement terms (profile-backed, UX-068)
  const pname = (n: string) => (home && locale === 'ar' ? cleanArName(n || '') : getProductLabel(n || '', locale))
  const unitL = (u: string) => getUnitLabelLong(u, locale)
  // round-6 UX-098 / round-7 UX-129: the Urdu singular after 1
  const urN = (n: any, one: string, many: string) => `${n} ${Number(n) === 1 ? one : many}`
  const showErr = (m: string) => { setErr(m); setTimeout(() => document.getElementById('offer-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30) }
  const [declinedNote, setDeclinedNote] = useState('') // after «رفض»: what happened (round-4 UX-123)
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoText, setInfoText] = useState('')
  const [infoBusy, setInfoBusy] = useState(false)
  const [taxVerified, setTaxVerified] = useState(false) // owner 2026-11-25: «يُصدر فاتورة ضريبية» (profiles.vat_verified_at, 286)
  const [chosenId, setChosenId] = useState<string | null>(null) // another offer on this request is the deal (round-5 UX-041)
  const [chosenN, setChosenN] = useState(0) // round-7 UX-128: how many deals this request has
  // the two dialogs keep focus inside, close with Escape and give focus back (round-5 UX-141)
  const reqRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  useFocusTrap(reqRef, reqOpen, { lockScroll: true })
  useFocusTrap(infoRef, infoOpen, { lockScroll: true })
  useEffect(() => {
    if (!reqOpen && !infoOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (!reqBusy) setReqOpen(false); if (!infoBusy) setInfoOpen(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reqOpen, infoOpen, reqBusy, infoBusy])
  // one date format (round-5 UX-149): no seconds, Riyadh time
  const fmtWhen = (d: any) => new Date(d).toLocaleString(dloc, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })

  async function submitReductionRequest() {
    setReqBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('request_price_reduction', { p_offer_id: offerId, p_hours: Number(reqHours), p_note: reqNote.trim() || null })
    setReqBusy(false)
    if (error) { showErr(dbMessage(error, L('Could not send the request. Please try again.', 'درخواست نہیں بھیجی جا سکی۔ دوبارہ کوشش کریں۔', 'تعذّر إرسال الطلب. حاول مرة أخرى.'))); setReqOpen(false); return }
    setReqOpen(false); setReqDone(true)
    // the reply deadline shows at once, without a reload (round-4 UX-123)
    setOffer((o: any) => (o ? { ...o, reduction_deadline: new Date(Date.now() + Number(reqHours) * 3600000).toISOString(), reduction_note: reqNote.trim() || null } : o))
  }

  async function cancelReduction() {
    if (!(await askConfirm(L('Withdraw the discount request and go back to the original price?', 'رعایت کی درخواست واپس لے کر اصل قیمت پر جائیں؟', 'سحب طلب التخفيض والعودة إلى السعر الأصلي؟'), { danger: true, okLabel: L('Yes, withdraw it', 'ہاں، واپس لیں', 'نعم، اسحب الطلب'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setActing(true)
    let failed = false
    try {
      const supabase = createClient()
      const { error } = await supabase.from('offers').update({ reduction_deadline: null, reduction_note: null }).eq('id', offerId)
      failed = !!error
      if (error) console.error('cancel reduction', error)
    } catch (e) { failed = true; console.error('cancel reduction failed', e) }
    setActing(false)
    if (failed) { showErr(L('Could not withdraw the discount request. Please try again.', 'رعایت کی درخواست واپس نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر سحب طلب التخفيض. حاول مرة أخرى.')); return }
    setReqDone(false)
    setOffer((o: any) => ({ ...o, reduction_deadline: null, reduction_note: null }))
  }

  async function submitInfoRequest() {
    if (!infoText.trim()) return
    setInfoBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('request_offer_info', { p_offer_id: offerId, p_question: infoText.trim() })
    setInfoBusy(false)
    if (error) { setInfoOpen(false); showErr(dbMessage(error, L('Could not send the question. Please try again.', 'سوال نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔', 'تعذّر إرسال السؤال. حاول مرة أخرى.'))); return }
    setInfoOpen(false)
    setOffer((o: any) => ({ ...o, info_request: infoText.trim(), info_response: null }))
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMyId(session.user.id)
      // The public profile without a contact number (profiles_public); the number loads only after
      // acceptance (RLS: the full profile is readable by the accepted party only).
      const [{ data: rfqData }, { data: offerData }] = await Promise.all([
        supabase.from('rfqs').select('*').eq('id', id).single(),
        supabase.from('offers')
          .select('*, supplier:profiles_public(company_name_ar, company_name_en, rating_avg, city, region, district, supplier_tier, national_short_address, latitude, longitude, verification_status, cr_verification_source, approvals)')
          .eq('id', offerId).single(),
      ])
      setRfq(rfqData)
      let full = offerData
      if (offerData?.status === 'accepted') {
        const { data: contact } = await supabase.from('profiles').select('phone, contact_phone').eq('id', offerData.supplier_id).single()
        if (contact) full = { ...offerData, supplier: { ...offerData.supplier, ...contact } }
      }
      setOffer(full)
      // read apart: the offer query must not fail while profiles_public lacks the column
      if (offerData?.supplier_id) {
        try {
          const { data: vv, error: vvErr } = await supabase.from('profiles_public').select('vat_verified_at').eq('id', offerData.supplier_id).maybeSingle()
          if (!vvErr) setTaxVerified(!!(vv as any)?.vat_verified_at)
        } catch { /* optional */ }
      }
      if (offerData && offerData.status !== 'accepted') {
        const { data: acc } = await supabase.from('offers').select('id').eq('rfq_id', id).eq('status', 'accepted').limit(2)
        setChosenId(acc?.[0]?.id || null)
        setChosenN((acc || []).length)
      }
      setLoading(false)
    }
    load()
  }, [id, offerId])

  const isMulti = Array.isArray(rfq?.items) && rfq.items.length > 1
  // UX-004: the server accepts a choice while the request is open, even after the pricing deadline
  const rfqOpen = rfq?.status === 'open'
  const pastDeadline = rfqOpen && !!rfq?.expires_at && isExpired(rfq.expires_at)
  const showBar = offer?.status === 'pending' && rfqOpen
  const noTaxOffer = !!rfq?.vat_invoice_required && !!offer && !issuesTaxInvoice(offer)
  // the floating assistant bubble steps aside while a sticky action bar is on screen
  useEffect(() => {
    if (!showBar) return
    document.body.dataset.actionbar = '1'
    return () => { delete document.body.dataset.actionbar }
  }, [showBar])

  async function acceptOffer() {
    if (!(await ensureVerified())) return
    const who = offer?.supplier?.company_name_ar || L('this supplier', 'اس سپلائر', 'هذا المورد')
    const total = offerComparable(offer).toLocaleString('en-US', { maximumFractionDigits: 0 })
    // an expired price: confirm it in messages before choosing (round-4 UX-123)
    const gone = offer?.price_valid_until && new Date(offer.price_valid_until) < new Date()
      ? '\n\n' + L('This offer’s price has expired. Confirm the price with the supplier in messages before choosing it.', 'اس آفر کی قیمت کی مدت ختم ہو گئی ہے۔ منتخب کرنے سے پہلے پیغامات میں سپلائر سے قیمت کنفرم کریں۔', 'انتهت صلاحية سعر هذا العرض. تأكّد من السعر مع المورد عبر الرسائل قبل اختياره.') : ''
    // round-7 UX-003: a request that needs a tax invoice, an offer without one
    const noTax = noTaxOffer
    const nt = noTax ? '\n\n' + L('This supplier does not issue a tax invoice, and you asked for a tax invoice.', 'یہ سپلائر ٹیکس انوائس جاری نہیں کرتا، اور آپ نے ٹیکس انوائس مانگی تھی۔', 'هذا المورد لا يُصدر فاتورة ضريبية، وقد طلبتَ فاتورة ضريبية.') : ''
    if (!(await askConfirm(L(
      `Choose the offer from ${who} for ${total} SAR (${vatTag(offer, 'en')})?\nWe will tell the other suppliers and close the request, and a deal opens with this supplier.${gone}${nt}`,
      `${who} کی آفر ${total} ریال (${vatTag(offer, 'ur')}) میں منتخب کریں؟\nہم باقی سپلائرز کو بتا دیں گے اور درخواست بند ہو جائے گی، اور اس سپلائر کے ساتھ ڈیل کھل جائے گی۔${gone}${nt}`,
      `اختيار عرض ${who} بمبلغ ${total} ر.س (${vatTag(offer, 'ar')})؟\nسنُبلغ بقية الموردين ويُغلق الطلب، وتُفتح صفقة مع هذا المورد.${gone}${nt}`),
      { okLabel: noTax ? L('Yes, choose it without a tax invoice', 'ہاں، ٹیکس انوائس کے بغیر منتخب کریں', 'نعم، أختاره دون فاتورة ضريبية') : L('Choose this offer', 'یہ آفر منتخب کریں', 'اختر هذا العرض'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setActing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
    if (error) { setActing(false); showErr(dbMessage(error, L('Could not choose the offer; it may already be chosen. Refresh the page.', 'آفر منتخب نہیں ہو سکی؛ شاید پہلے ہی منتخب ہو چکی ہے۔ صفحہ ریفریش کریں۔', 'تعذّر اختيار العرض، وقد يكون اختير مسبقاً. حدّث الصفحة.'))); return }
    router.push(`/contractor/orders/${offerId}?new=1`)
  }

  async function rejectOffer() {
    // rejecting also removes any material you selected from this supplier (DB trigger, migration 183)
    // one name for the action: «لا يناسبني» (round-5 UX-146)
    const who = offer?.supplier?.company_name_ar || L('this supplier', 'اس سپلائر', 'هذا المورد')
    if (!(await askConfirm(L(`Is the offer from ${who} not right for you? The offer will be declined and the supplier told it was not accepted. This cannot be undone.${isMulti ? ' Any material you chose from this supplier will be unselected.' : ''}`, `${who} کی آفر آپ کے لیے مناسب نہیں؟ آفر رد ہو جائے گی اور سپلائر کو بتا دیا جائے گا کہ اس کی آفر قبول نہیں ہوئی۔ یہ واپس نہیں ہو سکتا۔${isMulti ? ' اس سپلائر سے منتخب کیا گیا کوئی بھی سامان غیر منتخب ہو جائے گا۔' : ''}`, `عرض ${who} لا يناسبك؟ سيُرفض العرض ويُبلَّغ المورد بأن عرضه لم يُقبل، ولا يمكن التراجع عن ذلك.${isMulti ? ' وسيُلغى اختيار أي مادة اخترتها من هذا المورد.' : ''}`), { danger: true, okLabel: L('Yes, not right for me', 'ہاں، مناسب نہیں', 'نعم، لا يناسبني'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setActing(true)
    const supabase = createClient()
    const { error } = await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    setActing(false)
    if (error) { showErr(L('Could not decline the offer. Refresh and try again.', 'آفر رد نہیں ہو سکی۔ صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'تعذّر رفض العرض. حدّث الصفحة وحاول مرة أخرى.')); return }
    setOffer((o: any) => (o ? { ...o, status: 'rejected' } : o))
    setDeclinedNote(L('The offer was declined, and any material chosen from it was unselected.', 'آفر رد کر دی گئی، اور اس سے منتخب کیا گیا سامان غیر منتخب ہو گیا۔', 'رُفض العرض، وأُلغي اختيار أي مادة كانت منه.'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const nav = getNav('contractor', locale, '/contractor/rfqs')
  if (loading) return <PageLoader />
  if (!offer || !rfq) return (
    <AppShell title={L('Offer', 'آفر', 'العرض')} nav={nav} dir={dir}>
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-5xl mb-3 text-gray-400"><Glyph e="🔍" /></div>
        <p className="font-bold" style={{ color: '#0B2438' }}>{L('This offer is no longer available', 'یہ آفر اب دستیاب نہیں', 'هذا العرض لم يعد متاحاً')}</p>
        <Link href={`/contractor/rfq/${id}`} className="mt-4 inline-flex items-center gap-1 min-h-11 px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}><span aria-hidden="true">{BACK}</span> {L('Back to the request', 'درخواست پر واپس', 'العودة إلى الطلب')}</Link>
      </div>
    </AppShell>
  )

  const s = offer.supplier || {}
  const exList = Array.isArray(offer.extra_charges) ? offer.extra_charges : []
  const exSum = exList.reduce((a: any, e: any) => a + (Number(e.amount) || 0), 0)
  const goods = (Number(offer.total_price) || 0) - exSum
  // which request items this offer priced (lines with a positive amount), round-4 UX-031
  const reqItems: any[] = Array.isArray(rfq.items) ? rfq.items : []
  const pricedIdx = new Set<number>((Array.isArray(offer.item_prices) ? offer.item_prices : []).filter((e: any) => Number(e?.total) > 0).map((e: any) => Number(e.item_index)))
  const allN = reqItems.length
  const pricedN = reqItems.filter((_: any, i: number) => pricedIdx.has(i)).length
  const partial = allN > 1 && pricedN > 0 && pricedN < allN
  const missingNames = reqItems.filter((_: any, i: number) => !pricedIdx.has(i)).map((it: any) => (home && locale === 'ar' ? cleanArName(String(it?.product_name || '')) : getProductLabel(it?.product_name, locale))).join(locale === 'ar' || locale === 'ur' ? '، ' : ', ')
  const ip = Array.isArray(offer.item_prices) ? offer.item_prices : []
  const tierText = tierLabel(s.supplier_tier, locale)
  // Supplier privacy: the contact number (and WhatsApp) only after the offer is chosen; before that
  // the buyer talks through the in-app chat only.
  const accepted = offer.status === 'accepted'
  const contactNum = s.contact_phone || s.phone || ''
  // an independent seller is a private person: no map pin before (or after) a deal, the city only (round-5 UX-036)
  const independentSeller = s.supplier_tier === 'independent'
  const mapsUrl = (!independentSeller && s.latitude && s.longitude) ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}` : null
  const what = isMulti ? rfqDesc(rfq, locale) : pname(rfq.product_name)
  const wa = (accepted && contactNum) ? waLink(contactNum, L(`Hello, regarding your offer on «${what}» on Taseerak`, `السلام علیکم، تسعیرک پر «${what}» کے لیے آپ کی آفر کے بارے میں`, `السلام عليكم، بخصوص عرضكم على «${what}» في منصة تسعيرك`)) : ''
  const statusBadge = offer.status === 'accepted' ? { t: L('Chosen', 'منتخب', 'تم اختياره'), c: 'bg-[#E1F5EE] text-[#0F6E56]' }
    // round-6 UX-076: an offer closed by another choice was «not chosen», not declined by the buyer
    : offer.status === 'rejected' ? (chosenId ? { t: L('Not chosen', 'منتخب نہیں ہوئی', 'لم يُختر'), c: 'bg-gray-100 text-gray-600' } : { t: L('Declined', 'رد شدہ', 'مرفوض'), c: 'bg-gray-100 text-gray-600' })
    // round-7 UX-126: never «بانتظار قرارك» once another offer was chosen or the request is no longer open
    : chosenId ? { t: L('Not chosen', 'منتخب نہیں ہوئی', 'لم يُختر'), c: 'bg-gray-100 text-gray-600' }
    : rfq.status === 'cancelled' ? { t: L('Request cancelled', 'درخواست منسوخ', 'أُلغي الطلب'), c: 'bg-gray-100 text-gray-600' }
    : rfq.status !== 'open' ? { t: L('Request ended', 'درخواست ختم', 'انتهى الطلب'), c: 'bg-gray-100 text-gray-600' }
    : { t: L('Waiting for your decision', 'آپ کے فیصلے کا انتظار', 'بانتظار قرارك'), c: 'bg-warn-bg text-warn-text' }
  const fmt = (n: any) => (+Number(n).toFixed(2)).toLocaleString('en-US')
  // the reply deadline passed without a new price (round-5 UX-030): the request is over
  const reductionLive = reqDone || (!!offer.reduction_deadline && new Date(offer.reduction_deadline).getTime() > Date.now())
  const reductionLapsed = !reqDone && !!offer.reduction_deadline && !reductionLive
  const reducing = reductionLive

  const Row = ({ label, value }: any) => value ? (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-50 text-sm">
      <span className="text-gray-500">{label}</span><span className="font-semibold text-gray-800 text-end">{value}</span>
    </div>
  ) : null

  return (
    <AppShell title={L('Offer details', 'آفر کی تفصیل', 'تفاصيل العرض')} nav={nav} dir={dir}>
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href={`/contractor/rfq/${id}`} className="inline-flex items-center gap-1 min-h-11 text-sm text-gray-600 hover:text-[#0B2438]"><span aria-hidden="true">{BACK}</span> {L('Back to the request', 'درخواست پر واپس', 'العودة إلى الطلب')}</Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl text-[#D4A543]" style={{ background: '#0B2438' }}><Glyph e="🏪" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate" style={{ color: '#0B2438' }}>{s.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</h1>
            <p className="text-gray-500 text-sm"><span className="tabular-nums font-bold text-[#8F6820]" dir="auto">{rfqRefLine(rfq, locale)}</span> · {rfqDesc(rfq, locale)}</p>
          </div>
          <span className={`badge text-xs ms-auto ${statusBadge.c}`}>{statusBadge.t}</span>
        </div>

        {err && (
          <div id="offer-err" role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <span>{err}</span>
            <button type="button" onClick={() => setErr('')} className="min-w-11 min-h-11 -m-3 text-red-700" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
          </div>
        )}

        {declinedNote && (
          <div role="status" className="rounded-xl border border-[#0B2438]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0B2438] flex flex-wrap items-center justify-between gap-2">
            <span>{declinedNote}</span>
            <Link href={`/contractor/rfq/${id}`} className="min-h-11 inline-flex items-center px-4 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Back to the request', 'درخواست پر واپس', 'العودة إلى الطلب')}</Link>
          </div>
        )}
        {/* a priced subset of the request: say so, so it never looks cheaper than complete offers (round-4 UX-031) */}
        {isMulti && partial && (
          <div className="rounded-xl border-2 border-[#D4A543] bg-[#D4A543]/10 px-4 py-2.5 text-sm font-semibold text-[#0B2438]">
            <Glyph e="⚠" /> {L(`This offer prices ${pricedN} of ${allN} items. Not priced: ${missingNames}.`, `یہ آفر ${allN} میں سے ${urN(pricedN, 'چیز', 'اشیاء')} کی قیمت دیتی ہے۔ قیمت نہیں دی: ${missingNames}۔`, `يسعّر هذا العرض ${pricedN} من ${arMaterials(allN, 'obl')}. لم يسعّر: ${missingNames}.`)}
          </div>
        )}
        {/* round-7 UX-003: say it on the offer page too */}
        {noTaxOffer && offer.status !== 'accepted' && (
          <div role="note" className="bg-warn-bg border border-warn-border text-warn-text text-sm rounded-xl px-4 py-2.5 font-semibold">
            <Glyph e="🧾" /> {L('This supplier does not issue a tax invoice, and your request needs a tax invoice.', 'یہ سپلائر ٹیکس انوائس جاری نہیں کرتا، اور آپ کی درخواست کو ٹیکس انوائس درکار ہے۔', 'لا يُصدر هذا المورد فاتورة ضريبية، وطلبك يحتاج فاتورة ضريبية.')}
          </div>
        )}
        {offer.status === 'pending' && offer.price_valid_until && (
          new Date(offer.price_valid_until) < new Date()
            ? <div className="bg-warn-bg border border-warn-border text-warn-text text-sm rounded-xl px-4 py-2.5 font-semibold"><Glyph e="⏱" /> {L('This offer price has expired. Confirm the price with the supplier in messages before choosing it.', 'اس آفر کی قیمت کی مدت ختم ہو گئی۔ منتخب کرنے سے پہلے پیغامات میں سپلائر سے قیمت کنفرم کریں۔', 'انتهت صلاحية سعر هذا العرض. تأكّد من السعر مع المورد عبر الرسائل قبل اختياره.')}</div>
            : <div className="bg-[#0B2438]/5 border border-[#0B2438]/15 text-[#0B2438] text-sm rounded-xl px-4 py-2.5"><Glyph e="⏱" /> {L('The supplier committed to this price until', 'سپلائر نے اس قیمت کا وعدہ اس تاریخ تک کیا ہے:', 'التزم المورد بهذا السعر حتى')} {new Date(offer.price_valid_until).toLocaleDateString(dloc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' })}.</div>
        )}

        {/* After the choice: one way to the deal (UX-017) */}
        {accepted && (() => {
          const st = dealStage(offer, 'buyer', locale)
          return (
            <Link href={`/contractor/orders/${offer.id}#deal`} className="flex items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-all hover:shadow" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', color: '#071827' }}>
              <span className="min-w-0">
                <span className="block font-extrabold">{L('Follow the deal', 'ڈیل دیکھیں', 'متابعة الصفقة')}</span>
                <span className="block text-sm font-semibold opacity-80">{st.label}</span>
              </span>
              <span aria-hidden="true" className="text-xl font-bold">{FWD}</span>
            </Link>
          )
        })()}
        {/* UX-017: the deal steps live on the deal page only (the card above links there) */}

        {/* the request */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-sm mb-2" style={{ color: '#0B2438' }}><Glyph e="📦" /> {L('Request details', 'درخواست کی تفصیل', 'تفاصيل الطلب')}</h2>
          {isMulti ? (
            <div className="py-1">
              <div className="text-sm text-gray-500 mb-1.5">{L(`Materials (${rfq.items.length})`, `اشیاء (${rfq.items.length})`, `المواد (${rfq.items.length})`)}</div>
              <ul className="divide-y divide-gray-50 border border-gray-100 rounded-xl">
                {rfq.items.map((it: any, i: number) => (
                  <li key={i} className="flex justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-gray-800 min-w-0">{pname(it.product_name)}</span>
                    <span className="font-semibold text-[#8F6820] whitespace-nowrap">{(Number(it.quantity) || 0).toLocaleString('en-US')} {unitL(it.unit)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (<>
            <Row label={L('Material', 'سامان', 'المادة')} value={pname(rfq.product_name)} />
            <Row label={L('Quantity', 'مقدار', 'الكمية')} value={`${(Number(rfq.quantity) || 0).toLocaleString('en-US')} ${unitL(rfq.unit)}`} />
          </>)}
          {!home && !isMulti && <Row label={L('Sector', 'شعبہ', 'القطاع')} value={(locale !== 'ar' && SECTOR_I18N[locale]?.[rfq.sector]) || (SECTOR_LABELS as any)[rfq.sector] || rfq.sector} />}
          <Row label={L('Delivery place', 'ڈیلیوری کی جگہ', 'مكان التسليم')} value={getPlaceLabel(rfq.city, rfq.region, locale)} />
          {!isMulti && <Row label={L('Specifications', 'اسپیسیفکیشن', 'المواصفات')} value={rfq.specification} />}
          <Row label={L('Request notes', 'درخواست کے نوٹس', 'ملاحظات الطلب')} value={rfq.notes} />
        </div>

        {/* the supplier */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-sm mb-3" style={{ color: '#0B2438' }}><Glyph e="🏪" /> {L('Supplier', 'سپلائر', 'المورد')}</h2>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-bold text-gray-900">{s.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</span>
            {taxVerified && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#0B2438]/10 text-[#0B2438]"><Glyph e="🧾" /> {L('Issues a tax invoice', 'ٹیکس انوائس جاری کرتا ہے', 'يُصدر فاتورة ضريبية')}</span>}
            {s.supplier_tier && <span className="badge text-xs bg-[#D4A543]/10 text-[#8F6820]"><SellerIcon name={tierIcon(s.supplier_tier)} /> {tierText}</span>}
            {s.verification_status === 'verified' && (
              <span className="badge text-xs" style={s.cr_verification_source === 'wathq' ? { background: '#0F6E56', color: '#fff' } : { background: '#E1F5EE', color: '#0F6E56' }}>
                {s.cr_verification_source === 'wathq' ? L('Commercial registration verified', 'کمرشل رجسٹریشن کی تصدیق شدہ', 'سجلّه التجاري موثّق') : L('Verified', 'تصدیق شدہ', 'موثّق')}
              </span>
            )}
            {!independentSeller && s.verification_status !== 'verified' && s.cr_verification_source !== 'wathq' && (
              <span className="badge text-xs bg-gray-100 text-gray-600">{L('Not verified yet', 'ابھی تصدیق نہیں ہوئی', 'غير موثّق بعد')}</span>
            )}
            {!independentSeller && offer.source_type && (
              <span className={`badge text-xs ${isDirectSource(offer.source_type) ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-warn-bg text-warn-text'}`}>
                {isDirectSource(offer.source_type) ? <><SellerIcon name="check" /> {L('Direct price from the supplier', 'سپلائر سے براہ راست قیمت', 'سعر مباشر من المورد')}</> : <><SellerIcon name={sourceIcon(offer.source_type)} /> {L(`Goods source: ${sourceLabel(offer.source_type, locale)}`, `سامان کا ماخذ: ${sourceLabel(offer.source_type, locale)}`, `مصدر البضاعة: ${sourceLabel(offer.source_type, locale)}`)}</>}
              </span>
            )}
            {offer.availability && <span className="badge text-xs bg-gray-50 text-gray-700"><SellerIcon name={availabilityIcon(offer.availability)} /> {availabilityLabel(offer.availability, locale)}</span>}
            <div className="basis-full"><SourceShopBadge offerId={offer.id} locale={locale} /></div>
            {Array.isArray(s.approvals) && s.approvals.map((a: string) => (
              <span key={a} className="badge text-xs" style={{ background: '#0F6E5614', color: '#0F6E56' }}><Glyph e="🏅" /> {L('Approved by', 'منظور شدہ:', 'معتمد لدى')} {approvalLabel(a)}</span>
            ))}
          </div>
          <Row label={L('Rating', 'ریٹنگ', 'التقييم')} value={s.rating_avg > 0 ? <span><Glyph e="⭐" /> {s.rating_avg} / 5</span> : null} />
          <Row label={L('Location', 'مقام', 'الموقع')} value={independentSeller ? getPlaceLabel(s.city, s.region, locale) : [s.district, getPlaceLabel(s.city, s.region, locale)].filter(Boolean).join(L(', ', '، ', '، '))} />
          {!independentSeller && <Row label={L('National address', 'نیشنل ایڈریس', 'العنوان الوطني')} value={s.national_short_address} />}
          {accepted
            ? <Row label={L('Contact number', 'رابطہ نمبر', 'رقم التواصل')} value={contactNum} />
            : <div className="text-xs text-gray-500 py-2 border-b border-gray-50 leading-relaxed"><Glyph e="🔒" /> {L('The supplier’s number appears once you choose their offer. Until then, message them in the app.', 'سپلائر کا نمبر آفر منتخب کرنے کے بعد نظر آئے گا۔ تب تک ایپ میں پیغام بھیجیں۔', 'يظهر رقم المورد بعد اختيار عرضه. وحتى ذلك الحين راسله داخل المنصة.')}</div>}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button type="button" onClick={async () => {
              if (!(await ensureVerified())) return
              const supabase = createClient()
              const { data, error } = await supabase.rpc('get_or_create_conversation', { p_rfq_id: id, p_supplier_id: offer.supplier_id })
              if (error || !data) { showErr(dbMessage(error, L('Could not open the conversation. Please try again.', 'گفتگو نہیں کھل سکی۔ دوبارہ کوشش کریں۔', 'تعذّر فتح المحادثة. حاول مرة أخرى.'))); return }
              router.push(`/messages?c=${data}`)
            }} className="min-h-11 text-sm px-4 rounded-xl font-semibold text-white" style={{ background: '#0B2438' }}><Glyph e="💬" /> {L('Message the supplier', 'سپلائر کو پیغام', 'راسل المورد')}</button>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="min-h-11 inline-flex items-center text-sm px-4 rounded-xl font-bold border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5">{L('WhatsApp', 'واٹس ایپ', 'تواصل واتساب')}</a>}
            {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="min-h-11 inline-flex items-center text-sm px-4 rounded-xl border border-gray-200 text-gray-700"><Glyph e="🗺" /> {L('Supplier location', 'سپلائر کا مقام', 'موقع المورد')}</a>}
          </div>
        </div>

        {/* price and delivery */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-sm mb-3" style={{ color: '#0B2438' }}><Glyph e="💰" /> {L('Price and delivery', 'قیمت اور ڈیلیوری', 'السعر والتوصيل')}</h2>
          {!isMulti && <Row label={L('Unit price', 'فی یونٹ قیمت', 'سعر الوحدة')} value={Number(offer.unit_price) > 0 ? `${fmt(buyerLinePrice(offer.unit_price, offer))} ${SAR}` : null} />}
          {/* round-7 UX-132: the date is counted in working days (no Friday); pickup reads «جاهز للاستلام خلال» */}
          <Row label={rfq.delivery_required === false ? L('Ready for pickup', 'وصولی کے لیے تیار', 'جاهز للاستلام') : L('Delivery time', 'ڈیلیوری کا وقت', 'مدة التوصيل')} value={Number(offer.delivery_days) > 0 ? (() => {
            const n = Number(offer.delivery_days)
            return L(`Within ${n} working day${n === 1 ? '' : 's'} (Friday not counted)`, `${n} کاروباری ${n === 1 ? 'دن' : 'دنوں'} میں (جمعہ کے علاوہ)`, `خلال ${arCount(n, 'يوم عمل واحد', 'يومَي عمل', 'أيام عمل', 'يوم عمل')} (دون الجمعة)`)
          })() : null} />

          {/* per-item pricing */}
          {ip.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
              <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 flex justify-between">
                <span>{L('Item pricing', 'آئٹمز کی قیمتیں', 'تسعير المواد')} ({ip.length})</span><span>{home ? L('What you pay', 'آپ کی ادائیگی', 'المبلغ الذي تدفعه') : priceBasisLabel(offer, locale)}</span>
              </div>
              {ip.map((it: any, i: any) => (
                <div key={i} className="px-3 py-2.5 border-t border-gray-100 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800">{pname(it.product_name)}</div>
                      <div className="text-xs text-gray-500">
                        {Number(it.unit_price) > 0
                          ? `${fmt(buyerLinePrice(it.unit_price, offer))} ${SAR} × ${(Number(it.quantity) || 0).toLocaleString('en-US')} ${unitL(it.unit)}`
                          : `${(Number(it.quantity) || 0).toLocaleString('en-US')} ${unitL(it.unit)}`}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900 whitespace-nowrap">{fmt(buyerLinePrice(it.total, offer))} {SAR}</div>
                  </div>
                  {/* «with installation»: the line total split into material + installation */}
                  {it.install_offered === true && (
                    <div className="mt-1.5 rounded-lg bg-[#0F6E56]/5 px-2 py-1.5 text-xs space-y-0.5">
                      <div className="flex justify-between gap-2 text-gray-600"><span>{L('Material', 'سامان', 'المادة')}</span><span>{fmt(buyerLinePrice(materialTotalOf(it), offer))} {SAR}</span></div>
                      <div className="flex justify-between gap-2 font-semibold text-[#0F6E56]"><span><Glyph e="🔧" /> {L('Installation', 'تنصیب', 'التركيب')}</span><span>{installTotalOf(it) > 0 ? `${fmt(buyerLinePrice(installTotalOf(it), offer))} ${SAR}` : L('included in the price', 'قیمت میں شامل', 'مشمول في السعر')}</span></div>
                    </div>
                  )}
                  {it.install_offered === false && <p className="text-xs font-semibold text-gray-600 mt-1">{L('Without installation (the supplier does not install)', 'تنصیب کے بغیر (سپلائر تنصیب نہیں کرتا)', 'بدون تركيب (المورد لا يقدّم التركيب)')}</p>}
                  {(it.specification || it.notes) && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-1.5 mt-1.5"><Glyph e="📝" /> <AutoTr text={it.specification || it.notes} locale={locale} /></p>}
                  {it.warranty && <p className="text-xs font-semibold text-[#0F6E56] mt-1"><Glyph e="🛡" /> {L('Warranty:', 'وارنٹی:', 'الضمان:')} {it.warranty}</p>}
                  {it.attachment_url && (
                    <a href={fileHref(it.attachment_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#8F6820] underline mt-1.5">
                      <Glyph e="📎" /> {it.attachment_name || L('Specs file', 'اسپیسیفکیشن فائل', 'ملف المواصفات')}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* the totals: one number for a home buyer; for a business the lines, the VAT-inclusive total and the VAT in it (UX-019) */}
          <div className="bg-warn-bg border border-warn-border rounded-xl p-3 my-3 text-sm">
            {home ? (
              <>
                <div className="flex justify-between items-baseline gap-3 font-extrabold text-gray-900"><span>{partial ? L('The amount for what the supplier priced', 'سپلائر کی قیمت دی گئی اشیاء کی رقم', 'المبلغ لما سعّره المورد') : L('The amount you pay', 'آپ کی ادا کردہ رقم', 'المبلغ الذي تدفعه')}</span><span className="text-lg">{fmt(offerComparable(offer))} {SAR}</span></div>
                <div className="text-xs text-gray-600 mt-0.5">{vatTag(offer, locale)}{exSum > 0 ? ` · ${L(`includes delivery and charges ${fmt(lineComparable(exSum, offer))} SAR`, `ڈیلیوری اور چارجز ${fmt(lineComparable(exSum, offer))} ریال شامل`, `يشمل التوصيل والرسوم ${fmt(lineComparable(exSum, offer))} ر.س`)}` : ''}</div>
              </>
            ) : (<>
              {/* owner 2026-11-23: every amount as the buyer pays it (with VAT, or the final price of a seller
                  without a VAT number), so the lines add up to the total; the net/VAT split is on the tax invoice */}
              <div className="flex justify-between text-gray-600"><span>{isMulti && partial ? L(`Total for what the supplier priced (${pricedN} of ${allN})`, `سپلائر کی قیمت دی گئی اشیاء کا کل (${allN} میں سے ${pricedN})`, `الإجمالي لما سعّره المورد (${pricedN} من ${allN})`) : ip.length > 0 ? L('Goods total', 'مال کا کل', 'إجمالي البضاعة') : L('Goods', 'مال', 'البضاعة')}</span><span>{fmt(lineComparable(goods, offer))} {SAR}</span></div>
              {exList.map((e: any, i: any) => (
                <div key={i} className="flex justify-between text-warn-text"><span>+ {e.label}</span><span>{fmt(lineComparable(e.amount, offer))} {SAR}</span></div>
              ))}
              {(() => {
                const total = offerComparable(offer)
                // a seller without a VAT number: one final amount, no VAT line (Saudi VAT rules)
                if (vatStatusOf(offer) !== 'registered') return (
                  <div className="flex justify-between font-bold text-gray-900 border-t border-warn-border mt-1.5 pt-1.5"><span>{totalLabel(offer, locale)}</span><span>{fmt(total)} {SAR}</span></div>
                )
                return (<>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-warn-border mt-1.5 pt-1.5"><span>{totalLabel(offer, locale)}</span><span>{fmt(total)} {SAR}</span></div>
                  <div className="flex justify-between text-xs text-gray-600"><span>{L('of which VAT 15%', 'جس میں VAT 15%', 'منها ضريبة القيمة المضافة 15%')}</span><span>{fmt(total - total / 1.15)} {SAR}</span></div>
                </>)
              })()}
            </>)}
          </div>

          {/* UX-053: the discount request and its state live with the price (the sticky bar keeps only the decision) */}
          {showBar && (<>
          {reductionLapsed && (
            <div role="status" className="text-sm text-[#0B2438] bg-[#0B2438]/5 border border-[#0B2438]/15 rounded-xl px-3 py-2 mt-3">
              <Glyph e="⏱" /> {L('The reply deadline ended without a discount. You can choose the offer at its current price or ask for a new discount.', 'جواب کی مہلت رعایت کے بغیر ختم ہو گئی۔ آپ آفر موجودہ قیمت پر منتخب کر سکتے ہیں یا نئی رعایت مانگ سکتے ہیں۔', 'انتهت مهلة الرد دون تخفيض. يمكنك اختيار العرض بسعره الحالي أو طلب تخفيض جديد.')}
            </div>
          )}
          {reducing ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#0B2438] bg-[#0B2438]/5 border border-[#0B2438]/15 rounded-xl px-3 py-2 mt-3">
              <span><Glyph e="⏳" /> {L('Discount request sent; waiting for the supplier', 'رعایت کی درخواست بھیج دی گئی؛ سپلائر کا انتظار', 'أُرسل طلب التخفيض، وبانتظار رد المورد')}{offer.reduction_deadline ? ` (${L('until', 'تک', 'حتى')} ${fmtWhen(offer.reduction_deadline)})` : ''}</span>
              <button type="button" onClick={cancelReduction} disabled={acting} className="min-h-11 px-3 text-sm font-semibold text-[#8F6820] hover:underline disabled:opacity-50">{L('Withdraw the request', 'درخواست واپس لیں', 'سحب الطلب')}</button>
            </div>
          ) : (
            <button type="button" onClick={() => setReqOpen(true)} className="block w-full min-h-11 text-center text-sm mt-3 px-4 rounded-xl font-semibold border border-[#0B2438]/30 text-[#8F6820] hover:bg-[#D4A543]/5">
              <Glyph e="📉" /> {L('Ask for a further discount (with a deadline)', 'مزید رعایت مانگیں (مقررہ وقت کے ساتھ)', 'اطلب تخفيضاً إضافياً (بمهلة محدّدة)')}
            </button>
          )}
          </>)}

          {offer.attributes && Object.keys(offer.attributes).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(offer.attributes).map(([k, v]) => (
                <span key={k} className="text-xs bg-[#D4A543]/10 text-[#8F6820] px-2 py-1 rounded-lg"><strong>{k}:</strong> {String(v)}</span>
              ))}
            </div>
          )}
          {offer.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-2"><Glyph e="📝" /> <AutoTr text={offer.notes} locale={locale} /></p>}
          {offer.attachment_url && (
            <a href={fileHref(offer.attachment_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 min-h-[44px] text-sm text-[#8F6820] underline mt-1">
              <Glyph e="📎" /> {offer.attachment_name || L('Offer attachment', 'آفر کی فائل', 'مرفق العرض')}
            </a>
          )}
        </div>

        {/* more product information: only while the offer is open or a question exists (round-4 UX-123) */}
        {(offer.status === 'pending' || !!offer.info_request) && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="font-bold text-sm" style={{ color: '#0B2438' }}><Glyph e="❓" /> {L('More product information', 'پروڈکٹ کے بارے میں مزید معلومات', 'معلومات إضافية عن المنتج')}</h2>
            {offer.status === 'pending' && !offer.info_request && (
              <button type="button" onClick={() => setInfoOpen(true)} className="min-h-11 text-sm px-4 rounded-xl border border-[#0B2438]/30 text-[#0B2438] font-semibold">{L('Ask the supplier', 'سپلائر سے پوچھیں', 'اسأل المورد')}</button>
            )}
          </div>
          {/* UX-139: say how this differs from «راسل المورد» */}
          <p className="text-xs text-gray-600 mb-2">{L('One question; its answer appears here. For other questions use «Message the supplier».', 'ایک سوال؛ اس کا جواب یہیں نظر آئے گا۔ دوسرے سوالات کے لیے «سپلائر کو پیغام» استعمال کریں۔', 'سؤال واحد يظهر جوابه هنا. للأسئلة الأخرى استخدم «راسل المورد».')}</p>
          {offer.info_request ? (
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-lg p-2.5 text-sm"><span className="text-gray-500 text-xs">{L('Your question:', 'آپ کا سوال:', 'سؤالك:')}</span><div>{offer.info_request}</div></div>
              {offer.info_response
                ? <div className="bg-[#E1F5EE] rounded-lg p-2.5 text-sm"><span className="text-[#0F6E56] text-xs">{L('Supplier reply:', 'سپلائر کا جواب:', 'رد المورد:')}</span><div>{offer.info_response}</div></div>
                : <div className="text-xs text-warn-text"><Glyph e="⏳" /> {L('Waiting for the supplier reply…', 'سپلائر کے جواب کا انتظار ہے…', 'بانتظار رد المورد…')}</div>}
            </div>
          ) : (
            <p className="text-xs text-gray-600">{L('Ask the supplier for more product details (type, specs, origin, warranty…).', 'سپلائر سے پروڈکٹ کی مزید تفصیل مانگیں (قسم، اسپیسیفکیشن، کہاں کا بنا ہے، وارنٹی…)۔', 'اطلب من المورد تفاصيل إضافية عن المنتج (النوع، المواصفات، المنشأ، الضمان…).')}</p>
          )}
        </div>

        )}

        {/* the request ended while the offer was still waiting: no actions, a way to ask again (UX-023) */}
        {!accepted && chosenId && (
          <div className="bg-white rounded-2xl p-4 border border-[#D4A543]/60 shadow-sm flex flex-wrap items-center justify-between gap-3">
            {/* round-7 UX-128: several deals on this request → the request page lists them */}
            {chosenN > 1 ? (<>
              <span className="text-sm font-semibold text-gray-800"><Glyph e="✅" /> {L('You chose other suppliers for the materials of this request.', 'آپ نے اس درخواست کی اشیاء کے لیے دوسرے سپلائرز منتخب کیے ہیں۔', 'اخترت موردين آخرين لمواد هذا الطلب.')}</span>
              <Link href={`/contractor/rfq/${id}`} className="min-h-11 inline-flex items-center gap-1 px-4 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>{L('View the deals of this request', 'اس درخواست کی ڈیلز دیکھیں', 'عرض صفقات هذا الطلب')} <span aria-hidden="true">{FWD}</span></Link>
            </>) : (<>
              <span className="text-sm font-semibold text-gray-800"><Glyph e="✅" /> {L('You chose another offer on this request.', 'آپ نے اس درخواست پر دوسری آفر منتخب کی ہے۔', 'اخترت عرضاً آخر في هذا الطلب.')}</span>
              <Link href={`/contractor/orders/${chosenId}#deal`} className="min-h-11 inline-flex items-center gap-1 px-4 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>{L('Follow the deal', 'ڈیل دیکھیں', 'متابعة الصفقة')} <span aria-hidden="true">{FWD}</span></Link>
            </>)}
          </div>
        )}
        {offer.status === 'pending' && !rfqOpen && !chosenId && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-700"><Glyph e="⏱" /> {rfq.status === 'cancelled' ? L('This request was cancelled.', 'یہ درخواست منسوخ ہو گئی۔', 'أُلغي هذا الطلب.') : L('This request has ended.', 'اس درخواست کی مدت ختم ہو گئی۔', 'انتهت مدة هذا الطلب.')}</span>
            <Link href={`/contractor/rfq/quick?from=${rfq.id}`} className="min-h-11 inline-flex items-center gap-1 px-4 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}><Glyph e="🔁" /> {L('Request again', 'دوبارہ درخواست کریں', 'اطلب مرة أخرى')}</Link>
          </div>
        )}

        {/* actions: sticky above the phone's bottom bar (UX-023) */}
        {showBar && (
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-lg sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-3 z-30">
            {pastDeadline && <p className="text-xs font-semibold text-warn-text mb-2"><Glyph e="⏱" /> {L('The offer window ended, and you can still choose this offer.', 'آفرز کی مہلت ختم ہو گئی، اور آپ اب بھی یہ آفر منتخب کر سکتے ہیں۔', 'انتهت مهلة العروض، وما زال بإمكانك اختيار هذا العرض.')}</p>}
            <div className="flex flex-wrap gap-2">
              {/* a multi-item request is chosen per item on the request page (177: accept_offer refuses it) */}
              {isMulti ? (
                <Link href={`/contractor/rfq/${rfq.id}#choose`} className="flex-[2] min-h-12 inline-flex items-center justify-center gap-1 rounded-xl font-extrabold text-sm text-center" style={{ background: '#D4A543', color: '#071827' }}>{L('Choose the best for each material', 'ہر چیز کے لیے بہترین منتخب کریں', 'اختر الأفضل لكل مادة')} <span aria-hidden="true">{FWD}</span></Link>
              ) : (
                <button type="button" onClick={acceptOffer} disabled={acting} className="flex-[2] min-h-12 rounded-xl font-extrabold text-sm disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>{reducing ? L('Choose at the original price', 'اصل قیمت پر منتخب کریں', 'اختر العرض بالسعر الأصلي') : L('Choose this offer', 'یہ آفر منتخب کریں', 'اختر هذا العرض')}</button>
              )}
              <button type="button" onClick={rejectOffer} disabled={acting} className="min-h-12 px-4 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800">{L('Not right for me', 'مناسب نہیں', 'لا يناسبني')}</button>
            </div>
          </div>
        )}

        {/* the timed discount request */}
        {reqOpen && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => !reqBusy && setReqOpen(false)}>
            <div ref={reqRef} role="dialog" aria-modal="true" aria-labelledby="req-title" className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" dir={dir} onClick={(e: any) => e.stopPropagation()}>
              <h3 id="req-title" className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="📉" /> {L('Ask for a further discount', 'مزید رعایت کی درخواست', 'طلب تخفيض إضافي')}</h3>
              <p className="text-xs text-gray-600 mb-4">{L('We ask the supplier to lower the price; they reply within the deadline you set.', 'ہم سپلائر سے قیمت کم کرنے کو کہیں گے، وہ آپ کے دیے گئے وقت میں جواب دے گا۔', 'نطلب من المورد تخفيض سعره، ويردّ خلال المهلة التي تحدّدها.')}</p>
              <label htmlFor="req-hours" className="block text-xs font-bold text-gray-600 mb-1">{L('Reply deadline', 'جواب کی مہلت', 'مهلة الرد')}</label>
              <select id="req-hours" value={reqHours} onChange={(e: any) => setReqHours(Number(e.target.value))} className="input-field mb-3 text-base sm:text-sm">
                <option value={6}>{L('6 hours', '6 گھنٹے', '6 ساعات')}</option>
                <option value={12}>{L('12 hours', '12 گھنٹے', '12 ساعة')}</option>
                <option value={24}>{L('24 hours (1 day)', '24 گھنٹے (1 دن)', '24 ساعة (يوم واحد)')}</option>
                <option value={48}>{L('48 hours (2 days)', '48 گھنٹے (2 دن)', '48 ساعة (يومان)')}</option>
                <option value={72}>{L('3 days', '3 دن', '3 أيام')}</option>
              </select>
              <label htmlFor="req-note" className="block text-xs font-bold text-gray-600 mb-1">{L('Note to the supplier (optional)', 'سپلائر کے لیے نوٹ (اختیاری)', 'ملاحظة للمورد (اختياري)')}</label>
              <textarea id="req-note" value={reqNote} onChange={(e: any) => setReqNote(e.target.value)} rows={2} className="input-field mb-3 text-base sm:text-sm" placeholder={L('e.g. The price is above market; we ask for a 5% discount', 'مثال: قیمت مارکیٹ سے زیادہ ہے، 5% رعایت چاہیے', 'مثال: السعر أعلى من السوق، ونطلب تخفيضاً بنسبة 5%')} />
              <div className="flex gap-2">
                <button type="button" disabled={reqBusy} onClick={submitReductionRequest} className="flex-1 min-h-11 rounded-xl font-bold text-[#071827] text-sm disabled:opacity-50" style={{ background: '#D4A543' }}>{reqBusy ? L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…') : L('Send request', 'درخواست بھیجیں', 'إرسال الطلب')}</button>
                <button type="button" onClick={() => setReqOpen(false)} className="min-h-11 px-4 rounded-xl text-sm border border-gray-200 text-gray-600">{L('Close without sending', 'بھیجے بغیر بند کریں', 'إغلاق دون إرسال')}</button>
              </div>
            </div>
          </div>
        )}

        {/* ask for more information */}
        {infoOpen && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => !infoBusy && setInfoOpen(false)}>
            <div ref={infoRef} role="dialog" aria-modal="true" aria-labelledby="info-title" className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" dir={dir} onClick={(e: any) => e.stopPropagation()}>
              <h3 id="info-title" className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="❓" /> {L('Ask the supplier', 'سپلائر سے پوچھیں', 'اسأل المورد')}</h3>
              <label htmlFor="info-q" className="block text-xs text-gray-600 mb-3">{L('What do you want to know about the product? (type, specs, origin, warranty…)', 'پروڈکٹ کے بارے میں کیا معلومات چاہیے؟ (قسم، اسپیسیفکیشن، کہاں کا بنا ہے، وارنٹی…)', 'ما المعلومات التي تريدها عن المنتج؟ (النوع، المواصفات، المنشأ، الضمان…)')}</label>
              <textarea id="info-q" value={infoText} onChange={(e: any) => setInfoText(e.target.value)} rows={3} className="input-field mb-3 text-base sm:text-sm" placeholder={home
                ? L('e.g. Where is it made? Does the warranty cover it?', 'مثال: یہ کہاں کا بنا ہے؟ کیا وارنٹی شامل ہے؟', 'مثال: ما بلد الصنع؟ هل يشمل الضمان؟')
                : L('e.g. Where is the steel from? Does it meet ASTM? Is there a quality certificate?', 'مثال: سریا کہاں کا بنا ہے؟ کیا یہ ASTM کے مطابق ہے؟ کیا کوالٹی سرٹیفکیٹ ہے؟', 'مثال: ما منشأ الحديد؟ هل يطابق مواصفة ASTM؟ هل توجد شهادة جودة؟')} />
              <div className="flex gap-2">
                <button type="button" disabled={infoBusy || !infoText.trim()} onClick={submitInfoRequest} className="flex-1 min-h-11 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#0B2438' }}>{infoBusy ? L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…') : L('Send to supplier', 'سپلائر کو بھیجیں', 'إرسال إلى المورد')}</button>
                <button type="button" onClick={() => setInfoOpen(false)} className="min-h-11 px-4 rounded-xl text-sm border border-gray-200 text-gray-600">{L('Close without sending', 'بھیجے بغیر بند کریں', 'إغلاق دون إرسال')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
