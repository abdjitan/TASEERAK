'use client'

import { sellerKindOf, rememberSellerKind } from '@/lib/sellers'
import { useState, useEffect } from 'react'
import PageLoader, { ROLE_HINT_KEY } from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { createClient } from '@/lib/supabase/client'
import { rememberBuyerType } from '@/lib/buyerType'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell, { clearShellCard } from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import DistrictField from '@/components/shared/DistrictField'
import EnablePush from '@/components/shared/EnablePush'
import SellerKindPicker from '@/components/shared/SellerKindPicker'
import { REGIONS, CITIES_BY_REGION, getRegionLabel } from '@/types'
import Link from 'next/link'
import { Check, Circle, LogOut, LifeBuoy, Eye, EyeOff } from 'lucide-react'
import { CONTRACTOR_FEATURES, FEATURES } from '@/lib/features'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import Glyph from '@/components/shared/Glyph'
import { normalizeCrInput, crTakenText, crClaimHref, isUnifiedCr, crFormatText } from '@/lib/cr'
import { toLatinDigits } from '@/lib/phone'
import PhoneVerify from '@/components/shared/PhoneVerify'
import EmailVerify from '@/components/shared/EmailVerify'
import { friendlyError } from '@/lib/friendlyError'
import { passwordProblems, passRuleList, passwordAuthError, PASS_RULES_SUMMARY } from '@/lib/passwordPolicy'
import { compressImage, DOC_MAX_SIDE } from '@/lib/compressImage'
import { askConfirm } from '@/lib/askConfirm'
import { readProjectDraft } from '@/lib/tender/projectDraft'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { buyerTypeText } from '@/components/auth/BuyerTypeCards'

const txt = {
  ar: {
    title: 'إعدادات الحساب', back: '→ رجوع', logout: 'خروج',
    profileTab: 'معلومات الشركة', passwordTab: 'كلمة المرور', langTab: 'اللغة', docsTab: 'المستندات',
    companyAr: 'اسم الشركة', companyEn: 'اسم الشركة (إنجليزي)',
    phone: 'رقم الجوال (واتساب)', region: 'المنطقة', city: 'المدينة',
    selectRegion: 'اختر المنطقة', saveProfile: 'حفظ التغييرات',
    saving: 'جارٍ الحفظ...', saved: '✓ تم الحفظ بنجاح', error: 'تعذّر الحفظ. تحقّق من اتصالك وحاول مرة أخرى.',
    currentPass: 'كلمة المرور الحالية', newPass: 'كلمة المرور الجديدة',
    confirmPass: 'تأكيد كلمة المرور الجديدة', changePass: 'تغيير كلمة المرور',
    passMatch: 'كلمات المرور غير متطابقة', passMin: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    passChanged: '✓ تم تغيير كلمة المرور بنجاح',
    langTitle: 'اختر لغة العرض', langSaved: 'اللغة الحالية',
    loading: 'جارٍ التحميل...',
    email: 'البريد الإلكتروني', emailNote: 'لا يمكن تغيير البريد الإلكتروني',
    role: 'نوع الحساب', contractor: 'مشتري', supplier: 'مورد',
    verStatus: 'حالة التحقق', pending: 'قيد المراجعة', verified: 'موثّق', rejected: 'التوثيق غير مقبول',
    docsTitle: 'المستندات الرسمية', docsSub: 'ارفع مستنداتك لإتمام عملية التحقق',
    licenseLabel: 'الرخصة البلدية أو رخصة النشاط (اختياري)', crLabel: 'شهادة السجل التجاري (اختياري، لشارة «موثّق»)',
    uploadDoc: 'اضغط لرفع الملف', docHint: 'ملف PDF أو صورة، بحجم 15 ميجابايت على الأكثر',
    uploadBtn: 'رفع المستندات', uploaded: '✓ تم رفع المستندات بنجاح',
    currentDoc: 'المستند الحالي', viewDoc: 'عرض',
    uploadAndSave: 'رفع المستندات وحفظها', saveCr: 'حفظ رقم السجل',
    rejectedBanner: 'لم يُقبل طلب توثيق السجل التجاري. حسابك يعمل كالمعتاد، ويمكنك رفع نسخة أوضح من الشهادة للحصول على شارة «موثّق».',
  },
  en: {
    title: 'Account Settings', back: '← Back', logout: 'Logout',
    profileTab: 'Company Info', passwordTab: 'Password', langTab: 'Language', docsTab: 'Documents',
    companyAr: 'Company Name', companyEn: 'Company Name (English)',
    phone: 'Phone (WhatsApp)', region: 'Region', city: 'City',
    selectRegion: 'Select region', saveProfile: 'Save Changes',
    saving: 'Saving...', saved: '✓ Saved successfully', error: 'Could not save. Check your connection and try again.',
    currentPass: 'Current Password', newPass: 'New Password',
    confirmPass: 'Confirm New Password', changePass: 'Change Password',
    passMatch: 'Passwords do not match', passMin: 'Password must be at least 8 characters',
    passChanged: '✓ Password changed successfully',
    langTitle: 'Choose Display Language', langSaved: 'Current language',
    loading: 'Loading...',
    email: 'Email Address', emailNote: 'Email cannot be changed',
    role: 'Account Type', contractor: 'Buyer', supplier: 'Supplier',
    verStatus: 'Verification Status', pending: 'Pending', verified: 'Verified', rejected: 'Verification not accepted',
    docsTitle: 'Official Documents', docsSub: 'Upload your documents to complete verification',
    licenseLabel: 'Municipal or activity licence (optional)', crLabel: 'Commercial registration certificate (optional, for the «Verified» badge)',
    uploadDoc: 'Click to upload file', docHint: 'PDF or image, up to 15 MB',
    uploadBtn: 'Upload Documents', uploaded: '✓ Documents uploaded successfully',
    currentDoc: 'Current document', viewDoc: 'View',
    uploadAndSave: 'Upload and save the documents', saveCr: 'Save the registration number',
    rejectedBanner: 'Your commercial registration verification was not accepted. Your account works as usual, and you can upload a clearer copy of the certificate to get the «Verified» badge.',
  },
  ur: {
    title: 'اکاؤنٹ کی ترتیبات', back: '→ واپس', logout: 'لاگ آؤٹ',
    profileTab: 'کمپنی کی معلومات', passwordTab: 'پاسورڈ', langTab: 'زبان', docsTab: 'دستاویزات',
    companyAr: 'کمپنی کا نام', companyEn: 'کمپنی کا نام (انگریزی)',
    phone: 'فون (واٹس ایپ)', region: 'علاقہ', city: 'شہر',
    selectRegion: 'علاقہ منتخب کریں', saveProfile: 'تبدیلیاں محفوظ کریں',
    saving: 'محفوظ ہو رہا ہے...', saved: '✓ کامیابی سے محفوظ', error: 'محفوظ نہیں ہو سکا۔ اپنا کنکشن چیک کریں اور دوبارہ کوشش کریں۔',
    currentPass: 'موجودہ پاسورڈ', newPass: 'نیا پاسورڈ',
    confirmPass: 'نئے پاسورڈ کی تصدیق', changePass: 'پاسورڈ تبدیل کریں',
    passMatch: 'پاسورڈ مماثل نہیں', passMin: 'پاسورڈ کم از کم 8 حروف کا ہونا چاہیے',
    passChanged: '✓ پاسورڈ کامیابی سے تبدیل ہو گیا',
    langTitle: 'ڈسپلے زبان منتخب کریں', langSaved: 'موجودہ زبان',
    loading: 'لوڈ ہو رہا ہے...',
    email: 'ای میل ایڈریس', emailNote: 'ای میل تبدیل نہیں کی جا سکتی',
    role: 'اکاؤنٹ کی قسم', contractor: 'خریدار', supplier: 'سپلائر',
    verStatus: 'تصدیق کی حیثیت', pending: 'زیر التواء', verified: 'تصدیق شدہ', rejected: 'تصدیق قبول نہیں ہوئی',
    docsTitle: 'سرکاری دستاویزات', docsSub: 'تصدیق مکمل کرنے کے لیے دستاویزات اپلوڈ کریں',
    licenseLabel: 'بلدیہ یا سرگرمی کا لائسنس (اختیاری)', crLabel: 'تجارتی رجسٹریشن سرٹیفکیٹ (اختیاری، «تصدیق شدہ» بیج کے لیے)',
    uploadDoc: 'فائل اپلوڈ کرنے کے لیے کلک کریں', docHint: 'PDF یا تصویر، زیادہ سے زیادہ 15 MB',
    uploadBtn: 'دستاویزات اپلوڈ کریں', uploaded: '✓ دستاویزات کامیابی سے اپلوڈ',
    currentDoc: 'موجودہ دستاویز', viewDoc: 'دیکھیں',
    uploadAndSave: 'دستاویزات اپلوڈ کر کے محفوظ کریں', saveCr: 'رجسٹریشن نمبر محفوظ کریں',
    rejectedBanner: 'تجارتی رجسٹریشن کی تصدیق کی درخواست قبول نہیں ہوئی۔ آپ کا اکاؤنٹ معمول کے مطابق کام کر رہا ہے، اور «تصدیق شدہ» بیج کے لیے سرٹیفکیٹ کی زیادہ واضح کاپی اپلوڈ کر سکتے ہیں۔',
  },
}

const langOptions = [
  { key: 'ar', name: 'العربية', nameLocal: 'Arabic' },
  { key: 'en', name: 'English', nameLocal: 'الإنجليزية' },
  { key: 'ur', name: 'اردو', nameLocal: 'Urdu' },
]

// A phone sign-up gets an internal address (m9665…@phone.taseerak.com): never shown as «your email» (UX-045).
const isPlaceholderEmail = (e?: string | null) => !e || /@phone\.taseerak\.com$/i.test(String(e))

