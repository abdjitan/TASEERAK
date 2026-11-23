'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Glyph from '@/components/shared/Glyph'
import { passwordProblems, passRuleList, passwordAuthError, PASS_RULES_SUMMARY } from '@/lib/passwordPolicy'
import { Check, Circle } from 'lucide-react'

const txt = {
  ar: {
    title: 'تعيين كلمة مرور جديدة', sub: 'اكتب كلمة المرور الجديدة لحسابك',
    pass: 'كلمة المرور الجديدة', confirm: 'تأكيد كلمة المرور',
    save: 'حفظ كلمة المرور', saving: 'جارٍ الحفظ...',
    doneTitle: 'تم تغيير كلمة المرور', doneSub: 'تم تغيير كلمة مرورك، وأنت الآن مسجّل الدخول.',
    toLogin: 'متابعة إلى حسابي',
    short: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    mismatch: 'كلمتا المرور غير متطابقتين',
    invalid: 'تعذّر فتح الرابط. افتحه في المتصفح نفسه الذي طلبت منه الاستعادة، أو اطلب رابطاً جديداً.',
    expired: 'انتهت صلاحية هذا الرابط أو سبق استخدامه. اطلب رابطاً جديداً، فهو صالح لمدة ساعة واحدة.',
    requestNew: 'اطلب رابط استعادة جديد', err: 'تعذّر الحفظ، حاول مرة أخرى',
    checking: 'جارٍ التحقق من الرابط…', login: 'تسجيل الدخول',
  },
  en: {
    title: 'Set a new password', sub: 'Enter a new password for your account',
    pass: 'New password', confirm: 'Confirm password',
    save: 'Save password', saving: 'Saving...',
    doneTitle: 'Password changed', doneSub: 'Your password has been changed, and you are now signed in.',
    toLogin: 'Continue to my account',
    short: 'Password must be at least 8 characters',
    mismatch: 'Passwords do not match',
    invalid: 'We could not open the link. Open it in the same browser you requested it from, or request a new link.',
    expired: 'This link has expired or was already used. Request a new link; it stays valid for one hour.',
    requestNew: 'Request a new reset link', err: 'Could not save, try again',
    checking: 'Checking the link…', login: 'Sign in',
  },
  ur: {
    title: 'نیا پاسورڈ مقرر کریں', sub: 'اپنے اکاؤنٹ کے لیے نیا پاسورڈ درج کریں',
    pass: 'نیا پاسورڈ', confirm: 'پاسورڈ کی تصدیق',
    save: 'پاسورڈ محفوظ کریں', saving: 'محفوظ ہو رہا ہے...',
    doneTitle: 'پاسورڈ تبدیل ہو گیا', doneSub: 'آپ کا پاسورڈ تبدیل ہو گیا، اور آپ اب سائن اِن ہیں۔',
    toLogin: 'اپنے اکاؤنٹ پر جائیں',
    short: 'پاسورڈ کم از کم 8 حروف کا ہونا چاہیے',
    mismatch: 'پاسورڈ مماثل نہیں',
    invalid: 'لنک نہیں کھل سکا۔ اسے اسی براؤزر میں کھولیں جہاں سے آپ نے درخواست کی تھی، یا نیا لنک طلب کریں۔',
    expired: 'اس لنک کی مدت ختم ہو گئی یا یہ پہلے استعمال ہو چکا ہے۔ نیا لنک منگوائیں، یہ ایک گھنٹے تک کارآمد رہتا ہے۔',
    requestNew: 'نیا ری سیٹ لنک طلب کریں', err: 'محفوظ نہیں ہوا، دوبارہ کوشش کریں',
    checking: 'لنک چیک ہو رہا ہے…', login: 'سائن ان',
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
  // an expired / already-used link is said as such, not «open it in the same browser» (UX-120)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // SEC-14: only a genuine password-recovery flow may set a new password without the current
    // one. A normal logged-in session landing on /reset-password directly (e.g. a hijacked
    // session) must NOT be allowed to reset — otherwise it becomes a permanent account takeover.
    const isRecovery = typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setReady(true); setChecking(false) }
    })
    // Cross-device link (UX-034): an email template that sends ?token_hash=…&type=recovery is verified
    // here directly, so the link also works on a phone other than the browser that asked for it
    // (the PKCE ?code= link only works in that same browser).
    const qs = new URLSearchParams(window.location.search)
    const hs = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errCode = qs.get('error_code') || hs.get('error_code') || ''
    if (/otp_expired|expired/i.test(errCode) || /expired/i.test(qs.get('error_description') || hs.get('error_description') || '')) setExpired(true)
    const tokenHash = qs.get('token_hash')
    if (tokenHash && qs.get('type') === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ data, error }) => {
        if (!error && data.session) setReady(true)
        else if (error && /expired|invalid/i.test(String((error as any).code || error.message || ''))) setExpired(true)
        setChecking(false)
        try { window.history.replaceState(null, '', '/reset-password') } catch {}
      }, () => setChecking(false))
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (isRecovery && data.session) setReady(true)
        setChecking(false)
      })
    }
    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()
    const lc = (locale === 'en' || locale === 'ur' ? locale : 'ar') as 'ar' | 'en' | 'ur'
    if (passwordProblems(password).length) { setError(PASS_RULES_SUMMARY[lc]); return }
    if (password !== confirm) { setError(t.mismatch); return }
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) { setError(passwordAuthError(err, locale)); setLoading(false); return }
      setDone(true)
    } catch { setError(t.err) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" dir={dir}
      style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #0B2438 50%, #102E45 100%)' }}>
      <div className="absolute top-4 end-4 z-20"><LanguageSwitcher variant="minimal" /></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          {/* one logo, as on the sign-in page (UX-120) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-mobile-lockup mx-auto" />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center">
              <div className="text-5xl mb-4 text-[#0F6E56]"><Glyph e="✅" /></div>
              <h2 className="text-xl font-bold text-[#0B2438] mb-2">{t.doneTitle}</h2>
              <p className="text-sm text-gray-600 mb-6" role="status">{t.doneSub}</p>
              {/* signed in already: /login forwards to the account's home */}
              <a href="/login" className="inline-flex items-center justify-center w-full min-h-[48px] rounded-xl font-bold text-[#071827] text-sm" style={{ background: '#D4A543' }}>{t.toLogin}</a>
            </div>
          ) : checking ? (
            <p className="text-center text-sm text-gray-600 py-6" role="status" aria-live="polite">{t.checking}</p>
          ) : !ready ? (
            <div className="text-center">
              <div className="text-4xl mb-3"><Glyph e="⚠" /></div>
              <p className="text-sm text-gray-700 mb-6" role="alert">{expired ? t.expired : t.invalid}</p>
              <a href="/forgot-password" className="inline-flex items-center justify-center w-full min-h-[48px] rounded-xl font-bold text-[#071827] text-sm" style={{ background: '#D4A543' }}>{t.requestNew}</a>
              <a href="/login" className="mt-3 inline-flex items-center justify-center w-full min-h-[48px] rounded-xl font-bold text-[#0B2438] text-sm border border-gray-200">{t.login}</a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#0B2438] mb-1">{t.title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.sub}</p>
              {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4"><Glyph e="⚠" /> {error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-5">
                  <div>
                    <label htmlFor="rp-pass" className="block text-xs font-bold text-gray-500 mb-1.5">{t.pass}</label>
                    <input id="rp-pass" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="••••••••" required disabled={loading} />
                    <ul className="mt-2 space-y-1 text-[13px]">
                      {passRuleList(password, locale).map(r => (
                        <li key={r.rule} className={`flex items-center gap-1.5 ${r.ok ? 'text-emerald-700' : 'text-gray-600'}`}>{r.ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Circle className="w-3 h-3" aria-hidden />} {r.text}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <label htmlFor="rp-confirm" className="block text-xs font-bold text-gray-500 mb-1.5">{t.confirm}</label>
                    <input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" placeholder="••••••••" required disabled={loading} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-[#071827] text-sm disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-lg"
                  style={{ background: '#D4A543' }}>
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
