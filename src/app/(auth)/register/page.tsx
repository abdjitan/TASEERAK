'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'

// ── تسجيل مبسّط (خطوة واحدة) ──────────────────────────────────────────────
// نجمع الحد الأدنى فقط: الدور + الاسم + اسم الشركة + الجوال + البريد + كلمة المرور.
// بقية البيانات (الموقع، القطاعات، التخصصات، التصنيف، السجل التجاري، المستندات)
// تُعبّأ لاحقاً داخل التطبيق عبر «أكمل ملفك» (/onboarding). كل تلك الأعمدة nullable،
// و handle_new_user يبني الملف من الميتاداتا الجزئية ويتجاهل الناقص.
const schema = z.object({
  role: z.enum(['contractor', 'supplier'] as const, { required_error: 'اختر نوع الحساب' }),
  full_name: z.string().min(3, 'الاسم مطلوب'),
  company_name_ar: z.string().min(2, 'اسم الشركة أو النشاط مطلوب'),
  phone: z.string().regex(/^05[0-9]{8}$/, 'رقم الجوال مطلوب — 10 أرقام ويبدأ بـ 05'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
})
type FormData = z.infer<typeof schema>

const TR = {
  ar: {
    title: 'أنشئ حسابك', sub: 'دقيقة واحدة للبدء — تُكمل بياناتك بعد الدخول',
    supplier: 'مورد', supplierDesc: 'أعرض منتجاتي وأستقبل طلبات',
    contractor: 'مقاول', contractorDesc: 'أبحث عن موردين وأطلب تسعيرات',
    accountType: 'نوع الحساب', fullName: 'الاسم الكامل',
    company: 'اسم الشركة أو النشاط', companyHint: 'إن كنت فرداً اكتب اسمك',
    phone: 'رقم الجوال (واتساب)', email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordPh: '8 أحرف على الأقل',
    create: 'إنشاء الحساب ←', creating: 'جارٍ الإنشاء...', haveAccount: 'لديك حساب؟', login: 'تسجيل الدخول',
    chooseType: 'اختر نوع الحساب أولاً', phoneTaken: 'رقم الجوال مسجّل مسبقاً — استخدم رقماً آخر.',
    emailTaken: 'هذا الإيميل مسجّل مسبقاً — ', signInInstead: 'سجّل الدخول.',
    agreePre: 'أوافق على ', terms: 'الشروط والأحكام', and: ' و', privacy: 'سياسة الخصوصية',
    agreeErr: 'يجب الموافقة على الشروط وسياسة الخصوصية',
    captchaErr: 'يرجى إكمال خطوة التحقق (أنا لست روبوت) ثم إعادة المحاولة.',
    verifyTitle: 'فعّل بريدك الإلكتروني', verifyBody: 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني. افتحه لتفعيل حسابك، ثم سجّل الدخول.',
    verifyNext: 'بعد الدخول ستكمل بياناتك (الموقع، القطاعات، والتوثيق) بخطوات سهلة.',
    goSignIn: 'الذهاب لتسجيل الدخول', home: '🏠 الرئيسية',
  },
  en: {
    title: 'Create your account', sub: 'One minute to start — finish your details after signing in',
    supplier: 'Supplier', supplierDesc: 'List products & receive requests',
    contractor: 'Contractor', contractorDesc: 'Find suppliers & request quotes',
    accountType: 'Account type', fullName: 'Full name',
    company: 'Company or business name', companyHint: 'If you are an individual, use your name',
    phone: 'Phone (WhatsApp)', email: 'Email address', password: 'Password', passwordPh: 'At least 8 characters',
    create: 'Create account →', creating: 'Creating...', haveAccount: 'Have an account?', login: 'Sign In',
    chooseType: 'Choose your account type first', phoneTaken: 'This phone is already registered — use another.',
    emailTaken: 'This email is already registered — ', signInInstead: 'sign in.',
    agreePre: 'I agree to the ', terms: 'Terms & Conditions', and: ' and ', privacy: 'Privacy Policy',
    agreeErr: 'You must agree to the Terms & Privacy Policy',
    captchaErr: 'Please complete the “I am human” check and try again.',
    verifyTitle: 'Verify your email', verifyBody: 'We sent a confirmation link to your email. Open it to activate your account, then sign in.',
    verifyNext: 'After signing in you will complete your details (location, sectors, verification) in easy steps.',
    goSignIn: 'Go to sign in', home: '🏠 Home',
  },
  ur: {
    title: 'اپنا اکاؤنٹ بنائیں', sub: 'شروع کرنے کے لیے ایک منٹ — تفصیلات سائن اِن کے بعد مکمل کریں',
    supplier: 'سپلائر', supplierDesc: 'مصنوعات دکھائیں اور درخواستیں وصول کریں',
    contractor: 'ٹھیکیدار', contractorDesc: 'سپلائرز تلاش کریں اور قیمتیں طلب کریں',
    accountType: 'اکاؤنٹ کی قسم', fullName: 'پورا نام',
    company: 'کمپنی یا کاروبار کا نام', companyHint: 'انفرادی ہیں تو اپنا نام لکھیں',
    phone: 'فون (واٹس ایپ)', email: 'ای میل', password: 'پاسورڈ', passwordPh: 'کم از کم 8 حروف',
    create: 'اکاؤنٹ بنائیں →', creating: 'بن رہا ہے...', haveAccount: 'اکاؤنٹ ہے؟', login: 'سائن ان',
    chooseType: 'پہلے اکاؤنٹ کی قسم منتخب کریں', phoneTaken: 'یہ فون پہلے سے رجسٹرڈ ہے — دوسرا استعمال کریں۔',
    emailTaken: 'یہ ای میل پہلے سے رجسٹرڈ ہے — ', signInInstead: 'سائن اِن کریں۔',
    agreePre: 'میں متفق ہوں ', terms: 'شرائط و ضوابط', and: ' اور ', privacy: 'پرائیویسی پالیسی',
    agreeErr: 'شرائط اور پرائیویسی پالیسی سے اتفاق ضروری ہے',
    captchaErr: 'براہ کرم تصدیق مکمل کریں (میں روبوٹ نہیں ہوں) اور دوبارہ کوشش کریں۔',
    verifyTitle: 'اپنا ای میل تصدیق کریں', verifyBody: 'ہم نے آپ کے ای میل پر تصدیقی لنک بھیجا ہے۔ اسے کھول کر اکاؤنٹ فعال کریں، پھر سائن ان کریں۔',
    verifyNext: 'سائن اِن کے بعد آپ اپنی تفصیلات (مقام، شعبے، تصدیق) آسان مراحل میں مکمل کریں گے۔',
    goSignIn: 'سائن ان پر جائیں', home: '🏠 مرکزی صفحہ',
  },
}

export default function RegisterPage() {
  const { locale, dir } = useTranslation()
  const t = TR[locale] || TR.ar
  const supabase = createClient()

  const [selectedType, setSelectedType] = useState<'contractor' | 'supplier' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  const [phoneDup, setPhoneDup] = useState(false)
  const [emailDup, setEmailDup] = useState(false)

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema), mode: 'onChange',
  })

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
    if (!agreedToTerms) { setFormError(t.agreeErr); return }
    if (phoneDup) { setFormError(t.phoneTaken); return }
    if (await checkEmailDup(data.email)) { setFormError(''); return }
    setSubmitting(true); setFormError('')
    try {
      // الميتاداتا الدنيا — handle_new_user يبني الملف منها. الباقي يُعبّأ في /onboarding.
      const meta = {
        role: data.role,
        full_name: data.full_name.trim(),
        company_name_ar: data.company_name_ar.trim() || data.full_name.trim(),
        phone: data.phone,
        preferred_language: locale,
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
      setFormError(/captcha/i.test(msg) ? t.captchaErr : (msg || 'حدث خطأ أثناء التسجيل'))
    } finally { setSubmitting(false) }
  }

  // شاشة تأكيد البريد
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas" dir={dir}>
        <div className="absolute top-4 left-4"><LanguageSwitcher variant="minimal" /></div>
        <a href="/" className="absolute top-4 right-4 text-sm font-medium text-gray-500 hover:text-navy transition-colors">{t.home}</a>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-xl font-bold text-navy mb-2">{t.verifyTitle}</h1>
          <p className="text-sm text-gray-500 mb-2">{t.verifyBody}</p>
          <p className="text-xs text-gray-400 mb-6">{t.verifyNext}</p>
          <a href="/login" className="inline-block w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#1B2D5B' }}>{t.goSignIn}</a>
        </div>
      </div>
    )
  }

  const roleCards = [
    { type: 'contractor', title: t.contractor, desc: t.contractorDesc, svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M3 21V8l6-5 6 5v13" /><path d="M15 21V11l6 4v6" /></svg> },
    { type: 'supplier', title: t.supplier, desc: t.supplierDesc, svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> },
  ]

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

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-line max-w-xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-navy">{t.title}</h1>
            <p className="text-ink-2 mt-2 text-sm">{t.sub}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-start">
            {/* نوع الحساب */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">{t.accountType} *</label>
              <div className="grid grid-cols-2 gap-3">
                {roleCards.map(({ type, title, desc, svg }) => (
                  <button key={type} type="button" onClick={() => { setSelectedType(type as any); setValue('role', type as any, { shouldValidate: true }) }}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${selectedType === type ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 bg-white hover:border-[#F5831F]/40'}`}>
                    <div className="w-12 h-12 rounded-2xl grid place-items-center mx-auto mb-2 text-white transition-colors" style={{ background: selectedType === type ? '#F5831F' : '#1B2D5B' }}>{svg}</div>
                    <div className="font-bold text-navy text-sm">{title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t.fullName} *</label>
                <input {...register('full_name')} className="input-field" placeholder={locale === 'en' ? 'Mohammed Al-Otaibi' : 'محمد العتيبي'} />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t.phone} *</label>
                <input {...register('phone')} className="input-field" placeholder="05XXXXXXXX" type="tel" inputMode="numeric" maxLength={10} dir="ltr"
                  onInput={(e: any) => { const v = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 10); e.currentTarget.value = v; if (v.length === 10) checkPhoneDup(v); else setPhoneDup(false) }} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            {phoneDup && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">⚠ {t.phoneTaken}</p>}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.company} * <span className="text-gray-400 font-normal">— {t.companyHint}</span></label>
              <input {...register('company_name_ar')} className="input-field" placeholder="شركة الصخر للمقاولات" />
              {errors.company_name_ar && <p className="text-red-500 text-xs mt-1">{errors.company_name_ar.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.email} *</label>
              <input {...register('email', { onBlur: (e) => checkEmailDup(e.target.value), onChange: () => { if (emailDup) setEmailDup(false) } })}
                className="input-field" placeholder="name@company.com" type="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              {emailDup && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2 mt-1">⚠ {t.emailTaken}<a href="/login" className="underline font-bold">{t.signInInstead}</a></p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.password} *</label>
              <input {...register('password')} className="input-field" type="password" placeholder={t.passwordPh} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{formError}</div>}

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreedToTerms} onChange={(e: any) => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1B2D5B] flex-shrink-0" />
              <span className="text-xs text-gray-600 leading-relaxed">
                {t.agreePre}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#F5831F' }}>{t.terms}</a>
                {t.and}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#F5831F' }}>{t.privacy}</a>
              </span>
            </label>

            <div className="flex justify-center">
              <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} />
            </div>

            <button type="submit" disabled={submitting || !agreedToTerms || !selectedType}
              onClick={async () => { if (!selectedType) { setFormError(t.chooseType); return } await trigger() }}
              className="btn-orange w-full disabled:opacity-50">
              {submitting ? t.creating : t.create}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
