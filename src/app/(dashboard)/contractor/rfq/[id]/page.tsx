'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { friendlyError } from '@/lib/friendlyError'
import AutoTr from '@/components/shared/AutoTr'
import PageLoader from '@/components/shared/PageLoader'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, UNIT_OPTIONS, getProductLabel, getUnitLabelLong, detectSubCategory } from '@/types'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { useTranslation } from '@/i18n'
import { waLink } from '@/lib/wa'
import { offerComparable, lineComparable, vatTag, showsVatBreakdown, totalLabel, priceBasisLabel, sarLabel, buyerLinePrice, preVatNote } from '@/lib/vat'
import EnablePush from '@/components/shared/EnablePush'
import { installTotalOf } from '@/lib/installation'
import { fileHref } from '@/lib/fileHref'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { formatDateTime, formatTimeLeft, deadlineUrgency, urgencyStyle, isExpired, rfqPurgeInfo } from '@/lib/deadline'
import { supplierScore, approvalLabel } from '@/lib/supplierScore'
import { dealStage, rfqStatusLabel } from '@/lib/dealStage'
import { TIERS, tierLabel, normTier, sourceLabel, availabilityLabel, isDirectSource, sourceIcon, availabilityIcon, tierIcon } from '@/lib/sellers'
import { rfqRefLine, rfqDesc, rfqRef } from '@/lib/rfqName'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { daysText, arCount } from '@/lib/text'
import { toLatinDigits as toLatinNumber } from '@/lib/phone'
import { paymentTermsLabel } from '@/lib/paymentTerms'
import { realtimeTopic } from '@/lib/realtimeTopic'
import { loadOwnerBudgets, saveRfqBudgets, parseBudget, preVatUnit, overBudget, type ItemBudget } from '@/lib/budget'
import BudgetField from '@/components/rfq/BudgetField'
import { SourceShopBadge } from '@/components/rfq/SourceShop'
import { dbMessage } from '@/lib/dbMessage'
import { useEnsureVerified } from '@/components/shared/VerifyGate'
import { askConfirm } from '@/lib/askConfirm'
import { storedBuyerType } from '@/lib/buyerType'
import { cleanArName } from '@/lib/displayName'

