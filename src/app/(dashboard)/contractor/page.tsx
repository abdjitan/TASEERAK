// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import NotificationBell from '@/components/shared/NotificationBell'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { AppIcon } from '@/components/AppIcon'
import { rfqDisplayName } from '@/lib/rfqName'
import { formatTimeLeft, deadlineUrgency, urgencyStyle, isExpired, formatDateTime } from '@/lib/deadline'

const txt = {
  ar: {
    welcome: 'أهلاً',
    subtitle: 'إليك ملخص طلباتك وعروضك',
    newRfq: '+ طلب تسعير',
    logout: 'خروج',
    activeRfqs: 'طلبات نشطة',
    totalOffers: 'إجمالي العروض',
    completed: 'صفقات مكتملة',
    total: 'إجمالي الطلبات',
    rfqList: 'طلبات التسعير',
    requests: 'طلب',
    noRfqs: 'لا يوجد طلبات بعد',
    noRfqsSub: 'أرسل أول طلب تسعير وابدأ تلقي عروض من مئات الموردين',
    newRfqBtn: '+ طلب تسعير جديد',
    viewDetails: 'عرض التفاصيل ←',
    open: '● مفتوح', closed: '● مغلق', expired: '● منتهي', cancelled: '● ملغي',
    offers: 'عرض',
    qty: 'الكمية',
  },
  en: {
    welcome: 'Hello',
    subtitle: 'Here is a summary of your requests and offers',
    newRfq: '+ New RFQ',
    logout: 'Logout',
    activeRfqs: 'Active RFQs',
    totalOffers: 'Total Offers',
    completed: 'Completed Deals',
    total: 'Total Requests',
    rfqList: 'RFQ Requests',
    requests: 'requests',
    noRfqs: 'No requests yet',
    noRfqsSub: 'Send your first RFQ and start receiving offers from hundreds of suppliers',
    newRfqBtn: '+ New RFQ Request',
    viewDetails: 'View Details →',
    open: '● Open', closed: '● Closed', expired: '● Expired', cancelled: '● Cancelled',
    offers: 'offer',
    qty: 'Qty',
  },
  ur: {
    welcome: 'خوش آمدید',
    subtitle: 'آپ کی درخواستوں اور پیشکشوں کا خلاصہ',
    newRfq: '+ نئی درخواست',
    logout: 'لاگ آؤٹ',
    activeRfqs: 'فعال درخواستیں',
    totalOffers: 'کل پیشکشیں',
    completed: 'مکمل سودے',
    total: 'کل درخواستیں',
    rfqList: 'قیمت کی درخواستیں',
    requests: 'درخواست',
    noRfqs: 'ابھی تک کوئی درخواست نہیں',
    noRfqsSub: 'پہلی قیمت کی درخواست بھیجیں اور سینکڑوں سپلائرز سے پیشکشیں وصول کریں',
    newRfqBtn: '+ نئی درخواست',
    viewDetails: 'تفصیلات دیکھیں →',
    open: '● کھلا', closed: '● بند', expired: '● ختم', cancelled: '● منسوخ',
    offers: 'پیشکش',
    qty: 'مقدار',
  },
}

const sectorLabels = {
  ar: { civil: 'مدني', architectural: 'معماري', electrical: 'كهرباء', mechanical: 'ميكانيك', equipment: 'آليات ومعدات', supply_store: 'محل توريد' },
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}

