import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    // /prices and /suppliers come back when the price board has data (FEATURES.priceBoard)
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/join/seller`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/join/company`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/deal-protection`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
