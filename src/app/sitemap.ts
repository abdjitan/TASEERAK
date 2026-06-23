import type { MetadataRoute } from 'next'

// عنوان الموقع: من متغيّر بيئة صريح، أو دومين Vercel الإنتاجي تلقائياً، وإلا دومين العلامة.
function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'https://taseerak.com'
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl()
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/prices`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/suppliers`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
