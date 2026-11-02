'use client'

import Link from 'next/link'
import { useTranslation } from '@/i18n'

// Branded 404 for every unknown URL (follows the visitor's chosen language).
export default function NotFound() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-md text-center bg-white rounded-3xl border p-8 sm:p-10 shadow-sm" style={{ borderColor: '#D9E0E8' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/taseerak-metallic-logo.webp" alt={L('Taseerak', 'تسعیرک', 'تسعيرك')} className="auth-mobile-lockup mx-auto mb-6" />
        <div className="text-5xl font-extrabold mb-2" style={{ color: '#D4A543' }} dir="ltr">404</div>
        <h1 className="text-xl font-extrabold mb-2" style={{ color: '#0B2438' }}>
          {L('Page not found', 'صفحہ نہیں ملا', 'الصفحة غير موجودة')}
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-7">
          {L('The link may be wrong, or the page may have been moved or removed.', 'ہو سکتا ہے لنک غلط ہو، یا صفحہ منتقل یا حذف کر دیا گیا ہو۔', 'ربما يكون الرابط غير صحيح، أو نُقلت الصفحة أو حُذفت.')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: '#D4A543', color: '#071827' }}>
            {L('Back to home', 'ہوم پر واپس', 'العودة إلى الرئيسية')}
          </Link>
          <Link href="/login" className="px-6 py-3 rounded-xl font-bold text-sm border" style={{ borderColor: '#D9E0E8', color: '#0B2438' }}>
            {L('Sign in', 'سائن ان', 'تسجيل الدخول')}
          </Link>
        </div>
      </div>
    </main>
  )
}