export default function ContractorDashboard() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const sectors = sectorLabels[locale] || sectorLabels.ar

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [rfqs, setRfqs] = useState([])
  const [projects, setProjects] = useState([])
  const [activity, setActivity] = useState([])
  const [marketTop, setMarketTop] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | has_offers | pending | closed
  const [sectorFilter, setSectorFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest') // newest | expiry

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)
      const { data: r } = await supabase.from('rfqs').select('*').eq('contractor_id', session.user.id).order('created_at', { ascending: false })
      setRfqs(r || [])
      // جلب المشاريع
      try {
        const { data: proj } = await supabase.from('project_rfqs').select('*')
          .eq('contractor_id', session.user.id).order('created_at', { ascending: false }).limit(5)
        setProjects(proj || [])
      } catch { setProjects([]) }
      // آخر النشاطات (من الإشعارات)
      try {
        const { data: notifs } = await supabase.from('notifications').select('*')
          .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(6)
        setActivity(notifs || [])
      } catch { setActivity([]) }
      // نبض السوق (متوسطات الأسعار)
      try {
        const { data: mp } = await supabase.rpc('get_market_prices')
        setMarketTop((mp || []).sort((a, b) => Number(b.offer_count) - Number(a.offer_count)).slice(0, 3))
      } catch { setMarketTop([]) }
      setLoading(false)
    }
    init()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <PageLoader />

  const active = rfqs.filter(r => r.status === 'open')
  const closed = rfqs.filter(r => r.status === 'closed')
  const totalOffers = rfqs.reduce((s, r) => s + (r.offer_count || 0), 0)

  // أرقام حيّة + اكتمال الحساب
  const now = Date.now()
  const rfqsThisWeek = rfqs.filter(r => r.created_at && (now - new Date(r.created_at).getTime()) < 7 * 864e5).length
  const awaitingReply = rfqs.filter(r => r.status === 'open' && (r.offer_count || 0) > 0).length
  const completion = [
    { ok: !!(profile?.region && profile?.city), label: locale === 'en' ? 'Location' : 'الموقع', href: '/settings' },
    { ok: !!profile?.phone, label: locale === 'en' ? 'Phone' : 'رقم الجوال', href: '/settings' },
    { ok: !!(profile?.latitude || profile?.national_short_address), label: locale === 'en' ? 'Map pin' : 'الموقع على الخريطة', href: '/location' },
    { ok: rfqs.length > 0, label: locale === 'en' ? 'First RFQ' : 'أول طلب تسعير', href: '/contractor/rfq/new' },
  ]
  const compDone = completion.filter(c => c.ok).length
  const compPct = Math.round((compDone / completion.length) * 100)

  function timeAgo(d) {
    if (!d) return ''
    const s = Math.floor((now - new Date(d).getTime()) / 1000)
    if (s < 60) return locale === 'en' ? 'just now' : 'الآن'
    const m = Math.floor(s / 60); if (m < 60) return locale === 'en' ? `${m}m ago` : `قبل ${m} د`
    const h = Math.floor(m / 60); if (h < 24) return locale === 'en' ? `${h}h ago` : `قبل ${h} س`
    const dd = Math.floor(h / 24); return locale === 'en' ? `${dd}d ago` : `قبل ${dd} يوم`
  }
  function actMeta(type) {
    switch (type) {
      case 'offer': case 'new_offer': return { name: 'offers', tone: 'warning' }
      case 'offer_accepted': case 'accepted': return { name: 'completed', tone: 'success' }
      case 'new_message': return { name: 'quoted', tone: 'info' }
      case 'new_rfq': return { name: 'orders', tone: 'brand' }
      case 'price_reduction': case 'price_reduced': return { name: 'pricing', tone: 'warning' }
      default: return { name: 'active', tone: 'neutral' }
    }
  }
  const gameBadge = rfqs.length >= 10 ? { t: locale === 'en' ? 'Pro Contractor' : 'مقاول محترف', e: '🏆' }
    : rfqs.length >= 3 ? { t: locale === 'en' ? 'Active Contractor' : 'مقاول نشط', e: '⭐' }
    : { t: locale === 'en' ? 'Getting Started' : 'بداية موفقة', e: '🌱' }

  const statusLabel = (status) => {
    if (status === 'open') return t.open
    if (status === 'closed') return t.closed
    if (status === 'cancelled') return t.cancelled
    return t.expired
  }

  const nav = [
    { href: '/contractor', label: locale === 'en' ? 'Dashboard' : locale === 'ur' ? 'ڈیش بورڈ' : 'الرئيسية', icon: '🏠', active: true },
    { href: '/contractor/rfq/new', label: locale === 'en' ? 'New RFQ' : locale === 'ur' ? 'نئی درخواست' : 'طلب تسعير', icon: '📝' },
    { href: '/contractor/project/new', label: locale === 'en' ? 'Project (BOQ)' : locale === 'ur' ? 'پراجیکٹ BOQ' : 'مشروع BOQ', icon: '📋' },
    { href: '/market', label: locale === 'en' ? 'Price Index' : locale === 'ur' ? 'بورس' : 'بورصة الأسعار', icon: '📈' },
    { href: '/location', label: locale === 'en' ? 'Location' : locale === 'ur' ? 'مقام' : 'الموقع', icon: '📍' },
    { href: '/settings', label: locale === 'en' ? 'Settings' : locale === 'ur' ? 'ترتیبات' : 'الإعدادات', icon: '⚙️' },
  ]
  const headerActions = profile?.verification_status !== 'rejected' ? (
    <>
      <a href="/contractor/project/new" className="hidden sm:inline-flex items-center gap-1 text-xs px-3.5 py-2 rounded-pill font-semibold text-white" style={{ background: '#1B2D5B' }}>📋 {locale === 'en' ? 'Project' : 'مشروع'}</a>
      <a href="/contractor/rfq/new" className="btn-orange text-xs px-4 py-2">{t.newRfq}</a>
    </>
  ) : null

  return (
    <AppShell
      title={locale === 'en' ? 'Contractor Dashboard' : locale === 'ur' ? 'ٹھیکیدار ڈیش بورڈ' : 'لوحة المقاول'}
      company={profile?.company_name_ar || profile?.company_name_en}
      userId={user?.id}
      nav={nav}
      actions={headerActions}
      onSignOut={handleSignOut}
      dir={dir}
    >
      <div className="max-w-6xl mx-auto">
        {/* Verification Status Banner */}
        {profile?.verification_status === 'rejected' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">❌</span>
              <div>
                <div className="font-bold text-red-700 mb-1">
                  {locale === 'en' ? 'Account Rejected' : locale === 'ur' ? 'اکاؤنٹ مسترد' : 'تم رفض حسابك'}
                </div>
                <div className="text-sm text-red-600">
                  {locale === 'en' ? 'Your account has been rejected. Please review the reason below and reupload your documents.'
                  : locale === 'ur' ? 'آپ کا اکاؤنٹ مسترد ہو گیا۔ وجہ دیکھیں اور دستاویزات دوبارہ اپلوڈ کریں۔'
                  : 'تم رفض حسابك. يرجى مراجعة السبب وإعادة رفع المستندات المطلوبة.'}
                </div>
                {profile?.rejection_reason && (
                  <div className="mt-2 bg-red-100 rounded-lg px-3 py-2 text-sm text-red-800 font-medium">
                    📋 {locale === 'en' ? 'Reason: ' : locale === 'ur' ? 'وجہ: ' : 'السبب: '}{profile.rejection_reason}
                  </div>
                )}
              </div>
            </div>
            <a href="/settings" className="inline-block text-xs px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-all">
              {locale === 'en' ? '📤 Reupload Documents' : locale === 'ur' ? '📤 دستاویزات دوبارہ اپلوڈ کریں' : '📤 إعادة رفع المستندات'}
            </a>
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
                : locale === 'ur' ? 'آپ کے اکاؤنٹ کا جائزہ لیا جا رہا ہے۔ اس میں عام طور پر 24 گھنٹے لگتے ہیں۔'
                : 'يتم مراجعة بياناتك ورخصة عملك. عادةً تستغرق 24 ساعة.'}
              </div>
            </div>
          </div>
        )}

        <div className="mb-5 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>
            {t.welcome}، {profile?.company_name_ar || profile?.company_name_en || profile?.full_name || (locale === 'en' ? 'Contractor' : 'مقاول')} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{t.subtitle}</p>
        </div>

        {/* شريط الإجراءات السريعة */}
        <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-in">
          {[
            { href: '/contractor/rfq/new', icon: '📝', label: t.newRfqBtn, primary: true },
            { href: '/contractor/project/new', icon: '📋', label: locale === 'en' ? 'Upload BOQ' : 'رفع BOQ' },
            { href: '/market', icon: '📈', label: locale === 'en' ? 'Price Index' : 'بورصة الأسعار' },
          ].map(a => (
            <a key={a.href} href={a.href}
              className={`rounded-2xl p-4 text-center font-bold transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md ${a.primary ? 'text-white' : 'bg-white border border-gray-100 text-[#1B2D5B]'}`}
              style={a.primary ? { background: 'linear-gradient(135deg,#F5831F,#d96f15)' } : {}}>
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="text-xs sm:text-sm">{a.label}</div>
            </a>
          ))}
        </div>

        {/* نبض السوق — متوسطات الأسعار الحالية */}
        {marketTop.length > 0 && (
          <div className="mb-5 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#1B2D5B' }}>
                <AppIcon name="pricing" tone="warning" variant="line" size={20} /> {locale === 'en' ? 'Market pulse' : 'نبض السوق'}
              </h2>
              <a href="/market" className="text-xs font-semibold" style={{ color: '#F5831F' }}>{locale === 'en' ? 'Full index →' : 'البورصة كاملة ←'}</a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {marketTop.map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs font-bold truncate" style={{ color: '#1B2D5B' }}>{p.product_name}</div>
                  <div className="text-base font-extrabold mt-1" style={{ color: '#0F6E56' }}>
                    {Math.round(Number(p.avg_price)).toLocaleString('en-US')} <span className="text-[10px] text-gray-400 font-normal">ر.س/{p.unit || ''}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {Math.round(Number(p.min_price)).toLocaleString('en-US')}–{Math.round(Number(p.max_price)).toLocaleString('en-US')} · {p.offer_count} {locale === 'en' ? 'offers' : 'عرض'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* مركز الإجراءات — طلبات وصلها عروض وتحتاج ردّك */}
        {awaitingReply > 0 && (
          <button type="button" onClick={() => { setFilter('has_offers'); document.getElementById('rfq-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            className="w-full mb-5 rounded-2xl p-4 flex items-center gap-3 text-start animate-fade-in transition-all hover:shadow-md border"
            style={{ background: 'linear-gradient(135deg,#F5831F12,#1B2D5B08)', borderColor: '#F5831F44' }}>
            <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0 animate-pulse" style={{ background: '#F5831F' }}>🔔</span>
            <span className="flex-1 text-sm font-bold" style={{ color: '#1B2D5B' }}>
              {awaitingReply} {locale === 'en' ? 'request(s) received new offers — compare now' : 'طلبات وصلها عروض جديدة — قارنها الآن'}
            </span>
            <span className="font-bold text-sm" style={{ color: '#F5831F' }}>←</span>
          </button>
        )}

        {/* ويدجت اكتمال الحساب */}
        {compPct < 100 && (
          <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold" style={{ color: '#1B2D5B' }}>
                {locale === 'en' ? `Your account is ${compPct}% complete` : locale === 'ur' ? `آپ کا اکاؤنٹ ${compPct}% مکمل` : `حسابك مكتمل ${compPct}%`}
              </span>
              <span className="text-xs text-gray-400">{compDone}/{completion.length}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${compPct}%`, background: 'linear-gradient(90deg,#F5831F,#0F6E56)' }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {completion.filter(c => !c.ok).map(c => (
                <a key={c.label} href={c.href} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-dashed transition-all hover:bg-orange-50" style={{ borderColor: '#F5831F', color: '#d96f15' }}>+ {c.label}</a>
              ))}
            </div>
          </div>
        )}

        {/* Stats — قابلة للضغط: تفلتر القائمة وتنزّل لها */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: t.activeRfqs, value: active.length, name: 'active', tone: 'brand', f: 'pending', sub: rfqsThisWeek > 0 ? `+${rfqsThisWeek} ${locale === 'en' ? 'this week' : 'هذا الأسبوع'}` : '' },
            { label: t.totalOffers, value: totalOffers, name: 'offers', tone: 'warning', f: 'has_offers', sub: awaitingReply > 0 ? `${awaitingReply} ${locale === 'en' ? 'awaiting you' : 'بانتظار ردك'}` : '' },
            { label: t.completed, value: closed.length, name: 'completed', tone: 'success', f: 'closed', sub: '' },
            { label: t.total, value: rfqs.length, name: 'all', tone: 'info', f: 'all', sub: rfqsThisWeek > 0 ? `+${rfqsThisWeek} ${locale === 'en' ? 'new' : 'جديد'}` : '' },
          ].map(({ label, value, name, tone, f, sub }) => (
            <button key={label} type="button" onClick={() => { setFilter(f); document.getElementById('rfq-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className={`text-start bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${filter === f ? 'border-[#F5831F] ring-1 ring-[#F5831F]/30' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                <AppIcon name={name} tone={tone} variant="solid" size={44} />
                <div className="text-3xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
              {sub && <div className="text-[11px] font-bold mt-0.5" style={{ color: '#0F6E56' }}>↑ {sub}</div>}
            </button>
          ))}
        </div>

        {/* آخر النشاطات + إنجازاتك */}
        {(activity.length > 0 || rfqs.length > 0) && (
          <div className="grid lg:grid-cols-3 gap-4 mb-8 animate-fade-in">
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1B2D5B' }}>
                <AppIcon name="active" tone="brand" variant="line" size={20} /> {locale === 'en' ? 'Recent activity' : 'آخر النشاطات'}
              </h2>
              {activity.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">{locale === 'en' ? 'No activity yet — it will appear here as offers arrive.' : 'لا يوجد نشاط بعد — سيظهر هنا فور وصول العروض.'}</p>
              ) : (
                <div className="space-y-3">
                  {activity.map(a => {
                    const m = actMeta(a.type)
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <AppIcon name={m.name} tone={m.tone} variant="tone" size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: '#1B2D5B' }}>{a.title}</div>
                          {a.body && <div className="text-xs text-gray-500 truncate">{a.body}</div>}
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{timeAgo(a.created_at)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-bold mb-3" style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'Your progress' : 'إنجازاتك'}</h2>
              <div className="rounded-xl p-3 mb-3 text-center" style={{ background: 'linear-gradient(135deg,#F5831F12,#1B2D5B08)' }}>
                <div className="text-3xl">{gameBadge.e}</div>
                <div className="text-xs font-bold mt-1" style={{ color: '#1B2D5B' }}>{gameBadge.t}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-lg font-bold" style={{ color: '#0F6E56' }}>{closed.length}</div>
                  <div className="text-[10px] text-gray-500">{locale === 'en' ? 'Deals done' : 'صفقات مكتملة'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-lg font-bold" style={{ color: '#F5831F' }}>{rfqsThisWeek}</div>
                  <div className="text-[10px] text-gray-500">{locale === 'en' ? 'This week' : 'هذا الأسبوع'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold" style={{ color: '#1B2D5B' }}>
                📋 {locale === 'en' ? 'Project RFQs' : 'مشاريع BOQ'}
              </h2>
              <a href="/contractor/project/new" className="text-xs font-semibold" style={{ color: '#F5831F' }}>
                + {locale === 'en' ? 'New Project' : 'مشروع جديد'}
              </a>
            </div>
            <div className="space-y-2 stagger">
              {projects.map(p => (
                <a key={p.id} href={`/contractor/project/${p.id}`}
                  className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F5831F]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base text-white" style={{ background: '#1B2D5B' }}>📋</div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>{p.title}</div>
                      <div className="text-xs text-gray-400">📍 {p.region} • {new Date(p.created_at).toLocaleDateString('ar-SA')}</div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: '#F5831F' }}>
                    {locale === 'en' ? 'View Results →' : 'النتائج ←'}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* RFQs */}
        {rfqs.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center animate-slide-up">
            <div className="text-6xl mb-5 animate-float">📋</div>
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D5B' }}>{t.noRfqs}</h2>
            <p className="text-gray-500 mb-6 text-sm">{t.noRfqsSub}</p>
            <a href="/contractor/rfq/new" className="inline-block btn-orange px-10 py-4 text-base rounded-2xl">{t.newRfqBtn}</a>
          </div>
        ) : (
          <div className="animate-fade-in" id="rfq-list" style={{ scrollMarginTop: '70px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: '#1B2D5B' }}>{t.rfqList}</h2>
              <span className="text-xs text-gray-400">{rfqs.length} {t.requests}</span>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[
                    { key: 'all', label: locale === 'en' ? 'All' : 'الكل', icon: '📋' },
                    { key: 'has_offers', label: locale === 'en' ? 'Has Offers' : 'وصل تسعير', icon: '💬' },
                    { key: 'pending', label: locale === 'en' ? 'Awaiting' : 'بانتظار العروض', icon: '⏳' },
                    { key: 'closed', label: locale === 'en' ? 'Completed' : 'مكتملة', icon: '✅' },
                  ].map(f => {
                    const count = f.key === 'all' ? rfqs.length
                      : f.key === 'has_offers' ? rfqs.filter(r => r.status === 'open' && (r.offer_count || 0) > 0).length
                      : f.key === 'pending' ? rfqs.filter(r => r.status === 'open' && (r.offer_count || 0) === 0).length
                      : rfqs.filter(r => r.status === 'closed').length
                    return (
                      <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          filter === f.key ? 'text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`} style={filter === f.key ? { background: '#1B2D5B' } : {}}>
                        {f.icon} {f.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === f.key ? 'bg-white/20' : 'bg-gray-200'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}
                    className="input-field text-xs flex-shrink-0 w-auto py-2">
                    <option value="all">{locale === 'en' ? 'All Sectors' : 'كل القطاعات'}</option>
                    {Object.keys(sectors).map(s => <option key={s} value={s}>{sectors[s]}</option>)}
                  </select>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="input-field text-xs flex-shrink-0 w-auto py-2">
                    <option value="newest">{locale === 'en' ? '🆕 Newest' : '🆕 الأحدث'}</option>
                    <option value="expiry">{locale === 'en' ? '⏰ Closest to expiry' : '⏰ الأقرب انتهاءً'}</option>
                  </select>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    className="input-field text-xs flex-1 py-2" placeholder={`🔍 ${locale === 'en' ? 'Search...' : 'ابحث عن طلب...'}`} />
                </div>
              </div>
            </div>

            <div className="space-y-3 stagger">
              {(() => {
                const filtered = rfqs.filter(rfq => {
                  if (filter === 'has_offers' && !(rfq.status === 'open' && (rfq.offer_count || 0) > 0)) return false
                  if (filter === 'pending' && !(rfq.status === 'open' && (rfq.offer_count || 0) === 0)) return false
                  if (filter === 'closed' && rfq.status !== 'closed') return false
                  if (sectorFilter !== 'all' && rfq.sector !== sectorFilter) return false
                  if (search && !`${rfq.title || ''} ${rfq.product_name || ''}`.toLowerCase().includes(search.toLowerCase())) return false
                  return true
                })
                if (sortBy === 'expiry') {
                  filtered.sort((a, b) => {
                    const ax = a.status === 'open' && a.expires_at ? new Date(a.expires_at).getTime() : Infinity
                    const bx = b.status === 'open' && b.expires_at ? new Date(b.expires_at).getTime() : Infinity
                    return ax - bx
                  })
                }
                if (filtered.length === 0) return (
                  <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-gray-400 text-sm">
                    🔍 {locale === 'en' ? 'No matching requests' : 'لا توجد طلبات مطابقة'}
                  </div>
                )
                return filtered.map(rfq => (
                <a key={rfq.id} href={`/contractor/rfq/${rfq.id}`}
                  className={`block bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative ${
                    rfq.status === 'open' && (rfq.offer_count || 0) > 0
                      ? 'border-[#F5831F] ring-2 ring-[#F5831F]/20'
                      : 'border-gray-100 hover:border-[#F5831F]/30'
                  }`}>
                  {/* شارة "جديد" للطلبات اللي وصلها عروض */}
                  {rfq.status === 'open' && (rfq.offer_count || 0) > 0 && (
                    <div className="absolute -top-2 ltr:-right-2 rtl:-left-2 z-10">
                      <span className="inline-flex items-center gap-1 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse"
                        style={{ background: '#F5831F' }}>
                        🔔 {locale === 'en' ? 'New Offers!' : locale === 'ur' ? 'نئی پیشکشیں!' : 'عروض جديدة!'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const m = rfq.status === 'open' && (rfq.offer_count || 0) > 0 ? { name: 'quoted', tone: 'info' }
                          : rfq.status === 'open' ? { name: 'waiting', tone: 'warning' }
                          : rfq.status === 'closed' ? { name: 'completed', tone: 'success' }
                          : { name: 'clock', tone: 'danger' }
                        return <AppIcon name={m.name} tone={m.tone} variant="tone" size={44} />
                      })()}
                      <div>
                        <div className="font-bold" style={{ color: '#1B2D5B' }}>{rfqDisplayName(rfq, locale)}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[260px]">{rfq.product_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-blue text-[10px]">{sectors[rfq.sector] || rfq.sector}</span>
                          <span className={`badge text-[10px] ${
                            rfq.status === 'open' ? 'badge-green' : rfq.status === 'closed' ? 'badge-gray' : 'badge-red'
                          }`}>{statusLabel(rfq.status)}</span>
                          {rfq.status === 'open' && rfq.expires_at && (() => {
                            const u = deadlineUrgency(rfq.expires_at); const st = urgencyStyle(u)
                            return (
                              <span className="badge text-[10px]" style={{ background: st.bg, color: st.fg }}>
                                {isExpired(rfq.expires_at) ? (locale === 'en' ? '⏰ ended' : '⏰ انتهت') : `⏰ ${formatTimeLeft(rfq.expires_at, locale)}`}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    {(rfq.offer_count || 0) > 0 ? (
                      <div className="text-center rounded-xl px-4 py-2 text-white shrink-0" style={{ background: '#F5831F' }}>
                        <div className="text-xl font-bold">{rfq.offer_count}</div>
                        <div className="text-[10px] text-white/85">{t.offers}</div>
                      </div>
                    ) : (
                      <div className="text-center rounded-xl px-3 py-2 bg-gray-100 text-gray-400 shrink-0 min-w-[78px]">
                        <div className="text-base leading-none mb-0.5">⏳</div>
                        <div className="text-[10px] font-semibold leading-tight">{locale === 'en' ? 'Awaiting offers' : 'بانتظار العروض'}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium flex-wrap">
                    <span>📦 {Array.isArray(rfq.items) && rfq.items.length > 1 ? `${rfq.items.length} ${locale === 'en' ? 'items' : 'أصناف'}` : `${rfq.quantity} ${rfq.unit}`}</span>
                    <span>📍 {rfq.region}</span>
                    {rfq.created_at && <span>🗓 {formatDateTime(rfq.created_at)}</span>}
                    {rfq.expires_at && <span>⏰ {formatDateTime(rfq.expires_at)}</span>}
                    {rfq.specification && <span className="truncate max-w-[200px]">⚙️ {rfq.specification}</span>}
                    <span className="mr-auto" style={{ color: '#F5831F' }}>{t.viewDetails}</span>
                  </div>
                  {/* عدّاد وقت بصري ينقص حتى انتهاء المهلة */}
                  {rfq.status === 'open' && rfq.expires_at && rfq.created_at && !isExpired(rfq.expires_at) && (() => {
                    const total = new Date(rfq.expires_at).getTime() - new Date(rfq.created_at).getTime()
                    const remain = new Date(rfq.expires_at).getTime() - Date.now()
                    const pct = total > 0 ? Math.max(2, Math.min(100, (remain / total) * 100)) : 0
                    const barColor = pct < 15 ? '#dc2626' : pct < 40 ? '#F5831F' : '#0F6E56'
                    return (
                      <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    )
                  })()}
                </a>
                ))
              })()}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
