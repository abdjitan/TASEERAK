'use client'

import Link from 'next/link'
import { rememberPostSignupNext } from '@/lib/postSignupNext'
import { useState, useRef, useEffect } from 'react'
import { TERMS_VERSION } from '@/lib/legal'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'
import { PHONE_OTP_ENABLED } from '@/lib/features'
import { SELLER_KINDS, rememberedSignupKind } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { captureRef } from '@/lib/referral'
import { friendlyError } from '@/lib/friendlyError'
import { passwordProblems, PASS_RULES_SUMMARY } from '@/lib/passwordPolicy'
import { toLatinDigits } from '@/lib/phone'

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
  phone: z.string().regex(/^05[0-9]{8}$/, 'رقم الجوال مطلوب — 10 أرقام ويبدأ بـ 05'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().refine(v => passwordProblems(v).length === 0, 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، وحرف إنجليزي كبير، وحرف صغير، ورقم'),
})
type FormData = z.infer<typeof schema>

const TR = {
  ar: {
    title: 'أنشئ حسابك', sub: 'دقيقة واحدة وتبدأ',
    supTitle: 'سجّل كمورد', supSub: 'بيانات نشاطك الأساسية الآن، والموقع والأقسام والتوثيق بعد الدخول',
    toSupplier: 'صاحب محل أو مورد مواد؟', toSupplierCta: 'سجّل كمورد',
    toBuyer: 'تحتاج أسعاراً لمشروعك؟', toBuyerCta: 'سجّل لطلب الأسعار',
    supplier: 'أقدّم أسعار المواد', supplierDesc: 'شركة أو محل أو مصنع أو بائع مستقل',
    contractor: 'أبحث عن أسعار', contractorDesc: 'اطلب أسعار المواد من الموردين وقارن العروض',
    accountType: 'نوع الحساب', fullName: 'الاسم الكامل', pickTitle: 'كيف ستستخدم تسعيرك؟', pickSub: 'اختر نوع حسابك للمتابعة', change: 'تغيير',
    company: 'اسم المحل أو النشاط التجاري', companyHint: 'يظهر للمشترين على عروضك',
    brandH: 'ابدأ مجاناً خلال دقيقة.', brandP: 'حساب واحد تطلب به الأسعار أو تقدّمها، وتتابع كل شيء من الطلب إلى أمر الشراء.',
    l1: 'أرسل قائمة موادك مرة واحدة، وتصلك عروض عدة موردين', l2: 'قارن واختر الأرخص لكل مادة', l3: 'مجاني خلال الإطلاق، بلا عمولة',
    corpQ: 'شركة لديها فريق مشتريات؟', corpA: 'نجهّز لك حساباً للشركة يضم موظفيك — تواصل معنا',
    copyright: '© 2026 تسعيرك · منصة التسعير والتوريد لمواد البناء',
    phone: 'رقم الجوال (واتساب)', email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordPh: '8 أحرف: كبير وصغير ورقم',
    create: 'إنشاء الحساب ←', creating: 'جارٍ الإنشاء...', haveAccount: 'لديك حساب؟', login: 'تسجيل الدخول',
    chooseType: 'اختر نوع الحساب أولاً', phoneTaken: 'رقم الجوال مسجّل مسبقاً — استخدم رقماً آخر.',
    emailTaken: 'هذا البريد الإلكتروني مسجّل مسبقاً — ', signInInstead: 'سجّل الدخول.',
    agreePre: 'أوافق على ', terms: 'الشروط والأحكام', and: ' و', privacy: 'سياسة الخصوصية',
    agreeErr: 'يجب الموافقة على الشروط وسياسة الخصوصية',
    captchaErr: 'يرجى إكمال خطوة التحقق (لستُ روبوتاً) ثم إعادة المحاولة.',
    verifyTitle: 'فعّل بريدك الإلكتروني', verifyBody: 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني. افتحه لتفعيل حسابك، ثم سجّل الدخول.',
    verifyNext: 'بعد الدخول ستكمل بياناتك (الموقع، القطاعات، والتوثيق) بخطوات سهلة.',
    goSignIn: 'الذهاب لتسجيل الدخول', home: 'الرئيسية',
  },
  en: {
    title: 'Create your account', sub: 'One minute and you are in',
    supTitle: 'Register as a supplier', supSub: 'Your basic business details now; location, categories and verification after signing in',
    toSupplier: 'Own a shop or supply materials?', toSupplierCta: 'Register as a supplier',
    toBuyer: 'Need prices for your project?', toBuyerCta: 'Sign up to request prices',
    supplier: 'I provide prices', supplierDesc: 'Company, shop, factory or independent seller',
    contractor: 'I need prices', contractorDesc: 'Request material prices from suppliers and compare quotes',
    accountType: 'Account type', fullName: 'Full name', pickTitle: 'How will you use Taseerak?', pickSub: 'Choose your account type to continue', change: 'Change',
    company: 'Shop or business name', companyHint: 'Shown to buyers on your offers',
    brandH: 'Start free in a minute.', brandP: 'One account to request prices or to quote them, and follow everything from request to purchase order.',
    l1: 'Send your list once and get quotes from several suppliers', l2: 'Compare and pick the cheapest for each item', l3: 'Free during launch, no commission',
    corpQ: 'A company with a procurement team?', corpA: 'We set up a company account for your staff — contact us',
    copyright: '© 2026 Taseerak · Procurement platform for construction materials',
    phone: 'Phone (WhatsApp)', email: 'Email address', password: 'Password', passwordPh: '8+ chars: Aa + number',
    create: 'Create account →', creating: 'Creating...', haveAccount: 'Have an account?', login: 'Sign In',
    chooseType: 'Choose your account type first', phoneTaken: 'This phone is already registered — use another.',
    emailTaken: 'This email is already registered — ', signInInstead: 'sign in.',
    agreePre: 'I agree to the ', terms: 'Terms & Conditions', and: ' and ', privacy: 'Privacy Policy',
    agreeErr: 'You must agree to the Terms & Privacy Policy',
    captchaErr: 'Please complete the “I am human” check and try again.',
    verifyTitle: 'Verify your email', verifyBody: 'We sent a confirmation link to your email. Open it to activate your account, then sign in.',
    verifyNext: 'After signing in you will complete your details (location, sectors, verification) in easy steps.',
    goSignIn: 'Go to sign in', home: 'Home',
  },
  ur: {
    title: 'اپنا اکاؤنٹ بنائیں', sub: 'ایک منٹ اور آپ اندر ہیں',
    supTitle: 'سپلائر کے طور پر رجسٹر کریں', supSub: 'ابھی کاروبار کی بنیادی تفصیلات؛ مقام، شعبے اور تصدیق سائن اِن کے بعد',
    toSupplier: 'دکان ہے یا سامان سپلائی کرتے ہیں؟', toSupplierCta: 'سپلائر کے طور پر رجسٹر کریں',
    toBuyer: 'اپنے پروجیکٹ کے لیے قیمتیں چاہییں؟', toBuyerCta: 'قیمتیں منگوانے کے لیے رجسٹر کریں',
    supplier: 'میں قیمتیں دیتا ہوں', supplierDesc: 'کمپنی، دکان، فیکٹری یا آزاد فروخت کنندہ',
    contractor: 'مجھے قیمتیں چاہییں', contractorDesc: 'قیمتیں منگوائیں اور موازنہ کریں',
    accountType: 'اکاؤنٹ کی قسم', fullName: 'پورا نام', pickTitle: 'آپ تسعیرک کیسے استعمال کریں گے؟', pickSub: 'جاری رکھنے کے لیے اکاؤنٹ کی قسم منتخب کریں', change: 'تبدیل کریں',
    company: 'دکان یا کاروبار کا نام', companyHint: 'خریدار آپ کی آفر پر یہی نام دیکھیں گے',
    brandH: 'ایک منٹ میں مفت شروع کریں۔', brandP: 'ایک اکاؤنٹ سے قیمتیں منگوائیں یا دیں، اور درخواست سے پرچیز آرڈر تک سب کچھ دیکھیں۔',
    l1: 'اپنی فہرست ایک بار بھیجیں، کئی سپلائرز کی آفرز پائیں', l2: 'موازنہ کریں اور ہر چیز کی سستی قیمت چنیں', l3: 'لانچ کے دوران مفت، کوئی کمیشن نہیں',
    corpQ: 'خریداری ٹیم والی کمپنی؟', corpA: 'ہم آپ کے عملے کے لیے کمپنی اکاؤنٹ بناتے ہیں — رابطہ کریں',
    copyright: '© 2026 تسعیرک · تعمیراتی سامان کی قیمتوں کا پلیٹ فارم',
    phone: 'فون (واٹس ایپ)', email: 'ای میل', password: 'پاسورڈ', passwordPh: '8 حروف: Aa + ہندسہ',
    create: 'اکاؤنٹ بنائیں →', creating: 'بن رہا ہے...', haveAccount: 'اکاؤنٹ ہے؟', login: 'سائن ان',
    chooseType: 'پہلے اکاؤنٹ کی قسم منتخب کریں', phoneTaken: 'یہ فون پہلے سے رجسٹرڈ ہے — دوسرا استعمال کریں۔',
    emailTaken: 'یہ ای میل پہلے سے رجسٹرڈ ہے — ', signInInstead: 'سائن اِن کریں۔',
    agreePre: 'میں متفق ہوں ', terms: 'شرائط و ضوابط', and: ' اور ', privacy: 'پرائیویسی پالیسی',
    agreeErr: 'شرائط اور پرائیویسی پالیسی سے اتفاق ضروری ہے',
    captchaErr: 'براہ کرم تصدیق مکمل کریں (میں روبوٹ نہیں ہوں) اور دوبارہ کوشش کریں۔',
    verifyTitle: 'اپنا ای میل تصدیق کریں', verifyBody: 'ہم نے آپ کے ای میل پر تصدیقی لنک بھیجا ہے۔ اسے کھول کر اکاؤنٹ فعال کریں، پھر سائن ان کریں۔',
    verifyNext: 'سائن اِن کے بعد آپ اپنی تفصیلات (مقام، شعبے، تصدیق) آسان مراحل میں مکمل کریں گے۔',
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
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  const [phoneDup, setPhoneDup] = useState(false)
  const [emailDup, setEmailDup] = useState(false)

  const { register, handleSubmit, watch, setValue, trigger, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema), mode: 'onChange', defaultValues: { role: 'contractor' },
  })
  const switchTo = (r: 'contractor' | 'supplier') => {
    setSelectedType(r); setValue('role', r, { shouldValidate: true }); setFormError('')
    if (r === 'supplier' && !sellerKind) { const k = rememberedSignupKind(); if (k === 'company' || k === 'independent') setSellerKind(k) }
  }

  // اختيار مسبق للدور من الرابط (?role=contractor|supplier) — لروابط الدعوة/الهبوط الموجّهة
  useEffect(() => {
    captureRef() // «ادعُ من تعرفه»: keep ?ref= before any redirect
    try {
      // Phone + WhatsApp OTP is the main way in; this email form stays for ?email=1.
      // ?next= (same-origin path): where to land after sign-up + onboarding, e.g. a landing section card
      rememberPostSignupNext(new URLSearchParams(window.location.search).get('next'))
      if (PHONE_OTP_ENABLED && new URLSearchParams(window.location.search).get('email') !== '1') { window.location.replace('/login'); return }
      const qs = new URLSearchParams(window.location.search)
      const k = qs.get('kind')
      if (qs.get('role') === 'supplier' || k === 'company' || k === 'independent') {
        switchTo('supplier')
        if (k === 'company' || k === 'independent') setSellerKind(k)
      }
    } catch {}
  }, [])

  // فحص التكرار قبل الإنشاء — الجوال والبريد فريدان (خصوصية: نُرجع boolean فقط بلا اسم)
  async function checkPhoneDup(phone: string) {
    if (!/^05[0-9]{8}$/.test(phone)) { setPhoneDup(false); return }
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
    if (data.role === 'supplier' && !sellerKind) { setFormError(locale === 'en' ? 'Choose: a company / shop, or an independent seller' : locale === 'ur' ? 'منتخب کریں: کمپنی / دکان یا آزاد فروخت کنندہ' : 'اختر نوع نشاطك: شركة أو محل، أو بائع مستقل'); return }
    if (!agreedToTerms) { setFormError(t.agreeErr); return }
    const soloSeller = data.role === 'supplier' && sellerKind === 'independent'
    const asksBusiness = data.role === 'supplier' && !soloSeller
    if (asksBusiness && (data.company_name_ar || '').trim().length < 2) {
      setError('company_name_ar', { message: locale === 'en' ? 'Company or business name is required' : locale === 'ur' ? 'کمپنی یا کاروبار کا نام ضروری ہے' : 'اسم المحل أو النشاط التجاري مطلوب' }); return
    }
    if (phoneDup) { setFormError(t.phoneTaken); return }
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
        ...(data.role === 'supplier' ? { seller_kind: sellerKind } : {}),
        terms_version: TERMS_VERSION, client: 'web',
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email, password: data.password,
        options: { data: meta, emailRedirectTo: `${window.location.origin}/login`, captchaToken: captchaToken || undefined },
      })
      if (authError) throw new Error(authError.message)

      // تأكيد البريد مفعّل → لا جلسة: نعرض شاشة «فعّل بريدك».
      if (!authData.session) { setEmailSent(true); return }
      // تأكيد البريد معطّل → لدينا جلسة: نوجّه مباشرة لإكمال الملف.
      window.location.href = '/onboarding'
    } catch (err: any) {
      captchaRef.current?.reset(); setCaptchaToken('')
      const msg = err?.message || ''
      setFormError(/captcha/i.test(msg) ? t.captchaErr : /database error|duplicate|unique/i.test(msg) ? t.phoneTaken : friendlyError(msg, locale === 'en' ? 'Something went wrong while signing up. Please try again.' : locale === 'ur' ? 'رجسٹریشن کے دوران خرابی ہوئی، دوبارہ کوشش کریں۔' : 'حدث خطأ أثناء التسجيل، حاول مرة أخرى.', locale))
    } finally { setSubmitting(false) }
  }

  // شاشة تأكيد البريد
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas" dir={dir}>
        <div className="absolute top-4 end-4"><LanguageSwitcher variant="minimal" /></div>
        <a href="/" className="absolute top-4 start-4 text-sm font-medium text-gray-500 hover:text-navy transition-colors">{t.home}</a>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-5xl mb-4"><Glyph e="📬" /></div>
          <h1 className="text-xl font-bold text-navy mb-2">{t.verifyTitle}</h1>
          <p className="text-sm text-gray-500 mb-2">{t.verifyBody}</p>
          <p className="text-xs text-gray-500 mb-6">{t.verifyNext}</p>
          <Link href="/login" className="inline-block w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{t.goSignIn}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen min-h-screen flex" dir={dir}>
      {/* ===== Brand panel (wide screens), same as the login page ===== */}
      <div className="auth-brand-panel hidden lg:flex lg:w-[42%] relative overflow-hidden flex-col justify-between p-12 text-white">
        <a href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-brand-lockup" />
        </a>
        <div className="max-w-md">
          <h2 className="text-3xl xl:text-[40px] font-extrabold leading-[1.25] mb-4">{t.brandH}</h2>
          <p className="text-blue-100/80 text-base mb-8 leading-relaxed">{t.brandP}</p>
          <ul className="space-y-4">
            {[t.l1, t.l2, t.l3].map((it, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px] text-blue-50">
                <span className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: '#D4A543' }}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#071827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </span>{it}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-blue-200/50">{t.copyright}</div>
      </div>

      {/* ===== Form panel ===== */}
      <div className="auth-form-side flex-1 flex flex-col">
        <div className="flex items-center justify-between p-5">
          <a href="/" className="flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-navy transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
            {t.home}
          </a>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-orange-dark hover:underline">{t.haveAccount} {t.login}</Link>
            <LanguageSwitcher variant="minimal" />
          </div>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-5 pb-12">
          <div className="auth-form-card w-full max-w-[600px] bg-white rounded-2xl p-6 sm:p-9 shadow-sm border border-line">
            <div className="flex lg:hidden items-center justify-center mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-mobile-lockup" />
            </div>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-navy">{selectedType === 'supplier' ? t.supTitle : t.title}</h1>
              <p className="text-ink-2 mt-1.5 text-sm">{selectedType === 'supplier' ? t.supSub : t.sub}</p>
            </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-start">
            {selectedType === 'supplier' && (
            <div>
                <p className="text-sm font-bold text-navy mb-2">{locale === 'en' ? 'How do you sell? *' : locale === 'ur' ? 'آپ کیسے بیچتے ہیں؟ *' : 'ما نوع نشاطك؟ *'}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['company', 'independent'] as const).map(k => {
                    const on = sellerKind === k
                    const info = SELLER_KINDS[k]
                    return (
                      <button key={k} type="button" onClick={() => { setSellerKind(k); setFormError('') }} aria-pressed={on}
                        className={`p-4 rounded-xl border-2 text-start transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10 shadow-sm' : 'border-gray-200 bg-white hover:border-[#D4A543]/60'}`}>
                        <div className="font-extrabold text-navy text-sm">{on ? '✓ ' : ''}<SellerIcon name={info.icon} /> {locale === 'en' ? info.en : locale === 'ur' ? info.ur : info.ar}</div>
                        <div className="text-xs text-gray-500 mt-1 leading-relaxed">{locale === 'en' ? info.sub.en : locale === 'ur' ? info.sub.ur : info.sub.ar}</div>
                      </button>
                    )
                  })}
                </div>
            </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-600 mb-1">{t.fullName} *</label>
                <input id="reg-name" {...register('full_name')} autoComplete="name" className="input-field" placeholder={locale === 'en' ? 'Mohammed Al-Otaibi' : locale === 'ur' ? 'محمد العتیبی' : 'محمد العتيبي'} />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{vmsg(errors.full_name.message, locale)}</p>}
              </div>
              <div>
                <label htmlFor="reg-phone" className="block text-xs font-semibold text-gray-600 mb-1">{t.phone} *</label>
                <input id="reg-phone" {...register('phone')} autoComplete="tel-national" className="input-field" placeholder="05XXXXXXXX" type="tel" inputMode="numeric" maxLength={10} dir="ltr"
                  onInput={(e: any) => { const v = toLatinDigits(e.currentTarget.value).replace(/[^0-9]/g, '').slice(0, 10); e.currentTarget.value = v; if (v.length === 10) checkPhoneDup(v); else setPhoneDup(false) }} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{vmsg(errors.phone.message, locale)}</p>}
              </div>
            </div>
            {phoneDup && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2"><Glyph e="⚠" /> {t.phoneTaken}</p>}

            {selectedType === 'supplier' && sellerKind === 'company' && <div>
              <label htmlFor="reg-company" className="block text-xs font-semibold text-gray-600 mb-1">{t.company} * <span className="text-gray-500 font-normal">— {t.companyHint}</span></label>
              <input id="reg-company" {...register('company_name_ar')} autoComplete="organization" className="input-field" placeholder={locale === 'en' ? 'Al-Sakhr Building Materials' : locale === 'ur' ? 'الصخر بلڈنگ میٹریلز' : 'مؤسسة الصخر لمواد البناء'} />
              {errors.company_name_ar && <p className="text-red-500 text-xs mt-1">{vmsg(errors.company_name_ar.message, locale)}</p>}
            </div>}

            <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-gray-600 mb-1">{t.email} *</label>
              <input id="reg-email" autoComplete="email" dir="ltr" {...register('email', { onBlur: (e) => checkEmailDup(e.target.value), onChange: () => { if (emailDup) setEmailDup(false) } })}
                className="input-field" placeholder="name@example.com" type="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{vmsg(errors.email.message, locale)}</p>}
              {emailDup && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2 mt-1"><Glyph e="⚠" /> {t.emailTaken}<Link href="/login" className="underline font-bold">{t.signInInstead}</Link></p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-gray-600 mb-1">{t.password} *</label>
              <input id="reg-password" {...register('password')} autoComplete="new-password" className="input-field" type="password" placeholder={t.passwordPh} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{vmsg(errors.password.message, locale)}</p>}
            </div>
            </div>

            {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{formError}</div>}

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreedToTerms} onChange={(e: any) => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0B2438] flex-shrink-0" />
              <span className="text-xs text-gray-600 leading-relaxed">
                {t.agreePre}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#8F6820' }}>{t.terms}</a>
                {t.and}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#8F6820' }}>{t.privacy}</a>
              </span>
            </label>

            <div className="flex justify-center">
              <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} />
            </div>

            <button type="submit" disabled={submitting || !agreedToTerms}
              onClick={async () => { await trigger() }}
              className="btn-orange w-full disabled:opacity-50">
              {submitting ? t.creating : t.create}
            </button>
          </form>

            {/* switch buyer ⇄ supplier, then «have an account?» */}
            <button type="button" onClick={() => switchTo(selectedType === 'supplier' ? 'contractor' : 'supplier')}
              className="mt-5 w-full rounded-xl border border-line bg-gray-50 hover:bg-gray-100 px-4 py-3 text-sm text-ink-2 transition-colors">
              {selectedType === 'supplier' ? t.toBuyer : t.toSupplier}{' '}
              <span className="font-extrabold" style={{ color: '#8F6820' }}>{selectedType === 'supplier' ? t.toBuyerCta : t.toSupplierCta}</span>
            </button>
            <p className="mt-3 text-sm text-ink-2 text-center">{t.haveAccount} <Link href="/login" className="font-extrabold text-orange-dark hover:underline">{t.login}</Link></p>

            {/* company accounts with several procurement staff are set up with us, not here */}
            {selectedType === 'contractor' && <p className="mt-5 pt-4 border-t border-line text-xs text-gray-500 text-center">
              {t.corpQ} <a href="mailto:info@taseerak.com?subject=%D8%AD%D8%B3%D8%A7%D8%A8%20%D8%B4%D8%B1%D9%83%D8%A9" className="font-bold hover:underline" style={{ color: '#8F6820' }}>{t.corpA}</a>
            </p>}
          </div>
        </div>
      </div>
    </div>
  )
}
