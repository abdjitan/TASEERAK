// One rule for «is this account verified enough to act» (round-4 UX-067), shared by the middleware,
// the VerifyGate sheet and the support page. Pure TypeScript (the middleware runs on the edge).
//
// While `phone_verify_required()` is off (e.g. the SMS provider is down), nobody is held back.
// When it is on: a seller needs the mobile AND the email verified; a buyer only the mobile (their email
// is optional, migration 234); an admin is never held back.

type P = { role?: string | null; phone_verified_at?: any; email_verified_at?: any } | null | undefined

/** A seller (role supplier) may act: verification switched off, or mobile and email verified. */
export function isSellerVerified(p: P, phoneRequired: boolean | null | undefined): boolean {
  if (phoneRequired !== true) return true
  return !!p?.phone_verified_at && !!p?.email_verified_at
}

/** Any role may act (buyers: mobile only; admins always). */
export function isAccountVerified(p: P, phoneRequired: boolean | null | undefined): boolean {
  if (!p || p.role === 'admin' || phoneRequired !== true) return true
  if (p.role === 'supplier') return isSellerVerified(p, phoneRequired)
  return !!p.phone_verified_at
}
