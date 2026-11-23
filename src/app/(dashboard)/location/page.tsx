'use client'

import { useState, useEffect } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import LocationPicker from '@/components/shared/LocationPicker'
import { REGIONS, getRegionLabel } from '@/types'
import Glyph from '@/components/shared/Glyph'
import { friendlyError } from '@/lib/friendlyError'

const txt = {
  ar: {
    title: 'الموقع والعنوان الوطني', sub: 'حدّد موقعك ليحسب الموردون تكلفة التوصيل بدقة', subBuyer: 'أضف عنوان التوصيل ليحسب الموردون تكلفة التوصيل بدقة',
    back: '→ رجوع', save: 'حفظ الموقع والعنوان', saving: 'جارٍ الحفظ...', saved: '✓ تم الحفظ بنجاح',
    nationalAddr: 'العنوان الوطني السعودي', nationalSub: 'حسب نظام العنوان الوطني من البريد السعودي',
    shortAddr: 'الرمز المختصر', shortHint: 'مثال: RUH2343', buildingNo: 'رقم المبنى',
    street: 'اسم الشارع', district: 'الحي', region: 'المنطقة', city: 'المدينة',
    postalCode: 'الرمز البريدي', additionalNo: 'الرقم الإضافي', selectRegion: 'اختر المنطقة',
    locationSection: 'تحديد الموقع على الخريطة', loading: 'جارٍ التحميل...',
    verifyNote: 'يساعد موقعك الدقيق على وصول الطلبات القريبة منك إليك.', verifyNoteBuyer: 'يساعد العنوان الدقيق الموردين على تقدير تكلفة التوصيل ومدته.',
    optional: 'اختياري',
  },
  en: {
    title: 'Location & National Address', sub: 'Set your location so suppliers can price delivery accurately', subBuyer: 'Add your delivery address so suppliers can price delivery accurately',
    back: '← Back', save: 'Save Location & Address', saving: 'Saving...', saved: '✓ Saved successfully',
    nationalAddr: 'Saudi National Address', nationalSub: 'Per Saudi Post National Address system',
    shortAddr: 'Short Address', shortHint: 'e.g. RUH2343', buildingNo: 'Building Number',
    street: 'Street Name', district: 'District', region: 'Region', city: 'City',
    postalCode: 'Postal Code', additionalNo: 'Additional Number', selectRegion: 'Select region',
    locationSection: 'Pin Location on Map', loading: 'Loading...',
    verifyNote: 'An accurate location helps nearby requests reach you.', verifyNoteBuyer: 'An accurate address helps suppliers estimate delivery cost and time.',
    optional: 'optional',
  },
  ur: {
    title: 'مقام اور قومی پتہ', sub: 'اپنا مقام مقرر کریں تاکہ سپلائرز ڈیلیوری کی قیمت درست لگا سکیں', subBuyer: 'ڈیلیوری کا پتہ شامل کریں تاکہ سپلائرز ڈیلیوری کی قیمت درست لگا سکیں',
    back: '→ واپس', save: 'محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', saved: '✓ محفوظ ہو گیا',
    nationalAddr: 'سعودی قومی پتہ', nationalSub: 'سعودی پوسٹ نیشنل ایڈریس سسٹم کے مطابق',
    shortAddr: 'مختصر پتہ', shortHint: 'مثال: RUH2343', buildingNo: 'عمارت نمبر',
    street: 'گلی کا نام', district: 'محلہ', region: 'علاقہ', city: 'شہر',
    postalCode: 'پوسٹل کوڈ', additionalNo: 'اضافی نمبر', selectRegion: 'علاقہ منتخب کریں',
    locationSection: 'نقشے پر مقام', loading: 'لوڈ ہو رہا ہے...',
    verifyNote: 'درست مقام سے قریبی درخواستیں آپ تک پہنچتی ہیں۔', verifyNoteBuyer: 'درست پتہ سپلائرز کو ڈیلیوری کی لاگت اور وقت کا اندازہ لگانے میں مدد دیتا ہے۔',
    optional: 'اختیاری',
  },
}


