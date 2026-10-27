// Legal texts version, shared by web + mobile (migration 176).
// Must equal public.current_terms_version() in the DB; bump both together when the terms or
// the privacy policy change (users then re-accept via accept_terms()).
export const TERMS_VERSION = '2026-10-27'

// Operator shown on the legal pages until the operating company exists (owner, 2026-10-27).
// Never show a platform CR or VAT number here.
export const OPERATOR = {
  ar: 'تسعيرك (نسخة تجريبية)',
  en: 'Taseerak (beta)',
  ur: 'تسعیرک (آزمائشی ورژن)',
  email: 'info@taseerak.com',
}
