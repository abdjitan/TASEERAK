// تسمية احترافية للطلبات (نهج المشتريات المؤسسي):
//   RFQ-1045 | اسم حزمة التوريد   (أو وصف ذكي تلقائي إن لم يُسمّها المقاول)
// يتخلّص من «أسمنت و٢ أصناف أخرى» غير المنطقية.

export function rfqRef(rfq: any): string {
  return rfq?.ref_no ? `RFQ-${rfq.ref_no}` : ''
}

// عدد المواد بصياغة عربية سليمة (مفرد/مثنى/جمع): 1 مادة واحدة، 2 مادتان، 3-10 مواد، 11+ مادة
export function arItems(n: number, locale = 'ar'): string {
  if (locale === 'en') return `${n} item${n === 1 ? '' : 's'}`
  if (n === 1) return 'مادة واحدة'
  if (n === 2) return 'مادتان'
  if (n >= 3 && n <= 10) return `${n} مواد`
  return `${n} مادة`
}

// itemCount: عدد الأصناف المراد عرضه (للمورد = أصنافه فقط، لا الإجمالي)
export function rfqDisplayName(rfq: any, locale: string, itemCount?: number): string {
  const ref = rfqRef(rfq)
  const n = itemCount != null ? itemCount : (Array.isArray(rfq?.items) ? rfq.items.length : 1)
  let desc = ''
  if (rfq?.title && String(rfq.title).trim()) {
    desc = String(rfq.title).trim()
  } else if (n > 1) {
    const items = arItems(n, locale)
    desc = locale === 'en' ? `Supply package (${items})` : `حزمة توريدات (${items})`
  } else {
    desc = rfq?.product_name || (locale === 'en' ? 'RFQ' : 'طلب تسعير')
  }
  return ref ? `${ref} | ${desc}` : desc
}
