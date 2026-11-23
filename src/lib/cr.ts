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
    msg: 'This commercial registration is registered to another account. If it is yours, contact support to prove ownership. If you are an employee of this business, ask the account owner for an invitation link from the Team page; you will not need a commercial registration then.',
    cta: 'Contact support',
  }
  if (locale === 'ur') return {
    msg: 'یہ تجارتی رجسٹریشن کسی دوسرے اکاؤنٹ میں رجسٹرڈ ہے۔ اگر یہ آپ کی ہے تو ملکیت ثابت کرنے کے لیے سپورٹ سے رابطہ کریں۔ اور اگر آپ اس ادارے کے ملازم ہیں تو اکاؤنٹ کے مالک سے ٹیم کے صفحے سے دعوتی لنک مانگیں؛ پھر آپ کو تجارتی رجسٹریشن کی ضرورت نہیں ہوگی۔',
    cta: 'سپورٹ سے رابطہ کریں',
  }
  return {
    msg: 'هذا السجل التجاري مسجّل بحساب آخر. إن كان السجل لك، تواصل مع الدعم لإثبات ملكيته. وإن كنت موظفاً في هذه المنشأة، فاطلب من صاحب الحساب رابط دعوة من صفحة فريق العمل، ولا تحتاج حينها إلى سجل تجاري.',
    cta: 'تواصل مع الدعم',
  }
}

/** UX-079 (round 5): the prefilled support message for a CR held by another account. */
export function crSupportMessage(cr: string, locale: string): string {
  const c = normalizeCrInput(cr)
  if (locale === 'en') return `The commercial registration ${c} is registered to another account, and it is mine. I can send proof of that.`
  if (locale === 'ur') return `تجارتی رجسٹریشن ${c} کسی دوسرے اکاؤنٹ میں رجسٹرڈ ہے، اور یہ میری ہے۔ میں اس کا ثبوت بھیج سکتا ہوں۔`
  return `السجل التجاري ${c} مسجّل بحساب آخر، وهو لي. يمكنني إرسال ما يثبت ذلك.`
}
/** UX-079: the note under that message (which document to attach and what happens next). */
export function crSupportNote(locale: string): string {
  if (locale === 'en') return 'Attach a photo of the commercial registration certificate. The team reviews it and moves the registration to your account if it is shown to be yours.'
  if (locale === 'ur') return 'تجارتی رجسٹریشن سرٹیفکیٹ کی تصویر منسلک کریں۔ ٹیم اس کا جائزہ لے گی اور اگر ثابت ہو گیا کہ یہ آپ کی ہے تو رجسٹریشن آپ کے اکاؤنٹ میں منتقل کر دے گی۔'
  return 'أرفق صورة شهادة السجل التجاري، وسيراجعها الفريق وينقل السجل إلى حسابك إن ثبت أنه لك.'
}
/** UX-097 (round 5): the line under the seller-kind cards (sign-up, /join): employees join through an invite. */
export function teamInviteHintText(locale: string): string {
  if (locale === 'en') return 'A sales employee of a registered business? Ask the account owner for the invitation link.'
  if (locale === 'ur') return 'کسی رجسٹرڈ ادارے میں سیلز ملازم ہیں؟ اکاؤنٹ کے مالک سے دعوتی لنک مانگیں۔'
  return 'موظف مبيعات في منشأة مسجّلة؟ اطلب رابط الدعوة من صاحب الحساب.'
}

/** Where «تواصل مع الدعم» goes for a CR held by another account.
 *  Signed in: the support page with the topic and the CR. A visitor (sign-up): an e-mail to support with the CR. */
export function crSupportHref(cr: string, opts: { signedIn: boolean; email?: string; locale?: string }): string {
  const c = normalizeCrInput(cr)
  if (opts.signedIn) return `/support?topic=cr${c ? '&cr=' + encodeURIComponent(c) : ''}`
  const subject = opts.locale === 'en' ? 'Commercial registration already registered' : opts.locale === 'ur' ? 'تجارتی رجسٹریشن پہلے سے رجسٹرڈ' : 'سجل تجاري مسجّل بحساب آخر'
  const body = crSupportMessage(c, opts.locale || 'ar')
  return `mailto:${opts.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Kept for old call sites (settings): now the support route too, never a self-service claim (UX-040). */
export const crClaimHref = (cr: string) => crSupportHref(cr, { signedIn: true })

/** The unified national number (owner 2026-11-17, migration 226): 10 digits starting with 7. */
export const isUnifiedCr = (v: string): boolean => /^7[0-9]{9}$/.test(v)
export function crFormatText(locale: string): string {
  return locale === 'en' ? 'Enter the unified national number: 10 digits starting with 7 (on the commercial registration certificate).' : locale === 'ur' ? 'ادارے کا متحدہ قومی نمبر لکھیں: 7 سے شروع ہونے والے 10 ہندسے (تجارتی رجسٹریشن سرٹیفکیٹ پر)۔' : 'أدخل الرقم الوطني الموحد للمنشأة: 10 أرقام يبدأ بـ7 (تجده في شهادة السجل التجاري).'
}
