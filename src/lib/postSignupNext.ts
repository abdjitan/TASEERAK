// Where to send a new user after sign-up + onboarding (e.g. a landing section card links to
// /register?next=/contractor/rfq/quick?section=building). Kept in localStorage so it survives the
// e-mail confirmation round trip (same browser). Only same-origin absolute paths are accepted.

const KEY = 'taseerak_post_signup_next'

export function safeNextPath(path: string | null | undefined): string | null {
  if (!path || path[0] !== '/' || path[1] === '/') return null
  for (let i = 0; i < path.length; i++) { const c = path.charCodeAt(i); if (c === 92 || c < 32) return null }
  return path.slice(0, 300)
}

export function rememberPostSignupNext(path: string | null | undefined) {
  const safe = safeNextPath(path)
  if (!safe) return
  try { localStorage.setItem(KEY, JSON.stringify({ path: safe, at: Date.now() })) } catch {}
}

/** Returns the remembered path (at most 2 days old) and forgets it. */
export function takePostSignupNext(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)
    const v = JSON.parse(raw)
    if (!v || typeof v.path !== 'string' || Date.now() - Number(v.at || 0) > 2 * 24 * 3600 * 1000) return null
    return safeNextPath(v.path)
  } catch { return null }
}
