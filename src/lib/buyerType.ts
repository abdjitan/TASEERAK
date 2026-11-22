// The buyer's type ('individual' = «لبيتي», 'business' = «مقاول أو شركة»), remembered per device so screens
// that do not load the profile (the sidebar menu) can still simplify for a home buyer. The profile
// (profiles.buyer_type) stays the source of truth; pages that read it call rememberBuyerType().
const KEY = 'taseerak_buyer_type'
export type BuyerType = 'individual' | 'business'
export function rememberBuyerType(v: string | null | undefined) {
  try { if (v === 'individual' || v === 'business') localStorage.setItem(KEY, v); else localStorage.removeItem(KEY) } catch {}
}
export function storedBuyerType(): BuyerType | null {
  try { const v = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null; return v === 'individual' || v === 'business' ? v : null } catch { return null }
}
