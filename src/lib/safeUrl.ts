// Links built from stored data (user- or scraper-supplied) must never become javascript:/data:
// URLs. Returns the URL only when it is plain http(s); otherwise undefined (no link).
export function safeHttpUrl(u: string | null | undefined): string | undefined {
  if (!u) return undefined
  try {
    const p = new URL(String(u).trim())
    return p.protocol === 'http:' || p.protocol === 'https:' ? p.toString() : undefined
  } catch {
    return undefined
  }
}
