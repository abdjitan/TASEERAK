'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, LocateFixed, Minus, Plus, MapPin } from 'lucide-react'
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
    more: 'خيارات أخرى', resolving: 'جارٍ قراءة الرابط...',
    drag: 'اسحب الخريطة حتى يقع الدبوس على مكان التسليم بالضبط', accuracy: (m: number) => `الدقة: نحو ${m} م. تأكّد من موضع الدبوس.`,
    zoomIn: 'تكبير', zoomOut: 'تصغير',
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
    more: 'More options', resolving: 'Reading the link...',
    drag: 'Drag the map until the pin sits exactly on the delivery spot', accuracy: (m: number) => `Accuracy: about ${m} m. Check where the pin is.`,
    zoomIn: 'Zoom in', zoomOut: 'Zoom out',
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
    more: 'مزید اختیارات', resolving: 'لنک پڑھا جا رہا ہے...',
    drag: 'نقشہ کھینچیں یہاں تک کہ پن بالکل ڈیلیوری کی جگہ پر ہو', accuracy: (m: number) => `درستگی: تقریباً ${m} میٹر۔ پن کی جگہ چیک کریں۔`,
    zoomIn: 'بڑا کریں', zoomOut: 'چھوٹا کریں',
  },
}

export default function LocationPicker({ lat, lng, onChange, locale = 'ar', simple = false, detectHint }: LocationPickerProps) {
  const T = (txt as any)[locale] || txt.ar
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [mapLink, setMapLink] = useState('')
  const [resolving, setResolving] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null) // indoor GPS can be far off: say so (round-2 UX-045)

  function detectLocation() {
    setError('')
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setError(T.notSupported); return }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy || 0)
        setAccuracy(acc > 50 ? acc : null)
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

  async function extractFromLink() {
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
        setMapLink(''); setAccuracy(null)
        return
      }
    }
    if (/goo\.gl|maps\.app/i.test(link)) {
      // a short link: the server follows its redirects (/api/maps/resolve); the explanation is the fallback
      setResolving(true)
      try {
        const res = await fetch('/api/maps/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link }) })
        const j: any = await res.json().catch(() => null)
        if (res.ok && typeof j?.lat === 'number' && typeof j?.lng === 'number') {
          onChange(j.lat, j.lng)
          setMapLink(''); setAccuracy(null)
          return
        }
      } catch { /* fall through to the explanation */ } finally { setResolving(false) }
      setError(T.shortLink)
      return
    }
    setError(T.invalidLink)
  }

  const hasLocation = lat != null && lng != null

  const linkBox = (
    <div>
      <label htmlFor="loc-map-link" className="block text-[12px] font-bold text-gray-600 mb-1.5">{T.orPaste}</label>
      <div className="flex gap-2">
        <input id="loc-map-link" value={mapLink} onChange={e => setMapLink(e.target.value)}
          className="input-field text-[16px] sm:text-sm flex-1 min-w-0" placeholder="https://maps.google.com/..." dir="ltr" />
        <button type="button" onClick={extractFromLink} disabled={!mapLink || resolving} aria-busy={resolving}
          className="px-4 min-h-[44px] rounded-xl text-sm font-bold text-[#0B2438] bg-white border-2 border-[#0B2438]/40 disabled:opacity-40 transition-all shrink-0">
          {resolving ? T.resolving : T.extract}
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
          <summary className="cursor-pointer min-h-[44px] flex items-center text-sm font-bold text-[#0B2438]">{T.more}</summary>
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
          {accuracy != null && <p className="mb-2 rounded-lg border border-[#D4A543] bg-[#D4A543]/10 px-2 py-1.5 text-[13px] font-bold text-[#0B2438]" role="status">{T.accuracy(accuracy)}</p>}
          {/* a map the buyer can drag under a fixed pin (OpenStreetMap tiles, no script or key, round-2 UX-045) */}
          <PinMap lat={lat!} lng={lng!} label={T.viewMap} zoomIn={T.zoomIn} zoomOut={T.zoomOut}
            onMove={(a, b) => { setAccuracy(null); onChange(a, b) }} />
          <p className="text-[12px] text-gray-600 mt-1.5">{T.drag}</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 text-sm border border-dashed border-gray-200">
          <Glyph e="📍" /> {T.noLocation}
        </div>
      )}
    </div>
  )
}

