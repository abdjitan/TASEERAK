import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/i18n'
import PwaBoot from '@/components/shared/PwaBoot'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'تسعيرك | Taseerak — منصة التسعير والتوريد للمقاولين',
  description: 'منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'تسعيرك' },
  // أيقونة شاشة iOS الرئيسية (بلا شفافية) — src/app/icon.png يولّد favicon تلقائياً
  icons: { apple: '/apple-touch-icon.png' },
}

export const viewport = {
  themeColor: '#1B2D5B',
  // يمدّ الصفحة خلف النوتش ويُفعّل env(safe-area-inset-*) لشريط التنقّل السفلي
  viewportFit: 'cover' as const,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <PwaBoot />
        <Toaster richColors position="top-center" toastOptions={{ style: { fontFamily: 'Cairo, sans-serif' } }} />
      </body>
    </html>
  )
}
