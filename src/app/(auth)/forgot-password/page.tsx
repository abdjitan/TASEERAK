'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'
import Glyph from '@/components/shared/Glyph'

const txt = {
  ar: {
    title: 'نسيت كلمة المرور؟', sub: 'أدخل بريدك الإلكتروني ونرسل لك رابط إعادة التعيين',
    email: 'البريد الإلكتروني', send: 'إرسال رابط الاستعادة', sending: 'جارٍ الإرسال...',
    back: 'رجوع إلى تسجيل الدخول', home: 'الرئيسية',
    sentTitle: 'تحقق من بريدك',
    sentSub: 'إذا كان {email} مسجّلاً لدينا فستصلك رسالة فيها رابط لتعيين كلمة مرور جديدة. تفقّد مجلد الرسائل غير المرغوب فيها أيضاً.',
    phoneQ: 'سجّلت برقم جوالك؟', phoneA: 'لا تحتاج كلمة مرور: ادخل برمز يصلك على جوالك.', phoneBtn: 'الدخول برقم الجوال',
    err: 'تعذّر الإرسال، تأكد من البريد وحاول مرة أخرى',
    resent: 'أرسلنا الرابط مرة أخرى.', notArrived: 'لم تصلك الرسالة؟', resend: 'أعد الإرسال', resendIn: 'أعد الإرسال بعد {s} ثانية', editEmail: 'تعديل البريد',
  },
  en: {
    title: 'Forgot your password?', sub: 'Enter your email and we will send you a reset link',
    email: 'Email Address', send: 'Send reset link', sending: 'Sending...',
    back: 'Back to sign in', home: 'Home',
    sentTitle: 'Check your inbox',
    sentSub: 'If {email} is registered with us, you will get a message with a link to set a new password. Check your spam folder too.',
    phoneQ: 'Signed up with your mobile number?', phoneA: 'You do not need a password: sign in with a code sent to your mobile.', phoneBtn: 'Sign in with my mobile',
    err: 'Could not send. Check the email and try again',
    resent: 'We sent the link again.', notArrived: 'Did the message not arrive?', resend: 'Send it again', resendIn: 'Send again in {s} s', editEmail: 'Change the email',
  },
  ur: {
    title: 'پاسورڈ بھول گئے؟', sub: 'اپنا ای میل درج کریں، ہم ری سیٹ لنک بھیجیں گے',
    email: 'ای میل', send: 'ری سیٹ لنک بھیجیں', sending: 'بھیجا جا رہا ہے...',
    back: 'سائن ان پر واپس', home: 'مرکزی صفحہ',
    sentTitle: 'اپنا ان باکس دیکھیں',
    sentSub: 'اگر {email} ہمارے پاس رجسٹرڈ ہے تو آپ کو نیا پاسورڈ مقرر کرنے کے لنک والا پیغام ملے گا۔ اسپام فولڈر بھی دیکھیں۔',
    phoneQ: 'موبائل نمبر سے رجسٹر کیا تھا؟', phoneA: 'پاسورڈ کی ضرورت نہیں: موبائل پر آنے والے کوڈ سے سائن اِن کریں۔', phoneBtn: 'موبائل نمبر سے سائن اِن',
    err: 'بھیجنے میں ناکامی، دوبارہ کوشش کریں',
    resent: 'ہم نے لنک دوبارہ بھیج دیا۔', notArrived: 'پیغام نہیں ملا؟', resend: 'دوبارہ بھیجیں', resendIn: '{s} سیکنڈ بعد دوبارہ بھیجیں', editEmail: 'ای میل تبدیل کریں',
  },
}

