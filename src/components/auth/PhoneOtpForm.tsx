'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n'
import { toLatinDigits } from '@/lib/phone'
import { FIREBASE_CONFIG, firebaseReady, toE164 } from '@/lib/firebaseConfig'
import { TERMS_VERSION } from '@/lib/legal'
import { createClient } from '@/lib/supabase/client'
import BuyerTypeCards from '@/components/auth/BuyerTypeCards'

// Buyer phone entry (owner 2026-11-17): one form for sign-in and sign-up. A Google SMS code
// (Firebase phone auth) proves the number; /api/auth/phone-session signs the buyer in, or — when the
// number has no account yet — asks for the name and creates a buyer account (migration 220).
// Sellers sign in with email + password.
const TX = {
  ar: {
    phone: 'رقم جوالك', phoneHint: 'سيصلك رمز التحقق برسالة نصية (SMS)', send: 'أرسل الرمز', sending: 'جارٍ الإرسال…',
    badPhone: 'اكتب رقم جوال سعودي بصيغة 05XXXXXXXX، أو رقماً إماراتياً أو أردنياً مع رمز الدولة (‎+971‎ أو ‎+962‎).', codeTitle: 'اكتب الرمز', codeSent: 'أرسلنا رمزاً من 6 أرقام برسالة نصية إلى',
    verify: 'تأكيد والدخول', verifying: 'جارٍ التحقق…', creating: 'جارٍ إنشاء حسابك…', badCode: 'الرمز غير صحيح. تحقّق منه وأعد كتابته، أو اطلب رمزاً جديداً.', expiredCode: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.', sessionGone: 'انتهت صلاحية التحقق. أعد إرسال الرمز إلى رقمك.',
    resend: 'أعد إرسال الرمز', resendIn: 'إعادة الإرسال بعد', sec: 'ثانية', change: 'تغيير الرقم', resent: 'أرسلنا رمزاً جديداً إلى',
    emailAccount: 'هذا الرقم مسجّل لحساب يدخل بالبريد الإلكتروني ولم يُوثَّق جواله بعد. ادخل بالبريد الإلكتروني وكلمة المرور.', emailBtn: 'الدخول بالبريد الإلكتروني',
    rate: 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.', sendFail: 'تعذّر إرسال الرمز. تأكد من الرقم ثم أعد المحاولة.',
    smsDown: 'تعذّر إرسال الرمز الآن. يمكنك إنشاء حسابك بالبريد الإلكتروني بدلاً من ذلك.', smsDownCreate: 'أنشئ حساباً بالبريد', smsDownLogin: 'لديك حساب؟ ادخل بالبريد',
    newTitle: 'أهلاً بك في تسعيرك', newSub: 'هذا الرقم جديد. اكتب اسمك لإنشاء حساب مشتري.', name: 'الاسم', create: 'إنشاء الحساب والدخول',
    terms1: 'أوافق على', terms: 'الشروط والأحكام', and: 'و', privacy: 'سياسة الخصوصية', badName: 'اكتب اسمك.', needTerms: 'وافق على الشروط وسياسة الخصوصية للمتابعة.',
    useEmail: 'هذا الحساب يدخل بالبريد الإلكتروني وكلمة المرور.', failed: 'تعذّر الدخول. حاول مرة أخرى.',
  },
  en: {
    phone: 'Your mobile number', phoneHint: 'You will get a code by text message (SMS)', send: 'Send code', sending: 'Sending…',
    badPhone: 'Type a Saudi mobile number like 05XXXXXXXX, or a UAE or Jordanian number with its country code (+971 or +962).', codeTitle: 'Enter the code', codeSent: 'We sent a 6-digit code by SMS to',
    verify: 'Verify and continue', verifying: 'Verifying…', creating: 'Creating your account…', badCode: 'The code is not correct. Check it and type it again, or request a new one.', expiredCode: 'The code has expired. Request a new one.', sessionGone: 'The verification has expired. Send the code to your number again.',
    resend: 'Resend code', resendIn: 'Resend in', sec: 'seconds', change: 'Change number', resent: 'We sent a new code to',
    emailAccount: 'This number belongs to an account that signs in with email and has not verified its mobile yet. Sign in with your email and password.', emailBtn: 'Sign in with email',
    rate: 'Too many attempts. Wait a little and try again.', sendFail: 'Could not send the code. Check the number and try again.',
    smsDown: 'We cannot send the code right now. You can create your account with your email instead.', smsDownCreate: 'Create an account with email', smsDownLogin: 'Have an account? Sign in with email',
    newTitle: 'Welcome to Taseerak', newSub: 'This number is new. Write your name to create a buyer account.', name: 'Name', create: 'Create account and continue',
    terms1: 'I agree to the', terms: 'Terms', and: 'and', privacy: 'Privacy Policy', badName: 'Write your name.', needTerms: 'Accept the Terms and Privacy Policy to continue.',
    useEmail: 'This account signs in with email and password.', failed: 'Could not sign in. Try again.',
  },
  ur: {
    phone: 'آپ کا موبائل نمبر', phoneHint: 'تصدیقی کوڈ ٹیکسٹ میسج (SMS) سے آئے گا', send: 'کوڈ بھیجیں', sending: 'بھیجا جا رہا ہے…',
    badPhone: 'سعودی موبائل نمبر 05XXXXXXXX کی صورت میں لکھیں، یا اماراتی یا اردنی نمبر ملک کے کوڈ کے ساتھ (‎+971‎ یا ‎+962‎)۔', codeTitle: 'کوڈ درج کریں', codeSent: 'ہم نے SMS سے 6 ہندسوں کا کوڈ بھیجا',
    verify: 'تصدیق کریں اور جاری رکھیں', verifying: 'تصدیق ہو رہی ہے…', creating: 'آپ کا اکاؤنٹ بن رہا ہے…', badCode: 'کوڈ درست نہیں۔ اسے چیک کر کے دوبارہ لکھیں، یا نیا کوڈ منگوائیں۔', expiredCode: 'کوڈ کی مدت ختم ہو گئی۔ نیا کوڈ منگوائیں۔', sessionGone: 'تصدیق کی مدت ختم ہو گئی۔ اپنے نمبر پر کوڈ دوبارہ بھیجیں۔',
    resend: 'کوڈ دوبارہ بھیجیں', resendIn: 'دوبارہ بھیجیں', sec: 'سیکنڈ بعد', change: 'نمبر تبدیل کریں', resent: 'ہم نے نیا کوڈ بھیجا',
    emailAccount: 'یہ نمبر ایسے اکاؤنٹ کا ہے جو ای میل سے سائن اِن کرتا ہے اور جس کا موبائل ابھی تصدیق نہیں ہوا۔ اپنی ای میل اور پاسورڈ سے سائن اِن کریں۔', emailBtn: 'ای میل سے سائن اِن',
    rate: 'بہت زیادہ کوششیں۔ تھوڑا انتظار کریں، پھر دوبارہ کوشش کریں۔', sendFail: 'کوڈ نہیں بھیجا جا سکا۔ نمبر چیک کر کے دوبارہ کوشش کریں۔',
    smsDown: 'ابھی کوڈ نہیں بھیجا جا سکتا۔ آپ اس کے بجائے ای میل سے اپنا اکاؤنٹ بنا سکتے ہیں۔', smsDownCreate: 'ای میل سے اکاؤنٹ بنائیں', smsDownLogin: 'اکاؤنٹ ہے؟ ای میل سے سائن اِن کریں',
    newTitle: 'تسعیرک میں خوش آمدید', newSub: 'یہ نمبر نیا ہے۔ خریدار اکاؤنٹ بنانے کے لیے اپنا نام لکھیں۔', name: 'نام', create: 'اکاؤنٹ بنائیں اور جاری رکھیں',
    terms1: 'میں متفق ہوں', terms: 'شرائط', and: 'اور', privacy: 'رازداری کی پالیسی', badName: 'اپنا نام لکھیں۔', needTerms: 'جاری رکھنے کے لیے شرائط اور رازداری کی پالیسی قبول کریں۔',
    useEmail: 'یہ اکاؤنٹ ای میل اور پاسورڈ سے سائن اِن کرتا ہے۔', failed: 'سائن اِن نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
  },
}

