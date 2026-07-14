'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'

const txt = {
  ar: { welcome:'أهلاً بعودتك', sub:'سجّل دخولك للمتابعة إلى حسابك', email:'البريد الإلكتروني', password:'كلمة المرور', login:'تسجيل الدخول', logging:'جارٍ الدخول...', noAccount:'ليس لديك حساب؟', register:'أنشئ حساب جديد', error:'البريد أو كلمة المرور غير صحيحة', copyright:'© ٢٠٢٦ تسعيرك · منصة التسعير والتوريد للمقاولين', s_auth:'الخطوة 1/3: جارٍ التحقق من بياناتك…', s_role:'الخطوة 2/3: جارٍ قراءة الصلاحية…', s_go:'الخطوة 3/3: تم الدخول ✓ جارٍ التحويل…', err_timeout:'انتهت المهلة دون استجابة. قد يكون اتصالك بالإنترنت يحجب الخادم — جرّب شبكة أخرى (بيانات الجوال مثلاً) ثم أعد المحاولة.', brandH:'طلب تسعير واحد، يتنافس عليه أفضل الموردين.', brandP:'سجّل دخولك وتابع طلباتك وعروضك في مكان واحد — من الطلب إلى أمر الشراء.', l1:'موردون موثّقون ومصنّفون', l2:'قارن العروض بالأسعار ومتوسط السوق', l3:'ارفع جدول الكميات ووزّعه تلقائياً', remember:'تذكّرني', forgot:'نسيت كلمة المرور؟', or:'أو', home:'الرئيسية', captchaErr:'يرجى إكمال خطوة التحقق (أنا لست روبوت) ثم إعادة المحاولة.' },
  en: { welcome:'Welcome back', sub:'Sign in to continue to your account', email:'Email Address', password:'Password', login:'Sign In', logging:'Signing in...', noAccount:"Don't have an account?", register:'Create a new account', error:'Invalid email or password', copyright:'© 2026 Taseerak · Procurement platform for contractors', s_auth:'Step 1/3: verifying your credentials…', s_role:'Step 2/3: reading your role…', s_go:'Step 3/3: signed in ✓ redirecting…', err_timeout:'Timed out with no response. Your network may be blocking the server — try another network (e.g. mobile data) and retry.', brandH:'One request, competed for by the best suppliers.', brandP:'Sign in and track your RFQs and offers in one place — from request to purchase order.', l1:'Verified, classified suppliers', l2:'Compare offers vs market average', l3:'Upload a BOQ and auto-route it', remember:'Remember me', forgot:'Forgot password?', or:'or', home:'Home', captchaErr:'Please complete the “I am human” check and try again.' },
  ur: { welcome:'خوش آمدید', sub:'اپنے اکاؤنٹ تک جاری رکھنے کے لیے سائن ان کریں', email:'ای میل', password:'پاسورڈ', login:'سائن ان', logging:'سائن ان ہو رہا ہے...', noAccount:'اکاؤنٹ نہیں ہے؟', register:'نیا اکاؤنٹ بنائیں', error:'غلط ای میل یا پاسورڈ', copyright:'© ۲۰۲۶ تسعیرک · ٹھیکیداروں کے لیے پلیٹ فارم', s_auth:'مرحلہ 1/3: تصدیق ہو رہی ہے…', s_role:'مرحلہ 2/3: کردار پڑھا جا رہا ہے…', s_go:'مرحلہ 3/3: سائن ان ✓ منتقل ہو رہا ہے…', err_timeout:'کوئی جواب نہیں ملا۔ ہو سکتا ہے آپ کا نیٹ ورک سرور کو بلاک کر رہا ہو — دوسرا نیٹ ورک آزمائیں۔', brandH:'ایک درخواست، بہترین سپلائرز کا مقابلہ۔', brandP:'سائن ان کریں اور اپنی درخواستیں اور پیشکشیں ایک جگہ دیکھیں۔', l1:'تصدیق شدہ، درجہ بند سپلائرز', l2:'مارکیٹ اوسط کے مقابلے موازنہ', l3:'BOQ اپ لوڈ کریں اور خودکار تقسیم', remember:'مجھے یاد رکھیں', forgot:'پاسورڈ بھول گئے؟', or:'یا', home:'ہوم', captchaErr:'براہ کرم تصدیق مکمل کریں (میں روبوٹ نہیں ہوں) اور دوبارہ کوشش کریں۔' },
}

