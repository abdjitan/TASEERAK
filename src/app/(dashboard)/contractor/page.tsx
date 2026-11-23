'use client'

import { useEffect, useState } from 'react'
import { Check, RotateCcw, Plus } from 'lucide-react'
import { noEmoji, timeAgo as timeAgoText, arCount, arMaterials, arRequests, countLabel, dateLocale } from '@/lib/text'
import Link from 'next/link'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { getProductLabel, getUnitLabelLong, getRegionLabel } from '@/types'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import MarketHero from '@/components/buyer/MarketHero'
import BuyerTypePrompt from '@/components/buyer/BuyerTypePrompt'
import { rememberBuyerType, storedBuyerType } from '@/lib/buyerType'
import { AppIcon } from '@/components/AppIcon'
import { rfqRef, rfqDesc, arItems, rfqDate } from '@/lib/rfqName'
import { formatTimeLeft, deadlineUrgency, urgencyStyle, isExpired } from '@/lib/deadline'
import { dealStage, buyerTodo, buyerActionLabel } from '@/lib/dealStage'
import { rfqState, rfqStatusLabel, rfqStateTone, needsChoice } from '@/lib/rfqState'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { FEATURES } from '@/lib/features'
import { canUseProjects } from '@/lib/plans'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import { cleanArName } from '@/lib/displayName'
import { normalizeText } from '@/lib/normalize'
import { offerComparable, lineComparable } from '@/lib/vat'
import Glyph from '@/components/shared/Glyph'
import { askConfirm } from '@/lib/askConfirm'

const txt = {
  ar: {
    welcome: 'أهلاً',
    activeRfqs: 'طلبات نشطة',
    totalOffers: 'إجمالي العروض',
    completed: 'صفقاتي',
    total: 'إجمالي الطلبات',
    rfqList: 'طلبات التسعير',
    noRfqs: 'لا توجد طلبات بعد',
    noRfqsSub: 'أرسل أول طلب تسعير لتصلك عروض الموردين المختصين بموادك',
    newRfqBtn: 'اطلب سعر أي منتج',
    viewDetails: 'عرض التفاصيل',
    open: 'مفتوح', expired: 'انتهت مهلة العروض', cancelled: 'ملغى',
  },
  en: {
    welcome: 'Hello',
    activeRfqs: 'Active requests',
    totalOffers: 'Total offers',
    completed: 'My deals',
    total: 'Total requests',
    rfqList: 'Price requests',
    noRfqs: 'No requests yet',
    noRfqsSub: 'Send your first price request to get offers from suppliers of your materials',
    newRfqBtn: 'Get a price for any product',
    viewDetails: 'View details',
    open: 'Open', expired: 'Offer window ended', cancelled: 'Cancelled',
  },
  ur: {
    welcome: 'خوش آمدید',
    activeRfqs: 'فعال درخواستیں',
    totalOffers: 'کل آفرز',
    completed: 'میری ڈیلز',
    total: 'کل درخواستیں',
    rfqList: 'قیمت کی درخواستیں',
    noRfqs: 'ابھی تک کوئی درخواست نہیں',
    noRfqsSub: 'پہلی قیمت کی درخواست بھیجیں تاکہ متعلقہ سپلائرز سے آفرز ملیں',
    newRfqBtn: 'کسی بھی چیز کی قیمت معلوم کریں',
    viewDetails: 'تفصیلات دیکھیں',
    open: 'کھلا', expired: 'آفرز کی مہلت ختم', cancelled: 'منسوخ',
  },
}

const sectorLabels = {
  ar: { civil: 'مدني', architectural: 'معماري', electrical: 'كهرباء', mechanical: 'ميكانيكا', equipment: 'آليات ومعدات', supply_store: 'مستلزمات عامة' },
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'General supplies' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'عام سامان' },
}

// «عروض جديدة» only for offers the buyer has not seen yet (UX-066): the offer count seen per request,
// kept on this device when the buyer opens the request
const SEEN_KEY = 'tsk_seen_offers_v1'
function readSeen(): Record<string, number> {
  try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return v && typeof v === 'object' ? v : {} } catch { return {} }
}
function markSeen(id: string, count: number) {
  try { const m = readSeen(); m[id] = count; localStorage.setItem(SEEN_KEY, JSON.stringify(m)) } catch {}
}

