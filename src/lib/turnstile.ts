// Cloudflare Turnstile (CAPTCHA) — bot protection for the auth forms.
//
// The SITE KEY is PUBLIC by design: it ships to the browser and is safe to
// commit. The SECRET KEY is NOT here — it lives only in the Supabase dashboard
// (Authentication → Bot and Abuse Protection), where Supabase verifies tokens
// server-side. We never put the secret in the frontend or in the repo.
//
// Rollout is zero-downtime: this widget always renders and passes a token, but
// Supabase IGNORES the token until CAPTCHA protection is switched on in the
// dashboard. So shipping this changes nothing for users until that toggle.
//
// You can override the site key per-environment with NEXT_PUBLIC_TURNSTILE_SITE_KEY.
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADiEQWNHxDfKXdZK'
