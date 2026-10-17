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
//   not_registered   → the seller has no VAT number: the price is VAT-inclusive (owner decision
//                      2026-10-17), documents show one total without a VAT amount
//   supplier_invoice → reserved (not offered in the UI)
export type VatStatus = 'registered' | 'not_registered' | 'supplier_invoice'
export const vatStatusOf = (o: any): VatStatus =>
  o?.vat_status === 'not_registered' || o?.vat_status === 'supplier_invoice' ? o.vat_status : 'registered'

// Does a platform document split 15% VAT out of this offer's amounts? Only for registered sellers.
export const showsVatBreakdown = (o: any) => vatStatusOf(o) === 'registered'

// The tag under a price for the buyer. Owner decision 2026-10-17: every price reads «شامل الضريبة».
export function vatTag(_o: any, locale: string): string {
  return locale === 'en' ? 'incl. VAT' : locale === 'ur' ? 'ٹیکس سمیت' : 'شامل الضريبة'
}
