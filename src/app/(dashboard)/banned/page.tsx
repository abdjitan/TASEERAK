'use client'
// «حسابك موقوف» (owner 2026-11-17, migration 223): a suspended user lands here from every work page
// and sees the admin's message and the end date, with a way to contact support.
// Never blank or misleading (UX-047): a loading state, an error state with retry (a failed check no
// longer says «your account is active»), «Continue» to the role's home, and sign-out in the header.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import GateHeader from '../verify/GateHeader'

export default function BannedPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  // undefined = loading, null = no suspension, 'error' = the check failed
  const [ban, setBan] = useState<any>(undefined)
  const [home, setHome] = useState('/contractor')

  async function load() {
    setBan(undefined)
    try {
      const sb = createClient()
      const { data, error } = await sb.rpc('my_ban')
      if (error) throw error
      setBan(data || null)
      if (!data) {
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          const { data: p } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
          setHome(p?.role === 'supplier' ? '/supplier/dashboard' : p?.role === 'admin' ? '/admin' : '/contractor')
        }
      }
    } catch { setBan('error') }
  }
  useEffect(() => { load() }, [])

  let body: React.ReactNode
  if (ban === undefined) {
    body = <div className="h-40 rounded-2xl bg-white border border-gray-100 animate-pulse" aria-busy="true" />
  } else if (ban === 'error') {
    body = (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
        <div className="font-bold text-red-800">{L('We could not check your account status.', 'آپ کے اکاؤنٹ کی حالت معلوم نہیں ہو سکی۔', 'تعذّر التحقق من حالة حسابك.')}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={load} className="min-h-[44px] px-5 rounded-xl bg-[#0B2438] text-white text-sm font-bold">{L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}</button>
          <Link href="/support" className="min-h-[44px] inline-flex items-center px-5 rounded-xl border border-gray-200 bg-white text-[#0B2438] text-sm font-bold">{L('Contact support', 'سپورٹ سے رابطہ', 'تواصل مع الدعم')}</Link>
        </div>
      </div>
    )
  } else if (!ban) {
    body = (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <h1 className="text-xl font-bold text-[#071827]">{L('Account status', 'اکاؤنٹ کی حالت', 'حالة الحساب')}</h1>
        <p className="text-sm text-gray-600 mt-2">{L('Your account is active.', 'آپ کا اکاؤنٹ فعال ہے۔', 'حسابك مفعّل.')}</p>
        <Link href={home} className="inline-flex items-center mt-4 min-h-[44px] px-6 rounded-xl bg-[#D4A543] text-[#071827] font-bold">{L('Continue', 'جاری رکھیں', 'متابعة')}</Link>
      </div>
    )
  } else {
    const until = new Date(ban.until).toLocaleString(locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn')
    body = (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-800">{L('Your account is suspended', 'آپ کا اکاؤنٹ معطل ہے', 'حسابك موقوف')}</h1>
        <p className="text-sm text-red-900 mt-2">
          {ban.permanent
            ? L('The suspension has no end date.', 'معطلی کی کوئی آخری تاریخ نہیں۔', 'الإيقاف دون تاريخ انتهاء.')
            : L(`Until ${until}.`, `${until} تک۔`, `حتى ${until}.`)}
        </p>
        {ban.reason && (
          <div className="mt-4 rounded-xl bg-white border border-red-100 p-3 text-sm text-gray-800">
            <div className="text-xs font-bold text-gray-600 mb-1">{L('Message from the administration', 'انتظامیہ کا پیغام', 'رسالة الإدارة')}</div>
            {ban.reason}
          </div>
        )}
        <Link href="/support" className="inline-flex items-center mt-4 min-h-[44px] px-5 rounded-xl bg-[#0B2438] text-white text-sm font-bold">{L('Contact support', 'سپورٹ سے رابطہ', 'تواصل مع الدعم')}</Link>
      </div>
    )
  }
  return (
    <div dir={dir} className="min-h-screen bg-[#F5F7FA]">
      <GateHeader />
      <div className="max-w-xl mx-auto p-4 sm:p-6">{body}</div>
    </div>
  )
}
