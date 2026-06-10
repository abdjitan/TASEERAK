// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import LocationPicker from '@/components/shared/LocationPicker'
import { REGIONS } from '@/types'

const txt = {
  ar: {
    title: 'الموقع والعنوان الوطني', sub: 'حدد موقعك لتوثيق حسابك وتسهيل التوصيل',
    back: '← رجوع', save: 'حفظ الموقع والعنوان', saving: 'جارٍ الحفظ...', saved: '✓ تم الحفظ بنجاح',
    nationalAddr: 'العنوان الوطني السعودي', nationalSub: 'حسب نظام العنوان الوطني من البريد السعودي',
    shortAddr: 'الرمز المختصر', shortHint: 'مثال: RUH2343', buildingNo: 'رقم المبنى',
    street: 'اسم الشارع', district: 'الحي', region: 'المنطقة', city: 'المدينة',
    postalCode: 'الرمز البريدي', additionalNo: 'الرقم الإضافي', selectRegion: 'اختر المنطقة',
    locationSection: 'تحديد الموقع على الخريطة', loading: 'جارٍ التحميل...',
    verifyNote: '✅ توثيق الموقع يزيد من ثقة المقاولين بك ويرفع ترتيبك في نتائج البحث',
    optional: 'اختياري',
  },
  en: {
    title: 'Location & National Address', sub: 'Set your location to verify your account and ease delivery',
    back: '← Back', save: 'Save Location & Address', saving: 'Saving...', saved: '✓ Saved successfully',
    nationalAddr: 'Saudi National Address', nationalSub: 'Per Saudi Post National Address system',
    shortAddr: 'Short Address', shortHint: 'e.g. RUH2343', buildingNo: 'Building Number',
    street: 'Street Name', district: 'District', region: 'Region', city: 'City',
    postalCode: 'Postal Code', additionalNo: 'Additional Number', selectRegion: 'Select region',
    locationSection: 'Pin Location on Map', loading: 'Loading...',
    verifyNote: '✅ Verifying your location increases contractors\' trust and boosts your ranking',
    optional: 'optional',
  },
  ur: {
    title: 'مقام اور قومی پتہ', sub: 'اپنے اکاؤنٹ کی تصدیق کے لیے مقام مقرر کریں',
    back: '← واپس', save: 'محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', saved: '✓ محفوظ ہو گیا',
    nationalAddr: 'سعودی قومی پتہ', nationalSub: 'سعودی پوسٹ نیشنل ایڈریس سسٹم کے مطابق',
    shortAddr: 'مختصر پتہ', shortHint: 'مثال: RUH2343', buildingNo: 'عمارت نمبر',
    street: 'گلی کا نام', district: 'ضلع', region: 'علاقہ', city: 'شہر',
    postalCode: 'پوسٹل کوڈ', additionalNo: 'اضافی نمبر', selectRegion: 'علاقہ منتخب کریں',
    locationSection: 'نقشے پر مقام', loading: 'لوڈ ہو رہا ہے...',
    verifyNote: '✅ مقام کی تصدیق ٹھیکیداروں کا اعتماد بڑھاتی ہے',
    optional: 'اختیاری',
  },
}

export default function LocationPage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [shortAddr, setShortAddr] = useState('')
  const [buildingNo, setBuildingNo] = useState('')
  const [street, setStreet] = useState('')
  const [district, setDistrict] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [additionalNo, setAdditionalNo] = useState('')
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)

      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (p) {
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
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
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
    setMsg(error ? `خطأ: ${error.message}` : T.saved)
    setTimeout(() => setMsg(''), 6000)
  }

  const backHref = profile?.role === 'supplier' ? '/supplier/dashboard' : profile?.role === 'admin' ? '/admin' : '/contractor'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>{T.loading}</div>
      </div>
    </div>
  )

  return (
    <AppShell title={T.title} nav={getNav(profile?.role, locale, '/location')} dir={dir}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>{T.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{T.sub}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 text-sm text-emerald-700">{T.verifyNote}</div>

        {/* العنوان الوطني */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏛</span>
            <h2 className="font-bold" style={{ color: '#1B2D5B' }}>{T.nationalAddr}</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">{T.nationalSub}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.shortAddr}</label>
              <input value={shortAddr} onChange={e => setShortAddr(e.target.value.toUpperCase())}
                className="input-field font-mono" placeholder={T.shortHint} dir="ltr" maxLength={8} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.buildingNo}</label>
              <input value={buildingNo} onChange={e => setBuildingNo(e.target.value)}
                className="input-field" placeholder="1234" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.additionalNo}</label>
              <input value={additionalNo} onChange={e => setAdditionalNo(e.target.value)}
                className="input-field" placeholder="5678" dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.street}</label>
              <input value={street} onChange={e => setStreet(e.target.value)}
                className="input-field" placeholder={T.street} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.district}</label>
              <input value={district} onChange={e => setDistrict(e.target.value)}
                className="input-field" placeholder={T.district} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.postalCode}</label>
              <input value={postalCode} onChange={e => setPostalCode(e.target.value)}
                className="input-field" placeholder="12345" dir="ltr" maxLength={5} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.region}</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className="input-field">
                <option value="">{T.selectRegion}</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.city}</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                className="input-field" placeholder={T.city} />
            </div>
          </div>
        </div>

        {/* الموقع على الخريطة */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🗺</span>
            <h2 className="font-bold" style={{ color: '#1B2D5B' }}>{T.locationSection}</h2>
          </div>
          <LocationPicker lat={lat} lng={lng} locale={locale}
            onChange={(la, ln) => { setLat(la); setLng(ln) }} />
        </div>

        {/* Save */}
        <div className="sticky bottom-4">
          {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3 mb-3 text-center">{msg}</div>}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-50 transition-all hover:shadow-lg shadow-lg"
            style={{ background: '#F5831F' }}>
            {saving ? T.saving : T.save}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
