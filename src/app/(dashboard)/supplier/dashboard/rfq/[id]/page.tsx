'use client'

import { loadVisibleBudgets } from '@/lib/budget'
import { useEffect, useRef, useState } from 'react'
import { friendlyError } from '@/lib/friendlyError'
import { arCount, daysText } from '@/lib/text'
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react'
import AutoTr from '@/components/shared/AutoTr'
import PageLoader from '@/components/shared/PageLoader'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileHref } from '@/lib/fileHref'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import DealProtection from '@/components/shared/DealProtection'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { getProductLabel, getSubCategoryLabel, getUnitLabel, detectSubCategory, getRegionLabel, CITIES_BY_REGION } from '@/types'
import { lineComparable } from '@/lib/vat'
import { validateUploadFile } from '@/lib/fileSafety'
import { isExpired, formatTimeLeft, formatDateTime, deadlineUrgency, urgencyStyle } from '@/lib/deadline'
import { tierAllowed, SOURCE_TYPES, AVAILABILITY, sellerKindOf, WARRANTY_OPTIONS, offerOutcome, outcomeTitle, offerHasOpenDiscount, sourceTypesFor, fixSourceFor, sectionLabelOf } from '@/lib/sellers'
import { SourceShopFields, SourceShopCard } from '@/components/rfq/SourceShop'
import { rfqRefLine, rfqDesc } from '@/lib/rfqName'
import { installTotalOf } from '@/lib/installation'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import PartialExtrasConfirm from '@/components/shared/PartialExtrasConfirm'
import { PAYMENT_TERMS } from '@/lib/paymentTerms'
import { compressImage } from '@/lib/compressImage'
import { askConfirm } from '@/lib/askConfirm'
// Arabic-Indic / Persian digits and «٫» from Arabic and Urdu keyboards → 12.5 (type=number refused them silently)
const latinNum = (v: string) => String(v ?? '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '')

// UX-043: the quantities a draft was typed for (a draft for other quantities is dropped)
const qtySigOf = (items: any[]) => (items || []).map((it: any) => `${it.item_index}:${it.quantity}:${it.unit || ''}`).join('|')

export default function SupplierRFQPage() {
  const { id } = useParams()
  const router = useRouter()
  const { locale, dir } = useTranslation()
  const FWD = dir === 'rtl' ? '←' : '→'
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const SAR = L('SAR', 'ریال', 'ر.س')
  const [user, setUser] = useState<any>(null)
  const [actingId, setActingId] = useState('') // الشركة لعضو الفريق، وإلا المستخدم نفسه
  const [verified, setVerified] = useState(true) // تفاؤلي؛ يُضبط من الملف. القفل الحقيقي على مستوى القاعدة (RLS)
  const [gate, setGate] = useState<{ region: boolean; sectors: boolean; contact: boolean } | null>(null) // UX-114: what blocks quoting
  const [crRequired, setCrRequired] = useState(false) // company/shop without a CR cannot price yet (244)
  const [rfq, setRfq] = useState<any>(null)
  const [buyerBudgets, setBuyerBudgets] = useState<Record<number, number>>({}) // R23: only budgets the buyer chose to show (before VAT)
  const [existingOffer, setExistingOffer] = useState<any>(null)
  // a multi-item request awarded per item: which of my items were chosen (review 2026-10-28 — the
  // supplier saw the whole offer as accepted when only some items were awarded to him)
  const [myAwards, setMyAwards] = useState<{ idx: Set<number>; total: number } | null>(null)
  // market average per material + unit (accepted prices, get_market_prices); 3+ prices so no single rival shows
  const [market, setMarket] = useState<Record<string, { avg: number; n: number }>>({})
  useEffect(() => {
    createClient().rpc('get_market_prices').then(({ data }: any) => {
      const m: Record<string, { avg: number; n: number }> = {}
      for (const r of (data || [])) if (Number(r.offer_count) >= 3 && Number(r.avg_price) > 0) m[`${r.product_name}__${r.unit || ''}`] = { avg: Number(r.avg_price), n: Number(r.offer_count) }
      setMarket(m)
    }, () => {})
  }, [])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState('')
  // تقييم المورّد للمشتري (متبادل)
  const [cRating, setCRating] = useState(0)
  const [cComment, setCComment] = useState('')
  const [cBusy, setCBusy] = useState(false)
  const [cDone, setCDone] = useState(false)
  const [cMsg, setCMsg] = useState('')

  const [totalPrice, setTotalPrice] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  // تسعير بند-بند: لكل مادة بطاقة مستقلة (سعر الوحدة + خصائص + ملاحظة + كتالوج خاص)
  const [itemForms, setItemForms] = useState<any[]>([])
  const [openItem, setOpenItem] = useState<number | null>(null) // البطاقة المفتوحة (أكورديون)
  // «لا أوفّر هذه المادة»: skipped lines are cleared and left out of item_prices (same as the app)
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  // after sending: the next open request this supplier has not priced yet (from the home snapshot)
  const [nextRfq, setNextRfq] = useState<string | null>(null)
  // Help understanding the request: per line, what the material is and which details are missing
  // (/api/explain-items: catalog fields checked for free, AI for the rest, cached for every supplier).
  const [itemNotes, setItemNotes] = useState<Record<number, { what_it_is: string; missing: string[] }>>({})
  const [asking, setAsking] = useState<number | null>(null)
  // المواد التي تخصّ هذا المورد فقط (ضمن قطاعاته/تخصصاته) — هي وحدها التي يسعّرها ويراها
  const [myItems, setMyItems] = useState<any[]>([])
  const [contractorInfo, setContractorInfo] = useState<any>(null)
  const [deliveryDays, setDeliveryDays] = useState('')
  const [notes, setNotes] = useState('')
  const [priceValidity, setPriceValidity] = useState('3') // مدة صلاحية سعر العرض (بالأيام)
  // من أين السعر؟ (مخزوني / مصنع أو مورد / محل / وسيط) والتوفّر — يظهران للمشتري بوضوح
  const [sourceType, setSourceType] = useState('')
  const [availability, setAvailability] = useState('') // UX-112: an explicit choice, no silent «available now»
  const [allDaysOther, setAllDaysOther] = useState(false)
  const [allDays, setAllDays] = useState('') // UX-113: one delivery time for every material ('' = per material)
  const [reattach, setReattach] = useState(false) // UX-031: a restored offer had files: ask to attach them again
  const [srcSaveFailed, setSrcSaveFailed] = useState(false) // UX-111
  const [sentSummary, setSentSummary] = useState<{ n: number; gross: number } | null>(null) // UX-177
  const [isIndependent, setIsIndependent] = useState(false)
  const [myTier, setMyTier] = useState<string | null>(null) // passed to DealProtection (who the seller is)
  // «وسيط تسعير»: the shop the independent seller buys from (migration 213; hidden from the buyer until the deal)
  const [src, setSrc] = useState({ name: '', city: '', area: '', phone: '' })
  const [singleWarranty, setSingleWarranty] = useState('') // الضمان لطلب المادة الواحدة (يُحفظ ضمن الخصائص)
  const [validity, setValidity] = useState('')

  // خصائص المنتج (key-value)
  const [attributes, setAttributes] = useState([{ key: '', value: '' }])

  // ملف مرفق (كتالوج/بيانات منتج)
  const [attachFile, setAttachFile] = useState<any>(null)

  // dismiss modal
  const [showDismiss, setShowDismiss] = useState(false)
  const [dismissReason, setDismissReason] = useState('')
  const [dismissing, setDismissing] = useState(false)
  const [dismissError, setDismissError] = useState('')

  // رد على طلب تخفيض السعر من المشتري
  const [newPrice, setNewPrice] = useState('')
  const [reducing, setReducing] = useState(false)
  // UX-028: errors of the actions on a sent offer are shown above the offer status (the form is closed then)
  const [actionError, setActionError] = useState('')
  // UX-147: what was just sent (shown in green above the offer status, no page reload)
  const [actionNotice, setActionNotice] = useState('')
  // UX-094: why my offer was not chosen (my_offer_outcome: price | delivery | other, no numbers); null = unknown
  const [lostReason, setLostReason] = useState<string | null>(null)
  // UX-150: how far a lost price was from the chosen one (band only, from my_offer_outcome): 'lt5' | 'lt10' | 'gt10'
  const [gapBand, setGapBand] = useState<string | null>(null)
  // UX-012: a single-material request is priced per unit; «أدخل الإجمالي بدلاً من ذلك» switches to the total
  const [singleByTotal, setSingleByTotal] = useState(false)
  // UX-043: the offer sent before the buyer edited the request (kept on this device when it was sent)
  const [prevSent, setPrevSent] = useState<any>(null)
  // UX-016: renewing an expired price guarantee
  const [renewing, setRenewing] = useState(false)
  // UX-031: the typed prices of a closed request saved into «أسعاري»
  const [savedToPrices, setSavedToPrices] = useState<number | null>(null)
  const [savingPrices, setSavingPrices] = useState(false)
  // UX-044: a team member forwarded the missing detail to the account owner
  const [askedOwner, setAskedOwner] = useState<Record<number, boolean>>({})
  async function submitReduction() {
    setActionError('')
    const np = Number(newPrice)
    if (!newPrice || !(np > 0)) { setActionError(L('Enter the new total price.', 'نئی کل قیمت درج کریں۔', 'أدخل السعر الإجمالي الجديد.')); return }
    if (np >= Number(existingOffer?.total_price || 0)) { setActionError(L('The new price must be lower than your current price.', 'نئی قیمت آپ کی موجودہ قیمت سے کم ہونی چاہیے۔', 'يجب أن يكون السعر الجديد أقل من سعرك الحالي.')); return }
    setReducing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('submit_price_reduction', { p_offer_id: existingOffer.id, p_new_total: np })
    setReducing(false)
    if (error) { setActionError(friendlyError(error.message, L('Could not send the new price — please try again.', 'نئی قیمت نہیں بھیجی جا سکی — دوبارہ کوشش کریں۔', 'تعذّر إرسال السعر الجديد، حاول مرة أخرى.'), locale)); return }
    // UX-147: say what was sent and close the request card at once (no reload)
    const isNet = existingOffer?.vat_included === false && existingOffer?.vat_status !== 'not_registered'
    const shown = (+(isNet ? np * 1.15 : np).toFixed(2)).toLocaleString('en-US')
    setExistingOffer((o: any) => o ? { ...o, total_price: np, reduction_deadline: null } : o)
    setNewPrice('')
    // UX-138: the server scales the line prices too: read the offer again so the lines match the new total
    Promise.resolve(supabase.from('offers').select('*').eq('id', existingOffer.id).maybeSingle()).then(({ data }: any) => { if (data) setExistingOffer(data) }, () => {})
    const tag = existingOffer?.vat_status === 'not_registered' ? L(' (final price)', ' (حتمی قیمت)', ' (سعر نهائي)') : L(' incl. VAT', ' ٹیکس سمیت', ' شاملة الضريبة')
    setActionNotice(L(`Your new price was sent to the buyer: ${shown} SAR${tag}`, `آپ کی نئی قیمت خریدار کو بھیج دی گئی: ${shown} ریال${tag}`, `أُرسل السعر الجديد إلى المشتري: ${shown} ر.س${tag}`))
  }
  // UX-030 / round-2 UX-033: «I can't lower the price» closes the discount request (decline_price_reduction:
  // clears reduction_deadline and tells the buyer the current price stands), then offers the conversation.
  const [declining, setDeclining] = useState(false)
  const [declinedConv, setDeclinedConv] = useState(false)
  const cannotReduceMsg = () => L('Hello, thank you for your interest. My price is the best I can offer for this request, and I cannot lower it.', 'السلام علیکم، دلچسپی کا شکریہ۔ اس درخواست کے لیے یہ میری بہترین قیمت ہے، میں اسے کم نہیں کر سکتا۔', 'مرحباً، شكراً لاهتمامك. السعر المقدّم هو أفضل سعر أستطيع تقديمه لهذا الطلب، ولا أستطيع تخفيضه.')
  async function openConversation(msg?: string) {
    setActionError('')
    const supabase = createClient()
    const { data, error: e } = await supabase.rpc('get_or_create_conversation', { p_rfq_id: id, p_supplier_id: actingId || user?.id })
    if (e || !data) { setActionError(L('Could not open the conversation — please try again.', 'گفتگو نہیں کھل سکی — دوبارہ کوشش کریں۔', 'تعذّر فتح المحادثة، حاول مرة أخرى.')); return }
    router.push(`/messages?c=${data}${msg ? `&msg=${encodeURIComponent(msg)}` : ''}`)
  }
  async function cannotReduce() {
    setActionError('')
    setDeclining(true)
    const supabase = createClient()
    const { error: e } = await supabase.rpc('decline_price_reduction', { p_offer_id: existingOffer.id })
    setDeclining(false)
    if (e) {
      // the RPC is not deployed yet (or failed): the old way, a ready message in the conversation
      if (isMember) { setActionError(L('Could not send your answer — please try again.', 'آپ کا جواب نہیں بھیجا جا سکا — دوبارہ کوشش کریں۔', 'تعذّر إرسال ردّك، حاول مرة أخرى.')); return }
      return openConversation(cannotReduceMsg())
    }
    setExistingOffer((o: any) => o ? { ...o, reduction_deadline: null } : o)
    setDeclinedConv(!isMember)
    setActionNotice(L('The buyer was told that your current price is the best you can offer.', 'خریدار کو بتا دیا گیا کہ آپ کی موجودہ قیمت آپ کی بہترین پیشکش ہے۔', 'أُبلغ المشتري أن سعرك الحالي هو أفضل ما تقدّمه.'))
  }

  // UX-031: «تعديل العرض» within 15 minutes: the sent offer becomes a draft on this device first, so
  // the form reopens with every price, delivery, VAT basis, extras and source, then the offer is cancelled.
  function draftFromOffer(o: any): any {
    const ip: any[] = Array.isArray(o?.item_prices) ? o.item_prices : []
    const byIdx: Record<number, any> = {}
    for (const p of ip) byIdx[Number(p.item_index)] = p
    const forms = (myItems || []).map((it: any) => {
      const p = byIdx[Number(it.item_index)]
      if (!p) return { unit_price: '', line_total: '', saved: false, specs: '', priceDetails: false, delivery_days: '' }
      const material = it.with_install && p.material_total != null ? Number(p.material_total) : Number(p.total) || 0
      const customUnit = p.unit && p.unit !== it.unit ? p.unit : undefined
      return {
        unit_price: p.unit_price != null ? String(p.unit_price) : '', line_total: material ? String(material) : '',
        saved: false, specs: p.specification || '', priceDetails: false, delivery_days: p.delivery_days ? String(p.delivery_days) : '',
        warranty: p.warranty || '', source_type: fixSourceFor(isIndependent, p.source_type), ...(customUnit ? { priceUnit: customUnit } : {}),
        ...(it.with_install ? (p.install_offered === false ? { no_install: true, install_total: '' } : { install_total: String(p.install_total ?? 0) }) : {}),
      }
    })
    const skippedIdx = (myItems || []).map((it: any, k: number) => (byIdx[Number(it.item_index)] ? -1 : k)).filter((k: number) => k >= 0)
    const ex: any[] = Array.isArray(o?.extra_charges) ? o.extra_charges : []
    const deliv = ex.find((e: any) => e.label === 'توصيل')
    const others = ex.filter((e: any) => e !== deliv).map((e: any) => ({ label: String(e.label || ''), amount: String(e.amount ?? '') }))
    const noteLines = String(o?.notes || '').split('\n')
    const dMode = deliv ? 'amount' : noteLines.includes('التوصيل مشمول في السعر.') ? 'included' : noteLines.includes('التوصيل مجاني.') ? 'free' : null
    const cleanNotesText = noteLines.filter((l: string) => l !== 'التوصيل مشمول في السعر.' && l !== 'التوصيل مجاني.').join('\n').trim()
    const attrs = o?.attributes && typeof o.attributes === 'object' ? Object.entries(o.attributes).filter(([k]) => k !== 'الضمان').map(([k, v]) => ({ key: k, value: String(v) })) : []
    const isMulti = Array.isArray(rfq?.items) && rfq.items.length > 0
    const goodsSum = isMulti ? '' : String((Number(o?.total_price) || 0) - ex.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0))
    // round-2 UX-079: keep the price guarantee (nearest of 1/3/7/30 days) and one delivery time for all
    const validDays = o?.price_valid_until && o?.created_at ? (new Date(o.price_valid_until).getTime() - new Date(o.created_at).getTime()) / 86400000 : 3
    const validity = [1, 3, 7, 30].reduce((best, v) => (Math.abs(v - validDays) < Math.abs(best - validDays) ? v : best), 3)
    const dayVals = forms.filter((f: any) => f.line_total).map((f: any) => f.delivery_days || '')
    const sameDays = isMulti && dayVals.length > 0 && dayVals[0] !== '' && dayVals.every((d: string) => d === dayVals[0]) ? dayVals[0] : ''
    if (sameDays) for (const f of forms) f.delivery_days = ''
    return {
      single: !isMulti, itemForms: forms, skipped: skippedIdx,
      priceValidity: String(validity), allDays: sameDays || (!isMulti && o?.delivery_days ? String(o.delivery_days) : ''),
      totalPrice: isMulti ? String(forms.reduce((s: number, f: any, k: number) => s + (parseFloat(f.line_total) || 0) + (myItems[k]?.with_install && !f.no_install ? (parseFloat(f.install_total) || 0) : 0), 0) || '') : goodsSum,
      unitPrice: o?.unit_price != null ? String(o.unit_price) : '', deliveryDays: !isMulti && o?.delivery_days ? String(o.delivery_days) : '',
      notes: cleanNotesText, sourceType: fixSourceFor(isIndependent, o?.source_type), availability: o?.availability || '',
      qtySig: qtySigOf(myItems),
      singleWarranty: o?.attributes?.['الضمان'] || '', attributes: attrs.length ? attrs : [{ key: '', value: '' }],
      extras: others.length ? others : [{ label: '', amount: '' }], delivMode: dMode, delivAmount: deliv ? String(deliv.amount) : '',
      payTerms: o?.payment_terms ?? null, vatIncluded: o?.vat_included !== false, src: srcBackup,
      hadFiles: !!o?.attachment_url || ip.some((p: any) => p.attachment_url),
    }
  }
  const [srcBackup, setSrcBackup] = useState<any>(null) // the source shop of the sent offer (pricing agent), restored on edit
  const [cancelling, setCancelling] = useState(false)
  async function cancelOffer() {
    if (!existingOffer) return
    setActionError('')
    if (!(await askConfirm(
      L('Withdraw the offer to edit it? The buyer will not see your offer until you send it again. Your prices and details stay filled in on this device.', 'ترمیم کے لیے آفر واپس لیں؟ جب تک آپ دوبارہ نہیں بھیجتے، خریدار آپ کی آفر نہیں دیکھے گا۔ آپ کی قیمتیں اور تفصیلات اس ڈیوائس پر بھری رہیں گی۔', 'سحب العرض لتعديله؟ لن يرى المشتري عرضك حتى ترسله من جديد، وتبقى أسعارك وتفاصيلك معبّأة على هذا الجهاز.'),
      { okLabel: L('Withdraw and edit', 'واپس لیں اور ترمیم کریں', 'اسحب العرض وعدّله'), cancelLabel: L('Keep the offer as it is', 'آفر ویسی ہی رکھیں', 'أبقِ العرض كما هو') },
    ))) return
    const key = `tsk_offer_draft_${actingId || user?.id}_${id}`
    try { localStorage.setItem(key, JSON.stringify(draftFromOffer(existingOffer))); localStorage.removeItem(`tsk_offer_sent_${actingId || user?.id}_${id}`) } catch {}
    setCancelling(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('cancel_my_offer', { p_offer_id: existingOffer.id })
    setCancelling(false)
    if (error) { try { localStorage.removeItem(key) } catch {}; setActionError(friendlyError(error.message, L('Could not open the offer for editing — please try again.', 'آفر ترمیم کے لیے نہیں کھل سکی — دوبارہ کوشش کریں۔', 'تعذّر فتح العرض للتعديل، حاول مرة أخرى.'), locale)); return }
    window.location.reload()
  }

  // رد على طلب معلومات إضافية من المشتري
  const [infoReply, setInfoReply] = useState('')
  const [infoReplying, setInfoReplying] = useState(false)
  async function submitInfoResponse() {
    setActionError('')
    if (!infoReply.trim()) { setActionError(L('Write your reply first.', 'پہلے اپنا جواب لکھیں۔', 'اكتب ردّك أولاً.')); return }
    setInfoReplying(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('respond_offer_info', { p_offer_id: existingOffer.id, p_answer: infoReply.trim() })
    setInfoReplying(false)
    if (error) { setActionError(L('Could not send the reply — please try again.', 'جواب نہیں بھیجا جا سکا — دوبارہ کوشش کریں۔', 'تعذّر إرسال الرد، حاول مرة أخرى.')); return }
    // UX-147: show the reply at once and say it was sent
    const ans = infoReply.trim()
    setExistingOffer((o: any) => o ? { ...o, info_response: ans } : o)
    setInfoReply('')
    setActionNotice(L('Your reply was sent to the buyer.', 'آپ کا جواب خریدار کو بھیج دیا گیا۔', 'أُرسل ردّك إلى المشتري.'))
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      // Speed: the database is far from our users (~1 s a request), so requests go out in two
      // parallel rounds instead of ten in a row.
      // Round 1 — who may quote (CR-verified suppliers OR a WhatsApp-verified phone, same rule as the
      // offers INSERT policy, migration 117), who we act for (a team member prices for the company),
      // the request itself (precise delivery location stripped server-side for non-awarded
      // suppliers, H1; null if this supplier may not see it) and the buyer identity (revealed by the
      // server only after acceptance).
      const [{ data: canQuote }, { data: actRaw }, { data: rfqData }, { data: cInfo }] = await Promise.all([
        supabase.rpc('can_submit_quote'),
        supabase.rpc('acting_uid'),
        supabase.rpc('get_rfq_for_viewer', { p_rfq_id: id }),
        supabase.rpc('get_rfq_contractor', { p_rfq_id: id }),
      ])
      setVerified(canQuote === true)
      if (canQuote !== true) {
        const aid: string = (actRaw as any) || session.user.id
        Promise.all([
          supabase.from('profiles').select('region').eq('id', aid).maybeSingle(),
          supabase.from('profile_sectors').select('sector', { count: 'exact', head: true }).eq('profile_id', aid),
        ]).then(([{ data: pr }, { count }]: any) => setGate({ region: !!(pr?.region || '').trim(), sectors: (count || 0) > 0, contact: !!(session.user.email_confirmed_at || session.user.phone_confirmed_at) }), () => {})
      }
      setNextRfq(findNextRfq())
      supabase.rpc('my_pricing_gate').then(({ data }: any) => setCrRequired(data?.cr_required === true), () => {})
      const actId: string = (actRaw as any) || session.user.id
      setActingId(actId)
      if (!rfqData) { setRfq(null); setLoading(false); return }
      setRfq(rfqData)
      // UX-146 (migration 271): count the view only (the buyer never sees who viewed); fire and forget
      Promise.resolve(supabase.rpc('log_rfq_view', { p_rfq_id: id })).then(() => {}, () => {})
      loadVisibleBudgets(supabase, id as string).then(setBuyerBudgets)
      setContractorInfo(Array.isArray(cInfo) ? cInfo[0] : cInfo)
      fetch('/api/explain-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rfq_id: id }) })
        .then(r => r.json()).then(j => {
          if (!j?.ok) return
          const m: Record<number, { what_it_is: string; missing: string[] }> = {}
          for (const x of j.items || []) m[x.index] = { what_it_is: x.what_it_is || '', missing: x.missing || [] }
          setItemNotes(m)
        }).catch(() => {})

      // Round 2 — everything about this supplier and its offer on this request.
      const [{ data: me }, { data: secRows }, { data: specRows }, { data: myPrices }, { data: offerData }] = await Promise.all([
        supabase.from('profiles').select('provider_type, supplier_tier, vat_number').eq('id', actId).single(),
        supabase.from('profile_sectors').select('sector').eq('profile_id', actId),
        supabase.from('profile_specialties').select('specialty').eq('profile_id', actId),
        supabase.from('live_prices').select('product_name, price, unit, region').eq('supplier_id', actId),
        supabase.from('offers').select('*').eq('rfq_id', id).eq('supplier_id', actId).maybeSingle(),
      ])
      // A company quotes from its own stock by default; an independent seller must say where the
      // price comes from.
      const indep = sellerKindOf(me?.provider_type) === 'independent'
      setIsIndependent(indep)
      setMyTier(me?.supplier_tier || null)
      // An independent seller without a VAT number is not VAT-registered: no VAT question, the price
      // they type is the final price the buyer pays (persona review: «لا تُضاف 15% فوق سعري»).
      // no VAT number: kept on the offer (vat_status) so platform documents show no VAT amount for it
      if (!(me?.vat_number || '').trim()) setNoVat(true)
      // UX-014: a pricing agent has no stock: his default is «من محل في السوق», never «من مخزوني»
      setSourceType(indep ? 'shop' : 'own_stock')

      // ✅ المورد يرى/يسعّر فقط المواد ضمن تخصصه — لا تظهر له مواد قطاع لا يخدمه
      if (Array.isArray(rfqData?.items) && rfqData.items.length > 0) {
        const mySectors = (secRows || []).map((r: any) => r.sector)
        const mySpecialties = (specRows || []).map((r: any) => r.specialty)
        const myTier = me?.supplier_tier || 'shop'
        const filtered = (rfqData.items as any[]).map((it: any, i: number) => ({ ...it, item_index: i })).filter((it: any) => {
          if (mySectors.length > 0 && !mySectors.includes(it.sector)) return false
          if (mySpecialties.length > 0 && it.sub_category && !mySpecialties.includes(it.sub_category)) return false
          if (!tierAllowed(it.supplier_tiers, myTier)) return false
          return true
        })
        setMyItems(filtered)
        // تعبئة تلقائية من أسعار المورّد المحفوظة (صفحة «أسعاري»)
        // key on product_name + unit so a per-ton saved price never fills a per-bar field (B5);
        // skip saved prices tied to a different region (region-agnostic saved prices still apply).
        const rfqRegion = rfqData?.region || null
        const priceMap: Record<string, number> = {}
        try { Object.assign(priceMap, JSON.parse(localStorage.getItem('tsk_myprices_' + actId) || '{}')) } catch {}
        for (const pr of (myPrices || [])) {
          if (rfqRegion && pr.region && pr.region !== rfqRegion) continue
          const key = `${pr.product_name}__${pr.unit || ''}`
          priceMap[key] = Number(pr.price) // a price kept in «أسعاري» wins over the remembered one
        }
        // a remembered price is only a suggestion: the line counts as priced once the seller taps
        // «استخدم سعرك السابق» or types a price (audit 2026-11-01: stale prices were sent unseen)
        const freshForms = filtered.map((it: any) => {
          const subKey = it.sub_category || detectSubCategory(it.product_name, it.sector)
          const subName = subKey ? getSubCategoryLabel(it.sector, subKey, 'ar') : ''
          const own = priceMap[`${it.product_name}__${it.unit || ''}`] || 0
          const sp = own || (subName ? priceMap[`${subName}__${it.unit || ''}`] : 0)
          // UX-148: a price saved for the whole category is said as such, not as «your previous price»
          return { unit_price: '', line_total: '', saved: false, specs: '', file: null, priceDetails: false, delivery_days: '', ...(sp > 0 ? { suggest: sp, ...(own ? {} : { suggestSub: subKey }) } : {}) }
        })
        // a draft of this offer kept on this device (long requests): restored while no offer was sent
        let restored = false
        if (!offerData) {
          try {
            const d = JSON.parse(localStorage.getItem(`tsk_offer_draft_${actId}_${id}`) || 'null')
            // UX-043: a draft typed for other quantities (the buyer edited the request) is dropped
            if (d && Array.isArray(d.itemForms) && d.itemForms.length === freshForms.length && (!d.qtySig || d.qtySig === qtySigOf(filtered))) {
              setItemForms(d.itemForms.map((f: any, k: number) => ({ ...freshForms[k], ...f, source_type: fixSourceFor(indep, f?.source_type), file: null })))
              setSkipped(new Set((d.skipped || []).map(Number)))
              applyDraft(d, indep)
              restored = true
            } else if (d) { try { localStorage.removeItem(`tsk_offer_draft_${actId}_${id}`) } catch {} }
          } catch {}
        }
        if (!restored) setItemForms(freshForms)
        setDraftRestored(restored)
        setOpenItem(null)
      } else if (!offerData) {
        try {
          const d = JSON.parse(localStorage.getItem(`tsk_offer_draft_${actId}_${id}`) || 'null')
          if (d && d.single && (!d.qtySig || d.qtySig === String(rfqData?.quantity ?? ''))) { applyDraft(d, indep); setDraftRestored(true) }
        } catch {}
      }

      // UX-043: no offer now, but one was sent from this device: the buyer edited the request (offers are cleared)
      if (!offerData) {
        try {
          const ps = JSON.parse(localStorage.getItem(`tsk_offer_sent_${actId}_${id}`) || 'null')
          if (ps && Array.isArray(ps.lines)) setPrevSent(ps)
        } catch {}
      } else { try { localStorage.removeItem(`tsk_offer_sent_${actId}_${id}`) } catch {} }
      if (offerData) {
        setExistingOffer(offerData)
        if (indep) supabase.rpc('get_offer_source', { p_offer_id: offerData.id }).then(({ data: s }: any) => { if (s) setSrcBackup({ name: s.name || '', city: s.city || '', area: s.area || '', phone: s.phone || '' }) }, () => {})
        const { data: aw } = await supabase.from('rfq_item_awards').select('item_index, total').eq('offer_id', offerData.id)
        if (aw && aw.length) setMyAwards({ idx: new Set(aw.map((a: any) => Number(a.item_index))), total: aw.reduce((t: number, a: any) => t + (Number(a.total) || 0), 0) })
        // UX-094: the reason a lost offer was not chosen (price / delivery / other, never numbers); quiet if the RPC is missing
        if (offerData.status === 'rejected' && rfqData?.status !== 'cancelled' && rfqData?.status !== 'expired') {
          Promise.resolve(supabase.rpc('my_offer_outcome', { p_offer_id: offerData.id })).then(({ data: oc, error: oe }: any) => {
            const r = typeof oc === 'string' ? oc : oc?.reason
            if (!oe && (r === 'price' || r === 'delivery' || r === 'other')) setLostReason(r)
            const gb = typeof oc === 'object' && oc ? oc.gap_band : null
            if (!oe && (gb === 'lt5' || gb === 'lt10' || gb === 'gt10')) setGapBand(gb)
          }, () => {})
        }
        if (offerData.status === 'accepted') {
          const { data: rev } = await supabase.from('reviews').select('id').eq('reviewer_id', offerData.supplier_id).eq('offer_id', offerData.id).limit(1)
          if (rev && rev.length) setCDone(true)
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (loading || typeof window === 'undefined' || window.location.hash !== '#deal') return
    const t = setTimeout(() => document.getElementById('deal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    return () => clearTimeout(t)
  }, [loading])

  // نبضة لتحديث العدّاد التنازلي لمهلة التسعير: كل دقيقة، وكل 15 ثانية في آخر 15 دقيقة (UX-081)
  const [, setTick] = useState(0)
  const msLeft = rfq?.expires_at ? new Date(rfq.expires_at).getTime() - Date.now() : Infinity
  const lastMinutes = msLeft > 0 && msLeft <= 15 * 60 * 1000
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), lastMinutes ? 15000 : 60000)
    return () => clearInterval(t)
  }, [lastMinutes])
  const expired = isExpired(rfq?.expires_at)

  // نافذة تعديل/إلغاء العرض: ١٥ دقيقة من لحظة إرساله، وما دام «قيد المراجعة»
  const offerEditDeadline = existingOffer?.created_at ? new Date(existingOffer.created_at).getTime() + 15 * 60 * 1000 : 0
  const canEditOffer = existingOffer?.status === 'pending' && offerEditDeadline > Date.now()
  const editMinsLeft = canEditOffer ? Math.max(1, Math.ceil((offerEditDeadline - Date.now()) / 60000)) : 0

  // حساب سعر الوحدة تلقائياً
  function handleTotalChange(val: any) {
    setTotalPrice(val)
    if (rfq?.quantity && val) setUnitPrice(String(+(parseFloat(val) / rfq.quantity).toFixed(4)))
    else if (!val) setUnitPrice('')
  }
  // UX-012: the main field of a single-material request is the unit price; the total = unit × quantity
  function handleSingleUnitChange(val: any) {
    setUnitPrice(val)
    const q = Number(rfq?.quantity) || 0
    if (val && q > 0) setTotalPrice(String(+((parseFloat(val) || 0) * q).toFixed(2)))
    else setTotalPrice(q > 0 ? '' : val)
  }

  // تسعير بند-بند: لكل مادة سعر وحدة + خصائص + ملاحظة + كتالوج خاص
  // المورد يسعّر فقط myItems (مواد تخصصه) — لا كل مواد الطلب
  const rfqIsMulti = Array.isArray(rfq?.items) && rfq.items.length > 0
  const isMultiItem = rfqIsMulti
  // الإجمالي = مجموع سعر كل مادة (line_total) — المورد حر يدخله مباشرة أو يحسبه من سعر الوحدة
  // «مع التركيب»: the installation amount of a priced line the buyer asked to be installed
  // (0 when «لا أقدّم التركيب» or not entered). Same VAT basis as the material price.
  function installPart(f: any, it: any): number {
    if (!it?.with_install || f?.no_install || !(parseFloat(f?.line_total) > 0)) return 0
    return Math.max(0, parseFloat(f?.install_total) || 0)
  }
  // a priced line that asked for installation needs an answer: an amount (0 = included) or «لا أقدّم التركيب»
  function installAnswered(f: any, it: any): boolean {
    if (!it?.with_install || !(parseFloat(f?.line_total) > 0) || f?.no_install) return true
    return String(f?.install_total ?? '').trim() !== '' && parseFloat(f.install_total) >= 0
  }
  function setItemInstall(i: any, patch: any) {
    setItemForms(prev => {
      const next = prev.map((f: any, idx: any) => idx === i ? { ...f, ...patch, saved: false } : f)
      recomputeGoods(next)
      return next
    })
  }
  function recomputeGoods(forms: any) {
    const sum = (myItems || []).reduce((s, it, idx) => s + (parseFloat(forms[idx]?.line_total) || 0) + installPart(forms[idx], it), 0)
    setTotalPrice(sum ? String(+sum.toFixed(2)) : '')
  }
  // الوحدة التي يسعّر بها المورد تطابق الوحدة المطلوبة؟ (إن لم يحدّد وحدة خاصة)
  function sameUnit(f: any, i: any) { return !f?.priceUnit || f.priceUnit === (myItems[i]?.unit || '') }
  // أي تعديل على السعر يلغي حالة "محفوظ" حتى يحفظ المورد من جديد.
  // الربط التلقائي (سعر الوحدة × الكمية = الإجمالي) يعمل فقط عند التسعير بالوحدة المطلوبة؛
  // لو اختار المورد وحدة خاصة، يبقى الإجمالي وسعر الوحدة مستقلّين.
  function setItemUnit(i: any, val: any) {
    setItemForms(prev => {
      const next = prev.map((f: any, idx: any) => {
        if (idx !== i) return f
        const q = myItems[i]?.quantity || 0
        const lt = (sameUnit(f, i) && val !== '') ? (q > 0 ? String(+((parseFloat(val) || 0) * q).toFixed(2)) : f.line_total) : f.line_total
        return { ...f, unit_price: val, line_total: lt, saved: false, fromPrev: false }
      })
      recomputeGoods(next)
      return next
    })
  }
  // a remembered per-unit price no longer fits once the unit changes (as in the app)
  function setItemPriceUnit(i: any, val: any) {
    setItemForms(prev => prev.map((f: any, idx: any) => idx === i ? { ...f, priceUnit: val, saved: false, ...(f.fromPrev ? { unit_price: '', line_total: '', fromPrev: false } : {}) } : f))
  }
  function setItemTotal(i: any, val: any) {
    setItemForms(prev => {
      const next = prev.map((f: any, idx: any) => {
        if (idx !== i) return f
        const q = myItems[i]?.quantity || 0
        const up = (sameUnit(f, i) && val !== '') ? (q > 0 ? String(+((parseFloat(val) || 0) / q).toFixed(4)) : f.unit_price) : f.unit_price
        return { ...f, line_total: val, unit_price: up, saved: false, fromPrev: false }
      })
      recomputeGoods(next)
      return next
    })
  }
  // one tap: take the remembered price (it only counts as priced from here)
  // UX-030: «أسعاري» keeps the final price (incl. VAT); a form typed before VAT takes it divided by 1.15
  function prevVal(sp: number): number { return !noVat && vatIncluded === false ? +(sp / 1.15).toFixed(2) : sp }
  function takePrevPrice(i: any, sp: number) {
    setItemUnit(i, String(prevVal(sp)))
    setItemField(i, 'fromPrev', true)
  }
  function setItemField(i: any, field: any, val: any) {
    setItemForms(prev => prev.map((f: any, idx: any) => idx === i ? { ...f, [field]: val } : f))
  }
  // «اسأل المشتري»: open the conversation on this request with the question already written.
  async function askBuyer(it: any, missing: string[]) {
    const idx = Number(it.item_index ?? 0)
    setAsking(idx)
    const supabase = createClient()
    const { data, error: e } = await supabase.rpc('get_or_create_conversation', { p_rfq_id: id, p_supplier_id: actingId || user?.id })
    setAsking(null)
    if (e || !data) { setError(L('Could not open the conversation', 'گفتگو نہیں کھل سکی', 'تعذّر فتح المحادثة')); return }
    const msg = `مرحباً، بخصوص «${it.product_name}»: هل يمكنك تحديد ${missing.join('، ')}؟`
    router.push(`/messages?c=${data}&msg=${encodeURIComponent(msg)}`)
  }

  async function setItemFile(i: any, f: any) {
    if (!f) { setItemForms(prev => prev.map((x: any, idx: any) => idx === i ? { ...x, file: null } : x)); return }
    const v = await validateUploadFile(f)
    if (!v.ok) { setError(v.error || ''); return }
    setError('')
    setItemForms(prev => prev.map((x: any, idx: any) => idx === i ? { ...x, file: f } : x))
  }
  // لإتاحة الإرسال: يكفي مادة واحدة مسعّرة ومحفوظة — المورد غير ملزم بتسعير كل المواد
  // A priced line counts even if «حفظ المادة» was not pressed: the price is already entered.
  const allItemsPriced = isMultiItem ? (myItems.length > 0 && myItems.some((_: any, i: any) => parseFloat(itemForms[i]?.line_total) > 0)) : true

  function addAttribute() {
    setAttributes(prev => [...prev, { key: '', value: '' }])
  }
  function updateAttribute(i: any, field: any, val: any) {
    setAttributes(prev => prev.map((a: any, idx: any) => idx === i ? { ...a, [field]: val } : a))
  }
  function removeAttribute(i: any) {
    setAttributes(prev => prev.filter((_: any, idx: any) => idx !== i))
  }

  // إضافات الفاتورة (توصيل/تركيب/رسوم) — label + amount
  const [extras, setExtras] = useState([{ label: '', amount: '' }])
  // delivery requested by the buyer: how the supplier charges it (null = not answered)
  const [delivMode, setDelivMode] = useState<'included' | 'free' | 'amount' | null>(null)
  const [payTerms, setPayTerms] = useState<string | null>(null) // offers.payment_terms (optional)
  const [delivAmount, setDelivAmount] = useState('')
  // هل السعر المُدخل يشمل ضريبة القيمة المضافة 15%؟ — اختيار صريح بلا قيمة افتراضية (null = لم يُحدَّد بعد)،
  // كي لا تُضاف 15% فوق سعر شامل دون أن ينتبه المورّد.
  // owner decision 2026-10-17: every price is typed and shown including VAT (no VAT question)
  const [vatIncluded, setVatIncluded] = useState<boolean | null>(true)
  const [noVat, setNoVat] = useState(false) // seller without a VAT number: the price is final
  const [showMore, setShowMore] = useState(false) // «خيارات أخرى (اختياري)»
  const [notesOpen, setNotesOpen] = useState(false) // UX-032: buyer notes on phones (two lines, then «المزيد»)
  const [showSourcePick, setShowSourcePick] = useState(false) // UX-112: a company sees «مصدر السعر: من مخزوني · تغيير»
  // الإجمالي كما سيراه المشتري (صافٍ + ضريبة + إجمالي) — يُستخدم في التفصيل وفي ملخّص ما قبل الإرسال
  function offerTotals() {
    const goods = parseFloat(totalPrice) || 0
    const exSum = extras.reduce((s: any, e: any) => s + (parseFloat(e.amount) || 0), 0) + (delivMode === 'amount' ? (parseFloat(delivAmount) || 0) : 0)
    const entered = goods + exSum
    // not VAT-registered: the typed price is final, no VAT inside it or on top of it
    if (noVat) return { entered, net: entered, vat: 0, gross: entered }
    const net = vatIncluded ? entered / 1.15 : entered
    const vat = net * 0.15
    return { entered, net, vat, gross: net + vat }
  }
  function addExtra() { setExtras(prev => [...prev, { label: '', amount: '' }]) }
  function updateExtra(i: any, field: any, val: any) { setExtras(prev => prev.map((e: any, idx: any) => idx === i ? { ...e, [field]: val } : e)) }
  function removeExtra(i: any) { setExtras(prev => prev.filter((_: any, idx: any) => idx !== i)) }

  // Offer draft on this device (audit 2026-11-01: a long offer was lost on a reload or a call).
  // Saved ~500 ms after the last change once the seller edits something; cleared on send.
  const [draftRestored, setDraftRestored] = useState(false)
  const draftKey = actingId && id ? `tsk_offer_draft_${actingId}_${id}` : ''
  function applyDraft(d: any, indep: boolean = isIndependent) {
    if (typeof d.totalPrice === 'string') setTotalPrice(d.totalPrice)
    if (typeof d.unitPrice === 'string') setUnitPrice(d.unitPrice)
    if (typeof d.deliveryDays === 'string') setDeliveryDays(d.deliveryDays)
    if (typeof d.notes === 'string') setNotes(d.notes)
    if (typeof d.priceValidity === 'string' && d.priceValidity) setPriceValidity(d.priceValidity)
    if (typeof d.sourceType === 'string' && d.sourceType) setSourceType(fixSourceFor(indep, d.sourceType))
    if (typeof d.availability === 'string' && d.availability) setAvailability(d.availability)
    if (typeof d.singleWarranty === 'string') setSingleWarranty(d.singleWarranty)
    if (Array.isArray(d.attributes) && d.attributes.length) setAttributes(d.attributes)
    if (Array.isArray(d.extras) && d.extras.length) setExtras(d.extras)
    if (d.delivMode === 'included' || d.delivMode === 'free' || d.delivMode === 'amount') setDelivMode(d.delivMode)
    if (typeof d.delivAmount === 'string') setDelivAmount(d.delivAmount)
    if (typeof d.payTerms === 'string' || d.payTerms === null) setPayTerms(d.payTerms ?? null)
    if (typeof d.vatIncluded === 'boolean') setVatIncluded(d.vatIncluded)
    if (d.src && typeof d.src.name === 'string') setSrc({ name: d.src.name || '', city: d.src.city || '', area: d.src.area || '', phone: d.src.phone || '' })
    if (typeof d.allDays === 'string') { setAllDays(d.allDays); if (d.allDays && !['1', '2', '3', '7'].includes(d.allDays)) setAllDaysOther(true) }
    if (d.hadFiles) setReattach(true)
  }
  const draftJson = JSON.stringify({
    single: !isMultiItem, qtySig: isMultiItem ? qtySigOf(myItems) : String(rfq?.quantity ?? ''),
    itemForms: itemForms.map((f: any) => { const { file: _file, ...rest } = f || {}; return rest }),
    skipped: [...skipped], totalPrice, unitPrice, deliveryDays, notes, priceValidity, sourceType, availability,
    singleWarranty, attributes, extras, delivMode, delivAmount, payTerms, vatIncluded, src, allDays,
  })
  const draftBase = useRef<string | null>(null)
  useEffect(() => {
    if (loading || !draftKey || existingOffer || success) return
    if (draftBase.current === null) { draftBase.current = draftJson; return } // the state as loaded
    if (draftJson === draftBase.current) return
    const t = setTimeout(() => { try { localStorage.setItem(draftKey, draftJson) } catch {} }, 500)
    return () => clearTimeout(t)
  }, [draftJson, draftKey, loading, existingOffer, success])

  // UX-006: while the phone send bar is on screen, the assistant bubble must not cover it (AiAssistant reads this flag)
  const sendBarOn = !loading && !!rfq && !existingOffer && rfq?.status === 'open' && !expired && verified && !success && !dismissed
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (sendBarOn) document.body.dataset.actionbar = '1'
    else delete document.body.dataset.actionbar
    return () => { delete document.body.dataset.actionbar }
  }, [sendBarOn])

  // a send error is shown at the top of the form: bring it into view on phones
  useEffect(() => {
    if (!error || typeof window === 'undefined' || window.innerWidth >= 1024) return
    document.getElementById('offer-error-top')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  // the next open request this supplier has not priced yet (from the home snapshot)
  function findNextRfq(alsoDone?: string): string | null {
    try {
      for (let k = 0; k < sessionStorage.length; k++) {
        const key = sessionStorage.key(k)
        if (!key || !key.startsWith('tsk_pc_sup_')) continue
        const snap = JSON.parse(sessionStorage.getItem(key) || '{}').data || {}
        const done = new Set((snap.offers || []).map((o: any) => o.rfq_id)); done.add(id); if (alsoDone) done.add(alsoDone)
        const nx = (snap.openRfqs || []).find((x: any) => !done.has(x.id))
        if (nx) return nx.id
      }
    } catch {}
    return null
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!user) return
    if (isExpired(rfq?.expires_at)) {
      setError(L('The pricing deadline for this request has passed — offers can no longer be sent.', 'اس درخواست کی قیمت دینے کی مہلت ختم ہو گئی — اب آفر نہیں بھیجی جا سکتی۔', 'انتهت مهلة التسعير لهذا الطلب — لم يعد بالإمكان إرسال عرض.'))
      return
    }
    if (isMultiItem && !allItemsPriced) {
      setError(L('Enter a price for at least one material before sending the offer.', 'آفر بھیجنے سے پہلے کم از کم ایک مال کی قیمت درج کریں۔', 'أدخل سعر مادة واحدة على الأقل قبل إرسال العرض.'))
      return
    }
    // an unnamed extra amount would make the shown total differ from the total that is sent
    if (extras.some((ex: any) => parseFloat(ex.amount) > 0 && !String(ex.label || '').trim())) {
      setError(L('Name each extra amount (e.g. installation).', 'ہر اضافی رقم کا نام لکھیں (جیسے: تنصیب)۔', 'اكتب اسم كل مبلغ إضافي (مثل: تركيب).'))
      return
    }
    if (isMultiItem && myItems.some((it: any, i: number) => !installAnswered(itemForms[i], it))) {
      setError(L('Enter the installation price, or choose «I don\'t install», for each item the buyer asked to be installed.', 'جن اشیاء کی خریدار نے تنصیب مانگی ہے، ان کی تنصیب کی قیمت درج کریں یا «میں تنصیب نہیں کرتا» منتخب کریں۔', 'أدخل سعر التركيب، أو اختر «لا أقدّم التركيب»، لكل مادة طلب المشتري تركيبها.'))
      return
    }
    if (rfq?.delivery_required && (!delivMode || (delivMode === 'amount' && !(parseFloat(delivAmount) > 0)))) {
      setError(L('Say how you charge the delivery the buyer requested.', 'خریدار نے ڈیلیوری مانگی ہے — بتائیں اس کی لاگت کیسے ہوگی۔', 'حدّد تكلفة التوصيل الذي طلبه المشتري.'))
      return
    }
    if (vatIncluded === null) {
      setError(L('Choose whether your price includes 15% VAT.', 'منتخب کریں کہ آیا آپ کی قیمت میں 15% ویٹ شامل ہے۔', 'حدّد هل يشمل سعرك ضريبة القيمة المضافة (15%).'))
      return
    }
    // round-3 UX-032: the buyer set a maximum delivery time: the delivery time is required
    if (deliveryMissing()) {
      setError(L('Set the delivery time to send.', 'بھیجنے کے لیے ڈیلیوری کا وقت درج کریں۔', 'حدّد مدة التوصيل لتتمكّن من الإرسال.'))
      return
    }
    // UX-014: a pricing agent never sells from his own stock
    if (isIndependent && (sourceType === 'own_stock' || itemForms.some((f: any) => f?.source_type === 'own_stock'))) {
      setError(L('A pricing agent does not sell from his own stock; choose where the price comes from.', 'قیمت ایجنٹ اپنے اسٹاک سے نہیں بیچتا؛ قیمت کا ذریعہ منتخب کریں۔', 'وسيط التسعير لا يبيع من مخزونه، فاختر مصدر السعر.'))
      return
    }
    // UX-032: every check runs before any upload or confirmation
    if (!sourceType) {
      setError(L('Choose where this price comes from.', 'قیمت کا ذریعہ منتخب کریں۔', 'حدّد مصدر السعر قبل الإرسال.'))
      return
    }
    if (!availability) {
      setError(L('Choose the availability of the materials before sending.', 'بھیجنے سے پہلے مال کی دستیابی منتخب کریں۔', 'حدّد توفّر المواد لتتمكّن من الإرسال.'))
      return
    }
    if (isIndependent && src.name.trim().length < 2) {
      setError(L('Write the name of the shop you will buy from (the buyer sees its name only after the award).', 'جس دکان سے آپ خریدیں گے اس کا نام لکھیں (خریدار اس کا نام صرف سودے کے بعد دیکھتا ہے)۔', 'اكتب اسم المحل الذي ستشتري منه (لا يرى المشتري اسمه إلا بعد أن يختار عرضك).'))
      return
    }
    // a pricing agent above his per-deal cap: the buyer can only award items up to the cap (broker_guard, 214).
    // round-2 UX-090: a request with one material can never be awarded above the cap, so it is not sent (same as the app).
    if (isIndependent) {
      try {
        const { data: capRow } = await createClient().rpc('my_agent_deal_cap')
        const cap = (capRow as any)?.cap
        const deals = Number((capRow as any)?.deals) || 0
        const g = offerTotals().gross
        if (cap != null && g > Number(cap)) {
          const gs = Math.round(g).toLocaleString('en-US'), cs = Number(cap).toLocaleString('en-US')
          const target = Number(cap) <= 15000 ? 3 : 10
          const pricedLines = isMultiItem ? myItems.filter((_: any, k: number) => parseFloat(itemForms[k]?.line_total) > 0).length : 1
          if (pricedLines <= 1) {
            setError(L(
              `Your current limit is ${cs} SAR per deal, and this offer is ${gs} SAR. You have completed ${Math.min(deals, target)} of ${target} successful deals. Lower the price, or price only part of the materials.`,
              `فی سودا آپ کی موجودہ حد ${cs} ریال ہے، اور یہ آفر ${gs} ریال کی ہے۔ آپ نے ${target} میں سے ${Math.min(deals, target)} کامیاب سودے مکمل کیے۔ قیمت کم کریں، یا صرف کچھ اشیاء کی قیمت دیں۔`,
              `حدّك الحالي ${cs} ر.س للصفقة، وقيمة هذا العرض ${gs} ر.س. أكملتَ ${Math.min(deals, target)} من ${target} صفقات ناجحة. خفّض السعر أو سعّر جزءاً من المواد.`))
            return
          }
          const go = (await askConfirm(L(
            `Your offer total (${gs} SAR) is above your current limit per deal (${cs} SAR). The buyer will only be able to choose from you materials worth up to your limit. Send anyway?`,
            `آپ کی آفر کی کل رقم (${gs} ریال) فی سودا آپ کی موجودہ حد (${cs} ریال) سے زیادہ ہے۔ خریدار آپ سے صرف آپ کی حد تک کی اشیاء چن سکے گا۔ پھر بھی بھیجیں؟`,
            `إجمالي عرضك (${gs} ر.س) أكبر من حدّك الحالي للصفقة (${cs} ر.س). لن يستطيع المشتري أن يختار منك إلا مواد لا يتجاوز مجموعها حدّك. هل ترسل العرض؟`),
            { okLabel: L('Send the offer', 'آفر بھیجیں', 'أرسل العرض'), cancelLabel: L('Lower the price', 'قیمت کم کریں', 'أخفّض السعر') }))
          if (!go) return
        }
      } catch { /* the database still enforces the cap at award */ }
    }
    setSubmitting(true)
    setError('')
    try { // uploads, compression and the insert can throw on a dropped connection: always release the button

    const validAttrs = attributes.filter((a: any) => a.key && a.value)
    const attrObj = validAttrs.reduce((acc: any, a: any) => { acc[a.key] = a.value; return acc }, {})
    if (!isMultiItem && singleWarranty.trim()) attrObj['الضمان'] = singleWarranty.trim()

    const supabase = createClient()

    // رفع الملف المرفق إن وجد
    let attachUrl = null, attachName = null
    if (attachFile) {
      const safe = await validateUploadFile(attachFile) // fast client pre-check (UX only)
      if (!safe.ok) { setError(safe.error || ''); setSubmitting(false); return }
      // Authoritative server-side validation + upload (the magic-byte check here
      // can't be bypassed from the browser).
      const fd = new FormData(); fd.append('file', await compressImage(attachFile)) // lighter photos
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setError(j?.message || L('Could not upload the attachment — try again, or remove it and send the offer without it.', 'منسلک فائل اپ لوڈ نہیں ہو سکی — دوبارہ کوشش کریں، یا فائل ہٹا کر آفر بغیر اس کے بھیجیں۔', 'تعذّر رفع الملف المرفق — حاول مجدداً، أو أزل المرفق وأرسل العرض بدونه.'))
        setSubmitting(false)
        return
      }
      attachUrl = j.url
      attachName = j.name
    }

    // إضافات الفاتورة → total النهائي = سعر البضاعة + الإضافات
    const delivExtra = delivMode === 'amount' && parseFloat(delivAmount) > 0 ? [{ label: 'توصيل', amount: parseFloat(delivAmount) }] : []
    const validExtras0 = extras
      .filter((e: any) => e.label && e.amount)
      .map((e: any) => ({ label: e.label, amount: parseFloat(e.amount) || 0 }))
    const validExtras = [...delivExtra, ...validExtras0]
    const delivNote = delivMode === 'included' ? 'التوصيل مشمول في السعر.' : delivMode === 'free' ? 'التوصيل مجاني.' : ''
    const goods = parseFloat(totalPrice) || 0
    const finalTotal = goods + validExtras.reduce((s: any, e: any) => s + e.amount, 0)

    // تسعير بند-بند: لكل مادة سعرها + خصائصها + كتالوجها الخاص
    let itemPricesPayload = null
    if (isMultiItem) {
      itemPricesPayload = []
      for (let i = 0; i < myItems.length; i++) {
        const it = myItems[i]
        const form = itemForms[i] || {}
        if (!(parseFloat(form.line_total) > 0)) continue // المورد سعّر بعض المواد فقط — نتجاهل غير المسعّرة
        // رفع كتالوج هذه المادة (إن وُجد) — فحص أمني على الخادم
        let upUrl = null, upName = null
        if (form.file) {
          const safe = await validateUploadFile(form.file)
          if (!safe.ok) { setError(`${L('Catalog', 'کیٹلاگ', 'كتالوج')} «${locale === 'ar' ? it.product_name : getProductLabel(it.product_name, locale)}»: ${safe.error}`); setSubmitting(false); return }
          const ifd = new FormData(); ifd.append('file', await compressImage(form.file))
          const ires = await fetch('/api/upload-attachment', { method: 'POST', body: ifd })
          const ij = await ires.json().catch(() => ({}))
          if (!ires.ok || !ij.ok) {
            setError(L(`Could not upload the catalog for «${getProductLabel(it.product_name, locale)}» — remove it or try again.`, `«${getProductLabel(it.product_name, locale)}» کا کیٹلاگ اپ لوڈ نہیں ہو سکا — اسے ہٹائیں یا دوبارہ کوشش کریں۔`, `تعذّر رفع كتالوج «${getProductLabel(it.product_name, locale)}» — أزله أو حاول مجدداً.`))
            setSubmitting(false); return
          }
          upUrl = ij.url; upName = ij.name
        }
        const up = parseFloat(form.unit_price) || 0
        const lineTotal = parseFloat(form.line_total) || (up * (it.quantity || 0))
        // «مع التركيب»: total = material + installation, so awards/comparisons/orders keep using total
        const inst = it.with_install ? +installPart(form, it).toFixed(2) : 0
        const installFields = it.with_install
          ? { install_offered: !form.no_install, install_total: form.no_install ? 0 : inst, material_total: +lineTotal.toFixed(2) }
          : {}
        itemPricesPayload.push({
          item_index: it.item_index, product_name: it.product_name, sub_category: it.sub_category || null, sector: it.sector,
          unit: (form.priceUnit && form.priceUnit.trim()) || it.unit, quantity: it.quantity,
          unit_price: up || null, total: +(lineTotal + inst).toFixed(2), ...installFields,
          delivery_days: parseInt(form.delivery_days) || parseInt(allDays) || null,
          warranty: (form.warranty || '').trim() || null,
          specification: (form.specs || '').trim() || null,
          source_type: form.source_type || null,
          attachment_url: upUrl, attachment_name: upName,
        })
      }
    }

    const { data: newOffer, error: insertError } = await supabase.from('offers').insert({
      rfq_id: id,
      source_type: sourceType,
      availability: availability || null,
      supplier_id: actingId || user.id,
      total_price: finalTotal,
      price_valid_until: new Date(Date.now() + (parseInt(priceValidity) || 3) * 86400000).toISOString(),
      vat_included: noVat ? true : vatIncluded === true, // not registered: the price is final, nothing is added
      vat_status: noVat ? 'not_registered' : 'registered',
      item_prices: itemPricesPayload,
      unit_price: isMultiItem ? null : (unitPrice ? parseFloat(unitPrice) : null),
      delivery_days: isMultiItem
        ? (itemPricesPayload && itemPricesPayload.length ? (Math.max(0, ...itemPricesPayload.map((e: any) => e.delivery_days || 0)) || null) : null)
        : (parseInt(deliveryDays) || parseInt(allDays) || null),
      notes: [delivNote, notes].filter(Boolean).join('\n') || null,
      attributes: Object.keys(attrObj).length > 0 ? attrObj : null,
      extra_charges: validExtras.length > 0 ? validExtras : null,
      payment_terms: payTerms,
      attachment_url: attachUrl,
      attachment_name: attachName,
    }).select('id').single()

    if (insertError) {
      setError((insertError as any).code === '23505'
        ? L('Your company already sent an offer for this request (a colleague may have just priced it). Reopen the page to see it.', 'آپ کی کمپنی اس درخواست پر پہلے ہی آفر بھیج چکی ہے (شاید کسی ساتھی نے ابھی بھیجی)۔ دیکھنے کے لیے صفحہ دوبارہ کھولیں۔', 'أرسلت شركتك عرضاً لهذا الطلب (ربما سعّره زميلك للتو). أعد فتح الصفحة لتراه.')
        : (insertError.message || '').includes('offer_rate_limited')
        ? (locale === 'en' ? 'Too many offers in the last hour. Verify your account to remove the limit, or try again later.' : locale === 'ur' ? 'ایک گھنٹے میں بہت زیادہ آفرز۔ حد ختم کرنے کے لیے اکاؤنٹ کی تصدیق کریں، یا بعد میں کوشش کریں۔' : 'تجاوزت عدد العروض المسموح في الساعة. وثّق حسابك لإزالة الحد، أو حاول لاحقاً.')
        : (insertError.message || '').includes('الموثّقين فقط')
        ? L('This request is for verified suppliers only.', 'یہ درخواست صرف تصدیق شدہ سپلائرز کے لیے ہے۔', 'هذا الطلب للموردين الموثّقين فقط.')
        : (insertError.message || '').includes('نوع آخر من الموردين')
        ? L('This request is aimed at another type of supplier.', 'یہ درخواست دوسری قسم کے سپلائرز کے لیے ہے۔', 'هذا الطلب موجّه لنوع آخر من الموردين.')
        : (insertError as any).hint === 'EMAIL_NOT_VERIFIED' || (insertError.message || '').includes('وثّق بريدك')
        ? L('Verify your email first (Settings → a code by email), then send the offer.', 'پہلے اپنی ای میل تصدیق کریں (ترتیبات ← ای میل کوڈ)، پھر آفر بھیجیں۔', 'وثّق بريدك الإلكتروني أولاً من الإعدادات (يصلك رمز على البريد)، ثم أرسل العرض.')
        : (insertError as any).hint === 'PHONE_NOT_VERIFIED' || (insertError.message || '').includes('وثّق رقم جوالك')
        ? L('Verify your mobile number first (Settings → a code by text message), then send the offer.', 'پہلے اپنا موبائل نمبر تصدیق کریں (ترتیبات ← ٹیکسٹ میسج کوڈ)، پھر آفر بھیجیں۔', 'وثّق رقم جوالك أولاً من الإعدادات (يصلك رمز برسالة نصية)، ثم أرسل العرض.')
        : (insertError.message || '').includes('خارج نطاق مناطق تغطيتك')
        ? L('This request is outside the regions you cover.', 'یہ درخواست آپ کے علاقوں سے باہر ہے۔', 'هذا الطلب خارج نطاق مناطق تغطيتك.')
        : L('Could not send the offer — please try again.', 'آفر نہیں بھیجی جا سکی — دوبارہ کوشش کریں۔', 'تعذّر إرسال العرض — حاول مرة أخرى.'))
      console.error('offer insert', insertError)
      setSubmitting(false); return
    }
    setNextRfq(findNextRfq(id as string))
    try {
      const k = 'tsk_myprices_' + (actingId || user.id)
      const mem = JSON.parse(localStorage.getItem(k) || '{}')
      for (const it of (itemPricesPayload || []) as any[]) if (Number(it.unit_price) > 0) mem[`${it.product_name}__${it.unit || ''}`] = Number(it.unit_price)
      const keys = Object.keys(mem); if (keys.length > 400) for (const x of keys.slice(0, keys.length - 400)) delete mem[x]
      localStorage.setItem(k, JSON.stringify(mem))
    } catch {}
    if (isIndependent && newOffer?.id) {
      // UX-111: retry once; a failure is shown on the success screen (the buyer cannot choose the offer without the shop)
      const srcArgs = { p_offer_id: newOffer.id, p_shop_name: src.name.trim(), p_shop_city: src.city.trim() || null, p_shop_area: src.area.trim() || null, p_shop_phone: src.phone.trim() || null }
      let { error: sErr } = await supabase.rpc('set_offer_source', srcArgs)
      if (sErr) ({ error: sErr } = await supabase.rpc('set_offer_source', srcArgs))
      if (sErr) { console.error('set_offer_source', sErr); setSrcSaveFailed(true) }
    }
    setSentSummary({ n: isMultiItem ? (itemPricesPayload || []).length : 1, gross: offerTotals().gross })
    // UX-043: a copy of what was sent, to refill the matching lines if the buyer edits the request
    try {
      const lines = isMultiItem
        ? (itemPricesPayload || []).map((e: any) => ({ product_name: e.product_name, unit: e.unit, unit_price: e.unit_price, quantity: e.quantity }))
        : [{ product_name: rfq?.product_name || '', unit: rfq?.unit || '', unit_price: unitPrice ? parseFloat(unitPrice) : null, quantity: rfq?.quantity }]
      localStorage.setItem(`tsk_offer_sent_${actingId || user.id}_${id}`, JSON.stringify({ at: Date.now(), vatIncluded: noVat ? true : vatIncluded === true, lines }))
    } catch {}
    try { localStorage.removeItem(`tsk_offer_draft_${actingId || user.id}_${id}`) } catch {}
    setSuccess(true)
    } catch (err) {
      console.error('offer submit failed', err)
      setError(L('Could not send because of the connection. Your draft is saved; try again.', 'کنکشن کی وجہ سے نہیں بھیجا جا سکا۔ آپ کا مسودہ محفوظ ہے، دوبارہ کوشش کریں۔', 'تعذّر الإرسال بسبب الاتصال. مسودتك محفوظة، حاول مرة أخرى.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function undoDismiss() {
    if (dismissing) return
    setDismissing(true); setDismissError('')
    try {
      const { error: uErr } = await createClient().from('rfq_dismissals').delete().eq('rfq_id', id).eq('supplier_id', actingId || user.id)
      if (uErr) { setDismissError(L('Could not bring the request back — please try again.', 'درخواست واپس نہیں لائی جا سکی — دوبارہ کوشش کریں۔', 'تعذّر إعادة الطلب، حاول مرة أخرى.')); return }
      setDismissed(false); setDismissReason('')
    } finally {
      setDismissing(false)
    }
  }

  async function handleDismiss() {
    if (dismissing) return
    setDismissing(true); setDismissError('')
    try {
      const supabase = createClient()
      const { error: dErr } = await supabase.from('rfq_dismissals').insert({
        rfq_id: id, supplier_id: actingId || user.id, reason: dismissReason || null,
      })
      // already dismissed (unique row) counts as done
      if (dErr && (dErr as any).code !== '23505') {
        console.error('rfq dismiss', dErr)
        setDismissError(L('Could not hide this request — please try again.', 'یہ درخواست چھپائی نہیں جا سکی — دوبارہ کوشش کریں۔', 'تعذّر تجاهل هذا الطلب — حاول مرة أخرى.'))
        return
      }
      try { localStorage.removeItem(`tsk_offer_draft_${actingId || user.id}_${id}`) } catch {}
      setDismissed(true)
      setShowDismiss(false)
    } catch (err) {
      console.error('rfq dismiss failed', err)
      setDismissError(L('Could not hide this request because of the connection — try again.', 'کنکشن کی وجہ سے درخواست چھپائی نہیں جا سکی — دوبارہ کوشش کریں۔', 'تعذّر تجاهل الطلب بسبب الاتصال — حاول مرة أخرى.'))
    } finally {
      setDismissing(false)
    }
  }

  const T = {
    ar: {
      back: '→ رجوع', details: 'تفاصيل الطلب', sector: 'القسم', qty: 'الكمية',
      location: 'الموقع', contractor: 'المشتري', spec: 'المواصفات', notes: 'ملاحظات',
      delivery: 'التوصيل', vat: 'فاتورة ضريبية', required: 'مطلوب', notRequired: 'غير مطلوب',
      submitOffer: 'سعّر هذا الطلب', totalPrice: 'السعر الإجمالي (ر.س)', unitPrice: 'سعر الوحدة (ر.س)',
      verifyFirst: 'أكمل ملفك لتقديم العروض', verifyFirstSub: 'حدّد موقعك وتخصصاتك وأكّد بريدك الإلكتروني، ثم عُد لتسعير هذا الطلب. التوثيق اختياري، ويمنح عروضك شارة «موثّق».', verifyFirstCta: 'أكمل ملفك ←',
      deliveryDays: 'مدة التوصيل (أيام)', attributes: 'خصائص المنتج المعروض',
      attrHint: 'أضف خصائص مثل: العلامة التجارية، بلد المنشأ، الضمان...',
      attrKey: 'الخاصية', attrValue: 'القيمة', addAttr: '+ إضافة خاصية',
      attachTitle: 'إرفاق ملف (كتالوج / بيانات منتج)', attachHint: 'PDF، صورة، Excel — يصل للمشتري مع عرضك',
      attachBtn: 'اضغط لرفع كتالوج أو ملف المنتج', removeAttach: 'إزالة',
      offerNotes: 'ملاحظات إضافية', send: 'إرسال العرض ←', sending: 'جارٍ الإرسال...',
      dismiss: 'هذا الطلب لا يناسبني', dismissTitle: 'إخفاء هذا الطلب؟',
      dismissSub: 'لن يظهر هذا الطلب مرة أخرى في قائمتك', dismissReason: 'سبب التجاهل (اختياري)',
      confirmDismiss: 'نعم، أخفِ الطلب', cancel: 'تراجع',
      attachedFile: 'ملف مواصفات مرفق', viewFile: 'عرض الملف',
      successTitle: 'أُرسل عرضك', successSub: 'سننبّهك فور قرار المشتري.',
      dismissedTitle: 'أُخفي الطلب', dismissedSub: 'لن يظهر هذا الطلب في قائمتك',
      backDash: 'العودة إلى الرئيسية',
      alreadyTitle: { accepted: 'تهانينا، اختار المشتري عرضك', rejected: 'لم يُختر عرضك هذه المرة', pending: 'عرضك بانتظار قرار المشتري' },
      closed: 'هذا الطلب مغلق', closedSub: 'لا يقبل عروض جديدة',
    },
    en: {
      back: '← Back', details: 'Request Details', sector: 'Section', qty: 'Quantity',
      location: 'Location', contractor: 'Buyer', spec: 'Specification', notes: 'Notes',
      delivery: 'Delivery', vat: 'Tax Invoice', required: 'Required', notRequired: 'Not Required',
      submitOffer: 'Price this request', totalPrice: 'Total Price (SAR)', unitPrice: 'Unit Price (SAR)',
      verifyFirst: 'Complete your profile to submit offers', verifyFirstSub: 'Set your location and specialties and confirm your email, then come back to price this request. Verification is optional and adds a «Verified» badge to your offers.', verifyFirstCta: 'Complete your profile →',
      deliveryDays: 'Delivery Time (days)', attributes: 'Product Attributes',
      attrHint: 'Add attributes like: Brand, Country of origin, Warranty...',
      attrKey: 'Attribute', attrValue: 'Value', addAttr: '+ Add Attribute',
      attachTitle: 'Attach File (catalog / product data)', attachHint: 'PDF, image, Excel — sent to the buyer with your offer',
      attachBtn: 'Click to upload catalog or product file', removeAttach: 'Remove',
      offerNotes: 'Additional Notes', send: 'Send Offer →', sending: 'Sending...',
      dismiss: 'This request is not for me', dismissTitle: 'Dismiss this request?',
      dismissSub: 'This request will not appear again in your list', dismissReason: 'Reason (optional)',
      confirmDismiss: 'Yes, hide the request', cancel: 'Go back',
      attachedFile: 'Spec file attached', viewFile: 'View File',
      successTitle: 'Your offer was sent', successSub: 'We will alert you as soon as the buyer decides.',
      dismissedTitle: 'Request Dismissed', dismissedSub: 'This request will not appear in your list',
      backDash: 'Back to home',
      alreadyTitle: { accepted: 'Congratulations, the buyer chose your offer', rejected: 'Your offer was not chosen this time', pending: 'Your offer is waiting for the buyer' },
      closed: 'This request is closed', closedSub: 'No new offers accepted',
    },
    ur: {
      back: '→ واپس', details: 'درخواست کی تفصیلات', sector: 'زمرہ', qty: 'مقدار',
      location: 'مقام', contractor: 'خریدار', spec: 'تفصیلات', notes: 'نوٹس',
      delivery: 'ڈیلیوری', vat: 'ٹیکس انوائس', required: 'ضروری', notRequired: 'غیر ضروری',
      submitOffer: 'قیمت پیش کریں', totalPrice: 'کل قیمت (SAR)', unitPrice: 'فی یونٹ قیمت (SAR)',
      verifyFirst: 'پیشکش دینے کے لیے پروفائل مکمل کریں', verifyFirstSub: 'اپنا مقام اور مہارتیں منتخب کریں اور ای میل کی تصدیق کریں، پھر واپس آ کر قیمت دیں۔ تصدیق اختیاری ہے۔', verifyFirstCta: 'پروفائل مکمل کریں ←',
      deliveryDays: 'ڈیلیوری وقت (دن)', attributes: 'پروڈکٹ کی خصوصیات',
      attrHint: 'خصوصیات شامل کریں: برانڈ، ملک، وارنٹی...',
      attrKey: 'خصوصیت', attrValue: 'تفصیل', addAttr: '+ خصوصیت شامل کریں',
      attachTitle: 'فائل منسلک کریں (کیٹلاگ)', attachHint: 'PDF، تصویر، Excel',
      attachBtn: 'کیٹلاگ یا فائل اپلوڈ کریں', removeAttach: 'ہٹائیں',
      offerNotes: 'اضافی نوٹس', send: 'پیشکش بھیجیں ←', sending: 'بھیجا جا رہا ہے...',
      dismiss: 'یہ درخواست میرے لیے نہیں', dismissTitle: 'یہ درخواست نظر انداز کریں؟',
      dismissSub: 'یہ درخواست دوبارہ نظر نہیں آئے گی', dismissReason: 'وجہ (اختیاری)',
      confirmDismiss: 'ہاں، درخواست چھپائیں', cancel: 'واپس',
      attachedFile: 'تفصیلات فائل منسلک', viewFile: 'فائل دیکھیں',
      successTitle: 'آپ کی آفر بھیج دی گئی', successSub: 'خریدار کے فیصلے پر ہم فوراً آپ کو بتائیں گے۔',
      dismissedTitle: 'درخواست نظر انداز', dismissedSub: 'یہ درخواست نظر نہیں آئے گی',
      backDash: 'ہوم پر واپس',
      alreadyTitle: { accepted: 'مبارک ہو، خریدار نے آپ کی آفر چن لی', rejected: 'اس بار آپ کی آفر منتخب نہیں ہوئی', pending: 'آپ کی آفر خریدار کے فیصلے کی منتظر ہے' },
      closed: 'یہ درخواست بند ہے', closedSub: 'نئی پیشکشیں قبول نہیں',
    },
  }[locale] || {}

  // UX-035: the buyer-facing section of each line («أدوات صحية»), not the engineering sector; places in the reader's language
  const sectionOf = (it: any) => sectionLabelOf(it?.sector, it?.sub_category || detectSubCategory(it?.product_name, it?.sector), locale) || getSubCategoryLabel(it?.sector, it?.sub_category, locale) || ''
  const placeLabel = (r: any) => {
    if (!r) return ''
    if (r.city) { const c = (CITIES_BY_REGION[r.region] || []).find((x: any) => x.ar === r.city); return locale === 'ar' || !c ? r.city : c.en }
    return r.region ? getRegionLabel(r.region, locale) : ''
  }

  // استخراج رابط الملف من الـ notes
  const specFileMatch = rfq?.notes?.match(/\[مواصفات مرفقة: ([^\]]+)\]/)
  const specFileUrl = specFileMatch ? specFileMatch[1] : null
  const cleanNotes = rfq?.notes?.replace(/\n?\[مواصفات مرفقة:[^\]]+\]/, '').trim()

  if (loading) return <PageLoader />

  // UX-114: a request this supplier can no longer open: inside the app shell, with a way back
  if (!rfq) return (
    <AppShell title={L('Request details', 'درخواست کی تفصیل', 'تفاصيل الطلب')} nav={getNav('supplier', locale, '/supplier/dashboard')} dir={dir}>
      <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="text-4xl mb-3 text-gray-500"><Glyph e="🔒" /></div>
        <h2 className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}>{L('This request is no longer available to you', 'یہ درخواست اب آپ کے لیے دستیاب نہیں', 'هذا الطلب لم يعد متاحاً لك')}</h2>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">{L('The request may have been closed or its deadline passed, or it is outside your specialties or regions.', 'شاید درخواست بند ہو گئی یا اس کی مہلت ختم ہو گئی، یا یہ آپ کی مہارت یا علاقوں سے باہر ہے۔', 'ربما أُغلق الطلب أو انتهت مهلته، أو أنه خارج تخصصاتك أو مناطق تغطيتك.')}</p>
        <Link href="/supplier/dashboard" className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-bold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Back to requests', 'درخواستوں پر واپس', 'العودة إلى الطلبات')}</Link>
      </div>
    </AppShell>
  )

  // Success / Dismissed states (UX-177: inside the app shell, with what was sent)
  if (success || dismissed) {
    return (
      <AppShell title={success ? L('Your offer', 'آپ کی آفر', 'عرضك') : L('Request details', 'درخواست کی تفصیل', 'تفاصيل الطلب')} nav={getNav('supplier', locale, '/supplier/dashboard')} dir={dir}>
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 text-center">
          <div className="text-5xl mb-4">{success ? <Glyph e="✅" /> : <span className="text-gray-500"><Glyph e="🔒" /></span>}</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0B2438' }}>
            {success
              ? (sentSummary ? L(`Offer sent: ${sentSummary.n} material${sentSummary.n === 1 ? '' : 's'}, total ${(+sentSummary.gross.toFixed(2)).toLocaleString('en-US')} SAR`, `آفر بھیج دی گئی: ${sentSummary.n} اشیاء، کل ${(+sentSummary.gross.toFixed(2)).toLocaleString('en-US')} ریال`, `أُرسل عرضك: ${arCount(sentSummary.n, 'مادة واحدة', 'مادتان', 'مواد', 'مادة')}، والإجمالي ${(+sentSummary.gross.toFixed(2)).toLocaleString('en-US')} ر.س`) : T.successTitle)
              : T.dismissedTitle}
          </h2>
          <p className={`text-sm text-gray-500 ${success && (Number(rfq?.offer_count) > 0 || rfq?.expires_at) ? 'mb-2' : 'mb-6'}`}>{success ? T.successSub : T.dismissedSub}</p>
          {/* UX-151: the competition and when the buyer decides */}
          {success && (Number(rfq?.offer_count) > 0 || (rfq?.expires_at && !isExpired(rfq.expires_at))) && (
            <div className="text-[13px] text-gray-700 mb-6 space-y-1 leading-relaxed">
              {Number(rfq?.offer_count) > 0 && <p>{L(`Your offer is one of ${Number(rfq.offer_count)} offers on this request so far.`, `اس درخواست پر اب تک کی ${Number(rfq.offer_count)} آفرز میں سے ایک آپ کی ہے۔`, `عرضك واحد من ${arCount(Number(rfq.offer_count), 'عرض واحد', 'عرضين', 'عروض', 'عرضاً')} على هذا الطلب حتى الآن.`)}</p>}
              {rfq?.expires_at && !isExpired(rfq.expires_at) && <p>{L(`Pricing closes in ${formatTimeLeft(rfq.expires_at, 'en')}; the buyer usually chooses after that.`, `قیمت دینے کی مہلت ${formatTimeLeft(rfq.expires_at, 'ur')} میں ختم ہوگی؛ خریدار عموماً اس کے بعد انتخاب کرتا ہے۔`, `تنتهي مهلة التسعير بعد ${formatTimeLeft(rfq.expires_at, 'ar')}، ويختار المشتري عادةً بعد انتهائها.`)}</p>}
            </div>
          )}
          {/* UX-148: a hidden request can be brought back */}
          {dismissed && (
            <button type="button" onClick={undoDismiss} disabled={dismissing} className="flex w-full items-center justify-center min-h-[44px] mb-2.5 rounded-xl font-bold text-[#0B2438] border border-[#0B2438]/30 bg-white disabled:opacity-50">
              {L('Undo hiding', 'چھپانا واپس لیں', 'تراجع عن الإخفاء')}
            </button>
          )}
          {dismissed && dismissError && <p role="alert" className="text-sm text-red-600 mb-3">{dismissError}</p>}
          {success && srcSaveFailed && (
            <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-start">
              <p className="text-sm font-semibold text-amber-900 leading-relaxed">{L('Your offer was sent, but the source shop name could not be saved. Add it now, or the buyer will not be able to choose your offer.', 'آپ کی آفر بھیج دی گئی، لیکن ماخذ دکان کا نام محفوظ نہیں ہو سکا۔ ابھی شامل کریں، ورنہ خریدار آپ کی آفر منتخب نہیں کر سکے گا۔', 'أُرسل عرضك، لكن تعذّر حفظ اسم المحل المصدر. أضِفه الآن وإلا فلن يستطيع المشتري اختيار عرضك.')}</p>
              <a href={`/supplier/dashboard/rfq/${id}`} className="mt-2 flex items-center justify-center min-h-[44px] rounded-xl font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Add the shop now', 'ابھی دکان شامل کریں', 'أضف المحل الآن')}</a>
            </div>
          )}
          {success && (
            <a href={`/supplier/dashboard/rfq/${id}`} className="flex items-center justify-center min-h-[44px] mb-2.5 rounded-xl font-bold text-[#0B2438] border border-[#0B2438]/30 bg-white">
              {L('Review or edit your offer within 15 minutes', '15 منٹ کے اندر اپنی آفر دیکھیں یا بدلیں', 'راجِع عرضك أو عدّله خلال 15 دقيقة')}
            </a>
          )}
          {nextRfq && (
            <a href={`/supplier/dashboard/rfq/${nextRfq}`} className="flex items-center justify-center gap-1 min-h-[44px] mb-2.5 rounded-xl font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
              {L('Price the next request', 'اگلی درخواست کی قیمت', 'سعّر الطلب التالي')} <span aria-hidden="true">{FWD}</span>
            </a>
          )}
          <Link href="/supplier/dashboard" className="flex items-center justify-center min-h-[44px] rounded-xl font-semibold text-white" style={{ background: '#0B2438' }}>
            {T.backDash}
          </Link>
        </div>
      </AppShell>
    )
  }

  // pricing is open: no offer yet, request open and within its deadline, and allowed to quote
  const isMember = !!actingId && !!user && actingId !== user.id // a company team member
  const pricingOpen = !existingOffer && rfq?.status === 'open' && !expired && verified
  const pricedCount = (myItems || []).filter((_: any, i: number) => parseFloat(itemForms[i]?.line_total) > 0).length
  // why the send button is disabled (shown under it and on the phone bar). UX-032: each reason names
  // the field it points to, so tapping it scrolls there and highlights it.
  function sendBlockReason(): { text: string; target: string } | null {
    if (!rfq) return null
    const r = (text: string, target: string) => ({ text, target })
    if ((isMultiItem && !allItemsPriced) || !totalPrice) return r(isMultiItem
      ? L('Enter a price for at least one material to send.', 'بھیجنے کے لیے کم از کم ایک مال کی قیمت درج کریں۔', 'أدخل سعر مادة واحدة على الأقل لتتمكّن من الإرسال.')
      : L('Enter the price to send.', 'بھیجنے کے لیے قیمت درج کریں۔', 'أدخل السعر لتتمكّن من الإرسال.'), 'offer-form')
    if (extras.some((ex: any) => parseFloat(ex.amount) > 0 && !String(ex.label || '').trim()))
      return r(L('Name each extra amount (e.g. loading fees).', 'ہر اضافی رقم کا نام لکھیں (جیسے: لوڈنگ فیس)۔', 'اكتب اسم كل مبلغ إضافي (مثل: رسوم تحميل).'), 'other-charges')
    if (isMultiItem && myItems.some((it: any, i: number) => !installAnswered(itemForms[i], it))) {
      const k = myItems.findIndex((it: any, i: number) => !installAnswered(itemForms[i], it))
      return r(L('Enter the installation price (or «I don\'t install») to send.', 'بھیجنے کے لیے تنصیب کی قیمت درج کریں (یا «میں تنصیب نہیں کرتا»)۔', 'أدخل سعر التركيب (أو «لا أقدّم التركيب») لتتمكّن من الإرسال.'), `install-${k}`)
    }
    if (rfq.delivery_required && (!delivMode || (delivMode === 'amount' && !(parseFloat(delivAmount) > 0))))
      return r(L('Choose the delivery cost to send.', 'بھیجنے کے لیے ڈیلیوری کی لاگت منتخب کریں۔', 'حدّد تكلفة التوصيل لتتمكّن من الإرسال.'), 'deliv-cost')
    if (deliveryMissing())
      return r(L('Set the delivery time to send.', 'بھیجنے کے لیے ڈیلیوری کا وقت درج کریں۔', 'حدّد مدة التوصيل لتتمكّن من الإرسال.'), 'delivery-time')
    if (vatIncluded === null)
      return r(L('Choose whether your price includes VAT to send.', 'بھیجنے کے لیے منتخب کریں کہ قیمت میں ویٹ شامل ہے یا نہیں۔', 'حدّد هل يشمل سعرك الضريبة لتتمكّن من الإرسال.'), 'vat-basis')
    if (!availability)
      return r(L('Choose the availability of the materials to send.', 'بھیجنے کے لیے مال کی دستیابی منتخب کریں۔', 'حدّد توفّر المواد لتتمكّن من الإرسال.'), 'availability')
    if (!sourceType)
      return r(L('Choose where this price comes from to send.', 'بھیجنے کے لیے قیمت کا ذریعہ منتخب کریں۔', 'حدّد مصدر السعر لتتمكّن من الإرسال.'), 'price-source')
    if (isIndependent && src.name.trim().length < 2)
      return r(L('Write the name of the shop you will buy from to send.', 'بھیجنے کے لیے اس دکان کا نام لکھیں جہاں سے آپ خریدیں گے۔', 'اكتب اسم المحل الذي ستشتري منه لتتمكّن من الإرسال.'), 'shop-name')
    return null
  }
  // scroll to the field a block reason points to and flash it (owner couldn't find where to set things)
  function goToField(target: string) {
    if (target === 'price-source' || target === 'other-charges') setShowMore(true)
    if (target === 'price-source' && !isIndependent) setShowSourcePick(true)
    setTimeout(() => {
      const el = document.getElementById(target)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const box = (el.tagName === 'INPUT' || el.tagName === 'LABEL' ? el.parentElement : el) as HTMLElement | null
      if (box) { box.style.outline = '2px solid #D4A543'; box.style.borderRadius = '12px'; setTimeout(() => { box.style.outline = '' }, 1800) }
      if (el.tagName === 'INPUT') (el as HTMLInputElement).focus({ preventScroll: true })
    }, 60)
  }
  // UX-152/UX-055: one «selected» style for every choice chip (gold frame, light gold, navy text, a check), 44px tall
  const chip = (on: boolean) => `inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border-2 text-sm font-bold transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'border-gray-200 bg-white text-gray-600 hover:border-[#D4A543]/50'}`
  // the strictest delivery time the buyer asked for on my materials (UX-113)
  const maxDaysAsked = (isMultiItem ? myItems.map((it: any) => Number(it.max_days) || 0).filter((n: number) => n > 0) : [Number(rfq?.max_days) || 0].filter(n => n > 0)).reduce((m: number, n: number) => (m === 0 ? n : Math.min(m, n)), 0)
  // round-3 UX-032: the delivery time I give (the longest across my priced lines), and whether it is missing
  function offeredDays(): number {
    if (!isMultiItem) return parseInt(deliveryDays) || parseInt(allDays) || 0
    const ds = myItems.map((_: any, k: number) => (parseFloat(itemForms[k]?.line_total) > 0 ? (parseInt(itemForms[k]?.delivery_days) || parseInt(allDays) || 0) : -1)).filter((d: number) => d >= 0)
    return ds.length && ds.every((d: number) => d > 0) ? Math.max(...ds) : 0
  }
  function deliveryMissing(): boolean { return maxDaysAsked > 0 && !(offeredDays() > 0) }
  // remembered prices not taken yet (UX-113: «استخدم أسعارك السابقة» in one tap)
  const prevCount = isMultiItem ? myItems.filter((_: any, i: number) => !skipped.has(i) && !(parseFloat(itemForms[i]?.line_total) > 0) && Number(itemForms[i]?.suggest) > 0 && sameUnit(itemForms[i], i)).length : 0
  function takeAllPrev() {
    myItems.forEach((_: any, i: number) => {
      const f = itemForms[i]
      if (!skipped.has(i) && !(parseFloat(f?.line_total) > 0) && Number(f?.suggest) > 0 && sameUnit(f, i)) takePrevPrice(i, Number(f.suggest))
    })
  }
  // UX-114: dead ends get a way forward: the next request, back to the list, or hide this one
  const nextOpen = (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {nextRfq
        ? <a href={`/supplier/dashboard/rfq/${nextRfq}`} className="inline-flex items-center gap-1 min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] text-sm" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Price the next request', 'اگلی درخواست کی قیمت', 'سعّر الطلب التالي')} <span aria-hidden="true">{FWD}</span></a>
        : <Link href="/supplier/dashboard" className="inline-flex items-center min-h-[44px] px-5 rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{L('Back to requests', 'درخواستوں پر واپس', 'العودة إلى الطلبات')}</Link>}
      <button type="button" onClick={() => setShowDismiss(true)} className="inline-flex items-center min-h-[44px] px-4 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 bg-white">{L('Hide this request', 'یہ درخواست چھپائیں', 'إخفاء هذا الطلب')}</button>
    </div>
  )
  // UX-029: the VAT basis is chosen at the top of the form, before any price is typed
  const vatHint = noVat
    ? L('Enter the final price the buyer pays; nothing is added to it.', 'وہ حتمی قیمت درج کریں جو خریدار ادا کرے گا؛ اس پر کچھ اضافہ نہیں ہوگا۔', 'أدخل السعر النهائي الذي يدفعه المشتري؛ لا يُضاف إليه أي مبلغ.')
    : vatIncluded
      ? L('Your prices include 15% VAT. This is what the buyer pays.', 'آپ کی قیمتیں 15% ٹیکس سمیت ہیں۔ یہی رقم خریدار ادا کرے گا۔', 'أسعارك شاملة ضريبة القيمة المضافة (15%)، وهذا ما يدفعه المشتري.')
      : L('Your prices are before VAT; 15% is added on top for the buyer.', 'آپ کی قیمتیں ٹیکس سے پہلے ہیں؛ خریدار کے لیے 15% اوپر شامل ہوگا۔', 'أسعارك قبل الضريبة، وتُضاف إليها 15% للمشتري.')
  const vatBlock = (
    <div id="vat-basis" className="mb-4 space-y-2">
      {/* the buyer asked for a VAT invoice (quick request option): the seller must see it before pricing */}
      {rfq?.vat_invoice_required && (
        <p className="text-sm font-bold rounded-xl bg-[#0B2438]/5 border border-[#0B2438]/20 px-3 py-2 text-[#0B2438]">
          <Glyph e="🧾" /> {L('The buyer needs a VAT invoice.', 'خریدار کو VAT انوائس چاہیے۔', 'المشتري يحتاج فاتورة ضريبية.')} <span className="font-semibold">{noVat
            ? L('You are not VAT-registered, so you cannot issue one yourself: price only if a VAT-registered shop will issue it.', 'آپ VAT میں رجسٹرڈ نہیں؛ صرف تب قیمت دیں جب رجسٹرڈ دکان انوائس جاری کرے۔', 'أنت غير مسجّل في ضريبة القيمة المضافة فلا تستطيع إصدارها بنفسك؛ سعّر فقط إن كانت ستصدر من محل مسجّل.')
            : L('Issue it with your VAT number.', 'اپنے VAT نمبر سے جاری کریں۔', 'أصدرها له برقمك الضريبي.')}</span>
        </p>
      )}
      {/* UX-148: a neutral note (not a warning colour); the chips come right after it */}
      <p className="text-[13px] rounded-xl bg-[#f4f6f9] px-3 py-2 text-gray-700"><Glyph e="🧾" /> {vatHint}</p>
      {/* owner 2026-11-19: a VAT-registered seller may type net prices (price lists are often before VAT) */}
      {!noVat && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={L('VAT basis of your prices', 'قیمتوں میں ٹیکس', 'أساس الضريبة في أسعارك')}>
          {([true, false] as const).map(v => (
            <button key={String(v)} type="button" role="radio" aria-checked={vatIncluded === v} onClick={() => setVatIncluded(v)} className={chip(vatIncluded === v) + ' justify-center'}>
              {vatIncluded === v && <Check className="w-4 h-4" aria-hidden />}{v ? L('Prices include VAT', 'قیمتیں ٹیکس سمیت', 'الأسعار شاملة الضريبة') : L('Prices before VAT', 'قیمتیں ٹیکس سے پہلے', 'الأسعار قبل الضريبة')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
  return (
    <AppShell title={existingOffer?.status === 'accepted' ? L('The deal', 'سودا', 'الصفقة') : existingOffer ? L('Your offer', 'آپ کی آفر', 'عرضك') : L('Request details', 'درخواست کی تفصیل', 'تفاصيل الطلب')} nav={getNav('supplier', locale, '/supplier/dashboard')} dir={dir} hideAssistant={pricingOpen}>
      <h1 className="sr-only">{existingOffer?.status === 'accepted' ? L('The deal', 'سودا', 'الصفقة') : existingOffer ? L('Your offer', 'آپ کی آفر', 'عرضك') : L('Request details', 'درخواست کی تفصیل', 'تفاصيل الطلب')}</h1>
      <div className="max-w-[1500px] mx-auto grid gap-5 items-start lg:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        {/* MAIN: the request and, while pricing is open, a card per material with its price */}
        <div className="min-w-0 space-y-5">
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-2">
            {/* عنوان عام — لا نُظهر للمورد الاسم الذي اختاره المشتري للطلب */}
            <div>
              <div className="text-xs font-bold text-[#8F6820] font-mono" dir="auto">{rfqRefLine(rfq, locale)}</div>
              <h2 className="text-lg font-bold" style={{ color: '#0B2438' }}>
                {rfqDesc({ ...rfq, title: null }, locale, rfqIsMulti ? (myItems.length || undefined) : 1)}
              </h2>
            </div>
            {!isMember && <button type="button" onClick={async () => {
              setActionError(''); setError('')
              const supabase = createClient()
              const { data, error } = await supabase.rpc('get_or_create_conversation', { p_rfq_id: id, p_supplier_id: actingId || user?.id })
              if (error || !data) { const m = L('Could not open the conversation — please try again.', 'گفتگو نہیں کھل سکی — دوبارہ کوشش کریں۔', 'تعذّر فتح المحادثة، حاول مرة أخرى.'); if (pricingOpen) setError(m); else setActionError(m); return }
              router.push(`/messages?c=${data}`)
            }} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm px-3 rounded-xl font-semibold text-white shrink-0" style={{ background: '#0B2438' }}><Glyph e="💬" /> {L('Message buyer', 'خریدار کو پیغام بھیجیں', 'راسل المشتري')}</button>}
          </div>
          {/* UX-032: on phones the key facts come right under the title (the side panel is below every card) */}
          <div className="lg:hidden mt-3 space-y-1.5 text-[13px] leading-relaxed">
            {rfq.expires_at && (
              <div className="rounded-lg px-2.5 py-1.5 font-bold" style={{ background: urgencyStyle(deadlineUrgency(rfq.expires_at)).bg, color: urgencyStyle(deadlineUrgency(rfq.expires_at)).fg, border: `1px solid ${urgencyStyle(deadlineUrgency(rfq.expires_at)).border}` }}>
                <Glyph e="⏰" /> {L('Pricing deadline', 'قیمت دینے کی آخری تاریخ', 'مهلة التسعير')}: {expired ? L('ended', 'ختم', 'انتهت') : formatTimeLeft(rfq.expires_at, locale)}
              </div>
            )}
            <div className={`rounded-lg px-2.5 py-1.5 ${rfq.delivery_required ? 'bg-amber-50 border border-amber-200 text-amber-900 font-semibold' : 'bg-[#f4f6f9] text-gray-600'}`}>
              <Glyph e="🚚" /> {L('Delivery', 'ڈیلیوری', 'التوصيل')}: {rfq.delivery_required ? `${L('required', 'ضروری', 'مطلوب')}${placeLabel(rfq) ? ` — ${placeLabel(rfq)}` : ''}` : L('not required', 'ضروری نہیں', 'غير مطلوب')}
            </div>
            {cleanNotes && (
              <div className="rounded-lg px-2.5 py-1.5 bg-[#f4f6f9] text-gray-700">
                <span className="font-bold text-[#0B2438]"><Glyph e="📝" /> {L('Buyer notes', 'خریدار کے نوٹس', 'ملاحظات المشتري')}: </span>
                <span className={notesOpen ? '' : 'line-clamp-2'}><AutoTr text={cleanNotes} locale={locale} /></span>
                {cleanNotes.length > 90 && (
                  <button type="button" onClick={() => setNotesOpen(!notesOpen)} className="min-h-[44px] px-1 font-bold text-[#8F6820] hover:underline">{notesOpen ? L('Less', 'کم', 'أقل') : L('More', 'مزید', 'المزيد')}</button>
                )}
              </div>
            )}
          </div>
          {/* the materials table is for the read-only states; while pricing, the cards below show them */}
          {!pricingOpen && (<>
          {rfqIsMulti && myItems.length > 0 && (
            <div className="my-4">
              <h3 className="font-bold text-sm mb-2 text-[#0B2438]"><Glyph e="🧾" /> {L('Materials in your specialty', 'آپ کی مہارت کا مال', 'المواد ضمن تخصصك')} ({myItems.length})</h3>
              <p className="text-[12px] text-gray-500 mb-2">{L('You only see the materials you can supply — price them and send your offer.', 'آپ کو صرف وہ مال دکھایا جاتا ہے جو آپ سپلائی کر سکتے ہیں — قیمت لگائیں اور آفر بھیجیں۔', 'تظهر لك فقط المواد التي تستطيع توريدها — سعّرها وأرسل عرضك.')}</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="text-[13px] text-gray-500 bg-[#f4f6f9] border-b border-gray-100">
                    <th className="text-start py-2.5 px-3 font-bold">#</th>
                    <th className="text-start py-2.5 px-3 font-bold">{L('Material', 'مال', 'المادة')}</th>
                    <th className="text-start py-2.5 px-3 font-bold">{L('Quantity', 'مقدار', 'الكمية')}</th>
                    <th className="text-start py-2.5 px-3 font-bold">{L('Required specs', 'مطلوبہ اسپیسیفکیشن', 'المواصفات المطلوبة')}</th>
                  </tr></thead>
                  <tbody>
                    {myItems.map((it: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 align-top">
                        <td className="py-2.5 px-3 text-gray-500">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[15px] text-[#0B2438] flex items-center gap-2"><img src={productImageUrl(it.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, it.sub_category || detectSubCategory(it.product_name, it.sector))} className="w-9 h-9 object-contain rounded bg-white border border-gray-100 shrink-0" /><span><AutoTr text={getProductLabel(it.product_name, locale)} locale={locale} /></span></div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[12px] px-1.5 py-0.5 rounded bg-[#0B2438]/5 text-[#0B2438]">{sectionOf(it)}</span>
                            {it.in_stock && <span className="text-[12px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"><Glyph e="⚡" /> {L('In stock now', 'فوری دستیاب', 'توفّر فوري')}</span>}
                            {it.max_days && <span className="text-[12px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"><Glyph e="⏱" /> {L(`within ${daysText(it.max_days, 'en')}`, `${daysText(it.max_days, 'ur')} میں`, `خلال ${daysText(it.max_days, 'ar')}`)}</span>}
                            {it.spec_file_url && it.spec_file_url !== it.photo_url && <a href={fileHref(it.spec_file_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-[12px] px-2 rounded bg-[#0B2438]/5 text-[#0B2438] hover:underline"><Glyph e="📎" /> {L('File', 'فائل', 'ملف')}</a>}
                            {Array.isArray(it.attachments) && it.attachments.map((a: any, ai: number) => <a key={ai} href={fileHref(a.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-[12px] px-2 rounded bg-[#0B2438]/5 text-[#0B2438] hover:underline truncate max-w-[10rem]"><Glyph e="📎" /> {a.name || L('File', 'فائل', 'ملف')}</a>)}
                          </div>
                          {/* صورة المادة من الطلب السريع: المورد يشوف نفس الشي اللي بدّو ياه الزبون */}
                          {it.photo_url && (
                            <a href={fileHref(it.photo_url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 group" title={L('Material photo from the buyer', 'خریدار کی طرف سے مال کی تصویر', 'صورة المادة من المشتري')}>
                              <img src={fileHref(it.photo_url)} alt={L('Material photo', 'مال کی تصویر', 'صورة المادة')} loading="lazy" className="w-24 h-24 object-cover rounded-lg border border-gray-200 group-hover:border-[#D4A543]" />
                              <span className="text-[12px] font-bold text-[#8F6820]"><Glyph e="📷" /> {L('Photo from the buyer', 'خریدار کی تصویر', 'صورة من المشتري')}<br /><span className="font-normal text-gray-500">{L('Price this exact item', 'بالکل یہی مال کی قیمت لگائیں', 'سعّر المادة نفسها')}</span></span>
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-[15px] text-[#8F6820] whitespace-nowrap">{it.quantity} {getUnitLabel(it.unit, locale)}</td>
                        <td className="py-3 px-3 text-sm text-gray-700 leading-relaxed">{it.specification ? <AutoTr text={it.specification} locale={locale} /> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </>)}
        </div>

        {existingOffer ? (
          <div className="space-y-4">
          {/* UX-028: errors of the actions below (discount, question, edit, messages) show here, the form is closed */}
          {actionError && (
            <div role="alert" className="flex items-start justify-between gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl p-3">
              <span><Glyph e="⚠" /> {actionError}</span>
              <button type="button" onClick={() => setActionError('')} className="w-8 h-8 grid place-items-center shrink-0 text-red-500" aria-label={L('Close', 'بند کریں', 'إغلاق')}><X className="w-4 h-4" aria-hidden /></button>
            </div>
          )}
          {actionNotice && (
            <div role="status" className="flex items-start justify-between gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold rounded-xl p-3">
              <span className="flex items-start gap-1.5"><Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                <span>{actionNotice}
                  {declinedConv && <> <button type="button" onClick={() => openConversation(cannotReduceMsg())} className="min-h-[44px] font-bold underline text-[#0B2438]">{L('Message the buyer (optional)', 'خریدار کو پیغام بھیجیں (اختیاری)', 'راسل المشتري (اختياري)')}</button></>}
                </span>
              </span>
              <button type="button" onClick={() => { setActionNotice(''); setDeclinedConv(false) }} className="w-8 h-8 grid place-items-center shrink-0 text-emerald-700" aria-label={L('Close', 'بند کریں', 'إغلاق')}><X className="w-4 h-4" aria-hidden /></button>
            </div>
          )}
          {(() => {
            const st = existingOffer.status
            // round-2 UX-010: the outcome reads the request status too: a cancelled or expired request is not a loss
            const oc = offerOutcome(st, rfq.status)
            const ended = oc === 'cancelled' || oc === 'expired'
            const tone = oc === 'won' ? 'border-emerald-300 bg-emerald-50' : oc !== 'pending' ? 'border-gray-200 bg-gray-50' : 'border-[#D4A543]/50 bg-[#D4A543]/5'
            const partial = myAwards && Array.isArray(existingOffer.item_prices) && myAwards.idx.size < existingOffer.item_prices.length
            const shownTotal = Number(partial ? myAwards!.total : existingOffer.total_price) || 0
            const fmt = (n: number) => (+n.toFixed(2)).toLocaleString('en-US')
            const notReg = existingOffer.vat_status === 'not_registered'
            const net = existingOffer.vat_included === false && !notReg
            return (
          <div className={`rounded-2xl p-5 sm:p-6 shadow-sm border text-center ${tone}`}>
            <div className="text-4xl mb-2">{oc === 'won' ? <Glyph e="🎉" /> : ended ? <span className="text-gray-500"><Glyph e="🔒" /></span> : oc === 'lost' ? <span className="text-gray-500"><Glyph e="📭" /></span> : <Glyph e="⏳" />}</div>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}>
              {outcomeTitle(oc, locale)}
            </h3>
            {partial && (
              <p className="text-sm font-bold text-emerald-800 mb-1">{L(`Chosen for ${myAwards!.idx.size} of ${existingOffer.item_prices.length} items — supply only those`, `${existingOffer.item_prices.length} میں سے ${myAwards!.idx.size} اشیاء کے لیے منتخب — صرف وہی سپلائی کریں`, `اختيرت في ${myAwards!.idx.size} من ${arCount(existingOffer.item_prices.length, 'مادة واحدة', 'مادتين', 'مواد', 'مادة')}، فورّد هذه المواد فقط`)}</p>
            )}
            {/* UX-115: say which total this is, and what the buyer sees */}
            <p className="text-sm text-gray-700">
              {notReg
                ? L(`${fmt(shownTotal)} SAR (final price)`, `${fmt(shownTotal)} ریال (حتمی قیمت)`, `${fmt(shownTotal)} ر.س (سعر نهائي)`)
                : net
                  ? L(`${fmt(shownTotal)} SAR before VAT · ${fmt(shownTotal * 1.15)} SAR incl. VAT, which is what the buyer sees`, `${fmt(shownTotal)} ریال ٹیکس سے پہلے · ${fmt(shownTotal * 1.15)} ریال ٹیکس سمیت، جو خریدار دیکھتا ہے`, `${fmt(shownTotal)} ر.س قبل الضريبة · ${fmt(shownTotal * 1.15)} ر.س شاملة الضريبة، وهو ما يراه المشتري`)
                  : L(`${fmt(shownTotal)} SAR incl. VAT`, `${fmt(shownTotal)} ریال ٹیکس سمیت`, `${fmt(shownTotal)} ر.س شاملة الضريبة`)}
            </p>
            {/* UX-016: the price guarantee: until when, and a renewal once it ran out (the buyer sees «expired») */}
            {oc === 'pending' && existingOffer.price_valid_until && (() => {
              const until = new Date(existingOffer.price_valid_until).getTime()
              if (until > Date.now()) return <p className="text-[13px] text-gray-600 mt-1">{L(`Your price is guaranteed until ${formatDateTime(existingOffer.price_valid_until)}.`, `آپ کی قیمت ${formatDateTime(existingOffer.price_valid_until)} تک پکی ہے۔`, `سعرك مضمون حتى ${formatDateTime(existingOffer.price_valid_until)}.`)}</p>
              return (
                <div role="status" className="mt-3 text-start rounded-xl border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900 leading-relaxed">{L('Your price guarantee has ended, and the buyer sees this. Renew the price so your offer can still be chosen.', 'آپ کی قیمت کی ضمانت ختم ہو گئی ہے اور خریدار یہ دیکھتا ہے۔ قیمت کی تجدید کریں تاکہ آپ کی آفر منتخب ہو سکے۔', 'انتهت مدة ضمان سعرك، ويرى المشتري ذلك. جدّد السعر ليبقى عرضك قابلاً للاختيار.')}</p>
                  {isMember ? (
                    <p className="text-[13px] text-gray-600 mt-1">{L('The account owner can renew it.', 'اکاؤنٹ کا مالک اس کی تجدید کر سکتا ہے۔', 'يستطيع صاحب الحساب تجديده.')}</p>
                  ) : (
                    <button type="button" disabled={renewing} onClick={async () => {
                      setActionError(''); setRenewing(true)
                      const { data, error: rErr } = await createClient().rpc('renew_offer_validity', { p_offer_id: existingOffer.id, p_days: 3 })
                      setRenewing(false)
                      if (rErr) { setActionError(friendlyError(rErr.message, L('Could not renew the price — please try again.', 'قیمت کی تجدید نہیں ہو سکی — دوبارہ کوشش کریں۔', 'تعذّر تجديد السعر، حاول مرة أخرى.'), locale)); return }
                      const nv: string = typeof data === 'string' ? data : (data as any)?.price_valid_until || new Date(Date.now() + 3 * 86400000).toISOString()
                      setExistingOffer((o: any) => o ? { ...o, price_valid_until: nv } : o)
                      setActionNotice(L(`Your price is guaranteed again until ${formatDateTime(nv)}.`, `آپ کی قیمت دوبارہ ${formatDateTime(nv)} تک پکی ہے۔`, `سعرك مضمون من جديد حتى ${formatDateTime(nv)}.`))
                    }} className="mt-2 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                      {renewing ? L('Renewing...', 'تجدید ہو رہی ہے...', 'جارٍ التجديد...') : L('Renew the price for 3 days', 'قیمت کی 3 دن کے لیے تجدید کریں', 'جدّد السعر 3 أيام')}
                    </button>
                  )}
                </div>
              )
            })()}
            {oc === 'pending' && <p className="text-[13px] text-gray-600 mt-1">{T.successSub}</p>}
            {ended && (
              <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">{L('This does not count against your results. We will alert you when a new matching request arrives.', 'یہ آپ کے نتائج میں شمار نہیں ہوگا۔ نئی مماثل درخواست آنے پر ہم آپ کو بتائیں گے۔', 'لا يُحتسب هذا في نتائجك، وسننبّهك فور وصول طلب جديد مطابق.')}</p>
            )}
            {oc === 'lost' && (
              <div className="mt-2">
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  {lostReason === 'price'
                    ? L('The buyer chose a lower-priced offer this time.', 'اس بار خریدار نے کم قیمت والی آفر چنی۔', 'اختار المشتري عرضاً أقل سعراً هذه المرة.')
                    : lostReason === 'delivery'
                      ? L('The buyer chose an offer with a shorter delivery time this time.', 'اس بار خریدار نے کم ڈیلیوری وقت والی آفر چنی۔', 'اختار المشتري عرضاً بمدة توصيل أقصر هذه المرة.')
                      : L('Thank you for taking part. Buyers usually choose by price and delivery time; a full offer with clear specifications helps next time.', 'شرکت کا شکریہ۔ خریدار عموماً قیمت اور ڈیلیوری کے وقت سے انتخاب کرتے ہیں؛ واضح تفصیلات والی مکمل آفر اگلی بار مدد دیتی ہے۔', 'شكراً لمشاركتك. يختار المشتري عادةً بحسب السعر ومدة التوصيل، والعرض الكامل بمواصفات واضحة يساعدك في المرات القادمة.')}
                </p>
                {/* UX-150: how close the price was, as a band only (no numbers, no rival names) */}
                {gapBand && (
                  <p className="text-[13px] font-semibold text-[#0B2438] mt-1 leading-relaxed">
                    {gapBand === 'lt5'
                      ? L('Your price was less than 5% above the chosen price, so you were very close.', 'آپ کی قیمت منتخب قیمت سے 5% سے کم زیادہ تھی، آپ بہت قریب تھے۔', 'كان سعرك أعلى من السعر المختار بأقل من 5%، فأنت قريب جداً.')
                      : gapBand === 'lt10'
                        ? L('Your price was 5 to 10% above the chosen price.', 'آپ کی قیمت منتخب قیمت سے 5 سے 10% زیادہ تھی۔', 'كان سعرك أعلى من السعر المختار بما بين 5% و10%.')
                        : L('Your price was more than 10% above the chosen price.', 'آپ کی قیمت منتخب قیمت سے 10% سے زیادہ تھی۔', 'كان سعرك أعلى من السعر المختار بأكثر من 10%.')}
                  </p>
                )}
                {lostReason !== 'delivery' && <Link href="/supplier/prices" className="inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Update my saved prices', 'میری محفوظ قیمتیں اپ ڈیٹ کریں', 'حدّث أسعاري المحفوظة')} <span aria-hidden="true">{FWD}</span></Link>}
              </div>
            )}
            {/* UX-191: the winning moment, with the next step */}
            {st === 'accepted' && (
              isMember ? (
                <p className="text-[13px] font-semibold text-gray-600 mt-2">{L('This deal is managed by the account owner.', 'یہ سودا اکاؤنٹ کے مالک کے پاس ہے۔', 'إدارة هذه الصفقة لدى صاحب الحساب.')}</p>
              ) : (
                <div className="mt-3">
                  <p className="text-[13px] font-semibold text-gray-700 mb-2">{existingOffer.supplier_delivered_at
                    ? L('Delivery confirmed. Follow the receipt and payment in the deal.', 'ڈیلیوری کی تصدیق ہو گئی۔ وصولی اور ادائیگی سودے میں دیکھیں۔', 'تمّ تأكيد التسليم. تابِع الاستلام والدفع في الصفقة.')
                    : (existingOffer.invoice_url || existingOffer.supplier_invoice_url)
                      ? L('You uploaded the invoice — confirm the delivery once you deliver the goods.', 'آپ نے انوائس اپ لوڈ کر دی — مال پہنچانے پر ڈیلیوری کی تصدیق کریں۔', 'رفعتَ الفاتورة — أكّد التسليم عند إيصال البضاعة.')
                      : L('Next step: upload the invoice, then confirm the delivery.', 'اگلا قدم: انوائس اپ لوڈ کریں، پھر ڈیلیوری کی تصدیق کریں۔', 'الخطوة التالية: ارفع الفاتورة، ثم أكّد التسليم.')}</p>
                  <a href="#deal" className="inline-flex items-center justify-center gap-1 min-h-[44px] px-6 rounded-xl font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                    {L('Open the deal', 'سودا کھولیں', 'افتح الصفقة')} <span aria-hidden="true">{FWD}</span>
                  </a>
                </div>
              )
            )}
            {isMember && existingOffer.submitted_by && (
              <p className="text-[12px] font-semibold text-gray-500 mt-1">{existingOffer.submitted_by === user?.id ? L('Sent by you', 'آپ نے بھیجی', 'أرسلتَه أنت') : L('Sent by a colleague from your company', 'آپ کی کمپنی کے ساتھی نے بھیجی', 'أرسله زميل من فريق شركتك')}</p>
            )}

            {/* UX-030: the buyer is waiting: the discount request and the question come right under the status */}
            {offerHasOpenDiscount(existingOffer) && oc === 'pending' && (() => {
              const cur = Number(existingOffer.total_price) || 0
              const np = Number(newPrice) || 0
              const bad = !!newPrice && np >= cur
              return (
              <div className="mt-4 bg-white border-2 border-[#D4A543] rounded-xl p-4 text-start">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="font-bold text-[#0B2438]"><Glyph e="📉" /> {L('The buyer asked for a discount', 'خریدار نے رعایت مانگی ہے', 'طلب المشتري خصماً')}</div>
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#D4A543]/20 text-[#071827]">{L(`${formatTimeLeft(existingOffer.reduction_deadline, locale)} left to reply`, `جواب کے لیے ${formatTimeLeft(existingOffer.reduction_deadline, locale)} باقی`, `باقي ${formatTimeLeft(existingOffer.reduction_deadline, locale)} للرد`)}</span>
                </div>
                {existingOffer.reduction_note && <div className="text-sm text-gray-700 mb-2">«{existingOffer.reduction_note}»</div>}
                <label htmlFor="new-price" className="block text-[13px] font-bold text-gray-700 mb-1">
                  {net
                    ? L(`New total before VAT (less than ${fmt(cur)} SAR)`, `نئی کل رقم ٹیکس سے پہلے (${fmt(cur)} ریال سے کم)`, `الإجمالي الجديد قبل الضريبة (أقل من ${fmt(cur)} ر.س)`)
                    : L(`New total price (less than ${fmt(cur)} SAR)`, `نئی کل قیمت (${fmt(cur)} ریال سے کم)`, `السعر الإجمالي الجديد (أقل من ${fmt(cur)} ر.س)`)}
                </label>
                {/* UX-169: ready discounts in one tap, with what the buyer saves */}
                <div className="flex flex-wrap gap-2 mb-2" role="group" aria-label={L('Quick discount', 'فوری رعایت', 'خصم سريع')}>
                  {[2, 3, 5].map((p) => {
                    const v = +(cur * (1 - p / 100)).toFixed(2)
                    const on = !!newPrice && Math.abs(np - v) < 0.005
                    return <button key={p} type="button" aria-pressed={on} onClick={() => { setNewPrice(String(v)); setActionError('') }} className={chip(on)}>{on && <Check className="w-4 h-4" aria-hidden />}{p}%</button>
                  })}
                </div>
                <input id="new-price" type="text" inputMode="decimal" value={newPrice} onChange={(e: any) => { setNewPrice(latinNum(e.target.value)); setActionError('') }} aria-invalid={bad}
                  className={`input-field text-base sm:text-sm ${bad ? 'border-red-400' : ''}`} />
                {np > 0 && np < cur && (
                  <p className="text-[13px] font-semibold text-[#0F6E56] mt-1">{L(`The buyer saves ${fmt((cur - np) * (net ? 1.15 : 1))} SAR${notReg ? '' : ' incl. VAT'} at this price`, `اس قیمت پر خریدار ${fmt((cur - np) * (net ? 1.15 : 1))} ریال${notReg ? '' : ' (ٹیکس سمیت)'} بچائے گا`, `سيوفّر المشتري ${fmt((cur - np) * (net ? 1.15 : 1))} ر.س${notReg ? '' : ' شاملة الضريبة'} بهذا السعر`)}</p>
                )}
                {bad
                  ? <p className="text-[13px] font-semibold text-red-600 mt-1">{L('The new price must be lower than your current price.', 'نئی قیمت آپ کی موجودہ قیمت سے کم ہونی چاہیے۔', 'يجب أن يكون السعر الجديد أقل من سعرك الحالي.')}</p>
                  : np > 0 && net && <p className="text-[13px] text-gray-600 mt-1">{L(`The buyer will see ${fmt(np * 1.15)} SAR incl. VAT.`, `خریدار ${fmt(np * 1.15)} ریال ٹیکس سمیت دیکھے گا۔`, `سيرى المشتري ${fmt(np * 1.15)} ر.س شاملة الضريبة.`)}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={submitReduction} disabled={reducing || bad || !(np > 0)} className="flex-1 min-w-[10rem] min-h-[44px] px-4 rounded-xl font-extrabold text-[#071827] text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{reducing ? L('Sending...', 'بھیجا جا رہا ہے...', 'جارٍ الإرسال...') : L('Send the new price', 'نئی قیمت بھیجیں', 'إرسال السعر الجديد')}</button>
                  {/* round-2 UX-033: closes the discount request for the owner and team members alike */}
                  <button type="button" onClick={cannotReduce} disabled={declining} className="flex-1 min-w-[10rem] min-h-[44px] px-4 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: '#0B2438' }}>{declining ? L('Sending...', 'بھیجا جا رہا ہے...', 'جارٍ الإرسال...') : L('I cannot lower the price', 'میں قیمت کم نہیں کر سکتا', 'لا أستطيع التخفيض')}</button>
                </div>
              </div>
              )
            })()}
            {existingOffer.info_request && (
              <div className="mt-4 bg-white border-2 border-[#D4A543]/70 rounded-xl p-4 text-start">
                <div className="font-bold text-[#0B2438] mb-1"><Glyph e="❓" /> {L('A question from the buyer', 'خریدار کا سوال', 'سؤال من المشتري')}</div>
                <div className="text-sm text-gray-800 bg-[#f4f6f9] rounded-lg p-2.5 mb-2" dir="auto">{existingOffer.info_request}</div>
                {existingOffer.info_response ? (
                  <div className="text-sm bg-emerald-50 rounded-lg p-2.5"><span className="text-emerald-700 text-[12px] font-bold">{L('Your reply:', 'آپ کا جواب:', 'ردّك:')}</span><div dir="auto">{existingOffer.info_response}</div></div>
                ) : oc === 'pending' ? (
                  <div>
                    <label htmlFor="info-reply" className="block text-[13px] font-bold text-gray-700 mb-1">{L('Your reply to the buyer', 'خریدار کو آپ کا جواب', 'ردّك على المشتري')}</label>
                    {/* UX-169: ready answers the seller can edit before sending */}
                    <div className="flex flex-wrap gap-2 mb-2" role="group" aria-label={L('Ready replies', 'تیار جوابات', 'ردود جاهزة')}>
                      {[
                        L('Available in our stock now.', 'ہمارے اسٹاک میں ابھی دستیاب ہے۔', 'متوفر لدينا حالياً.'),
                        L('We can supply an alternative with the same specifications.', 'ہم انہی تفصیلات کا متبادل فراہم کر سکتے ہیں۔', 'نوفّر بديلاً بالمواصفات نفسها.'),
                      ].map((q) => (
                        <button key={q} type="button" onClick={() => { setInfoReply((v) => (v.trim() ? v.trim() + ' ' + q : q)); setActionError('') }} className={chip(false)}>{q}</button>
                      ))}
                    </div>
                    <textarea id="info-reply" value={infoReply} onChange={(e: any) => { setInfoReply(e.target.value); setActionError('') }} rows={2} className="input-field text-base sm:text-sm mb-2" placeholder={L('Write your reply about the product...', 'پروڈکٹ کے بارے میں اپنا جواب لکھیں...', 'اكتب ردّك عن المنتج...')} />
                    <button type="button" onClick={submitInfoResponse} disabled={infoReplying || !infoReply.trim()} className="min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{infoReplying ? L('Sending...', 'بھیجا جا رہا ہے...', 'جارٍ الإرسال...') : L('Send reply', 'جواب بھیجیں', 'إرسال الرد')}</button>
                  </div>
                ) : null}
              </div>
            )}

            {/* UX-031: edit within 15 minutes; the prices and details stay filled in */}
            {canEditOffer && !expired && (
              <div className="mt-4 bg-white border border-[#0B2438]/15 rounded-xl p-3 text-start">
                {isMember && existingOffer.submitted_by && existingOffer.submitted_by !== user?.id && (
                  <div className="text-[13px] font-bold text-amber-800 mb-2">{L('This is a colleague\'s offer — check with them before editing it.', 'یہ ساتھی کی آفر ہے — بدلنے سے پہلے ان سے بات کریں۔', 'هذا عرض زميلك؛ تواصل معه قبل تعديله.')}</div>
                )}
                <p className="text-[13px] text-gray-700 mb-1 leading-relaxed">
                  <Glyph e="⏱" /> <strong>{L(`${editMinsLeft} min left to edit.`, `ترمیم کے لیے ${editMinsLeft} منٹ باقی۔`, `باقي ${arCount(editMinsLeft, 'دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة')} للتعديل.`)}</strong> {L('You can edit your offer within 15 minutes of sending it.', 'بھیجنے کے 15 منٹ کے اندر آپ اپنی آفر میں ترمیم کر سکتے ہیں۔', 'يمكنك تعديل عرضك خلال 15 دقيقة من إرساله.')}
                </p>
                {/* the supplier must know that editing takes the offer away from the buyer until it is sent again */}
                <p className="text-[13px] font-semibold text-[#8F6820] mb-2 leading-relaxed">
                  {L('Editing withdraws the offer: the buyer will not see it until you send it again. Your prices and details stay filled in.', 'ترمیم سے آفر واپس لے لی جاتی ہے: جب تک آپ دوبارہ نہیں بھیجتے، خریدار اسے نہیں دیکھے گا۔ آپ کی قیمتیں اور تفصیلات بھری رہیں گی۔', 'التعديل يسحب العرض: لن يراه المشتري حتى ترسله من جديد، وتبقى أسعارك وتفاصيلك معبّأة.')}
                </p>
                <button type="button" onClick={cancelOffer} disabled={cancelling}
                  className="min-h-[44px] px-5 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: '#0B2438' }}>
                  {cancelling ? L('Withdrawing...', 'واپس لی جا رہی ہے...', 'جارٍ سحب العرض...') : L('Withdraw and edit the offer', 'آفر واپس لیں اور ترمیم کریں', 'اسحب العرض وعدّله')}
                </button>
              </div>
            )}

            {/* المواد التي سعّرتها — كل مادة وسعرها (واضحة للمورد) */}
            {Array.isArray(existingOffer.item_prices) && existingOffer.item_prices.length > 0 && (
              <div className="mt-4 text-start border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-gray-50 px-3 py-2 text-[13px] font-bold text-gray-600 flex justify-between">
                  <span><Glyph e="🧾" /> {L('Items you priced', 'جن چیزوں کی آپ نے قیمت دی', 'المواد التي سعّرتها')} <span className="ms-1 inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-[#0B2438]/10 text-[12px] text-[#0B2438]">{existingOffer.item_prices.length}</span></span>
                  <span>{L('Price', 'قیمت', 'السعر')}</span>
                </div>
                {existingOffer.item_prices.map((it: any, idx: number) => {
                  const ix = Number(it.item_index ?? idx)
                  const won = myAwards ? myAwards.idx.has(ix) : null
                  return (
                  <div key={idx} className={`px-3 py-2.5 border-t border-gray-100 flex items-center justify-between gap-3 ${won === false ? 'opacity-60' : ''}`}>
                    <span className="text-sm text-gray-800 font-medium min-w-0">
                      <AutoTr text={getProductLabel(it.product_name, locale)} locale={locale} />
                      <span className="text-gray-500 text-[12px] font-normal"> ({(Number(it.quantity) || 0).toLocaleString('en-US')} {getUnitLabel(it.unit, locale)}{it.delivery_days ? ` · ${L(`delivery within ${daysText(it.delivery_days, 'en')}`, `${daysText(it.delivery_days, 'ur')} میں ڈیلیوری`, `التوصيل خلال ${daysText(it.delivery_days, 'ar')}`)}` : ''})</span>
                    </span>
                    <span className="flex flex-wrap justify-end items-center gap-2 shrink-0">
                      {won === true && <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><Check className="w-3.5 h-3.5" aria-hidden />{L('Chosen', 'منتخب', 'اختيرت')}</span>}
                      {won === false && <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{L('Not chosen', 'منتخب نہیں', 'لم تُختر')}</span>}
                      {it.install_offered === true && <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#0B2438]/5 text-[#0B2438] whitespace-nowrap"><Glyph e="🔧" /> {L(`incl. installation ${installTotalOf(it).toLocaleString('en-US')}`, `تنصیب سمیت ${installTotalOf(it).toLocaleString('en-US')}`, `يشمل التركيب ${installTotalOf(it).toLocaleString('en-US')}`)}</span>}
                      {it.install_offered === false && <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">{L('without installation', 'تنصیب کے بغیر', 'بدون تركيب')}</span>}
                      <span className={`font-bold text-sm whitespace-nowrap ${won === false ? 'line-through' : ''}`} style={{ color: '#0B2438' }}>{(Number(it.total) || 0).toLocaleString('en-US')} {SAR}</span>
                    </span>
                  </div>
                  )
                })}
              </div>
            )}

            {isIndependent && <SourceShopCard offerId={existingOffer.id} editable={st === 'pending'} locale={locale} />}
            {/* partial award: confirm or lower the delivery / other charges for the materials won (191) */}
            {st === 'accepted' && existingOffer.extras_pending && !isMember && (
              <PartialExtrasConfirm offer={existingOffer} locale={locale} wonCount={myAwards?.idx.size} onDone={(o: any) => setExistingOffer(o)} />
            )}
            {st === 'accepted' && existingOffer.extras_pending && isMember && (
              <p className="mt-3 text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-start">{L('The delivery charges for the chosen materials are waiting for the account owner to confirm them.', 'منتخب مال کی ڈیلیوری فیس اکاؤنٹ کے مالک کی تصدیق کی منتظر ہے۔', 'رسوم التوصيل للمواد المختارة بانتظار تأكيد صاحب الحساب.')}</p>
            )}

            {/* 🛡 حماية الصفقة — إدارة الصفقة وتتبّعها؛ عضو الفريق يراها للقراءة (UX-126) */}
            {st === 'accepted' && (
              <div id="deal" className="mt-4 scroll-mt-24">
                <DealProtection
                  offer={existingOffer}
                  isContractor={false}
                  isSupplier={true}
                  otherParty={contractorInfo}
                  poNumber={`PO-${existingOffer.id.slice(0, 8).toUpperCase()}`}
                  amount={lineComparable(myAwards && Array.isArray(existingOffer.item_prices) && myAwards.idx.size < existingOffer.item_prices.length ? myAwards.total : existingOffer.total_price, existingOffer)}
                  myId={user?.id}
                  sellerTier={myTier}
                  rfqRefNo={rfq.ref_no}
                  managedByOwner={isMember}
                />
              </div>
            )}

            {/* تقييم المورّد للمشتري (متبادل) — بعد قبول الصفقة */}
            {st === 'accepted' && !isMember && (
              <div className="mt-4 border-t border-emerald-200 pt-4 text-start">
                {!existingOffer.received_at && !cDone ? (
                  <div className="text-[13px] text-gray-600"><Glyph e="⭐" /> {L('You can rate the buyer once they confirm receiving the goods.', 'خریدار کے مال کی وصولی کنفرم کرنے کے بعد آپ اس کی ریٹنگ دے سکیں گے۔', 'يُتاح تقييم المشتري بعد أن يؤكّد استلام البضاعة.')}</div>
                ) : cDone ? (
                  <div className="text-sm font-bold" style={{ color: '#0F6E56' }}><Glyph e="⭐" /> {L('Thanks for rating the buyer', 'خریدار کی ریٹنگ دینے کا شکریہ', 'شكراً لتقييمك المشتري')}</div>
                ) : (
                  <div>
                    <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>{L('Rate the buyer', 'خریدار کی ریٹنگ دیں', 'قيّم المشتري')} <Glyph e="⭐" /></div>
                    <div className="flex gap-1 mb-2" role="radiogroup" aria-label={L('Rating', 'ریٹنگ', 'التقييم')}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={cRating === n} aria-label={`${n}/5`} onClick={() => setCRating(n)} className={`w-11 h-11 text-2xl leading-none ${n <= cRating ? 'text-[#D4A543]' : 'text-gray-300'}`}>★</button>
                      ))}
                    </div>
                    <textarea value={cComment} onChange={(e: any) => setCComment(e.target.value)} rows={2} className="input-field text-base sm:text-sm" aria-label={L('Comment', 'تبصرہ', 'تعليق')} placeholder={L('Optional comment about the buyer…', 'خریدار کے بارے میں اختیاری تبصرہ…', 'تعليق اختياري عن المشتري…')} />
                    {cMsg && <div role="alert" className="text-[13px] text-red-600 mt-1">{cMsg}</div>}
                    <button type="button" disabled={!cRating || cBusy} onClick={async () => {
                      if (!cRating) return
                      setCBusy(true); setCMsg('')
                      const supabase = createClient()
                      const { error: e } = await supabase.rpc('submit_contractor_review', { p_offer_id: existingOffer.id, p_rating: cRating, p_comment: cComment || null })
                      setCBusy(false)
                      if (e) { const dup = (e.message || '').includes('Already'); setCMsg(dup ? L('You have already rated this buyer', 'آپ اس خریدار کی ریٹنگ پہلے دے چکے ہیں', 'سبق أن قيّمت هذا المشتري') : L('Error, try again', 'خرابی ہوئی، دوبارہ کوشش کریں', 'حدث خطأ، حاول مرة أخرى')); if (dup) setCDone(true); return }
                      setCDone(true)
                    }} className="mt-2 min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{cBusy ? '...' : L('Submit rating', 'ریٹنگ بھیجیں', 'إرسال التقييم')}</button>
                  </div>
                )}
              </div>
            )}

            {st === 'accepted' && (
              <Link href={`/contractor/orders/${existingOffer.id}`}
                className="inline-flex items-center justify-center gap-1 mt-4 min-h-[44px] px-5 rounded-xl font-bold text-[#0B2438] text-sm border border-[#0B2438]/30 bg-white hover:shadow">
                <Glyph e="📄" /> {L('Deal statement', 'سودے کا بیان', 'بيان الصفقة')} <span aria-hidden="true">{FWD}</span>
              </Link>
            )}
          </div>
            )
          })()}
          </div>
        ) : (rfq.status !== 'open' || expired) ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2 text-gray-500">{expired ? <Glyph e="⏰" /> : <Glyph e="🔒" />}</div>
            <h3 className="font-bold" style={{ color: '#0B2438' }}>{expired ? L('Pricing window closed', 'قیمت دینے کی مہلت ختم', 'انتهت مهلة التسعير') : T.closed}</h3>
            <p className="text-sm text-gray-600">{expired ? L('The deadline passed — offers are no longer accepted.', 'مقررہ وقت ختم ہو گیا — اب آفرز قبول نہیں کی جاتیں۔', 'انتهى الوقت المحدد لاستقبال العروض على هذا الطلب.') : T.closedSub}</p>
            {rfq.expires_at && <p className="text-[13px] text-gray-500 mt-2"><Glyph e="📅" /> {formatDateTime(rfq.expires_at)}</p>}
            {/* round-2 UX-081: prices typed before the deadline stay visible (read only), never silently lost */}
            {expired && isMultiItem && myItems.some((_: any, k: number) => parseFloat(itemForms[k]?.line_total) > 0) && (
              <div className="mt-4 text-start border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-[13px] font-bold text-gray-600">{L('The prices you typed (not sent)', 'آپ کی درج کردہ قیمتیں (نہیں بھیجی گئیں)', 'الأسعار التي كتبتها (لم تُرسل)')}</div>
                {myItems.map((it: any, k: number) => parseFloat(itemForms[k]?.line_total) > 0 ? (
                  <div key={k} className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 text-gray-800">{getProductLabel(it.product_name, locale)}</span>
                    <span className="font-bold text-[#0B2438] whitespace-nowrap">{(parseFloat(itemForms[k].line_total) || 0).toLocaleString('en-US')} {SAR}</span>
                  </div>
                ) : null)}
                <div className="px-3 py-2 border-t border-gray-100">
                  <p className="text-[12px] text-gray-500">{L('Keep them in «My prices» to price faster next time.', 'اگلی بار جلد قیمت دینے کے لیے انہیں «میری قیمتیں» میں رکھیں۔', 'احفظها في «أسعاري» لتسعّر أسرع في المرة القادمة.')}</p>
                  {/* round-3 UX-031: one tap keeps the typed unit prices (saved as final prices incl. VAT) */}
                  {savedToPrices != null ? (
                    <p role="status" className="mt-1 text-[13px] font-bold text-[#0F6E56]">{L(`${savedToPrices} prices saved in «My prices».`, `${savedToPrices} قیمتیں «میری قیمتیں» میں محفوظ ہو گئیں۔`, `حُفظت ${arCount(savedToPrices, 'سعر واحد', 'سعران', 'أسعار', 'سعراً')} في «أسعاري».`)}</p>
                  ) : !isMember && (
                    <button type="button" disabled={savingPrices} onClick={async () => {
                      setSavingPrices(true); setActionError('')
                      const supabase = createClient()
                      const sid = actingId || user?.id
                      const { data: have } = await supabase.from('live_prices').select('id, product_name, unit, price').eq('supplier_id', sid)
                      let n = 0
                      for (let k = 0; k < myItems.length; k++) {
                        const f = itemForms[k]; const it = myItems[k]
                        const up = parseFloat(f?.unit_price) || 0
                        if (!(parseFloat(f?.line_total) > 0) || !(up > 0) || !sameUnit(f, k)) continue
                        // «أسعاري» keeps the final price the buyer pays (incl. VAT for a registered seller)
                        const price = +(noVat || vatIncluded !== false ? up : up * 1.15).toFixed(2)
                        const dup = (have || []).find((h: any) => h.product_name === it.product_name && (h.unit || '') === (it.unit || ''))
                        const { error: e } = dup
                          ? await supabase.from('live_prices').update({ price, previous_price: dup.price, updated_at: new Date().toISOString() }).eq('id', dup.id)
                          : await supabase.from('live_prices').insert({ supplier_id: sid, product_name: it.product_name, sector: it.sector, unit: it.unit, price, region: null })
                        if (!e) n++
                      }
                      setSavingPrices(false)
                      if (n === 0) { setError(L('Could not save the prices — please try again.', 'قیمتیں محفوظ نہیں ہو سکیں — دوبارہ کوشش کریں۔', 'تعذّر حفظ الأسعار، حاول مرة أخرى.')); return }
                      setSavedToPrices(n)
                    }} className="mt-2 inline-flex items-center min-h-[44px] px-4 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: '#0B2438' }}>
                      {savingPrices ? L('Saving...', 'محفوظ ہو رہا ہے...', 'جارٍ الحفظ...') : L('Save these prices in «My prices»', 'یہ قیمتیں «میری قیمتیں» میں محفوظ کریں', 'احفظ هذه الأسعار في «أسعاري»')}
                    </button>
                  )}
                  {error && <p role="alert" className="mt-1 text-[13px] text-red-600">{error}</p>}
                </div>
              </div>
            )}
            {nextOpen}
          </div>
        ) : crRequired ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#D4A543]/50 text-center">
            <div className="text-4xl mb-2"><Glyph e="🛡" /></div>
            <h3 className="font-bold" style={{ color: '#0B2438' }}>{L('Add your commercial registration to start pricing', 'قیمت لگانا شروع کرنے کے لیے اپنا تجارتی رجسٹریشن شامل کریں', 'أضف سجلك التجاري لتبدأ التسعير')}</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{L('This request matches what you sell. Enter your unified national number (10 digits starting with 7) and you can price right away; the team reviews it afterwards.', 'یہ درخواست آپ کے سامان سے ملتی ہے۔ اپنا متحدہ قومی نمبر (7 سے شروع، 10 ہندسے) درج کریں اور فوراً قیمت لگا سکیں گے؛ ٹیم بعد میں جائزہ لے گی۔', 'هذا الطلب يناسب ما تبيعه. أدخل الرقم الوطني الموحد لمنشأتك (10 أرقام يبدأ بـ7)، وتستطيع التسعير فوراً، ويراجعه الفريق لاحقاً.')}</p>
            <Link href="/settings" className="inline-flex items-center justify-center mt-4 min-h-[44px] px-5 rounded-xl font-bold text-[#071827] text-sm" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Add my CR', 'سی آر شامل کریں', 'أضف سجلي التجاري')}</Link>
          </div>
        ) : !verified ? (
          // UX-114: a checklist of what is missing, each with its button
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="text-center">
              <div className="text-4xl mb-2"><Glyph e="🛡" /></div>
              <h3 className="font-bold" style={{ color: '#0B2438' }}>{T.verifyFirst}</h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{L('Finish these steps, then come back to price this request. Business verification is optional and adds a «Verified» badge to your offers.', 'یہ مراحل مکمل کریں، پھر اس درخواست کی قیمت دینے واپس آئیں۔ کاروبار کی تصدیق اختیاری ہے۔', 'أكمل هذه الخطوات ثم عُد لتسعير هذا الطلب. توثيق المنشأة اختياري، ويمنح عروضك شارة «موثّق».')}</p>
            </div>
            <ul className="mt-4 space-y-2">
              {([
                ['region', gate?.region, L('Set your region', 'اپنا علاقہ منتخب کریں', 'حدّد منطقتك'), '/onboarding'],
                ['sectors', gate?.sectors, L('Choose your specialties', 'اپنی مہارتیں منتخب کریں', 'اختر تخصصاتك'), '/supplier/specialties'],
                ['contact', gate?.contact, L('Confirm your email or verify your mobile', 'ای میل کی تصدیق کریں یا موبائل نمبر تصدیق کریں', 'أكّد بريدك أو وثّق جوالك'), '/settings'],
              ] as const).map(([k, ok, label, href]) => (
                <li key={k} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#0B2438]">
                    {ok ? <Check className="w-4 h-4 text-emerald-600" aria-hidden /> : <span className="w-4 h-4 rounded-full border-2 border-gray-300 inline-block" aria-hidden />}
                    {label}
                  </span>
                  {!ok && <Link href={href} className="inline-flex items-center min-h-[44px] px-4 rounded-xl font-bold text-[#071827] text-sm" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Do it', 'کریں', 'ابدأ')}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <form id="offer-form" onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 scroll-mt-24">
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{T.submitOffer}</h3>
            {/* round-2 UX-081: warn in the last 15 minutes (the form closes at the deadline) */}
            {lastMinutes && (
              <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-bold px-3 py-2 mb-4">
                <Glyph e="⏰" /> {L(`${formatTimeLeft(rfq.expires_at, locale)} left before pricing closes. Send your offer now.`, `قیمت دینے کی مہلت ختم ہونے میں ${formatTimeLeft(rfq.expires_at, locale)} باقی۔ ابھی اپنی آفر بھیجیں۔`, `باقي ${formatTimeLeft(rfq.expires_at, locale)} على انتهاء مهلة التسعير، أرسل عرضك الآن.`)}
              </div>
            )}
            {error && <div id="offer-error-top" role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl p-3 mb-4 scroll-mt-24">{error}</div>}
            {draftRestored && (
              <div className="flex items-start justify-between gap-2 bg-[#0B2438]/5 border border-[#0B2438]/15 text-[#0B2438] text-[13px] font-semibold rounded-xl px-3 py-2 mb-4" aria-live="polite">
                <span><Glyph e="📝" /> {L('Your draft was restored.', 'آپ کا مسودہ بحال کر دیا گیا۔', 'استُعيدت مسودتك.')}{reattach && <> {L('Attach the files again; they could not be restored.', 'فائلیں دوبارہ منسلک کریں؛ وہ بحال نہیں ہو سکیں۔', 'أعد إرفاق الملفات، فقد تعذّرت استعادتها.')}</>}</span>
                <button type="button" onClick={() => { setDraftRestored(false); setReattach(false) }} className="w-8 h-8 grid place-items-center shrink-0 text-gray-500 hover:text-gray-700" aria-label={L('Close', 'بند کریں', 'إغلاق')}><X className="w-4 h-4" aria-hidden /></button>
              </div>
            )}
            {/* UX-043: the buyer edited the request after my offer, which cleared it: say so, and refill matching lines */}
            {prevSent && !draftRestored && (
              <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm px-3 py-2.5 mb-4">
                <p className="font-semibold leading-relaxed">{L('The buyer edited this request after you sent your offer, so the previous offer was cancelled. Review the materials and quantities, then send your offer again.', 'آپ کی آفر بھیجنے کے بعد خریدار نے یہ درخواست بدل دی، اس لیے پچھلی آفر منسوخ ہو گئی۔ مال اور مقداریں دیکھیں، پھر اپنی آفر دوبارہ بھیجیں۔', 'عدّل المشتري هذا الطلب بعد إرسال عرضك، فأُلغي العرض السابق. راجِع المواد والكميات ثم أرسل عرضك من جديد.')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => {
                    const lines: any[] = prevSent.lines || []
                    const conv = (v: number) => {
                      // the copy keeps its own VAT basis: bring it to the basis chosen now
                      if (noVat || prevSent.vatIncluded === (vatIncluded !== false)) return v
                      return prevSent.vatIncluded ? +(v / 1.15).toFixed(2) : +(v * 1.15).toFixed(2)
                    }
                    if (isMultiItem) {
                      myItems.forEach((it: any, k: number) => {
                        const m = lines.find((l: any) => l.product_name === it.product_name && (l.unit || '') === (it.unit || '') && Number(l.unit_price) > 0)
                        if (m && !(parseFloat(itemForms[k]?.line_total) > 0)) setItemUnit(k, String(conv(Number(m.unit_price))))
                      })
                    } else if (Number(lines[0]?.unit_price) > 0) { setSingleByTotal(false); handleSingleUnitChange(String(conv(Number(lines[0].unit_price)))) }
                    setPrevSent(null)
                    try { localStorage.removeItem(`tsk_offer_sent_${actingId || user?.id}_${id}`) } catch {}
                  }} className="inline-flex items-center min-h-[44px] px-4 rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{L('Fill in my previous prices', 'میری پچھلی قیمتیں بھریں', 'املأ أسعاري السابقة')}</button>
                  <button type="button" onClick={() => { setPrevSent(null); try { localStorage.removeItem(`tsk_offer_sent_${actingId || user?.id}_${id}`) } catch {} }} className="inline-flex items-center min-h-[44px] px-3 text-sm font-semibold text-amber-900 underline">{L('Dismiss', 'بند کریں', 'إخفاء')}</button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {isMultiItem && myItems.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2 text-gray-500"><Glyph e="📭" /></div>
                  <p className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('No materials match your specialties', 'اس درخواست میں آپ کی مہارت کا کوئی مال نہیں', 'لا توجد مواد ضمن تخصصك في هذا الطلب')}</p>
                  <p className="text-[13px] text-gray-600 mt-1">{L('The materials of this request are outside your specialties; you do not need to price it.', 'اس درخواست کا مال آپ کی مہارتوں سے باہر ہے؛ آپ کو قیمت دینے کی ضرورت نہیں۔', 'مواد هذا الطلب خارج تخصصاتك، ولا يلزمك تسعيرها.')}</p>
                  {nextOpen}
                </div>
              ) : isMultiItem ? (
                <div>
                  <div className="flex items-end justify-between gap-2 mb-1">
                    <h4 className="block text-sm font-bold" style={{ color: '#0B2438' }}>
                      {L('Price the materials you can supply', 'جو مال آپ دے سکتے ہیں اس کی قیمت دیں', 'سعّر المواد التي تستطيع توفيرها')}
                    </h4>
                    <span className="text-[13px] font-bold text-gray-600">{pricedCount}/{myItems.length}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 mb-3">
                    {noVat
                      ? L('Enter the price per unit of each material — the total is calculated. You do not have to price them all; open «Details» for another unit, delivery time, warranty or a catalog.', 'ہر مال کی فی یونٹ قیمت درج کریں، کل رقم خود بنے گی۔ سب کی قیمت دینا ضروری نہیں؛ دوسرے یونٹ، ڈیلیوری، وارنٹی یا کیٹلاگ کے لیے «تفصیلات» کھولیں۔', 'أدخل سعر الوحدة لكل مادة ويُحسب الإجمالي تلقائياً، ولست ملزماً بتسعير الكل. افتح «التفاصيل» لوحدة أخرى أو مدة التوصيل أو الضمان أو الكتالوج.')
                      : vatIncluded
                        ? L('Enter the price per unit of each material, including VAT — the total is calculated. You do not have to price them all; open «Details» for another unit, delivery time, warranty or a catalog.', 'ہر مال کی فی یونٹ قیمت ٹیکس سمیت درج کریں، کل رقم خود بنے گی۔ سب کی قیمت دینا ضروری نہیں؛ دوسرے یونٹ، ڈیلیوری، وارنٹی یا کیٹلاگ کے لیے «تفصیلات» کھولیں۔', 'أدخل سعر الوحدة لكل مادة شاملاً ضريبة القيمة المضافة 15% ويُحسب الإجمالي تلقائياً، ولست ملزماً بتسعير الكل. افتح «التفاصيل» لوحدة أخرى أو مدة التوصيل أو الضمان أو الكتالوج.')
                        : L('Enter the price per unit of each material before VAT (15% is added for the buyer) — the total is calculated. You do not have to price them all; open «Details» for another unit, delivery time, warranty or a catalog.', 'ہر مال کی فی یونٹ قیمت ٹیکس سے پہلے درج کریں (خریدار کے لیے 15% شامل ہوگا)، کل رقم خود بنے گی۔ سب کی قیمت دینا ضروری نہیں؛ دوسرے یونٹ، ڈیلیوری، وارنٹی یا کیٹلاگ کے لیے «تفصیلات» کھولیں۔', 'أدخل سعر الوحدة لكل مادة قبل الضريبة (وتُضاف 15% للمشتري) ويُحسب الإجمالي تلقائياً، ولست ملزماً بتسعير الكل. افتح «التفاصيل» لوحدة أخرى أو مدة التوصيل أو الضمان أو الكتالوج.')}
                  </p>
                  {vatBlock}
                  <div className="space-y-3">
                    {myItems.map((it: any, i: any) => {
                      const form = itemForms[i] || {}
                      const line = parseFloat(form.line_total) || 0
                      const qty = Number(it.quantity) || 0
                      const more = openItem === i
                      const detailCount = [form.specs, form.delivery_days, (form.warranty || '').trim(), form.file, form.priceUnit && !sameUnit(form, i) ? 'u' : ''].filter(Boolean).length
                      return (
                        <div key={i} className={`rounded-2xl border p-3 sm:p-4 transition-all ${line > 0 ? 'border-[#0F6E56]/40 bg-[#0F6E56]/[0.03]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={productImageUrl(it.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, it.sub_category || detectSubCategory(it.product_name, it.sector))}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-gray-50 border border-gray-100 shrink-0" />
                            <div className="flex-1 min-w-0">
                              {/* quantity on its own line under the name: long names get the full width (app parity 32817a2) */}
                              <div className="min-w-0">
                                <div className="font-bold text-[15px] leading-snug" style={{ color: '#0B2438' }}>
                                  {line > 0 && <span className="inline-grid place-items-center w-5 h-5 rounded-full text-white me-1.5 align-middle" style={{ background: '#0F6E56' }}><Check className="w-3.5 h-3.5" aria-hidden /></span>}
                                  <AutoTr text={getProductLabel(it.product_name, locale)} locale={locale} />
                                </div>
                                <div className="text-[13px] mt-0.5 text-gray-500">{L('Quantity', 'مقدار', 'الكمية')}: <span className="font-extrabold text-[#8F6820] whitespace-nowrap">{qty.toLocaleString('en-US')} {getUnitLabel(it.unit, locale)}</span></div>
                                {it.sub_category && <div className="text-xs text-gray-500 mt-0.5">{getSubCategoryLabel(it.sector, it.sub_category, locale)}</div>}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {it.in_stock && <span className="text-[12px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"><Glyph e="⚡" /> {L('In stock now', 'فوری دستیاب', 'توفّر فوري')}</span>}
                                {it.max_days && <span className="text-[12px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"><Glyph e="⏱" /> {L(`within ${daysText(it.max_days, 'en')}`, `${daysText(it.max_days, 'ur')} میں`, `خلال ${daysText(it.max_days, 'ar')}`)}</span>}
                                {it.spec_file_url && it.spec_file_url !== it.photo_url && <a href={fileHref(it.spec_file_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-[12px] px-2 rounded bg-[#0B2438]/5 text-[#0B2438] hover:underline"><Glyph e="📎" /> {it.spec_file_name || L('Buyer file', 'خریدار کی فائل', 'ملف من المشتري')}</a>}
                                {Array.isArray(it.attachments) && it.attachments.map((a: any, ai: number) => <a key={ai} href={fileHref(a.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-[12px] px-2 rounded bg-[#0B2438]/5 text-[#0B2438] hover:underline truncate max-w-[10rem]"><Glyph e="📎" /> {a.name || L('File', 'فائل', 'ملف')}</a>)}
                              </div>
                            </div>
                          </div>

                          {/* what the buyer asked for: specs and photo, prominent so the price matches */}
                          {it.specification && (
                            <div className="mt-3 rounded-xl p-2.5 border text-sm text-gray-800 leading-relaxed" style={{ background: '#D4A5430a', borderColor: '#D4A54344' }}>
                              <span className="text-xs font-bold me-1" style={{ color: '#8F6820' }}><Glyph e="📋" /> {L('Buyer specs:', 'خریدار کی تفصیل:', 'مواصفات المشتري:')}</span><AutoTr text={it.specification} locale={locale} />
                            </div>
                          )}
                          {it.photo_url && (
                            <a href={fileHref(it.photo_url)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 group" title={L('Material photo from the buyer', 'خریدار کی طرف سے مال کی تصویر', 'صورة المادة من المشتري')}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={fileHref(it.photo_url)} alt={L('Material photo', 'مال کی تصویر', 'صورة المادة')} loading="lazy" className="w-20 h-20 object-cover rounded-lg border border-gray-200 group-hover:border-[#D4A543]" />
                              <span className="text-[12px] font-bold text-[#8F6820]"><Glyph e="📷" /> {L('Photo from the buyer', 'خریدار کی تصویر', 'صورة من المشتري')}<br /><span className="font-normal text-gray-500">{L('Price this exact item', 'بالکل یہی مال کی قیمت لگائیں', 'سعّر المادة نفسها')}</span></span>
                            </a>
                          )}

                          {/* understanding the request: what it is, and what the buyer did not say */}
                          {(() => {
                            const nt = itemNotes[Number(it.item_index ?? i)]
                            if (!nt || (!nt.what_it_is && !nt.missing.length)) return null
                            return (
                              <div className="mt-3 space-y-2">
                                {nt.what_it_is && (
                                  <p className="text-xs text-gray-600 leading-relaxed" dir="auto">
                                    <span className="font-bold text-[#0B2438]"><Glyph e="ℹ" /> {L('What it is:', 'یہ کیا ہے:', 'ما هذه المادة؟')} </span>{nt.what_it_is}
                                  </p>
                                )}
                                {nt.missing.length > 0 && (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-amber-800 flex-1 min-w-[12rem]">
                                      <Glyph e="⚠" /> <b>{L('Not specified by the buyer:', 'خریدار نے نہیں بتایا:', 'لم يحدّد المشتري:')}</b> {nt.missing.join(L(', ', '، ', '، '))}
                                    </span>
                                    {isMember ? (
                                      // UX-044: a team member forwards the question to the account owner (no dead end)
                                      askedOwner[Number(it.item_index ?? i)] ? (
                                        <span role="status" className="text-xs font-bold text-[#0F6E56]">{L('The question was sent to the account owner.', 'سوال اکاؤنٹ کے مالک کو بھیج دیا گیا۔', 'أُرسل السؤال إلى مالك الحساب.')}</span>
                                      ) : (
                                        <button type="button" disabled={asking === Number(it.item_index ?? i)} onClick={async () => {
                                          const idx = Number(it.item_index ?? i)
                                          setAsking(idx); setError('')
                                          const msg = `بخصوص «${it.product_name}»: لم يحدّد المشتري ${nt.missing.join('، ')}. هل تسأله؟`
                                          const { error: oErr } = await createClient().rpc('notify_company_owner', { p_rfq_id: id, p_message: msg })
                                          setAsking(null)
                                          if (oErr) { setError(L('Could not send the question to the account owner — please try again.', 'سوال اکاؤنٹ کے مالک کو نہیں بھیجا جا سکا — دوبارہ کوشش کریں۔', 'تعذّر إرسال السؤال إلى مالك الحساب، حاول مرة أخرى.')); return }
                                          setAskedOwner(prev => ({ ...prev, [idx]: true }))
                                        }} className="inline-flex items-center gap-1 min-h-[44px] text-xs font-bold px-3 rounded-lg text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
                                          <Glyph e="💬" /> {L('Send the question to the account owner', 'سوال اکاؤنٹ کے مالک کو بھیجیں', 'أرسل السؤال إلى مالك الحساب')}
                                        </button>
                                      )
                                    ) : (
                                    <button type="button" onClick={() => askBuyer(it, nt.missing)} disabled={asking === Number(it.item_index ?? i)}
                                      className="inline-flex items-center gap-1 min-h-[44px] text-xs font-bold px-3 rounded-lg text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
                                      <Glyph e="💬" /> {L('Ask the buyer', 'خریدار سے پوچھیں', 'اسأل المشتري')}
                                    </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* the price, right away: the unit price (the total follows); a custom unit prices the total */}
                          {skipped.has(i) ? (
                            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-gray-50 border border-dashed border-gray-300 px-3 py-2.5">
                              <span className="text-xs font-bold text-gray-500">{L("You don't carry this item — it won't be in your offer", 'یہ آئٹم آپ کے پاس نہیں — پیشکش میں شامل نہیں', 'لا توفّر هذه المادة — لن تدخل في عرضك')}</span>
                              <button type="button" onClick={() => setSkipped(prev => { const n = new Set(prev); n.delete(i); return n })} className="min-h-[44px] px-2 text-[13px] font-bold text-[#8F6820] hover:underline">{L('Undo', 'واپس', 'تراجع')}</button>
                            </div>
                          ) : (<>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[11rem]">
                              {sameUnit(form, i) ? (
                                <input type="text" inputMode="decimal" value={form.unit_price || ''} onChange={(e: any) => setItemUnit(i, latinNum(e.target.value))}
                                  data-unit-price enterKeyHint="next" onKeyDown={(e: any) => { if (e.key !== 'Enter') return; e.preventDefault(); const all = Array.from(document.querySelectorAll('input[data-unit-price]')) as HTMLInputElement[]; const nx = all[all.indexOf(e.currentTarget) + 1]; if (nx) nx.focus(); else e.currentTarget.blur() }}
                                  aria-label={L(`Unit price for ${getProductLabel(it.product_name, locale)}`, `${getProductLabel(it.product_name, locale)} فی یونٹ قیمت`, `سعر الوحدة لـ ${getProductLabel(it.product_name, locale)}`)}
                                  className="input-field font-bold pe-20" placeholder={L(`Price per ${getUnitLabel(it.unit, locale)}`, `فی ${getUnitLabel(it.unit, locale)} قیمت`, `السعر لكل ${getUnitLabel(it.unit, locale) || 'وحدة'}`)} min="0" step="any" />
                              ) : (
                                <input type="text" inputMode="decimal" value={form.line_total || ''} onChange={(e: any) => setItemTotal(i, latinNum(e.target.value))}
                                  aria-label={L(`Total price for ${getProductLabel(it.product_name, locale)}`, `${getProductLabel(it.product_name, locale)} کی کل قیمت`, `السعر الإجمالي لـ ${getProductLabel(it.product_name, locale)}`)}
                                  className="input-field font-bold pe-14" placeholder={L(`Total for ${qty.toLocaleString('en-US')} ${getUnitLabel(it.unit, locale)}`, `${qty.toLocaleString('en-US')} ${getUnitLabel(it.unit, locale)} کی کل قیمت`, `إجمالي ${qty.toLocaleString('en-US')} ${getUnitLabel(it.unit, locale)}`)} min="0" step="any" />
                              )}
                              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">{sameUnit(form, i) ? `${SAR} / ${getUnitLabel(it.unit, locale)}` : SAR}</span>
                            </div>
                            <button type="button" onClick={() => setOpenItem(more ? null : i)} aria-expanded={more}
                              className={`inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold px-3 rounded-xl border transition-all ${more || detailCount ? 'border-[#D4A543]/50 text-[#8F6820] bg-[#D4A543]/5' : 'border-gray-200 text-gray-600 hover:border-[#D4A543]/50'}`}>
                              {more ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />} {L('Details', 'تفصیلات', 'التفاصيل')}{detailCount ? <span className="ms-1 inline-grid place-items-center min-w-[1.25rem] h-5 px-1 rounded-full bg-[#D4A543]/25 text-[12px] text-[#071827]">{detailCount}</span> : null}
                            </button>
                            <button type="button" onClick={() => { setItemUnit(i, ''); setItemTotal(i, ''); setOpenItem(null); setSkipped(prev => new Set(prev).add(i)) }}
                              className="min-h-[44px] text-[13px] font-bold px-3 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-400">
                              {L("Don't carry", 'دستیاب نہیں', 'لا أوفّرها')}
                            </button>
                          </div>
                          {buyerBudgets[it.item_index] > 0 && (() => {
                            // R23: the buyer chose to show a cap (before VAT). Pricing above it is allowed; soft warning only.
                            const b = buyerBudgets[it.item_index]
                            const up = +form.unit_price || 0
                            const upPre = noVat ? up : (vatIncluded ? up / 1.15 : up)
                            const over = sameUnit(form, i) && up > 0 && upPre - b > 0.005
                            return (
                              <div className="mt-1.5 text-[12px] leading-relaxed">
                                <span className="font-semibold text-gray-700">{L('Buyer budget', 'خریدار کا بجٹ', 'ميزانية المشتري')}: {L('up to', 'تک', 'حتى')} {b.toLocaleString('en-US')} {SAR} / {getUnitLabel(it.unit, locale)}</span>{' '}
                                <span className="text-gray-500">({L('before VAT', 'VAT سے پہلے', 'قبل الضريبة')}{!noVat ? ` · ≈ ${(b * 1.15).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${L('incl. VAT', 'VAT سمیت', 'شامل الضريبة')}` : ''})</span>
                                {over && <div className="text-amber-700 font-semibold mt-0.5">{L('Your price is above the buyer budget. You can still send it.', 'آپ کی قیمت خریدار کے بجٹ سے زیادہ ہے۔ آپ پھر بھی بھیج سکتے ہیں۔', 'سعرك أعلى من ميزانية المشتري، ويمكنك إرساله مع ذلك.')}</div>}
                              </div>
                            )
                          })()}
                          {line > 0 && qty > 0 && sameUnit(form, i) && (
                            <p className="text-[12px] text-gray-600 mt-1">
                              {L('Total', 'کل', 'الإجمالي')}: <b className="text-[#0B2438]">{line.toLocaleString('en-US')} {SAR}</b> <span className="text-gray-500">({qty.toLocaleString('en-US')} × {(+form.unit_price || 0).toLocaleString('en-US')})</span>
                              {form.fromPrev && <span className="text-gray-500"> · {L('your previous price', 'آپ کی پچھلی قیمت', 'سعرك السابق')}</span>}
                            </p>
                          )}
                          {!(line > 0) && Number(form.suggest) > 0 && sameUnit(form, i) && (
                            <button type="button" onClick={() => takePrevPrice(i, Number(form.suggest))}
                              className="mt-1.5 inline-flex items-center min-h-[44px] text-xs font-bold px-3 rounded-lg border border-[#D4A543]/50 text-[#8F6820] bg-[#D4A543]/5 hover:bg-[#D4A543]/10">
                              {(() => {
                                // UX-030: the amount on the button is the one that will be filled, with its VAT basis
                                const v = prevVal(Number(form.suggest)).toLocaleString('en-US')
                                const b = noVat ? '' : vatIncluded === false ? L(' before VAT', ' ٹیکس سے پہلے', ' قبل الضريبة') : L(' incl. VAT', ' ٹیکس سمیت', ' شامل الضريبة')
                                return form.suggestSub
                                  ? L(`Use your saved price for ${getSubCategoryLabel(it.sector, form.suggestSub, 'en')} (${v} ${SAR}${b})`, `${getSubCategoryLabel(it.sector, form.suggestSub, 'ur')} کی محفوظ قیمت استعمال کریں (${v} ${SAR}${b})`, `استخدم سعرك المحفوظ لفئة ${getSubCategoryLabel(it.sector, form.suggestSub, 'ar')} (${v} ${SAR}${b})`)
                                  : L(`Use your previous price (${v} ${SAR}${b})`, `اپنی پچھلی قیمت استعمال کریں (${v} ${SAR}${b})`, `استخدم سعرك السابق (${v} ${SAR}${b})`)
                              })()}
                            </button>
                          )}
                          {(() => {
                            // «سعرك أعلى/أقل من متوسط السوق» (owner 2026-10-31); only from 3 accepted prices up
                            const mk = market[`${it.product_name}__${it.unit || ''}`]
                            const up = +form.unit_price || 0
                            if (!mk || !(up > 0) || !sameUnit(form, i)) return null
                            // round-2 UX-080: compare before VAT on both sides, and say so
                            const upPre = noVat ? up : (vatIncluded ? up / 1.15 : up)
                            const d = Math.round(((upPre - mk.avg) / mk.avg) * 100)
                            const avg = `(${mk.avg.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${SAR} ${L('before VAT', 'ٹیکس سے پہلے', 'قبل الضريبة')})`
                            if (Math.abs(d) < 3) return <p className="text-[12px] mt-1 text-gray-500">{L('In line with the market average before VAT', 'ٹیکس سے پہلے مارکیٹ اوسط کے مطابق', 'سعرك قريب من متوسط السوق قبل الضريبة')} {avg}</p>
                            return (
                              <p className={`text-[12px] mt-1 font-semibold ${d > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {d > 0 ? L(`Your price is ${d}% above the market average before VAT`, `آپ کی قیمت ٹیکس سے پہلے مارکیٹ اوسط سے ${d}% زیادہ ہے`, `سعرك أعلى من متوسط السوق قبل الضريبة بـ ${d}%`) : L(`Your price is ${-d}% below the market average before VAT`, `آپ کی قیمت ٹیکس سے پہلے مارکیٹ اوسط سے ${-d}% کم ہے`, `سعرك أقل من متوسط السوق قبل الضريبة بـ ${-d}%`)}
                                <span className="text-gray-500 font-normal"> {avg}</span>
                              </p>
                            )
                          })()}
                          {it.with_install && (
                            <div id={`install-${i}`} className={`mt-3 rounded-xl border p-2.5 space-y-2 ${line > 0 && !installAnswered(form, it) ? 'border-[#D4A543] bg-[#D4A543]/5' : 'border-[#0B2438]/15 bg-[#0B2438]/[0.03]'}`}>
                              <p className="text-[13px] font-bold text-[#0B2438]"><Glyph e="🔧" /> {L('The buyer asked for the price with installation', 'خریدار نے تنصیب سمیت قیمت مانگی ہے', 'طلب المشتري السعر مع التركيب')}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                {!form.no_install && (
                                  <div className="relative flex-1 min-w-[11rem]">
                                    <input type="text" inputMode="decimal" value={form.install_total ?? ''} onChange={(e: any) => setItemInstall(i, { install_total: latinNum(e.target.value) })}
                                      aria-label={L(`Installation price for ${getProductLabel(it.product_name, locale)}`, `${getProductLabel(it.product_name, locale)} کی تنصیب کی قیمت`, `سعر تركيب ${getProductLabel(it.product_name, locale)}`)}
                                      className="input-field text-sm font-bold pe-14" placeholder={L('Installation price for the item', 'اس آئٹم کی تنصیب کی قیمت', 'سعر التركيب للبند')} />
                                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">{SAR}</span>
                                  </div>
                                )}
                                <label className="flex items-center gap-2 min-h-[44px] text-[13px] font-bold text-gray-700 cursor-pointer select-none">
                                  <input type="checkbox" checked={!!form.no_install} onChange={(e: any) => setItemInstall(i, { no_install: e.target.checked, ...(e.target.checked ? { install_total: '' } : {}) })} className="w-5 h-5 accent-[#0B2438]" />
                                  {L("I don't install", 'میں تنصیب نہیں کرتا', 'لا أقدّم التركيب')}
                                </label>
                              </div>
                              <p className="text-[12px] text-gray-500">
                                {form.no_install
                                  ? L('Your offer will show this item without installation.', 'آپ کی پیشکش میں یہ آئٹم تنصیب کے بغیر دکھے گا۔', 'سيظهر عرضك لهذه المادة بدون تركيب.')
                                  : noVat
                                    ? L('The installation amount for the whole quantity; 0 if it is included in the price.', 'پوری مقدار کی تنصیب کی رقم؛ قیمت میں شامل ہو تو 0۔', 'مبلغ التركيب للكمية كاملة؛ اكتب 0 إن كان مشمولاً في السعر.')
                                    : vatIncluded
                                      ? L('The installation amount for the whole quantity, including 15% VAT; 0 if it is included in the price.', 'پوری مقدار کی تنصیب کی رقم، 15% VAT سمیت؛ قیمت میں شامل ہو تو 0۔', 'مبلغ التركيب للكمية كاملة شاملاً ضريبة القيمة المضافة 15%؛ اكتب 0 إن كان مشمولاً في السعر.')
                                      : L('The installation amount for the whole quantity, before VAT; 0 if it is included.', 'پوری مقدار کی تنصیب کی رقم، ٹیکس سے پہلے؛ شامل ہو تو 0۔', 'مبلغ التركيب للكمية كاملة قبل الضريبة؛ اكتب 0 إن كان مشمولاً.')}
                                {line > 0 && installPart(form, it) > 0 && <> · {L('Item total', 'آئٹم کل', 'إجمالي البند')}: <b className="text-[#0B2438]">{(line + installPart(form, it)).toLocaleString('en-US')} {SAR}</b></>}
                              </p>
                            </div>
                          )}
                          </>)}

                          {more && (
                            <div className="mt-3 pt-3 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
                              {/* price by another unit: unit + unit price (total auto-calculates when the unit matches) */}
                              <div className="sm:col-span-2 grid grid-cols-5 gap-2">
                                <div className="col-span-2">
                                  <label htmlFor={`unit-${i}`} className="block text-[12px] font-bold text-gray-600 mb-1">{L('Your unit', 'آپ کا یونٹ', 'وحدتك')}</label>
                                  <input id={`unit-${i}`} type="text" value={form.priceUnit ?? it.unit} onChange={(e: any) => setItemPriceUnit(i, e.target.value)}
                                    className="input-field text-sm" placeholder={it.unit} list={`units-${i}`} />
                                  <datalist id={`units-${i}`}>
                                    {[it.unit, 'طن', 'سيخ', 'م³', 'م²', 'متر طولي', 'كيس', 'قطعة', 'لتر', 'لفة', 'صندوق'].filter((u, k, a) => u && a.indexOf(u) === k).map((u: any) => <option key={u} value={u} />)}
                                  </datalist>
                                </div>
                                <div className="col-span-3">
                                  {sameUnit(form, i) ? (<>
                                    <label htmlFor={`total-${i}`} className="block text-[12px] font-bold text-gray-600 mb-1">{L('Or the total directly', 'یا کل رقم', 'أو الإجمالي مباشرة')}</label>
                                    <input id={`total-${i}`} type="text" inputMode="decimal" value={form.line_total || ''} onChange={(e: any) => setItemTotal(i, latinNum(e.target.value))}
                                      className="input-field text-sm" placeholder={L('Total', 'کل', 'الإجمالي')} min="0" step="any" />
                                  </>) : (<>
                                    <label htmlFor={`uprice-${i}`} className="block text-[12px] font-bold text-gray-600 mb-1">{L('Unit price', 'فی یونٹ قیمت', 'سعر الوحدة')}</label>
                                    <input id={`uprice-${i}`} type="text" inputMode="decimal" value={form.unit_price || ''} onChange={(e: any) => setItemUnit(i, latinNum(e.target.value))}
                                      className="input-field text-sm" placeholder={L('Price / ', 'قیمت / ', 'السعر / ') + (form.priceUnit || it.unit)} min="0" step="any" />
                                  </>)}
                                </div>
                                <p className="col-span-5 text-[12px] text-gray-500">
                                  {sameUnit(form, i)
                                    ? L('Unit price and total update each other.', 'فی یونٹ قیمت اور کل رقم ایک دوسرے سے بنتی ہیں۔', 'سعر الوحدة والإجمالي يُحسب كلٌّ منهما من الآخر.')
                                    : L('Custom unit: enter the material total above yourself.', 'الگ یونٹ: اوپر کل رقم خود درج کریں۔', 'وحدة خاصة: أدخل إجمالي المادة في الأعلى بنفسك.')}
                                </p>
                              </div>
                              {isIndependent && (
                                <div className="sm:col-span-2">
                                  <label htmlFor={`src-${i}`} className="block text-xs font-bold text-gray-500 mb-1">{L('Where this item\'s price comes from (if different)', 'اس چیز کی قیمت کا ذریعہ (اگر مختلف ہو)', 'مصدر سعر هذه المادة (إن اختلف عن العرض)')}</label>
                                  <select id={`src-${i}`} value={form.source_type || ''} onChange={(e: any) => setItemField(i, 'source_type', e.target.value)} className="input-field text-sm">
                                    <option value="">{L('Same as the offer', 'آفر جیسا', 'مثل العرض كله')}</option>
                                    {sourceTypesFor(isIndependent).map(o => <option key={o.k} value={o.k}>{locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}</option>)}
                                  </select>
                                </div>
                              )}
                              <div className="sm:col-span-2">
                                <label htmlFor={`specs-${i}`} className="block text-xs font-bold text-gray-600 mb-1"><Glyph e="📝" /> {L('What you offer (type, origin, brand…)', 'آپ کیا دے رہے ہیں (قسم، برانڈ…)', 'ما تقدّمه (النوع، المنشأ، العلامة…)')}</label>
                                <textarea id={`specs-${i}`} value={form.specs || ''} onChange={(e: any) => setItemField(i, 'specs', e.target.value)} rows={2} className="input-field text-sm" />
                              </div>
                              <div>
                                <label htmlFor={`days-${i}`} className="block text-xs font-bold text-gray-600 mb-1"><Glyph e="⏱" /> {L('Delivery time for this material (days)', 'اس مال کی ڈیلیوری (دن)', 'مدة توصيل هذه المادة (أيام)')}</label>
                                <input id={`days-${i}`} type="text" inputMode="decimal" value={form.delivery_days || ''} onChange={(e: any) => setItemField(i, 'delivery_days', latinNum(e.target.value))} className="input-field text-base sm:text-sm" placeholder={allDays || '3'} />
                              </div>
                              <div>
                                <label htmlFor={`warranty-${i}`} className="block text-xs font-bold text-gray-600 mb-1"><Glyph e="🛡" /> {L('Warranty (optional)', 'وارنٹی (اختیاری)', 'الضمان (اختياري)')}</label>
                                <select id={`warranty-${i}`} value={WARRANTY_OPTIONS.some(o => o.v === (form.warranty || '')) ? (form.warranty || '') : '__other'}
                                  onChange={(e: any) => setItemField(i, 'warranty', e.target.value === '__other' ? ' ' : e.target.value)} className="input-field text-sm">
                                  {WARRANTY_OPTIONS.map(o => <option key={o.v} value={o.v}>{locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}</option>)}
                                  <option value="__other">{L('Other…', 'دیگر…', 'أخرى…')}</option>
                                </select>
                                {!WARRANTY_OPTIONS.some(o => o.v === (form.warranty || '')) && (
                                  <input value={(form.warranty || '').trimStart()} onChange={(e: any) => setItemField(i, 'warranty', e.target.value || ' ')}
                                    className="input-field text-sm mt-1.5" maxLength={80} placeholder={L('e.g. 18 months on the motor', 'مثال: موٹر پر 18 مہینے', 'مثال: 18 شهراً على المحرك')} />
                                )}
                              </div>
                              <div className="sm:col-span-2">
                                {form.file ? (
                                  <div className="flex items-center gap-3 bg-[#0B2438]/5 rounded-xl p-2.5 border border-[#0B2438]/20">
                                    <span className="text-xl"><Glyph e="📄" /></span>
                                    <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#0B2438' }}>{form.file.name}</span>
                                    <button type="button" onClick={() => setItemFile(i, null)} className="text-xs text-red-500 hover:underline">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-2.5 cursor-pointer hover:border-[#D4A543]/50 transition-all">
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={(e: any) => setItemFile(i, e.target.files?.[0] ?? null)} />
                                    <span className="text-lg"><Glyph e="📤" /></span>
                                    <span className="text-xs text-gray-500">{L('Attach a catalog / datasheet (optional)', 'کیٹلاگ منسلک کریں (اختیاری)', 'أرفق كتالوجاً أو بيانات المنتج (اختياري)')}</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {vatBlock}
                  {(() => {
                    // UX-012: the main field is the price of ONE unit; the total (unit × quantity) is shown read-only.
                    // «أدخل الإجمالي بدلاً من ذلك» switches to typing the total (the unit price is then derived).
                    const q = Number(rfq?.quantity) || 0
                    const uLabel = getUnitLabel(rfq?.unit, locale) || L('unit', 'یونٹ', 'وحدة')
                    const qtyTxt = `${q.toLocaleString('en-US')} ${getUnitLabel(rfq?.unit, locale)}`
                    const basis = noVat ? L('final price', 'حتمی قیمت', 'سعر نهائي') : vatIncluded ? L('incl. VAT', 'ٹیکس سمیت', 'شامل الضريبة') : L('before VAT', 'ٹیکس سے پہلے', 'قبل الضريبة')
                    const tot = parseFloat(totalPrice) || 0
                    const byTotal = singleByTotal || !(q > 0)
                    return (
                      <div>
                        {!byTotal ? (<>
                          <label htmlFor="single-unit-price" className="block text-xs font-bold text-gray-600 mb-1.5">{L(`Price of one ${uLabel} (SAR, ${basis})`, `ایک ${uLabel} کی قیمت (ریال، ${basis})`, `سعر ${uLabel} الواحد (ر.س، ${basis})`)} *</label>
                          <input id="single-unit-price" type="text" inputMode="decimal" value={unitPrice} onChange={(e: any) => handleSingleUnitChange(latinNum(e.target.value))}
                            className="input-field font-bold" placeholder="0.00" required />
                          {tot > 0 && (
                            <p className="text-[13px] text-gray-700 mt-1.5" aria-live="polite">{L(`Total for ${qtyTxt}: `, `${qtyTxt} کی کل رقم: `, `الإجمالي لـ${qtyTxt}: `)}<b className="text-[#0B2438]">{(+tot.toFixed(2)).toLocaleString('en-US')} {SAR}</b> <span className="text-gray-500">({basis})</span></p>
                          )}
                          <button type="button" onClick={() => setSingleByTotal(true)} className="mt-1 inline-flex items-center min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Enter the total instead', 'اس کے بجائے کل رقم درج کریں', 'أدخل الإجمالي بدلاً من ذلك')}</button>
                        </>) : (<>
                          <label htmlFor="goods-price" className="block text-xs font-bold text-gray-600 mb-1.5">{q > 0 ? L(`Total for ${qtyTxt} (SAR, ${basis})`, `${qtyTxt} کی کل رقم (ریال، ${basis})`, `الإجمالي لـ${qtyTxt} (ر.س، ${basis})`) : L(`Goods total (SAR, ${basis})`, `سامان کی کل رقم (ریال، ${basis})`, `إجمالي البضاعة (ر.س، ${basis})`)} *</label>
                          <input id="goods-price" type="text" inputMode="decimal" value={totalPrice} onChange={(e: any) => handleTotalChange(latinNum(e.target.value))}
                            className="input-field font-bold" placeholder="0.00" required />
                          {q > 0 && (parseFloat(unitPrice) || 0) > 0 && <p className="text-[13px] text-gray-600 mt-1.5">{L(`That is ${(+parseFloat(unitPrice).toFixed(2)).toLocaleString('en-US')} SAR per ${uLabel}`, `یعنی فی ${uLabel} ${(+parseFloat(unitPrice).toFixed(2)).toLocaleString('en-US')} ریال`, `أي ${(+parseFloat(unitPrice).toFixed(2)).toLocaleString('en-US')} ر.س لكل ${uLabel}`)}</p>}
                          {q > 0 && <button type="button" onClick={() => { setSingleByTotal(false); handleSingleUnitChange(unitPrice) }} className="mt-1 inline-flex items-center min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Enter the unit price instead', 'اس کے بجائے فی یونٹ قیمت درج کریں', 'أدخل سعر الوحدة بدلاً من ذلك')}</button>}
                        </>)}
                      </div>
                    )
                  })()}
                  <div>
                    <label htmlFor="single-days" className="block text-xs font-bold text-gray-500 mb-1.5">{T.deliveryDays}{maxDaysAsked > 0 && <span className="text-red-500"> *</span>}</label>
                    <input id="single-days" type="text" inputMode="decimal" value={deliveryDays} onChange={(e: any) => setDeliveryDays(latinNum(e.target.value))}
                      className="input-field" placeholder="3" min="0" />
                  </div>
                </>
              )}
              {/* خصائص المنتج — للطلب أحادي المادة فقط (متعدد المواد: الخصائص لكل مادة بداخل بطاقتها) */}
              {!isMultiItem && (
              <div>
                <label htmlFor="single-warranty" className="block text-xs font-bold text-gray-500 mb-1.5"><Glyph e="🛡" /> {L('Warranty (optional)', 'وارنٹی (اختیاری)', 'الضمان (اختياري)')}</label>
                <select id="single-warranty" value={singleWarranty} onChange={(e: any) => setSingleWarranty(e.target.value)} className="input-field text-sm">
                  {WARRANTY_OPTIONS.map(o => <option key={o.v} value={o.v}>{locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}</option>)}
                </select>
              </div>
              )}
              {!isMultiItem && (
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold mb-1" style={{ color: '#0B2438' }}>{T.attributes}</label>
                <p className="text-xs text-gray-500 mb-3">{T.attrHint}</p>
                <div className="space-y-2">
                  {attributes.map((attr: any, i: any) => (
                    <div key={i} className="flex gap-2">
                      <input value={attr.key} onChange={(e: any) => updateAttribute(i, 'key', e.target.value)} aria-label={T.attrKey}
                        className="input-field text-sm flex-1" placeholder={T.attrKey} />
                      <input value={attr.value} onChange={(e: any) => updateAttribute(i, 'value', e.target.value)} aria-label={T.attrValue}
                        className="input-field text-sm flex-1" placeholder={T.attrValue} />
                      {attributes.length > 1 && (
                        <button type="button" onClick={() => removeAttribute(i)}
                          aria-label={L('Remove', 'ہٹائیں', 'إزالة')} className="w-11 min-h-[44px] grid place-items-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 shrink-0"><X className="w-4 h-4" aria-hidden /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAttribute}
                  className="mt-2 inline-flex items-center min-h-[44px] text-xs font-semibold" style={{ color: '#8F6820' }}>{T.addAttr}</button>
              </div>
              )}

              {/* إرفاق ملف (كتالوج) — للطلب أحادي المادة فقط (متعدد المواد: كتالوج لكل مادة) */}
              {!isMultiItem && (
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="📎" /> {T.attachTitle}</label>
                <p className="text-xs text-gray-500 mb-3">{T.attachHint}</p>
                {attachFile ? (
                  <div className="flex items-center gap-3 bg-[#0B2438]/5 rounded-xl p-3 border border-[#0B2438]/20">
                    <span className="text-2xl"><Glyph e="📄" /></span>
                    <span className="text-sm font-semibold flex-1 truncate" style={{ color: '#0B2438' }}>{attachFile.name}</span>
                    <button type="button" onClick={() => setAttachFile(null)}
                      className="text-xs text-red-500 hover:underline">{T.removeAttach}</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#D4A543]/50 transition-all">
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                      onChange={async e => {
                        const f = e.target.files?.[0] ?? null
                        if (!f) { setAttachFile(null); return }
                        const v = await validateUploadFile(f)
                        if (!v.ok) { setError(v.error || ''); e.currentTarget.value = ''; setAttachFile(null); return }
                        setError(''); setAttachFile(f)
                      }} />
                    <span className="text-2xl"><Glyph e="📤" /></span>
                    <span className="text-sm text-gray-500">{T.attachBtn}</span>
                  </label>
                )}
              </div>
              )}
            </div>
          </form>
        )}
        </div>{/* main */}

        {/* SIDE (sticky on desktop): request details, then the offer summary and the send button */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🏗" /> {T.sector}</span><br/><strong>{(rfqIsMulti ? [...new Set(myItems.map((it: any) => sectionOf(it)).filter(Boolean))] : [sectionOf(rfq)].filter(Boolean)).join(' + ') || '—'}</strong></div>
            {(!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="📦" /> {T.qty}</span><br/><strong>{rfq.quantity} {getUnitLabel(rfq.unit, locale)}</strong></div>}
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="📍" /> {T.location}</span><br/><strong>{placeLabel(rfq)}</strong></div>
            <div className={`rounded-lg p-3 col-span-2 ${rfq.delivery_required ? 'bg-amber-50 border border-amber-200' : 'bg-[#f4f6f9]'}`}>
              <span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🚚" /> {T.delivery}</span><br/>
              {rfq.delivery_required ? (
                <div className="flex items-center justify-between gap-2 flex-wrap mt-0.5">
                  <strong className="text-amber-800">{T.required}{rfq.delivery_location ? ` — ${rfq.delivery_location}` : ''}</strong>
                  {(rfq.delivery_geo || rfq.delivery_location) && (
                    <a href={rfq.delivery_geo ? `https://www.google.com/maps?q=${rfq.delivery_geo}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rfq.delivery_location)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-[44px] text-xs font-bold text-white rounded-lg px-3 hover:opacity-90 whitespace-nowrap shrink-0" style={{ background: '#0B2438' }}>
                      <Glyph e="📍" /> {L('Open in Maps', 'نقشے میں کھولیں', 'افتح في الخرائط')}
                    </a>
                  )}
                </div>
              ) : <strong className="text-gray-500">{T.notRequired}</strong>}
            </div>
            <div className="bg-[#f4f6f9] rounded-lg p-3">
              <span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🏢" /> {T.contractor}</span><br/>
              {contractorInfo?.revealed && contractorInfo?.company_name_ar ? (
                <strong>{locale === 'en' && contractorInfo.company_name_en ? contractorInfo.company_name_en : contractorInfo.company_name_ar}</strong>
              ) : (
                <>
                  {existingOffer?.status === 'accepted' ? (
                    <strong className="text-gray-700">{contractorInfo?.full_name || L('Individual buyer', 'انفرادی خریدار', 'مشتري فرد')}</strong>
                  ) : (<>
                  <strong className="text-gray-700">{L('Buyer', 'خریدار', 'مشتري')} · {placeLabel(rfq)}</strong>
                  {/* UX-152: how far, and a seriousness hint (only from 1 completed deal; never a «new» tag) */}
                  {Number(rfq.distance_band_km) > 0 && <div className="text-[12px] text-gray-600 mt-0.5">{L(`About ${Number(rfq.distance_band_km)} km from your nearest branch`, `آپ کی قریب ترین برانچ سے تقریباً ${Number(rfq.distance_band_km)} کلومیٹر`, `على بُعد نحو ${Number(rfq.distance_band_km)} كم من أقرب فروعك`)}</div>}
                  {Number(rfq.buyer_completed_deals) >= 1 && <div className="text-[12px] text-gray-600 mt-0.5">{L(`A buyer who completed ${Number(rfq.buyer_completed_deals)} deal${Number(rfq.buyer_completed_deals) === 1 ? '' : 's'} on the platform`, `خریدار جس نے پلیٹ فارم پر ${Number(rfq.buyer_completed_deals)} سودے مکمل کیے`, `مشتري أتمّ ${arCount(Number(rfq.buyer_completed_deals), 'صفقة واحدة', 'صفقتين', 'صفقات', 'صفقة')} على المنصّة`)}</div>}
                  <div className="text-[12px] text-gray-500 mt-0.5"><Glyph e="🔒" /> {L('The buyer identity appears once the buyer chooses your offer.', 'خریدار کے آپ کی آفر چننے پر اس کی شناخت ظاہر ہو گی۔', 'تظهر هوية المشتري بعد أن يختار عرضك.')}</div>
                  </>)}
                </>
              )}
            </div>
            {rfq.specification && (!Array.isArray(rfq.items) || rfq.items.length <= 1) && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="⚙" /> {T.spec}</span><br/><strong>{rfq.specification}</strong></div>}
            {cleanNotes && <div className="bg-[#f4f6f9] rounded-lg p-3 col-span-2"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="📝" /> {T.notes}</span><br/><AutoTr text={cleanNotes} locale={locale} /></div>}
            <div className="bg-[#f4f6f9] rounded-lg p-3"><span className="text-gray-500 text-[12px] font-semibold"><Glyph e="🗓" /> {L('Posted', 'درخواست کی تاریخ', 'تاريخ الطلب')}</span><br/><strong className="text-sm">{formatDateTime(rfq.created_at)}</strong></div>
            {rfq.expires_at && (
              <div className="rounded-lg p-3" style={{ background: urgencyStyle(deadlineUrgency(rfq.expires_at)).bg, border: `1px solid ${urgencyStyle(deadlineUrgency(rfq.expires_at)).border}` }}>
                <span className="text-gray-500 text-[12px] font-semibold"><Glyph e="⏰" /> {L('Pricing deadline', 'قیمت دینے کی آخری تاریخ', 'مهلة التسعير')}</span><br/>
                <strong className="text-sm" style={{ color: urgencyStyle(deadlineUrgency(rfq.expires_at)).fg }}>{formatDateTime(rfq.expires_at)}</strong>
                <span className="text-xs block font-bold" style={{ color: urgencyStyle(deadlineUrgency(rfq.expires_at)).fg }}>{expired ? '' : `(${formatTimeLeft(rfq.expires_at, locale)})`}</span>
              </div>
            )}
          </div>
          {/* ملف المواصفات المرفق */}
          {specFileUrl && (
            <a href={fileHref(specFileUrl)} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 bg-[#D4A543]/5 border border-[#D4A543]/40 rounded-xl p-3 hover:bg-[#D4A543]/10 transition-all">
              <span className="text-xl"><Glyph e="📎" /></span>
              <span className="text-sm font-semibold text-[#8F6820] flex-1">{T.attachedFile}</span>
              <span className="text-xs text-[#8F6820]">{T.viewFile} <span aria-hidden="true">{FWD}</span></span>
            </a>
          )}
          </div>
          {pricingOpen && (isMultiItem ? myItems.length > 0 : true) && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold" style={{ color: '#0B2438' }}><Glyph e="🧾" /> {L('Your offer', 'آپ کی آفر', 'عرضك')}</h3>
                {isMultiItem && <span className="text-xs font-bold" style={{ color: pricedCount ? '#0F6E56' : '#5B6B7C' }}>{L(`${pricedCount} of ${myItems.length} priced`, `${myItems.length} میں سے ${pricedCount}`, `سعّرت ${pricedCount} من ${myItems.length}`)}</span>}
              </div>
              {rfq.delivery_required && (
              <div id="deliv-cost" className="border-t border-gray-100 pt-4">
                  <div>
                    <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}><Glyph e="🚚" /> {L('Delivery cost', 'ڈیلیوری کی لاگت', 'تكلفة التوصيل')} <span className="text-red-500">*</span></div>
                    <div role="radiogroup" aria-label={L('Delivery cost', 'ڈیلیوری کی لاگت', 'تكلفة التوصيل')} className="flex flex-wrap gap-2">
                      {([['included', L('Delivery included in the price', 'ڈیلیوری قیمت میں شامل', 'التوصيل مشمول في السعر')], ['amount', L('Extra amount for delivery', 'ڈیلیوری کی اضافی رقم', 'مبلغ إضافي للتوصيل')]] as const).map(([k, label]) => {
                        const on = k === 'included' ? (delivMode === 'included' || delivMode === 'free') : delivMode === k
                        return (
                          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setDelivMode(k)} className={chip(on)}>{on && <Check className="w-4 h-4" aria-hidden />}{label}</button>
                        )
                      })}
                      {delivMode === 'amount' && (
                        <input type="text" inputMode="decimal" value={delivAmount} onChange={(e: any) => setDelivAmount(latinNum(e.target.value))}
                          className="input-field text-base sm:text-sm w-32" placeholder={L('SAR', 'ریال', 'ر.س')} aria-label={L('Delivery amount', 'ڈیلیوری رقم', 'مبلغ التوصيل')} />
                      )}
                    </div>
                  </div>
              </div>
              )}
              {/* UX-113: one delivery time for every material (a per-material time in «Details» still wins) */}
              <div id="delivery-time" className="border-t border-gray-100 pt-4">
                <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}><Glyph e="⏱" /> {isMultiItem ? L('Delivery time for all materials', 'تمام مال کی ڈیلیوری کا وقت', 'مدة التوصيل لكل المواد') : L('Delivery time', 'ڈیلیوری کا وقت', 'مدة التوصيل')}{maxDaysAsked > 0 && <span className="text-red-500"> *</span>}</div>
                {maxDaysAsked > 0 && (
                  <p className="mb-2 text-[13px] font-semibold rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-800">
                    <Glyph e="⚠" /> {L(`The buyer asked for delivery within ${daysText(maxDaysAsked, 'en')} at most.`, `خریدار نے زیادہ سے زیادہ ${daysText(maxDaysAsked, 'ur')} میں ڈیلیوری مانگی ہے۔`, `طلب المشتري التوصيل خلال ${daysText(maxDaysAsked, 'ar')} كحدٍّ أقصى.`)}
                  </p>
                )}
                <div role="radiogroup" aria-label={L('Delivery time', 'ڈیلیوری کا وقت', 'مدة التوصيل')} className="flex flex-wrap gap-2">
                  {([['1', L('Within a day', 'ایک دن میں', 'خلال يوم')], ['2', L('Within 2 days', '2 دن میں', 'خلال يومين')], ['3', L('Within 3 days', '3 دن میں', 'خلال 3 أيام')], ['7', L('Within a week', 'ایک ہفتے میں', 'خلال أسبوع')]] as const).map(([v, label]) => {
                    const on = allDaysOther ? false : (isMultiItem ? allDays : (deliveryDays || allDays)) === v
                    return <button key={v} type="button" role="radio" aria-checked={on} onClick={() => { setAllDaysOther(false); setAllDays(v); if (!isMultiItem) setDeliveryDays(v) }} className={chip(on)}>{on && <Check className="w-4 h-4" aria-hidden />}{label}</button>
                  })}
                  <button type="button" role="radio" aria-checked={allDaysOther} onClick={() => setAllDaysOther(true)} className={chip(allDaysOther)}>{allDaysOther && <Check className="w-4 h-4" aria-hidden />}{L('Other', 'دیگر', 'أخرى')}</button>
                  {allDaysOther && (
                    <input type="text" inputMode="numeric" autoFocus value={isMultiItem ? allDays : (deliveryDays || allDays)} onChange={(e: any) => { const v = latinNum(e.target.value).replace(/\D/g, ''); setAllDays(v); if (!isMultiItem) setDeliveryDays(v) }}
                      className="input-field text-base sm:text-sm w-28" placeholder={L('Days', 'دن', 'عدد الأيام')} aria-label={L('Delivery time in days', 'ڈیلیوری کا وقت (دن)', 'مدة التوصيل بالأيام')} />
                  )}
                </div>
                {maxDaysAsked > 0 && offeredDays() > maxDaysAsked && (
                  <p className="mt-2 text-[13px] font-semibold rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-900">
                    {L(`Your time is longer than the buyer asked for (${daysText(maxDaysAsked, 'en')}), which may lower the chance of your offer being chosen.`, `آپ کا وقت خریدار کے مانگے ہوئے وقت (${daysText(maxDaysAsked, 'ur')}) سے زیادہ ہے، اس سے آپ کی آفر چنے جانے کا امکان کم ہو سکتا ہے۔`, `مدتك أطول مما طلبه المشتري (${daysText(maxDaysAsked, 'ar')})، وقد يقلّل ذلك فرصة اختيار عرضك.`)}
                  </p>
                )}
                {isMultiItem && <p className="text-[12px] text-gray-500 mt-1">{L('A different time for one material can be set in its «Details».', 'کسی ایک مال کا الگ وقت اس کی «تفصیلات» میں دیں۔', 'يمكنك تحديد مدة مختلفة لمادة معيّنة من «التفاصيل» في بطاقتها.')}</p>}
              </div>
              {/* UX-113: take every remembered price in one tap */}
              {prevCount > 0 && (
                <button type="button" onClick={takeAllPrev} className="w-full min-h-[44px] rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>
                  {L(`Use your previous prices (${prevCount} material${prevCount === 1 ? '' : 's'})`, `اپنی پچھلی قیمتیں استعمال کریں (${prevCount} اشیاء)`, `استخدم أسعارك السابقة (${arCount(prevCount, 'مادة واحدة', 'مادتان', 'مواد', 'مادة')})`)}
                </button>
              )}
              {/* UX-112: availability is an explicit, required choice */}
              <div id="availability" className="border-t border-gray-100 pt-4">
                <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>{L('Availability of the materials', 'مال کی دستیابی', 'توفّر المواد')} <span className="text-red-500">*</span></div>
                <div role="radiogroup" aria-label={L('Availability', 'دستیابی', 'التوفّر')} className="flex flex-wrap gap-2">
                  {AVAILABILITY.map(o => (
                    <button type="button" key={o.k} role="radio" aria-checked={availability === o.k} onClick={() => setAvailability(o.k)} className={chip(availability === o.k)}>
                      {availability === o.k ? <Check className="w-4 h-4" aria-hidden /> : <SellerIcon name={o.icon} />} {locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}
                    </button>
                  ))}
                </div>
              </div>
              {/* price source: a pricing agent must answer; a company sees its default with «تغيير» (UX-112) */}
              <div className="border-t border-gray-100 pt-4">
                {!isIndependent && !showSourcePick ? (
                  <div id="price-source" className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-700">{L('Price source', 'قیمت کا ذریعہ', 'مصدر السعر')}: <b className="text-[#0B2438]">{SOURCE_TYPES.find(o => o.k === sourceType) ? (locale === 'en' ? SOURCE_TYPES.find(o => o.k === sourceType)!.en : locale === 'ur' ? SOURCE_TYPES.find(o => o.k === sourceType)!.ur : SOURCE_TYPES.find(o => o.k === sourceType)!.ar) : '—'}</b></span>
                    <button type="button" onClick={() => setShowSourcePick(true)} className="min-h-[44px] px-3 text-sm font-bold text-[#8F6820] hover:underline">{L('Change', 'تبدیل کریں', 'تغيير')}</button>
                  </div>
                ) : (
                <div>
                  <div id="price-source" className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>
                    {L('Where does this price come from?', 'یہ قیمت کہاں سے ہے؟', 'من أين هذا السعر؟')} <span className="text-red-500">*</span>
                  </div>
                  <div role="radiogroup" aria-label={L('Price source', 'قیمت کا ذریعہ', 'مصدر السعر')} className="flex flex-wrap gap-2">
                    {sourceTypesFor(isIndependent).map(o => (
                      <button type="button" key={o.k} role="radio" aria-checked={sourceType === o.k} onClick={() => setSourceType(o.k)} className={chip(sourceType === o.k)}>
                        {sourceType === o.k ? <Check className="w-4 h-4" aria-hidden /> : <SellerIcon name={o.icon} />} {locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar}
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-gray-500 mt-1">{L('The buyer sees this. A price you collected from someone else is shown as such, never as a direct quote.', 'خریدار یہ دیکھتا ہے۔ جو قیمت آپ کسی اور سے لے کر دیتے ہیں وہ اسی طرح دکھائی جاتی ہے، براہ راست آفر کے طور پر نہیں۔', 'يظهر هذا للمشتري. السعر الذي تنقله من جهة أخرى يُعرض كذلك، ولا يُعرض كعرض مباشر.')}</p>
                  {isIndependent && <SourceShopFields value={src} onChange={setSrc} locale={locale} />}
                </div>
                )}
              </div>
              {/* the total as the buyer will see it (the VAT basis is chosen at the top of the form) */}
              {(() => {
                const { entered, net, vat, gross } = offerTotals()
                const fmt = (n: any) => (+n.toFixed(2)).toLocaleString('en-US')
                if (!(entered > 0)) return null
                return noVat ? (
                  <div className="bg-[#0B2438]/5 border border-[#0B2438]/15 rounded-xl p-3 text-sm flex items-center justify-between">
                    <span className="font-bold text-[#0B2438]">{L('Total', 'کل رقم', 'الإجمالي')}</span>
                    <span className="text-lg font-extrabold text-[#0B2438]">{fmt(entered)} {SAR}</span>
                  </div>
                ) : vatIncluded !== null ? (
                  <div className="bg-[#0B2438]/5 border border-[#0B2438]/15 rounded-xl p-3 text-sm space-y-1.5">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>{L('Net (before VAT)', 'خالص (ٹیکس سے پہلے)', 'الصافي (قبل الضريبة)')}</span>
                      <span className="font-semibold">{fmt(net)} {SAR}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>{L('VAT 15%', 'ویٹ (VAT) 15%', 'ضريبة القيمة المضافة 15%')}</span>
                      <span className="font-semibold">+ {fmt(vat)} {SAR}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#0B2438]/15 pt-1.5">
                      <span className="font-bold text-[#0B2438]">{L('Grand total (incl. 15% VAT)', 'کل رقم (15% VAT سمیت)', 'الإجمالي (يشمل ضريبة القيمة المضافة 15%)')}</span>
                      <span className="text-lg font-extrabold text-[#0B2438]">{fmt(gross)} {SAR}</span>
                    </div>
                  </div>
                ) : null
              })()}
              {/* everything optional folds away (persona review: about 30 controls on one phone screen) */}
              <div className="border-t border-gray-100 pt-3">
                <button type="button" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}
                  className="w-full min-h-[44px] flex items-center justify-between gap-2 text-sm font-bold py-2" style={{ color: '#0B2438' }}>
                  <span>{L('More options (optional)', 'مزید اختیارات (اختیاری)', 'خيارات أخرى (اختياري)')}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">{!showMore && L('payment, other charges, price validity, notes', 'ادائیگی، دیگر رقوم، قیمت کی مدت، نوٹس', 'الدفع، مبالغ أخرى، مدة السعر، ملاحظات')}{showMore ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}</span>
                </button>
                {showMore && (
                <div className="space-y-4 pt-2">
                {/* شروط الدفع (اختياري) — تظهر للمشتري على العرض وأمر الشراء */}
                <div>
                  <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}><Glyph e="💳" /> {L('Payment terms (optional)', 'ادائیگی کی شرائط (اختیاری)', 'شروط الدفع (اختياري)')}</div>
                  <div role="radiogroup" aria-label={L('Payment terms', 'ادائیگی کی شرائط', 'شروط الدفع')} className="flex flex-wrap gap-2">
                    {PAYMENT_TERMS.map(pt => (
                      <button key={pt.key} type="button" role="radio" aria-checked={payTerms === pt.key} onClick={() => setPayTerms(payTerms === pt.key ? null : pt.key)} className={chip(payTerms === pt.key)}>
                        {payTerms === pt.key && <Check className="w-4 h-4" aria-hidden />}{locale === 'en' ? pt.en : locale === 'ur' ? pt.ur : pt.ar}
                      </button>
                    ))}
                  </div>
                </div>
                <div id="other-charges">
                <div className="text-sm font-bold mb-1" style={{ color: '#0B2438' }}>{L('Other charges (loading fees…)', 'دیگر چارجز (لوڈنگ فیس…)', 'مبالغ أخرى (رسوم تحميل…)')}</div>
                <p className="text-[12px] text-gray-500 mb-2">{L('The installation price is entered in each material\'s card, not here.', 'تنصیب کی قیمت ہر مال کے کارڈ میں درج ہوتی ہے، یہاں نہیں۔', 'سعر التركيب يُدخَل في بطاقة كل مادة، لا هنا.')}</p>
                <div className="space-y-2">
                  {extras.map((ex: any, i: any) => (
                    <div key={i} className="flex gap-2">
                      <input value={ex.label} onChange={(e: any) => updateExtra(i, 'label', e.target.value)} aria-label={L('Charge name', 'رقم کا نام', 'اسم المبلغ')}
                        className="input-field text-base sm:text-sm flex-1" placeholder={L('Item (e.g. loading fees)', 'آئٹم (مثلاً لوڈنگ فیس)', 'البند (مثال: رسوم تحميل)')} />
                      <input type="text" inputMode="decimal" value={ex.amount} onChange={(e: any) => updateExtra(i, 'amount', latinNum(e.target.value))} aria-label={L('Amount', 'رقم', 'المبلغ')}
                        className="input-field text-base sm:text-sm w-24" placeholder={L('Amount', 'رقم', 'المبلغ')} min="0" step="any" />
                      {extras.length > 1 && (
                        <button type="button" onClick={() => removeExtra(i)} aria-label={L('Remove', 'ہٹائیں', 'إزالة')}
                          className="w-11 min-h-[44px] grid place-items-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 shrink-0"><X className="w-4 h-4" aria-hidden /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addExtra} className="mt-2 min-h-[44px] text-sm font-semibold" style={{ color: '#8F6820' }}>
                  + {L('Add item', 'شامل کریں', 'إضافة بند')}
                </button>
                </div>
              <div>
                <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}><Glyph e="⏱" /> {L('Price valid for', 'قیمت کتنی دیر کے لیے درست ہے', 'مدة صلاحية السعر')}</div>
                <div role="radiogroup" aria-label={L('Price valid for', 'قیمت کی مدت', 'مدة صلاحية السعر')} className="flex flex-wrap gap-2">
                  {[{ v: '1', l: L('24h', '24 گھنٹے', '24 ساعة') }, { v: '3', l: L('3 days', '3 دن', '3 أيام') }, { v: '7', l: L('1 week', '1 ہفتہ', 'أسبوع') }, { v: '30', l: L('1 month', '1 مہینہ', 'شهر') }].map((o) => (
                    <button type="button" key={o.v} role="radio" aria-checked={priceValidity === o.v} onClick={() => setPriceValidity(o.v)} className={chip(priceValidity === o.v)}>{priceValidity === o.v && <Check className="w-4 h-4" aria-hidden />}{o.l}</button>
                  ))}
                </div>
                <p className="text-[12px] text-gray-500 mt-1">{L('You commit to this price until the period ends — suited to materials whose price changes (e.g. steel).', 'آپ کی قیمت مدت ختم ہونے تک پکی رہے گی — ان چیزوں کے لیے اچھا ہے جن کی قیمت بدلتی رہتی ہے (جیسے سریا)۔', 'تلتزم بهذا السعر حتى انتهاء المدة، وهذا مناسب للمواد المتغيّرة السعر (كالحديد).')}</p>
              </div>
              <div>
                <label htmlFor="offer-notes" className="block text-xs font-bold text-gray-600 mb-1.5">{T.offerNotes}</label>
                <textarea id="offer-notes" value={notes} onChange={(e: any) => setNotes(e.target.value)}
                  className="input-field text-base sm:text-sm" rows={3} />
              </div>
                </div>
                )}
              </div>
            {(() => {
              // سبب تعطيل زر الإرسال يظهر صراحةً، وملخّص ما سيراه المشتري قبل الإرسال
              const block = sendBlockReason()
              const { gross } = offerTotals()
              const fmtG = (+gross.toFixed(2)).toLocaleString('en-US')
              return (
            <div className="mt-5 space-y-3">
              {!block && gross > 0 && (
                <div className="rounded-xl px-3 py-2.5 text-sm font-bold text-center border bg-[#0B2438]/5 border-[#0B2438]/15 text-[#0B2438]" aria-live="polite">
                  {/* UX-110: the same wording the buyer reads on the offer */}
                  {noVat
                    ? L(`The buyer will see: ${fmtG} SAR (final price, no VAT is added)`, `خریدار دیکھے گا: ${fmtG} ریال (حتمی قیمت، کوئی ٹیکس شامل نہیں ہوگا)`, `سيرى المشتري: ${fmtG} ر.س (سعر نهائي، لا تُضاف إليه ضريبة)`)
                    : L(`The buyer will see: ${fmtG} SAR incl. 15% VAT`, `خریدار دیکھے گا: ${fmtG} ریال (15% VAT سمیت)`, `سيرى المشتري: ${fmtG} ر.س (يشمل ضريبة القيمة المضافة 15%)`)}
                </div>
              )}
              <button type="submit" form="offer-form" disabled={submitting || !!block} aria-describedby={block ? 'offer-block-reason' : undefined}
                className="w-full min-h-[48px] py-3.5 rounded-xl font-extrabold text-[#071827] text-base disabled:opacity-40 transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {submitting ? T.sending : T.send}
              </button>
              {block && !submitting && (
                <button type="button" id="offer-block-reason" onClick={() => goToField(block.target)} className="flex items-start justify-center gap-1.5 w-full min-h-[44px] text-[13px] text-center font-bold text-amber-800 underline underline-offset-2" aria-live="polite"><Glyph e="⚠" /> <span>{block.text}</span></button>
              )}
              {error && <p role="alert" className="text-[13px] text-center font-semibold text-red-600">{error}</p>}
              <p className="text-[12px] text-center text-gray-500">{L('You can edit your offer within 15 minutes of sending; your prices and details stay as they are.', 'بھیجنے کے 15 منٹ تک آپ اپنی آفر بدل سکتے ہیں؛ آپ کی قیمتیں اور تفصیلات ویسی ہی رہیں گی۔', 'يمكنك تعديل عرضك خلال 15 دقيقة من إرساله، وتبقى أسعارك وتفاصيلك كما هي.')}</p>
              <button type="button" onClick={() => setShowDismiss(true)}
                className="w-full min-h-[44px] py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline">
                {T.dismiss}
              </button>
            </div>
              )
            })()}
            </div>
          )}
        </aside>
      </div>

      {/* phone: the send bar stays above the bottom menu (persona review: the button was under every card) */}
      {pricingOpen && !success && (isMultiItem ? myItems.length > 0 : true) && (() => {
        const block = sendBlockReason(); const { gross } = offerTotals()
        return (<>
          <div className="lg:hidden h-24" aria-hidden />
          <div className="lg:hidden fixed inset-x-0 z-30 px-3 pb-2" style={{ bottom: 'calc(3.9rem + env(safe-area-inset-bottom))' }}>
            <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0 text-[13px] leading-tight">
                {isMultiItem && <div className="font-bold" style={{ color: pricedCount ? '#0F6E56' : '#5B6B7C' }}>{L(`${pricedCount} of ${myItems.length} priced`, `${myItems.length} میں سے ${pricedCount}`, `سعّرت ${pricedCount} من ${myItems.length}`)}</div>}
                {error && !submitting ? <div role="alert" className="text-red-600 font-semibold line-clamp-2">{error}</div>
                  : block ? <button type="button" onClick={() => goToField(block.target)} className="block max-w-full text-start text-amber-800 font-bold line-clamp-2 underline underline-offset-2">{block.text}</button>
                  : <div className="font-extrabold text-[14px]" style={{ color: '#0B2438' }}>{(+gross.toFixed(2)).toLocaleString('en-US')} {SAR}</div>}
              </div>
              <button type="submit" form="offer-form" disabled={submitting || !!block}
                className="shrink-0 min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] text-sm disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {submitting ? T.sending : T.send}
              </button>
            </div>
          </div>
        </>)
      })()}

      {/* Dismiss Modal */}
      {showDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={dir} onClick={() => { setShowDismiss(false); setDismissError('') }} onKeyDown={(e: any) => { if (e.key === 'Escape') { setShowDismiss(false); setDismissError('') } }}>
          <div role="dialog" aria-modal="true" aria-labelledby="dismiss-title" onClick={(e: any) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="text-4xl text-center mb-3 text-gray-500"><Glyph e="📭" /></div>
            <h3 id="dismiss-title" className="text-lg font-bold text-center mb-1" style={{ color: '#0B2438' }}>{T.dismissTitle}</h3>
            <p className="text-sm text-gray-500 text-center mb-4">{T.dismissSub}</p>
            {/* round-2 UX-091: a team member hides it for the whole company */}
            {isMember && (
              <p className="text-[13px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">{L('This request will disappear from your whole company’s list, for the account owner and every colleague.', 'یہ درخواست آپ کی پوری کمپنی کی فہرست سے ہٹ جائے گی، اکاؤنٹ کے مالک اور تمام ساتھیوں کے لیے۔', 'سيختفي هذا الطلب من قائمة شركتك كلها، لدى مالك الحساب وجميع الزملاء.')}</p>
            )}
            {/* UX-148: quick reasons */}
            <div className="flex flex-wrap gap-2 mb-2" role="group" aria-label={T.dismissReason}>
              {[
                L('I do not have these materials', 'یہ مال میرے پاس دستیاب نہیں', 'المواد غير متوفرة لدي'),
                L('The location is outside my delivery area', 'مقام میرے ڈیلیوری علاقے سے باہر ہے', 'الموقع بعيد عن نطاق توصيلي'),
                L('The quantity is small', 'مقدار کم ہے', 'الكمية صغيرة'),
                L('Outside my specialty', 'میری مہارت سے باہر', 'خارج تخصصي'),
                L('The deadline is short', 'مہلت کم ہے', 'المهلة قصيرة'),
              ].map((r) => (
                <button key={r} type="button" aria-pressed={dismissReason === r} onClick={() => setDismissReason(dismissReason === r ? '' : r)} className={chip(dismissReason === r)}>{dismissReason === r && <Check className="w-4 h-4" aria-hidden />}{r}</button>
              ))}
            </div>
            <label htmlFor="dismiss-reason" className="block text-[13px] font-bold text-gray-700 mb-1">{T.dismissReason}</label>
            <textarea id="dismiss-reason" value={dismissReason} onChange={(e: any) => setDismissReason(e.target.value)}
              className="input-field text-base sm:text-sm mb-4" rows={2} />
            {dismissError && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 mb-3">{dismissError}</p>}
            <div className="flex gap-3">
              <button onClick={handleDismiss} disabled={dismissing}
                className="flex-1 min-h-[44px] py-3 rounded-xl font-bold text-white text-sm bg-[#0B2438] hover:opacity-90 transition-all disabled:opacity-60">
                {T.confirmDismiss}
              </button>
              <button onClick={() => { setShowDismiss(false); setDismissError('') }}
                className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">
                {T.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
