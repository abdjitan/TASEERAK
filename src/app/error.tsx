'use client'
// Branded error screen for any page that throws (UX-163): instead of Next.js's white
// «Application error» in English with no way back. Follows the visitor's language.
import { useEffect } from 'react'
import { useTranslation } from '@/i18n'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  useEffect(() => { console.error('[app error]', error?.digest || '', error) }, [error])
  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-md text-center bg-white rounded-3xl border p-8 sm:p-10 shadow-sm" style={{ borderColor: '#D9E0E8' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/taseerak-metallic-logo.webp" alt={L('Taseerak', 'تسعیرک', 'تسعيرك')} className="auth-mobile-lockup mx-auto mb-6" />
        <h1 className="text-xl font-bold mb-2" style={{ color: '#0B2438' }}>
          {L('Something went wrong', 'ایک غیر متوقع خرابی پیش آئی', 'حدث خطأ غير متوقع')}
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-7">
          {L('Sorry, this page could not be shown.', 'معذرت، یہ صفحہ نہیں دکھایا جا سکا۔', 'نعتذر، تعذّر عرض هذه الصفحة.')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => reset()} className="min-h-[48px] px-6 rounded-xl font-bold text-sm" style={{ background: '#D4A543', color: '#071827' }}>
            {L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}
          </button>
          <a href="/" className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-xl font-bold text-sm border" style={{ borderColor: '#D9E0E8', color: '#0B2438' }}>
            {L('Back to home', 'ہوم پر واپس', 'العودة إلى الرئيسية')}
          </a>
        </div>
      </div>
    </main>
  )
}