export default function ForgotPasswordPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const t = txt[locale] || txt.ar
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  // «send again» opens after 60 s; «change the email» goes back to the form with the address kept (UX-101)
  const [wait, setWait] = useState(0)
  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])
  const emailRef = useRef<HTMLInputElement | null>(null)
  const [resent, setResent] = useState(false)
  function backToForm(focus: boolean) {
    setSent(false); setError(''); setCaptchaToken('')
    if (focus) setTimeout(() => emailRef.current?.focus(), 50)
  }

  // one message per cause (round-5 UX-116): the limit, the human check, anything else
  function errText(err: any): string {
    const m = String(err?.message || '') + ' ' + String(err?.code || '')
    if (err?.status === 429 || /rate|limit|seconds|too many/i.test(m)) return L('We sent a link a moment ago. Wait a minute and try again, and check your inbox.', 'ہم نے ابھی لنک بھیجا ہے۔ ایک منٹ انتظار کریں اور دوبارہ کوشش کریں، اور اپنا ان باکس دیکھیں۔', 'أرسلنا رابطاً قبل قليل. انتظر دقيقة ثم أعد المحاولة، وتفقّد بريدك.')
    if (/captcha/i.test(m)) return L('Complete the check above, then send again.', 'اوپر والی تصدیق مکمل کریں، پھر دوبارہ بھیجیں۔', 'أكمل التحقق أعلاه ثم أعد الإرسال.')
    return L('Could not send. Try again in a little while.', 'بھیجا نہیں جا سکا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔', 'تعذّر الإرسال. حاول مرة أخرى بعد قليل.')
  }
  const needCaptcha = !!TURNSTILE_SITE_KEY && !captchaToken

  // «send again» really sends (it only went back to the form before, UX-120)
  async function resend() {
    setLoading(true); setError(''); setResent(false)
    try {
      const { error: err } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken: captchaToken || undefined,
      })
      captchaRef.current?.reset(); setCaptchaToken('')
      if (err) setError(errText(err))
      else { setResent(true); setWait(60) }
    } catch { setError(errText(null)) }
    setLoading(false)
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken: captchaToken || undefined,
      })
      if (err) { captchaRef.current?.reset(); setCaptchaToken(''); setError(errText(err)); setLoading(false); return }
      setSent(true); setWait(60)
    } catch { captchaRef.current?.reset(); setCaptchaToken(''); setError(errText(null)) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" dir={dir}
      style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #0B2438 50%, #102E45 100%)' }}>
      <div className="absolute top-4 end-4 z-20"><LanguageSwitcher variant="minimal" /></div>
      <a href="/" className="absolute top-4 start-4 z-20 min-h-[44px] inline-flex items-center text-sm font-medium text-white/80 hover:text-white transition-colors">{t.home}</a>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          {/* one logo, as on the sign-in page (the word mark repeated it, UX-120) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-mobile-lockup mx-auto" />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4"><Glyph e="📬" /></div>
              <h2 className="text-xl font-bold text-[#0B2438] mb-2">{t.sentTitle}</h2>
              <p className="text-sm text-gray-700 mb-6">{t.sentSub.split('{email}')[0]}<span dir="ltr" className="font-bold">{email}</span>{t.sentSub.split('{email}')[1]}</p>
              <div className="mb-5 rounded-xl bg-[#F5F7FA] border border-gray-200 p-3 text-sm text-gray-700">
                <div className="font-bold text-[#0B2438] mb-1">{t.notArrived}</div>
                {resent && <p role="status" className="text-[13px] font-semibold text-emerald-800 mb-2">{t.resent}</p>}
                {error && <p role="alert" className="text-[13px] font-semibold text-red-700 mb-2">{error}</p>}
                {wait <= 0 && TURNSTILE_SITE_KEY && <div className="flex justify-center mb-2"><Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} language={locale} /></div>}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button type="button" disabled={wait > 0 || loading || (!!TURNSTILE_SITE_KEY && !captchaToken)} onClick={resend}
                    className="min-h-[44px] px-4 rounded-xl font-bold text-[#071827] bg-[#D4A543] disabled:opacity-50">
                    {loading ? t.sending : wait > 0 ? t.resendIn.replace('{s}', String(wait)) : t.resend}
                  </button>
                  <button type="button" onClick={() => backToForm(true)} className="min-h-[44px] px-4 rounded-xl font-bold text-[#0B2438] border border-gray-200 bg-white hover:bg-gray-50">{t.editEmail}</button>
                </div>
              </div>
              <Link href="/login?m=email" className="inline-flex items-center justify-center w-full min-h-[48px] rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{t.back}</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#0B2438] mb-1">{t.title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.sub}</p>
              {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4"><Glyph e="⚠" /> {error}</div>}
              <form onSubmit={handleSubmit}>
                <label htmlFor="fp-email" className="block text-xs font-bold text-gray-500 mb-1.5">{t.email}</label>
                <input id="fp-email" ref={emailRef} type="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className="input-field mb-4" placeholder="info@company.com" required disabled={loading} />
                <div className="flex justify-center mb-5">
                  <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} language={locale} />
                </div>
                <button type="submit" disabled={loading || needCaptcha}
                  className="w-full min-h-[48px] py-3.5 rounded-xl font-bold text-[#071827] text-sm disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-lg"
                  style={{ background: '#D4A543' }}>
                  {loading ? t.sending : t.send}
                </button>
              </form>
              {/* a phone sign-up has no password to reset (UX-184) */}
              <div className="mt-5 rounded-xl bg-[#F5F7FA] border border-gray-200 p-3 text-sm text-gray-700">
                <span className="font-bold text-[#0B2438]">{t.phoneQ}</span> {t.phoneA}{' '}
                <Link href="/login" className="inline-flex items-center min-h-[44px] font-bold hover:underline" style={{ color: '#8F6820' }}>{t.phoneBtn}</Link>
              </div>
              <p className="text-center text-sm text-gray-600 mt-3">
                <Link href="/login?m=email" className="inline-flex items-center min-h-[44px] font-medium hover:underline" style={{ color: '#8F6820' }}>{t.back}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
