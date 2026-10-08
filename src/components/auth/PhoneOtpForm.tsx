'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'
import { toE164Sa, toLatinDigits } from '@/lib/phone'

// Phone-first entry: one form for both sign-in and sign-up. Supabase creates the account on
// first OTP; the code is delivered on WhatsApp by the send-otp-whatsapp auth hook.
const TX = {
  ar: {
    phone: 'رقم جوالك', phoneHint: 'سيصلك رمز التحقق على واتساب', send: 'أرسل الرمز على واتساب', sending: 'جارٍ الإرسال…',
    badPhone: 'اكتب رقم جوال سعودي صحيح، مثل 05XXXXXXXX', codeTitle: 'اكتب الرمز', codeSent: 'أرسلنا رمزاً من 6 أرقام على واتساب إلى',
    verify: 'تأكيد والدخول', verifying: 'جارٍ التحقق…', badCode: 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزاً جديداً.',
    resend: 'أعد إرسال الرمز', resendIn: 'إعادة الإرسال بعد', sec: 'ث', change: 'تغيير الرقم',
    captchaErr: 'أكمل خطوة التحقق (أنا لست روبوت) ثم أعد المحاولة.', rate: 'محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.',
    sendFail: 'تعذّر إرسال الرمز. تأكد أن الرقم عليه واتساب ثم أعد المحاولة.',
  },
  en: {
    phone: 'Your mobile number', phoneHint: 'We will send a code on WhatsApp', send: 'Send code on WhatsApp', sending: 'Sending…',
    badPhone: 'Enter a valid Saudi mobile, e.g. 05XXXXXXXX', codeTitle: 'Enter the code', codeSent: 'We sent a 6-digit code on WhatsApp to',
    verify: 'Verify and continue', verifying: 'Verifying…', badCode: 'Wrong or expired code. Request a new one.',
    resend: 'Resend code', resendIn: 'Resend in', sec: 's', change: 'Change number',
    captchaErr: 'Complete the “I am human” check and try again.', rate: 'Too many attempts. Wait a minute and try again.',
    sendFail: 'Could not send the code. Make sure this number has WhatsApp and try again.',
  },
  ur: {
    phone: 'آپ کا موبائل نمبر', phoneHint: 'تصدیقی کوڈ واٹس ایپ پر آئے گا', send: 'واٹس ایپ پر کوڈ بھیجیں', sending: 'بھیجا جا رہا ہے…',
    badPhone: 'درست سعودی موبائل نمبر لکھیں، جیسے 05XXXXXXXX', codeTitle: 'کوڈ درج کریں', codeSent: 'ہم نے واٹس ایپ پر 6 ہندسوں کا کوڈ بھیجا',
    verify: 'تصدیق کریں اور جاری رکھیں', verifying: 'تصدیق ہو رہی ہے…', badCode: 'غلط یا ختم شدہ کوڈ۔ نیا کوڈ منگوائیں۔',
    resend: 'کوڈ دوبارہ بھیجیں', resendIn: 'دوبارہ بھیجیں', sec: 's', change: 'نمبر تبدیل کریں',
    captchaErr: 'تصدیق مکمل کریں (میں روبوٹ نہیں ہوں) اور دوبارہ کوشش کریں۔', rate: 'بہت زیادہ کوششیں۔ ایک منٹ انتظار کریں۔',
    sendFail: 'کوڈ نہیں بھیجا جا سکا۔ یقینی بنائیں کہ اس نمبر پر واٹس ایپ ہے۔',
  },
}

export default function PhoneOtpForm({ onSignedIn }: { onSignedIn: () => void }) {
  const { locale, dir } = useTranslation()
  const t = (TX as any)[locale] || TX.ar
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  function sendErrorText(msg: string) {
    if (/captcha/i.test(msg)) return t.captchaErr
    if (/rate|too many|seconds/i.test(msg)) return t.rate
    return t.sendFail
  }

  async function sendCode(e?: any) {
    e?.preventDefault()
    setError('')
    const p = toE164Sa(phone)
    if (!p) { setError(t.badPhone); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: p,
      options: { captchaToken: captchaToken || undefined },
    })
    captchaRef.current?.reset(); setCaptchaToken('')
    setLoading(false)
    if (err) { setError(sendErrorText(err.message || '')); return }
    setE164(p); setCode(''); setStep('code'); setCooldown(60)
    setTimeout(() => codeRef.current?.focus(), 50)
  }

  async function verify(e?: any, value?: string) {
    e?.preventDefault()
    const token = toLatinDigits(value ?? code).replace(/[^0-9]/g, '')
    if (token.length !== 6) { setError(t.badCode); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' })
    if (err || !data?.session) { setLoading(false); setError(t.badCode); return }
    onSignedIn()
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
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3 mt-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#25D366" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>
            {t.phoneHint}
          </p>
        </div>
        <div className="flex justify-center">
          <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} />
        </div>
        <button type="submit" disabled={loading} className="btn-orange w-full btn-lg">{loading ? t.sending : t.send}</button>
      </form>
    )
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      {errorBox}
      <div>
        <h2 className="text-lg font-extrabold text-navy">{t.codeTitle}</h2>
        <p className="text-sm text-ink-2 mt-1">{t.codeSent} <span dir="ltr" className="font-bold">+{e164}</span></p>
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
