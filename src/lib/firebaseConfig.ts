// Firebase web config for phone verification (Google Identity Platform SMS codes, owner 2026-11-14).
// These values are public by design (they identify the project; abuse is stopped by authorized
// domains, reCAPTCHA and the SMS region allow-list in the Firebase console), so they may live in code.
// Set them through NEXT_PUBLIC_FIREBASE_* in Vercel, or fill the fallbacks once the project exists.
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

export const firebaseReady = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.projectId)

/** A typed number → E.164 with "+", or null. Saudi local forms (05…, 5…) become +966…;
 *  other countries must be typed with their code (+962…, 00962…). */
export function toE164(input: string): string | null {
  let d = String(input || '').replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
  const plus = d.trim().startsWith('+')
  d = d.replace(/\D/g, '')
  if (d.startsWith('00')) return /^\d{11,15}$/.test(d.slice(2)) ? '+' + d.slice(2) : null
  if (plus) return /^\d{11,15}$/.test(d) ? '+' + d : null
  if (/^05\d{8}$/.test(d)) return '+966' + d.slice(1)
  if (/^5\d{8}$/.test(d)) return '+966' + d
  if (/^9665\d{8}$/.test(d)) return '+' + d
  return null
}
