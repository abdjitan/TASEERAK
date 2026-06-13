// @ts-nocheck
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { REGIONS, SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, getRegionLabel, CITIES_BY_REGION, sortGroupKeys, type UserRole, type Sector } from '@/types'
import DistrictField from '@/components/shared/DistrictField'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'
import { detectSpecialtiesFromText } from '@/lib/classify'

const SECTOR_COLORS = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#F5831F', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }

const TR = {
  ar: {
    welcome: 'أهلاً بك', chooseType: 'اختر نوع حسابك للبدء',
    supplier: 'مورد', supplierDesc: 'أعرض منتجاتي وأستقبل طلبات',
    contractor: 'مقاول', contractorDesc: 'أبحث عن موردين وأطلب تسعيرات',
    next: 'التالي ←', back: '← رجوع', haveAccount: 'لديك حساب؟', login: 'تسجيل الدخول',
    companyData: 'بيانات الشركة', companyDataSub: 'أدخل المعلومات الأساسية لشركتك',
    companyAr: 'اسم الشركة', companyEn: 'الاسم (إنجليزي)',
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
    manufacturer: 'مصنع / مورد رئيسي', manufacturerD: 'إنتاج أو توريد بكميات كبيرة للمشاريع والشركات',
    commercial: 'مورد تجاري', commercialD: 'توريد بكميات متوسطة ومنتظمة للمشاريع والعملاء',
    local: 'مورد محلي', localD: 'توريد محلي بكميات صغيرة إلى متوسطة وخدمة مباشرة',
    minOrder: 'الحد الأدنى لقيمة الطلب (ر.س) — اختياري', minOrderPh: 'مثال: 50000 — اتركه فارغاً لاستقبال كل الطلبات',
    gradeTitle: 'درجة تصنيف شركتك', gradeSub: 'وزارة الشؤون البلدية — اختياري',
    creating: 'جارٍ الإنشاء...', createAccount: 'إنشاء الحساب ←',
    addMatTitle: 'تبيع مادة غير موجودة بالقائمة؟',
    addMatHint: 'أضِفها هنا وسنراجعها ونضيفها — تابع تسجيلك عادي',
    addMatPh: 'اسم المادة...', addMatBtn: 'إضافة', addMatAdded: 'ستتم مراجعتها',
  },
  en: {
    welcome: 'Welcome', chooseType: 'Choose your account type to start',
    supplier: 'Supplier', supplierDesc: 'List products & receive requests',
    contractor: 'Contractor', contractorDesc: 'Find suppliers & request quotes',
    next: 'Next →', back: '← Back', haveAccount: 'Have an account?', login: 'Sign In',
    companyData: 'Company Information', companyDataSub: 'Enter your company basic info',
    companyAr: 'Company Name', companyEn: 'Name (English)',
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
    manufacturer: 'Factory / Major Supplier', manufacturerD: 'Production or bulk supply for projects & companies',
    commercial: 'Commercial Supplier', commercialD: 'Regular medium-volume supply for projects & clients',
    local: 'Local Supplier', localD: 'Local supply, small to medium quantities, direct service',
    minOrder: 'Min order value (SAR) — optional', minOrderPh: 'e.g. 50000 — leave empty for all requests',
    gradeTitle: 'Company Grade', gradeSub: 'Ministry of Municipal Affairs — optional',
    creating: 'Creating...', createAccount: 'Create Account →',
    addMatTitle: 'Selling a material not in the list?',
    addMatHint: 'Add it here for review — continue registering normally',
    addMatPh: 'Material name...', addMatBtn: 'Add', addMatAdded: 'pending review',
  },
  ur: {
    welcome: 'خوش آمدید', chooseType: 'شروع کرنے کے لیے اکاؤنٹ کی قسم منتخب کریں',
    supplier: 'سپلائر', supplierDesc: 'مصنوعات دکھائیں اور درخواستیں وصول کریں',
    contractor: 'ٹھیکیدار', contractorDesc: 'سپلائرز تلاش کریں اور قیمتیں طلب کریں',
    next: 'آگے →', back: '← واپس', haveAccount: 'اکاؤنٹ ہے؟', login: 'سائن ان',
    companyData: 'کمپنی کی معلومات', companyDataSub: 'اپنی کمپنی کی بنیادی معلومات درج کریں',
    companyAr: 'کمپنی کا نام', companyEn: 'نام (انگریزی)',
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
    manufacturer: 'فیکٹری / بڑا سپلائر', manufacturerD: 'پروجیکٹس اور کمپنیوں کے لیے بڑی مقدار میں سپلائی',
    commercial: 'تجارتی سپلائر', commercialD: 'پروجیکٹس اور گاہکوں کے لیے باقاعدہ درمیانی سپلائی',
    local: 'مقامی سپلائر', localD: 'مقامی سپلائی، چھوٹی تا درمیانی مقدار، براہ راست خدمت',
    minOrder: 'کم از کم آرڈر قیمت (ریال) — اختیاری', minOrderPh: 'مثال: 50000',
    gradeTitle: 'کمپنی کا درجہ', gradeSub: 'وزارت بلدیات — اختیاری',
    creating: 'بن رہا ہے...', createAccount: 'اکاؤنٹ بنائیں →',
    addMatTitle: 'فہرست میں کوئی مواد نہیں جو آپ بیچتے ہیں؟',
    addMatHint: 'یہاں شامل کریں — رجسٹریشن جاری رکھیں',
    addMatPh: 'مواد کا نام...', addMatBtn: 'شامل کریں', addMatAdded: 'زیر جائزہ',
  },
}

