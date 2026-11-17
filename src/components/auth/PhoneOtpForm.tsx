'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n'
import { toLatinDigits } from '@/lib/phone'
import { FIREBASE_CONFIG, firebaseReady, toE164 } from '@/lib/firebaseConfig'
import { TERMS_VERSION } from '@/lib/legal'

// Buyer phone entry (owner 2026-11-17): one form for sign-in and sign-up. A Google SMS code
// (Firebase phone auth) proves the number; /api/auth/phone-session signs the buyer in, or — when the
// number has no account yet — asks for the name and creates a buyer account (migration 220).
// Sellers sign in with email + password.
const TX = {
  ar: {
    phone: 'رقم جوالك', phoneHint: 'سيصلك رمز التحقق برسالة نصية (SMS)', send: 'أرسل الرمز', sending: 'جارٍ الإرسال…',
    badPhone: 'اكتب رقم جوال صحيحاً، مثل 05XXXXXXXX', codeTitle: 'اكتب الرمز', codeSent: 'أرسلنا رمزاً من 6 أرقام برسالة نصية إلى',
    verify: 'تأكيد والدخول', verifying: 'جارٍ التحقق…', badCode: 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزاً جديداً.',
    resend: 'أعد إرسال الرمز', resendIn: 'إعادة الإرسال بعد', sec: 'ث', change: 'تغيير الرقم',
    rate: 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.', sendFail: 'تعذّر إرسال الرمز. تأكد من الرقم ثم أعد المحاولة.',
    newTitle: 'أهلاً بك في تسعيرك', newSub: 'هذا الرقم جديد. اكتب اسمك لإنشاء حساب مشتري.', name: 'الاسم', create: 'إنشاء الحساب والدخول',
    terms1: 'أوافق على', terms: 'الشروط والأحكام', and: 'و', privacy: 'سياسة الخصوصية', badName: 'اكتب اسمك.', needTerms: 'وافق على الشروط وسياسة الخصوصية للمتابعة.',
    useEmail: 'هذا الرقم مرتبط بحساب مورّد. حسابات الموردين تدخل بالبريد الإلكتروني وكلمة المرور.', failed: 'تعذّر الدخول. حاول مرة أخرى.',
  },
  en: {
    phone: 'Your mobile number', phoneHint: 'You will get a code by text message (SMS)', send: 'Send code', sending: 'Sending…',
    badPhone: 'Enter a valid mobile number, e.g. 05XXXXXXXX', codeTitle: 'Enter the code', codeSent: 'We sent a 6-digit code by SMS to',
    verify: 'Verify and continue', verifying: 'Verifying…', badCode: 'Wrong or expired code. Request a new one.',
    resend: 'Resend code', resendIn: 'Resend in', sec: 's', change: 'Change number',
    rate: 'Too many attempts. Wait a little and try again.', sendFail: 'Could not send the code. Check the number and try again.',
    newTitle: 'Welcome to Taseerak', newSub: 'This number is new. Write your name to create a buyer account.', name: 'Name', create: 'Create account and continue',
    terms1: 'I agree to the', terms: 'Terms', and: 'and', privacy: 'Privacy Policy', badName: 'Write your name.', needTerms: 'Accept the Terms and Privacy Policy to continue.',
    useEmail: 'This number belongs to a seller account. Seller accounts sign in with email and password.', failed: 'Could not sign in. Try again.',
  },
  ur: {
    phone: 'آپ کا موبائل نمبر', phoneHint: 'تصدیقی کوڈ ٹیکسٹ میسج (SMS) سے آئے گا', send: 'کوڈ بھیجیں', sending: 'بھیجا جا رہا ہے…',
    badPhone: 'درست موبائل نمبر لکھیں، جیسے 05XXXXXXXX', codeTitle: 'کوڈ درج کریں', codeSent: 'ہم نے SMS سے 6 ہندسوں کا کوڈ بھیجا',
    verify: 'تصدیق کریں اور جاری رکھیں', verifying: 'تصدیق ہو رہی ہے…', badCode: 'غلط یا ختم شدہ کوڈ۔ نیا کوڈ منگوائیں۔',
    resend: 'کوڈ دوبارہ بھیجیں', resendIn: 'دوبارہ بھیجیں', sec: 's', change: 'نمبر تبدیل کریں',
    rate: 'بہت زیادہ کوششیں۔ تھوڑا انتظار کریں۔', sendFail: 'کوڈ نہیں بھیجا جا سکا۔ نمبر چیک کریں۔',
    newTitle: 'تسعیرک میں خوش آمدید', newSub: 'یہ نمبر نیا ہے۔ خریدار اکاؤنٹ بنانے کے لیے اپنا نام لکھیں۔', name: 'نام', create: 'اکاؤنٹ بنائیں اور جاری رکھیں',
    terms1: 'میں متفق ہوں', terms: 'شرائط', and: 'اور', privacy: 'رازداری کی پالیسی', badName: 'اپنا نام لکھیں۔', needTerms: 'جاری رکھنے کے لیے شرائط اور رازداری کی پالیسی قبول کریں۔',
    useEmail: 'یہ نمبر سپلائر اکاؤنٹ کا ہے۔ سپلائر اکاؤنٹس ای میل اور پاسورڈ سے سائن اِن کرتے ہیں۔', failed: 'سائن اِن نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
  },
}

