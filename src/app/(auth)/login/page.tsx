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
        await redirectByRole(supabase, data.session.user.id)
      }
    })
  }, [])

  async function redirectByRole(supabase: any, userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const role = profile?.role
    if (role === 'supplier') window.location.href = '/supplier/dashboard'
    else if (role === 'admin') window.location.href = '/admin'
    else window.location.href = '/contractor'
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setStatus('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        setLoading(false)
        return
      }

      if (data.session) {
        setStatus('تم تسجيل الدخول! جارٍ التحويل...')
        await redirectByRole(supabase, data.session.user.id)
      }
    } catch (err: any) {
      setStatus(`خطأ: ${err?.message || 'خطأ غير معروف'}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🏗</span>
            </div>
            <span className="text-2xl font-bold">Taseerak</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">تسجيل الدخول</h1>
          <p className="text-gray-500 text-sm mt-1">أهلاً بك مجدداً</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {status && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4 text-center">
              {status}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="info@company.com" required disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••" required disabled={loading} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'جارٍ الدخول...' : 'دخول ←'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ليس لديك حساب؟{' '}
          <a href="/register" className="text-blue-600 font-medium hover:underline">سجّل مجاناً</a>
        </p>
      </div>
    </div>
  )
}