export default function ContractorDashboard() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const sectors = (sectorLabels as any)[locale] || sectorLabels.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const fwd = locale === 'en' ? '→' : '←' // the forward arrow in the reading direction (UX-159)

  const [user, setUser] = useState<any>(null)
  const [profileFresh, setProfileFresh] = useState(false)   // the profile came from the DB (not the cached snapshot)
  const [profile, setProfile] = useState<any>(null)
  const [rfqs, setRfqs] = useState<any[]>([])
  const [deals, setDeals] = useState<Record<string, any>>({})
  const [projects, setProjects] = useState<any[]>([])
  const [drafts, setDrafts] = useState<any[]>([])
  const [draftErr, setDraftErr] = useState('')
  const [activity, setActivity] = useState<any[]>([])
  const [marketTop, setMarketTop] = useState<any[]>([])
  const [marketTrend, setMarketTrend] = useState<Record<string, any>>({})
  const [openOffers, setOpenOffers] = useState<Record<string, any[]>>({}) // offers on open requests (best price, UX-194)
  const [seen, setSeen] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<'' | 'stale' | 'empty'>('') // the refresh failed: '' ok · stale = showing the cached copy · empty = nothing to show (UX-015)
  const [mySavings, setMySavings] = useState<any>(null) // «وفّرت X ريال» across all requests (210)
  const [filter, setFilter] = useState('all') // all | has_offers | pending | closed
  const [sectorFilter, setSectorFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest') // newest | expiry
  // a business buyer's unfinished work (UX-074): an unsent bill of quantities on this device, tenders waiting for approval
  const [boqDraftItems, setBoqDraftItems] = useState(0)
  const [reviewTenders, setReviewTenders] = useState<any[]>([])

  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    setSeen(readSeen())
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      // Speed: the database is far from our users (~1 s a request): load everything that only needs
      // the user id at once, then the deals of closed requests (was 8 sequential requests).
      const uid = session.user.id
      // Back on the home page within this tab: show the last data at once, refresh below.
      const snap = readPageCache('home_' + uid)
      if (snap) {
        // the buyer type first, so names and codes render in the right mode on the first paint (UX-171);
        // the type stored on this device wins over the snapshot's (a switch elsewhere, round-4 UX-055)
        const stType = storedBuyerType()
        const snapP = snap.p && stType ? { ...snap.p, buyer_type: stType } : snap.p
        rememberBuyerType(snapP?.buyer_type)
        setProfile(snapP); setRfqs(snap.r || []); setDrafts(snap.dr || []); setProjects(snap.proj || [])
        setActivity(snap.notifs || []); setMarketTop(snap.marketTop || []); setMarketTrend(snap.trend || {}); setDeals(snap.deals || {})
        setOpenOffers(snap.oo || {})
        setLoading(false)
      }
      const safe = (q: any) => Promise.resolve(q).catch(() => ({ data: null }))
      const [{ data: p, error: pErr }, { data: r, error: rErr }, { data: dr }, { data: proj }, { data: notifs }, { data: mp }, { data: tr }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('rfqs').select('*').eq('contractor_id', uid).order('created_at', { ascending: false }).limit(200),
        supabase.from('rfq_drafts').select('id, title, updated_at, data').order('updated_at', { ascending: false }).limit(50),
        // with the request ids, so a project sent as one request links straight to it (round-4 UX-137)
        safe(supabase.from('project_rfqs').select('*').eq('contractor_id', uid).order('created_at', { ascending: false }).limit(5)),
        safe(supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(6)),
        safe(supabase.rpc('get_market_prices')),
        safe(supabase.rpc('get_market_price_trend')),
      ])
      safe(supabase.rpc('my_savings')).then((x: any) => setMySavings(x?.data || null))
      safe(supabase.from('tenders').select('id, title, status').eq('contractor_id', uid).eq('status', 'review').order('created_at', { ascending: false }).limit(3))
        .then((x: any) => setReviewTenders(x?.data || []))
      try { const d = JSON.parse(localStorage.getItem('tsk_project_draft') || 'null'); setBoqDraftItems(Array.isArray(d?.items) ? d.items.length : 0) } catch { setBoqDraftItems(0) }
      // a failed refresh (weak connection) must not wipe the page or the «لبيتي» mode: keep the cached copy (UX-015)
      if (pErr || rErr || !p) {
        setLoadErr(snap ? 'stale' : 'empty')
        setLoading(false)
        return
      }
      setLoadErr('')
      rememberBuyerType(p?.buyer_type) // before the profile renders (UX-171)
      setProfile(p); setProfileFresh(true)
      setRfqs(r || [])
      setDrafts(dr || [])
      setProjects(proj || [])
      if (proj?.length) safe(supabase.from('project_rfq_items').select('project_rfq_id, rfq_id').in('project_rfq_id', proj.map((x: any) => x.id))).then((x: any) => {
        const rows: any[] = x?.data || []
        if (rows.length) setProjects((proj as any[]).map((pp: any) => ({ ...pp, items: rows.filter((it: any) => it.project_rfq_id === pp.id) })))
      })
      setActivity(notifs || [])
      // نبض السوق (متوسطات الأسعار) + اتجاه السعر (٣٠ يوم مقابل السابقة)
      setMarketTop((mp || []).sort((a: any, b: any) => Number(b.offer_count) - Number(a.offer_count)).slice(0, 3))
      const map: Record<string, any> = {}
      for (const row of (tr || [])) map[`${row.product_name}|${row.sector}`] = row
      setMarketTrend(map)
      setLoading(false)
      const marketTop = (mp || []).sort((a: any, b: any) => Number(b.offer_count) - Number(a.offer_count)).slice(0, 3)
      let deals: Record<string, any[]> = snap?.deals || {}
      let oo: Record<string, any[]> = snap?.oo || {}
      try {
        const closedIds = (r || []).filter((x: any) => x.status === 'closed').map((x: any) => x.id)
        const openIds = (r || []).filter((x: any) => x.status === 'open' && (x.offer_count || 0) > 0).map((x: any) => x.id).slice(0, 60)
        const [acc, offs] = await Promise.all([
          closedIds.length ? supabase.from('offers').select('id, rfq_id, accepted_at, supplier_delivered_at, received_at, payment_status, payment_confirmed_at, dispute_status').in('rfq_id', closedIds).eq('status', 'accepted') : Promise.resolve({ data: [] } as any),
          openIds.length ? safe(supabase.from('offers').select('rfq_id, status, total_price, vat_included, vat_status, item_prices, price_valid_until').in('rfq_id', openIds)) : Promise.resolve({ data: [] } as any),
        ])
        // keep ALL accepted offers per RFQ (per-item awards → multiple suppliers), not one arbitrary (B11)
        const m: Record<string, any[]> = {}
        for (const o of (acc?.data || [])) (m[o.rfq_id] ||= []).push(o)
        setDeals(m)
        deals = m
        const om: Record<string, any[]> = {}
        for (const o of (offs?.data || [])) if (!['rejected', 'withdrawn', 'cancelled'].includes(o.status)) (om[o.rfq_id] ||= []).push(o)
        setOpenOffers(om)
        oo = om
      } catch {}
      writePageCache('home_' + uid, { p, r, dr, proj, notifs, marketTop, trend: map, deals, oo })
    }
    init()
  }, [reloadKey])

  async function handleSignOut() {
    const supabase = createClient()
    clearAllLocalDrafts()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // remember the buyer type on this device (the sidebar menu hides project tools for a home buyer)
  useEffect(() => { if (profile?.buyer_type) rememberBuyerType(profile.buyer_type) }, [profile])
  if (loading) return <PageLoader />

  const homeBuyer = profile?.buyer_type === 'individual'
  // recurring lists (rfq_drafts.data.is_template) apart from the drafts (round-4 UX-187)
  const templates = drafts.filter((d: any) => d?.data?.is_template)
  const plainDrafts = drafts.filter((d: any) => !d?.data?.is_template)
  const active = rfqs.filter((r: any) => r.status === 'open')
  const closed = rfqs.filter((r: any) => r.status === 'closed')
  const totalOffers = rfqs.reduce((s: any, r: any) => s + (r.offer_count || 0), 0)
  const newCount = (r: any) => Math.max(0, (r.offer_count || 0) - (seen[r.id] || 0))
  const hasNew = (r: any) => r.status === 'open' && newCount(r) > 0
  const openRfq = (r: any) => { if ((r.offer_count || 0) > 0) markSeen(r.id, r.offer_count || 0) }

  // أرقام حيّة + اكتمال الحساب
  const now = Date.now()
  const rfqsThisWeek = rfqs.filter((r: any) => r.created_at && (now - new Date(r.created_at).getTime()) < 7 * 864e5).length
  const awaitingReply = rfqs.filter(hasNew).length
  const completion = [
    { ok: !!(profile?.region && profile?.city), label: L('Location', 'مقام', 'الموقع'), href: '/settings' },
    { ok: !!profile?.phone, label: L('Phone', 'فون نمبر', 'رقم الجوال'), href: '/settings' },
    { ok: !!(profile?.latitude || profile?.national_short_address), label: L('Map pin', 'نقشے پر مقام', 'الموقع على الخريطة'), href: '/location' },
    { ok: rfqs.length > 0, label: L('First price request', 'پہلی قیمت کی درخواست', 'أول طلب تسعير'), href: '/contractor/rfq/quick' },
  ]
  const compDone = completion.filter((c: any) => c.ok).length
  const compPct = Math.round((compDone / completion.length) * 100)

  // the deal stage of a closed request: an open dispute wins, else the least-advanced stage; done only if all are done
  const dealOf = (rfq: any) => {
    const list = deals[rfq.id]
    if (!list?.length) return null
    const stages = list.map((o: any) => dealStage(o, 'buyer', locale))
    const disputed = stages.find((s: any) => s.key === 'disputed')
    const allDone = stages.every((s: any) => s.done)
    // a step the buyer has to do (confirm receipt, record payment) comes right after a dispute (UX-055)
    const todoIdx = stages.findIndex((s: any) => !!buyerTodo(s))
    const st = disputed || (todoIdx >= 0 ? stages[todoIdx] : allDone ? stages[0] : stages.slice().sort((a: any, b: any) => a.step - b.step)[0])
    const todo = !disputed && todoIdx >= 0 ? buyerTodo(stages[todoIdx], locale) : null
    const offerId = list[todoIdx >= 0 ? todoIdx : 0]?.id as string | undefined
    return { st, allDone, n: list.length, todo, offerId }
  }
  const dealsDone = closed.filter((r: any) => dealOf(r)?.allDone).length

  function timeAgo(d: any) {
    if (!d) return ''
    return timeAgoText(d, locale, now)
  }
  function actMeta(type: any) {
    switch (type) {
      case 'offer': case 'new_offer': return { name: 'offers', tone: 'warning' }
      case 'offer_accepted': case 'accepted': return { name: 'completed', tone: 'success' }
      case 'new_message': return { name: 'quoted', tone: 'brand' }
      case 'new_rfq': return { name: 'orders', tone: 'brand' }
      case 'price_reduction': case 'price_reduced': return { name: 'pricing', tone: 'warning' }
      default: return { name: 'active', tone: 'neutral' }
    }
  }
  const gameBadge = rfqs.length >= 10 ? { t: L('Pro Buyer', 'ماہر خریدار', 'مشتري محترف'), e: <Glyph e="🏆" /> }
    : rfqs.length >= 3 ? { t: L('Active Buyer', 'فعال خریدار', 'مشتري نشط'), e: <Glyph e="⭐" /> }
    : { t: L('Getting Started', 'اچھا آغاز', 'بداية موفقة'), e: <Glyph e="🌱" /> }

  // the request's name with the reference in the reader's language (UX-069)
  const displayName = (rfq: any) => { const ref = rfqRef(rfq, locale); const desc = rfqDesc(rfq, locale); return ref ? `${ref} · ${desc}` : desc }
  const itemsOf = (rfq: any): any[] => Array.isArray(rfq.items) && rfq.items.length ? rfq.items : rfq.product_name ? [{ product_name: rfq.product_name }] : []
  const sar = (n: number) => `${Math.round(n).toLocaleString('en-US')} ${L('SAR', 'ریال', 'ر.س')}`
  const whenShort = (d: any) => new Date(d).toLocaleString(dateLocale(locale), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })

  // «أقل سعر» for one material, «أفضل مجموع» or «سُعّرت k من n مواد» for several (UX-194)
  function bestLine(rfq: any): string {
    const offs = openOffers[rfq.id] || []
    if (!offs.length) return ''
    const items = itemsOf(rfq)
    const n = Math.max(1, items.length)
    if (n === 1) {
      const min = Math.min(...offs.map(offerComparable).filter((x: number) => x > 0))
      return isFinite(min) ? L(`Lowest price: ${sar(min)}`, `کم ترین قیمت: ${sar(min)}`, `أقل سعر: ${sar(min)}`) : ''
    }
    const pricedIdx = new Set<number>()
    let bestFull = Infinity
    for (const o of offs) {
      const list = (Array.isArray(o.item_prices) ? o.item_prices : []).filter((e: any) => Number(e?.total) > 0)
      list.forEach((e: any, i: number) => pricedIdx.add(Number.isInteger(e.item_index) ? e.item_index : i))
      if (list.length >= n) { const tot = list.reduce((s: number, e: any) => s + lineComparable(e.total, o), 0); if (tot > 0 && tot < bestFull) bestFull = tot }
    }
    if (isFinite(bestFull)) return L(`Best total: ${sar(bestFull)}`, `بہترین کل: ${sar(bestFull)}`, `أفضل مجموع: ${sar(bestFull)}`)
    const k = Math.min(pricedIdx.size, n)
    return k ? L(`${k} of ${n} items priced`, `${n} میں سے ${k} اشیاء کی قیمت آئی`, `سُعّرت ${k} من ${arMaterials(n)}`) : ''
  }
  // an offer price that ends within 48 hours on an open request (one row, the soonest)
  const expiring = (() => {
    let best: { rfq: any; at: string } | null = null
    for (const rfq of active) for (const o of openOffers[rfq.id] || []) {
      const at = o.price_valid_until
      if (!at) continue
      const ms = new Date(at).getTime() - now
      if (ms > 0 && ms < 48 * 3600e3 && (!best || new Date(at).getTime() < new Date(best.at).getTime())) best = { rfq, at }
    }
    return best
  })()

  const nav = getNav('contractor', locale, '/contractor') // the shared menu (طلباتي، صفقاتي، الرسائل…)
  const name = profile?.company_name_ar || profile?.company_name_en || profile?.full_name || ''
  const greeting = name ? `${t.welcome}، ${name}` : undefined

  // the request list's search: title, number, display name and every material name (raw, cleaned, translated) (UX-070)
  const haystack = (rfq: any) => normalizeText([
    rfq.title, rfq.ref_no, rfqRef(rfq, locale), rfqDesc(rfq, locale), rfq.product_name,
    ...itemsOf(rfq).flatMap((it: any) => { const n = String(it?.product_name || ''); return [n, cleanArName(n), getProductLabel(n, locale)] }),
  ].filter(Boolean).join(' '))

  return (
    <AppShell
      title={homeBuyer ? (locale === 'en' ? 'Home' : locale === 'ur' ? 'ہوم' : 'الرئيسية') : locale === 'en' ? 'Buyer dashboard' : locale === 'ur' ? 'خریدار ڈیش بورڈ' : 'لوحة المشتري'}
      company={profile?.company_name_ar || profile?.company_name_en}
      userId={user?.id}
      nav={nav}
      onSignOut={handleSignOut}
      dir={dir}
    >
      <div className="max-w-6xl mx-auto">
        <h1 className="sr-only">{homeBuyer ? L('Home', 'ہوم', 'الرئيسية') : L('Buyer dashboard', 'خریدار ڈیش بورڈ', 'لوحة المشتري')}</h1>
        {/* owner 2026-11-22: existing buyers choose «لبيتي / مقاول أو شركة» once after the update */}
        {profileFresh && user && profile?.role === 'contractor' && !profile?.buyer_type && (
          <BuyerTypePrompt userId={user.id} locale={locale} onChosen={(v) => { rememberBuyerType(v); setProfile((p: any) => ({ ...p, buyer_type: v })) }} />
        )}

        {/* the refresh failed: say so and offer a retry instead of an empty «لا توجد طلبات» (UX-015) */}
        {loadErr && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#D4A543]/60 bg-[#FBF5E6] px-4 py-3">
            <Glyph e="⚠" />
            <span className="flex-1 min-w-[200px] text-[13px] font-bold text-[#0B2438]">
              {loadErr === 'stale'
                ? L('Could not refresh the data. Showing the last saved copy.', 'ڈیٹا تازہ نہیں ہو سکا۔ آخری محفوظ نقل دکھائی جا رہی ہے۔', 'تعذّر تحديث البيانات، تُعرض آخر نسخة محفوظة.')
                : L('Could not load your data. Check your connection and try again.', 'آپ کا ڈیٹا لوڈ نہیں ہو سکا۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر تحميل بياناتك. تحقّق من الاتصال وأعد المحاولة.')}
            </span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)}
              className="min-h-[44px] px-4 rounded-xl text-[13px] font-bold text-white bg-[#0B2438] inline-flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" aria-hidden />{L('Try again', 'دوبارہ کوشش کریں', 'أعد المحاولة')}
            </button>
          </div>
        )}

        {/* Verification Status Banner (buyers are not reviewed; only a rejected account is told) */}
        {profile?.verification_status === 'rejected' && (
          <div className="mb-6 bg-white border border-[#0B2438]/20 rounded-2xl p-5 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl text-[#0B2438]"><Glyph e="⚠" /></span>
              <div>
                <div className="font-bold text-[#0B2438] mb-1">
                  {L('Your account has been suspended', 'آپ کا اکاؤنٹ معطل کر دیا گیا ہے', 'تم إيقاف حسابك')}
                </div>
                <div className="text-sm text-gray-700">
                  {L('You cannot send new requests for now. Contact support to find out why and how to restore your account.',
                    'آپ فی الحال نئی درخواستیں نہیں بھیج سکتے۔ وجہ اور اکاؤنٹ بحال کرنے کا طریقہ جاننے کے لیے سپورٹ سے رابطہ کریں۔',
                    'لا يمكنك إرسال طلبات جديدة حالياً. تواصل مع الدعم لمعرفة السبب وطريقة استعادة حسابك.')}
                </div>
                {profile?.rejection_reason && (
                  <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-[#0B2438] font-medium">
                    <Glyph e="📋" /> {locale === 'en' ? 'Reason: ' : locale === 'ur' ? 'وجہ: ' : 'السبب: '}{profile.rejection_reason}
                  </div>
                )}
              </div>
            </div>
            <Link href="/support" className="inline-flex items-center min-h-[44px] text-sm px-4 rounded-lg font-semibold text-white bg-[#0B2438] hover:bg-[#102E45] transition-all">
              {L('Contact support', 'سپورٹ سے رابطہ کریں', 'تواصل مع الدعم')}
            </Link>
          </div>
        )}

        {/* a returning buyer: their requests come first, above the market (UX-065) */}
        {rfqs.length > 0 && (
          <section className="mb-5 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in" aria-labelledby="my-req-strip">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 id="my-req-strip" className="text-sm font-extrabold text-[#0B2438]">{L('My requests', 'میری درخواستیں', 'طلباتي')}</h2>
              <button type="button" onClick={() => { setFilter('all'); document.getElementById('rfq-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className="min-h-[44px] px-1 text-[13px] font-bold text-[#8F6820] hover:underline">{L('All my requests', 'میری تمام درخواستیں', 'كل طلباتي')} {fwd}</button>
            </div>
            {awaitingReply > 0 && (
              <button type="button" onClick={() => { setFilter('has_offers'); document.getElementById('rfq-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className="w-full mb-2 rounded-xl p-3 flex items-center gap-3 text-start transition-all hover:shadow-md border"
                style={{ background: 'linear-gradient(135deg,#D4A54318,#0B243808)', borderColor: '#D4A54366' }}>
                <span className="w-10 h-10 rounded-xl grid place-items-center text-[#071827] shrink-0" style={{ background: '#D4A543' }}><Glyph e="🔔" /></span>
                <span className="flex-1 text-sm font-bold" style={{ color: '#0B2438' }}>
                  {L(awaitingReply === 1 ? '1 request received new offers. Compare them now' : `${awaitingReply} requests received new offers. Compare them now`,
                    awaitingReply === 1 ? 'ایک درخواست پر نئی آفرز آئی ہیں۔ ابھی موازنہ کریں' : `${awaitingReply} درخواستوں پر نئی آفرز آئی ہیں۔ ابھی موازنہ کریں`,
                    `${arCount(awaitingReply, 'طلب واحد وصلته', 'طلبان وصلتهما', 'طلبات وصلتها', 'طلباً وصلته')} عروض جديدة، قارِنها الآن`)}
                </span>
                <span className="font-bold text-sm text-[#8F6820]" aria-hidden>{fwd}</span>
              </button>
            )}
            {expiring && (
              <Link href={`/contractor/rfq/${expiring.rfq.id}`} onClick={() => openRfq(expiring.rfq)}
                className="mb-2 flex items-center gap-2 rounded-xl border border-[#D4A543]/60 bg-[#FBF5E6] px-3 py-2 text-[13px] font-bold text-[#0B2438]">
                <Glyph e="⏰" />
                <span className="flex-1">{L(`An offer price on «${rfqDesc(expiring.rfq, locale)}» ends in ${formatTimeLeft(expiring.at, locale)}. Choose before it changes.`,
                  `«${rfqDesc(expiring.rfq, locale)}» کی ایک آفر کی قیمت ${formatTimeLeft(expiring.at, locale)} میں ختم ہو گی۔ بدلنے سے پہلے انتخاب کریں۔`,
                  `سعر أحد عروض «${rfqDesc(expiring.rfq, locale)}» ينتهي خلال ${formatTimeLeft(expiring.at, locale)}، اختر قبل أن يتغيّر.`)}</span>
              </Link>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {rfqs.slice(0, 2).map((rfq: any) => {
                const d = rfq.status === 'closed' ? dealOf(rfq) : null
                const stt = rfqState(rfq)
                const offersTxt = countLabel(rfq.offer_count || 0, locale, (n: number) => arCount(n, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً'), 'offer', 'آفر')
                const status = stt === 'closed' ? (d ? d.st.label : rfqStatusLabel(rfq, locale))
                  : stt === 'offers' ? offersTxt
                  : stt === 'offers_expired' ? `${rfqStatusLabel(rfq, locale)} · ${offersTxt}`
                  : stt === 'awaiting' ? L('Awaiting offers', 'آفرز کا انتظار', 'بانتظار العروض')
                  : stt === 'expired_empty' ? rfqStatusLabel(rfq, locale)
                  : t.cancelled
                return (
                  <Link key={rfq.id} href={`/contractor/rfq/${rfq.id}`} onClick={() => openRfq(rfq)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 min-h-[52px] hover:border-[#D4A543]/50">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#0B2438] truncate">{rfqDesc(rfq, locale)}</span>
                      <span className="block text-[12px] text-gray-600 truncate">{status}</span>
                    </span>
                    {hasNew(rfq) ? <span className="shrink-0 text-[12px] font-bold px-2 py-0.5 rounded-full text-[#071827]" style={{ background: '#D4A543' }}>{L('New offers', 'نئی آفرز', 'عروض جديدة')}</span>
                      : stt === 'offers_expired' ? <span className="shrink-0 text-[12px] font-bold px-2 py-0.5 rounded-full text-[#071827]" style={{ background: '#D4A543' }}>{L('Choose an offer', 'آفر منتخب کریں', 'اختر عرضاً')}</span> : null}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* السوق: «ماذا تحتاج اليوم؟» + الأقسام بالصور (التصميم المعتمد); the greeting lives in the hero */}
        <MarketHero locale={locale} homeBuyer={homeBuyer} greeting={greeting} />

        {/* the first visit of a home buyer: how it works, in one short row right under the market (round-4 UX-110) */}
        {homeBuyer && rfqs.length === 0 && loadErr !== 'empty' && (
          <ol className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-2 text-start" aria-label={L('How it works', 'یہ کیسے کام کرتا ہے', 'كيف يعمل تسعيرك؟')}>
            {[
              L('Write what you need or take a photo of it', 'جو چاہیے لکھیں یا اس کی تصویر لیں', 'اكتب ما تحتاجه أو صوّره'),
              L('Offers from the right suppliers reach you', 'متعلقہ سپلائرز کی آفرز آپ تک پہنچتی ہیں', 'تصلك عروض الموردين المختصين'),
              L('Choose the offer that suits you best', 'اپنے لیے بہترین آفر منتخب کریں', 'اختر العرض الأنسب لك'),
            ].map((s, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-xl bg-[#F7F4EC] px-3 py-2">
                <span className="w-7 h-7 rounded-full grid place-items-center shrink-0 text-[13px] font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>{i + 1}</span>
                <span className="text-[13px] font-bold text-[#0B2438] leading-snug">{s}</span>
              </li>
            ))}
          </ol>
        )}

        {/* «قوائمي»: a business buyer's recurring lists, sent again in one tap (round-4 UX-187) */}
        {!homeBuyer && templates.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#0B2438' }}><Glyph e="📋" /> {L('My lists', 'میری فہرستیں', 'قوائمي')} <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{templates.length}</span></h2>
            <div className="space-y-2">
              {templates.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }} dir="auto">{d.title || L('Untitled list', 'بے نام فہرست', 'قائمة بلا اسم')}</div>
                    <div className="text-[12px] text-gray-500">{countLabel(d.data?.items?.length || 0, locale, arMaterials, 'item', 'اشیاء')}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/contractor/rfq/quick?draft=${d.id}`} className="min-h-[44px] inline-flex items-center gap-1 text-[13px] font-bold px-3 rounded-lg text-[#071827]" style={{ background: '#D4A543' }}>{L('Request now', 'ابھی منگوائیں', 'اطلب الآن')} <span aria-hidden="true">{fwd}</span></Link>
                    <button onClick={async () => {
                      if (!(await askConfirm(L('Delete this list? This cannot be undone.', 'یہ فہرست حذف کریں؟ یہ واپس نہیں ہو سکتا۔', 'هل تريد حذف القائمة؟ لا يمكن التراجع عن ذلك.'), { danger: true }))) return
                      let failed = false
                      try { const { error } = await createClient().from('rfq_drafts').delete().eq('id', d.id); failed = !!error } catch { failed = true }
                      if (failed) { setDraftErr(L('Could not delete the list. Check your connection and try again.', 'فہرست حذف نہیں ہو سکی۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر حذف القائمة. تحقّق من اتصالك وحاول مرة أخرى.')); return }
                      setDrafts((prev: any[]) => prev.filter((x: any) => x.id !== d.id))
                    }} aria-label={L('Delete list', 'فہرست حذف کریں', 'حذف القائمة')} className="text-sm text-red-500 hover:text-red-700 w-[44px] h-[44px] grid place-items-center rounded-lg"><Glyph e="🗑" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* one attention card at a time, by priority (UX-087) */}
        {!profile?.region ? (
          <Link href="/onboarding" className="flex items-center justify-between gap-3 rounded-2xl p-4 mb-4 bg-white border-2 border-[#D4A543]/60 hover:shadow-md transition-shadow">
            <div>
              <div className="font-extrabold text-sm text-[#0B2438]"><Glyph e="📍" /> {homeBuyer ? L('Add your delivery address', 'ڈیلیوری کا پتہ شامل کریں', 'أضف عنوان التوصيل') : L('Complete your profile', 'اپنی پروفائل مکمل کریں', 'أكمل ملفك')}</div>
              <div className="text-[13px] text-gray-700 mt-0.5">{homeBuyer
                ? L('Add your delivery address so your request reaches the suppliers near you.', 'ڈیلیوری کا پتہ شامل کریں تاکہ آپ کی درخواست قریبی سپلائرز تک پہنچے۔', 'أضف عنوان التوصيل، ليصل طلبك إلى الموردين القريبين منك.')
                : L('Add your location so your request reaches the suppliers near you.', 'اپنا مقام شامل کریں تاکہ آپ کی درخواست قریبی سپلائرز تک پہنچے۔', 'أضف موقعك، ليصل طلبك إلى الموردين القريبين منك.')}</div>
            </div>
            <span className="shrink-0 text-sm font-bold text-[#0B2438] border border-[#0B2438]/30 rounded-full px-3 py-1.5">{L('Add', 'شامل کریں', 'أضف')} {fwd}</span>
          </Link>
        ) : !homeBuyer && compPct < 100 ? (
          <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold" style={{ color: '#0B2438' }}>
                {locale === 'en' ? `Your account is ${compPct}% complete` : locale === 'ur' ? `آپ کا اکاؤنٹ ${compPct}% مکمل` : `حسابك مكتمل ${compPct}%`}
              </span>
              <span className="text-[12px] text-gray-500">{compDone}/{completion.length}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${compPct}%`, background: 'linear-gradient(90deg,#D4A543,#9D7425)' }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {completion.filter((c: any) => !c.ok).map((c: any) => (
                <Link key={c.label} href={c.href} className="min-h-[40px] inline-flex items-center text-[12px] font-semibold px-3 rounded-full border border-dashed transition-all hover:bg-[#D4A543]/10" style={{ borderColor: '#D4A543', color: '#8F6820' }}>+ {c.label}</Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* تنبيه سعري — أكبر تغيّر شهري (يخلق قيمة عودة يومية) */}
        {/* only while the price board is on: it links to /market (UX-119) */}
        {!homeBuyer && FEATURES.priceBoard && (() => {
          let best: { name: string; pct: number } | null = null
          for (const k of Object.keys(marketTrend)) {
            const tr = marketTrend[k]
            if (!(Number(tr.prev_avg) > 0) || !(Number(tr.recent_avg) > 0) || Number(tr.recent_count) < 2) continue
            const pct = Math.round(((Number(tr.recent_avg) - Number(tr.prev_avg)) / Number(tr.prev_avg)) * 100)
            if (pct === 0) continue
            if (!best || Math.abs(pct) > Math.abs(best.pct)) best = { name: tr.product_name, pct }
          }
          if (!best) return null
          const down = best.pct < 0
          return (
            <Link href="/market" className="mb-5 rounded-2xl p-3.5 flex items-center gap-3 border animate-fade-in transition-all hover:shadow-md"
              style={{ background: down ? '#ecfdf5' : '#fef2f2', borderColor: down ? '#a7f3d0' : '#fecaca' }}>
              <span className="text-xl">{down ? <Glyph e="📉" /> : <Glyph e="📈" />}</span>
              <span className="flex-1 text-sm font-bold" style={{ color: down ? '#0F6E56' : '#b91c1c' }}>
                {L(`${getProductLabel(best.name, 'en')} ${down ? 'down' : 'up'} ${Math.abs(best.pct)}% vs last month`,
                  `${getProductLabel(best.name, 'ur')} کی قیمت پچھلے مہینے کے مقابلے میں ${Math.abs(best.pct)}% ${down ? 'کم ہوئی' : 'بڑھی'}`,
                  `سعر ${best.name} ${down ? 'انخفض' : 'ارتفع'} ${Math.abs(best.pct)}% مقارنةً بالشهر الماضي`)}
              </span>
              <span className="text-[12px] font-bold" style={{ color: down ? '#0F6E56' : '#b91c1c' }} aria-hidden>{fwd}</span>
            </Link>
          )
        })()}

        {/* نبض السوق — متوسطات الأسعار الحالية */}
        {FEATURES.priceBoard && marketTop.length > 0 && (
          <div className="mb-5 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0B2438' }}>
                <AppIcon name="pricing" tone="warning" variant="line" size={20} /> {L('Market pulse', 'مارکیٹ کی نبض', 'نبض السوق')}
              </h2>
              <Link href="/market" className="text-[12px] font-semibold" style={{ color: '#8F6820' }}>{L('Full index', 'مکمل انڈیکس', 'المؤشر كاملاً')} {fwd}</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {marketTop.map((p: any, i: any) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[12px] font-bold truncate" style={{ color: '#0B2438' }}>{getProductLabel(p.product_name, locale)}</div>
                  <div className="text-base font-extrabold mt-1" style={{ color: '#0B2438' }}>
                    {Math.round(Number(p.avg_price)).toLocaleString('en-US')} <span className="text-[12px] text-gray-500 font-normal">{L('SAR', 'ریال', 'ر.س')}/{getUnitLabelLong(p.unit || '', locale)}</span>
                  </div>
                  <div className="text-[12px] text-gray-500 mt-0.5">
                    {Math.round(Number(p.min_price)).toLocaleString('en-US')}–{Math.round(Number(p.max_price)).toLocaleString('en-US')} · {L(`${p.offer_count} offers`, `${p.offer_count} آفرز`, arCount(Number(p.offer_count) || 0, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً'))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* «وفّرت X ريال» — total compared with the highest quote per awarded item (owner 2026-11-14) */}
        {mySavings && Number(mySavings.saved) >= 1 && (
          <div className="w-full mb-5 rounded-2xl p-4 flex items-center gap-3 border animate-fade-in" style={{ background: '#E7F4EF', borderColor: '#0F6E5633' }}>
            <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: '#0F6E56' }}><Check className="w-5 h-5" aria-hidden /></span>
            <span className="flex-1 min-w-0">
              <span className="block font-extrabold text-[15px]" style={{ color: '#0F6E56' }}>
                {L(`You have saved ${Number(mySavings.saved).toLocaleString('en-US')} SAR with Taseerak`, `آپ نے تسعیرک سے ${Number(mySavings.saved).toLocaleString('en-US')} ریال بچائے`, `وفّرت ${Number(mySavings.saved).toLocaleString('en-US')} ر.س مع تسعيرك`)}
              </span>
              <span className="block text-[13px] text-gray-700">{L(`Across ${countLabel(Number(mySavings.requests) || 0, 'en', arRequests, 'request', '')}, compared with the highest quote for each material.`, `${mySavings.requests} درخواستوں میں، ہر مواد کی سب سے زیادہ قیمت کے مقابلے میں۔`, `في ${arRequests(Number(mySavings.requests) || 0)}، مقارنةً بأعلى عرض لكل مادة.`)}</span>
            </span>
          </div>
        )}

        {/* Stats — clickable filters; a home buyer does not need the four numbers (UX-065) */}
        {!homeBuyer && rfqs.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: t.activeRfqs, value: active.length, name: 'active', tone: 'brand', f: 'pending', sub: rfqsThisWeek > 0 ? `+${rfqsThisWeek} ${L('this week', 'اس ہفتے', 'هذا الأسبوع')}` : '' },
            { label: t.totalOffers, value: totalOffers, name: 'offers', tone: 'warning', f: 'has_offers', sub: awaitingReply > 0 ? `${awaitingReply} ${L('with new offers', 'نئی آفرز کے ساتھ', 'فيها عروض جديدة')}` : '' },
            { label: t.completed, value: closed.length, name: 'completed', tone: 'success', f: 'closed', sub: L(`${dealsDone} completed`, `${dealsDone} مکمل`, `${dealsDone} مكتملة`) },
            { label: t.total, value: rfqs.length, name: 'all', tone: 'neutral', f: 'all', sub: rfqsThisWeek > 0 ? `+${rfqsThisWeek} ${L('new', 'نئی', 'جديد')}` : '' },
          ].map(({ label, value, name, tone, f, sub }) => (
            <button key={label} type="button" onClick={() => { setFilter(f); document.getElementById('rfq-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              aria-pressed={filter === f}
              className={`text-start bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${filter === f ? 'border-[#D4A543] ring-1 ring-[#D4A543]/30' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                {/* tinted, never a white glyph on gold (UX-020) */}
                <AppIcon name={name} tone={tone} variant="tone" size={44} />
                <div className="text-3xl font-bold" style={{ color: '#0B2438' }}>{value}</div>
              </div>
              <div className="text-[13px] text-gray-600 mt-3 font-medium">{label}</div>
              {sub && <div className="text-[12px] font-bold mt-0.5 text-[#48596E]">{sub}</div>}
            </button>
          ))}
        </div>
        )}

        {/* آخر النشاطات + إنجازاتك */}
        {!homeBuyer && (activity.length > 0 || rfqs.length > 0) && (
          <div className="grid lg:grid-cols-3 gap-4 mb-8 animate-fade-in">
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#0B2438' }}>
                <AppIcon name="active" tone="brand" variant="line" size={20} /> {L('Recent activity', 'حالیہ سرگرمی', 'آخر النشاطات')}
              </h2>
              {activity.length === 0 ? (
                <p className="text-[13px] text-gray-500 py-6 text-center">{L('No activity yet. It will appear here as offers arrive.', 'ابھی کوئی سرگرمی نہیں۔ آفرز آتے ہی یہاں نظر آئے گی۔', 'لا يوجد نشاط بعد، وسيظهر هنا فور وصول العروض.')}</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((a: any) => {
                    const m = actMeta(a.type)
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <AppIcon name={m.name} tone={m.tone} variant="tone" size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: '#0B2438' }}>{noEmoji(a.title)}</div>
                          {a.body && <div className="text-[12px] text-gray-600 truncate">{noEmoji(a.body)}</div>}
                        </div>
                        <span className="text-[12px] text-gray-500 whitespace-nowrap shrink-0">{timeAgo(a.created_at)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-bold mb-3" style={{ color: '#0B2438' }}>{L('Your progress', 'آپ کی پیش رفت', 'إنجازاتك')}</h2>
              {FEATURES.gamification && <div className="rounded-xl p-3 mb-3 text-center" style={{ background: 'linear-gradient(135deg,#D4A54312,#0B243808)' }}>
                <div className="text-3xl">{gameBadge.e}</div>
                <div className="text-[12px] font-bold mt-1" style={{ color: '#0B2438' }}>{gameBadge.t}</div>
              </div>}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-lg font-bold" style={{ color: '#0F6E56' }}>{dealsDone}</div>
                  <div className="text-[12px] text-gray-600">{L('Deals completed', 'مکمل ڈیلز', 'صفقات مكتملة')}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-lg font-bold" style={{ color: '#8F6820' }}>{rfqsThisWeek}</div>
                  <div className="text-[12px] text-gray-600">{L('This week', 'اس ہفتے', 'هذا الأسبوع')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bills of quantities (one consistent name: «جدول الكميات», UX-144) */}
        {projects.length > 0 && canUseProjects(profile) && !homeBuyer && (
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>
                <Glyph e="📋" /> {L('My bills of quantities', 'مقداروں کا جدول', 'جداول الكميات')}
              </h2>
              <Link href="/contractor/project/new" className="min-h-[44px] inline-flex items-center text-[13px] font-semibold" style={{ color: '#8F6820' }}>
                + {L('New bill of quantities', 'نیا مقداروں کا جدول', 'جدول كميات جديد')}
              </Link>
            </div>
            <div className="space-y-2 stagger">
              {projects.map((p: any) => {
                const pr = [...new Set((Array.isArray(p.items) ? p.items : []).map((x: any) => x?.rfq_id).filter(Boolean))] as string[]
                const one = pr.length === 1 ? pr[0] : null
                return (
                <Link key={p.id} href={one ? `/contractor/rfq/${one}` : `/contractor/project/${p.id}`}
                  className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#D4A543]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base text-white" style={{ background: '#0B2438' }}><Glyph e="📋" /></div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#0B2438' }}>{p.title}</div>
                      <div className="text-[12px] text-gray-500"><Glyph e="📍" /> {getRegionLabel(p.region || '', locale)} • {new Date(p.created_at).toLocaleDateString(dateLocale(locale))}</div>
                    </div>
                  </div>
                  <div className="text-[12px] font-semibold" style={{ color: '#8F6820' }}>
                    {one ? L('Follow the request', 'درخواست دیکھیں', 'تابع الطلب') : L('View results', 'نتائج دیکھیں', 'عرض النتائج')} {fwd}
                  </div>
                </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* a business buyer's unfinished work: an unsent bill of quantities, tenders waiting for approval (UX-074) */}
        {!homeBuyer && canUseProjects(profile) && (boqDraftItems > 0 || reviewTenders.length > 0) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#D4A543]/50 mb-6 space-y-2">
            {boqDraftItems > 0 && (
              <Link href="/contractor/project/new" className="flex items-center justify-between gap-2 rounded-xl px-3 min-h-[52px] border border-gray-100 hover:border-[#D4A543]/50">
                <span className="text-sm font-bold text-[#0B2438]"><Glyph e="📋" /> {L(`Unsent bill of quantities (${boqDraftItems} items)`, `نہ بھیجا گیا مقداروں کا جدول (${boqDraftItems} اشیاء)`, `جدول كميات غير مُرسل (${arCount(boqDraftItems, 'بند واحد', 'بندان', 'بنود', 'بنداً')})`)}</span>
                <span className="shrink-0 text-[13px] font-bold text-[#8F6820]">{L('Continue', 'جاری رکھیں', 'إكمال')} {fwd}</span>
              </Link>
            )}
            {reviewTenders.map((tn: any) => (
              <Link key={tn.id} href={`/contractor/tender/${tn.id}`} className="flex items-center justify-between gap-2 rounded-xl px-3 min-h-[52px] border border-gray-100 hover:border-[#D4A543]/50">
                <span className="text-sm font-bold text-[#0B2438] min-w-0 truncate" dir="auto"><Glyph e="📝" /> {L('Tender waiting for your approval: ', 'آپ کی منظوری کی منتظر ٹینڈر: ', 'مناقصة بانتظار اعتمادك: ')}{tn.title || '—'}</span>
                <span className="shrink-0 text-[13px] font-bold text-[#8F6820]">{L('Follow up', 'جاری رکھیں', 'متابعة')} {fwd}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Drafts — saved, not yet published (invisible to suppliers) */}
        {plainDrafts.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 animate-slide-up">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#0B2438' }}><Glyph e="📝" /> {L('Drafts', 'مسودے', 'المسودّات')} <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{plainDrafts.length}</span></h2>
            {draftErr && <p className="mb-2 text-[13px] text-red-700" role="alert">{draftErr}</p>}
            <div className="space-y-2">
              {plainDrafts.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2.5 hover:border-[#D4A543]/40 transition-colors">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{d.title || L('Untitled draft', 'بے نام مسودہ', 'مسودة بلا اسم')}</div>
                    <div className="text-[12px] text-gray-500">{countLabel(d.data?.items?.length || 0, locale, arMaterials, 'item', 'اشیاء')} · {new Date(d.updated_at).toLocaleDateString(dateLocale(locale))}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/contractor/rfq/quick?draft=${d.id}`} className="min-h-[44px] inline-flex items-center gap-1 text-[13px] font-bold px-3 rounded-lg text-white" style={{ background: '#0B2438' }}>{L('Continue', 'جاری رکھیں', 'إكمال')} <span aria-hidden="true">{fwd}</span></Link>
                    <button onClick={async () => {
                      if (!(await askConfirm(L('Delete this draft? This cannot be undone.', 'یہ مسودہ حذف کریں؟ یہ واپس نہیں ہو سکتا۔', 'هل تريد حذف المسودة؟ لا يمكن التراجع عن ذلك.'), { danger: true }))) return
                      let failed = false
                      try { const { error } = await createClient().from('rfq_drafts').delete().eq('id', d.id); failed = !!error } catch { failed = true }
                      if (failed) { setDraftErr(L('Could not delete the draft. Please try again.', 'مسودہ حذف نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر حذف المسودة. حاول مرة أخرى.')); return }
                      setDraftErr('')
                      setDrafts((prev: any[]) => prev.filter((x: any) => x.id !== d.id))
                    }} aria-label={L('Delete draft', 'مسودہ حذف کریں', 'حذف المسودة')} className="text-sm text-red-500 hover:text-red-700 w-[44px] h-[44px] grid place-items-center rounded-lg"><Glyph e="🗑" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RFQs */}
        {loadErr === 'empty' ? null : rfqs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center animate-slide-up">
            {/* a home buyer saw the three steps under the market: one quiet line here (round-4 UX-110) */}
            {homeBuyer ? (
              <p className="text-sm font-semibold text-gray-600">{L('You have not sent any request yet.', 'آپ نے ابھی کوئی درخواست نہیں بھیجی۔', 'لم ترسل أي طلب بعد.')}</p>
            ) : (<>
              <h2 className="text-xl font-bold mb-3" style={{ color: '#0B2438' }}>{t.noRfqs}</h2>
              <p className="text-gray-600 mb-6 text-sm">{t.noRfqsSub}</p>
              <Link href="/contractor/rfq/quick" className="inline-flex items-center gap-2 min-h-[48px] px-8 text-base font-bold rounded-2xl text-[#071827]" style={{ background: '#D4A543' }}>
                <Plus className="w-5 h-5" aria-hidden />{t.newRfqBtn}
              </Link>
            </>)}
          </div>
        ) : (
          <div className="animate-fade-in" id="rfq-list" style={{ scrollMarginTop: '70px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>{homeBuyer ? L('All my requests', 'میری تمام درخواستیں', 'كل طلباتي') : t.rfqList}</h2>
              <span className="text-[12px] text-gray-500">{countLabel(rfqs.length, locale, arRequests, 'request', 'درخواستیں')}</span>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[
                    { key: 'all', label: L('All', 'سب', 'الكل'), icon: <Glyph e="📋" /> },
                    { key: 'has_offers', label: L('Awaiting your choice', 'آپ کے انتخاب کی منتظر', 'بانتظار اختيارك'), icon: <Glyph e="💬" /> },
                    { key: 'pending', label: L('Awaiting offers', 'آفرز کے منتظر', 'بانتظار العروض'), icon: <Glyph e="⏳" /> },
                    { key: 'closed', label: L('Offer chosen', 'آفر منتخب ہو گئی', 'تمّ اختيار العرض'), icon: <Glyph e="🤝" /> },
                  ].map((f: any) => {
                    // one shared reading of the state (UX-003): an ended request WITH offers still waits for the buyer
                    const count = f.key === 'all' ? rfqs.length
                      : f.key === 'has_offers' ? rfqs.filter((r: any) => needsChoice(rfqState(r))).length
                      : f.key === 'pending' ? rfqs.filter((r: any) => rfqState(r) === 'awaiting').length
                      : rfqs.filter((r: any) => r.status === 'closed').length
                    return (
                      <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
                        className={`min-h-[44px] px-4 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border-2 ${
                          filter === f.key ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#0B2438]' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                        {f.icon} {f.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[12px] ${filter === f.key ? 'bg-[#D4A543] text-[#071827]' : 'bg-gray-200'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
                {/* على الجوال: البحث بسطر كامل تحت الفلاتر حتى لا تسحقه القوائم الطويلة */}
                <div className="flex flex-wrap gap-2">
                  {!homeBuyer && <select value={sectorFilter} onChange={(e: any) => setSectorFilter(e.target.value)}
                    className="input-field text-[16px] sm:text-[13px] flex-shrink-0 w-auto py-2" aria-label={L('Sector', 'شعبہ', 'القطاع')}>
                    <option value="all">{L('All sectors', 'تمام شعبے', 'كل القطاعات')}</option>
                    {Object.keys(sectors).map((s: any) => <option key={s} value={s}>{sectors[s]}</option>)}
                  </select>}
                  <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)}
                    className="input-field text-[16px] sm:text-[13px] flex-shrink-0 w-auto py-2" aria-label={L('Sort by', 'ترتیب', 'الترتيب')}>
                    <option value="newest">{L('Newest', 'تازہ ترین', 'الأحدث')}</option>
                    <option value="expiry">{L('Closest to the deadline', 'مہلت کے قریب ترین', 'الأقرب انتهاءً')}</option>
                  </select>
                  <input value={search} onChange={(e: any) => setSearch(e.target.value)}
                    className="input-field text-[16px] sm:text-[13px] basis-full sm:basis-auto sm:flex-1 sm:min-w-[160px] py-2 order-first sm:order-none" type="search" placeholder={L('Search by material or request number…', 'سامان یا درخواست نمبر سے تلاش کریں…', 'ابحث باسم المادة أو رقم الطلب…')} aria-label={L('Search requests', 'درخواستیں تلاش کریں', 'البحث في الطلبات')} />
                </div>
              </div>
            </div>

            <div className="space-y-3 stagger">
              {(() => {
                const q = normalizeText(search.trim())
                const filtered = rfqs.filter((rfq: any) => {
                  if (filter === 'has_offers' && !needsChoice(rfqState(rfq))) return false
                  if (filter === 'pending' && rfqState(rfq) !== 'awaiting') return false
                  if (filter === 'closed' && rfq.status !== 'closed') return false
                  if (sectorFilter !== 'all' && rfq.sector !== sectorFilter && !(Array.isArray(rfq.sectors) && rfq.sectors.includes(sectorFilter))) return false
                  if (q && !haystack(rfq).includes(q)) return false
                  return true
                })
                if (sortBy === 'newest') {
                  // what needs the buyer first (offers to choose from, a deal step to do), newest first otherwise (UX-055)
                  const rank = (r: any) => (needsChoice(rfqState(r)) || (r.status === 'closed' && dealOf(r)?.todo) ? 0 : 1)
                  filtered.splice(0, filtered.length, ...filtered.map((r: any, i: number) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map(x => x.r))
                }
                if (sortBy === 'expiry') {
                  filtered.sort((a: any, b: any) => {
                    const ax = a.status === 'open' && a.expires_at ? new Date(a.expires_at).getTime() : Infinity
                    const bx = b.status === 'open' && b.expires_at ? new Date(b.expires_at).getTime() : Infinity
                    return ax - bx
                  })
                }
                if (filtered.length === 0) return (
                  <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-gray-500 text-sm">
                    <Glyph e="🔍" /> {L('No matching requests', 'کوئی مطابق درخواست نہیں', 'لا توجد طلبات مطابقة')}
                  </div>
                )
                return filtered.map((rfq: any) => {
                  const isNew = hasNew(rfq)
                  const stt = rfqState(rfq)
                  const openNow = stt === 'awaiting' || stt === 'offers'
                  const items = itemsOf(rfq)
                  const best = needsChoice(stt) ? bestLine(rfq) : '' // the lowest price stays visible after the deadline (UX-003)
                  const deal = rfq.status === 'closed' ? dealOf(rfq) : null
                  // an open request past its deadline with no offers is extended, never re-sent as a duplicate (UX-056)
                  const canExtend = rfq.status === 'open' && stt === 'expired_empty'
                  const hasFoot = rfq.status === 'closed' || stt === 'expired_empty'
                  return (
                <div key={rfq.id} className="relative">
                <Link href={`/contractor/rfq/${rfq.id}`} onClick={() => openRfq(rfq)}
                  className={`block bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative ${hasFoot ? 'pb-[4.5rem]' : ''} ${
                    isNew || deal?.todo ? 'border-[#D4A543] ring-2 ring-[#D4A543]/20' : 'border-gray-100 hover:border-[#D4A543]/30'
                  }`}>
                  {/* «عروض جديدة» only for offers not seen yet (UX-066) */}
                  {isNew && (
                    <div className="absolute -top-2 end-[-0.5rem] z-10">
                      <span className="inline-flex items-center gap-1 text-[#071827] text-[12px] font-bold px-2.5 py-1 rounded-full shadow-lg"
                        style={{ background: '#D4A543' }}>
                        <Glyph e="🔔" /> {L('New offers', 'نئی آفرز', 'عروض جديدة')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        // brand tones only: gold = needs you, navy = waiting, green = deal, neutral = ended (UX-020)
                        const m = needsChoice(stt) ? { name: 'quoted', tone: 'warning' }
                          : stt === 'awaiting' ? { name: 'waiting', tone: 'brand' }
                          : stt === 'closed' ? { name: 'completed', tone: 'success' }
                          : { name: 'clock', tone: 'neutral' }
                        return <AppIcon name={m.name} tone={m.tone} variant="tone" size={44} />
                      })()}
                      <div className="min-w-0">
                        <div className="font-bold truncate" style={{ color: '#0B2438' }}>{displayName(rfq)}</div>
                        <div className="text-[12px] text-gray-500 truncate max-w-[260px]">{L('Sent on ', 'بھیجی گئی: ', 'أُرسل في ')}{rfqDate(rfq, locale)}</div>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          {/* a home buyer sees no engineering sector tags (UX-068) */}
                          {!homeBuyer && <span className="text-[12px] px-2 py-0.5 rounded-full font-semibold bg-[#0B2438]/[.07] text-[#0B2438]">{sectors[rfq.sector] || rfq.sector}</span>}
                          {(stt === 'offers_expired' || stt === 'expired_empty' || stt === 'cancelled') && (() => {
                            const tone = rfqStateTone(stt)
                            const label = rfqStatusLabel(rfq, locale) // the shared label (dealStage.rfqStatusLabel), same as the request page and «طلباتي»
                            return <span className="badge text-[12px] font-bold" style={{ background: tone.bg, color: tone.fg }}>{label}</span>
                          })()}
                          {openNow && rfq.expires_at && (() => {
                            const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                            return (
                              <span className="badge text-[12px]" style={{ background: st.bg, color: st.fg }}>
                                {formatTimeLeft(rfq.expires_at, locale)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    {rfq.status === 'closed' ? (() => {
                      const d = dealOf(rfq)
                      if (!d) return (
                        <div className="text-center rounded-xl px-3 py-2 shrink-0 min-w-[92px] bg-[#0F6E56]/10 text-[#0F6E56]">
                          <div className="text-lg leading-none"><Check className="w-5 h-5 inline" aria-hidden /></div>
                          <div className="text-[12px] font-bold leading-tight mt-0.5">{rfqStatusLabel(rfq, locale)}</div>
                        </div>
                      )
                      const { st, allDone, n, todo } = d
                      // the shared short stage badge (UX-054): «أكّد الاستلام» in gold, never «تم التسليم» before the buyer confirms
                      const lbl = allDone ? L('Deal complete', 'ڈیل مکمل', 'اكتملت الصفقة') : st.short
                      const style = todo ? { background: '#D4A543', color: '#071827' } : st.key === 'disputed' ? { background: '#B4231814', color: '#B42318' } : { background: st.tone + '14', color: st.tone === '#D4A543' ? '#8F6820' : st.tone }
                      return (<div className="text-center rounded-xl px-3 py-2 shrink-0 min-w-[92px]" style={style}><div className="text-lg leading-none"><Glyph e={st.emoji} /></div><div className="text-[12px] font-bold leading-tight mt-0.5">{lbl}{n > 1 ? ` (${n})` : ''}</div></div>)
                    })() : stt === 'expired_empty' || stt === 'cancelled' ? null : (rfq.offer_count || 0) > 0 ? (
                      <div className="text-center rounded-xl px-4 py-2 text-[#071827] shrink-0" style={{ background: '#D4A543' }}>
                        <div className="text-xl font-bold">{rfq.offer_count}</div>
                        <div className="text-[12px] text-[#071827]">{L(rfq.offer_count === 1 ? 'offer' : 'offers', 'آفر', rfq.offer_count === 1 ? 'عرض' : rfq.offer_count === 2 ? 'عرضان' : rfq.offer_count <= 10 ? 'عروض' : 'عرضاً')}</div>
                      </div>
                    ) : (
                      <div className="text-center rounded-xl px-3 py-2 bg-gray-100 text-gray-600 shrink-0 min-w-[78px]">
                        <div className="text-base leading-none mb-0.5"><Glyph e="⏳" /></div>
                        <div className="text-[12px] font-semibold leading-tight">{L('Awaiting offers', 'آفرز کا انتظار', 'بانتظار العروض')}</div>
                      </div>
                    )}
                  </div>
                  {best && <div className="mb-2 text-[13px] font-extrabold text-[#0B2438]">{best}</div>}
                  {deal?.todo && <span className="inline-block mb-2 text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#D4A543', color: '#071827' }}>{deal.todo}</span>}
                  {canExtend && <p className="mb-2 text-[13px] text-gray-700">{L('The offer window ended and no offers have arrived yet. Extend it so more suppliers can reach you.', 'آفرز کی مہلت ختم ہو گئی اور ابھی کوئی آفر نہیں آئی۔ مہلت بڑھائیں تاکہ مزید سپلائرز آپ تک پہنچیں۔', 'انتهت المهلة ولم تصل عروض بعد. مدّد المهلة ليصلك المزيد من الموردين.')}</p>}
                  <div className="flex items-center gap-x-4 gap-y-1 text-[12px] text-gray-600 font-medium flex-wrap">
                    <span><Glyph e="📦" /> {items.length > 1 ? arItems(items.length, locale) : `${rfq.quantity} ${getUnitLabelLong(rfq.unit, locale)}`}</span>
                    <span><Glyph e="📍" /> {getRegionLabel(rfq.region || '', locale)}</span>
                    {/* a home buyer reads the time left once (badge + bar), not a third time (round-4 UX-113) */}
                    {openNow && rfq.expires_at && !homeBuyer && <span><Glyph e="⏰" /> {L('The offer window ends: ', 'آفرز کی مہلت ختم ہو گی: ', 'تنتهي مهلة العروض: ')}{whenShort(rfq.expires_at)}</span>}
                    {!homeBuyer && rfq.specification && <span className="truncate max-w-[200px]"><Glyph e="⚙" /> {rfq.specification}</span>}
                    <span className="ms-auto" style={{ color: '#8F6820' }}>{t.viewDetails} {fwd}</span>
                  </div>
                  {/* عدّاد وقت بصري ينقص حتى انتهاء المهلة */}
                  {openNow && rfq.expires_at && rfq.created_at && (() => {
                    const total = new Date(rfq.expires_at).getTime() - new Date(rfq.created_at).getTime()
                    const remain = new Date(rfq.expires_at).getTime() - Date.now()
                    const pct = total > 0 ? Math.max(2, Math.min(100, (remain / total) * 100)) : 0
                    const barColor = pct < 40 ? '#8F6820' : '#0B2438' // never red for a normal countdown (round-4 UX-113)
                    return (
                      <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    )
                  })()}
                </Link>
                {/* the card's next step, a sibling link never nested in the card link (UX-195):
                    an ongoing deal → its action, a finished one → «اطلب مرة أخرى», a deadline with no offers → extend (UX-055/056) */}
                {hasFoot && (() => {
                  if (canExtend) return (
                    <Link href={`/contractor/rfq/${rfq.id}?extend=1`}
                      className="absolute bottom-4 start-5 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-[13px] font-bold text-[#071827]" style={{ background: '#D4A543' }}>
                      <Glyph e="⏰" />{L('Extend the offer window', 'آفرز کی مہلت بڑھائیں', 'مدّد المهلة')}
                    </Link>
                  )
                  if (deal && !deal.allDone) return (
                    <Link href={deal.offerId ? `/contractor/orders/${deal.offerId}` : `/contractor/rfq/${rfq.id}`}
                      className={`absolute bottom-4 start-5 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-[13px] font-bold ${deal.todo ? 'text-[#071827]' : 'text-white'}`} style={{ background: deal.todo ? '#D4A543' : '#0B2438' }}>
                      {buyerActionLabel(deal.st, locale)} <span aria-hidden="true">{fwd}</span>
                    </Link>
                  )
                  return (
                    <Link href={`/contractor/rfq/quick?from=${rfq.id}`}
                      className="absolute bottom-4 start-5 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-[13px] font-bold text-white" style={{ background: '#0B2438' }}>
                      <RotateCcw className="w-4 h-4" aria-hidden />{L('Order again', 'دوبارہ منگوائیں', 'اطلب مرة أخرى')}
                    </Link>
                  )
                })()}
                </div>
                  )
                })
              })()}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
