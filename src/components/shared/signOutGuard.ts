'use client'

import { createClient } from '@/lib/supabase/client'

/** A phone sign-up gets a placeholder address (…@phone.taseerak.com) until it adds a real email. */
export const isPlaceholderEmail = (e?: string | null) => !e || /@phone\.taseerak\.com$/i.test(String(e))

let smsDownCache: { v: boolean; at: number } | null = null

/** sms_is_down (migration 282), cached for a minute. */
export async function smsIsDown(): Promise<boolean> {
  if (smsDownCache && Date.now() - smsDownCache.at < 60_000) return smsDownCache.v
  try {
    const { data } = await createClient().rpc('sms_is_down')
    smsDownCache = { v: data === true, at: Date.now() }
    return smsDownCache.v
  } catch { return false }
}

/**
 * True when signing out now would lock the user out: the account signs in with a mobile code, it has
 * no verified email, and texts cannot arrive (round-8 UX-002).
 */
export async function signOutLocksOut(): Promise<boolean> {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    const phoneAccount = isPlaceholderEmail(user.email) || (user.user_metadata as any)?.signup_method === 'phone'
    if (!phoneAccount) return false
    if (!(await smsIsDown())) return false
    if (isPlaceholderEmail(user.email)) return true
    const { data: p } = await sb.from('profiles').select('email_verified_at').eq('id', user.id).maybeSingle()
    return !(p as any)?.email_verified_at
  } catch { return false }
}

/** The confirmation text before signing out an account that would be locked out. */
export function lockOutText(locale: string): string {
  return locale === 'en'
    ? 'The text message service is down and you have not verified your email yet, so you will not be able to sign in again if you log out now. Do you want to continue?'
    : locale === 'ur'
      ? 'ٹیکسٹ میسج سروس بند ہے اور آپ نے ابھی اپنی ای میل کی تصدیق نہیں کی، اس لیے اگر آپ ابھی لاگ آؤٹ کریں تو دوبارہ سائن اِن نہیں کر سکیں گے۔ کیا آپ جاری رکھنا چاہتے ہیں؟'
      : 'خدمة الرسائل النصية متوقفة، ولم توثّق بريدك بعد، فلن تتمكن من الدخول مجدداً إن سجّلت الخروج الآن. أتريد المتابعة؟'
}
