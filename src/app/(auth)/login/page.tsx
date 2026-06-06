// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const txt = {
  ar: { welcome:'مرحباً بعودتك', sub:'سجّل دخولك للوصول إلى لوحة التحكم', email:'البريد الإلكتروني', password:'كلمة المرور', login:'تسجيل الدخول', logging:'جارٍ الدخول...', noAccount:'ليس لديك حساب؟', register:'سجّل مجاناً', error:'البريد أو كلمة المرور غير صحيحة', copyright:'© 2026 تسعيرك — جميع الحقوق محفوظة', s_auth:'الخطوة 1/3: جارٍ التحقق من بياناتك…', s_role:'الخطوة 2/3: جارٍ قراءة الصلاحية…', s_go:'الخطوة 3/3: تم الدخول ✓ جارٍ التحويل…', err_timeout:'انتهت المهلة دون استجابة. قد يكون اتصالك بالإنترنت يحجب الخادم — جرّب شبكة أخرى (بيانات الجوال مثلاً) ثم أعد المحاولة.' },
  en: { welcome:'Welcome back', sub:'Sign in to access your dashboard', email:'Email Address', password:'Password', login:'Sign In', logging:'Signing in...', noAccount:"Don't have an account?", register:'Register for Free', error:'Invalid email or password', copyright:'© 2026 Taseerak — All rights reserved', s_auth:'Step 1/3: verifying your credentials…', s_role:'Step 2/3: reading your role…', s_go:'Step 3/3: signed in ✓ redirecting…', err_timeout:'Timed out with no response. Your network may be blocking the server — try another network (e.g. mobile data) and retry.' },
  ur: { welcome:'خوش آمدید', sub:'اپنے ڈیش بورڈ تک رسائی کے لیے سائن ان کریں', email:'ای میل', password:'پاسورڈ', login:'سائن ان', logging:'سائن ان ہو رہا ہے...', noAccount:'اکاؤنٹ نہیں ہے؟', register:'مفت رجسٹر کریں', error:'غلط ای میل یا پاسورڈ', copyright:'© 2026 Taseerak — جملہ حقوق محفوظ ہیں', s_auth:'مرحلہ 1/3: تصدیق ہو رہی ہے…', s_role:'مرحلہ 2/3: کردار پڑھا جا رہا ہے…', s_go:'مرحلہ 3/3: سائن ان ✓ منتقل ہو رہا ہے…', err_timeout:'کوئی جواب نہیں ملا۔ ہو سکتا ہے آپ کا نیٹ ورک سرور کو بلاک کر رہا ہو — دوسرا نیٹ ورک آزمائیں۔' },
}

function LoginForm() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  // Reject if a promise doesn't settle in `ms` — converts an invisible hang
  // into a clear, reportable error instead of a spinner that never stops.
  function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT:' + label)), ms)),
    ]) as Promise<T>
  }

  // Helper: role → default landing page
  function roleHome(role: string) {
    if (role === 'admin') return '/admin'
    if (role === 'supplier') return '/supplier/dashboard'
    return '/contractor'
  }

  // Safe redirect: only allow same-origin paths (guard against open-redirect)
  function safeRedirect(path: string | null, fallback: string) {
    if (path && path.startsWith('/') && !path.startsWith('//')) return path
    return fallback
  }

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      // Validate with getUser() (same check the middleware uses) so the client
      // and server always agree — otherwise a stale local cookie causes an
      // infinite login <-> dashboard redirect loop.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        const next = searchParams.get('next')
        window.location.href = safeRedirect(next, roleHome(p?.role))
        return
      }
      // No valid server-side session. SELF-HEAL: wipe any stale/corrupt auth
      // artifacts left behind by older versions of the app (the previous build
      // stored the session in localStorage; a half-written cookie can also
      // linger). Clearing them guarantees the next login starts 100% clean and
      // no login <-> dashboard redirect loop can survive across versions.
      try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
      try {
        // 1) Legacy localStorage keys from the old @supabase/supabase-js client
        Object.keys(window.localStorage).forEach((k) => {
          if (k.startsWith('sb-') || k.toLowerCase().includes('supabase')) {
            window.localStorage.removeItem(k)
          }
        })
        // 2) Any leftover Supabase auth cookies (incl. chunked .0/.1 variants)
        document.cookie.split(';').forEach((c) => {
          const name = c.split('=')[0].trim()
          if (name.startsWith('sb-')) {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          }
        })
      } catch {}
    })()
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(''); setStatus(t.s_auth)
    const supabase = createClient()
    try {
      // STEP 1/3 — authenticate (with a hard 15s ceiling so it can never hang)
      const { data, error: err } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }), 15000, 'signin'
      )
      if (err) { setError(t.error); setLoading(false); setStatus(''); return }
      if (!data?.session) { setError(t.error); setLoading(false); setStatus(''); return }

      // STEP 2/3 — read role (don't block login if it stalls; fall back gracefully)
      setStatus(t.s_role)
      let role = 'contractor'
      try {
        const { data: p } = await withTimeout(
          supabase.from('profiles').select('role').eq('id', data.session.user.id).single(),
          12000, 'profile'
        )
        if (p?.role) role = p.role
      } catch (e2) { console.error('[login] role read failed:', e2) }

      // STEP 3/3 — hard redirect (full reload so middleware sees the cookie)
      setStatus(t.s_go)
      const next = searchParams.get('next')
      window.location.href = safeRedirect(next, roleHome(role))
    } catch (e) {
      console.error('[login] failed:', e)
      const msg = (e && (e as any).message) || ''
      if (msg.indexOf('TIMEOUT:signin') === 0) setError(t.err_timeout + ' (1/3)')
      else if (msg.indexOf('TIMEOUT:profile') === 0) setError(t.err_timeout + ' (2/3)')
      else setError(t.error)
      setLoading(false); setStatus('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" dir={dir}
      style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #1B2D5B 50%, #2a4a8a 100%)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] right-[10%] w-[500px] h-[500px] bg-[#F5831F]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-4 left-4 z-20"><LanguageSwitcher variant="minimal" /></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <img src="/logo-outlined.png" alt="" className="w-24 h-24 mx-auto mb-5 animate-float" />
          <Logo theme="dark" size="lg" className="justify-center mb-2" variant="wordmark" />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl animate-slide-up">
          <h2 className="text-xl font-bold text-[#1B2D5B] mb-1">{t.welcome}</h2>
          <p className="text-sm text-gray-500 mb-6">{t.sub}</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4 animate-fade-in">⚠️ {error}</div>}

          <form onSubmit={handleLogin}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.email}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="info@company.com" required disabled={loading} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.password}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="••••••••" required disabled={loading} />
                <div className="text-end mt-1.5">
                  <a href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#F5831F' }}>
                    {locale === 'en' ? 'Forgot password?' : locale === 'ur' ? 'پاسورڈ بھول گئے؟' : 'نسيت كلمة المرور؟'}
                  </a>
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-lg"
              style={{ background: '#F5831F' }}>
              {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t.logging}</span> : t.login}
            </button>
            {loading && status && (
              <p className="text-center text-xs text-gray-500 mt-3 animate-fade-in">{status}</p>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t.noAccount} <a href="/register" className="font-bold hover:underline" style={{ color: '#F5831F' }}>{t.register}</a>
          </p>
        </div>

        <p className="text-center text-xs text-blue-300/50 mt-6">{t.copyright}</p>
      </div>
    </div>
  )
}

// useSearchParams() must sit inside a Suspense boundary, otherwise Next.js
// fails to prerender the page (missing-suspense-with-csr-bailout).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
