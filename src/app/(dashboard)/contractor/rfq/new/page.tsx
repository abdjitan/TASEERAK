// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, SECTOR_PRODUCTS, UNIT_OPTIONS, REGIONS, getProductLabel, detectSubCategory } from '@/types'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
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

const sectorIcons = { civil: '🏗', architectural: '🏛', electrical: '⚡', mechanical: '⚙️', equipment: '🚜', supply_store: '🏪' }

export default function NewRFQPage() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const sectors = sectorLabels[locale] || sectorLabels.ar
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sector, setSector] = useState('')
  const [productName, setProductName] = useState('')
  const [specification, setSpecification] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [deliveryRequired, setDeliveryRequired] = useState(true)
  const [vatRequired, setVatRequired] = useState(true)
  const [hideIdentity, setHideIdentity] = useState(false)
  const [notes, setNotes] = useState('')
  const [validityHours, setValidityHours] = useState(48)
  const [specFile, setSpecFile] = useState(null)
  const [specFileUrl, setSpecFileUrl] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  // استهداف نوع الموردين + الموثّقون فقط
  const [targetTiers, setTargetTiers] = useState<string[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  function toggleTier(tier: string) {
    setTargetTiers(prev => prev.includes(tier) ? prev.filter(x => x !== tier) : [...prev, tier])
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
    if (!user || !sector) return
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

    const { error: insertError } = await supabase.from('rfqs').insert({
      contractor_id: user.id, sector, product_name: productName,
      sub_category: detectSubCategory(`${productName} ${specification}`, sector),
      specification: specification || null, quantity: parseFloat(quantity), unit, region,
      city: city || null, delivery_required: deliveryRequired, vat_invoice_required: vatRequired,
      hide_identity: hideIdentity,
      target_tiers: targetTiers.length > 0 ? targetTiers : null,
      verified_only: verifiedOnly,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      notes: uploadedSpecUrl ? `${notes || ''}\n[مواصفات مرفقة: ${uploadedSpecUrl}]` : notes || null,
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
            <button onClick={() => { setSuccess(false); setSector(''); setProductName(''); setQuantity(''); setUnit(''); setRegion(''); setCity(''); setNotes(''); setSpecification('') }}
              className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
              {t.anotherReq}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />

      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/contractor" className="text-xs text-gray-400 hover:text-gray-600">{t.back}</a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{t.title}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t.sub}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-5">
              {/* Sector */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.sector}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(sectors).map(s => (
                    <button key={s} type="button" onClick={() => { setSector(s); setProductName('') }}
                      className={`p-4 rounded-xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5 ${sector === s ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-2xl mb-1">{sectorIcons[s]}</div>
                      <div className={`text-sm font-semibold ${sector === s ? 'text-[#F5831F]' : 'text-gray-700'}`}>{sectors[s]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product */}
              {sector && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in">
                  <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.product}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {SECTOR_PRODUCTS[sector]?.map(p => (
                      <button key={p} type="button" onClick={() => setProductName(p)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${productName === p ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        style={productName === p ? { background: '#1B2D5B' } : {}}>
                        {getProductLabel(p, locale)}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
                    className="input-field" placeholder={t.orType} required />
                </div>
              )}

              {/* Quantity */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>{t.qty}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.qtyLabel}</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                      className="input-field" placeholder="50" required min="0" step="any" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.unitLabel}</label>
                    <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field" required>
                      <option value="">{t.unitDefault}</option>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.specLabel}</label>
                  <input type="text" value={specification} onChange={e => setSpecification(e.target.value)}
                    className="input-field" placeholder={t.specHint} />
                </div>
              </div>

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
              <button type="submit" disabled={loading || !sector || !productName || !quantity || !unit || !region}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ background: '#F5831F' }}>
                {loading ? t.submitting : t.submit}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
