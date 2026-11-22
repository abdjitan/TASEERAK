'use client'

import { useState } from 'react'
import { Check, LocateFixed } from 'lucide-react'
import Glyph from '@/components/shared/Glyph'

interface LocationPickerProps {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
  locale?: string
  /** a home buyer (UX-073): the GPS button first with a one-line why, the map link folded under «خيارات أخرى» */
  simple?: boolean
  /** a line under the GPS button, e.g. «إذا كنت في البيت الآن نملأ المنطقة والمدينة تلقائياً» */
  detectHint?: string
}

const txt = {
  ar: {
    title: 'الموقع الجغرافي', detect: 'استخدم موقعي الحالي', detecting: 'جارٍ تحديد الموقع...',
    orPaste: 'أو الصق رابط الموقع من خرائط Google', pasteHint: 'انسخ رابط الموقع من تطبيق خرائط Google والصقه هنا',
    extract: 'استخدم الرابط', coords: 'الإحداثيات', set: 'تم تحديد الموقع', viewMap: 'عرض على الخريطة', openGoogle: 'فتح في خرائط Google',
    noLocation: 'لم يُحدَّد الموقع بعد', denied: 'لم تسمح بالوصول إلى موقعك. فعّله من إعدادات المتصفح، أو الصق رابط الموقع.',
    unavailable: 'تعذّر تحديد موقعك الآن. حاول مرة أخرى أو الصق رابط الموقع.',
    notSupported: 'هذا المتصفح لا يتيح تحديد الموقع. الصق رابط الموقع بدلاً من ذلك.',
    invalidLink: 'لم نجد إحداثيات في هذا الرابط. افتح الموقع في خرائط Google ثم انسخ الرابط من شريط العنوان.',
    shortLink: 'هذا رابط مختصر. افتحه في المتصفح، ثم انسخ الرابط الكامل من شريط العنوان والصقه هنا.',
    more: 'خيارات أخرى',
  },
  en: {
    title: 'Location', detect: 'Use my current location', detecting: 'Finding your location...',
    orPaste: 'Or paste a Google Maps link', pasteHint: 'Copy the location link from Google Maps and paste it here',
    extract: 'Use the link', coords: 'Coordinates', set: 'Location set', viewMap: 'View on map', openGoogle: 'Open in Google Maps',
    noLocation: 'Location not set yet', denied: 'Location access was not allowed. Enable it in the browser settings, or paste a map link.',
    unavailable: 'We could not find your location right now. Try again or paste a map link.',
    notSupported: 'This browser cannot share your location. Paste a map link instead.',
    invalidLink: 'No coordinates found in this link. Open the place in Google Maps and copy the link from the address bar.',
    shortLink: 'This is a short link. Open it in the browser, then copy the full link from the address bar and paste it here.',
    more: 'More options',
  },
  ur: {
    title: 'مقام', detect: 'میرا موجودہ مقام استعمال کریں', detecting: 'مقام تلاش ہو رہا ہے...',
    orPaste: 'یا Google Maps کا لنک پیسٹ کریں', pasteHint: 'Google Maps سے مقام کا لنک کاپی کرکے یہاں پیسٹ کریں',
    extract: 'لنک استعمال کریں', coords: 'کوآرڈینیٹس', set: 'مقام مقرر ہو گیا', viewMap: 'نقشے پر دیکھیں', openGoogle: 'Google Maps میں کھولیں',
    noLocation: 'مقام ابھی مقرر نہیں', denied: 'مقام تک رسائی کی اجازت نہیں دی گئی۔ براؤزر کی ترتیبات میں فعال کریں یا لنک پیسٹ کریں۔',
    unavailable: 'ابھی آپ کا مقام معلوم نہیں ہو سکا۔ دوبارہ کوشش کریں یا لنک پیسٹ کریں۔',
    notSupported: 'یہ براؤزر مقام نہیں بتا سکتا۔ لنک پیسٹ کریں۔',
    invalidLink: 'اس لنک میں مقام نہیں ملا۔ Google Maps میں جگہ کھول کر ایڈریس بار سے لنک کاپی کریں۔',
    shortLink: 'یہ مختصر لنک ہے۔ اسے براؤزر میں کھولیں اور ایڈریس بار سے پورا لنک کاپی کریں۔',
    more: 'مزید اختیارات',
  },
}

