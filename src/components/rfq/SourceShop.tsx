'use client'
// «وسيط تسعير» (owner 2026-11-16, migrations 213/214): an independent seller names the shop he
// buys from. The buyer sees the area before the deal and the shop name after it (248; never the phone). The shop
// issues its invoice in the buyer's name; the seller and admins see everything.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sarLabel } from '@/lib/vat'
import { agentCapText } from '@/lib/sellers'

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
      {/* UX-144: the rules as five short points instead of one long paragraph */}
      <ul className="text-[12px] text-gray-700 mb-2 leading-relaxed list-disc ps-5 space-y-0.5">
        <li>{L('Before the buyer chooses your offer, they see only the district and the city.', 'خریدار کے آپ کی آفر چننے سے پہلے وہ صرف محلہ اور شہر دیکھتا ہے۔', 'قبل أن يختار المشتري عرضك لا يرى إلا الحي والمدينة.')}</li>
        <li>{L('After choosing, they see the shop’s name, never its phone.', 'انتخاب کے بعد وہ دکان کا نام دیکھتا ہے، فون کبھی نہیں۔', 'بعد اختياره يرى اسم المحل، ولا يرى رقم هاتفه أبداً.')}</li>
        {/* round-7 UX-039: the invoice line matches the VAT answer (no «tax invoice» promise here) */}
        <li>{L('The invoice is issued by this shop in the buyer’s name at your offer’s price; attach it at delivery.', 'انوائس اسی دکان سے خریدار کے نام آپ کی آفر کی قیمت پر جاری ہوتی ہے؛ ڈیلیوری پر اسے منسلک کریں۔', 'تصدر الفاتورة من هذا المحل باسم المشتري وبسعر عرضك نفسه، وأرفقها عند التسليم.')}</li>
        {/* UX-135: the shop rule said plainly */}
        <li>{L('The shop must have a commercial registration, and its invoice carries the same price as your offer.', 'دکان کی تجارتی رجسٹریشن ہونا ضروری ہے، اور اس کی انوائس میں وہی قیمت ہو جو آپ کی آفر میں ہے۔', 'يجب أن يكون للمحل سجل تجاري، وأن تحمل فاتورته السعر نفسه الذي في عرضك.')}</li>
        <li>{L('Upload the invoice in the invoice step first, then confirm the delivery.', 'پہلے انوائس کے مرحلے میں انوائس اپ لوڈ کریں، پھر ڈیلیوری کی تصدیق کریں۔', 'ارفع الفاتورة في خطوة الفاتورة أولاً، ثم أكّد التسليم.')}</li>
      </ul>
      {/* UX-090: the current limit and the progress towards the next one */}
      {cap && (
        <p className="text-[12px] mb-2 font-semibold text-[#071827] leading-relaxed">
          {agentCapText(cap, locale, sarLabel(locale))}
          {cap.cap != null && ' ' + L('A successful deal: the buyer confirmed receipt and no problem was reported.', 'کامیاب سودا: خریدار نے وصولی کی تصدیق کی اور کوئی شکایت نہیں ہوئی۔', 'الصفقة الناجحة: أكّد المشتري استلامها ولم يُفتح عليها بلاغ.')}
        </p>
      )}
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
    if (error) { console.error('set_offer_source', error); setErr(L('Could not save the shop. Check your connection and try again.', 'دکان محفوظ نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر حفظ المحل. تحقّق من اتصالك وحاول مرة أخرى.')); return }
    setEdit(false); load()
  }
  const missing = !data
  return (
    <div className={`mt-3 rounded-xl border p-3 text-start ${missing && editable ? 'border-warn-border bg-warn-bg' : 'border-gray-200 bg-white'}`}>
      <div className="text-xs font-bold text-[#071827]">{L('Source shop (pricing agent)', 'ماخذ دکان (قیمت ایجنٹ)', 'المحل المصدر (وسيط تسعير)')}</div>
      {missing && editable && !edit && (
        <p className="text-[13px] font-semibold text-warn-text mt-1">{L('Add the shop you buy from, or the buyer can’t choose your offer.', 'جس دکان سے آپ خریدتے ہیں وہ شامل کریں، ورنہ خریدار آپ کی آفر منتخب نہیں کر سکے گا۔', 'أضف المحل الذي ستشتري منه، وإلا فلن يستطيع المشتري اختيار عرضك.')}</p>
      )}
      {!missing && !edit && (
        <p className="text-sm text-gray-700 mt-1">{[data.name, data.area, data.city].filter(Boolean).join(L(', ', '، ', '، '))}{data.phone ? ` · ${data.phone}` : ''}</p>
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
            <button type="button" onClick={() => setEdit(true)} className={missing ? 'btn-primary min-h-[44px] px-4 rounded-xl text-sm font-bold' : 'min-h-[44px] px-4 rounded-lg text-sm font-bold border border-gray-300'}>{missing ? L('Add the shop now', 'ابھی دکان شامل کریں', 'أضف المحل الآن') : L('Edit', 'ترمیم', 'تعديل')}</button>
          )}
        </div>
      )}
    </div>
  )
}

