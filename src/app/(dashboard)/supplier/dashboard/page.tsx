// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { useTranslation } from '@/i18n'

const txt = {
  ar: {
    welcome: 'أهلاً', subtitle: 'تصفح طلبات التسعير المتاحة وقدم عروضك',
    logout: 'خروج', openRfqs: 'طلبات مفتوحة', pendingOffers: 'عروض قيد المراجعة',
    acceptedOffers: 'عروض مقبولة', revenue: 'إجمالي الإيرادات',
    tabRfqs: 'طلبات التسعير', tabOffers: 'عروضي',
    noRfqs: 'لا توجد طلبات مفتوحة', noRfqsSub: 'سيتم إخطارك عند وصول طلبات جديدة',
    noOffers: 'لم تقدم أي عروض بعد', noOffersSub: 'تصفح طلبات التسعير وقدم أول عرض',
    submitOffer: 'تقديم عرض →', accepted: '✓ مقبول', rejected: '✕ مرفوض', pending: '⏳ قيد المراجعة',
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
    submitOffer: 'Submit Offer →', accepted: '✓ Accepted', rejected: '✕ Rejected', pending: '⏳ Pending',
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
    submitOffer: 'پیشکش جمع کریں →', accepted: '✓ قبول', rejected: '✕ مسترد', pending: '⏳ زیر التواء',
    day: 'دن', offer: 'پیشکش', loading: 'لوڈ ہو رہا ہے...',
    sar: 'ریال',
  },
}

const sectorLabels = {
  ar: { civil: 'مدني', architectural: 'معماري', electrical: 'كهرباء', mechanical: 'ميكانيك' },
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل' },
}

export default function SupplierDashboard() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const sectors = sectorLabels[locale] || sectorLabels.ar

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [openRfqs, setOpenRfqs] = useState([])
  const [myOffers, setMyOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rfqs')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)
      // فلترة الطلبات حسب تصنيف المورد
      const tier = p?.supplier_tier || 'local'
      const minVal = p?.min_order_value || 0

      let rfqQuery = supabase.from('rfqs')
        .select('*, contractor:profiles(company_name_ar, company_name_en, contractor_grade)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      // الحد الأدنى للقيمة — فقط لو المورد حدد minimum
      if (minVal > 0) {
        rfqQuery = rfqQuery.or(`estimated_value.gte.${minVal},estimated_value.is.null`)
      }

      const { data: rfqs } = await rfqQuery
      setOpenRfqs(rfqs || [])
      const { data: offers } = await supabase.from('offers').select('*, rfq:rfqs(product_name, sector, quantity, unit, region, status)').eq('supplier_id', session.user.id).order('created_at', { ascending: false })
      setMyOffers(offers || [])
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
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>{t.loading}</div>
      </div>
    </div>
  )

  const accepted = myOffers.filter(o => o.status === 'accepted').length
  const pending = myOffers.filter(o => o.status === 'pending').length
  const totalRevenue = myOffers.filter(o => o.status === 'accepted').reduce((s, o) => s + (o.total_price || 0), 0)

  const offerStatusLabel = (status) => {
    if (status === 'accepted') return t.accepted
    if (status === 'rejected') return t.rejected
    return t.pending
  }

  const companyName = locale === 'en' && profile?.company_name_en ? profile.company_name_en : profile?.company_name_ar

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />

      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/market" className="text-xs text-gray-500 hover:text-[#1B2D5B] px-3 py-2 rounded-lg hover:bg-gray-50 transition-all">📊 {locale === 'en' ? 'Prices' : locale === 'ur' ? 'قیمتیں' : 'الأسعار'}</a>
            <a href="/settings" className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-all">⚙️</a>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-all">{t.logout}</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
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
                : locale === 'ur' ? 'آپ کے اکاؤنٹ کا جائزہ لیا جا رہا ہے۔'
                : 'يتم مراجعة بياناتك ورخصة عملك. عادةً تستغرق 24 ساعة.'}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{t.welcome}، {companyName} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: t.openRfqs, value: openRfqs.length, icon: '📋', bg: '#1B2D5B' },
            { label: t.pendingOffers, value: pending, icon: '⏳', bg: '#F5831F' },
            { label: t.acceptedOffers, value: accepted, icon: '✅', bg: '#0F6E56' },
            { label: t.revenue, value: totalRevenue.toLocaleString(), icon: '💰', bg: '#7c3aed' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg text-white" style={{ background: bg }}>{icon}</div>
                <div className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-3 font-medium">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {[{ key: 'rfqs', label: `${t.tabRfqs} (${openRfqs.length})` }, { key: 'offers', label: `${t.tabOffers} (${myOffers.length})` }].map(tab_ => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === tab_.key ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              style={tab === tab_.key ? { background: '#1B2D5B' } : {}}>
              {tab_.label}
            </button>
          ))}
        </div>

        {tab === 'rfqs' && (
          <div className="stagger">
            {openRfqs.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
                <div className="text-5xl mb-4 animate-float">📭</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>{t.noRfqs}</h3>
                <p className="text-sm text-gray-500">{t.noRfqsSub}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openRfqs.map(rfq => (
                  <a key={rfq.id} href={`/supplier/dashboard/rfq/${rfq.id}`}
                    className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F5831F]/30 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: '#1B2D5B20' }}>📦</div>
                        <div>
                          <div className="font-bold" style={{ color: '#1B2D5B' }}>{rfq.product_name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge badge-blue text-[10px]">{sectors[rfq.sector] || rfq.sector}</span>
                            {!rfq.hide_identity && rfq.contractor && (
                              <span className="text-[10px] text-gray-400">
                                🏢 {locale === 'en' && rfq.contractor.company_name_en ? rfq.contractor.company_name_en : rfq.contractor.company_name_ar}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-white text-xs font-semibold px-4 py-2 rounded-xl" style={{ background: '#F5831F' }}>{t.submitOffer}</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      <span>📦 {rfq.quantity} {rfq.unit}</span>
                      <span>📍 {rfq.region}</span>
                      {rfq.specification && <span>⚙️ {rfq.specification}</span>}
                      <span>💬 {rfq.offer_count || 0} {t.offer}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

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
                {myOffers.map(offer => (
                  <div key={offer.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
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
                        <div className="text-lg font-bold" style={{ color: '#1B2D5B' }}>{offer.total_price?.toLocaleString()} <span className="text-xs text-gray-400">{t.sar}</span></div>
                        <span className={`badge text-[10px] ${
                          offer.status === 'accepted' ? 'badge-green' : offer.status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>{offerStatusLabel(offer.status)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      {offer.delivery_days && <span>📦 {offer.delivery_days} {t.day}</span>}
                      {offer.rfq?.region && <span>📍 {offer.rfq.region}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
