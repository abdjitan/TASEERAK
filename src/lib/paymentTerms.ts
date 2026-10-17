// Payment terms a supplier offers (offers.payment_terms, migration 157). Shared by the site and the
// mobile app. null = not stated.
export type PaymentTerms = 'advance' | 'on_delivery' | 'net30' | 'net60'

export const PAYMENT_TERMS: { key: PaymentTerms; ar: string; en: string; ur: string }[] = [
  { key: 'on_delivery', ar: 'الدفع عند الاستلام', en: 'Pay on delivery', ur: 'وصولی پر ادائیگی' },
  { key: 'advance', ar: 'دفع مقدّم', en: 'Pay in advance', ur: 'پیشگی ادائیگی' },
  { key: 'net30', ar: 'آجل 30 يوماً', en: 'Credit 30 days', ur: '30 دن ادھار' },
  { key: 'net60', ar: 'آجل 60 يوماً', en: 'Credit 60 days', ur: '60 دن ادھار' },
]

export function paymentTermsLabel(key: string | null | undefined, locale: string): string {
  const t = PAYMENT_TERMS.find(x => x.key === key)
  if (!t) return ''
  return locale === 'en' ? t.en : locale === 'ur' ? t.ur : t.ar
}
