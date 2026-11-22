// One deal amount everywhere (UX-018): the awarded materials (or the whole offer when nothing was awarded
// item by item), plus the extra charges once the supplier has confirmed them, on the seller's VAT basis
// (offerComparable: a seller without a VAT number adds nothing). Web deal list/page and the app use it.
import { offerComparable } from '@/lib/vat'

/** awardedSum: the sum of this supplier's awarded item totals (undefined = the whole offer). */
export function dealTotal(offer: any, awardedSum?: number | null): number {
  if (awardedSum == null) return offerComparable(offer)
  const extras = !offer?.extras_pending && Array.isArray(offer?.extra_charges)
    ? offer.extra_charges.reduce((s: number, e: any) => s + (Number(e?.amount) || 0), 0) : 0
  return offerComparable({ ...offer, total_price: awardedSum + extras })
}