// ── A small slippy map with a fixed centre pin: the buyer drags the map (mouse or finger) until the pin sits
// on the delivery spot; on release the new centre is the location. OpenStreetMap tiles as plain images.
const TILE = 256
const project = (lat: number, lng: number, z: number) => {
  const s = TILE * Math.pow(2, z)
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180
  return { x: ((lng + 180) / 360) * s, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s }
}
const unproject = (x: number, y: number, z: number) => {
  const s = TILE * Math.pow(2, z)
  const lng = (x / s) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / s))) * 180) / Math.PI
  return { lat: parseFloat(lat.toFixed(7)), lng: parseFloat(lng.toFixed(7)) }
}

function PinMap({ lat, lng, onMove, label, zoomIn, zoomOut }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void; label: string; zoomIn: string; zoomOut: string }) {
  const H = 220
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  const [z, setZ] = useState(17)
  const [off, setOff] = useState({ dx: 0, dy: 0 })
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const upd = () => setW(el.clientWidth || 320)
    upd()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(upd) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const c = project(lat, lng, z)
  const cx = c.x - off.dx, cy = c.y - off.dy
  const n = Math.pow(2, z)
  const tiles: { k: string; src: string; left: number; top: number }[] = []
  for (let tx = Math.floor((cx - w / 2) / TILE); tx <= Math.floor((cx + w / 2) / TILE); tx++) {
    for (let ty = Math.floor((cy - H / 2) / TILE); ty <= Math.floor((cy + H / 2) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue
      const wx = ((tx % n) + n) % n
      tiles.push({ k: `${z}/${tx}/${ty}`, src: `https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`, left: tx * TILE - cx + w / 2, top: ty * TILE - cy + H / 2 })
    }
  }
  const end = () => {
    if (!drag.current) return
    drag.current = null
    if (Math.abs(off.dx) + Math.abs(off.dy) > 2) { const p = unproject(cx, cy, z); onMove(p.lat, p.lng) }
    setOff({ dx: 0, dy: 0 })
  }
  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-[#e8eef3] select-none" dir="ltr">
      <div ref={box} role="application" aria-label={label} className="relative w-full cursor-grab active:cursor-grabbing" style={{ height: H, touchAction: 'none' }}
        onPointerDown={e => { drag.current = { x: e.clientX + off.dx, y: e.clientY + off.dy, id: e.pointerId }; (e.target as Element).setPointerCapture?.(e.pointerId) }}
        onPointerMove={e => { if (drag.current) setOff({ dx: drag.current.x - e.clientX, dy: drag.current.y - e.clientY }) }}
        onPointerUp={end} onPointerCancel={end}>
        {tiles.map(t => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={t.k} src={t.src} alt="" draggable={false} className="absolute max-w-none pointer-events-none" style={{ left: t.left, top: t.top, width: TILE, height: TILE }} />
        ))}
        <MapPin className="absolute w-9 h-9 text-[#0B2438] fill-[#D4A543] pointer-events-none drop-shadow" style={{ left: w / 2 - 18, top: H / 2 - 34 }} aria-hidden />
      </div>
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button type="button" onClick={() => setZ(v => Math.min(19, v + 1))} aria-label={zoomIn} className="w-[44px] h-[44px] grid place-items-center rounded-lg bg-white shadow text-[#0B2438]"><Plus className="w-4 h-4" aria-hidden /></button>
        <button type="button" onClick={() => setZ(v => Math.max(10, v - 1))} aria-label={zoomOut} className="w-[44px] h-[44px] grid place-items-center rounded-lg bg-white shadow text-[#0B2438]"><Minus className="w-4 h-4" aria-hidden /></button>
      </div>
      <span className="absolute bottom-0 left-0 bg-white/80 px-1 text-[12px] text-gray-700">© OpenStreetMap</span>
    </div>
  )
}
