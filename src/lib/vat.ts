// Shared VAT helpers. Price comparison/sorting must use the SAME VAT-inclusive basis that
// prices are displayed with, otherwise an offer quoted VAT-exclusive looks ~15% cheaper and
// wrongly ranks first (B4). Each offer carries its own `vat_included` boolean.
export const VAT_RATE = 0.15

// Normalize any total to a VAT-inclusive basis for a fair comparison.
export const withVat = (total: number, vatIncluded: boolean) =>
  vatIncluded ? total : total * (1 + VAT_RATE)

// Comparable (what the buyer pays) total for a whole offer. A seller without a VAT number adds no
// VAT: their price is final, whatever vat_included says.
// Round-4 UX-126: the same rule as the VAT tag (showsVatBreakdown), so a reserved 'supplier_invoice'
// status never adds VAT while its tag says none is added.
export const offerComparable = (o: any) =>
  !showsVatBreakdown(o) ? Number(o?.total_price) || 0 : withVat(Number(o?.total_price) || 0, !!o?.vat_included)

// Comparable total for one line-item entry of a given offer (same rule).
export const lineComparable = (entryTotal: any, offer: any) =>
  !showsVatBreakdown(offer) ? Number(entryTotal) || 0 : withVat(Number(entryTotal) || 0, !!offer?.vat_included)

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
// Legal review 2026-11-21: a seller without a VAT number must not look as if VAT was charged
// («شامل الضريبة» was misleading). An independent (pricing agent, §7A) is invoiced by the source
// shop, which may be VAT-registered, so for them the tag points to the shop's tax invoice instead.
const INDEPENDENT_TYPES = ['individual', 'broker', 'price_agent']
export const isIndependentOffer = (o: any) =>
  o?.supplier?.supplier_tier === 'independent' || INDEPENDENT_TYPES.includes(o?.supplier?.provider_type)

export function vatTag(o: any, locale: string): string {
  if (!showsVatBreakdown(o) && isIndependentOffer(o)) return locale === 'en' ? 'Final price; the shop’s invoice in your name' : locale === 'ur' ? 'حتمی قیمت؛ دکان کی انوائس آپ کے نام' : 'سعر نهائي، وفاتورة المحل باسمك'
  if (!showsVatBreakdown(o)) return locale === 'en' ? 'Final price, no VAT added' : locale === 'ur' ? 'حتمی قیمت، اس پر VAT شامل نہیں کیا جاتا' : 'سعر نهائي، لا تُضاف إليه ضريبة القيمة المضافة'
  return locale === 'en' ? 'incl. 15% VAT' : locale === 'ur' ? '15% VAT سمیت' : 'يشمل ضريبة القيمة المضافة 15%'
}

// The label of an offer's grand total: «يشمل ضريبة القيمة المضافة 15%» only when the seller charges it.
export function totalLabel(o: any, locale: string): string {
  if (!showsVatBreakdown(o) && isIndependentOffer(o)) return locale === 'en' ? 'Total (final; invoice from the source shop)' : locale === 'ur' ? 'کل (حتمی؛ انوائس ماخذ دکان سے)' : 'الإجمالي (نهائي، والفاتورة من المحل المصدر)'
  if (!showsVatBreakdown(o)) return locale === 'en' ? 'Total (final, no VAT)' : locale === 'ur' ? 'کل (حتمی، VAT کے بغیر)' : 'الإجمالي (نهائي، دون ضريبة القيمة المضافة)'
  return locale === 'en' ? 'Total incl. 15% VAT' : locale === 'ur' ? 'کل رقم (15% VAT سمیت)' : 'الإجمالي (يشمل ضريبة القيمة المضافة 15%)'
}

// The amount before VAT of a total entered on an offer (registered seller only; otherwise the total is final).
export const netOf = (total: any, o: any) =>
  showsVatBreakdown(o) && o?.vat_included ? (Number(total) || 0) / (1 + VAT_RATE) : Number(total) || 0

// The heading of a price column on the buyer's side. Owner 2026-11-23: every price a buyer sees includes
// VAT (buyerLinePrice), so the heading says «شامل الضريبة», or «سعر نهائي» for a seller without a VAT number.
export function priceBasisLabel(o: any, locale: string): string {
  if (!showsVatBreakdown(o)) return locale === 'en' ? 'Final price' : locale === 'ur' ? 'حتمی قیمت' : 'سعر نهائي'
  return locale === 'en' ? 'Price incl. VAT' : locale === 'ur' ? 'قیمت (VAT سمیت)' : 'السعر شامل الضريبة'
}