// Status line: a message starting with ✓ is a success (green + icon), anything else an error.
function Msg({ m }: { m: string }) {
  const ok = m.startsWith('✓')
  return (
    <div role={ok ? 'status' : 'alert'} className={`text-sm rounded-xl p-3 flex items-center gap-2 ${ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {ok && <Check className="w-4 h-4 shrink-0" aria-hidden />}{m.replace(/^✓\s*/, '')}
    </div>
  )
}

// The CR check result in the reader's language (round-5 UX-084). The route answers in Arabic; the
// meaning is read from its stable fields (error / mode / verified / httpStatus), so no raw ✓ or 🧪.
// A result built on this page (no error, no mode) already carries a translated message.
function crCheckText(j: any, locale: string, accountVerified = true): string {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const code = String(j?.code || j?.error || '')
  const unavailable = L('The Wathq check is not available right now. Try later, or upload the certificate photo.', 'واثق سے تصدیق ابھی دستیاب نہیں۔ بعد میں کوشش کریں یا سرٹیفکیٹ کی تصویر اپلوڈ کریں۔', 'تعذّر التحقق عبر واثق حالياً. حاول لاحقاً أو ارفع صورة الشهادة.')
  if (code === 'rate_limited') return L('Too many tries. Try again in a little while.', 'بہت زیادہ کوششیں۔ تھوڑی دیر بعد کوشش کریں۔', 'محاولات كثيرة، حاول بعد قليل.')
  if (code === 'INVALID_FORMAT') return crFormatText(locale)
  if (code === 'FORBIDDEN') return L('You can check only the commercial registration saved on your account.', 'آپ صرف اپنے اکاؤنٹ میں محفوظ تجارتی رجسٹریشن کی تصدیق کر سکتے ہیں۔', 'يمكنك التحقق من السجل التجاري المحفوظ في حسابك فقط.')
  if (code === 'NETWORK') return unavailable
  if (code === 'SERVER_ERROR') return L('An unexpected error happened during the check. Try again.', 'تصدیق کے دوران غیر متوقع خرابی ہوئی۔ دوبارہ کوشش کریں۔', 'حدث خطأ غير متوقع أثناء التحقق، حاول مرة أخرى.')
  if (code === 'WATHQ_ERROR') {
    if (!/^7\d{9}$/.test(String(j?.cr || ''))) return crFormatText(locale)
    if (j?.httpStatus === 404) return L('No commercial registration with this number was found in Wathq.', 'واثق میں اس نمبر کا کوئی تجارتی رجسٹریشن نہیں ملا۔', 'لم يُعثر في واثق على سجل تجاري بهذا الرقم.')
    return unavailable
  }
  if (j?.raw?.demo) return L('Test mode: sample data for display only.', 'آزمائشی موڈ: صرف دکھانے کے لیے نمونہ ڈیٹا۔', 'وضع تجريبي: بيانات نموذجية للعرض فقط.')
  if (j?.mode === 'manual') return L('The automatic Wathq link is not active yet. Your account is verified after you upload the certificate photo and the team reviews it.', 'واثق سے خودکار ربط ابھی فعال نہیں۔ سرٹیفکیٹ کی تصویر اپلوڈ کرنے اور ٹیم کے جائزے کے بعد آپ کا اکاؤنٹ تصدیق ہوگا۔', 'الربط الآلي مع واثق غير مفعّل بعد، ويُوثَّق حسابك بعد رفع صورة الشهادة ومراجعة الفريق لها.')
  if (j?.mode === 'wathq') return j?.verified
    ? (accountVerified
      ? L('The commercial registration was verified through Wathq.', 'تجارتی رجسٹریشن کی واثق کے ذریعے تصدیق ہو گئی۔', 'تم التحقق من السجل التجاري عبر واثق.')
      : L('The commercial registration is active in Wathq. Your account is verified after the team reviews it.', 'تجارتی رجسٹریشن واثق میں فعال ہے۔ ٹیم کے جائزے کے بعد آپ کا اکاؤنٹ تصدیق ہوگا۔', 'السجل التجاري ساري المفعول في واثق، ويُوثَّق حسابك بعد مراجعة الفريق.'))
    : L('Wathq shows this commercial registration as not active, so it needs a review.', 'واثق کے مطابق یہ تجارتی رجسٹریشن فعال نہیں، اس لیے جائزہ درکار ہے۔', 'السجل التجاري غير ساري المفعول حسب واثق، ويحتاج إلى مراجعة.')
  return String(j?.message || '').replace(/[✓🧪]/gu, '').replace(/\s*—\s*/g, '، ').trim()
}

// The upload route answers in Arabic; its stable error code picks the reader's text (round-6 UX-067).
function uploadErrText(j: any, locale: string, fallback: string): string {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  switch (String(j?.error || '')) {
    case 'rate_limited': return L('Too many uploads. Try again in a little while.', 'بہت زیادہ اپلوڈ۔ تھوڑی دیر بعد کوشش کریں۔', 'محاولات رفع كثيرة. حاول بعد قليل.')
    case 'no_file': return L('No file arrived. Choose the file again.', 'کوئی فائل نہیں پہنچی۔ فائل دوبارہ منتخب کریں۔', 'لم يصل أي ملف. اختر الملف مرة أخرى.')
    case 'bad_type': return L('Only a PDF or an image (JPG, PNG) is accepted.', 'صرف PDF یا تصویر (JPG، PNG) قبول ہے۔', 'المقبول ملف PDF أو صورة (JPG أو PNG) فقط.')
    case 'too_large': return L('The file is larger than 15 MB. Choose a smaller file.', 'فائل 15 MB سے بڑی ہے۔ چھوٹی فائل منتخب کریں۔', 'الملف أكبر من 15 ميجابايت. اختر ملفاً أصغر.')
    case 'content_mismatch': return L('We could not read this file. Save it again as a PDF or an image and upload it.', 'یہ فائل پڑھی نہیں جا سکی۔ اسے دوبارہ PDF یا تصویر کے طور پر محفوظ کر کے اپلوڈ کریں۔', 'تعذّرت قراءة هذا الملف. احفظه من جديد بصيغة PDF أو صورة ثم ارفعه.')
    case 'upload_failed': return L('The file could not be uploaded. Try again.', 'فائل اپلوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر رفع الملف. حاول مرة أخرى.')
  }
  return fallback
}

function roleHint(): string | undefined {
  try { return localStorage.getItem(ROLE_HINT_KEY) || undefined } catch { return undefined }
}

export default function SettingsPage() {
  const { locale, dir, setLocale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const t = txt[locale] || txt.ar
  // CR verification (Wathq) labels
  const CRV = {
    ar: { card: 'التحقق الرسمي من السجل التجاري', sub: 'تحقق فوري عبر منصة واثق (وزارة التجارة)', btn: 'تحقق عبر واثق', checking: 'جارٍ التحقق...', noCr: 'لا يوجد رقم سجل تجاري في حسابك' },
    en: { card: 'Official CR Verification', sub: 'Instant verification via Wathq (Ministry of Commerce)', btn: 'Verify via Wathq', checking: 'Checking...', noCr: 'No commercial registration on your account' },
    ur: { card: 'سرکاری CR تصدیق', sub: 'واثق کے ذریعے فوری تصدیق', btn: 'واثق سے تصدیق', checking: 'تصدیق ہو رہی ہے...', noCr: 'آپ کے اکاؤنٹ میں کوئی CR نمبر نہیں' },
  }
  const cv = CRV[locale] || CRV.ar

  const [user, setUser] = useState<any>(null)
  const [showPw, setShowPw] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')
  const [emailOn, setEmailOn] = useState(true)
  const [emailBusy, setEmailBusy] = useState(false)
  const [waOn, setWaOn] = useState(true)
  const [waBusy, setWaBusy] = useState(false)
  // فتح تبويب محدّد عبر ?tab= (مثلاً من «أكمل التوثيق» في «أكمل ملفك» → ?tab=docs)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('tab')
    if (p && ['profile', 'notifications', 'docs', 'password', 'language'].includes(p)) setTab(p)
  }, [])

  // Profile fields
  const [companyAr, setCompanyAr] = useState('')
  const [companyEn, setCompanyEn] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  // a new or changed VAT number needs the owner's confirmation that the business is registered (owner 2026-11-25)
  const [vatConfirm, setVatConfirm] = useState(false)
  const [district, setDistrict] = useState('')
  const [prefLang, setPrefLang] = useState('ar')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Password fields
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  // Classification
  const [supplierTier, setSupplierTier] = useState('shop')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [contractorGrade, setContractorGrade] = useState('')

  // رقم التواصل الرسمي للمورد (يظهر للمقاول بعد الترسية فقط)
  const [useDiffContact, setUseDiffContact] = useState(false)
  const [contactPhone, setContactPhone] = useState('')

  // Docs
  const [licenseFile, setLicenseFile] = useState<any>(null)
  const [crFile, setCrFile] = useState<any>(null)
  const [crNumber, setCrNumber] = useState('') // 170: one CR = one account (DB-enforced)
  const [crTaken, setCrTaken] = useState('')   // the CR another account holds → offer the claim flow
  const [crRead, setCrRead] = useState<any>(null) // 172: AI read of the uploaded certificate
  const [docsMsg, setDocsMsg] = useState('')
  const [docsSaving, setDocsSaving] = useState(false)
  const [crCheck, setCrCheck] = useState<any>(null)
  const [crChecking, setCrChecking] = useState(false)
  // instant-save switches (notifications, language): their own feedback line (UX-138)
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // «who are you buying for?»: its own status line next to the choice (UX-107)
  const [btSaving, setBtSaving] = useState(false)
  const [btMsg, setBtMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // the mobile badge only when verifying the mobile is required (app flag), UX-117
  const [phoneRequired, setPhoneRequired] = useState(false)
  // a company team member: the company data belongs to the owner (UX-118)
  const [teamOf, setTeamOf] = useState<{ id: string; name: string } | null>(null)
  function flashNotif(ok: boolean, lang?: string) {
    const LL = (en: string, ur: string, ar: string) => { const l = lang || locale; return l === 'en' ? en : l === 'ur' ? ur : ar }
    setNotifMsg({ ok, text: ok ? LL('Saved', 'محفوظ', 'حُفظ') : LL('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ، حاول مرة أخرى.') })
    setTimeout(() => setNotifMsg(null), 2500)
  }

  // a failed load shows an error with a retry, never an empty form (round-5 UX-113)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    async function init() {
      setLoadFailed(false)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      const { data: p, error: pErr } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (pErr || !p) throw pErr || new Error('no profile')
      if (p) {
        setProfile(p)
        if (p.role === 'contractor') rememberBuyerType(p.buyer_type)
        if (p.role === 'supplier') rememberSellerKind(sellerKindOf(p.provider_type))
        setCompanyAr(p.company_name_ar || '')
        setCompanyEn(p.company_name_en || '')
        setPhone(p.phone || '')
        setRegion(p.region || '')
        setCity(p.city || '')
        setVatNumber(p.vat_number || '')
        setCrNumber(p.commercial_registration || '')
        setDistrict(p.district || '')
        setPrefLang(p.preferred_language || 'ar')
        // the display language follows the saved one on the first load (round-5 UX-076)
        if (p.preferred_language && ['ar', 'en', 'ur'].includes(p.preferred_language) && p.preferred_language !== locale) setLocale(p.preferred_language as any)
        setEmailOn(p.email_notifications !== false)
        setWaOn(p.whatsapp_notifications !== false)
        setSupplierTier(p.supplier_tier || 'shop')
        setMinOrderValue(p.min_order_value ? String(p.min_order_value) : '')
        setContractorGrade(p.contractor_grade || '')
        // رقم تواصل مختلف عن الواتساب فقط إذا كان مُخزّناً ومختلفاً عن رقم الجوال
        const cp = p.contact_phone || ''
        if (cp && cp !== (p.phone || '')) { setUseDiffContact(true); setContactPhone(cp) }
        else { setUseDiffContact(false); setContactPhone('') }
      }
      try {
        const [{ data: req }, { data: acting }] = await Promise.all([supabase.rpc('phone_verify_required'), supabase.rpc('acting_uid')])
        setPhoneRequired(req === true)
        if (p?.role === 'supplier' && acting && acting !== session.user.id) {
          const { data: co } = await supabase.from('profiles_public').select('company_name_ar').eq('id', acting).maybeSingle()
          setTeamOf({ id: String(acting), name: (co as any)?.company_name_ar || '' })
        }
      } catch {}
      const { data: reqs } = await supabase.from('profile_change_requests').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
      setMyRequests(reqs || [])
    }
    setLoading(true)
    init().catch(() => setLoadFailed(true)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey])

  // Links like /settings#phone or #email (verify banner, gates) open the profile tab, scroll to the
  // field and highlight it for a moment (UX-138).
  useEffect(() => {
    if (loading) return
    const h = window.location.hash.replace('#', '')
    if (h !== 'phone' && h !== 'email') return
    setTab('profile')
    const t1 = setTimeout(() => {
      const el = document.getElementById(h)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-[#D4A543]', 'ring-offset-4', 'rounded-xl')
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#D4A543]', 'ring-offset-4', 'rounded-xl'), 2600)
    }, 150)
    return () => clearTimeout(t1)
  }, [loading])

  // Locked-field change requests (name / classification)
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [crqModal, setCrqModal] = useState<any>(null) // 'name' | 'classification'
  const [crqValue, setCrqValue] = useState('')
  const [crqReason, setCrqReason] = useState('')
  const [crqSaving, setCrqSaving] = useState(false)
  const [crqMsg, setCrqMsg] = useState('')
  const pendingFor = (field: any) => myRequests.find((r: any) => r.field === field && r.status === 'pending')

  async function submitChangeRequest() {
    if (!crqValue.trim()) { setCrqMsg(L('Enter the new value', 'نئی قدر لکھیں', 'اكتب القيمة الجديدة')); return }
    setCrqSaving(true); setCrqMsg('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('request_profile_change', {
      p_field: crqModal, p_new_value: crqValue.trim(), p_reason: crqReason.trim() || null, p_document_url: null,
    })
    setCrqSaving(false)
    if (error || !data?.ok) {
      const map = {
        pending_exists: L('You already have a pending request for this field.', 'اس خانے کے لیے آپ کی درخواست پہلے سے زیرِ جائزہ ہے۔', 'لديك طلب قيد المراجعة للحقل نفسه.'),
        cooldown: L('This field can be changed only 90 days after the last approved change.', 'یہ خانہ آخری منظور شدہ تبدیلی کے 90 دن بعد ہی بدلا جا سکتا ہے۔', 'لا يمكن طلب تغيير هذا الحقل إلا بعد 90 يوماً من آخر تغيير معتمد.'),
        empty: L('The value is empty.', 'قدر خالی ہے۔', 'القيمة فارغة.'),
        unauthorized: L('Sign in first.', 'پہلے لاگ ان کریں۔', 'سجّل الدخول أولاً.'),
      }
      setCrqMsg((map as any)[data?.error] || L('Could not send the request — please try again.', 'درخواست نہیں بھیجی جا سکی — دوبارہ کوشش کریں۔', 'تعذّر إرسال الطلب. حاول مرة ثانية.'))
      return
    }
    const { data: reqs } = await supabase.from('profile_change_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setMyRequests(reqs || [])
    setCrqModal(null); setCrqValue(''); setCrqReason('')
    setProfileMsg(L('✓ Request sent to admin', '✓ درخواست انتظامیہ کو بھیج دی گئی', '✓ تم إرسال الطلب للإدارة'))
    setTimeout(() => setProfileMsg(''), 4000)
  }

  async function saveProfile(e: any) {
    e.preventDefault()
    // VAT number (ZATCA): 15 digits starting and ending with 3; a wrong one marks every offer as VAT-registered
    const vat = toLatinDigits(vatNumber).replace(/\s/g, '')
    if (vat && !/^3\d{13}3$/.test(vat)) {
      setProfileMsg(L('The VAT number is 15 digits, starting with 3 and ending with 3.', 'ٹیکس نمبر 15 ہندسوں کا ہوتا ہے، جو 3 سے شروع اور 3 پر ختم ہوتا ہے۔', 'الرقم الضريبي 15 رقماً يبدأ بـ3 وينتهي بـ3.'))
      return
    }
    if (vat && vat !== (profile?.vat_number || '') && !vatConfirm) {
      setProfileMsg(L('Confirm that your business is VAT-registered and the number is correct.', 'تصدیق کریں کہ آپ کا ادارہ VAT میں رجسٹرڈ ہے اور نمبر درست ہے۔', 'أكّد أن منشأتك مسجّلة في ضريبة القيمة المضافة وأن الرقم صحيح.'))
      return
    }
    setProfileSaving(true); setProfileMsg('')
    const supabase = createClient()
    // Note: a seller's name (company_name_*) and classification (supplier_tier / contractor_grade)
    // are LOCKED once verified — they change only via an approved request, enforced by a DB trigger.
    // The phone is NOT saved from here: it changes only through PhoneVerify (SMS code), so a typo can
    // never silently drop the verification (UX-046). The language is saved by the language tab.
    const updateData: any = { region, city, vat_number: vat || null, district: district || null }
    // the name is editable for buyers always, and for sellers until verification (UX-044)
    const locked = profile?.role === 'supplier' && (profile?.verification_status === 'verified' || profile?.cr_verification_source === 'wathq')
    if (!locked) {
      if (!companyAr.trim()) {
        setProfileSaving(false)
        setProfileMsg(L('Write your name before saving.', 'محفوظ کرنے سے پہلے اپنا نام لکھیں۔', 'اكتب اسمك قبل الحفظ.'))
        return
      }
      updateData.company_name_ar = companyAr.trim()
      // a person's own name (home buyer, independent seller, team member) is also the profile's full_name (round-5 UX-214)
      const personal = (profile?.role === 'contractor' && profile?.buyer_type === 'individual')
        || (profile?.role === 'supplier' && (['individual', 'price_agent', 'broker'].includes(profile?.provider_type) || !!teamOf))
      if (personal) updateData.full_name = companyAr.trim()
    }
    if (profile?.role === 'supplier' && !teamOf) {
      updateData.min_order_value = minOrderValue ? parseFloat(minOrderValue) : 0
      // إذا اختار رقم مختلف نخزّنه، وإلا نُفرّغه ليُستخدم رقم الجوال تلقائياً بعد الترسية
      if (useDiffContact) {
        const digits = toLatinDigits(contactPhone).replace(/[^\d+]/g, '')
        if (!/^(\+9665\d{8}|9665\d{8}|05\d{8}|\+9661\d{7,8}|01\d{7,8}|800\d{7}|9200\d{5})$/.test(digits)) {
          setProfileSaving(false)
          setProfileMsg(L('The contact number is not valid. Write it like 0551234567.', 'رابطہ نمبر درست نہیں۔ اسے 0551234567 کی طرح لکھیں۔', 'رقم التواصل غير صحيح، اكتبه مثل 0551234567.'))
          return
        }
        updateData.contact_phone = digits
      } else updateData.contact_phone = null
    }
    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id)
    setProfileSaving(false)
    // a changed VAT number loses the team's check (DB trigger, migration 286): mirror it here
    if (!error) {
      setProfile((p: any) => ({ ...p, vat_number: vat || null, vat_verified_at: vat && vat === (p?.vat_number || '') ? p?.vat_verified_at : null }))
      setVatConfirm(false)
    }
    // the database refuses a malformed VAT number (migration 286 constraint)
    setProfileMsg(error ? (/vat_number_format/.test(String(error.message || '')) ? L('The VAT number is 15 digits, starting with 3 and ending with 3.', 'ٹیکس نمبر 15 ہندسوں کا ہوتا ہے، جو 3 سے شروع اور 3 پر ختم ہوتا ہے۔', 'الرقم الضريبي 15 رقماً يبدأ بـ3 وينتهي بـ3.') : t.error) : t.saved)
    setTimeout(() => setProfileMsg(''), 3000)
  }

  async function changePassword(e: any) {
    e.preventDefault()
    setPassMsg('')
    const lc = (locale === 'en' || locale === 'ur' ? locale : 'ar') as 'ar' | 'en' | 'ur'
    if (!curPass) { setPassMsg(passwordAuthError({ code: 'current_password_required' }, lc)); return }
    if (passwordProblems(newPass).length) { setPassMsg(PASS_RULES_SUMMARY[lc]); return }
    if (newPass !== confirmPass) { setPassMsg(t.passMatch); return }
    if (newPass === curPass) { setPassMsg(passwordAuthError({ code: 'same_password' }, lc)); return }
    setPassSaving(true)
    const supabase = createClient()
    // The project requires the current password on update (Supabase Auth "secure password change").
    const { error } = await supabase.auth.updateUser({ password: newPass, current_password: curPass })
    setPassSaving(false)
    if (error) { setPassMsg(passwordAuthError(error, lc)); return }
    setPassMsg(t.passChanged)
    setCurPass(''); setNewPass(''); setConfirmPass('')
    setTimeout(() => setPassMsg(''), 3000)
  }

  async function uploadDocs(e: any) {
    e.preventDefault()
    const crDigits = normalizeCrInput(crNumber)
    const crChanged = crDigits !== (profile?.commercial_registration || '')
    if (!licenseFile && !crFile && !crChanged) return
    if (crDigits && !isUnifiedCr(crDigits)) {
      setDocsMsg(crFormatText(locale))
      return
    }
    setDocsSaving(true); setDocsMsg(''); setCrTaken('')
    const supabase = createClient()

    // Save the CR number first: the DB refuses a CR another account holds (hint CR_TAKEN),
    // and then nothing is uploaded — the user is offered the claim flow instead.
    if (crChanged) {
      const { error: crErr } = await supabase.from('profiles').update({ commercial_registration: crDigits || null }).eq('id', user.id)
      if (crErr) {
        setDocsSaving(false)
        if ((crErr as any).hint === 'CR_TAKEN') { setCrTaken(crDigits); return }
        setDocsMsg(friendlyError(crErr.message, t.error, locale)); return
      }
      setProfile((p: any) => ({ ...p, commercial_registration: crDigits || null }))
      if (!licenseFile && !crFile) {
        setDocsSaving(false)
        setDocsMsg(L('✓ Saved', '✓ محفوظ', '✓ تم الحفظ'))
        setTimeout(() => setDocsMsg(''), 3000)
        return
      }
    }

    let licenseUrl = profile?.license_url
    let crUrl = profile?.cr_url

    // رفع عبر مسار خادمي يفحص المحتوى (magic-byte) قبل التخزين — لا رفع مباشر من المتصفح
    async function up(file: any, kind: string): Promise<string | null> {
      const fd = new FormData(); fd.append('file', await compressImage(file, { maxSide: DOC_MAX_SIDE })); fd.append('kind', kind)
      const res = await fetch('/api/upload-verification', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) { setDocsMsg(uploadErrText(j, locale, t.error)); return null }
      return j.path as string
    }

    if (licenseFile) {
      const p = await up(licenseFile, 'license')
      if (p === null) { setDocsSaving(false); return }
      licenseUrl = p
    }

    if (crFile) {
      const p = await up(crFile, 'cr')
      if (p === null) { setDocsSaving(false); return }
      crUrl = p
    }

    // license_url/cr_url aren't locked and persist directly; verification_status IS locked,
    // so reset it to 'pending' via a trusted RPC — otherwise a rejected supplier's re-upload
    // never re-enters admin review (the client write was silently reverted) (B7).
    const { error } = await supabase.from('profiles').update({
      license_url: licenseUrl,
      cr_url: crUrl,
    }).eq('id', user.id)
    if (!error) await supabase.rpc('request_reverification')

    setDocsSaving(false)
    if (error) { setDocsMsg(t.error); return }
    setDocsMsg(t.uploaded)
    setProfile((p: any) => ({ ...p, license_url: licenseUrl, cr_url: crUrl, verification_status: p?.verification_status === 'verified' ? 'verified' : 'pending' }))
    const readCr = !!crFile
    setLicenseFile(null); setCrFile(null)
    setTimeout(() => setDocsMsg(''), 4000)
    // 172: read the new CR certificate (helper for the admin + an auto-fill suggestion; manual when off/capped)
    if (readCr) {
      setCrRead(null)
      const r = await fetch('/api/verification/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'cr' }) })
      const j = await r.json().catch(() => null)
      if (j?.mode === 'ai' && j.extracted) {
        setCrRead(j)
        if (j.extracted.cr_number && !normalizeCrInput(crNumber)) setCrNumber(j.extracted.cr_number)
      }
    }
  }

  // Verify the CR against the official source (Wathq). The number TYPED in the field is saved first
  // (one CR = one account: CR_TAKEN offers the claim flow), then checked (UX-131).
  async function verifyCRSettings() {
    const cr = normalizeCrInput(crNumber)
    if (!/^[0-9]{10}$/.test(cr)) { setCrCheck({ ok: false, message: cv.noCr }); return }
    if (!isUnifiedCr(cr)) { setCrCheck({ ok: false, message: crFormatText(locale) }); return }
    setCrChecking(true); setCrCheck(null); setCrTaken('')
    if (cr !== (profile?.commercial_registration || '')) {
      const { error: crErr } = await createClient().from('profiles').update({ commercial_registration: cr }).eq('id', user.id)
      if (crErr) {
        setCrChecking(false)
        if ((crErr as any).hint === 'CR_TAKEN') { setCrTaken(cr); return }
        setCrCheck({ ok: false, message: friendlyError(crErr.message, t.error, locale) }); return
      }
      setProfile((p: any) => ({ ...p, commercial_registration: cr }))
    }
    try {
      const res = await fetch('/api/verify-cr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr }),
      })
      const j = await res.json()
      setCrCheck(j)
      // NOTE (B7/security): account verification is NOT granted from here. verification_status
      // and cr_* are locked against client writes (the old update was silently reverted), and a
      // CR being active is not sufficient on its own — full verification requires the two-factor
      // owner match via /api/verify-identity (which persists server-side) or admin approval.
      // This flow only shows the official CR status to the user.
    } catch {
      setCrCheck({ ok: false, message: t.error })
    }
    setCrChecking(false)
  }

  // open a sensitive doc via a short-lived signed URL (private bucket).
  // legacy values stored as full public URLs still open directly.
  async function openDoc(val: any) {
    if (!val) return
    if (typeof val === 'string' && val.startsWith('http')) { window.open(val, '_blank'); return }
    const supabase = createClient()
    const { data } = await supabase.storage.from('verification').createSignedUrl(val, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  // sign-out from the menu or from this page; an unsent request saved on this device is deleted with
  // it, so ask first (UX-036)
  async function handleSignOut() {
    let draft = false
    try { for (let i = 0; i < localStorage.length; i++) if ((localStorage.key(i) || '').startsWith('taseerak_draft:')) { draft = true; break } } catch {}
    if (draft && !(await askConfirm(L('Log out? The unsent request saved on this device will be deleted with its photos.', 'لاگ آؤٹ کریں؟ اس ڈیوائس پر محفوظ نہ بھیجی گئی درخواست اپنی تصاویر سمیت حذف ہو جائے گی۔', 'تسجيل الخروج؟ سيُحذف الطلب غير المرسل المحفوظ على هذا الجهاز مع صوره.'), { danger: true, okLabel: L('Log out', 'لاگ آؤٹ', 'تسجيل الخروج') }))) return
    const supabase = createClient()
    clearAllLocalDrafts()
    clearShellCard()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // the display language is also the language of notifications (UX-138: one setting, not two)
  async function pickLanguage(key: string) {
    setLocale(key as any)
    setPrefLang(key)
    if (!user) return
    const { error } = await createClient().from('profiles').update({ preferred_language: key }).eq('id', user.id)
    flashNotif(!error, key)
  }

  if (loading) return <PageLoader />
  if (loadFailed || !profile) return (
    <AppShell title={t.title} userId={user?.id} nav={getNav(profile?.role || roleHint(), locale, '/settings')} dir={dir}>
      <div className="max-w-xl mx-auto">
        <LoadError onRetry={() => setReloadKey(k => k + 1)}
          message={L('We could not load your account details. Check your connection.', 'آپ کے اکاؤنٹ کی تفصیلات لوڈ نہیں ہو سکیں۔ اپنا کنکشن چیک کریں۔', 'تعذّر تحميل بيانات حسابك. تحقّق من اتصالك.')} />
      </div>
    </AppShell>
  )

  const isSupplier = profile?.role === 'supplier'
  const isBuyer = profile?.role === 'contractor'
  const homeBuyer = isBuyer && profile?.buyer_type === 'individual'
  const independent = ['individual', 'price_agent', 'broker'].includes(profile?.provider_type)
  const teamMember = isSupplier && !!teamOf
  // a team member's name is his own, never tied to the company's CR (round-5 UX-110)
  const nameLocked = isSupplier && !teamMember && (profile?.verification_status === 'verified' || profile?.cr_verification_source === 'wathq')
  const placeholderEmail = isPlaceholderEmail(user?.email)
  // a phone sign-up has no password: it signs in with a code (UX-040)
  const phoneAccount = placeholderEmail || user?.user_metadata?.signup_method === 'phone'
  // documents are for selling businesses only (company / shop), not buyers or independents (UX-043)
  const showDocs = isSupplier && !independent && !teamMember
  const profileTitle = teamMember ? L('My details', 'میری تفصیلات', 'بياناتي')
    : isSupplier && independent ? L('Account details', 'اکاؤنٹ کی تفصیلات', 'بيانات الحساب')
    : isSupplier ? t.profileTab
    : homeBuyer ? L('My details', 'میری تفصیلات', 'بياناتي')
    : L('Account details', 'اکاؤنٹ کی تفصیلات', 'بيانات الحساب')
  const nameLabel = teamMember ? L('Your name', 'آپ کا نام', 'اسمك')
    : isSupplier ? (independent ? L('Name', 'نام', 'الاسم') : t.companyAr)
    : homeBuyer ? L('Name', 'نام', 'الاسم') : L('Company or establishment name', 'کمپنی یا ادارے کا نام', 'اسم الشركة أو المؤسسة')
  const namePlaceholder = homeBuyer || teamMember || (isSupplier && independent) ? L('Your full name', 'آپ کا پورا نام', 'اسمك الكامل')
    : L('Company or establishment name', 'کمپنی یا ادارے کا نام', 'اسم الشركة أو المؤسسة')
  const showVat = teamMember ? false : isSupplier ? !(independent && !vatNumber) : homeBuyer ? !!profile?.vat_number : true
  const crDigits = normalizeCrInput(crNumber)
  const crValid = isUnifiedCr(crDigits)
  const cityOptions = CITIES_BY_REGION[region] || []
  const cityKnown = !city || cityOptions.some(c => c.ar === city)

  const tabs = [
    { key: 'profile', icon: <Glyph e="👤" />, label: profileTitle },
    // notifications have their own tab (?tab=notifications), not the bottom of the profile (UX-099)
    { key: 'notifications', icon: <Glyph e="🔔" />, label: L('Notifications', 'اطلاعات', 'الإشعارات') },
    ...(showDocs ? [{ key: 'docs', icon: <Glyph e="📄" />, label: t.docsTab }] : []),
    { key: 'password', icon: <Glyph e="🔒" />, label: phoneAccount ? L('Sign-in method', 'سائن اِن کا طریقہ', 'طريقة الدخول') : t.passwordTab },
    { key: 'language', icon: <Glyph e="🌐" />, label: t.langTab },
  ]
  const supportLabel = L('Support', 'سپورٹ', 'الدعم')
  const deleteLabel = L('Delete my account', 'میرا اکاؤنٹ حذف کریں', 'حذف حسابي')
  const signOutLabel = L('Log out', 'لاگ آؤٹ', 'تسجيل الخروج')
  // the eye button on the password fields (round-4 UX-148), as on the sign-up page
  const PwEye = () => (
    <button type="button" onClick={() => setShowPw(s => !s)} aria-pressed={showPw}
      aria-label={showPw ? L('Hide password', 'پاسورڈ چھپائیں', 'إخفاء كلمة المرور') : L('Show password', 'پاسورڈ دکھائیں', 'إظهار كلمة المرور')}
      className="absolute inset-y-0 end-0 my-auto h-11 w-11 grid place-items-center rounded-lg text-gray-500 hover:text-[#8F6820]">
      {showPw ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
    </button>
  )
  const legalLinks = (cls: string) => (<>
    <Link href="/terms" className={cls}><Glyph e="📄" /><span>{L('Terms and conditions', 'شرائط و ضوابط', 'الشروط والأحكام')}</span></Link>
    <Link href="/privacy" className={cls}><Glyph e="🔒" /><span>{L('Privacy policy', 'رازداری کی پالیسی', 'سياسة الخصوصية')}</span></Link>
  </>)

  const agentHint = isSupplier && independent && profile?.verification_status !== 'verified' && profile?.verification_status !== 'rejected'
    ? <p className="text-[12px] text-gray-600 mt-1">{L('Your deal cap rises with every successful deal.', 'ہر کامیاب ڈیل کے ساتھ آپ کی ڈیل کی حد بڑھتی ہے۔', 'يرتفع حدّ صفقاتك مع كل صفقة ناجحة.')}</p>
    : null
  // status pill under the avatar: a buyer sees the phone state, a seller the review state
  const statusPill = teamMember
    ? <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full font-semibold bg-[#0B2438] text-white">
        {L(`Member of the «${teamOf?.name || 'company'}» team`, `«${teamOf?.name || 'کمپنی'}» کی ٹیم کے رکن`, `عضو في فريق «${teamOf?.name || 'الشركة'}»`)}
      </span>
    : isSupplier
    ? (!independent && profile?.verification_status !== 'verified' && profile?.verification_status !== 'rejected' && !profile?.cr_url
      ? <button type="button" onClick={() => setTab('docs')} className="inline-flex items-center gap-1 mt-2 min-h-[32px] text-xs px-2.5 rounded-full font-semibold bg-warn-bg text-warn-text border border-warn-border hover:underline">
          {!profile?.commercial_registration
            ? L('Add the commercial registration number', 'تجارتی رجسٹریشن نمبر شامل کریں', 'أضف رقم السجل التجاري')
            : L('Not verified: request the «Verified» badge', 'تصدیق شدہ نہیں: «تصدیق شدہ» بیج کی درخواست کریں', 'غير موثّق، اطلب شارة «موثّق»')}
        </button>
      : <span className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
        profile?.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
        profile?.verification_status === 'rejected' ? 'bg-gray-100 text-gray-700' : independent ? 'bg-[#0B2438] text-white' : 'bg-warn-bg text-warn-text'
      }`}>
        {profile?.verification_status === 'verified' ? t.verified : profile?.verification_status === 'rejected' ? t.rejected
          : independent ? <span title={L('Your deal cap rises with every successful deal', 'ہر کامیاب ڈیل کے ساتھ آپ کی ڈیل کی حد بڑھتی ہے', 'يرتفع حدّ صفقاتك مع كل صفقة ناجحة')}>{L('Pricing agent', 'قیمت ایجنٹ', 'وسيط تسعير')}</span>
          : t.pending}
      </span>)
    : profile?.phone_verified_at
      ? <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800"><Check className="w-3.5 h-3.5" aria-hidden />{L('Mobile verified', 'موبائل تصدیق شدہ', 'الجوال موثّق')}</span>
      : !phoneRequired ? null
      : <a href="#phone" onClick={() => setTab('profile')} className="inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-full font-semibold bg-warn-bg text-warn-text">{L('Verify your mobile', 'اپنا موبائل تصدیق کریں', 'وثّق جوالك')}</a>

  return (
    <AppShell title={t.title} company={companyAr} userId={user?.id} nav={getNav(profile?.role, locale, '/settings')} dir={dir}>
      <div className="max-w-5xl mx-auto">
        {/* one h1 on every width; visually hidden on phones where the top bar shows the title (UX-110) */}
        <h1 className="sr-only lg:not-sr-only lg:block text-2xl font-bold mb-8" style={{ color: '#0B2438' }}>{t.title}</h1>

        {/* Phones: one horizontal tab row that stays under the top bar, so a tab never changes content
            out of sight below a tall menu card (UX-138) */}
        <div className="lg:hidden sticky top-[61px] sm:top-[69px] z-20 -mx-4 px-4 py-2 mb-4 bg-[#F4F3EF]/95 backdrop-blur border-b border-gray-200/70">
          {/* a soft fade at the end edge says the row scrolls (round-6 UX-115) */}
          <div role="tablist" aria-label={t.title} className="flex gap-2 overflow-x-auto [mask-image:linear-gradient(to_left,transparent,#000_24px)] rtl:[mask-image:linear-gradient(to_right,transparent,#000_24px)] pe-6">
            {tabs.map(item => (
              <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} aria-controls="settings-panel" onClick={() => setTab(item.key)}
                className={`shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-3.5 rounded-xl text-sm font-bold whitespace-nowrap border ${
                  tab === item.key ? 'bg-[#0B2438] text-white border-[#0B2438]' : 'bg-white text-[#0B2438] border-gray-200'}`}>
                {item.icon}{item.label}
              </button>
            ))}
            <Link href="/support" className="shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-3.5 rounded-xl text-sm font-bold whitespace-nowrap border bg-white text-[#0B2438] border-gray-200">
              <LifeBuoy className="w-4 h-4" aria-hidden />{supportLabel}
            </Link>
          </div>
        </div>

        <div className="lg:hidden mb-4 flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-3">
          <div className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-white font-bold" style={{ background: '#0B2438' }}>{companyAr?.[0] || '?'}</div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate text-[#0B2438]">{companyAr || '—'}</div>
            <div className="text-[12px] text-gray-600 truncate" dir="ltr">{placeholderEmail ? (profile?.phone || '') : user?.email}</div>
            {statusPill}{agentHint}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar (desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
              {/* Avatar */}
              <div className="text-center p-4 border-b border-gray-50 mb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-3 font-bold"
                  style={{ background: '#0B2438' }}>
                  {companyAr?.[0] || '?'}
                </div>
                <div className="font-bold text-sm break-words" style={{ color: '#0B2438' }}>{companyAr}</div>
                {/* the phone for a phone sign-up, never the internal placeholder address (UX-045) */}
                <div className="text-xs text-gray-600 mt-0.5 break-all" dir="ltr">{placeholderEmail ? (profile?.phone || '') : user?.email}</div>
                {statusPill}{agentHint}
              </div>

              <div role="tablist" aria-orientation="vertical" aria-label={t.title}>
                {tabs.map(item => (
                  <button key={item.key} id={'set-tab-' + item.key} type="button" role="tab" aria-selected={tab === item.key} aria-controls="settings-panel" onClick={() => setTab(item.key)}
                    className={`w-full min-h-[44px] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-start ${
                      tab === item.key ? 'text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={tab === item.key ? { background: '#0B2438' } : {}}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              {/* one support entry for the whole app: the /support page (UX-033) */}
              <Link href="/support" className="w-full min-h-[44px] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                <LifeBuoy className="w-[1em] h-[1em]" aria-hidden /><span>{supportLabel}</span>
              </Link>
              {legalLinks('w-full min-h-[44px] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50')}
              <div className="mt-2 pt-2 border-t border-gray-100">
                {/* sign-out lives in the app frame on desktop (sidebar and top bar): no third copy here (round-4 UX-146) */}
                <a href="/account/delete" className="w-full min-h-[44px] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50">
                  <span><Glyph e="🗑" /></span>
                  <span>{deleteLabel}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 min-w-0" role="tabpanel" id="settings-panel" aria-labelledby={'set-tab-' + tab} tabIndex={-1}>
            {/* Profile Tab */}
            {(tab === 'profile' || (tab === 'docs' && !showDocs)) && (
              <div className="bg-white rounded-2xl p-4 sm:p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}>{profileTitle}</h2>
                <p className="text-sm text-gray-600 mb-6">{t.role}: <span className="font-semibold text-[#0B2438]">{isBuyer ? t.contractor : teamMember ? L('Company team member', 'کمپنی کی ٹیم کا رکن', 'عضو في فريق شركة') : independent ? L('Pricing agent', 'قیمت ایجنٹ', 'وسيط تسعير') : t.supplier}</span></p>
                {teamMember && (
                  <div className="mb-6 rounded-xl border border-gray-200 bg-[#EEF2F6] p-4 text-sm text-[#0B2438] leading-relaxed" role="note">
                    {L(`You are a member of the «${teamOf?.name || 'company'}» team. The company details and documents are managed by the account owner.`, `آپ «${teamOf?.name || 'کمپنی'}» کی ٹیم کے رکن ہیں۔ کمپنی کی تفصیلات اور دستاویزات اکاؤنٹ کا مالک سنبھالتا ہے۔`, `أنت عضو في فريق «${teamOf?.name || 'الشركة'}». بيانات الشركة ومستنداتها يديرها مالك الحساب.`)}
                  </div>
                )}
                {/* owner 2026-11-22: «لبيتي» = the simple request and a short home; changeable here any time */}
                {isBuyer && (
                  <div className="mb-6 rounded-xl border border-gray-200 p-4">
                    <div id="buyer-type-label" className="text-sm font-bold text-[#0B2438] mb-2">{L('Who are you buying for?', 'آپ کس کے لیے خرید رہے ہیں؟', 'لمن تشتري؟')}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-labelledby="buyer-type-label" aria-busy={btSaving}>
                      {([['individual', L('My home', 'اپنا گھر', 'لبيتي'), buyerTypeText(locale).homeSub], ['business', L('Contractor or company', 'ٹھیکیدار یا کمپنی', 'مقاول أو شركة'), buyerTypeText(locale).businessSub]] as const).map(([v, label, sub]) => {
                        const on = profile?.buyer_type === v
                        return (
                          <button key={v} type="button" role="radio" aria-checked={on}
                            disabled={btSaving}
                            onClick={async () => {
                              if (on || btSaving) return
                              const prev = profile?.buyer_type
                              // work in progress is hidden (not deleted) in home mode: say so first (round-4 UX-098)
                              if (v === 'individual') {
                                let busy = false
                                try { const d = readProjectDraft(profile.id); busy = Array.isArray(d?.items) && d.items.length > 0 } catch {}
                                // the same check as the app (round-5 UX-094): open quantity lists + tenders in draft or review
                                if (!busy) {
                                  try {
                                    const { data: n, error: nErr } = await createClient().rpc('my_business_work_count')
                                    if (nErr) throw nErr
                                    busy = Number(n) > 0
                                  } catch {
                                  try {
                                    const sb = createClient()
                                    const [{ count }, { data: projs }] = await Promise.all([
                                      sb.from('tenders').select('id', { count: 'exact', head: true }).eq('contractor_id', profile.id).in('status', ['draft', 'review']),
                                      sb.from('project_rfqs').select('id, status').eq('contractor_id', profile.id).limit(50),
                                    ])
                                    const openProjects = (projs || []).filter((p: any) => !['closed', 'completed', 'cancelled', 'done'].includes(String(p?.status || '')))
                                    busy = (count || 0) > 0 || openProjects.length > 0
                                  } catch {}
                                  }
                                }
                                if (busy && !(await askConfirm(L(
                                  'You have quantity lists or tenders in progress. In «My home» mode they are hidden from the menu and the home page, not deleted, and you can bring them back by returning to «Contractor or company». Switch?',
                                  'آپ کے پاس زیرِ کار مقداروں کی فہرستیں یا ٹینڈر ہیں۔ «اپنا گھر» موڈ میں یہ مینو اور ہوم پیج سے چھپ جائیں گے، حذف نہیں ہوں گے، اور «ٹھیکیدار یا کمپنی» پر واپس جا کر آپ انہیں دوبارہ دیکھ سکتے ہیں۔ کیا آپ تبدیل کرنا چاہتے ہیں؟',
                                  'لديك جداول كميات أو مناقصات قيد العمل. ستُخفى من القائمة والصفحة الرئيسية في وضع «لبيتي»، ولن تُحذف، ويمكنك إعادتها بالعودة إلى «مقاول أو شركة». هل تريد التبديل؟'),
                                  { okLabel: L('Switch', 'تبدیل کریں', 'بدّل') }))) return
                              }
                              setBtSaving(true); setBtMsg(null)
                              setProfile((p: any) => ({ ...p, buyer_type: v })); rememberBuyerType(v); window.dispatchEvent(new Event('tsk:buyer-type'))
                              const { error } = await createClient().from('profiles').update({ buyer_type: v }).eq('id', profile.id)
                              if (error) { setProfile((p: any) => ({ ...p, buyer_type: prev })); rememberBuyerType(prev); window.dispatchEvent(new Event('tsk:buyer-type')) }
                              else {
                                // the home page shows its cached snapshot first: keep it on the new type (round-4 UX-055)
                                try { const snap = readPageCache<any>('home_' + profile.id); if (snap?.p) writePageCache('home_' + profile.id, { ...snap, p: { ...snap.p, buyer_type: v } }) } catch {}
                              }
                              setBtSaving(false)
                              setBtMsg(error
                                ? { ok: false, text: L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ، حاول مرة أخرى.') }
                                : v === 'individual'
                                  ? { ok: true, text: L('Saved. The home page and the request are now simpler.', 'محفوظ ہو گیا۔ ہوم پیج اور درخواست اب آسان ہیں۔', 'حُفظ. أصبحت الصفحة الرئيسية والطلب أبسط.') }
                                  : { ok: true, text: L('Saved. All the options now appear in the menu. Write the name of your company or establishment in the field below.', 'محفوظ ہو گیا۔ تمام اختیارات اب مینو میں ہیں۔ نیچے والے خانے میں اپنی کمپنی یا ادارے کا نام لکھیں۔', 'حُفظ. ظهرت كل الخيارات في القائمة. اكتب اسم شركتك أو مؤسستك في الحقل أدناه.') })
                            }}
                            className={`min-h-[56px] text-start rounded-xl border-2 px-3 py-2.5 flex items-start gap-2 disabled:opacity-70 ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 grid place-items-center ${on ? 'border-[#0B2438] bg-[#0B2438] text-white' : 'border-gray-300'}`}>{on && <Check className="w-3 h-3" strokeWidth={3} aria-hidden />}</span>
                            <span>
                              <span className="block text-sm font-bold text-[#0B2438]">{label}</span>
                              <span className="block text-[12px] text-gray-600">{sub}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {(btSaving || btMsg) && (
                      <p role="status" className={`mt-2 text-[13px] font-semibold inline-flex items-center gap-1 ${btSaving ? 'text-gray-600' : btMsg?.ok ? 'text-emerald-800' : 'text-red-700'}`}>
                        {!btSaving && btMsg?.ok && <Check className="w-4 h-4" aria-hidden />}{btSaving ? L('Saving…', 'محفوظ ہو رہا ہے…', 'جارٍ الحفظ…') : btMsg?.text}
                      </p>
                    )}
                  </div>
                )}

                <form onSubmit={saveProfile} className="space-y-5">
                  <div className={companyEn ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
                    <div>
                      <label htmlFor="set-name" className="block text-xs font-bold text-gray-600 mb-1.5">{nameLabel} {nameLocked ? <Glyph e="🔒" /> : ''}</label>
                      {nameLocked ? (
                        <div id="set-name" className="input-field bg-gray-50 text-gray-700 flex items-center min-h-[44px]">{companyAr || '—'}</div>
                      ) : (
                        <input id="set-name" value={companyAr} onChange={e => setCompanyAr(e.target.value)} className="input-field" autoComplete={homeBuyer ? 'name' : 'organization'} placeholder={namePlaceholder} />
                      )}
                    </div>
                    {companyEn && (
                      <div>
                        <div className="block text-xs font-bold text-gray-600 mb-1.5">{t.companyEn} <Glyph e="🔒" /></div>
                        <div className="input-field bg-gray-50 text-gray-600 flex items-center min-h-[44px]" dir="ltr">{companyEn}</div>
                      </div>
                    )}
                  </div>
                  {/* the lock note is for sellers only: a buyer's name is never tied to a CR (UX-044) */}
                  {isSupplier && !teamMember && (
                    <div className="-mt-3">
                      {nameLocked ? (
                        pendingFor('name')
                          ? <p className="text-[12px] text-warn-text"><Glyph e="⏳" /> {L('Name change request under review (to', 'نام کی تبدیلی کی درخواست زیرِ جائزہ (نیا نام', 'طلب تغيير الاسم قيد مراجعة الإدارة (إلى')} «{pendingFor('name').new_value}»).</p>
                          : <button type="button" onClick={() => { setCrqModal('name'); setCrqValue(companyAr); setCrqReason(''); setCrqMsg('') }} className="min-h-[44px] text-[12px] font-semibold underline text-start" style={{ color: '#0B2438' }}><Glyph e="🔒" /> {L('The name is tied to your commercial registration. Request a change', 'نام تجارتی رجسٹریشن سے جڑا ہے۔ تبدیلی کی درخواست دیں', 'الاسم مرتبط بالسجل التجاري. اطلب تعديله')}</button>
                      ) : (
                        <p className="text-[12px] text-gray-600"><Glyph e="✏" /> {L('You can edit your name until your account is verified.', 'اکاؤنٹ کی تصدیق تک آپ نام بدل سکتے ہیں، پھر یہ مقفل ہو جائے گا۔', 'يمكنك تعديل الاسم حتى يتم توثيق حسابك، ثم يُقفل.')}</p>
                      )}
                    </div>
                  )}

                  <div id="email" className="scroll-mt-32">
                    <div className="block text-xs font-bold text-gray-600 mb-1.5">{isBuyer ? L('Email (optional)', 'ای میل (اختیاری)', 'البريد الإلكتروني (اختياري)') : L('Email', 'ای میل', 'البريد الإلكتروني')}</div>
                    <EmailVerify currentEmail={user?.email} verified={!!profile?.email_verified_at} locale={locale} optional={isBuyer}
                      onDone={async () => {
                        setProfile({ ...profile, email_verified_at: new Date().toISOString() })
                        try { const { data } = await createClient().auth.refreshSession(); if (data?.user) setUser(data.user) } catch {}
                      }} />
                  </div>
                  {/* the mobile is read-only here: it changes only with an SMS code (UX-046) */}
                  <div id="phone" className="scroll-mt-32">
                    <div className="block text-xs font-bold text-gray-600 mb-1.5">{t.phone}</div>
                    <PhoneVerify initialPhone={profile?.phone || ''} locale={locale}
                      verified={!!profile?.phone_verified_at}
                      waVerified={!!profile?.whatsapp_verified_at}
                      onDone={(ph: string) => { setPhone(ph); setProfile({ ...profile, phone: ph, phone_verified_at: new Date().toISOString() }) }} />
                    <p className="text-[12px] text-gray-600 mt-1">{L('Changing the number needs a new SMS code.', 'نمبر بدلنے کے لیے نیا SMS کوڈ درکار ہے۔', 'تغيير الرقم يتطلّب توثيقه من جديد برمز SMS.')}</p>
                    {isSupplier && (
                      <p className="text-[12px] text-gray-600 mt-1"><Glyph e="🔒" /> {teamMember
                        ? L('This number is for signing in and notifications. Buyers do not see it.', 'یہ نمبر سائن اِن اور اطلاعات کے لیے ہے۔ خریدار اسے نہیں دیکھتا۔', 'يُستخدم هذا الرقم للدخول والإشعارات، ولا يراه المشتري.')
                        : L('This number is for signing in and notifications. Buyers see it only if you choose it as the contact number below, and only after choosing your offer.', 'یہ نمبر سائن اِن اور اطلاعات کے لیے ہے۔ خریدار اسے صرف اسی صورت دیکھتا ہے جب آپ اسے نیچے رابطہ نمبر کے طور پر منتخب کریں، اور وہ بھی آپ کی آفر منتخب کرنے کے بعد۔', 'يُستخدم هذا الرقم للدخول والإشعارات، ولا يراه المشتري إلا إذا اخترته رقماً للتواصل أدناه، وبعد اختيار عرضك فقط.')}</p>
                    )}
                  </div>

                  {/* رقم التواصل الرسمي — يظهر للمشتري بعد الاختيار فقط (المورد فقط) */}
                  {isSupplier && !teamMember && (
                    <fieldset className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                      <legend className="px-1 text-xs font-bold text-gray-700"><Glyph e="📞" /> {L('Official contact number for buyers', 'خریدار کے لیے رابطہ نمبر', 'رقم التواصل الرسمي مع المشتري')}</legend>
                      <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                        <input type="radio" name="contact-mode" checked={!useDiffContact} onChange={() => setUseDiffContact(false)} className="w-5 h-5 accent-[#0B2438]" />
                        <span className="text-[13px] text-gray-800">{L('The same mobile number', 'یہی موبائل نمبر', 'رقم الجوال نفسه')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                        <input type="radio" name="contact-mode" checked={useDiffContact} onChange={() => setUseDiffContact(true)} className="w-5 h-5 accent-[#0B2438]" />
                        <span className="text-[13px] text-gray-800">{L('Another number', 'دوسرا نمبر', 'رقم آخر للتواصل')}</span>
                      </label>
                      {useDiffContact && (
                        <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} aria-label={L('Contact number', 'رابطہ نمبر', 'رقم التواصل')}
                          className="input-field" dir="ltr" inputMode="tel" placeholder="0551234567" />
                      )}
                      <p className="text-[12px] text-gray-600 mt-1.5">{L('Buyers see this number only after choosing your offer; before that, contact is through the in-app chat.', 'خریدار یہ نمبر آپ کی آفر منتخب کرنے کے بعد ہی دیکھتا ہے؛ اس سے پہلے بات چیت ایپ کے اندر ہوتی ہے۔', 'يظهر هذا الرقم للمشتري بعد اختيار العرض فقط، وقبلها يكون التواصل عبر الدردشة الداخلية.')}</p>
                    </fieldset>
                  )}

                  {/* VAT: a seller's invoices need it; a business buyer may add it (shown to the seller for the
                      invoice); a home buyer only sees it when one was saved (UX-043) */}
                  {showVat && <div>
                    <label htmlFor="set-vat" className="block text-xs font-bold text-gray-600 mb-1.5">
                      {isSupplier ? L('VAT number (if your business is VAT-registered)', 'ٹیکس نمبر (اگر آپ کا ادارہ VAT میں رجسٹرڈ ہے)', 'الرقم الضريبي (إن كانت منشأتك مسجّلة في ضريبة القيمة المضافة)') : L('VAT number (optional)', 'ٹیکس نمبر (اختیاری)', 'الرقم الضريبي (اختياري)')}
                    </label>
                    <input id="set-vat" value={vatNumber} onChange={e => { setVatNumber(e.target.value); setVatConfirm(false) }} inputMode="numeric"
                      className="input-field font-mono" dir="ltr" placeholder="3XXXXXXXXXXXXX3" maxLength={15} aria-describedby="set-vat-hint" />
                    {/* checked by the team on ZATCA's site (migration 286); a changed number clears it */}
                    {profile?.vat_verified_at && toLatinDigits(vatNumber).replace(/\s/g, '') === (profile?.vat_number || '') && (
                      <p className="text-[13px] font-semibold text-[#0F6E56] mt-1.5 inline-flex items-center gap-1"><Check className="w-4 h-4" aria-hidden />{L('We checked your VAT number', 'ہم نے آپ کا ٹیکس نمبر چیک کر لیا', 'تحقّقنا من رقمك الضريبي')}</p>
                    )}
                    {!!toLatinDigits(vatNumber).replace(/\s/g, '') && toLatinDigits(vatNumber).replace(/\s/g, '') !== (profile?.vat_number || '') && (
                      <label className="flex items-start gap-2 text-[13px] text-gray-700 mt-2 min-h-[44px] cursor-pointer">
                        <input type="checkbox" checked={vatConfirm} onChange={e => setVatConfirm(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-[#0B2438]" />
                        <span>{L('I confirm that my business is VAT-registered and the number is correct', 'میں تصدیق کرتا ہوں کہ میرا ادارہ VAT میں رجسٹرڈ ہے اور نمبر درست ہے', 'أؤكّد أن منشأتي مسجّلة في ضريبة القيمة المضافة وأن الرقم صحيح')}</span>
                      </label>
                    )}
                    {isSupplier && <p className="text-[12px] font-semibold text-[#0B2438] mt-1">{L('Most company requests require a tax invoice.', 'کمپنیوں کی زیادہ تر درخواستوں میں ٹیکس انوائس شرط ہوتی ہے۔', 'أغلب طلبات الشركات تشترط فاتورة ضريبية.')}</p>}
                    <p id="set-vat-hint" className="text-[12px] text-gray-600 mt-1">
                      {isSupplier
                        ? L('With a VAT number you choose, when pricing, whether your price includes VAT, and the buyer sees the price including 15% VAT. Without it, your price is shown as you type it, as a final price with no VAT.', 'ٹیکس نمبر کے ساتھ آپ قیمت دیتے وقت طے کرتے ہیں کہ آپ کی قیمت میں VAT شامل ہے یا نہیں، اور خریدار قیمت 15% VAT سمیت دیکھتا ہے۔ اس کے بغیر آپ کی قیمت جیسے آپ لکھیں ویسے ہی بغیر VAT کے حتمی قیمت کے طور پر دکھائی جاتی ہے۔', 'مع الرقم الضريبي تحدّد عند التسعير هل سعرك شامل الضريبة، ويرى المشتري السعر شاملاً ضريبة 15%. ومن دونه يُعرض سعرك كما تكتبه سعراً نهائياً بلا ضريبة.')
                        : L('It is shown with your request so the supplier can write it on your invoice.', 'یہ آپ کی درخواست کے ساتھ دکھایا جاتا ہے تاکہ سپلائر اسے آپ کی انوائس پر لکھ سکے۔', 'يظهر مع طلبك ليكتبه المورد في فاتورتك.')}
                    </p>
                  </div>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="set-region" className="block text-xs font-bold text-gray-600 mb-1.5">{t.region}</label>
                      <select id="set-region" value={region} onChange={e => { setRegion(e.target.value); setCity(''); setDistrict('') }} className="input-field">
                        <option value="">{t.selectRegion}</option>
                        {REGIONS.map(r => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="set-city" className="block text-xs font-bold text-gray-600 mb-1.5">{t.city}</label>
                      {/* a list from the region (UX-138), so the city always matches the routing names */}
                      <select id="set-city" value={city} onChange={e => { setCity(e.target.value); setDistrict('') }} className="input-field" disabled={!region}>
                        <option value="">{region ? L('Choose the city', 'شہر منتخب کریں', 'اختر المدينة') : L('Choose the region first', 'پہلے علاقہ منتخب کریں', 'اختر المنطقة أولاً')}</option>
                        {!cityKnown && <option value={city}>{city}</option>}
                        {cityOptions.map(c => <option key={c.ar} value={c.ar}>{locale === 'ar' ? c.ar : c.en}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="block text-xs font-bold text-gray-600 mb-1.5">{L('District', 'محلہ', 'الحي')}</div>
                    <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} />
                    {FEATURES.locationNav && <Link href="/location" className="inline-flex items-center gap-1 min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Set your location on the map (optional)', 'نقشے پر اپنا مقام منتخب کریں (اختیاری)', 'حدّد موقعك على الخريطة (اختياري)')}</Link>}
                  </div>

                  {/* Seller kind + company activity (the buyer-facing tier is derived from it) */}
                  {isSupplier && !teamMember && (
                    <div className="border-t border-gray-100 pt-5">
                      <div className="block text-xs font-bold text-gray-600 mb-2">{L('Supplier type (company or pricing agent)', 'سپلائر کی قسم (کمپنی یا قیمت ایجنٹ)', 'نوع المورد (شركة أو وسيط تسعير)')}</div>
                      <SellerKindPicker providerType={profile?.provider_type} supplierTier={supplierTier} locale={locale}
                        onChange={(pt: string, tr: string | null) => { setProfile({ ...profile, provider_type: pt, supplier_tier: tr }); setSupplierTier(tr || 'shop') }} />
                      {!independent && (
                        <>
                          <label htmlFor="set-minorder" className="block text-xs font-bold text-gray-600 mb-1 mt-4">{L('Minimum order value (SAR)', 'کم از کم آرڈر کی قدر (ریال)', 'الحد الأدنى لقيمة الطلب (ر.س)')}</label>
                          <input id="set-minorder" type="number" inputMode="decimal" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)}
                            className="input-field" placeholder={L('0 = no minimum', '0 = کوئی حد نہیں', '0 = بدون حد أدنى')} min="0" />
                        </>
                      )}
                    </div>
                  )}

                  {/* Contractor Grade — locked (hidden until contractor features return) */}
                  {CONTRACTOR_FEATURES && isBuyer && (
                    <div className="border-t border-gray-100 pt-5">
                      <div className="block text-xs font-bold text-gray-600 mb-2">درجة تصنيف شركتك (للمقاولين) — وزارة الشؤون البلدية <Glyph e="🔒" /></div>
                      <div className="mb-1">
                        <span className="inline-block px-5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-bold text-gray-700">
                          {contractorGrade ? `درجة ${({ A: 'أ', B: 'ب', C: 'ج', D: 'د' })[contractorGrade] || contractorGrade}` : '— غير محدّدة —'}
                        </span>
                      </div>
                      {pendingFor('classification')
                        ? <p className="text-[12px] text-warn-text"><Glyph e="⏳" /> طلب تغيير الدرجة قيد مراجعة الإدارة.</p>
                        : <button type="button" onClick={() => { setCrqModal('classification'); setCrqValue(contractorGrade || 'C'); setCrqReason(''); setCrqMsg('') }} className="min-h-[44px] text-[12px] font-semibold underline" style={{ color: '#0B2438' }}><Glyph e="🔒" /> الدرجة ثابتة، اطلب تعديلها</button>}
                    </div>
                  )}

                  {profileMsg && <Msg m={profileMsg} />}

                  <button type="submit" disabled={profileSaving}
                    className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:shadow-lg"
                    style={{ background: '#D4A543', color: '#071827' }}>
                    {profileSaving ? t.saving : t.saveProfile}
                  </button>
                </form>

              </div>
            )}

            {/* Notifications tab: instant switches, kept out of the profile form so «Save» is not
                mistaken for what saves them (UX-138, UX-099) */}
            {tab === 'notifications' && (
              <div className="bg-white rounded-2xl p-4 sm:p-7 border border-gray-100 shadow-sm animate-fade-in">
                <section className="space-y-5" aria-labelledby="set-notif-title">
                  <div>
                    <h3 id="set-notif-title" className="text-base font-bold text-[#0B2438]">{L('Notifications', 'اطلاعات', 'الإشعارات')}</h3>
                    <p className="text-[13px] text-gray-600 mt-0.5">{L('These options are saved at once.', 'یہ اختیارات فوراً محفوظ ہوتے ہیں۔', 'تُحفظ هذه الخيارات فوراً.')}</p>
                  </div>
                  <EnablePush variant="card" />

                  {/* Email notifications: only for a verified, real email (a phone account has none) */}
                  {!!profile?.email_verified_at && !placeholderEmail && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" className="mt-0.5 w-5 h-5 accent-[#0B2438]" checked={emailOn} disabled={emailBusy}
                        onChange={async e => {
                          const on = e.target.checked
                          setEmailBusy(true); setEmailOn(on)
                          const { error } = await createClient().rpc('set_email_notifications', { p_on: on })
                          if (error) setEmailOn(!on)
                          setEmailBusy(false); flashNotif(!error)
                        }} />
                      <span>
                        <span className="block text-sm font-bold text-gray-800">{L('Email notifications', 'ای میل اطلاعات', 'إشعارات البريد الإلكتروني')}</span>
                        <span className="block text-[13px] text-gray-600 mt-0.5">{L('Important updates only: new offers and requests, deal steps and reminders. Messages arrive as one short notice at most every 3 hours.', 'صرف اہم اپ ڈیٹس: نئی پیشکشیں اور درخواستیں، سودے کے مراحل اور یاد دہانیاں۔ پیغامات کی اطلاع زیادہ سے زیادہ ہر 3 گھنٹے میں ایک بار۔', 'التحديثات المهمة فقط: العروض والطلبات الجديدة، ومراحل الصفقة، والتذكيرات. وتصل الرسائل في تنبيه واحد مختصر كل 3 ساعات على الأكثر.')}</span>
                      </span>
                    </label>
                  )}

                  {/* an unverified email: say why the email switch is missing (round-5 UX-192) */}
                  {!(profile?.email_verified_at && !placeholderEmail) && (
                    <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-700" role="note">
                      {L('To receive notifications by email, verify your email first.', 'ای میل پر اطلاعات کے لیے پہلے اپنی ای میل کی تصدیق کریں۔', 'لتصلك الإشعارات على البريد الإلكتروني، وثّق بريدك أولاً.')}{' '}
                      <button type="button" onClick={() => { setTab('profile'); setTimeout(() => document.getElementById('email')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60) }} className="inline-flex items-center min-h-[44px] font-bold underline text-[#0B2438]">{L('Verify your email', 'اپنی ای میل کی تصدیق کریں', 'وثّق بريدك')}</button>
                    </p>
                  )}
                  {/* nothing reaches WhatsApp before the mobile is verified and WhatsApp confirmed on it (UX-106) */}
                  {waOn && !(profile?.phone_verified_at && profile?.whatsapp_verified_at) && (
                    <p className="rounded-xl border p-3 text-[13px] leading-relaxed" style={{ background: '#FBF3E1', borderColor: '#EBD7A6', color: '#6C531F' }} role="note">
                      {L('You will not receive WhatsApp messages until your mobile is verified and WhatsApp is confirmed on it.', 'جب تک آپ کا موبائل تصدیق اور اس پر واٹس ایپ کی تصدیق نہ ہو، واٹس ایپ پیغامات نہیں آئیں گے۔', 'لن تصلك رسائل واتساب قبل توثيق رقم جوالك وتأكيد الواتساب عليه.')}{' '}
                      <button type="button" onClick={() => { setTab('profile'); setTimeout(() => document.getElementById('phone')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60) }} className="inline-flex items-center min-h-[44px] font-bold underline">{L('Verify your number', 'اپنا نمبر تصدیق کریں', 'وثّق رقمك')}</button>
                    </p>
                  )}
                  {/* WhatsApp notifications (owner 2026-11-14): approved templates from the Taseerak number to the saved mobile */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-5 h-5 accent-[#0B2438]" checked={waOn} disabled={waBusy}
                      onChange={async e => {
                        const on = e.target.checked
                        setWaBusy(true); setWaOn(on)
                        const { error } = await createClient().rpc('set_whatsapp_notifications', { p_on: on })
                        if (error) setWaOn(!on)
                        setWaBusy(false); flashNotif(!error)
                      }} />
                    <span>
                      <span className="block text-sm font-bold text-gray-800">{L('WhatsApp notifications', 'واٹس ایپ اطلاعات', 'إشعارات واتساب')}</span>
                      <span className="block text-[13px] text-gray-600 mt-0.5">{isSupplier
                        ? L('From the Taseerak number to your saved mobile: new matching requests, offer results and new messages (at most one notice per conversation every 2 hours).', 'تسعیرک کے نمبر سے آپ کے محفوظ موبائل پر: نئی درخواستیں، آفرز کے نتائج اور نئے پیغامات (ہر گفتگو پر زیادہ سے زیادہ ہر 2 گھنٹے میں ایک اطلاع)۔', 'من رقم تسعيرك إلى جوالك المسجّل: الطلبات المطابقة الجديدة، ونتائج عروضك، والرسائل الجديدة (تنبيه واحد لكل محادثة كل ساعتين على الأكثر).')
                        : L('From the Taseerak number to your saved mobile: offers on your requests, deal steps and new messages (at most one notice per conversation every 2 hours).', 'تسعیرک کے نمبر سے آپ کے محفوظ موبائل پر: آپ کی درخواستوں پر آفرز، سودے کے مراحل اور نئے پیغامات (ہر گفتگو پر زیادہ سے زیادہ ہر 2 گھنٹے میں ایک اطلاع)۔', 'من رقم تسعيرك إلى جوالك المسجّل: العروض على طلباتك، ومراحل الصفقة، والرسائل الجديدة (تنبيه واحد لكل محادثة كل ساعتين على الأكثر).')}</span>
                    </span>
                  </label>
                  {notifMsg && (
                    <p role="status" className={`text-[13px] font-semibold inline-flex items-center gap-1 ${notifMsg.ok ? 'text-emerald-800' : 'text-red-700'}`}>
                      {notifMsg.ok && <Check className="w-4 h-4" aria-hidden />}{notifMsg.text}
                    </p>
                  )}
                </section>
              </div>
            )}

            {tab === 'profile' && (
              <div>
                {/* Locked-field change request modal */}
                {crqModal && (
                  <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !crqSaving && setCrqModal(null)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="crq-title" className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-xl" dir={dir} onClick={e => e.stopPropagation()}
                      onKeyDown={e => { if (e.key === 'Escape' && !crqSaving) setCrqModal(null) }}>
                      <h3 id="crq-title" className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}>
                        {crqModal === 'name' ? L('Request a name change', 'نام بدلنے کی درخواست', 'طلب تعديل الاسم') : L('Request a classification change', 'درجہ بندی بدلنے کی درخواست', 'طلب تعديل التصنيف')}
                      </h3>
                      <p className="text-[13px] text-gray-600 mb-4">{L('The request goes to the admin team for review. Nothing changes before approval.', 'درخواست انتظامیہ کو جائزے کے لیے جاتی ہے۔ منظوری سے پہلے کچھ نہیں بدلتا۔', 'يُرسل الطلب إلى الإدارة للمراجعة، ولا يتغيّر شيء قبل الموافقة.')}</p>

                      {crqModal === 'name' ? (
                        <>
                          <label htmlFor="crq-value" className="block text-xs font-bold text-gray-600 mb-1">{L('New name', 'نیا نام', 'الاسم الجديد')}</label>
                          <input id="crq-value" autoFocus value={crqValue} onChange={e => setCrqValue(e.target.value)} className="input-field mb-3" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="crq-value" className="block text-xs font-bold text-gray-600 mb-1">{L('New grade', 'نیا درجہ', 'الدرجة الجديدة')}</label>
                          <select id="crq-value" value={crqValue} onChange={e => setCrqValue(e.target.value)} className="input-field mb-3">
                            <option value="A">درجة أ</option>
                            <option value="B">درجة ب</option>
                            <option value="C">درجة ج</option>
                            <option value="D">درجة د</option>
                          </select>
                        </>
                      )}

                      <label htmlFor="crq-reason" className="block text-xs font-bold text-gray-600 mb-1">{L('Reason', 'وجہ', 'سبب التغيير')}{crqModal === 'name' ? L(' (the admin may ask for an updated commercial registration)', ' (انتظامیہ تازہ تجارتی رجسٹریشن مانگ سکتی ہے)', ' (قد تطلب الإدارة سجلاً تجارياً محدّثاً)') : ''}</label>
                      <textarea id="crq-reason" value={crqReason} onChange={e => setCrqReason(e.target.value)} rows={3} className="input-field mb-3" placeholder={L('Explain the reason…', 'وجہ بتائیں…', 'وضّح سبب التعديل...')} />

                      {crqMsg && <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mb-3" role="alert">{crqMsg}</div>}

                      <div className="flex gap-2">
                        <button type="button" disabled={crqSaving} onClick={submitChangeRequest} className="flex-1 min-h-[48px] rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>
                          {crqSaving ? L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال...') : L('Send to admin', 'انتظامیہ کو بھیجیں', 'إرسال الطلب إلى الإدارة')}
                        </button>
                        <button type="button" onClick={() => setCrqModal(null)} className="min-h-[48px] px-5 rounded-xl text-sm font-bold border border-gray-200 text-[#0B2438]">{L('Cancel', 'منسوخ', 'إلغاء')}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password Tab */}
            {tab === 'password' && (
              <div className="bg-white rounded-2xl p-4 sm:p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-6" style={{ color: '#0B2438' }}>{phoneAccount ? L('Sign-in method', 'سائن اِن کا طریقہ', 'طريقة الدخول') : t.passwordTab}</h2>

                {phoneAccount ? (
                  // a phone sign-up has no password to change (UX-040)
                  <div className="max-w-md rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 leading-relaxed">
                    <Glyph e="🔑" /> {L('You sign in with a code sent to your mobile, so you do not need a password.', 'آپ اپنے موبائل پر آنے والے کوڈ سے سائن اِن کرتے ہیں، اس لیے پاسورڈ کی ضرورت نہیں۔', 'تدخل إلى حسابك برمز يصلك على جوالك، فلا تحتاج إلى كلمة مرور.')}
                    {/* the way in when the SMS does not arrive (round-4 UX-054) */}
                    {!placeholderEmail && profile?.email_verified_at ? (
                      <p className="mt-2">{L('If the text message does not arrive, you can sign in with a code sent to your email.', 'اگر ٹیکسٹ میسج نہ پہنچے تو آپ اپنی ای میل پر آنے والے کوڈ سے سائن اِن کر سکتے ہیں۔', 'إذا لم تصلك الرسالة النصية يمكنك الدخول برمز يصل إلى بريدك الإلكتروني.')}</p>
                    ) : (<>
                      <p className="mt-2">{L('If the text message does not arrive, you can sign in with a code sent to your email once you add it.', 'اگر ٹیکسٹ میسج نہ پہنچے تو ای میل شامل کرنے کے بعد آپ اس پر آنے والے کوڈ سے سائن اِن کر سکتے ہیں۔', 'إذا لم تصلك الرسالة النصية يمكنك الدخول برمز يصل إلى بريدك الإلكتروني بعد إضافته.')}</p>
                      <button type="button" onClick={() => { setTab('profile'); setTimeout(() => document.getElementById('email')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
                        className="mt-3 inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>
                        {L('Add your email', 'اپنی ای میل شامل کریں', 'أضف بريدك الإلكتروني')}
                      </button>
                    </>)}
                  </div>
                ) : (
                  <form onSubmit={changePassword} className="space-y-5 max-w-md">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800">
                      <Glyph e="💡" /> {L('Enter your current password, then the new one twice.', 'موجودہ پاسورڈ درج کریں، پھر نیا پاسورڈ دو بار۔', 'أدخل كلمة المرور الحالية، ثم الجديدة مرتين.')}
                    </div>

                    <div>
                      <label htmlFor="set-curpass" className="block text-xs font-bold text-gray-600 mb-1.5">{t.currentPass}</label>
                      <div className="relative">
                        <input id="set-curpass" type={showPw ? 'text' : 'password'} value={curPass} onChange={e => setCurPass(e.target.value)} autoComplete="current-password"
                          className="input-field pe-12" placeholder="••••••••" required />
                        <PwEye />
                        </div>
                      <Link href="/forgot-password?from=settings" className="inline-flex items-center min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">
                        {L('Forgot your current password? Get a reset link by email', 'موجودہ پاسورڈ بھول گئے؟ ای میل پر ری سیٹ لنک حاصل کریں', 'نسيت كلمة المرور الحالية؟ أرسل رابطاً إلى بريدك')}
                      </Link>
                    </div>

                    <div>
                      <label htmlFor="set-newpass" className="block text-xs font-bold text-gray-600 mb-1.5">{t.newPass}</label>
                      <div className="relative">
                        <input id="set-newpass" type={showPw ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} autoComplete="new-password"
                          className="input-field pe-12" placeholder="••••••••" required minLength={8} aria-describedby="set-passrules" />
                        <PwEye />
                        </div>
                      <ul id="set-passrules" className="mt-2 space-y-1 text-[13px]">
                        {passRuleList(newPass, locale).map(r => (
                          <li key={r.rule} className={`flex items-center gap-1.5 ${r.ok ? 'text-emerald-700' : 'text-gray-600'}`}>
                            {r.ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Circle className="w-3 h-3" aria-hidden />} {r.text}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <label htmlFor="set-confpass" className="block text-xs font-bold text-gray-600 mb-1.5">{t.confirmPass}</label>
                      <div className="relative">
                        <input id="set-confpass" type={showPw ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} autoComplete="new-password"
                          className="input-field pe-12" placeholder="••••••••" required />
                        <PwEye />
                        </div>
                    </div>

                    {passMsg && <Msg m={passMsg} />}

                    <button type="submit" disabled={passSaving}
                      className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:shadow-lg"
                      style={{ background: '#0B2438' }}>
                      {passSaving ? t.saving : t.changePass}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Docs Tab (selling businesses only) */}
            {tab === 'docs' && showDocs && (
              <div className="bg-white rounded-2xl p-4 sm:p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}>{t.docsTitle}</h2>
                <p className="text-sm text-gray-600 mb-4">{t.docsSub}</p>
                {/* The CR NUMBER is required to price (companies and shops); only the certificate upload,
                    for the «Verified» badge, is optional (round-5 UX-006). «Later» only once the number is saved. */}
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl p-4 mb-6 bg-[#F5F7FA] border border-gray-200">
                  <p className="text-sm text-gray-800 leading-relaxed flex-1 min-w-[220px]"><Glyph e="🛡" /> {!profile?.commercial_registration
                    ? L('The commercial registration number (unified national number) is required to price requests. Uploading the certificate to get the «Verified» badge is optional.', 'درخواستوں کی قیمت دینے کے لیے تجارتی رجسٹریشن نمبر (متحدہ قومی نمبر) ضروری ہے۔ «تصدیق شدہ» بیج کے لیے سرٹیفکیٹ اپلوڈ کرنا اختیاری ہے۔', 'رقم السجل التجاري (الرقم الوطني الموحد) مطلوب لتسعير الطلبات. أما رفع الشهادة للحصول على شارة «موثّق» فاختياري.')
                    : L('Uploading the certificate is optional. Once verified, buyers see a «Verified» badge next to your offers, which raises their trust and your chances of winning requests.', 'سرٹیفکیٹ اپلوڈ کرنا اختیاری ہے۔ تصدیق کے بعد خریدار آپ کی آفرز کے ساتھ «تصدیق شدہ» بیج دیکھتے ہیں، جس سے ان کا اعتماد اور آپ کے درخواستیں جیتنے کے امکانات بڑھتے ہیں۔', 'رفع الشهادة اختياري. بعد التوثيق تظهر شارة «موثّق» بجانب عروضك لدى المشترين، مما يرفع موثوقيتك وفرصك في الفوز بالطلبات.')}{supplierTier !== 'shop' && ' ' + L('Verified companies also appear under «Verified companies and factories».', 'تصدیق شدہ کمپنیاں «تصدیق شدہ کمپنیاں اور فیکٹریاں» کے حصے میں بھی دکھائی دیتی ہیں۔', 'وتظهر الشركات الموثّقة كذلك ضمن «شركات ومصانع موثّقة».')}</p>
                  {/* «لاحقاً» stays on this page: it goes back to the profile tab instead of leaving (UX-160) */}
                  {!!profile?.commercial_registration && (
                    <button type="button" onClick={() => setTab('profile')} className="min-h-[44px] inline-flex items-center text-sm font-bold px-4 rounded-xl border bg-white hover:bg-gray-50 shrink-0" style={{ borderColor: '#e5e7eb', color: '#0B2438' }}>{L('Later', 'بعد میں', 'لاحقاً')}</button>
                  )}
                </div>

                {profile?.verification_status === 'rejected' && (
                  <div className="bg-warn-bg border border-warn-border rounded-xl p-4 mb-5 flex items-start gap-2" role="status">
                    <span><Glyph e="ℹ" /></span>
                    <div className="text-sm text-warn-text font-medium">{t.rejectedBanner}{profile?.rejection_reason && <span className="block mt-1 font-normal">{L('Reason:', 'وجہ:', 'السبب:')} {profile.rejection_reason}</span>}</div>
                  </div>
                )}

                <form onSubmit={uploadDocs} className="space-y-6">
                  {/* 1) CR number + the Wathq check of THAT number (UX-131) */}
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-bold flex items-center gap-1.5 text-[#0B2438]">
                      <Glyph e="🛡" /> {cv.card}
                    </div>
                    <div className="text-[13px] text-gray-600 mt-0.5 mb-3">{cv.sub}</div>
                    <label htmlFor="set-cr" className="block text-xs font-bold text-gray-600 mb-1.5">
                      {L('Unified national number (10 digits, starts with 7) (required)', 'متحدہ قومی نمبر (7 سے شروع، 10 ہندسے) (ضروری)', 'الرقم الوطني الموحد للمنشأة (10 أرقام يبدأ بـ7) (مطلوب)')}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input id="set-cr" value={crNumber} inputMode="numeric" dir="ltr" maxLength={14}
                        onChange={(e: any) => { setCrNumber(e.target.value); setCrTaken(''); setCrCheck(null) }}
                        disabled={profile?.verification_status === 'verified'}
                        className="input-field font-mono disabled:opacity-60 flex-1 min-w-0" placeholder="7001234567" />
                      {profile?.verification_status === 'verified' && profile?.cr_verification_source === 'wathq' ? (
                        <span className="min-h-[48px] inline-flex items-center justify-center gap-1 text-sm px-4 rounded-xl font-bold text-white" style={{ background: '#0F6E56' }}><Glyph e="🛡" /> {t.verified}</span>
                      ) : (
                        <button type="button" onClick={verifyCRSettings} disabled={crChecking || !crValid}
                          className="min-h-[48px] text-sm px-5 rounded-xl font-bold text-white whitespace-nowrap disabled:opacity-50 transition-all hover:shadow"
                          style={{ background: '#0B2438' }}>
                          {crChecking ? cv.checking : cv.btn}
                        </button>
                      )}
                    </div>
                    {profile?.verification_status === 'verified' && profile?.commercial_registration && (
                      <div className="text-[12px] text-gray-600 mt-1">{L('Locked after verification.', 'تصدیق کے بعد مقفل ہے۔', 'يُقفل بعد التوثيق.')}</div>
                    )}
                    {crCheck && (
                      <div className={`text-[13px] rounded-lg p-2.5 mt-3 flex items-start gap-2 ${
                        crCheck.verified && profile?.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : crCheck.verified || crCheck.mode === 'manual' ? 'bg-[#D4A543]/10 text-[#6C531F] border border-[#D4A543]/40'
                        : 'bg-warn-bg text-warn-text border border-warn-border'
                      }`} role="status">
                        <span>{crCheck.verified && profile?.verification_status === 'verified' ? <Glyph e="🛡" /> : crCheck.verified || crCheck.mode === 'manual' ? <Glyph e="ℹ" /> : <Glyph e="⚠" />}</span>
                        <div>
                          {crCheck.name && <div className="font-bold">{crCheck.name}</div>}
                          {crCheck.activity && <div className="opacity-80">{crCheck.activity}</div>}
                          <div>{crCheckText(crCheck, locale, profile?.verification_status === 'verified')}</div>
                        </div>
                      </div>
                    )}
                    {crRead?.extracted && (
                      <div className={`mt-2 text-[13px] rounded-xl p-3 border ${crRead.flags?.not_cr_document || crRead.flags?.cr_mismatch || crRead.flags?.expired ? 'bg-warn-bg text-warn-text border-warn-border' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                        <div className="font-bold mb-0.5">{L('Read from your certificate', 'آپ کے سرٹیفکیٹ سے پڑھا گیا', 'قُرئ من شهادتك')}:</div>
                        {crRead.extracted.entity_name && <div>{crRead.extracted.entity_name}</div>}
                        {crRead.extracted.cr_number && <div dir="ltr" className="font-mono">CR: {crRead.extracted.cr_number}</div>}
                        {crRead.flags?.not_cr_document && <div>{L('This file does not look like a commercial registration certificate.', 'یہ فائل تجارتی رجسٹریشن سرٹیفکیٹ نہیں لگتی۔', 'لا يبدو هذا الملف شهادة سجل تجاري.')}</div>}
                        {crRead.flags?.cr_mismatch && <div>{L('The number on the certificate differs from the number above.', 'سرٹیفکیٹ کا نمبر اوپر والے نمبر سے مختلف ہے۔', 'الرقم في الشهادة يختلف عن الرقم المكتوب أعلاه.')}</div>}
                        {crRead.flags?.expired && <div>{L('The registration looks expired.', 'رجسٹریشن کی مدت ختم لگتی ہے۔', 'يبدو أن السجل منتهي.')}</div>}
                        {crDigits !== (profile?.commercial_registration || '') && (
                          <div className="mt-1">{L('Check the number and press the button below to confirm it.', 'نمبر چیک کریں اور تصدیق کے لیے نیچے والا بٹن دبائیں۔', 'تحقّق من الرقم واضغط الزر أدناه لتأكيده.')}</div>
                        )}
                        <div className="mt-1 opacity-80">{L('An automatic read to help; the admin still reviews the document.', 'مدد کے لیے خودکار مطالعہ؛ انتظامیہ پھر بھی دستاویز دیکھتی ہے۔', 'قراءة آلية للمساعدة، والإدارة تراجع المستند بنفسها.')}</div>
                      </div>
                    )}
                    {crTaken && (
                      <div className="mt-2 text-sm rounded-xl p-3 bg-warn-bg text-warn-text border border-warn-border" role="alert">
                        {crTakenText(locale).msg}{' '}
                        <a href={crClaimHref(crTaken)} className="font-bold underline">{crTakenText(locale).cta}</a>
                      </div>
                    )}
                  </div>

                  {/* 2) CR certificate */}
                  <div>
                    <div className="block text-xs font-bold text-gray-600 mb-2">{t.crLabel}</div>
                    {profile?.cr_url && !crFile && (
                      <div className="flex items-center gap-3 mb-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-800 text-sm inline-flex items-center gap-1"><Check className="w-4 h-4" aria-hidden />{t.currentDoc}</span>
                        <button type="button" onClick={() => openDoc(profile.cr_url)}
                          className="min-h-[44px] text-[13px] text-[#8F6820] hover:underline font-semibold">{t.viewDoc}</button>
                      </div>
                    )}
                    <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                      crFile ? 'border-[#0B2438] bg-[#0B2438]/5' : 'border-gray-200 hover:border-[#D4A543]/50'
                    }`}>
                      <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setCrFile(e.target.files?.[0] ?? null)} />
                      <span className="text-2xl">{crFile ? <Glyph e="📎" /> : <Glyph e="📋" />}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 break-all">
                          {crFile ? crFile.name : t.uploadDoc}
                        </div>
                        <div className="text-[12px] text-gray-600 mt-0.5">{t.docHint}</div>
                      </div>
                    </label>
                  </div>

                  {/* 3) Licence (optional) */}
                  <div>
                    <div className="block text-xs font-bold text-gray-600 mb-2">{t.licenseLabel}</div>
                    {profile?.license_url && !licenseFile && (
                      <div className="flex items-center gap-3 mb-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-800 text-sm inline-flex items-center gap-1"><Check className="w-4 h-4" aria-hidden />{t.currentDoc}</span>
                        <button type="button" onClick={() => openDoc(profile.license_url)}
                          className="min-h-[44px] text-[13px] text-[#8F6820] hover:underline font-semibold">{t.viewDoc}</button>
                      </div>
                    )}
                    <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                      licenseFile ? 'border-[#0B2438] bg-[#0B2438]/5' : 'border-gray-200 hover:border-[#D4A543]/50'
                    }`}>
                      <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setLicenseFile(e.target.files?.[0] ?? null)} />
                      <span className="text-2xl">{licenseFile ? <Glyph e="📎" /> : <Glyph e="📄" />}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 break-all">
                          {licenseFile ? licenseFile.name : t.uploadDoc}
                        </div>
                        <div className="text-[12px] text-gray-600 mt-0.5">{t.docHint}</div>
                      </div>
                    </label>
                  </div>

                  {docsMsg && <Msg m={docsMsg} />}

                  <button type="submit" disabled={docsSaving || (!licenseFile && !crFile && crDigits === (profile?.commercial_registration || ''))}
                    className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:shadow-lg"
                    style={{ background: '#D4A543', color: '#071827' }}>
                    {docsSaving ? t.saving : (licenseFile || crFile) ? t.uploadAndSave : t.saveCr}
                  </button>
                </form>
              </div>
            )}

            {/* Language Tab: the display language is also the notifications language */}
            {tab === 'language' && (
              <div className="bg-white rounded-2xl p-4 sm:p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>{t.langTab}</h2>
                <p className="text-sm text-gray-600 mb-6">{t.langTitle}. {L('Notifications reach you in this language too.', 'اطلاعات بھی اسی زبان میں آئیں گی۔', 'تصلك الإشعارات بهذه اللغة أيضاً.')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4" role="radiogroup" aria-label={t.langTab}>
                  {langOptions.map(lang => {
                    const on = prefLang === lang.key
                    return (
                      <button key={lang.key} type="button" role="radio" aria-checked={on} lang={lang.key} onClick={() => pickLanguage(lang.key)}
                        className={`min-h-[56px] p-4 sm:p-6 rounded-2xl border-2 text-start sm:text-center transition-all flex sm:block items-center justify-between gap-3 ${
                          on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <span>
                          <span className="block font-bold text-base text-[#0B2438]">{lang.name}</span>
                          {/* the second line names the language in the interface language, in one script (UX-142) */}
                          <span className="block text-[13px] text-gray-600 mt-0.5">{lang.key === 'ar' ? L('Arabic', 'عربی', 'العربية') : lang.key === 'en' ? L('English', 'انگریزی', 'الإنجليزية') : L('Urdu', 'اردو', 'الأردية')}</span>
                        </span>
                        {on && (
                          <span className="sm:mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-[#0B2438]"><Check className="w-4 h-4" aria-hidden />{t.langSaved}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {notifMsg && (
                  <p role="status" className={`mt-3 text-[13px] font-semibold inline-flex items-center gap-1 ${notifMsg.ok ? 'text-emerald-800' : 'text-red-700'}`}>
                    {notifMsg.ok && <Check className="w-4 h-4" aria-hidden />}{notifMsg.text}
                  </p>
                )}
              </div>
            )}

            {/* Phones: support, sign-out and account deletion at the bottom of the page (UX-138/036) */}
            <div className="lg:hidden mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
              <Link href="/support" className="w-full min-h-[48px] flex items-center gap-3 px-4 rounded-xl text-sm font-semibold text-[#0B2438] hover:bg-gray-50">
                <LifeBuoy className="w-4 h-4" aria-hidden />{supportLabel}
              </Link>
              {legalLinks('w-full min-h-[48px] flex items-center gap-3 px-4 rounded-xl text-sm font-semibold text-[#0B2438] hover:bg-gray-50')}
              <button type="button" onClick={handleSignOut} className="w-full min-h-[48px] flex items-center gap-3 px-4 rounded-xl text-sm font-semibold text-[#0B2438] hover:bg-gray-50">
                <LogOut className="w-4 h-4" aria-hidden />{signOutLabel}
              </button>
              <a href="/account/delete" className="w-full min-h-[48px] flex items-center gap-3 px-4 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50">
                <Glyph e="🗑" />{deleteLabel}
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
