// @ts-nocheck
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, SECTOR_PRODUCTS, UNIT_OPTIONS, REGIONS, getProductLabel, detectSubCategory, getGroupedProducts, getProductSpecs } from '@/types'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { useTranslation } from '@/i18n'

const txt = {
  ar: {
    title: 'طلب تسعير جديد', sub: 'سيُرسل تلقائياً لجميع الموردين المعتمدين في المنطقة',
    back: '← رجوع للوحة التحكم', sector: 'القطاع *', product: 'المادة / المنتج *',
    orType: 'أو اكتب اسم المادة', qty: 'الكمية والمواصفات *', qtyLabel: 'الكمية',
    unitLabel: 'وحدة القياس', unitDefault: 'اختر الوحدة', specLabel: 'المواصفة / القياس',
    specHint: 'مثال: قطر 16mm، جهد 450V، درجة B500', location: 'موقع التسليم *',
    region: 'المنطقة', regionDefault: 'اختر المنطقة', city: 'المدينة (اختياري)',
    cityHint: 'اسم المدينة', specFile: 'رفع ملف المواصفات',
    specFileSub: 'ارفع جدول الكميات أو المواصفات التقنية — سيصل للموردين مع الطلب',
    specFileBtn: 'اضغط لرفع ملف المواصفات', specFileHint: 'PDF، Excel، Word، صورة — حجم أقصى 10MB',
    removeFile: 'إزالة الملف', notes: 'ملاحظات إضافية',
    notesHint: 'مثال: التسليم داخل الموقع، فاتورة ضريبية مطلوبة...',
    options: 'خيارات الطلب', delivery: 'التوصيل مطلوب', deliverySub: 'التوصيل لموقع المشروع',
    vat: 'فاتورة ضريبية', vatSub: 'فاتورة ضريبية رسمية مطلوبة',
    hide: 'إخفاء هوية شركتي', hideSub: 'لن يعرف الموردون اسمك',
    validity: 'صلاحية الطلب', summary: 'ملخص الطلب',
    sumSector: 'القطاع', sumProduct: 'المنتج', sumQty: 'الكمية', sumRegion: 'المنطقة', sumValidity: 'الصلاحية',
    week: 'أسبوع', hours: 'ساعة', submit: 'إرسال طلب التسعير ←', submitting: 'جارٍ الإرسال...',
    successTitle: 'تم إرسال طلب التسعير', successSub: 'سيتم إخطار الموردين في قطاعك فوراً',
    dashboard: 'لوحة التحكم', anotherReq: 'طلب آخر', na: '—',
    targetTitle: 'لمن تريد إرسال الطلب؟', targetSub: 'اختر نوع الموردين — اتركه فارغاً للجميع',
    tierMfg: 'مصنع / مورد رئيسي', tierMfgD: 'إنتاج أو توريد بكميات كبيرة للمشاريع',
    tierCom: 'مورد تجاري', tierComD: 'توريد بكميات متوسطة ومنتظمة',
    tierLoc: 'مورد محلي', tierLocD: 'بكميات صغيرة إلى متوسطة وخدمة مباشرة',
    verifiedTitle: 'الموثّقون فقط', verifiedSub: 'استقبل عروضاً من الموردين الموثّقين فقط ✓',
  },
  en: {
    title: 'New RFQ Request', sub: 'Will be sent automatically to all verified suppliers in the region',
    back: '← Back to Dashboard', sector: 'Sector *', product: 'Material / Product *',
    orType: 'Or type material name', qty: 'Quantity & Specifications *', qtyLabel: 'Quantity',
    unitLabel: 'Unit of Measure', unitDefault: 'Select unit', specLabel: 'Specification / Size',
    specHint: 'Example: 16mm diameter, 450V, Grade B500', location: 'Delivery Location *',
    region: 'Region', regionDefault: 'Select region', city: 'City (optional)',
    cityHint: 'City name', specFile: 'Upload Specification File',
    specFileSub: 'Upload BOQ or technical specs — will be sent to suppliers with the request',
    specFileBtn: 'Click to upload specification file', specFileHint: 'PDF, Excel, Word, Image — max 10MB',
    removeFile: 'Remove file', notes: 'Additional Notes',
    notesHint: 'Example: delivery to site, tax invoice required...',
    options: 'Request Options', delivery: 'Delivery Required', deliverySub: 'Delivery to project site',
    vat: 'Tax Invoice', vatSub: 'Official tax invoice required',
    hide: 'Hide my company identity', hideSub: 'Suppliers will not see your name',
    validity: 'Request Validity', summary: 'Request Summary',
    sumSector: 'Sector', sumProduct: 'Product', sumQty: 'Quantity', sumRegion: 'Region', sumValidity: 'Validity',
    week: 'Week', hours: 'hours', submit: 'Send RFQ →', submitting: 'Sending...',
    successTitle: 'RFQ Sent Successfully', successSub: 'Suppliers in your sector will be notified immediately',
    dashboard: 'Dashboard', anotherReq: 'Another Request', na: '—',
    targetTitle: 'Who should receive this?', targetSub: 'Pick supplier types — leave empty for all',
    tierMfg: 'Factory / Major', tierMfgD: 'Production or bulk supply for projects',
    tierCom: 'Commercial Supplier', tierComD: 'Regular medium-volume supply',
    tierLoc: 'Local Supplier', tierLocD: 'Small to medium quantities, direct service',
    verifiedTitle: 'Verified only', verifiedSub: 'Receive offers from verified suppliers only ✓',
  },
  ur: {
    title: 'نئی قیمت کی درخواست', sub: 'خطے میں تمام تصدیق شدہ سپلائرز کو خودکار طور پر بھیجی جائے گی',
    back: '← ڈیش بورڈ پر واپس', sector: 'شعبہ *', product: 'مواد / پروڈکٹ *',
    orType: 'یا مواد کا نام لکھیں', qty: 'مقدار اور وضاحت *', qtyLabel: 'مقدار',
    unitLabel: 'پیمائش کی اکائی', unitDefault: 'اکائی منتخب کریں', specLabel: 'وضاحت / سائز',
    specHint: 'مثال: 16mm قطر، 450V', location: 'ڈیلیوری مقام *',
    region: 'علاقہ', regionDefault: 'علاقہ منتخب کریں', city: 'شہر (اختیاری)',
    cityHint: 'شہر کا نام', specFile: 'وضاحت فائل اپلوڈ کریں',
    specFileSub: 'BOQ یا تکنیکی وضاحت اپلوڈ کریں',
    specFileBtn: 'فائل اپلوڈ کرنے کے لیے کلک کریں', specFileHint: 'PDF، Excel، Word، تصویر — زیادہ سے زیادہ 10MB',
    removeFile: 'فائل ہٹائیں', notes: 'اضافی نوٹس',
    notesHint: 'مثال: سائٹ پر ڈیلیوری، ٹیکس رسید درکار...',
    options: 'درخواست کے اختیارات', delivery: 'ڈیلیوری ضروری', deliverySub: 'پروجیکٹ سائٹ پر ڈیلیوری',
    vat: 'ٹیکس رسید', vatSub: 'سرکاری ٹیکس رسید درکار',
    hide: 'میری کمپنی کی شناخت چھپائیں', hideSub: 'سپلائرز آپ کا نام نہیں دیکھیں گے',
    validity: 'درخواست کی میعاد', summary: 'درخواست کا خلاصہ',
    sumSector: 'شعبہ', sumProduct: 'پروڈکٹ', sumQty: 'مقدار', sumRegion: 'علاقہ', sumValidity: 'میعاد',
    week: 'ہفتہ', hours: 'گھنٹے', submit: 'قیمت کی درخواست بھیجیں →', submitting: 'بھیجا جا رہا ہے...',
    successTitle: 'درخواست کامیابی سے بھیجی گئی', successSub: 'سپلائرز کو فوری طور پر مطلع کیا جائے گا',
    dashboard: 'ڈیش بورڈ', anotherReq: 'دوسری درخواست', na: '—',
    targetTitle: 'یہ کس کو بھیجیں؟', targetSub: 'سپلائر کی قسم منتخب کریں — سب کے لیے خالی چھوڑیں',
    tierMfg: 'فیکٹری / بڑا', tierMfgD: 'پروجیکٹس کے لیے بڑی سپلائی',
    tierCom: 'تجارتی سپلائر', tierComD: 'باقاعدہ درمیانی سپلائی',
    tierLoc: 'مقامی سپلائر', tierLocD: 'چھوٹی تا درمیانی مقدار، براہ راست خدمت',
    verifiedTitle: 'صرف تصدیق شدہ', verifiedSub: 'صرف تصدیق شدہ سپلائرز سے آفرز ✓',
  },
}

