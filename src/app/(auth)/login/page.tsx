// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

export default function LoginPage() {
  const { t, dir, locale } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

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
    setStatus('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setStatus(t('auth.wrong_credentials')); setLoading(false); return }
      if (data.session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
        window.location.href = profile?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
      }
    } catch (err) {
      setStatus(err?.message || t('errors.generic'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" dir={dir}>

      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #143B72 40%, #1A5FB4 70%, #2B7DE9 100%)' }}>

        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-[10%] right-[15%] w-72 h-72 bg-white/5 rounded-full blur-xl" />
          <div className="absolute bottom-[15%] left-[10%] w-96 h-96 bg-blue-400/10 rounded-full blur-2xl" />
          <div className="absolute top-[40%] left-[30%] w-48 h-48 bg-orange-400/10 rounded-full blur-xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative z-10 text-center px-12 animate-fade-in">
          <img src="/logo-outlined.png" alt="تسعيرك" className="w-36 h-36 mx-auto mb-10 animate-float drop-shadow-2xl" />
          <h2 className="text-5xl font-bold text-white mb-4">{t('common.app_name')}</h2>
          <p className="text-blue-200 text-xl max-w-md mx-auto leading-relaxed mb-12">
            {t('common.app_tagline')}
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { icon: '⚡', label: locale === 'en' ? 'Fast & Easy' : 'سريع وسهل', sub: locale === 'en' ? 'RFQ in 1 minute' : 'طلب تسعير بدقيقة' },
              { icon: '🔒', label: locale === 'en' ? 'Secure & Trusted' : 'آمن وموثوق', sub: locale === 'en' ? 'Verified suppliers' : 'موردين معتمدين' },
              { icon: '📊', label: locale === 'en' ? 'Smart Compare' : 'مقارنة ذكية', sub: locale === 'en' ? 'Best prices' : 'أفضل الأسعار' },
            ].map(f => (
              <div key={f.label} className="text-center">
                <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-white/10">
                  {f.icon}
                </div>
                <div className="text-white text-sm font-semibold">{f.label}</div>
                <div className="text-blue-300 text-xs mt-1">{f.sub}</div>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-14 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 max-w-md mx-auto">
            <div className="flex items-center justify-around text-white">
              {[
                { val: '+500', label: locale === 'en' ? 'Verified Suppliers' : 'مورد معتمد' },
                { val: '+1000', label: locale === 'en' ? 'RFQs Sent' : 'طلب تسعير' },
                { val: '+50M', label: locale === 'en' ? 'SAR in Deals' : 'ريال صفقات' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold">{s.val}</div>
                  <div className="text-xs text-blue-300 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-white to-slate-50">
        {/* Language switcher */}
        <div className="flex justify-end p-4">
          <LanguageSwitcher variant="minimal" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md animate-slide-up">

            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-10">
              <img src="/logo-outlined.png" alt="تسعيرك" className="w-20 h-20 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900">{t('common.app_name')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('common.app_tagline')}</p>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">{t('auth.welcome_back')}</h1>
              <p className="text-gray-500 mt-2">{locale === 'en' ? 'Sign in to access your dashboard' : locale === 'ur' ? 'اپنے ڈیش بورڈ تک رسائی کے لیے سائن ان کریں' : 'سجّل دخولك للوصول إلى لوحة التحكم'}</p>
            </div>

            <form onSubmit={handleLogin}>
              {status && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-4 mb-5 animate-fade-in flex items-center gap-2">
                  <span>⚠️</span> {status}
                </div>
              )}

              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t('auth.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input-field !py-3.5 !rounded-xl !border-gray-200 focus:!border-blue-500 focus:!ring-blue-100"
                    placeholder="info@company.com" required disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{t('auth.password')}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="input-field !py-3.5 !rounded-xl !border-gray-200 focus:!border-blue-500 focus:!ring-blue-100"
                    placeholder="••••••••" required disabled={loading} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-white text-base
                disabled:opacity-50 transition-all duration-300 active:scale-[0.98]
                hover:shadow-xl hover:shadow-blue-300/30"
                style={{ background: 'linear-gradient(135deg, #1A5FB4 0%, #2B7DE9 100%)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {t('auth.signing_in')}
                  </span>
                ) : t('auth.login')}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-8">
              {t('auth.no_account')}{' '}
              <a href="/register" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">{t('auth.register_free')}</a>
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pb-4">
          {locale === 'en' ? '© 2026 Taseerak — All rights reserved' : '© 2026 تسعيرك — جميع الحقوق محفوظة'}
        </div>
      </div>
    </div>
  )
}
