import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/i18n'
import PwaBoot from '@/components/shared/PwaBoot'
import '@/styles/globals.css'
import '@/styles/master-brand.css'

export const metadata: Metadata = {
  title: 'تسعيرك | Taseerak — منصة التسعير والتوريد لمواد البناء',
  description: 'منصة ذكية تربط المشترين بالموردين في جميع قطاعات البناء والإنشاء',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'تسعيرك' },
  // أيقونة شاشة iOS الرئيسية (بلا شفافية) — src/app/icon.png يولّد favicon تلقائياً
  icons: { apple: '/apple-touch-icon.png' },
  // link previews (WhatsApp, X, LinkedIn): title, text and a 1200×630 picture
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://taseerak.vercel.app')),
  openGraph: {
    type: 'website', locale: 'ar_SA', siteName: 'تسعيرك',
    title: 'تسعيرك — اطلب سعر أي مادة بناء من عدة موردين',
    description: 'اكتب ما تحتاجه أو صوّره، ويصلك أكثر من عرض سعر من موردين في منطقتك. مجاناً.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'تسعيرك' }],
  },
  twitter: { card: 'summary_large_image', title: 'تسعيرك — اطلب سعر أي مادة بناء من عدة موردين', images: ['/og.png'] },
}

export const viewport = {
  themeColor: '#071827',
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
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <PwaBoot />
        <Toaster richColors position="top-center" toastOptions={{ style: { fontFamily: '"IBM Plex Sans Arabic", Inter, sans-serif' } }} />
      </body>
    </html>
  )
}
