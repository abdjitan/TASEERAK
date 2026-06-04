// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { REGIONS, SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, getRegionLabel, CITIES_BY_REGION, type UserRole, type Sector } from '@/types'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const SECTOR_COLORS = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#F5831F', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }

const TR = {
  ar: {
    welcome: 'أهلاً بك', chooseType: 'اختر نوع حسابك للبدء',
    supplier: 'مورد', supplierDesc: 'أعرض منتجاتي وأستقبل طلبات',
    contractor: 'مقاول', contractorDesc: 'أبحث عن موردين وأطلب تسعيرات',
    next: 'التالي ←', back: '← رجوع', haveAccount: 'لديك حساب؟', login: 'تسجيل الدخول',
    companyData: 'بيانات الشركة', companyDataSub: 'أدخل المعلومات الأساسية لشركتك',
    companyAr: 'اسم الشركة (عربي)', companyEn: 'الاسم (إنجليزي)',
    crNumber: 'رقم السجل التجاري', vatNumber: 'رقم الضريبة (VAT)',
    region: 'المنطقة', selectRegion: '-- اختر --', city: 'المدينة', cityPh: 'اسم المدينة',
    phone: 'رقم الجوال (واتساب)', phoneHint: '10 أرقام تبدأ بـ 05 (بدون مفتاح الدولة)',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordPh: '8 أحرف على الأقل',
    licenseTitle: 'رفع رخصة العمل', licenseSub: 'يتم التحقق خلال 24 ساعة — حسابك يعمل فوراً',
    license: 'رخصة العمل', cr: 'السجل التجاري', uploadHint: 'PDF أو صورة — حجم أقصى 5MB',
    sectorsTitle: 'القطاعات والتخصصات',
    sectorsSubSupplier: 'اختر القطاعات ثم حدد المواد التي توردها بالضبط',
    sectorsSubContractor: 'اختر القطاعات التي تعمل فيها',
    exactMaterials: 'المواد التي توردها بالضبط 🎯',
    exactHint: 'حدد تخصصك الدقيق لتصلك الطلبات المطابقة فقط',
    selected: 'محدد', companyClass: 'تصنيف شركتك',
    classHintSupplier: 'يساعد المقاولين على إيجادك حسب حجم طلباتهم',
    manufacturer: 'مصنع / موزع رئيسي', manufacturerD: 'إنتاج أو توزيع بكميات كبيرة',
    commercial: 'موزع تجاري', commercialD: 'متوسط الحجم والكميات',
    local: 'مورد محلي', localD: 'كميات صغيرة إلى متوسطة',
    minOrder: 'الحد الأدنى لقيمة الطلب (ر.س) — اختياري', minOrderPh: 'مثال: 50000 — اتركه فارغاً لاستقبال كل الطلبات',
    gradeTitle: 'درجة تصنيف شركتك', gradeSub: 'وزارة الشؤون البلدية — اختياري',
    creating: 'جارٍ الإنشاء...', createAccount: 'إنشاء الحساب ←',
  },
  en: {
    welcome: 'Welcome', chooseType: 'Choose your account type to start',
    supplier: 'Supplier', supplierDesc: 'List products & receive requests',
    contractor: 'Contractor', contractorDesc: 'Find suppliers & request quotes',
    next: 'Next →', back: '← Back', haveAccount: 'Have an account?', login: 'Sign In',
    companyData: 'Company Information', companyDataSub: 'Enter your company basic info',
    companyAr: 'Company Name (Arabic)', companyEn: 'Name (English)',
    crNumber: 'Commercial Registration', vatNumber: 'VAT Number',
    region: 'Region', selectRegion: '-- Select --', city: 'City', cityPh: 'City name',
    phone: 'Phone (WhatsApp)', phoneHint: '10 digits starting with 05 (no country code)',
    email: 'Email Address', password: 'Password', passwordPh: 'At least 8 characters',
    licenseTitle: 'Upload Business License', licenseSub: 'Verified within 24h — account works immediately',
    license: 'Business License', cr: 'Commercial Registration', uploadHint: 'PDF or image — max 5MB',
    sectorsTitle: 'Sectors & Specialties',
    sectorsSubSupplier: 'Select sectors then pick exactly what you supply',
    sectorsSubContractor: 'Select the sectors you work in',
    exactMaterials: 'What you supply exactly 🎯',
    exactHint: 'Set your exact specialty to get only matching requests',
    selected: 'selected', companyClass: 'Company Classification',
    classHintSupplier: 'Helps contractors find you by order size',
    manufacturer: 'Manufacturer / Major', manufacturerD: 'Large-scale production/distribution',
    commercial: 'Commercial Distributor', commercialD: 'Medium size & quantities',
    local: 'Local Supplier', localD: 'Small to medium quantities',
    minOrder: 'Min order value (SAR) — optional', minOrderPh: 'e.g. 50000 — leave empty for all requests',
    gradeTitle: 'Company Grade', gradeSub: 'Ministry of Municipal Affairs — optional',
    creating: 'Creating...', createAccount: 'Create Account →',
  },
  ur: {
    welcome: 'خوش آمدید', chooseType: 'شروع کرنے کے لیے اکاؤنٹ کی قسم منتخب کریں',
    supplier: 'سپلائر', supplierDesc: 'مصنوعات دکھائیں اور درخواستیں وصول کریں',
    contractor: 'ٹھیکیدار', contractorDesc: 'سپلائرز تلاش کریں اور قیمتیں طلب کریں',
    next: 'آگے →', back: '← واپس', haveAccount: 'اکاؤنٹ ہے؟', login: 'سائن ان',
    companyData: 'کمپنی کی معلومات', companyDataSub: 'اپنی کمپنی کی بنیادی معلومات درج کریں',
    companyAr: 'کمپنی کا نام (عربی)', companyEn: 'نام (انگریزی)',
    crNumber: 'تجارتی رجسٹریشن', vatNumber: 'VAT نمبر',
    region: 'علاقہ', selectRegion: '-- منتخب کریں --', city: 'شہر', cityPh: 'شہر کا نام',
    phone: 'فون (واٹس ایپ)', phoneHint: '05 سے شروع 10 ہندسے',
    email: 'ای میل', password: 'پاسورڈ', passwordPh: 'کم از کم 8 حروف',
    licenseTitle: 'کاروباری لائسنس اپلوڈ کریں', licenseSub: '24 گھنٹوں میں تصدیق',
    license: 'کاروباری لائسنس', cr: 'تجارتی رجسٹریشن', uploadHint: 'PDF یا تصویر — زیادہ سے زیادہ 5MB',
    sectorsTitle: 'شعبے اور مہارتیں',
    sectorsSubSupplier: 'شعبے منتخب کریں پھر بالکل وہی منتخب کریں جو آپ فراہم کرتے ہیں',
    sectorsSubContractor: 'وہ شعبے منتخب کریں جہاں آپ کام کرتے ہیں',
    exactMaterials: 'آپ بالکل کیا فراہم کرتے ہیں 🎯',
    exactHint: 'صرف متعلقہ درخواستیں حاصل کرنے کے لیے اپنی مہارت مقرر کریں',
    selected: 'منتخب', companyClass: 'کمپنی کی درجہ بندی',
    classHintSupplier: 'ٹھیکیداروں کو آرڈر سائز کے مطابق آپ کو تلاش کرنے میں مدد',
    manufacturer: 'مینوفیکچرر / بڑا', manufacturerD: 'بڑے پیمانے پر',
    commercial: 'تجارتی تقسیم کار', commercialD: 'درمیانے سائز',
    local: 'مقامی سپلائر', localD: 'چھوٹی سے درمیانی مقدار',
    minOrder: 'کم از کم آرڈر قیمت (ریال) — اختیاری', minOrderPh: 'مثال: 50000',
    gradeTitle: 'کمپنی کا درجہ', gradeSub: 'وزارت بلدیات — اختیاری',
    creating: 'بن رہا ہے...', createAccount: 'اکاؤنٹ بنائیں →',
  },
}

