// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const txt = {
  ar: { welcome:'مرحباً بعودتك', sub:'سجّل دخولك للوصول إلى لوحة التحكم', email:'البريد الإلكتروني', password:'كلمة المرور', login:'تسجيل الدخول', logging:'جارٍ الدخول...', noAccount:'ليس لديك حساب؟', register:'سجّل مجاناً', error:'البريد أو كلمة المرور غير صحيحة', copyright:'© 2026 تسعيرك — جميع الحقوق محفوظة' },
  en: { welcome:'Welcome back', sub:'Sign in to access your dashboard', email:'Email Address', password:'Password', login:'Sign In', logging:'Signing in...', noAccount:"Don't have an account?", register:'Register for Free', error:'Invalid email or password', copyright:'© 2026 Taseerak — All rights reserved' },
  ur: { welcome:'خوش آمدید', sub:'اپنے ڈیش بورڈ تک رسائی کے لیے سائن ان کریں', email:'ای میل', password:'پاسورڈ', login:'سائن ان', logging:'سائن ان ہو رہا ہے...', noAccount:'اکاؤنٹ نہیں ہے؟', register:'مفت رجسٹر کریں', error:'غلط ای میل یا پاسورڈ', copyright:'© 2026 Taseerak — جملہ حقوق محفوظ ہیں' },
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
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
        window.location.href = p?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
      }
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(t.error); setLoading(false); return }
      if (data.session) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
        window.location.href = p?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
      }
    } catch { setError(t.error); setLoading(false) }
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
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-lg"
              style={{ background: '#F5831F' }}>
              {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t.logging}</span> : t.login}
            </button>
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
