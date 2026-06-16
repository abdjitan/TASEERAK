import type { MetadataRoute } from 'next'

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'https://taseerak.com'
}

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl()
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
