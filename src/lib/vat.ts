// Shared VAT helpers. Price comparison/sorting must use the SAME VAT-inclusive basis that
// prices are displayed with, otherwise an offer quoted VAT-exclusive looks ~15% cheaper and
// wrongly ranks first (B4). Each offer carries its own `vat_included` boolean.
export const VAT_RATE = 0.15

// Normalize any total to a VAT-inclusive basis for a fair comparison.
export const withVat = (total: number, vatIncluded: boolean) =>
  vatIncluded ? total : total * (1 + VAT_RATE)

// Comparable (VAT-inclusive) total for a whole offer.
export const offerComparable = (o: any) => withVat(Number(o?.total_price) || 0, !!o?.vat_included)

// Comparable (VAT-inclusive) total for one line-item entry of a given offer.
export const lineComparable = (entryTotal: any, offer: any) =>
  withVat(Number(entryTotal) || 0, !!offer?.vat_included)

// The seller's VAT situation on an offer (migration 158). NULL = sent before the column = registered.
//   registered       → normal: net + 15% VAT
//   not_registered   → the price is final, no VAT is shown or charged (Saudi VAT: an unregistered
//                      seller must not show or collect VAT)
//   supplier_invoice → price includes VAT; the tax invoice comes from the shop/factory the seller buys from
export type VatStatus = 'registered' | 'not_registered' | 'supplier_invoice'
export const vatStatusOf = (o: any): VatStatus =>
  o?.vat_status === 'not_registered' || o?.vat_status === 'supplier_invoice' ? o.vat_status : 'registered'

// Does a platform document split 15% VAT out of this offer's amounts? Only for registered sellers.
export const showsVatBreakdown = (o: any) => vatStatusOf(o) === 'registered'

// The short tag under a price for the buyer: one number, the right words.
export function vatTag(o: any, locale: string): string {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const s = vatStatusOf(o)
  if (s === 'not_registered') return L('final price · no VAT', 'حتمی قیمت · ٹیکس نہیں', 'سعر نهائي · بلا ضريبة')
  if (s === 'supplier_invoice') return L('incl. VAT · invoice from the source shop', 'ٹیکس سمیت · انوائس اصل دکان سے', 'شامل الضريبة · الفاتورة من المورد الأصلي')
  return L('incl. VAT', 'ٹیکس سمیت', 'شامل الضريبة')
}
