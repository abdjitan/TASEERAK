// Small display helpers.
import { storedBuyerType } from '@/lib/buyerType'

// Notifications written before 161/163 kept emoji in their titles («🧾 …», «⏰ …», «🎉»); the UI
// uses line icons only, so emoji are dropped when a stored text is shown.
export function noEmoji(s: any): string {
  const t = String(s ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s{2,}/g, ' ').trim()
  // a home buyer never sees procurement codes (owner 2026-11-22): «RFQ-2688» → «طلب رقم 2688»
  return storedBuyerType() === 'individual' ? t.replace(/\bRFQ-(\d+)/g, 'طلب رقم $1') : t
}

// «الآن» / «قبل 5 دقائق» / «قبل ساعتين» / «قبل 3 أيام» (ur: «3 دن پہلے»).
export function timeAgo(d: any, locale: string, now: number = Date.now()): string {
  if (!d) return ''
  const s = Math.max(0, Math.floor((now - new Date(d).getTime()) / 1000))
  const m = Math.floor(s / 60), h = Math.floor(m / 60), dd = Math.floor(h / 24)
  if (locale === 'en') return s < 60 ? 'just now' : m < 60 ? `${m}m ago` : h < 24 ? `${h}h ago` : `${dd}d ago`
  if (locale === 'ur') return s < 60 ? 'ابھی' : m < 60 ? `${m} منٹ پہلے` : h < 24 ? `${h} گھنٹے پہلے` : `${dd} دن پہلے`
  if (s < 60) return 'الآن'
  if (m < 60) return 'قبل ' + arCount(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')
  if (h < 24) return 'قبل ' + arCount(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')
  return 'قبل ' + arCount(dd, 'يوم', 'يومين', 'أيام', 'يوماً')
}

/** Which list section a date falls in: today / yesterday / earlier (Riyadh calendar day). */
export type DayBucket = 'today' | 'yesterday' | 'earlier'
export function dayBucket(d: any, now: number = Date.now()): DayBucket {
  const day = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
  const t = new Date(d).getTime()
  if (isNaN(t)) return 'earlier'
  if (day(t) === day(now)) return 'today'
  if (day(t) === day(now - 86_400_000)) return 'yesterday'
  return 'earlier'
}
export function dayBucketLabel(b: DayBucket, locale: string): string {
  if (locale === 'en') return b === 'today' ? 'Today' : b === 'yesterday' ? 'Yesterday' : 'Earlier'
  if (locale === 'ur') return b === 'today' ? 'آج' : b === 'yesterday' ? 'کل' : 'پہلے'
  return b === 'today' ? 'اليوم' : b === 'yesterday' ? 'أمس' : 'سابقاً'
}

// «يوم واحد / يومان / 3 أيام / 11 يوماً» (en "3 days", ur «3 دن»).
export function daysText(n: any, locale: string): string {
  const d = Number(n) || 0
  if (locale === 'en') return d === 1 ? '1 day' : `${d} days`
  if (locale === 'ur') return `${d} دن`
  return arCount(d, 'يوم واحد', 'يومان', 'أيام', 'يوماً')
}

// Arabic counted noun: (1) «بند واحد» (2) «بندان» (3–10) «3 بنود» (11–99) «11 بنداً».
// Above 100 the last two digits decide (UX-153): 103 «103 بنود», 111 «111 بنداً»; the round hundreds
// and 101/102 use the «many» form.
export function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one
  if (n === 2) return two
  const r = n >= 100 ? n % 100 : n
  return r >= 3 && r <= 10 ? `${n} ${few}` : `${n} ${many}`
}
export const arItems = (n: number) => arCount(n, 'بند واحد', 'بندان', 'بنود', 'بنداً')
export const arMaterials = (n: number) => arCount(n, 'مادة واحدة', 'مادتان', 'مواد', 'مادة')
export const arMessages = (n: number) => arCount(n, 'رسالة واحدة', 'رسالتان', 'رسائل', 'رسالة')
export const arDeals = (n: number) => arCount(n, 'صفقة واحدة', 'صفقتان', 'صفقات', 'صفقة')
export const arRequests = (n: number) => arCount(n, 'طلب واحد', 'طلبان', 'طلبات', 'طلباً')
export const arOffers = (n: number) => arCount(n, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً')

/** A counted noun in the reader's language: countLabel(3, 'ar', arOffers, 'offer', 'آفر') */
export function countLabel(n: number, locale: string, ar: (n: number) => string, en: string, ur: string): string {
  if (locale === 'en') return `${n} ${en}${n === 1 ? '' : 's'}`
  if (locale === 'ur') return `${n} ${ur}`
  return ar(n)
}

// Intl locale for dates: Gregorian calendar and Latin digits in every language (like the rest of the site)
export function dateLocale(locale: string): string {
  return locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'
}
