// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { useTranslation } from '@/i18n'

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
  ar: { civil: 'مدني', architectural: 'معماري', electrical: 'كهرباء', mechanical: 'ميكانيك' },
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل' },
}

export default function ContractorDashboard() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const sectors = sectorLabels[locale] || sectorLabels.ar

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [rfqs, setRfqs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

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
      setLoading(false)
    }
    init()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
          {locale === 'en' ? 'Loading...' : locale === 'ur' ? 'لوڈ ہو رہا ہے...' : 'جارٍ التحميل...'}
        </div>
      </div>
    </div>
  )

  const active = rfqs.filter(r => r.status === 'open')
  const closed = rfqs.filter(r => r.status === 'closed')
  const totalOffers = rfqs.reduce((s, r) => s + (r.offer_count || 0), 0)

  const statusLabel = (status) => {
    if (status === 'open') return t.open
    if (status === 'closed') return t.closed
    if (status === 'cancelled') return t.cancelled
    return t.expired
  }

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />

      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            {profile?.verification_status !== 'rejected' && (
              <>
                <a href="/contractor/project/new"
                  className="text-xs px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-1"
                  style={{ background: '#1B2D5B' }}>
                  📋 {locale === 'en' ? 'Project RFQ' : locale === 'ur' ? 'پراجیکٹ' : 'مشروع BOQ'}
                </a>
                <a href="/contractor/rfq/new" className="btn-orange text-xs px-4 py-2">{t.newRfq}</a>
              </>
            )}
            <a href="/market" className="text-xs text-gray-500 hover:text-[#1B2D5B] px-3 py-2 rounded-lg hover:bg-gray-50 transition-all">📊 {locale === 'en' ? 'Prices' : locale === 'ur' ? 'قیمتیں' : 'الأسعار'}</a>
            <a href="/location" className="text-xs text-gray-500 hover:text-[#1B2D5B] px-3 py-2 rounded-lg hover:bg-gray-50 transition-all">📍 {locale === 'en' ? 'Location' : locale === 'ur' ? 'مقام' : 'الموقع'}</a>
            <a href="/settings" className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-all">⚙️</a>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-all">{t.logout}</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
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

        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>
            {t.welcome}، {profile?.company_name_ar || profile?.company_name_en} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{t.subtitle}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: t.activeRfqs, value: active.length, icon: '📋', bg: '#1B2D5B' },
            { label: t.totalOffers, value: totalOffers, icon: '💬', bg: '#F5831F' },
            { label: t.completed, value: closed.length, icon: '✅', bg: '#0F6E56' },
            { label: t.total, value: rfqs.length, icon: '📊', bg: '#7c3aed' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg text-white" style={{ background: bg }}>{icon}</div>
                <div className="text-3xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </div>
          ))}
        </div>

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
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: '#1B2D5B' }}>{t.rfqList}</h2>
              <span className="text-xs text-gray-400">{rfqs.length} {t.requests}</span>
            </div>
            <div className="space-y-3 stagger">
              {rfqs.map(rfq => (
                <a key={rfq.id} href={`/contractor/rfq/${rfq.id}`}
                  className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F5831F]/30 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                        rfq.status === 'open' ? 'bg-[#1B2D5B]/10' : rfq.status === 'closed' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                        {rfq.status === 'open' ? '📋' : rfq.status === 'closed' ? '✅' : '⏰'}
                      </div>
                      <div>
                        <div className="font-bold" style={{ color: '#1B2D5B' }}>{rfq.product_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-blue text-[10px]">{sectors[rfq.sector] || rfq.sector}</span>
                          <span className={`badge text-[10px] ${
                            rfq.status === 'open' ? 'badge-green' : rfq.status === 'closed' ? 'badge-gray' : 'badge-red'
                          }`}>{statusLabel(rfq.status)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center rounded-xl px-4 py-2 text-white" style={{ background: '#1B2D5B' }}>
                      <div className="text-xl font-bold">{rfq.offer_count || 0}</div>
                      <div className="text-[10px] text-blue-200">{t.offers}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                    <span>📦 {rfq.quantity} {rfq.unit}</span>
                    <span>📍 {rfq.region}</span>
                    {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                    <span className="mr-auto" style={{ color: '#F5831F' }}>{t.viewDetails}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
