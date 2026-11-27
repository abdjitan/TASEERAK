'use client'

import { useEffect, useRef, useState } from 'react'
import { nearestSaCity } from '@/lib/saCityCoords'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import PageLoader from '@/components/shared/PageLoader'
import DistrictField from '@/components/shared/DistrictField'
import CityPicker from '@/components/shared/CityPicker'
import LocationPicker from '@/components/shared/LocationPicker'
import SellWhatPicker from '@/components/shared/SellWhatPicker'
import SellerKindPicker from '@/components/shared/SellerKindPicker'
import { SIGNUP_KIND_KEY, SELLER_KINDS, sellerKindLabel, sellerKindOf, sectorsFor, COMPANY_ACTIVITIES, sectorName, legacySpecialties } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import { askConfirm } from '@/lib/askConfirm'
import { rememberBuyerType } from '@/lib/buyerType'
import { Check, Star, ChevronDown } from 'lucide-react'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SECTOR_LABELS, SUB_CATEGORIES, CITIES_BY_REGION } from '@/types'
import { CONTRACTOR_FEATURES } from '@/lib/features'
import Glyph from '@/components/shared/Glyph'
import { takePostSignupNext } from '@/lib/postSignupNext'
import { toast } from 'sonner'
import { sourceShopVisibilityText } from '@/components/rfq/SourceShop'
import { normalizeCrInput, isUnifiedCr, crTakenText, isCrTaken, crSupportHref } from '@/lib/cr'
import BuyerTypeCards, { BuyerTypeSummary } from '@/components/auth/BuyerTypeCards'

// ── إعداد ملفك التجاري (Progressive profiling) ────────────────────────────
// تُعبّأ هنا البيانات المنقولة خارج التسجيل: الموقع + القطاعات + (للمقاول: الدرجة)
// + (للمورّد: التخصصات + التصنيف + الحد الأدنى). التوثيق (السجل/المستندات) في الإعدادات.
// كل الجداول يديرها المستخدم لنفسه عبر RLS (profile_id = auth.uid()).
// owner 2026-11-25 (tax-invoice rules): a VAT number is 15 digits that start and end with 3 (DB: profiles_vat_number_format)
const isVatNo = (v: string) => /^3\d{13}3$/.test(v)
const vatFormatMsg = (locale: string) => locale === 'en' ? 'A VAT number is 15 digits that start and end with 3.' : locale === 'ur' ? 'VAT نمبر 15 ہندسوں کا ہوتا ہے جو 3 سے شروع اور 3 پر ختم ہوتا ہے۔' : 'الرقم الضريبي 15 رقماً يبدأ بـ3 وينتهي بـ3.'

