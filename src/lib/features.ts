// Feature switches set per environment (Vercel env vars). Flip without a code change.
// NEXT_PUBLIC_PHONE_OTP=1 → phone + WhatsApp OTP is the main way in (needs the Supabase
// phone provider + send-otp-whatsapp hook configured first).
export const PHONE_OTP_ENABLED = process.env.NEXT_PUBLIC_PHONE_OTP === '1'

// Contractor grade (municipal classification A–D) and subcontracting: hidden while every buyer is
// simply «مشتري». Turn on when the "request contractors" option is added.
export const CONTRACTOR_FEATURES = false

// Launch switches (2026-10-15, owner decision): keep the first version focused on the core loop —
// request → offers → compare → award → deal → messages. These parts stay built and reachable by
// URL; flipping a switch back to true brings them back to the menus and pages.
export const FEATURES = {
  /** «البورصة» market price index — looks empty until there is enough real price data. */
  priceBoard: false,
  /** Supplier «أسعاري» (publish live prices) and the "publish your prices" nudge. */
  livePrices: false,
  /** Supplier «أدائي» in the menu — its key numbers are now on the supplier home. */
  analyticsNav: false,
  /** Subscription plans — everything is free during the launch period. */
  subscription: false,
  /** Buyer badges («مشترٍ محترف»…). */
  gamification: false,
  /** «الموقع» as its own menu item — still reachable from the profile checklist. */
  locationNav: false,
}