const SECTOR_I18N: Record<string, Record<string, string>> = {
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
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
  const ensureVerified = useEnsureVerified()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  // non-direct price: one phrase, not two labels side by side (owner read them as contradicting; app parity)
  // UX-138: «مصدر البضاعة: …» everywhere (was «سعر منقول», not understood)
  const srcPhrase = (k: any) => L(`Goods source: ${sourceLabel(k, locale)}`, `سامان کا ماخذ: ${sourceLabel(k, locale)}`, `مصدر البضاعة: ${sourceLabel(k, locale)}`)
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'
  const SAR = sarLabel(locale) // UX-140: one currency name per language
  const secLabel = (k: string) => (locale !== 'ar' && SECTOR_I18N[locale]?.[k]) || (SECTOR_LABELS as any)[k] || k
  // a home buyer («لبيتي»): plain words, long unit names, clean Arabic names, no sector chips
  const [home, setHome] = useState(false)
  useEffect(() => { setHome(storedBuyerType() === 'individual') }, [])
  const pname = (n: string) => (home && locale === 'ar' ? cleanArName(n || '') : getProductLabel(n || '', locale))
  const unitL = (u: string) => getUnitLabelLong(u, locale)
  const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
  const money2 = (n: number) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
  const BACKOUT = { cancelLabel: L('Go back', 'واپس', 'تراجع') }
  // inline messages instead of the browser alert (UX-149)
  const [toast, setToast] = useState<{ t: string; tone: 'err' | 'info' } | null>(null)
  const toastTimer = useRef<any>(null)
  const notify = (t: string, tone: 'err' | 'info' = 'err') => {
    setToast({ t, tone })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), tone === 'info' ? 6000 : 9000) // UX-050: info 6 s
  }
  // UX-168: a new offer that is now the cheapest is announced with a «اعرضه» button
  const [cheapNote, setCheapNote] = useState<{ t: string; offerId: string } | null>(null)
  // UX-051: the source shop's area of each pricing agent's offer, fetched once per offer for the matrix rows
  const [sources, setSources] = useState<Record<string, any>>({})
  const sourceAsked = useRef<Set<string>>(new Set())
  const [justFinalized, setJustFinalized] = useState(false) // «تمّ، وهذا ما يحدث بعد ذلك» (UX-017)
  const seenOfferIds = useRef<Set<string> | null>(null)
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set()) // a live offer gets a gold frame for 4 s (UX-196)
  const [rfq, setRfq] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [acceptingId, setAcceptingId] = useState<string | null>(null) // stops a double «قبول العرض»
  const FWD = dir === 'rtl' ? '←' : '→', BACK = dir === 'rtl' ? '→' : '←'
  const [sortBy, setSortBy] = useState('price_asc') // price_asc | price_desc | delivery | rating
  const [aiCmp, setAiCmp] = useState<any>(null) // نتيجة تحليل العروض بالذكاء الاصطناعي
  const [cmpLoading, setCmpLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [awardSort, setAwardSort] = useState('cheapest') // cheapest | rated | fastest | nearest — ترتيب عروض كل مادة
  // owner 2026-10-31: the buyer sees the best 3 offers (by the chosen order); «عرض كل العروض» shows the rest
  const TOP_N = 3
  const [showAllOffers, setShowAllOffers] = useState(false)
  const [offerMore, setOfferMore] = useState<Record<string, boolean>>({})
  const [allBidsFor, setAllBidsFor] = useState<Record<number, boolean>>({})
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [tierFilter, setTierFilter] = useState('') // '' | company | shop | independent
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)            // bumped when a new offer arrives (live)
  const [liveNote, setLiveNote] = useState('')
  // How far the request reached: suppliers per item (counts only, from get_rfq_coverage).
  const [coverage, setCoverage] = useState<any>(null)
  const [moreBusy, setMoreBusy] = useState(false) // «ابحث عن موردين آخرين»
  const [moreMsg, setMoreMsg] = useState('')
  useEffect(() => {
    if (!id) return
    createClient().rpc('get_rfq_coverage', { p_rfq: id }).then(({ data }: any) => setCoverage(data || null), () => {})
  }, [id])
  const [editing, setEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [marketAvg, setMarketAvg] = useState<any>(null) // متوسط السوق
  const [supplierStats, setSupplierStats] = useState<any>({}) // سجل أداء كل مورد
  const [awards, setAwards] = useState<any>({}) // ترسية بند-بند: item_index → صف الترسية
  const [budgets, setBudgets] = useState<Record<number, ItemBudget>>({}) // R23: buyer budget per unit (before VAT), owner-only
  const [budgetEdit, setBudgetEdit] = useState<{ idx: number; v: string; vis: boolean } | null>(null)
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [savings, setSavings] = useState<{ saved: number; items: number } | null>(null) // «وفّرت X ريال» vs the highest quote per item (210)
  const loadSavings = async () => {
    const { data } = await createClient().rpc('rfq_item_savings', { p_rfq_id: id })
    const rows = (data || []) as any[]
    setSavings({ saved: rows.reduce((t, r) => t + (Number(r.saved) || 0), 0), items: rows.filter((r) => Number(r.saved) > 0).length })
  }
  const [awardedContacts, setAwardedContacts] = useState<any>({}) // supplier_id → رقم تواصل (يُكشف بعد الترسية فقط)

  async function reloadAwards() {
    const supabase = createClient()
    const { data } = await supabase.from('rfq_item_awards').select('*').eq('rfq_id', id)
    const am: any = {}; (data || []).forEach((a: any) => { am[a.item_index] = a }); setAwards(am)
    loadSavings()
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
    if (!(await askConfirm(L('Delete this request permanently? Its offers will be deleted too, and it leaves your history.', 'یہ درخواست ہمیشہ کے لیے حذف کریں؟ اس کی آفرز بھی حذف ہو جائیں گی اور یہ آپ کے ریکارڈ سے ہٹ جائے گی۔', 'حذف هذا الطلب نهائياً؟ ستُحذف عروضه أيضاً، ولن يبقى في سجلك.'), { danger: true, okLabel: L('Yes, delete the request', 'ہاں، درخواست حذف کریں', 'نعم، احذف الطلب'), ...BACKOUT }))) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('delete_rfq', { p_rfq_id: id })
    // the deal message only when there really is a deal; anything else is a plain retry message (as in the app)
    if (error) { notify(/صفقة|deal/i.test(error.message || '') ? dbMessage(error, error.message) : L('Could not delete the request. Please try again.', 'درخواست حذف نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر حذف الطلب، حاول مرة أخرى.')); setDeleting(false); return }
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
    if (error) { notify(friendlyError(error.message, L('Could not extend the deadline. Please try again.', 'مہلت نہیں بڑھائی جا سکی۔ دوبارہ کوشش کریں۔', 'تعذّر تمديد المهلة. حاول مرة أخرى.'), locale)); return }
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
        // متوسط السوق: get_market_prices (accepted deals, ≥3 samples) — the offers table only shows
        // the buyer their own offers (RLS), so reading 500 rows here gave an empty "market"
        supabase.rpc('get_market_prices'),
        // the precise delivery location lives in rfq_private (owner / admin / winning supplier only, H2)
        supabase.from('rfq_private').select('delivery_location, delivery_geo').eq('rfq_id', id).maybeSingle(),
      ])
      const rfqData = rfqRow ? { ...rfqRow, ...(priv || {}) } : rfqRow
      setRfq(rfqData)
      // the edit fields are filled when «تعديل» opens, never here: a live offer re-runs load() and
      // must not wipe what the buyer is typing (UX-093)
      const list = offersData || []
      // a live offer: frame the new card in gold for 4 s (UX-196)
      if (seenOfferIds.current) {
        const fresh = new Set<string>(list.map((o: any) => o.id).filter((x: string) => !seenOfferIds.current!.has(x)))
        if (fresh.size) {
          setFreshIds(fresh); setTimeout(() => setFreshIds(new Set()), 4000)
          // UX-168: the new offer is now the cheapest (whole-offer basis, still in play)
          const live = list.filter((o: any) => o.status !== 'rejected')
          if (live.length > 1) {
            const cheapest = live.reduce((a: any, b: any) => (offerComparable(b) < offerComparable(a) ? b : a))
            if (fresh.has(cheapest.id)) {
              const amt = Math.round(offerComparable(cheapest)).toLocaleString('en-US')
              setCheapNote({ offerId: cheapest.id, t: L(`A new offer arrived and it is now the lowest: ${amt} SAR`, `نئی آفر آئی ہے اور اب یہ سب سے کم ہے: ${amt} ریال`, `وصل عرض جديد، وهو الآن الأقل سعراً: ${amt} ر.س`) })
            }
          }
        }
      }
      // UX-051: one source lookup per pricing agent's offer (the matrix rows reuse it)
      list.filter((o: any) => normTier(o.supplier?.supplier_tier) === 'independent' && !sourceAsked.current.has(o.id)).forEach((o: any) => {
        sourceAsked.current.add(o.id)
        supabase.rpc('get_offer_source', { p_offer_id: o.id }).then(({ data }: any) => { if (data) setSources(m => ({ ...m, [o.id]: data })) }, () => {})
      })
      seenOfferIds.current = new Set(list.map((o: any) => o.id))
      // UX-066: the buyer home counts only offers not seen yet (same key as contractor/page.tsx)
      try { const k = 'tsk_seen_offers_v1'; const v = JSON.parse(localStorage.getItem(k) || '{}') || {}; v[id as string] = list.length; localStorage.setItem(k, JSON.stringify(v)) } catch {}
      setOffers(list)
      const am: any = {}; (awardRows || []).forEach((a: any) => { am[a.item_index] = a }); setAwards(am)
      loadOwnerBudgets(supabase, id as string).then(setBudgets)
      if ((awardRows || []).length) loadSavings()
      if (rfqData) {
        // UX-080: the market sample needs 3 different suppliers when the RPC says how many (server
        // side normalises to before-VAT); the buyer compares each offer's before-VAT unit price with it
        const mp = ((similarOffers as any[]) || []).find((m: any) => m.product_name === rfqData.product_name && (!m.unit || m.unit === rfqData.unit))
        const enough = !mp || mp.supplier_count == null || Number(mp.supplier_count) >= 3
        if (mp && enough && Number(mp.avg_price) > 0) setMarketAvg(Math.round(Number(mp.avg_price)))
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
      ch = supabase.channel(realtimeTopic(`rfq-live-${id}-${session.user.id}`))
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

  // the sticky «تأكيد اختيار العروض» bar is on screen: the floating assistant bubble steps aside (UX-006/014)
  const stickyConfirm = !!rfq && rfq.status === 'open' && Array.isArray(rfq.items) && rfq.items.length > 1 && Object.keys(awards || {}).length > 0
  useEffect(() => {
    if (!stickyConfirm) return
    document.body.dataset.actionbar = '1'
    return () => { delete document.body.dataset.actionbar }
  }, [stickyConfirm])

  async function acceptOffer(offerId: any) {
    if (acceptingId) return
    if (!(await ensureVerified())) return
    const o = offers.find((x: any) => x.id === offerId)
    const who = o?.supplier?.company_name_ar || L('this supplier', 'اس سپلائر', 'هذا المورد')
    const total = o ? offerComparable(o).toLocaleString('en-US', { maximumFractionDigits: 0 }) : ''
    if (!(await askConfirm(L(
      `Choose the offer from ${who} for ${total} SAR (${vatTag(o, 'en')})?\nWe will tell the other suppliers and close the request, and a deal opens with this supplier.`,
      `${who} کی آفر ${total} ریال (${vatTag(o, 'ur')}) میں منتخب کریں؟\nہم باقی سپلائرز کو بتا دیں گے اور درخواست بند ہو جائے گی، اور اس سپلائر کے ساتھ ڈیل کھل جائے گی۔`,
      `اختيار عرض ${who} بمبلغ ${total} ر.س (${vatTag(o, 'ar')})؟\nسنُبلغ بقية الموردين ويُغلق الطلب، وتُفتح صفقة مع هذا المورد.`),
      { okLabel: L('Choose this offer', 'یہ آفر منتخب کریں', 'اختر هذا العرض'), ...BACKOUT }))) return
    setAcceptingId(offerId)
    let error: any = null
    try {
      const supabase = createClient()
      // Atomic: accept + reject others + close RFQ in one transaction (prevents double-accept).
      ;({ error } = await supabase.rpc('accept_offer', { p_offer_id: offerId }))
    } catch (e) { error = e }
    if (error) { setAcceptingId(null); notify(dbMessage(error, L('Could not choose the offer; it may already be chosen. Refresh the page and try again.', 'آفر منتخب نہیں ہو سکی؛ شاید پہلے ہی منتخب ہو چکی ہے۔ صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'تعذّر اختيار العرض، وقد يكون اختير مسبقاً. حدّث الصفحة وحاول مرة أخرى.'))); return }
    router.push(`/contractor/orders/${offerId}?new=1`)
  }

  async function rejectOffer(offerId: any) {
    const o = offers.find((x: any) => x.id === offerId)
    const who = o?.supplier?.company_name_ar || L('this supplier', 'اس سپلائر', 'هذا المورد')
    if (!(await askConfirm(L(`Decline the offer from ${who}? This cannot be undone.`, `${who} کی آفر رد کریں؟ یہ واپس نہیں ہو سکتا۔`, `رفض عرض ${who}؟ لا يمكن التراجع عن ذلك.`), { danger: true, okLabel: L('Yes, decline it', 'ہاں، رد کریں', 'نعم، ارفض العرض'), ...BACKOUT }))) return
    const supabase = createClient()
    const { error } = await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    if (error) { notify(L('Could not decline the offer. Please try again.', 'آفر رد نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر رفض العرض. حاول مرة أخرى.')); return }
    setOffers((prev: any[]) => prev.map((x: any) => x.id === offerId ? { ...x, status: 'rejected' } : x))
  }

  // ترسية بند-بند: ترسية مادة على مورد مُحدّد (أرخص أو من اختيار المشتري)
  const [awarding, setAwarding] = useState<any>(null)
  async function awardItem(itemIndex: any, offerId: any) {
    if (!(await ensureVerified())) return
    setAwarding(`${itemIndex}:${offerId}`)
    const supabase = createClient()
    const { error } = await supabase.rpc('award_rfq_item', { p_rfq_id: id, p_item_index: itemIndex, p_offer_id: offerId })
    setAwarding(null)
    if (error) { notify(dbMessage(error, L('Could not choose the offer. Refresh the page and try again.', 'آفر منتخب نہیں ہو سکی۔ صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'تعذّر اختيار العرض. حدّث الصفحة وحاول مرة أخرى.'))); return }
    await reloadAwards()
  }
  // R23: save one item's budget (the RPC replaces the whole list, so send all of them)
  async function saveBudget() {
    if (!budgetEdit) return
    const next: Record<number, ItemBudget> = { ...budgets }
    const typed = parseBudget(budgetEdit.v)
    // UX-052: a home buyer types what they pay (with VAT); the budget is stored before VAT as always
    const p = typed != null && home ? Math.round((typed / 1.15) * 100) / 100 : typed
    if (p == null) delete next[budgetEdit.idx]
    else next[budgetEdit.idx] = { item_index: budgetEdit.idx, budget_unit_price: p, budget_visible: budgetEdit.vis }
    setBudgetSaving(true)
    const ok = await saveRfqBudgets(createClient(), id as string, Object.values(next))
    setBudgetSaving(false)
    if (!ok) { notify(L('Could not save. Please try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ. حاول مرة أخرى.')); return }
    setBudgets(next); setBudgetEdit(null)
  }
  // the cheapest offer for one item (same matching and comparable price as the matrix below)
  function cheapestFor(it: any, idx: number, offersList: any[]) {
    const bids = offersList.map((o: any) => {
      const list = Array.isArray(o.item_prices) ? o.item_prices : []
      const entry = list.find((ip: any) => ip.item_index === idx) || (list.some((ip: any) => ip.item_index != null) ? undefined : list.find((ip: any) => ip.product_name === it.product_name && (!it.sub_category || (ip.sub_category || null) === (it.sub_category || null)))) // by name only for old offers without line numbers (two «حديد تسليح» lines must not share a price)
      return entry ? { offer: o, entry } : null
    }).filter(Boolean) as any[]
    bids.sort((a: any, b: any) => lineComparable(a.entry.total, a.offer) - lineComparable(b.entry.total, b.offer))
    // «مع التركيب»: a line that asked for installation takes the cheapest bid that includes it;
    // only when no bid includes it does it fall back to the cheapest without (fellBack)
    if (it?.with_install && bids.length) {
      const withInst = bids.find((b: any) => b.entry.install_offered === true)
      return withInst ? { ...withInst, fellBack: false } : { ...bids[0], fellBack: true }
    }
    return bids[0] || null
  }
  const extrasOf = (o: any) => (Array.isArray(o?.extra_charges) ? o.extra_charges : []).reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0)
  // The chosen offers per supplier (summary, sticky bar and the confirm dialog use the same numbers).
  // Amounts on what the buyer pays (VAT where the seller charges it). A supplier whose priced lines were
  // all chosen counts its delivery/charges in the total; otherwise those charges are pending: the
  // supplier confirms them (never higher) after the confirmation (191, UX-047).
  function choiceTotals() {
    const bySupplier: Record<string, any> = {}
    Object.values(awards || {}).forEach((a: any) => {
      if (!bySupplier[a.supplier_id]) {
        const off = offers.find((o: any) => o.id === a.offer_id)
        bySupplier[a.supplier_id] = { name: off?.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد'), phone: awardedContacts[a.supplier_id], offerId: a.offer_id, off, noVat: !!off && !showsVatBreakdown(off), vatIncluded: !!off?.vat_included, net: 0, gross: 0, count: 0 }
      }
      const line = Number(a.total) || 0
      const v = bySupplier[a.supplier_id]
      v.net += v.noVat ? line : v.vatIncluded ? line / 1.15 : line
      v.gross += v.noVat ? line : v.vatIncluded ? line : line * 1.15
      v.count += 1
    })
    const list: any[] = Object.values(bySupplier)
    for (const v of list) {
      const ex = extrasOf(v.off)
      const priced = (Array.isArray(v.off?.item_prices) ? v.off.item_prices : []).filter((e: any) => Number(e.total) > 0).length
      if (ex > 0 && v.count >= priced) {
        v.net += v.noVat ? ex : v.vatIncluded ? ex / 1.15 : ex
        v.gross += v.noVat ? ex : v.vatIncluded ? ex : ex * 1.15
        v.exIncluded = lineComparable(ex, v.off)
      } else if (ex > 0) v.exPending = lineComparable(ex, v.off)
    }
    const grand = list.reduce((s: number, v: any) => s + v.gross, 0)
    const grandNet = list.reduce((s: number, v: any) => s + v.net, 0)
    const pending = list.reduce((s: number, v: any) => s + (Number(v.exPending) || 0), 0)
    return { list, grand, grandNet, pending }
  }
  const [pickingAll, setPickingAll] = useState(false)
  const [openBid, setOpenBid] = useState<string | null>(null) // «التفاصيل» of one bid row
  async function awardCheapestAll(offersList: any[]) {
    if (!(await ensureVerified())) return
    setPickingAll(true)
    const supabase = createClient()
    const picks = (rfq?.items || []).map((it: any, idx: number) => (awards[idx] ? null : { idx, best: cheapestFor(it, idx, offersList) }))
      .filter((p: any) => p && p.best)
    const results = await Promise.all(picks.map((p: any) =>
      supabase.rpc('award_rfq_item', { p_rfq_id: id, p_item_index: p.idx, p_offer_id: p.best.offer.id })))
    const failed = results.filter((r: any) => r.error).length
    setPickingAll(false)
    await reloadAwards()
    if (failed) { const first = results.find((r: any) => r.error)?.error; notify(dbMessage(first, L('Some items could not be selected. Refresh and try again.', 'کچھ اشیاء منتخب نہ ہو سکیں۔ ریفریش کریں۔', 'تعذّر اختيار بعض المواد. حدّث الصفحة وحاول مرة أخرى.'))) }
    // lines that asked for installation but got no bid with it: say so, the buyer may arrange it
    const noInst = picks.filter((p: any, k: number) => p.best.fellBack && !results[k]?.error)
      .map((p: any) => pname(rfq?.items?.[p.idx]?.product_name || ''))
    if (noInst.length) notify(L(
      `No supplier included installation for: ${noInst.join(', ')}. The cheapest offer without installation was selected for these.`,
      `ان اشیاء کے لیے کسی سپلائر نے تنصیب شامل نہیں کی: ${noInst.join('، ')}۔ ان کے لیے تنصیب کے بغیر سب سے سستی آفر منتخب کی گئی۔`,
      `لم يشمل أي مورد التركيب في: ${noInst.join('، ')}. اختير لها أرخص عرض بدون تركيب.`), 'info')
    // take the buyer to the summary with its confirm button (UX-014)
    if (!failed) {
      try { (navigator as any).vibrate?.(30) } catch {}
      setTimeout(() => document.getElementById('award-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
    }
  }
  // one supplier for every material (UX-188): award each item to the same offer
  async function awardOfferAll(offerId: string) {
    if (!(await ensureVerified())) return
    setPickingAll(true)
    const supabase = createClient()
    const results = await Promise.all((rfq?.items || []).map((_: any, idx: number) =>
      awards[idx]?.offer_id === offerId ? Promise.resolve({ error: null } as any) : supabase.rpc('award_rfq_item', { p_rfq_id: id, p_item_index: idx, p_offer_id: offerId })))
    setPickingAll(false)
    await reloadAwards()
    const first = results.find((r: any) => r.error)?.error
    if (first) { notify(dbMessage(first, L('Some items could not be selected. Refresh and try again.', 'کچھ اشیاء منتخب نہ ہو سکیں۔ ریفریش کریں۔', 'تعذّر اختيار بعض المواد. حدّث الصفحة وحاول مرة أخرى.'))); return }
    try { (navigator as any).vibrate?.(30) } catch {}
    setTimeout(() => document.getElementById('award-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
  }
  async function unawardItem(itemIndex: any) {
    setAwarding(`${itemIndex}:x`)
    const supabase = createClient()
    const { error } = await supabase.rpc('unaward_rfq_item', { p_rfq_id: id, p_item_index: itemIndex })
    setAwarding(null)
    if (error) notify(L('Could not undo the selection; the request may already be confirmed. Refresh the page.', 'انتخاب واپس نہیں ہو سکا؛ شاید درخواست پہلے ہی کنفرم ہو چکی ہے۔ صفحہ ریفریش کریں۔', 'تعذّر إلغاء الاختيار، وربما أُكِّد الطلب مسبقاً. حدّث الصفحة.'))
    await reloadAwards()
  }
  // confirm the choices: the chosen suppliers are accepted, a deal opens with each, the request closes
  const [finalizing, setFinalizing] = useState(false)
  async function finalizeAwards() {
    if (!(await ensureVerified())) return
    const items: any[] = Array.isArray(rfq?.items) ? rfq.items : []
    // materials with no choice yet are never ordered once the request closes: name them (UX-015)
    const missing = items.map((it: any, idx: number) => (awards[idx] ? null : pname(it.product_name))).filter(Boolean) as string[]
    // a chosen price that has expired: confirm it with the supplier first (UX-099)
    const expired = items.map((it: any, idx: number) => {
      const a = awards[idx]; if (!a) return null
      const o = offers.find((x: any) => x.id === a.offer_id)
      return o?.price_valid_until && new Date(o.price_valid_until) < new Date() ? pname(it.product_name) : null
    }).filter(Boolean) as string[]
    const sep = locale === 'en' ? ', ' : '، '
    const parts: string[] = []
    if (expired.length) parts.push(L(
      `The price has expired for: ${expired.join(sep)}. Confirm the price with the supplier in messages before confirming.`,
      `ان کی قیمت کی مدت ختم ہو گئی ہے: ${expired.join(sep)}۔ تصدیق سے پہلے پیغامات میں سپلائر سے قیمت کنفرم کریں۔`,
      `انتهت صلاحية أسعار: ${expired.join(sep)}. تأكّد من السعر مع المورد عبر الرسائل قبل التأكيد.`))
    if (missing.length) parts.push(L(
      `You have not chosen an offer yet for: ${missing.join(sep)}. Confirming closes the request, and you cannot choose offers for them later. Continue?`,
      `آپ نے ابھی ان کے لیے کوئی آفر منتخب نہیں کی: ${missing.join(sep)}۔ تصدیق سے درخواست بند ہو جائے گی اور بعد میں ان کے لیے آفر منتخب نہیں ہو سکے گی۔ جاری رکھیں؟`,
      `لم تختر عرضاً بعد لهذه المواد: ${missing.join(sep)}. عند التأكيد يُغلق الطلب، ولن تستطيع اختيار عروض لها لاحقاً. هل تريد المتابعة؟`))
    else parts.push(L(
      'Confirm your choices? We will tell the suppliers you chose, open a deal with each, and close the request.',
      'اپنے انتخاب کی تصدیق کریں؟ ہم منتخب سپلائرز کو بتا دیں گے، ہر ایک کے ساتھ ڈیل کھلے گی اور درخواست بند ہو جائے گی۔',
      'تأكيد اختيار العروض؟ سنُبلغ الموردين الذين اخترتهم، وتُفتح صفقة مع كل مورد، ويُغلق الطلب.'))
    // the amount and any pending delivery charges in the dialog too (UX-047)
    const tot = choiceTotals()
    if (tot.grand > 0) parts.push(L(
      `Amount so far: ${money(tot.grand)} SAR${tot.pending >= 1 ? ` + delivery charges up to ${money(tot.pending)} SAR, confirmed by the supplier after you confirm` : ''}.`,
      `اب تک کی رقم: ${money(tot.grand)} ریال${tot.pending >= 1 ? ` + ڈیلیوری چارجز زیادہ سے زیادہ ${money(tot.pending)} ریال، جو سپلائر تصدیق کے بعد کنفرم کرے گا` : ''}۔`,
      `المبلغ حتى الآن: ${money(tot.grand)} ر.س${tot.pending >= 1 ? ` + رسوم توصيل حتى ${money(tot.pending)} ر.س يؤكّدها المورد بعد التأكيد` : ''}.`))
    if (!(await askConfirm(parts.join('\n\n'), {
      okLabel: missing.length ? L('Confirm and close the request', 'تصدیق کریں اور درخواست بند کریں', 'تأكيد وإغلاق الطلب') : L('Confirm the chosen offers', 'منتخب آفرز کی تصدیق کریں', 'تأكيد اختيار العروض'),
      ...BACKOUT,
    }))) return
    setFinalizing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('finalize_rfq_awards', { p_rfq_id: id })
    setFinalizing(false)
    if (error) { notify(dbMessage(error, L('Could not confirm your choices. Refresh the page and try again.', 'انتخاب کی تصدیق نہیں ہو سکی۔ صفحہ ریفریش کر کے دوبارہ کوشش کریں۔', 'تعذّر تأكيد اختيار العروض. حدّث الصفحة وحاول مرة أخرى.'))); return }
    // update in place, no page reload (UX-017): the request is closed, the offers and awards reload
    setRfq((prev: any) => ({ ...prev, status: 'closed' }))
    setJustFinalized(true)
    setRefresh(r => r + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [showEditWarning, setShowEditWarning] = useState(false)

  // only a material change (name, quantity, unit, spec) cancels the offers; notes alone keep them
  const multiItems = () => Array.isArray(rfq?.items) && rfq.items.length > 1
  const editIsMaterial = () => !multiItems() && (
    ((editName || '').trim() || rfq.product_name) !== rfq.product_name
    || (parseFloat(toLatinNumber(String(editQty)).replace('٫', '.')) || rfq.quantity) !== Number(rfq.quantity)
    || (editUnit || rfq.unit) !== rfq.unit
    || (editSpec || '') !== (rfq.specification || ''))

  function handleEditSave() {
    if (offers.length > 0 && editIsMaterial()) {
      setShowEditWarning(true)
    } else {
      doSaveEdit()
    }
  }

  async function doSaveEdit() {
    // UX-139: an empty or invalid quantity is never replaced silently
    if (!multiItems() && !(parseFloat(toLatinNumber(String(editQty ?? '')).replace('٫', '.')) > 0)) {
      notify(L('Enter a valid quantity.', 'درست مقدار درج کریں۔', 'أدخل كمية صحيحة.')); setShowEditWarning(false); return
    }
    const supabase = createClient()
    const patch: any = multiItems() ? { notes: editNotes } : {
      notes: editNotes,
      specification: editSpec,
      product_name: (editName || '').trim() || rfq.product_name,
      quantity: parseFloat(toLatinNumber(String(editQty)).replace('٫', '.')) || rfq.quantity,
      unit: editUnit || rfq.unit,
    }
    // a one-item request also carries the line in items[]: the supplier page reads it from there (review 2026-10-28)
    const lineChanged = patch.product_name !== rfq.product_name || Number(patch.quantity) !== Number(rfq.quantity) || patch.unit !== rfq.unit || (editSpec || '').trim() !== (rfq.specification || '').trim()
    if (lineChanged && Array.isArray(rfq.items) && rfq.items.length === 1) {
      patch.items = [{ ...rfq.items[0], product_name: patch.product_name, quantity: patch.quantity, unit: patch.unit, specification: (editSpec || '').trim() || null }]
    }
    // one transaction on the server (175): offers are dropped only on a material change, and only
    // if the request update succeeds too (the suppliers are told to price again)
    const { data: res, error } = await supabase.rpc('edit_rfq', { p_rfq_id: id, p_patch: patch })
    if (error) { notify(friendlyError(error.message, L('Could not save. Please try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ. حاول مرة أخرى.'), locale)); return }
    const dropped = Number((res as any)?.offers_deleted || 0) > 0

    setRfq({ ...rfq, ...patch, ...(dropped ? { offer_count: 0 } : {}) })
    if (dropped) setOffers([])
    setEditing(false)
    setShowEditWarning(false)
  }

  // UX-069: add one day to a deadline that ends within 24 h
  const endsSoon = !!rfq?.expires_at && !isExpired(rfq.expires_at) && new Date(rfq.expires_at).getTime() - Date.now() < 24 * 3600 * 1000
  function openEdit() {
    setEditName(rfq.product_name || ''); setEditQty(rfq.quantity ?? ''); setEditUnit(rfq.unit || '')
    setEditSpec(rfq.specification || ''); setEditNotes(rfq.notes || '')
    setEditing(true)
  }

  async function cancelRfq() {
    if (!(await askConfirm(L('Cancelling the request stops new offers; the request stays in your history. Continue?', 'درخواست منسوخ کرنے سے نئی آفرز آنا بند ہو جائیں گی؛ درخواست آپ کے ریکارڈ میں رہے گی۔ جاری رکھیں؟', 'إلغاء الطلب يوقف استقبال العروض، ويبقى الطلب في سجلك. هل تريد المتابعة؟'), { danger: true, okLabel: L('Yes, cancel the request', 'ہاں، درخواست منسوخ کریں', 'نعم، ألغِ الطلب'), ...BACKOUT }))) return
    const supabase = createClient()
    const { error } = await supabase.from('rfqs').update({ status: 'cancelled' }).eq('id', id)
    if (error) { notify(L('Could not cancel: a request with a chosen offer cannot be cancelled.', 'منسوخ نہیں ہو سکا: جس درخواست میں آفر منتخب ہو وہ منسوخ نہیں ہو سکتی۔', 'تعذّر الإلغاء، فلا يمكن إلغاء طلب اختير فيه عرض.')); return }
    router.push('/contractor')
  }

  if (loading) return <PageLoader />
  if (!rfq) return (
    <AppShell title={L('Request', 'درخواست', 'الطلب')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-5xl mb-3 text-gray-400"><Glyph e="🔍" /></div>
        <p className="font-bold text-[#0B2438]">{L('This request is no longer available', 'یہ درخواست اب دستیاب نہیں', 'هذا الطلب لم يعد متاحاً')}</p>
        <p className="text-sm text-gray-600 mt-1">{L('It may have been deleted, or it belongs to another account.', 'شاید یہ حذف ہو گئی ہے یا کسی اور اکاؤنٹ کی ہے۔', 'ربما حُذف الطلب، أو أنه يخص حساباً آخر.')}</p>
        <Link href="/contractor/rfqs" className="mt-4 inline-flex items-center min-h-11 px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('My requests', 'میری درخواستیں', 'طلباتي')}</Link>
      </div>
    </AppShell>
  )

  const acceptedOffer = offers.find((o: any) => o.status === 'accepted')
  // a multi-item request → offers are chosen per material (best supplier per material)
  const isMulti = Array.isArray(rfq.items) && rfq.items.length > 1
  const hasItems = Array.isArray(rfq.items) && rfq.items.length > 0
  const activeOffers = offers.filter((o: any) => o.status !== 'rejected')
  // delivery reference for «الأقرب» (when the request has coordinates)
  const refGeo = parseGeo(rfq?.delivery_geo)
  const canSortNearest = !!refGeo && activeOffers.some((o: any) => o.supplier?.latitude != null && o.supplier?.longitude != null)
  const expired = !!rfq.expires_at && isExpired(rfq.expires_at)
  const rfqOpen = rfq.status === 'open' && !expired
  const awardedN = Object.keys(awards || {}).length
  const dealDone = !!acceptedOffer || (rfq.status === 'closed' && awardedN > 0)
  // UX-004: the server accepts a choice while the request is open, even after the pricing deadline
  const canChoose = rfq.status === 'open'
  // UX-048: «اكتملت الصفقة» only when every deal of this request is paid and confirmed
  const acceptedList = offers.filter((o: any) => o.status === 'accepted')
  const dealComplete = dealDone && acceptedList.length > 0 && acceptedList.every((o: any) => dealStage(o, 'buyer', locale).done)
  const statusInfo = rfqStatusLabel(rfq, { dealStarted: dealDone, dealComplete, hasOffers: offers.some((o: any) => o.status !== 'rejected'), expired }, locale)

  // Filtered + sorted offers for display; a declined offer always goes last (UX-175).
  const displayedOffers = [...offers]
    .filter((o: any) => !onlyVerified || o.supplier?.verification_status === 'verified')
    .filter((o: any) => !tierFilter || normTier(o.supplier?.supplier_tier) === tierFilter)
    .sort((a: any, b: any) => {
      const ra = a.status === 'rejected' ? 1 : 0, rb = b.status === 'rejected' ? 1 : 0
      if (ra !== rb) return ra - rb
      if (sortBy === 'price_desc') return offerComparable(b) - offerComparable(a)
      if (sortBy === 'delivery') return (Number(a.delivery_days) || 99999) - (Number(b.delivery_days) || 99999)
      if (sortBy === 'nearest') return ((offerDistanceKm(a, refGeo) ?? 9e9) - (offerDistanceKm(b, refGeo) ?? 9e9)) || (offerComparable(a) - offerComparable(b)) // UX-170
      if (sortBy === 'rating') return (supplierScore(b.supplier, supplierStats[b.supplier_id]) - supplierScore(a.supplier, supplierStats[a.supplier_id])) || (offerComparable(a) - offerComparable(b))
      return offerComparable(a) - offerComparable(b) // price_asc (default), VAT-inclusive basis (B4)
    })
  // Comparison badges (UX-187): why an offer stands out, among the offers still in play
  const minPrice = activeOffers.length ? Math.min(...activeOffers.map((o: any) => offerComparable(o))) : 0
  const dayList = activeOffers.map((o: any) => Number(o.delivery_days)).filter((d: number) => d > 0)
  const minDays = dayList.length ? Math.min(...dayList) : 0
  const scoreList = activeOffers.map((o: any) => supplierScore(o.supplier, supplierStats[o.supplier_id]))
  const maxScore = scoreList.length ? Math.max(...scoreList) : 0
  const offerBadges = (o: any) => {
    if (activeOffers.length < 2 || o.status === 'rejected') return [] as { k: string; label: string; gold?: boolean }[]
    const out: { k: string; label: string; gold?: boolean }[] = []
    if (Math.round(offerComparable(o)) === Math.round(minPrice)) out.push({ k: 'cheap', label: L('Lowest price', 'سب سے کم قیمت', 'الأقل سعراً'), gold: true })
    if (minDays && Number(o.delivery_days) === minDays && dayList.filter(d => d === minDays).length < activeOffers.length) out.push({ k: 'fast', label: L('Fastest delivery', 'سب سے تیز ڈیلیوری', 'الأسرع توصيلاً') })
    if (maxScore > 0 && supplierScore(o.supplier, supplierStats[o.supplier_id]) === maxScore && scoreList.filter(s => s === maxScore).length < activeOffers.length) out.push({ k: 'rated', label: L('Top rated', 'بہترین کارکردگی', 'الأعلى تقييماً') })
    return out
  }
  // a supplier new on the platform: a «مورد جديد» pill instead of a low score and a 0% rate (UX-091)
  const isNewSupplier = (o: any) => { const st = supplierStats[o.supplier_id]; return !(Number(o.supplier?.rating_avg) > 0) && (Number(st?.total_offers) || 0) < 3 }
  const scorePill = (o: any) => {
    if (isNewSupplier(o)) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#0B2438]/10 text-[#0B2438]">{L('New supplier', 'نیا سپلائر', 'مورد جديد')}</span>
    const sc = supplierScore(o.supplier, supplierStats[o.supplier_id])
    const strong = sc >= 75, mid = sc >= 50
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={strong ? { background: '#0B2438', color: '#fff' } : mid ? { background: '#D4A543', color: '#071827' } : { background: '#4B5563', color: '#fff' }}>{L(`Performance ${sc}/100`, `کارکردگی ${sc}/100`, `مؤشر الأداء ${sc}/100`)}</span>
  }
  const reached = Number(coverage?.reached) || 0
  // UX-047: the pending delivery charges show in the sticky bar too
  const totals = choiceTotals()
  // UX-069: no offers yet → what is happening and what the buyer can do (not a repeat of the tracker)
  const noOffersCard = (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-100">
      <div className="flex items-start gap-3">
        <span className="text-3xl text-[#8F6820] shrink-0"><Glyph e="⏳" /></span>
        <div className="min-w-0">
          <h4 className="font-bold text-gray-900">{L('Your request is with the suppliers now', 'آپ کی درخواست اب سپلائرز کے پاس ہے', 'طلبك لدى الموردين الآن')}</h4>
          <p className="text-sm text-gray-600 mt-0.5">{rfq.status === 'open'
            ? L('Offers usually arrive within the pricing time. Meanwhile you can:', 'آفرز عموماً قیمت کی مہلت میں آتی ہیں۔ تب تک آپ یہ کر سکتے ہیں:', 'تصل العروض عادةً خلال مهلة التسعير. وإلى ذلك الحين يمكنك:')
            : L('No supplier sent an offer on this request.', 'اس درخواست پر کسی سپلائر نے آفر نہیں بھیجی۔', 'لم يرسل أي مورد عرضاً على هذا الطلب.')}</p>
        </div>
      </div>
      {rfq.status === 'open' && (
        <div className="mt-3 space-y-2">
          <EnablePush variant="nudge" />
          <div className="flex flex-wrap gap-2">
            {endsSoon && (
              <button type="button" onClick={() => extendDeadline(1)} disabled={extending}
                className="min-h-11 px-4 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
                <Glyph e="⏱" /> {extending ? '…' : L('Add a day to the pricing time', 'قیمت کی مہلت میں ایک دن بڑھائیں', 'أضف يوماً لمهلة التسعير')}
              </button>
            )}
            <button type="button" onClick={() => { openEdit(); setTimeout(() => document.getElementById('rfq-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
              className="min-h-11 px-4 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5">
              <Glyph e="✏" /> {isMulti
                ? L('Add details to the notes for more accurate prices', 'زیادہ درست قیمتوں کے لیے نوٹس میں تفصیل شامل کریں', 'أضف تفاصيل في الملاحظات لتصلك أسعار أدق')
                : L('Add specifications for more accurate prices', 'زیادہ درست قیمتوں کے لیے اسپیسیفکیشن شامل کریں', 'أضف مواصفات لتصلك أسعار أدق')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
  // UX-168: a home buyer gets one line that sums up the offers
  const fastest = activeOffers.filter((o: any) => Number(o.delivery_days) > 0).sort((a: any, b: any) => Number(a.delivery_days) - Number(b.delivery_days))[0]
  const cheapestOffer = activeOffers.length ? activeOffers.reduce((a: any, b: any) => (offerComparable(b) < offerComparable(a) ? b : a)) : null
  const stepIdx = dealDone ? 3 : activeOffers.length > 0 ? 2 : 1 // the tracker's current step (UX-186)

  return (
    <AppShell title={L('Request details', 'درخواست کی تفصیل', 'تفاصيل الطلب')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-5xl mx-auto">
        {toast && (
          <div role={toast.tone === 'err' ? 'alert' : 'status'} className={`fixed inset-x-4 ${stickyConfirm ? 'bottom-[calc(10rem+env(safe-area-inset-bottom))] lg:bottom-24' : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6'} z-[70] max-w-lg mx-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${toast.tone === 'err' ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#0B2438]/20 bg-white text-[#0B2438]'}`}>
            <span className="leading-relaxed">{toast.t}</span>
            <button type="button" onClick={() => setToast(null)} className="min-w-11 min-h-11 -m-3 text-lg" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
          </div>
        )}
        {liveNote && (
          <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-4 py-2 text-sm font-semibold text-[#0B2438]">
            <span><Glyph e="🔔" /> {liveNote}</span>
            <button type="button" onClick={() => setLiveNote('')} className="min-w-11 min-h-11 -my-2 text-lg leading-none" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
          </div>
        )}
        {/* UX-168: a new offer that is now the lowest */}
        {cheapNote && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D4A543] bg-[#D4A543]/10 px-4 py-2 text-sm font-bold text-[#0B2438]">
            <span>{cheapNote.t}</span>
            <span className="flex items-center gap-1">
              <Link href={`/contractor/rfq/${id}/offer/${cheapNote.offerId}`} className="inline-flex items-center min-h-11 px-4 rounded-xl text-sm font-bold border border-[#0B2438] text-[#0B2438] bg-white">{L('View it', 'دیکھیں', 'اعرضه')}</Link>
              <button type="button" onClick={() => setCheapNote(null)} className="min-w-11 min-h-11 text-lg leading-none" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
            </span>
          </div>
        )}
        {/* «تمّ، وهذا ما يحدث بعد ذلك» after confirming the choices (UX-017) */}
        {justFinalized && (
          <div role="status" className="mb-4 rounded-2xl border border-[#0F6E56]/30 bg-[#E7F4EF] px-4 py-3">
            <div className="font-extrabold text-[#0F6E56]">{L('Your choices are confirmed.', 'آپ کا انتخاب کنفرم ہو گیا۔', 'تمّ تأكيد اختيارك.')}</div>
            <div className="text-sm text-gray-700 mt-0.5">{L('Next: each supplier prepares your order and confirms delivery, and you will get a message then.', 'اگلا مرحلہ: ہر سپلائر آپ کا آرڈر تیار کر کے ڈیلیوری کنفرم کرے گا، اور آپ کو پیغام ملے گا۔', 'الخطوة التالية: يجهّز كل مورد طلبك ويؤكّد التوصيل، وستصلك رسالة عند ذلك.')}</div>
            {savings && savings.saved >= 1 && <div className="text-sm font-bold text-[#0F6E56] mt-1">{L(`You saved ${money(savings.saved)} SAR compared with the highest offer.`, `سب سے زیادہ آفر کے مقابلے میں آپ نے ${money(savings.saved)} ریال بچائے۔`, `وفّرت ${money(savings.saved)} ر.س مقارنةً بأعلى عرض.`)}</div>}
          </div>
        )}
        {rfq?.status === 'open' && coverage && (() => {
          const items: any[] = Array.isArray(coverage.items) ? coverage.items : []
          const uncovered = items.filter(x => !(Number(x.suppliers) > 0)).map(x => pname(x.name || '')).filter(Boolean)
          if (!uncovered.length) return null
          return (
            <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {/* UX-070: one promise for an uncovered material, the same sentence as the request page */}
              <div className="leading-relaxed"><Glyph e="🔎" /> {L(
                `There is no registered supplier yet for «${uncovered.join(', ')}». We told our team to find you one, and we will let you know as soon as an offer on it arrives.`,
                `«${uncovered.join('، ')}» کے لیے ابھی کوئی رجسٹرڈ سپلائر نہیں۔ ہم نے اپنی ٹیم کو بتا دیا ہے کہ آپ کے لیے سپلائر تلاش کرے، اور اس پر آفر آتے ہی ہم آپ کو بتائیں گے۔`,
                `لا يوجد بعد مورد مسجّل لـ«${uncovered.join('، ')}». أبلغنا فريقنا ليبحث لك عن مورد، وسنُعلمك فور وصول عرض عليه.`)}</div>
            </div>
          )
        })()}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Link href="/contractor/rfqs" className="inline-flex items-center gap-1 min-h-11 text-sm text-gray-600 hover:text-gray-800"><span aria-hidden="true">{BACK}</span> {L('Back to my requests', 'میری درخواستوں پر واپس', 'العودة إلى طلباتي')}</Link>
          <Link href={`/contractor/rfq/quick?from=${id}`} className="inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-[#8F6820] hover:underline"><Glyph e="🔁" /> {L('Request again', 'دوبارہ درخواست کریں', 'اطلب مرة أخرى')}</Link>
        </div>

        {/* «أين طلبي؟» one tracker: sent → reached N suppliers → N offers → supplier chosen (UX-186) */}
        {rfq.status !== 'cancelled' && (
          <ol className="mb-4 grid grid-cols-4 gap-1.5 sm:gap-2 rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 text-center text-xs">
            {[
              L('Sent', 'بھیجی گئی', 'أُرسل'),
              reached > 0 ? L(`Reached ${reached} supplier${reached === 1 ? '' : 's'}`, `${reached} سپلائرز تک پہنچی`, `وصل إلى ${arCount(reached, 'مورد واحد', 'موردَين', 'موردين', 'مورداً')}`)
                : coverage ? L('Finding suppliers for you', 'آپ کے لیے سپلائرز تلاش ہو رہے ہیں', 'نبحث لك عن موردين') // UX-139: never «وصل» with zero
                : L('Reached suppliers', 'سپلائرز تک پہنچی', 'وصل إلى الموردين'),
              activeOffers.length > 0 ? L(`${activeOffers.length} offer${activeOffers.length === 1 ? '' : 's'}`, `${activeOffers.length} آفرز`, (activeOffers.length <= 2 ? arCount(activeOffers.length, 'وصل عرض واحد', 'وصل عرضان', '', '') : 'وصل ' + arCount(activeOffers.length, '', '', 'عروض', 'عرضاً'))) : L('Offers', 'آفرز', 'العروض'),
              dealDone ? L('Supplier chosen', 'سپلائر منتخب', 'اخترت المورد') : L('Choose the supplier', 'سپلائر کا انتخاب', 'اختيار المورد'), // UX-048
            ].map((lbl, i) => {
              const done = i < stepIdx || (i === 3 && dealDone)
              const cur = i === stepIdx && !dealDone
              return (
                <li key={i} className="flex flex-col items-center gap-1" aria-current={cur ? 'step' : undefined}>
                  <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold"
                    style={done ? { background: '#0B2438', color: '#fff' } : cur ? { background: '#D4A543', color: '#071827' } : { background: '#f3f4f6', color: '#6b7280' }}>{i + 1}</span>
                  <span className={`leading-tight ${done || cur ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{lbl}</span>
                </li>
              )
            })}
            {rfqOpen && activeOffers.length === 0 && (
              <li className="col-span-4 mt-1 text-xs text-gray-600">{L('We will tell you as soon as the first offer arrives', 'پہلی آفر آتے ہی ہم آپ کو بتائیں گے', 'سنُبلغك فور وصول أول عرض')}{rfq.expires_at ? ` · ${L('pricing ends in', 'قیمت کی مہلت باقی:', 'ينتهي التسعير بعد')} ${formatTimeLeft(rfq.expires_at, locale)}` : ''}</li>
            )}
          </ol>
        )}

        {/* the request card */}
        <div id="rfq-card" className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#8F6820] font-mono" dir="auto">{rfqRefLine(rfq, locale)}</div>
              <h2 className="text-xl font-bold text-gray-900">{rfqDesc(rfq, locale)}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {!home && (
                  <span className="bg-[#0B2438]/5 text-[#0B2438] text-xs px-2 py-0.5 rounded-full font-semibold">
                    {Array.isArray(rfq.sectors) && rfq.sectors.length > 1
                      ? rfq.sectors.map((s: string) => secLabel(s)).join(' + ')
                      : secLabel(rfq.sector)}
                  </span>
                )}
                {/* UX-048: one status name everywhere (rfqStatusLabel) */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  statusInfo.key === 'deal_done' ? 'bg-emerald-100 text-emerald-800' :
                  statusInfo.key === 'deal_ongoing' ? 'bg-[#0B2438]/10 text-[#0B2438]' :
                  statusInfo.key === 'open' ? 'bg-[#D4A543]/15 text-[#0B2438]' :
                  statusInfo.key === 'expired_choose' || statusInfo.key === 'expired_empty' ? 'bg-amber-100 text-amber-900' :
                  statusInfo.key === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {statusInfo.label}
                </span>
                {rfq.status === 'open' && rfq.expires_at && !expired && (() => {
                  const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                  return (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.fg }}>
                      {L('Time left:', 'باقی وقت:', 'المتبقي:')} {formatTimeLeft(rfq.expires_at, locale)}
                    </span>
                  )
                })()}
                {(() => {
                  // ended without a deal → deleted after the retention period (migration 192)
                  const pi = !acceptedOffer && !awardedN ? rfqPurgeInfo(rfq, locale, true) : null
                  return pi && <span title={pi.hint} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${pi.soon ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{pi.label}</span>
                })()}
              </div>
              <div className="text-xs text-gray-500 mt-1.5">
                <Glyph e="🗓" /> {L('Sent on', 'بھیجی گئی:', 'أُرسل في')} {formatDateTime(rfq.created_at)}{rfq.expires_at && rfq.status === 'open' ? ` · ${L('Offers deadline', 'آفرز کی آخری تاریخ', 'آخر موعد للعروض')} ${formatDateTime(rfq.expires_at)}` : ''}
              </div>
              {rfq.status === 'open' && (
                <div className="mt-2">
                  {!showExtend ? (
                    <button type="button" onClick={() => setShowExtend(true)}
                      className="min-h-11 text-sm font-semibold text-[#0B2438] border border-[#0B2438]/20 px-3 rounded-xl hover:bg-[#0B2438]/5 transition-colors">
                      <Glyph e="⏱" /> {L('Extend pricing deadline', 'قیمت دینے کی مہلت بڑھائیں', 'تمديد مهلة التسعير')}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 flex-wrap bg-[#0B2438]/5 border border-[#0B2438]/15 rounded-xl p-2">
                      <span className="text-xs text-gray-700 font-semibold">{L('Extend by:', 'مہلت بڑھائیں:', 'مدّد المهلة:')}</span>
                      {[1, 3, 7].map((d: number) => (
                        <button type="button" key={d} onClick={() => extendDeadline(d)} disabled={extending}
                          className="min-h-11 text-sm font-bold text-white px-3 rounded-lg disabled:opacity-50" style={{ background: '#0B2438' }}>
                          {extending ? '…' : `+ ${daysText(d, locale)}`}
                        </button>
                      ))}
                      <button type="button" onClick={() => setShowExtend(false)} className="min-w-11 min-h-11 text-gray-500 text-lg" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {rfq.status === 'open' && !editing && (
              <div className="flex flex-col gap-1 sm:shrink-0 sm:items-end">
                <div className="flex gap-2">
                  <button type="button" onClick={openEdit}
                    className="min-h-11 text-sm text-[#0B2438] border border-[#0B2438]/20 px-4 rounded-xl hover:bg-[#0B2438]/5 transition-colors">
                    <Glyph e="✏" /> {L('Edit', 'ترمیم', 'تعديل')}
                  </button>
                  {/* UX-139: a request with a chosen material cannot be cancelled: no button that fails */}
                  {!awardedN && !acceptedOffer && (
                    <button type="button" onClick={cancelRfq}
                      className="min-h-11 text-sm text-red-700 border border-red-200 px-4 rounded-xl hover:bg-red-50 transition-colors">
                      {L('Cancel request', 'درخواست منسوخ کریں', 'إلغاء الطلب')}
                    </button>
                  )}
                </div>
                {awardedN > 0 && <p className="text-xs text-gray-600 max-w-[16rem] sm:text-end">{L('To cancel, undo your choices first.', 'منسوخ کرنے کے لیے پہلے اپنا انتخاب واپس لیں۔', 'لإلغاء الطلب ألغِ اختياراتك أولاً.')}</p>}
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 bg-[#D4A543]/5 rounded-xl p-4">
              {!isMulti && (
                <>
                  <div>
                    <label htmlFor="ed-name" className="block text-xs font-semibold text-gray-700 mb-1">{L('Material name', 'مال کا نام', 'اسم المادة')}</label>
                    <input id="ed-name" value={editName} onChange={(e: any) => setEditName(e.target.value)} className="input-field text-base sm:text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ed-qty" className="block text-xs font-semibold text-gray-700 mb-1">{L('Quantity', 'مقدار (تعداد)', 'الكمية (العدد)')}</label>
                      <input id="ed-qty" type="text" inputMode="decimal" value={editQty} onChange={(e: any) => setEditQty(e.target.value)} className="input-field text-base sm:text-sm" />
                    </div>
                    <div>
                      <label htmlFor="ed-unit" className="block text-xs font-semibold text-gray-700 mb-1">{L('Unit', 'یونٹ', 'الوحدة')}</label>
                      <select id="ed-unit" value={editUnit} onChange={(e: any) => setEditUnit(e.target.value)} className="input-field text-base sm:text-sm">
                        {!UNIT_OPTIONS.includes(editUnit) && editUnit && <option value={editUnit}>{unitL(editUnit)}</option>}
                        {UNIT_OPTIONS.map((u: any) => <option key={u} value={u}>{unitL(u)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ed-spec" className="block text-xs font-semibold text-gray-700 mb-1">{L('Specifications', 'اسپیسیفکیشن', 'المواصفات')}</label>
                    <input id="ed-spec" value={editSpec} onChange={(e: any) => setEditSpec(e.target.value)} className="input-field text-base sm:text-sm" />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="ed-notes" className="block text-xs font-semibold text-gray-700 mb-1">{L('Notes', 'نوٹس', 'ملاحظات')}</label>
                <textarea id="ed-notes" value={editNotes} onChange={(e: any) => setEditNotes(e.target.value)} className="input-field text-base sm:text-sm" rows={3} />
              </div>
              {isMulti && (
                <p className="text-xs text-gray-600 leading-relaxed">{L('In a request with several materials only the notes can be edited. To change a material, use «Request again» and send a new request.', 'کئی اشیاء والی درخواست میں صرف نوٹس بدلے جا سکتے ہیں۔ کوئی چیز بدلنے کے لیے «دوبارہ درخواست کریں» سے نئی درخواست بھیجیں۔', 'في الطلب متعدد المواد تُعدَّل الملاحظات فقط. لتغيير مادة استعمل «اطلب مرة أخرى» وأرسل طلباً جديداً.')}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleEditSave} className="min-h-11 bg-[#0B2438] text-white px-5 rounded-xl text-sm font-semibold hover:bg-[#071827]">{L('Save changes', 'تبدیلیاں محفوظ کریں', 'حفظ التعديل')}</button>
                <button type="button" onClick={() => { setEditing(false); setShowEditWarning(false) }} className="min-h-11 px-4 text-sm text-gray-600">{L('Close without saving', 'محفوظ کیے بغیر بند کریں', 'إغلاق دون حفظ')}</button>
              </div>

              {showEditWarning && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-xl"><Glyph e="⚠" /></span>
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm">{L('The current offers will be cancelled', 'موجودہ آفرز منسوخ ہو جائیں گی', 'ستُلغى العروض الحالية')}</h4>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">{L(
                        `Changing the material name, quantity, unit or specifications cancels the current offers (${offers.length}) and re-sends the request to suppliers for new offers. Notes alone do not cancel the offers.`,
                        `مال کا نام، مقدار، یونٹ یا اسپیسیفکیشن بدلنے سے موجودہ آفرز (${offers.length}) منسوخ ہو جائیں گی اور درخواست نئی آفرز کے لیے سپلائرز کو دوبارہ بھیجی جائے گی۔ صرف نوٹس بدلنے سے آفرز منسوخ نہیں ہوتیں۔`,
                        `سيؤدي تعديل اسم المادة أو كميتها أو وحدتها أو مواصفاتها إلى إلغاء العروض الحالية (العدد: ${offers.length})، وإرسال الطلب مرة أخرى إلى الموردين لتقديم عروض جديدة. أما الملاحظات وحدها فلا تلغي العروض.`)}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" onClick={doSaveEdit}
                          className="min-h-11 bg-[#0B2438] text-white px-4 rounded-xl text-sm font-semibold hover:bg-[#071827] transition-colors">
                          {L('Yes, edit and re-send', 'ہاں، ترمیم کر کے دوبارہ بھیجیں', 'نعم، عدّل وأعد الإرسال')}
                        </button>
                        <button type="button" onClick={() => setShowEditWarning(false)}
                          className="min-h-11 text-sm text-gray-600 px-3">
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
            {hasItems && (
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2 text-[#0B2438]"><Glyph e="🧾" /> {L('Requested materials', 'مطلوبہ مال', 'المواد المطلوبة')} ({rfq.items.length})</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-600 bg-gray-50 border-b border-gray-100">
                      <th className="text-start py-2 px-3 font-bold">#</th>
                      <th className="text-start py-2 px-3 font-bold">{L('Material', 'مال', 'المادة')}</th>
                      <th className="text-start py-2 px-3 font-bold">{L('Quantity', 'مقدار', 'الكمية')}</th>
                      <th className="text-start py-2 px-3 font-bold">{L('Specifications', 'اسپیسیفکیشن', 'المواصفات')}</th>
                    </tr></thead>
                    <tbody>
                      {rfq.items.map((it: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 align-top">
                          <td className="py-2.5 px-3 text-gray-500">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-start gap-2.5">
                            {/* package icon underneath; the photo covers it, and when no photo loads (imgFallback hides it) the icon shows, as in the app */}
                            <span className="relative w-11 h-11 rounded-lg bg-gray-50 border border-gray-100 shrink-0 grid place-items-center text-gray-400 overflow-hidden">
                              <Glyph e="📦" />
                              {it.product_name && <img src={productImageUrl(it.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, it.sub_category || detectSubCategory(it.product_name, it.sector))} className="absolute inset-0 w-full h-full object-contain bg-gray-50" />}
                            </span>
                            <div className="min-w-0">
                            <div className="font-semibold text-[#0B2438]">{pname(it.product_name)}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {!home && it.sector && <span className="text-xs px-1.5 py-0.5 rounded bg-[#0B2438]/5 text-[#0B2438]">{secLabel(it.sector)}</span>}
                              {(it.supplier_tiers || []).map((tr: string) => <span key={tr} className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-800"><SellerIcon name={tierIcon(tr)} /> {tierLabel(tr, locale)}</span>)}
                              {it.in_stock && <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800"><Glyph e="⚡" /> {L('In stock now', 'فوری دستیاب', 'متوفّر فوراً')}</span>}
                              {Number(it.max_days) > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"><Glyph e="⏱" /> {L(`Within ${daysText(it.max_days, locale)}`, `${daysText(it.max_days, locale)} میں`, `خلال ${daysText(it.max_days, locale)}`)}</span>}
                              {it.spec_file_url && <a href={fileHref(it.spec_file_url)} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 rounded bg-[#0B2438]/5 text-[#0B2438] hover:underline"><Glyph e="📎" /> {L('File', 'فائل', 'ملف')}</a>}
                              {Array.isArray(it.attachments) && it.attachments.map((a: any, ai: number) => <a key={ai} href={fileHref(a.url)} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 rounded bg-[#0B2438]/5 text-[#0B2438] hover:underline truncate max-w-[10rem]"><Glyph e="📎" /> {a.name || L('File', 'فائل', 'ملف')}</a>)}
                            </div>
                            </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#8F6820] whitespace-nowrap">{(Number(it.quantity) || 0).toLocaleString('en-US')} {unitL(it.unit)}</td>
                          <td className="py-2.5 px-3 text-xs text-gray-600">{it.specification || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              {!hasItems && <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-500"><Glyph e="📦" /> {L('Quantity', 'مقدار', 'الكمية')}</span><br/><strong>{(Number(rfq.quantity) || 0).toLocaleString('en-US')} {unitL(rfq.unit)}</strong></div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-500"><Glyph e="📍" /> {L('Location', 'مقام', 'الموقع')}</span><br/><strong>{rfq.city || rfq.region}</strong></div>
              {rfq.specification && !hasItems && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-500"><Glyph e="⚙" /> {L('Specifications', 'اسپیسیفکیشن', 'المواصفات')}</span><br/><strong>{rfq.specification}</strong></div>}
              {rfq.notes && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-500"><Glyph e="📝" /> {L('Notes', 'نوٹس', 'ملاحظات')}</span><br/>{rfq.notes}</div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-500"><Glyph e="🚚" /> {L('Delivery', 'ڈیلیوری', 'التوصيل')}</span><br/><strong>{rfq.delivery_required ? L('Required', 'درکار ہے', 'مطلوب') : L('Not required', 'درکار نہیں', 'غير مطلوب')}</strong></div>
              {!home && <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-500"><Glyph e="🧾" /> {L('Tax invoice', 'ٹیکس انوائس', 'فاتورة ضريبية')}</span><br/><strong>{rfq.vat_invoice_required ? L('Required', 'درکار ہے', 'مطلوبة') : L('Not required', 'درکار نہیں', 'غير مطلوبة')}</strong></div>}
            </div>
            </>
          )}
        </div>

        {/* send the request to more suppliers: only while it is open, has fewer than 3 offers and no choice (UX-089) */}
        {rfqOpen && activeOffers.length < 3 && !awardedN && !acceptedOffer && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#0B2438]/15 bg-[#0B2438]/[0.03] px-4 py-3">
            <div className="text-sm text-gray-700 min-w-0">
              <div className="font-bold text-[#0B2438]">{L('Send the request to more suppliers', 'درخواست مزید سپلائرز کو بھیجیں', 'أرسل الطلب إلى موردين آخرين')}</div>
              <div className="text-xs text-gray-600">{L('Want more offers? We can send your request to more matching suppliers.', 'مزید آفرز چاہییں؟ ہم آپ کی درخواست مزید موزوں سپلائرز کو بھیج سکتے ہیں۔', 'تريد عروضاً أكثر؟ نرسل طلبك إلى موردين مناسبين آخرين.')}</div>
            </div>
            <button type="button" disabled={moreBusy}
              onClick={async () => {
                setMoreBusy(true); setMoreMsg('')
                const { data, error } = await createClient().rpc('request_more_suppliers', { p_rfq_id: id })
                setMoreBusy(false)
                if (error) { setMoreMsg(dbMessage(error, L('Could not send the request. Please try again.', 'درخواست نہیں بھیجی جا سکی۔ دوبارہ کوشش کریں۔', 'تعذّر إرسال الطلب. حاول مرة أخرى.'))); return }
                const n = Number((data as any)?.added) || 0
                setMoreMsg(n > 0
                  ? L(`Sent to ${n} more supplier${n === 1 ? '' : 's'}.`, `مزید ${n} سپلائرز کو بھیج دی گئی۔`, `أُرسل طلبك إلى ${arCount(n, 'مورد آخر', 'موردَين آخرَين', 'موردين آخرين', 'مورداً آخر')}.`)
                  : L('No other matching suppliers are available right now; we will keep looking.', 'ابھی کوئی اور موزوں سپلائر دستیاب نہیں؛ ہم تلاش جاری رکھیں گے۔', 'لا يوجد موردون مناسبون آخرون حالياً، وسنواصل البحث.'))
              }}
              className="min-h-11 px-4 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
              {moreBusy ? '…' : L('Send to more suppliers', 'مزید سپلائرز کو بھیجیں', 'أرسل إلى موردين آخرين')}
            </button>
            {moreMsg && <div role="status" className="basis-full text-xs text-gray-700">{moreMsg}</div>}
          </div>
        )}
        {rfq.status === 'open' && expired && !awardedN && !acceptedOffer && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {/* UX-004: choosing still works after the deadline while the request is open */}
            <Glyph e="⏱" /> {activeOffers.length > 0
              ? L('The pricing deadline has passed. You can choose one of the offers received, or extend the deadline to get more offers.', 'قیمت کی مہلت ختم ہو گئی۔ آپ موصول آفرز میں سے کوئی منتخب کر سکتے ہیں، یا مزید آفرز کے لیے مہلت بڑھا سکتے ہیں۔', 'انتهت مهلة التسعير، ويمكنك اختيار أحد العروض الواردة أو تمديد المهلة لتصلك عروض أخرى.')
              : L('The pricing deadline has passed. Extend it to receive offers.', 'قیمت کی مہلت ختم ہو گئی۔ آفرز کے لیے مہلت بڑھائیں۔', 'انتهت مهلة التسعير. مدّد المهلة لتصلك العروض.')}
          </div>
        )}

        {/* the chosen offer → the deal */}
        {acceptedOffer && (
          <div className="rounded-2xl p-4 sm:p-5 border border-[#0F6E56]/30 bg-[#E7F4EF] mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-[#0F6E56]">{L('You chose the offer from', 'آپ نے یہ آفر منتخب کی:', 'اخترت عرض')} {acceptedOffer.supplier?.company_name_ar}</h3>
              <p className="text-sm text-gray-700">{money(offerComparable(acceptedOffer))} {SAR} · {vatTag(acceptedOffer, locale)}</p>
              <p className="text-xs text-gray-600 mt-0.5">{dealStage(acceptedOffer, 'buyer', locale).label}</p>
            </div>
            <Link href={`/contractor/orders/${acceptedOffer.id}#deal`} className="min-h-11 inline-flex items-center justify-center gap-1 px-5 rounded-xl text-sm font-extrabold shrink-0" style={{ background: '#D4A543', color: '#071827' }}>
              {L('Follow the deal', 'ڈیل دیکھیں', 'متابعة الصفقة')} <span aria-hidden="true">{FWD}</span>
            </Link>
          </div>
        )}

        {/* ═══ ترسية بند-بند: أفضل مورد لكل مادة (طلب متعدّد المواد) ═══ */}
        {isMulti && (() => {
          const items: any[] = rfq.items
          const finalized = rfq.status !== 'open'
          const entryFor = (o: any, it: any, idx: number) => {
            const list = Array.isArray(o.item_prices) ? o.item_prices : []
            // by name only for old offers without line numbers (two «حديد تسليح» lines must not share a price)
            return list.find((ip: any) => ip.item_index === idx) || (list.some((ip: any) => ip.item_index != null) ? undefined : list.find((ip: any) => ip.product_name === it.product_name && (!it.sub_category || (ip.sub_category || null) === (it.sub_category || null))))
          }

          // ── one supplier for every material vs the cheapest mix (UX-188) ──
          const full = activeOffers.filter((o: any) => items.every((it: any, idx: number) => Number(entryFor(o, it, idx)?.total) > 0))
            .map((o: any) => ({ o, total: items.reduce((t: number, it: any, idx: number) => t + lineComparable(entryFor(o, it, idx).total, o), 0) + lineComparable(extrasOf(o), o) }))
            .sort((a: any, b: any) => a.total - b.total)
          const single = full[0] || null
          const mixPicks = items.map((it: any, idx: number) => cheapestFor(it, idx, activeOffers)).filter(Boolean) as any[]
          const mixOffers = [...new Set(mixPicks.map((p: any) => p.offer.id))]
          const mixTotal = mixPicks.reduce((t: number, p: any) => t + lineComparable(p.entry.total, p.offer), 0)
            + mixOffers.reduce((t: number, oid: any) => { const o = activeOffers.find((x: any) => x.id === oid); return t + lineComparable(extrasOf(o), o) }, 0)
          const allOnSingle = !!single && items.every((_: any, idx: number) => awards[idx]?.offer_id === single.o.id)
          const showSingle = rfq.status === 'open' && !!single && mixOffers.length > 1 && mixPicks.length === items.length && !allOnSingle

          // ── the summary of the choices, per supplier (choiceTotals: the same numbers in the dialog) ──
          const { list, grand, grandNet, pending } = totals
          const vatAmt = grand - grandNet
          const allNoVat = list.length > 0 && list.every((v: any) => v.noVat)
          const mixedVat = list.some((v: any) => v.noVat) && !allNoVat
          const nItems = items.length
          const countMaterials = (n: number) => L(`${n} material${n === 1 ? '' : 's'}`, `${n} اشیاء`, arCount(n, 'مادة واحدة', 'مادتان', 'مواد', 'مادة'))
          const countSuppliers = (n: number) => L(`${n} supplier${n === 1 ? '' : 's'}`, `${n} سپلائرز`, arCount(n, 'مورد واحد', 'موردان', 'موردين', 'مورداً'))
          // after «من» (genitive): «من موردَين» (UX-139)
          const countSuppliersGen = (n: number) => L(`${n} supplier${n === 1 ? '' : 's'}`, `${n} سپلائرز`, arCount(n, 'مورد واحد', 'موردَين', 'موردين', 'مورداً'))
          const sortLabel = awardSort === 'rated' ? L('Top rated', 'بہترین کارکردگی', 'الأعلى تقييماً') : awardSort === 'fastest' ? L('Fastest', 'سب سے تیز', 'الأسرع') : awardSort === 'nearest' ? L('Nearest', 'سب سے قریب', 'الأقرب') : L('Cheapest', 'سب سے سستا', 'الأرخص')
          const chosenBadge = (
            finalized
              ? <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 text-emerald-800">{L('Chosen', 'منتخب', 'تم الاختيار')}</span>
              : <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: '#F5E6C4', color: '#071827' }}>{L('Chosen, not confirmed yet', 'منتخب، ابھی تصدیق نہیں ہوئی', 'مختار، لم يُؤكَّد بعد')}</span>
          )

          // the comparison table as a spreadsheet for the project owner (UX-195, business buyers)
          const exportCsv = () => {
            const cols = activeOffers
            const esc = (v: any) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }
            const head = [L('Material', 'مال', 'المادة'), L('Quantity', 'مقدار', 'الكمية'), L('Unit', 'یونٹ', 'الوحدة'), ...cols.map((o: any) => o.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد'))]
            const rows = items.map((it: any, idx: number) => [
              getProductLabel(it.product_name, locale), it.quantity, unitL(it.unit),
              ...cols.map((o: any) => { const e = entryFor(o, it, idx); return e && Number(e.total) > 0 ? Math.round(lineComparable(e.total, o)) : '' }),
            ])
            rows.push([L('Delivery and charges', 'ڈیلیوری اور چارجز', 'التوصيل والرسوم'), '', '', ...cols.map((o: any) => Math.round(lineComparable(extrasOf(o), o)) || '')])
            rows.push([L('Price basis', 'قیمت کی بنیاد', 'أساس السعر'), '', '', ...cols.map((o: any) => vatTag(o, locale))])
            const csv = '﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\n')
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
            const a = document.createElement('a'); a.href = url; a.download = `${rfqRef(rfq, locale) || 'comparison'}.csv`; a.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          }

          return (
          <div className="mb-6">
            <div className="mb-3 flex items-end justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900"><Glyph e="🧱" /> {L('Choose a supplier for each material', 'ہر چیز کے لیے سپلائر منتخب کریں', 'اختيار المورد لكل مادة')}</h3>
                <p className="text-xs text-gray-600">{L('Pick the best supplier for each material; one request can be split across several suppliers.', 'ہر مال کے لیے بہترین سپلائر چنیں؛ ایک درخواست کئی سپلائرز میں تقسیم ہو سکتی ہے۔', 'اختر أفضل مورد لكل مادة، ويمكن توزيع الطلب الواحد على أكثر من مورد.')}</p>
                {rfq.status === 'open' && activeOffers.length > 0 && <p className="text-xs font-semibold text-[#8F6820] mt-0.5">{L('Your choice reaches the suppliers only after you tap «Confirm the chosen offers».', 'آپ کا انتخاب سپلائرز تک صرف «منتخب آفرز کی تصدیق کریں» دبانے کے بعد پہنچتا ہے۔', 'لا يصل اختيارك إلى الموردين إلا بعد الضغط على «تأكيد اختيار العروض».')}</p>}
              </div>
              {activeOffers.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 text-xs font-semibold">
                    {[{ k: 'cheapest', l: L('Cheapest', 'سب سے سستا', 'الأرخص') }, { k: 'rated', l: L('Top rated', 'بہترین کارکردگی', 'الأعلى تقييماً') }, { k: 'fastest', l: L('Fastest', 'سب سے تیز', 'الأسرع') }, ...(canSortNearest ? [{ k: 'nearest', l: L('Nearest', 'سب سے قریب', 'الأقرب') }] : [])].map((o: any) => (
                      <button key={o.k} type="button" onClick={() => setAwardSort(o.k)} aria-pressed={awardSort === o.k}
                        className={`min-h-10 px-3 rounded-lg transition-all ${awardSort === o.k ? 'bg-white shadow-sm text-[#0B2438]' : 'text-gray-600'}`}>{o.l}</button>
                    ))}
                  </div>
                  {!home && <button type="button" onClick={exportCsv} className="min-h-11 px-3 rounded-xl text-xs font-bold border border-[#0B2438]/20 text-[#0B2438] hover:bg-[#0B2438]/5"><Glyph e="⬇" /> {L('Download the comparison', 'موازنہ ڈاؤن لوڈ کریں', 'تنزيل جدول المقارنة')}</button>}
                </div>
              )}
            </div>

            {/* one supplier for every material (UX-188): gold for a home buyer, secondary for a business */}
            {showSingle && single && (
              <div className={`mb-3 rounded-xl p-3 sm:p-4 border ${home && !awardedN ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 bg-white'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 text-sm">
                    <div className="font-bold text-[#0B2438]">{L('One supplier for every material', 'تمام اشیاء کے لیے ایک سپلائر', 'مورد واحد لكل المواد')}: {single.o.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</div>
                    <div className="text-gray-700">{L('Total', 'کل', 'الإجمالي')} {money(single.total)} {SAR} {L('including charges', 'چارجز سمیت', 'شاملاً الرسوم')}</div>
                    {mixTotal < single.total - 0.5 && (
                      <div className="text-xs text-gray-600 mt-0.5">{L(
                        `Picking the cheapest saves ${money(single.total - mixTotal)} SAR, but from ${mixOffers.length} suppliers with several deliveries.`,
                        `سب سے سستا چننے سے ${money(single.total - mixTotal)} ریال بچتے ہیں، لیکن ${mixOffers.length} سپلائرز اور کئی ڈیلیوریوں کے ساتھ۔`,
                        `اختيار الأرخص يوفّر ${money(single.total - mixTotal)} ر.س، لكن من ${countSuppliersGen(mixOffers.length)} وبعدة توصيلات.`)}</div>
                    )}
                  </div>
                  <button type="button" disabled={pickingAll} onClick={() => awardOfferAll(single.o.id)}
                    className={`min-h-11 px-4 rounded-xl text-sm font-extrabold shrink-0 disabled:opacity-60 ${home && !awardedN ? '' : 'border border-[#0B2438] text-[#0B2438] bg-white'}`}
                    style={home && !awardedN ? { background: '#D4A543', color: '#071827' } : undefined}>
                    {L('Choose this supplier for all', 'سب کے لیے یہ سپلائر منتخب کریں', 'اختر هذا المورد لكل المواد')}
                  </button>
                </div>
              </div>
            )}
            {activeOffers.length > 0 && rfq.status === 'open' && items.some((it: any, idx: number) => !awards[idx] && cheapestFor(it, idx, activeOffers)) && (
              <div className="mb-3">
              <button type="button" onClick={() => awardCheapestAll(activeOffers)} disabled={pickingAll}
                className={`w-full min-h-12 rounded-xl font-extrabold text-sm disabled:opacity-60 ${(home && showSingle) || awardedN > 0 ? 'border border-[#0B2438] text-[#0B2438] bg-white' : 'text-[#071827]'}`}
                style={(home && showSingle) || awardedN > 0 ? undefined : { background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {pickingAll ? L('Selecting…', 'منتخب ہو رہا ہے…', 'جارٍ الاختيار…') : L('Pick the cheapest for every item', 'ہر چیز کی سب سے سستی منتخب کریں', 'اختر الأرخص لكل المواد')}
              </button>
              <p className="text-xs text-gray-600 text-center mt-1">{L('You can change any item after.', 'بعد میں آپ کوئی بھی چیز بدل سکتے ہیں۔', 'ويمكنك تغيير أي مادة بعدها.')}</p>
              </div>
            )}
            {activeOffers.length === 0 ? (
              noOffersCard
            ) : (
              <div className="space-y-3">
                {items.map((it: any, idx: number) => {
                  const bids = activeOffers.map((o: any) => {
                    const entry = entryFor(o, it, idx)
                    return entry ? { offer: o, entry } : null
                  }).filter(Boolean).sort((a: any, b: any) => {
                    if (awardSort === 'rated') {
                      const d = supplierScore(b.offer.supplier, supplierStats[b.offer.supplier_id]) - supplierScore(a.offer.supplier, supplierStats[a.offer.supplier_id])
                      if (d) return d
                    } else if (awardSort === 'fastest') {
                      const ad = (Number(a.entry.delivery_days ?? a.offer.delivery_days) || 99999)
                      const bd = (Number(b.entry.delivery_days ?? b.offer.delivery_days) || 99999)
                      if (ad !== bd) return ad - bd
                    } else if (awardSort === 'nearest') {
                      const ad = offerDistanceKm(a.offer, refGeo) ?? 9e9
                      const bd = offerDistanceKm(b.offer, refGeo) ?? 9e9
                      if (ad !== bd) return ad - bd
                    }
                    return lineComparable(a.entry.total, a.offer) - lineComparable(b.entry.total, b.offer)
                  }) as any[]
                  const minLine = bids.length ? Math.min(...bids.map((b: any) => lineComparable(b.entry.total, b.offer))) : 0
                  const award = awards[idx]
                  return (
                    <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-sm" style={{ color: '#0B2438' }}>{pname(it.product_name)}</span>
                          <span className="text-xs text-gray-600"> · {(Number(it.quantity) || 0).toLocaleString('en-US')} {unitL(it.unit)}</span>
                          {it.with_install && <span className="text-xs font-bold text-[#0F6E56]"> · <Glyph e="🔧" /> {L('with installation', 'تنصیب سمیت', 'مع التركيب')}</span>}
                        </div>
                        {award ? chosenBadge : <span className="text-xs text-gray-600 whitespace-nowrap">{L(`${bids.length} offer${bids.length === 1 ? '' : 's'}`, `${bids.length} آفرز`, bids.length === 0 ? 'لا عروض' : arCount(bids.length, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً'))}</span>}
                      </div>
                      {(() => {
                        const bg = budgets[idx]
                        const be = budgetEdit
                        if (be && be.idx === idx) return (
                          <div className="px-4 py-2 border-b border-gray-100 space-y-2">
                            <BudgetField home={home} value={be.v} visible={be.vis} unit={unitL(it.unit)} locale={locale}
                              onChange={(v, vis) => setBudgetEdit({ idx, v, vis })} />
                            <div className="flex gap-2">
                              <button type="button" onClick={saveBudget} disabled={budgetSaving} className="min-h-11 text-sm px-4 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: '#0B2438' }}>{budgetSaving ? '…' : L('Save', 'محفوظ کریں', 'حفظ')}</button>
                              <button type="button" onClick={() => setBudgetEdit(null)} className="min-h-11 text-sm px-4 rounded-xl font-semibold text-gray-600 border border-gray-200">{L('Close without saving', 'محفوظ کیے بغیر بند کریں', 'إغلاق دون حفظ')}</button>
                            </div>
                          </div>
                        )
                        if (!bg && rfq.status !== 'open') return null
                        return (
                          <div className="px-4 py-1.5 border-b border-gray-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            {bg ? (<>
                              {home
                                // UX-052: a home buyer sees the most they pay per unit (with VAT)
                                ? <span className="font-semibold text-gray-700">{L('Most you pay per unit', 'فی یونٹ زیادہ سے زیادہ ادائیگی', 'أقصى مبلغ تدفعه للوحدة')}: {money(bg.budget_unit_price * 1.15)} {SAR} / {unitL(it.unit)}</span>
                                : <span className="font-semibold text-gray-700">{L('Your budget', 'آپ کا بجٹ', 'ميزانيتك')}: {L('up to', 'تک', 'حتى')} {bg.budget_unit_price.toLocaleString('en-US')} {SAR} / {unitL(it.unit)} <span className="text-gray-500 font-normal">({L('before VAT', 'VAT سے پہلے', 'قبل الضريبة')})</span></span>}
                              <span className={`px-1.5 py-0.5 rounded-full font-bold ${bg.budget_visible ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{bg.budget_visible ? L('Shown to suppliers', 'سپلائرز کو نظر آتا ہے', 'ظاهرة للموردين') : L('Only you see it', 'صرف آپ دیکھتے ہیں', 'تراها أنت فقط')}</span>
                            </>) : null}
                            {rfq.status === 'open' && (
                              <button type="button" onClick={() => setBudgetEdit({ idx, v: bg ? String(home ? Math.round(bg.budget_unit_price * 1.15 * 100) / 100 : bg.budget_unit_price) : '', vis: !!bg?.budget_visible })} className="min-h-11 font-bold text-[#8F6820] hover:underline">
                                {bg ? L('Edit', 'ترمیم', 'تعديل') : '+ ' + (home ? L('Most you pay per unit (optional)', 'فی یونٹ زیادہ سے زیادہ ادائیگی (اختیاری)', 'أقصى مبلغ تدفعه للوحدة (اختياري)') : L('My budget per unit (optional)', 'فی یونٹ میرا بجٹ (اختیاری)', 'ميزانيتي للوحدة (اختياري)'))}
                              </button>
                            )}
                          </div>
                        )
                      })()}
                      {it.with_install && bids.length > 0 && (() => {
                        const n = bids.filter((b: any) => b.entry.install_offered === true).length
                        if (n === bids.length) return null
                        return (
                          <div className="px-4 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border-b border-amber-100">
                            <Glyph e="🔧" /> {n === 0
                              ? L('You asked for installation; no offer on this item includes it.', 'آپ نے تنصیب مانگی تھی؛ اس آئٹم کی کسی آفر میں تنصیب شامل نہیں۔', 'طلبت التركيب، ولا يشمله أي عرض على هذه المادة.')
                              : L('Some offers include installation and some do not; compare like with like.', 'کچھ آفرز میں تنصیب شامل ہے اور کچھ میں نہیں؛ یکساں آفرز کا موازنہ کریں۔', 'بعض العروض تشمل التركيب وبعضها لا يشمله، فقارن بين العروض المتماثلة.')}
                          </div>
                        )
                      })()}
                      {bids.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-600">{L('No supplier has priced this material yet', 'ابھی کسی سپلائر نے اس مال کی قیمت نہیں دی', 'لا يوجد مورد سعّر هذه المادة بعد')}</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {bids.filter((b: any, r: number) => allBidsFor[idx] || r < TOP_N || (award && award.offer_id === b.offer.id)).map((b: any, r: number) => {
                            const isAwarded = award && award.offer_id === b.offer.id
                            const line = lineComparable(b.entry.total, b.offer)
                            const above = line - minLine
                            const priceExpired = b.offer.price_valid_until && new Date(b.offer.price_valid_until) < new Date()
                            const open = openBid === `${idx}:${b.offer.id}`
                            return (
                              <div key={b.offer.id} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${isAwarded ? (finalized ? 'bg-emerald-50' : 'bg-[#D4A543]/10') : ''} ${freshIds.has(b.offer.id) ? 'ring-2 ring-[#D4A543] ring-inset' : ''}`}>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {r === 0 && bids.length > 1 && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#F5E6C4', color: '#071827' }}>{sortLabel}</span>}
                                    <span className="font-semibold text-sm text-gray-800 break-words">{b.offer.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</span>
                                    {b.offer.supplier?.verification_status === 'verified' && <span title={L('Verified', 'تصدیق شدہ', 'موثّق')} className="text-xs font-bold" style={{ color: '#0F6E56' }}><Glyph e="🛡" /> {L('Verified', 'تصدیق شدہ', 'موثّق')}</span>}
                                    {b.offer.supplier?.rating_avg > 0 && <span className="text-xs text-gray-600"><Glyph e="⭐" /> {b.offer.supplier.rating_avg}</span>}
                                  </div>
                                  {/* the card keeps the essentials; a sourced price is never shown as direct, so a non-direct
                                      source stays visible, the rest (tier, availability, score, approvals) is under «المزيد» */}
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    {it.with_install && (b.entry.install_offered === true
                                      ? <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#0F6E56]/10 text-[#0F6E56]"><Glyph e="🔧" /> {L('Includes installation', 'تنصیب شامل', 'يشمل التركيب')}{installTotalOf(b.entry) > 0 ? ` (${money(lineComparable(installTotalOf(b.entry), b.offer))} ${SAR})` : ` (${L('in the price', 'قیمت میں', 'ضمن السعر')})`}</span>
                                      : <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{L('Without installation', 'تنصیب کے بغیر', 'بدون تركيب')}</span>)}
                                    {priceExpired && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900"><Glyph e="⏱" /> {L('Price expired', 'قیمت کی مدت ختم', 'انتهت صلاحية السعر')}</span>}
                                    {b.offer.supplier && b.offer.supplier.verification_status !== 'verified' && b.offer.supplier.cr_verification_source !== 'wathq' && (
                                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{L('Not verified yet', 'ابھی تصدیق نہیں ہوئی', 'غير موثّق بعد')}</span>
                                    )}
                                    {(b.entry.source_type || b.offer.source_type) && !isDirectSource(b.entry.source_type || b.offer.source_type) && (
                                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800"><SellerIcon name={sourceIcon(b.entry.source_type || b.offer.source_type)} /> {srcPhrase(b.entry.source_type || b.offer.source_type)}</span>
                                    )}
                                    {/* UX-051: a pricing agent's source shop (area only before the deal; fetched once per offer) */}
                                    {sources[b.offer.id] && (() => {
                                      const d = sources[b.offer.id]
                                      const where = [d.area, d.city].filter(Boolean).join('، ')
                                      return <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">{d.revealed && d.name
                                        ? L(`Source shop: ${d.name}`, `ماخذ دکان: ${d.name}`, `المحل المصدر: ${d.name}`)
                                        : where ? L(`Source shop in ${where}`, `ماخذ دکان: ${where}`, `المحل المصدر في ${where}`) : L('Pricing agent', 'قیمت ایجنٹ', 'وسيط تسعير')}</span>
                                    })()}
                                    <button type="button" aria-expanded={open} onClick={() => setOpenBid(open ? null : `${idx}:${b.offer.id}`)} className="min-h-8 inline-flex items-center gap-0.5 text-xs font-bold text-[#8F6820] hover:underline">
                                      {open ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />} {open ? L('Less', 'کم', 'إخفاء') : L('More about the supplier', 'سپلائر کے بارے میں مزید', 'المزيد عن المورد')}
                                    </button>
                                  </div>
                                  {open && (
                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                      {scorePill(b.offer)}
                                      {Array.isArray(b.offer.supplier?.approvals) && b.offer.supplier.approvals.slice(0, 2).map((a: string) => (
                                        <span key={a} className="text-xs font-bold px-1.5 rounded-full" style={{ color: '#0F6E56', background: '#0F6E5614' }}><Glyph e="🏅" /> {approvalLabel(a)}</span>
                                      ))}
                                      {b.offer.supplier?.supplier_tier && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700"><SellerIcon name={tierIcon(b.offer.supplier.supplier_tier)} /> {tierLabel(b.offer.supplier.supplier_tier, locale)}</span>}
                                      {(b.entry.source_type || b.offer.source_type) && isDirectSource(b.entry.source_type || b.offer.source_type) && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800"><SellerIcon name="check" /> {L('Direct from the supplier', 'سپلائر سے براہ راست', 'مباشر من المورد')}</span>}
                                      {b.offer.availability && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700"><SellerIcon name={availabilityIcon(b.offer.availability)} /> {availabilityLabel(b.offer.availability, locale)}</span>}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                    {Number(b.entry.unit_price) > 0 && <span>{money2(buyerLinePrice(b.entry.unit_price, b.offer, home))} {SAR} / {unitL(b.entry.unit || it.unit)}{!home && preVatNote(b.offer, locale) ? ' ' + preVatNote(b.offer, locale) : ''}</span>}
                                    {Number(b.entry.delivery_days ?? b.offer.delivery_days) > 0 ? <span><Glyph e="🚚" /> {L(`Within ${daysText(b.entry.delivery_days ?? b.offer.delivery_days, locale)}`, `${daysText(b.entry.delivery_days ?? b.offer.delivery_days, locale)} میں`, `خلال ${daysText(b.entry.delivery_days ?? b.offer.delivery_days, locale)}`)}</span> : null}
                                    {b.offer.payment_terms ? <span><Glyph e="💳" /> {paymentTermsLabel(b.offer.payment_terms, locale)}</span> : null}
                                    {b.offer.supplier?.city && <span><Glyph e="📍" /> {b.offer.supplier.city}</span>}
                                    {(() => { const km = offerDistanceKm(b.offer, refGeo); return km != null ? <span title={L('Distance from the delivery location', 'ڈیلیوری کی جگہ سے فاصلہ', 'المسافة من موقع التوصيل')}><Glyph e="📏" /> {km < 1 ? '<1' : Math.round(km)} {L('km', 'کلومیٹر', 'كم')}</span> : null })()}
                                    {b.entry.specification && <span title={b.entry.specification} className="truncate max-w-[220px]"><Glyph e="⚙" /> <AutoTr text={b.entry.specification} locale={locale} /></span>}
                                    {b.entry.warranty && <span className="text-[#0F6E56] font-semibold"><Glyph e="🛡" /> {b.entry.warranty}</span>}
                                    {b.entry.attachment_url && <a href={fileHref(b.entry.attachment_url)} target="_blank" rel="noopener noreferrer" onClick={(e: any) => e.stopPropagation()} className="text-[#0B2438] hover:underline"><Glyph e="📎" /> {L('Catalog', 'کیٹلاگ', 'كتالوج')}</a>}
                                    <Link href={`/contractor/rfq/${id}/offer/${b.offer.id}`} className="inline-flex items-center gap-1 min-h-8 font-bold text-xs px-2.5 rounded-full border border-[#0B2438]/30 text-[#0B2438] hover:bg-[#0B2438]/5">{L('Full offer', 'پوری آفر', 'العرض كاملاً')}</Link>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:shrink-0">
                                  <div className="sm:text-end leading-tight">
                                    <div className="font-bold text-sm" style={{ color: '#0B2438' }}>{money(line)} {SAR}</div>
                                    <div className="text-xs text-gray-600 whitespace-normal max-w-[12rem]">{vatTag(b.offer, locale)}</div>
                                    {above >= 1 && minLine > 0 && <div className="text-xs text-gray-600">{L(`${money(above)} SAR above the lowest (${Math.round(above / minLine * 100)}%)`, `سب سے کم سے ${money(above)} ریال زیادہ (${Math.round(above / minLine * 100)}%)`, `أعلى من أقل عرض بـ ${money(above)} ر.س (${Math.round(above / minLine * 100)}%)`)}</div>}
                                    {budgets[idx] && (() => {
                                      const q = Number(b.entry.quantity ?? it.quantity) || 1
                                      const unit = Number(b.entry.unit_price) > 0 ? Number(b.entry.unit_price) : Number(b.entry.total || 0) / q
                                      if (!(unit > 0)) return null
                                      // UX-052: a home buyer compares what they pay (with VAT) with their maximum (stored before VAT)
                                      const over = home
                                        ? overBudget(lineComparable(unit, b.offer), budgets[idx].budget_unit_price * 1.15, q)
                                        : overBudget(preVatUnit(unit, b.offer), budgets[idx].budget_unit_price, q)
                                      return over > 0
                                        ? <div className="text-xs font-bold text-red-700">{L(`Over your budget by ${money(over)} SAR`, `آپ کے بجٹ سے ${money(over)} ریال زیادہ`, `أعلى من ميزانيتك بـ ${money(over)} ر.س`)}</div>
                                        : <div className="text-xs font-bold text-[#0F6E56]">{L('Within your budget', 'آپ کے بجٹ میں', 'ضمن ميزانيتك')}</div>
                                    })()}
                                  </div>
                                  {isAwarded ? chosenBadge : rfq.status === 'open' ? (
                                    <button type="button" onClick={() => awardItem(idx, b.offer.id)} disabled={awarding === `${idx}:${b.offer.id}`}
                                      className="min-h-11 text-sm px-4 rounded-xl font-bold disabled:opacity-50 whitespace-nowrap border border-[#0B2438] text-[#0B2438] bg-white hover:bg-[#0B2438]/5">
                                      {awarding === `${idx}:${b.offer.id}` ? '…' : L('Choose', 'منتخب کریں', 'اختر هذا العرض')}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                          {bids.length > TOP_N && (
                            <button type="button" onClick={() => setAllBidsFor(m => ({ ...m, [idx]: !m[idx] }))}
                              className="w-full min-h-11 px-4 text-xs font-bold text-[#8F6820] hover:bg-[#D4A543]/5">
                              {allBidsFor[idx] ? L('Show the best 3 only', 'صرف بہترین 3', 'اعرض أفضل 3 فقط') : L(`Show all offers (${bids.length})`, `تمام آفرز (${bids.length})`, `اعرض كل العروض (${bids.length})`)}
                            </button>
                          )}
                        </div>
                      )}
                      {award && rfq.status === 'open' && (
                        <div className="px-4 py-1 border-t border-gray-100 bg-gray-50/50">
                          <button type="button" onClick={() => unawardItem(idx)} disabled={awarding === `${idx}:x`} className="min-h-11 text-xs font-semibold text-gray-700 hover:underline disabled:opacity-50">{L('Undo the choice for this material', 'اس چیز کا انتخاب واپس لیں', 'إلغاء اختيار هذه المادة')}</button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* «وفّرت X ريال»: compared with the highest quote for each chosen item (owner 2026-11-14) */}
                {/* UX-139: before confirming it is «ستوفّر نحو …» in gold; green «وفّرت» only once confirmed */}
                {awardedN > 0 && savings && savings.saved >= 1 && (
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3" style={finalized ? { background: '#E7F4EF', borderColor: '#0F6E5633' } : { background: '#FFF8E8', borderColor: '#D4A54366' }}>
                    <span className="w-9 h-9 rounded-full grid place-items-center shrink-0 font-extrabold" style={finalized ? { background: '#0F6E56', color: '#fff' } : { background: '#D4A543', color: '#071827' }}><Glyph e="💰" /></span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-[15px]" style={{ color: finalized ? '#0F6E56' : '#8F6820' }}>{finalized
                        ? L(`You saved ${money(savings.saved)} SAR`, `آپ نے ${money(savings.saved)} ریال بچائے`, `وفّرت ${money(savings.saved)} ر.س`)
                        : L(`You will save about ${money(savings.saved)} SAR when you confirm`, `تصدیق پر آپ تقریباً ${money(savings.saved)} ریال بچائیں گے`, `ستوفّر نحو ${money(savings.saved)} ر.س عند التأكيد`)}</div>
                      <div className="text-xs text-gray-700">{L('Compared with the highest offer for each material you chose.', 'ہر منتخب چیز کی سب سے زیادہ آفر کے مقابلے میں۔', 'مقارنةً بأعلى عرض لكل مادة اخترتها.')}</div>
                    </div>
                  </div>
                )}

                {/* the sticky confirm bar above the phone's bottom bar (UX-014) */}
                {awardedN > 0 && !finalized && (
                  <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-3 z-30 rounded-xl border border-[#D4A543]/60 bg-white shadow-lg px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#0B2438]">{L(`Chosen ${awardedN} of ${nItems}`, `${nItems} میں سے ${awardedN} منتخب`, `اخترت ${awardedN} من ${nItems}`)} · {money(grand)} {SAR}
                      {pending >= 1 && <span className="block text-xs font-semibold text-gray-600">{L(`+ delivery charges up to ${money(pending)} SAR, confirmed by the supplier after you confirm`, `+ ڈیلیوری چارجز زیادہ سے زیادہ ${money(pending)} ریال، سپلائر تصدیق کے بعد کنفرم کرے گا`, `+ رسوم توصيل حتى ${money(pending)} ر.س يؤكّدها المورد بعد التأكيد`)}</span>}</span>
                    <button type="button" onClick={finalizeAwards} disabled={finalizing} className="min-h-11 px-4 rounded-xl text-sm font-extrabold disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>
                      {finalizing ? '…' : L('Confirm the chosen offers', 'منتخب آفرز کی تصدیق کریں', 'تأكيد اختيار العروض')}
                    </button>
                  </div>
                )}

                {/* the summary of the choices, per supplier */}
                {awardedN > 0 && (
                  <div id="award-summary" className="rounded-xl p-4 text-white mt-2 scroll-mt-24" style={{ background: '#0B2438' }}>
                    <h4 className="font-bold text-sm mb-2"><Glyph e="📦" /> {L('Your choices', 'آپ کا انتخاب', 'ملخص اختيارك')} ({awardedN}/{nItems} · {countSuppliers(list.length)})</h4>
                    {list.map((v: any, i: number) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm py-2 border-b border-white/10 gap-1 sm:gap-2">
                        <span className="flex items-center gap-2 flex-wrap">{v.name} <span className="text-white/70 text-xs">({countMaterials(v.count)})</span>
                          {finalized
                            ? <Link href={`/contractor/orders/${v.offerId}#deal`} className="inline-flex items-center gap-1 min-h-8 text-xs px-2.5 rounded-full font-bold" style={{ background: '#D4A543', color: '#071827' }}>{L('Follow the deal', 'ڈیل دیکھیں', 'متابعة الصفقة')} <span aria-hidden="true">{FWD}</span></Link>
                            : v.phone && <a href={waLink(v.phone, L('Regarding my choice of materials on Taseerak', 'تسعیرک پر میرے انتخاب کے بارے میں', 'بخصوص اختياري لعروض المواد في منصة تسعيرك')) || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center min-h-8 text-xs px-2.5 rounded-full" style={{ background: '#25D366' }}><Glyph e="💬" /> {L('Contact', 'رابطہ', 'تواصل')}</a>}
                        </span>
                        <span className="sm:text-end">
                          <span className="font-bold whitespace-nowrap block">{money(v.gross)} {SAR}</span>
                          {v.exIncluded > 0 && <span className="text-xs text-white/70 block">{L(`incl. delivery and charges ${money(v.exIncluded)}`, `ڈیلیوری اور چارجز ${money(v.exIncluded)} سمیت`, `يشمل التوصيل والرسوم ${money(v.exIncluded)}`)}</span>}
                          {v.exPending > 0 && <span className="text-xs text-amber-200 block">{L(`+ charges up to ${money(v.exPending)}, confirmed by the supplier`, `+ چارجز زیادہ سے زیادہ ${money(v.exPending)}، سپلائر تصدیق کرے گا`, `+ رسوم حتى ${money(v.exPending)} يؤكّدها المورد`)}</span>}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between font-extrabold mt-2 pt-1 gap-2">
                      <span>{pending >= 1 ? L('Amount so far', 'اب تک کی رقم', 'المبلغ حتى الآن') : home ? L('The amount you pay', 'آپ کی ادا کردہ رقم', 'المبلغ الذي تدفعه') : allNoVat || mixedVat ? L('Total', 'کل', 'الإجمالي') : L('Total incl. 15% VAT', 'کل رقم (15% VAT سمیت)', 'الإجمالي (يشمل ضريبة القيمة المضافة 15%)')}</span><span className="text-lg" style={{ color: '#F5C55B' }}>{money(grand)} {SAR}</span>
                    </div>
                    {!allNoVat && vatAmt >= 1 && (
                      <div className="text-xs text-white/70 text-end">
                        {mixedVat
                          ? L(`of which VAT ${money(vatAmt)} SAR, on the offers of VAT-registered suppliers only`, `جس میں VAT ${money(vatAmt)} ریال، صرف رجسٹرڈ سپلائرز کی آفرز پر`, `منها ضريبة القيمة المضافة ${money(vatAmt)} ر.س على عروض الموردين المسجّلين فقط`)
                          : home ? L(`includes VAT ${money(vatAmt)} SAR`, `VAT ${money(vatAmt)} ریال شامل`, `يشمل ضريبة القيمة المضافة ${money(vatAmt)} ر.س`)
                          : `${L('Before VAT', 'ٹیکس سے پہلے', 'قبل الضريبة')} ${money(grandNet)} ${SAR} · ${L('VAT 15%', 'ٹیکس 15%', 'الضريبة 15%')} ${money(vatAmt)} ${SAR}`}
                      </div>
                    )}
                    {pending >= 1 && !finalized && (
                      <p className="text-xs font-semibold text-amber-200 mt-1 text-end">{L(`+ delivery charges up to ${money(pending)} SAR, confirmed by the supplier after you confirm`, `+ ڈیلیوری چارجز زیادہ سے زیادہ ${money(pending)} ریال، سپلائر تصدیق کے بعد کنفرم کرے گا`, `+ رسوم توصيل حتى ${money(pending)} ر.س يؤكّدها المورد بعد التأكيد`)}</p>
                    )}
                    {!finalized && awardedN < nItems && (
                      <p className="text-xs font-semibold text-amber-200 mt-2">{L(`You chose ${awardedN} of ${nItems} materials; the rest will not be ordered.`, `آپ نے ${nItems} میں سے ${awardedN} اشیاء منتخب کیں؛ باقی آرڈر نہیں ہوں گی۔`, `اخترت ${awardedN} من ${nItems} مواد، والمواد الباقية لن تُطلب.`)}</p>
                    )}
                    {finalized ? (
                      <p className="text-xs text-emerald-200 mt-3">{L('Confirmed. Open each supplier’s deal to follow delivery, receipt and payment.', 'کنفرم ہو گیا۔ ڈیلیوری، وصولی اور ادائیگی کے لیے ہر سپلائر کی ڈیل کھولیں۔', 'تمّ التأكيد. افتح صفقة كل مورد لمتابعة التسليم والاستلام والدفع.')}</p>
                    ) : (
                      <button type="button" onClick={finalizeAwards} disabled={finalizing}
                        className="w-full mt-3 min-h-12 rounded-xl font-extrabold text-sm disabled:opacity-50 transition-all hover:shadow bg-white text-[#0B2438]">{/* UX-049: the sticky bar keeps the one gold confirm */}
                        {finalizing ? '…' : L('Confirm the chosen offers', 'منتخب آفرز کی تصدیق کریں', 'تأكيد اختيار العروض')}
                      </button>
                    )}
                    {/* owner 2026-11-19: before choosing, show how payment and delivery work */}
                    <a href="/deal-protection" target="_blank" rel="noopener" className="block text-center text-xs text-white/70 underline mt-2 min-h-8 leading-8">
                      {L('How payment, delivery and deal protection work', 'ادائیگی، ڈیلیوری اور ڈیل کا تحفظ کیسے کام کرتا ہے', 'كيف يتم الدفع والتسليم وحماية الصفقة')}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          )
        })()}

        {/* Offers list: one-material requests only (several materials are chosen per material above) */}
        {!isMulti && (<>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-900">{L('Offers', 'آفرز', 'العروض')} ({offers.length})</h3>
          {marketAvg && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-800"><Glyph e="📊" /> {L('Market average before VAT:', 'VAT سے پہلے مارکیٹ اوسط:', 'متوسط السوق قبل الضريبة:')}</span>
              <span className="text-sm font-bold text-amber-900">{marketAvg?.toLocaleString('en-US')} {SAR} / {unitL(rfq.unit) || L('unit', 'یونٹ', 'وحدة')}</span>
            </div>
          )}
        </div>
        {offers.length > 1 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs font-bold text-gray-700">{L('Best 3 by:', 'بہترین 3:', 'أفضل 3 حسب:')}</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 text-xs font-semibold">
              {([['price_asc', L('Cheapest', 'سب سے سستا', 'الأرخص')], ['rating', L('Top rated', 'بہترین کارکردگی', 'الأعلى تقييماً')], ['delivery', L('Fastest', 'سب سے تیز', 'الأسرع')], ...(canSortNearest ? [['nearest', L('Nearest', 'سب سے قریب', 'الأقرب')]] : [])] as [string, string][]).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setSortBy(k)} aria-pressed={sortBy === k}
                  className={`min-h-10 px-3 rounded-lg transition-all ${sortBy === k ? 'bg-white shadow-sm text-[#0B2438]' : 'text-gray-600'}`}>{l}</button>
              ))}
            </div>
            <select value={tierFilter} onChange={(e: any) => setTierFilter(e.target.value)} aria-label={L('Supplier type', 'سپلائر کی قسم', 'نوع المورد')} className="min-h-11 text-base sm:text-xs border border-gray-200 rounded-xl px-2 bg-white text-gray-700">
              <option value="">{L('All suppliers', 'تمام سپلائرز', 'كل الموردين')}</option>
              {TIERS.map(tr => <option key={tr} value={tr}>{tierLabel(tr, locale)}</option>)}
            </select>
            <button type="button" onClick={() => setOnlyVerified(v => !v)} aria-pressed={onlyVerified}
              className={`min-h-11 text-xs px-3 rounded-xl border font-semibold transition-all ${onlyVerified ? 'border-[#D4A543] bg-[#D4A543]/15 text-[#0B2438]' : 'bg-white text-gray-700 border-gray-200'}`}>
              <Glyph e="🛡" /> {L('Verified only', 'صرف تصدیق شدہ', 'موثّق فقط')}</button>
            {(onlyVerified || tierFilter) && <span className="text-xs text-gray-600">({displayedOffers.length} {L('of', 'میں سے', 'من')} {offers.length})</span>}
          </div>
        )}

        {/* UX-168: a home buyer gets one line that sums up the offers */}
        {home && activeOffers.length > 1 && cheapestOffer && (
          <div className="mb-3 rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/5 px-4 py-3 text-sm text-[#0B2438]">
            <span className="font-bold">{L(`You have ${activeOffers.length} offers`, `آپ کو ${activeOffers.length} آفرز ملیں`, `وصلك ${arCount(activeOffers.length, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً')}`)}</span>
            {': '}{L(`the lowest ${money(offerComparable(cheapestOffer))} SAR`, `سب سے کم ${money(offerComparable(cheapestOffer))} ریال`, `أقلّها ${money(offerComparable(cheapestOffer))} ر.س`)}
            {fastest ? L(`, the fastest within ${daysText(fastest.delivery_days, locale)}`, `، سب سے تیز ${daysText(fastest.delivery_days, locale)} میں`, `، وأسرعها خلال ${daysText(fastest.delivery_days, locale)}`) : ''}.
          </div>
        )}

        {/* AI adviser to compare the offers (navy with a gold accent, UX-006) */}
        {offers.length > 1 && (
          <div className="mb-3">
            {!aiCmp ? (
              <button type="button" onClick={runCompare} disabled={cmpLoading}
                className="w-full min-h-11 rounded-xl font-bold text-white text-sm disabled:opacity-60 transition-all hover:shadow border border-[#D4A543]/50"
                style={{ background: '#0B2438' }}>
                <Glyph e="✨" /> {cmpLoading ? L('Analyzing the offers…', 'آفرز کا تجزیہ ہو رہا ہے…', 'جارٍ تحليل العروض…') : L('Analyze the offers and suggest the best', 'آفرز کا تجزیہ کر کے بہترین بتائیں', 'حلّل العروض واقترح الأفضل')}
              </button>
            ) : aiCmp.ai ? (
              <div className="rounded-xl p-4 border border-[#D4A543]/50 bg-[#D4A543]/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#0B2438]"><Glyph e="✨" /> {L('Suggestion', 'تجویز', 'اقتراح المساعد')}</span>
                  <button type="button" onClick={() => setAiCmp(null)} className="min-h-11 px-2 text-xs text-gray-600 hover:text-gray-800">{L('Hide', 'چھپائیں', 'إخفاء')}</button>
                </div>
                {aiCmp.best_supplier && <div className="text-sm mb-1.5 font-bold text-[#0B2438]"><Glyph e="🏆" /> {L('Best value:', 'بہترین قیمت:', 'الأفضل قيمةً:')} {aiCmp.best_supplier}</div>}
                <p className="text-xs text-gray-700 leading-relaxed mb-2 whitespace-pre-line">{aiCmp.summary}</p>
                {aiCmp.advice && <p className="text-xs font-semibold rounded-lg p-2 bg-white" style={{ color: '#0B2438' }}><Glyph e="💡" /> {aiCmp.advice}</p>}
                <p className="text-xs text-gray-600 mt-2">{L('Guidance only; the final decision is yours.', 'صرف رہنمائی ہے؛ آخری فیصلہ آپ کا ہے۔', 'اقتراح إرشادي، والقرار النهائي لك.')}</p>
              </div>
            ) : (
              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                <span>{aiCmp.message || L('Analysis is not available right now', 'تجزیہ ابھی دستیاب نہیں', 'التحليل غير متاح حالياً')}</span>
                <button type="button" onClick={() => setAiCmp(null)} className="min-w-11 min-h-11 -m-2 text-gray-600 shrink-0" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
              </div>
            )}
          </div>
        )}

        {offers.length === 0 ? (
          noOffersCard
        ) : (
          <div className="space-y-3">
            {displayedOffers.slice(0, showAllOffers ? undefined : TOP_N).map((offer: any, i: number) => {
              const comparable = offerComparable(offer)
              const above = comparable - minPrice
              const rejected = offer.status === 'rejected'
              const exList: any[] = Array.isArray(offer.extra_charges) ? offer.extra_charges : []
              const exSum = exList.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
              return (
              <div key={offer.id} className={`bg-white rounded-xl p-4 sm:p-5 border shadow-sm transition-all ${
                offer.status === 'accepted' ? 'border-emerald-300 bg-emerald-50' :
                rejected ? 'border-gray-200 opacity-60' : 'border-gray-100 hover:border-[#D4A543]/60'
              } ${freshIds.has(offer.id) ? 'ring-2 ring-[#D4A543]' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {!rejected && (
                      <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold" style={i === 0 ? { background: '#D4A543', color: '#071827' } : { background: '#0B2438', color: '#fff' }}>
                        {i + 1}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{offer.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد')}</span>
                        {offerBadges(offer).map(bd => (
                          <span key={bd.k} className="badge text-xs font-bold" style={bd.gold ? { background: '#D4A543', color: '#071827' } : { background: '#0B2438', color: '#fff' }}>{bd.label}</span>
                        ))}
                        {offer.supplier?.supplier_tier && (
                          <span className={`badge text-xs ${
                            normTier(offer.supplier.supplier_tier) === 'company' ? 'bg-[#0B2438]/10 text-[#0B2438]' :
                            normTier(offer.supplier.supplier_tier) === 'shop' ? 'bg-[#D4A543]/15 text-[#0B2438]' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <SellerIcon name={tierIcon(offer.supplier.supplier_tier)} /> {tierLabel(offer.supplier.supplier_tier, locale)}
                          </span>
                        )}
                        {/* where the price comes from: a sourced quote is never shown as a direct one */}
                        {offer.source_type && (!isDirectSource(offer.source_type) || offerMore[offer.id]) && (
                          <span className={`badge text-xs ${isDirectSource(offer.source_type) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
                            title={isDirectSource(offer.source_type) ? L('Direct price from the supplier', 'سپلائر سے براہ راست قیمت', 'سعر مباشر من المورد') : L('The goods come from another source, not the supplier’s own stock', 'سامان کسی دوسرے ذریعے سے ہے، سپلائر کے اپنے اسٹاک سے نہیں', 'مصدر البضاعة جهة أخرى، وليس مخزون المورد')}>
                            {isDirectSource(offer.source_type) ? <><SellerIcon name="check" /> {L('Direct from the supplier', 'سپلائر سے براہ راست', 'مباشر من المورد')}</> : <><SellerIcon name={sourceIcon(offer.source_type)} /> {srcPhrase(offer.source_type)}</>}
                          </span>
                        )}
                        {offerMore[offer.id] && offer.availability && <span className="badge text-xs bg-gray-50 text-gray-700"><SellerIcon name={availabilityIcon(offer.availability)} /> {availabilityLabel(offer.availability, locale)}</span>}
                        {normTier(offer.supplier?.supplier_tier) === 'independent' && <div className="basis-full"><SourceShopBadge offerId={offer.id} locale={locale} compact /></div>}
                        {offer.supplier?.verification_status === 'verified' && (
                          <span className="badge text-xs inline-flex items-center gap-0.5"
                            style={offer.supplier?.cr_verification_source === 'wathq'
                              ? { background: '#0F6E56', color: '#fff' }
                              : { background: '#E1F5EE', color: '#0F6E56' }}>
                            {offer.supplier?.cr_verification_source === 'wathq' ? L('Verified via Wathq', 'واثق کے ذریعے تصدیق شدہ', 'موثّق عبر واثق') : L('Verified', 'تصدیق شدہ', 'موثّق')}
                          </span>
                        )}
                        {offerMore[offer.id] && offer.supplier && offer.supplier.verification_status !== 'verified' && offer.supplier.cr_verification_source !== 'wathq' && (
                          <span className="badge text-xs bg-gray-100 text-gray-600" title={L('The supplier has not verified their CR yet; rely on their ratings and the price source', 'سپلائر نے ابھی کمرشل رجسٹریشن کی تصدیق نہیں کی؛ اس کی ریٹنگ اور قیمت کے ذریعے پر بھروسہ کریں', 'لم يوثّق المورد سجله التجاري بعد؛ اعتمد على تقييماته ومصدر السعر')}>{L('Not verified yet', 'ابھی تصدیق نہیں ہوئی', 'غير موثّق بعد')}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600 mt-0.5">
                        {offer.supplier?.rating_avg > 0 && <span><Glyph e="⭐" /> {offer.supplier.rating_avg}</span>}
                        {offer.supplier?.region && <span><Glyph e="📍" /> {offer.supplier.region}</span>}
                        {offer.price_valid_until && (new Date(offer.price_valid_until) < new Date()
                          ? <span className="text-amber-800 font-semibold"><Glyph e="⏱" /> {L('Price expired; confirm it with the supplier', 'قیمت کی مدت ختم؛ سپلائر سے کنفرم کریں', 'انتهت صلاحية السعر، فتأكّد منه مع المورد')}</span>
                          : <span><Glyph e="⏱" /> {L('Price committed until', 'قیمت اس تاریخ تک پکی:', 'التزم المورد بالسعر حتى')} {new Date(offer.price_valid_until).toLocaleDateString(dloc)}</span>)}
                      </div>
                      {/* the supplier's track record: reply speed, how often chosen, experience */}
                      {(() => {
                        const st = supplierStats[offer.supplier_id]
                        if (!offerMore[offer.id]) return (
                          <button type="button" aria-expanded={false} onClick={() => setOfferMore(p => ({ ...p, [offer.id]: true }))} className="mt-1 min-h-8 inline-flex items-center gap-0.5 text-xs font-bold text-[#8F6820] hover:underline">
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" /> {L('More about the supplier', 'سپلائر کے بارے میں مزید', 'المزيد عن المورد')}
                          </button>
                        )
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {scorePill(offer)}
                            {!st || isNewSupplier(offer)
                              ? <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{L('New supplier on the platform', 'پلیٹ فارم پر نیا سپلائر', 'مورد جديد على المنصة')}</span>
                              : <>
                                {st.avg_response_hours != null && (
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold"><Glyph e="⚡" /> {L(`Usually replies within ${Math.max(1, Math.round(st.avg_response_hours))} h`, `عموماً ${Math.max(1, Math.round(st.avg_response_hours))} گھنٹے میں جواب`, `يردّ عادةً خلال ${arCount(Math.max(1, Math.round(st.avg_response_hours)), 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`)}</span>
                                )}
                                {st.won_rate != null && Number(st.won_rate) > 0 && (
                                  <span className="text-xs bg-[#D4A543]/10 text-[#0B2438] px-2 py-0.5 rounded-full font-semibold"><Glyph e="🤝" /> {L('Chosen in', 'منتخب ہونے کی شرح', 'نسبة اختيار عروضه')} {st.won_rate}%</span>
                                )}
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"><Glyph e="📨" /> {L(`${st.total_offers} past offers`, `${st.total_offers} پچھلی آفرز`, arCount(Number(st.total_offers) || 0, 'عرض سابق واحد', 'عرضان سابقان', 'عروض سابقة', 'عرضاً سابقاً'))}</span>
                              </>}
                            <button type="button" aria-expanded={true} onClick={() => setOfferMore(p => ({ ...p, [offer.id]: false }))} className="min-h-8 inline-flex items-center gap-0.5 text-xs font-bold text-[#8F6820] hover:underline">
                              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> {L('Hide', 'چھپائیں', 'إخفاء')}
                            </button>
                          </div>
                        )
                      })()}
                      {/* the contact number / WhatsApp never shows before the choice: talk and negotiate in
                          the in-app chat and the discount request (anti-disintermediation) */}
                    </div>
                  </div>
                  <div className="sm:text-end sm:shrink-0">
                    {home ? (<>
                      <div className="text-xs text-gray-600">{L('The amount you pay', 'آپ کی ادا کردہ رقم', 'المبلغ الذي تدفعه')}</div>
                      <div className="text-xl font-bold" style={{ color: '#0B2438' }}>{money(comparable)} {SAR}</div>
                      <div className="text-xs text-gray-600 whitespace-normal sm:max-w-[14rem]">{vatTag(offer, locale)}{exSum > 0 ? ` · ${L(`includes delivery ${money(lineComparable(exSum, offer))} SAR`, `ڈیلیوری ${money(lineComparable(exSum, offer))} ریال شامل`, `يشمل التوصيل ${money(lineComparable(exSum, offer))} ر.س`)}` : ''}</div>
                    </>) : (<>
                      <div className="text-xl font-bold" style={{ color: '#0B2438' }}>{money(comparable)} <span className="text-sm">{SAR}</span></div>
                      <div className="text-xs text-gray-600 whitespace-normal sm:max-w-[14rem]">{vatTag(offer, locale)}</div>
                      {showsVatBreakdown(offer) && !offer.vat_included && <div className="text-xs text-gray-600">{L('before VAT', 'VAT سے پہلے', 'قبل الضريبة')} {Number(offer.total_price || 0).toLocaleString('en-US')}</div>}
                    </>)}
                    {!rejected && above >= 1 && minPrice > 0 && <div className="text-xs text-gray-600">{L(`${money(above)} SAR above the lowest (${Math.round(above / minPrice * 100)}%)`, `سب سے کم سے ${money(above)} ریال زیادہ (${Math.round(above / minPrice * 100)}%)`, `أعلى من أقل عرض بـ ${money(above)} ر.س (${Math.round(above / minPrice * 100)}%)`)}</div>}
                    {marketAvg && Number(offer.unit_price) > 0 && (() => {
                      // UX-080: both sides before VAT
                      const upPre = preVatUnit(Number(offer.unit_price), offer)
                      const diff = Math.abs(((upPre - marketAvg) / marketAvg * 100)).toFixed(0)
                      const isLow = upPre < marketAvg
                      return (
                        <div className={`text-xs font-bold mt-0.5 ${isLow ? 'text-[#0F6E56]' : 'text-amber-800'}`}>
                          {isLow ? `${diff}% ${L('below market', 'مارکیٹ سے کم', 'دون السوق')}` : `${diff}% ${L('above market', 'مارکیٹ سے زیادہ', 'فوق السوق')}`}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                  {Number(offer.unit_price) > 0 && <span>{L('Unit price:', 'فی یونٹ قیمت:', 'سعر الوحدة:')} {money2(buyerLinePrice(offer.unit_price, offer, home))} {SAR}{!home && preVatNote(offer, locale) ? ' ' + preVatNote(offer, locale) : ''}</span>}
                  {Number(offer.delivery_days) > 0 && <span><Glyph e="🚚" /> {L('Delivery:', 'ڈیلیوری:', 'التوصيل:')} {L(`within ${daysText(offer.delivery_days, locale)}`, `${daysText(offer.delivery_days, locale)} میں`, `خلال ${daysText(offer.delivery_days, locale)}`)}</span>}
                  {offer.payment_terms && <span><Glyph e="💳" /> {paymentTermsLabel(offer.payment_terms, locale)}</span>}
                </div>

                {/* per-item pricing */}
                {Array.isArray(offer.item_prices) && offer.item_prices.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                    <div className="bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-gray-600 flex justify-between gap-2">
                      <span><Glyph e="🧾" /> {L('Item pricing', 'آئٹمز کی قیمتیں', 'تسعير المواد')} ({offer.item_prices.length})</span><span>{home ? L('What you pay', 'آپ کی ادائیگی', 'المبلغ الذي تدفعه') : priceBasisLabel(offer, locale)}</span>
                    </div>
                    {offer.item_prices.map((it: any, idx: number) => (
                      <div key={idx} className="px-2.5 py-1.5 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-700 min-w-0">
                          {it.attachment_url && <span title={L('Has a catalog', 'کیٹلاگ موجود ہے', 'يوجد كتالوج')}><Glyph e="📎" /> </span>}
                          {pname(it.product_name)} <span className="text-gray-500">({Number(it.unit_price) > 0 ? `${money2(buyerLinePrice(it.unit_price, offer, home))} × ` : ''}{(Number(it.quantity) || 0).toLocaleString('en-US')} {unitL(it.unit)})</span>
                          {it.install_offered === true && <span className="text-[#0F6E56] font-semibold"> · {L('incl. installation', 'تنصیب سمیت', 'يشمل التركيب')}{installTotalOf(it) > 0 ? ` ${money2(buyerLinePrice(installTotalOf(it), offer, home))}` : ''}</span>}
                          {it.install_offered === false && <span className="text-gray-500"> · {L('without installation', 'تنصیب کے بغیر', 'بدون تركيب')}</span>}
                        </span>
                        <span className="font-bold text-gray-900 whitespace-nowrap">{money2(buyerLinePrice(it.total, offer, home))} {SAR}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* the bill: goods + charges, then one clear total (UX-019) */}
                {exList.length > 0 && !home && (() => {
                  const goods = (Number(offer.total_price) || 0) - exSum
                  const netBasis = showsVatBreakdown(offer) && !offer.vat_included
                  return (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-2 text-xs">
                      <div className="flex justify-between text-gray-700"><span>{L('Goods', 'مال', 'البضاعة')}</span><span>{goods.toLocaleString('en-US')} {SAR}</span></div>
                      {exList.map((e: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-amber-900"><span>+ {e.label}</span><span>{Number(e.amount).toLocaleString('en-US')} {SAR}</span></div>
                      ))}
                      {netBasis && <div className="flex justify-between text-gray-700 border-t border-amber-200 mt-1 pt-1"><span>{L('Subtotal before VAT', 'VAT سے پہلے کل', 'المجموع قبل الضريبة')}</span><span>{Number(offer.total_price).toLocaleString('en-US')} {SAR}</span></div>}
                      <div className={`flex justify-between font-bold text-gray-900 ${netBasis ? '' : 'border-t border-amber-200 mt-1 pt-1'}`}><span>{totalLabel(offer, locale)}</span><span>{money(comparable)} {SAR}</span></div>
                    </div>
                  )
                })()}

                {offer.notes && <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg mb-2"><AutoTr text={offer.notes} locale={locale} /></p>}

                {/* product attributes */}
                {offer.attributes && Object.keys(offer.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Object.entries(offer.attributes).map(([k, v]: any) => (
                      <span key={k} className="text-xs bg-[#D4A543]/10 text-[#8F6820] px-2 py-1 rounded-lg">
                        <strong>{k}:</strong> {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* attachment + location */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {offer.attachment_url && (
                    <a href={fileHref(offer.attachment_url)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-8 text-xs bg-[#0B2438]/10 text-[#0B2438] px-2 rounded-lg font-semibold hover:bg-[#0B2438]/20 transition-all">
                      <Glyph e="📎" /> {offer.attachment_name || L('Catalog', 'کیٹلاگ', 'كتالوج')}
                    </a>
                  )}
                  {offer.supplier?.latitude && offer.supplier?.longitude && (
                    <a href={`https://www.google.com/maps?q=${offer.supplier.latitude},${offer.supplier.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-8 text-xs bg-[#0B2438]/5 text-[#0B2438] px-2 rounded-lg font-semibold hover:bg-[#0B2438]/10 transition-all">
                      <Glyph e="🗺" /> {L('Supplier location', 'سپلائر کا مقام', 'موقع المورد')}
                    </a>
                  )}
                  {offer.supplier?.national_short_address && (
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg font-mono" dir="ltr">
                      <Glyph e="🏛" /> {offer.supplier.national_short_address}
                    </span>
                  )}
                </div>

                <Link href={`/contractor/rfq/${id}/offer/${offer.id}`}
                  className="flex items-center justify-center gap-1 min-h-11 text-sm font-semibold rounded-xl border border-[#0B2438]/20 text-[#0B2438] hover:bg-[#0B2438]/5 transition-all mb-2">
                  {L('Full offer', 'پوری آفر', 'العرض كاملاً')} <span aria-hidden="true">{FWD}</span>
                </Link>

                {offer.status === 'pending' && canChoose && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => acceptOffer(offer.id)} disabled={!!acceptingId} aria-busy={acceptingId === offer.id}
                      className="flex-1 min-h-11 rounded-xl text-sm font-extrabold transition-colors disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: '#D4A543', color: '#071827' }}>
                      {acceptingId === offer.id ? L('Choosing…', 'منتخب ہو رہی ہے…', 'جارٍ الاختيار…') : L('Choose this offer', 'یہ آفر منتخب کریں', 'اختر هذا العرض')}
                    </button>
                    <button type="button" onClick={() => rejectOffer(offer.id)} disabled={!!acceptingId}
                      className="min-h-11 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      {L('Decline', 'رد کریں', 'رفض')}
                    </button>
                  </div>
                )}

                {/* where the deal stands (chosen → delivered → received → paid) */}
                {offer.status === 'accepted' && (() => {
                  const st = dealStage(offer, 'buyer', locale)
                  const tone = st.key === 'disputed' ? '#B91C1C' : st.done ? '#0F6E56' : '#0B2438'
                  return (
                    <div className="rounded-xl border border-gray-200 bg-white p-2.5 mb-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm" style={{ color: tone }}><Glyph e={st.emoji} /></span>
                        <span className="text-xs font-bold leading-tight" style={{ color: tone }}>{st.label}</span>
                      </div>
                      {st.key !== 'disputed' && (
                        <div className="flex items-end gap-1">
                          {[L('Chosen', 'منتخب', 'الاختيار'), L('Delivered', 'ڈیلیوری', 'التسليم'), L('Received', 'وصولی', 'الاستلام'), L('Paid', 'ادائیگی', 'الدفع')].map((lbl: string, k: number) => (
                            <div key={lbl} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full h-1.5 rounded-full transition-all" style={{ background: k < st.step ? (st.done ? '#0F6E56' : '#0B2438') : k === st.step ? '#D4A543' : '#e5e7eb' }} />
                              <span className="text-xs" style={{ color: k <= st.step ? '#0B2438' : '#6b7280' }}>{lbl}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {offer.status === 'accepted' && (
                  <Link href={`/contractor/orders/${offer.id}#deal`}
                    className="flex items-center justify-center gap-1 min-h-11 rounded-xl text-sm font-extrabold transition-colors" style={{ background: '#D4A543', color: '#071827' }}>
                    {L('Follow the deal', 'ڈیل دیکھیں', 'متابعة الصفقة')} <span aria-hidden="true">{FWD}</span>
                  </Link>
                )}

                {rejected && (
                  <div className="text-center text-xs font-semibold py-1 text-gray-600">{L('Declined', 'رد شدہ', 'مرفوض')}</div>
                )}
              </div>
              )
            })}
            {displayedOffers.length > TOP_N && (
              <button type="button" onClick={() => setShowAllOffers(v => !v)}
                className="w-full min-h-12 rounded-xl border-2 border-dashed border-[#D4A543]/60 text-sm font-bold text-[#8F6820] hover:bg-[#D4A543]/5">
                {showAllOffers ? L('Show the best 3 only', 'صرف بہترین 3', 'اعرض أفضل 3 فقط') : L(`Show all offers (${displayedOffers.length})`, `تمام آفرز (${displayedOffers.length})`, `اعرض كل العروض (${displayedOffers.length})`)}
              </button>
            )}
          </div>
        )}
        </>)}

        {/* delete the request: allowed unless it holds a deal (the server refuses too: the deal is the supplier's as well) */}
        {!acceptedOffer && awardedN === 0 && <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-600 max-w-md leading-relaxed">{L('No longer need this request? Deleting removes it and its offers from your history for good. «Cancel request» only stops offers and keeps it in your history.', 'اب یہ درخواست نہیں چاہیے؟ حذف کرنے سے یہ اور اس کی آفرز ہمیشہ کے لیے ریکارڈ سے ہٹ جائیں گی۔ «درخواست منسوخ کریں» صرف آفرز روکتا ہے اور اسے ریکارڈ میں رکھتا ہے۔', 'ألم تعد بحاجة إلى هذا الطلب؟ الحذف يزيل الطلب وعروضه من سجلك نهائياً، أما «إلغاء الطلب» فيوقف العروض ويُبقيه في سجلك.')}</span>
          <button type="button" onClick={deleteRfq} disabled={deleting}
            className="min-h-11 text-sm font-bold px-4 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition-all disabled:opacity-50">
            {deleting ? '…' : L('Delete request', 'درخواست حذف کریں', 'حذف الطلب')}
          </button>
        </div>}
      </div>
    </AppShell>
  )
}