function LoginForm() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)

  // Reject if a promise doesn't settle in `ms` — converts an invisible hang
  // into a clear, reportable error instead of a spinner that never stops.
  function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
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

  // Safe redirect: only allow same-origin absolute paths (guard against open-redirect).
  // Require a single leading "/" and reject any backslash (char 92) or control char (<32),
  // since browsers normalize a leading backslash to "/" and strip control chars.
  function safeRedirect(path: string | null, fallback: string) {
    if (!path || path[0] !== '/' || path[1] === '/') return fallback
    for (let i = 0; i < path.length; i++) { const c = path.charCodeAt(i); if (c === 92 || c < 32) return fallback }
    return path
  }

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      // Validate with getUser() (same check the middleware uses) so the client
      // and server always agree — otherwise a stale local cookie causes an
      // infinite login <-> dashboard redirect loop.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('role, region').eq('id', user.id).single()
        const role = p?.role || (user.user_metadata as any)?.role
        const next = searchParams.get('next')
        // مستخدم جديد لم يُكمل ملفه (لا منطقة) → «أكمل ملفك»
        const fallback = (role !== 'admin' && !p?.region) ? '/onboarding' : roleHome(role)
        window.location.href = safeRedirect(next, fallback)
        return
      }
      // No valid server-side session. SELF-HEAL: wipe any stale/corrupt auth
      // artifacts left behind by older versions of the app.
      try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
      try {
        Object.keys(window.localStorage).forEach((k) => {
          if (k.startsWith('sb-') || k.toLowerCase().includes('supabase')) {
            window.localStorage.removeItem(k)
          }
        })
        document.cookie.split(';').forEach((c) => {
          const name = c.split('=')[0].trim()
          if (name.startsWith('sb-')) {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          }
        })
      } catch {}
    })()
  }, [])

  async function handleLogin(e: any) {
    e.preventDefault()
    setLoading(true); setError(''); setStatus(t.s_auth); setProgress(18)
    const supabase = createClient()
    try {
      // تسجيل الدخول بالجوال: مسار خادمي يحوّل الرقم→الحساب ويضبط الجلسة (البريد لا يُكشف).
      if (mode === 'phone') {
        if (!/^05[0-9]{8}$/.test(phone)) { setError(t.error); setLoading(false); setStatus(''); setProgress(0); return }
        const res = await withTimeout(fetch('/api/auth/phone-login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password, captchaToken: captchaToken || undefined }),
        }), 15000, 'signin')
        const j = await res.json().catch(() => ({}))
        if (!res.ok || !j?.ok) {
          captchaRef.current?.reset(); setCaptchaToken('')
          setError(j?.error === 'captcha' ? t.captchaErr : t.error)
          setLoading(false); setStatus(''); setProgress(0); return
        }
        setStatus(t.s_go); setProgress(100)
        const role = j.role || 'contractor'
        const next = searchParams.get('next')
        const fallback = (role !== 'admin' && !j.region) ? '/onboarding' : roleHome(role)
        window.location.href = safeRedirect(next, fallback)
        return
      }
      // STEP 1/3 — authenticate (with a hard 15s ceiling so it can never hang)
      const { data, error: err } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } }), 15000, 'signin'
      )
      if (err) {
        // A used/expired CAPTCHA token can't be reused — refresh it for the retry.
        captchaRef.current?.reset(); setCaptchaToken('')
        setError(/captcha/i.test(err.message || '') ? t.captchaErr : t.error)
        setLoading(false); setStatus(''); setProgress(0); return
      }
      if (!data?.session) { setError(t.error); setLoading(false); setStatus(''); setProgress(0); return }

      // STEP 2/3 — read role (don't block login if it stalls; fall back gracefully)
      setStatus(t.s_role); setProgress(62)
      let role = (data.session.user.user_metadata as any)?.role || 'contractor'
      let region: string | null = null
      try {
        const { data: p } = await withTimeout(
          supabase.from('profiles').select('role, region').eq('id', data.session.user.id).single(),
          12000, 'profile'
        )
        if (p?.role) role = p.role
        region = p?.region || null
      } catch (e2) { console.error('[login] role read failed:', e2) }

      // STEP 3/3 — hard redirect (full reload so middleware sees the cookie)
      setStatus(t.s_go); setProgress(100)
      const next = searchParams.get('next')
      // مستخدم جديد لم يُكمل ملفه (لا منطقة) → «أكمل ملفك»
      const fallback = (role !== 'admin' && !region) ? '/onboarding' : roleHome(role)
      window.location.href = safeRedirect(next, fallback)
    } catch (e) {
      console.error('[login] failed:', e)
      const msg = (e && (e as any).message) || ''
      captchaRef.current?.reset(); setCaptchaToken('')
      if (msg.indexOf('TIMEOUT:signin') === 0) setError(t.err_timeout + ' (1/3)')
      else if (msg.indexOf('TIMEOUT:profile') === 0) setError(t.err_timeout + ' (2/3)')
      else setError(t.error)
      setLoading(false); setStatus(''); setProgress(0)
    }
  }

  return (
    <div className="min-h-screen flex" dir={dir}>
      {/* ===== Brand panel (hidden on small screens) ===== */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg,#0a1530 0%,#1B2D5B 55%,#2a4a8a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[8%] right-[8%] w-[420px] h-[420px] rounded-full blur-3xl" style={{ background: 'rgba(245,131,31,.12)' }} />
          <div className="absolute bottom-[6%] left-[6%] w-[480px] h-[480px] rounded-full blur-3xl bg-white/5" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-white grid place-items-center shadow-lg"><img src="/logo.png" alt="تسعيرك" className="w-8 h-8 object-contain" /></span>
          <span className="text-2xl font-extrabold">تسعير<span className="text-orange">ك</span></span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl xl:text-[40px] font-extrabold leading-[1.25] mb-4">{t.brandH}</h2>
          <p className="text-blue-100/80 text-base mb-8 leading-relaxed">{t.brandP}</p>
          <ul className="space-y-4">
            {[t.l1, t.l2, t.l3].map((it, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px] text-blue-50">
                <span className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: '#F5831F' }}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </span>{it}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-xs text-blue-200/50">{t.copyright}</div>
      </div>

      {/* ===== Form panel ===== */}
      <div className="flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center justify-between p-5">
          <a href="/" className="text-sm font-semibold text-ink-2 hover:text-navy transition-colors">⌂ {t.home}</a>
          <LanguageSwitcher variant="minimal" />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 pb-12">
          <div className="w-full max-w-[400px] animate-slide-up">
            <div className="flex lg:hidden items-center gap-3 justify-center mb-7">
              <span className="w-11 h-11 rounded-2xl grid place-items-center shadow-md" style={{ background: '#1B2D5B' }}><img src="/logo.png" alt="تسعيرك" className="w-8 h-8 object-contain" /></span>
              <span className="text-2xl font-extrabold text-navy">تسعير<span className="text-orange">ك</span></span>
            </div>

            <h1 className="text-[26px] font-extrabold text-navy mb-1">{t.welcome}</h1>
            <p className="text-ink-2 text-sm mb-6">{t.sub}</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4 animate-fade-in">⚠️ {error}</div>}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* اختيار طريقة الدخول */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100">
                {[
                  { k: 'email', label: locale === 'en' ? '📧 Email' : locale === 'ur' ? '📧 ای میل' : '📧 البريد' },
                  { k: 'phone', label: locale === 'en' ? '📱 Phone' : locale === 'ur' ? '📱 فون' : '📱 الجوال' },
                ].map(o => (
                  <button key={o.k} type="button" onClick={() => { setMode(o.k as any); setError('') }}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${mode === o.k ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              {mode === 'email' ? (
                <div>
                  <label className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.email}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="name@company.com" autoComplete="username" required disabled={loading} />
                </div>
              ) : (
                <div>
                  <label className="block text-[13px] font-bold text-ink-2 mb-1.5">{locale === 'en' ? 'Phone (WhatsApp)' : locale === 'ur' ? 'فون (واٹس ایپ)' : 'رقم الجوال (واتساب)'}</label>
                  <input type="tel" inputMode="numeric" dir="ltr" maxLength={10} value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    className="input-field" placeholder="05XXXXXXXX" autoComplete="tel" required disabled={loading} />
                  <p className="text-[11px] text-gray-400 mt-1">{locale === 'en' ? '🔑 OTP login is coming soon.' : locale === 'ur' ? '🔑 OTP لاگ اِن جلد آ رہا ہے۔' : '🔑 تسجيل الدخول برمز OTP قريباً.'}</p>
                </div>
              )}
              <div>
                <label className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.password}</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field pe-11" placeholder="••••••••" autoComplete="current-password" required disabled={loading} />
                  <button type="button" onClick={() => setShowPass(s => !s)} aria-label="إظهار كلمة المرور"
                    className="absolute inset-y-0 end-3 my-auto h-5 w-5 text-ink-3 hover:text-orange-dark transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer select-none">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[#F5831F]" /> {t.remember}
                </label>
                <a href="/forgot-password" className="text-[13px] font-bold text-orange-dark hover:underline">{t.forgot}</a>
              </div>

              <div className="flex justify-center">
                <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} />
              </div>

              <button type="submit" disabled={loading} className="btn-orange w-full btn-lg">
                {loading ? (
                  <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t.logging}</span>
                ) : (
                  <>{t.login}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] rtl:rotate-180"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-ink-3 text-xs">
              <span className="h-px flex-1" style={{ background: 'var(--line)' }} />{t.or}<span className="h-px flex-1" style={{ background: 'var(--line)' }} />
            </div>

            <p className="text-center text-sm text-ink-2">
              {t.noAccount} <a href="/register" className="font-extrabold text-orange-dark hover:underline">{t.register}</a>
            </p>
          </div>
        </div>
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
