import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // صفحات خاصة خلف تسجيل الدخول — لا داعي لفهرستها
        disallow: ['/api/', '/admin', '/contractor', '/messages', '/settings', '/orders', '/project'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
