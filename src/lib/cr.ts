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
  return err?.hint === 'CR_TAKEN'
}

export function crTakenText(locale: string): { msg: string; cta: string } {
  if (locale === 'en') return {
    msg: 'This commercial registration is already used by another account.',
    cta: 'If it is yours, request verification',
  }
  if (locale === 'ur') return {
    msg: 'یہ تجارتی رجسٹریشن پہلے سے کسی دوسرے اکاؤنٹ میں استعمال ہو رہی ہے۔',
    cta: 'اگر یہ آپ کی ہے تو تصدیق کی درخواست دیں',
  }
  return {
    msg: 'هذا السجل التجاري مستخدم في حساب آخر.',
    cta: 'إن كان سجلّك فاضغط هنا للتحقق',
  }
}

/** Where the claim screen lives (web route; the mobile app has its own screen). */
export const crClaimHref = (cr: string) => `/verification/claim?cr=${encodeURIComponent(cr)}`
