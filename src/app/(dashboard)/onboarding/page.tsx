'use client'

import { useEffect, useState } from 'react'
import { nearestSaCity } from '@/lib/saCityCoords'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import PageLoader from '@/components/shared/PageLoader'
import DistrictField from '@/components/shared/DistrictField'
import LocationPicker from '@/components/shared/LocationPicker'
import SpecialtyPicker from '@/components/shared/SpecialtyPicker'
import SupplierPackPicker from '@/components/shared/SupplierPackPicker'
import SellerKindPicker from '@/components/shared/SellerKindPicker'
import { SIGNUP_KIND_KEY, SELLER_KINDS, sellerKindLabel, sellerKindOf, sectorsFor, COMPANY_ACTIVITIES } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import { askConfirm } from '@/lib/askConfirm'
import { rememberBuyerType } from '@/lib/buyerType'
import { Check } from 'lucide-react'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { REGIONS, SECTOR_LABELS, SUB_CATEGORIES, getRegionLabel, CITIES_BY_REGION } from '@/types'
import { CONTRACTOR_FEATURES } from '@/lib/features'
import Glyph from '@/components/shared/Glyph'
import { takePostSignupNext } from '@/lib/postSignupNext'
import { toast } from 'sonner'
import { normalizeCrInput, isUnifiedCr, crTakenText, isCrTaken, crSupportHref } from '@/lib/cr'
import BuyerTypeCards, { BuyerTypeSummary } from '@/components/auth/BuyerTypeCards'

// ── إعداد ملفك التجاري (Progressive profiling) ────────────────────────────
// تُعبّأ هنا البيانات المنقولة خارج التسجيل: الموقع + القطاعات + (للمقاول: الدرجة)
// + (للمورّد: التخصصات + التصنيف + الحد الأدنى). التوثيق (السجل/المستندات) في الإعدادات.
// كل الجداول يديرها المستخدم لنفسه عبر RLS (profile_id = auth.uid()).
const SECTOR_TR: Record<string, any> = {
  civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'تعمیراتی' },
  electrical: { en: 'Electrical', ur: 'برقی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
  equipment: { en: 'Machinery', ur: 'مشینری' }, supply_store: { en: 'Supply Store', ur: 'سپلائی اسٹور' },
}