const schema = z.object({
  full_name: z.string().min(3, 'الاسم مطلوب'),
  role: z.enum(['contractor', 'supplier'] as const),
  company_name_ar: z.string().min(3, 'اسم الشركة مطلوب'),
  company_name_en: z.string().optional(),
  commercial_registration: z.string().regex(/^[0-9]{10}$/, 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط'),
  vat_number: z.string().optional(),
  phone: z.string().regex(/^05[0-9]{8}$/, 'رقم الجوال مطلوب — 10 أرقام ويبدأ بـ 05'),
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
  const SECTOR_TR = {
    civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'تعمیراتی' },
    electrical: { en: 'Electrical', ur: 'برقی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
    equipment: { en: 'Machinery', ur: 'مشینری' }, supply_store: { en: 'Supply Store', ur: 'سپلائی اسٹور' },
  }
  const sl = (s) => locale === 'ar' ? SECTOR_LABELS[s] : (SECTOR_TR[s]?.[locale] || SECTOR_LABELS[s])
  // CR verification (Wathq) labels
  const CRV = {
    ar: { verifyBtn: 'تحقق من السجل التجاري', checking: 'جارٍ التحقق...', invalid: 'أدخل رقم السجل (10 أرقام) أولاً', needId: 'أدخل رقم هوية صاحب/مفوّض السجل (10 أرقام)', error: 'تعذّر التحقق، حاول لاحقاً', idLabel: 'رقم هوية صاحب/مفوّض السجل', ownerOk: '✓ رقم هويتك مُدرج ضمن ملّاك/مدراء السجل — توثيق مؤكّد', ownerNo: '⚠ رقم هويتك غير مُدرج في هذا السجل — سيُحوَّل لمراجعة الإدارة', idDoc: 'صورة الهوية الوطنية / الإقامة', idHint: 'لإثبات أنك صاحب السجل — تُراجَع بسرّية' },
    en: { verifyBtn: 'Verify CR', checking: 'Checking...', invalid: 'Enter the CR number (10 digits) first', needId: 'Enter the owner/authorized national ID (10 digits)', error: 'Verification failed, try later', idLabel: 'Owner/authorized national ID', ownerOk: '✓ Your ID is listed among the CR owners/managers — verified', ownerNo: '⚠ Your ID is not in this CR — sent to admin review', idDoc: 'National ID / Iqama image', idHint: 'Proves you own the CR — reviewed confidentially' },
    ur: { verifyBtn: 'تجارتی رجسٹریشن کی تصدیق', checking: 'تصدیق ہو رہی ہے...', invalid: 'پہلے CR نمبر (10 ہندسے) درج کریں', needId: 'مالک/مجاز کا شناختی نمبر درج کریں (10 ہندسے)', error: 'تصدیق ناکام، بعد میں کوشش کریں', idLabel: 'مالک/مجاز کا قومی شناختی نمبر', ownerOk: '✓ آپ کا شناختی نمبر مالکان میں شامل ہے — تصدیق شدہ', ownerNo: '⚠ آپ کا شناختی نمبر اس CR میں نہیں — جائزے کے لیے بھیجا گیا', idDoc: 'قومی شناختی کارڈ / اقامہ کی تصویر', idHint: 'ثبوت کہ آپ مالک ہیں — رازداری سے جائزہ' },
  }
  const cv = CRV[locale] || CRV.ar
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<'contractor' | 'supplier' | null>(null)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [crFile, setCrFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  const [crVerify, setCrVerify] = useState<any>(null)
  const [crDup, setCrDup] = useState<any>(null) // { company } if CR already registered
  const [branchConfirmed, setBranchConfirmed] = useState(false)
  const [phoneDup, setPhoneDup] = useState<any>(null) // { company } if phone already registered
  const [crChecking, setCrChecking] = useState(false)
  // ملاحظة (PDPL): لا نجمع رقم الهوية ولا صورة الهوية/الإقامة إطلاقاً.
  // التوثيق يتم عبر واثق (السجل التجاري) + رفع رخصة العمل لاحقاً من الإعدادات.
  // Report a fake/fraudulent account registered with my CR
  const [objOpen, setObjOpen] = useState(false)
  const [objName, setObjName] = useState('')
  const [objPhone, setObjPhone] = useState('')
  const [objReason, setObjReason] = useState('')
  const [objSending, setObjSending] = useState(false)
  const [objSent, setObjSent] = useState(false)
  // Classification
  const [supplierTier, setSupplierTier] = useState<'manufacturer' | 'commercial' | 'local'>('local')
  const [contractorGrade, setContractorGrade] = useState<'A' | 'B' | 'C' | 'D' | ''>('')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  // مواد يبيعها المورد وغير موجودة بالقائمة — تُرسَل للإدارة للمراجعة
  const [extraMaterials, setExtraMaterials] = useState<{ sector: string; name: string }[]>([])
  const [extraMaterialInput, setExtraMaterialInput] = useState('')
  const [openSector, setOpenSector] = useState<Sector | null>(null)
  const [district, setDistrict] = useState('')
  const [prefLang, setPrefLang] = useState<'ar' | 'en' | 'ur'>(locale)
  const [autoDetected, setAutoDetected] = useState(0) // عدد ما تم تحديده تلقائياً من نشاط السجل

  function addExtraMaterial(sector: string) {
    const v = extraMaterialInput.trim()
    if (!v || !sector) return
    setExtraMaterials(prev => prev.some(m => m.name === v && m.sector === sector) ? prev : [...prev, { sector, name: v }])
    setExtraMaterialInput('')
  }

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

  // يحلّل نشاط السجل التجاري (من واثق) ويحدّد القطاعات/التخصصات تلقائياً — يضيف فوق المحدد
  function autoDetectFromCR() {
    const text = [watch('company_name_ar'), crVerify?.activity].filter(Boolean).join(' ')
    if (!text.trim()) return
    const { sectors: dSectors, specialties: dSpecs } = detectSpecialtiesFromText(text)
    if (!dSectors.length) return
    const cur = (watch('sectors') as string[]) || []
    setValue('sectors', Array.from(new Set([...cur, ...dSectors])) as Sector[], { shouldValidate: true })
    if (selectedType === 'supplier' && dSpecs.length) {
      setSpecialties(prev => Array.from(new Set([...prev, ...dSpecs])))
      if (dSectors[0]) setOpenSector(dSectors[0] as Sector)
    }
    setAutoDetected(selectedType === 'supplier' ? dSpecs.length : dSectors.length)
  }

  async function uploadFile(file: File, path: string) {
    // sensitive docs (license / CR) → PRIVATE "verification" bucket.
    // store the PATH; signed URLs are generated on display.
    const { data, error } = await supabase.storage
      .from('verification')
      .upload(path, file, { upsert: true })
    if (error) return null
    return data.path
  }

  // Verify the Commercial Registration against the official source (Wathq)
  // Check (pre-auth) whether a CR is already registered, to warn about duplicates.
  async function checkCrDup(cr: string) {
    setBranchConfirmed(false)
    if (!/^[0-9]{10}$/.test(cr)) { setCrDup(null); return }
    try {
      const supabase = createClient()
      const { data } = await supabase.rpc('cr_exists', { p_cr: cr })
      setCrDup(data === true ? { exists: true } : null) // boolean only (no name — privacy)
    } catch { setCrDup(null) }
    setObjOpen(false); setObjSent(false)
  }

  // Check (pre-auth) whether a phone is already registered — phones must be unique.
  async function checkPhoneDup(phone: string) {
    if (!/^05[0-9]{8}$/.test(phone)) { setPhoneDup(null); return }
    try {
      const supabase = createClient()
      const { data } = await supabase.rpc('phone_exists', { p_phone: phone })
      setPhoneDup(data === true ? { taken: true } : null) // boolean only (no name — privacy)
    } catch { setPhoneDup(null) }
  }

  // Submit an objection that the account registered with this CR is fake.
  async function submitObjection() {
    const cr = (watch('commercial_registration') || '').toString()
    if (!objReason.trim() && !objName.trim() && !objPhone.trim()) return
    setObjSending(true)
    try {
      const supabase = createClient()
      await supabase.rpc('report_cr_objection', {
        p_cr: cr,
        p_name: objName.trim() || null,
        p_phone: objPhone.trim() || null,
        p_email: (watch('email') || '').toString().trim() || null,
        p_reason: objReason.trim() || null,
      })
      setObjSent(true); setObjOpen(false)
    } catch {
      setObjSent(true); setObjOpen(false)
    }
    setObjSending(false)
  }

  async function verifyCR() {
    const cr = (watch('commercial_registration') || '').toString()
    if (!/^[0-9]{10}$/.test(cr)) { setCrVerify({ ok: false, message: cv.invalid }); return }
    setCrChecking(true); setCrVerify(null)
    try {
      const res = await fetch('/api/verify-cr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr }), // لا نرسل رقم الهوية — PDPL
      })
      const j = await res.json()
      setCrVerify(j)
      // When verified, lock in the official name (Arabic always; English only if
      // Wathq actually returns a Latin name).
      if (j?.verified) {
        if (j.name && /[؀-ۿ]/.test(j.name)) setValue('company_name_ar', j.name)
        if (j.nameEn && /[A-Za-z]/.test(j.nameEn)) setValue('company_name_en', j.nameEn)
        else setValue('company_name_en', '')
      }
    } catch {
      setCrVerify({ ok: false, message: cv.error })
    }
    setCrChecking(false)
  }

  async function onSubmit(data: FormData) {
    if (!agreedToTerms) {
      setFormError(locale === 'en' ? 'You must agree to the Terms & Privacy Policy' : 'يجب الموافقة على الشروط وسياسة الخصوصية')
      return
    }
    setUploading(true)
    setFormError('')
    try {
      // Build the metadata the DB trigger uses to create the FULL profile
      // (works whether email confirmation is on or off — no session needed).
      const meta: any = {
        role: data.role,
        full_name: data.full_name || '',
        company_name_ar: data.company_name_ar,
        company_name_en: data.company_name_en || '',
        phone: data.phone || '',
        commercial_registration: data.commercial_registration,
        vat_number: data.vat_number || '',
        region: data.region,
        city: data.city,
        district: district || '',
        preferred_language: prefLang,
        sectors: data.sectors,
      }
      if (data.role === 'supplier') {
        meta.supplier_tier = supplierTier
        if (minOrderValue) meta.min_order_value = String(minOrderValue)
        if (specialties.length > 0) meta.specialties = specialties
        if (extraMaterials.length > 0) meta.extra_materials = extraMaterials.map(m => m.name)
      }
      if (data.role === 'contractor' && contractorGrade) meta.contractor_grade = contractorGrade
      if (crVerify?.mode === 'wathq' && crVerify?.verified) {
        meta.cr_verification_source = 'wathq'
        meta.cr_official_name = crVerify.name || ''
        meta.cr_activity = crVerify.activity || ''
        meta.cr_status = crVerify.status || ''
        if (crVerify.expiryDate) meta.cr_expiry_date = crVerify.expiryDate
        if (crVerify.issueDate) meta.cr_issue_date = crVerify.issueDate
      }

      // 1. Create the auth user. The DB trigger builds the full profile
      //    (sectors, specialties, tier, verification, materials) from `meta`.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: meta,
          emailRedirectTo: `${window.location.origin}/login`,
          captchaToken: captchaToken || undefined,
        },
      })
      if (authError) throw new Error(authError.message)
      const userId = authData.user!.id

      // 2. Email confirmation ON → no session. Show "verify your email";
      //    documents are uploaded later from Settings.
      if (!authData.session) {
        setEmailSent(true)
        return
      }

      // 3. Email confirmation OFF → we have a session. Documents are uploaded
      //    AFTER registration from Settings → Documents. No national-ID is collected.
      let licenseUrl = null, crUrl = null
      if (licenseFile) licenseUrl = await uploadFile(licenseFile, `${userId}/license.${licenseFile.name.split('.').pop()}`)
      if (crFile) crUrl = await uploadFile(crFile, `${userId}/cr.${crFile.name.split('.').pop()}`)
      if (licenseUrl || crUrl) {
        await supabase.from('profiles').update({ license_url: licenseUrl, cr_url: crUrl }).eq('id', userId)
      }

      // ملاحظة: ألغينا التحقق التلقائي عبر مطابقة رقم الهوية (حفاظاً على الخصوصية).
      // التوثيق يتم عبر مراجعة الإدارة لصورة السجل التجاري (واثق يؤكّد أن السجل ساري).

      if (data.role === 'supplier') {
        try {
          await fetch('/api/classify-supplier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        } catch {}
      }

      window.location.href = data.role === 'contractor' ? '/contractor' : '/supplier/dashboard'

    } catch (err: any) {
      // A used/expired CAPTCHA token can't be reused — refresh it for the retry.
      captchaRef.current?.reset(); setCaptchaToken('')
      const msg = err?.message || ''
      setFormError(/captcha/i.test(msg)
        ? (locale === 'en' ? 'Please complete the “I am human” check and try again.'
           : locale === 'ur' ? 'براہ کرم تصدیق مکمل کریں (میں روبوٹ نہیں ہوں) اور دوبارہ کوشش کریں۔'
           : 'يرجى إكمال خطوة التحقق (أنا لست روبوت) ثم إعادة المحاولة.')
        : (msg || 'حدث خطأ أثناء التسجيل'))
    } finally {
      setUploading(false)
    }
  }

  // After sign-up when email confirmation is ON
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas" dir={dir}>
        <div className="absolute top-4 left-4"><LanguageSwitcher variant="minimal" /></div>
        <a href="/" className="absolute top-4 right-4 text-sm font-medium text-gray-500 hover:text-navy transition-colors">
          {locale === 'en' ? '🏠 Home' : locale === 'ur' ? '🏠 مرکزی صفحہ' : '🏠 الرئيسية'}
        </a>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-xl font-bold text-navy mb-2">
            {locale === 'en' ? 'Verify your email' : locale === 'ur' ? 'اپنا ای میل تصدیق کریں' : 'فعّل بريدك الإلكتروني'}
          </h1>
          <p className="text-sm text-gray-500 mb-2">
            {locale === 'en' ? 'We sent a confirmation link to your email. Open it to activate your account, then sign in.'
            : locale === 'ur' ? 'ہم نے آپ کے ای میل پر تصدیقی لنک بھیجا ہے۔ اسے کھول کر اکاؤنٹ فعال کریں، پھر سائن ان کریں۔'
            : 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني. افتحه لتفعيل حسابك، ثم سجّل الدخول.'}
          </p>
          <p className="text-xs text-gray-400 mb-6">
            {locale === 'en' ? 'You can upload your license / CR documents later from Settings.'
            : locale === 'ur' ? 'آپ اپنی دستاویزات بعد میں ترتیبات سے اپلوڈ کر سکتے ہیں۔'
            : 'يمكنك رفع مستندات الرخصة / السجل لاحقاً من الإعدادات.'}
          </p>
          <a href="/login" className="inline-block w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#1B2D5B' }}>
            {locale === 'en' ? 'Go to sign in' : locale === 'ur' ? 'سائن ان پر جائیں' : 'الذهاب لتسجيل الدخول'}
          </a>
        </div>
      </div>
    )
  }

  // Step 1: Choose type
  if (step === 1) {
    return (
      <div className="min-h-screen bg-canvas" dir={dir}>
        <header className="bg-white/90 backdrop-blur border-b border-line sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-white border border-line grid place-items-center"><img src="/logo.png" alt="تسعيرك" className="w-7 h-7 object-contain" /></span>
              <span className="font-extrabold text-navy text-lg">تسعير<span className="text-orange">ك</span></span>
            </a>
            <div className="flex items-center gap-3">
              <LanguageSwitcher variant="minimal" />
              <a href="/login" className="text-sm font-bold text-orange-dark hover:underline">{t.haveAccount} {t.login}</a>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Stepper — step 1 active */}
          <div className="flex items-center justify-center gap-2 py-4 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s === 1 ? 'bg-[#F5831F] text-white ring-4 ring-[#F5831F]/20' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>{s}</div>
                {s < 3 && <div className="w-10 h-1 rounded-full bg-gray-200" />}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-line max-w-xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-navy">{locale === 'en' ? 'Create your account' : locale === 'ur' ? 'اپنا اکاؤنٹ بنائیں' : 'أنشئ حسابك'}</h1>
              <p className="text-ink-2 mt-2">{locale === 'en' ? 'Start with the basic login info.' : locale === 'ur' ? 'بنیادی لاگ اِن معلومات سے شروع کریں۔' : 'ابدأ بمعلومات الدخول الأساسية.'}</p>
            </div>

            <div className="space-y-4 text-start">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === 'en' ? 'Full name' : locale === 'ur' ? 'پورا نام' : 'الاسم الكامل'} *</label>
                  <input {...register('full_name')} className="input-field" placeholder={locale === 'en' ? 'Mohammed Al-Otaibi' : 'محمد العتيبي'} />
                  {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.phone} *</label>
                  <input {...register('phone')} className="input-field" placeholder="05XXXXXXXX" type="tel"
                    inputMode="numeric" maxLength={10} dir="ltr"
                    onInput={e => { const v = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 10); e.currentTarget.value = v; if (v.length === 10) checkPhoneDup(v); else setPhoneDup(null) }} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
              </div>
              {phoneDup && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">⚠ {locale === 'en' ? 'This phone is already registered — use another.' : 'رقم الجوال مسجّل مسبقاً — استخدم رقماً آخر.'}</p>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t.email} *</label>
                <input {...register('email')} className="input-field" placeholder="name@company.com" type="email" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t.password} *</label>
                <input {...register('password')} className="input-field" type="password" placeholder={t.passwordPh} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
            </div>

            <button type="button"
              onClick={async () => { const ok = await trigger(['full_name', 'phone', 'email', 'password']); if (!ok || phoneDup) return; setStep(2) }}
              className="btn-orange w-full mt-6">
              {t.next}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas" dir={dir}>
      <header className="bg-white/90 backdrop-blur border-b border-line sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-white border border-line grid place-items-center"><img src="/logo.png" alt="تسعيرك" className="w-7 h-7 object-contain" /></span>
            <span className="font-extrabold text-navy text-lg">تسعير<span className="text-orange">ك</span></span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/login" className="text-sm font-bold text-orange-dark hover:underline">{t.haveAccount} {t.login}</a>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-6 mb-2">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s < step ? 'bg-[#F5831F] text-white' :
                s === step ? 'bg-[#F5831F] text-white ring-4 ring-[#F5831F]/20' :
                'bg-white border-2 border-gray-200 text-gray-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-10 h-1 rounded-full ${s < step ? 'bg-[#F5831F]' : 'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 2: Company info */}
          {step === 2 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-navy mb-1">{locale === 'en' ? 'Account type & company' : locale === 'ur' ? 'اکاؤنٹ کی قسم اور کمپنی' : 'نوع الحساب وبيانات الشركة'}</h2>
              <p className="text-sm text-gray-500 mb-5">{t.companyDataSub}</p>

              {/* Account type (role) — chosen before the company details */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { type: 'contractor', title: t.contractor, desc: t.contractorDesc, svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M3 21V8l6-5 6 5v13" /><path d="M15 21V11l6 4v6" /></svg> },
                  { type: 'supplier', title: t.supplier, desc: t.supplierDesc, svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> },
                ].map(({ type, title, desc, svg }) => (
                  <button key={type} type="button" onClick={() => { setSelectedType(type as any); setValue('role', type as any) }}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${selectedType === type ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 bg-white hover:border-[#F5831F]/40'}`}>
                    <div className="w-12 h-12 rounded-2xl grid place-items-center mx-auto mb-2 text-white transition-colors" style={{ background: selectedType === type ? '#F5831F' : '#1B2D5B' }}>{svg}</div>
                    <div className="font-bold text-navy text-sm">{title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.companyAr} * {crVerify?.verified && <span className="text-emerald-600">🔒</span>}</label>
                  <input {...register('company_name_ar')} readOnly={!!crVerify?.verified}
                    className={`input-field ${crVerify?.verified ? 'bg-emerald-50/60 text-gray-700 cursor-not-allowed' : ''}`} placeholder="شركة الصخر للمقاولات"/>
                  {crVerify?.verified
                    ? <p className="text-[10px] text-emerald-600 mt-1">{locale === 'en' ? 'Officially verified — cannot be changed' : locale === 'ur' ? 'تصدیق شدہ — تبدیل نہیں ہو سکتا' : 'موثّق رسمياً — لا يمكن تعديله'}</p>
                    : errors.company_name_ar && <p className="text-red-500 text-xs mt-1">{errors.company_name_ar.message}</p>}
                </div>

                {/* التحقق عبر السجل التجاري (واثق) فقط — لا نجمع رقم الهوية حفاظاً على الخصوصية (PDPL) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.crNumber} *</label>
                  <input {...register('commercial_registration')} className="input-field" placeholder="7001234567"
                    inputMode="numeric" maxLength={10} dir="ltr"
                    onInput={e => { const v = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 10); e.currentTarget.value = v; if (crVerify) setCrVerify(null); if (v.length === 10) checkCrDup(v); else { setCrDup(null); setBranchConfirmed(false) } }} />
                  {errors.commercial_registration && <p className="text-red-500 text-xs mt-1">{errors.commercial_registration.message}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{locale === 'en' ? 'Unified CR number (starts with 700) — on your CR certificate. Verified officially via Wathq; no national ID is collected.' : locale === 'ur' ? 'متحدہ رجسٹریشن نمبر (700 سے شروع)۔ واثق کے ذریعے تصدیق؛ قومی شناختی نمبر نہیں لیا جاتا۔' : 'الرقم الموحّد للسجل (يبدأ بـ 700) — تجده في شهادة السجل. يُوثّق رسمياً عبر واثق دون جمع رقم الهوية.'}</p>
                </div>

                <button type="button" onClick={verifyCR} disabled={crChecking} className="btn-orange w-full">
                  {crChecking ? cv.checking : `🛡 ${cv.verifyBtn}`}
                </button>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.vatNumber}</label>
                  <input {...register('vat_number')} className="input-field" placeholder="3XXXXXXXXXXXXXXX"/>
                </div>

                {crVerify && (
                  <div className={`text-xs rounded-xl p-3 border flex items-start gap-2 ${
                    crVerify.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : crVerify.mode === 'manual' ? 'bg-[#F5831F]/5 border-blue-200 text-[#d96f15]'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    <span className="text-sm flex-shrink-0">{crVerify.verified ? '🛡' : crVerify.mode === 'manual' ? 'ℹ️' : '⚠️'}</span>
                    <div>
                      {crVerify.name && <div className="font-bold">{crVerify.name}</div>}
                      {crVerify.activity && <div className="opacity-80 line-clamp-2" title={crVerify.activity}>{crVerify.activity}</div>}
                      <div>{crVerify.message}</div>
                      {crVerify.ownerCheck && (
                        <div className={`mt-1.5 font-bold ${crVerify.ownerCheck.authorized ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {crVerify.ownerCheck.authorized ? cv.ownerOk : cv.ownerNo}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {crDup && (
                  <div className="text-xs rounded-xl p-3 border bg-amber-50 border-amber-300 text-amber-900">
                    <div className="font-bold mb-1.5">⚠ {locale === 'en' ? 'This commercial registration is already registered' : locale === 'ur' ? 'یہ تجارتی رجسٹریشن پہلے سے رجسٹرڈ ہے' : 'هذا السجل التجاري مسجّل مسبقاً'}{crDup.company ? ` — «${crDup.company}»` : ''}.</div>
                    <div className="space-y-1.5">
                      <div>• {locale === 'en' ? 'Have an account?' : locale === 'ur' ? 'اکاؤنٹ ہے؟' : 'لديك حساب؟'} <a href="/login" className="font-bold underline" style={{ color: '#0F6E56' }}>{locale === 'en' ? 'Sign in' : locale === 'ur' ? 'سائن ان' : 'سجّل الدخول'}</a></div>
                      <div>• {locale === 'en' ? 'To add a branch to the same account: sign in, then "Branches".' : locale === 'ur' ? 'اسی اکاؤنٹ میں شاخ شامل کرنے کے لیے: سائن اِن کریں، پھر «شاخیں»۔' : 'لإضافة فرع لنفس الحساب: سجّل الدخول ثم صفحة «فروعي».'}</div>
                      <label className="flex items-start gap-2 mt-1.5 cursor-pointer">
                        <input type="checkbox" checked={branchConfirmed} onChange={e => setBranchConfirmed(e.target.checked)} className="mt-0.5" />
                        <span>{locale === 'en' ? 'Or: this is a separate branch of the same company — continue with a separate account.' : locale === 'ur' ? 'یا: یہ اسی کمپنی کی الگ شاخ ہے — الگ اکاؤنٹ کے ساتھ جاری رکھیں۔' : 'أو: هذا فرع منفصل لنفس الشركة وأرغب بحساب مستقل — متابعة التسجيل.'}</span>
                      </label>

                      {/* Report a fake account registered with my CR */}
                      <div className="pt-2 mt-1 border-t border-amber-200">
                        {objSent ? (
                          <div className="text-emerald-700 font-semibold">✓ {locale === 'en' ? 'Your report was received. Our team will review it and contact you.' : locale === 'ur' ? 'آپ کی رپورٹ موصول ہوگئی۔ ہماری ٹیم جائزہ لے کر آپ سے رابطہ کرے گی۔' : 'تم استلام بلاغك. سيراجعه فريقنا ويتواصل معك.'}</div>
                        ) : !objOpen ? (
                          <button type="button" onClick={() => setObjOpen(true)} className="font-bold underline text-red-600">
                            🚩 {locale === 'en' ? 'This is my CR and this account is fake — report it' : locale === 'ur' ? 'یہ میرا CR ہے اور یہ اکاؤنٹ جعلی ہے — رپورٹ کریں' : 'هذا سجلي التجاري وهذا الحساب وهمي — أبلغ عنه'}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="font-semibold text-red-700">🚩 {locale === 'en' ? 'Report a fraudulent account' : locale === 'ur' ? 'جعلی اکاؤنٹ کی اطلاع' : 'الإبلاغ عن حساب وهمي'}</div>
                            <input value={objName} onChange={e => setObjName(e.target.value)} className="input-field text-xs" placeholder={locale === 'en' ? 'Your name' : locale === 'ur' ? 'آپ کا نام' : 'اسمك'} />
                            <input value={objPhone} onChange={e => setObjPhone(e.target.value)} className="input-field text-xs" dir="ltr" placeholder={locale === 'en' ? 'Your phone (05XXXXXXXX)' : '05XXXXXXXX'} />
                            <textarea value={objReason} onChange={e => setObjReason(e.target.value)} rows={2} className="input-field text-xs" placeholder={locale === 'en' ? 'Why is this account fraudulent?' : locale === 'ur' ? 'یہ اکاؤنٹ جعلی کیوں ہے؟' : 'لماذا هذا الحساب وهمي؟'} />
                            <div className="flex gap-2">
                              <button type="button" disabled={objSending} onClick={submitObjection} className="px-3 py-1.5 rounded-lg font-semibold text-white text-xs disabled:opacity-50" style={{ background: '#DC2626' }}>
                                {objSending ? '...' : (locale === 'en' ? 'Send report' : locale === 'ur' ? 'رپورٹ بھیجیں' : 'إرسال البلاغ')}
                              </button>
                              <button type="button" onClick={() => setObjOpen(false)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 text-gray-600">{locale === 'en' ? 'Cancel' : locale === 'ur' ? 'منسوخ' : 'إلغاء'}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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

                {watch('city') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === 'en' ? 'District' : locale === 'ur' ? 'علاقہ' : 'الحي'}</label>
                    <DistrictField city={watch('city')} value={district} onChange={setDistrict} locale={locale} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === 'en' ? 'Notification language (email/WhatsApp)' : locale === 'ur' ? 'اطلاعات کی زبان' : 'لغة الإشعارات (بريد/واتساب)'}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ k: 'ar', l: 'العربية' }, { k: 'en', l: 'English' }, { k: 'ur', l: 'اردو' }].map(o => (
                      <button key={o.k} type="button" onClick={() => setPrefLang(o.k as any)}
                        className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${prefLang === o.k ? 'border-[#F5831F] bg-[#F5831F]/5 text-[#d96f15]' : 'border-gray-200 text-gray-600'}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* name / phone / email / password are collected in step 1 (Account) */}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">{t.back}</button>
                <button type="button" onClick={async () => {
                  if (!selectedType) { setFormError(locale === 'en' ? 'Choose account type (contractor/supplier)' : 'اختر نوع الحساب (مقاول/مورد)'); return }
                  const valid = await trigger(['company_name_ar', 'commercial_registration', 'vat_number', 'region', 'city'])
                  if (!valid) return
                  if (crDup && !branchConfirmed) {
                    setFormError(locale === 'en' ? 'This commercial registration is already registered — sign in, or confirm it is a separate branch to continue.' : locale === 'ur' ? 'یہ تجارتی رجسٹریشن پہلے سے موجود ہے — سائن اِن کریں یا الگ شاخ کی تصدیق کریں۔' : 'هذا السجل التجاري مسجّل مسبقاً — سجّل الدخول، أو أكّد أنه فرع منفصل للمتابعة.')
                    return
                  }
                  if (phoneDup) {
                    setFormError(locale === 'en' ? 'This phone number is already registered — use a different one.' : locale === 'ur' ? 'یہ فون نمبر پہلے سے رجسٹرڈ ہے — مختلف نمبر استعمال کریں۔' : 'رقم الجوال مسجّل مسبقاً — استخدم رقماً آخر.')
                    return
                  }
                  setFormError('')
                  if (((watch('sectors') as string[]) || []).length === 0) autoDetectFromCR()
                  setStep(3)
                }} className="btn-primary flex-1">{t.next}</button>
              </div>
            </div>
          )}

          {/* Step 3: License upload */}
          {/* Step 3: Sectors + Specialties (documents are uploaded later from Settings) */}
          {step === 3 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-navy mb-1">{t.sectorsTitle}</h2>
              <p className="text-sm text-gray-500 mb-4">
                {selectedType === 'supplier' ? t.sectorsSubSupplier : t.sectorsSubContractor}
              </p>

              {/* تحليل النشاط التجاري — يحدّد القطاعات/التخصصات تلقائياً من واثق */}
              {crVerify?.activity && (
                <div className="rounded-xl p-3 mb-5 border text-xs" style={{ background: '#0F6E5610', borderColor: '#0F6E5633', color: '#0F6E56' }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold leading-relaxed">
                      {autoDetected > 0
                        ? (locale === 'en' ? `🔍 Auto-selected ${autoDetected} from your CR activity — review & adjust below.` : locale === 'ur' ? `🔍 آپ کے ریکارڈ سے ${autoDetected} خودکار منتخب — جائزہ لیں۔` : `🔍 حدّدنا ${autoDetected} تلقائياً من نشاط سجلك التجاري — راجِعها وعدّل بالأسفل.`)
                        : (locale === 'en' ? '🔍 Analyze your CR activity to auto-select your sectors & specialties.' : locale === 'ur' ? '🔍 ریکارڈ کی سرگرمی سے خودکار منتخب کریں۔' : '🔍 حلّل نشاط سجلك التجاري لتحديد قطاعاتك وتخصصاتك تلقائياً.')}
                    </span>
                    <button type="button" onClick={autoDetectFromCR} className="px-3 py-1.5 rounded-lg font-bold text-white shrink-0" style={{ background: '#0F6E56' }}>
                      {locale === 'en' ? '↻ Analyze' : locale === 'ur' ? '↻ تجزیہ' : '↻ تحليل'}
                    </button>
                  </div>
                </div>
              )}

              {/* CONTRACTOR — simple multi-select sector cards */}
              {selectedType !== 'supplier' && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {(Object.keys(SECTOR_LABELS) as Sector[]).map(sector => (
                    <button key={sector} type="button" onClick={() => toggleSector(sector)}
                      className={`p-4 rounded-xl border-2 transition-all ${sectors?.includes(sector) ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-[#F5831F]/40'}`}
                      style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                      <div className="font-semibold text-sm text-navy">{sl(sector)}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* SUPPLIER — accordion: one sector open at a time, with its specialties + materials */}
              {selectedType === 'supplier' && (
                <div className="space-y-2 mb-5">
                  {(Object.keys(SECTOR_LABELS) as Sector[]).map(sector => {
                    const selected = sectors?.includes(sector)
                    const isOpen = openSector === sector
                    const subs = SUB_CATEGORIES[sector] || {}
                    const subKeys = Object.keys(subs)
                    const selCount = specialties.filter(s => subKeys.includes(s)).length
                    const color = SECTOR_COLORS[sector]
                    const sectorMats = extraMaterials.filter(m => m.sector === sector)
                    const groups: Record<string, string[]> = {}
                    Object.entries(subs).forEach(([key, sub]: any) => { (groups[sub.group] = groups[sub.group] || []).push(key) })
                    return (
                      <div key={sector} className={`rounded-xl border-2 overflow-hidden transition-all ${selected ? 'border-[#F5831F]' : 'border-gray-200'}`}>
                        <div onClick={() => { if (!selected) toggleSector(sector); setOpenSector(isOpen ? null : sector) }}
                          className={`w-full flex items-center justify-between p-3.5 cursor-pointer ${selected ? 'bg-[#F5831F]/5' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm" style={{ color: selected ? color : '#374151' }}>{sl(sector)}</span>
                            {selCount > 0 && <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: color }}>{selCount}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {selected && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setSpecialties(prev => prev.filter(s => !subKeys.includes(s))); setExtraMaterials(prev => prev.filter(m => m.sector !== sector)); toggleSector(sector); if (isOpen) setOpenSector(null) }}
                                className="text-[11px] text-red-400 hover:text-red-600">إزالة</button>
                            )}
                            <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="p-3 border-t border-gray-100 bg-white">
                            {sortGroupKeys(Object.keys(groups)).map((groupKey) => {
                              const keys = groups[groupKey]
                              const grp = GROUP_LABELS[groupKey]
                              const grpLabel = grp ? (locale === 'en' ? grp.en : locale === 'ur' ? grp.ur : grp.ar) : groupKey
                              const selInGroup = keys.filter(k => specialties.includes(k)).length
                              return (
                                <div key={groupKey} className="mb-3 bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                  <div className="flex items-center gap-2 mb-2.5">
                                    <span className="text-base">{grp?.icon}</span>
                                    <span className="text-sm font-bold text-gray-700">{grpLabel}</span>
                                    {selInGroup > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{selInGroup}</span>}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {keys.map(key => {
                                      const sub = subs[key]
                                      const active = specialties.includes(key)
                                      const subLabel = locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
                                      return (
                                        <button key={key} type="button" onClick={() => toggleSpecialty(key)}
                                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all bg-white ${active ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                                          style={{ textAlign: dir === 'rtl' ? 'right' : 'left', ...(active ? { borderColor: color, background: color + '0d' } : {}) }}>
                                          <span className="text-lg">{sub.icon}</span>
                                          <span className="text-xs font-semibold flex-1 leading-tight" style={active ? { color } : { color: '#374151' }}>{subLabel}</span>
                                          {active && <span style={{ color }}>✓</span>}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}

                            {/* add a missing material UNDER this open sector */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="text-[11px] font-bold text-gray-600 mb-1.5">{t.addMatTitle}</div>
                              <div className="flex gap-2">
                                <input type="text" value={extraMaterialInput} onChange={e => setExtraMaterialInput(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtraMaterial(sector) } }}
                                  className="input-field flex-1" placeholder={t.addMatPh} />
                                <button type="button" onClick={() => addExtraMaterial(sector)} className="px-4 rounded-xl text-sm font-bold text-white shrink-0" style={{ background: '#1B2D5B' }}>{t.addMatBtn}</button>
                              </div>
                              {sectorMats.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {sectorMats.map(m => (
                                    <span key={m.name} className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                      {m.name}
                                      <button type="button" onClick={() => setExtraMaterials(prev => prev.filter(x => !(x.name === m.name && x.sector === sector)))} className="text-amber-500 hover:text-amber-800 font-bold leading-none">×</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {errors.sectors && (
                <p className="text-red-500 text-sm mb-4">{errors.sectors.message}</p>
              )}

              {/* ── تصنيف المورد ── */}
              {selectedType === 'supplier' && (
                <div className="mb-5 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-navy mb-1">{t.companyClass}</h3>
                  <p className="text-xs text-gray-500 mb-3">{t.classHintSupplier}</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { key: 'manufacturer', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M3 21h18" /><path d="M3 21V11l4 2.5V11l4 2.5V11l4 2.5V8l4 2.5V21" /><path d="M7 7V4l2 1.6L11 4v3" /><path d="M6.5 17h.01M10.5 17h.01M14.5 17h.01M18 17h.01" /></svg>, label: t.manufacturer, desc: t.manufacturerD },
                      { key: 'commercial', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M2 8.5 12 4l10 4.5" /><path d="M4 10v10h16V10" /><rect x="9" y="13" width="6" height="7" /><path d="M7 10.5h.01M17 10.5h.01" /></svg>, label: t.commercial, desc: t.commercialD },
                      { key: 'local', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M4 9h16l-1-4H5L4 9z" /><path d="M5 9v11h14V9" /><path d="M9 20v-5a3 3 0 0 1 6 0v5" /></svg>, label: t.local, desc: t.localD },
                    ].map(tier => (
                      <button key={tier.key} type="button"
                        onClick={() => setSupplierTier(tier.key as any)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          supplierTier === tier.key ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="w-10 h-10 rounded-xl grid place-items-center mx-auto mb-1.5" style={{ background: supplierTier === tier.key ? 'rgba(245,131,31,.12)' : '#eef2f8', color: supplierTier === tier.key ? '#F5831F' : '#1B2D5B' }}>{tier.svg}</div>
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
                  <h3 className="text-sm font-bold text-navy mb-1">{t.gradeTitle}</h3>
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

              <label className="flex items-start gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#1B2D5B] flex-shrink-0" />
                <span className="text-xs text-gray-600 leading-relaxed">
                  {locale === 'en' ? 'I agree to the ' : locale === 'ur' ? 'میں متفق ہوں ' : 'أوافق على '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#F5831F' }}>
                    {locale === 'en' ? 'Terms & Conditions' : locale === 'ur' ? 'شرائط و ضوابط' : 'الشروط والأحكام'}
                  </a>
                  {locale === 'en' ? ' and ' : ' و'}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#F5831F' }}>
                    {locale === 'en' ? 'Privacy Policy' : locale === 'ur' ? 'پرائیویسی پالیسی' : 'سياسة الخصوصية'}
                  </a>
                </span>
              </label>

              <div className="flex justify-center mb-1">
                <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost flex-1">{t.back}</button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploading || !agreedToTerms}
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
