// Server-side check of a Firebase phone-auth ID token (Google Identity Toolkit accounts:lookup).
// Returns the verified E.164 phone if the token is valid and the SMS code was entered in the last
// 15 minutes, else null. Used by /api/phone/confirm and /api/auth/phone-session.
import { FIREBASE_CONFIG } from '@/lib/firebaseConfig'

export async function verifiedPhoneFromIdToken(idToken: unknown): Promise<string | null> {
  if (!idToken || typeof idToken !== 'string' || !FIREBASE_CONFIG.apiKey) return null
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`, {
    // Referer: the browser key may be restricted to our site's referrers
    method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://taseerak.com/' }, body: JSON.stringify({ idToken }),
  })
  const j: any = await r.json().catch(() => ({}))
  const fu = j?.users?.[0]
  const phone: string = fu?.phoneNumber || ''
  if (!r.ok || !/^\+\d{11,15}$/.test(phone)) return null
  if (Date.now() - Number(fu.lastLoginAt || 0) > 15 * 60 * 1000) return null
  return phone
}
