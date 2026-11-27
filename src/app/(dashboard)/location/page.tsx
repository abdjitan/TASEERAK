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
import { nearestSaCity } from '@/lib/saCityCoords'
import DistrictField from '@/components/shared/DistrictField'
import CityPicker from '@/components/shared/CityPicker'
import { Check } from 'lucide-react'
import Glyph from '@/components/shared/Glyph'
import { friendlyError } from '@/lib/friendlyError'
import { askConfirm } from '@/lib/askConfirm'

const txt = {
  ar: {
    titleBuyer: 'عنوان التوصيل', title: 'الموقع والعنوان الوطني', sub: 'حدّد موقعك ليحسب الموردون تكلفة التوصيل بدقة', subBuyer: 'أضف عنوان التوصيل ليحسب الموردون تكلفة التوصيل بدقة',
    back: '→ رجوع', save: 'حفظ الموقع والعنوان', saving: 'جارٍ الحفظ...', saved: 'تم الحفظ بنجاح',
    nationalAddr: 'العنوان الوطني السعودي', nationalSub: 'حسب نظام العنوان الوطني من البريد السعودي',
    shortAddr: 'الرمز المختصر', shortHint: 'مثال: RUH2343', buildingNo: 'رقم المبنى',
    street: 'اسم الشارع', district: 'الحي', region: 'المنطقة', city: 'المدينة',
    postalCode: 'الرمز البريدي', additionalNo: 'الرقم الإضافي', selectRegion: 'اختر المنطقة',
    locationSection: 'تحديد الموقع على الخريطة', loading: 'جارٍ التحميل...',
    verifyNote: 'يساعد موقعك الدقيق على وصول الطلبات القريبة منك إليك.', verifyNoteBuyer: 'يساعد العنوان الدقيق الموردين على تقدير تكلفة التوصيل ومدته.',
    optional: 'اختياري',
  },
  en: {
    titleBuyer: 'Delivery address', title: 'Location & National Address', sub: 'Set your location so suppliers can price delivery accurately', subBuyer: 'Add your delivery address so suppliers can price delivery accurately',
    back: '← Back', save: 'Save Location & Address', saving: 'Saving...', saved: 'Saved successfully',
    nationalAddr: 'Saudi National Address', nationalSub: 'Per Saudi Post National Address system',
    shortAddr: 'Short Address', shortHint: 'e.g. RUH2343', buildingNo: 'Building Number',
    street: 'Street Name', district: 'District', region: 'Region', city: 'City',
    postalCode: 'Postal Code', additionalNo: 'Additional Number', selectRegion: 'Select region',
    locationSection: 'Pin Location on Map', loading: 'Loading...',
    verifyNote: 'An accurate location helps nearby requests reach you.', verifyNoteBuyer: 'An accurate address helps suppliers estimate delivery cost and time.',
    optional: 'optional',
  },
  ur: {
    titleBuyer: 'ڈیلیوری کا پتہ', title: 'مقام اور قومی پتہ', sub: 'اپنا مقام مقرر کریں تاکہ سپلائرز ڈیلیوری کی قیمت درست لگا سکیں', subBuyer: 'ڈیلیوری کا پتہ شامل کریں تاکہ سپلائرز ڈیلیوری کی قیمت درست لگا سکیں',
    back: '→ واپس', save: 'محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', saved: 'محفوظ ہو گیا',
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
  const homeHref = profile?.role === 'supplier' ? '/supplier/dashboard' : profile?.role === 'admin' ? '/admin' : '/contractor'
  const [loading, setLoading] = useState(true)
  // a failed load shows an error with retry, never an empty form that would wipe the saved address (UX-118)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)
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
  const [pinNote, setPinNote] = useState('')

  // the map pin also fills the city (and its region), still editable (UX-073)
  function onPin(la: number, ln: number) {
    setLat(la); setLng(ln)
    const n = nearestSaCity(la, ln)
    if (n && n.km < 80) {
      if (n.city !== city) setDistrict('')
      setRegion(n.region); setCity(n.city)
      setPinNote(L('We set the city from your location.', 'ہم نے آپ کے مقام سے شہر منتخب کیا۔', 'حدّدنا المدينة من موقعك.'))
    }
  }

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

  // leaving with unsaved changes asks first (round-8 UX-113): a closed tab, and a link inside the site
  const dirty = !!profile && !loadFailed && (
    (shortAddr || '') !== (profile.national_short_address || '') || (buildingNo || '') !== (profile.building_number || '')
    || (street || '') !== (profile.street_name || '') || (district || '') !== (profile.district || '')
    || (city || '') !== (profile.city || '') || (postalCode || '') !== (profile.postal_code || '')
    || (additionalNo || '') !== (profile.additional_number || '')
    || String(lat ?? '') !== String(profile.latitude ?? '') || String(lng ?? '') !== String(profile.longitude ?? ''))
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    const onClick = async (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
      const href = a.getAttribute('href') || ''
      if (!href.startsWith('/') || href.startsWith('//')) return
      e.preventDefault(); e.stopPropagation()
      const ok = await askConfirm(L('Leave without saving? Your changes will be lost.', 'محفوظ کیے بغیر جائیں؟ آپ کی تبدیلیاں ضائع ہو جائیں گی۔', 'المغادرة دون حفظ؟ ستضيع تعديلاتك.'), { okLabel: L('Leave', 'چھوڑ دیں', 'غادر'), cancelLabel: L('Stay', 'رکیں', 'ابقَ'), dismissValue: null })
      if (ok) { window.removeEventListener('beforeunload', onUnload); window.location.href = href }
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('click', onClick, true)
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('click', onClick, true) }
  }, [dirty]) // eslint-disable-line react-hooks/exhaustive-deps

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
    // saved: the form now matches the profile, so leaving no longer asks
    if (!error) setProfile((p: any) => ({ ...p, national_short_address: shortAddr || null, building_number: buildingNo || null, street_name: street || null, district: district || null, region: region || null, city: city || null, postal_code: postalCode || null, additional_number: additionalNo || null, latitude: lat, longitude: lng }))
    setMsgOk(!error)
    setMsg(error ? friendlyError(error.message, L('Could not save, please try again.', 'محفوظ نہیں ہو سکا، دوبارہ کوشش کریں۔', 'تعذّر الحفظ، حاول مرة أخرى.'), locale) : T.saved)
    const from = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('from') : null
    if (!error && (from === 'home' || from === 'settings')) {
      setTimeout(() => { window.location.href = from === 'settings' ? '/settings' : homeHref }, 1200)
      return
    }
    // the success line stays (with its «back home» link) until the next change; an error clears after a while
    if (error) setTimeout(() => setMsg(''), 6000)
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
      <LocationPicker lat={lat} lng={lng} locale={locale} onChange={onPin} />
      {pinNote && <p role="status" className="mt-2 text-[13px] font-semibold text-[#8F6820]">{pinNote}</p>}
    </div>
  )

  // owner 2026-11-26: one searchable «المدينة» picker (the region comes from the city) + «الحي», always shown
  const placeCard = (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('loc-city', T.city, (
          <CityPicker id="loc-city" city={city} region={region} locale={locale}
            onPick={c => { if (c.ar !== city) setDistrict(''); setRegion(c.region); setCity(c.ar); setPinNote('') }} />
        ))}
        <div>
          <span className="block text-[13px] font-bold text-gray-600 mb-1.5">{T.district}</span>
          <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} className="input-field min-h-[44px]" />
        </div>
      </div>
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
        {field('loc-postal', T.postalCode, <input id="loc-postal" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="input-field" placeholder="12345" dir="ltr" maxLength={5} inputMode="numeric" />)}
      </div>
    </div>
  )

  return (
    <AppShell title={isBuyer ? T.titleBuyer : T.title} nav={getNav(profile?.role, locale, '/location')} dir={dir}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{isBuyer ? T.titleBuyer : T.title}</h1>
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
          {/* who sees what (round-7 UX-076): a company's location is public to buyers, an agent's is not */}
          {!isBuyer && profile?.role === 'supplier' && (
            <div className="bg-white border border-[#0B2438]/15 rounded-xl p-3 mb-5 text-sm text-[#0B2438]" role="note">
              {['individual', 'price_agent', 'broker'].includes(profile?.provider_type)
                ? L('Buyers see only your city; the district and the exact location are shown to no one.', 'خریدار صرف آپ کا شہر دیکھتے ہیں؛ محلہ اور درست مقام کسی کو نہیں دکھایا جاتا۔', 'لا يظهر للمشترين إلا مدينتك، أما الحي والموقع الدقيق فلا يُعرضان لأحد.')
                : L('Your establishment’s location and short address are shown to buyers on the platform.', 'آپ کے ادارے کا مقام اور مختصر پتہ پلیٹ فارم پر خریداروں کو دکھایا جاتا ہے۔', 'يظهر موقع منشأتك وعنوانها المختصر للمشترين على المنصة.')}
            </div>
          )}

          {/* a buyer starts with the map pin; the formal national address is optional (UX-118) */}
          {isBuyer ? (<>
            {mapCard}
            {placeCard}
            {showNational ? nationalCard : (
              <button type="button" onClick={() => setShowNational(true)} aria-expanded={false}
                className="mb-5 w-full min-h-[48px] rounded-xl border border-dashed border-gray-300 bg-white text-sm font-bold text-[#0B2438] hover:border-[#D4A543]">
                {L('Add the national address (optional)', 'قومی پتہ شامل کریں (اختیاری)', 'أضف العنوان الوطني (اختياري)')}
              </button>
            )}
          </>) : (<>
            {placeCard}
            {nationalCard}
            {mapCard}
          </>)}

          {/* Save */}
          <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-4">
            {/* an error shows in red, never in the success green (UX-140) */}
            {msg && <div role={msgOk ? 'status' : 'alert'} className={`text-sm rounded-xl p-3 mb-3 border flex items-center justify-center gap-1.5 ${msgOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{msgOk && <Check className="w-4 h-4" aria-hidden />}{msg}
              {msgOk && <a href={homeHref} className="inline-flex items-center min-h-[44px] px-2 font-bold underline underline-offset-2">{L('Back to the home page', 'ہوم پیج پر واپس', 'العودة إلى الرئيسية')}</a>}</div>}
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-lg w-full">
              {saving ? T.saving : T.save}
            </button>
          </div>
        </>)}
      </div>
    </AppShell>
  )
}