const TR = {
  ar: {
    title: 'إعداد ملفك التجاري', subC: 'أضف موقعك، ليصل طلبك إلى الموردين القريبين منك.', subS: 'أضف موقعك وما تبيعه لتظهر للمشترين وتصلك الطلبات المطابقة',
    location: 'الموقع', region: 'المنطقة', selectRegion: '-- اختر --', city: 'المدينة', district: 'الحي',
    sectorsTitleC: 'قطاعات عملك', sectorsHintC: 'اختياري: يمكنك تخطّي هذه الخطوة، فطلبك يصل إلى الموردين المناسبين بحسب المواد التي تطلبها.',
    sectorsTitleS: 'تخصصاتك والمواد', sectorsHintS: 'اختر ما تبيعه، وتُحدَّد قطاعاتك منه تلقائياً',
    classTitle: 'نوع الحساب', classHint: 'هل تمثّل شركة أو محلاً، أم تعمل وسيط تسعير؟ لا يمكن تغييره لاحقاً إلا بطلب من الدعم وموافقة الإدارة.',
    minOrder: 'الحد الأدنى لقيمة الطلب (ر.س) — اختياري', minOrderPh: 'مثال: 50000', minOrderHint: 'اتركه فارغاً لقبول كل الطلبات، أو حدّده لتصفية الطلبات حسب قدرتك التوريدية.',
    gradeTitle: 'درجة تصنيف شركتك (للمقاولين)', gradeSub: 'من رخصتك (وزارة الشؤون البلدية) — يستخدمها الموردون لفلترة الطلبات حسب حجم المشروع. اختياري.',
    verifyTitle: 'وثّق نشاطك التجاري', verifyBody: 'أرفق مستندات منشأتك ليراجعها الفريق، فتظهر شارة «موثّق» على عروضك لدى المشترين وترتفع فرصك في الفوز بالطلبات.', verifyCta: 'احفظ وابدأ التوثيق ←', verifyLocked: 'أكمل موقعك وما تبيعه أعلاه لتُفتح خطوة التوثيق.',
    addMatTitle: 'لا تجد مادة تورّدها في القائمة؟', addMatPh: 'اسم المادة...', addMatBtn: 'إضافة', remove: 'إزالة',
    save: 'حفظ ومتابعة ←', saving: 'جارٍ الحفظ...', later: 'لاحقاً', selected: 'محدد',
    needLoc: 'اختر المنطقة والمدينة', needSector: 'اختر قطاعاً واحداً على الأقل', saved: 'تم حفظ ملفك',
    progress: 'اكتمال ملفك', stepKind: 'نوع الحساب', stepActivity: 'النشاط الرئيسي', stepLocation: 'الموقع', stepSectors: 'القطاعات', stepSpecialties: 'ما تبيعه', stepVerify: 'التوثيق (لاحقاً)', stepMap: 'الموقع على الخريطة', stepBiz: 'اسم المحل', stepCr: 'السجل التجاري', left: 'باقٍ',
    warn: 'بدون موقعك وما تبيعه لن تظهر للمشترين ولن تصلك أي طلبات.',
    company: 'ملف الشركة', required: 'مطلوب', optional: 'اختياري',
    loadFailed: 'تعذّر تحميل بيانات ملفك. حدّث الصفحة وحاول مرة أخرى قبل الحفظ حتى لا تُستبدل بياناتك المحفوظة.',
    saveFailed: 'تعذّر حفظ ملفك، ولم يُغيَّر شيء مما تبيعه في ملفك المحفوظ. تحقّق من اتصالك ثم حاول مرة أخرى.',
    addrFailed: 'تعذّر حفظ عنوان التوصيل. تحقّق من اتصالك ثم حاول مرة أخرى.',
    profileFailed: 'تعذّر حفظ الموقع والبيانات الأساسية. تحقّق من اتصالك ثم حاول مرة أخرى.',
    matFailed: 'حُفظ ملفك، لكن تعذّر إرسال بعض المواد المقترحة. اضغط «حفظ» مرة أخرى لإعادة إرسالها.',
    kindFailed: 'تعذّر تطبيق نوع الحساب تلقائياً، يُرجى اختياره يدوياً أدناه.',
    bizName: 'اسم المحل أو النشاط التجاري', bizHint: 'يظهر للمشترين على عروضك', bizPh: 'مثال: مؤسسة الصخر لمواد البناء', needBiz: 'اكتب اسم المحل أو النشاط التجاري', needSpec: 'اختر نوعاً واحداً على الأقل مما تبيعه حتى تصلك الطلبات',
  },
  en: {
    title: 'Set up your business profile', subC: 'Add your location, so your request reaches the suppliers near you.', subS: 'Add your location and what you sell to appear to buyers and receive matching requests',
    location: 'Location', region: 'Region', selectRegion: '-- Select --', city: 'City', district: 'District',
    sectorsTitleC: 'Your sectors', sectorsHintC: 'Optional: you can skip this. Your request reaches the right suppliers based on the materials you ask for.',
    sectorsTitleS: 'Specialties & materials', sectorsHintS: 'Choose what you sell; your sectors follow from it',
    classTitle: 'Account type', classHint: 'Do you represent a company or shop, or work as a pricing agent? It can only be changed later through Support, with admin approval.',
    minOrder: 'Min order value (SAR) — optional', minOrderPh: 'e.g. 50000', minOrderHint: 'Leave empty to accept all requests — or set it to filter by your supply capacity.',
    gradeTitle: 'Company grade (contractors)', gradeSub: 'From your license (Ministry of Municipal Affairs) — suppliers use it to filter by project size. Optional.',
    verifyTitle: 'Verify your business', verifyBody: 'Attach your business documents for the team to review; a «Verified» badge then shows on your offers and raises your chance of winning requests.', verifyCta: 'Save & start verification →', verifyLocked: 'Complete your location and what you sell above to unlock verification.',
    addMatTitle: "Can't find a material you supply?", addMatPh: 'Material name...', addMatBtn: 'Add', remove: 'Remove',
    save: 'Save & continue →', saving: 'Saving...', later: 'Later', selected: 'selected',
    needLoc: 'Select region and city', needSector: 'Select at least one sector', saved: 'Profile saved',
    progress: 'Profile completion', stepKind: 'Account type', stepActivity: 'Main activity', stepLocation: 'Location', stepSectors: 'Sectors', stepSpecialties: 'What you sell', stepVerify: 'Verification (later)', stepMap: 'Map location', stepBiz: 'Shop name', stepCr: 'Commercial registration', left: 'Left',
    warn: "Without your location and what you sell you won't appear to buyers and won't receive any requests.",
    company: 'Company profile', required: 'Required', optional: 'Optional',
    loadFailed: 'Could not load your profile. Refresh the page and try again before saving so your saved data is not replaced.',
    saveFailed: 'Could not save your profile; what you sell in your saved profile was not changed. Check your connection and try again.',
    addrFailed: 'Could not save the delivery address. Check your connection and try again.',
    profileFailed: 'Could not save your location and basic details. Check your connection and try again.',
    matFailed: 'Your profile was saved, but some suggested materials could not be sent. Press Save again to resend them.',
    kindFailed: 'Could not apply your account type automatically; please pick it below.',
    bizName: 'Shop or business name', bizHint: 'Shown to buyers on your offers', bizPh: 'e.g. Al-Sakhr Building Materials', needBiz: 'Write your shop or business name', needSpec: 'Pick at least one thing you sell so requests can reach you',
  },
  ur: {
    title: 'اپنی کاروباری پروفائل ترتیب دیں', subC: 'اپنا مقام شامل کریں تاکہ آپ کی درخواست قریبی سپلائرز تک پہنچے۔', subS: 'خریداروں کو نظر آنے اور مماثل درخواستیں وصول کرنے کے لیے مقام اور آپ کیا بیچتے ہیں شامل کریں',
    location: 'مقام', region: 'علاقہ', selectRegion: '-- منتخب کریں --', city: 'شہر', district: 'محلہ',
    sectorsTitleC: 'آپ کے شعبے', sectorsHintC: 'اختیاری: آپ یہ مرحلہ چھوڑ سکتے ہیں۔ آپ کی درخواست مطلوبہ مواد کے مطابق درست سپلائرز تک پہنچتی ہے۔',
    sectorsTitleS: 'تخصصات اور مال', sectorsHintS: 'منتخب کریں آپ کیا بیچتے ہیں؛ آپ کے شعبے اسی سے طے ہوں گے',
    classTitle: 'اکاؤنٹ کی قسم', classHint: 'کیا آپ کمپنی یا دکان کی نمائندگی کرتے ہیں یا قیمت ایجنٹ ہیں؟ بعد میں صرف سپورٹ کے ذریعے، انتظامیہ کی منظوری سے بدلا جا سکتا ہے۔',
    minOrder: 'کم از کم آرڈر قیمت (ریال) — اختیاری', minOrderPh: 'مثال: 50000', minOrderHint: 'تمام درخواستوں کے لیے خالی چھوڑیں یا اپنی صلاحیت کے مطابق مقرر کریں۔',
    gradeTitle: 'کمپنی کا درجہ (ٹھیکیداروں کے لیے)', gradeSub: 'آپ کے لائسنس سے — سپلائرز پروجیکٹ سائز کے مطابق فلٹر کرتے ہیں۔ اختیاری۔',
    verifyTitle: 'اپنے کاروبار کی تصدیق کریں', verifyBody: 'اپنے ادارے کی دستاویزات منسلک کریں تاکہ ٹیم جائزہ لے؛ پھر آپ کی آفرز پر «تصدیق شدہ» بیج دکھے گا۔', verifyCta: 'محفوظ کریں اور تصدیق شروع کریں ←', verifyLocked: 'تصدیق کھولنے کے لیے اوپر اپنا مقام اور آپ کیا بیچتے ہیں مکمل کریں۔',
    addMatTitle: 'فہرست میں کوئی مواد نہیں؟', addMatPh: 'مواد کا نام...', addMatBtn: 'شامل کریں', remove: 'ہٹائیں',
    save: 'محفوظ کریں اور جاری رکھیں ←', saving: 'محفوظ ہو رہا ہے...', later: 'بعد میں', selected: 'منتخب',
    needLoc: 'علاقہ اور شہر منتخب کریں', needSector: 'کم از کم ایک شعبہ منتخب کریں', saved: 'پروفائل محفوظ',
    progress: 'پروفائل تکمیل', stepKind: 'اکاؤنٹ کی قسم', stepActivity: 'بنیادی سرگرمی', stepLocation: 'مقام', stepSectors: 'شعبے', stepSpecialties: 'آپ کیا بیچتے ہیں', stepVerify: 'تصدیق (بعد میں)', stepMap: 'نقشے پر مقام', stepBiz: 'دکان کا نام', stepCr: 'تجارتی رجسٹریشن', left: 'باقی',
    warn: 'اپنے مقام اور آپ کیا بیچتے ہیں، اس کے بغیر آپ خریداروں کو نظر نہیں آئیں گے اور کوئی درخواست موصول نہیں ہوگی۔',
    company: 'کمپنی پروفائل', required: 'ضروری', optional: 'اختیاری',
    loadFailed: 'آپ کی پروفائل لوڈ نہیں ہو سکی۔ محفوظ کرنے سے پہلے صفحہ ریفریش کریں تاکہ آپ کا محفوظ ڈیٹا تبدیل نہ ہو۔',
    saveFailed: 'پروفائل محفوظ نہیں ہو سکی؛ آپ کی محفوظ پروفائل میں کچھ تبدیل نہیں ہوا۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
    addrFailed: 'ڈیلیوری کا پتہ محفوظ نہیں ہو سکا۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
    profileFailed: 'مقام اور بنیادی معلومات محفوظ نہیں ہو سکیں۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
    matFailed: 'پروفائل محفوظ ہو گئی، لیکن کچھ تجویز کردہ مواد نہیں بھیجے جا سکے۔ دوبارہ بھیجنے کے لیے پھر سے محفوظ کریں۔',
    kindFailed: 'اکاؤنٹ کی قسم خود بخود لاگو نہیں ہو سکی، براہ کرم نیچے منتخب کریں۔',
    bizName: 'دکان یا کاروبار کا نام', bizHint: 'خریدار آپ کی آفر پر یہی نام دیکھیں گے', bizPh: 'مثلاً الصخر بلڈنگ میٹریلز', needBiz: 'دکان یا کاروبار کا نام لکھیں', needSpec: 'درخواستیں پانے کے لیے کم از کم ایک چیز منتخب کریں جو آپ بیچتے ہیں',
  },
}

