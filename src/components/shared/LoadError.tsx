'use client'

import { useTranslation } from '@/i18n'

// A failed load must not look like an empty list: say so, and offer a retry.
export default function LoadError({ onRetry, message, className = '' }: { onRetry?: () => void; message?: string; className?: string }) {
  const { locale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <div role="alert" className={`bg-white rounded-2xl p-8 text-center border border-red-100 shadow-sm ${className}`}>
      <div className="mx-auto mb-3 w-11 h-11 rounded-full grid place-items-center bg-red-50 text-red-600" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
      </div>
      <p className="text-sm text-gray-700 font-semibold">
        {message || L('We could not load this page. Check your connection and try again.', 'یہ صفحہ لوڈ نہیں ہو سکا۔ اپنا کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر تحميل البيانات. تحقّق من اتصالك ثم أعد المحاولة.')}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>
          {L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}
        </button>
      )}
    </div>
  )
}
