'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Turnstile from '@/components/shared/Turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'
import PhoneOtpForm from '@/components/auth/PhoneOtpForm'
import { rememberPostSignupNext, takePostSignupNext } from '@/lib/postSignupNext'
import { packById } from '@/lib/homePacks'
import { BROWSE_SECTIONS } from '@/lib/browseCategories'
import FixSignupEmail from '@/components/auth/FixSignupEmail'
import { BUYER_PHONE_LOGIN as PHONE_OTP_ENABLED } from '@/lib/features'
import { pendingTeamInvite } from '@/lib/sellers'
import { captureRef } from '@/lib/referral'
import { firebaseReady } from '@/lib/firebaseConfig'
import { OPERATOR } from '@/lib/legal'

const SUPPORT_WHATSAPP = '12135614366'
const PHONE_FLAG_KEY = 'tsk_phone_login_on'
const SMS_DOWN_KEY = 'tsk_sms_down'
function smsDownCached(): boolean { try { return sessionStorage.getItem(SMS_DOWN_KEY) === '1' } catch { return false } }
function askedPhone(): boolean { try { return new URLSearchParams(window.location.search).get('m') === 'phone' } catch { return false } }

const txt = {
  ar: { welcome:'أهلاً بعودتك', sub:'سجّل دخولك للمتابعة إلى حسابك', email:'البريد الإلكتروني', password:'كلمة المرور', login:'تسجيل الدخول', logging:'جارٍ الدخول...', noAccount:'ليس لديك حساب؟', register:'أنشئ حساباً جديداً', error:'البريد أو كلمة المرور غير صحيحة', copyright:'© 2026 تسعيرك · منصة التسعير والتوريد لمواد البناء', s_auth:'جارٍ تسجيل الدخول…', s_role:'الخطوة 2/3: جارٍ قراءة الصلاحية…', s_go:'جارٍ فتح حسابك…', err_timeout:'انتهت المهلة دون استجابة. قد يكون اتصالك بالإنترنت يحجب الخادم — جرّب شبكة أخرى (بيانات الجوال مثلاً) ثم أعد المحاولة.', brandH:'طلب تسعير واحد، ويتنافس عليه الموردون.', brandP:'سجّل دخولك وتابع طلباتك وعروضك في مكان واحد، من الطلب حتى الاستلام.', l1:'يظهر بجانب كل مورد توثيق سجلّه التجاري', l2:'قارن العروض واختر الأنسب لكل مادة', l3:'اكتب قائمة موادك أو صوّرها، ونرسلها إلى الموردين المناسبين', remember:'تذكّرني', forgot:'نسيت كلمة المرور؟', or:'أو', home:'الرئيسية', captchaErr:'يرجى إكمال خطوة التحقق (لستُ روبوتاً) ثم إعادة المحاولة.' },
  en: { welcome:'Welcome back', sub:'Sign in to continue to your account', email:'Email Address', password:'Password', login:'Sign In', logging:'Signing in...', noAccount:"Don't have an account?", register:'Create a new account', error:'Invalid email or password', copyright:'© 2026 Taseerak · Price requests for building and home materials', s_auth:'Signing in…', s_role:'Step 2/3: reading your role…', s_go:'Opening your account…', err_timeout:'Timed out with no response. Your network may be blocking the server — try another network (e.g. mobile data) and retry.', brandH:'One request, and suppliers compete for it.', brandP:'Sign in and track your requests and offers in one place, from request to delivery.', l1:'See whether each supplier’s commercial registration is verified', l2:'Compare offers and choose the best one for each item', l3:'Write or photograph your materials list; we send it to the right suppliers', remember:'Remember me', forgot:'Forgot password?', or:'or', home:'Home', captchaErr:'Please complete the “I am human” check and try again.' },
  ur: { welcome:'خوش آمدید', sub:'اپنے اکاؤنٹ تک جاری رکھنے کے لیے سائن ان کریں', email:'ای میل', password:'پاسورڈ', login:'سائن ان', logging:'سائن ان ہو رہا ہے...', noAccount:'اکاؤنٹ نہیں ہے؟', register:'نیا اکاؤنٹ بنائیں', error:'غلط ای میل یا پاسورڈ', copyright:'© ۲۰۲۶ تسعیرک · تعمیراتی سامان کا پلیٹ فارم', s_auth:'سائن ان ہو رہا ہے…', s_role:'مرحلہ 2/3: کردار پڑھا جا رہا ہے…', s_go:'آپ کا اکاؤنٹ کھل رہا ہے…', err_timeout:'کوئی جواب نہیں ملا۔ ہو سکتا ہے آپ کا نیٹ ورک سرور کو بلاک کر رہا ہو — دوسرا نیٹ ورک آزمائیں۔', brandH:'ایک درخواست، اور سپلائرز مقابلہ کرتے ہیں۔', brandP:'سائن ان کریں اور اپنی درخواستیں اور پیشکشیں ایک جگہ دیکھیں۔', l1:'دیکھیں کہ ہر سپلائر کا تجارتی رجسٹریشن تصدیق شدہ ہے یا نہیں', l2:'آفرز کا موازنہ کریں اور ہر چیز کے لیے سب سے موزوں چنیں', l3:'اپنے سامان کی فہرست لکھیں یا تصویر لیں؛ ہم اسے صحیح سپلائرز تک بھیجتے ہیں', remember:'مجھے یاد رکھیں', forgot:'پاسورڈ بھول گئے؟', or:'یا', home:'ہوم', captchaErr:'براہ کرم تصدیق مکمل کریں (میں روبوٹ نہیں ہوں) اور دوبارہ کوشش کریں۔' },
}