const TR = {
  ar: {
    title: 'إعداد ملفك التجاري', subC: 'أضف موقعك، ليصل طلبك إلى الموردين القريبين منك.', subS: 'أضف موقعك وما تبيعه لتظهر للمشترين وتصلك الطلبات المطابقة',
    location: 'الموقع', deliveryAddr: 'عنوان التوصيل', region: 'المنطقة', selectRegion: 'اختر المنطقة', selectCity: 'اختر المدينة', city: 'المدينة', district: 'الحي',
    sectorsTitleC: 'قطاعات عملك', sectorsHintC: 'اختياري: يمكنك تخطّي هذه الخطوة، فطلبك يصل إلى الموردين المناسبين بحسب المواد التي تطلبها.',
    sectorsTitleS: 'ماذا تبيع؟', sectorsHintS: 'اختر الأقسام التي تبيع منها، وتصلك طلباتها فقط.',
    classTitle: 'نوع الحساب', classHint: 'هل تمثّل شركة أو محلاً، أم تعمل وسيط تسعير؟ لا يمكن تغييره لاحقاً إلا بطلب من الدعم وموافقة الإدارة.',
    minOrder: 'الحد الأدنى لقيمة الطلب (ر.س) — اختياري', minOrderPh: 'مثال: 50000', minOrderHint: 'اتركه فارغاً لقبول كل الطلبات، أو حدّده لتصفية الطلبات حسب قدرتك التوريدية.',
    gradeTitle: 'درجة تصنيف شركتك (للمقاولين)', gradeSub: 'من رخصتك (وزارة الشؤون البلدية) — يستخدمها الموردون لتصفية الطلبات حسب حجم المشروع. اختياري.',
    verifyTitle: 'وثّق نشاطك التجاري', verifyBody: 'أرفق مستندات منشأتك ليراجعها الفريق، فتظهر شارة «موثّق» على عروضك لدى المشترين وترتفع فرصك في الفوز بالطلبات.', verifyCta: 'احفظ وابدأ التوثيق', verifyLocked: 'أكمل موقعك وما تبيعه أعلاه لتُفتح خطوة التوثيق.',
    addMatTitle: 'لا تجد مادة تورّدها في القائمة؟', addMatPh: 'اسم المادة...', addMatBtn: 'إضافة', remove: 'إزالة',
    save: 'حفظ ومتابعة', saving: 'جارٍ الحفظ...', later: 'لاحقاً', selected: 'محدد',
    needLoc: 'اختر المدينة', needSector: 'اختر قسماً واحداً على الأقل مما تبيعه', saved: 'تم حفظ ملفك',
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
    location: 'Location', deliveryAddr: 'Delivery address', region: 'Region', selectRegion: 'Choose the region', selectCity: 'Choose the city', city: 'City', district: 'District',
    sectorsTitleC: 'Your sectors', sectorsHintC: 'Optional: you can skip this. Your request reaches the right suppliers based on the materials you ask for.',
    sectorsTitleS: 'What do you sell?', sectorsHintS: 'Choose the sections you sell from; only their requests reach you.',
    classTitle: 'Account type', classHint: 'Do you represent a company or shop, or work as a pricing agent? It can only be changed later through Support, with admin approval.',
    minOrder: 'Min order value (SAR) — optional', minOrderPh: 'e.g. 50000', minOrderHint: 'Leave empty to accept all requests — or set it to filter by your supply capacity.',
    gradeTitle: 'Company grade (contractors)', gradeSub: 'From your license (Ministry of Municipal Affairs) — suppliers use it to filter by project size. Optional.',
    verifyTitle: 'Verify your business', verifyBody: 'Attach your business documents for the team to review; a «Verified» badge then shows on your offers and raises your chance of winning requests.', verifyCta: 'Save & start verification', verifyLocked: 'Complete your location and what you sell above to unlock verification.',
    addMatTitle: "Can't find a material you supply?", addMatPh: 'Material name...', addMatBtn: 'Add', remove: 'Remove',
    save: 'Save & continue', saving: 'Saving...', later: 'Later', selected: 'selected',
    needLoc: 'Choose the city', needSector: 'Choose at least one section you sell from', saved: 'Profile saved',
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
    location: 'مقام', deliveryAddr: 'ڈیلیوری کا پتہ', region: 'علاقہ', selectRegion: 'علاقہ منتخب کریں', selectCity: 'شہر منتخب کریں', city: 'شہر', district: 'محلہ',
    sectorsTitleC: 'آپ کے شعبے', sectorsHintC: 'اختیاری: آپ یہ مرحلہ چھوڑ سکتے ہیں۔ آپ کی درخواست مطلوبہ مواد کے مطابق درست سپلائرز تک پہنچتی ہے۔',
    sectorsTitleS: 'آپ کیا بیچتے ہیں؟', sectorsHintS: 'وہ سیکشن منتخب کریں جن سے آپ بیچتے ہیں؛ صرف انہی کی درخواستیں آپ تک پہنچیں گی۔',
    classTitle: 'اکاؤنٹ کی قسم', classHint: 'کیا آپ کمپنی یا دکان کی نمائندگی کرتے ہیں یا قیمت ایجنٹ ہیں؟ بعد میں صرف سپورٹ کے ذریعے، انتظامیہ کی منظوری سے بدلا جا سکتا ہے۔',
    minOrder: 'کم از کم آرڈر قیمت (ریال) — اختیاری', minOrderPh: 'مثال: 50000', minOrderHint: 'تمام درخواستوں کے لیے خالی چھوڑیں یا اپنی صلاحیت کے مطابق مقرر کریں۔',
    gradeTitle: 'کمپنی کا درجہ (ٹھیکیداروں کے لیے)', gradeSub: 'آپ کے لائسنس سے — سپلائرز پروجیکٹ سائز کے مطابق فلٹر کرتے ہیں۔ اختیاری۔',
    verifyTitle: 'اپنے کاروبار کی تصدیق کریں', verifyBody: 'اپنے ادارے کی دستاویزات منسلک کریں تاکہ ٹیم جائزہ لے؛ پھر آپ کی آفرز پر «تصدیق شدہ» بیج دکھے گا۔', verifyCta: 'محفوظ کریں اور تصدیق شروع کریں', verifyLocked: 'تصدیق کھولنے کے لیے اوپر اپنا مقام اور آپ کیا بیچتے ہیں مکمل کریں۔',
    addMatTitle: 'فہرست میں کوئی مواد نہیں؟', addMatPh: 'مواد کا نام...', addMatBtn: 'شامل کریں', remove: 'ہٹائیں',
    save: 'محفوظ کریں اور جاری رکھیں', saving: 'محفوظ ہو رہا ہے...', later: 'بعد میں', selected: 'منتخب',
    needLoc: 'شہر منتخب کریں', needSector: 'کم از کم ایک سیکشن منتخب کریں جس سے آپ بیچتے ہیں', saved: 'پروفائل محفوظ',
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
  const sl = (s: any) => sectorName(s, locale) || s // round-6 UX-106

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
  // owner 2026-11-25: a company or shop may add its VAT number here (optional), with an explicit confirmation
  const [supVat, setSupVat] = useState('')
  const [supVatSaved, setSupVatSaved] = useState('')
  const [supVatVerified, setSupVatVerified] = useState(false) // round-7 UX-037: profiles.vat_verified_at
  const [supVatOk, setSupVatOk] = useState(false)
  // round-2 UX-037: the map pin changed the city: say so
  const [cityNote, setCityNote] = useState('')
  const [editBuyer, setEditBuyer] = useState(false)
  const [buyerType, setBuyerType] = useState<string>('') // UX-072: asked first when empty
  const [kindBusy, setKindBusy] = useState(false)
  // فرد / وكيل أسعار / سمسار: ما عنده محل ولا سجل — ثقته من التقييمات، فما نسأله تصنيف ولا توثيق
  const isIndividual = ['individual', 'price_agent', 'broker'].includes(providerType)
  // round-7 UX-069: a pricing agent «prices» (he sells nothing himself) and nobody sees his location
  const ta = !isIndividual ? t : {
    ...t,
    subS: locale === 'en' ? 'Add your city and the kinds of materials you price so the right requests reach you' : locale === 'ur' ? 'اپنا شہر اور وہ اقسام شامل کریں جن کی آپ قیمت دیتے ہیں تاکہ مناسب درخواستیں آپ تک پہنچیں' : 'أضف مدينتك وأنواع المواد التي تسعّرها لتصلك الطلبات المناسبة',
    stepSpecialties: locale === 'en' ? 'What you price' : locale === 'ur' ? 'آپ کس چیز کی قیمت دیتے ہیں' : 'ما تسعّره',
    warn: locale === 'en' ? 'Without your city and what you price, no requests will reach you.' : locale === 'ur' ? 'اپنے شہر اور آپ کس چیز کی قیمت دیتے ہیں، اس کے بغیر کوئی درخواست نہیں پہنچے گی۔' : 'بدون مدينتك وما تسعّره لن تصلك أي طلبات.',
    needSpec: locale === 'en' ? 'Pick at least one kind of material you price so requests can reach you' : locale === 'ur' ? 'کم از کم ایک قسم منتخب کریں جس کی آپ قیمت دیتے ہیں تاکہ درخواستیں آپ تک پہنچیں' : 'اختر نوعاً واحداً على الأقل مما تسعّره حتى تصلك الطلبات',
    sectorsTitleS: locale === 'en' ? 'What do you price?' : locale === 'ur' ? 'آپ کس چیز کی قیمت دیتے ہیں؟' : 'ما الذي تسعّره؟',
    sectorsHintS: locale === 'en' ? 'Choose the sections you price from; only their requests reach you.' : locale === 'ur' ? 'وہ سیکشن منتخب کریں جن کی آپ قیمت دیتے ہیں؛ صرف انہی کی درخواستیں آپ تک پہنچیں گی۔' : 'اختر الأقسام التي تسعّر منها، وتصلك طلباتها فقط.',
  }
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
  // round-6 UX-017: what was loaded, so «لاحقاً» and closing the tab know about unsaved changes
  const baseRef = useRef<string | null>(null)
  const leavingRef = useRef(false)

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
      const { data: p, error: pErr } = await supabase.from('profiles').select('role, buyer_type, region, city, district, supplier_tier, min_order_value, contractor_grade, latitude, longitude, provider_type, full_name, company_name_ar, commercial_registration, vat_number, vat_verified_at').eq('id', session.user.id).single()
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
        setBuyerCo(own ? '' : cn); setBuyerVat(p.vat_number || ''); setSupVatSaved(p.vat_number || ''); setSupVatVerified(!!p.vat_verified_at)
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
      // a seller chooses by section: old rows with sectors and no specialty show as every specialty of them
      const isSup = (p?.role || metaRole) === 'supplier'
      if (psp) setSpecialties(isSup ? legacySpecialties((ps || []).map((r: any) => r.sector), psp.map((r: any) => r.specialty)) : psp.map((r: any) => r.specialty))
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
    // round-6 UX-018: the CR format is checked first, then the seller confirms, and only then is anything written
    // (a CR held by another account still stops here, before the kind is locked)
    if (!(await askConfirm(locale === 'en' ? `Set your account type to «${label}»? It can only be changed later through Support.` : locale === 'ur' ? `اکاؤنٹ کی قسم «${label}» مقرر کریں؟ بعد میں صرف سپورٹ کے ذریعے بدلی جا سکتی ہے۔` : `تحديد نوع حسابك «${label}»؟ لا يمكن تغييره لاحقاً إلا بطلب من الدعم.`, { okLabel: locale === 'en' ? 'Yes, confirm' : locale === 'ur' ? 'ہاں، تصدیق کریں' : 'نعم، أكّد', cancelLabel: locale === 'en' ? 'Go back' : locale === 'ur' ? 'واپس' : 'تراجع' }))) return
    if (newCr && !(await saveCr(newCr))) return
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
  // a suggested material goes to the team without a sector (the admin files it when approving)
  function addExtraMaterial() {
    const v = extraMaterialInput.trim()
    if (!v) return
    setExtraMaterials(prev => prev.some(m => m.name === v) ? prev : [...prev, { sector: '', name: v }])
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
    if (!region || !city) { showErr(t.needLoc, 'ob-city'); return }
    // owner 2026-11-25: a VAT number must have the right form; a seller also confirms the registration
    if (role === 'contractor' && buyerType === 'business' && buyerVat.trim() && !isVatNo(buyerVat.trim())) { showErr(vatFormatMsg(locale), 'ob-buyer-vat'); return }
    const supVatNew = role === 'supplier' && !isIndividual && !supVatSaved ? supVat.trim() : ''
    if (supVatNew && !isVatNo(supVatNew)) { showErr(vatFormatMsg(locale), 'ob-sup-vat'); return }
    if (supVatNew && !supVatOk) { showErr(locale === 'en' ? 'Confirm that your business is VAT-registered and the number is correct.' : locale === 'ur' ? 'تصدیق کریں کہ آپ کا ادارہ VAT میں رجسٹرڈ ہے اور نمبر درست ہے۔' : 'أكّد أن منشأتك مسجّلة في ضريبة القيمة المضافة وأن الرقم صحيح.', 'ob-sup-vat-ok'); return }
    // القطاعات إلزامية للمورّد فقط؛ المشتري يكفيه الموقع (التوجيه يتم من مواد الطلب).
    // UX-139: a material typed but not added with «إضافة» is added on save
    const pendingMat = extraMaterialInput.trim()
    const extraNow = pendingMat && role === 'supplier' ? [...extraMaterials.filter(m => !(m.name === pendingMat)), { sector: '', name: pendingMat }] : extraMaterials
    if (pendingMat && role === 'supplier') { setExtraMaterials(extraNow); setExtraMaterialInput('') }
    if (role === 'supplier' && specialties.length === 0) { showErr(ta.needSpec, 'ob-specs'); return }
    // نتحقّق من البيانات قبل أي كتابة: قطاعات معروفة فقط (عمود enum) وبلا تكرار.
    // UX-038: the sectors follow from the materials chosen (picking materials without ticking a sector still saves)
    // owner 2026-11-27: a seller's sectors come only from what he sells (the section picker); a buyer keeps his optional sectors
    const validSectors = Array.from(new Set(sectorsFor(role === 'supplier' ? [] : sectors, specialties).filter(s => Object.prototype.hasOwnProperty.call(SECTOR_LABELS, s))))
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
      if (supVatNew) update.vat_number = supVatNew
      if (role === 'contractor' && buyerType === 'business') {
        if (buyerCo.trim()) update.company_name_ar = buyerCo.trim().slice(0, 120)
        update.vat_number = buyerVat.trim() || null
      }
      const { error: upErr } = await supabase.from('profiles').update(update).eq('id', uid)
      if (upErr && /vat_number_format/i.test(upErr.message || '')) { showErr(vatFormatMsg(locale), supVatNew ? 'ob-sup-vat' : 'ob-buyer-vat'); setSaving(false); return }
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
        // round-5 UX-163: fire and forget (keepalive survives the page change), so saving never waits on it
        try { fetch('/api/classify-supplier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), keepalive: true }).catch(() => {}) } catch {}
        if (failed.length) { showErr(t.matFailed); setSaving(false); return }
      }
      leavingRef.current = true // saved: no «unsaved changes» question on the way out
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

  // round-6 UX-017: the state that «save» writes; compared with what was loaded
  const formSig = JSON.stringify({ region, city, district, lat, lng, sectors: [...sectors].sort(), specialties: [...specialties].sort(), bizName, buyerCo, buyerVat, supVat, contractorGrade, extraMaterials, extraMaterialInput })
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { if (!loading && baseRef.current === null) baseRef.current = formSig }, [loading, formSig])
  const dirty = !loading && baseRef.current !== null && baseRef.current !== formSig
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { if (leavingRef.current) return; e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  if (loading) return <PageLoader />
  const roleHome = role === 'supplier' ? '/supplier/dashboard' : '/contractor'
  // round-6 UX-017: «لاحقاً» keeps the destination saved at sign-up (e.g. a bathroom pack) when it suits the role,
  // and asks before dropping unsaved changes
  async function leaveLater() {
    if (dirty) {
      // round-7 UX-035: closing the dialog (outside click / Escape) keeps the seller on the page (dismissValue: null)
      const keep = await askConfirm(locale === 'en' ? 'Your details are not saved yet. Do you want to save them before leaving?' : locale === 'ur' ? 'آپ کی معلومات ابھی محفوظ نہیں ہوئیں۔ کیا جانے سے پہلے انہیں محفوظ کرنا چاہتے ہیں؟' : 'لم تُحفظ بياناتك بعد. هل تريد حفظها قبل الخروج؟',
        { okLabel: locale === 'en' ? 'Save and continue' : locale === 'ur' ? 'محفوظ کریں اور جاری رکھیں' : 'احفظ وتابع', cancelLabel: locale === 'en' ? 'Leave without saving' : locale === 'ur' ? 'محفوظ کیے بغیر جائیں' : 'اخرج دون حفظ', dismissValue: null })
      if (keep === null || keep === undefined) return
      if (keep) { save(); return }
    }
    leavingRef.current = true
    const after = takePostSignupNext()
    const fits = !!after && (role === 'supplier' ? after.startsWith('/supplier') : after.startsWith('/contractor'))
    window.location.href = fits ? (after as string) : roleHome
  }

  // ── التقدّم ──
  // UX-125: every requirement of «save» is a step (the map pin and the shop name too), so 100% means ready
  // round-4 UX-059: the steps follow the screen order (type card on top, then location, then what you sell),
  // and a company or shop has the commercial registration as a step, so 100% means ready to price
  const steps: { label: string; done: boolean; target: string }[] = role === 'supplier'
    ? [
        { label: t.stepKind, done: !!providerType, target: 'ob-kind' },
        ...(!!providerType && !isIndividual ? [
          { label: t.stepActivity, done: hasActivity, target: 'ob-kind' },
          { label: t.stepCr, done: !!crNo, target: crNo ? 'ob-kind' : (providerType ? 'ob-cr2' : 'ob-kind') },
          { label: t.stepBiz, done: bizName.trim().length >= 2, target: 'ob-biz' },
        ] : []),
        { label: t.stepLocation, done: !!(region && city), target: 'ob-region' },
        ...(!isIndividual ? [{ label: t.stepMap, done: lat != null && lng != null, target: 'ob-map' }] : []),
        { label: ta.stepSpecialties, done: specialties.length > 0, target: 'ob-specs' },
      ]
    : [{ label: t.stepLocation, done: !!(region && city), target: 'ob-region' }] // المشتري: الموقع فقط مطلوب، والقطاعات اختيارية
  const firstMissing = steps.find(s => !s.done) || null
  // round-8 UX-111 (4): a step in the list goes to its field
  const goToStep = (target: string) => { const el = document.getElementById(target); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (/^(INPUT|SELECT)$/.test(el.tagName)) (el as HTMLElement).focus({ preventScroll: true }) } }
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100)
  const canSave = !loadFailed && !!(region && city) && (role === 'supplier' ? (!!providerType && (isIndividual || hasActivity) && specialties.length > 0 && (isIndividual || (bizName.trim().length >= 2 && !!crNo && lat != null && lng != null))) : !!buyerType)
  // اكتمال كل المطلوب أعلاه (يفتح خطوة التوثيق للمورّد)
  const profileComplete = canSave && (role !== 'supplier' || specialties.length > 0)
  const ringC = 2 * Math.PI * 24

  // the button stays active (UX-125): pressing it says what is missing; round-7 UX-171: the shared btn-primary
  const SaveBtn = ({ full }: { full?: boolean }) => (
    <button type="button" onClick={() => save()} disabled={saving || loadFailed}
      className={`${full ? 'w-full' : 'w-full'} btn-primary btn-lg min-h-[44px] rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed`}>
      {saving ? t.saving : <>{t.save} <span aria-hidden="true">{locale === 'en' ? '→' : '←'}</span></>}
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
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(['company', 'independent'] as const).map(k => (
                      <button key={k} type="button" disabled={kindBusy} onClick={() => chooseKind(k)}
                        className="text-start min-h-[56px] p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-[#D4A543]/60 transition-all disabled:opacity-60">
                        <div className="font-bold text-sm text-navy"><SellerIcon name={SELLER_KINDS[k].icon} /> {sellerKindLabel(k, locale)}</div>
                        <div className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">{locale === 'en' ? SELLER_KINDS[k].sub.en : locale === 'ur' ? SELLER_KINDS[k].sub.ur : SELLER_KINDS[k].sub.ar}</div>
                      </button>
                    ))}
                  </div>
                  {/* round-2 UX-076: the CR is asked before a company / shop kind is locked.
                      round-5 UX-163: only after «company or shop» is tapped, under the cards */}
                  {!crNo && crAsk && (
                    <div className="mt-3 rounded-xl ring-2 ring-[#D4A543] p-2">
                      <label htmlFor="ob-cr" className="block text-xs font-bold text-navy mb-1">{locale === 'en' ? 'Commercial registration no. (for a company or shop)' : locale === 'ur' ? 'تجارتی رجسٹریشن نمبر (کمپنی یا دکان کے لیے)' : 'رقم السجل التجاري (للشركة أو المحل)'} *</label>
                      <div className="flex gap-2">
                        <input id="ob-cr" value={crInput} onChange={(e: any) => { setCrInput(normalizeCrInput(e.target.value).slice(0, 10)); setCrTakenNo('') }} inputMode="numeric" dir="ltr" maxLength={10} className="input-field flex-1" placeholder="7XXXXXXXXX" aria-invalid={!!crTakenNo} aria-describedby={crTakenNo ? 'ob-cr-taken' : undefined} />
                        <button type="button" disabled={kindBusy || crBusy} onClick={() => chooseKind('company')} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white shrink-0 disabled:opacity-50" style={{ background: '#0B2438' }}>{crBusy ? t.saving : (locale === 'en' ? 'Continue' : locale === 'ur' ? 'جاری رکھیں' : 'متابعة')}</button>
                      </div>
                      {crTakenBox}
                    </div>
                  )}
                </>) : (<>
                  {/* owner 2026-11-27: one line for the fixed kind and how to change it (both kinds) */}
                  <p className="text-sm text-navy"><b>{locale === 'en' ? 'Account type:' : locale === 'ur' ? 'اکاؤنٹ کی قسم:' : 'نوع الحساب:'}</b> {sellerKindLabel(sellerKindOf(providerType), locale)} <span className="text-[13px] text-gray-600">· <a href="/support?topic=kind" className="inline-flex items-center min-h-[44px] underline text-navy">{locale === 'en' ? 'Change it through Support' : locale === 'ur' ? 'سپورٹ کے ذریعے بدلیں' : 'تغييره عن طريق الدعم'}</a></span></p>
                  {/* UX-039: a company / shop without a CR keeps the field (it cannot price without one) */}
                  {!isIndividual && !crNo && (
                    <div className="mt-2 mb-3 rounded-xl ring-2 ring-[#D4A543] p-2">
                      <label htmlFor="ob-cr2" className="block text-xs font-bold text-navy mb-1">{locale === 'en' ? 'Commercial registration no.' : locale === 'ur' ? 'تجارتی رجسٹریشن نمبر' : 'رقم السجل التجاري'} * <span className="font-normal text-gray-500">— {locale === 'en' ? 'needed to price requests' : locale === 'ur' ? 'قیمت دینے کے لیے ضروری' : 'يلزم لتسعير الطلبات'}</span></label>
                      <div className="flex gap-2">
                        <input id="ob-cr2" value={crInput} onChange={(e: any) => { setCrInput(normalizeCrInput(e.target.value).slice(0, 10)); setCrTakenNo('') }} inputMode="numeric" dir="ltr" maxLength={10} className="input-field flex-1" placeholder="7XXXXXXXXX" aria-invalid={!!crTakenNo} aria-describedby={crTakenNo ? 'ob-cr-taken' : undefined} />
                        <button type="button" disabled={crBusy} onClick={() => saveCr(normalizeCrInput(crInput))} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white shrink-0 disabled:opacity-50" style={{ background: '#0B2438' }}>{crBusy ? t.saving : (locale === 'en' ? 'Save' : locale === 'ur' ? 'محفوظ کریں' : 'حفظ')}</button>
                      </div>
                      {crTakenBox}
                    </div>
                  )}
                  {crNo && <p className="text-sm text-navy mt-1"><b>{locale === 'en' ? 'Your commercial registration no.:' : locale === 'ur' ? 'آپ کا تجارتی رجسٹریشن نمبر:' : 'رقم سجلك التجاري:'}</b> <span dir="ltr">{crNo}</span></p>}
                  {!isIndividual && (
                    <div className="mt-3">
                      <SellerKindPicker compact providerType={providerType || null} supplierTier={supplierTier} locale={locale}
                        onChange={(pt: string, tr: string | null) => { setProviderType(pt); setSupplierTier(tr) }} />
                    </div>
                  )}
                </>)}
                {!!providerType && !isIndividual && (
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
          <a href={roleHome} onClick={(e: any) => { e.preventDefault(); leaveLater() }} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="h-9 w-auto" />
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <button type="button" onClick={leaveLater} className="hidden lg:inline-flex items-center min-h-[44px] px-1 text-sm font-medium text-gray-600 hover:text-navy">{t.later}</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-navy">{role !== 'supplier' && homeBuyer ? (locale === 'en' ? 'Your delivery address' : locale === 'ur' ? 'آپ کا ڈیلیوری پتہ' : 'عنوان التوصيل') : role !== 'supplier' && !buyerType ? (locale === 'en' ? 'Complete your details' : locale === 'ur' ? 'اپنی تفصیلات مکمل کریں' : 'أكمل بياناتك') : role === 'supplier' && isIndividual ? (locale === 'en' ? 'Set up your profile as a pricing agent' : locale === 'ur' ? 'قیمت ایجنٹ کے طور پر اپنی پروفائل ترتیب دیں' : 'إعداد ملفك كوسيط تسعير') : t.title}</h1>
          <p className="text-ink-2 mt-1.5 text-sm">{role === 'supplier' ? ta.subS : !buyerType ? (locale === 'en' ? 'Choose who you are buying for, then add the delivery address.' : locale === 'ur' ? 'منتخب کریں کہ آپ کس کے لیے خرید رہے ہیں، پھر ڈیلیوری کا پتہ شامل کریں۔' : 'اختر لمن تشتري، ثم أضف عنوان التوصيل.') : homeBuyer ? (locale === 'en' ? 'So suppliers near you can price your requests.' : locale === 'ur' ? 'تاکہ قریبی سپلائرز قیمت دے سکیں۔' : 'ليصل طلبك إلى الموردين القريبين منك.') : t.subC}</p>
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
                      <input id="ob-buyer-vat" value={buyerVat} onChange={(e: any) => setBuyerVat(normalizeCrInput(e.target.value).slice(0, 15))} inputMode="numeric" dir="ltr" maxLength={15} className="input-field" placeholder="3XXXXXXXXXXXXX3" aria-invalid={!!buyerVat && buyerVat.length === 15 && !isVatNo(buyerVat)} />
                      {!!buyerVat && buyerVat.length === 15 && !isVatNo(buyerVat) && <p role="alert" className="text-[12px] text-red-700 mt-1">{vatFormatMsg(locale)}</p>}
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
                    ? <span> *</span>
                    : <span className="font-normal text-gray-500"> ({locale === 'en' ? 'optional, recommended' : locale === 'ur' ? 'اختیاری، تجویز کردہ' : 'اختياري، ويُنصح به'})</span>}
                </label>
                <LocationPicker lat={lat} lng={lng} locale={locale} simple={role !== 'supplier' && homeBuyer} detectHint={role !== 'supplier' && homeBuyer ? (locale === 'en' ? 'If you are at home now, we find your city for you.' : locale === 'ur' ? 'اگر آپ ابھی گھر پر ہیں تو ہم آپ کا شہر خود معلوم کر لیں گے۔' : 'إذا كنت في البيت الآن نحدّد مدينتك تلقائياً.') : undefined} onChange={(a: number, b: number) => {
                  setLat(a); setLng(b)
                  // owner 2026-11-21: the pin fills the region and city by itself (still editable)
                  const near = nearestSaCity(a, b)
                  if (near) {
                    if (city && near.city !== city) {
                      const cl = (CITIES_BY_REGION[near.region] || []).find((c: any) => c.ar === near.city)
                      const shown = cl && locale === 'en' ? cl.en : cl && locale === 'ur' ? ((cl as any).ur || cl.en) : near.city
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
                <h2 className="text-sm font-bold text-navy"><Glyph e="📍" /> {role === 'supplier' ? t.location : t.deliveryAddr}</h2>
                <span className="text-[12px] font-bold text-navy bg-navy/5 rounded-full px-2 py-0.5">{t.required}</span>
              </div>
              {/* round-7 UX-145: a pricing agent's location is never shown */}
              {role === 'supplier' && isIndividual && <p className="text-[13px] text-gray-600 mb-3">{locale === 'en' ? 'Your location and district are not shown to buyers; we use them only so requests from your area reach you.' : locale === 'ur' ? 'آپ کا مقام اور محلہ خریداروں کو نہیں دکھایا جاتا؛ ہم انہیں صرف اس لیے استعمال کرتے ہیں کہ آپ کے علاقے کی درخواستیں آپ تک پہنچیں۔' : 'لا يظهر موقعك ولا حيّك للمشترين؛ نستخدمه فقط لتصلك طلبات منطقتك.'}</p>}
              {mapFirst && mapBlock}
              {mapFirst && <p className="text-xs font-bold text-gray-600 mb-2">{locale === 'en' ? 'Or choose manually' : locale === 'ur' ? 'یا خود منتخب کریں' : 'أو اختر يدوياً'}</p>}
              {/* owner 2026-11-26: one searchable «المدينة» picker (the region comes from the city) + «الحي», always shown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div id="ob-region" className="scroll-mt-24">
                  <label htmlFor="ob-city" className="block text-xs font-semibold text-gray-600 mb-1">{t.city} *</label>
                  <CityPicker id="ob-city" city={city} region={region} locale={locale}
                    onPick={c => { if (c.ar !== city) setDistrict(''); setRegion(c.region); setCity(c.ar); setCityNote('') }} />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-600 mb-1">{t.district}</span>
                  <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} className="input-field min-h-[44px]" />
                </div>
              </div>
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
              <p className="text-xs text-gray-500 mb-1">{role === 'supplier' ? ta.sectorsHintS : t.sectorsHintC}</p>

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
                <div className="mt-3">
                  {/* owner 2026-11-27: one way to choose: the 10 sections, then (optional) the exact materials */}
                  <SellWhatPicker specialties={specialties} onChange={setSpecialties} locale={locale} independent={isIndividual} showMatches
                    extra={
                      <div className="rounded-2xl border border-gray-100 p-3">
                        <label htmlFor="ob-extra-mat" className="block text-[13px] font-bold text-gray-700 mb-1.5">{t.addMatTitle}</label>
                        <div className="flex gap-2">
                          <input id="ob-extra-mat" type="text" value={extraMaterialInput} onChange={(e: any) => setExtraMaterialInput(e.target.value)}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); addExtraMaterial() } }}
                            className="input-field flex-1" placeholder={t.addMatPh} />
                          <button type="button" onClick={() => addExtraMaterial()} className="min-h-[44px] px-4 rounded-xl text-sm font-bold shrink-0 border-2 border-[#0B2438] text-[#0B2438] bg-white">{t.addMatBtn}</button>
                        </div>
                        {extraMaterials.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {extraMaterials.map((m: any) => (
                              <span key={m.name} className="inline-flex items-center gap-1.5 text-xs bg-[#D4A543]/10 text-[#6C531F] border border-[#D4A543]/40 rounded-lg px-2.5 py-1.5">
                                {m.name}
                                <button type="button" onClick={() => setExtraMaterials(prev => prev.filter(x => x.name !== m.name))} aria-label={`${t.remove}: ${m.name}`} className="w-11 h-11 -my-3 -me-2 grid place-items-center text-[#8F6820] hover:text-[#071827]"><Glyph e="×" /></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    } />
                </div>
              )}
            </div>

            {CONTRACTOR_FEATURES && role === 'contractor' && (
              <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#D4A543' }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-navy"><Glyph e="🏅" /> {t.gradeTitle}</h2>
                  <span className="text-[12px] font-bold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{t.optional}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{t.gradeSub}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[{ grade: 'A', label: locale === 'ar' ? 'أ' : 'A', desc: locale === 'en' ? 'Over SAR 100 million' : locale === 'ur' ? '100 ملین ریال سے زیادہ' : 'أكثر من 100 مليون ريال', color: '#0B2438' }, { grade: 'B', label: locale === 'ar' ? 'ب' : 'B', desc: locale === 'en' ? 'SAR 30–100 million' : locale === 'ur' ? '30 سے 100 ملین ریال' : 'من 30 إلى 100 مليون ريال', color: '#0B2438' }, { grade: 'C', label: locale === 'ar' ? 'ج' : 'C', desc: locale === 'en' ? 'SAR 5–30 million' : locale === 'ur' ? '5 سے 30 ملین ریال' : 'من 5 إلى 30 مليون ريال', color: '#0B2438' }, { grade: 'D', label: locale === 'ar' ? 'د' : 'D', desc: locale === 'en' ? 'Under SAR 5 million' : locale === 'ur' ? '5 ملین ریال سے کم' : 'أقل من 5 ملايين ريال', color: '#0B2438' }].map((g: any) => (
                    <button key={g.grade} type="button" onClick={() => setContractorGrade(contractorGrade === g.grade ? '' : g.grade)}
                      aria-pressed={contractorGrade === g.grade} className={`min-h-[44px] p-3 rounded-xl border-2 text-center transition-all ${contractorGrade === g.grade ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
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
              <details className="group rounded-2xl p-5 shadow-sm" style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#D4A543', background: 'rgba(212,165,67,0.06)', border: '1px solid rgba(212,165,67,0.3)' }}>
                {/* owner 2026-11-27: the rules fold behind one line (progressive disclosure) */}
                <summary className="cursor-pointer select-none list-none min-h-[44px] flex items-center justify-between gap-2 text-sm font-bold text-navy">
                  <span><Star className="inline-block w-[1em] h-[1em] align-[-0.15em]" style={{ color: '#9D7425' }} aria-hidden /> {locale === 'en' ? 'How does a pricing agent work?' : locale === 'ur' ? 'قیمت ایجنٹ کیسے کام کرتا ہے؟' : 'كيف يعمل وسيط التسعير؟'}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-[#8F6820] transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                {/* UX-144: five short points instead of one long paragraph */}
                <ul className="mt-1 text-xs text-gray-600 leading-relaxed list-disc ps-5 space-y-0.5">
                  <li>{locale === 'en' ? 'You bring shop prices to buyers without a shop of your own.' : locale === 'ur' ? 'آپ اپنی دکان کے بغیر دکانوں کی قیمتیں خریداروں تک لاتے ہیں۔' : 'تجلب أسعار المحلات للمشترين دون أن تملك محلاً.'}</li>
                  <li>{sourceShopVisibilityText(locale)}</li>
                  <li>{locale === 'en' ? 'The shop issues the invoice in the buyer’s name at your quoted price.' : locale === 'ur' ? 'دکان آپ کی قیمت پر خریدار کے نام انوائس جاری کرتی ہے۔' : 'يُصدر المحل الفاتورة باسم المشتري بالسعر نفسه الذي في عرضك.'}</li>
                  <li>{locale === 'en' ? 'Your limit starts at 15,000 SAR per deal, rises to 50,000 SAR after 3 successful deals, and has no cap after 10.' : locale === 'ur' ? 'آپ کی حد فی سودا 15,000 ریال سے شروع ہوتی ہے، 3 کامیاب سودوں کے بعد 50,000 ریال ہو جاتی ہے، اور 10 کے بعد کوئی حد نہیں۔' : 'يبدأ حدّك بـ 15,000 ر.س للصفقة الواحدة، ويرتفع إلى 50,000 ر.س بعد 3 صفقات ناجحة، ثم بلا حد بعد 10 صفقات.'}</li>
                  <li>{locale === 'en' ? 'After every deal the buyer rates your price accuracy and service; your trust comes from these ratings.' : locale === 'ur' ? 'ہر سودے کے بعد خریدار آپ کی قیمت کی درستی اور سروس کو ریٹ کرتا ہے؛ آپ کا اعتماد انہی ریٹنگز سے بنتا ہے۔' : 'بعد كل صفقة يقيّم المشتري دقة سعرك وخدمتك، ومن هذه التقييمات تُبنى ثقتك.'}</li>
                </ul>
              </details>
            )}
            {/* owner 2026-11-25 (tax-invoice rules): a company or shop is invited to add its VAT number (optional) */}
            {role === 'supplier' && !!providerType && !isIndividual && (
              <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#D4A543' }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-navy"><Glyph e="🧾" /> {locale === 'en' ? 'Is your business registered for VAT?' : locale === 'ur' ? 'کیا آپ کا ادارہ VAT میں رجسٹرڈ ہے؟' : 'هل منشأتك مسجّلة في ضريبة القيمة المضافة؟'}</h2>
                  <span className="text-[12px] font-bold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{t.optional}</span>
                </div>
                {supVatSaved ? (
                  <>
                  <p className="text-sm text-navy"><b>{locale === 'en' ? 'Your VAT number:' : locale === 'ur' ? 'آپ کا VAT نمبر:' : 'رقمك الضريبي:'}</b> <span dir="ltr">{supVatSaved}</span></p>
                  {/* round-7 UX-037: «قيد المراجعة» until the admin sets vat_verified_at */}
                  {supVatVerified
                    ? <p className="text-[13px] font-semibold text-[#0F6E56] mt-1 inline-flex items-center gap-1"><Check className="w-4 h-4" aria-hidden /> {locale === 'en' ? 'We verified your VAT number.' : locale === 'ur' ? 'ہم نے آپ کے VAT نمبر کی تصدیق کر دی۔' : 'تحقّقنا من رقمك الضريبي.'}</p>
                    : <p className="text-[13px] text-gray-700 mt-1 leading-relaxed">{locale === 'en' ? 'Your VAT number is being reviewed by the Taseerak team; the badge «Issues a VAT invoice» appears on your offers once it is verified.' : locale === 'ur' ? 'آپ کا VAT نمبر تسعیرک ٹیم کے جائزے میں ہے؛ تصدیق کے بعد آپ کی آفرز پر «VAT انوائس جاری کرتا ہے» کا نشان ظاہر ہوگا۔' : 'رقمك الضريبي قيد المراجعة لدى فريق تسعيرك، وتظهر شارة «يُصدر فاتورة ضريبية» على عروضك بعد التحقق منه.'}</p>}
                  </>
                ) : (<>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">{locale === 'en' ? 'Most company requests ask for a VAT invoice. If you are registered, add your number; after we verify it, your offers carry «Issues a VAT invoice».' : locale === 'ur' ? 'کمپنیوں کی زیادہ تر درخواستیں VAT انوائس مانگتی ہیں۔ اگر آپ رجسٹرڈ ہیں تو اپنا نمبر شامل کریں؛ تصدیق کے بعد آپ کی آفرز پر «VAT انوائس جاری کرتا ہے» ظاہر ہوگا۔' : 'أغلب طلبات الشركات تشترط فاتورة ضريبية. إن كنت مسجّلاً فأضف رقمك، وبعد التحقق منه تظهر على عروضك شارة «يُصدر فاتورة ضريبية».'}</p>
                  <label htmlFor="ob-sup-vat" className="block text-xs font-bold text-navy mb-1">{locale === 'en' ? 'VAT number' : locale === 'ur' ? 'VAT نمبر' : 'الرقم الضريبي'}</label>
                  <input id="ob-sup-vat" value={supVat} onChange={(e: any) => setSupVat(normalizeCrInput(e.target.value).slice(0, 15))} inputMode="numeric" dir="ltr" maxLength={15} className="input-field" placeholder="3XXXXXXXXXXXXX3" aria-invalid={!!supVat && supVat.length === 15 && !isVatNo(supVat)} />
                  {!!supVat && supVat.length === 15 && !isVatNo(supVat) && <p role="alert" className="text-[12px] text-red-700 mt-1">{vatFormatMsg(locale)}</p>}
                  {!!supVat && (
                    <label className="mt-2 flex items-start gap-2 min-h-[44px] text-[13px] text-gray-700 cursor-pointer">
                      <input id="ob-sup-vat-ok" type="checkbox" checked={supVatOk} onChange={(e: any) => setSupVatOk(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-[#0B2438]" />
                      <span>{locale === 'en' ? 'I confirm that my business is VAT-registered and the number is correct.' : locale === 'ur' ? 'میں تصدیق کرتا ہوں کہ میرا ادارہ VAT میں رجسٹرڈ ہے اور نمبر درست ہے۔' : 'أؤكّد أن منشأتي مسجّلة في ضريبة القيمة المضافة وأن الرقم صحيح'}</span>
                    </label>
                  )}
                </>)}
              </div>
            )}
            {role === 'supplier' && !!providerType && !isIndividual && (
              profileComplete ? (
                <div className="rounded-2xl p-5 shadow-sm" style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#D4A543', background: '#FBF6EA', border: '1px solid #D4A54333' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0"><Glyph e="🛡" /></span>
                    <div className="flex-1">
                      <div className="font-bold text-navy text-sm">{t.verifyTitle}</div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.verifyBody}</p>
                      <button type="button" onClick={() => save('/settings?tab=docs')} disabled={saving}
                        className="inline-flex items-center mt-2 min-h-[44px] text-sm font-bold px-4 rounded-lg border-2 border-[#0B2438] text-[#0B2438] bg-white disabled:opacity-60">
                        {saving ? t.saving : <>{t.verifyCta} <span aria-hidden="true">{locale === 'en' ? '→' : '←'}</span></>}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null /* owner 2026-11-27: the locked card is gone; the side list shows «التوثيق (لاحقاً)» */
            )}

            {err && <div id="onboarding-err" role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{err}</div>}
          </div>

          {/* ═══ السايدبار: التقدّم + الحفظ (ديسكتوب) ═══ */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24 rounded-2xl p-5 text-white shadow-lg" style={{ background: 'linear-gradient(160deg,#0B2438,#071827)' }}>
              <div className={`flex items-center gap-4 mb-4 ${role === 'supplier' ? '' : 'hidden'}`}>
                <svg width="60" height="60" viewBox="0 0 56 56" className="shrink-0">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke={pct === 100 ? '#F5C55B' : '#D4A543'} strokeWidth="6" strokeLinecap="round"
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
                  <button key={i} type="button" onClick={() => goToStep(s.target)} className="w-full min-h-[44px] flex items-center gap-2 text-sm text-start rounded-lg px-1 hover:bg-white/10">
                    <span className={`w-5 h-5 grid place-items-center rounded-full shrink-0 ${s.done ? 'bg-[#0F6E56]' : 'bg-white/15'}`}>{s.done ? <Check className="w-3.5 h-3.5" aria-hidden /> : ''}</span>
                    <span className={s.done ? 'text-white' : 'text-white/70'}>{s.label}</span>
                  </button>
                ))}
                {role === 'supplier' && !isIndividual && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 grid place-items-center rounded-full text-[12px] shrink-0 bg-white/15"><Glyph e="🛡" /></span>
                    <span className="text-white/70">{t.stepVerify}</span>
                  </div>
                )}
              </div>

              {role === 'supplier' && pct < 100 && <div className="text-[12px] text-white bg-white/10 rounded-lg p-2.5 mb-4 leading-relaxed"><Glyph e="⚠" /> {ta.warn}</div>}
              {role !== 'supplier' && <p className="text-sm text-white/90 mb-4 leading-relaxed">{locale === 'en' ? 'After saving: write what you need or take a photo, and suppliers’ prices reach you.' : locale === 'ur' ? 'محفوظ کرنے کے بعد: جو چاہیے لکھیں یا تصویر لیں، اور سپلائرز کی قیمتیں آپ تک پہنچیں گی۔' : 'بعد الحفظ: اكتب ما تحتاجه أو صوّره، وتصلك أسعار الموردين.'}</p>}

              <SaveBtn full />
              <button type="button" onClick={leaveLater} className="w-full flex items-center justify-center min-h-[44px] text-sm text-white/80 hover:text-white mt-1">{t.later}</button>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ شريط الحفظ الثابت — موبايل/تابلت فقط (الديسكتوب لديه سايدبار لاصق) ═══ */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="bg-white/95 backdrop-blur border-t border-line" style={{ boxShadow: '0 -8px 24px -12px rgba(15,27,52,.18)' }}>
          {/* شريط تقدّم رفيع (المورد فقط: المشتري له خطوة واحدة، UX-037) */}
          {role === 'supplier' && <div className="h-1 w-full bg-canvas-2">
            <div className="h-full transition-all duration-300" style={{ width: pct + '%', background: pct === 100 ? '#9D7425' : '#D4A543' }} />
          </div>}
          {role === 'supplier' && pct < 100 && firstMissing && (
            <div className="max-w-6xl mx-auto px-4 pt-2">
              <button type="button" onClick={() => setStepsOpen(v => !v)} aria-expanded={stepsOpen} className="w-full min-h-[44px] flex items-center justify-between gap-2 text-start text-[13px] font-bold text-warn-text">
                <span><Glyph e="⚠" /> {t.left}: {firstMissing.label}</span>
                <span className="text-[12px] font-semibold text-[#8F6820] underline">{stepsOpen ? (locale === 'en' ? 'Hide' : locale === 'ur' ? 'چھپائیں' : 'إخفاء') : (locale === 'en' ? 'All steps' : locale === 'ur' ? 'تمام مراحل' : 'كل الخطوات')}</span>
              </button>
              {stepsOpen && (
                <ul className="pb-1 space-y-1 max-h-[45vh] overflow-y-auto">
                  {steps.map((s, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => { setStepsOpen(false); goToStep(s.target) }}
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
            <button type="button" onClick={leaveLater} className="shrink-0 inline-flex items-center min-h-[44px] text-sm font-semibold text-ink-2 px-3 rounded-xl border border-line hover:border-navy hover:text-navy transition-colors">{t.later}</button>
            {/* حفظ — الزر الأساسي الوحيد ذو البرتقالي القوي على الموبايل */}
            <button type="button" onClick={() => save()} disabled={saving || loadFailed}
              className="flex-1 btn-primary min-h-[44px] rounded-xl font-bold text-sm disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? t.saving : <>{t.save} <span aria-hidden="true">{locale === 'en' ? '→' : '←'}</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
