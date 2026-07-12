import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/i18n'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'تسعيرك | Taseerak — منصة التسعير والتوريد للمقاولين',
  description: 'منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'تسعيرك' },
}

export const viewport = {
  themeColor: '#1B2D5B',
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
        <Toaster richColors position="top-center" toastOptions={{ style: { fontFamily: 'Cairo, sans-serif' } }} />
      </body>
    </html>
  )
}
