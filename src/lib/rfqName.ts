// تسمية احترافية للطلبات (نهج المشتريات المؤسسي): لكل طلب مرجع ثابت وتاريخ.
//   RFQ-1045 · 10/10/2026      ← المرجع والتاريخ
//   حزمة توريدات (مادتان)       ← الوصف: عنوان المشتري، أو اسم المادة، أو «حزمة توريدات (N)»
// يتخلّص من «أسمنت +2 أصناف أخرى» غير المنطقية (والقاعدة تحفظ الاسم بالصيغة الجديدة، migration 133).
import { getProductLabel } from '@/types'
import { storedBuyerType } from '@/lib/buyerType'
import { homeName } from '@/lib/homePacks'

// a home buyer («لبيتي») on this device: plain words instead of procurement codes (owner 2026-11-22)
const homeMode = () => storedBuyerType() === 'individual'
const homeNo = (n: any, locale: string) => locale === 'en' ? `Request no. ${n}` : locale === 'ur' ? `درخواست نمبر ${n}` : `طلب رقم ${n}`

export function rfqRef(rfq: any, locale = 'ar'): string {
  if (!rfq?.ref_no) return ''
  // round-5 UX-177: the English code «RFQ-» for English readers only; Arabic and Urdu read «طلب رقم 1234»
  return locale === 'en' && !homeMode() ? `RFQ-${rfq.ref_no}` : homeNo(rfq.ref_no, locale)
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
  // a home buyer: the request is named by what is in it («سبوت سقف، خلاط مغسلة و٣ أخرى»), not «حزمة توريدات»
  if (homeMode() && Array.isArray(rfq?.items) && rfq.items.length) {
    const names = rfq.items.map((it: any) => String(it?.product_name || '')).filter(Boolean)
      .map((n: string) => homeName(n, locale)) // the plain home name, no model codes (round-4 UX-024)
    if (names.length) {
      const head = names.slice(0, 2).join(locale === 'en' ? ', ' : '، ')
      const more = names.length - 2
      return more > 0 ? head + (locale === 'en' ? ` and ${more} more` : locale === 'ur' ? ` اور ${more} مزید` : more === 1 ? ' ومادة أخرى' : more === 2 ? ' ومادتان أخريان' : more <= 10 ? ` و${more} مواد أخرى` : ` و${more} مادة أخرى`) : head
    }
  }
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
  const ref = rfqRef(rfq, locale) // in the reader's language («Request no. 12», not «طلب رقم» inside English) (UX-069)
  const desc = rfqDesc(rfq, locale, itemCount)
  return ref ? `${ref} · ${desc}` : desc
}

/** "طلب RFQ-1045 · 10/10/2026" — the reference line shown above a request's description. */
export function rfqRefLine(rfq: any, locale: string): string {
  const ref = rfqRef(rfq, locale)
  const date = rfqDate(rfq, locale)
  const word = locale === 'en' ? 'Request' : locale === 'ur' ? 'درخواست' : 'طلب'
  // «طلب رقم 1234» already names the request: the word is added only before the English code (no «طلب طلب»)
  return [ref ? (ref.startsWith('RFQ-') ? `${word} ${ref}` : ref) : '', date].filter(Boolean).join(' · ')
}
