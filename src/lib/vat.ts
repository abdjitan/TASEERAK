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