// The short basis tag after a buyer-facing amount: «شامل الضريبة», or «سعر نهائي» (no VAT number, no VAT added).
export function buyerBasisTag(o: any, locale: string): string {
  if (!showsVatBreakdown(o)) return locale === 'en' ? 'final price' : locale === 'ur' ? 'حتمی قیمت' : 'سعر نهائي'
  return locale === 'en' ? 'incl. VAT' : locale === 'ur' ? 'VAT سمیت' : 'شامل الضريبة'
}

// The seller's invoice on a deal, named by who the seller is (UX-025, legal): a seller without a VAT
// number cannot issue a tax invoice, and a pricing agent hands over the source shop's invoice.
//   who = 'buyer' → «… باسمك»; who = 'supplier' → «… باسم المشتري»
export function sellerInvoiceLabel(o: any, locale: string, who: 'buyer' | 'supplier' = 'buyer'): string {
  if (isIndependentOffer(o)) return who === 'buyer'
    ? (locale === 'en' ? 'The source shop invoice in your name' : locale === 'ur' ? 'آپ کے نام ماخذ دکان کی انوائس' : 'فاتورة المحل المصدر باسمك')
    : (locale === 'en' ? 'The source shop invoice in the buyer’s name' : locale === 'ur' ? 'خریدار کے نام ماخذ دکان کی انوائس' : 'فاتورة المحل المصدر باسم المشتري')
  // one name for the document everywhere: «فاتورة المورد» (round-4 UX-151)
  if (showsVatBreakdown(o)) return locale === 'en' ? 'The supplier’s tax invoice' : locale === 'ur' ? 'سپلائر کی ٹیکس انوائس' : 'فاتورة المورد الضريبية'
  return locale === 'en' ? 'The supplier’s invoice' : locale === 'ur' ? 'سپلائر کی انوائس' : 'فاتورة المورد'
}

// What the seller is asked to do before confirming delivery (UX-025 / UX-127).
// Round-4 UX-181: the upload button is in the invoice step (above delivery), never «below».
export function invoiceGateText(o: any, locale: string): string {
  if (isIndependentOffer(o)) return locale === 'en' ? 'Next step: ask the source shop for an invoice in the buyer’s name at your offer’s price, upload it in the invoice step, then confirm delivery.' : locale === 'ur' ? 'اگلا قدم: ماخذ دکان سے خریدار کے نام اور اپنی آفر کی قیمت پر انوائس لیں، اسے انوائس کے مرحلے میں اپ لوڈ کریں، پھر ڈیلیوری کی تصدیق کریں۔' : 'الخطوة التالية: اطلب من المحل المصدر فاتورة باسم المشتري وبسعر عرضك، ثم ارفعها في خطوة الفاتورة وأكّد التسليم.'
  if (showsVatBreakdown(o)) return locale === 'en' ? 'Upload your tax invoice in the invoice step first, then confirm delivery.' : locale === 'ur' ? 'پہلے انوائس کے مرحلے میں اپنی ٹیکس انوائس اپ لوڈ کریں، پھر ڈیلیوری کی تصدیق کریں۔' : 'ارفع فاتورتك الضريبية في خطوة الفاتورة أولاً، ثم أكّد التسليم.'
  return locale === 'en' ? 'Upload your sales invoice in the invoice step first, then confirm delivery.' : locale === 'ur' ? 'پہلے انوائس کے مرحلے میں اپنی سیلز انوائس اپ لوڈ کریں، پھر ڈیلیوری کی تصدیق کریں۔' : 'ارفع فاتورة البيع في خطوة الفاتورة أولاً، ثم أكّد التسليم.'
}

// The currency name, one per language everywhere (UX-140): «ر.س» / «SAR» / «ریال».
export const sarLabel = (locale: string): string => (locale === 'en' ? 'SAR' : locale === 'ur' ? 'ریال' : 'ر.س')

// A line or unit price on the buyer's basis. Owner 2026-11-23: EVERY buyer (home, contractor, company)
// sees each number as what they pay (lineComparable: VAT-inclusive, or the final price of a seller without
// a VAT number), so the lines add up to the total. The third argument is kept for older callers; ignored.
export const buyerLinePrice = (amount: any, o: any, _home?: boolean): number => lineComparable(amount, o)

// Retired 2026-11-23 (a buyer never sees a price before VAT): always empty, kept for older callers.
export function preVatNote(_o: any, _locale: string): string {
  return ''
}
