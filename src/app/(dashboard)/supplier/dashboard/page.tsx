'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import EnablePush from '@/components/shared/EnablePush'
import PageLoader from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { createClient } from '@/lib/supabase/client'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { FEATURES } from '@/lib/features'
import { toast } from 'sonner'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { useTranslation } from '@/i18n'
import { getSubCategoryLabel, getProductLabel, getUnitLabel, getRegionLabel, SUB_CATEGORIES, detectSubCategory } from '@/types'
import { sectionOfSub, BROWSE_SECTIONS } from '@/lib/browseCategories'
import { rfqDisplayName } from '@/lib/rfqName'
import AppShell from '@/components/shared/AppShell'
import { isSubscribed, isLaunchFree } from '@/lib/plans'
import { getNav } from '@/lib/nav'
import { AppIcon } from '@/components/AppIcon'
import { isExpired, formatTimeLeft, deadlineUrgency, urgencyStyle, formatDateTime } from '@/lib/deadline'
import { offerComparable, VAT_RATE } from '@/lib/vat'
import { dealTotal } from '@/lib/dealTotal'
import { tierLabel, tierAllowed, sellerKindOf, rememberSellerKind, offerNeedsSupplier, offerHasOpenDiscount, offerHasOpenQuestion, offerOutcome, outcomeLabel, agentCapText, agentCapProgress, sectorName } from '@/lib/sellers'
import { SA_CITY_COORDS, distanceKm } from '@/lib/saCityCoords'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import Glyph from '@/components/shared/Glyph'
import { daysText, arMaterials, arCount, timeAgo } from '@/lib/text'
import { askConfirm } from '@/lib/askConfirm'
import { Check, ChevronDown, ChevronUp, Star, X } from 'lucide-react'
import { realtimeTopic } from '@/lib/realtimeTopic'

const txt = {
  ar: {
    welcome: 'أهلاً', subtitle: 'تصفح طلبات التسعير المتاحة وقدم عروضك',
    logout: 'خروج', openRfqs: 'بانتظار تسعيرك', pendingOffers: 'عروض بانتظار قرار المشتري',
    acceptedOffers: 'عروض اختيرت', revenue: 'بحاجة لردّك',
    tabRfqs: 'طلبات التسعير', tabOffers: 'عروضي',
    noRfqs: 'لا توجد طلبات مفتوحة الآن', noRfqsSub: 'تأكّد من اكتمال تخصصاتك وموقعك، وسننبّهك فور وصول أول طلب مطابق.',
    noOffers: 'لم ترسل أي عرض بعد', noOffersSub: 'تصفّح طلبات التسعير وأرسل عرضك الأول.',
    submitOffer: 'سعّر الآن', offerSubmitted: 'أُرسل عرضك', accepted: 'اختيرت', rejected: 'لم تُختر', pending: 'بانتظار قرار المشتري',
    day: 'يوم', offer: 'عرض', loading: 'جارٍ التحميل...',
    sar: 'ر.س',
  },
  en: {
    welcome: 'Hello', subtitle: 'Browse open price requests and send your offers',
    logout: 'Logout', openRfqs: 'Waiting for your price', pendingOffers: 'Waiting for the buyer',
    acceptedOffers: 'Chosen offers', revenue: 'Need your reply',
    tabRfqs: 'Price requests', tabOffers: 'My Offers',
    noRfqs: 'No open requests', noRfqsSub: 'Make sure your specialties and location are complete; we will alert you as soon as the first matching request arrives.',
    noOffers: 'No offers submitted yet', noOffersSub: 'Browse price requests and send your first offer',
    submitOffer: 'Price now', offerSubmitted: 'Offer sent', accepted: 'Chosen', rejected: 'Not chosen', pending: 'Waiting for the buyer',
    day: 'days', offer: 'offer', loading: 'Loading...',
    sar: 'SAR',
  },
  ur: {
    welcome: 'خوش آمدید', subtitle: 'کھلی قیمت کی درخواستیں دیکھیں اور اپنی آفرز بھیجیں',
    logout: 'لاگ آؤٹ', openRfqs: 'آپ کی قیمت کی منتظر', pendingOffers: 'خریدار کے فیصلے کی منتظر',
    acceptedOffers: 'منتخب آفرز', revenue: 'آپ کے جواب کی منتظر',
    tabRfqs: 'قیمت کی درخواستیں', tabOffers: 'میری آفرز',
    noRfqs: 'کوئی کھلی درخواست نہیں', noRfqsSub: 'یقینی بنائیں کہ آپ کے تخصصات اور مقام مکمل ہیں؛ پہلی مماثل درخواست آتے ہی ہم آپ کو بتائیں گے۔',
    noOffers: 'ابھی تک کوئی آفر نہیں', noOffersSub: 'درخواستیں دیکھیں اور پہلی آفر بھیجیں',
    submitOffer: 'ابھی قیمت دیں', offerSubmitted: 'آفر بھیج دی گئی', accepted: 'منتخب', rejected: 'منتخب نہیں ہوئی', pending: 'خریدار کے فیصلے کی منتظر',
    day: 'دن', offer: 'آفر', loading: 'لوڈ ہو رہا ہے...',
    sar: 'ریال',
  },
}