const schema = z.object({
  role: z.enum(['contractor', 'supplier'] as const),
  company_name_ar: z.string().min(3, 'اسم الشركة مطلوب'),
  company_name_en: z.string().optional(),
  commercial_registration: z.string().regex(/^[0-9]{10}$/, 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط'),
  vat_number: z.string().optional(),
  phone: z.string().regex(/^05[0-9]{8}$/, 'رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  region: z.string().min(1, 'اختر المنطقة'),
  city: z.string().min(2, 'المدينة مطلوبة'),
  sectors: z.array(z.string()).min(1, 'اختر قطاعاً واحداً على الأقل'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { locale, dir } = useTranslation()
  const t = TR[locale] || TR.ar
  const sl = (s) => SECTOR_LABELS[s] // sector label helper (uses AR labels; sub-labels are localized below)
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<'contractor' | 'supplier' | null>(null)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [crFile, setCrFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')
  // Classification
  const [supplierTier, setSupplierTier] = useState<'manufacturer' | 'commercial' | 'local'>('local')
  const [contractorGrade, setContractorGrade] = useState<'A' | 'B' | 'C' | 'D' | ''>('')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])

  function toggleSpecialty(key: string) {
    setSpecialties(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])
  }
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sectors: [] },
    mode: 'onChange',
  })

  const sectors = watch('sectors') as Sector[]

  function toggleSector(sector: Sector) {
    const current = sectors || []
    const updated = current.includes(sector)
      ? current.filter(s => s !== sector)
      : [...current, sector]
    setValue('sectors', updated)
  }

  async function uploadFile(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('licenses')
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(data.path)
    return publicUrl
  }

  async function onSubmit(data: FormData) {
    setUploading(true)
    setFormError('')
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
            company_name_ar: data.company_name_ar,
            phone: data.phone,
          }
        }
      })

      if (authError) throw new Error(authError.message)
      const userId = authData.user!.id

      // 2. Upload license files
      let licenseUrl = null, crUrl = null
      if (licenseFile) {
        licenseUrl = await uploadFile(licenseFile, `${userId}/license.${licenseFile.name.split('.').pop()}`)
      }
      if (crFile) {
        crUrl = await uploadFile(crFile, `${userId}/cr.${crFile.name.split('.').pop()}`)
      }

      // 3. Update profile with full data
      const updateData: any = {
        company_name_en: data.company_name_en,
        commercial_registration: data.commercial_registration,
        vat_number: data.vat_number,
        region: data.region,
        city: data.city,
        license_url: licenseUrl,
        cr_url: crUrl,
      }
      if (data.role === 'supplier') {
        updateData.supplier_tier = supplierTier
        if (minOrderValue) updateData.min_order_value = parseFloat(minOrderValue)
      }
      if (data.role === 'contractor' && contractorGrade) {
        updateData.contractor_grade = contractorGrade
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (profileError) throw new Error(profileError.message)

      // 4. Insert sectors
      const sectorsToInsert = data.sectors.map(sector => ({
        profile_id: userId,
        sector,
      }))
      await supabase.from('profile_sectors').insert(sectorsToInsert as any)

      // 5. Insert specialties (للمورد)
      if (data.role === 'supplier' && specialties.length > 0) {
        const specsToInsert = specialties.map(specialty => ({ profile_id: userId, specialty }))
        await supabase.from('profile_specialties').insert(specsToInsert as any)
      }

      window.location.href = data.role === 'contractor' ? '/contractor' : '/supplier/dashboard'

    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء التسجيل')
    } finally {
      setUploading(false)
    }
  }

  // Step 1: Choose type
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50" dir={dir}>
        <div className="absolute top-4 left-4"><LanguageSwitcher variant="minimal" /></div>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src="/logo-outlined.png" alt="Taseerak" className="w-12 h-12" />
              <span className="text-2xl font-bold">{locale === 'ar' ? 'تسعيرك' : 'Taseerak'}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t.welcome}</h1>
            <p className="text-gray-500 mt-2">{t.chooseType}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { type: 'contractor' as 'contractor', icon: '👷', title: t.contractor, desc: t.contractorDesc },
              { type: 'supplier' as 'supplier', icon: '🏪', title: t.supplier, desc: t.supplierDesc },
            ].map(({ type, icon, title, desc }) => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setValue('role', type) }}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  selectedType === type
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">{icon}</div>
                <div className="font-semibold text-gray-900">{title}</div>
                <div className="text-xs text-gray-500 mt-1">{desc}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => selectedType && setStep(2)}
            disabled={!selectedType}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {t.next}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t.haveAccount}{' '}
            <a href="/login" className="text-blue-600 font-medium hover:underline">{t.login}</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir={dir}>
      <div className="absolute top-4 left-4 z-10"><LanguageSwitcher variant="minimal" /></div>
      <div className="max-w-lg mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-6 mb-2">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 2: Company info */}
          {step === 2 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t.companyData}</h2>
              <p className="text-sm text-gray-500 mb-5">{t.companyDataSub}</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t.companyAr} *</label>
                    <input {...register('company_name_ar')} className="input-field" placeholder="شركة الصخر للمقاولات"/>
                    {errors.company_name_ar && <p className="text-red-500 text-xs mt-1">{errors.company_name_ar.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t.companyEn}</label>
                    <input {...register('company_name_en')} className="input-field" placeholder="Al Sakhr Contracting"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t.crNumber} *</label>
                    <input {...register('commercial_registration')} className="input-field" placeholder="1010XXXXXX"
                      inputMode="numeric" maxLength={10} dir="ltr"
                      onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 10) }} />
                    {errors.commercial_registration && <p className="text-red-500 text-xs mt-1">{errors.commercial_registration.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t.vatNumber}</label>
                    <input {...register('vat_number')} className="input-field" placeholder="3XXXXXXXXXXXXXXX"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t.region} *</label>
                    <select {...register('region')} className="input-field"
                      onChange={e => { setValue('region', e.target.value); setValue('city', '') }}>
                      <option value="">{t.selectRegion}</option>
                      {REGIONS.map(r => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                    </select>
                    {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t.city} *</label>
                    <select {...register('city')} className="input-field" disabled={!watch('region')}>
                      <option value="">{watch('region') ? t.selectRegion : '—'}</option>
                      {(CITIES_BY_REGION[watch('region')] || []).map(c => (
                        <option key={c.ar} value={c.ar}>{locale === 'en' ? c.en : c.ar}</option>
                      ))}
                    </select>
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.phone} *</label>
                  <input {...register('phone')} className="input-field" placeholder="05XXXXXXXX" type="tel"
                    inputMode="numeric" maxLength={10} dir="ltr"
                    onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 10) }} />
                  <p className="text-[10px] text-gray-400 mt-1">{t.phoneHint}</p>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.email} *</label>
                  <input {...register('email')} className="input-field" placeholder="info@company.com" type="email"/>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.password} *</label>
                  <input {...register('password')} className="input-field" type="password" placeholder={t.passwordPh}/>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">{t.back}</button>
                <button type="button" onClick={async () => {
                  const valid = await trigger([
                    'company_name_ar', 'commercial_registration', 'vat_number',
                    'phone', 'email', 'password', 'region', 'city'
                  ])
                  if (valid) setStep(3)
                }} className="btn-primary flex-1">{t.next}</button>
              </div>
            </div>
          )}

          {/* Step 3: License upload */}
          {step === 3 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t.licenseTitle}</h2>
              <p className="text-sm text-gray-500 mb-5">{t.licenseSub}</p>

              <div className="space-y-4">
                {[
                  { label: `${t.license} *`, state: licenseFile, setter: setLicenseFile, required: true },
                  { label: t.cr, state: crFile, setter: setCrFile, required: false },
                ].map(({ label, state, setter }) => (
                  <label key={label} className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    state ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400'
                  }`}>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setter(e.target.files?.[0] ?? null)}
                    />
                    {state ? (
                      <div className="text-green-600 font-medium">✓ {state.name}</div>
                    ) : (
                      <>
                        <div className="text-2xl mb-1">📄</div>
                        <div className="font-medium text-gray-700">{label}</div>
                        <div className="text-xs text-gray-400 mt-1">{t.uploadHint}</div>
                      </>
                    )}
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost flex-1">{t.back}</button>
                <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1">{t.next}</button>
              </div>
            </div>
          )}

          {/* Step 4: Sectors + Specialties */}
          {step === 4 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t.sectorsTitle}</h2>
              <p className="text-sm text-gray-500 mb-5">
                {selectedType === 'supplier' ? t.sectorsSubSupplier : t.sectorsSubContractor}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {(Object.keys(SECTOR_LABELS) as Sector[]).map(sector => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => {
                      toggleSector(sector)
                      if (sectors?.includes(sector)) {
                        const subKeys = Object.keys(SUB_CATEGORIES[sector] || {})
                        setSpecialties(prev => prev.filter(s => !subKeys.includes(s)))
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      sectors?.includes(sector)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
                  >
                    <div className="font-semibold text-sm text-gray-900">{SECTOR_LABELS[sector]}</div>
                  </button>
                ))}
              </div>

              {/* التخصصات الدقيقة — للمورد فقط */}
              {selectedType === 'supplier' && sectors?.length > 0 && (
                <div className="mb-5 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{t.exactMaterials}</h3>
                  <p className="text-xs text-gray-500 mb-3">{t.exactHint} ({specialties.length} {t.selected})</p>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {sectors.map((sector: Sector) => {
                      const subs = SUB_CATEGORIES[sector] || {}
                      const groups: Record<string, string[]> = {}
                      Object.entries(subs).forEach(([key, sub]) => {
                        if (!groups[sub.group]) groups[sub.group] = []
                        groups[sub.group].push(key)
                      })
                      const color = SECTOR_COLORS[sector]
                      return (
                        <div key={sector}>
                          <div className="text-xs font-bold mb-2" style={{ color }}>{SECTOR_LABELS[sector]}</div>
                          {Object.entries(groups).map(([groupKey, keys]) => {
                            const grp = GROUP_LABELS[groupKey]
                            const grpLabel = grp ? (locale === 'en' ? grp.en : locale === 'ur' ? grp.ur : grp.ar) : groupKey
                            return (
                              <div key={groupKey} className="mb-2 bg-gray-50/50 rounded-lg p-2 border border-gray-100">
                                <div className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                                  <span>{grp?.icon}</span>{grpLabel}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {keys.map(key => {
                                    const sub = subs[key]
                                    const active = specialties.includes(key)
                                    const subLabel = locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
                                    return (
                                      <button key={key} type="button" onClick={() => toggleSpecialty(key)}
                                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                                          active ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
                                        }`} style={active ? { background: color } : {}}>
                                        {sub.icon} {subLabel}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {errors.sectors && (
                <p className="text-red-500 text-sm mb-4">{errors.sectors.message}</p>
              )}

              {/* ── تصنيف المورد ── */}
              {selectedType === 'supplier' && (
                <div className="mb-5 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{t.companyClass}</h3>
                  <p className="text-xs text-gray-500 mb-3">{t.classHintSupplier}</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { key: 'manufacturer', icon: '🏭', label: t.manufacturer, desc: t.manufacturerD },
                      { key: 'commercial', icon: '🏪', label: t.commercial, desc: t.commercialD },
                      { key: 'local', icon: '🏬', label: t.local, desc: t.localD },
                    ].map(tier => (
                      <button key={tier.key} type="button"
                        onClick={() => setSupplierTier(tier.key as any)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          supplierTier === tier.key ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="text-xl mb-1">{tier.icon}</div>
                        <div className={`text-xs font-bold ${supplierTier === tier.key ? 'text-[#F5831F]' : 'text-gray-700'}`}>{tier.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{tier.desc}</div>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t.minOrder}</label>
                    <input type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)}
                      className="input-field" placeholder={t.minOrderPh} min="0" />
                  </div>
                </div>
              )}

              {/* ── درجة المقاول ── */}
              {selectedType === 'contractor' && (
                <div className="mb-5 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{t.gradeTitle}</h3>
                  <p className="text-xs text-gray-500 mb-3">{t.gradeSub}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { grade: 'A', label: locale === 'ar' ? 'أ' : 'A', desc: '> 100M', color: '#F5831F' },
                      { grade: 'B', label: locale === 'ar' ? 'ب' : 'B', desc: '30–100M', color: '#1B2D5B' },
                      { grade: 'C', label: locale === 'ar' ? 'ج' : 'C', desc: '5–30M', color: '#0F6E56' },
                      { grade: 'D', label: locale === 'ar' ? 'د' : 'D', desc: '< 5M', color: '#888780' },
                    ].map(g => (
                      <button key={g.grade} type="button"
                        onClick={() => setContractorGrade(g.grade as any)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          contractorGrade === g.grade ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={contractorGrade === g.grade ? { borderColor: g.color, background: g.color + '10' } : {}}>
                        <div className="text-xl font-black mb-0.5" style={{ color: g.color }}>{g.label}</div>
                        <div className="text-[10px] text-gray-500">{g.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="btn-ghost flex-1">{t.back}</button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploading}
                  className="btn-primary flex-2 flex-1 disabled:opacity-50"
                >
                  {isSubmitting || uploading ? t.creating : t.createAccount}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