export default function PhoneOtpForm({ onSignedIn, onUseEmail, registerHref = '/register', onStep }: {
  onSignedIn: () => void; onUseEmail?: () => void; registerHref?: string
  /** told when the step changes, so the page can hide its tabs and title during the code step (round-5 UX-121) */
  onStep?: (step: 'phone' | 'code' | 'name') => void
}) {
  const { locale } = useTranslation()
  const t = (TX as any)[locale] || TX.ar
  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone')
  const [phone, setPhone] = useState('')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [buyerType, setBuyerType] = useState<'individual' | 'business' | ''>('')
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState('') // «we sent a new code to …»
  const [emailOnly, setEmailOnly] = useState(false) // the number belongs to an email account (UX-053)
  // SMS cannot be sent for a reason that is not the user's (provider quota, billing, config): never blame
  // the number; offer an email account instead (UX-004)
  const [smsDown, setSmsDown] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<any>(null)
  const verifierRef = useRef<any>(null)
  const tokenRef = useRef<string>('')
  const boxId = useRef('recaptcha-' + Math.random().toString(36).slice(2)).current

  useEffect(() => { onStep?.(step) }, [step]) // eslint-disable-line react-hooks/exhaustive-deps
  // the first countdown has run out: a quiet way out when the text message never arrives (round-5 UX-024)
  const [waited, setWaited] = useState(false)
  useEffect(() => { if (step === 'code' && cooldown === 0) setWaited(true) }, [step, cooldown])
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])
  // the invisible reCAPTCHA lives outside the React tree so switching steps never detaches it
  useEffect(() => {
    const el = document.createElement('div'); el.id = boxId
    document.body.appendChild(el)
    return () => { try { verifierRef.current?.clear?.() } catch {} ; el.remove() }
  }, [boxId])

  async function fb() {
    const { initializeApp, getApps } = await import('firebase/app')
    const { getAuth } = await import('firebase/auth')
    const app = getApps()[0] || initializeApp(FIREBASE_CONFIG)
    const auth = getAuth(app)
    auth.languageCode = locale === 'en' ? 'en' : locale === 'ur' ? 'ur' : 'ar'
    return auth
  }

  async function sendCode(e?: any, resend = false) {
    e?.preventDefault()
    setError(''); setNotice(''); setEmailOnly(false); setSmsDown(false)
    const p = toE164(toLatinDigits(phone))
    if (!p) { setError(t.badPhone); return }
    if (!firebaseReady()) { setSmsDown(true); return }
    setLoading(true)
    try {
      const auth = await fb()
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth')
      if (!verifierRef.current) verifierRef.current = new RecaptchaVerifier(auth, boxId, { size: 'invisible' })
      confirmRef.current = await signInWithPhoneNumber(auth, p, verifierRef.current)
      setE164(p); setCode(''); setStep('code'); setCooldown(60)
      if (resend) setNotice(t.resent)
      setTimeout(() => codeRef.current?.focus(), 50)
    } catch (err: any) {
      const c = String(err?.code || '')
      console.error('phone sign-in send', c)
      // only a wrong number reads as the user's fault; too-many-requests is a real per-user limit;
      // anything else (quota-exceeded, billing, captcha/config, network on the provider side) is «SMS down»
      if (c.includes('invalid-phone') || c.includes('missing-phone')) setError(t.badPhone)
      else if (c.includes('too-many-requests')) setError(t.rate)
      else { setSmsDown(true); if (resend) setStep('phone') }
      try { verifierRef.current?.clear?.() } catch {} ; verifierRef.current = null
    } finally { setLoading(false) }
  }

  async function session(mode: 'login' | 'signup') {
    const res = await fetch('/api/auth/phone-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: tokenRef.current, mode, locale, ...(mode === 'signup' ? { full_name: name.trim(), terms_version: TERMS_VERSION, ...(buyerType ? { buyer_type: buyerType } : {}) } : {}) }),
    })
    return { ok: res.ok, j: await res.json().catch(() => ({})) }
  }

  async function verify(e?: any, value?: string) {
    e?.preventDefault()
    const token = toLatinDigits(value ?? code).replace(/[^0-9]/g, '')
    if (token.length !== 6) { setError(t.badCode); return }
    setLoading(true); setError('')
    try {
      const cred = await confirmRef.current.confirm(token)
      tokenRef.current = await cred.user.getIdToken()
      try { const auth = await fb(); const { signOut } = await import('firebase/auth'); await signOut(auth) } catch {}
      const { ok, j } = await session('login')
      if (ok) { onSignedIn(); return }
      if (j?.error === 'no_account') {
        // a number already on an email account (often a seller whose mobile is not verified yet) must
        // not become a second, buyer account: send them to the email sign-in instead (UX-053)
        let taken = false
        try { const { data } = await createClient().rpc('phone_exists', { p_phone: e164 }); taken = data === true } catch {}
        if (taken) { setError(t.emailAccount); setEmailOnly(true); setLoading(false); return }
        setStep('name'); setLoading(false); return
      }
      if (j?.error === 'phone_taken') { setError(t.emailAccount); setEmailOnly(true); setLoading(false); return }
      if (j?.error === 'use_email') setEmailOnly(true)
      setError(j?.error === 'use_email' ? t.useEmail : j?.error === 'rate_limited' ? t.rate : t.failed)
    } catch (err: any) {
      const c = String(err?.code || '')
      setError(c.includes('invalid-verification-code') ? t.badCode : c.includes('code-expired') ? t.expiredCode : t.failed)
    }
    setLoading(false)
  }

  async function create(e?: any) {
    e?.preventDefault()
    if (name.trim().length < 2) { setError(t.badName); return }
    if (!buyerType) { setError(locale === 'en' ? 'Choose who you are buying for.' : locale === 'ur' ? 'منتخب کریں کہ آپ کس کے لیے خرید رہے ہیں۔' : 'اختر لمن تشتري.'); return }
    if (!agree) { setError(t.needTerms); return }
    setLoading(true); setError('')
    const { ok, j } = await session('signup')
    if (ok) { onSignedIn(); return }
    setError(j?.error === 'invalid_code' ? t.sessionGone : t.failed)
    if (j?.error === 'invalid_code') setStep('phone')
    setLoading(false)
  }

  const errorBox = error && (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" role="alert">
      {error}
      {emailOnly && (
        onUseEmail
          ? <button type="button" onClick={onUseEmail} className="mt-2 w-full min-h-[44px] rounded-xl font-bold text-sm" style={{ background: '#D4A543', color: '#071827' }}>{t.emailBtn}</button>
          : <a href="/login?m=email" className="mt-2 w-full min-h-[44px] rounded-xl font-bold text-sm grid place-items-center" style={{ background: '#D4A543', color: '#071827' }}>{t.emailBtn}</a>
      )}
    </div>
  )

  // amber, not red: nothing is wrong with what the visitor typed (UX-004)
  const smsDownBox = smsDown && (
    <div className="bg-warn-bg border border-warn-border text-warn-text text-sm rounded-xl p-3 space-y-2" role="alert">
      <p>{t.smsDown}</p>
      <a href={registerHref} className="w-full min-h-[44px] rounded-xl font-bold text-sm grid place-items-center" style={{ background: '#D4A543', color: '#071827' }}>{t.smsDownCreate}</a>
      {onUseEmail
        ? <button type="button" onClick={onUseEmail} className="w-full min-h-[44px] rounded-xl font-bold text-sm border border-[#0B2438]/25 text-[#0B2438] bg-white">{t.smsDownLogin}</button>
        : <a href="/login?m=email" className="w-full min-h-[44px] rounded-xl font-bold text-sm grid place-items-center border border-[#0B2438]/25 text-[#0B2438] bg-white">{t.smsDownLogin}</a>}
    </div>
  )

  if (step === 'phone') {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        {smsDownBox}
        {errorBox}
        <div>
          <label htmlFor="otp-phone" className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.phone}</label>
          <input id="otp-phone" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={phone}
            onChange={(e) => setPhone(e.target.value.slice(0, 18))}
            className="input-field text-lg tracking-wide" placeholder="05XXXXXXXX" required disabled={loading} aria-describedby="otp-phone-hint" />
          <p id="otp-phone-hint" className="text-[12px] text-ink-2 mt-1.5">{t.phoneHint}</p>
        </div>
        <button type="submit" disabled={loading} className="btn-orange w-full btn-lg">{loading ? t.sending : t.send}</button>
      </form>
    )
  }

  if (step === 'name') {
    return (
      <form onSubmit={create} className="space-y-4">
        {errorBox}
        <div>
          <h2 className="text-lg font-extrabold text-navy">{t.newTitle}</h2>
          <p className="text-sm text-ink-2 mt-1">{t.newSub}</p>
          {/* the verified number, with a way back if it is the wrong one (UX-131) */}
          <p className="text-sm text-ink-2 flex items-center gap-2 flex-wrap"><span dir="ltr" className="font-bold text-navy">{e164}</span>
            <button type="button" className="min-h-[44px] font-bold text-orange-dark hover:underline" onClick={() => { setStep('phone'); setError(''); setNotice('') }}>{t.change}</button></p>
        </div>
        <div>
          <label htmlFor="otp-name" className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.name}</label>
          <input id="otp-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} autoComplete="name" className="input-field" required disabled={loading} autoFocus />
        </div>
        <BuyerTypeCards value={buyerType} onChange={setBuyerType} locale={locale} disabled={loading} />
        <label className="flex items-start gap-2 text-[13px] text-ink-2 min-h-[44px] cursor-pointer">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-[#0B2438]" />
          <span>{t.terms1} <Link href="/terms" target="_blank" className="font-bold underline">{t.terms}</Link> {t.and} <Link href="/privacy" target="_blank" className="font-bold underline">{t.privacy}</Link></span>
        </label>
        <button type="submit" disabled={loading} className="btn-orange w-full btn-lg">{loading ? t.creating : t.create}</button>
        {/* the supplier link lives once under the form on the login page (round-4 UX-115) */}
      </form>
    )
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      {errorBox}
      {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl p-3" role="status"><span>{notice} </span><span dir="ltr" className="font-bold">{e164}</span></div>}
      <div>
        <h2 className="text-lg font-bold text-navy">{t.codeTitle}</h2>
        <p className="text-sm text-ink-2 mt-1">{t.codeSent} <span dir="ltr" className="font-bold">{e164}</span></p>
      </div>
      <input ref={codeRef} id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr"
        value={code} maxLength={6}
        onChange={(e) => {
          const v = toLatinDigits(e.target.value).replace(/[^0-9]/g, '').slice(0, 6)
          setCode(v)
          if (v.length === 6 && !loading) verify(undefined, v)
        }}
        className="input-field text-center text-2xl font-bold tracking-[0.5em]" placeholder="••••••" disabled={loading} aria-label={t.codeTitle} />
      <button type="submit" disabled={loading || code.length !== 6} className="btn-orange w-full btn-lg">{loading ? t.verifying : t.verify}</button>
      <div className="flex items-center justify-between text-[13px]">
        <button type="button" className="min-h-[44px] font-bold text-ink-2 hover:text-navy" onClick={() => { setStep('phone'); setError(''); setNotice('') }}>{t.change}</button>
        {/* resend sends a new code at once (it used to go back to the number step, UX-134) */}
        {cooldown > 0
          ? <span className="text-ink-2" aria-live="polite">{t.resendIn} {cooldown} {t.sec}</span>
          : <button type="button" disabled={loading} className="min-h-[44px] font-bold text-orange-dark hover:underline disabled:opacity-50" onClick={() => sendCode(undefined, true)}>{t.resend}</button>}
      </div>
      {waited && (
        <div className="border-t border-line pt-3 text-[13px] text-ink-2">
          <p className="font-bold text-navy">{locale === 'en' ? 'The code did not arrive?' : locale === 'ur' ? 'کوڈ نہیں ملا؟' : 'لم يصلك الرمز؟'}</p>
          <div className="flex flex-wrap gap-x-4">
            <a href={registerHref} className="inline-flex items-center min-h-[44px] font-bold text-orange-dark hover:underline">{t.smsDownCreate}</a>
            {onUseEmail
              ? <button type="button" onClick={onUseEmail} className="inline-flex items-center min-h-[44px] font-bold text-orange-dark hover:underline">{t.smsDownLogin}</button>
              : <a href="/login?m=email" className="inline-flex items-center min-h-[44px] font-bold text-orange-dark hover:underline">{t.smsDownLogin}</a>}
          </div>
        </div>
      )}
    </form>
  )
}
