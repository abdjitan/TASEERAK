/**
 * The site's public origin for absolute URLs (metadataBase, robots, sitemap, canonical, og:image).
 * Set NEXT_PUBLIC_SITE_URL once the custom domain serves this app; until then the Vercel host.
 * (VERCEL_PROJECT_PRODUCTION_URL is deliberately NOT used: it resolves to taseerak.com, whose DNS
 * still points at an old page with an expired certificate.)
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://taseerak.vercel.app').replace(/\/+$/, '')
}
