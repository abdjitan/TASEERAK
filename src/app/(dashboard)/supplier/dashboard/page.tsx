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
import { getSubCategoryLabel, getProductLabel, getUnitLabel, getRegionLabel } from '@/types'
import { rfqDisplayName } from '@/lib/rfqName'
import AppShell from '@/components/shared/AppShell'
import { isSubscribed, isLaunchFree } from '@/lib/plans'
import { getNav } from '@/lib/nav'
import { AppIcon } from '@/components/AppIcon'
import { isExpired, formatTimeLeft, deadlineUrgency, urgencyStyle, formatDateTime } from '@/lib/deadline'
import { tierLabel, tierAllowed, sellerKindOf, rememberSellerKind } from '@/lib/sellers'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import Glyph from '@/components/shared/Glyph'
import { daysText, arMaterials, arCount } from '@/lib/text'
import { askConfirm } from '@/lib/askConfirm'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { realtimeTopic } from '@/lib/realtimeTopic'

const txt = {
  ar: {
    welcome: 'أهلاً', subtitle: 'تصفح طلبات التسعير المتاحة وقدم عروضك',
    logout: 'خروج', openRfqs: 'طلبات مفتوحة', pendingOffers: 'عروض بانتظار قرار المشتري',
    acceptedOffers: 'عروض مقبولة', revenue: 'بحاجة لردّك',
    tabRfqs: 'طلبات التسعير', tabOffers: 'عروضي',
    noRfqs: 'لا توجد طلبات مفتوحة الآن', noRfqsSub: 'تأكّد أن تخصصاتك وموقعك مكتملة ليصلك أول طلب مطابق. تصل الطلبات عادةً خلال ساعات، وسننبّهك فوراً.',
    noOffers: 'لم ترسل أي عرض بعد', noOffersSub: 'تصفّح طلبات التسعير وأرسل عرضك الأول.',
    submitOffer: 'سعّر الآن', offerSubmitted: 'أُرسل عرضك', accepted: 'مقبول', rejected: 'لم يُختر عرضك', pending: 'بانتظار قرار المشتري',
    day: 'يوم', offer: 'عرض', loading: 'جارٍ التحميل...',
    sar: 'ر.س',
  },
  en: {
    welcome: 'Hello', subtitle: 'Browse available RFQs and submit your offers',
    logout: 'Logout', openRfqs: 'Open RFQs', pendingOffers: 'Pending Offers',
    acceptedOffers: 'Accepted Offers', revenue: 'Need your reply',
    tabRfqs: 'RFQ Requests', tabOffers: 'My Offers',
    noRfqs: 'No open requests', noRfqsSub: 'Make sure your specialties and location are complete so the first matching request reaches you; requests usually arrive within hours, and we will alert you at once.',
    noOffers: 'No offers submitted yet', noOffersSub: 'Browse RFQs and submit your first offer',
    submitOffer: 'Price now', offerSubmitted: 'Offer sent', accepted: 'Accepted', rejected: 'Not chosen', pending: 'Waiting for the buyer',
    day: 'days', offer: 'offer', loading: 'Loading...',
    sar: 'SAR',
  },
  ur: {
    welcome: 'خوش آمدید', subtitle: 'دستیاب درخواستیں دیکھیں اور اپنی پیشکشیں جمع کریں',
    logout: 'لاگ آؤٹ', openRfqs: 'کھلی درخواستیں', pendingOffers: 'زیر التواء پیشکشیں',
    acceptedOffers: 'قبول شدہ پیشکشیں', revenue: 'آپ کے جواب کی منتظر',
    tabRfqs: 'قیمت کی درخواستیں', tabOffers: 'میری پیشکشیں',
    noRfqs: 'کوئی کھلی درخواست نہیں', noRfqsSub: 'یقینی بنائیں کہ آپ کی مہارتیں اور مقام مکمل ہیں تاکہ پہلی مماثل درخواست آپ تک پہنچے؛ ہم فوراً آپ کو بتائیں گے۔',
    noOffers: 'ابھی تک کوئی پیشکش نہیں', noOffersSub: 'درخواستیں دیکھیں اور پہلی پیشکش جمع کریں',
    submitOffer: 'ابھی قیمت دیں', offerSubmitted: 'آفر بھیج دی گئی', accepted: 'قبول', rejected: 'منتخب نہیں ہوئی', pending: 'خریدار کے فیصلے کی منتظر',
    day: 'دن', offer: 'پیشکش', loading: 'لوڈ ہو رہا ہے...',
    sar: 'ریال',
  },
}

const sectorLabels = {
  ar: { civil: 'مدني', architectural: 'معماري', electrical: 'كهرباء', mechanical: 'ميكانيك', equipment: 'آليات ومعدات', supply_store: 'محل توريد' },
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}

