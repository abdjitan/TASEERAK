'use client'

import { useState, useEffect, useMemo } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, UNIT_OPTIONS, REGIONS, SUB_CATEGORIES, getGroupedSubCategories, getUnitLabel, getRegionLabel, getDefaultUnit } from '@/types'
import LoadError from '@/components/shared/LoadError'
import Glyph from '@/components/shared/Glyph'
import { timeAgo as timeAgoText } from '@/lib/text'
import { askConfirm } from '@/lib/askConfirm'
import { Check, X } from 'lucide-react'
import { normalizeText } from '@/lib/normalize'
import { sectionLabelOf } from '@/lib/sellers'
import { BROWSE_SECTIONS, subsOfSection } from '@/lib/browseCategories'
// Arabic-Indic / Persian digits and «٫» from Arabic and Urdu keyboards → 12.5 (type=number refused them silently)
const latinNum = (v: string) => String(v ?? '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '')

const txt = {
  ar: {
    title: 'أسعاري', sub: 'أسعارك المحفوظة خاصة بك، لا يراها المشترون ولا المنافسون، وتُعبَّأ عند تسعير المادة نفسها أو فئتها بالوحدة نفسها',
    back: '→ رجوع', addPrice: '+ إضافة مادة', myPrices: 'أسعاري المحفوظة',
    product: 'اسم المادة', sector: 'القسم', unit: 'الوحدة', price: 'السعر شامل ضريبة القيمة المضافة (ر.س)',
    region: 'المنطقة', selectSector: 'اختر القسم', selectUnit: 'الوحدة', selectRegion: 'كل المناطق',
    save: 'حفظ السعر', saving: 'جارٍ الحفظ...', update: 'تحديث', updated: 'تم التحديث',
    noPrices: 'لم تحفظ أي أسعار بعد', noPricesSub: 'احفظ أسعار ما تبيعه لتُعبَّأ في عروضك عند تسعير المادة نفسها أو فئتها بالوحدة نفسها',
    lastUpdate: 'آخر تحديث', delete: 'حذف', edit: 'تعديل', loading: 'جارٍ التحميل...',
    justNow: 'الآن', minsAgo: 'دقيقة', hoursAgo: 'ساعة', daysAgo: 'يوم', ago: 'قبل',
    confirmDelete: 'حذف سعر هذه المادة؟',
  },
  en: {
    title: 'My prices', sub: 'Your saved prices are private: buyers and competitors never see them. They fill in when you price the same material or its category in the same unit',
    back: '← Back', addPrice: '+ Add a material', myPrices: 'My saved prices',
    product: 'Material', sector: 'Section', unit: 'Unit', price: 'Price incl. VAT (SAR)',
    region: 'Region', selectSector: 'Select a section', selectUnit: 'Unit', selectRegion: 'All regions',
    save: 'Save price', saving: 'Saving...', update: 'Update', updated: 'Updated',
    noPrices: 'No saved prices yet', noPricesSub: 'Save the prices of what you sell; they fill in when you price the same material or its category in the same unit',
    lastUpdate: 'Last update', delete: 'Delete', edit: 'Edit', loading: 'Loading...',
    justNow: 'now', minsAgo: 'min', hoursAgo: 'h', daysAgo: 'd', ago: '',
    confirmDelete: 'Delete the price of this material?',
  },
  ur: {
    title: 'میری قیمتیں', sub: 'آپ کی محفوظ قیمتیں نجی ہیں: خریدار اور حریف نہیں دیکھتے۔ یہ اسی مال یا اس کے زمرے کی اسی یونٹ میں قیمت دیتے وقت بھر جاتی ہیں',
    back: '→ واپس', addPrice: '+ آئٹم شامل کریں', myPrices: 'میری محفوظ قیمتیں',
    product: 'مال', sector: 'سیکشن', unit: 'یونٹ', price: 'قیمت VAT سمیت (ریال)',
    region: 'علاقہ', selectSector: 'سیکشن منتخب کریں', selectUnit: 'یونٹ', selectRegion: 'تمام علاقے',
    save: 'قیمت محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', update: 'اپ ڈیٹ', updated: 'اپ ڈیٹ ہو گیا',
    noPrices: 'ابھی کوئی محفوظ قیمت نہیں', noPricesSub: 'جو بیچتے ہیں اس کی قیمتیں محفوظ کریں؛ یہ اسی مال یا زمرے کی اسی یونٹ میں قیمت دیتے وقت بھر جائیں گی',
    lastUpdate: 'آخری اپ ڈیٹ', delete: 'حذف', edit: 'ترمیم', loading: 'لوڈ ہو رہا ہے...',
    justNow: 'ابھی', minsAgo: 'منٹ', hoursAgo: 'گھنٹہ', daysAgo: 'دن', ago: 'پہلے',
    confirmDelete: 'یہ آئٹم حذف کریں؟',
  },
}


export default function SupplierPricesPage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar

  const [user, setUser] = useState<any>(null)
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // form
  const [product, setProduct] = useState('')
  const [productOther, setProductOther] = useState(false)
  const [sector, setSector] = useState('')
  const [pgroup, setPgroup] = useState('')
  const [psearch, setPsearch] = useState('')
  // round-4 UX-066: browse by the 10 buyer-facing sections (not the engineering sectors)
  const [psection, setPsection] = useState('')
  // round-4 UX-143: the quick-update fields are controlled, with a clear answer per row
  const [upd, setUpd] = useState<Record<string, string>>({})
  const [updMsg, setUpdMsg] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [region, setRegion] = useState('')
  // UX-121: a team member saves prices for the company (acting_uid), and every result is said
  const [actId, setActId] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false) // UX-083: a failed load is never «no saved prices»
  // UX-030: a seller without a VAT number keeps final prices; a registered one keeps prices incl. VAT
  // round-5 UX-173: unknown until the profile answers (null), so the VAT tag never flips after load
  const [noVat, setNoVat] = useState<boolean | null>(null)
  // round-5 UX-173: a search over a long list of saved prices
  const [listQ, setListQ] = useState('')
  // round-5 UX-173: a typed material picks one of the 10 buyer-facing sections, not an engineering sector
  const [manualSection, setManualSection] = useState('')
  // UX-083: the unit fills in from the item (still editable)
  useEffect(() => { if (product && sector && !unit) { try { const u = getDefaultUnit(product, sector as any); if (u) setUnit(u) } catch {} } }, [product, sector]) // eslint-disable-line react-hooks/exhaustive-deps
  // UX-144: sector names in the reader's language
  const secLabel = (s: string) => (locale === 'en' ? ({ civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'General supplies' } as any)[s] : locale === 'ur' ? ({ civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'عام سامان' } as any)[s] : ({ ...(SECTOR_LABELS as any), mechanical: 'ميكانيكا', supply_store: 'مستلزمات عامة' } as any)[s]) || s

  // تصفّح متدرّج + بحث للسلع (نفس شكل صفحة طلب التسعير)
  const subGroups = useMemo(() => (sector ? getGroupedSubCategories(sector as any) : []), [sector])
  const activeSubGroup = subGroups.find(g => g.group === pgroup)
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const subLabel = (x: any) => (locale === 'en' ? x.en : locale === 'ur' ? x.ur : x.ar)
  const allSubs = useMemo(() => subGroups.flatMap(g => g.subs), [subGroups])
  const chipCls = (on: boolean) => `inline-flex items-center gap-1 min-h-[44px] px-3 rounded-full text-[13px] font-medium border-2 transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`
  // UX-036: the search reads the three names, tolerant of spelling (hamza, ta marbuta, Urdu letters)
  const psq = normalizeText(psearch.trim()).toLowerCase()
  void allSubs; void activeSubGroup
  // round-4 UX-066: the search reads every sector at once (a tile shop does not know «مدني» from «معماري»)
  const everySub = useMemo(() => Object.entries(SUB_CATEGORIES as any).flatMap(([sec, subs]: any) => Object.entries(subs || {}).map(([key, v]: any) => ({ key, sector: sec, ar: v.ar, en: v.en, ur: v.ur, icon: v.icon }))), [])
  const subResults = psq.length >= 1 ? everySub.filter((x: any) => normalizeText([x.ar, x.en, x.ur || ''].join(' ')).toLowerCase().includes(psq)).slice(0, 60) : []
  const sectionSubs = psection ? subsOfSection(psection as any) : []
  const pick = (x: any) => { setSector(x.sector); setProduct(x.ar); setUnit('') }
  // UX-036: a saved item named after a sub-category shows in the reader's language
  const nameOf = (p: any): string => {
    if (locale === 'ar') return p.product_name
    const subs: any = (SUB_CATEGORIES as any)[p.sector] || {}
    const hit: any = Object.values(subs).find((x: any) => x?.ar === p.product_name)
    return hit ? (locale === 'ur' ? hit.ur || hit.en : hit.en) || p.product_name : p.product_name
  }
  const keyOf = (p: any): string | null => { const subs: any = (SUB_CATEGORIES as any)[p.sector] || {}; return Object.keys(subs).find(k => subs[k]?.ar === p.product_name) || null }

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
    const { data: act } = await supabase.rpc('acting_uid')
    const aid: string = (act as any) || session.user.id
    setActId(aid)
    supabase.from('profiles').select('vat_number').eq('id', aid).maybeSingle().then(({ data: pr }: any) => setNoVat(!String(pr?.vat_number || '').trim()), () => setNoVat(false))
    const { data, error } = await supabase.from('live_prices').select('*')
      .eq('supplier_id', aid).order('updated_at', { ascending: false })
    setLoadFailed(!!error)
    if (!error) setPrices(data || [])
    setLoading(false)
  }
  const failMsg = (what: 'save' | 'delete' = 'save') => setMsg({ ok: false, text: what === 'delete'
    ? L('Could not delete the price. Check your connection and try again.', 'قیمت حذف نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر حذف السعر. تحقّق من اتصالك وحاول مرة أخرى.')
    : L('Could not save the price. Check your connection and try again.', 'قیمت محفوظ نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر حفظ السعر. تحقّق من اتصالك وحاول مرة أخرى.') })

  async function handleSave(e: any) {
    e.preventDefault()
    setMsg(null)
    if (!product || !sector || !unit || !(parseFloat(price) > 0)) { setMsg({ ok: false, text: L('Choose the material, its section, the unit and the price.', 'مال، اس کا سیکشن، یونٹ اور قیمت منتخب کریں۔', 'اختر المادة وقسمها والوحدة والسعر.') }); return }
    setSaving(true)
    const supabase = createClient()
    // UX-083: the same item, unit and region already saved: update that row instead of adding a copy
    const dup = prices.find((p: any) => p.product_name === product && (p.unit || '') === unit && (p.region || '') === (region || ''))
    const np = parseFloat(price)
    const { error } = dup
      ? await supabase.from('live_prices').update({ price: np, previous_price: dup.price, updated_at: new Date().toISOString() }).eq('id', dup.id)
      : await supabase.from('live_prices').insert({
        supplier_id: actId || user.id, product_name: product, sector, unit,
        price: np, region: region || null,
      })
    setSaving(false)
    if (error) { console.error('live_prices save', error); failMsg(); return }
    setProduct(''); setSector(''); setUnit(''); setPrice(''); setRegion(''); setPgroup(''); setPsearch(''); setPsection(''); setProductOther(false); setManualSection('')
    setShowForm(false)
    setMsg({ ok: true, text: dup ? L('The current price was updated.', 'موجودہ قیمت اپ ڈیٹ ہو گئی۔', 'حُدّث السعر الحالي.') : (productOther
      ? L('Price saved. A typed name fills in only when it matches the material name in the request exactly.', 'قیمت محفوظ ہو گئی۔ ہاتھ سے لکھا نام صرف تب بھرتا ہے جب وہ درخواست میں مال کے نام سے بالکل ملے۔', 'حُفظ السعر. الاسم المكتوب يدوياً لا يُعبَّأ إلا إذا طابق اسم المادة في الطلب تماماً.')
      : L('Price saved. It fills in when you price this material or its category in the same unit.', 'قیمت محفوظ ہو گئی۔ یہ اس مال یا اس کے زمرے کی اسی یونٹ میں قیمت دیتے وقت بھر جائے گی۔', 'حُفظ السعر، ويُعبَّأ عند تسعير هذه المادة أو فئتها بالوحدة نفسها.')) })
    load()
  }

  async function updatePrice(id: any, oldPrice: any, newPrice: any) {
    setMsg(null)
    const np = parseFloat(latinNum(newPrice))
    if (!(np > 0)) { setUpdMsg(m => ({ ...m, [id]: { ok: false, text: L('Enter a new price greater than zero.', 'صفر سے زیادہ نئی قیمت درج کریں۔', 'أدخل سعراً جديداً أكبر من صفر.') } })); return }
    if (np === Number(oldPrice)) { setUpdMsg(m => ({ ...m, [id]: { ok: false, text: L('This is already the current price.', 'یہی موجودہ قیمت ہے۔', 'هذا هو السعر الحالي نفسه.') } })); return }
    const supabase = createClient()
    const { error } = await supabase.from('live_prices').update({
      price: np, previous_price: oldPrice, updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { console.error('live_prices update', error); setUpdMsg(m => ({ ...m, [id]: { ok: false, text: L('Could not update the price. Check your connection and try again.', 'قیمت اپ ڈیٹ نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر تحديث السعر. تحقّق من اتصالك وحاول مرة أخرى.') } })); return }
    setUpd(u => ({ ...u, [id]: '' }))
    setUpdMsg(m => ({ ...m, [id]: { ok: true, text: L('Updated', 'اپ ڈیٹ ہو گیا', 'حُدّث') } }))
    load()
  }

  async function deletePrice(id: any) {
    if (!(await askConfirm(T.confirmDelete, { danger: true, okLabel: L('Yes, delete', 'ہاں، حذف کریں', 'نعم، احذف'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('live_prices').delete().eq('id', id)
    if (error) { failMsg('delete'); return }
    load()
  }

  if (loading) return <PageLoader />

  return (
    <AppShell title={T.title} nav={getNav('supplier', locale, '/supplier/prices')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#D4A543' }}><Glyph e="📈" /></div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{T.title}</h1>
              <p className="text-gray-500 text-xs sm:text-sm">{T.sub}</p>
            </div>
          </div>
        </div>

        {msg && <div role={msg.ok ? 'status' : 'alert'} className={`rounded-xl p-3 mb-4 text-sm font-semibold border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg.text}</div>}

        {/* round-5 UX-173: the main action is gold; on a first visit the empty card carries it instead */}
        {!showForm && (prices.length > 0 || loadFailed) && (
          <button onClick={() => setShowForm(true)}
            className="w-full mb-5 min-h-[44px] py-3 rounded-xl font-extrabold text-[#071827] text-sm transition-all hover:shadow-lg"
            style={{ background: '#D4A543' }}>
            {T.addPrice}
          </button>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* round-4 UX-066: search every material first, then browse the 10 sections, or type it with its section */}
              <div className="sm:col-span-2">
                <label htmlFor={productOther ? 'lp-product' : 'lp-search'} className="block text-xs font-bold text-gray-600 mb-1">{T.product}</label>
                {productOther ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input id="lp-product" value={product} onChange={e => setProduct(e.target.value)} className="input-field flex-1"
                        placeholder={L('Material name', 'مال کا نام', 'اسم المادة')} required />
                      <button type="button" onClick={() => { setProductOther(false); setProduct(''); setManualSection('') }} className="inline-flex items-center min-h-[44px] text-xs text-gray-600 whitespace-nowrap px-3"><Glyph e="↩" /> {L('List', 'فہرست', 'القائمة')}</button>
                    </div>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{L('A price with a typed name is saved for you, but it fills in only when the name matches the material name in the request exactly.', 'ہاتھ سے لکھے نام والی قیمت آپ کے لیے محفوظ ہو جاتی ہے، لیکن یہ صرف تب بھرتی ہے جب نام درخواست میں مال کے نام سے بالکل ملے۔', 'السعر المكتوب يدوياً يُحفظ لك، لكنه لا يُعبَّأ تلقائياً إلا إذا طابق الاسم اسم المادة في الطلب تماماً.')}</p>
                    <div className="block text-xs font-bold text-gray-600" id="lp-sector-label">{T.sector}</div>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="lp-sector-label">
                      {BROWSE_SECTIONS.map(sec => {
                        const on = manualSection === sec.key
                        return (
                          <button key={sec.key} type="button" role="radio" aria-checked={on}
                            onClick={() => { const first: any = subsOfSection(sec.key as any)[0]; setManualSection(sec.key); setSector(first?.sector || '') }}
                            className={`min-h-[44px] px-3 rounded-lg text-[13px] font-semibold border-2 transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            <span className="me-1"><Glyph e={sec.icon} /></span>{L(sec.en, sec.ur, sec.ar)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                    <div className="relative mb-3">
                      <span className="absolute inset-y-0 start-3 my-auto h-5 w-5 text-gray-500 grid place-items-center"><Glyph e="🔍" /></span>
                      <input id="lp-search" type="text" value={psearch} onChange={e => setPsearch(e.target.value)} className="input-field ps-10 bg-white"
                        placeholder={L('Search a material (e.g. tiles, cement, cables)…', 'مال تلاش کریں (مثلاً ٹائلیں، سیمنٹ، تاریں)…', 'ابحث عن مادة (مثل: بلاط، أسمنت، أسلاك)…')} />
                    </div>
                    {psq ? (
                      <div className="flex flex-wrap gap-2">
                        {subResults.length ? subResults.map((x: any) => {
                          const on = product === x.ar && sector === x.sector
                          return <button key={x.sector + x.key} type="button" onClick={() => pick(x)} className={chipCls(on)}>{on ? <Check className="w-4 h-4" aria-hidden /> : <Glyph e={x.icon || '📦'} />} {subLabel(x)}</button>
                        }) : <p className="text-xs text-gray-600">{L('No match. Type it manually.', 'کوئی نتیجہ نہیں، خود لکھیں۔', 'لا نتائج، اكتبها يدوياً.')}</p>}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-2" role="group" aria-label={L('Sections', 'سیکشن', 'الأقسام')}>
                          {BROWSE_SECTIONS.map(sec => (
                            <button key={sec.key} type="button" aria-pressed={psection === sec.key} onClick={() => setPsection(psection === sec.key ? '' : sec.key)}
                              className={`min-h-[44px] px-3 rounded-lg text-[13px] font-semibold border-2 transition-all ${psection === sec.key ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              <span className="me-1"><Glyph e={sec.icon} /></span>{L(sec.en, sec.ur, sec.ar)}
                            </button>
                          ))}
                        </div>
                        {psection && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                            {sectionSubs.map((x: any) => {
                              const on = product === x.ar && sector === x.sector
                              const ic = (SUB_CATEGORIES as any)[x.sector]?.[x.key]?.icon || '📦'
                              return <button key={x.sector + x.key} type="button" onClick={() => pick(x)} className={chipCls(on)}>{on ? <Check className="w-4 h-4" aria-hidden /> : <Glyph e={ic} />} {subLabel(x)}</button>
                            })}
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <span className="text-[13px] text-gray-600">{product ? <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-[#0B2438]" aria-hidden /><span className="font-bold text-[#0B2438]">{nameOf({ product_name: product, sector })}</span></span> : L('Pick a material above', 'اوپر سے مال منتخب کریں', 'اختر مادة من الأعلى')}</span>
                      <button type="button" onClick={() => { setProductOther(true); setSector(''); setManualSection('') }} className="inline-flex items-center min-h-[44px] px-2 text-xs font-semibold text-[#8F6820]"><Glyph e="✏" /> {L('Type manually', 'خود لکھیں', 'اكتب يدوياً')}</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="lp-unit" className="block text-xs font-bold text-gray-600 mb-1">{T.unit}</label>
                <select id="lp-unit" value={unit} onChange={e => setUnit(e.target.value)} className="input-field" required>
                  <option value="">{T.selectUnit}</option>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{getUnitLabel(u, locale) || u}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="lp-price" className="block text-xs font-bold text-gray-600 mb-1">{noVat ? L('Final price (SAR)', 'حتمی قیمت (ریال)', 'السعر النهائي (ر.س)') : T.price}</label>
                <input id="lp-price" type="text" inputMode="decimal" value={price} onChange={e => setPrice(latinNum(e.target.value))}
                  className="input-field text-base sm:text-sm" placeholder="2750" required aria-describedby="lp-price-hint" />
                <p id="lp-price-hint" className="text-[12px] text-gray-500 mt-1">{noVat ? L('Enter the final price the buyer pays; nothing is added to it.', 'وہ حتمی قیمت درج کریں جو خریدار ادا کرے گا؛ اس پر کچھ شامل نہیں ہوگا۔', 'أدخل السعر النهائي الذي يدفعه المشتري، ولا يُضاف إليه شيء.') : L('Enter the final price the buyer pays, including 15% VAT.', 'وہ حتمی قیمت درج کریں جو خریدار ادا کرے گا، 15% VAT سمیت۔', 'أدخل السعر النهائي الذي يدفعه المشتري، شاملاً الضريبة 15%.')}</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="lp-region" className="block text-xs font-bold text-gray-600 mb-1">{T.region}</label>
                <select id="lp-region" value={region} onChange={e => setRegion(e.target.value)} className="input-field">
                  <option value="">{T.selectRegion}</option>
                  {REGIONS.map(r => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl font-extrabold text-[#071827] text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {saving ? T.saving : T.save}
              </button>
              <button type="button" onClick={() => setShowForm(false)} aria-label={L('Close', 'بند کریں', 'إغلاق')}
                className="min-h-[44px] px-5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600"><X className="w-4 h-4" aria-hidden /></button>
            </div>
          </form>
        )}

        {/* My prices */}
        {loadFailed && <LoadError onRetry={() => { setLoading(true); load() }} className="mb-4" />}
        {loadFailed && prices.length === 0 ? null : prices.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
            <div className="text-5xl mb-3 animate-float"><Glyph e="📈" /></div>
            <h3 className="font-bold mb-1" style={{ color: '#0B2438' }}>{T.noPrices}</h3>
            <p className="text-sm text-gray-500">{T.noPricesSub}</p>
            {!showForm && <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center mt-4 min-h-[44px] px-5 rounded-xl text-sm font-extrabold text-[#071827]" style={{ background: '#D4A543' }}>{L('Add your first material', 'اپنا پہلا مال شامل کریں', 'أضف أول مادة')}</button>}
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>{T.myPrices} <span className="ms-1 inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-[#0B2438]/10 text-[12px]">{prices.length}</span></h2>
            {prices.length > 8 && (
              <input type="search" value={listQ} onChange={e => setListQ(e.target.value)} className="input-field text-base sm:text-sm"
                aria-label={L('Search my prices', 'میری قیمتیں تلاش کریں', 'ابحث في أسعاري')} placeholder={L('Search my prices…', 'میری قیمتیں تلاش کریں…', 'ابحث في أسعاري…')} />
            )}
            {(() => { const q = normalizeText(listQ.trim()).toLowerCase(); return q && !prices.some((p: any) => normalizeText([p.product_name, nameOf(p)].join(' ')).toLowerCase().includes(q)) })() && (
              <p className="text-sm text-gray-600 text-center py-4">{L('No saved price matches this search.', 'اس تلاش سے کوئی محفوظ قیمت نہیں ملتی۔', 'لا يوجد سعر محفوظ يطابق هذا البحث.')}</p>
            )}
            {prices.filter((p: any) => { const q = normalizeText(listQ.trim()).toLowerCase(); return !q || normalizeText([p.product_name, nameOf(p)].join(' ')).toLowerCase().includes(q) }).map(p => {
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold" style={{ color: '#0B2438' }}>{nameOf(p)}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                        <span className="badge text-[12px] bg-[#0B2438]/5 text-[#0B2438]">{sectionLabelOf(p.sector, keyOf(p), locale) || secLabel(p.sector)}</span>
                        {p.region && <span><Glyph e="📍" /> {getRegionLabel(p.region, locale)}</span>}
                        <span><Glyph e="🕐" /> {T.lastUpdate}: {timeAgoText(p.updated_at, locale)}</span>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="text-xl font-bold" style={{ color: '#0B2438' }}>{p.price?.toLocaleString('en-US')}</div>
                      <div className="text-[12px] text-gray-500">{L('SAR', 'ریال', 'ر.س')} / {getUnitLabel(p.unit, locale) || p.unit}</div>
                      {noVat != null && <div className="text-[12px] text-gray-500">{noVat ? L('final price', 'حتمی قیمت', 'سعر نهائي') : L('incl. VAT', 'VAT سمیت', 'شامل الضريبة')}</div>}
                      {p.previous_price && Number(p.previous_price) !== Number(p.price) && <div className="text-[12px] text-gray-500">{L('was', 'پہلے', 'كان')} {Number(p.previous_price).toLocaleString('en-US')}</div>}
                    </div>
                  </div>
                  {/* Quick update (round-4 UX-143: controlled, with a clear answer) */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <input type="text" inputMode="decimal" placeholder={String(p.price ?? '')} aria-label={L('New price', 'نئی قیمت', 'السعر الجديد')} className="input-field text-base sm:text-sm flex-1 min-w-0"
                      value={upd[p.id] ?? ''} onChange={e => { const v = latinNum(e.target.value); setUpd(u => ({ ...u, [p.id]: v })); setUpdMsg(m => { const n = { ...m }; delete n[p.id]; return n }) }}
                      onKeyDown={e => { if (e.key === 'Enter') updatePrice(p.id, p.price, upd[p.id] ?? '') }} />
                    <button onClick={() => updatePrice(p.id, p.price, upd[p.id] ?? '')}
                      className="min-h-[44px] px-4 rounded-lg text-[13px] font-semibold text-white" style={{ background: '#0B2438' }}>
                      {T.update}
                    </button>
                    <button onClick={() => deletePrice(p.id)} aria-label={L('Delete price', 'قیمت حذف کریں', 'حذف السعر')}
                      className="min-h-[44px] w-11 grid place-items-center rounded-lg text-sm border border-red-200 text-[#B42318] hover:bg-red-50"><Glyph e="🗑" /></button>
                  </div>
                  {updMsg[p.id] && <p role={updMsg[p.id].ok ? 'status' : 'alert'} className={`mt-1.5 text-[13px] font-semibold ${updMsg[p.id].ok ? 'text-[#0F6E56]' : 'text-[#B42318]'}`}>{updMsg[p.id].text}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