const sectorLabels = {
  ar: { civil: 'مدني', architectural: 'معماري', electrical: 'كهرباء', mechanical: 'ميكانيك', equipment: 'آليات ومعدات', supply_store: 'محل توريد' },
  en: { civil: 'Civil', architectural: 'Architectural', electrical: 'Electrical', mechanical: 'Mechanical', equipment: 'Machinery', supply_store: 'Supply Store' },
  ur: { civil: 'سول', architectural: 'تعمیراتی', electrical: 'برقی', mechanical: 'مکینیکل', equipment: 'مشینری', supply_store: 'سپلائی اسٹور' },
}

// Sector visual identity — colored tile + white SVG glyph + EN code (matches design)
const sectorMeta: Record<string, { color: string; en: string }> = {
  civil:         { color: '#1B2D5B', en: 'CIVIL' },
  architectural: { color: '#7C3AED', en: 'ARCH' },
  electrical:    { color: '#F5831F', en: 'ELEC' },
  mechanical:    { color: '#0F8A6E', en: 'MECH' },
  equipment:     { color: '#6B5B4F', en: 'EQUIP' },
  supply_store:  { color: '#C026D3', en: 'STORE' },
}
function SectorGlyph({ s }: { s: string }) {
  const cls = 'w-5 h-5'
  const sp: any = { fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (s) {
    case 'electrical': return <svg viewBox="0 0 24 24" className={cls} {...sp}><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" /></svg>
    case 'mechanical': return <svg viewBox="0 0 24 24" className={cls} {...sp}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>
    case 'architectural': return <svg viewBox="0 0 24 24" className={cls} {...sp}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
    case 'equipment': return <svg viewBox="0 0 24 24" className={cls} {...sp}><path d="M3 17V8h11v9M14 12h4l2 5M3 17h17" /><circle cx="7" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></svg>
    case 'supply_store': return <svg viewBox="0 0 24 24" className={cls} {...sp}><path d="M4 9 5 4h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6" /></svg>
    default: return <svg viewBox="0 0 24 24" className={cls} {...sp}><path d="M4 21V6l8-3 8 3v15M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" /></svg>
  }
}

export default function NewRFQPage() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const sectors = sectorLabels[locale] || sectorLabels.ar
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sector, setSector] = useState('')
  const [group, setGroup] = useState('')
  const [productName, setProductName] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [specs, setSpecs] = useState<Record<string, string>>({})
  const [items, setItems] = useState<any[]>([]) // المواد المضافة للطلب (نفس القطاع)
  const [specification, setSpecification] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [deliveryRequired, setDeliveryRequired] = useState(true)
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [vatRequired, setVatRequired] = useState(true)
  const [hideIdentity, setHideIdentity] = useState(false)
  const [notes, setNotes] = useState('')
  const [validityHours, setValidityHours] = useState(48)
  const [specFile, setSpecFile] = useState(null)
  const [specFileUrl, setSpecFileUrl] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  // التوفّر والتوريد
  const [inStockOnly, setInStockOnly] = useState(false)
  const [maxDeliveryDays, setMaxDeliveryDays] = useState('')
  // استهداف نوع الموردين + الموثّقون فقط
  const [targetTiers, setTargetTiers] = useState<string[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const [targetRegions, setTargetRegions] = useState<string[]>([])

  // التصفّح المتدرّج: القطاع → المجموعة → النوع
  const groups = useMemo(() => (sector ? getGroupedProducts(sector) : []), [sector])
  const activeGroup = groups.find(g => g.group === group)
  const groupLabel = (g: any) => (locale === 'en' ? g.en : locale === 'ur' ? g.ur : g.ar)
  const specFields = getProductSpecs(productName)
  // بحث سريع فوق التصنيفات: يفلتر كل مواد القطاع عبر المجموعات
  const allItems = useMemo(() => groups.flatMap(g => g.items), [groups])
  const q = productSearch.trim().toLowerCase()
  const searchResults = q.length >= 1
    ? allItems.filter(p => (p + ' ' + getProductLabel(p, 'en')).toLowerCase().includes(q)).slice(0, 60)
    : []

  function toggleTier(tier: string) {
    setTargetTiers(prev => prev.includes(tier) ? prev.filter(x => x !== tier) : [...prev, tier])
  }

  // يبني المادة الحالية من المسودّة (المادة + المواصفات + الكمية)؛ null لو ناقصة
  function buildDraftItem() {
    if (!productName || !quantity || !unit) return null
    const sf = getProductSpecs(productName)
    const specStr = sf.map(f => (specs[f.key] ? `${f.ar}: ${specs[f.key]}` : null)).filter(Boolean).join('، ')
    const fullItemSpec = [specStr, specification].filter(Boolean).join(' — ')
    return {
      product_name: productName,
      sub_category: detectSubCategory(`${productName} ${specStr}`, sector),
      specification: fullItemSpec || null,
      quantity: parseFloat(quantity),
      unit,
    }
  }
  function addItem() {
    const it = buildDraftItem()
    if (!it) return
    setItems(prev => [...prev, it])
    setProductName(''); setSpecs({}); setQuantity(''); setUnit(''); setGroup(''); setProductSearch(''); setSpecification('')
  }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user || !sector) return
    // المواد النهائية = القائمة + المسودّة الحالية (لو معبّأة) — يسمح بطلب مادة واحدة بدون "إضافة"
    const draft = buildDraftItem()
    const finalItems = draft ? [...items, draft] : [...items]
    if (finalItems.length === 0) { setError(locale === 'en' ? 'Add at least one material' : 'أضف مادة واحدة على الأقل'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString()

    // Upload spec file if exists
    let uploadedSpecUrl = null
    if (specFile) {
      const ext = specFile.name.split('.').pop()
      const path = `${user.id}/spec-${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage.from('licenses').upload(path, specFile, { upsert: true })
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(uploadData.path)
        uploadedSpecUrl = publicUrl
      }
    }

    // التوفّر/التوريد على مستوى الطلب كامل → يُحفظ في الملاحظات
    const reqLines: string[] = []
    if (inStockOnly) reqLines.push('⚡ مطلوب توفّر فوري للمواد')
    if (maxDeliveryDays) reqLines.push(`⏱ أقصى مدة توريد: ${maxDeliveryDays} يوم`)
    const baseNotes = [reqLines.join('، '), notes].filter(Boolean).join(' — ')
    const finalNotes = uploadedSpecUrl ? `${baseNotes}\n[مواصفات مرفقة: ${uploadedSpecUrl}]` : (baseNotes || null)

    // الأعمدة المفردة تعكس أول مادة (توافق رجعي)؛ القائمة الكاملة في items
    const first = finalItems[0]
    const summaryName = finalItems.length > 1
      ? `${first.product_name} +${finalItems.length - 1} ${locale === 'en' ? 'more' : 'أصناف أخرى'}`
      : first.product_name

    const { error: insertError } = await supabase.from('rfqs').insert({
      contractor_id: user.id, sector, product_name: summaryName,
      sub_category: first.sub_category,
      specification: first.specification, quantity: first.quantity, unit: first.unit,
      items: finalItems,
      region,
      city: city || null, delivery_required: deliveryRequired, vat_invoice_required: vatRequired,
      delivery_location: deliveryRequired ? (deliveryLocation || null) : null,
      hide_identity: hideIdentity,
      target_tiers: targetTiers.length > 0 ? targetTiers : null,
      verified_only: verifiedOnly,
      nearby_only: nearbyOnly,
      target_regions: (!nearbyOnly && targetRegions.length > 0) ? targetRegions : null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      notes: finalNotes,
      expires_at: expiresAt,
    })
    if (insertError) { setError(`خطأ: ${insertError.message}`); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f6f9' }} dir={dir}>
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6" style={{ background: '#1B2D5B' }}>✅</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#1B2D5B' }}>{t.successTitle}</h2>
          <p className="text-gray-500 mb-8">{t.successSub}</p>
          <div className="flex gap-3">
            <a href="/contractor" className="flex-1 py-3 rounded-xl font-semibold text-white text-center" style={{ background: '#1B2D5B' }}>{t.dashboard}</a>
            <button onClick={() => { setSuccess(false); setSector(''); setProductName(''); setQuantity(''); setUnit(''); setRegion(''); setCity(''); setNotes(''); setSpecification(''); setItems([]); setGroup(''); setProductSearch('') }}
              className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
              {t.anotherReq}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell title={t.title} nav={getNav('contractor', locale, '/contractor/rfq/new')} dir={dir}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{t.title}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t.sub}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-5">
              {/* Sector */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.sector}{items.length > 0 && <span className="text-[11px] font-normal text-gray-400"> · {locale === 'en' ? 'locked (same sector for all items)' : 'مقفل — كل المواد من نفس القطاع'}</span>}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(sectors).map(s => {
                    const locked = items.length > 0 && s !== sector
                    return (
                    <button key={s} type="button" disabled={locked} onClick={() => { if (locked) return; setSector(s); setGroup(''); setProductName(''); setSpecs({}); setProductSearch('') }}
                      className={`p-3 rounded-2xl border-2 text-center transition-all duration-200 ${locked ? 'opacity-30 cursor-not-allowed' : 'hover:-translate-y-0.5'} ${sector === s ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="w-11 h-11 mx-auto mb-2 rounded-xl grid place-items-center shadow-sm" style={{ background: sectorMeta[s]?.color || '#1B2D5B' }}>
                        <SectorGlyph s={s} />
                      </div>
                      <div className={`text-sm font-bold ${sector === s ? 'text-[#F5831F]' : 'text-gray-700'}`}>{sectors[s]}</div>
                      <div className="text-[10px] font-semibold tracking-wide text-gray-400">{sectorMeta[s]?.en}</div>
                    </button>
                  ) })}
                </div>
              </div>

              {/* Product — cascading browse: المجموعة → النوع → كتابة يدوية */}
              {sector && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in">
                  <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.product}</h3>

                  {/* بحث سريع فوق التصنيفات */}
                  <div className="relative mb-4">
                    <span className="absolute inset-y-0 start-3 my-auto h-5 w-5 text-gray-400 grid place-items-center">🔍</span>
                    <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      className="input-field ps-10" placeholder={locale === 'en' ? 'Search a material…' : locale === 'ur' ? 'مواد تلاش کریں…' : 'ابحث عن مادة…'} />
                  </div>

                  {q ? (
                    /* نتائج البحث (مسطّحة عبر كل المجموعات) */
                    <div className="mb-4 animate-fade-in">
                      {searchResults.length ? (
                        <div className="flex flex-wrap gap-2">
                          {searchResults.map(p => (
                            <button key={p} type="button" onClick={() => { setProductName(p); setSpecs({}) }}
                              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${productName === p ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                              style={productName === p ? { background: '#1B2D5B' } : {}}>
                              {getProductLabel(p, locale)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">{locale === 'en' ? 'No match — type it manually below.' : 'لا توجد نتائج — اكتب اسم المادة يدوياً بالأسفل.'}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* المستوى الثاني: المجموعات */}
                      <p className="text-xs font-bold text-gray-400 mb-2">{locale === 'en' ? '1) Pick a group' : locale === 'ur' ? '۱) گروپ منتخب کریں' : '١) اختر المجموعة'}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {groups.map(g => (
                          <button key={g.group} type="button" onClick={() => { setGroup(g.group); setProductName(''); setSpecs({}) }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${group === g.group ? 'border-[#F5831F] bg-[#F5831F]/5 text-[#d96f15]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            <span className="me-1">{g.icon}</span>{groupLabel(g)}
                            <span className="text-[11px] opacity-60"> ({g.items.length})</span>
                          </button>
                        ))}
                      </div>

                      {/* المستوى الثالث: الأنواع داخل المجموعة */}
                      {activeGroup && (
                        <div className="pt-3 border-t border-gray-100 mb-4 animate-fade-in">
                          <p className="text-xs font-bold text-gray-400 mb-2">{locale === 'en' ? '2) Pick the type' : locale === 'ur' ? '۲) قسم منتخب کریں' : '٢) اختر النوع'}</p>
                          <div className="flex flex-wrap gap-2">
                            {activeGroup.items.map(p => (
                              <button key={p} type="button" onClick={() => { setProductName(p); setSpecs({}) }}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${productName === p ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                style={productName === p ? { background: '#1B2D5B' } : {}}>
                                {getProductLabel(p, locale)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ما لقيت المادة؟ اكتبها هنا (احتياطي قريب من المواد) */}
                  <div className="pt-3 border-t border-gray-100 mb-1">
                    <p className="text-xs font-bold text-gray-400 mb-2">{locale === 'en' ? "Didn't find it? Type the exact material" : locale === 'ur' ? 'نہیں ملی؟ مواد لکھیں' : 'ما لقيت المادة؟ اكتب اسمها بدقّة'}</p>
                    <input type="text" value={productName} onChange={e => { setProductName(e.target.value); setSpecs({}) }}
                      className="input-field" placeholder={t.orType} />
                  </div>

                  {/* مواصفات المنتج المنظّمة (لو المنتج له مواصفات معرّفة) */}
                  {specFields.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 mb-4 animate-fade-in">
                      <p className="text-xs font-bold text-[#d96f15] mb-2">⚙ {locale === 'en' ? 'Details (helps suppliers price precisely)' : locale === 'ur' ? 'تفصیلات' : 'حدّد المواصفات (يساعد الموردين يسعّرون بدقّة)'}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {specFields.map(f => (
                          <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{locale === 'en' ? f.en : f.ar}</label>
                            <select value={specs[f.key] || ''} onChange={e => setSpecs(s => ({ ...s, [f.key]: e.target.value }))} className="input-field">
                              <option value="">{locale === 'en' ? '— Select —' : '— اختر —'}</option>
                              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* الكمية + الوحدة — مدمجة مع المادة (تظهر بعد اختيار المادة) */}
                  {productName && (
                    <div className="pt-3 border-t border-gray-100 mt-1 animate-fade-in">
                      <p className="text-xs font-bold text-[#1B2D5B] mb-2">📦 {locale === 'en' ? 'Required quantity' : 'الكمية المطلوبة'}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.qtyLabel}</label>
                          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                            className="input-field" placeholder="50" min="0" step="any" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.unitLabel}</label>
                          <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field">
                            <option value="">{t.unitDefault}</option>
                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                      <button type="button" onClick={addItem} disabled={!productName || !quantity || !unit}
                        className="mt-3 w-full py-2.5 rounded-xl font-semibold text-sm border-2 border-dashed border-[#1B2D5B]/30 text-[#1B2D5B] disabled:opacity-40 hover:bg-[#1B2D5B]/5 transition-all">
                        ➕ {locale === 'en' ? 'Add this material & add another' : 'أضف هذه المادة وأضف غيرها'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* قائمة المواد المضافة */}
              {items.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in">
                  <h3 className="font-bold mb-3" style={{ color: '#1B2D5B' }}>🧾 {locale === 'en' ? 'Requested materials' : 'المواد المطلوبة'} ({items.length})</h3>
                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-[#1B2D5B]">{i + 1}. {getProductLabel(it.product_name, locale)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{it.quantity} {it.unit}{it.specification ? ` · ${it.specification}` : ''}</div>
                        </div>
                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-base shrink-0" aria-label="حذف">🗑</button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3">{locale === 'en' ? 'Add more above, or send the request below.' : 'أضف المزيد من الأعلى، أو أرسل الطلب من الأسفل.'}</p>
                </div>
              )}

              {/* Location */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.location}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.region}</label>
                    <select value={region} onChange={e => setRegion(e.target.value)} className="input-field" required>
                      <option value="">{t.regionDefault}</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.city}</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      className="input-field" placeholder={t.cityHint} />
                  </div>
                </div>
                {deliveryRequired && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <label className="block text-xs font-bold text-amber-800 mb-1.5">
                      🚚 {locale === 'en' ? 'Delivery location (for shipping cost) *' : locale === 'ur' ? 'ڈیلیوری مقام (شپنگ لاگت کے لیے) *' : 'موقع التوصيل (لحساب تكلفة الشحن) *'}
                    </label>
                    <input type="text" value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)}
                      className="input-field"
                      placeholder={locale === 'en' ? 'District / site address / nearest landmark' : locale === 'ur' ? 'علاقہ / سائٹ کا پتہ' : 'الحي / عنوان الموقع / أقرب معلم'} />
                    <p className="text-[11px] text-amber-700 mt-1">
                      {locale === 'en' ? 'Helps suppliers calculate the shipping cost accurately.' : locale === 'ur' ? 'سپلائرز کو شپنگ لاگت کا درست حساب لگانے میں مدد کرتا ہے۔' : 'يساعد الموردين على حساب تكلفة الشحن بدقة.'}
                    </p>
                  </div>
                )}
              </div>

              {/* التوفّر والتوريد */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-3" style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'Availability & delivery' : 'التوفّر والتوريد'}</h3>
                <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
                  <div>
                    <div className="text-sm font-semibold text-gray-700">⚡ {locale === 'en' ? 'Require items in stock (immediate supply)' : 'اشترط توفّر المواد للتوريد الفوري'}</div>
                    {inStockOnly && <p className="text-[11px] text-amber-600 mt-1">{locale === 'en' ? 'Note: fewer suppliers may match your request.' : 'ملاحظة: قد يقل عدد الموردين المطابقين لطلبك.'}</p>}
                  </div>
                  <div onClick={() => setInStockOnly(!inStockOnly)} className="w-11 h-6 rounded-full transition-all cursor-pointer flex items-center px-1 shrink-0 mt-0.5" style={{ background: inStockOnly ? '#0F6E56' : '#d1d5db', justifyContent: inStockOnly ? 'flex-end' : 'flex-start' }}>
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </label>
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">⏱ {locale === 'en' ? 'Max delivery time (days) — optional' : 'أقصى مدة للتوريد (أيام) — اختياري'}</label>
                  <input type="number" value={maxDeliveryDays} onChange={e => setMaxDeliveryDays(e.target.value)}
                    className="input-field" placeholder={locale === 'en' ? 'e.g. 7' : 'مثال: 7'} min="0" />
                </div>
              </div>

              {/* Spec File */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>{t.specFile}</h3>
                <p className="text-xs text-gray-400 mb-4">{t.specFileSub}</p>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${specFile ? 'border-[#1B2D5B] bg-[#1B2D5B]/5' : 'border-gray-200 hover:border-[#F5831F]/50'}`}>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                    onChange={e => setSpecFile(e.target.files?.[0] ?? null)} />
                  {specFile ? (
                    <div className="text-center">
                      <div className="text-3xl mb-2">📎</div>
                      <div className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>{specFile.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{(specFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      <button type="button" onClick={e => { e.preventDefault(); setSpecFile(null) }} className="mt-2 text-xs text-red-500 hover:underline">{t.removeFile}</button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl mb-2">📄</div>
                      <div className="font-semibold text-sm text-gray-700">{t.specFileBtn}</div>
                      <div className="text-xs text-gray-400 mt-1">{t.specFileHint}</div>
                    </div>
                  )}
                </label>
              </div>

              {/* Estimated Value */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>
                  {locale === 'en' ? 'Estimated Value (SAR)' : locale === 'ur' ? 'تخمینی قیمت (ریال)' : 'القيمة التقديرية (ر.س)'}
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  {locale === 'en' ? 'Optional — helps match you with suitable suppliers by capacity'
                  : locale === 'ur' ? 'اختیاری — مناسب سپلائرز سے ملانے میں مدد کرتا ہے'
                  : 'اختياري — يساعد في إيصال طلبك للموردين المناسبين لحجمك'}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { label: locale === 'en' ? '< 50K SAR' : 'أقل من 50,000', val: '50000' },
                    { label: locale === 'en' ? '50K–200K SAR' : '50,000–200,000', val: '200000' },
                    { label: locale === 'en' ? '200K–1M SAR' : '200,000–1,000,000', val: '1000000' },
                    { label: locale === 'en' ? '> 1M SAR' : 'أكثر من 1,000,000', val: '5000000' },
                  ].map(opt => (
                    <button key={opt.val} type="button" onClick={() => setEstimatedValue(opt.val)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        estimatedValue === opt.val ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'
                      }`} style={estimatedValue === opt.val ? { background: '#1B2D5B' } : {}}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)}
                  className="input-field" placeholder={locale === 'en' ? 'Or enter exact value...' : 'أو أدخل قيمة محددة...'} min="0" />
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.notes}</h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field" rows={4} placeholder={t.notesHint} />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Target supplier types + verified-only */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>{t.targetTitle}</h3>
                <p className="text-xs text-gray-400 mb-4">{t.targetSub}</p>
                <div className="space-y-2">
                  {[
                    { key: 'manufacturer', icon: '🏭', label: t.tierMfg, desc: t.tierMfgD },
                    { key: 'commercial', icon: '🏪', label: t.tierCom, desc: t.tierComD },
                    { key: 'local', icon: '🏬', label: t.tierLoc, desc: t.tierLocD },
                  ].map(tier => {
                    const active = targetTiers.includes(tier.key)
                    return (
                      <button key={tier.key} type="button" onClick={() => toggleTier(tier.key)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-start transition-all ${
                          active ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <span className="text-xl leading-none mt-0.5">{tier.icon}</span>
                        <span className="flex-1">
                          <span className={`block text-sm font-bold ${active ? 'text-[#F5831F]' : 'text-gray-700'}`}>{tier.label}</span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">{tier.desc}</span>
                        </span>
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${active ? 'bg-[#F5831F] border-[#F5831F] text-white' : 'border-gray-300'}`}>
                          {active && <span className="text-xs">✓</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{t.verifiedTitle}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.verifiedSub}</div>
                  </div>
                  <div onClick={() => setVerifiedOnly(!verifiedOnly)} className={`w-11 h-6 rounded-full transition-all cursor-pointer flex items-center px-1 shrink-0 ${verifiedOnly ? 'justify-end' : 'justify-start'}`}
                    style={{ background: verifiedOnly ? '#0F6E56' : '#e5e7eb' }}>
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">📍 {locale === 'en' ? 'Nearby only (same region)' : locale === 'ur' ? 'صرف قریب (اسی علاقہ)' : 'القريبون فقط (نفس المنطقة)'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{locale === 'en' ? 'Only suppliers in your region — closer, cheaper shipping' : locale === 'ur' ? 'صرف آپ کے علاقے کے سپلائرز' : 'موردو منطقتك فقط — أقرب وشحن أرخص'}</div>
                  </div>
                  <div onClick={() => setNearbyOnly(!nearbyOnly)} className={`w-11 h-6 rounded-full transition-all cursor-pointer flex items-center px-1 shrink-0 ${nearbyOnly ? 'justify-end' : 'justify-start'}`}
                    style={{ background: nearbyOnly ? '#1B2D5B' : '#e5e7eb' }}>
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>

                {/* 🗺 استهداف مناطق محددة (يبحث عن مورد فيها — يشمل فروع الموردين) */}
                {!nearbyOnly && (
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <div className="text-sm font-semibold text-gray-800 mb-1">🗺 {locale === 'en' ? 'Search specific regions (optional)' : locale === 'ur' ? 'مخصوص علاقے (اختیاری)' : 'ابحث في مناطق محددة (اختياري)'}</div>
                    <div className="text-xs text-gray-400 mb-2">{locale === 'en' ? 'Leave empty to reach suppliers in all regions. Matches a supplier if any of its branches is here.' : locale === 'ur' ? 'تمام علاقوں کے لیے خالی چھوڑیں۔' : 'اتركها فارغة للوصول لكل المناطق. يشمل الموردين الذين لهم فرع في المنطقة.'}</div>
                    <div className="flex flex-wrap gap-2">
                      {REGIONS.map(r => {
                        const on = targetRegions.includes(r)
                        return (
                          <button key={r} type="button"
                            onClick={() => setTargetRegions(on ? targetRegions.filter(x => x !== r) : [...targetRegions, r])}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${on ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                            style={on ? { background: '#1B2D5B' } : {}}>
                            {on ? '✓ ' : ''}{r}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.options}</h3>
                <div className="space-y-4">
                  {[
                    { label: t.delivery, sub: t.deliverySub, value: deliveryRequired, setter: setDeliveryRequired },
                    { label: t.vat, sub: t.vatSub, value: vatRequired, setter: setVatRequired },
                    { label: t.hide, sub: t.hideSub, value: hideIdentity, setter: setHideIdentity },
                  ].map(({ label, sub, value, setter }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                      </div>
                      <div onClick={() => setter(!value)} className={`w-11 h-6 rounded-full transition-all cursor-pointer flex items-center px-1 ${value ? 'justify-end' : 'justify-start'}`}
                        style={{ background: value ? '#1B2D5B' : '#e5e7eb' }}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validity */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.validity}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: `24 ${t.hours}`, hours: 24 }, { label: `48 ${t.hours}`, hours: 48 }, { label: `72 ${t.hours}`, hours: 72 }, { label: t.week, hours: 168 }].map(({ label, hours }) => (
                    <button key={hours} type="button" onClick={() => setValidityHours(hours)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${validityHours === hours ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'}`}
                      style={validityHours === hours ? { background: '#F5831F' } : {}}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl p-6" style={{ background: '#1B2D5B' }}>
                <h3 className="font-bold mb-4 text-white">{t.summary}</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: t.sumSector, value: sector ? sectors[sector] : t.na },
                    { label: t.sumProduct, value: productName || t.na },
                    { label: t.sumQty, value: quantity && unit ? `${quantity} ${unit}` : t.na },
                    { label: t.sumRegion, value: region || t.na },
                    { label: t.sumValidity, value: validityHours === 168 ? t.week : `${validityHours} ${t.hours}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-blue-200">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">⚠️ {error}</div>}
              <button type="submit" disabled={loading || !sector || !productName || !quantity || !unit || !region || (deliveryRequired && !deliveryLocation)}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ background: '#F5831F' }}>
                {loading ? t.submitting : t.submit}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