export default function SupplierDashboard() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const sectors = (sectorLabels as any)[locale] || sectorLabels.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMember, setIsMember] = useState(false) // عضو في فريق شركة: يعمل باسمها
  const [launchUntil, setLaunchUntil] = useState<any>(null)
  const [pricesCount, setPricesCount] = useState<any>(null)
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
  useEffect(() => { try { if (new URLSearchParams(window.location.search).get('welcome') === '1') { setWelcome(true); window.history.replaceState(null, '', '/supplier/dashboard') } } catch {} }, [])
  // ?tab=offers opens «عروضي» (from «عروضي وصفقاتي»)
  useEffect(() => { try { if (new URLSearchParams(window.location.search).get('tab') === 'offers') { setTab('offers'); setTimeout(() => document.getElementById('sup-list')?.scrollIntoView({ block: 'start' }), 400) } } catch {} }, [])
  const [rfqFilter, setRfqFilter] = useState('all') // all | expiring
  const [hasSpecialties, setHasSpecialties] = useState(true)
  const [hasSectors, setHasSectors] = useState(true)
  const [showMoreBanners, setShowMoreBanners] = useState(false) // باقي التنبيهات خلف «عرض المزيد»
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
        setProfile(snap.p); setIsMember(!!snap.isMember); setLaunchUntil(snap.launchUntil ?? null); setPricesCount(snap.pricesCount ?? 0)
        setMyOffers(snap.offers || []); setHasSectors(snap.hasSectors !== false); setHasSpecialties(snap.hasSpecialties !== false)
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
      // Speed: the database is far from our users (~1 s a request), so everything that only needs
      // the company id goes out at once instead of one after another (was 11 sequential requests).
      const [
        { data: p, error: pErr }, { data: cfg }, { data: sectorRows, error: secErr }, { data: specRows, error: specErr },
        { data: myBranches }, { data: dismissals }, { data: offersRaw, error: offersErr }, { count: lpCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', actId).single(),
        supabase.from('app_config').select('launch_free_until').maybeSingle(),
        supabase.from('profile_sectors').select('sector').eq('profile_id', actId),
        supabase.from('profile_specialties').select('specialty').eq('profile_id', actId),
        supabase.from('branches').select('region').eq('supplier_id', actId),
        supabase.from('rfq_dismissals').select('rfq_id').eq('supplier_id', actId),
        supabase.from('offers').select('*, rfq:rfqs(product_name, sector, quantity, unit, region, status, ref_no, items, created_at)').eq('supplier_id', actId).order('created_at', { ascending: false }).limit(200),
        supabase.from('live_prices').select('id', { count: 'exact', head: true }).eq('supplier_id', actId),
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
      const offers = (offersRaw || []).map((o: any) => awarded[o.id] != null ? { ...o, total_price: awarded[o.id] } : o)
      setProfile(p)
      if (p) rememberSellerKind(sellerKindOf(p.provider_type))
      setLaunchUntil(cfg?.launch_free_until || null)
      setMyOffers(offers)
      setPricesCount(lpCount ?? 0)
      // UX-030: the buyer is waiting for a reply: open «عروضي» first (once per visit)
      if (!autoTabDone.current) {
        autoTabDone.current = true
        if ((offers || []).some((o: any) => o.status === 'pending' && ((o.reduction_deadline && new Date(o.reduction_deadline).getTime() > Date.now()) || !!(o.info_request || '').trim()))) setTab('offers')
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
        const myNames = its.filter((it: any) => (mySectors.length === 0 || mySectors.includes(it.sector)) && (mySpecialties.length === 0 || !it.sub_category || mySpecialties.includes(it.sub_category))).map((it: any) => it.product_name).filter(Boolean)
        return { ...r, _myItemCount: myCount, _myNames: myNames } // عدد أصناف هذا المورد فقط (لا الإجمالي)
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
        actId, isMember: actId !== session.user.id, p, launchUntil: cfg?.launch_free_until || null, pricesCount: lpCount ?? 0,
        offers: offers || [], hasSectors: mySectors.length > 0, hasSpecialties: mySpecialties.length > 0, openRfqs: visibleRfqs,
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
  const accepted = myOffers.filter((o: any) => o.status === 'accepted').length
  const pending = myOffers.filter((o: any) => o.status === 'pending').length
  const totalRevenue = myOffers.filter((o: any) => o.status === 'accepted').reduce((s: any, o: any) => s + (o.total_price || 0), 0)

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
    if (b) { b.sales += Number(o.total_price) || 0; b.deals += 1 }
  }
  const decided = myOffers.filter((o: any) => o.status === 'accepted' || o.status === 'rejected').length
  const winRate = decided ? Math.round((accepted / decided) * 100) : 0
  const avgDeal = accepted ? Math.round(totalRevenue / accepted) : 0

  const cardTitle = (rfq: any): string => {
    const names: string[] = Array.isArray(rfq._myNames) ? rfq._myNames : []
    if (names.length < 2) return rfqDisplayName({ ...rfq, title: null }, locale, rfq._myItemCount)
    const two = names.slice(0, 2).map((n: string) => getProductLabel(n, locale)).join(L(', ', '، ', '، '))
    const more = names.length - 2
    return more > 0 ? `${two} ${L(`and ${more} more`, `اور ${more} مزید`, `و${arCount(more, 'مادة أخرى', 'مادتان أخريان', 'مواد أخرى', 'مادة أخرى')}`)}` : two
  }
  const needsMe = (o: any) => o.status === 'pending' && ((o.reduction_deadline && new Date(o.reduction_deadline).getTime() > Date.now()) || !!(o.info_request || '').trim())
  const offerStatusLabel = (status: any) => {
    if (status === 'accepted') return t.accepted
    if (status === 'rejected') return t.rejected
    return t.pending
  }

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
            <button type="button" onClick={() => setWelcome(false)} className="w-8 h-8 grid place-items-center shrink-0 text-emerald-700" aria-label={L('Close', 'بند کریں', 'إغلاق')}>×</button>
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
                  const disc = o.reduction_deadline && new Date(o.reduction_deadline).getTime() > Date.now()
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
              <button type="button" onClick={() => { setTab('rfqs'); setRfqFilter('all'); document.getElementById('sup-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className="inline-flex items-center gap-1 min-h-[44px] text-sm font-extrabold text-[#071827] px-4 rounded-xl" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {L('Show them', 'دیکھیں', 'اعرضها')} <span aria-hidden="true">{FWD}</span>
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {sortedOpen.filter((r: any) => !offeredRfqIds.has(r.id)).slice(0, 3).map((rfq: any) => (
                <Link key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`} onClick={() => markSeen(rfq.id)}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 bg-white/[.07] border border-white/10 hover:bg-white/[.12] transition-colors">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white line-clamp-2">{cardTitle(rfq)}</span>
                    <span className="block text-[12px] text-white/60 truncate">{getRegionLabel(rfq.region, locale)}{rfq.expires_at ? ' · ' + formatTimeLeft(rfq.expires_at, locale) : ''}</span>
                  </span>
                  {isFresh(rfq) && <span className="shrink-0 text-[12px] font-bold px-2 py-0.5 rounded-full text-[#071827]" style={{ background: '#F5C55B' }}>{L('New', 'نیا', 'جديد')}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
        {isMember && (
          <div className="rounded-xl px-4 py-2.5 mb-4 text-sm border flex flex-wrap items-center justify-between gap-2" style={{ background: '#0B24380A', borderColor: '#0B243826', color: '#0B2438' }}>
            <span><Glyph e="👥" /> {locale === 'en' ? 'You are working on behalf of' : locale === 'ur' ? 'آپ اس کمپنی کی جانب سے کام کر رہے ہیں:' : 'تعمل باسم'} <b>{companyName}</b></span>
            <Link href="/supplier/team" className="text-xs font-bold underline">{locale === 'en' ? 'Team' : locale === 'ur' ? 'ٹیم' : 'فريق العمل'}</Link>
          </div>
        )}
        {/* التنبيهات: نعرض «الخطوة التالية» الأعلى أولوية فقط، والباقي خلف «عرض المزيد» — كي لا تُدفع قائمة الطلبات أسفل الشاشة على الجوال */}
        {(() => {
          const banners: { key: string; node: any }[] = []
          // بوابة إكمال الملف — بدونها لا تصل أي طلبات (أعلى أولوية)
          if (profile && !profile.region && !isMember) banners.push({ key: 'onboarding', node: (
            <Link href="/onboarding" className="block rounded-2xl p-5 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#D4A543', background: 'linear-gradient(120deg,#fff7ed,#ffffff)' }}>
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0"><Glyph e="🔒" /></span>
                <div className="flex-1">
                  <div className="font-extrabold text-sm" style={{ color: '#8F6820' }}><Glyph e="⚠" /> {L('Complete your profile to receive requests', 'درخواستیں وصول کرنے کے لیے اپنی پروفائل مکمل کریں', 'أكمل ملفك لاستلام الطلبات')}</div>
                  <div className="text-[13px] text-gray-600 mt-1 leading-relaxed">{L("Without your location, sectors and specialties you won't appear to buyers and won't receive any matching requests. One minute is enough.", 'اپنے مقام، شعبوں اور مہارتوں کے بغیر آپ خریداروں کو نظر نہیں آئیں گے اور کوئی مماثل درخواست موصول نہیں ہوگی۔', 'بدون تحديد موقعك وقطاعاتك وتخصصاتك لن تظهر للمشترين، ولن تصلك أي طلبات مطابقة. دقيقة واحدة تكفي.')}</div>
                  <span className="inline-block mt-2.5 text-sm font-bold text-[#071827] px-4 py-2 rounded-xl" style={{ background: '#D4A543' }}>{L('Complete now →', 'ابھی مکمل کریں ←', 'أكمل ملفك الآن ←')}</span>
                </div>
              </div>
            </Link>
          ) })
          if (profile?.verification_status === 'rejected') banners.push({ key: 'rejected', node: (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl"><Glyph e="❌" /></span>
                <div>
                  <div className="font-bold text-red-700 mb-1">{L('Account Rejected', 'اکاؤنٹ مسترد', 'تم رفض حسابك')}</div>
                  <div className="text-sm text-red-600">{L('Your account has been rejected. Please review the reason and reupload your documents.', 'آپ کا اکاؤنٹ مسترد ہو گیا۔ وجہ دیکھیں اور دستاویزات دوبارہ اپلوڈ کریں۔', 'تم رفض حسابك. يرجى مراجعة السبب وإعادة رفع المستندات.')}</div>
                  {profile?.rejection_reason && (
                    <div className="mt-2 bg-red-100 rounded-lg px-3 py-2 text-sm text-red-800 font-medium">
                      <Glyph e="📋" /> {L('Reason: ', 'وجہ: ', 'السبب: ')}{profile.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
              <Link href="/settings" className="inline-block text-xs px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-all">
                {L('Reupload Documents', 'دستاویزات دوبارہ اپلوڈ کریں', 'إعادة رفع المستندات')}
              </Link>
            </div>
          ) })
          // حدّد تخصصاتك الدقيقة
          if (!hasSpecialties && !hasSectors && profile?.verification_status !== 'rejected') banners.push({ key: 'specialties', node: (
            <Link href="/supplier/specialties" className="block bg-gradient-to-l from-[#D4A543]/10 to-[#0B2438]/5 border-2 border-[#D4A543]/30 rounded-2xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="text-3xl"><Glyph e="🎯" /></div>
                <div className="flex-1">
                  <div className="font-bold" style={{ color: '#0B2438' }}>{L('Set your exact specialties for precise matching!', 'درست مماثلت کے لیے اپنی مہارتیں مقرر کریں!', 'حدّد تخصصاتك الدقيقة لتصلك الطلبات المطابقة تماماً!')}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{L('e.g. only "Bricks" or only "Marble" — get only relevant requests', 'مثلاً صرف "اینٹ" یا صرف "سنگ مرمر"', 'مثلاً: محل طوب فقط، أو محل رخام فقط — تصلك الطلبات المطابقة لتخصصك')}</div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap" style={{ color: '#8F6820' }}>{L('Setup →', 'ترتیب دیں ←', 'إعداد ←')}</div>
              </div>
            </Link>
          ) })
          if (profile?.verification_status === 'pending') banners.push({ key: 'pending', node: (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <span className="text-2xl"><Glyph e="⏳" /></span>
              <div>
                <div className="font-bold text-amber-700 mb-1">{L('Account Under Review', 'اکاؤنٹ زیر جائزہ', 'حسابك قيد المراجعة')}</div>
                <div className="text-sm text-amber-600">{sellerKindOf(profile?.provider_type) === 'independent'
                  ? L('We are reviewing your details. This usually takes up to 24 hours.', 'ہم آپ کی تفصیلات کا جائزہ لے رہے ہیں۔ اس میں عموماً 24 گھنٹے لگتے ہیں۔', 'نراجع بياناتك، وعادةً يستغرق ذلك 24 ساعة.')
                  : L('We are reviewing your details and documents; this usually takes 24 hours.', 'ہم آپ کی تفصیلات اور دستاویزات کا جائزہ لے رہے ہیں؛ اس میں عموماً 24 گھنٹے لگتے ہیں۔', 'نراجع بياناتك ومستنداتك، وتستغرق المراجعة عادةً 24 ساعة.')}</div>
              </div>
            </div>
          ) })
          // تنبيهات ثانوية (ضريبة/أسعار/اشتراك) — بعد إكمال الملف فقط
          if (profile && profile.region && !profile.vat_number && sellerKindOf(profile.provider_type) === 'company') banners.push({ key: 'vat', node: (
            <Link href="/settings" className="block bg-[#D4A543]/5 border border-[#D4A543]/40 rounded-2xl p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl"><Glyph e="🧾" /></span>
                <div className="flex-1">
                  <div className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('Add your VAT number', 'اپنا ٹیکس (VAT) نمبر شامل کریں', 'أضف رقمك الضريبي')}</div>
                  <div className="text-xs text-gray-500">{L('Required to issue tax invoices for your deals. Tap to add →', 'آپ کی ڈیلز کے لیے ٹیکس انوائس جاری کرنے کے لیے ضروری ہے۔ شامل کرنے کے لیے دبائیں ←', 'يلزم لإصدار فواتير ضريبية لصفقاتك. اضغط للإضافة ←')}</div>
                </div>
              </div>
            </Link>
          ) })
          if (FEATURES.livePrices && profile && profile.region && pricesCount === 0) banners.push({ key: 'prices', node: (
            <Link href="/supplier/prices" className="block bg-gradient-to-l from-[#D4A543]/10 to-amber-50 border border-amber-200 rounded-2xl p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl"><Glyph e="📈" /></span>
                <div className="flex-1">
                  <div className="font-bold text-sm" style={{ color: '#0B2438' }}>{L('Publish your prices on the price board', 'قیمتوں کے بورڈ پر اپنی قیمتیں شائع کریں', 'انشر أسعارك في بورصة الأسعار')}</div>
                  <div className="text-xs text-gray-500">{L('Buyers look for the latest prices — be the first they see. Tap to add your prices →', 'خریدار تازہ ترین قیمتیں تلاش کرتے ہیں — سب سے پہلے نظر آئیں۔ قیمتیں شامل کرنے کے لیے دبائیں ←', 'يبحث المشترون عن أحدث الأسعار — كن أول من يظهر لهم. اضغط لإضافة أسعارك ←')}</div>
                </div>
              </div>
            </Link>
          ) })
          if (FEATURES.subscription && profile && profile.region && !isSubscribed(profile)) banners.push({ key: 'subscription', node: isLaunchFree(launchUntil) ? (
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
                  <div className="text-xs text-blue-100">{L('Unlimited offers + priority visibility + full price index. Tap for plans →', 'لامحدود پیشکشیں + ترجیحی نمائش + قیمتوں کے اشاریے تک مکمل رسائی ←', 'عروض غير محدودة + أولوية في الظهور + وصول كامل إلى مؤشّر الأسعار ←')}</div>
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
        <EnablePush variant="nudge" />

        <div className="mb-4 sm:mb-6 animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{t.welcome}، {companyName || profile?.full_name || L('Supplier', 'سپلائر', 'مورّد')} <Glyph e="👋" /></h1>
          <p className="text-gray-500 mt-1 text-sm">{t.subtitle}</p>
        </div>

        {/* نقاط اكتمال الملف + خطوات رفعها — مخفية على الجوال افتراضياً كي تظهر الطلبات أولاً */}
        {!isMember && (() => {
          // independent sellers have no CR: drop that step and scale the rest to 100 (as in the app)
          const isIndependent = sellerKindOf(profile?.provider_type) === 'independent'
          const allChecks = [
            { cr: true, ok: profile?.verification_status === 'verified', w: 35, label: L('Verify your CR', 'اپنا سی آر تصدیق کریں', 'وثّق سجلّك التجاري'), href: '/settings' },
            { ok: hasSpecialties, w: 25, label: L('Add specialties', 'مہارتیں شامل کریں', 'أضف تخصصاتك'), href: '/supplier/specialties' },
            { ok: !!(profile?.latitude || profile?.national_short_address), w: 20, label: L('Add map location', 'نقشے پر مقام شامل کریں', 'حدّد موقعك'), href: '/location' },
            // التقييم يأتي من المشتري بعد إتمام صفقة — نوجّه إلى الصفقات لا إلى التخصصات
            { ok: (profile?.rating_avg || 0) > 0, w: 20, label: L('Your first rating comes after your first completed deal', 'پہلی ریٹنگ پہلا سودا مکمل ہونے کے بعد آتی ہے', 'يأتي أول تقييم بعد أول صفقة مكتملة'), href: '', info: true },
          ]
          const checks = allChecks.filter((c: any) => !(isIndependent && c.cr))
          const totalW = checks.reduce((s: number, c: any) => s + c.w, 0) || 1
          const score = Math.round(checks.reduce((s: number, c: any) => s + (c.ok ? c.w : 0), 0) / totalW * 100)
          const missing = checks.filter((c: any) => !c.ok)
          // profile complete: nothing left to do, so the card goes away (owner request, app parity 5b2c5c6)
          if (score >= 100) return null
          const col = score >= 70 ? '#0F6E56' : score >= 40 ? '#D4A543' : '#dc2626'
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
                  <div className="text-[12px] text-gray-500">{score}% — {score >= 70 ? L('Excellent', 'بہترین', 'ممتاز') : score >= 40 ? L('Good', 'اچھا', 'جيد') : L('Needs improvement', 'بہتری کی ضرورت', 'يحتاج إلى تحسين')}</div>
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
        {myOffers.length > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: t.openRfqs, value: openRfqs.length, icon: 'orders', tone: 'brand', go: 'rfqs' },
            { label: t.pendingOffers, value: pending, icon: 'waiting', tone: 'warning', go: 'offers' },
            { label: t.acceptedOffers, value: accepted, icon: 'completed', tone: 'success', go: 'offers' },
            { label: t.revenue, value: myOffers.filter(needsMe).length, icon: 'waiting', tone: 'warning', go: 'offers' },
          ].map(({ label, value, icon, tone, go }) => (
            <button key={label} type="button" onClick={() => { setTab(go); if (go === 'rfqs') setRfqFilter('all'); document.getElementById('sup-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className={`text-start bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${tab === go ? 'border-[#D4A543] ring-1 ring-[#D4A543]/30' : 'border-gray-100'}`}>
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
          const rejected = myOffers.filter((o: any) => o.status === 'rejected').length
          const totalOffers = accepted + pending + rejected
          const C = 2 * Math.PI * 58
          const seg = (n: number) => (totalOffers ? (n / totalOffers) * C : 0)
          const parts = [
            { n: accepted, color: '#0F6E56', label: L('Accepted', 'قبول', 'مقبولة') },
            { n: pending, color: '#D4A543', label: L('Waiting', 'منتظر', 'بانتظار القرار') },
            { n: rejected, color: '#B4B2A9', label: L('Not chosen', 'منتخب نہیں', 'لم تُختر') }, // neutral grey (UX-116)
          ]
          const thisM = months[months.length - 1], lastM = months[months.length - 2]
          const salesDelta = lastM.sales ? Math.round(((thisM.sales - lastM.sales) / lastM.sales) * 100) : null
          const dealsDelta = thisM.deals - lastM.deals
          const Arrow = ({ up, text }: { up: boolean; text: string }) => (
            <div className={`text-xs font-bold mt-0.5 ${up ? 'text-emerald-700' : 'text-gray-600'}`}>{up ? <Glyph e="📈" /> : <Glyph e="📉" />} {text}</div>
          )
          let offset = 0
          return (
            <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="font-extrabold text-[#0B2438]">{L('Your sales', 'آپ کی فروخت', 'مبيعاتك')}</h2>
                  <p className="text-xs text-gray-500">{L('Your offers and this month vs last month', 'آپ کی پیشکشیں اور اس ماہ کا موازنہ', 'نتائج عروضك، وهذا الشهر مقارنة بالشهر الماضي')}</p>
                </div>
                <Link href="/supplier/analytics" className="inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Full performance', 'مکمل کارکردگی', 'أداؤك بالتفصيل')} <span aria-hidden="true">{FWD}</span></Link>
              </div>
              <div className="grid sm:grid-cols-[minmax(0,220px)_1fr] gap-5 items-center">
                {/* donut: how many offers won, waiting, not chosen; win rate in the middle */}
                <div className="flex flex-col items-center">
                  <svg viewBox="0 0 160 160" className="w-40 h-40" role="img" aria-label={L(`Offers: ${accepted} accepted, ${pending} waiting, ${rejected} not chosen`, '', `العروض: ${accepted} مقبولة، ${pending} بانتظار القرار، ${rejected} لم تُختر`)}>
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
                    <div className="text-[12px] text-gray-500">{L('Sales this month', 'اس ماہ کی فروخت', 'مبيعات هذا الشهر')}</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#0B2438] tabular-nums">{thisM.sales.toLocaleString('en-US')} <span className="text-xs text-gray-500 font-bold">{t.sar}</span></div>
                    {salesDelta !== null
                      ? <Arrow up={salesDelta >= 0} text={L(`${Math.abs(salesDelta)}% vs last month`, `${Math.abs(salesDelta)}% پچھلے ماہ سے`, `${Math.abs(salesDelta)}% عن الشهر الماضي`)} />
                      : <div className="text-xs text-gray-500 mt-0.5">{L('No sales last month', 'پچھلے ماہ فروخت نہیں', 'لا مبيعات الشهر الماضي')}</div>}
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Deals this month', 'اس ماہ کی ڈیلز', 'صفقات هذا الشهر')}</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#0B2438] tabular-nums">{thisM.deals}</div>
                    {dealsDelta !== 0
                      ? <Arrow up={dealsDelta > 0} text={L(`${Math.abs(dealsDelta)} vs last month`, `${Math.abs(dealsDelta)} پچھلے ماہ سے`, `${Math.abs(dealsDelta) === 1 ? 'صفقة' : Math.abs(dealsDelta) + ' صفقات'} ${dealsDelta > 0 ? 'أكثر' : 'أقل'} من الماضي`)} />
                      : <div className="text-xs text-gray-500 mt-0.5">{L('Same as last month', 'پچھلے ماہ جتنی', 'مثل الشهر الماضي')}</div>}
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Deals value (SAR)', 'سودوں کی مالیت (ریال)', 'قيمة الصفقات (ر.س)')}</div>
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
          {[{ key: 'rfqs', label: t.tabRfqs, n: openRfqs.length, alert: 0 }, { key: 'offers', label: t.tabOffers, n: myOffers.length, alert: myOffers.filter(needsMe).length }].map((tab_: any) => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)} aria-pressed={tab === tab_.key}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 sm:px-5 rounded-xl text-sm font-semibold transition-all ${tab === tab_.key ? 'text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
              style={tab === tab_.key ? { background: '#0B2438' } : {}}>
              {tab_.label}
              <span className={`inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full text-[12px] ${tab === tab_.key ? 'bg-white/20' : 'bg-gray-100'}`}>{tab_.n}</span>
              {tab_.alert > 0 && <span className="inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full text-[12px] font-extrabold bg-[#D4A543] text-[#071827]" aria-label={L('need your reply', 'آپ کے جواب کی منتظر', 'بحاجة لردّك')}>{tab_.alert}</span>}
            </button>
          ))}
        </div>

        {tab === 'rfqs' && (() => {
          const expiringList = openRfqs.filter((r: any) => { const u = deadlineUrgency(r.expires_at); return u === 'soon' || u === 'critical' })
          const displayedRfqs = rfqFilter === 'expiring' ? expiringList : sortedOpen
          return (
          <div className="stagger">
            {/* فلاتر الطلبات — منها «تنتهي قريباً» (قابلة للضغط) */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'all', label: `${L('All', 'سب', 'الكل')} (${openRfqs.length})`, icon: <Glyph e="📋" /> },
                { key: 'expiring', label: `${L('Ending soon', 'جلد ختم ہونے والی', 'تنتهي قريباً')} (${expiringList.length})`, icon: <Glyph e="⏰" /> },
              ].map((f: any) => (
                <button key={f.key} onClick={() => setRfqFilter(f.key)} aria-pressed={rfqFilter === f.key}
                  className={`min-h-[44px] px-4 rounded-xl text-[13px] font-bold transition-all border ${rfqFilter === f.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={rfqFilter === f.key ? { background: f.key === 'expiring' ? '#B45309' : '#0B2438' } : {}}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
            {loadFailed && <LoadError onRetry={() => { load() }} className="mb-4" message={displayedRfqs.length ? staleMsg : undefined} />}
            {loadFailed && displayedRfqs.length === 0 ? null : displayedRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 sm:p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float">{rfqFilter === 'expiring' ? <Glyph e="⏰" /> : <Glyph e="📭" />}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{rfqFilter === 'expiring' ? L('Nothing ending soon', 'کوئی درخواست جلد ختم نہیں ہو رہی', 'لا توجد طلبات تنتهي قريباً') : t.noRfqs}</h3>
                <p className="text-sm text-gray-600">{rfqFilter === 'expiring' ? L('All open requests still have time.', 'تمام کھلی درخواستوں کے پاس ابھی کافی وقت ہے۔', 'ما زال لدى كل الطلبات المفتوحة متّسع من الوقت.') : t.noRfqsSub}</p>
                {rfqFilter !== 'expiring' && !isMember && <Link href="/supplier/specialties" className="inline-flex items-center mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Review my specialties', 'میری مہارتیں دیکھیں', 'راجِع تخصصاتي')}</Link>}
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
                            {!offeredRfqIds.has(rfq.id) && (isFresh(rfq) || (rfq.created_at && Date.now() - new Date(rfq.created_at).getTime() < 12 * 3600 * 1000)) && (
                              <span className="badge text-[12px] font-bold" style={{ background: '#0F6E5615', color: '#0F6E56' }}><Glyph e="🟢" /> {L('New', 'نیا', 'جديد')}</span>
                            )}
                            <span className="badge text-[12px] bg-[#0B2438]/5 text-[#0B2438]">{sectors[rfq.sector] || rfq.sector}</span>
                            {rfq.vat_invoice_required && <span className="badge text-[12px] font-semibold bg-[#0B2438]/5 text-[#0B2438]"><Glyph e="🧾" /> {L('VAT invoice', 'VAT انوائس', 'فاتورة ضريبية')}</span>}
                            {rfq.sub_category && !(Array.isArray(rfq.items) && rfq.items.length > 1) && (
                              <span className="badge text-[12px] bg-[#D4A543]/10 text-[#8F6820] font-semibold">
                                <Glyph e="🎯" /> {getSubCategoryLabel(rfq.sector, rfq.sub_category, locale)}
                              </span>
                            )}
                            {/* هوية المقاول مخفية في القائمة — تظهر فقط بعد قبول العرض (خصوصية) */}
                            {rfq.contractor?.company_name_ar && (
                              <span className="text-[12px] text-gray-500">
                                <Glyph e="🏢" /> {locale === 'en' && rfq.contractor.company_name_en ? rfq.contractor.company_name_en : rfq.contractor.company_name_ar}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium flex-wrap">
                      {Array.isArray(rfq.items) && rfq.items.length > 1
                        ? (() => { const n = Number(rfq._myItemCount) || rfq.items.length; return <span><Glyph e="📦" /> {L(`${n} ${n === 1 ? 'material' : 'materials'} in your specialty`, `آپ کی مہارت میں ${n} اشیاء`, `${arMaterials(n)} ضمن تخصصك`)}</span> })()
                        : <span><Glyph e="📦" /> {rfq.quantity} {getUnitLabel(rfq.unit, locale)}</span>}
                      <span><Glyph e="📍" /> {getRegionLabel(rfq.region, locale)}</span>
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
                      {!offeredRfqIds.has(rfq.id) && <span className="inline-flex items-center gap-1 min-h-[36px] text-[#071827] text-[13px] font-bold px-4 rounded-xl whitespace-nowrap" style={{ background: '#D4A543' }}>{t.submitOffer} <span aria-hidden="true">{FWD}</span></span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          ); })()}

        {tab === 'offers' && (
          <div className="stagger">
            {loadFailed && <LoadError onRetry={() => { load() }} className="mb-4" message={myOffers.length ? staleMsg : undefined} />}
            {loadFailed && myOffers.length === 0 ? null : myOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float"><Glyph e="📤" /></div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{t.noOffers}</h3>
                <p className="text-sm text-gray-500">{t.noOffersSub}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...myOffers].sort((a: any, b: any) => Number(needsMe(b)) - Number(needsMe(a))).map((offer: any) => (
                  <Link key={offer.id} href={`/supplier/dashboard/rfq/${offer.rfq_id}`} className={`block bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md hover:border-[#D4A543]/40 ${
                    offer.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/50' :
                    offer.status === 'rejected' ? 'border-gray-200 bg-gray-50' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          offer.status === 'accepted' ? 'bg-emerald-100' : offer.status === 'rejected' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50'
                        }`}>{offer.status === 'accepted' ? <Glyph e="✅" /> : offer.status === 'rejected' ? <Glyph e="📭" /> : <Glyph e="⏳" />}</div>
                        <div>
                          <span className="font-bold line-clamp-2" style={{ color: '#0B2438' }}>{offer.rfq ? rfqDisplayName({ ...offer.rfq, title: null }, locale) : '—'}</span>
                          {offer.rfq?.sector && (
                            <span className="badge text-[12px] bg-[#0B2438]/5 text-[#0B2438] mx-2">{sectors[offer.rfq.sector] || offer.rfq.sector}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-lg font-bold" style={{ color: '#0B2438' }}>{offer.total_price?.toLocaleString('en-US')} <span className="text-xs text-gray-500">{t.sar}</span></div>
                        <span className={`badge text-[12px] ${
                          offer.status === 'accepted' ? 'badge-green' : offer.status === 'rejected' ? 'bg-gray-100 text-gray-600' : 'badge-amber'
                        }`}>{offerStatusLabel(offer.status)}</span>
                        {/* the buyer is waiting on the supplier: a discount request or a question (same badges as the app) */}
                        {offer.status === 'pending' && offer.reduction_deadline && new Date(offer.reduction_deadline).getTime() > Date.now() && (
                          <span className="block mt-1 badge text-[12px] font-bold" style={{ background: '#D4A543', color: '#071827' }}><Glyph e="📉" /> {L('Buyer asked for a discount', 'خریدار نے رعایت مانگی', 'طلب المشتري خصماً')}</span>
                        )}
                        {offer.status === 'pending' && (offer.info_request || '').trim() && (
                          <span className="block mt-1 badge text-[12px] font-bold" style={{ background: '#D4A54318', color: '#8F6820' }}><Glyph e="❓" /> {L('Buyer has a question', 'خریدار کا سوال', 'سؤال من المشتري')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                      {offer.delivery_days && <span><Glyph e="📦" /> {daysText(offer.delivery_days, locale)}</span>}
                      {offer.rfq?.region && <span><Glyph e="📍" /> {getRegionLabel(offer.rfq.region, locale)}</span>}
                      {sentBy(offer) && <span className="font-semibold text-gray-500">{sentBy(offer)}</span>}
                    </div>
                    <div className="mt-2.5 text-[13px] font-bold flex items-center gap-1" style={{ color: '#8F6820' }}>
                      {offer.status === 'accepted'
                        ? L('Open the deal and the invoice', 'سودا اور انوائس کھولیں', 'افتح الصفقة والفاتورة')
                        : needsMe(offer) ? L('Reply now', 'ابھی جواب دیں', 'ردّ الآن') : L('View my offer', 'میری آفر دیکھیں', 'اطّلع على عرضي')} <span aria-hidden="true">{FWD}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
