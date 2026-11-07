import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/i18n'
import PwaBoot from '@/components/shared/PwaBoot'
import { siteUrl } from '@/lib/siteUrl'
import '@/styles/globals.css'
import '@/styles/master-brand.css'

export const metadata: Metadata = {
  title: 'تسعيرك | Taseerak — منصة التسعير والتوريد لمواد البناء',
  description: 'منصة ذكية تربط المشترين بالموردين في جميع قطاعات البناء والإنشاء',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'تسعيرك' },
  // explicit icons: setting `icons` here replaces the file-based src/app/icon.png, so the favicon is
  // listed too (public/favicon.ico is a copy of public/icons/icon-192.png, for crawlers asking /favicon.ico)
  icons: {
    icon: [{ url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' }],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // link previews (WhatsApp, X, LinkedIn): title, text and a 1200×630 picture
  metadataBase: new URL(siteUrl()),
  openGraph: {
    type: 'website', locale: 'ar_SA', siteName: 'تسعيرك',
    title: 'تسعيرك — اطلب سعر أي مادة بناء من عدة موردين',
    description: 'اكتب ما تحتاجه أو صوّره، ويصلك أكثر من عرض سعر من موردين في منطقتك. مجاناً.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'تسعيرك' }],
  },
  twitter: { card: 'summary_large_image', title: 'تسعيرك — اطلب سعر أي مادة بناء من عدة موردين', images: ['/og.png'] },
  // Meta Business domain verification for taseerak.com (portfolio Taseerak), needed for WhatsApp onboarding
  verification: { other: { 'facebook-domain-verification': 'a34z2iuod4ip26619mz0zppc87owbw' } },
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
