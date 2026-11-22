'use client'
// «وسيط تسعير» (owner 2026-11-16, migrations 213/214): an independent seller names the shop he
// buys from. The buyer sees the area before the deal and the shop name after it (248; never the phone). The shop's tax
// invoice); the seller and admins see everything.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Loc = 'ar' | 'en' | 'ur' | string
const tr = (locale: Loc) => (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

export type SourceValue = { name: string; city: string; area: string; phone: string }

/** Seller side: the fields on the pricing form. */
export function SourceShopFields({ value, onChange, locale }: { value: SourceValue; onChange: (v: SourceValue) => void; locale: Loc }) {
  const L = tr(locale)
  // this agent's current deal cap (migration 214): 15,000 → 50,000 after 3 good deals → none after 10
  const [cap, setCap] = useState<{ cap: number | null; deals: number } | null>(null)
  useEffect(() => { createClient().rpc('my_agent_deal_cap').then(({ data }: any) => setCap(data || null)) }, [])
  const set = (k: keyof SourceValue) => (e: any) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="mt-3 rounded-xl border border-[#D4A543]/40 bg-[#D4A543]/5 p-3">
      <div className="text-xs font-bold text-[#071827] mb-1">
        {L('The shop you will buy from', 'وہ دکان جہاں سے آپ خریدیں گے', 'المحل الذي ستشتري منه')} <span className="text-red-500">*</span>
      </div>
      <p className="text-[12px] text-gray-700 mb-2 leading-relaxed">
        {L('You are a pricing agent: before the buyer chooses your offer they see only the district; after it, the shop’s name (never its phone). Make sure the tax invoice is issued in the buyer’s name, at your quoted price, by a shop with a commercial registration, and attach it at delivery.',
           'آپ قیمت ایجنٹ ہیں: خریدار کے آپ کی آفر چننے سے پہلے وہ صرف علاقہ دیکھتا ہے؛ بعد میں دکان کا نام (فون کبھی نہیں)۔ یقینی بنائیں کہ ٹیکس انوائس خریدار کے نام، آپ کی آفر کی قیمت پر، کمرشل رجسٹریشن والی دکان سے جاری ہو، اور ڈیلیوری پر اسے منسلک کریں۔',
           'أنت وسيط تسعير: قبل أن يختار المشتري عرضك لا يرى إلا الحي، وبعد اختياره يرى اسم المحل (دون رقم هاتفه). تأكّد أن الفاتورة الضريبية تصدر باسم المشتري وبنفس سعر عرضك، من محل له سجل تجاري، وأرفقها عند التسليم.')}
        {cap && (
          <span className="block mt-1 font-semibold text-[#071827]">
            {cap.cap == null
              ? L('Your deals have no amount limit.', 'آپ کے سودوں پر کوئی حد نہیں۔', 'لا حدّ لقيمة صفقاتك.')
              : L(`Your current limit per deal: ${cap.cap.toLocaleString('en-US')} SAR (it rises after successful deals).`, `فی سودا آپ کی موجودہ حد: ${cap.cap.toLocaleString('en-US')} ریال (کامیاب سودوں کے بعد بڑھتی ہے)۔`, `حدّك الحالي للصفقة: ${cap.cap.toLocaleString('en-US')} ريال (يرتفع بعد الصفقات الناجحة).`)}
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* id="shop-name": the pricing page's «why can't I send» link scrolls here (UX-032) */}
        <input id="shop-name" value={value.name} onChange={set('name')} maxLength={120} className="input-field text-base sm:text-sm sm:col-span-2"
          aria-label={L('Shop name (required)', 'دکان کا نام (لازمی)', 'اسم المحل (مطلوب)')} placeholder={L('Shop name (required)', 'دکان کا نام (لازمی)', 'اسم المحل (مطلوب)')} />
        <input value={value.city} onChange={set('city')} maxLength={60} className="input-field text-base sm:text-sm" aria-label={L('City', 'شہر', 'المدينة')} placeholder={L('City', 'شہر', 'المدينة')} />
        <input value={value.area} onChange={set('area')} maxLength={120} className="input-field text-base sm:text-sm"
          aria-label={L('District / approximate location', 'محلہ / تقریبی مقام', 'الحي / الموقع التقريبي')} placeholder={L('District / approximate location', 'محلہ / تقریبی مقام', 'الحي / الموقع التقريبي')} />
        <input value={value.phone} onChange={set('phone')} maxLength={30} inputMode="tel" dir="ltr" className="input-field text-base sm:text-sm sm:col-span-2"
          aria-label={L('Shop phone (optional, never shown to the buyer)', 'دکان کا فون (اختیاری، خریدار کو کبھی نہیں دکھایا جاتا)', 'رقم المحل (اختياري، ولا يظهر للمشتري)')} placeholder={L('Shop phone (optional, never shown to the buyer)', 'دکان کا فون (اختیاری، خریدار کو نہیں دکھتا)', 'رقم المحل (اختياري، ولا يظهر للمشتري)')} />
      </div>
    </div>
  )
}

/** Seller side, after sending: shows the saved shop and lets him add/fix it while the offer is pending. */
export function SourceShopCard({ offerId, editable, locale }: { offerId: string; editable: boolean; locale: Loc }) {
  const L = tr(locale)
  const [data, setData] = useState<any>(undefined)
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState<SourceValue>({ name: '', city: '', area: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const load = async () => {
    const { data: d } = await createClient().rpc('get_offer_source', { p_offer_id: offerId })
    setData(d || null)
    if (d) setV({ name: d.name || '', city: d.city || '', area: d.area || '', phone: d.phone || '' })
  }
  useEffect(() => { load() }, [offerId]) // eslint-disable-line react-hooks/exhaustive-deps
  if (data === undefined) return null
  const save = async () => {
    if (v.name.trim().length < 2) { setErr(L('Write the shop name.', 'دکان کا نام لکھیں۔', 'اكتب اسم المحل.')); return }
    setBusy(true); setErr('')
    const { error } = await createClient().rpc('set_offer_source', { p_offer_id: offerId, p_shop_name: v.name.trim(), p_shop_city: v.city.trim() || null, p_shop_area: v.area.trim() || null, p_shop_phone: v.phone.trim() || null })
    setBusy(false)
    if (error) { console.error('set_offer_source', error); setErr(L('Could not save the shop — please try again.', 'دکان محفوظ نہیں ہو سکی — دوبارہ کوشش کریں۔', 'تعذّر حفظ المحل، حاول مرة أخرى.')); return }
    setEdit(false); load()
  }
  const missing = !data
  return (
    <div className={`mt-3 rounded-xl border p-3 text-start ${missing ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-xs font-bold text-[#071827]">{L('Source shop (pricing agent)', 'ماخذ دکان (قیمت ایجنٹ)', 'المحل المصدر (وسيط تسعير)')}</div>
      {missing && !edit && (
        <p className="text-[13px] font-semibold text-amber-900 mt-1">{L('Add the shop you buy from, or the buyer can’t choose your offer.', 'جس دکان سے آپ خریدتے ہیں وہ شامل کریں، ورنہ خریدار آپ کی آفر منتخب نہیں کر سکے گا۔', 'أضف المحل الذي ستشتري منه، وإلا فلن يستطيع المشتري اختيار عرضك.')}</p>
      )}
      {!missing && !edit && (
        <p className="text-sm text-gray-700 mt-1">{[data.name, data.area, data.city].filter(Boolean).join(' — ')}{data.phone ? ` · ${data.phone}` : ''}</p>
      )}
      {edit && <SourceShopFields value={v} onChange={setV} locale={locale} />}
      {err && <p role="alert" className="text-[13px] text-red-600 mt-1">{err}</p>}
      {editable && (
        <div className="mt-2 flex gap-2">
          {edit ? (
            <>
              <button type="button" disabled={busy} onClick={save} className="min-h-[44px] px-4 rounded-lg text-sm font-bold bg-[#D4A543] text-[#071827] disabled:opacity-60">{L('Save', 'محفوظ کریں', 'حفظ')}</button>
              <button type="button" onClick={() => setEdit(false)} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold border border-gray-300">{L('Close without saving', 'محفوظ کیے بغیر بند کریں', 'إغلاق دون حفظ')}</button>
            </>
          ) : (
            <button type="button" onClick={() => setEdit(true)} className={`min-h-[44px] px-4 rounded-lg text-sm font-bold ${missing ? 'text-[#071827]' : 'border border-gray-300'}`} style={missing ? { background: 'linear-gradient(135deg,#F5C55B,#D4A543)' } : {}}>{missing ? L('Add the shop now', 'ابھی دکان شامل کریں', 'أضف المحل الآن') : L('Edit', 'ترمیم', 'تعديل')}</button>
          )}
        </div>
      )}
    </div>
  )
}

/** Buyer side: the area only. get_offer_source never returns the shop name or phone to the buyer (214), even after the deal. */
export function SourceShopBadge({ offerId, locale, compact }: { offerId: string; locale: Loc; compact?: boolean }) {
  const L = tr(locale)
  const [d, setD] = useState<any>(null)
  useEffect(() => {
    let on = true
    createClient().rpc('get_offer_source', { p_offer_id: offerId }).then(({ data }: any) => { if (on) setD(data || null) })
    return () => { on = false }
  }, [offerId])
  if (!d) return null
  const where = [d.area, d.city].filter(Boolean).join('، ')
  if (d.revealed && d.name) {
    return (
      <div className={`${compact ? 'text-[12px]' : 'text-xs'} mt-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-900`}>
        {/* UX-002: never the shop phone here (this badge is also printed on the deal page); the seller sees it in SourceShopCard */}
        {L('Seller (source shop):', 'فروخت کنندہ (ماخذ دکان):', 'البائع (المحل المصدر):')} <b>{d.name}</b>{where ? ` — ${where}` : ''}
        <div className="text-[12px] text-emerald-800">{d.viewer === 'seller'
          ? L('The tax invoice is issued by this shop in the buyer’s name.', 'ٹیکس انوائس یہی دکان خریدار کے نام جاری کرے گی۔', 'تصدر الفاتورة الضريبية من هذا المحل باسم المشتري.')
          : L('The tax invoice is issued by this shop in your name.', 'ٹیکس انوائس یہی دکان آپ کے نام جاری کرے گی۔', 'الفاتورة الضريبية تصدر من هذا المحل باسمك.')}</div>
      </div>
    )
  }
  return where ? (
    <div className={`${compact ? 'text-[12px]' : 'text-xs'} mt-1 text-gray-500`}>
      {L('Pricing agent · goods from a shop in', 'قیمت ایجنٹ · سامان اس علاقے کی دکان سے', 'وسيط تسعير · البضاعة من محل في')} {where}
      <span className="text-gray-500"> · {L('tax invoice from the shop in your name', 'ٹیکس انوائس دکان سے آپ کے نام', 'الفاتورة الضريبية من المحل باسمك')}</span>
    </div>
  ) : (
    <div className={`${compact ? 'text-[12px]' : 'text-xs'} mt-1 text-gray-500`}>{L('Pricing agent · tax invoice from the shop in your name', 'قیمت ایجنٹ · ٹیکس انوائس دکان سے آپ کے نام', 'وسيط تسعير · الفاتورة الضريبية من المحل باسمك')}</div>
  )
}
