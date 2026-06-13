// @ts-nocheck
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, SECTOR_PRODUCTS, UNIT_OPTIONS, REGIONS, CITIES_BY_REGION, getProductLabel, detectSubCategory, getGroupedProducts, getProductSpecs } from '@/types'
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
  const [items, setItems] = useState<any[]>([]) // المواد المضافة للطلب (يسمح بقطاعات مختلفة)
  const [rfqName, setRfqName] = useState('')      // اسم التسعيرة (اختياري)
  const [draftTiers, setDraftTiers] = useState<string[]>([]) // نوع المورد لهذه المادة
  const [manualEntry, setManualEntry] = useState(false) // كتابة اسم المادة يدوياً
  const [step, setStep] = useState(1)             // 1: المواد · 2: تفاصيل التسليم
  const [pickupScope, setPickupScope] = useState<'any' | 'city'>('any') // للاستلام: أي مكان / مدينة محددة
  const [geoMsg, setGeoMsg] = useState('')        // حالة تحديد الموقع الآلي
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
  const unitSpec = specFields.find((f: any) => f.key === 'unit') // وحدة الطلب من المواصفات (إن وُجدت)
  const effectiveUnit = unitSpec ? (specs[unitSpec.key] || '') : unit
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
    const sf = getProductSpecs(productName)
    const uSpec = sf.find(f => f.key === 'unit')
    const effUnit = uSpec ? (specs[uSpec.key] || '') : unit // الوحدة من المواصفات إن وُجدت، وإلا من خانة الوحدة
    if (!sector || !productName || !quantity || !effUnit) return null
    // نستثني وحدة الطلب من نص المواصفات (صارت هي الوحدة، مو سطر مواصفة)
    const specStr = sf.filter(f => f.key !== 'unit').map(f => (specs[f.key] ? `${f.ar}: ${specs[f.key]}` : null)).filter(Boolean).join('، ')
    const fullItemSpec = [specStr, specification].filter(Boolean).join(' — ')
    return {
      sector,
      product_name: productName,
      sub_category: detectSubCategory(`${productName} ${specStr}`, sector),
      specification: fullItemSpec || null,
      quantity: parseFloat(quantity),
      unit: effUnit,
      supplier_tiers: draftTiers.length > 0 ? draftTiers : null,
      in_stock: inStockOnly,
      max_days: maxDeliveryDays ? parseInt(maxDeliveryDays) : null,
      specsObj: { ...specs }, // نسخة خام للمواصفات لإتاحة التعديل لاحقاً
      specFileObj: specFile,  // ملف مواصفات هذه المادة (يُرفع عند الإرسال)
      spec_file_name: specFile ? specFile.name : null,
    }
  }
  function resetDraft() {
    setProductName(''); setSpecs({}); setQuantity(''); setUnit(''); setGroup(''); setProductSearch(''); setSpecification(''); setDraftTiers([]); setManualEntry(false)
    setInStockOnly(false); setMaxDeliveryDays(''); setSpecFile(null)
  }
  function addItem() {
    const it = buildDraftItem()
    if (!it) return
    setItems(prev => [...prev, it])
    resetDraft() // نُبقي القطاع لتسهيل إضافة مادة أخرى من نفسه
  }
  function editItem(i: number) {
    const it = items[i]
    if (!it) return
    setSector(it.sector); setProductName(it.product_name); setSpecs(it.specsObj || {})
    setQuantity(String(it.quantity)); setUnit(it.unit || ''); setDraftTiers(it.supplier_tiers || [])
    setInStockOnly(it.in_stock || false); setMaxDeliveryDays(it.max_days ? String(it.max_days) : ''); setSpecFile(it.specFileObj || null)
    const known = getGroupedProducts(it.sector).some((g: any) => g.items.includes(it.product_name))
    setSpecification(''); setGroup(''); setProductSearch(''); setManualEntry(!known)
    setItems(prev => prev.filter((_, idx) => idx !== i))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function toggleDraftTier(tier: string) {
    setDraftTiers(prev => prev.includes(tier) ? prev.filter(x => x !== tier) : [...prev, tier])
  }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function geolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeoMsg(locale === 'en' ? 'Geolocation not supported' : 'المتصفح لا يدعم تحديد الموقع'); return }
    setGeoMsg(locale === 'en' ? 'Locating…' : 'جارٍ تحديد الموقع…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const link = `https://maps.google.com/?q=${latitude},${longitude}`
        setGeoMsg(locale === 'en' ? 'Reading city…' : 'جارٍ قراءة المدينة…')
        try {
          const r = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`)
          const d = await r.json()
          if (d.ok) {
            // طابق المنطقة من نتيجة الخرائط مع مناطقنا (يزيل كلمة "منطقة")
            const geoR = String(d.region || '').replace('منطقة', '').trim()
            const matchedRegion = REGIONS.find((rr: string) => geoR.includes(rr) || rr.includes(geoR) || String(d.region || '').includes(rr))
            let cityName = ''
            if (matchedRegion) {
              const cities = CITIES_BY_REGION[matchedRegion] || []
              const geoCity = String(d.city || '').replace(/^(محافظة|بلدية)\s*/, '').trim()
              // 1) مطابقة مباشرة، 2) المدينة التي تحمل اسم المنطقة (العاصمة عادةً)، 3) أول مدينة
              const mc = cities.find((c: any) => c.ar === geoCity || (geoCity && (geoCity.includes(c.ar) || c.ar.includes(geoCity))))
                || cities.find((c: any) => c.ar === matchedRegion)
                || cities[0]
              setRegion(matchedRegion); setCity(mc ? mc.ar : '')
              cityName = mc ? mc.ar : (matchedRegion)
            } else { cityName = d.city || d.region || '' }
            setDeliveryLocation(d.formatted || link)
            setGeoMsg(`${locale === 'en' ? 'Location set ✓' : 'تم تحديد موقعك ✓'}${cityName ? ` — ${cityName}` : ''}`)
            return
          }
        } catch {}
        // بدون مفتاح خرائط أو فشل القراءة — نحفظ الرابط فقط
        setDeliveryLocation(link)
        setGeoMsg(locale === 'en' ? 'Location set ✓ (city not detected)' : 'تم تحديد موقعك ✓ (تعذّرت قراءة المدينة)')
      },
      () => setGeoMsg(locale === 'en' ? 'Could not get location (check permission)' : 'تعذّر تحديد الموقع (تحقق من الصلاحية)'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    // على الخطوة 1: التالي بدل الإرسال (يمنع إرسال مبكر بالضغط على Enter)
    if (step === 1) { if (items.length > 0 || buildDraftItem()) setStep(2); return }
    if (!user) return
    // المواد النهائية = القائمة + المسودّة الحالية (لو معبّأة) — يسمح بطلب مادة واحدة بدون "إضافة"
    const draft = buildDraftItem()
    const finalItems = draft ? [...items, draft] : [...items]
    if (finalItems.length === 0) { setError(locale === 'en' ? 'Add at least one material' : 'أضف مادة واحدة على الأقل'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString()

    // رفع ملف مواصفات كل مادة (إن وُجد) وبناء قائمة قابلة للحفظ (بدون كائنات الملفات)
    const serializableItems: any[] = []
    for (let idx = 0; idx < finalItems.length; idx++) {
      const it: any = finalItems[idx]
      let spec_file_url = null
      if (it.specFileObj) {
        try {
          const ext = it.specFileObj.name.split('.').pop()
          const path = `${user.id}/item-${Date.now()}-${idx}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, it.specFileObj, { upsert: true })
          if (up) { const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(up.path); spec_file_url = publicUrl }
        } catch {}
      }
      const { specFileObj, ...rest } = it
      serializableItems.push({ ...rest, spec_file_url })
    }

    // الأعمدة المفردة تعكس أول مادة (توافق رجعي)؛ القائمة الكاملة في items
    const first = serializableItems[0]
    const summaryName = serializableItems.length > 1
      ? `${first.product_name} +${serializableItems.length - 1} ${locale === 'en' ? 'more' : 'أصناف أخرى'}`
      : first.product_name
    // أنواع الموردين = اتحاد أنواع كل المواد (للوصول/الإشعار)
    const unionTiers = Array.from(new Set(serializableItems.flatMap((it: any) => it.supplier_tiers || [])))
    const isPickupAny = !deliveryRequired && pickupScope === 'any'

    const { error: insertError } = await supabase.from('rfqs').insert({
      contractor_id: user.id, sector: first.sector, product_name: summaryName,
      title: rfqName || null,
      sub_category: first.sub_category,
      specification: first.specification, quantity: first.quantity, unit: first.unit,
      items: serializableItems,
      region: isPickupAny ? (region || 'كل المناطق') : region,
      city: isPickupAny ? null : (city || null), delivery_required: deliveryRequired, vat_invoice_required: vatRequired,
      delivery_location: deliveryRequired ? (deliveryLocation || null) : null,
      hide_identity: hideIdentity,
      target_tiers: unionTiers.length > 0 ? unionTiers : null,
      verified_only: verifiedOnly,
      nearby_only: nearbyOnly,
      target_regions: (!nearbyOnly && targetRegions.length > 0) ? targetRegions : null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      notes: notes || null,
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
            <button onClick={() => { setSuccess(false); setSector(''); setProductName(''); setQuantity(''); setUnit(''); setRegion(''); setCity(''); setNotes(''); setSpecification(''); setItems([]); setGroup(''); setProductSearch(''); setRfqName(''); setDraftTiers([]); setManualEntry(false); setStep(1) }}
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{t.title}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t.sub}</p>
        </div>

        {/* مؤشّر الخطوات */}
        <div className="flex items-center gap-3 mb-6 max-w-md">
          {[{ n: 1, lbl: locale === 'en' ? 'Materials' : 'المواد' }, { n: 2, lbl: locale === 'en' ? 'Request details' : 'تفاصيل الطلب' }].map((st, idx) => (
            <div key={st.n} className="flex items-center gap-3 flex-1">
              <div className={`flex items-center gap-2 ${step === st.n ? 'text-[#d96f15]' : step > st.n ? 'text-emerald-600' : 'text-gray-400'}`}>
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${step === st.n ? 'bg-[#F5831F] text-white' : step > st.n ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{step > st.n ? '✓' : st.n}</span>
                <span className="text-sm font-bold whitespace-nowrap">{st.lbl}</span>
              </div>
              {idx === 0 && <div className="flex-1 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-5">
              {step === 1 && (<>
              {/* اسم التسعيرة (اختياري) */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <label className="block font-bold mb-2" style={{ color: '#1B2D5B' }}>
                  {locale === 'en' ? 'Request name' : 'اسم التسعيرة'} <span className="text-xs font-normal text-gray-400">({locale === 'en' ? 'optional' : 'اختياري'})</span>
                </label>
                <input type="text" value={rfqName} onChange={e => setRfqName(e.target.value)}
                  className="input-field" placeholder={locale === 'en' ? 'e.g. Tiling package, Ceiling materials…' : 'مثال: تسعيرة بلاط، مواد سقف…'} />
              </div>

              {/* Sector */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.sector}{items.length > 0 && <span className="text-[11px] font-normal text-gray-400"> · {locale === 'en' ? 'pick a sector for the next material' : 'اختر قطاع المادة التالية'}</span>}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(sectors).map(s => {
                    return (
                    <button key={s} type="button" onClick={() => { setSector(s); setGroup(''); setProductName(''); setSpecs({}); setProductSearch('') }}
                      className={`p-3 rounded-2xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5 ${sector === s ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'}`}>
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
                            <button key={p} type="button" onClick={() => { setProductName(p); setSpecs({}); setManualEntry(false) }}
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
                              <button key={p} type="button" onClick={() => { setProductName(p); setSpecs({}); setManualEntry(false) }}
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

                  {/* الكتابة اليدوية: تظهر فقط في وضع "اكتبها" أو عند عدم اختيار مادة */}
                  {manualEntry ? (
                    <div className="pt-3 border-t border-gray-100 mb-1">
                      <p className="text-xs font-bold text-gray-400 mb-2">{locale === 'en' ? 'Type the exact material' : 'اكتب اسم المادة بدقّة'}</p>
                      <div className="flex gap-2">
                        <input type="text" value={productName} onChange={e => { setProductName(e.target.value); setSpecs({}) }} autoFocus
                          className="input-field flex-1" placeholder={t.orType} />
                        <button type="button" onClick={() => { setManualEntry(false); setProductName(''); setSpecs({}) }}
                          className="text-xs text-gray-500 whitespace-nowrap px-2 hover:text-[#1B2D5B]">↩ {locale === 'en' ? 'List' : 'القائمة'}</button>
                      </div>
                    </div>
                  ) : !productName ? (
                    <div className="pt-3 border-t border-gray-100 mb-1">
                      <button type="button" onClick={() => { setManualEntry(true); setProductName(''); setSpecs({}) }}
                        className="text-xs font-bold text-[#d96f15] hover:underline">✍️ {locale === 'en' ? "Didn't find it? Type it manually" : 'ما لقيت المادة؟ اكتبها يدوياً'}</button>
                    </div>
                  ) : null}

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

                  {/* مواصفات إضافية حرّة (مثل تفاصيل الخلطة) */}
                  {productName && (
                    <div className="pt-3 border-t border-gray-100 mb-1">
                      <p className="text-xs font-bold text-gray-400 mb-1.5">📝 {locale === 'en' ? 'Extra specs (optional)' : 'مواصفات إضافية (اختياري)'}</p>
                      <input type="text" value={specification} onChange={e => setSpecification(e.target.value)}
                        className="input-field" placeholder={locale === 'en' ? 'Any extra details for suppliers…' : 'أي تفاصيل إضافية للمورد…'} />
                    </div>
                  )}

                  {/* الكمية + الوحدة — مدمجة مع المادة (تظهر بعد اختيار المادة) */}
                  {productName && (
                    <div className="pt-3 border-t border-gray-100 mt-1 animate-fade-in">
                      <p className="text-xs font-bold text-[#1B2D5B] mb-2">📦 {locale === 'en' ? 'Required quantity' : 'الكمية المطلوبة'}</p>
                      {unitSpec ? (
                        // الوحدة محدّدة فوق في المواصفات (وحدة الطلب) — نطلب الرقم فقط
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">
                            {t.qtyLabel} <span className="text-gray-400 font-normal">({specs[unitSpec.key] || (locale === 'en' ? 'choose unit above' : 'اختر وحدة الطلب فوق')})</span>
                          </label>
                          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                            className="input-field" placeholder="50" min="0" step="any" />
                        </div>
                      ) : (
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
                      )}
                      {/* نوع المورد لهذه المادة (اختياري) */}
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-400 mb-2">{locale === 'en' ? 'Who should price this? (optional)' : 'مين يسعّر هذه المادة؟ (اختياري)'}</p>
                        <div className="flex flex-wrap gap-2">
                          {[{ key: 'manufacturer', icon: '🏭', label: t.tierMfg }, { key: 'commercial', icon: '🏪', label: t.tierCom }, { key: 'local', icon: '🏬', label: t.tierLoc }].map(tier => {
                            const on = draftTiers.includes(tier.key)
                            return (
                              <button key={tier.key} type="button" onClick={() => toggleDraftTier(tier.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${on ? 'border-[#F5831F] bg-[#F5831F]/5 text-[#d96f15]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                {on ? '✓ ' : ''}{tier.icon} {tier.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {/* توفّر/توريد + ملف مواصفات — لهذه المادة (كل مادة لمورد مختلف) */}
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                          <span className="text-xs font-bold text-gray-600">⚡ {locale === 'en' ? 'Require this item in stock (urgent)' : 'اشترط توفّر هذه المادة فورياً (مستعجل)'}</span>
                          <div onClick={() => setInStockOnly(!inStockOnly)} className="w-11 h-6 rounded-full transition-all cursor-pointer flex items-center px-1 shrink-0" style={{ background: inStockOnly ? '#0F6E56' : '#d1d5db', justifyContent: inStockOnly ? 'flex-end' : 'flex-start' }}>
                            <div className="w-4 h-4 bg-white rounded-full shadow" />
                          </div>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">⏱ {locale === 'en' ? 'Max delivery (days)' : 'أقصى مدة توريد (أيام)'}</label>
                            <input type="number" value={maxDeliveryDays} onChange={e => setMaxDeliveryDays(e.target.value)} className="input-field" placeholder={locale === 'en' ? 'e.g. 7' : '7'} min="0" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">📎 {locale === 'en' ? 'Spec file (optional)' : 'ملف مواصفات (اختياري)'}</label>
                            {specFile ? (
                              <div className="input-field flex items-center gap-2 text-xs">
                                <span className="truncate flex-1" title={specFile.name}>{specFile.name}</span>
                                <button type="button" onClick={() => setSpecFile(null)} className="text-red-400 shrink-0">✕</button>
                              </div>
                            ) : (
                              <label className="input-field flex items-center gap-2 cursor-pointer text-xs text-gray-400">
                                📎 {locale === 'en' ? 'Attach' : 'إرفاق ملف'}
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={e => setSpecFile(e.target.files?.[0] ?? null)} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      <button type="button" onClick={addItem} disabled={!productName || !quantity || !effectiveUnit}
                        className="mt-4 w-full py-3.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg disabled:cursor-not-allowed transition-all"
                        style={{ background: (!productName || !quantity || !effectiveUnit) ? '#9ca3af' : '#F5831F' }}>
                        ➕ {locale === 'en' ? 'Add this material to the list' : 'أضف هذه المادة إلى القائمة'}
                      </button>
                      {(!productName || !quantity || !effectiveUnit) && (
                        <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                          {locale === 'en' ? 'Complete the material, quantity and order unit to enable adding.' : 'أكمل المادة + الكمية + وحدة الطلب لتفعيل الإضافة.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}


              </>)}

              {step === 2 && (<>
              {/* جدول المواد المفصّل (مع تعديل) */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1B2D5B' }}>🧾 {locale === 'en' ? 'Materials summary' : 'ملخّص المواد'} <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5831F]/10 text-[#d96f15] font-bold">{items.length}</span></h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-start py-2 font-bold">#</th>
                        <th className="text-start py-2 font-bold">{locale === 'en' ? 'Material' : 'المادة'}</th>
                        <th className="text-start py-2 font-bold">{locale === 'en' ? 'Qty' : 'الكمية'}</th>
                        <th className="text-start py-2 font-bold">{locale === 'en' ? 'Specs' : 'المواصفات'}</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i} className="border-b border-gray-50 align-top">
                          <td className="py-2.5 text-gray-400">{i + 1}</td>
                          <td className="py-2.5">
                            <div className="font-bold text-[#1B2D5B]">{getProductLabel(it.product_name, locale)}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{sectors[it.sector] || it.sector}</span>
                              {(it.supplier_tiers || []).map((tr: string) => <span key={tr} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{tr === 'manufacturer' ? '🏭' : tr === 'commercial' ? '🏪' : '🏬'}</span>)}
                              {it.in_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">⚡</span>}
                              {it.max_days && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">⏱{it.max_days}</span>}
                              {(it.specFileObj || it.spec_file_url) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">📎</span>}
                            </div>
                          </td>
                          <td className="py-2.5 font-bold text-[#d96f15] whitespace-nowrap">{it.quantity} {it.unit}</td>
                          <td className="py-2.5 text-xs text-gray-500 max-w-[160px]">{it.specification || '—'}</td>
                          <td className="py-2.5 whitespace-nowrap text-end">
                            <button type="button" onClick={() => { editItem(i); setStep(1) }} className="text-xs font-semibold text-[#1B2D5B] hover:underline px-1">✎ {locale === 'en' ? 'Edit' : 'تعديل'}</button>
                            <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-400 hover:underline px-1">🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{locale === 'en' ? 'No materials. Go back to add some.' : 'لا مواد — ارجع لإضافتها.'}</p>}
              </div>

              {/* Location */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.location}</h3>

                {/* توصيل أو استلام (السعر يختلف) */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button type="button" onClick={() => setDeliveryRequired(true)}
                    className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${deliveryRequired ? 'border-[#F5831F] bg-[#F5831F]/5 text-[#d96f15]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    🚚 {locale === 'en' ? 'Delivery to site' : 'توصيل للموقع'}
                  </button>
                  <button type="button" onClick={() => setDeliveryRequired(false)}
                    className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${!deliveryRequired ? 'border-[#1B2D5B] bg-[#1B2D5B]/5 text-[#1B2D5B]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    🏬 {locale === 'en' ? 'Pickup from supplier' : 'استلام من المورد'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mb-4">💡 {locale === 'en' ? 'Price differs between delivery and pickup.' : 'السعر يختلف بين التوصيل والاستلام.'}</p>

                {/* استلام: نطاق الموردين (أي مكان / مدينة محددة) */}
                {!deliveryRequired && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button type="button" onClick={() => setPickupScope('any')}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${pickupScope === 'any' ? 'border-[#1B2D5B] bg-[#1B2D5B]/5 text-[#1B2D5B]' : 'border-gray-200 text-gray-600'}`}>
                      🇸🇦 {locale === 'en' ? 'Anywhere in KSA' : 'أي مكان بالسعودية'}
                    </button>
                    <button type="button" onClick={() => setPickupScope('city')}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${pickupScope === 'city' ? 'border-[#1B2D5B] bg-[#1B2D5B]/5 text-[#1B2D5B]' : 'border-gray-200 text-gray-600'}`}>
                      📍 {locale === 'en' ? 'A specific city' : 'مدينة محددة'}
                    </button>
                  </div>
                )}

                {/* المنطقة + المدينة: تظهر للتوصيل دائماً، وللاستلام فقط عند "مدينة محددة" */}
                {(deliveryRequired || pickupScope === 'city') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.region} *</label>
                      <select value={region} onChange={e => { setRegion(e.target.value); setCity('') }} className="input-field" required>
                        <option value="">{t.regionDefault}</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.city} *</label>
                      <select value={city} onChange={e => setCity(e.target.value)} className="input-field" required disabled={!region}>
                        <option value="">{region ? (locale === 'en' ? '— Select city —' : '— اختر المدينة —') : '—'}</option>
                        {(CITIES_BY_REGION[region] || []).map((c: any) => <option key={c.ar} value={c.ar}>{locale === 'en' ? c.en : c.ar}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {!deliveryRequired && pickupScope === 'any' && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">🇸🇦 {locale === 'en' ? 'Your request reaches suppliers across all regions.' : 'طلبك يوصل لموردين في كل مناطق السعودية.'}</p>
                )}

                {deliveryRequired && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-amber-800">🚚 {locale === 'en' ? 'District / address (optional)' : 'الحي / عنوان الموقع (اختياري)'}</label>
                      <button type="button" onClick={geolocate} className="text-[11px] font-bold text-[#1B2D5B] bg-white border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-100">📍 {locale === 'en' ? 'Auto-locate' : 'تحديد موقعي تلقائياً'}</button>
                    </div>
                    <input type="text" value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)}
                      className="input-field"
                      placeholder={locale === 'en' ? 'District / site address / nearest landmark' : locale === 'ur' ? 'علاقہ / سائٹ کا پتہ' : 'الحي / عنوان الموقع / أقرب معلم'} />
                    {geoMsg && <p className="text-[11px] text-amber-700 mt-1">{geoMsg}</p>}
                    <p className="text-[11px] text-amber-700 mt-1">
                      {locale === 'en' ? 'Helps suppliers calculate the shipping cost accurately.' : 'يساعد الموردين على حساب تكلفة الشحن بدقة.'}
                    </p>
                  </div>
                )}
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
              </>)}
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {step === 1 && (<>
              {/* 🧾 المواد المطلوبة */}
              <div className="bg-white rounded-2xl p-5 border-2 border-[#F5831F]/30 shadow-sm">
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#1B2D5B' }}>
                  🧾 {locale === 'en' ? 'Requested materials' : 'المواد المطلوبة'}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5831F]/10 text-[#d96f15] font-bold">{items.length}</span>
                </h3>
                {items.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                    <div className="text-2xl mb-1">📋</div>
                    <p className="text-xs text-gray-400">{locale === 'en' ? 'No materials yet. Configure one and press “Add to list”.' : 'لا مواد بعد. جهّز مادة واضغط "أضف هذه المادة إلى القائمة".'}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((it, i) => {
                      const tierLabel = (tr: string) => tr === 'manufacturer' ? t.tierMfg : tr === 'commercial' ? t.tierCom : t.tierLoc
                      return (
                        <div key={i} className="rounded-xl border border-gray-100 p-3 hover:border-[#F5831F]/40 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[13px] text-[#1B2D5B] leading-snug">{i + 1}. {getProductLabel(it.product_name, locale)}</div>
                              <div className="text-[13px] font-bold text-[#d96f15] mt-0.5">{it.quantity} {it.unit}</div>
                              {it.specification && <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{it.specification}</div>}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{sectors[it.sector] || it.sector}</span>
                                {(it.supplier_tiers || []).map((tr: string) => (
                                  <span key={tr} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{tr === 'manufacturer' ? '🏭' : tr === 'commercial' ? '🏪' : '🏬'} {tierLabel(tr)}</span>
                                ))}
                                {it.in_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">⚡ {locale === 'en' ? 'in stock' : 'توفّر فوري'}</span>}
                                {it.max_days && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">⏱ {it.max_days}{locale === 'en' ? 'd' : 'ي'}</span>}
                                {(it.specFileObj || it.spec_file_url) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">📎 {locale === 'en' ? 'file' : 'ملف'}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button type="button" onClick={() => editItem(i)} title={locale === 'en' ? 'Edit' : 'تعديل'} className="w-7 h-7 grid place-items-center rounded-lg text-[#1B2D5B] hover:bg-gray-100 text-sm">✎</button>
                              <button type="button" onClick={() => removeItem(i)} title={locale === 'en' ? 'Delete' : 'حذف'} className="w-7 h-7 grid place-items-center rounded-lg text-red-400 hover:bg-red-50 text-sm">🗑</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button type="button" onClick={() => { if (items.length > 0) setStep(2) }} disabled={items.length === 0}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ background: '#F5831F' }}>
                {locale === 'en' ? 'Next: request details →' : 'التالي: تفاصيل الطلب ←'}
              </button>
              {items.length === 0 && <p className="text-[11px] text-gray-400 text-center">{locale === 'en' ? 'Add at least one material to continue.' : 'أضف مادة واحدة على الأقل للمتابعة.'}</p>}
              </>)}

              {step === 2 && (<>
              {/* Target supplier types + verified-only */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'Supplier filters' : 'تصفية الموردين'}</h3>
                <p className="text-xs text-gray-400 mb-4">{locale === 'en' ? 'Supplier type is chosen per material above. These apply to the whole request.' : 'نوع المورد يُحدّد لكل مادة بالأعلى. هذي الخيارات تنطبق على الطلب كامل.'}</p>
                <div className="flex items-center justify-between">
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
                    { label: locale === 'en' ? 'Name' : 'الاسم', value: rfqName || t.na },
                    { label: locale === 'en' ? 'Materials' : 'عدد المواد', value: String(items.length + (buildDraftItem() ? 1 : 0)) },
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
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="px-5 py-4 rounded-xl font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                  ↩ {locale === 'en' ? 'Back' : 'رجوع'}
                </button>
                <button type="submit" disabled={loading || (items.length === 0 && !buildDraftItem()) || ((deliveryRequired || pickupScope === 'city') && (!region || !city))}
                  className="flex-1 py-4 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg active:scale-[0.98]"
                  style={{ background: '#F5831F' }}>
                  {loading ? t.submitting : t.submit}
                </button>
              </div>
              {((deliveryRequired || pickupScope === 'city') && (!region || !city)) && (
                <p className="text-[11px] text-gray-400 text-center">{locale === 'en' ? 'Choose region + city to send.' : 'اختر المنطقة + المدينة للإرسال.'}</p>
              )}
              </>)}
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
