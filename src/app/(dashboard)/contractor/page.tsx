'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ContractorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.replace('/login')
        return
      }
      setUser(user)

      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setProfile(data)
          setLoading(false)
        })
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-gray-500">جارٍ التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">

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
          {[
            { label: 'طلبات التسعير', value: '0', color: 'blue' },
            { label: 'العروض المستلمة', value: '0', color: 'green' },
            { label: 'الصفقات المكتملة', value: '0', color: 'amber' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
              <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
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
