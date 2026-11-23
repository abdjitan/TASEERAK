// Commercial registration helpers shared by web + mobile (migration 170: one CR = one account).
// The DB normalises and enforces too; these only keep the UI in step with it.

/** Arabic-Indic / Persian digits → ASCII, everything else dropped (same rule as public.normalize_cr). */
export function normalizeCrInput(v: string | null | undefined): string {
  return String(v ?? '')
    .replace(/[٠-٩]/g, (d: string) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d: string) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^0-9]/g, '')
}

/** Postgres raises `hint = 'CR_TAKEN'` when another non-rejected account holds the CR. */
export function isCrTaken(err: any): boolean {
  if (!err) return false
  if (err.hint === 'CR_TAKEN' || /CR_TAKEN/.test(String(err.message || '')) || /CR_TAKEN/.test(String(err.details || ''))) return true
  // a unique-index violation on the CR (older paths) means the same thing
  return err.code === '23505' && /commercial_registration|normalize_cr|_cr_/i.test(`${err.message || ''} ${err.details || ''}`)
}

/** UX-040 (round 3): ONE text for a CR held by another account, everywhere (sign-up, onboarding,
 *  settings, the app). Owner 2026-11-23: support handles ownership proofs; there is no self-service claim. */
export function crTakenText(locale: string): { msg: string; cta: string } {
  if (locale === 'en') return {
    msg: 'This commercial registration is registered to another account. If it is yours, contact support to prove ownership.',
    cta: 'Contact support',
  }
  if (locale === 'ur') return {
    msg: 'یہ تجارتی رجسٹریشن کسی دوسرے اکاؤنٹ میں رجسٹرڈ ہے۔ اگر یہ آپ کی ہے تو ملکیت ثابت کرنے کے لیے سپورٹ سے رابطہ کریں۔',
    cta: 'سپورٹ سے رابطہ کریں',
  }
  return {
    msg: 'هذا السجل التجاري مسجّل بحساب آخر. إن كان السجل لك، تواصل مع الدعم لإثبات ملكيته.',
    cta: 'تواصل مع الدعم',
  }
}

/** Where «تواصل مع الدعم» goes for a CR held by another account.
 *  Signed in: the support page with the topic and the CR. A visitor (sign-up): an e-mail to support with the CR. */
export function crSupportHref(cr: string, opts: { signedIn: boolean; email?: string; locale?: string }): string {
  const c = normalizeCrInput(cr)
  if (opts.signedIn) return `/support?topic=cr${c ? '&cr=' + encodeURIComponent(c) : ''}`
  const subject = opts.locale === 'en' ? 'Commercial registration already registered' : opts.locale === 'ur' ? 'تجارتی رجسٹریشن پہلے سے رجسٹرڈ' : 'سجل تجاري مسجّل بحساب آخر'
  const body = opts.locale === 'en' ? `Commercial registration: ${c}` : opts.locale === 'ur' ? `تجارتی رجسٹریشن: ${c}` : `رقم السجل التجاري: ${c}`
  return `mailto:${opts.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Kept for old call sites (settings): now the support route too, never a self-service claim (UX-040). */
export const crClaimHref = (cr: string) => crSupportHref(cr, { signedIn: true })

/** The unified national number (owner 2026-11-17, migration 226): 10 digits starting with 7. */
export const isUnifiedCr = (v: string): boolean => /^7[0-9]{9}$/.test(v)
export function crFormatText(locale: string): string {
  return locale === 'en' ? 'Enter the unified national number: 10 digits starting with 7 (on the commercial registration certificate).' : locale === 'ur' ? 'ادارے کا متحدہ قومی نمبر لکھیں: 7 سے شروع ہونے والے 10 ہندسے (تجارتی رجسٹریشن سرٹیفکیٹ پر)۔' : 'أدخل الرقم الوطني الموحد للمنشأة: 10 أرقام يبدأ بـ7 (تجده في شهادة السجل التجاري).'
}
