import type { Metadata } from 'next'
import { LanguageProvider } from '@/i18n'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'تسعيرك | Taseerak — منصة التسعير والتوريد للمقاولين',
  description: 'منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-white text-gray-900">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
