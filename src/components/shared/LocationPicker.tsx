'use client'

import { useState } from 'react'

interface LocationPickerProps {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
  locale?: string
}

const txt = {
  ar: {
    title: 'الموقع الجغرافي', detect: '📍 تحديد موقعي الحالي', detecting: 'جارٍ تحديد الموقع...',
    orPaste: 'أو الصق رابط خرائط Google', pasteHint: 'انسخ الرابط من تطبيق خرائط جوجل والصقه هنا',
    extract: 'استخراج', coords: 'الإحداثيات', viewMap: 'عرض على الخريطة', openGoogle: 'فتح في خرائط Google',
    noLocation: 'لم يتم تحديد الموقع بعد', denied: 'تم رفض الوصول للموقع — فعّله من إعدادات المتصفح',
    notSupported: 'المتصفح لا يدعم تحديد الموقع', invalidLink: 'الرابط غير صحيح',
  },
  en: {
    title: 'Geographic Location', detect: '📍 Detect My Location', detecting: 'Detecting location...',
    orPaste: 'Or paste Google Maps link', pasteHint: 'Copy the link from Google Maps and paste here',
    extract: 'Extract', coords: 'Coordinates', viewMap: 'View on Map', openGoogle: 'Open in Google Maps',
    noLocation: 'Location not set yet', denied: 'Location access denied — enable in browser settings',
    notSupported: 'Browser does not support geolocation', invalidLink: 'Invalid link',
  },
  ur: {
    title: 'جغرافیائی محل وقوع', detect: '📍 میرا مقام تلاش کریں', detecting: 'مقام تلاش ہو رہا ہے...',
    orPaste: 'یا Google Maps لنک پیسٹ کریں', pasteHint: 'Google Maps سے لنک کاپی کرکے یہاں پیسٹ کریں',
    extract: 'نکالیں', coords: 'کوآرڈینیٹس', viewMap: 'نقشے پر دیکھیں', openGoogle: 'Google Maps میں کھولیں',
    noLocation: 'مقام ابھی مقرر نہیں', denied: 'مقام تک رسائی مسترد', notSupported: 'براؤزر سپورٹ نہیں کرتا',
    invalidLink: 'غلط لنک',
  },
}

export default function LocationPicker({ lat, lng, onChange, locale = 'ar' }: LocationPickerProps) {
  const T = (txt as any)[locale] || txt.ar
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [mapLink, setMapLink] = useState('')

  function detectLocation() {
    setError('')
    if (!navigator.geolocation) { setError(T.notSupported); return }
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
        setError(err.code === 1 ? T.denied : T.notSupported)
        setDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function extractFromLink() {
    setError('')
    // أنماط روابط خرائط جوجل المختلفة
    // @lat,lng / q=lat,lng / !3dlat!4dlng / ll=lat,lng
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // إحداثيات مباشرة
    ]
    for (const p of patterns) {
      const m = mapLink.match(p)
      if (m) {
        onChange(parseFloat(parseFloat(m[1]).toFixed(7)), parseFloat(parseFloat(m[2]).toFixed(7)))
        setMapLink('')
        return
      }
    }
    setError(T.invalidLink)
  }

  const hasLocation = lat != null && lng != null

  return (
    <div className="space-y-3">
      {/* زر تحديد الموقع */}
      <button type="button" onClick={detectLocation} disabled={detecting}
        className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow-lg flex items-center justify-center gap-2"
        style={{ background: '#1B2D5B' }}>
        {detecting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {T.detecting}
          </>
        ) : T.detect}
      </button>

      {/* أو لصق رابط */}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5">{T.orPaste}</label>
        <div className="flex gap-2">
          <input value={mapLink} onChange={e => setMapLink(e.target.value)}
            className="input-field text-sm flex-1" placeholder="https://maps.google.com/..." dir="ltr" />
          <button type="button" onClick={extractFromLink} disabled={!mapLink}
            className="px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: '#F5831F' }}>
            {T.extract}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{T.pasteHint}</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-2">⚠️ {error}</div>}

      {/* عرض الموقع + الخريطة */}
      {hasLocation ? (
        <div className="bg-[#f4f6f9] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs">
              <span className="text-gray-400">{T.coords}:</span>{' '}
              <span className="font-mono font-semibold" style={{ color: '#1B2D5B' }} dir="ltr">{lat}, {lng}</span>
            </div>
            <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold hover:underline" style={{ color: '#F5831F' }}>
              {T.openGoogle} ←
            </a>
          </div>
          {/* خريطة OpenStreetMap مجانية بدون API key */}
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe
              width="100%" height="200" frameBorder="0" style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`}
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm border border-dashed border-gray-200">
          📍 {T.noLocation}
        </div>
      )}
    </div>
  )
}
