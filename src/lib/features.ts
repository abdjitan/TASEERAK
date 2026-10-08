// Feature switches set per environment (Vercel env vars). Flip without a code change.
// NEXT_PUBLIC_PHONE_OTP=1 → phone + WhatsApp OTP is the main way in (needs the Supabase
// phone provider + send-otp-whatsapp hook configured first).
export const PHONE_OTP_ENABLED = process.env.NEXT_PUBLIC_PHONE_OTP === '1'
