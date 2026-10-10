/** @type {import('next').NextConfig} */

// Security headers for every route. The CSP is deliberately limited to directives that
// cannot break inline scripts (Next runtime, the inlined landing page, Turnstile):
// no framing (clickjacking on award/finalize buttons), no plugins, no <base> hijack,
// forms only to this origin. A full script-src policy needs nonces and comes later.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)' },
]

const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'taseerak.vercel.app', 'taseerak.com', 'www.taseerak.com'] },
    serverComponentsExternalPackages: ['xlsx'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
