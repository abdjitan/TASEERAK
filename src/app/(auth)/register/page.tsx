'use client'

import Link from 'next/link'
import { rememberPostSignupNext } from '@/lib/postSignupNext'
import { useState, useRef, useEffect } from 'react'
import { TERMS_VERSION } from '@/lib/legal'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import FixSignupEmail from '@/components/auth/FixSignupEmail'
import { emailTypoSuggestion } from '@/lib/emailTypo'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'
import { PHONE_OTP_ENABLED, BUYER_PHONE_LOGIN } from '@/lib/features'
import { SELLER_KINDS, TEAM_INVITE_KEY } from '@/lib/sellers'
import { OPERATOR } from '@/lib/legal'
import { Check, Eye, EyeOff } from 'lucide-react'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { captureRef } from '@/lib/referral'
import { friendlyError } from '@/lib/friendlyError'
import { passwordProblems, PASS_RULES_SUMMARY, passRuleList } from '@/lib/passwordPolicy'
import { toLatinDigits } from '@/lib/phone'
import { toE164 } from '@/lib/firebaseConfig'
import { normalizeCrInput, crTakenText, isUnifiedCr, crFormatText, crSupportHref, teamInviteHintText } from '@/lib/cr'
import PublicFooter from '@/components/public/PublicFooter'

