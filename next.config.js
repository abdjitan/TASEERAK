/** @type {import('next').NextConfig} */

// Security headers for every route. The CSP is deliberately limited to directives that
// cannot break inline scripts (Next runtime, the inlined landing page, Turnstile):
// no framing (clickjacking on award/finalize buttons), no plugins, no <base> hijack,
// forms only to this origin. script-src (audit M11) allows only this origin + Turnstile (+ the
// Vercel preview toolbar): an injected <script src> from any other host is refused, so a
// future injection can't pull in an external payload. 'unsafe-inline' stays until nonces
// (Next's inline runtime + the inlined landing page); 'unsafe-eval' only for `next dev`.
const scriptSrc = ["'self'", "'unsafe-inline'", 'https://challenges.cloudflare.com', 'https://vercel.live',
  ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : [])].join(' ')
const securityHeaders = [
  { key: 'Content-Security-Policy', value: `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; script-src ${scriptSrc}` },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), payment=(), usb=(), geolocation=(self)' },
]

const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'taseerak.vercel.app', 'taseerak.com', 'www.taseerak.com'] },
    serverComponentsExternalPackages: ['xlsx'],
  },
  // The app never uses next/image. The optimizer (/_next/image) stays off: Next 14.2.x has
  // unpatched image-optimizer advisories, and the old *.supabase.co wildcard let any Supabase
  // project be fetched through it. Re-enable only with Next >= 15.5.27 and our exact host.
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