export default function LocationPicker({ lat, lng, onChange, locale = 'ar', simple = false, detectHint }: LocationPickerProps) {
  const T = (txt as any)[locale] || txt.ar
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [mapLink, setMapLink] = useState('')

  function detectLocation() {
    setError('')
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setError(T.notSupported); return }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(
          parseFloat(pos.coords.latitude.toFixed(7)),
          parseFloat(pos.coords.longitude.toFixed(7))
        )
        setDetecting(false)
      },
      (err) => {
        // 1 = denied; 2 = position unavailable; 3 = timeout
        setError(err.code === 1 ? T.denied : T.unavailable)
        setDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function extractFromLink() {
    setError('')
    const link = mapLink.trim()
    // The place's own pin (!3d…!4d…) comes before the map centre (@lat,lng), which is only where the
    // map was scrolled to.
    const patterns = [
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /[?&](?:q|query|destination|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
      /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // plain coordinates
    ]
    for (const p of patterns) {
      const m = link.match(p)
      if (m) {
        onChange(parseFloat(parseFloat(m[1]).toFixed(7)), parseFloat(parseFloat(m[2]).toFixed(7)))
        setMapLink('')
        return
      }
    }
    setError(/goo\.gl|maps\.app/i.test(link) ? T.shortLink : T.invalidLink)
  }

  const hasLocation = lat != null && lng != null

  const linkBox = (
    <div>
      <label htmlFor="loc-map-link" className="block text-[12px] font-bold text-gray-600 mb-1.5">{T.orPaste}</label>
      <div className="flex gap-2">
        <input id="loc-map-link" value={mapLink} onChange={e => setMapLink(e.target.value)}
          className="input-field text-[16px] sm:text-sm flex-1 min-w-0" placeholder="https://maps.google.com/..." dir="ltr" />
        <button type="button" onClick={extractFromLink} disabled={!mapLink}
          className="px-4 min-h-[44px] rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40 transition-all shrink-0"
          style={{ background: '#D4A543' }}>
          {T.extract}
        </button>
      </div>
      <p className="text-[12px] text-gray-500 mt-1">{T.pasteHint}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* زر تحديد الموقع */}
      <div>
        <button type="button" onClick={detectLocation} disabled={detecting}
          className="w-full min-h-[48px] py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:shadow-lg flex items-center justify-center gap-2"
          style={{ background: '#0B2438' }}>
          {detecting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {T.detecting}
            </>
          ) : (<><LocateFixed className="w-4 h-4 text-[#F5C55B]" aria-hidden />{T.detect}</>)}
        </button>
        {detectHint && <p className="text-[12px] text-gray-600 mt-1.5">{detectHint}</p>}
      </div>

      {/* أو لصق رابط */}
      {simple ? (
        <details className="rounded-xl border border-gray-200 px-3 py-2">
          <summary className="cursor-pointer min-h-[36px] flex items-center text-sm font-bold text-[#0B2438]">{T.more}</summary>
          <div className="pt-2">{linkBox}</div>
        </details>
      ) : linkBox}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg p-2" role="alert"><Glyph e="⚠" /> {error}</div>}

      {/* عرض الموقع + الخريطة */}
      {hasLocation ? (
        <div className="bg-[#f4f6f9] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] font-bold text-[#0F6E56] inline-flex items-center gap-1"><Check className="w-4 h-4" aria-hidden /> {T.set}</div>
            <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
              className="text-[13px] font-semibold hover:underline" style={{ color: '#8F6820' }}>
              {T.openGoogle}
            </a>
          </div>
          {/* خريطة OpenStreetMap مجانية بدون API key */}
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe title={T.viewMap}
              width="100%" height="200" frameBorder="0" style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`}
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 text-sm border border-dashed border-gray-200">
          <Glyph e="📍" /> {T.noLocation}
        </div>
      )}
    </div>
  )
}