export default function LocationPage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // a failed load shows an error with retry, never an empty form that would wipe the saved address (UX-118)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showNational, setShowNational] = useState(false)

  const [shortAddr, setShortAddr] = useState('')
  const [buildingNo, setBuildingNo] = useState('')
  const [street, setStreet] = useState('')
  const [district, setDistrict] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [additionalNo, setAdditionalNo] = useState('')
  const [lat, setLat] = useState<any>(null)
  const [lng, setLng] = useState<any>(null)

  async function load() {
    setLoading(true); setLoadFailed(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      const { data: p, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (error || !p) throw error || new Error('no profile')
      setProfile(p)
      setShortAddr(p.national_short_address || '')
      setBuildingNo(p.building_number || '')
      setStreet(p.street_name || '')
      setDistrict(p.district || '')
      setRegion(p.region || '')
      setCity(p.city || '')
      setPostalCode(p.postal_code || '')
      setAdditionalNo(p.additional_number || '')
      setLat(p.latitude || null)
      setLng(p.longitude || null)
      // a seller, or anyone who already saved a national address, sees those fields open
      setShowNational(p.role !== 'contractor' || !!(p.national_short_address || p.building_number || p.street_name || p.postal_code))
    } catch { setLoadFailed(true) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!profile || loadFailed) return
    setSaving(true); setMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      national_short_address: shortAddr || null,
      building_number: buildingNo || null,
      street_name: street || null,
      district: district || null,
      region: region || null,
      city: city || null,
      postal_code: postalCode || null,
      additional_number: additionalNo || null,
      latitude: lat,
      longitude: lng,
    }).eq('id', user.id)
    setSaving(false)
    setMsg(error ? friendlyError(error.message, L('Could not save, please try again.', 'محفوظ نہیں ہو سکا، دوبارہ کوشش کریں۔', 'تعذّر الحفظ، حاول مرة أخرى.'), locale) : T.saved)
    setTimeout(() => setMsg(''), 6000)
  }

  if (loading) return <PageLoader />

  const isBuyer = profile?.role === 'contractor'
  const field = (id: string, label: string, el: React.ReactNode, wide = false) => (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="block text-[13px] font-bold text-gray-600 mb-1.5">{label}</label>
      {el}
    </div>
  )

  const mapCard = (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl text-[#0B2438]"><Glyph e="🗺" /></span>
        <h2 className="font-bold" style={{ color: '#0B2438' }}>{T.locationSection}</h2>
      </div>
      <LocationPicker lat={lat} lng={lng} locale={locale} onChange={(la, ln) => { setLat(la); setLng(ln) }} />
    </div>
  )

  const nationalCard = (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl text-[#0B2438]"><Glyph e="🏛" /></span>
        <h2 className="font-bold" style={{ color: '#0B2438' }}>{T.nationalAddr}{isBuyer ? ` (${T.optional})` : ''}</h2>
      </div>
      <p className="text-[13px] text-gray-600 mb-4">{T.nationalSub}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('loc-short', T.shortAddr, <input id="loc-short" value={shortAddr} onChange={e => setShortAddr(e.target.value.toUpperCase())} className="input-field font-mono" placeholder={T.shortHint} dir="ltr" maxLength={8} />, true)}
        {field('loc-building', T.buildingNo, <input id="loc-building" value={buildingNo} onChange={e => setBuildingNo(e.target.value)} className="input-field" placeholder="1234" dir="ltr" inputMode="numeric" />)}
        {field('loc-additional', T.additionalNo, <input id="loc-additional" value={additionalNo} onChange={e => setAdditionalNo(e.target.value)} className="input-field" placeholder="5678" dir="ltr" inputMode="numeric" />)}
        {field('loc-street', T.street, <input id="loc-street" value={street} onChange={e => setStreet(e.target.value)} className="input-field" />, true)}
        {field('loc-district', T.district, <input id="loc-district" value={district} onChange={e => setDistrict(e.target.value)} className="input-field" />)}
        {field('loc-postal', T.postalCode, <input id="loc-postal" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="input-field" placeholder="12345" dir="ltr" maxLength={5} inputMode="numeric" />)}
        {field('loc-region', T.region, (
          <select id="loc-region" value={region} onChange={e => setRegion(e.target.value)} className="input-field">
            <option value="">{T.selectRegion}</option>
            {REGIONS.map(r => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
          </select>
        ))}
        {field('loc-city', T.city, <input id="loc-city" value={city} onChange={e => setCity(e.target.value)} className="input-field" />)}
      </div>
    </div>
  )

  return (
    <AppShell title={T.title} nav={getNav(profile?.role, locale, '/location')} dir={dir}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{T.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{isBuyer ? T.subBuyer : T.sub}</p>
        </div>

        {loadFailed ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
            <div className="font-bold text-red-800">{L('We could not load your saved address.', 'آپ کا محفوظ پتہ لوڈ نہیں ہو سکا۔', 'تعذّر تحميل عنوانك المحفوظ.')}</div>
            <p className="text-sm text-red-900 mt-1">{L('Nothing was changed. Check your connection and try again.', 'کچھ تبدیل نہیں ہوا۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'لم يتغيّر شيء. تأكّد من اتصالك وحاول مرة أخرى.')}</p>
            <button type="button" onClick={load} className="mt-3 btn-navy text-sm">{L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}</button>
          </div>
        ) : (<>
          <div className="bg-[#F5F7FA] border border-gray-200 rounded-xl p-3 mb-5 text-sm text-gray-700">{isBuyer ? T.verifyNoteBuyer : T.verifyNote}</div>

          {/* a buyer starts with the map pin; the formal national address is optional (UX-118) */}
          {isBuyer ? (<>
            {mapCard}
            {showNational ? nationalCard : (
              <button type="button" onClick={() => setShowNational(true)} aria-expanded={false}
                className="mb-5 w-full min-h-[48px] rounded-xl border border-dashed border-gray-300 bg-white text-sm font-bold text-[#0B2438] hover:border-[#D4A543]">
                {L('Add the national address (optional)', 'قومی پتہ شامل کریں (اختیاری)', 'أضف العنوان الوطني (اختياري)')}
              </button>
            )}
          </>) : (<>
            {nationalCard}
            {mapCard}
          </>)}

          {/* Save */}
          <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-4">
            {/* an error shows in red, never in the success green (UX-140) */}
            {msg && <div role={msg.startsWith('✓') ? 'status' : 'alert'} className={`text-sm rounded-xl p-3 mb-3 text-center border ${msg.startsWith('✓') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg}</div>}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-4 rounded-xl font-bold text-[#071827] text-base disabled:opacity-50 transition-all hover:shadow-lg shadow-lg"
              style={{ background: '#D4A543' }}>
              {saving ? T.saving : T.save}
            </button>
          </div>
        </>)}
      </div>
    </AppShell>
  )
}
