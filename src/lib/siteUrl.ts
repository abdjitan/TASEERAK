/**
 * The site's public origin for absolute URLs (metadataBase, robots, sitemap, canonical, og:image).
 * taseerak.com serves this app since 2026-11-07 (GoDaddy DNS: A @ 76.76.21.21, CNAME www
 * cname.vercel-dns.com). NEXT_PUBLIC_SITE_URL overrides it.
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://taseerak.com').replace(/\/+$/, '')
}
