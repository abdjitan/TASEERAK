// A server error as the person should read it (review 2026-10-28: raw English database errors reached
// users). Our own database messages are already written in Arabic and are shown as they are; known
// technical errors get a plain sentence in the reader's language; anything else gets the caller's
// fallback sentence instead of the raw text.
type L3 = { ar: string; en: string; ur: string }
const KNOWN: { re: RegExp; t: L3 }[] = [
  { re: /failed to fetch|network|timeout|timed out|load failed/i, t: { ar: 'تعذّر الاتصال. تحقّق من الإنترنت وحاول مرة أخرى.', en: 'Connection problem. Check your internet and try again.', ur: 'کنکشن کا مسئلہ۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔' } },
  { re: /jwt|token.*expired|not authenticated|unauthori[sz]ed|auth session/i, t: { ar: 'انتهت جلستك. سجّل الدخول مرة أخرى.', en: 'Your session ended. Please sign in again.', ur: 'آپ کا سیشن ختم ہو گیا۔ دوبارہ لاگ ان کریں۔' } },
  { re: /rate.?limit|too many|rate_limited/i, t: { ar: 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.', en: 'Too many attempts. Wait a moment and try again.', ur: 'بہت زیادہ کوششیں۔ تھوڑی دیر بعد کوشش کریں۔' } },
  { re: /permission denied|row-level security|violates row-level|forbidden|not allowed/i, t: { ar: 'لا تملك صلاحية تنفيذ هذا الإجراء.', en: 'You are not allowed to do this.', ur: 'آپ کو اس کی اجازت نہیں۔' } },
  { re: /duplicate key|already exists|unique constraint/i, t: { ar: 'هذا موجود مسبقاً.', en: 'This already exists.', ur: 'یہ پہلے سے موجود ہے۔' } },
  { re: /payload too large|file size|too large/i, t: { ar: 'الملف كبير جداً.', en: 'The file is too large.', ur: 'فائل بہت بڑی ہے۔' } },
]

export function friendlyError(message: string | null | undefined, fallback: string, locale = 'ar'): string {
  const m = String(message || '').trim()
  if (!m) return fallback
  if (/[؀-ۿ]/.test(m) && locale === 'ar') return m // our own Arabic message from the database
  const k = KNOWN.find(x => x.re.test(m))
  if (k) return locale === 'en' ? k.t.en : locale === 'ur' ? k.t.ur : k.t.ar
  return fallback
}
