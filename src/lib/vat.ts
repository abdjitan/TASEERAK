// Shared VAT helpers. Price comparison/sorting must use the SAME VAT-inclusive basis that
// prices are displayed with, otherwise an offer quoted VAT-exclusive looks ~15% cheaper and
// wrongly ranks first (B4). Each offer carries its own `vat_included` boolean.
export const VAT_RATE = 0.15

// Normalize any total to a VAT-inclusive basis for a fair comparison.
export const withVat = (total: number, vatIncluded: boolean) =>
  vatIncluded ? total : total * (1 + VAT_RATE)

// Comparable (what the buyer pays) total for a whole offer. A seller without a VAT number adds no
// VAT: their price is final, whatever vat_included says.
export const offerComparable = (o: any) =>
  o?.vat_status === 'not_registered' ? Number(o?.total_price) || 0 : withVat(Number(o?.total_price) || 0, !!o?.vat_included)

// Comparable total for one line-item entry of a given offer (same rule).
export const lineComparable = (entryTotal: any, offer: any) =>
  offer?.vat_status === 'not_registered' ? Number(entryTotal) || 0 : withVat(Number(entryTotal) || 0, !!offer?.vat_included)

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

// The tag under a price for the buyer. Owner 2026-11-01: «يشمل ضريبة القيمة المضافة 15%»; a seller
// without a VAT number adds no VAT, and the tag says so instead of claiming VAT is inside.
export function vatTag(o: any, locale: string): string {
  if (!showsVatBreakdown(o)) return locale === 'en' ? 'final price, VAT included' : locale === 'ur' ? 'حتمی قیمت، ٹیکس شامل' : 'سعر نهائي شامل الضريبة'
  return locale === 'en' ? 'incl. 15% VAT' : locale === 'ur' ? '15% VAT سمیت' : 'يشمل ضريبة القيمة المضافة 15%'
}

// The label of an offer's grand total: «يشمل ضريبة القيمة المضافة 15%» only when the seller charges it.
export function totalLabel(o: any, locale: string): string {
  if (!showsVatBreakdown(o)) return locale === 'en' ? 'Total (final, VAT included)' : locale === 'ur' ? 'کل (حتمی، ٹیکس شامل)' : 'الإجمالي (نهائي شامل الضريبة)'
  return locale === 'en' ? 'Total incl. 15% VAT' : locale === 'ur' ? 'کل رقم (15% VAT سمیت)' : 'الإجمالي (يشمل ضريبة القيمة المضافة 15%)'
}
