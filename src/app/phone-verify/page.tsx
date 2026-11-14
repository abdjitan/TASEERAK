'use client'

// /phone-verify?h=<token> — opened by the mobile app in its in-app browser with a single-use link
// from /api/phone/start, so the app can verify the mobile without Firebase native code (owner 2026-11-14).
import { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import PhoneVerify from '@/components/shared/PhoneVerify'

export default function PhoneVerifyPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [h, setH] = useState<string | null>(null)
  useEffect(() => { setH(new URLSearchParams(window.location.search).get('h') || '') }, [])

  return (
    <div className="min-h-screen flex justify-center px-4 py-10" dir={dir} style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[440px] space-y-4">
        <div className="text-xl font-extrabold text-navy">تسعير<span className="text-orange">ك</span></div>
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">{L('Verify your mobile', 'اپنا موبائل تصدیق کریں', 'توثيق رقم الجوال')}</h1>
          <p className="text-ink-2 text-sm mt-1">{L('Enter your WhatsApp number and the code we send by SMS.', 'اپنا واٹس ایپ نمبر اور SMS کوڈ درج کریں۔', 'أدخل رقمك الذي عليه واتساب، ثم الرمز الذي نرسله برسالة نصية.')}</p>
        </div>
        {h === null ? null : h ? (
          <PhoneVerify handoff={h} locale={locale} />
        ) : (
          <p className="text-sm text-red-600">{L('This link is not valid. Open it again from the app.', 'یہ لنک درست نہیں۔ ایپ سے دوبارہ کھولیں۔', 'هذا الرابط غير صالح. افتحه من جديد من التطبيق.')}</p>
        )}
      </div>
    </div>
  )
}
