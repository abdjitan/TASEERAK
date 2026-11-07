// Password rules shared by sign-up, reset and change-password (and the mobile app via src/lib).
// Matches the Supabase Auth setting "lowercase, uppercase letters and digits", min length 8.
export type PassRule = 'len' | 'upper' | 'lower' | 'digit'
export const PASS_MIN = 8

export function passwordProblems(p: string): PassRule[] {
  const out: PassRule[] = []
  if ((p || '').length < PASS_MIN) out.push('len')
  if (!/[A-Z]/.test(p || '')) out.push('upper')
  if (!/[a-z]/.test(p || '')) out.push('lower')
  if (!/[0-9]/.test(p || '')) out.push('digit')
  return out
}

export const PASS_RULE_TEXT: Record<'ar' | 'en' | 'ur', Record<PassRule, string>> = {
  ar: { len: '8 أحرف على الأقل', upper: 'حرف إنجليزي كبير (A-Z)', lower: 'حرف إنجليزي صغير (a-z)', digit: 'رقم واحد على الأقل (0-9)' },
  en: { len: 'At least 8 characters', upper: 'An uppercase letter (A-Z)', lower: 'A lowercase letter (a-z)', digit: 'A number (0-9)' },
  ur: { len: 'کم از کم 8 حروف', upper: 'ایک بڑا انگریزی حرف (A-Z)', lower: 'ایک چھوٹا انگریزی حرف (a-z)', digit: 'ایک ہندسہ (0-9)' },
}

export const PASS_RULES_SUMMARY = {
  ar: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف إنجليزي كبير، وحرف صغير، ورقم.',
  en: 'Password needs at least 8 characters, an uppercase letter, a lowercase letter and a number.',
  ur: 'پاسورڈ میں کم از کم 8 حروف، ایک بڑا حرف، ایک چھوٹا حرف اور ایک ہندسہ ہونا چاہیے۔',
}

/** Live checklist under a password field. */
export function passRuleList(p: string, locale: string) {
  const l = (locale === 'en' || locale === 'ur' ? locale : 'ar') as 'ar' | 'en' | 'ur'
  const bad = new Set(passwordProblems(p))
  return (['len', 'upper', 'lower', 'digit'] as PassRule[]).map(r => ({ rule: r, ok: !bad.has(r), text: PASS_RULE_TEXT[l][r] }))
}

/** Maps a Supabase Auth error on a password update to a clear message. */
export function passwordAuthError(err: any, locale: string): string {
  const l = (locale === 'en' || locale === 'ur' ? locale : 'ar') as 'ar' | 'en' | 'ur'
  const code = String(err?.code || '')
  const msg = String(err?.message || '').toLowerCase()
  const T = {
    current: { ar: 'كلمة المرور الحالية غير صحيحة.', en: 'Current password is incorrect.', ur: 'موجودہ پاسورڈ درست نہیں۔' },
    currentReq: { ar: 'أدخل كلمة المرور الحالية.', en: 'Enter your current password.', ur: 'موجودہ پاسورڈ درج کریں۔' },
    same: { ar: 'كلمة المرور الجديدة مطابقة للحالية، اختر كلمة مختلفة.', en: 'The new password is the same as the current one.', ur: 'نیا پاسورڈ موجودہ جیسا ہے۔' },
    weak: { ar: 'كلمة المرور ضعيفة أو مسرّبة سابقاً. ' + PASS_RULES_SUMMARY.ar, en: 'Password is too weak or was found in a leak. ' + PASS_RULES_SUMMARY.en, ur: 'پاسورڈ کمزور ہے۔ ' + PASS_RULES_SUMMARY.ur },
    reauth: { ar: 'لأسباب أمنية سجّل الخروج ثم ادخل مجدداً، ثم غيّر كلمة المرور.', en: 'For security, sign out and sign in again, then change your password.', ur: 'سیکیورٹی کے لیے دوبارہ سائن ان کریں، پھر پاسورڈ تبدیل کریں۔' },
    other: { ar: 'تعذّر تغيير كلمة المرور، حاول مرة أخرى.', en: 'Could not change the password, try again.', ur: 'پاسورڈ تبدیل نہیں ہوا، دوبارہ کوشش کریں۔' },
  }
  if (code === 'current_password_required') return T.currentReq[l]
  if (code === 'current_password_mismatch' || code === 'invalid_credentials' || msg.includes('current password')) return T.current[l]
  if (code === 'same_password' || msg.includes('different from the old')) return T.same[l]
  if (code === 'weak_password' || msg.includes('weak') || msg.includes('pwned')) return T.weak[l]
  if (code === 'reauthentication_needed' || code === 'reauth_nonce_missing') return T.reauth[l]
  return T.other[l]
}
