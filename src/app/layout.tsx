import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Taseerak | تسعيراك — منصة التسعير والتوريد للمقاولين',
  description: 'منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-white text-gray-900">
        {children}
      </body>
    </html>
  )
}