/** Buyer side: the area only. get_offer_source never returns the shop name or phone to the buyer (214), even after the deal. */
// round-7 UX-130: a page that already read get_offer_source passes it as `data` (no second call per offer)
export function SourceShopBadge({ offerId, locale, compact, data }: { offerId: string; locale: Loc; compact?: boolean; data?: any }) {
  const L = tr(locale)
  const [fetched, setFetched] = useState<any>(null)
  const [why, setWhy] = useState(false)
  useEffect(() => {
    if (data !== undefined) return
    let on = true
    createClient().rpc('get_offer_source', { p_offer_id: offerId }).then(({ data: r }: any) => { if (on) setFetched(r || null) })
    return () => { on = false }
  }, [offerId, data])
  const d = data !== undefined ? data : fetched
  if (!d) return null
  const where = [d.area, d.city].filter(Boolean).join('، ')
  if (d.revealed && d.name) {
    return (
      <div className={`${compact ? 'text-[12px]' : 'text-xs'} mt-1 rounded-lg bg-[#0B2438]/5 border border-[#0B2438]/15 px-2 py-1 text-[#0B2438]`}>
        {/* UX-002: never the shop phone here (this badge is also printed on the deal page); the seller sees it in SourceShopCard */}
        {/* UX-138: one name everywhere («المحل المصدر»), and the invoice said once */}
        {L('Source shop:', 'ماخذ دکان:', 'المحل المصدر:')} <b>{d.name}</b>{where ? `${L(', ', '، ', '، ')}${where}` : ''}
        {d.viewer === 'seller' && <div className="text-[12px] text-[#0B2438]/80">{L('The invoice is issued by the source shop in the buyer’s name.', 'انوائس ماخذ دکان سے خریدار کے نام جاری ہوگی۔', 'تصدر الفاتورة من المحل المصدر باسم المشتري.')}</div>}
      </div>
    )
  }
  if (d.viewer === 'seller') return (
    <div className={`${compact ? 'text-[12px]' : 'text-xs'} mt-1 text-gray-500`}>
      {where ? <>{L('Source shop:', 'ماخذ دکان:', 'المحل المصدر:')} {where}</> : L('Pricing agent', 'قیمت ایجنٹ', 'وسيط تسعير')}
    </div>
  )
  return (
    <div className={`${compact ? 'text-[12px]' : 'text-xs'} mt-1 text-gray-600`}>
      <span>{where ? L(`Buys for you from a shop in ${where}`, `آپ کے لیے ${where} کی ایک دکان سے خریدتا ہے`, `يشتري لك من محل في ${where}`) : L('Buys for you from a shop', 'آپ کے لیے ایک دکان سے خریدتا ہے', 'يشتري لك من محل')}</span>
      {' '}<button type="button" onClick={() => setWhy(v => !v)} aria-expanded={why} className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] underline underline-offset-2">{L('What does this mean?', 'اس کا کیا مطلب ہے؟', 'ما معنى هذا؟')}</button>
      {why && <p className="mt-0.5 rounded-lg bg-[#0B2438]/5 border border-[#0B2438]/15 px-2 py-1.5 text-[#0B2438] leading-relaxed">{L('This supplier is a pricing agent: they buy the goods for you from a shop with a commercial registration. The shop issues its invoice in your name at the same price, and you see the shop name after choosing the offer.', 'یہ سپلائر قیمت ایجنٹ ہے: وہ آپ کے لیے تجارتی رجسٹریشن والی دکان سے سامان خریدتا ہے۔ دکان اسی قیمت پر آپ کے نام انوائس جاری کرتی ہے، اور آفر چننے کے بعد آپ دکان کا نام دیکھتے ہیں۔', 'هذا المورد وسيط تسعير: يشتري لك البضاعة من محل له سجل تجاري، وتصدر فاتورة المحل باسمك بالسعر نفسه، ويظهر لك اسم المحل بعد اختيار العرض.')}</p>}
    </div>
  )
}
