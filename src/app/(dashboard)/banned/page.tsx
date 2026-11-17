'use client'
// «حسابك موقوف» (owner 2026-11-17, migration 223): a suspended user lands here from every work page
// and sees the admin's message and the end date, with a way to contact support.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'

export default function BannedPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [ban, setBan] = useState<any>(undefined)
  useEffect(() => { createClient().rpc('my_ban').then(({ data }: any) => setBan(data || null)) }, [])
  if (ban === undefined) return null
  if (!ban) {
    return (
      <div dir={dir} className="max-w-xl mx-auto p-6 text-center">
        <p className="text-sm text-gray-600">{L('Your account is active.', 'آپ کا اکاؤنٹ فعال ہے۔', 'حسابك مفعّل.')}</p>
        <Link href="/" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#D4A543] text-[#071827] font-bold">{L('Continue', 'جاری رکھیں', 'متابعة')}</Link>
      </div>
    )
  }
  const until = new Date(ban.until).toLocaleString(locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn')
  return (
    <div dir={dir} className="max-w-xl mx-auto p-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-extrabold text-red-800">{L('Your account is suspended', 'آپ کا اکاؤنٹ معطل ہے', 'حسابك موقوف')}</h1>
        <p className="text-sm text-red-900 mt-2">
          {ban.permanent
            ? L('The suspension has no end date.', 'معطلی کی کوئی آخری تاریخ نہیں۔', 'الإيقاف دون تاريخ انتهاء.')
            : L(`Until ${until}.`, `${until} تک۔`, `حتى ${until}.`)}
        </p>
        {ban.reason && (
          <div className="mt-4 rounded-xl bg-white border border-red-100 p-3 text-sm text-gray-800">
            <div className="text-xs font-bold text-gray-500 mb-1">{L('Message from the administration', 'انتظامیہ کا پیغام', 'رسالة الإدارة')}</div>
            {ban.reason}
          </div>
        )}
        <Link href="/support" className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#0B2438] text-white text-sm font-bold">{L('Contact support', 'سپورٹ سے رابطہ', 'تواصل مع الدعم')}</Link>
      </div>
    </div>
  )
}