// ── تسجيل مبسّط (خطوة واحدة) ──────────────────────────────────────────────
// نجمع الحد الأدنى فقط: الدور + الاسم + اسم الشركة + الجوال + البريد + كلمة المرور.
// بقية البيانات (الموقع، القطاعات، التخصصات، التصنيف، السجل التجاري، المستندات)
// تُعبّأ لاحقاً داخل التطبيق عبر «أكمل ملفك» (/onboarding). كل تلك الأعمدة nullable،
// و handle_new_user يبني الملف من الميتاداتا الجزئية ويتجاهل الناقص.
// validation messages in the reader's language (review 2026-10-28: they showed in Arabic only)
const VMSG: Record<string, { ar: string; en: string; ur: string }> = {
  'اختر نوع الحساب': { ar: 'اختر نوع الحساب', en: 'Choose an account type', ur: 'اکاؤنٹ کی قسم منتخب کریں' },
  'الاسم مطلوب': { ar: 'الاسم مطلوب', en: 'Name is required', ur: 'نام ضروری ہے' },
  'رقم الجوال مطلوب — 10 أرقام ويبدأ بـ 05': { ar: 'رقم الجوال مطلوب — 10 أرقام ويبدأ بـ 05', en: 'Mobile number: 10 digits starting with 05', ur: 'موبائل نمبر: 05 سے شروع، 10 ہندسے' },
  'رقم الجوال مطلوب: رقم سعودي يبدأ بـ05، أو رقم إماراتي أو أردني': { ar: 'رقم الجوال مطلوب: رقم سعودي يبدأ بـ05، أو رقم إماراتي أو أردني', en: 'Mobile number: a Saudi number starting with 05, or a UAE or Jordanian mobile', ur: 'موبائل نمبر: 05 سے شروع ہونے والا سعودی نمبر، یا اماراتی یا اردنی نمبر' },
  'البريد الإلكتروني غير صحيح': { ar: 'البريد الإلكتروني غير صحيح', en: 'Email address is not valid', ur: 'ای میل درست نہیں' },
  'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، وحرف إنجليزي كبير، وحرف صغير، ورقم': { ar: PASS_RULES_SUMMARY.ar, en: PASS_RULES_SUMMARY.en, ur: PASS_RULES_SUMMARY.ur },
  'كلمة المرور يجب أن تكون 8 أحرف على الأقل': { ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', en: 'Password must be at least 8 characters', ur: 'پاس ورڈ کم از کم 8 حروف' },
}
const vmsg = (m: string | undefined, locale: string) => (m && VMSG[m] ? (VMSG[m] as any)[locale] || m : m)

const schema = z.object({
  role: z.enum(['contractor', 'supplier'] as const, { required_error: 'اختر نوع الحساب' }),
  full_name: z.string().min(3, 'الاسم مطلوب'),
  // required for buyers and companies; an independent seller trades under their own name (checked in onSubmit)
  company_name_ar: z.string().optional(),
  // Saudi 05XXXXXXXX (kept as typed), or a UAE/Jordan mobile (owner 2026-11-18)
  phone: z.string().refine((v) => /^05[0-9]{8}$/.test(v) || !!toE164(v), 'رقم الجوال مطلوب: رقم سعودي يبدأ بـ05، أو رقم إماراتي أو أردني'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().refine(v => passwordProblems(v).length === 0, 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، وحرف إنجليزي كبير، وحرف صغير، ورقم'),
})
type FormData = z.infer<typeof schema>

const TR = {
  ar: {
    title: 'أنشئ حسابك', sub: 'دقيقة واحدة وتبدأ',
    supTitle: 'سجّل كمورد', supSub: 'أدخل بيانات نشاطك الأساسية الآن، وأكمل الموقع والأقسام والتوثيق بعد الدخول.',
    toSupplier: 'صاحب محل أو مورد مواد؟', toSupplierCta: 'سجّل كمورد',
    toBuyer: 'تحتاج أسعار مواد البناء؟', toBuyerCta: 'سجّل لطلب الأسعار',
    supplier: 'أقدّم أسعار المواد', supplierDesc: 'شركة أو محل أو مصنع أو وسيط تسعير',
    contractor: 'أبحث عن أسعار', contractorDesc: 'اطلب أسعار المواد من الموردين وقارن العروض',
    accountType: 'نوع الحساب', fullName: 'الاسم الكامل', pickTitle: 'كيف ستستخدم تسعيرك؟', pickSub: 'اختر نوع حسابك للمتابعة', change: 'تغيير',
    company: 'اسم المحل أو النشاط التجاري', companyHint: 'يظهر للمشترين على عروضك',
    brandH: 'ابدأ مجاناً خلال دقيقة.', brandP: 'حساب واحد تطلب به الأسعار أو تقدّمها، وتتابع طلبك حتى التسليم.',
    l1: 'أرسل قائمة موادك مرة واحدة، وتصلك عروض عدة موردين', l2: 'قارن واختر الأرخص لكل مادة', l3: 'مجاني خلال الإطلاق، بلا عمولة',
    corpQ: 'شركة لديها فريق مشتريات؟', corpA: 'نجهّز لك حساباً للشركة يضم موظفيك — تواصل معنا',
    copyright: '© 2026 تسعيرك · منصة التسعير والتوريد لمواد البناء',
    phone: 'رقم الجوال (واتساب)', email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordPh: 'كلمة مرور قوية',
    create: 'إنشاء الحساب ←', creating: 'جارٍ الإنشاء...', haveAccount: 'لديك حساب؟', login: 'تسجيل الدخول',
    chooseType: 'اختر نوع الحساب أولاً', phoneTaken: 'رقم الجوال هذا مسجّل لدينا. إن كان رقمك، فسجّل الدخول.',
    emailTaken: 'هذا البريد الإلكتروني مسجّل مسبقاً — ', signInInstead: 'سجّل الدخول.',
    agreePre: 'أوافق على ', terms: 'الشروط والأحكام', and: ' و', privacy: 'سياسة الخصوصية',
    agreeErr: 'يجب الموافقة على الشروط وسياسة الخصوصية',
    captchaErr: 'يرجى إكمال خطوة التحقق (لستُ روبوتاً) ثم إعادة المحاولة.',
    verifyTitle: 'فعّل بريدك الإلكتروني', verifyBody: 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني. افتحه لتفعيل حسابك، ثم سجّل الدخول.',
    verifyNext: 'بعد الدخول ستكمل بياناتك (الموقع، وما تبيعه، والتوثيق) بخطوات سهلة.', verifyNextBuyer: 'بعد الدخول نسألك عن عنوان التوصيل فقط.',
    junk: 'لم تجد الرسالة؟ افحص مجلد البريد غير الهام (Junk أو Spam).',
    supBrandH: 'تصلك طلبات المواد التي تبيعها.', supBrandP: 'سعّر طلبات المشترين في منطقتك من جوالك، وتابع صفقاتك من العرض إلى التسليم.',
    sl1: 'طلبات مطابقة لتخصصك ومنطقتك فقط', sl2: 'تسعير سريع لكل مادة مع عرض واحد', sl3: 'مجاني خلال الإطلاق، بلا عمولة ولا اشتراك',
    goSignIn: 'الذهاب لتسجيل الدخول', home: 'الرئيسية',
  },
  en: {
    title: 'Create your account', sub: 'One minute and you are in',
    supTitle: 'Register as a supplier', supSub: 'Enter your basic business details now, and complete your location, sections and verification after signing in.',
    toSupplier: 'Own a shop or supply materials?', toSupplierCta: 'Register as a supplier',
    toBuyer: 'Need building-material prices?', toBuyerCta: 'Sign up to request prices',
    supplier: 'I provide prices', supplierDesc: 'Company, shop, factory or independent seller',
    contractor: 'I need prices', contractorDesc: 'Request material prices from suppliers and compare quotes',
    accountType: 'Account type', fullName: 'Full name', pickTitle: 'How will you use Taseerak?', pickSub: 'Choose your account type to continue', change: 'Change',
    company: 'Shop or business name', companyHint: 'Shown to buyers on your offers',
    brandH: 'Start free in a minute.', brandP: 'One account to request prices or to quote them, and follow your request until delivery.',
    l1: 'Send your list once and get quotes from several suppliers', l2: 'Compare and pick the cheapest for each item', l3: 'Free during launch, no commission',
    corpQ: 'A company with a procurement team?', corpA: 'We set up a company account for your staff — contact us',
    copyright: '© 2026 Taseerak · Procurement platform for construction materials',
    phone: 'Phone (WhatsApp)', email: 'Email address', password: 'Password', passwordPh: 'A strong password',
    create: 'Create account →', creating: 'Creating...', haveAccount: 'Have an account?', login: 'Sign In',
    chooseType: 'Choose your account type first', phoneTaken: 'This mobile number is already registered with us. If it is yours, sign in.',
    emailTaken: 'This email is already registered — ', signInInstead: 'sign in.',
    agreePre: 'I agree to the ', terms: 'Terms & Conditions', and: ' and ', privacy: 'Privacy Policy',
    agreeErr: 'You must agree to the Terms & Privacy Policy',
    captchaErr: 'Please complete the “I am human” check and try again.',
    verifyTitle: 'Verify your email', verifyBody: 'We sent a confirmation link to your email. Open it to activate your account, then sign in.',
    verifyNext: 'After signing in you will complete your details (location, what you sell, verification) in easy steps.', verifyNextBuyer: 'After signing in we only ask for your delivery address.',
    junk: 'No email? Check your Junk or Spam folder.',
    supBrandH: 'Requests for the materials you sell reach you.', supBrandP: 'Price buyers’ requests in your region from your phone and follow your deals from offer to delivery.',
    sl1: 'Only requests that match your specialty and region', sl2: 'Quick pricing, one offer for all materials', sl3: 'Free during launch, no commission and no subscription',
    goSignIn: 'Go to sign in', home: 'Home',
  },
  ur: {
    title: 'اپنا اکاؤنٹ بنائیں', sub: 'ایک منٹ اور آپ اندر ہیں',
    supTitle: 'سپلائر کے طور پر رجسٹر کریں', supSub: 'ابھی اپنے کاروبار کی بنیادی تفصیلات درج کریں، اور سائن اِن کے بعد مقام، سیکشن اور تصدیق مکمل کریں۔',
    toSupplier: 'دکان ہے یا سامان سپلائی کرتے ہیں؟', toSupplierCta: 'سپلائر کے طور پر رجسٹر کریں',
    toBuyer: 'تعمیراتی سامان کی قیمتیں چاہییں؟', toBuyerCta: 'قیمتیں منگوانے کے لیے رجسٹر کریں',
    supplier: 'میں قیمتیں دیتا ہوں', supplierDesc: 'کمپنی، دکان، فیکٹری یا آزاد فروخت کنندہ',
    contractor: 'مجھے قیمتیں چاہییں', contractorDesc: 'قیمتیں منگوائیں اور موازنہ کریں',
    accountType: 'اکاؤنٹ کی قسم', fullName: 'پورا نام', pickTitle: 'آپ تسعیرک کیسے استعمال کریں گے؟', pickSub: 'جاری رکھنے کے لیے اکاؤنٹ کی قسم منتخب کریں', change: 'تبدیل کریں',
    company: 'دکان یا کاروبار کا نام', companyHint: 'خریدار آپ کی آفر پر یہی نام دیکھیں گے',
    brandH: 'ایک منٹ میں مفت شروع کریں۔', brandP: 'ایک اکاؤنٹ سے قیمتیں منگوائیں یا دیں، اور ڈیلیوری تک اپنی درخواست دیکھیں۔',
    l1: 'اپنی فہرست ایک بار بھیجیں، کئی سپلائرز کی آفرز پائیں', l2: 'موازنہ کریں اور ہر چیز کی سستی قیمت چنیں', l3: 'لانچ کے دوران مفت، کوئی کمیشن نہیں',
    corpQ: 'خریداری ٹیم والی کمپنی؟', corpA: 'ہم آپ کے عملے کے لیے کمپنی اکاؤنٹ بناتے ہیں — رابطہ کریں',
    copyright: '© 2026 تسعیرک · تعمیراتی سامان کی قیمتوں کا پلیٹ فارم',
    phone: 'فون (واٹس ایپ)', email: 'ای میل', password: 'پاسورڈ', passwordPh: 'مضبوط پاسورڈ',
    create: 'اکاؤنٹ بنائیں ←', creating: 'بن رہا ہے...', haveAccount: 'اکاؤنٹ ہے؟', login: 'سائن ان',
    chooseType: 'پہلے اکاؤنٹ کی قسم منتخب کریں', phoneTaken: 'یہ موبائل نمبر ہمارے پاس رجسٹرڈ ہے۔ اگر آپ کا ہے تو سائن اِن کریں۔',
    emailTaken: 'یہ ای میل پہلے سے رجسٹرڈ ہے — ', signInInstead: 'سائن اِن کریں۔',
    agreePre: 'میں متفق ہوں ', terms: 'شرائط و ضوابط', and: ' اور ', privacy: 'پرائیویسی پالیسی',
    agreeErr: 'شرائط اور پرائیویسی پالیسی سے اتفاق ضروری ہے',
    captchaErr: 'براہ کرم تصدیق مکمل کریں (میں روبوٹ نہیں ہوں) اور دوبارہ کوشش کریں۔',
    verifyTitle: 'اپنا ای میل تصدیق کریں', verifyBody: 'ہم نے آپ کے ای میل پر تصدیقی لنک بھیجا ہے۔ اسے کھول کر اکاؤنٹ فعال کریں، پھر سائن ان کریں۔',
    verifyNext: 'سائن اِن کے بعد آپ اپنی تفصیلات (مقام، آپ کیا بیچتے ہیں، تصدیق) آسان مراحل میں مکمل کریں گے۔', verifyNextBuyer: 'سائن اِن کے بعد ہم صرف آپ کا ڈیلیوری پتہ پوچھیں گے۔',
    junk: 'ای میل نہیں ملی؟ Junk یا Spam فولڈر دیکھیں۔',
    supBrandH: 'جو سامان آپ بیچتے ہیں اس کی درخواستیں آپ تک پہنچتی ہیں۔', supBrandP: 'اپنے علاقے کے خریداروں کی درخواستوں کی قیمت فون سے دیں اور سودے آفر سے ڈیلیوری تک دیکھیں۔',
    sl1: 'صرف آپ کے تخصص اور علاقے کی درخواستیں', sl2: 'تمام مال کے لیے ایک آفر، تیز قیمت', sl3: 'لانچ کے دوران مفت، نہ کمیشن نہ سبسکرپشن',
    goSignIn: 'سائن ان پر جائیں', home: 'مرکزی صفحہ',
  },
}

export default function RegisterPage() {
  const { locale, dir } = useTranslation()
  const t = TR[locale] || TR.ar
  const supabase = createClient()

  // buyer-first (owner 2026-11-12, app parity 087454f): a plain /register is a buyer signup;
  // ?role=supplier or ?kind= makes it a supplier signup. A switch row near the bottom flips it.
  const [selectedType, setSelectedType] = useState<'contractor' | 'supplier'>('contractor')
  const [sellerKind, setSellerKind] = useState<'company' | 'independent' | null>(null)
  const [sellerOnly, setSellerOnly] = useState(false) // /join (supplier invite link): no buyer switch (owner 2026-11-21)
  // UX-027: a company employee invited by link (/register?team=<token>): no kind step, no CR, no business name
  const [teamToken, setTeamToken] = useState('')
  const [teamCompany, setTeamCompany] = useState('')
  // round-2 UX-077: an invitation is checked first; an invalid or expired one never opens the form (no orphan account)
  const [teamInvalid, setTeamInvalid] = useState(false)
  const [teamRole, setTeamRole] = useState('')
  // round-5 UX-086: the link (?role= / ?kind= / ?team=) is read before the form is drawn, so a seller on a slow
  // in-app browser never sees (and taps) the buyer form first; a neutral skeleton shows until then
  const [ready, setReady] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [termsErr, setTermsErr] = useState(false) // UX-133: the error sits under the box (the button is not disabled for it)
  // optional CR at sign-up for a company/shop (owner 2026-11-16, migration 216): one CR = one account.
  // Checked on blur / submit only (cr_exists: yes/no, 10 checks per hour per IP).
  const [cr, setCr] = useState('')
  const [crTaken, setCrTaken] = useState(false)
  // UX-039: the check itself failed (rate limit / offline): sign-up waits, never goes on unchecked
  const [crCheckFailed, setCrCheckFailed] = useState(false)
  const [crErr, setCrErr] = useState('') // UX-137: the CR error sits under its field
  const crChecked = useRef('')
  // round-5 UX-080: the last check's result lives in a ref (never a stale state value), and any edit clears both
  const crResult = useRef<'taken' | 'free' | ''>('')
  async function checkCr(v: string): Promise<'taken' | 'free' | 'error' | 'invalid'> {
    const c = normalizeCrInput(v)
    if (!isUnifiedCr(c)) { setCrTaken(false); return 'invalid' }
    if (crChecked.current === c && crResult.current) { setCrTaken(crResult.current === 'taken'); return crResult.current }
    const { data, error } = await supabase.rpc('cr_exists', { p_cr: c })
    if (error) { setCrCheckFailed(true); return 'error' }
    setCrCheckFailed(false)
    crChecked.current = c
    crResult.current = data === true ? 'taken' : 'free'
    setCrTaken(data === true)
    return crResult.current
  }
  const crCheckFailedText = locale === 'en' ? 'The commercial registration could not be checked right now. Try again in a few minutes.' : locale === 'ur' ? 'تجارتی رجسٹریشن کی ابھی تصدیق نہیں ہو سکی۔ چند منٹ بعد دوبارہ کوشش کریں۔' : 'تعذّر التحقق من السجل التجاري الآن. حاول مرة أخرى بعد دقائق.'
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [sentTo, setSentTo] = useState<{ email: string; password: string } | null>(null) // to resend / correct a mistyped e-mail
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  const [phoneDup, setPhoneDup] = useState(false)
  const [emailDup, setEmailDup] = useState(false)

  const { register, handleSubmit, watch, setValue, trigger, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { role: 'contractor' },
  })
  const switchTo = (r: 'contractor' | 'supplier') => {
    setSelectedType(r); setValue('role', r, { shouldValidate: true }); setFormError('')
    // (owner 2026-11-22) no pre-selection from an older visit: a seller chooses the kind on its own step
  }

  // اختيار مسبق للدور من الرابط (?role=contractor|supplier) — لروابط الدعوة/الهبوط الموجّهة
  useEffect(() => {
    captureRef() // «ادعُ من تعرفه»: keep ?ref= before any redirect
    let waitInvite = false
    try {
      // Phone + WhatsApp OTP is the main way in; this email form stays for ?email=1.
      // ?next= (same-origin path): where to land after sign-up + onboarding, e.g. a landing section card
      rememberPostSignupNext(new URLSearchParams(window.location.search).get('next'))
      if (PHONE_OTP_ENABLED && new URLSearchParams(window.location.search).get('email') !== '1') { window.location.replace('/login'); return }
      const qs = new URLSearchParams(window.location.search)
      const k = qs.get('kind')
      if (qs.get('only') === '1') setSellerOnly(true)
      const tt = qs.get('team') || ''
      // round-6 UX-110: with an invitation the form waits for its check (never shown, then replaced)
      if (/^[0-9a-f-]{36}$/.test(tt)) waitInvite = true
      if (/^[0-9a-f-]{36}$/.test(tt)) {
        setTeamToken(tt); setSellerOnly(true); switchTo('supplier')
        try { localStorage.setItem(TEAM_INVITE_KEY, tt) } catch {}
        Promise.resolve(supabase.rpc('get_company_invite', { p_token: tt })).then(({ data, error }: any) => {
          const bad = !!error || !data || data.ok === false || data.valid === false
          if (bad) { setTeamInvalid(true); try { localStorage.removeItem(TEAM_INVITE_KEY) } catch {}; setReady(true); return }
          if (data.company_name) setTeamCompany(String(data.company_name))
          if (data.role) setTeamRole(String(data.role))
          setReady(true)
        }).catch(() => { setTeamInvalid(true); try { localStorage.removeItem(TEAM_INVITE_KEY) } catch {}; setReady(true) })
      }
      if (qs.get('role') === 'supplier' || k === 'company' || k === 'independent') {
        switchTo('supplier')
        if (k === 'company' || k === 'independent') setSellerKind(k)
      }
    } catch {}
    if (!waitInvite) setReady(true)
  }, [])

  // فحص التكرار قبل الإنشاء — الجوال والبريد فريدان (خصوصية: نُرجع boolean فقط بلا اسم)
  async function checkPhoneDup(phone: string) {
    // any accepted format (05…, +971…, 07…): phone_exists compares the last 9 digits (2026-11-21 fix)
    if (!/^05[0-9]{8}$/.test(phone) && !toE164(phone)) { setPhoneDup(false); return }
    try { const { data } = await supabase.rpc('phone_exists', { p_phone: phone }); setPhoneDup(data === true) }
    catch { setPhoneDup(false) }
  }
  async function checkEmailDup(email: string): Promise<boolean> {
    const e = (email || '').trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setEmailDup(false); return false }
    try { const { data } = await supabase.rpc('email_exists', { p_email: e }); const taken = data === true; setEmailDup(taken); return taken }
    catch { setEmailDup(false); return false }
  }

  async function onSubmit(data: FormData) {
    if (data.role === 'supplier' && !sellerKind && !teamToken) { setFormError(locale === 'en' ? 'Choose: a company / shop, or a pricing agent' : locale === 'ur' ? 'منتخب کریں: کمپنی / دکان یا قیمت ایجنٹ' : 'اختر نوع نشاطك: شركة أو محل، أو وسيط تسعير'); return }
    if (!agreedToTerms) { setTermsErr(true); return }
    const soloSeller = data.role === 'supplier' && (sellerKind === 'independent' || !!teamToken)
    const asksBusiness = data.role === 'supplier' && !soloSeller
    if (asksBusiness && (data.company_name_ar || '').trim().length < 2) {
      setError('company_name_ar', { message: locale === 'en' ? 'Company or business name is required' : locale === 'ur' ? 'کمپنی یا کاروبار کا نام ضروری ہے' : 'اسم المحل أو النشاط التجاري مطلوب' }); return
    }
    setCrErr('')
    const focusCr = () => setTimeout(() => document.getElementById('reg-cr')?.focus(), 30)
    if (asksBusiness && !cr.trim()) { setCrErr(locale === 'en' ? 'A company or shop needs its commercial registration number. No registration? Choose «Pricing agent».' : locale === 'ur' ? 'کمپنی یا دکان کے لیے تجارتی رجسٹریشن نمبر ضروری ہے۔ رجسٹریشن نہیں؟ «قیمت ایجنٹ» منتخب کریں۔' : 'تحتاج الشركة أو المحل إلى رقم السجل التجاري. ليس لديك سجل؟ اختر «وسيط تسعير».'); focusCr(); return }
    if (asksBusiness && cr && !isUnifiedCr(normalizeCrInput(cr))) { setCrErr(crFormatText(locale)); focusCr(); return }
    // owner 2026-11-23: one CR = one account. A CR held by another account blocks sign-up; the real owner
    // contacts support, who opens an ownership claim (cr_claims) after checking.
    if (asksBusiness && cr) {
      const r = await checkCr(cr)
      if (r === 'taken') { focusCr(); return } // the message and «تواصل مع الدعم» show under the field
      if (r === 'error') { setFormError(crCheckFailedText); return } // UX-039: never sign up unchecked (the CR would be dropped silently)
    }
    if (phoneDup) { setFormError(t.phoneTaken); return }
    // check again at submit, whatever the format (owner 2026-11-21): never create an account on a taken number
    try { const { data: taken } = await supabase.rpc('phone_exists', { p_phone: data.phone }); if (taken === true) { setPhoneDup(true); setFormError(t.phoneTaken); return } } catch {}
    if (await checkEmailDup(data.email)) { setFormError(''); return }
    setSubmitting(true); setFormError('')
    try {
      // الميتاداتا الدنيا — handle_new_user يبني الملف منها. الباقي يُعبّأ في /onboarding.
      const meta = {
        role: data.role,
        full_name: data.full_name.trim(),
        company_name_ar: (asksBusiness ? (data.company_name_ar || '').trim() : '') || data.full_name.trim(),
        phone: data.phone,
        preferred_language: locale,
        ...(data.role === 'supplier' && !teamToken ? { seller_kind: sellerKind } : {}),
        ...(teamToken ? { team_invite: teamToken } : {}),
        ...(asksBusiness && isUnifiedCr(normalizeCrInput(cr)) ? { commercial_registration: normalizeCrInput(cr) } : {}),
        terms_version: TERMS_VERSION, client: 'web',
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email, password: data.password,
        // UX-170: the confirmation link lands on «تم تأكيد بريدك»; a team invite comes back to the invitation (UX-027)
        options: { data: meta, emailRedirectTo: `${window.location.origin}/login?confirmed=1${teamToken ? '&next=' + encodeURIComponent('/team/join/' + teamToken) : (data.role === 'supplier' ? '&m=email' : '')}`, captchaToken: captchaToken || undefined },
      })
      if (authError) throw new Error(authError.message)

      // تأكيد البريد مفعّل → لا جلسة: نعرض شاشة «فعّل بريدك».
      if (!authData.session) { setSentTo({ email: data.email, password: data.password }); setEmailSent(true); return }
      // تأكيد البريد معطّل → لدينا جلسة: نوجّه مباشرة لإكمال الملف (عضو الفريق يعود إلى الدعوة).
      window.location.href = teamToken ? `/team/join/${teamToken}` : '/onboarding'
    } catch (err: any) {
      captchaRef.current?.reset(); setCaptchaToken('')
      const msg = err?.message || ''
      const failText = locale === 'en' ? 'The account could not be created. Check your details and try again, or contact support.' : locale === 'ur' ? 'اکاؤنٹ نہیں بن سکا۔ اپنی تفصیلات چیک کر کے دوبارہ کوشش کریں، یا سپورٹ سے رابطہ کریں۔' : 'تعذّر إنشاء الحساب. تحقّق من بياناتك وحاول مرة أخرى، أو تواصل مع الدعم.'
      if (/captcha/i.test(msg)) setFormError(t.captchaErr)
      else if (/database error|duplicate|unique/i.test(msg)) {
        // UX-039: say WHICH value is taken: check the phone and the CR again, otherwise a general message
        let said = false
        try { const { data: pt } = await supabase.rpc('phone_exists', { p_phone: data.phone }); if (pt === true) { setPhoneDup(true); setFormError(t.phoneTaken); said = true } } catch {}
        if (!said && asksBusiness && cr) { crChecked.current = ''; crResult.current = ''; if ((await checkCr(cr)) === 'taken') { setFormError(''); said = true } }
        if (!said) setFormError(failText)
      } else setFormError(friendlyError(msg, failText, locale))
    } finally { setSubmitting(false) }
  }

  // شاشة تأكيد البريد
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas" dir={dir}>
        <div className="absolute top-4 end-4"><LanguageSwitcher variant="minimal" /></div>
        <a href="/" className="absolute top-4 start-4 inline-flex items-center min-h-[44px] text-sm font-medium text-gray-500 hover:text-navy transition-colors">{t.home}</a>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-5xl mb-4"><Glyph e="📬" /></div>
          <h1 className="text-xl font-bold text-navy mb-2">{t.verifyTitle}</h1>
          <p className="text-sm text-gray-500 mb-2">{t.verifyBody}</p>
          {sentTo && <p className="text-sm font-bold text-navy mb-2" dir="ltr">{sentTo.email}</p>}
          <p className="text-[13px] text-gray-600 mb-2">{teamToken ? (locale === 'en' ? 'After confirming, sign in and you will come back to the invitation to join.' : locale === 'ur' ? 'تصدیق کے بعد سائن اِن کریں، آپ شامل ہونے کے لیے دعوت پر واپس آئیں گے۔' : 'بعد التأكيد سجّل الدخول، وستعود إلى الدعوة لإتمام الانضمام.') : selectedType === 'contractor' ? t.verifyNextBuyer : sellerKind === 'independent' ? (locale === 'en' ? 'After signing in you will complete your details (location and what you price) in easy steps.' : locale === 'ur' ? 'سائن اِن کے بعد آپ آسان مراحل میں اپنی تفصیلات (مقام اور آپ کن چیزوں کی قیمت دیتے ہیں) مکمل کریں گے۔' : 'بعد الدخول ستكمل بياناتك (الموقع، وما تسعّره) بخطوات سهلة.') : t.verifyNext}</p>
          <p className="text-[13px] text-gray-600 mb-6">{t.junk}</p>
          <Link href={selectedType === 'supplier' ? '/login?m=email' : '/login'} className="flex items-center justify-center w-full min-h-[44px] py-3 rounded-xl font-extrabold text-[#071827] text-sm" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{t.goSignIn}</Link>
          {sentTo && <FixSignupEmail email={sentTo.email} password={sentTo.password} locale={locale} onFixed={(e) => setSentTo(s => s ? { ...s, email: e } : s)} />}
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen min-h-screen flex flex-col" dir={dir}>
    <div className="flex flex-1">
      {/* ===== Brand panel (wide screens), same as the login page ===== */}
      <div className="auth-brand-panel hidden lg:flex lg:w-[42%] relative overflow-hidden flex-col justify-between p-12 text-white">
        <a href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-brand-lockup" />
        </a>
        <div className="max-w-md">
          <h2 className="text-3xl xl:text-[40px] font-extrabold leading-[1.25] mb-4">{selectedType === 'supplier' ? t.supBrandH : t.brandH}</h2>
          <p className="text-white/80 text-base mb-8 leading-relaxed">{selectedType === 'supplier' ? t.supBrandP : t.brandP}</p>
          <ul className="space-y-4">
            {(selectedType === 'supplier' ? [t.sl1, t.sl2, t.sl3] : [t.l1, t.l2, t.l3]).map((it, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: '#D4A543' }}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#071827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </span>{it}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-white/50">{t.copyright}</div>
      </div>

      {/* ===== Form panel ===== */}
      <div className="auth-form-side flex-1 flex flex-col">
        <div className="flex items-center justify-between p-5">
          <a href="/" className="inline-flex items-center gap-1.5 min-h-[44px] px-1 text-sm font-semibold text-ink-2 hover:text-navy transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
            {t.home}
          </a>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="minimal" />
          </div>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-5 pb-12">
          <div className="auth-form-card w-full max-w-[600px] bg-white rounded-2xl p-6 sm:p-9 shadow-sm border border-line">
            <div className="flex lg:hidden items-center justify-center mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-mobile-lockup" />
            </div>
            {!ready ? (
              <div aria-busy="true" aria-live="polite" className="space-y-4 animate-pulse">
                <span className="sr-only">{locale === 'en' ? 'Loading…' : locale === 'ur' ? 'لوڈ ہو رہا ہے…' : 'جارٍ التحميل…'}</span>
                <div className="h-7 w-1/2 rounded-lg bg-gray-100" />
                <div className="h-4 w-3/4 rounded bg-gray-100" />
                <div className="h-12 rounded-xl bg-gray-100" />
                <div className="h-12 rounded-xl bg-gray-100" />
                <div className="h-12 rounded-xl bg-gray-100" />
              </div>
            ) : (<>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-navy">{teamToken
                ? (locale === 'en' ? `Join the team of ${teamCompany || 'the company'}` : locale === 'ur' ? `${teamCompany || 'کمپنی'} کی ٹیم میں شامل ہوں` : `انضم إلى فريق ${teamCompany || 'الشركة'}`)
                : selectedType === 'supplier' ? (sellerKind === 'independent' ? (locale === 'en' ? 'Register as a pricing agent' : locale === 'ur' ? 'قیمت ایجنٹ کے طور پر رجسٹر کریں' : 'سجّل كوسيط تسعير') : t.supTitle) : t.title}</h1>
              <p className="text-ink-2 mt-1.5 text-sm">{teamToken
                ? (locale === 'en' ? 'You will price requests in the company name from your own account. You do not need a commercial registration.' : locale === 'ur' ? 'آپ اپنے اکاؤنٹ سے کمپنی کے نام پر قیمتیں دیں گے۔ تجارتی رجسٹریشن کی ضرورت نہیں۔' : 'ستسعّر الطلبات باسم الشركة من حسابك الخاص، ولا تحتاج سجلاً تجارياً.')
                : selectedType === 'supplier' ? (sellerKind === 'independent'
                  ? (locale === 'en' ? 'Enter your basic details now, and complete your location and what you price after signing in. Your name is shown to buyers on your offers.' : locale === 'ur' ? 'ابھی اپنی بنیادی تفصیلات درج کریں، اور سائن اِن کے بعد مقام اور آپ کن چیزوں کی قیمت دیتے ہیں مکمل کریں۔ آپ کا نام آپ کی آفرز پر خریداروں کو دکھتا ہے۔' : 'أدخل بياناتك الأساسية الآن، وأكمل موقعك وما تسعّره بعد الدخول. يظهر اسمك للمشترين على عروضك.')
                  : t.supSub) : t.sub}</p>
            </div>

          {teamToken && teamInvalid ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-bold">{locale === 'en' ? 'This invitation is not valid. Ask the company for a new link.' : locale === 'ur' ? 'یہ دعوت درست نہیں۔ کمپنی سے نیا لنک مانگیں۔' : 'الدعوة غير صالحة. اطلب من الشركة رابطاً جديداً.'}</p>
              <Link href="/login?m=email" className="mt-3 inline-flex items-center min-h-[44px] px-4 rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{t.haveAccount} {t.login}</Link>
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-start">
            {teamToken && teamRole && (
              <p className="text-[13px] font-semibold text-navy rounded-xl bg-[#0B2438]/5 px-3 py-2">{locale === 'en' ? 'Your role: ' : locale === 'ur' ? 'آپ کا کردار: ' : 'دورك: '}{teamRole === 'admin' ? (locale === 'en' ? 'Admin (prices requests and invites members)' : locale === 'ur' ? 'ایڈمن (قیمتیں دیتا ہے اور اراکین بلاتا ہے)' : 'مشرف (يسعّر الطلبات ويدعو أعضاء)') : (locale === 'en' ? 'Sales (prices requests)' : locale === 'ur' ? 'سیلز (درخواستوں کی قیمت دیتا ہے)' : 'مبيعات (يسعّر الطلبات)')}</p>
            )}
            {selectedType === 'supplier' && sellerKind && !teamToken && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-3 py-2">
                <span className="text-sm font-bold text-navy"><SellerIcon name={SELLER_KINDS[sellerKind].icon} /> {locale === 'en' ? SELLER_KINDS[sellerKind].en : locale === 'ur' ? SELLER_KINDS[sellerKind].ur : SELLER_KINDS[sellerKind].ar}</span>
                <button type="button" onClick={() => { setSellerKind(null); setFormError('') }} className="min-h-[44px] px-2 text-sm font-bold text-[#8F6820] underline shrink-0">{locale === 'en' ? 'Change' : locale === 'ur' ? 'تبدیل کریں' : 'تغيير'}</button>
              </div>
            )}
            {selectedType === 'supplier' && !sellerKind && !teamToken && (
            <div>
                <p className="text-base font-extrabold text-navy mb-1">{locale === 'en' ? 'First: what kind of seller are you?' : locale === 'ur' ? 'پہلے: آپ کس قسم کے بیچنے والے ہیں؟' : 'أولاً: ما نوع حسابك؟'}</p>
                <p className="text-xs text-gray-500 mb-3">{locale === 'en' ? 'A company or shop needs a commercial registration.' : locale === 'ur' ? 'کمپنی یا دکان کو تجارتی رجسٹریشن چاہیے۔' : 'تحتاج الشركة أو المحل إلى سجل تجاري.'}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['company', 'independent'] as const).map(k => {
                    const on = sellerKind === k
                    const info = SELLER_KINDS[k]
                    return (
                      <button key={k} type="button" onClick={() => { setSellerKind(k); setFormError('') }} aria-pressed={on}
                        className={`p-4 rounded-xl border-2 text-start transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10 shadow-sm' : 'border-gray-200 bg-white hover:border-[#D4A543]/60'}`}>
                        <div className="font-extrabold text-navy text-sm">{on && <Check className="inline w-4 h-4 me-1" aria-hidden />}<SellerIcon name={info.icon} /> {locale === 'en' ? info.en : locale === 'ur' ? info.ur : info.ar}</div>
                        <div className="text-xs text-gray-500 mt-1 leading-relaxed">{locale === 'en' ? info.sub.en : locale === 'ur' ? info.sub.ur : info.sub.ar}</div>
                      </button>
                    )
                  })}
                </div>
                {/* round-5 UX-097: an employee joins through the owner's invitation, not with the company's CR */}
                <p className="text-[12px] text-gray-600 mt-2.5 leading-relaxed"><Glyph e="👥" /> {teamInviteHintText(locale)}</p>
            </div>
            )}

            <div className={selectedType === 'supplier' && !sellerKind && !teamToken ? 'hidden' : 'space-y-4'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-600 mb-1">{t.fullName} *</label>
                <input id="reg-name" {...register('full_name')} autoComplete="name" className="input-field" placeholder={locale === 'en' ? 'Mohammed Al-Otaibi' : locale === 'ur' ? 'محمد العتیبی' : 'محمد العتيبي'} />
                {errors.full_name && <p className="text-red-600 text-[13px] mt-1">{vmsg(errors.full_name.message, locale)}</p>}
              </div>
              <div>
                <label htmlFor="reg-phone" className="block text-xs font-semibold text-gray-600 mb-1">{t.phone} *</label>
                <input id="reg-phone" {...register('phone')} autoComplete="tel-national" className="input-field" placeholder="05XXXXXXXX" type="tel" inputMode="tel" maxLength={16} dir="ltr"
                  onInput={(e: any) => { const raw = toLatinDigits(e.currentTarget.value); const plus = raw.trim().startsWith('+'); const d = raw.replace(/[^0-9]/g, '').slice(0, plus ? 15 : 12); const v = (plus ? '+' : '') + d; e.currentTarget.value = v; if (/^05[0-9]{8}$/.test(v) || toE164(v)) checkPhoneDup(v); else setPhoneDup(false) }} />
                {errors.phone && <p className="text-red-600 text-[13px] mt-1">{vmsg(errors.phone.message, locale)}</p>}
              </div>
            </div>
            {phoneDup && (
              <div role="alert" className="text-red-700 text-[13px] bg-red-50 border border-red-200 rounded-lg p-2">
                <Glyph e="⚠" /> {t.phoneTaken}{' '}
                <Link href={selectedType === 'supplier' ? '/login?m=email' : '/login'} className="font-bold underline">{t.login}</Link>
                {' · '}<Link href="/forgot-password" className="inline-flex items-center min-h-[44px] font-bold underline">{locale === 'en' ? 'Forgot your password?' : locale === 'ur' ? 'پاسورڈ بھول گئے؟' : 'نسيت كلمة المرور؟'}</Link>
              </div>
            )}

            {selectedType === 'contractor' && BUYER_PHONE_LOGIN && (
              <a href="/login" className="block rounded-xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-3 py-2.5 text-sm font-bold text-[#071827]">
                {locale === 'en' ? 'Faster: sign up with your mobile number only (no password) →' : locale === 'ur' ? 'تیز تر: صرف موبائل نمبر سے رجسٹر کریں (بغیر پاسورڈ) ←' : 'أسرع: سجّل برقم جوالك فقط (بدون كلمة مرور) ←'}
              </a>
            )}
            {selectedType === 'supplier' && sellerKind === 'company' && !teamToken && <div>
              <label htmlFor="reg-company" className="block text-xs font-semibold text-gray-600 mb-1">{t.company} *</label>
              <input id="reg-company" {...register('company_name_ar')} autoComplete="organization" className="input-field" aria-describedby="reg-company-hint" placeholder={locale === 'en' ? 'Al-Sakhr Building Materials' : locale === 'ur' ? 'الصخر بلڈنگ میٹریلز' : 'مؤسسة الصخر لمواد البناء'} />
              <p id="reg-company-hint" className="text-[12px] text-gray-500 mt-1">{t.companyHint}</p>
              {errors.company_name_ar && <p className="text-red-600 text-[13px] mt-1">{vmsg(errors.company_name_ar.message, locale)}</p>}
              <label htmlFor="reg-cr" className="block text-xs font-semibold text-gray-600 mb-1 mt-3">{locale === 'en' ? 'Commercial registration no.' : locale === 'ur' ? 'تجارتی رجسٹریشن نمبر' : 'رقم السجل التجاري'} *</label>
              <input id="reg-cr" value={cr} inputMode="numeric" dir="ltr" maxLength={10} className="input-field" placeholder="7XXXXXXXXX"
                aria-invalid={crTaken || !!crErr} aria-describedby={crTaken ? 'reg-cr-taken' : crErr ? 'reg-cr-err' : undefined}
                onChange={(e) => { setCr(normalizeCrInput(e.target.value).slice(0, 10)); crChecked.current = ''; crResult.current = ''; if (crTaken) setCrTaken(false); setCrErr(''); setCrCheckFailed(false) }} onBlur={(e) => { checkCr(e.target.value) }} />
              <p className="text-[12px] text-gray-500 mt-1">{locale === 'en' ? 'The unified national number: 10 digits starting with 7.' : locale === 'ur' ? 'متحدہ قومی نمبر: 7 سے شروع ہونے والے 10 ہندسے۔' : 'الرقم الوطني الموحد: 10 أرقام يبدأ بـ7.'}</p>
              {crErr && <p id="reg-cr-err" role="alert" className="text-red-600 text-[13px] mt-1">{crErr}</p>}
              {/* round-4 UX-090: the check could not run (rate limit / offline): sign-up still waits, and support is one tap away */}
              {crCheckFailed && !crErr && !crTaken && (
                <div role="status" className="text-[13px] mt-1 rounded-lg border border-[#D4A543]/50 bg-[#D4A543]/10 p-2.5 text-[#071827]">
                  <p>{crCheckFailedText}</p>
                  <a href={`mailto:${OPERATOR.email}?subject=${encodeURIComponent(locale === 'en' ? 'Commercial registration check at sign-up' : locale === 'ur' ? 'رجسٹریشن کے وقت تجارتی رجسٹریشن کی تصدیق' : 'التحقق من السجل التجاري عند التسجيل')}&body=${encodeURIComponent((locale === 'en' ? 'Commercial registration: ' : locale === 'ur' ? 'تجارتی رجسٹریشن: ' : 'رقم السجل التجاري: ') + normalizeCrInput(cr))}`}
                    className="mt-1 inline-flex items-center min-h-[44px] font-bold underline text-[#8F6820]">{locale === 'en' ? 'Email support about the registration' : locale === 'ur' ? 'رجسٹریشن کے بارے میں سپورٹ کو ای میل کریں' : 'راسل الدعم بشأن السجل'}</a>
                </div>
              )}
              {/* UX-040: one text everywhere; the visitor e-mails support with the CR (the address is shown to copy) */}
              {crTaken && (
                <div id="reg-cr-taken" role="alert" className="text-[#071827] text-[13px] bg-[#D4A543]/10 border border-[#D4A543]/50 rounded-lg p-2.5 mt-1">
                  <p><Glyph e="⚠" /> {crTakenText(locale).msg}</p>
                  <a href={crSupportHref(cr, { signedIn: false, email: OPERATOR.email, locale })}
                    className="mt-1 inline-flex items-center min-h-[44px] text-[13px] font-bold underline text-[#8F6820]">
                    {crTakenText(locale).cta}
                  </a>
                  {OPERATOR.email && <p className="text-[12px] text-gray-600">{locale === 'en' ? 'Support e-mail: ' : locale === 'ur' ? 'سپورٹ ای میل: ' : 'بريد الدعم: '}<span dir="ltr" className="font-bold select-all break-all">{OPERATOR.email}</span></p>}
                </div>
              )}
              <div className="mt-2 rounded-lg border border-[#D4A543]/40 bg-[#D4A543]/5 px-3 py-2 text-xs text-[#071827]">
                {locale === 'en' ? 'No shop or commercial registration?' : locale === 'ur' ? 'دکان یا تجارتی رجسٹریشن نہیں؟' : 'ليس لديك محل أو سجل تجاري؟'}{' '}
                <button type="button" className="inline-flex items-center min-h-[44px] font-extrabold text-[#8F6820] underline" onClick={() => { setSellerKind('independent'); setCr(''); crChecked.current = ''; crResult.current = ''; setCrTaken(false); setCrErr(''); setFormError('') }}>
                  {locale === 'en' ? 'Sign up as a pricing agent' : locale === 'ur' ? 'قیمت ایجنٹ کے طور پر رجسٹر کریں' : 'سجّل كوسيط تسعير'}
                </button>
              </div>
            </div>}

            <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-gray-600 mb-1">{t.email} *</label>
              <input id="reg-email" autoComplete="email" dir="ltr" {...register('email', { onBlur: (e) => checkEmailDup(e.target.value), onChange: () => { if (emailDup) setEmailDup(false) } })}
                className="input-field" placeholder="name@example.com" type="email" />
              {errors.email && <p className="text-red-600 text-[13px] mt-1">{vmsg(errors.email.message, locale)}</p>}
              {(() => { const sug = emailTypoSuggestion(watch('email') || ''); return sug ? (
                <p className="text-xs mt-1 text-[#8F6820]">{locale === 'en' ? 'Did you mean' : locale === 'ur' ? 'کیا آپ کا مطلب' : 'هل تقصد'} <button type="button" dir="ltr" className="font-bold underline" onClick={() => { setValue('email', sug, { shouldValidate: true }); checkEmailDup(sug) }}>{sug}</button>{locale === 'en' ? '?' : '؟'}</p>
              ) : null })()}
              {emailDup && <p className="text-red-700 text-[13px] bg-red-50 border border-red-200 rounded-lg p-2 mt-1"><Glyph e="⚠" /> {t.emailTaken}<Link href={selectedType === 'supplier' ? '/login?m=email' : '/login'} className="inline-flex items-center min-h-[44px] underline font-bold">{t.signInInstead}</Link>{' · '}<Link href="/forgot-password" className="inline-flex items-center min-h-[44px] font-bold underline">{locale === 'en' ? 'Forgot your password?' : locale === 'ur' ? 'پاسورڈ بھول گئے؟' : 'نسيت كلمة المرور؟'}</Link></p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-gray-600 mb-1">{t.password} *</label>
              <div className="relative">
                <input id="reg-password" {...register('password')} autoComplete="new-password" className="input-field pe-12" type={showPass ? 'text' : 'password'} placeholder={t.passwordPh} aria-describedby="reg-pass-rules" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute end-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center text-gray-500" aria-label={showPass ? (locale === 'en' ? 'Hide password' : locale === 'ur' ? 'پاسورڈ چھپائیں' : 'إخفاء كلمة المرور') : (locale === 'en' ? 'Show password' : locale === 'ur' ? 'پاسورڈ دکھائیں' : 'إظهار كلمة المرور')}>
                  {showPass ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
                </button>
              </div>
              <ul id="reg-pass-rules" className="mt-1.5 space-y-0.5">
                {passRuleList(watch('password') || '', locale).map(r => (
                  <li key={r.rule} className={`flex items-center gap-1.5 text-[12px] ${r.ok ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {r.ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <span className="w-3.5 h-3.5 inline-grid place-items-center" aria-hidden>•</span>}{r.text}
                  </li>
                ))}
              </ul>
              {errors.password && <p className="text-red-600 text-[13px] mt-1">{vmsg(errors.password.message, locale)}</p>}
            </div>
            </div>

            {formError && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{formError}</div>}

            <div>
            <label className="flex items-start gap-2 cursor-pointer min-h-[44px]">
              <input type="checkbox" checked={agreedToTerms} onChange={(e: any) => { setAgreedToTerms(e.target.checked); if (e.target.checked) setTermsErr(false) }} aria-invalid={termsErr} aria-describedby={termsErr ? 'reg-terms-err' : undefined} className="mt-0.5 w-5 h-5 accent-[#0B2438] flex-shrink-0" />
              <span className="text-[13px] text-gray-700 leading-relaxed">
                {t.agreePre}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] font-bold hover:underline" style={{ color: '#8F6820' }}>{t.terms}</a>
                {t.and}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] font-bold hover:underline" style={{ color: '#8F6820' }}>{t.privacy}</a>
              </span>
            </label>
            {termsErr && <p id="reg-terms-err" role="alert" className="text-red-600 text-[13px] font-semibold ms-7">{t.agreeErr}</p>}
            </div>

            <div className="flex justify-center">
              <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} language={locale} />
            </div>

            <button type="submit" disabled={submitting}
              onClick={async () => { await trigger(); if (!agreedToTerms) setTermsErr(true) }}
              className="btn-orange w-full min-h-[48px] disabled:opacity-50">
              {submitting ? t.creating : t.create}
            </button>
            </div>
          </form>
          )}

            {/* switch buyer ⇄ supplier, then «have an account?» */}
            {!sellerOnly && <button type="button" onClick={() => switchTo(selectedType === 'supplier' ? 'contractor' : 'supplier')}
              className="mt-5 w-full min-h-[44px] rounded-xl border-2 border-[#0B2438]/30 bg-white hover:border-[#0B2438] px-4 py-3 text-sm text-ink-2 transition-colors">
              {selectedType === 'supplier' ? t.toBuyer : t.toSupplier}{' '}
              <span className="font-extrabold text-[#0B2438]">{selectedType === 'supplier' ? t.toBuyerCta : t.toSupplierCta}</span>
            </button>}
            </>)}
            <p className="mt-3 text-sm text-ink-2 text-center">{t.haveAccount} <Link href={selectedType === 'supplier' ? '/login?m=email' : '/login'} className="inline-flex items-center min-h-[44px] font-extrabold text-orange-dark hover:underline">{t.login}</Link></p>

            {/* company accounts with several procurement staff are set up with us, not here */}
            {selectedType === 'contractor' && <p className="mt-5 pt-4 border-t border-line text-xs text-gray-500 text-center">
              {t.corpQ} <a href="mailto:info@taseerak.com?subject=%D8%AD%D8%B3%D8%A7%D8%A8%20%D8%B4%D8%B1%D9%83%D8%A9" className="inline-flex items-center min-h-[44px] font-bold hover:underline" style={{ color: '#8F6820' }}>{t.corpA}</a>
            </p>}
          </div>
        </div>
      </div>
    </div>
    {/* round-5 UX-202 / round-6 UX-116: the same footer as the other public pages, across the whole width */}
    <PublicFooter />
    </div>
  )
}
