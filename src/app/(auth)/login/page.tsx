// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const txt = {
  ar: {
    welcome: 'مرحباً بك في تسعيرك',
    sub: 'منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    logging: 'جارٍ الدخول...',
    noAccount: 'ليس لديك حساب؟',
    register: 'سجّل مجاناً',
    error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    copyright: '© 2026 تسعيرك — جميع الحقوق محفوظة',
    f1: 'سريع وسهل', f1s: 'طلب تسعير بدقيقة واحدة',
    f2: 'آمن وموثوق', f2s: 'موردين معتمدين ومحققين',
    f3: 'مقارنة ذكية', f3s: 'أفضل الأسعار بضغطة زر',
    s1: 'مورد معتمد', s2: 'طلب تسعير', s3: 'ريال صفقات',
  },
  en: {
    welcome: 'Welcome to Taseerak',
    sub: 'A smart platform connecting contractors with suppliers across all construction sectors',
    email: 'Email Address',
    password: 'Password',
    login: 'Sign In',
    logging: 'Signing in...',
    noAccount: "Don't have an account?",
    register: 'Register for Free',
    error: 'Invalid email or password',
    copyright: '© 2026 Taseerak — All rights reserved',
    f1: 'Fast & Easy', f1s: 'RFQ in just one minute',
    f2: 'Secure & Trusted', f2s: 'Verified & approved suppliers',
    f3: 'Smart Compare', f3s: 'Best prices at your fingertips',
    s1: 'Verified Suppliers', s2: 'RFQs Sent', s3: 'SAR in Deals',
  },
  ur: {
    welcome: 'Taseerak میں خوش آمدید',
    sub: 'ایک سمارٹ پلیٹ فارم جو ٹھیکیداروں کو تعمیراتی شعبوں میں سپلائرز سے جوڑتا ہے',
    email: 'ای میل ایڈریس',
    password: 'پاسورڈ',
    login: 'سائن ان کریں',
    logging: 'سائن ان ہو رہا ہے...',
    noAccount: 'اکاؤنٹ نہیں ہے؟',
    register: 'مفت رجسٹر کریں',
    error: 'غلط ای میل یا پاسورڈ',
    copyright: '© 2026 Taseerak — جملہ حقوق محفوظ ہیں',
    f1: 'تیز اور آسان', f1s: 'ایک منٹ میں قیمت کی درخواست',
    f2: 'محفوظ اور قابل اعتماد', f2s: 'تصدیق شدہ سپلائرز',
    f3: 'سمارٹ موازنہ', f3s: 'بہترین قیمتیں آپ کی انگلیوں پر',
    s1: 'تصدیق شدہ سپلائرز', s2: 'قیمت کی درخواستیں', s3: 'ریال سودے',
  },
}

export default function LoginPage() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
        window.location.href = profile?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
      }
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(t.error); setLoading(false); return }
      if (data.session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
        window.location.href = profile?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
      }
    } catch (err) {
      setError(err?.message || t.error)
      setLoading(false)
    }
  }

  const appName = locale === 'ar' ? 'تسعيرك' : 'Taseerak'

  return (
    <div className="min-h-screen relative overflow-hidden" dir={dir}
      style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #143B72 40%, #1A5FB4 70%, #2B7DE9 100%)' }}>

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] right-[10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] bg-orange-400/5 rounded-full blur-2xl" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Language switcher */}
      <div className="absolute top-4 left-4 z-20">
        <LanguageSwitcher variant="minimal" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">

        {/* Logo + Brand */}
        <div className="text-center mb-10 animate-fade-in">
          <img src="/logo-outlined.png" alt={appName} className="w-28 h-28 mx-auto mb-6 animate-float drop-shadow-2xl" />
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">{appName}</h1>
          <p className="text-blue-200 text-base lg:text-lg max-w-md mx-auto leading-relaxed">{t.sub}</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl mb-10 animate-slide-up">

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-xl p-3 mb-5 animate-fade-in text-center">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-5 mb-6">
            <div>
              <label className="block text-xs font-bold text-blue-200 mb-2 uppercase tracking-wider">{t.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50
                focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-300"
                placeholder="info@company.com" required disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-200 mb-2 uppercase tracking-wider">{t.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50
                focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-300"
                placeholder="••••••••" required disabled={loading} />
            </div>
          </div>

          <button type="submit" disabled={loading} onClick={handleLogin}
            className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 active:scale-[0.98]
            bg-white text-blue-800 hover:bg-blue-50 hover:shadow-xl hover:shadow-white/20 disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {t.logging}
              </span>
            ) : t.login}
          </button>

          <p className="text-center text-sm text-blue-200 mt-5">
            {t.noAccount}{' '}
            <a href="/register" className="text-white font-bold hover:underline">{t.register}</a>
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 max-w-lg mb-10 stagger">
          {[
            { icon: '⚡', label: t.f1, sub: t.f1s },
            { icon: '🔒', label: t.f2, sub: t.f2s },
            { icon: '📊', label: t.f3, sub: t.f3s },
          ].map(f => (
            <div key={f.label} className="text-center">
              <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-white/10
                hover:bg-white/20 hover:-translate-y-1 transition-all duration-300">
                {f.icon}
              </div>
              <div className="text-white text-sm font-semibold">{f.label}</div>
              <div className="text-blue-300/70 text-[11px] mt-1">{f.sub}</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 max-w-md w-full animate-fade-in">
          <div className="flex items-center justify-around text-white">
            {[
              { val: '+500', label: t.s1 },
              { val: '+1000', label: t.s2 },
              { val: '+50M', label: t.s3 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold">{s.val}</div>
                <div className="text-[11px] text-blue-300/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-blue-300/50 mt-8">{t.copyright}</div>
      </div>
    </div>
  )
}
