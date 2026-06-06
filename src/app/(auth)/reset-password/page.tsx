// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const txt = {
  ar: {
    title: 'تعيين كلمة مرور جديدة', sub: 'اكتب كلمة المرور الجديدة لحسابك',
    pass: 'كلمة المرور الجديدة', confirm: 'تأكيد كلمة المرور',
    save: 'حفظ كلمة المرور', saving: 'جارٍ الحفظ...',
    doneTitle: 'تم بنجاح ✅', doneSub: 'تم تغيير كلمة مرورك. يمكنك تسجيل الدخول الآن.',
    toLogin: 'تسجيل الدخول ←',
    short: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    mismatch: 'كلمتا المرور غير متطابقتين',
    invalid: 'الرابط غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً.',
    requestNew: 'اطلب رابط استعادة جديد', err: 'تعذّر الحفظ، حاول مرة أخرى',
  },
  en: {
    title: 'Set a new password', sub: 'Enter a new password for your account',
    pass: 'New password', confirm: 'Confirm password',
    save: 'Save password', saving: 'Saving...',
    doneTitle: 'Success ✅', doneSub: 'Your password has been changed. You can sign in now.',
    toLogin: 'Sign in →',
    short: 'Password must be at least 8 characters',
    mismatch: 'Passwords do not match',
    invalid: 'This link is invalid or expired. Request a new one.',
    requestNew: 'Request a new reset link', err: 'Could not save, try again',
  },
  ur: {
    title: 'نیا پاسورڈ مقرر کریں', sub: 'اپنے اکاؤنٹ کے لیے نیا پاسورڈ درج کریں',
    pass: 'نیا پاسورڈ', confirm: 'پاسورڈ کی تصدیق',
    save: 'پاسورڈ محفوظ کریں', saving: 'محفوظ ہو رہا ہے...',
    doneTitle: 'کامیاب ✅', doneSub: 'آپ کا پاسورڈ تبدیل ہو گیا۔ اب سائن ان کریں۔',
    toLogin: 'سائن ان ←',
    short: 'پاسورڈ کم از کم 8 حروف کا ہونا چاہیے',
    mismatch: 'پاسورڈ مماثل نہیں',
    invalid: 'لنک غلط یا ختم ہو چکا ہے۔ نیا لنک طلب کریں۔',
    requestNew: 'نیا ری سیٹ لنک طلب کریں', err: 'محفوظ نہیں ہوا، دوبارہ کوشش کریں',
  },
}

export default function ResetPasswordPage() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)   // a valid recovery session exists
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    // The recovery link establishes a session (detectSessionInUrl). Confirm it.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) { setReady(true); setChecking(false) }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      setChecking(false)
    })
    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError(t.short); return }
    if (password !== confirm) { setError(t.mismatch); return }
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) { setError(t.err); setLoading(false); return }
      setDone(true)
    } catch { setError(t.err) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" dir={dir}
      style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #1B2D5B 50%, #2a4a8a 100%)' }}>
      <div className="absolute top-4 left-4 z-20"><LanguageSwitcher variant="minimal" /></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-outlined.png" alt="" className="w-20 h-20 mx-auto mb-4" />
          <Logo theme="dark" size="lg" className="justify-center" variant="wordmark" />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-[#1B2D5B] mb-2">{t.doneTitle}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.doneSub}</p>
              <a href="/login" className="inline-block w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#1B2D5B' }}>{t.toLogin}</a>
            </div>
          ) : checking ? (
            <p className="text-center text-sm text-gray-500 py-6">...</p>
          ) : !ready ? (
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-sm text-gray-600 mb-6">{t.invalid}</p>
              <a href="/forgot-password" className="inline-block w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#F5831F' }}>{t.requestNew}</a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#1B2D5B] mb-1">{t.title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.sub}</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">⚠️ {error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.pass}</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="••••••••" required disabled={loading} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.confirm}</label>
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" placeholder="••••••••" required disabled={loading} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-lg"
                  style={{ background: '#F5831F' }}>
                  {loading ? t.saving : t.save}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