export default function SupplierDashboard() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMember, setIsMember] = useState(false) // عضو في فريق شركة: يعمل باسمها
  // round-5 UX-007: a company or shop without a valid commercial registration cannot price (my_pricing_gate, 244)
  const [crRequired, setCrRequired] = useState(false)
  // round-5 UX-219: a pricing agent's per-deal cap and progress (my_agent_deal_cap, 213/214)
  const [agentCap, setAgentCap] = useState<{ cap: any; deals: any } | null>(null)
  // round-5 UX-168: on a phone the performance numbers fold under «أداؤك هذا الشهر»
  const [showStatsMobile, setShowStatsMobile] = useState(false)
  const [launchUntil, setLaunchUntil] = useState<any>(null)
  const [pricesCount, setPricesCount] = useState<any>(null)
  // UX-169: product names with a saved price, so a card can say «لديك أسعار محفوظة لـ X من Y»
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set())
  // round-4 UX-188: market average per material + unit (get_market_prices, 3+ accepted prices)
  // round-6 UX-014: what buyers actually pay (avg_buyer_price, migration 284); before VAT x 1.15 only as a fallback
  const [market, setMarket] = useState<Record<string, number>>({})
  useEffect(() => {
    Promise.resolve(createClient().rpc('get_market_prices')).then(({ data }: any) => {
      const m: Record<string, number> = {}
      for (const r of (data || [])) if (Number(r.offer_count) >= 3 && Number(r.avg_price) > 0) m[`${r.product_name}__${r.unit || ''}`] = Number(r.avg_buyer_price) > 0 ? Number(r.avg_buyer_price) : Number(r.avg_price) * (1 + VAT_RATE)
      setMarket(m)
    }, () => {})
  }, [])
  // UX-082: filter chips on «عروضي» (?status=pending|won|lost|reply)
  const [offerFilter, setOfferFilter] = useState<'all' | 'pending' | 'won' | 'lost' | 'reply'>('all')
  const [openRfqs, setOpenRfqs] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<any[]>([])
  // company team: who sent each offer (offers.submitted_by → name), so colleagues don't price twice
  const [team, setTeam] = useState<{ me: string; company: string; names: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [tab, setTab] = useState('rfqs')
  const autoTabDone = useRef(false)
  // UX-125: back from the set-up page: say the profile is ready
  const [welcome, setWelcome] = useState(false)
  // round-4 UX-140: a new team member lands here after joining
  const [joined, setJoined] = useState(false)
  useEffect(() => { try { const q = new URLSearchParams(window.location.search); if (q.get('welcome') === '1') setWelcome(true); if (q.get('joined') === '1') setJoined(true); if (q.get('welcome') || q.get('joined')) window.history.replaceState(null, '', '/supplier/dashboard') } catch {} }, [])
  // ?tab=offers opens «عروضي» (from «عروضي وصفقاتي»)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const st = q.get('status')
      if (st === 'pending' || st === 'won' || st === 'lost' || st === 'reply') { setOfferFilter(st); autoTabDone.current = true }
      if (q.get('tab') === 'offers' || st) { setTab('offers'); setTimeout(() => document.getElementById('sup-list')?.scrollIntoView({ block: 'start' }), 400) }
    } catch {}
  }, [])
  const [rfqFilter, setRfqFilter] = useState('toprice') // all | toprice | expiring
  const [hasSpecialties, setHasSpecialties] = useState(true)
  const [hasSectors, setHasSectors] = useState(true)
  const [showMoreBanners, setShowMoreBanners] = useState(false) // باقي التنبيهات خلف «عرض المزيد»
  // round-6 UX-111: «منشأتي غير مسجّلة» hides the VAT question on this device
  const [vatNotReg, setVatNotReg] = useState(false)
  useEffect(() => { if (!profile?.id) return; try { setVatNotReg(localStorage.getItem('tsk_vat_not_reg_' + profile.id) === '1') } catch {} }, [profile?.id])
  const [showScoreMobile, setShowScoreMobile] = useState(false) // بطاقة قوة الملف على الجوال
  // Requests this supplier already opened (this device) — unopened, unpriced ones glow until opened.
  const [seen, setSeen] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!user?.id) return
    try { setSeen(new Set(JSON.parse(localStorage.getItem('tsk_seen_rfqs_' + user.id) || '[]'))) } catch {}
  }, [user?.id])
  const markSeen = (id: string) => {
    if (!user?.id || seen.has(id)) return
    const next = new Set(seen); next.add(id); setSeen(next)
    try { localStorage.setItem('tsk_seen_rfqs_' + user.id, JSON.stringify([...next].slice(-500))) } catch {}
  }

  async function load(): Promise<void> {
    setLoadFailed(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      // Back on this page within the tab: show the last data at once, refresh below.
      const cacheKey = 'sup_' + session.user.id
      const snap = readPageCache(cacheKey)
      if (snap) {
        setProfile(snap.p); setIsMember(!!snap.isMember); setCrRequired(!!snap.crRequired); setLaunchUntil(snap.launchUntil ?? null); setPricesCount(snap.pricesCount ?? 0)
        setMyOffers(snap.offers || []); setHasSectors(snap.hasSectors !== false); setHasSpecialties(snap.hasSpecialties !== false)
        if (Array.isArray(snap.savedNames)) setSavedNames(new Set(snap.savedNames))
        setOpenRfqs(snap.openRfqs || []); setLoading(false)
      }
      // A team member works on behalf of their company: everything below reads the company.
      // The company id barely ever changes, so a cached one lets the rest start right away; it is
      // still verified below and the page reloads itself if it changed.
      const actPromise = Promise.resolve(supabase.rpc('acting_uid')).then((x: any) => (x?.data as string) || session.user.id).catch(() => session.user.id)
      const actId: string = snap?.actId || await actPromise
      setIsMember(actId !== session.user.id)
      // a company with team members: names for «أرسله …» (fails quietly for an independent seller)
      Promise.resolve(supabase.rpc('list_company_team')).then(({ data }: any) => {
        const members = (data?.ok && Array.isArray(data.members)) ? data.members : []
        if (!members.length) return
        const names: Record<string, string> = {}
        for (const m of members) names[m.user_id] = m.name || ''
        setTeam({ me: session.user.id, company: actId, names })
      }).catch(() => {})
      // round-5 UX-007: the pricing gate (reads the company for a team member through acting_uid)
      const gatePromise = Promise.resolve(supabase.rpc('my_pricing_gate')).then((r: any) => r?.data?.cr_required === true, () => false)
      // Speed: the database is far from our users (~1 s a request), so everything that only needs
      // the company id goes out at once instead of one after another (was 11 sequential requests).
      const [
        { data: p, error: pErr }, { data: cfg }, { data: sectorRows, error: secErr }, { data: specRows, error: specErr },
        { data: myBranches }, { data: dismissals }, { data: offersRaw, error: offersErr }, { data: lpRows, count: lpCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', actId).single(),
        supabase.from('app_config').select('launch_free_until').maybeSingle(),
        supabase.from('profile_sectors').select('sector').eq('profile_id', actId),
        supabase.from('profile_specialties').select('specialty').eq('profile_id', actId),
        supabase.from('branches').select('region').eq('supplier_id', actId),
        supabase.from('rfq_dismissals').select('rfq_id').eq('supplier_id', actId),
        supabase.from('offers').select('*, rfq:rfqs(product_name, sector, sub_category, quantity, unit, region, status, ref_no, items, created_at)').eq('supplier_id', actId).order('created_at', { ascending: false }).limit(200),
        supabase.from('live_prices').select('product_name, unit, region', { count: 'exact' }).eq('supplier_id', actId).limit(1000),
      ])
      // a failed read must not look like «no requests / no offers»: keep what is shown and say so
      if (pErr || secErr || specErr || offersErr) throw (pErr || secErr || specErr || offersErr)
      // a multi-item request awarded per item: the deal is only the awarded items, not the whole
      // offer (same as /supplier/deals) — revenue, monthly sales, average deal and the offer cards
      const accIds = (offersRaw || []).filter((o: any) => o.status === 'accepted').map((o: any) => o.id)
      const awarded: Record<string, number> = {}
      if (accIds.length) {
        const { data: aw } = await supabase.from('rfq_item_awards').select('offer_id, total').in('offer_id', accIds)
        for (const a of aw || []) awarded[a.offer_id] = (awarded[a.offer_id] || 0) + (Number(a.total) || 0)
      }
      // round-5 UX-051: one deal amount everywhere (awarded materials + confirmed extra charges, on the seller's VAT basis)
      const offers = (offersRaw || []).map((o: any) => o.status === 'accepted' ? { ...o, deal_total: dealTotal(o, awarded[o.id] ?? null) } : o)
      const crReq = await gatePromise
      setCrRequired(crReq)
      if (p && sellerKindOf(p.provider_type) === 'independent') {
        Promise.resolve(supabase.rpc('my_agent_deal_cap')).then(({ data }: any) => { const row = Array.isArray(data) ? data[0] : data; if (row) setAgentCap({ cap: row.cap, deals: row.deals }) }, () => {})
      }
      setProfile(p)
      if (p) rememberSellerKind(sellerKindOf(p.provider_type))
      setLaunchUntil(cfg?.launch_free_until || null)
      setMyOffers(offers)
      setPricesCount(lpCount ?? 0)
      // round-4 UX-065: the same rule as the pricing page: product OR its category name, with the unit, and the region (or none)
      const savedList: string[] = [...new Set<string>((lpRows || []).filter((r: any) => r.product_name).map((r: any) => `${r.product_name}__${r.unit || ''}__${r.region || ''}`))]
      setSavedNames(new Set(savedList))
      // UX-030: the buyer is waiting for a reply: open «عروضي» first (once per visit)
      // round-2 UX-009: an answered question or a closed discount request no longer counts
      if (!autoTabDone.current) {
        autoTabDone.current = true
        if ((offers || []).some((o: any) => offerNeedsSupplier(o))) setTab('offers')
      }

      // جلب قطاعات المورد المتخصص فيها
      const mySectors = (sectorRows || []).map((r: any) => r.sector)
      setHasSectors(mySectors.length > 0)

      // جلب التخصصات الفرعية للمورد
      const mySpecialties = (specRows || []).map((r: any) => r.specialty)
      setHasSpecialties(mySpecialties.length > 0)

      // فلترة الطلبات حسب تصنيف المورد
      const minVal = p?.min_order_value || 0

      // The feed comes from get_supplier_feed (185): sectors, minimum value, verified-only, supplier
      // type, regions, dismissed and deadline are applied on the server before the limit, and the
      // rows carry no contractor_id (buyer privacy). The checks below stay as a second filter.
      const { data: rfqsRaw, error: feedErr } = await supabase.rpc('get_supplier_feed', {
        p_sectors: mySectors.length > 0 ? mySectors : null,
        p_min_value: 0, // minimum order value removed (owner 2026-11-21)
        p_limit: 150,
      })
      if (feedErr) throw feedErr // never cache a failed feed as «no requests»

      // ✅ مطابقة بند-بند: يظهر الطلب لو يقدر يورّد مادة واحدة على الأقل
      // (قطاعها ضمن قطاعاته + تخصصها ضمن تخصصاته أو بدون تخصص محدد)
      let rfqs = (rfqsRaw || []).map((r: any) => {
        const its = Array.isArray(r.items) && r.items.length ? r.items : [{ sector: r.sector, sub_category: r.sub_category }]
        const myCount = its.filter((it: any) => {
          if (mySectors.length > 0 && !mySectors.includes(it.sector)) return false
          if (mySpecialties.length > 0 && it.sub_category && !mySpecialties.includes(it.sub_category)) return false
          return true
        }).length
        const mine = its.filter((it: any) => (mySectors.length === 0 || mySectors.includes(it.sector)) && (mySpecialties.length === 0 || !it.sub_category || mySpecialties.includes(it.sub_category)))
        const myNames = mine.map((it: any) => it.product_name).filter(Boolean)
        const myLines = mine.filter((it: any) => it.product_name).map((it: any) => ({ product_name: it.product_name, unit: it.unit || '', sector: it.sector || r.sector, sub_category: it.sub_category || null, quantity: Number(it.quantity) || 0 }))
        if (!myLines.length && r.product_name) myLines.push({ product_name: r.product_name, unit: r.unit || '', sector: r.sector, sub_category: r.sub_category || null, quantity: Number(r.quantity) || 0 })
        return { ...r, _myItemCount: myCount, _myNames: myNames, _myLines: myLines } // عدد أصناف هذا المورد فقط (لا الإجمالي)
      }).filter((r: any) => r._myItemCount > 0)

      // ✅ فلترة حسب استهداف المقاول: فئة المورد (شركة معتمدة/محل/مستقل) + الموثّقون فقط
      const myTier = p?.supplier_tier || 'shop'
      const isVerified = p?.verification_status === 'verified'
      // الفروع: المورد يخدم منطقته الرئيسية + كل مناطق فروعه
      const servedRegions = [p?.region, ...(myBranches || []).map((b: any) => b.region)].filter(Boolean)
      rfqs = rfqs.filter((r: any) => {
        if (r.verified_only && !isVerified) return false
        if (!tierAllowed(r.target_tiers, myTier)) return false
        if (r.nearby_only && servedRegions.length > 0 && !servedRegions.includes(r.region)) return false
        // المقاول حدّد مناطق معيّنة — أظهر الطلب فقط لو أخدم إحداها
        if (Array.isArray(r.target_regions) && r.target_regions.length > 0 && !r.target_regions.some((reg: any) => servedRegions.includes(reg))) return false
        return true
      })

      // استبعاد الطلبات المتجاهلة + المنتهية مهلتها (ما عاد يقدر يسعّرها)
      const dismissedIds = new Set((dismissals || []).map((d: any) => d.rfq_id))
      const visibleRfqs = (rfqs || []).filter((r: any) => !dismissedIds.has(r.id) && !isExpired(r.expires_at))

      setOpenRfqs(visibleRfqs)

      // إنذار: طلبات تنتهي مهلتها قريباً (خلال 12 ساعة) — حثّ المورد على التسعير
      const expiringSoon = visibleRfqs.filter((r: any) => { const u = deadlineUrgency(r.expires_at); return u === 'soon' || u === 'critical' })
      if (expiringSoon.length > 0 && !snap) {
        toast(`${expiringSoon.length} ${expiringSoon.length === 1 ? L('request ends soon — price it now', 'درخواست کی مہلت جلد ختم ہو رہی ہے — جلدی قیمت دیں', 'طلب تنتهي مهلته قريباً — سارِع بالتسعير') : L('requests end soon — price them now', 'درخواستوں کی مہلت جلد ختم ہو رہی ہے — جلدی قیمت دیں', 'طلبات تنتهي مهلتها قريباً — سارِع بالتسعير')}`, { duration: 7000 })
      }

      setLoading(false)
      if ((await actPromise) !== actId) { writePageCache(cacheKey, null); return load() }
      writePageCache(cacheKey, {
        actId, isMember: actId !== session.user.id, crRequired: crReq, p, launchUntil: cfg?.launch_free_until || null, pricesCount: lpCount ?? 0,
        offers: offers || [], hasSectors: mySectors.length > 0, hasSpecialties: mySpecialties.length > 0, openRfqs: visibleRfqs, savedNames: savedList,
      })
    } catch (e) {
      console.error('[supplier/dashboard] load failed:', e)
      setLoadFailed(true)
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // إشعار فوري: لمّا ينزل طلب تسعير جديد والمورد فاتح الصفحة، يوصله تنبيه ويتحدّث
  // إشعار حيّ موثوق: نستمع لإشعارات هذا المورد نفسه (مفلترة بـ user_id) — الترايجر
  // في قاعدة البيانات يفتح إشعاراً لكل مورد مطابق عند وصول طلب جديد.
  useEffect(() => {
    const supabase = createClient()
    let ch: any
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      ch = supabase
        .channel(realtimeTopic(`sup-noti-${session.user.id}`))
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, (payload: any) => {
          const n = payload.new
          if (n?.type === 'new_rfq') {
            toast.success(n.title || (L('New request received', 'نئی قیمت کی درخواست موصول ہوئی', 'وصلك طلب تسعير جديد')), {
              description: n.body || undefined, duration: 15000,
              action: { label: L('Open the request', 'درخواست کھولیں', 'افتح الطلب'), onClick: () => { const rid = n.data?.rfq_id || n.rfq_id || (String(n.link || '').match(/rfq\/([0-9a-f-]{36})/) || [])[1]; window.location.href = rid ? `/supplier/dashboard/rfq/${rid}` : '/supplier/dashboard' } },
            })
            load()
          }
          // round-6 UX-141: the buyer chose my offer while the page is open: a gold moment with the way to the deal
          if (n?.type === 'offer_accepted' && String(n.title || '').startsWith('اختار المشتري عرضك')) {
            const rid = n.data?.rfq_id || n.rfq_id || (String(n.data?.url || n.link || '').match(/rfq\/([0-9a-f-]{36})/) || [])[1]
            toast(L('Congratulations, the buyer chose your offer', 'مبارک ہو، خریدار نے آپ کی آفر چن لی', 'تهانينا، اختار المشتري عرضك'), {
              description: n.body || undefined, duration: 20000,
              style: { background: '#FFF8E6', border: '2px solid #D4A543', color: '#071827' },
              action: { label: L('Open the deal', 'سودا کھولیں', 'افتح الصفقة'), onClick: () => { window.location.href = rid ? `/supplier/dashboard/rfq/${rid}#deal` : '/supplier/deals' } },
            })
            load()
          }
        })
        .subscribe()
    })
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [])

  async function handleSignOut() {
    if (!(await askConfirm(L('Sign out? Unsent drafts saved on this device will be deleted.', 'لاگ آؤٹ کریں؟ اس ڈیوائس پر محفوظ نہ بھیجے گئے مسودے حذف ہو جائیں گے۔', 'تسجيل الخروج؟ ستُحذف المسودات غير المرسلة المحفوظة على هذا الجهاز.'), { okLabel: L('Sign out', 'لاگ آؤٹ', 'تسجيل الخروج'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    const supabase = createClient()
    clearAllLocalDrafts()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    if (typeof document === 'undefined') return
    const ids = new Set(myOffers.map((o: any) => o.rfq_id))
    const n = openRfqs.filter((r: any) => !ids.has(r.id) && !seen.has(r.id)).length
    const base = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = n > 0 ? `(${n}) ${base}` : base
  }, [openRfqs, myOffers, seen])

  if (loading) return <PageLoader />

  const FWD = dir === 'rtl' ? '←' : '→'
  const staleMsg = L('Could not refresh; this is the last saved copy.', 'تازہ نہیں ہو سکا؛ یہ آخری محفوظ نسخہ ہے۔', 'تعذّر التحديث، والمعروض آخر نسخة محفوظة.')
  const offeredRfqIds = new Set(myOffers.map((o: any) => o.rfq_id)) // RFQs the supplier already bid on
  const offerByRfq: Record<string, any> = {}
  for (const o of myOffers) offerByRfq[o.rfq_id] = o
  // «أرسلتَه أنت» / «أرسله أحمد» / «أرسله مالك الحساب» — only for a company that has team members
  const sentBy = (o: any): string => {
    if (!team || !o?.submitted_by) return ''
    if (o.submitted_by === team.me) return L('Sent by you', 'آپ نے بھیجی', 'أرسلتَه أنت')
    if (o.submitted_by === team.company) return L('Sent by the account owner', 'اکاؤنٹ کے مالک نے بھیجی', 'أرسله مالك الحساب')
    const n = team.names[o.submitted_by]
    return n ? L(`Sent by ${n}`, `${n} نے بھیجی`, `أرسله ${n}`) : ''
  }
  // round-2 UX-010: the outcome reads the request too: a cancelled or expired request is not a loss
  const outcomeOf = (o: any) => offerOutcome(o.status, o.rfq?.status)
  const accepted = myOffers.filter((o: any) => o.status === 'accepted').length
  const pending = myOffers.filter((o: any) => outcomeOf(o) === 'pending').length
  const lostCount = myOffers.filter((o: any) => outcomeOf(o) === 'lost').length
  // round-5 UX-051: dealTotal (awarded items + confirmed extras), the same amount as the deal page and the deals list
  const amountOf = (o: any): number => (o?.status === 'accepted' ? Number(o.deal_total ?? dealTotal(o)) || 0 : offerComparable(o))
  const totalRevenue = myOffers.filter((o: any) => o.status === 'accepted').reduce((s: any, o: any) => s + amountOf(o), 0) // UX-029: one basis (what the buyer pays)

  // Requests still waiting for this supplier's price: shown first, the unopened ones glow.
  const toPrice = openRfqs.filter((r: any) => !offeredRfqIds.has(r.id))
  const isFresh = (r: any) => !offeredRfqIds.has(r.id) && !seen.has(r.id)
  const freshCount = openRfqs.filter(isFresh).length
  const sortedOpen = [...openRfqs].sort((a: any, b: any) =>
    (Number(isFresh(b)) - Number(isFresh(a))) || (Number(!offeredRfqIds.has(b.id)) - Number(!offeredRfqIds.has(a.id))) ||
    (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
  // Sales over the last 6 months (accepted offers, by acceptance month) for the chart.
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return { y: d.getFullYear(), m: d.getMonth(), sales: 0, deals: 0 } })
  for (const o of myOffers) {
    if (o.status !== 'accepted') continue
    const d = new Date(o.accepted_at || o.updated_at || o.created_at)
    const b = months.find(x => x.y === d.getFullYear() && x.m === d.getMonth())
    if (b) { b.sales += amountOf(o); b.deals += 1 }
  }
  const decided = accepted + lostCount // cancelled / expired requests are left out of the win rate
  const winRate = decided ? Math.round((accepted / decided) * 100) : 0
  const avgDeal = accepted ? Math.round(totalRevenue / accepted) : 0

  const cardTitle = (rfq: any): string => {
    const names: string[] = Array.isArray(rfq._myNames) ? rfq._myNames : []
    if (names.length < 2) return rfqDisplayName({ ...rfq, title: null }, locale, rfq._myItemCount)
    const two = names.slice(0, 2).map((n: string) => getProductLabel(n, locale)).join(L(', ', '، ', '، '))
    const more = names.length - 2
    return more > 0 ? `${two} ${L(`and ${more} more`, `اور ${more} مزید`, `و${arCount(more, 'مادة أخرى', 'مادتان أخريان', 'مواد أخرى', 'مادة أخرى')}`)}` : two
  }
  const needsMe = (o: any) => offerNeedsSupplier(o)
  const offerStatusLabel = (o: any) => outcomeLabel(outcomeOf(o), locale)
  // UX-108: the browse section (10 sections) instead of the old engineering sector names
  const sectionName = (sector: string, sub?: string | null): string => {
    const g = sub ? (SUB_CATEGORIES as any)[sector]?.[sub]?.group : null
    const k = sectionOfSub(sub || null, g || null)
    const s = k ? BROWSE_SECTIONS.find(x => x.key === k) : null
    return s ? L(s.en, s.ur, s.ar) : (sectorName(sector, locale) || sector)
  }
  const rfqSection = (rfq: any): string => {
    const its: any[] = Array.isArray(rfq?.items) && rfq.items.length ? rfq.items : []
    const first = its.find((it: any) => it?.sub_category) || null
    return first ? sectionName(first.sector || rfq.sector, first.sub_category) : sectionName(rfq?.sector, rfq?.sub_category)
  }
  // UX-169: how many of my materials in this request already have a saved price
  // round-4 UX-065: a line has a saved price for its product or its category, in its unit, for this region or any region
  const hasSaved = (name: string, unit: string, region: string) => savedNames.has(`${name}__${unit}__`) || (!!region && savedNames.has(`${name}__${unit}__${region}`))
  const savedOf = (rfq: any): { have: number; of: number } => {
    const lines: any[] = Array.isArray(rfq._myLines) ? rfq._myLines : []
    const have = lines.filter((l: any) => {
      if (hasSaved(l.product_name, l.unit || '', rfq.region || '')) return true
      const sub = l.sub_category || detectSubCategory(l.product_name, l.sector)
      const subName = sub ? getSubCategoryLabel(l.sector, sub, 'ar') : ''
      return !!subName && hasSaved(subName, l.unit || '', rfq.region || '')
    }).length
    return { have, of: lines.length }
  }
  // round-4 UX-188: an estimated value from the market index, when known
  // round-6 UX-014: summed from what buyers pay (no VAT added on top); UX-111: how many of my materials it covers
  const estimateInfo = (rfq: any): { sum: number; known: number; of: number } => {
    const lines: any[] = Array.isArray(rfq._myLines) ? rfq._myLines : []
    let sum = 0, known = 0
    for (const l of lines) { const m = market[`${l.product_name}__${l.unit || ''}`]; if (m && l.quantity > 0) { sum += m * l.quantity; known++ } }
    return { sum: Math.round(sum), known, of: lines.length }
  }
  const estimateOf = (rfq: any): number => estimateInfo(rfq).sum
  // round-5 UX-215: distance from my map pin to the request's city centre, rounded to 5 km (no pin or no city = none)
  const kmTo = (rfq: any): number | null => {
    const lat = Number(profile?.latitude), lng = Number(profile?.longitude)
    if (!rfq?.city || !lat || !lng) return null
    const c = SA_CITY_COORDS.find(x => x.city === rfq.city)
    if (!c) return null
    const d = distanceKm(lat, lng, c.lat, c.lng)
    return Math.max(5, Math.round(d / 5) * 5)
  }
  const shownOffers = myOffers.filter((o: any) => {
    const k = outcomeOf(o)
    if (offerFilter === 'pending') return k === 'pending'
    if (offerFilter === 'won') return k === 'won'
    if (offerFilter === 'lost') return k === 'lost' || k === 'cancelled' || k === 'expired'
    if (offerFilter === 'reply') return needsMe(o)
    return true
  })

  const companyName = locale === 'en' && profile?.company_name_en ? profile.company_name_en : profile?.company_name_ar

  const nav = getNav('supplier', locale, '/supplier/dashboard')
  if (toPrice.length > 0) nav[0] = { ...nav[0], badge: toPrice.length } // UX-119: requests still waiting for my price

  return (
    <AppShell
      title={L('Supplier Dashboard', 'سپلائر ڈیش بورڈ', 'لوحة المورّد')}
      company={companyName}
      companyMeta={tierLabel(profile?.supplier_tier, locale, false)}
      companyVerified={profile?.verification_status === 'verified'}
      userId={user?.id}
      nav={nav}
      onSignOut={handleSignOut}
      dir={dir}
    >
      <div className="max-w-6xl mx-auto">
        {welcome && (
          <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-2xl p-4 border border-emerald-200 bg-emerald-50 text-emerald-900 animate-fade-in">
            <span className="font-bold"><Glyph e="✅" /> {L('Your profile is saved, and you are ready to receive requests.', 'آپ کی پروفائل محفوظ ہو گئی، اور آپ درخواستیں وصول کرنے کے لیے تیار ہیں۔', 'تم حفظ ملفك، وأصبحت جاهزاً لاستقبال الطلبات.')}</span>
            <button type="button" onClick={() => setWelcome(false)} className="w-11 h-11 -m-2 grid place-items-center shrink-0 text-emerald-700" aria-label={L('Close', 'بند کریں', 'إغلاق')}><X className="w-4 h-4" aria-hidden /></button>
          </div>
        )}
        {joined && (
          <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-2xl p-4 border border-emerald-200 bg-emerald-50 text-emerald-900 animate-fade-in">
            <span className="leading-relaxed"><b>{L(`You joined the team of ${companyName || 'the company'}.`, `آپ ${companyName || 'کمپنی'} کی ٹیم میں شامل ہو گئے۔`, `انضممت إلى فريق ${companyName || 'الشركة'}.`)}</b> {L('Price the requests below in the company name; the account owner manages the deals and the conversations with buyers.', 'نیچے دی گئی درخواستوں کی قیمت کمپنی کے نام سے دیں؛ سودے اور خریداروں سے بات چیت اکاؤنٹ کا مالک سنبھالتا ہے۔', 'سعّر الطلبات أدناه باسم الشركة، ويدير صاحب الحساب الصفقات والمحادثات مع المشترين.')}</span>
            <button type="button" onClick={() => setJoined(false)} className="w-11 h-11 -m-2 grid place-items-center shrink-0 text-emerald-700" aria-label={L('Close', 'بند کریں', 'إغلاق')}><X className="w-4 h-4" aria-hidden /></button>
          </div>
        )}
        {(() => {
          const waiting = myOffers.filter(needsMe)
          if (!waiting.length) return null
          const n = waiting.length
          return (
            <div role="status" className="mb-5 rounded-2xl p-4 sm:p-5 border-2 border-[#D4A543] bg-white shadow-sm animate-fade-in">
              <div className="font-extrabold text-[#0B2438] mb-3"><Glyph e="🔔" /> {L(`The buyer is waiting for your reply on ${n === 1 ? 'one offer' : n + ' offers'}`, `خریدار ${n} آفر پر آپ کے جواب کا منتظر ہے`, `المشتري ينتظر ردّك على ${arCount(n, 'عرض واحد', 'عرضين', 'عروض', 'عرضاً')}`)}</div>
              <div className="space-y-2">
                {waiting.slice(0, 5).map((o: any) => {
                  const disc = offerHasOpenDiscount(o)
                  return (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#D4A543]/10 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#0B2438] truncate">{o.rfq ? rfqDisplayName({ ...o.rfq, title: null }, locale) : '—'}</div>
                        <div className="text-[13px] text-gray-700">{disc
                          ? L(`The buyer asked for a discount — reply by ${formatDateTime(o.reduction_deadline)}`, `خریدار نے رعایت مانگی — ${formatDateTime(o.reduction_deadline)} تک جواب دیں`, `طلب المشتري خصماً، والمهلة حتى ${formatDateTime(o.reduction_deadline)}`)
                          : L('A question from the buyer', 'خریدار کا سوال', 'سؤال من المشتري')}</div>
                      </div>
                      <Link href={`/supplier/dashboard/rfq/${o.rfq_id}`} className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-extrabold text-[#071827] shrink-0" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Reply now', 'ابھی جواب دیں', 'ردّ الآن')}</Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
        {toPrice.length > 0 && (
          <div className={`mb-5 rounded-2xl p-4 sm:p-5 border-2 animate-fade-in ${freshCount ? 'tsk-glow' : ''}`} style={{ borderColor: '#D4A543', background: 'linear-gradient(120deg,#071827,#0B2438 60%,#102E45)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="relative grid place-items-center w-11 h-11 rounded-xl text-xl text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                  <Glyph e="🔔" />
                  {freshCount > 0 && <span className="absolute -top-1 -end-1 min-w-5 h-5 px-1 rounded-full bg-white text-[#071827] text-[12px] font-bold grid place-items-center border border-[#D4A543]">{freshCount}</span>}
                </span>
                <div>
                  <div className="font-extrabold text-white">{L(`${toPrice.length} request${toPrice.length === 1 ? '' : 's'} waiting for your price`, `${toPrice.length} درخواستیں آپ کی قیمت کی منتظر`, `${arCount(toPrice.length, 'طلب واحد', 'طلبان', 'طلبات', 'طلباً')} بانتظار تسعيرك`)}</div>
                  <div className="text-[13px] text-white/80">{freshCount ? L(`${freshCount} new — price early to stand out`, `${freshCount} نئی — جلد قیمت دیں`, `منها ${freshCount === 1 ? 'طلب جديد لم تفتحه' : `${arCount(freshCount, 'طلب', 'طلبان', 'طلبات', 'طلباً')} جديدة لم تفتحها`}، والتسعير المبكر يرفع فرصتك`) : L('Price early to raise your chances', 'جلد قیمت دیں', 'التسعير المبكر يرفع فرصتك')}</div>
                </div>
              </div>
              <button type="button" onClick={() => { setTab('rfqs'); setRfqFilter('toprice'); document.getElementById('sup-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className="inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-white px-4 rounded-xl border border-white/40 hover:bg-white/10">
                {L('Show them', 'دیکھیں', 'اعرضها')} <span aria-hidden="true">{FWD}</span>
              </button>
            </div>
          </div>
        )}
        {isMember && (
          <div className="rounded-xl px-4 py-2.5 mb-4 text-sm border flex flex-wrap items-center justify-between gap-2" style={{ background: '#0B24380A', borderColor: '#0B243826', color: '#0B2438' }}>
            <span><Glyph e="👥" /> {locale === 'en' ? 'You are working on behalf of' : locale === 'ur' ? 'آپ اس کمپنی کی جانب سے کام کر رہے ہیں:' : 'تعمل باسم'} <b>{companyName}</b></span>
            <Link href="/supplier/team" className="inline-flex items-center min-h-[44px] text-xs font-bold underline">{locale === 'en' ? 'Team' : locale === 'ur' ? 'ٹیم' : 'فريق العمل'}</Link>
          </div>
        )}
        {/* التنبيهات: نعرض «الخطوة التالية» الأعلى أولوية فقط، والباقي خلف «عرض المزيد» — كي لا تُدفع قائمة الطلبات أسفل الشاشة على الجوال */}
        {(() => {
          const banners: { key: string; node: any }[] = []
          // round-5 UX-007: no commercial registration = no pricing: the first banner, before anything else.
          // A team member cannot add it: he is told the account owner must.
          // round-6 UX-035: without the location and what he sells no request arrives at all, so that step comes first;
          // when both are missing, one card with the two steps in order
          const needsSetup = !!profile && !profile.region && !isMember
          if (needsSetup && crRequired) banners.push({ key: 'setup2', node: (
            <div role="status" className="rounded-2xl p-5 border-2 bg-white" style={{ borderColor: '#D4A543' }}>
              <div className="font-extrabold text-[#071827] mb-3">{L('Two steps to start receiving and pricing requests', 'درخواستیں وصول کرنے اور قیمت دینے کے لیے دو قدم', 'خطوتان لتصلك الطلبات وتبدأ التسعير')}</div>
              <ol className="space-y-3">
                <li className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#0B2438]">{L('1. Complete your profile (your location and what you sell) so requests reach you', '1۔ اپنی پروفائل مکمل کریں (آپ کا مقام اور آپ کیا بیچتے ہیں) تاکہ درخواستیں آپ تک پہنچیں', '1. أكمل ملفك (موقعك وما تبيعه) لتصلك الطلبات')}</span>
                  <Link href="/onboarding" className="inline-flex items-center gap-1 min-h-[44px] px-5 rounded-xl text-sm font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>{L('Complete now', 'ابھی مکمل کریں', 'أكمل ملفك الآن')} <span aria-hidden="true">{FWD}</span></Link>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#0B2438]">{L('2. Add the commercial registration to start pricing', '2۔ قیمت دینا شروع کرنے کے لیے تجارتی رجسٹریشن شامل کریں', '2. أضف السجل التجاري لتبدأ التسعير')}</span>
                  <Link href="/settings?tab=docs" className="inline-flex items-center gap-1 min-h-[44px] px-5 rounded-xl text-sm font-bold text-[#0B2438] border border-[#0B2438]/30 bg-white">{L('Add the registration', 'رجسٹریشن شامل کریں', 'أضف السجل التجاري')}</Link>
                </li>
              </ol>
            </div>
          ) })
          if (needsSetup && !crRequired) banners.push({ key: 'onboarding', node: (
            <Link href="/onboarding" className="block rounded-2xl p-5 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#D4A543', background: 'linear-gradient(120deg,#fff7ed,#ffffff)' }}>
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0"><Glyph e="🔒" /></span>
                <div className="flex-1">
                  <div className="font-extrabold text-sm" style={{ color: '#8F6820' }}><Glyph e="⚠" /> {L('Complete your profile to receive requests', 'درخواستیں وصول کرنے کے لیے اپنی پروفائل مکمل کریں', 'أكمل ملفك لاستلام الطلبات')}</div>
                  <div className="text-[13px] text-gray-600 mt-1 leading-relaxed">{L("Without your location and what you sell you won't appear to buyers and won't receive any requests. One minute is enough.", 'اپنے مقام اور آپ کیا بیچتے ہیں، اس کے بغیر آپ خریداروں کو نظر نہیں آئیں گے اور کوئی درخواست موصول نہیں ہوگی۔ ایک منٹ کافی ہے۔', 'بدون موقعك وما تبيعه لن تظهر للمشترين ولن تصلك أي طلبات. دقيقة واحدة تكفي.')}</div>
                  <span className="inline-flex items-center gap-1 mt-2.5 min-h-[44px] text-sm font-bold text-[#071827] px-4 rounded-xl" style={{ background: '#D4A543' }}>{L('Complete now', 'ابھی مکمل کریں', 'أكمل ملفك الآن')} <span aria-hidden="true">{FWD}</span></span>
                </div>
              </div>
            </Link>
          ) })
          if (crRequired && !(needsSetup && crRequired)) banners.push({ key: 'cr', node: (
            <div role="status" className="rounded-2xl p-5 border-2 bg-white" style={{ borderColor: '#D4A543' }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 text-[#8F6820]"><Glyph e="🔒" /></span>
                <div className="flex-1 min-w-0">
                  {isMember ? (
                    <div className="font-bold text-sm text-[#071827] leading-relaxed">{L('The account owner must add the commercial registration before pricing.', 'قیمت دینے سے پہلے اکاؤنٹ کے مالک کو تجارتی رجسٹریشن شامل کرنی ہوگی۔', 'يلزم أن يضيف مالك الحساب السجل التجاري قبل التسعير.')}</div>
                  ) : (
                    <>
                      <div className="font-extrabold text-[#071827]">{L('Add your commercial registration to start pricing', 'قیمت دینا شروع کرنے کے لیے اپنی تجارتی رجسٹریشن شامل کریں', 'أضف سجلك التجاري لتبدأ التسعير')}</div>
                      <div className="text-[13px] text-gray-700 mt-1 leading-relaxed">{L('Companies and shops price with a valid commercial registration (10 digits starting with 7). You can browse requests meanwhile.', 'کمپنیاں اور دکانیں درست تجارتی رجسٹریشن (7 سے شروع ہونے والے 10 ہندسے) کے ساتھ قیمت دیتی ہیں۔ اس دوران آپ درخواستیں دیکھ سکتے ہیں۔', 'تسعّر الشركات والمحلات بسجل تجاري صحيح (10 أرقام تبدأ بالرقم 7)، ويمكنك تصفّح الطلبات في أثناء ذلك.')}</div>
                      <Link href="/settings?tab=docs" className="inline-flex items-center gap-1 mt-3 min-h-[44px] px-5 rounded-xl text-sm font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>
                        {L('Add the commercial registration', 'تجارتی رجسٹریشن شامل کریں', 'أضف السجل التجاري')} <span aria-hidden="true">{FWD}</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) })
          // UX-093: the next step depends on the seller kind (an independent seller has no CR to upload),
          // a gold main action and a way to reach support
          // UX-138: company banners (verification, VAT, specialties) are the owner's, not a team member's
          if (profile?.verification_status === 'rejected' && !isMember) banners.push({ key: 'rejected', node: (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl"><Glyph e="❌" /></span>
                <div>
                  <div className="font-bold text-red-700 mb-1">{L('Your account was not approved', 'آپ کا اکاؤنٹ منظور نہیں ہوا', 'لم يُقبل حسابك')}</div>
                  <div className="text-sm text-red-700">{sellerKindOf(profile?.provider_type) === 'independent'
                    ? L('Review the reason below, update your details, and we will review them again.', 'نیچے وجہ دیکھیں، اپنی تفصیلات اپ ڈیٹ کریں، اور ہم دوبارہ جائزہ لیں گے۔', 'راجِع السبب أدناه، وحدّث بياناتك، وسنراجعها من جديد.')
                    : L('Review the reason below, update your commercial registration, and we will review it again.', 'نیچے وجہ دیکھیں، اپنی تجارتی رجسٹریشن اپ ڈیٹ کریں، اور ہم دوبارہ جائزہ لیں گے۔', 'راجِع السبب أدناه، وحدّث سجلك التجاري، وسنراجعه من جديد.')}</div>
                  {profile?.rejection_reason && (
                    <div className="mt-2 bg-red-100 rounded-lg px-3 py-2 text-sm text-red-800 font-medium">
                      <Glyph e="📋" /> {L('Reason: ', 'وجہ: ', 'السبب: ')}{profile.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={sellerKindOf(profile?.provider_type) === 'independent' ? '/settings' : '/settings?tab=docs'} className="inline-flex items-center min-h-[44px] text-sm px-5 rounded-xl font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                  {sellerKindOf(profile?.provider_type) === 'independent' ? L('Update my details', 'میری تفصیلات اپ ڈیٹ کریں', 'تحديث بياناتي') : L('Update my commercial registration', 'تجارتی رجسٹریشن اپ ڈیٹ کریں', 'تحديث السجل التجاري')}
                </Link>
                <Link href="/support" className="inline-flex items-center min-h-[44px] text-sm px-5 rounded-xl font-bold text-white" style={{ background: '#0B2438' }}>
                  {L('Contact support', 'سپورٹ سے رابطہ کریں', 'تواصل مع الدعم')}
                </Link>
              </div>
            </div>
          ) })
          // حدّد تخصصاتك الدقيقة
          if (!isMember && !hasSpecialties && !hasSectors && profile?.verification_status !== 'rejected') banners.push({ key: 'specialties', node: (
            <Link href="/supplier/specialties" className="block bg-gradient-to-l from-[#D4A543]/10 to-[#0B2438]/5 border-2 border-[#D4A543]/30 rounded-2xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="text-3xl"><Glyph e="🎯" /></div>
                <div className="flex-1">
                  <div className="font-bold" style={{ color: '#0B2438' }}>{L('Set your exact specialties for precise matching!', 'درست مماثلت کے لیے اپنے تخصصات مقرر کریں!', 'حدّد تخصصاتك الدقيقة لتصلك الطلبات المطابقة تماماً!')}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{L('e.g. only "Bricks" or only "Marble" — get only relevant requests', 'مثلاً صرف "اینٹ" یا صرف "سنگ مرمر"', 'مثلاً: محل طوب فقط، أو محل رخام فقط — تصلك الطلبات المطابقة لتخصصك')}</div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap" style={{ color: '#8F6820' }}>{L('Setup →', 'ترتیب دیں ←', 'إعداد ←')}</div>
              </div>
            </Link>
          ) })
          if (profile?.verification_status === 'pending' && !isMember) banners.push({ key: 'pending', node: (
            <div className="bg-warn-bg border border-warn-border rounded-2xl p-5 flex items-start gap-3">
              {/* round-5 UX-085: readable contrast (title navy, text dark gold) and the shared warning glyph */}
              <span className="text-2xl text-[#8F6820]"><Glyph e="⚠" /></span>
              <div>
                <div className="font-bold text-[#071827] mb-1">{L('Account under review', 'اکاؤنٹ زیر جائزہ', 'حسابك قيد المراجعة')}</div>
                <div className="text-sm text-[#6C531F]">{sellerKindOf(profile?.provider_type) === 'independent'
                  ? L('We are reviewing your details. This usually takes up to 24 hours.', 'ہم آپ کی تفصیلات کا جائزہ لے رہے ہیں۔ اس میں عموماً 24 گھنٹے لگتے ہیں۔', 'نراجع بياناتك، وعادةً يستغرق ذلك 24 ساعة.')
                  : L('We are reviewing your details and documents; this usually takes 24 hours.', 'ہم آپ کی تفصیلات اور دستاویزات کا جائزہ لے رہے ہیں؛ اس میں عموماً 24 گھنٹے لگتے ہیں۔', 'نراجع بياناتك ومستنداتك، وتستغرق المراجعة عادةً 24 ساعة.')}</div>
                {/* UX-093: what to do meanwhile, and when to ask for help */}
                <div className="text-sm text-[#6C531F] mt-1.5">{L('Meanwhile you can complete your specialties, location and prices. If the review takes more than 24 hours, contact support.', 'اس دوران آپ اپنے تخصصات، مقام اور قیمتیں مکمل کر سکتے ہیں۔ اگر جائزے میں 24 گھنٹے سے زیادہ لگیں تو سپورٹ سے رابطہ کریں۔', 'يمكنك خلال المراجعة إكمال تخصصاتك وموقعك وأسعارك. إن تجاوزت المراجعة 24 ساعة فتواصل مع الدعم.')}</div>
                <Link href="/support" className="inline-flex items-center min-h-[44px] mt-1 text-sm font-bold text-[#8F6820] underline">{L('Contact support', 'سپورٹ سے رابطہ کریں', 'تواصل مع الدعم')}</Link>
              </div>
            </div>
          ) })
          // تنبيهات ثانوية (ضريبة/أسعار/اشتراك) — بعد إكمال الملف فقط
          // round-6 UX-111 + owner 2026-11-25 (tax-invoice rules): the VAT number is asked, never imposed; company/shop only
          if (!isMember && profile && profile.region && !profile.vat_number && sellerKindOf(profile.provider_type) === 'company' && !vatNotReg) banners.push({ key: 'vat', node: (
            <div className="bg-[#D4A543]/5 border border-[#D4A543]/40 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl"><Glyph e="🧾" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('Do you have a VAT number? Add it now', 'کیا آپ کے پاس VAT نمبر ہے؟ ابھی شامل کریں', 'هل لديك رقم ضريبي؟ أضفه الآن')}</div>
                  <div className="text-[13px] text-gray-600 mt-0.5 leading-relaxed">{L('Most requests from companies and contractors require a VAT invoice. If you are registered for VAT, add your VAT number so these requests reach you and your prices are shown including VAT.', 'کمپنیوں اور ٹھیکیداروں کی زیادہ تر درخواستوں میں VAT انوائس شرط ہوتی ہے۔ اگر آپ VAT میں رجسٹرڈ ہیں تو اپنا VAT نمبر شامل کریں تاکہ یہ درخواستیں آپ تک پہنچیں اور آپ کی قیمتیں VAT سمیت دکھائی جائیں۔', 'أغلب طلبات الشركات والمقاولين تشترط فاتورة ضريبية. إن كان لديك تسجيل في ضريبة القيمة المضافة فأضف رقمك الضريبي لتصلك هذه الطلبات وتُعرض أسعارك شاملة الضريبة.')}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href="/settings?tab=docs" className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Add the VAT number', 'VAT نمبر شامل کریں', 'أضف الرقم الضريبي')}</Link>
                    <button type="button" onClick={() => { setVatNotReg(true); try { localStorage.setItem('tsk_vat_not_reg_' + (profile?.id || ''), '1') } catch {} }} className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold text-[#0B2438] border border-[#0B2438]/30 bg-white">{L('My business is not registered', 'میرا ادارہ رجسٹرڈ نہیں', 'منشأتي غير مسجّلة')}</button>
                  </div>
                </div>
              </div>
            </div>
          ) })
          // round-3 UX-031: «أسعاري» is private (migration 160) and fills prices in one tap; the public price board stays off
          if (!isMember && profile && profile.region && pricesCount === 0) banners.push({ key: 'prices', node: (
            <Link href="/supplier/prices" className="block bg-gradient-to-l from-[#D4A543]/10 to-[#D4A543]/5 border border-[#D4A543]/40 rounded-2xl p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl"><Glyph e="📈" /></span>
                <div className="flex-1">
                  <div className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('Save your prices in «My prices»', 'اپنی قیمتیں «میری قیمتیں» میں محفوظ کریں', 'احفظ أسعارك في «أسعاري»')}</div>
                  <div className="text-xs text-gray-500">{L('They are private, and fill in when you price the same material or its category in the same unit. Tap to add →', 'یہ نجی ہیں، اور اسی مال یا اس کے زمرے کی اسی یونٹ میں قیمت دیتے وقت بھر جاتی ہیں۔ شامل کرنے کے لیے دبائیں ←', 'أسعارك خاصة بك، وتُعبَّأ عند تسعير المادة نفسها أو فئتها بالوحدة نفسها. اضغط للإضافة ←')}</div>
                </div>
              </div>
            </Link>
          ) })
          if (FEATURES.subscription && !isMember && profile && profile.region && !isSubscribed(profile)) banners.push({ key: 'subscription', node: isLaunchFree(launchUntil) ? (
            <Link href="/supplier/subscription" className="block rounded-2xl p-4 hover:shadow-md transition-all" style={{ background: 'linear-gradient(120deg,#0F6E56,#0B2438)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl"><Glyph e="🎉" /></span>
                <div className="flex-1">
                  <div className="font-bold text-sm text-white">{L('Free launch period — all features open', 'مفت لانچ مدت — تمام سہولیات کھلی ہیں', 'فترة إطلاق مجانية — كل الميزات مفتوحة')}</div>
                  <div className="text-xs text-emerald-50">{L('Enjoy everything free now. See the future plans →', 'ابھی سب کچھ مفت استعمال کریں۔ آئندہ پلان دیکھیں ←', 'استمتع بجميع الميزات مجاناً الآن. اطّلع على الباقات القادمة ←')}</div>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/supplier/subscription" className="block rounded-2xl p-4 hover:shadow-md transition-all" style={{ background: 'linear-gradient(120deg,#0B2438,#102E45)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl"><Glyph e="⭐" /></span>
                <div className="flex-1">
                  <div className="font-bold text-sm text-white">{L('Upgrade to Professional', 'پروفیشنل پلان پر اپ گریڈ کریں', 'رقِّ حسابك إلى الباقة الاحترافية')}</div>
                  <div className="text-xs text-blue-100">{L('Unlimited offers + priority visibility + full price index. Tap for plans →', 'لامحدود آفرز + ترجیحی نمائش + قیمتوں کے اشاریے تک مکمل رسائی ←', 'عروض غير محدودة + أولوية في الظهور + وصول كامل إلى مؤشّر الأسعار ←')}</div>
                </div>
              </div>
            </Link>
          ) })
          if (banners.length === 0) return null
          const [first, ...rest] = banners
          return (
            <div className="mb-4 space-y-3 animate-fade-in">
              {first.node}
              {rest.length > 0 && (
                <>
                  <button type="button" onClick={() => setShowMoreBanners(v => !v)} aria-expanded={showMoreBanners}
                    className="inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold px-3 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-[#D4A543]/40">
                    {showMoreBanners ? <>{L('Show less', 'کم دکھائیں', 'عرض أقل')} <ChevronUp className="w-4 h-4" aria-hidden /></> : <>{L('Show more', 'مزید دکھائیں', 'عرض المزيد')} <span className="inline-grid place-items-center min-w-[1.25rem] h-5 px-1 rounded-full bg-[#0B2438]/10 text-[12px]">{rest.length}</span> <ChevronDown className="w-4 h-4" aria-hidden /></>}
                  </button>
                  {showMoreBanners && rest.map((b) => <div key={b.key}>{b.node}</div>)}
                </>
              )}
            </div>
          )
        })()}
        {/* round-5 UX-219: a pricing agent sees his per-deal limit and the way to raise it before opening a request */}
        {!isMember && agentCap && agentCapProgress(agentCap)?.cap != null && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl p-4 border border-[#0B2438]/15 bg-white animate-fade-in">
            <span className="text-xl shrink-0 text-[#8F6820]"><Glyph e="🛡" /></span>
            <div className="min-w-0">
              <div className="font-bold text-sm text-[#071827]">{L('Your limit per deal', 'فی سودا آپ کی حد', 'حدّ صفقاتك')}</div>
              <p className="text-[13px] text-gray-700 mt-0.5 leading-relaxed">{agentCapText(agentCap, locale)}</p>
            </div>
          </div>
        )}
        <EnablePush variant="nudge" />

        <div className="mb-4 sm:mb-6 animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{t.welcome}، {companyName || profile?.full_name || L('Supplier', 'سپلائر', 'مورّد')} <Glyph e="👋" /></h1>
          <p className="text-gray-500 mt-1 text-sm">{t.subtitle}</p>
          {/* round-4 UX-087: the rating buyers gave this seller */}
          {Number(profile?.rating_count) > 0 && (
            <p className="mt-1 text-[13px] font-semibold text-[#0B2438] flex items-center gap-1 flex-wrap"><Star className="w-4 h-4 shrink-0" style={{ color: '#9D7425', fill: '#9D7425' }} aria-hidden /> {L(`Your rating: ${Number(profile.rating_avg || 0).toFixed(1)} of 5 (${profile.rating_count} rating${Number(profile.rating_count) === 1 ? '' : 's'})`, `آپ کی ریٹنگ: 5 میں سے ${Number(profile.rating_avg || 0).toFixed(1)} (${profile.rating_count} ریٹنگ)`, `تقييمك: ${Number(profile.rating_avg || 0).toFixed(1)} من 5 (${arCount(Number(profile.rating_count), 'تقييم واحد', 'تقييمان', 'تقييمات', 'تقييماً')})`)}</p>
          )}
        </div>

        {/* نقاط اكتمال الملف + خطوات رفعها — مخفية على الجوال افتراضياً كي تظهر الطلبات أولاً */}
        {!isMember && (() => {
          // independent sellers have no CR: drop that step and scale the rest to 100 (as in the app)
          const isIndependent = sellerKindOf(profile?.provider_type) === 'independent'
          const allChecks = [
            // UX-037: verification is optional: a light weight, said as optional, never a red alarm on day one
            // round-4: for a company or shop the commercial registration is REQUIRED to price (my_pricing_gate), never «optional»
            { cr: true, ok: !crRequired && (!!(profile?.commercial_registration || '').trim() || profile?.verification_status === 'verified'), w: 25, label: L('Add your commercial registration (required to price)', 'اپنا تجارتی رجسٹریشن شامل کریں (قیمت دینے کے لیے ضروری)', 'أضف سجلك التجاري (مطلوب للتسعير)'), href: '/settings?tab=docs' },
            { ok: hasSpecialties, w: 25, label: L('Add specialties', 'تخصصات شامل کریں', 'أضف تخصصاتك'), href: '/supplier/specialties' },
            { ok: !!(profile?.latitude || profile?.national_short_address), w: 20, label: L('Add map location', 'نقشے پر مقام شامل کریں', 'حدّد موقعك'), href: '/location' },
            // UX-149: the rating comes from buyers after a deal, so it is not part of «completing» the profile
          ]
          const checks = allChecks.filter((c: any) => !(isIndependent && c.cr))
          const totalW = checks.reduce((s: number, c: any) => s + c.w, 0) || 1
          const score = Math.round(checks.reduce((s: number, c: any) => s + (c.ok ? c.w : 0), 0) / totalW * 100)
          const missing = checks.filter((c: any) => !c.ok)
          // profile complete: nothing left to do, so the card goes away (owner request, app parity 5b2c5c6)
          if (score >= 100) return null
          const col = score >= 70 ? '#0F6E56' : score >= 40 ? '#D4A543' : '#0B2438'
          return (
            <>
              <button type="button" onClick={() => setShowScoreMobile(v => !v)} aria-expanded={showScoreMobile}
                className="sm:hidden mb-4 inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold px-3 rounded-full border border-gray-200 bg-white text-gray-700">
                {L('Profile completion', 'پروفائل کی تکمیل', 'اكتمال ملفك')}: {score}% {showScoreMobile ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}
              </button>
            <div className={`mb-6 ${showScoreMobile ? 'grid' : 'hidden'} sm:grid sm:grid-cols-3 gap-4 animate-fade-in`}>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef1f6" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={col} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(score * 0.974).toFixed(1)} 97.4`} />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-lg font-extrabold" style={{ color: '#0B2438' }}>{score}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: '#0B2438' }}>{L('Profile completion', 'پروفائل کی تکمیل', 'اكتمال ملفك')}</div>
                  <div className="text-[12px] text-gray-500">{score}% — {score >= 70 ? L('Excellent', 'بہترین', 'ممتاز') : score >= 40 ? L('Good', 'اچھا', 'جيد') : L('Getting started', 'آغاز', 'في البداية')}</div>
                </div>
              </div>
              {missing.length > 0 && (
                <div className="sm:col-span-2 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold mb-2" style={{ color: '#0B2438' }}>{L('Strengthen your profile:', 'اپنی پروفائل مضبوط کریں:', 'عزّز ملفك:')}</div>
                  <div className="flex flex-wrap gap-2">
                    {missing.map((c: any) => c.info
                      ? <span key="info" className="text-[12px] text-gray-600 px-1 py-1.5">{c.label}</span>
                      : <Link key={c.href} href={c.href} className="inline-flex items-center min-h-[44px] text-[13px] font-semibold px-3 rounded-full border border-dashed transition-all hover:bg-[#D4A543]/10" style={{ borderColor: '#D4A543', color: '#8F6820' }}>+ {c.label}</Link>)}
                  </div>
                </div>
              )}
            </div>
            </>
          )
        })()}

        {/* numbers and the sales chart wait for the first offer (persona review: zeros on day one) */}
        {/* round-5 UX-168: on a phone the numbers and the sales fold under «أداؤك هذا الشهر», so the requests come first */}
        {myOffers.length > 0 && (
          <button type="button" onClick={() => setShowStatsMobile(v => !v)} aria-expanded={showStatsMobile}
            className="sm:hidden mb-4 inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold px-3 rounded-full border border-gray-200 bg-white text-gray-700">
            <Glyph e="📊" /> {L('Your performance this month', 'اس ماہ آپ کی کارکردگی', 'أداؤك هذا الشهر')} {showStatsMobile ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}
          </button>
        )}
        {myOffers.length > 0 && <div className={`${showStatsMobile ? 'grid' : 'hidden'} sm:grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 stagger`}>
          {/* UX-082: each card opens its own filtered list, and the numbers match the list and the tabs */}
          {/* round-5 UX-168: «بانتظار تسعيرك» is already counted on the top card and the filter chip, so no card here */}
          {[
            { label: t.pendingOffers, value: pending, icon: 'waiting', tone: 'warning', go: 'offers', f: 'pending' },
            { label: t.acceptedOffers, value: accepted, icon: 'completed', tone: 'success', go: 'offers', f: 'won' },
            { label: t.revenue, value: myOffers.filter(needsMe).length, icon: 'waiting', tone: 'warning', go: 'offers', f: 'reply' },
          ].map(({ label, value, icon, tone, go, f }) => (
            <button key={label} type="button" onClick={() => { setTab(go); if (go === 'rfqs') setRfqFilter(f); else setOfferFilter(f as any); document.getElementById('sup-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className={`text-start bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${tab === go && (go === 'rfqs' ? rfqFilter === f : offerFilter === f) ? 'border-[#D4A543] ring-1 ring-[#D4A543]/30' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2 min-w-0">
                <AppIcon name={icon} tone={tone} variant="tone" size={44} />
                <div className="text-xl sm:text-2xl font-bold truncate tabular-nums" style={{ color: '#0B2438' }}>{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </button>
          ))}
        </div>}

        {/* مبيعاتك (اختيار المالك: دائرة نتائج العروض + بطاقات بأسهم مقارنة بالشهر الماضي) */}
        {myOffers.length > 0 && (() => {
          // round-2 UX-010: cancelled / expired requests are not «not chosen» and stay out of the chart
          const rejected = lostCount
          const totalOffers = accepted + pending + rejected
          const C = 2 * Math.PI * 58
          const seg = (n: number) => (totalOffers ? (n / totalOffers) * C : 0)
          const parts = [
            { n: accepted, color: '#0F6E56', label: L('Chosen', 'منتخب', 'اختيرت') },
            { n: pending, color: '#D4A543', label: L('Waiting for the buyer', 'خریدار کے فیصلے کی منتظر', 'بانتظار قرار المشتري') },
            { n: rejected, color: '#B4B2A9', label: L('Not chosen', 'منتخب نہیں', 'لم تُختر') }, // neutral grey (UX-116)
          ]
          // round-4 UX-068: the VAT wording follows the accepted offers themselves
          const acc = myOffers.filter((o: any) => o.status === 'accepted')
          const nReg = acc.filter((o: any) => o.vat_status === 'not_registered').length
          const vatTag = acc.length && nReg === acc.length ? L('(final prices)', '(حتمی قیمتیں)', '(أسعار نهائية)') : nReg > 0 ? L('(what the buyer pays)', '(جو خریدار ادا کرتا ہے)', '(ما يدفعه المشتري)') : L('(incl. VAT)', '(VAT سمیت)', '(شاملة الضريبة)')
          const thisM = months[months.length - 1], lastM = months[months.length - 2]
          const salesDelta = lastM.sales ? Math.round(((thisM.sales - lastM.sales) / lastM.sales) * 100) : null
          const dealsDelta = thisM.deals - lastM.deals
          const Arrow = ({ up, text }: { up: boolean; text: string }) => (
            <div className={`text-xs font-bold mt-0.5 ${up ? 'text-emerald-700' : 'text-gray-600'}`}>{up ? <Glyph e="📈" /> : <Glyph e="📉" />} {text}</div>
          )
          let offset = 0
          return (
            <div className={`${showStatsMobile ? 'block' : 'hidden'} sm:block mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in`}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="font-extrabold text-[#0B2438]">{L('Your sales', 'آپ کی فروخت', 'مبيعاتك')}</h2>
                  <p className="text-xs text-gray-500">{L('Your offers and this month vs last month', 'آپ کی آفرز اور اس ماہ کا موازنہ', 'نتائج عروضك، وهذا الشهر مقارنة بالشهر الماضي')}</p>
                </div>
                <Link href="/supplier/analytics" className="inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Full performance', 'مکمل کارکردگی', 'أداؤك بالتفصيل')} <span aria-hidden="true">{FWD}</span></Link>
              </div>
              <div className="grid sm:grid-cols-[minmax(0,220px)_1fr] gap-5 items-center">
                {/* donut: how many offers won, waiting, not chosen; win rate in the middle */}
                <div className="flex flex-col items-center">
                  <svg viewBox="0 0 160 160" className="w-40 h-40" role="img" aria-label={L(`Offers: ${accepted} chosen, ${pending} waiting, ${rejected} not chosen`, `آفرز: ${accepted} منتخب، ${pending} منتظر، ${rejected} منتخب نہیں`, `العروض: ${accepted} اختيرت، ${pending} بانتظار قرار المشتري، ${rejected} لم تُختر`)}>
                    <circle cx="80" cy="80" r="58" fill="none" stroke="#EEF1F5" strokeWidth="18" />
                    {totalOffers > 0 && parts.map((p, k) => {
                      const len = seg(p.n); const el = len > 0 ? (
                        <circle key={k} cx="80" cy="80" r="58" fill="none" stroke={p.color} strokeWidth="18"
                          strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" />
                      ) : null
                      offset += len; return el
                    })}
                    <text x="80" y="80" textAnchor="middle" className="fill-[#0B2438]" style={{ fontSize: 28, fontWeight: 800 }}>{decided ? winRate + '%' : '—'}</text>
                    <text x="80" y="102" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 12 }}>{decided ? L(`won ${accepted} of ${decided}`, `${decided} میں سے ${accepted} جیتے`, `فزت بـ ${accepted} من ${decided}`) : L('win rate', 'کامیابی', 'نسبة الفوز')}</text>
                  </svg>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[12px] text-gray-600">
                    {parts.map(p => (
                      <span key={p.label} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />{p.label} <b className="text-[#0B2438]">{p.n}</b></span>
                    ))}
                  </div>
                </div>
                {/* number + arrow vs last month */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Sales this month', 'اس ماہ کی فروخت', 'مبيعات هذا الشهر')} {vatTag}</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#0B2438] tabular-nums">{thisM.sales.toLocaleString('en-US')} <span className="text-xs text-gray-500 font-bold">{t.sar}</span></div>
                    {salesDelta !== null
                      ? <Arrow up={salesDelta >= 0} text={L(`${Math.abs(salesDelta)}% vs last month`, `${Math.abs(salesDelta)}% پچھلے ماہ سے`, `${Math.abs(salesDelta)}% عن الشهر الماضي`)} />
                      : <div className="text-xs text-gray-500 mt-0.5">{L('No sales last month', 'پچھلے ماہ فروخت نہیں', 'لا مبيعات الشهر الماضي')}</div>}
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Deals this month', 'اس ماہ کی ڈیلز', 'صفقات هذا الشهر')}</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#0B2438] tabular-nums">{thisM.deals}</div>
                    {dealsDelta !== 0
                      ? <Arrow up={dealsDelta > 0} text={L(`${Math.abs(dealsDelta)} ${dealsDelta > 0 ? 'more' : 'fewer'} than last month`, `پچھلے ماہ سے ${Math.abs(dealsDelta)} ${dealsDelta > 0 ? 'زیادہ' : 'کم'}`, `${arCount(Math.abs(dealsDelta), 'صفقة واحدة', 'صفقتان', 'صفقات', 'صفقة')} ${dealsDelta > 0 ? 'أكثر' : 'أقل'} من الشهر الماضي`)} />
                      : <div className="text-xs text-gray-500 mt-0.5">{L('Same as last month', 'پچھلے ماہ جتنی', 'مثل الشهر الماضي')}</div>}
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Deals value', 'سودوں کی مالیت', 'قيمة الصفقات')} {vatTag}</div>
                    <div className="text-lg font-extrabold text-[#0B2438] tabular-nums">{totalRevenue.toLocaleString('en-US')} <span className="text-xs text-gray-500 font-bold">{t.sar}</span></div>
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Average deal', 'اوسط ڈیل', 'متوسط الصفقة')}</div>
                    <div className="text-lg font-extrabold text-[#0B2438] tabular-nums">{avgDeal ? avgDeal.toLocaleString('en-US') : '—'} {avgDeal ? <span className="text-xs text-gray-500 font-bold">{t.sar}</span> : null}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        <div className="flex gap-2 mb-6" id="sup-list" style={{ scrollMarginTop: '70px' }}>
          {[{ key: 'rfqs', label: t.tabRfqs, n: null, alert: 0 }, { key: 'offers', label: t.tabOffers, n: myOffers.length, alert: myOffers.filter(needsMe).length }].map((tab_: any) => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)} aria-pressed={tab === tab_.key}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 sm:px-5 rounded-xl text-sm font-semibold transition-all ${tab === tab_.key ? 'text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
              style={tab === tab_.key ? { background: '#0B2438' } : {}}>
              {tab_.label}
              {tab_.n != null && <span className={`inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full text-[12px] ${tab === tab_.key ? 'bg-white/20' : 'bg-gray-100'}`}>{tab_.n}</span>}
              {tab_.alert > 0 && <span className="inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full text-[12px] font-extrabold bg-[#D4A543] text-[#071827]" aria-label={L('need your reply', 'آپ کے جواب کی منتظر', 'بحاجة لردّك')}>{tab_.alert}</span>}
            </button>
          ))}
        </div>

        {tab === 'rfqs' && (() => {
          const expiringList = openRfqs.filter((r: any) => { const u = deadlineUrgency(r.expires_at); return u === 'soon' || u === 'critical' })
          const displayedRfqs = rfqFilter === 'expiring' ? expiringList
            : rfqFilter === 'toprice' ? sortedOpen.filter((r: any) => !offeredRfqIds.has(r.id))
            // round-4 UX-188: the highest estimated value first (requests without an estimate last)
            : rfqFilter === 'top' ? [...sortedOpen].filter((r: any) => !offeredRfqIds.has(r.id)).sort((a: any, b: any) => estimateOf(b) - estimateOf(a))
            : sortedOpen
          const anyEstimate = openRfqs.some((r: any) => estimateOf(r) > 0)
          return (
          <div className="stagger">
            {/* فلاتر الطلبات — منها «تنتهي قريباً» (قابلة للضغط) */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'toprice', label: `${L('Waiting for your price', 'آپ کی قیمت کی منتظر', 'بانتظار تسعيرك')} (${toPrice.length})`, icon: <Glyph e="💰" /> },
                { key: 'all', label: `${L('All', 'سب', 'الكل')} (${openRfqs.length})`, icon: <Glyph e="📋" /> },
                { key: 'expiring', label: `${L('Ending soon', 'جلد ختم ہونے والی', 'تنتهي قريباً')} (${expiringList.length})`, icon: <Glyph e="⏰" /> },
                ...(anyEstimate ? [{ key: 'top', label: L('Highest value', 'سب سے زیادہ مالیت', 'الأعلى قيمة'), icon: <Glyph e="📈" /> }] : []),
              ].map((f: any) => (
                <button key={f.key} onClick={() => setRfqFilter(f.key)} aria-pressed={rfqFilter === f.key}
                  className={`min-h-[44px] px-4 rounded-xl text-[13px] font-bold transition-all border ${rfqFilter === f.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={rfqFilter === f.key ? { background: '#0B2438' } : {}}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
            {loadFailed && <LoadError onRetry={() => { load() }} className="mb-4" message={displayedRfqs.length ? staleMsg : undefined} />}
            {loadFailed && displayedRfqs.length === 0 ? null : displayedRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 sm:p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float">{rfqFilter === 'expiring' ? <Glyph e="⏰" /> : <Glyph e="📭" />}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{rfqFilter === 'expiring' ? L('Nothing ending soon', 'کوئی درخواست جلد ختم نہیں ہو رہی', 'لا توجد طلبات تنتهي قريباً') : rfqFilter === 'toprice' && openRfqs.length > 0 ? L('You have priced every open request', 'آپ نے ہر کھلی درخواست کی قیمت دے دی ہے', 'سعّرتَ كل الطلبات المفتوحة') : t.noRfqs}</h3>
                <p className="text-sm text-gray-600">{rfqFilter === 'expiring' ? L('All open requests still have time.', 'تمام کھلی درخواستوں کے پاس ابھی کافی وقت ہے۔', 'ما زال لدى كل الطلبات المفتوحة متّسع من الوقت.') : rfqFilter === 'toprice' && openRfqs.length > 0 ? L('We will alert you as soon as a new matching request arrives.', 'نئی مماثل درخواست آتے ہی ہم آپ کو بتائیں گے۔', 'سننبّهك فور وصول طلب جديد مطابق.') : t.noRfqsSub}</p>
                {rfqFilter === 'toprice' && openRfqs.length > 0 && <button type="button" onClick={() => setRfqFilter('all')} className="inline-flex items-center mt-4 me-2 min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Show all requests', 'تمام درخواستیں دکھائیں', 'عرض كل الطلبات')}</button>}
                {!isMember && rfqFilter !== 'expiring' && !(rfqFilter === 'toprice' && openRfqs.length > 0) && <Link href="/supplier/specialties" className="inline-flex items-center mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Review my specialties', 'میرے تخصصات دیکھیں', 'راجِع تخصصاتي')}</Link>}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedRfqs.map((rfq: any) => (
                  <Link key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`} onClick={() => markSeen(rfq.id)}
                    className={`block bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:border-[#D4A543]/30 hover:-translate-y-0.5 transition-all duration-300 ${isFresh(rfq) ? 'tsk-glow border-[#D4A543]' : 'border-gray-100'}`}>
                    <div className="mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AppIcon name="orders" tone="brand" variant="tone" size={44} />
                        <div className="min-w-0">
                          <div className="font-bold line-clamp-2" style={{ color: '#0B2438' }}>{cardTitle(rfq)}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* UX-149: one rule for «جديد» (not opened yet), gold like the top card */}
                            {isFresh(rfq) && (
                              <span className="badge text-[12px] font-bold text-[#071827]" style={{ background: '#F5C55B' }}>{L('New', 'نیا', 'جديد')}</span>
                            )}
                            <span className="badge text-[12px] bg-[#0B2438]/5 text-[#0B2438]">{rfqSection(rfq)}</span>
                            {!offeredRfqIds.has(rfq.id) && (() => { const sv = savedOf(rfq); return sv.have > 0 ? (
                              <span className="badge text-[12px] font-semibold bg-[#0F6E56]/10 text-[#0F6E56]">{sv.of > 1
                                ? L(`Saved prices for ${sv.have} of ${sv.of}`, `${sv.of} میں سے ${sv.have} کی محفوظ قیمتیں`, `لديك أسعار محفوظة لـ ${sv.have} من ${sv.of}`)
                                : L('You have a saved price', 'آپ کی محفوظ قیمت موجود ہے', 'لديك سعر محفوظ')}</span>
                            ) : null })()}
                            {rfq.vat_invoice_required && <span className="badge text-[12px] font-semibold bg-[#0B2438]/5 text-[#0B2438]"><Glyph e="🧾" /> {L('VAT invoice', 'VAT انوائس', 'فاتورة ضريبية')}</span>}
                            {rfq.sub_category && !(Array.isArray(rfq.items) && rfq.items.length > 1) && (
                              <span className="badge text-[12px] bg-[#D4A543]/10 text-[#8F6820] font-semibold">
                                <Glyph e="🎯" /> {getSubCategoryLabel(rfq.sector, rfq.sub_category, locale)}
                              </span>
                            )}
                            {/* round-4 UX-184: the buyer identity is never shown in the list (revealed only after the award, on the request page) */}
                            {!offeredRfqIds.has(rfq.id) && estimateOf(rfq) > 0 && (() => {
                              // round-6 UX-111: a partial estimate says how many of my materials it covers
                              const e = estimateInfo(rfq); const v = e.sum.toLocaleString('en-US')
                              return <span className="badge text-[12px] font-semibold bg-[#0B2438]/5 text-[#0B2438]">{e.known < e.of
                                ? L(`Estimated value for ${e.known} of ${e.of} materials: about ${v} SAR (what buyers pay)`, `${e.of} میں سے ${e.known} اشیاء کی اندازاً مالیت: تقریباً ${v} ریال (جو خریدار ادا کرتے ہیں)`, `قيمة تقديرية لـ ${e.known} من ${arMaterials(e.of, 'obl')}: نحو ${v} ر.س (ما يدفعه المشترون)`)
                                : L(`Estimated value about ${v} SAR (what buyers pay)`, `اندازاً مالیت تقریباً ${v} ریال (جو خریدار ادا کرتے ہیں)`, `قيمة تقديرية نحو ${v} ر.س (ما يدفعه المشترون)`)}</span>
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium flex-wrap">
                      {Array.isArray(rfq.items) && rfq.items.length > 1
                        ? (() => { const n = Number(rfq._myItemCount) || rfq.items.length; return <span><Glyph e="📦" /> {L(`${n} ${n === 1 ? 'material' : 'materials'} in your specialty`, `آپ کے تخصص میں ${n} اشیاء`, `${arMaterials(n)} ضمن تخصصك`)}</span> })()
                        : <span><Glyph e="📦" /> {rfq.quantity} {getUnitLabel(rfq.unit, locale)}</span>}
                      {/* round-5 UX-215: city and region (as in the app), plus a rough distance from the city centre */}
                      <span><Glyph e="📍" /> {[rfq.city, getRegionLabel(rfq.region, locale)].filter(Boolean).join(L(', ', '، ', '، '))}</span>
                      {(() => { const km = kmTo(rfq); return km != null ? <span className="font-semibold text-[#0B2438]">{L(`about ${km} km away`, `تقریباً ${km} کلومیٹر دور`, `على بُعد نحو ${km} كم`)}</span> : null })()}
                      {rfq.created_at && <span><Glyph e="🗓" /> {formatDateTime(rfq.created_at)}</span>}
                      {rfq.specification && !(Array.isArray(rfq.items) && rfq.items.length > 1) && <span className="truncate max-w-[180px]"><Glyph e="⚙" /> {rfq.specification}</span>}
                      {/* UX-191: an unpriced request invites the first price */}
                      {!(Number(rfq.offer_count) > 0)
                        ? <span className="font-bold text-[#8F6820]">{L('Nobody has priced it yet: be the first', 'ابھی کسی نے قیمت نہیں دی: پہلے بنیں', 'لم يسعّره أحد بعد، كن أول من يسعّره')}</span>
                        : <span><Glyph e="💬" /> {Number(rfq.offer_count) === 1 ? L('Only one offer so far', 'اب تک صرف ایک آفر', 'عرض واحد فقط حتى الآن') : L(`${rfq.offer_count} offers`, `${rfq.offer_count} آفرز`, arCount(Number(rfq.offer_count), 'عرض واحد', 'عرضان', 'عروض', 'عرضاً'))}</span>}
                      {rfq.expires_at && (() => {
                        const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                        return (
                          <span className="px-2 py-0.5 rounded-full font-bold ms-auto" style={{ background: st.bg, color: st.fg }}>
                            {u === 'critical' ? <Glyph e="🔴" /> : u === 'soon' ? <Glyph e="🟠" /> : <Glyph e="⏰" />} {formatTimeLeft(rfq.expires_at, locale)}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      {offeredRfqIds.has(rfq.id)
                        ? <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0F6E56]"><Check className="w-4 h-4" aria-hidden />{t.offerSubmitted}{sentBy(offerByRfq[rfq.id]) ? <span className="font-semibold text-gray-500"> · {sentBy(offerByRfq[rfq.id])}</span> : null}</span>
                        : <span className="text-[13px] text-gray-600">{L('Waiting for your price', 'آپ کی قیمت کی منتظر', 'بانتظار تسعيرك')}</span>}
                      {/* round-5 UX-007: while the commercial registration is missing the card says so, navy outline instead of the gold «سعّر الآن» */}
                      {!offeredRfqIds.has(rfq.id) && (crRequired
                        ? <span className="inline-flex items-center gap-1 min-h-[36px] text-[#0B2438] text-[13px] font-bold px-4 rounded-xl whitespace-nowrap border-2 border-[#0B2438] bg-white">{isMember ? L('Registration needed to price', 'قیمت کے لیے رجسٹریشن درکار', 'يلزم السجل للتسعير') : L('Add your registration to price', 'قیمت کے لیے رجسٹریشن شامل کریں', 'أضف سجلك للتسعير')}</span>
                        : isFresh(rfq)
                          ? <span className="inline-flex items-center gap-1 min-h-[36px] text-[#071827] text-[13px] font-bold px-4 rounded-xl whitespace-nowrap" style={{ background: '#D4A543' }}>{t.submitOffer} <span aria-hidden="true">{FWD}</span></span>
                          : <span className="inline-flex items-center gap-1 min-h-[36px] text-[#0B2438] text-[13px] font-bold px-4 rounded-xl whitespace-nowrap border border-[#0B2438]/40 bg-white">{t.submitOffer} <span aria-hidden="true">{FWD}</span></span>)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          ); })()}

        {tab === 'offers' && (
          <div className="stagger">
            {myOffers.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label={L('Filter offers', 'آفرز فلٹر کریں', 'تصفية العروض')}>
                {([
                  { k: 'all', l: L('All', 'سب', 'الكل'), n: myOffers.length },
                  { k: 'pending', l: L('Waiting for the buyer', 'خریدار کے فیصلے کی منتظر', 'بانتظار قرار المشتري'), n: pending },
                  { k: 'won', l: L('Chosen', 'منتخب', 'اختيرت'), n: accepted },
                  { k: 'lost', l: L('Not chosen or ended', 'منتخب نہیں یا ختم', 'لم تُختر أو انتهت'), n: myOffers.filter((o: any) => { const k = outcomeOf(o); return k === 'lost' || k === 'cancelled' || k === 'expired' }).length },
                  { k: 'reply', l: L('Need your reply', 'آپ کے جواب کی منتظر', 'بحاجة لردّك'), n: myOffers.filter(needsMe).length },
                ] as const).map((f) => (
                  <button key={f.k} type="button" onClick={() => setOfferFilter(f.k)} aria-pressed={offerFilter === f.k}
                    className={`min-h-[44px] px-4 rounded-xl text-[13px] font-bold transition-all border ${offerFilter === f.k ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                    style={offerFilter === f.k ? { background: '#0B2438' } : {}}>
                    {f.l} ({f.n})
                  </button>
                ))}
                <Link href="/supplier/deals" className="inline-flex items-center gap-1 min-h-[44px] px-3 text-[13px] font-bold text-[#8F6820] hover:underline ms-auto">{L('My deals', 'میری ڈیلز', 'صفقاتي')} <span aria-hidden="true">{FWD}</span></Link>
              </div>
            )}
            {loadFailed && <LoadError onRetry={() => { load() }} className="mb-4" message={myOffers.length ? staleMsg : undefined} />}
            {loadFailed && myOffers.length === 0 ? null : myOffers.length > 0 && shownOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                <p className="text-sm text-gray-600">{L('No offers in this list.', 'اس فہرست میں کوئی آفر نہیں۔', 'لا توجد عروض في هذه القائمة.')}</p>
                <button type="button" onClick={() => setOfferFilter('all')} className="inline-flex items-center mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Show all offers', 'تمام آفرز دکھائیں', 'عرض كل العروض')}</button>
              </div>
            ) : myOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float"><Glyph e="📤" /></div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{t.noOffers}</h3>
                <p className="text-sm text-gray-500">{t.noOffersSub}</p>
                {/* round-5 UX-167: the way out of an empty list */}
                <button type="button" onClick={() => { setTab('rfqs'); setRfqFilter('toprice') }} className="inline-flex items-center gap-1 mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>{L('Browse requests', 'درخواستیں دیکھیں', 'تصفّح الطلبات')} <span aria-hidden="true">{FWD}</span></button>
              </div>
            ) : (
              <div className="space-y-3">
                {[...shownOffers].sort((a: any, b: any) => Number(needsMe(b)) - Number(needsMe(a))).map((offer: any) => { const oc = outcomeOf(offer); return (
                  <Link key={offer.id} href={`/supplier/dashboard/rfq/${offer.rfq_id}${offer.status === 'accepted' ? '#deal' : ''}`} className={`block bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md hover:border-[#D4A543]/40 ${
                    oc === 'won' ? 'border-emerald-200 bg-emerald-50/50' :
                    oc !== 'pending' ? 'border-gray-200 bg-gray-50' : 'border-gray-100'
                  }`}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          oc === 'won' ? 'bg-emerald-100' : oc !== 'pending' ? 'bg-gray-100 text-gray-500' : 'bg-[#D4A543]/10'
                        }`}>{oc === 'won' ? <Glyph e="✅" /> : oc !== 'pending' ? <Glyph e="📭" /> : <Glyph e="⏳" />}</div>
                        <div className="min-w-0">
                          <span className="font-bold line-clamp-2" style={{ color: '#0B2438' }}>{offer.rfq ? rfqDisplayName({ ...offer.rfq, title: null }, locale) : '—'}</span>
                          {offer.rfq?.sector && (
                            <span className="badge text-[12px] bg-[#0B2438]/5 text-[#0B2438] mx-2">{rfqSection(offer.rfq)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-lg font-bold" style={{ color: '#0B2438' }}>{(+amountOf(offer).toFixed(2)).toLocaleString('en-US')} <span className="text-xs text-gray-500">{t.sar}</span></div>
                        <div className="text-[12px] text-gray-500">{offer.vat_status === 'not_registered' ? L('(final price)', '(حتمی قیمت)', '(سعر نهائي)') : L('incl. VAT', 'VAT سمیت', 'شامل الضريبة')}</div>
                        <span className={`badge text-[12px] ${
                          oc === 'won' ? 'badge-green' : oc !== 'pending' ? 'bg-gray-100 text-gray-600' : 'badge-amber'
                        }`}>{offerStatusLabel(offer)}</span>
                        {/* the buyer is waiting on the supplier: a discount request or an unanswered question (same badges as the app) */}
                        {offerHasOpenDiscount(offer) && (
                          <span className="block mt-1 badge text-[12px] font-bold" style={{ background: '#D4A543', color: '#071827' }}><Glyph e="📉" /> {L('Buyer asked for a discount', 'خریدار نے رعایت مانگی', 'طلب المشتري خصماً')}</span>
                        )}
                        {offerHasOpenQuestion(offer) && (
                          <span className="block mt-1 badge text-[12px] font-bold" style={{ background: '#D4A54318', color: '#8F6820' }}><Glyph e="❓" /> {L('Buyer has a question', 'خریدار کا سوال', 'سؤال من المشتري')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                      {offer.delivery_days && <span><Glyph e="📦" /> {daysText(offer.delivery_days, locale)}</span>}
                      {offer.rfq?.region && <span><Glyph e="📍" /> {getRegionLabel(offer.rfq.region, locale)}</span>}
                      {sentBy(offer) && <span className="font-semibold text-gray-500">{sentBy(offer)}</span>}
                      {/* round-6 UX-142: the buyer opened my offer (offers.buyer_viewed_at, set by mark_offer_viewed) */}
                      {oc === 'pending' && offer.buyer_viewed_at && <span className="font-semibold text-[#0B2438]"><Glyph e="👁" /> {L(`The buyer viewed your offer · ${timeAgo(offer.buyer_viewed_at, 'en')}`, `خریدار نے آپ کی آفر دیکھی · ${timeAgo(offer.buyer_viewed_at, 'ur')}`, `اطّلع المشتري على عرضك · ${timeAgo(offer.buyer_viewed_at, 'ar')}`)}</span>}
                    </div>
                    <div className="mt-2.5 text-[13px] font-bold flex items-center gap-1" style={{ color: '#8F6820' }}>
                      {offer.status === 'accepted'
                        ? L('Open the deal and the invoice', 'سودا اور انوائس کھولیں', 'افتح الصفقة والفاتورة')
                        : needsMe(offer) ? L('Reply now', 'ابھی جواب دیں', 'ردّ الآن') : L('View my offer', 'میری آفر دیکھیں', 'اطّلع على عرضي')} <span aria-hidden="true">{FWD}</span>
                    </div>
                  </Link>
                ) })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
