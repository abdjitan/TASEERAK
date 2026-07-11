'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
import { useTranslation } from '@/i18n'
import { getSubCategoryLabel, getProductLabel, getUnitLabel } from '@/types'
import { rfqDisplayName } from '@/lib/rfqName'
import AppShell from '@/components/shared/AppShell'
import { isSubscribed, isLaunchFree } from '@/lib/plans'
import { getNav } from '@/lib/nav'
import { AppIcon } from '@/components/AppIcon'
import { isExpired, formatTimeLeft, deadlineUrgency, urgencyStyle, formatDateTime } from '@/lib/deadline'

const txt = {
  ar: {
    welcome: 'أهلاً', subtitle: 'تصفح طلبات التسعير المتاحة وقدم عروضك',
    logout: 'خروج', openRfqs: 'طلبات مفتوحة', pendingOffers: 'عروض قيد المراجعة',
    acceptedOffers: 'عروض مقبولة', revenue: 'إجمالي الإيرادات',
    tabRfqs: 'طلبات التسعير', tabOffers: 'عروضي',
    noRfqs: 'لا توجد طلبات مفتوحة الآن', noRfqsSub: 'تأكّد أن تخصصاتك وموقعك مكتملة ليصلك أول طلب مطابق — عادةً تصل الطلبات خلال ساعات، وسننبّهك فوراً.',
    noOffers: 'لم تقدم أي عروض بعد', noOffersSub: 'تصفح طلبات التسعير وقدم أول عرض',
    submitOffer: 'تقديم عرض →', offerSubmitted: '✓ تم تقديم عرضك — راجِعه', accepted: '✓ مقبول', rejected: '✕ مرفوض', pending: '⏳ قيد المراجعة',
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
    submitOffer: 'Submit Offer →', offerSubmitted: '✓ Offer submitted — review', accepted: '✓ Accepted', rejected: '✕ Rejected', pending: '⏳ Pending',
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
    submitOffer: 'پیشکش جمع کریں →', offerSubmitted: '✓ پیشکش جمع ہو گئی — دیکھیں', accepted: '✓ قبول', rejected: '✕ مسترد', pending: '⏳ زیر التواء',
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

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [launchUntil, setLaunchUntil] = useState<any>(null)
  const [pricesCount, setPricesCount] = useState<any>(null)
  const [openRfqs, setOpenRfqs] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rfqs')
  const [rfqFilter, setRfqFilter] = useState('all') // all | expiring
  const [hasSpecialties, setHasSpecialties] = useState(true)
  const [hasSectors, setHasSectors] = useState(true)

  async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)
      const { data: cfg } = await supabase.from('app_config').select('launch_free_until').maybeSingle()
      setLaunchUntil(cfg?.launch_free_until || null)

      // جلب قطاعات المورد المتخصص فيها
      const { data: sectorRows } = await supabase.from('profile_sectors').select('sector').eq('profile_id', session.user.id)
      const mySectors = (sectorRows || []).map((r: any) => r.sector)
      setHasSectors(mySectors.length > 0)

      // جلب التخصصات الفرعية للمورد
      const { data: specRows } = await supabase.from('profile_specialties').select('specialty').eq('profile_id', session.user.id)
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

      // ✅ فلترة حسب استهداف المقاول: نوع المورد (مصنع/تجاري/محلي) + الموثّقون فقط
      const myTier = p?.supplier_tier || 'local'
      const isVerified = p?.verification_status === 'verified'
      // الفروع: المورد يخدم منطقته الرئيسية + كل مناطق فروعه
      const { data: myBranches } = await supabase.from('branches').select('region').eq('supplier_id', session.user.id)
      const servedRegions = [p?.region, ...(myBranches || []).map((b: any) => b.region)].filter(Boolean)
      rfqs = rfqs.filter((r: any) => {
        if (r.verified_only && !isVerified) return false
        if (Array.isArray(r.target_tiers) && r.target_tiers.length > 0 && !r.target_tiers.includes(myTier)) return false
        if (r.nearby_only && servedRegions.length > 0 && !servedRegions.includes(r.region)) return false
        // المقاول حدّد مناطق معيّنة — أظهر الطلب فقط لو أخدم إحداها
        if (Array.isArray(r.target_regions) && r.target_regions.length > 0 && !r.target_regions.some((reg: any) => servedRegions.includes(reg))) return false
        return true
      })

      // استبعاد الطلبات المتجاهلة + المنتهية مهلتها (ما عاد يقدر يسعّرها)
      const { data: dismissals } = await supabase.from('rfq_dismissals').select('rfq_id').eq('supplier_id', session.user.id)
      const dismissedIds = new Set((dismissals || []).map((d: any) => d.rfq_id))
      const visibleRfqs = (rfqs || []).filter((r: any) => !dismissedIds.has(r.id) && !isExpired(r.expires_at))

      setOpenRfqs(visibleRfqs)

      // إنذار: طلبات تنتهي مهلتها قريباً (خلال 12 ساعة) — حثّ المورد على التسعير
      const expiringSoon = visibleRfqs.filter((r: any) => { const u = deadlineUrgency(r.expires_at); return u === 'soon' || u === 'critical' })
      if (expiringSoon.length > 0) {
        toast(`⏰ ${expiringSoon.length} ${expiringSoon.length === 1 ? 'طلب تنتهي مهلته' : 'طلبات تنتهي مهلتها'} قريباً — سارِع بالتسعير`, { duration: 7000 })
      }

      const { data: offers } = await supabase.from('offers').select('*, rfq:rfqs(product_name, sector, quantity, unit, region, status)').eq('supplier_id', session.user.id).order('created_at', { ascending: false })
      setMyOffers(offers || [])
      const { count: lpCount } = await supabase.from('live_prices').select('id', { count: 'exact', head: true }).eq('supplier_id', session.user.id)
      setPricesCount(lpCount ?? 0)
      setLoading(false)
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
            toast.success(n.title || (locale === 'en' ? '🔔 New RFQ received' : '🔔 وصلك طلب تسعير جديد'), {
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
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <PageLoader />

  const offeredRfqIds = new Set(myOffers.map((o: any) => o.rfq_id)) // RFQs the supplier already bid on
  const accepted = myOffers.filter((o: any) => o.status === 'accepted').length
  const pending = myOffers.filter((o: any) => o.status === 'pending').length
  const totalRevenue = myOffers.filter((o: any) => o.status === 'accepted').reduce((s: any, o: any) => s + (o.total_price || 0), 0)

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
      title={locale === 'en' ? 'Supplier Dashboard' : locale === 'ur' ? 'سپلائر ڈیش بورڈ' : 'لوحة المورّد'}
      company={companyName}
      companyMeta={profile?.supplier_tier === 'manufacturer' ? (locale === 'en' ? 'Manufacturer' : 'مصنع') : profile?.supplier_tier === 'commercial' ? (locale === 'en' ? 'Trader' : 'تاجر') : (locale === 'en' ? 'Local' : 'مورد محلي')}
      companyVerified={profile?.verification_status === 'verified'}
      userId={user?.id}
      nav={nav}
      onSignOut={handleSignOut}
      dir={dir}
    >
      <div className="max-w-6xl mx-auto">
        {/* Onboarding / liquidity prompts */}
        {pricesCount === 0 && (
          <Link href="/supplier/prices" className="block mb-4 bg-gradient-to-l from-[#F5831F]/10 to-amber-50 border border-amber-200 rounded-2xl p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📈</span>
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color: '#1B2D5B' }}>انشر أسعارك في بورصة الأسعار</div>
                <div className="text-xs text-gray-500">المقاولون يبحثون عن أحدث الأسعار — كن أول من يظهر. اضغط لإضافة أسعارك ←</div>
              </div>
            </div>
          </Link>
        )}
        {profile && !profile.vat_number && (
          <Link href="/settings" className="block mb-4 bg-[#F5831F]/5 border border-blue-200 rounded-2xl p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧾</span>
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color: '#1B2D5B' }}>أضف رقمك الضريبي</div>
                <div className="text-xs text-gray-500">يلزم لإصدار فواتير ضريبية (ZATCA) لصفقاتك. اضغط للإضافة ←</div>
              </div>
            </div>
          </Link>
        )}
        {profile && !isSubscribed(profile) && (isLaunchFree(launchUntil) ? (
          <Link href="/supplier/subscription" className="block mb-4 rounded-2xl p-4 hover:shadow-md transition-all" style={{ background: 'linear-gradient(120deg,#0F6E56,#1B2D5B)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <div className="font-bold text-sm text-white">{locale === 'en' ? 'Free launch period — all features open' : 'فترة إطلاق مجانية — كل الميزات مفتوحة'}</div>
                <div className="text-xs text-emerald-50">{locale === 'en' ? 'Enjoy everything free now. See the future plans →' : 'استمتع بكل شي مجاناً الآن. اطّلع على باقات المستقبل ←'}</div>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/supplier/subscription" className="block mb-4 rounded-2xl p-4 hover:shadow-md transition-all" style={{ background: 'linear-gradient(120deg,#1B2D5B,#2a4a8a)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <div className="font-bold text-sm text-white">{locale === 'en' ? 'Upgrade to Professional' : 'رقِّ لباقة احترافية'}</div>
                <div className="text-xs text-blue-100">{locale === 'en' ? 'Unlimited offers + priority visibility + full price index. Tap for plans →' : 'عروض غير محدودة + أولوية ظهور + وصول كامل لمؤشّر الأسعار ←'}</div>
              </div>
            </div>
          </Link>
        ))}
        {profile?.verification_status === 'rejected' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">❌</span>
              <div>
                <div className="font-bold text-red-700 mb-1">
                  {locale === 'en' ? 'Account Rejected' : locale === 'ur' ? 'اکاؤنٹ مسترد' : 'تم رفض حسابك'}
                </div>
                <div className="text-sm text-red-600">
                  {locale === 'en' ? 'Your account has been rejected. Please review the reason and reupload your documents.'
                  : locale === 'ur' ? 'آپ کا اکاؤنٹ مسترد ہو گیا۔ وجہ دیکھیں اور دستاویزات دوبارہ اپلوڈ کریں۔'
                  : 'تم رفض حسابك. يرجى مراجعة السبب وإعادة رفع المستندات.'}
                </div>
                {profile?.rejection_reason && (
                  <div className="mt-2 bg-red-100 rounded-lg px-3 py-2 text-sm text-red-800 font-medium">
                    📋 {locale === 'en' ? 'Reason: ' : locale === 'ur' ? 'وجہ: ' : 'السبب: '}{profile.rejection_reason}
                  </div>
                )}
              </div>
            </div>
            <Link href="/settings" className="inline-block text-xs px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-all">
              {locale === 'en' ? '📤 Reupload Documents' : locale === 'ur' ? '📤 دستاویزات دوبارہ اپلوڈ کریں' : '📤 إعادة رفع المستندات'}
            </Link>
          </div>
        )}

        {profile?.verification_status === 'pending' && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3 animate-fade-in">
            <span className="text-2xl">⏳</span>
            <div>
              <div className="font-bold text-amber-700 mb-1">
                {locale === 'en' ? 'Account Under Review' : locale === 'ur' ? 'اکاؤنٹ زیر جائزہ' : 'حسابك قيد المراجعة'}
              </div>
              <div className="text-sm text-amber-600">
                {locale === 'en' ? 'Your account is being reviewed. This usually takes up to 24 hours.'
                : locale === 'ur' ? 'آپ کے اکاؤنٹ کا جائزہ لیا جا رہا ہے۔'
                : 'يتم مراجعة بياناتك ورخصة عملك. عادةً تستغرق 24 ساعة.'}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{t.welcome}، {companyName || profile?.full_name || (locale === 'en' ? 'Supplier' : 'مورد')} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">{t.subtitle}</p>
        </div>

        {/* تقييم المورد (Supplier Score) + اكتمال الملف */}
        {(() => {
          const checks = [
            { ok: profile?.verification_status === 'verified', w: 35, label: locale === 'en' ? 'Verify your CR' : 'فعّل التحقق', href: '/settings' },
            { ok: hasSpecialties, w: 25, label: locale === 'en' ? 'Add specialties' : 'أضف تخصصاتك', href: '/supplier/specialties' },
            { ok: !!(profile?.latitude || profile?.national_short_address), w: 20, label: locale === 'en' ? 'Add map location' : 'حدّد موقعك', href: '/location' },
            { ok: (profile?.rating_avg || 0) > 0, w: 20, label: locale === 'en' ? 'Get your first rating' : 'احصل على أول تقييم', href: '/supplier/specialties' },
          ]
          const score = checks.reduce((s: any, c: any) => s + (c.ok ? c.w : 0), 0)
          const missing = checks.filter((c: any) => !c.ok)
          const col = score >= 70 ? '#0F6E56' : score >= 40 ? '#F5831F' : '#dc2626'
          return (
            <div className="mb-6 grid sm:grid-cols-3 gap-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef1f6" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={col} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(score * 0.974).toFixed(1)} 97.4`} />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-lg font-extrabold" style={{ color: '#1B2D5B' }}>{score}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'Supplier Score' : 'تقييم موردك'}</div>
                  <div className="text-[11px] text-gray-400">{score}/100 — {score >= 70 ? (locale === 'en' ? 'Excellent' : 'ممتاز') : score >= 40 ? (locale === 'en' ? 'Good' : 'جيد') : (locale === 'en' ? 'Improve it' : 'حسّنه')}</div>
                </div>
              </div>
              {missing.length > 0 && (
                <div className="sm:col-span-2 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold mb-2" style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'Boost your score:' : 'ارفع تقييمك:'}</div>
                  <div className="flex flex-wrap gap-2">
                    {missing.map((c: any) => <Link key={c.label} href={c.href} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-dashed transition-all hover:bg-orange-50" style={{ borderColor: '#F5831F', color: '#d96f15' }}>+ {c.label} <span className="opacity-60">(+{c.w})</span></Link>)}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* تنبيه: حدد تخصصاتك الدقيقة */}
        {!hasSpecialties && !hasSectors && profile?.verification_status !== 'rejected' && (
          <Link href="/supplier/specialties"
            className="block mb-6 bg-gradient-to-l from-[#F5831F]/10 to-[#1B2D5B]/5 border-2 border-[#F5831F]/30 rounded-2xl p-5 hover:shadow-md transition-all animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎯</div>
              <div className="flex-1">
                <div className="font-bold" style={{ color: '#1B2D5B' }}>
                  {locale === 'en' ? 'Set your exact specialties for precise matching!'
                  : locale === 'ur' ? 'درست مماثلت کے لیے اپنی مہارتیں مقرر کریں!'
                  : 'حدد تخصصاتك الدقيقة لتصلك الطلبات المطابقة تماماً!'}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {locale === 'en' ? 'e.g. only "Bricks" or only "Marble" — get only relevant requests'
                  : locale === 'ur' ? 'مثلاً صرف "اینٹ" یا صرف "سنگ مرمر"'
                  : 'مثلاً: محل طوب فقط، أو محل رخام فقط — تصلك الطلبات المطابقة لتخصصك'}
                </div>
              </div>
              <div className="text-sm font-semibold whitespace-nowrap" style={{ color: '#F5831F' }}>
                {locale === 'en' ? 'Setup →' : 'إعداد ←'}
              </div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: t.openRfqs, value: openRfqs.length, icon: 'orders', tone: 'brand', go: 'rfqs' },
            { label: t.pendingOffers, value: pending, icon: 'waiting', tone: 'warning', go: 'offers' },
            { label: t.acceptedOffers, value: accepted, icon: 'completed', tone: 'success', go: 'offers' },
            { label: t.revenue, value: totalRevenue.toLocaleString('en-US'), icon: 'pricing', tone: 'info', go: 'offers' },
          ].map(({ label, value, icon, tone, go }) => (
            <button key={label} type="button" onClick={() => { setTab(go); if (go === 'rfqs') setRfqFilter('all'); document.getElementById('sup-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className={`text-start bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${tab === go ? 'border-[#F5831F] ring-1 ring-[#F5831F]/30' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                <AppIcon name={icon} tone={tone} variant="tone" size={44} />
                <div className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6" id="sup-list" style={{ scrollMarginTop: '70px' }}>
          {[{ key: 'rfqs', label: `${t.tabRfqs} (${openRfqs.length})` }, { key: 'offers', label: `${t.tabOffers} (${myOffers.length})` }].map((tab_: any) => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === tab_.key ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              style={tab === tab_.key ? { background: '#1B2D5B' } : {}}>
              {tab_.label}
            </button>
          ))}
        </div>

        {tab === 'rfqs' && (() => {
          const expiringList = openRfqs.filter((r: any) => { const u = deadlineUrgency(r.expires_at); return u === 'soon' || u === 'critical' })
          const displayedRfqs = rfqFilter === 'expiring' ? expiringList : openRfqs
          return (
          <div className="stagger">
            {/* فلاتر الطلبات — منها «تنتهي قريباً» (قابلة للضغط) */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'all', label: locale === 'en' ? `All (${openRfqs.length})` : `الكل (${openRfqs.length})`, icon: '📋' },
                { key: 'expiring', label: locale === 'en' ? `Ending soon (${expiringList.length})` : `تنتهي قريباً (${expiringList.length})`, icon: '⏰' },
              ].map((f: any) => (
                <button key={f.key} onClick={() => setRfqFilter(f.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${rfqFilter === f.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={rfqFilter === f.key ? { background: f.key === 'expiring' ? '#d97706' : '#1B2D5B' } : {}}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
            {displayedRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float">{rfqFilter === 'expiring' ? '⏰' : '📭'}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>{rfqFilter === 'expiring' ? (locale === 'en' ? 'Nothing ending soon' : 'لا يوجد طلبات تنتهي قريباً') : t.noRfqs}</h3>
                <p className="text-sm text-gray-500">{rfqFilter === 'expiring' ? (locale === 'en' ? 'All open requests still have time.' : 'كل الطلبات المفتوحة لسه عندها وقت.') : t.noRfqsSub}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedRfqs.map((rfq: any) => (
                  <Link key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`}
                    className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F5831F]/30 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <AppIcon name="orders" tone="brand" variant="tone" size={44} />
                        <div>
                          <div className="font-bold" style={{ color: '#1B2D5B' }}>{rfqDisplayName(rfq, locale, rfq._myItemCount)}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {rfq.created_at && (Date.now() - new Date(rfq.created_at).getTime() < 12 * 3600 * 1000) && (
                              <span className="badge text-[10px] font-bold" style={{ background: '#0F6E5615', color: '#0F6E56' }}>🟢 {locale === 'en' ? 'New' : 'جديد'}</span>
                            )}
                            <span className="badge badge-blue text-[10px]">{sectors[rfq.sector] || rfq.sector}</span>
                            {rfq.sub_category && (
                              <span className="badge text-[10px] bg-[#F5831F]/10 text-[#F5831F] font-semibold">
                                🎯 {getSubCategoryLabel(rfq.sector, rfq.sub_category, locale)}
                              </span>
                            )}
                            {/* هوية المقاول مخفية في القائمة — تظهر فقط بعد قبول العرض (خصوصية) */}
                            {rfq.contractor?.company_name_ar && (
                              <span className="text-[10px] text-gray-400">
                                🏢 {locale === 'en' && rfq.contractor.company_name_en ? rfq.contractor.company_name_en : rfq.contractor.company_name_ar}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {offeredRfqIds.has(rfq.id)
                        ? <div className="text-white text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap" style={{ background: '#0F6E56' }}>{t.offerSubmitted}</div>
                        : <div className="text-white text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap" style={{ background: '#F5831F' }}>{t.submitOffer}</div>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium flex-wrap">
                      <span>📦 {rfq.quantity} {getUnitLabel(rfq.unit, locale)}</span>
                      <span>📍 {rfq.region}</span>
                      {rfq.created_at && <span>🗓 {formatDateTime(rfq.created_at)}</span>}
                      {rfq.specification && <span className="truncate max-w-[180px]">⚙️ {rfq.specification}</span>}
                      <span>💬 {rfq.offer_count || 0} {t.offer}</span>
                      {rfq.expires_at && (() => {
                        const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                        return (
                          <span className="px-2 py-0.5 rounded-full font-bold ml-auto" style={{ background: st.bg, color: st.fg }}>
                            {u === 'critical' ? '🔴' : u === 'soon' ? '🟠' : '⏰'} {formatTimeLeft(rfq.expires_at, locale)}
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
                <div className="text-5xl mb-4 animate-float">📤</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>{t.noOffers}</h3>
                <p className="text-sm text-gray-500">{t.noOffersSub}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOffers.map((offer: any) => (
                  <Link key={offer.id} href={`/supplier/dashboard/rfq/${offer.rfq_id}`} className={`block bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md hover:border-[#F5831F]/40 ${
                    offer.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/50' :
                    offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          offer.status === 'accepted' ? 'bg-emerald-100' : offer.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                        }`}>{offer.status === 'accepted' ? '✅' : offer.status === 'rejected' ? '❌' : '⏳'}</div>
                        <div>
                          <span className="font-bold" style={{ color: '#1B2D5B' }}>{offer.rfq?.product_name || '—'}</span>
                          {offer.rfq?.sector && (
                            <span className="badge badge-blue text-[10px] mx-2">{sectors[offer.rfq.sector] || offer.rfq.sector}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold" style={{ color: '#1B2D5B' }}>{offer.total_price?.toLocaleString('en-US')} <span className="text-xs text-gray-400">{t.sar}</span></div>
                        <span className={`badge text-[10px] ${
                          offer.status === 'accepted' ? 'badge-green' : offer.status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>{offerStatusLabel(offer.status)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      {offer.delivery_days && <span>📦 {offer.delivery_days} {t.day}</span>}
                      {offer.rfq?.region && <span>📍 {offer.rfq.region}</span>}
                    </div>
                    <div className="mt-2.5 text-[11px] font-bold flex items-center gap-1" style={{ color: '#F5831F' }}>
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
