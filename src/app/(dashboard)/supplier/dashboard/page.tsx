'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EnablePush from '@/components/shared/EnablePush'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { FEATURES } from '@/lib/features'
import { toast } from 'sonner'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
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

const txt = {
  ar: {
    welcome: 'أهلاً', subtitle: 'تصفح طلبات التسعير المتاحة وقدم عروضك',
    logout: 'خروج', openRfqs: 'طلبات مفتوحة', pendingOffers: 'عروض بانتظار قرار المشتري',
    acceptedOffers: 'عروض مقبولة', revenue: 'إجمالي الإيرادات',
    tabRfqs: 'طلبات التسعير', tabOffers: 'عروضي',
    noRfqs: 'لا توجد طلبات مفتوحة الآن', noRfqsSub: 'تأكّد أن تخصصاتك وموقعك مكتملة ليصلك أول طلب مطابق — عادةً تصل الطلبات خلال ساعات، وسننبّهك فوراً.',
    noOffers: 'لم تقدم أي عروض بعد', noOffersSub: 'تصفح طلبات التسعير وقدم أول عرض',
    submitOffer: 'سعّر الآن ←', offerSubmitted: '✓ تمّ إرسال العرض — راجِعه', accepted: '✓ مقبول', rejected: 'لم يُختر', pending: 'بانتظار قرار المشتري',
    day: 'يوم', offer: 'عرض', loading: 'جارٍ التحميل...',
    sar: 'ر.س',
  },
  en: {
    welcome: 'Hello', subtitle: 'Browse available RFQs and submit your offers',
    logout: 'Logout', openRfqs: 'Open RFQs', pendingOffers: 'Pending Offers',
    acceptedOffers: 'Accepted Offers', revenue: 'Total Revenue',
    tabRfqs: 'RFQ Requests', tabOffers: 'My Offers',
    noRfqs: 'No open requests', noRfqsSub: 'You will be notified when new requests arrive',
    noOffers: 'No offers submitted yet', noOffersSub: 'Browse RFQs and submit your first offer',
    submitOffer: 'Price now →', offerSubmitted: '✓ Offer sent — review', accepted: '✓ Accepted', rejected: 'Not chosen', pending: 'Pending',
    day: 'days', offer: 'offer', loading: 'Loading...',
    sar: 'SAR',
  },
  ur: {
    welcome: 'خوش آمدید', subtitle: 'دستیاب درخواستیں دیکھیں اور اپنی پیشکشیں جمع کریں',
    logout: 'لاگ آؤٹ', openRfqs: 'کھلی درخواستیں', pendingOffers: 'زیر التواء پیشکشیں',
    acceptedOffers: 'قبول شدہ پیشکشیں', revenue: 'کل آمدنی',
    tabRfqs: 'قیمت کی درخواستیں', tabOffers: 'میری پیشکشیں',
    noRfqs: 'کوئی کھلی درخواست نہیں', noRfqsSub: 'نئی درخواستیں آنے پر آپ کو مطلع کیا جائے گا',
    noOffers: 'ابھی تک کوئی پیشکش نہیں', noOffersSub: 'درخواستیں دیکھیں اور پہلی پیشکش جمع کریں',
    submitOffer: 'ابھی قیمت دیں ←', offerSubmitted: '✓ آفر بھیج دی گئی — دیکھیں', accepted: '✓ قبول', rejected: 'منتخب نہیں ہوئی', pending: 'زیر التواء',
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
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rfqs')
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

  async function load() {
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
      // Speed: the database is far from our users (~1 s a request), so everything that only needs
      // the company id goes out at once instead of one after another (was 11 sequential requests).
      const [
        { data: p }, { data: cfg }, { data: sectorRows }, { data: specRows },
        { data: myBranches }, { data: dismissals }, { data: offers }, { count: lpCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', actId).single(),
        supabase.from('app_config').select('launch_free_until').maybeSingle(),
        supabase.from('profile_sectors').select('sector').eq('profile_id', actId),
        supabase.from('profile_specialties').select('specialty').eq('profile_id', actId),
        supabase.from('branches').select('region').eq('supplier_id', actId),
        supabase.from('rfq_dismissals').select('rfq_id').eq('supplier_id', actId),
        supabase.from('offers').select('*, rfq:rfqs(product_name, sector, quantity, unit, region, status, ref_no, items, created_at)').eq('supplier_id', actId).order('created_at', { ascending: false }),
        supabase.from('live_prices').select('id', { count: 'exact', head: true }).eq('supplier_id', actId),
      ])
      setProfile(p)
      if (p) rememberSellerKind(sellerKindOf(p.provider_type))
      setLaunchUntil(cfg?.launch_free_until || null)
      setMyOffers(offers || [])
      setPricesCount(lpCount ?? 0)

      // جلب قطاعات المورد المتخصص فيها
      const mySectors = (sectorRows || []).map((r: any) => r.sector)
      setHasSectors(mySectors.length > 0)

      // جلب التخصصات الفرعية للمورد
      const mySpecialties = (specRows || []).map((r: any) => r.specialty)
      setHasSpecialties(mySpecialties.length > 0)

      // فلترة الطلبات حسب تصنيف المورد
      const minVal = p?.min_order_value || 0

      let rfqQuery = supabase.from('rfqs')
        .select('*, contractor:profiles_public(company_name_ar, company_name_en, contractor_grade)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(150) // bound the feed (region/sector already filtered server-side); newest first

      // ✅ فلترة بالقطاع — يشمل أي قطاع من مواد الطلب (طلبات متعددة القطاعات)
      if (mySectors.length > 0) {
        rfqQuery = rfqQuery.overlaps('sectors', mySectors)
      }

      // الحد الأدنى للقيمة — فقط لو المورد حدد minimum
      if (minVal > 0) {
        rfqQuery = rfqQuery.or(`estimated_value.gte.${minVal},estimated_value.is.null`)
      }

      const { data: rfqsRaw } = await rfqQuery

      // ✅ مطابقة بند-بند: يظهر الطلب لو يقدر يورّد مادة واحدة على الأقل
      // (قطاعها ضمن قطاعاته + تخصصها ضمن تخصصاته أو بدون تخصص محدد)
      let rfqs = (rfqsRaw || []).map((r: any) => {
        const its = Array.isArray(r.items) && r.items.length ? r.items : [{ sector: r.sector, sub_category: r.sub_category }]
        const myCount = its.filter((it: any) => {
          if (mySectors.length > 0 && !mySectors.includes(it.sector)) return false
          if (mySpecialties.length > 0 && it.sub_category && !mySpecialties.includes(it.sub_category)) return false
          return true
        }).length
        return { ...r, _myItemCount: myCount } // عدد أصناف هذا المورد فقط (لا الإجمالي)
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
        .channel(`sup-noti-${session.user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, (payload: any) => {
          const n = payload.new
          if (n?.type === 'new_rfq') {
            toast.success(n.title || (L('New RFQ received', 'نئی قیمت کی درخواست موصول ہوئی', 'وصلك طلب تسعير جديد')), {
              description: n.body || undefined, duration: 7000,
            })
            load()
          }
        })
        .subscribe()
    })
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    clearAllLocalDrafts()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <PageLoader />

  const offeredRfqIds = new Set(myOffers.map((o: any) => o.rfq_id)) // RFQs the supplier already bid on
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

  const needsMe = (o: any) => o.status === 'pending' && ((o.reduction_deadline && new Date(o.reduction_deadline).getTime() > Date.now()) || !!(o.info_request || '').trim())
  const offerStatusLabel = (status: any) => {
    if (status === 'accepted') return t.accepted
    if (status === 'rejected') return t.rejected
    return t.pending
  }

  const companyName = locale === 'en' && profile?.company_name_en ? profile.company_name_en : profile?.company_name_ar

  const nav = getNav('supplier', locale, '/supplier/dashboard')
  if (openRfqs.length > 0) nav[0] = { ...nav[0], badge: openRfqs.length } // شارة الطلبات المتاحة

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
        {toPrice.length > 0 && (
          <div className={`mb-5 rounded-2xl p-4 sm:p-5 border-2 animate-fade-in ${freshCount ? 'tsk-glow' : ''}`} style={{ borderColor: '#D4A543', background: 'linear-gradient(120deg,#071827,#0B2438 60%,#102E45)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="relative grid place-items-center w-11 h-11 rounded-xl text-xl text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                  <Glyph e="🔔" />
                  {freshCount > 0 && <span className="absolute -top-1 -end-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold grid place-items-center">{freshCount}</span>}
                </span>
                <div>
                  <div className="font-extrabold text-white">{L(`${toPrice.length} request(s) waiting for your price`, `${toPrice.length} درخواستیں آپ کی قیمت کی منتظر`, toPrice.length === 1 ? 'طلب واحد بانتظار تسعيرك' : `${toPrice.length} طلبات بانتظار تسعيرك`)}</div>
                  <div className="text-xs text-white/70">{freshCount ? L(`${freshCount} new — price early to stand out`, `${freshCount} نئی — جلد قیمت دیں`, `منها ${freshCount} جديدة لم تفتحها — التسعير المبكر يرفع فرصتك`) : L('Price early to raise your chances', 'جلد قیمت دیں', 'التسعير المبكر يرفع فرصتك')}</div>
                </div>
              </div>
              <button type="button" onClick={() => { setTab('rfqs'); setRfqFilter('all'); document.getElementById('sup-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className="text-sm font-extrabold text-[#071827] px-4 py-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {L('Show them', 'دیکھیں', 'اعرضها')} ←
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {sortedOpen.filter((r: any) => !offeredRfqIds.has(r.id)).slice(0, 3).map((rfq: any) => (
                <Link key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`} onClick={() => markSeen(rfq.id)}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 bg-white/[.07] border border-white/10 hover:bg-white/[.12] transition-colors">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white truncate">{rfqDisplayName(rfq, locale, rfq._myItemCount)}</span>
                    <span className="block text-[11px] text-white/60 truncate">{getRegionLabel(rfq.region, locale)}{rfq.expires_at ? ' · ' + formatTimeLeft(rfq.expires_at, locale) : ''}</span>
                  </span>
                  {isFresh(rfq) && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full text-[#071827]" style={{ background: '#F5C55B' }}>{L('New', 'نیا', 'جديد')}</span>}
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
                  <div className="font-extrabold text-sm" style={{ color: '#9D7425' }}><Glyph e="⚠" /> {L('Complete your profile to receive requests', 'درخواستیں وصول کرنے کے لیے اپنی پروفائل مکمل کریں', 'أكمل ملفك لاستلام الطلبات')}</div>
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
                <div className="text-sm font-semibold whitespace-nowrap" style={{ color: '#D4A543' }}>{L('Setup →', 'ترتیب دیں ←', 'إعداد ←')}</div>
              </div>
            </Link>
          ) })
          if (profile?.verification_status === 'pending') banners.push({ key: 'pending', node: (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <span className="text-2xl"><Glyph e="⏳" /></span>
              <div>
                <div className="font-bold text-amber-700 mb-1">{L('Account Under Review', 'اکاؤنٹ زیر جائزہ', 'حسابك قيد المراجعة')}</div>
                <div className="text-sm text-amber-600">{L('Your account is being reviewed. This usually takes up to 24 hours.', 'آپ کے اکاؤنٹ کا جائزہ لیا جا رہا ہے۔ اس میں عموماً 24 گھنٹے لگتے ہیں۔', 'تجري مراجعة بياناتك ورخصة عملك، وتستغرق المراجعة عادةً 24 ساعة.')}</div>
              </div>
            </div>
          ) })
          // تنبيهات ثانوية (ضريبة/أسعار/اشتراك) — بعد إكمال الملف فقط
          if (profile && profile.region && !profile.vat_number && sellerKindOf(profile.provider_type) === 'company') banners.push({ key: 'vat', node: (
            <Link href="/settings" className="block bg-[#D4A543]/5 border border-blue-200 rounded-2xl p-4 hover:shadow-md transition-all">
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
                    className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-[#D4A543]/40">
                    {showMoreBanners ? L('Show less ▲', 'کم دکھائیں ▲', 'عرض أقل ▲') : `${L('Show more', 'مزید دکھائیں', 'عرض المزيد')} (${rest.length}) ▼`}
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
          const checks = [
            { ok: profile?.verification_status === 'verified', w: 35, label: L('Verify your CR', 'اپنا سی آر تصدیق کریں', 'وثّق سجلّك التجاري'), href: '/settings' },
            { ok: hasSpecialties, w: 25, label: L('Add specialties', 'مہارتیں شامل کریں', 'أضف تخصصاتك'), href: '/supplier/specialties' },
            { ok: !!(profile?.latitude || profile?.national_short_address), w: 20, label: L('Add map location', 'نقشے پر مقام شامل کریں', 'حدّد موقعك'), href: '/location' },
            // التقييم يأتي من المشتري بعد إتمام صفقة — نوجّه إلى الصفقات لا إلى التخصصات
            { ok: (profile?.rating_avg || 0) > 0, w: 20, label: L('Complete a deal to get your first rating', 'پہلی ریٹنگ کے لیے ایک ڈیل مکمل کریں', 'أتمّ صفقة لتحصل على أول تقييم'), href: '/supplier/deals' },
          ]
          const score = checks.reduce((s: any, c: any) => s + (c.ok ? c.w : 0), 0)
          const missing = checks.filter((c: any) => !c.ok)
          const col = score >= 70 ? '#0F6E56' : score >= 40 ? '#D4A543' : '#dc2626'
          return (
            <>
              <button type="button" onClick={() => setShowScoreMobile(v => !v)} aria-expanded={showScoreMobile}
                className="sm:hidden mb-4 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600">
                {L('Profile completion', 'پروفائل کی تکمیل', 'اكتمال ملفك')}: {score}% {showScoreMobile ? '▲' : '▼'}
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
                  <div className="text-[11px] text-gray-400">{score}% — {score >= 70 ? L('Excellent', 'بہترین', 'ممتاز') : score >= 40 ? L('Good', 'اچھا', 'جيد') : L('Needs improvement', 'بہتری کی ضرورت', 'يحتاج إلى تحسين')}</div>
                </div>
              </div>
              {missing.length > 0 && (
                <div className="sm:col-span-2 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold mb-2" style={{ color: '#0B2438' }}>{L('Strengthen your profile:', 'اپنی پروفائل مضبوط کریں:', 'عزّز ملفك:')}</div>
                  <div className="flex flex-wrap gap-2">
                    {missing.map((c: any) => <Link key={c.href} href={c.href} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-dashed transition-all hover:bg-orange-50" style={{ borderColor: '#D4A543', color: '#9D7425' }}>+ {c.label}</Link>)}
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
            { label: t.revenue, value: totalRevenue.toLocaleString('en-US'), icon: 'pricing', tone: 'info', go: 'offers' },
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
            { n: rejected, color: '#B4B2A9', label: L('Not chosen', 'منتخب نہیں', 'لم تُختر') },
          ]
          const thisM = months[months.length - 1], lastM = months[months.length - 2]
          const salesDelta = lastM.sales ? Math.round(((thisM.sales - lastM.sales) / lastM.sales) * 100) : null
          const dealsDelta = thisM.deals - lastM.deals
          const Arrow = ({ up, text }: { up: boolean; text: string }) => (
            <div className={`text-xs font-bold mt-0.5 ${up ? 'text-emerald-700' : 'text-red-600'}`}>{up ? '▲' : '▼'} {text}</div>
          )
          let offset = 0
          return (
            <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="font-extrabold text-[#0B2438]">{L('Your sales', 'آپ کی فروخت', 'مبيعاتك')}</h2>
                  <p className="text-xs text-gray-500">{L('Your offers and this month vs last month', 'آپ کی پیشکشیں اور اس ماہ کا موازنہ', 'نتائج عروضك، وهذا الشهر مقارنة بالشهر الماضي')}</p>
                </div>
                <Link href="/supplier/analytics" className="text-xs font-bold text-[#9D7425] hover:underline">{L('Full performance', 'مکمل کارکردگی', 'أداؤك بالتفصيل')} ←</Link>
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
                    <text x="80" y="102" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 12 }}>{L('win rate', 'کامیابی', 'نسبة الفوز')}</text>
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
                    <div className="text-xl sm:text-2xl font-extrabold text-[#0B2438] tabular-nums">{thisM.sales.toLocaleString('en-US')} <span className="text-xs text-gray-400 font-bold">{t.sar}</span></div>
                    {salesDelta !== null
                      ? <Arrow up={salesDelta >= 0} text={L(`${Math.abs(salesDelta)}% vs last month`, `${Math.abs(salesDelta)}% پچھلے ماہ سے`, `${Math.abs(salesDelta)}% عن الشهر الماضي`)} />
                      : <div className="text-xs text-gray-400 mt-0.5">{L('No sales last month', 'پچھلے ماہ فروخت نہیں', 'لا مبيعات الشهر الماضي')}</div>}
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Deals this month', 'اس ماہ کی ڈیلز', 'صفقات هذا الشهر')}</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#0B2438] tabular-nums">{thisM.deals}</div>
                    {dealsDelta !== 0
                      ? <Arrow up={dealsDelta > 0} text={L(`${Math.abs(dealsDelta)} vs last month`, `${Math.abs(dealsDelta)} پچھلے ماہ سے`, `${Math.abs(dealsDelta) === 1 ? 'صفقة' : Math.abs(dealsDelta) + ' صفقات'} ${dealsDelta > 0 ? 'أكثر' : 'أقل'} من الماضي`)} />
                      : <div className="text-xs text-gray-400 mt-0.5">{L('Same as last month', 'پچھلے ماہ جتنی', 'مثل الشهر الماضي')}</div>}
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Total sales', 'کل فروخت', 'إجمالي المبيعات')}</div>
                    <div className="text-lg font-extrabold text-[#0B2438] tabular-nums">{totalRevenue.toLocaleString('en-US')} <span className="text-xs text-gray-400 font-bold">{t.sar}</span></div>
                  </div>
                  <div className="rounded-xl bg-[#F6F7F9] p-3.5">
                    <div className="text-[12px] text-gray-500">{L('Average deal', 'اوسط ڈیل', 'متوسط الصفقة')}</div>
                    <div className="text-lg font-extrabold text-[#0B2438] tabular-nums">{avgDeal ? avgDeal.toLocaleString('en-US') : '—'} {avgDeal ? <span className="text-xs text-gray-400 font-bold">{t.sar}</span> : null}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        <div className="flex gap-2 mb-6" id="sup-list" style={{ scrollMarginTop: '70px' }}>
          {[{ key: 'rfqs', label: `${t.tabRfqs} (${openRfqs.length})` }, { key: 'offers', label: `${t.tabOffers} (${myOffers.length})${myOffers.some(needsMe) ? ' •' : ''}` }].map((tab_: any) => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === tab_.key ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              style={tab === tab_.key ? { background: '#0B2438' } : {}}>
              {tab_.label}
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
                <button key={f.key} onClick={() => setRfqFilter(f.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${rfqFilter === f.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={rfqFilter === f.key ? { background: f.key === 'expiring' ? '#d97706' : '#0B2438' } : {}}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
            {displayedRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float">{rfqFilter === 'expiring' ? <Glyph e="⏰" /> : <Glyph e="📭" />}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{rfqFilter === 'expiring' ? L('Nothing ending soon', 'کوئی درخواست جلد ختم نہیں ہو رہی', 'لا توجد طلبات تنتهي قريباً') : t.noRfqs}</h3>
                <p className="text-sm text-gray-500">{rfqFilter === 'expiring' ? L('All open requests still have time.', 'تمام کھلی درخواستوں کے پاس ابھی کافی وقت ہے۔', 'ما زال لدى كل الطلبات المفتوحة متّسع من الوقت.') : t.noRfqsSub}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedRfqs.map((rfq: any) => (
                  <Link key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`} onClick={() => markSeen(rfq.id)}
                    className={`block bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:border-[#D4A543]/30 hover:-translate-y-0.5 transition-all duration-300 ${isFresh(rfq) ? 'tsk-glow border-[#D4A543]' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AppIcon name="orders" tone="brand" variant="tone" size={44} />
                        <div className="min-w-0">
                          <div className="font-bold truncate" style={{ color: '#0B2438' }}>{rfqDisplayName(rfq, locale, rfq._myItemCount)}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {!offeredRfqIds.has(rfq.id) && (isFresh(rfq) || (rfq.created_at && Date.now() - new Date(rfq.created_at).getTime() < 12 * 3600 * 1000)) && (
                              <span className="badge text-[10px] font-bold" style={{ background: '#0F6E5615', color: '#0F6E56' }}><Glyph e="🟢" /> {L('New', 'نیا', 'جديد')}</span>
                            )}
                            <span className="badge badge-blue text-[10px]">{sectors[rfq.sector] || rfq.sector}</span>
                            {rfq.sub_category && (
                              <span className="badge text-[10px] bg-[#D4A543]/10 text-[#D4A543] font-semibold">
                                <Glyph e="🎯" /> {getSubCategoryLabel(rfq.sector, rfq.sub_category, locale)}
                              </span>
                            )}
                            {/* هوية المقاول مخفية في القائمة — تظهر فقط بعد قبول العرض (خصوصية) */}
                            {rfq.contractor?.company_name_ar && (
                              <span className="text-[10px] text-gray-400">
                                <Glyph e="🏢" /> {locale === 'en' && rfq.contractor.company_name_en ? rfq.contractor.company_name_en : rfq.contractor.company_name_ar}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {offeredRfqIds.has(rfq.id)
                        ? <div className="text-white text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap" style={{ background: '#0F6E56' }}>{t.offerSubmitted}</div>
                        : <div className="text-[#071827] text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap" style={{ background: '#D4A543' }}>{t.submitOffer}</div>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium flex-wrap">
                      <span><Glyph e="📦" /> {rfq.quantity} {getUnitLabel(rfq.unit, locale)}</span>
                      <span><Glyph e="📍" /> {getRegionLabel(rfq.region, locale)}</span>
                      {rfq.created_at && <span><Glyph e="🗓" /> {formatDateTime(rfq.created_at)}</span>}
                      {rfq.specification && <span className="truncate max-w-[180px]"><Glyph e="⚙" /> {rfq.specification}</span>}
                      <span><Glyph e="💬" /> {rfq.offer_count || 0} {t.offer}</span>
                      {rfq.expires_at && (() => {
                        const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                        return (
                          <span className="px-2 py-0.5 rounded-full font-bold ml-auto" style={{ background: st.bg, color: st.fg }}>
                            {u === 'critical' ? <Glyph e="🔴" /> : u === 'soon' ? <Glyph e="🟠" /> : <Glyph e="⏰" />} {formatTimeLeft(rfq.expires_at, locale)}
                          </span>
                        )
                      })()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          ); })()}

        {tab === 'offers' && (
          <div className="stagger">
            {myOffers.length === 0 ? (
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
                    offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          offer.status === 'accepted' ? 'bg-emerald-100' : offer.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                        }`}>{offer.status === 'accepted' ? <Glyph e="✅" /> : offer.status === 'rejected' ? <Glyph e="❌" /> : <Glyph e="⏳" />}</div>
                        <div>
                          <span className="font-bold" style={{ color: '#0B2438' }}>{offer.rfq ? rfqDisplayName(offer.rfq, locale) : '—'}</span>
                          {offer.rfq?.sector && (
                            <span className="badge badge-blue text-[10px] mx-2">{sectors[offer.rfq.sector] || offer.rfq.sector}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold" style={{ color: '#0B2438' }}>{offer.total_price?.toLocaleString('en-US')} <span className="text-xs text-gray-400">{t.sar}</span></div>
                        <span className={`badge text-[10px] ${
                          offer.status === 'accepted' ? 'badge-green' : offer.status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>{offerStatusLabel(offer.status)}</span>
                        {/* the buyer is waiting on the supplier: a discount request or a question (same badges as the app) */}
                        {offer.status === 'pending' && offer.reduction_deadline && new Date(offer.reduction_deadline).getTime() > Date.now() && (
                          <span className="block mt-1 badge text-[10px] font-bold" style={{ background: '#fff7ed', color: '#c2410c' }}><Glyph e="📉" /> {L('Buyer asked for a lower price', 'خریدار نے کم قیمت مانگی', 'طلب المشتري خصماً')}</span>
                        )}
                        {offer.status === 'pending' && (offer.info_request || '').trim() && (
                          <span className="block mt-1 badge text-[10px] font-bold" style={{ background: '#D4A54318', color: '#9D7425' }}><Glyph e="❓" /> {L('Buyer has a question', 'خریدار کا سوال', 'سؤال من المشتري')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      {offer.delivery_days && <span><Glyph e="📦" /> {offer.delivery_days} {t.day}</span>}
                      {offer.rfq?.region && <span><Glyph e="📍" /> {getRegionLabel(offer.rfq.region, locale)}</span>}
                    </div>
                    <div className="mt-2.5 text-[11px] font-bold flex items-center gap-1" style={{ color: '#D4A543' }}>
                      {offer.status === 'accepted'
                        ? (locale === 'en' ? 'View deal & invoice →' : locale === 'ur' ? 'ڈیل دیکھیں →' : 'افتح الصفقة والفاتورة ←')
                        : (locale === 'en' ? 'View / edit offer →' : locale === 'ur' ? 'پیشکش دیکھیں →' : 'افتح العرض والتفاصيل ←')}
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
