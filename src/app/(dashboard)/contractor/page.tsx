'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ContractorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('جارٍ التحقق من الجلسة...')

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()

        // 1. Check session
        setStatus('جارٍ التحقق من الجلسة...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setStatus(`خطأ في الجلسة: ${sessionError.message}`)
          setLoading(false)
          return
        }

        if (!session) {
          setStatus('لا توجد جلسة، جارٍ التحويل لتسجيل الدخول...')
          window.location.href = '/login'
          return
        }

        setUser(session.user)
        setStatus('تم التحقق، جارٍ تحميل الملف الشخصي...')

        // 2. Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          setStatus(`خطأ في الملف الشخصي: ${profileError.message}`)
        } else {
          setProfile(profileData)
          setStatus('')
        }

        setLoading(false)
      } catch (err: any) {
        setStatus(`استثناء: ${err?.message || 'خطأ غير معروف'}`)
        setLoading(false)
      }
    }

    init()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center">
          <div className="text-gray-500 mb-2">جارٍ التحميل...</div>
          {status && <div className="text-xs text-gray-400">{status}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {status && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 mb-4 text-center">
            {status}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
            <p className="text-sm text-gray-500 mt-1">
              أهلاً، {profile?.company_name_ar || user?.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors border border-gray-200 px-4 py-2 rounded-lg"
          >
            تسجيل الخروج
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-xs text-gray-500 mt-1">طلبات التسعير</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-xs text-gray-500 mt-1">العروض المستلمة</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-amber-600">0</div>
            <div className="text-xs text-gray-500 mt-1">الصفقات المكتملة</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">لا يوجد طلبات تسعير بعد</h2>
          <p className="text-sm text-gray-500 mb-4">أرسل أول طلب تسعير وابدأ تلقي عروض من الموردين</p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            + طلب تسعير جديد
          </button>
        </div>

      </div>
    </div>
  )
}
