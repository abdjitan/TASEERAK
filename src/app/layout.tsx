import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { LanguageProvider } from '@/i18n'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Taseerak | تسعيراك — منصة التسعير والتوريد للمقاولين',
  description: 'منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء — مدني، معماري، كهرباء، ميكانيك',
  keywords: 'تسعير, مقاولين, موردين, بناء, إنشاء, السعودية, Taseerak',
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
  openGraph: {
    title: 'Taseerak — منصة التسعير والتوريد للمقاولين',
    description: 'أرسل طلب تسعيرك لعشرات الموردين في ثوانٍ',
    images: [{ url: '/logo.png' }],
    locale: 'ar_SA',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-white text-gray-900">
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'inherit' } }} />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
