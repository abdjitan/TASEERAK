'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }

    window.location.href = '/contractor'
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
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">البريد الإلكتروني</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="info@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">كلمة المرور</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
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
