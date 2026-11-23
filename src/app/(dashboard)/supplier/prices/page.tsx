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
// Arabic-Indic / Persian digits and «٫» from Arabic and Urdu keyboards → 12.5 (type=number refused them silently)
const latinNum = (v: string) => String(v ?? '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '')

const txt = {
  ar: {
    title: 'أسعاري', sub: 'أسعارك المحفوظة خاصة بك — لا يراها المشترون ولا المنافسون، وتُعبَّأ تلقائياً عند تسعير الطلبات',
    back: '→ رجوع', addPrice: '+ إضافة سلعة', myPrices: 'أسعاري المحفوظة',
    product: 'اسم السلعة', sector: 'القطاع', unit: 'الوحدة', price: 'السعر (ر.س)',
    region: 'المنطقة', selectSector: 'اختر القطاع', selectUnit: 'الوحدة', selectRegion: 'كل المناطق',
    save: 'حفظ السعر', saving: 'جارٍ الحفظ...', update: 'تحديث', updated: 'تم التحديث',
    noPrices: 'لم تحفظ أي أسعار بعد', noPricesSub: 'احفظ أسعار ما تبيعه لتُعبَّأ تلقائياً في عروضك',
    lastUpdate: 'آخر تحديث', delete: 'حذف', edit: 'تعديل', loading: 'جارٍ التحميل...',
    hint: 'أضف أسعار منتجاتك هنا — تبقى خاصة بك، وتُعبَّأ تلقائياً وقت تسعير طلبات المشترين (توفّر وقتك)',
    justNow: 'الآن', minsAgo: 'دقيقة', hoursAgo: 'ساعة', daysAgo: 'يوم', ago: 'قبل',
    confirmDelete: 'حذف هذه السلعة؟',
  },
  en: {
    title: 'My prices', sub: 'Your saved prices are private — buyers and competitors never see them; they prefill your offers',
    back: '← Back', addPrice: '+ Add Item', myPrices: 'My saved prices',
    product: 'Product Name', sector: 'Sector', unit: 'Unit', price: 'Price (SAR)',
    region: 'Region', selectSector: 'Select sector', selectUnit: 'Unit', selectRegion: 'All regions',
    save: 'Save price', saving: 'Saving...', update: 'Update', updated: 'Updated',
    noPrices: 'No saved prices yet', noPricesSub: 'Save the prices of what you sell to prefill your offers',
    lastUpdate: 'Last update', delete: 'Delete', edit: 'Edit', loading: 'Loading...',
    hint: 'Add your product prices here — they stay private and prefill your offers (saves time)',
    justNow: 'now', minsAgo: 'min', hoursAgo: 'h', daysAgo: 'd', ago: '',
    confirmDelete: 'Delete this item?',
  },
  ur: {
    title: 'میری قیمتیں', sub: 'آپ کی محفوظ قیمتیں نجی ہیں — خریدار اور حریف نہیں دیکھتے؛ یہ آفر میں خود بھر جاتی ہیں',
    back: '→ واپس', addPrice: '+ آئٹم شامل کریں', myPrices: 'میری محفوظ قیمتیں',
    product: 'پروڈکٹ کا نام', sector: 'شعبہ', unit: 'یونٹ', price: 'قیمت (ریال)',
    region: 'علاقہ', selectSector: 'شعبہ منتخب کریں', selectUnit: 'یونٹ', selectRegion: 'تمام علاقے',
    save: 'قیمت محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', update: 'اپ ڈیٹ', updated: 'اپ ڈیٹ ہو گیا',
    noPrices: 'ابھی کوئی محفوظ قیمت نہیں', noPricesSub: 'جو بیچتے ہیں اس کی قیمتیں محفوظ کریں تاکہ آفر خود بھر جائے',
    lastUpdate: 'آخری اپ ڈیٹ', delete: 'حذف', edit: 'ترمیم', loading: 'لوڈ ہو رہا ہے...',
    hint: 'اپنی چیزوں کی قیمتیں یہاں شامل کریں — یہ نجی رہتی ہیں اور آفر میں خود بھر جاتی ہیں',
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
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [region, setRegion] = useState('')
  // UX-121: a team member saves prices for the company (acting_uid), and every result is said
  const [actId, setActId] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false) // UX-083: a failed load is never «no saved prices»
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
  const psq = psearch.trim().toLowerCase()
  const subResults = psq.length >= 1 ? allSubs.filter(x => (x.ar + ' ' + x.en).toLowerCase().includes(psq)).slice(0, 60) : []

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
    const { data: act } = await supabase.rpc('acting_uid')
    const aid: string = (act as any) || session.user.id
    setActId(aid)
    const { data, error } = await supabase.from('live_prices').select('*')
      .eq('supplier_id', aid).order('updated_at', { ascending: false })
    setLoadFailed(!!error)
    if (!error) setPrices(data || [])
    setLoading(false)
  }
  const failMsg = () => setMsg({ ok: false, text: L('Could not save — please try again.', 'محفوظ نہیں ہو سکا — دوبارہ کوشش کریں۔', 'تعذّر الحفظ، حاول مرة أخرى.') })

  async function handleSave(e: any) {
    e.preventDefault()
    setMsg(null)
    if (!product || !sector || !unit || !(parseFloat(price) > 0)) { setMsg({ ok: false, text: L('Choose the item, the unit and the price.', 'آئٹم، یونٹ اور قیمت منتخب کریں۔', 'اختر السلعة والوحدة والسعر.') }); return }
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
    setProduct(''); setSector(''); setUnit(''); setPrice(''); setRegion(''); setPgroup(''); setPsearch(''); setProductOther(false)
    setShowForm(false)
    setMsg({ ok: true, text: dup ? L('The current price was updated.', 'موجودہ قیمت اپ ڈیٹ ہو گئی۔', 'حُدّث السعر الحالي.') : L('Price saved. It will fill in automatically when you price a matching request.', 'قیمت محفوظ ہو گئی۔ مماثل درخواست کی قیمت دیتے وقت یہ خود بھر جائے گی۔', 'حُفظ السعر، وسيُعبَّأ تلقائياً عند تسعير طلب مطابق.') })
    load()
  }

  async function updatePrice(id: any, oldPrice: any, newPrice: any) {
    setMsg(null)
    const np = parseFloat(latinNum(newPrice))
    if (!(np > 0) || np === Number(oldPrice)) return
    const supabase = createClient()
    const { error } = await supabase.from('live_prices').update({
      price: np, previous_price: oldPrice, updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { console.error('live_prices update', error); failMsg(); return }
    setMsg({ ok: true, text: T.updated })
    load()
  }

  async function deletePrice(id: any) {
    if (!(await askConfirm(T.confirmDelete, { danger: true, okLabel: L('Yes, delete', 'ہاں، حذف کریں', 'نعم، احذف'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('live_prices').delete().eq('id', id)
    if (error) { failMsg(); return }
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

        <div className="bg-[#0B2438]/5 border border-[#0B2438]/15 rounded-xl p-3 mb-5 text-sm text-[#0B2438]">{T.hint}</div>
        {msg && <div role={msg.ok ? 'status' : 'alert'} className={`rounded-xl p-3 mb-4 text-sm font-semibold border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg.text}</div>}

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full mb-5 min-h-[44px] py-3 rounded-xl font-semibold text-white text-sm transition-all hover:shadow-lg"
            style={{ background: '#0B2438' }}>
            {T.addPrice}
          </button>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* Sector first — the item list depends on it */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{T.sector}</label>
                <select value={sector} onChange={e => { setSector(e.target.value); setProduct(''); setProductOther(false); setPgroup(''); setPsearch('') }} className="input-field" required>
                  <option value="">{T.selectSector}</option>
                  {Object.keys(SECTOR_LABELS).map(s => <option key={s} value={s}>{secLabel(s)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">{T.product}</label>
                {!sector ? (
                  <input disabled className="input-field" placeholder={L('Select a sector first', 'پہلے شعبہ منتخب کریں', 'اختر القطاع أولاً')} />
                ) : productOther ? (
                  <div className="flex gap-2">
                    <input value={product} onChange={e => setProduct(e.target.value)} className="input-field flex-1"
                      placeholder={L('Item name', 'چیز کا نام', 'اسم السلعة')} required />
                    <button type="button" onClick={() => { setProductOther(false); setProduct('') }} className="text-xs text-gray-500 whitespace-nowrap px-2"><Glyph e="↩" /> {L('List', 'فہرست', 'القائمة')}</button>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                    {/* بحث */}
                    <div className="relative mb-3">
                      <span className="absolute inset-y-0 start-3 my-auto h-5 w-5 text-gray-500 grid place-items-center"><Glyph e="🔍" /></span>
                      <input type="text" value={psearch} onChange={e => setPsearch(e.target.value)} className="input-field ps-10 bg-white"
                        placeholder={L('Search an item…', 'کوئی چیز تلاش کریں…', 'ابحث عن سلعة…')} aria-label={L('Search an item', 'کوئی چیز تلاش کریں', 'ابحث عن سلعة')} />
                    </div>

                    {psq ? (
                      <div className="flex flex-wrap gap-2">
                        {subResults.length ? subResults.map(x => (
                          <button key={x.key} type="button" onClick={() => { setProduct(x.ar); setUnit('') }}
                            className={`inline-flex items-center gap-1 min-h-[44px] px-3 rounded-full text-[13px] font-medium border-2 transition-all ${product === x.ar ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{product === x.ar ? <Check className="w-4 h-4" aria-hidden /> : <Glyph e={x.icon} />} {subLabel(x)}</button>
                        )) : <p className="text-xs text-gray-500">{L('No match. Type it manually.', 'کوئی نتیجہ نہیں، خود لکھیں۔', 'لا نتائج، اكتبها يدوياً.')}</p>}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {subGroups.map(g => (
                            <button key={g.group} type="button" onClick={() => setPgroup(g.group)}
                              className={`min-h-[44px] px-3 rounded-lg text-[13px] font-semibold border-2 transition-all ${pgroup === g.group ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              <span className="me-1"><Glyph e={g.icon} /></span>{subLabel(g)} <span className="opacity-60">({g.subs.length})</span>
                            </button>
                          ))}
                        </div>
                        {activeSubGroup && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                            {activeSubGroup.subs.map(x => (
                              <button key={x.key} type="button" onClick={() => { setProduct(x.ar); setUnit('') }}
                                className={`inline-flex items-center gap-1 min-h-[44px] px-3 rounded-full text-[13px] font-medium border-2 transition-all ${product === x.ar ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{product === x.ar ? <Check className="w-4 h-4" aria-hidden /> : <Glyph e={x.icon} />} {subLabel(x)}</button>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <span className="text-[13px] text-gray-600">{product ? <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-[#0B2438]" aria-hidden /><span className="font-bold text-[#0B2438]">{product}</span></span> : L('Pick an item above', 'اوپر سے کوئی چیز منتخب کریں', 'اختر سلعة من الأعلى')}</span>
                      <button type="button" onClick={() => { setProductOther(true) }} className="text-xs font-semibold text-[#8F6820]"><Glyph e="✏" /> {L('Type manually', 'خود لکھیں', 'اكتب يدوياً')}</button>
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
                <label htmlFor="lp-price" className="block text-xs font-bold text-gray-600 mb-1">{T.price}</label>
                <input id="lp-price" type="text" inputMode="decimal" value={price} onChange={e => setPrice(latinNum(e.target.value))}
                  className="input-field text-base sm:text-sm" placeholder="2750" required />
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
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>{T.myPrices} <span className="ms-1 inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-[#0B2438]/10 text-[12px]">{prices.length}</span></h2>
            {prices.map(p => {
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold" style={{ color: '#0B2438' }}>{p.product_name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                        <span className="badge text-[12px] bg-[#0B2438]/5 text-[#0B2438]">{secLabel(p.sector)}</span>
                        {p.region && <span><Glyph e="📍" /> {getRegionLabel(p.region, locale)}</span>}
                        <span><Glyph e="🕐" /> {T.lastUpdate}: {timeAgoText(p.updated_at, locale)}</span>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="text-xl font-bold" style={{ color: '#0B2438' }}>{p.price?.toLocaleString('en-US')}</div>
                      <div className="text-[12px] text-gray-500">{L('SAR', 'ریال', 'ر.س')} / {getUnitLabel(p.unit, locale) || p.unit}</div>
                      {p.previous_price && Number(p.previous_price) !== Number(p.price) && <div className="text-[12px] text-gray-500">{L('was', 'پہلے', 'كان')} {Number(p.previous_price).toLocaleString('en-US')}</div>}
                    </div>
                  </div>
                  {/* Quick update */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <input type="text" inputMode="decimal" placeholder={String(p.price ?? '')} aria-label={L('New price', 'نئی قیمت', 'السعر الجديد')} className="input-field text-base sm:text-sm flex-1"
                      onKeyDown={e => { if (e.key === 'Enter') { updatePrice(p.id, p.price, e.currentTarget.value); e.currentTarget.value = '' } }}
                      id={`upd-${p.id}`} />
                    <button onClick={() => { const v = (document.getElementById(`upd-${p.id}`) as any)?.value; updatePrice(p.id, p.price, v) }}
                      className="min-h-[44px] px-4 rounded-lg text-[13px] font-semibold text-white" style={{ background: '#0B2438' }}>
                      {T.update}
                    </button>
                    <button onClick={() => deletePrice(p.id)} aria-label={L('Delete price', 'قیمت حذف کریں', 'حذف السعر')}
                      className="min-h-[44px] w-11 grid place-items-center rounded-lg text-sm border border-red-200 text-red-500 hover:bg-red-50"><Glyph e="🗑" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
