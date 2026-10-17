// تسمية احترافية للطلبات (نهج المشتريات المؤسسي): لكل طلب مرجع ثابت وتاريخ.
//   RFQ-1045 · 10/10/2026      ← المرجع والتاريخ
//   حزمة توريدات (مادتان)       ← الوصف: عنوان المشتري، أو اسم المادة، أو «حزمة توريدات (N)»
// يتخلّص من «أسمنت +2 أصناف أخرى» غير المنطقية (والقاعدة تحفظ الاسم بالصيغة الجديدة، migration 133).
import { getProductLabel } from '@/types'

export function rfqRef(rfq: any): string {
  return rfq?.ref_no ? `RFQ-${rfq.ref_no}` : ''
}

// عدد المواد بصياغة عربية سليمة (مفرد/مثنى/جمع): 1 مادة واحدة، 2 مادتان، 3-10 مواد، 11+ مادة
export function arItems(n: number, locale = 'ar'): string {
  if (locale === 'en') return `${n} item${n === 1 ? '' : 's'}`
  if (locale === 'ur') return `${n} اشیاء`
  if (n === 1) return 'مادة واحدة'
  if (n === 2) return 'مادتان'
  if (n >= 3 && n <= 10) return `${n} مواد`
  return `${n} مادة`
}

/** Request date, short and locale-aware. */
export function rfqDate(rfq: any, locale: string): string {
  const d = rfq?.created_at ? new Date(rfq.created_at) : null
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh' })
}

// Old rows were named "first +N أصناف أخرى / more / مزید".
const LEGACY_MORE = /\s\+\d+\s*(أصناف أخرى|more|مزید)\s*$/

/** What the request is: the buyer's title, the single material, or "supply package (N items)". */
export function rfqDesc(rfq: any, locale: string, itemCount?: number): string {
  if (rfq?.title && String(rfq.title).trim()) return String(rfq.title).trim()
  const n = itemCount != null ? itemCount : (Array.isArray(rfq?.items) && rfq.items.length ? rfq.items.length : 1)
  const name = String(rfq?.product_name || '')
  if (n > 1 || LEGACY_MORE.test(name) || name.startsWith('حزمة توريدات')) {
    const count = n > 1 ? n : (Number(name.match(/\+(\d+)/)?.[1] || 0) + 1 || 2)
    const items = arItems(count, locale)
    return locale === 'en' ? `Supply package (${items})` : locale === 'ur' ? `سپلائی پیکج (${items})` : `حزمة توريدات (${items})`
  }
  return name ? getProductLabel(name, locale) : (locale === 'en' ? 'Price request' : locale === 'ur' ? 'قیمت کی درخواست' : 'طلب تسعير')
}

// itemCount: عدد الأصناف المراد عرضه (للمورد = أصنافه فقط، لا الإجمالي)
export function rfqDisplayName(rfq: any, locale: string, itemCount?: number): string {
  const ref = rfqRef(rfq)
  const desc = rfqDesc(rfq, locale, itemCount)
  return ref ? `${ref} · ${desc}` : desc
}

/** "طلب RFQ-1045 · 10/10/2026" — the reference line shown above a request's description. */
export function rfqRefLine(rfq: any, locale: string): string {
  const ref = rfqRef(rfq)
  const date = rfqDate(rfq, locale)
  const word = locale === 'en' ? 'Request' : locale === 'ur' ? 'درخواست' : 'طلب'
  return [ref ? `${word} ${ref}` : '', date].filter(Boolean).join(' · ')
}
