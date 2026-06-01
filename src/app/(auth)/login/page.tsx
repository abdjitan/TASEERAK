// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
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
      if (error) { setStatus(error.message); setLoading(false); return }
      if (data.session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
        window.location.href = profile?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
      }
    } catch (err) {
      setStatus(err?.message || 'خطأ غير معروف')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 bg-grid" dir="rtl">

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-blue relative overflow-hidden items-center justify-center p-12">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full" />

        <div className="relative z-10 text-center animate-fade-in">
          <img src="/logo-outlined.png" alt="Taseerak" className="w-32 h-32 mx-auto mb-8 animate-float drop-shadow-2xl" />
          <h2 className="text-4xl font-bold text-white mb-4">تسعيراك</h2>
          <p className="text-blue-200 text-lg max-w-sm mx-auto leading-relaxed">
            منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء
          </p>
          <div className="flex items-center justify-center gap-8 mt-12 text-blue-300 text-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div>مورد معتمد</div>
            </div>
            <div className="w-px h-12 bg-blue-400/30" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">1000+</div>
              <div>طلب تسعير</div>
            </div>
            <div className="w-px h-12 bg-blue-400/30" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">50M+</div>
              <div>ريال صفقات</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo-outlined.png" alt="Taseerak" className="w-16 h-16 mx-auto mb-3" />
            <span className="text-2xl font-bold text-gray-900">Taseerak</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">مرحباً بعودتك</h1>
            <p className="text-gray-500 text-sm mt-2">سجّل دخولك للوصول إلى لوحة التحكم</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-7 shadow-lg shadow-gray-200/50 border border-gray-100">
            {status && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-5 animate-fade-in">
                {status}
              </div>
            )}

            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">البريد الإلكتروني</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field" placeholder="info@company.com" required disabled={loading} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">كلمة المرور</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field" placeholder="••••••••" required disabled={loading} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full gradient-blue text-white py-3.5 rounded-xl font-semibold
              hover:shadow-lg hover:shadow-blue-300/30 disabled:opacity-50
              transition-all duration-300 active:scale-[0.98]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  جارٍ الدخول...
                </span>
              ) : 'تسجيل الدخول'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ليس لديك حساب؟{' '}
            <a href="/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">سجّل مجاناً</a>
          </p>

          <p className="text-center text-xs text-gray-400 mt-8">
            © 2024 Taseerak. جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  )
}
