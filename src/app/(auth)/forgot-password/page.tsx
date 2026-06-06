// @ts-nocheck
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const txt = {
  ar: {
    title: 'نسيت كلمة المرور؟', sub: 'أدخل بريدك الإلكتروني ونرسل لك رابط إعادة التعيين',
    email: 'البريد الإلكتروني', send: 'إرسال رابط الاستعادة', sending: 'جارٍ الإرسال...',
    back: '← رجوع لتسجيل الدخول', home: '🏠 الرئيسية',
    sentTitle: 'تحقق من بريدك ✉️',
    sentSub: 'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك. افتح الرابط لتعيين كلمة مرور جديدة.',
    err: 'تعذّر الإرسال، تأكد من البريد وحاول مرة أخرى',
  },
  en: {
    title: 'Forgot your password?', sub: 'Enter your email and we will send you a reset link',
    email: 'Email Address', send: 'Send reset link', sending: 'Sending...',
    back: '← Back to sign in', home: '🏠 Home',
    sentTitle: 'Check your inbox ✉️',
    sentSub: 'We sent a password reset link to your email. Open it to set a new password.',
    err: 'Could not send. Check the email and try again',
  },
  ur: {
    title: 'پاسورڈ بھول گئے؟', sub: 'اپنا ای میل درج کریں، ہم ری سیٹ لنک بھیجیں گے',
    email: 'ای میل', send: 'ری سیٹ لنک بھیجیں', sending: 'بھیجا جا رہا ہے...',
    back: '← سائن ان پر واپس', home: '🏠 مرکزی صفحہ',
    sentTitle: 'اپنا ان باکس دیکھیں ✉️',
    sentSub: 'ہم نے آپ کے ای میل پر ری سیٹ لنک بھیج دیا ہے۔',
    err: 'بھیجنے میں ناکامی، دوبارہ کوشش کریں',
  },
}

export default function ForgotPasswordPage() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) { setError(t.err); setLoading(false); return }
      setSent(true)
    } catch { setError(t.err) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" dir={dir}
      style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #1B2D5B 50%, #2a4a8a 100%)' }}>
      <div className="absolute top-4 left-4 z-20"><LanguageSwitcher variant="minimal" /></div>
      <a href="/" className="absolute top-4 right-4 z-20 text-sm font-medium text-white/70 hover:text-white transition-colors">{t.home}</a>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-outlined.png" alt="" className="w-20 h-20 mx-auto mb-4" />
          <Logo theme="dark" size="lg" className="justify-center" variant="wordmark" />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-bold text-[#1B2D5B] mb-2">{t.sentTitle}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.sentSub}</p>
              <a href="/login" className="inline-block w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#1B2D5B' }}>{t.back}</a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#1B2D5B] mb-1">{t.title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.sub}</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">⚠️ {error}</div>}
              <form onSubmit={handleSubmit}>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.email}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field mb-5" placeholder="info@company.com" required disabled={loading} />
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-lg"
                  style={{ background: '#F5831F' }}>
                  {loading ? t.sending : t.send}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5">
                <a href="/login" className="font-medium hover:underline" style={{ color: '#F5831F' }}>{t.back}</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