export default function OnboardingPage() {
  const { locale, dir } = useTranslation()
  const t = TR[locale] || TR.ar
  const supabase = createClient()
  const sl = (s: any) => locale === 'ar' ? (SECTOR_LABELS as any)[s] : (SECTOR_TR[s]?.[locale] || (SECTOR_LABELS as any)[s])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState('')
  const [role, setRole] = useState<'contractor' | 'supplier'>('contractor')
  // a home buyer («لبيتي»): only the delivery address, no business wording and no sectors (UX study 2026-11-22)
  const [homeBuyer, setHomeBuyer] = useState(false)
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [sectors, setSectors] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [openSector, setOpenSector] = useState<string | null>(null)
  const [supplierTier, setSupplierTier] = useState<string | null>(null)
  const [providerType, setProviderType] = useState('')
  const [crNo, setCrNo] = useState('') // UX-125: say which CR was entered at sign-up
  // round-2 UX-076: choosing «company or shop» asks for the CR when none was given at sign-up
  const [crInput, setCrInput] = useState('')
  const [crAsk, setCrAsk] = useState(false)
  // UX-010 / UX-040: a CR held by another account: shown under the field, with «تواصل مع الدعم»
  const [crTakenNo, setCrTakenNo] = useState('')
  const [crBusy, setCrBusy] = useState(false)
  // UX-080: a business buyer's company name and VAT number (optional; shown on purchase orders)
  const [buyerCo, setBuyerCo] = useState('')
  const [buyerVat, setBuyerVat] = useState('')
  // round-2 UX-037: the map pin changed the city: say so
  const [cityNote, setCityNote] = useState('')
  const [editBuyer, setEditBuyer] = useState(false)
  const [buyerType, setBuyerType] = useState<string>('') // UX-072: asked first when empty
  const [kindBusy, setKindBusy] = useState(false)
  // فرد / وكيل أسعار / سمسار: ما عنده محل ولا سجل — ثقته من التقييمات، فما نسأله تصنيف ولا توثيق
  const isIndividual = ['individual', 'price_agent', 'broker'].includes(providerType)
  // a company's main activity is chosen (provider_type is one of the four activities, not the bare «company»)
  const hasActivity = COMPANY_ACTIVITIES.some(a => a.k === providerType) || providerType === 'dealer'
  // business name for a company seller: the WhatsApp sign-up only asks for the person's name
  const [bizName, setBizName] = useState('')
  const [bizOrig, setBizOrig] = useState('')
  const [contractorGrade, setContractorGrade] = useState<'A' | 'B' | 'C' | 'D' | ''>('')
  const [extraMaterials, setExtraMaterials] = useState<{ sector: string; name: string }[]>([])
  const [extraMaterialInput, setExtraMaterialInput] = useState('')
  const [err, setErr] = useState('')
  // فشل تحميل القطاعات/التخصصات المحفوظة: نمنع الحفظ حتى لا تُستبدل البيانات المحفوظة بقائمة فارغة.
  const [loadFailed, setLoadFailed] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false) // round-4 UX-059: the phone list of steps

  // round-4 UX-059: an error takes the seller to the field it is about (and is also shown at the bottom)
  function showErr(m: string, field?: string) {
    setErr(m)
    setTimeout(() => {
      try {
        const el = field ? document.getElementById(field) : null
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) (el as HTMLElement).focus({ preventScroll: true })
          else { el.style.outline = '2px solid #D4A543'; el.style.borderRadius = '16px'; setTimeout(() => { el.style.outline = '' }, 1800) }
        } else document.getElementById('onboarding-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch {}
    }, 50)
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUid(session.user.id)
      // UX-027: a company team member acts for the company; there is nothing to set up here
      try {
        const { data: act } = await supabase.rpc('acting_uid')
        if (act && act !== session.user.id) { window.location.replace('/supplier/dashboard'); return }
      } catch {}
      const metaRole = (session.user.user_metadata as any)?.role
      const { data: p, error: pErr } = await supabase.from('profiles').select('role, buyer_type, region, city, district, supplier_tier, min_order_value, contractor_grade, latitude, longitude, provider_type, full_name, company_name_ar, commercial_registration, vat_number').eq('id', session.user.id).single()
      if (pErr) { setLoadFailed(true); showErr(t.loadFailed) }
      setRole(((p?.role || metaRole) === 'supplier') ? 'supplier' : 'contractor')
      setHomeBuyer(p?.buyer_type === 'individual')
      setBuyerType(p?.buyer_type || '')
      setCrNo(p?.commercial_registration || '')
      if (p) {
        setRegion(p.region || ''); setCity(p.city || ''); setDistrict(p.district || '')
        setLat(p.latitude ?? null); setLng(p.longitude ?? null)
        if (p.supplier_tier) setSupplierTier(p.supplier_tier)
        setProviderType(p.provider_type || '')
        const cn = (p.company_name_ar || '').trim()
        const own = !cn || cn === 'شركة جديدة' || cn === (p.full_name || '').trim()
        setBizName(own ? '' : cn); setBizOrig(own ? '' : cn)
        setBuyerCo(own ? '' : cn); setBuyerVat(p.vat_number || '')
        // Invitation links (/join/company, /join/seller) pass the kind at signup: apply it once.
        // only the kind the seller tapped on the sign-up form; a device hint (e.g. an old /join visit) just pre-selects nothing (owner 2026-11-19)
        const metaKind = (session.user.user_metadata as any)?.seller_kind
        try { localStorage.removeItem(SIGNUP_KIND_KEY) } catch {}
        // a seller who came from the /join invite link: count the sign-up for that batch once (241)
        if (p.role === 'supplier') { try { const ic = localStorage.getItem('tsk_invite_code'); if (ic) { localStorage.removeItem('tsk_invite_code'); supabase.rpc('claim_invite_signup', { p_code: ic }).then(() => {}, () => {}) } } catch {} }
        if (p.role === 'supplier' && !p.provider_type && (metaKind === 'company' || metaKind === 'independent')) {
          const { data: np, error: kErr } = await supabase.rpc('set_seller_kind', { p_kind: metaKind, p_activity: null })
          if (kErr) showErr(t.kindFailed)
          else if (np) setProviderType(String(np))
        }
        if (p.contractor_grade) setContractorGrade(p.contractor_grade)
      }
      const [{ data: ps, error: psErr }, { data: psp, error: pspErr }] = await Promise.all([
        supabase.from('profile_sectors').select('sector').eq('profile_id', session.user.id),
        supabase.from('profile_specialties').select('specialty').eq('profile_id', session.user.id),
      ])
      if (psErr || pspErr) { setLoadFailed(true); showErr(t.loadFailed) }
      if (ps) setSectors(ps.map((r: any) => r.sector))
      if (psp) setSpecialties(psp.map((r: any) => r.specialty))
      setLoading(false)
    })()
  }, [])

  // UX-072: «لمن تشتري؟» saved at once, and the page adapts
  async function chooseBuyerType(v: 'individual' | 'business') {
    setBuyerType(v); setHomeBuyer(v === 'individual'); rememberBuyerType(v)
    const { error } = await supabase.from('profiles').update({ buyer_type: v }).eq('id', uid)
    if (error) showErr(locale === 'en' ? 'Could not save your choice; it will be asked again later.' : locale === 'ur' ? 'آپ کا انتخاب محفوظ نہیں ہو سکا؛ بعد میں دوبارہ پوچھا جائے گا۔' : 'تعذّر حفظ اختيارك، وسيُسأل عنه لاحقاً.')
  }
  // UX-125: the account kind starts empty and is confirmed before it is locked
  async function chooseKind(k: 'company' | 'independent') {
    const label = sellerKindLabel(k, locale)
    let newCr = ''
    if (k === 'company' && !crNo) {
      const c = normalizeCrInput(crInput)
      if (!isUnifiedCr(c)) {
        setCrAsk(true)
        showErr(locale === 'en' ? 'A company or shop needs its commercial registration number (10 digits starting with 7). No registration? Choose «Pricing agent».' : locale === 'ur' ? 'کمپنی یا دکان کے لیے تجارتی رجسٹریشن نمبر ضروری ہے (7 سے شروع، 10 ہندسے)۔ رجسٹریشن نہیں؟ «قیمت ایجنٹ» منتخب کریں۔' : 'تحتاج الشركة أو المحل إلى رقم السجل التجاري (10 أرقام يبدأ بـ7). ليس لديك سجل؟ اختر «وسيط تسعير».')
        setTimeout(() => document.getElementById('ob-cr')?.focus(), 50)
        return
      }
      newCr = c
    }
    // UX-010: the CR is saved BEFORE the kind is locked; a CR held by another account stops here
    if (newCr && !(await saveCr(newCr))) return
    if (!(await askConfirm(locale === 'en' ? `Set your account type to «${label}»? It can only be changed later through Support.` : locale === 'ur' ? `اکاؤنٹ کی قسم «${label}» مقرر کریں؟ بعد میں صرف سپورٹ کے ذریعے بدلی جا سکتی ہے۔` : `تحديد نوع حسابك «${label}»؟ لا يمكن تغييره لاحقاً إلا بطلب من الدعم.`, { okLabel: locale === 'en' ? 'Yes, confirm' : locale === 'ur' ? 'ہاں، تصدیق کریں' : 'نعم، أكّد', cancelLabel: locale === 'en' ? 'Go back' : locale === 'ur' ? 'واپس' : 'تراجع' }))) return
    setKindBusy(true)
    const { data: np, error } = await supabase.rpc('set_seller_kind', { p_kind: k, p_activity: k === 'company' ? 'company' : null })
    setKindBusy(false)
    if (error) { showErr(t.kindFailed); return }
    setProviderType(String(np || (k === 'independent' ? 'individual' : 'company')))
  }

  // UX-010 / UX-039: save the CR on its own; true when saved. A CR held by another account is said under the field.
  async function saveCr(c: string): Promise<boolean> {
    setCrTakenNo(''); setErr('')
    if (!isUnifiedCr(c)) { setCrAsk(true); showErr(locale === 'en' ? 'Enter the unified national number: 10 digits starting with 7.' : locale === 'ur' ? 'متحدہ قومی نمبر درج کریں: 7 سے شروع، 10 ہندسے۔' : 'أدخل الرقم الوطني الموحد: 10 أرقام يبدأ بـ7.'); return false }
    setCrBusy(true)
    const { error: crErr } = await supabase.from('profiles').update({ commercial_registration: c }).eq('id', uid)
    setCrBusy(false)
    if (crErr) {
      if (isCrTaken(crErr) || /duplicate|unique|23505|CR_TAKEN/i.test(`${crErr.message || ''} ${(crErr as any).hint || ''}`)) { setCrTakenNo(c); setCrAsk(true); return false }
      showErr(t.profileFailed); return false
    }
    setCrNo(c); setCrAsk(false)
    return true
  }

  function toggleSector(s: string) {
    if (sectors.includes(s)) {
      const subKeys = Object.keys((SUB_CATEGORIES as any)[s] || {})
      setSpecialties(prev => prev.filter(x => !subKeys.includes(x)))
      setExtraMaterials(prev => prev.filter(m => m.sector !== s))
      setSectors(prev => prev.filter(x => x !== s))
    } else setSectors(prev => [...prev, s])
  }
  function toggleSpecialty(k: string) { setSpecialties(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]) }
  function addExtraMaterial(sector: string) {
    const v = extraMaterialInput.trim()
    if (!v || !sector) return
    setExtraMaterials(prev => prev.some(m => m.name === v && m.sector === sector) ? prev : [...prev, { sector, name: v }])
    setExtraMaterialInput('')
  }

  async function save(dest?: string) {
    setErr('')
    if (loadFailed) { showErr(t.loadFailed); return }
    if (role === 'supplier' && !providerType) { showErr(locale === 'en' ? 'Choose your account type first.' : locale === 'ur' ? 'پہلے اکاؤنٹ کی قسم منتخب کریں۔' : 'اختر نوع حسابك أولاً.', 'ob-kind'); return }
    // UX-038: a company names its main activity (the star on «ما نشاطك الرئيسي؟» is enforced)
    if (role === 'supplier' && !isIndividual && !hasActivity) { showErr(locale === 'en' ? 'Choose your main activity: building-materials shop, agent / distributor, trading company or factory.' : locale === 'ur' ? 'اپنی بنیادی سرگرمی منتخب کریں: تعمیراتی سامان کی دکان، ایجنٹ / ڈسٹری بیوٹر، تجارتی کمپنی یا فیکٹری۔' : 'اختر نشاطك الرئيسي: محل مواد بناء، أو وكيل وموزّع، أو شركة تجارية، أو مصنع.', 'ob-kind'); return }
    // UX-060: a buyer says who they buy for before anything else
    if (role !== 'supplier' && !buyerType) { showErr(locale === 'en' ? 'Choose who you are buying for first.' : locale === 'ur' ? 'پہلے منتخب کریں کہ آپ کس کے لیے خرید رہے ہیں۔' : 'اختر لمن تشتري أولاً.', 'ob-buyer'); return }
    // round-4 UX-059: a company or shop cannot finish without its commercial registration (a CR held by another account keeps blocking)
    if (role === 'supplier' && !isIndividual && !crNo) { setCrAsk(true); showErr(locale === 'en' ? 'Add your commercial registration number (10 digits starting with 7) and press «Save».' : locale === 'ur' ? 'اپنا تجارتی رجسٹریشن نمبر (7 سے شروع، 10 ہندسے) درج کریں اور «محفوظ کریں» دبائیں۔' : 'أدخل رقم سجلك التجاري (10 أرقام يبدأ بـ7) واضغط «حفظ».', 'ob-cr2'); return }
    if (role === 'supplier' && !isIndividual && bizName.trim().length < 2) { showErr(t.needBiz, 'ob-biz'); return }
    if (!region || !city) { showErr(t.needLoc, !region ? 'ob-region' : 'ob-city'); return }
    // القطاعات إلزامية للمورّد فقط؛ المشتري يكفيه الموقع (التوجيه يتم من مواد الطلب).
    // UX-139: a material typed but not added with «إضافة» is added on save
    const pendingMat = extraMaterialInput.trim()
    const extraNow = pendingMat && role === 'supplier' ? [...extraMaterials.filter(m => !(m.name === pendingMat)), { sector: openSector || sectors[0] || '', name: pendingMat }] : extraMaterials
    if (pendingMat && role === 'supplier') { setExtraMaterials(extraNow); setExtraMaterialInput('') }
    if (role === 'supplier' && specialties.length === 0) { showErr(t.needSpec, 'ob-specs'); return }
    // نتحقّق من البيانات قبل أي كتابة: قطاعات معروفة فقط (عمود enum) وبلا تكرار.
    // UX-038: the sectors follow from the materials chosen (picking materials without ticking a sector still saves)
    const validSectors = Array.from(new Set(sectorsFor(sectors, specialties).filter(s => Object.prototype.hasOwnProperty.call(SECTOR_LABELS, s))))
    const validSpecialties = Array.from(new Set(specialties.filter(k => typeof k === 'string' && k.trim() !== '')))
    if (role === 'supplier' && validSectors.length === 0) { showErr(t.needSector, 'ob-specs'); return }
    if (role === 'supplier' && !isIndividual && (lat == null || lng == null)) {
      showErr(locale === 'en' ? 'Set your shop location on the map, so buyers near you receive your offers.' : locale === 'ur' ? 'نقشے پر اپنی دکان کا مقام منتخب کریں تاکہ قریبی خریداروں تک آپ پہنچیں۔' : 'حدّد موقع محلك على الخريطة، ليصل إليك المشترون القريبون منك.', 'ob-map')
      return
    }
    setSaving(true)
    try {
      const update: any = { region, city, district: district || null, preferred_language: locale }
      if (lat != null && lng != null) { update.latitude = lat; update.longitude = lng }
      if (role === 'supplier' && !isIndividual && bizName.trim() && bizName.trim() !== bizOrig) update.company_name_ar = bizName.trim().slice(0, 120)
      if (role === 'contractor') update.contractor_grade = contractorGrade || null
      if (role === 'contractor' && buyerType === 'business') {
        if (buyerCo.trim()) update.company_name_ar = buyerCo.trim().slice(0, 120)
        update.vat_number = buyerVat.trim() || null
      }
      const { error: upErr } = await supabase.from('profiles').update(update).eq('id', uid)
      if (upErr) { showErr(homeBuyer && role !== 'supplier' ? t.addrFailed : t.profileFailed); setSaving(false); return }

      // حفظ ذرّي للقطاعات والتخصصات: حذف + إدراج داخل معاملة واحدة على الخادم (RPC من الترحيل 100)،
      // فإن فشل الإدراج يتراجع الحذف ولا تُمسح البيانات المحفوظة. للمشتري نمرّر تخصصاته كما حُمّلت فلا تتغيّر.
      // round-4 UX-118: only a seller saves sectors and specialties; a business buyer keeps its optional sectors; a home buyer has none
      if (role === 'supplier' || buyerType === 'business') {
        const { error: secErr } = await supabase.rpc('save_supplier_specialties', {
          p_sectors: validSectors,
          p_specialties: validSpecialties,
        })
        if (secErr) { showErr(role === 'supplier' ? t.saveFailed : t.profileFailed); setSaving(false); return }
      }

      if (role === 'supplier') {
        // المواد المقترحة: نزيل ما أُرسل بنجاح من القائمة، فإعادة الحفظ ترسل الفاشل فقط بلا تكرار.
        const failed: { sector: string; name: string }[] = []
        for (const m of extraNow) {
          try {
            const { error: mErr } = await supabase.from('material_requests').insert({ supplier_id: uid, name: m.name, sector: m.sector || null })
            if (mErr) failed.push(m)
          } catch { failed.push(m) }
        }
        setExtraMaterials(failed)
        // التصنيف الآلي يعمل في الخلفية ولا يمنع المتابعة.
        try { await fetch('/api/classify-supplier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }) } catch {}
        if (failed.length) { showErr(t.matFailed); setSaving(false); return }
      }
      const after = takePostSignupNext() // e.g. /contractor/rfq/quick?section=… from a landing card
      // owner 2026-11-23: no self-service claim at sign-up (support handles CR ownership)
      const go = typeof dest === 'string' ? dest : (role === 'supplier' ? '/supplier/dashboard?welcome=1' : (after && after.startsWith('/contractor') ? after : '/contractor'))
      if (role !== 'supplier' && typeof dest !== 'string') {
        // round-2 UX-037: confirm the save before leaving
        toast.success(locale === 'en' ? 'Delivery address saved' : locale === 'ur' ? 'ڈیلیوری پتہ محفوظ ہو گیا' : 'حُفظ عنوان التوصيل')
        setTimeout(() => { window.location.href = go }, 700)
        return
      }
      window.location.href = go
    } catch {
      // خطأ شبكة غير متوقّع: تبقى اختيارات المستخدم كما هي على الشاشة.
      showErr(role === 'supplier' ? t.saveFailed : homeBuyer ? t.addrFailed : t.profileFailed); setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  const roleHome = role === 'supplier' ? '/supplier/dashboard' : '/contractor'

  // ── التقدّم ──
  // UX-125: every requirement of «save» is a step (the map pin and the shop name too), so 100% means ready
  // round-4 UX-059: the steps follow the screen order (type card on top, then location, then what you sell),
  // and a company or shop has the commercial registration as a step, so 100% means ready to price
  const steps: { label: string; done: boolean; target: string }[] = role === 'supplier'
    ? [
        { label: t.stepKind, done: !!providerType, target: 'ob-kind' },
        ...(!isIndividual ? [
          { label: t.stepActivity, done: hasActivity, target: 'ob-kind' },
          { label: t.stepCr, done: !!crNo, target: crNo ? 'ob-kind' : (providerType ? 'ob-cr2' : 'ob-cr') },
          { label: t.stepBiz, done: bizName.trim().length >= 2, target: 'ob-biz' },
        ] : []),
        { label: t.stepLocation, done: !!(region && city), target: 'ob-region' },
        ...(!isIndividual ? [{ label: t.stepMap, done: lat != null && lng != null, target: 'ob-map' }] : []),
        { label: t.stepSpecialties, done: specialties.length > 0, target: 'ob-specs' },
      ]
    : [{ label: t.stepLocation, done: !!(region && city), target: 'ob-region' }] // المشتري: الموقع فقط مطلوب، والقطاعات اختيارية
  const firstMissing = steps.find(s => !s.done) || null
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100)
  const canSave = !loadFailed && !!(region && city) && (role === 'supplier' ? (!!providerType && (isIndividual || hasActivity) && specialties.length > 0 && (isIndividual || (bizName.trim().length >= 2 && !!crNo && lat != null && lng != null))) : !!buyerType)
  // اكتمال كل المطلوب أعلاه (يفتح خطوة التوثيق للمورّد)
  const profileComplete = canSave && (role !== 'supplier' || specialties.length > 0)
  const ringC = 2 * Math.PI * 24

  // the button stays active (UX-125): pressing it says what is missing
  const SaveBtn = ({ full }: { full?: boolean }) => (
    <button type="button" onClick={() => save()} disabled={saving || loadFailed}
      className={`${full ? 'w-full' : 'w-full'} min-h-[44px] py-3 rounded-xl font-extrabold text-[#071827] text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', opacity: canSave ? 1 : 0.85 }}>
      {saving ? t.saving : t.save}
    </button>
  )
  const cardCls = 'bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100'
  // نوع الحساب: مستقل أو شركة (+ النشاط). الفئة الظاهرة للمشترين تُحسب تلقائياً
  // UX-010 / UX-040: one message for a CR held by another account, under the field, with «تواصل مع الدعم»
  const crTakenBox = crTakenNo ? (
    <div id="ob-cr-taken" role="alert" className="mt-2 text-[13px] text-[#071827] bg-[#D4A543]/10 border border-[#D4A543]/50 rounded-lg p-2.5">
      <p><Glyph e="⚠" /> {crTakenText(locale).msg}</p>
      <a href={crSupportHref(crTakenNo, { signedIn: true })} className="mt-1 inline-flex items-center min-h-[44px] font-bold underline text-[#8F6820]">{crTakenText(locale).cta}</a>
    </div>
  ) : null
  const kindCard = (
              <div id="ob-kind" className={`${cardCls} scroll-mt-24`} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#0B2438' }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-navy"><Glyph e="🏢" /> {t.classTitle}</h2>
                </div>
                {!providerType ? (<>
                  <p className="text-[13px] text-gray-600 mb-3 leading-relaxed">{t.classHint}</p>
                  {/* round-2 UX-076: the CR is asked before a company / shop kind is locked */}
                  {!crNo && (
                    <div className={`mb-3 ${crAsk ? 'rounded-xl ring-2 ring-[#D4A543] p-2' : ''}`}>
                      <label htmlFor="ob-cr" className="block text-xs font-bold text-navy mb-1">{locale === 'en' ? 'Commercial registration no. (for a company or shop)' : locale === 'ur' ? 'تجارتی رجسٹریشن نمبر (کمپنی یا دکان کے لیے)' : 'رقم السجل التجاري (للشركة أو المحل)'} <span className="text-red-500">*</span></label>
                      <input id="ob-cr" value={crInput} onChange={(e: any) => { setCrInput(normalizeCrInput(e.target.value).slice(0, 10)); setCrTakenNo('') }} inputMode="numeric" dir="ltr" maxLength={10} className="input-field" placeholder="7XXXXXXXXX" aria-invalid={!!crTakenNo} aria-describedby={crTakenNo ? 'ob-cr-taken' : undefined} />
                      {crTakenBox}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(['company', 'independent'] as const).map(k => (
                      <button key={k} type="button" disabled={kindBusy} onClick={() => chooseKind(k)}
                        className="text-start min-h-[56px] p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-[#D4A543]/60 transition-all disabled:opacity-60">
                        <div className="font-bold text-sm text-navy"><SellerIcon name={SELLER_KINDS[k].icon} /> {sellerKindLabel(k, locale)}</div>
                        <div className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">{locale === 'en' ? SELLER_KINDS[k].sub.en : locale === 'ur' ? SELLER_KINDS[k].sub.ur : SELLER_KINDS[k].sub.ar}</div>
                      </button>
                    ))}
                  </div>
                </>) : (<>
                  {/* round-2 UX-076: for a company the picker below already names the kind; say it once */}
                  {isIndividual && <p className="text-sm text-navy"><b>{locale === 'en' ? 'Account type:' : locale === 'ur' ? 'اکاؤنٹ کی قسم:' : 'نوع الحساب:'}</b> {sellerKindLabel(sellerKindOf(providerType), locale)}</p>}
                  {/* UX-039: a company / shop without a CR keeps the field (it cannot price without one) */}
                  {!isIndividual && !crNo && (
                    <div className="mt-2 mb-3 rounded-xl ring-2 ring-[#D4A543] p-2">
                      <label htmlFor="ob-cr2" className="block text-xs font-bold text-navy mb-1">{locale === 'en' ? 'Commercial registration no.' : locale === 'ur' ? 'تجارتی رجسٹریشن نمبر' : 'رقم السجل التجاري'} <span className="text-red-500">*</span> <span className="font-normal text-gray-500">— {locale === 'en' ? 'needed to price requests' : locale === 'ur' ? 'قیمت دینے کے لیے ضروری' : 'يلزم لتسعير الطلبات'}</span></label>
                      <div className="flex gap-2">
                        <input id="ob-cr2" value={crInput} onChange={(e: any) => { setCrInput(normalizeCrInput(e.target.value).slice(0, 10)); setCrTakenNo('') }} inputMode="numeric" dir="ltr" maxLength={10} className="input-field flex-1" placeholder="7XXXXXXXXX" aria-invalid={!!crTakenNo} aria-describedby={crTakenNo ? 'ob-cr-taken' : undefined} />
                        <button type="button" disabled={crBusy} onClick={() => saveCr(normalizeCrInput(crInput))} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white shrink-0 disabled:opacity-50" style={{ background: '#0B2438' }}>{crBusy ? t.saving : (locale === 'en' ? 'Save' : locale === 'ur' ? 'محفوظ کریں' : 'حفظ')}</button>
                      </div>
                      {crTakenBox}
                    </div>
                  )}
                  {crNo && <p className="text-sm text-navy mt-1"><b>{locale === 'en' ? 'Your commercial registration no.:' : locale === 'ur' ? 'آپ کا تجارتی رجسٹریشن نمبر:' : 'رقم سجلك التجاري:'}</b> <span dir="ltr">{crNo}</span></p>}
                  <p className="text-[13px] text-gray-600 mt-1">{locale === 'en' ? 'To change it, ' : locale === 'ur' ? 'بدلنے کے لیے ' : 'لتغييره '}<a href="/support?topic=kind" className="font-bold underline text-navy">{locale === 'en' ? 'ask Support' : locale === 'ur' ? 'سپورٹ سے درخواست کریں' : 'اطلب ذلك من الدعم'}</a>.</p>
                  {!isIndividual && (
                    <div className="mt-3">
                      <SellerKindPicker providerType={providerType || null} supplierTier={supplierTier} locale={locale}
                        onChange={(pt: string, tr: string | null) => { setProviderType(pt); setSupplierTier(tr) }} />
                    </div>
                  )}
                </>)}
                {!isIndividual && (
                  <>
                    <label htmlFor="ob-biz" className="block text-xs font-bold text-navy mb-1 mt-4">{t.bizName} * <span className="text-gray-500 font-normal">— {t.bizHint}</span></label>
                    <input id="ob-biz" value={bizName} onChange={(e: any) => setBizName(e.target.value)} autoComplete="organization" maxLength={120} className="input-field" placeholder={t.bizPh} />
                  </>
                )}
              </div>
  )

  return (
    <div className="min-h-screen relative isolate" dir={dir}
      style={{
        backgroundColor: '#f5f7fb',
        backgroundImage:
          'radial-gradient(1100px 520px at 100% -8%, rgba(11,36,56,0.07), rgba(11,36,56,0) 60%),' +
          'radial-gradient(900px 480px at -6% 108%, rgba(212,165,67,0.05), rgba(212,165,67,0) 55%),' +
          'linear-gradient(180deg, #eef2f8 0%, #f5f7fb 34%, #f5f7fb 100%)',
        backgroundAttachment: 'fixed',
      }}>
      {/* طبقة زخرفية خفيفة: شبكة + نقاط كحلية باهتة تعطي إحساساً «مرتّباً» — CSS خالص بلا أصول */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(11,36,56,0.035) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(11,36,56,0.035) 1px, transparent 1px),' +
            'radial-gradient(rgba(11,36,56,0.05) 1px, transparent 1.5px)',
          backgroundSize: '38px 38px, 38px 38px, 38px 38px',
          backgroundPosition: '0 0, 0 0, 19px 19px',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0, #000 120px, #000 76%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0, #000 120px, #000 76%, transparent 100%)',
        }} />
      <header className="bg-white/90 backdrop-blur border-b border-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href={roleHome} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="h-9 w-auto" />
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href={roleHome} className="inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 hover:text-navy">{t.later}</a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-navy">{role !== 'supplier' && homeBuyer ? (locale === 'en' ? 'Your delivery address' : locale === 'ur' ? 'آپ کا ڈیلیوری پتہ' : 'عنوان التوصيل') : role !== 'supplier' && !buyerType ? (locale === 'en' ? 'Complete your details' : locale === 'ur' ? 'اپنی تفصیلات مکمل کریں' : 'أكمل بياناتك') : role === 'supplier' && isIndividual ? (locale === 'en' ? 'Set up your profile as a pricing agent' : locale === 'ur' ? 'قیمت ایجنٹ کے طور پر اپنی پروفائل ترتیب دیں' : 'إعداد ملفك كوسيط تسعير') : t.title}</h1>
          <p className="text-ink-2 mt-1.5 text-sm">{role === 'supplier' ? t.subS : !buyerType ? (locale === 'en' ? 'Choose who you are buying for, then add the delivery address.' : locale === 'ur' ? 'منتخب کریں کہ آپ کس کے لیے خرید رہے ہیں، پھر ڈیلیوری کا پتہ شامل کریں۔' : 'اختر لمن تشتري، ثم أضف عنوان التوصيل.') : homeBuyer ? (locale === 'en' ? 'So suppliers near you can price your requests.' : locale === 'ur' ? 'تاکہ قریبی سپلائرز قیمت دے سکیں۔' : 'ليصل طلبك إلى الموردين القريبين منك.') : t.subC}</p>
        </div>

        <div className="lg:flex lg:gap-6 lg:items-start">
          {/* ═══ العمود الرئيسي ═══ */}
          <div className="flex-1 min-w-0 space-y-4 pb-28 lg:pb-0">
            {/* round-4 UX-059: the account type and activity card is always first */}
            {role === 'supplier' && kindCard}
            {role !== 'supplier' && (
              <div className={cardCls}>
                {/* round-4 UX-112: the same cards (with their descriptions) as sign-up and the home prompt */}
                <div id="ob-buyer" className="scroll-mt-24">
                {buyerType && !editBuyer ? (
                  <BuyerTypeSummary value={buyerType === 'individual' ? 'individual' : 'business'} onChange={() => setEditBuyer(true)} locale={locale} />
                ) : (
                  <BuyerTypeCards value={(buyerType === 'individual' || buyerType === 'business') ? buyerType : ''} onChange={(k) => { chooseBuyerType(k); setEditBuyer(false) }} locale={locale} />
                )}
                </div>
                {/* UX-080: a business buyer's company on purchase orders (optional) */}
                {buyerType === 'business' && (
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ob-buyer-co" className="block text-xs font-semibold text-gray-600 mb-1">{locale === 'en' ? 'Company or establishment name (optional)' : locale === 'ur' ? 'کمپنی یا ادارے کا نام (اختیاری)' : 'اسم الشركة أو المؤسسة (اختياري)'}</label>
                      <input id="ob-buyer-co" value={buyerCo} onChange={(e: any) => setBuyerCo(e.target.value)} maxLength={120} autoComplete="organization" className="input-field" aria-describedby="ob-buyer-co-hint" />
                      <p id="ob-buyer-co-hint" className="text-[12px] text-gray-500 mt-1">{locale === 'en' ? 'Shown on purchase orders' : locale === 'ur' ? 'پرچیز آرڈر پر دکھایا جاتا ہے' : 'يظهر على أوامر الشراء'}</p>
                    </div>
                    <div>
                      <label htmlFor="ob-buyer-vat" className="block text-xs font-semibold text-gray-600 mb-1">{locale === 'en' ? 'VAT number (optional)' : locale === 'ur' ? 'ٹیکس نمبر (اختیاری)' : 'الرقم الضريبي (اختياري)'}</label>
                      <input id="ob-buyer-vat" value={buyerVat} onChange={(e: any) => setBuyerVat(normalizeCrInput(e.target.value).slice(0, 15))} inputMode="numeric" dir="ltr" maxLength={15} className="input-field" placeholder="3XXXXXXXXXXXXX3" />
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* الموقع (مطلوب) */}
            {(() => {
              // round-2 UX-037: a buyer starts with «use my current location», then «or choose manually»
              const mapFirst = role !== 'supplier'
              const mapBlock = (
              <div id="ob-map" className={`${mapFirst ? 'mb-4' : 'mt-4'} scroll-mt-24`}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Glyph e="📍" /> {mapFirst ? (locale === 'en' ? 'Use my current location' : locale === 'ur' ? 'میرا موجودہ مقام استعمال کریں' : 'استخدم موقعي الحالي') : (locale === 'en' ? 'Your location on the map' : locale === 'ur' ? 'نقشے پر آپ کا مقام' : 'موقعك على الخريطة')}
                  {role === 'supplier' && !isIndividual
                    ? <span className="text-red-500"> *</span>
                    : <span className="font-normal text-gray-500"> ({locale === 'en' ? 'optional, recommended' : locale === 'ur' ? 'اختیاری، تجویز کردہ' : 'اختياري، ويُنصح به'})</span>}
                </label>
                <LocationPicker lat={lat} lng={lng} locale={locale} simple={role !== 'supplier' && homeBuyer} detectHint={role !== 'supplier' && homeBuyer ? (locale === 'en' ? 'If you are at home now, we fill in the region and city for you.' : locale === 'ur' ? 'اگر آپ ابھی گھر پر ہیں تو ہم علاقہ اور شہر خود بھر دیں گے۔' : 'إذا كنت في البيت الآن نملأ المنطقة والمدينة تلقائياً.') : undefined} onChange={(a: number, b: number) => {
                  setLat(a); setLng(b)
                  // owner 2026-11-21: the pin fills the region and city by itself (still editable)
                  const near = nearestSaCity(a, b)
                  if (near) {
                    if (city && near.city !== city) {
                      const cl = (CITIES_BY_REGION[near.region] || []).find((c: any) => c.ar === near.city)
                      const shown = locale === 'en' && cl ? cl.en : near.city
                      setCityNote(locale === 'en' ? `We updated the city to ${shown} from your location.` : locale === 'ur' ? `آپ کے مقام کے مطابق شہر ${shown} کر دیا گیا۔` : `حدّثنا المدينة إلى ${shown} حسب موقعك.`)
                    } else setCityNote('')
                    setRegion(near.region); setCity(near.city)
                  }
                }} />
                {cityNote && <p role="status" className="mt-1.5 text-[13px] font-semibold text-[#8F6820]">{cityNote}</p>}
              </div>
              )
              return (
            <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#0B2438' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-navy"><Glyph e="📍" /> {t.location}</h2>
                <span className="text-[12px] font-bold text-navy bg-navy/5 rounded-full px-2 py-0.5">{t.required}</span>
              </div>
              {mapFirst && mapBlock}
              {mapFirst && <p className="text-xs font-bold text-gray-600 mb-2">{locale === 'en' ? 'Or choose manually' : locale === 'ur' ? 'یا خود منتخب کریں' : 'أو اختر يدوياً'}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ob-region" className="block text-xs font-semibold text-gray-600 mb-1">{t.region} *</label>
                  <select id="ob-region" value={region} onChange={e => { setRegion(e.target.value); setCity('') }} className="input-field">
                    <option value="">{t.selectRegion}</option>
                    {REGIONS.map((r: any) => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ob-city" className="block text-xs font-semibold text-gray-600 mb-1">{t.city} *</label>
                  <select id="ob-city" value={city} onChange={e => { setCity(e.target.value); setCityNote('') }} className="input-field" disabled={!region}>
                    <option value="">{region ? t.selectRegion : '—'}</option>
                    {(CITIES_BY_REGION[region] || []).map((c: any) => <option key={c.ar} value={c.ar}>{locale === 'ar' ? c.ar : (locale === 'ur' ? (c.ur || c.en) : c.en)}</option>)}
                  </select>
                </div>
              </div>
              {city && (
                <div className="mt-3">
                  <span className="block text-xs font-semibold text-gray-600 mb-1">{t.district}</span>
                  <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} />
                </div>
              )}
              {/* موقعك على الخريطة: المورد بتوصله طلبات منطقته (للمشتري يأتي أولاً) */}
              {!mapFirst && mapBlock}
            </div>
              )
            })()}

            {/* القطاعات / التخصصات (مطلوب للمورّد، اختياري للمشتري؛ مخفي لصاحب البيت) */}
            <div id="ob-specs" className={`${cardCls} scroll-mt-24 ${role !== 'supplier' && buyerType !== 'business' ? 'hidden' : ''}`} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#0B2438' }}>
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="text-sm font-bold text-navy"><Glyph e="🧩" /> {role === 'supplier' ? t.sectorsTitleS : t.sectorsTitleC}</h2>
                {role === 'supplier'
                  ? <span className="text-[12px] font-bold text-navy bg-navy/5 rounded-full px-2 py-0.5">{t.required}</span>
                  : <span className="text-[12px] font-bold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{t.optional}</span>}
              </div>
              <p className="text-xs text-gray-500 mb-1">{role === 'supplier' ? t.sectorsHintS : t.sectorsHintC}</p>

              {role !== 'supplier' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {(Object.keys(SECTOR_LABELS) as string[]).map((sector: any) => {
                    const on = sectors.includes(sector)
                    return (
                      <button key={sector} type="button" onClick={() => toggleSector(sector)} aria-pressed={on}
                        className={`relative min-h-[52px] p-4 rounded-xl border-2 text-start transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 bg-white hover:border-[#D4A543]/50'}`}>
                        <div className="font-semibold text-sm text-[#071827] flex items-center gap-1.5">{on && <Check className="w-4 h-4 shrink-0" aria-hidden />}{sl(sector)}</div>
                      </button>
                    )
                  })}
                </div>
              )}

              {role === 'supplier' && (
                <div className="mt-4 space-y-4">
                  {/* الطريقة السريعة: باقات جاهزة حسب نوع النشاط */}
                  <div>
                    <p className="text-sm font-bold text-navy mb-0.5">{locale === 'en' ? 'What do you sell? Pick one or more' : locale === 'ur' ? 'آپ کیا بیچتے ہیں؟ ایک یا زیادہ منتخب کریں' : 'ماذا تبيع؟ اختر نوعاً أو أكثر'}</p>
                    <p className="text-xs text-gray-500 mb-2.5">{locale === 'en' ? 'One tap selects everything that kind of business sells. You can fine-tune below.' : locale === 'ur' ? 'ایک کلک میں سب منتخب، نیچے تبدیل کر سکتے ہیں۔' : 'بضغطة واحدة تُختار كل المواد التي يبيعها هذا النوع من المحلات، ويمكنك التعديل في الأسفل.'}</p>
                    <SupplierPackPicker sectors={sectors} specialties={specialties} locale={locale}
                      onChange={(n: any) => { setSectors(n.sectors); setSpecialties(n.specialties) }} />
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer min-h-[44px] flex items-center text-[13px] font-bold text-[#8F6820] select-none">{locale === 'en' ? 'Fine-tune materials (optional)' : locale === 'ur' ? 'تفصیل سے منتخب کریں (اختیاری)' : 'تعديل المواد بالتفصيل (اختياري)'} {specialties.length > 0 && `· ${specialties.length}`}</summary>
                    <div className="mt-3">
                  <SpecialtyPicker
                    sectors={sectors} specialties={specialties}
                    openSector={openSector} onOpenSector={setOpenSector}
                    onToggleSector={toggleSector} onToggleSpecialty={toggleSpecialty}
                    locale={locale} dir={dir} removeLabel={t.remove}
                    renderSectorExtra={(sector) => {
                      const sectorMats = extraMaterials.filter(m => m.sector === sector)
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-[12px] font-bold text-gray-600 mb-1.5">{t.addMatTitle}</div>
                          <div className="flex gap-2">
                            <input type="text" value={extraMaterialInput} onChange={(e: any) => setExtraMaterialInput(e.target.value)}
                              onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); addExtraMaterial(sector) } }}
                              className="input-field flex-1" placeholder={t.addMatPh} aria-label={t.addMatTitle} />
                            <button type="button" onClick={() => addExtraMaterial(sector)} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white shrink-0" style={{ background: '#0B2438' }}>{t.addMatBtn}</button>
                          </div>
                          {sectorMats.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {sectorMats.map((m: any) => (
                                <span key={m.name} className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                  {m.name}
                                  <button type="button" onClick={() => setExtraMaterials(prev => prev.filter(x => !(x.name === m.name && x.sector === sector)))} aria-label={t.remove} className="w-6 h-6 grid place-items-center text-amber-600 hover:text-amber-800 font-bold leading-none">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                    </div>
                  </details>
                </div>
              )}
            </div>

            {CONTRACTOR_FEATURES && role === 'contractor' && (
              <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#0F6E56' }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-navy"><Glyph e="🏅" /> {t.gradeTitle}</h2>
                  <span className="text-[12px] font-bold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{t.optional}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{t.gradeSub}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[{ grade: 'A', label: locale === 'ar' ? 'أ' : 'A', desc: '> 100M', color: '#D4A543' }, { grade: 'B', label: locale === 'ar' ? 'ب' : 'B', desc: '30–100M', color: '#0B2438' }, { grade: 'C', label: locale === 'ar' ? 'ج' : 'C', desc: '5–30M', color: '#0F6E56' }, { grade: 'D', label: locale === 'ar' ? 'د' : 'D', desc: '< 5M', color: '#888780' }].map((g: any) => (
                    <button key={g.grade} type="button" onClick={() => setContractorGrade(contractorGrade === g.grade ? '' : g.grade)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${contractorGrade === g.grade ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                      style={contractorGrade === g.grade ? { borderColor: g.color, background: g.color + '10' } : {}}>
                      <div className="text-xl font-black mb-0.5" style={{ color: g.color }}>{g.label}</div>
                      <div className="text-[12px] text-gray-500">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* التوثيق (للمورّد) — بوابة إيراد: مقفلة حتى يكتمل الملف أعلاه، ثم تحفظ وتنقل لتبويب المستندات */}
            {role === 'supplier' && isIndividual && (
              <div className="rounded-2xl p-5 shadow-sm" style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#D4A543', background: 'rgba(212,165,67,0.06)', border: '1px solid rgba(212,165,67,0.3)' }}>
                <div className="text-sm font-bold text-navy mb-1"><Glyph e="⭐" /> {locale === 'en' ? 'Your trust comes from ratings' : locale === 'ur' ? 'آپ کا اعتماد ریٹنگ سے بنتا ہے' : 'تُبنى ثقتك من التقييمات'}</div>
                {/* UX-144: five short points instead of one long paragraph */}
                <ul className="text-xs text-gray-600 leading-relaxed list-disc ps-5 space-y-0.5">
                  <li>{locale === 'en' ? 'You bring shop prices to buyers without a shop of your own.' : locale === 'ur' ? 'آپ اپنی دکان کے بغیر دکانوں کی قیمتیں خریداروں تک لاتے ہیں۔' : 'تجلب أسعار المحلات للمشترين دون أن تملك محلاً.'}</li>
                  <li>{locale === 'en' ? 'Before choosing your offer the buyer sees only the district; after it, the shop name (never its phone).' : locale === 'ur' ? 'آپ کی آفر چننے سے پہلے خریدار صرف علاقہ دیکھتا ہے؛ بعد میں دکان کا نام (فون کبھی نہیں)۔' : 'قبل اختيار عرضك لا يرى المشتري إلا الحي، وبعده يرى اسم المحل دون رقم هاتفه.'}</li>
                  <li>{locale === 'en' ? 'The shop issues the invoice in the buyer’s name at your quoted price.' : locale === 'ur' ? 'دکان آپ کی قیمت پر خریدار کے نام انوائس جاری کرتی ہے۔' : 'يُصدر المحل الفاتورة باسم المشتري بنفس سعر عرضك.'}</li>
                  <li>{locale === 'en' ? 'Your deal limit rises with successful deals.' : locale === 'ur' ? 'کامیاب سودوں کے ساتھ آپ کی حد بڑھتی ہے۔' : 'يرتفع حدّ صفقاتك مع الصفقات الناجحة.'}</li>
                  <li>{locale === 'en' ? 'After every deal the buyer rates your price accuracy and service.' : locale === 'ur' ? 'ہر سودے کے بعد خریدار آپ کی قیمت کی درستی اور سروس کو ریٹ کرتا ہے۔' : 'بعد كل صفقة يقيّم المشتري دقة سعرك وخدمتك.'}</li>
                </ul>
              </div>
            )}
            {role === 'supplier' && !isIndividual && (
              profileComplete ? (
                <div className="rounded-2xl p-5 shadow-sm" style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#D4A543', background: '#FBF6EA', border: '1px solid #D4A54333' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0"><Glyph e="🛡" /></span>
                    <div className="flex-1">
                      <div className="font-bold text-navy text-sm">{t.verifyTitle}</div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.verifyBody}</p>
                      <button type="button" onClick={() => save('/settings?tab=docs')} disabled={saving}
                        className="inline-flex items-center mt-2 min-h-[44px] text-sm font-bold text-[#071827] px-4 rounded-lg disabled:opacity-60" style={{ background: '#D4A543' }}>
                        {saving ? t.saving : t.verifyCta}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 border border-dashed" style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#cbd2e0', background: '#f8fafc', borderColor: '#e4e9f2' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0 opacity-50 grayscale"><Glyph e="🛡" /></span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-gray-500 text-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                        {t.verifyTitle}
                      </div>
                      <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">{t.verifyLocked}</p>
                    </div>
                  </div>
                </div>
              )
            )}

            {err && <div id="onboarding-err" role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{err}</div>}
          </div>

          {/* ═══ السايدبار: التقدّم + الحفظ (ديسكتوب) ═══ */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24 rounded-2xl p-5 text-white shadow-lg" style={{ background: 'linear-gradient(160deg,#0B2438,#071827)' }}>
              <div className={`flex items-center gap-4 mb-4 ${role === 'supplier' ? '' : 'hidden'}`}>
                <svg width="60" height="60" viewBox="0 0 56 56" className="shrink-0">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke={pct === 100 ? '#22c55e' : '#D4A543'} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={ringC} strokeDashoffset={ringC * (1 - pct / 100)} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset .4s' }} />
                  <text x="28" y="33" textAnchor="middle" className="fill-white font-extrabold" style={{ fontSize: 15 }}>{pct}%</text>
                </svg>
                <div>
                  <div className="text-sm font-extrabold">{t.progress}</div>
                  <div className="text-[12px] text-white/80 mt-0.5">{steps.filter(s => s.done).length}/{steps.length}</div>
                </div>
              </div>

              <div className={`space-y-2 mb-3 ${role === 'supplier' ? '' : 'hidden'}`}>
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 grid place-items-center rounded-full shrink-0 ${s.done ? 'bg-emerald-500' : 'bg-white/15'}`}>{s.done ? <Check className="w-3.5 h-3.5" aria-hidden /> : ''}</span>
                    <span className={s.done ? 'text-white' : 'text-white/70'}>{s.label}</span>
                  </div>
                ))}
                {role === 'supplier' && !isIndividual && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 grid place-items-center rounded-full text-[12px] shrink-0 bg-white/15"><Glyph e="🛡" /></span>
                    <span className="text-white/70">{t.stepVerify}</span>
                  </div>
                )}
              </div>

              {role === 'supplier' && pct < 100 && <div className="text-[12px] text-white bg-white/10 rounded-lg p-2.5 mb-4 leading-relaxed"><Glyph e="⚠" /> {t.warn}</div>}

              <SaveBtn full />
              <a href={roleHome} className="flex items-center justify-center min-h-[44px] text-sm text-white/80 hover:text-white mt-1">{t.later}</a>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ شريط الحفظ الثابت — موبايل/تابلت فقط (الديسكتوب لديه سايدبار لاصق) ═══ */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="bg-white/95 backdrop-blur border-t border-line" style={{ boxShadow: '0 -8px 24px -12px rgba(15,27,52,.18)' }}>
          {/* شريط تقدّم رفيع (المورد فقط: المشتري له خطوة واحدة، UX-037) */}
          {role === 'supplier' && <div className="h-1 w-full bg-canvas-2">
            <div className="h-full transition-all duration-300" style={{ width: pct + '%', background: pct === 100 ? '#22c55e' : '#D4A543' }} />
          </div>}
          {role === 'supplier' && pct < 100 && firstMissing && (
            <div className="max-w-6xl mx-auto px-4 pt-2">
              <button type="button" onClick={() => setStepsOpen(v => !v)} aria-expanded={stepsOpen} className="w-full min-h-[44px] flex items-center justify-between gap-2 text-start text-[13px] font-bold text-amber-900">
                <span><Glyph e="⚠" /> {t.left}: {firstMissing.label}</span>
                <span className="text-[12px] font-semibold text-[#8F6820] underline">{stepsOpen ? (locale === 'en' ? 'Hide' : locale === 'ur' ? 'چھپائیں' : 'إخفاء') : (locale === 'en' ? 'All steps' : locale === 'ur' ? 'تمام مراحل' : 'كل الخطوات')}</span>
              </button>
              {stepsOpen && (
                <ul className="pb-1 space-y-1 max-h-[45vh] overflow-y-auto">
                  {steps.map((s, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => { setStepsOpen(false); const el = document.getElementById(s.target); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (/^(INPUT|SELECT)$/.test(el.tagName)) (el as HTMLElement).focus({ preventScroll: true }) } }}
                        className="w-full min-h-[44px] flex items-center gap-2 text-start text-sm rounded-lg px-2 hover:bg-gray-50">
                        <span className={`w-5 h-5 grid place-items-center rounded-full shrink-0 ${s.done ? 'bg-[#0F6E56] text-white' : 'border-2 border-gray-300'}`}>{s.done ? <Check className="w-3.5 h-3.5" aria-hidden /> : null}</span>
                        <span className={s.done ? 'text-gray-500' : 'font-semibold text-navy'}>{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
            {/* النسبة + عدّاد الخطوات (المورد فقط) */}
            {role === 'supplier' && <div className="shrink-0 leading-tight">
              <div className="text-[15px] font-extrabold text-navy">{pct}%</div>
              <div className="text-[12px] text-ink-3">{steps.filter(s => s.done).length}/{steps.length} · {t.progress}</div>
            </div>}
            {/* لاحقاً (ثانوي) */}
            <a href={roleHome} className="shrink-0 inline-flex items-center min-h-[44px] text-sm font-semibold text-ink-2 px-3 rounded-xl border border-line hover:border-navy hover:text-navy transition-colors">{t.later}</a>
            {/* حفظ — الزر الأساسي الوحيد ذو البرتقالي القوي على الموبايل */}
            <button type="button" onClick={() => save()} disabled={saving || loadFailed}
              className="flex-1 min-h-[44px] py-3 rounded-xl font-extrabold text-sm text-[#071827] transition-all disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', opacity: canSave ? 1 : 0.85 }}>
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