function LoginForm() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const searchParams = useSearchParams()
  const PHONE_READY = PHONE_OTP_ENABLED && firebaseReady()
  const askedEmail = searchParams.get('m') === 'email'
  // remote switches: app_flags (migration 228) turns buyer phone sign-in off; sms_is_down (migration 282)
  // means codes cannot arrive, so the email tab opens first. Both are known BEFORE the form shows, so the
  // page never jumps from the phone tab to the email form while someone types (round-7 UX-114).
  const cachedFlag = (): boolean | null => {
    if (!PHONE_READY) return false
    try { const v = sessionStorage.getItem(PHONE_FLAG_KEY); return v === '1' ? true : v === '0' ? false : null } catch { return null }
  }
  const [phoneOn, setPhoneOn] = useState<boolean | null>(PHONE_READY ? null : false)
  const [mode, setMode] = useState<'email' | 'phone'>(PHONE_READY && !askedEmail ? 'phone' : 'email')
  // texts cannot arrive (sms_is_down): the page reads as «start free», never «welcome back», and offers
  // no phone code (round-8 UX-001 / UX-013)
  const [smsDown, setSmsDown] = useState(false)
  useEffect(() => {
    let done = false
    const settle = (on: boolean, down: boolean) => {
      setSmsDown(down)
      if (done) return
      done = true
      setPhoneOn(on)
      if (!on || (down && !askedPhone())) setMode('email')
    }
    if (!PHONE_READY) {
      // phone sign-in is off on this build, but the outage still decides the wording
      if (smsDownCached()) setSmsDown(true)
      createClient().rpc('sms_is_down').then(({ data }: any) => { setSmsDown(data === true); try { sessionStorage.setItem(SMS_DOWN_KEY, data === true ? '1' : '0') } catch {} }, () => {})
      return
    }
    // this browser session already knows the switches: show the form at once, refresh quietly
    const known = cachedFlag()
    if (known !== null) settle(known, smsDownCached())
    const timer = setTimeout(() => settle(cachedFlag() ?? true, smsDownCached()), 1500)
    const sb = createClient()
    Promise.all([sb.rpc('app_flags'), sb.rpc('sms_is_down')]).then(([f, d]: any[]) => {
      const on = !(f?.data && f.data.buyer_phone_login === false)
      const down = d?.data === true
      try { sessionStorage.setItem(PHONE_FLAG_KEY, on ? '1' : '0'); sessionStorage.setItem(SMS_DOWN_KEY, down ? '1' : '0') } catch {}
      clearTimeout(timer)
      settle(on, down)
    }, () => { clearTimeout(timer); settle(cachedFlag() ?? true, smsDownCached()) })
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Phone sign-in off and the visitor did not ask for the email sign-in: most arrive from «Start now», so
  // open on «start free» with a clear «create an account» button; the «welcome back» form is one tap away (UX-003)
  const [emailFormOpen, setEmailFormOpen] = useState(askedEmail)
  // the tab title follows the chosen language (round-8 UX-126)
  useEffect(() => { try { document.title = L('Sign in · Taseerak', 'سائن اِن · تسعیرک', 'الدخول · تسعيرك') } catch {} }, [locale]) // eslint-disable-line react-hooks/exhaustive-deps
  const nextParam = searchParams.get('next') || ''
  const registerHref = nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : '/register'
  // why the visitor is here when a link sent them (UX-097)
  // the pack or section the visitor picked on the landing page (round-5 UX-127)
  const nextQuery = (() => { try { return new URLSearchParams(nextParam.split('?')[1] || '') } catch { return new URLSearchParams() } })()
  const pickedPack = packById(nextQuery.get('pack'))
  const pickedSection = BROWSE_SECTIONS.find(s => s.key === nextQuery.get('section')) || null
  const pickedLabel = pickedPack ? L(pickedPack.en, pickedPack.ur, pickedPack.ar) : pickedSection ? L(pickedSection.en, pickedSection.ur, pickedSection.ar) : ''
  // «with your mobile number» only while the phone sign-in is on AND texts arrive; otherwise the email
  // account (round-6 UX-025, round-8 UX-001)
  const viaPhone = !!phoneOn && !smsDown
  const viaEn = viaPhone ? 'with your mobile number' : 'with your email'
  const viaUr = viaPhone ? 'اپنے موبائل نمبر سے' : 'اپنی ای میل سے'
  const viaAr = viaPhone ? 'برقم جوالك' : 'بالبريد الإلكتروني'
  const nextNote = !nextParam ? ''
    // a visitor who built a list on the request page and pressed «إرسال» (round-4 UX-056)
    : /^\/contractor\/rfq\/quick\?(.*&)?guest=1/.test(nextParam)
      ? L(`Create your account ${viaEn} to send the request. You will not lose your list.`, `درخواست بھیجنے کے لیے ${viaUr} اکاؤنٹ بنائیں۔ آپ کی فہرست محفوظ رہے گی۔`, `أنشئ حسابك ${viaAr} لإرسال الطلب، ولن تفقد قائمتك.`)
    : pickedPack
      ? L(`You chose: ${pickedLabel}. Create your account ${viaEn}, and the materials list will be ready for you to edit and send.`, `آپ نے منتخب کیا: ${pickedLabel}۔ ${viaUr} اکاؤنٹ بنائیں، اشیاء کی فہرست تیار ملے گی جسے آپ بدل کر بھیج سکتے ہیں۔`, `اخترت: ${pickedLabel}. أنشئ حسابك ${viaAr}، وستجد قائمة المواد جاهزة لتعدّلها وترسلها.`)
    : pickedSection
      ? L(`You chose: ${pickedLabel}. Create your account ${viaEn} to pick the materials and send your request.`, `آپ نے منتخب کیا: ${pickedLabel}۔ اشیاء چننے اور درخواست بھیجنے کے لیے ${viaUr} اکاؤنٹ بنائیں۔`, `اخترت: ${pickedLabel}. أنشئ حسابك ${viaAr} لتختار المواد وترسل طلبك.`)
    : /^\/contractor\/(rfq\/quick|project\/new)/.test(nextParam)
      ? L('Create a free account to request prices for what you need.', 'جو آپ کو چاہیے اس کی قیمتیں منگوانے کے لیے مفت اکاؤنٹ بنائیں۔', 'أنشئ حساباً مجانياً لتطلب أسعار ما تحتاجه.')
      : L('Sign in to open the page whose link you received.', 'جس صفحے کا لنک آپ کو ملا ہے اسے کھولنے کے لیے سائن اِن کریں۔', 'سجّل الدخول لفتح الصفحة التي وصلك رابطها.')
  // the phone form's step: its code and name steps hide the tabs and the title (round-5 UX-121)
  const [otpStep, setOtpStep] = useState<'phone' | 'code' | 'name'>('phone')
  const otpBusy = mode === 'phone' && otpStep !== 'phone'
  const [bannedErr, setBannedErr] = useState(false)
  const intro = mode === 'email' && (!phoneOn || smsDown) && !emailFormOpen
  // the phone tab is hidden during the outage, unless the visitor asked for it with ?m=phone (round-8 UX-013)
  const showTabs = !!phoneOn && (!smsDown || askedPhone())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false) // e-mail not confirmed: offer resend / correct the address
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  // Landing from the email-confirmation link (UX-170): ?confirmed=1 → «confirmed, sign in now»;
  // an expired/invalid link (error_code in the query or the #hash) → explain it and how to get a new one.
  const [confirmNote, setConfirmNote] = useState<'' | 'ok' | 'expired'>('')
  useEffect(() => {
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = searchParams.get('error_code') || hash.get('error_code') || ''
      if (code || searchParams.get('error') === 'access_denied' || hash.get('error') === 'access_denied') { setConfirmNote('expired'); setMode('email'); setEmailFormOpen(true) }
      else if (searchParams.get('confirmed') === '1') { setConfirmNote('ok'); setMode('email'); setEmailFormOpen(true) }
    } catch {}
  }, [])

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

  // Where a signed-in user goes: pick a role first (phone signups), then complete the profile.
  async function routeSignedIn(userId: string, metaRole?: string) {
    // A company team invitation opened before signing in comes first.
    const invite = pendingTeamInvite()
    if (invite) { window.location.href = `/team/join/${invite}`; return }
    const supabase = createClient()
    let p: any = null
    try {
      const r: any = await withTimeout(supabase.from('profiles').select('role, region, role_chosen_at').eq('id', userId).single(), 12000, 'profile')
      p = r?.data
    } catch (e2) { console.error('[login] role read failed:', e2) }
    const role = p?.role || metaRole || 'contractor'
    if (role !== 'admin' && p && !p.role_chosen_at) { window.location.href = '/welcome'; return }
    const fallback = (role !== 'admin' && p && !p.region) ? '/onboarding' : roleHome(role)
    const target = safeRedirect(searchParams.get('next'), fallback)
    // used now: forget the remembered copy, so it never opens days later after onboarding (round-5 UX-120)
    if (target !== fallback) takePostSignupNext()
    window.location.href = target
  }

  useEffect(() => {
    captureRef() // an invite link may land here (phone sign-in)
    rememberPostSignupNext(searchParams.get('next')) // a landing section card → after a phone sign-up + onboarding, open that section
    const supabase = createClient()
    ;(async () => {
      // Validate with getUser() (same check the middleware uses) so the client
      // and server always agree — otherwise a stale local cookie causes an
      // infinite login <-> dashboard redirect loop.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { await routeSignedIn(user.id, (user.user_metadata as any)?.role); return }
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
    setLoading(true); setError(''); setBannedErr(false); setStatus(t.s_auth); setProgress(18)
    const supabase = createClient()
    try {
      // STEP 1/3 — authenticate (with a hard 15s ceiling so it can never hang)
      const { data, error: err } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } }), 15000, 'signin'
      )
      if (err) {
        // A used/expired CAPTCHA token can't be reused — refresh it for the retry.
        captchaRef.current?.reset(); setCaptchaToken('')
        setUnconfirmed(/not confirmed/i.test(err.message || '') || (err as any).code === 'email_not_confirmed')
        // an account the admins closed or suspended must not read as a wrong password (UX-116)
        const banned = (err as any).code === 'user_banned' || /banned/i.test(err.message || '')
        setBannedErr(banned)
        setError(banned ? L('This account has been suspended by the administration, so it cannot be signed in to. Contact support to find out why.', 'یہ اکاؤنٹ انتظامیہ نے معطل کر دیا ہے، اس لیے اس میں سائن اِن نہیں ہو سکتا۔ وجہ جاننے کے لیے سپورٹ سے رابطہ کریں۔', 'هذا الحساب موقوف من الإدارة، لذا لا يمكن الدخول إليه. تواصل مع الدعم لمعرفة السبب.')
          : /captcha/i.test(err.message || '') ? t.captchaErr
          : /not confirmed/i.test(err.message || '') || (err as any).code === 'email_not_confirmed'
            ? L('Confirm your email first: open the link we sent to your inbox (check spam too), then sign in.', 'پہلے اپنی ای میل کی تصدیق کریں: ہمارا بھیجا ہوا لنک کھولیں (اسپام بھی دیکھیں)، پھر سائن اِن کریں۔', 'أكّد بريدك الإلكتروني أولاً من الرابط الذي أرسلناه إليك (تحقّق من مجلد الرسائل غير المرغوب فيها أيضاً)، ثم سجّل الدخول.')
            : t.error)
        setLoading(false); setStatus(''); setProgress(0); return
      }
      if (!data?.session) { setError(t.error); setLoading(false); setStatus(''); setProgress(0); return }

      // STEP 2/3 + 3/3: read the profile, then hard redirect (full reload so middleware sees the cookie)
      setStatus(t.s_go); setProgress(100)
      await routeSignedIn(data.session.user.id, (data.session.user.user_metadata as any)?.role)
    } catch (e) {
      console.error('[login] failed:', e)
      const msg = (e && (e as any).message) || ''
      captchaRef.current?.reset(); setCaptchaToken('')
      if (msg.indexOf('TIMEOUT:signin') === 0) setError(t.err_timeout)
      else if (msg.indexOf('TIMEOUT:profile') === 0) setError(t.err_timeout)
      else setError(t.error)
      setLoading(false); setStatus(''); setProgress(0)
    }
  }

  if (phoneOn === null) return <LoginSkeleton />

  return (
    <div className="auth-screen min-h-screen flex" dir={dir}>
      {/* ===== Brand panel (hidden on small screens) ===== */}
      <div className="auth-brand-panel hidden lg:flex lg:w-[46%] relative overflow-hidden flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg,#071827 0%,#0B2438 55%,#102E45 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[8%] right-[8%] w-[420px] h-[420px] rounded-full blur-3xl" style={{ background: 'rgba(212,165,67,.12)' }} />
          <div className="absolute bottom-[6%] left-[6%] w-[480px] h-[480px] rounded-full blur-3xl bg-white/5" />
        </div>
        <div className="relative z-10 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-brand-lockup" />
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl xl:text-[40px] font-extrabold leading-[1.25] mb-4">{t.brandH}</h2>
          <p className="text-white/80 text-base mb-8 leading-relaxed">{t.brandP}</p>
          <ul className="space-y-4">
            {[t.l1, t.l2, t.l3].map((it, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: '#D4A543' }}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#071827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </span>{it}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-xs text-white/50">{t.copyright}</div>
      </div>

      {/* ===== Form panel ===== */}
      <div className="auth-form-side flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>
        {/* one public top bar (round-4 UX-176): logo, then the language, then the way home */}
        <div className="flex items-center justify-between gap-2 p-5">
          <a href="/" className="lg:invisible flex items-center min-h-[44px] shrink-0" aria-label="تسعيرك — Taseerak">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="h-11 w-auto" />
          </a>
          <div className="flex items-center gap-1">
            <LanguageSwitcher variant="minimal" />
            <a href="/" className="flex items-center gap-1.5 min-h-[44px] px-2 text-sm font-semibold text-ink-2 hover:text-navy transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
              {t.home}
            </a>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-3 sm:px-5 pb-12">
          <div className="auth-form-card w-full max-w-[480px] animate-slide-up">

            {/* every «Start now» button lands here: the phone title says «start», not only «sign in» (UX-134).
                With phone sign-in off, a new visitor sees «start free» + «create an account», never «welcome back» first (UX-003) */}
            {!otpBusy && <>
            <h1 className="text-[26px] font-bold text-navy mb-1">{mode === 'phone' ? L('Start with your mobile number', 'اپنے موبائل نمبر سے شروع کریں', 'ابدأ برقم جوالك') : intro ? L('Start free', 'مفت شروع کریں', 'ابدأ مجاناً') : t.welcome}</h1>
            <p className="text-ink-2 text-sm mb-5">{mode === 'phone' && smsDown ? L('The text message service is temporarily down, so sign in or create your account with your email.', 'ٹیکسٹ میسج سروس عارضی طور پر بند ہے، اس لیے اپنی ای میل سے سائن اِن کریں یا اکاؤنٹ بنائیں۔', 'خدمة الرسائل النصية متوقفة مؤقتاً، فادخل أو أنشئ حسابك بالبريد الإلكتروني.') : mode === 'phone' ? L('We will send you a verification code by text message. If your number is new, we create a free buyer account for you.', 'ہم آپ کو ٹیکسٹ میسج سے تصدیقی کوڈ بھیجیں گے۔ اگر آپ کا نمبر نیا ہے تو ہم آپ کے لیے مفت خریدار اکاؤنٹ بنا دیں گے۔', 'سنرسل إليك رمز تحقق برسالة نصية. إن كان رقمك جديداً أنشأنا لك حساب مشتري مجاناً.') : intro ? (smsDown ? L('Create your account with your email, or sign in if you already have one.', 'ای میل سے اپنا اکاؤنٹ بنائیں، یا اگر اکاؤنٹ ہے تو سائن اِن کریں۔', 'أنشئ حسابك بالبريد الإلكتروني، أو سجّل الدخول إن كان لديك حساب.') : L('Create your account with your email.', 'ای میل سے اپنا اکاؤنٹ بنائیں۔', 'أنشئ حسابك بالبريد الإلكتروني.')) : t.sub}</p>
            </>}

            {nextNote && !otpBusy && (
              <div className="flex items-start gap-2 text-sm rounded-xl p-3 mb-4 border" style={{ background: '#EEF2F6', borderColor: '#D5DEE8', color: '#0B2438' }} role="status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                <span>{nextNote}</span>
              </div>
            )}

            {/* two ways in, side by side at the top, while phone sign-in is on (UX-130) */}
            {showTabs && !otpBusy && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-5" style={{ background: '#EEF2F6' }} role="tablist" aria-label={L('How to sign in', 'سائن اِن کا طریقہ', 'طريقة الدخول')}>
                {([['phone', L('Mobile number (buyers)', 'موبائل نمبر (خریدار)', 'برقم الجوال (للمشترين)')], ['email', L('Email', 'ای میل', 'بالبريد الإلكتروني')]] as const).map(([m, label]) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m}
                    onClick={() => { setMode(m); setError(''); if (m === 'email') setEmailFormOpen(true) }}
                    className={`min-h-[44px] rounded-lg text-[13px] font-bold transition-colors ${mode === m ? 'bg-white text-navy shadow-sm' : 'text-ink-2 hover:text-navy'}`}>{label}</button>
                ))}
              </div>
            )}

            {confirmNote === 'ok' && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl p-3 mb-4" role="status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
                <span>{L('Your email is confirmed. Sign in now.', 'آپ کی ای میل کی تصدیق ہو گئی۔ اب سائن اِن کریں۔', 'تم تأكيد بريدك الإلكتروني. سجّل الدخول الآن.')}</span>
              </div>
            )}
            {confirmNote === 'expired' && (
              <div className="bg-warn-bg border border-warn-border text-warn-text text-sm rounded-xl p-3 mb-4" role="alert">
                {L('The confirmation link has expired or was already used. Sign in with your email and password: if the email is not confirmed yet, we will offer to send a new link.', 'تصدیقی لنک کی مدت ختم ہو گئی یا یہ پہلے استعمال ہو چکا ہے۔ اپنی ای میل اور پاسورڈ سے سائن اِن کریں: اگر ای میل ابھی تصدیق نہیں ہوئی تو ہم نیا لنک بھیجنے کی پیشکش کریں گے۔', 'انتهت صلاحية رابط التأكيد أو سبق استخدامه. سجّل الدخول ببريدك وكلمة المرور، فإن لم يكن البريد مؤكَّداً بعد عرضنا عليك إرسال رابط جديد.')}
              </div>
            )}

            {/* the phone form stays mounted while the email tab is open, so a code already sent is not lost (round-5 UX-121) */}
            {phoneOn && (
              <div hidden={mode !== 'phone'}>
                <PhoneOtpForm registerHref={registerHref} onStep={setOtpStep} defaultBuyerType={pickedPack ? 'individual' : undefined} onSignedIn={async () => {
                  const { data: { user } } = await createClient().auth.getUser()
                  if (user) await routeSignedIn(user.id)
                }} onUseEmail={() => { setMode('email'); setEmailFormOpen(true); setError('') }} />
              </div>
            )}
            {mode === 'phone' ? (
              !otpBusy && <>
              {/* owner 2026-11-21: a new seller must not end up as a buyer through the phone sign-up.
                  One word for sellers everywhere: «مورد» (UX-134) */}
              <p className="mt-4 text-sm text-center text-ink-2">{L('Supplier or pricing agent?', 'سپلائر یا قیمت ایجنٹ؟', 'مورد أو وسيط تسعير؟')} <a href="/join" className="inline-flex items-center min-h-[44px] font-bold text-orange-dark hover:underline">{L('Sign up as a supplier', 'سپلائر کے طور پر رجسٹر کریں', 'سجّل كمورد')}</a></p>
              {/* a returning supplier signs in by email (round-4 UX-111) */}
              <p className="text-sm text-center text-ink-2">{L('Have a supplier account?', 'سپلائر اکاؤنٹ ہے؟', 'لديك حساب مورد؟')} <button type="button" onClick={() => { setMode('email'); setEmailFormOpen(true); setError('') }} className="inline-flex items-center min-h-[44px] font-bold text-orange-dark hover:underline">{L('Sign in with email', 'ای میل سے سائن اِن کریں', 'ادخل بالبريد الإلكتروني')}</button></p>
              </>
            ) : intro ? (
              <div className="space-y-3">
                <a href={registerHref} className="btn-orange w-full btn-lg inline-flex items-center justify-center gap-2">
                  {L('Create a new account', 'نیا اکاؤنٹ بنائیں', 'أنشئ حساباً جديداً')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] rtl:rotate-180" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
                <button type="button" onClick={() => { setEmailFormOpen(true); setError('') }} className="btn-ghost w-full min-h-[44px]">
                  {L('Have an account? Sign in', 'اکاؤنٹ ہے؟ سائن اِن کریں', 'لديك حساب؟ سجّل الدخول')}
                </button>
                <p className="pt-2 text-sm text-center text-ink-2">{L('Supplier or pricing agent?', 'سپلائر یا قیمت ایجنٹ؟', 'مورد أو وسيط تسعير؟')} <a href="/join" className="inline-flex items-center min-h-[44px] font-bold text-orange-dark hover:underline">{L('Sign up as a supplier', 'سپلائر کے طور پر رجسٹر کریں', 'سجّل كمورد')}</a></p>
              </div>
            ) : (
              <>
                {error && <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4 animate-fade-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
                  <span>{error}
                    {/* suspended account: real support channels, not a raw number in the sentence (UX-130) */}
                    {bannedErr && <span className="flex flex-wrap gap-x-4 mt-1">
                      <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] font-bold underline">{L('Support on WhatsApp', 'واٹس ایپ پر سپورٹ', 'واتساب الدعم')}</a>
                      <a href={`mailto:${OPERATOR.email}`} dir="ltr" className="inline-flex items-center min-h-[44px] font-bold underline">{OPERATOR.email}</a>
                    </span>}
                  </span></div>}
                {unconfirmed && email && password && <FixSignupEmail email={email} password={password} locale={locale} onFixed={(e) => { setEmail(e); setError('') }} />}
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label htmlFor="login-email" className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.email}</label>
                    <input id="login-email" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="name@example.com" autoComplete="username" required disabled={loading} />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="block text-[13px] font-bold text-ink-2 mb-1.5">{t.password}</label>
                    <div className="relative">
                      <input id="login-password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field pe-11" placeholder="••••••••" autoComplete="current-password" required disabled={loading} />
                      <button type="button" onClick={() => setShowPass(s => !s)} aria-pressed={showPass}
                        aria-label={showPass ? L('Hide password', 'پاسورڈ چھپائیں', 'إخفاء كلمة المرور') : L('Show password', 'پاسورڈ دکھائیں', 'إظهار كلمة المرور')}
                        className="absolute inset-y-0 end-1 my-auto h-10 w-10 grid place-items-center rounded-lg text-ink-3 hover:text-orange-dark transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="inline-flex items-center min-h-[44px] text-[13px] font-bold text-orange-dark hover:underline">{t.forgot}</Link>
                  </div>
                  <div className="flex justify-center">
                    <Turnstile ref={captchaRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} dir={dir} language={locale} />
                  </div>
                  <button type="submit" disabled={loading} className="btn-orange w-full btn-lg">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{status || t.logging}</span>
                    ) : (
                      <>{t.login}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] rtl:rotate-180"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* below the email form: the way to a new account (the phone/email switch sits at the top) */}
            {mode === 'email' && !intro && (
              <div className="mt-6 pt-5 text-center border-t" style={{ borderColor: 'var(--line)' }}>
                <p className="text-sm text-ink-2">{t.noAccount} <a href={registerHref} className="inline-flex items-center min-h-[44px] font-bold text-orange-dark hover:underline">{L('Create an account with email', 'ای میل سے اکاؤنٹ بنائیں', 'أنشئ حساباً بالبريد')}</a></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// While the page code loads: a still frame with the logo, the title and a disabled field and button,
// never a blank white page (every «Start now» button lands here, UX-017).
function LoginSkeleton() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <div className="auth-screen min-h-screen flex items-center justify-center px-4" dir={dir} style={{ background: 'var(--bg)' }} aria-busy="true">
      <div className="w-full max-w-[480px]">
        <div className="flex items-center justify-center mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="auth-mobile-lockup" />
        </div>
        {/* neutral frame: no phone field that then disappears when phone sign-in is off (UX-003) */}
        <h1 className="text-[26px] font-bold text-navy mb-1">{L('Start free', 'مفت شروع کریں', 'ابدأ مجاناً')}</h1>
        <p className="text-ink-2 text-sm mb-6">{L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</p>
        <div className="h-12 rounded-xl mb-3 animate-pulse" style={{ background: '#EEF2F6' }} />
        <div className="h-12 rounded-xl animate-pulse" style={{ background: '#EEF2F6' }} />
      </div>
    </div>
  )
}

// useSearchParams() must sit inside a Suspense boundary, otherwise Next.js
// fails to prerender the page (missing-suspense-with-csr-bailout).
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