export default function PhoneOtpForm({ onSignedIn }: { onSignedIn: () => void }) {
  const { locale } = useTranslation()
  const t = (TX as any)[locale] || TX.ar
  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone')
  const [phone, setPhone] = useState('')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<any>(null)
  const verifierRef = useRef<any>(null)
  const tokenRef = useRef<string>('')
  const boxId = useRef('recaptcha-' + Math.random().toString(36).slice(2)).current

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

  async function sendCode(e?: any) {
    e?.preventDefault()
    setError('')
    const p = toE164(toLatinDigits(phone))
    if (!p) { setError(t.badPhone); return }
    if (!firebaseReady()) { setError(t.sendFail); return }
    setLoading(true)
    try {
      const auth = await fb()
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth')
      if (!verifierRef.current) verifierRef.current = new RecaptchaVerifier(auth, boxId, { size: 'invisible' })
      confirmRef.current = await signInWithPhoneNumber(auth, p, verifierRef.current)
      setE164(p); setCode(''); setStep('code'); setCooldown(60)
      setTimeout(() => codeRef.current?.focus(), 50)
    } catch (err: any) {
      const c = String(err?.code || '')
      console.error('phone sign-in send', c)
      setError(c.includes('too-many-requests') || c.includes('quota') ? t.rate : c.includes('invalid-phone') ? t.badPhone : t.sendFail)
      try { verifierRef.current?.clear?.() } catch {} ; verifierRef.current = null
    } finally { setLoading(false) }
  }

  async function session(mode: 'login' | 'signup') {
    const res = await fetch('/api/auth/phone-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: tokenRef.current, mode, locale, ...(mode === 'signup' ? { full_name: name.trim(), terms_version: TERMS_VERSION } : {}) }),
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
      if (j?.error === 'no_account') { setStep('name'); setLoading(false); return }
      setError(j?.error === 'use_email' ? t.useEmail : j?.error === 'rate_limited' ? t.rate : t.failed)
    } catch (err: any) {
      setError(String(err?.code || '').includes('invalid-verification-code') ? t.badCode : t.failed)
    }
    setLoading(false)
  }

  async function create(e?: any) {
    e?.preventDefault()
    if (name.trim().length < 2) { setError(t.badName); return }
    if (!agree) { setError(t.needTerms); return }
    setLoading(true); setError('')
    const { ok, j } = await session('signup')
    if (ok) { onSignedIn(); return }
    setError(j?.error === 'invalid_code' ? t.badCode : t.failed)
    if (j?.error === 'invalid_code') setStep('phone')
    setLoading(false)
  }

  const errorBox = error && (
    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3" role="alert">{error}</div>
  )

  if (step === 'phone') {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        {errorBox}
        <div>
          <label htmlFor="otp-phone" className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.phone}</label>
          <input id="otp-phone" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={phone}
            onChange={(e) => setPhone(e.target.value.slice(0, 18))}
            className="input-field text-lg tracking-wide" placeholder="05XXXXXXXX" required disabled={loading} />
          <p className="text-[12px] text-ink-3 mt-1.5">{t.phoneHint}</p>
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
        </div>
        <div>
          <label htmlFor="otp-name" className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.name}</label>
          <input id="otp-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} autoComplete="name" className="input-field" required disabled={loading} autoFocus />
        </div>
        <label className="flex items-start gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
          <span>{t.terms1} <Link href="/terms" target="_blank" className="font-bold underline">{t.terms}</Link> {t.and} <Link href="/privacy" target="_blank" className="font-bold underline">{t.privacy}</Link></span>
        </label>
        <button type="submit" disabled={loading} className="btn-orange w-full btn-lg">{loading ? t.verifying : t.create}</button>
      </form>
    )
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      {errorBox}
      <div>
        <h2 className="text-lg font-extrabold text-navy">{t.codeTitle}</h2>
        <p className="text-sm text-ink-2 mt-1">{t.codeSent} <span dir="ltr" className="font-bold">{e164}</span></p>
      </div>
      <input ref={codeRef} id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr"
        value={code} maxLength={6}
        onChange={(e) => {
          const v = toLatinDigits(e.target.value).replace(/[^0-9]/g, '').slice(0, 6)
          setCode(v)
          if (v.length === 6 && !loading) verify(undefined, v)
        }}
        className="input-field text-center text-2xl font-extrabold tracking-[0.5em]" placeholder="••••••" disabled={loading} />
      <button type="submit" disabled={loading || code.length !== 6} className="btn-orange w-full btn-lg">{loading ? t.verifying : t.verify}</button>
      <div className="flex items-center justify-between text-[13px]">
        <button type="button" className="font-bold text-ink-2 hover:text-navy" onClick={() => { setStep('phone'); setError('') }}>{t.change}</button>
        {cooldown > 0
          ? <span className="text-ink-3">{t.resendIn} {cooldown}{t.sec}</span>
          : <button type="button" className="font-bold text-orange-dark hover:underline" onClick={() => { setStep('phone'); setError('') }}>{t.resend}</button>}
      </div>
    </form>
  )
}
